import type { SQLiteDatabase } from 'expo-sqlite';
import type { ExerciseSeed, ExerciseCatalogItem } from '@/store/workoutDatabase';
import {
  exerciseMatchKey,
  parseSharedSplitJson,
  serializeSharedSplit,
  SHARED_SPLIT_LIMITS,
  type PortableSplit,
  type PortableCustomExercise,
} from '@/features/sharing/splitProtocol';

export interface ImportedSplit {
  splitId: number;
  name: string;
  workoutIds: number[];
}

export class SplitImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SplitImportError';
  }
}

const boundedName = (name: string, suffix: string, limit: number): string => {
  let base = name.slice(0, limit - suffix.length).trimEnd();
  // A suffix must not split a UTF-16 surrogate pair.
  if (/[\uD800-\uDBFF]$/.test(base)) base = base.slice(0, -1);
  return base + suffix;
};

const sameCustomDefinition = (local: ExerciseCatalogItem, shared: PortableCustomExercise) =>
  local.workoutType === shared.workoutType && local.loadType === shared.loadType &&
  local.metric === shared.metric && local.equipment === shared.equipment &&
  exerciseMatchKey(local.primaryMuscle) === exerciseMatchKey(shared.primaryMuscle);

/** Validate again at the persistence boundary, then commit catalog additions
 * and the complete routine graph together. This never writes profile, session,
 * template, progression, history or active-split state. */
export const persistPortableSplit = (
  db: SQLiteDatabase,
  input: PortableSplit,
  seeds: readonly ExerciseSeed[],
  attemptId?: string
): ImportedSplit => {
  const serialized = serializeSharedSplit(input);
  if (!serialized.ok) throw new SplitImportError(serialized.error.message);
  const parsed = parseSharedSplitJson(serialized.value);
  if (!parsed.ok) throw new SplitImportError(parsed.error.message);
  const split = parsed.value;
  if (attemptId !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attemptId)) {
    throw new SplitImportError('Couldn’t recover this import. Open the shared routine again.');
  }
  const seedByKey = new Map(seeds.map((seed) => [exerciseMatchKey(seed.name), seed]));
  const reservedNames = new Set(split.workouts.flatMap((workout) =>
    workout.exercises.map((exercise) => exerciseMatchKey(exercise.name))));
  for (const workout of split.workouts) for (const exercise of workout.exercises) {
    if (exercise.kind === 'builtin' && !seedByKey.has(exerciseMatchKey(exercise.name))) {
      throw new SplitImportError('This routine needs a newer Stack. Update to open it.');
    }
  }

  let result!: ImportedSplit;
  db.withTransactionSync(() => {
    if (attemptId) {
      const receipt = db.getFirstSync<{ payload: string; split_id: number }>(
        'SELECT payload, split_id FROM shared_split_import_receipts WHERE attempt_id = ?', attemptId);
      if (receipt) {
        if (receipt.payload !== serialized.value) throw new SplitImportError('This import belongs to a different routine.');
        const existing = db.getFirstSync<{ name: string }>('SELECT name FROM custom_splits WHERE id = ?', receipt.split_id);
        if (!existing) throw new SplitImportError('This saved routine could not be recovered.');
        result = { splitId: receipt.split_id, name: existing.name, workoutIds: db.getAllSync<{ id: number }>(
          'SELECT id FROM custom_split_workouts WHERE split_id = ? ORDER BY position, id', receipt.split_id).map(row => row.id) };
        return;
      }
    }
    const catalog: ExerciseCatalogItem[] = db.getAllSync<{
      id: number; name: string; workout_type: ExerciseCatalogItem['workoutType'];
      primary_muscle: string; equipment: string | null; load_type: ExerciseCatalogItem['loadType'];
      metric: ExerciseCatalogItem['metric']; is_custom: number;
    }>('SELECT id, name, workout_type, primary_muscle, equipment, load_type, metric, is_custom FROM exercises ORDER BY id')
      .map((row) => ({ id: row.id, name: row.name, workoutType: row.workout_type,
        primaryMuscle: row.primary_muscle, equipment: row.equipment, loadType: row.load_type,
        metric: row.metric, isCustom: Boolean(row.is_custom) }));
    const resolved = new Map<string, number>();

    const resolve = (exercise: PortableSplit['workouts'][number]['exercises'][number]): number => {
      const key = exerciseMatchKey(exercise.name);
      const cached = resolved.get(key);
      if (cached !== undefined) return cached;
      const seed = exercise.kind === 'builtin' ? seedByKey.get(key)! : null;
      const equivalent = (local: ExerciseCatalogItem) => seed
        ? !local.isCustom && local.workoutType === seed.workoutType &&
          local.loadType === seed.loadType && local.metric === seed.metric &&
          local.primaryMuscle === seed.primaryMuscle && local.equipment === null
        : sameCustomDefinition(local, exercise as PortableCustomExercise);
      const matches = catalog.filter((local) => exerciseMatchKey(local.name) === key);
      let local = matches.find(equivalent);
      let name = seed?.name ?? exercise.name;
      if (!local && matches.length > 0) {
        // Never mutate an incompatible exercise. Check generated names too so
        // repeating an import reuses the same safely disambiguated definition.
        for (let number = 1; ; number += 1) {
          const label = seed ? 'Stack' : 'shared';
          const suffix = ` (${label}${number === 1 ? '' : ` ${number}`})`;
          name = boundedName(seed?.name ?? exercise.name, suffix, SHARED_SPLIT_LIMITS.exerciseNameMaxLength);
          const candidateKey = exerciseMatchKey(name);
          if (reservedNames.has(candidateKey)) continue;
          const candidates = catalog.filter((item) => exerciseMatchKey(item.name) === candidateKey);
          local = candidates.find(equivalent);
          if (local || candidates.length === 0) break;
        }
      }
      if (!local) {
        const definition = seed ?? exercise as PortableCustomExercise;
        const id = db.runSync(`INSERT INTO exercises
          (name, workout_type, primary_muscle, secondary_muscle, is_custom, equipment, load_type, metric)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, name, definition.workoutType, definition.primaryMuscle,
        seed?.secondaryMuscle ?? null, seed ? 0 : 1,
        seed ? null : (exercise as PortableCustomExercise).equipment, definition.loadType, definition.metric).lastInsertRowId;
        local = { id, name, workoutType: definition.workoutType, primaryMuscle: definition.primaryMuscle,
          equipment: seed ? null : (exercise as PortableCustomExercise).equipment,
          loadType: definition.loadType, metric: definition.metric, isCustom: !seed };
        catalog.push(local);
      }
      resolved.set(key, local.id);
      return local.id;
    };

    const names = new Set(db.getAllSync<{ name: string }>('SELECT name FROM custom_splits')
      .map((row) => exerciseMatchKey(row.name)));
    let name = split.name;
    for (let number = 2; names.has(exerciseMatchKey(name)); number += 1) {
      name = boundedName(split.name, ` ${number}`, SHARED_SPLIT_LIMITS.splitNameMaxLength);
    }
    const timestamp = new Date().toISOString();
    const splitId = db.runSync('INSERT INTO custom_splits (name, created_at, updated_at) VALUES (?, ?, ?)',
      name, timestamp, timestamp).lastInsertRowId;
    const workoutIds = split.workouts.map((workout, position) => {
      const workoutId = db.runSync('INSERT INTO custom_split_workouts (split_id, name, position, color) VALUES (?, ?, ?, ?)',
        splitId, workout.name, position, workout.color ?? null).lastInsertRowId;
      workout.exercises.forEach((exercise, exercisePosition) => {
        db.runSync('INSERT INTO custom_split_workout_exercises (workout_id, exercise_id, position) VALUES (?, ?, ?)',
          workoutId, resolve(exercise), exercisePosition);
      });
      return workoutId;
    });
    if (attemptId) db.runSync(
      'INSERT INTO shared_split_import_receipts (attempt_id, payload, split_id) VALUES (?, ?, ?)',
      attemptId, serialized.value, splitId);
    result = { splitId, name, workoutIds };
  });
  return result;
};
