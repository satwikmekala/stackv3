import type { SQLiteDatabase } from 'expo-sqlite';
import type { ImportPlan, ImportResult, ImportRoutine, ImportTemplate, ImportWorkout } from './models';
import { usableImportedSet } from './models';
import { createHevyImportPlan } from './hevy/importPlan';
import { HevyImportError } from './hevy/errors';

export const IMPORT_SCHEMA = `
CREATE TABLE IF NOT EXISTS imported_exercises (
  account_id TEXT NOT NULL, source_id TEXT NOT NULL,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  data TEXT NOT NULL, PRIMARY KEY(account_id, source_id)
);
CREATE TABLE IF NOT EXISTS imported_routine_groups (
  account_id TEXT NOT NULL, source_id TEXT NOT NULL,
  split_id INTEGER NOT NULL REFERENCES custom_splits(id) ON DELETE CASCADE,
  PRIMARY KEY(account_id, source_id)
);
CREATE TABLE IF NOT EXISTS imported_routines (
  account_id TEXT NOT NULL, source_id TEXT NOT NULL,
  workout_id INTEGER NOT NULL UNIQUE REFERENCES custom_split_workouts(id) ON DELETE CASCADE,
  data TEXT NOT NULL, PRIMARY KEY(account_id, source_id)
);
CREATE TABLE IF NOT EXISTS imported_routine_exercises (
  workout_exercise_id INTEGER PRIMARY KEY REFERENCES custom_split_workout_exercises(id) ON DELETE CASCADE,
  data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS imported_workouts (
  account_id TEXT NOT NULL, source_id TEXT NOT NULL,
  session_id INTEGER NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  data TEXT NOT NULL, PRIMARY KEY(account_id, source_id)
);
`;
export type ImportedWorkoutFacts = ImportWorkout & { templates: ImportTemplate[] };
export type ImportedRoutineFacts = ImportRoutine & { templates: ImportTemplate[] };
type Database = Pick<SQLiteDatabase, 'getAllSync' | 'getFirstSync' | 'runSync' | 'withTransactionSync'>;

/** No network in this transaction. Re-resolve identities against the current database. */
export function persistHevyImport(db: Database, input: ImportPlan): ImportResult {
  try {
    let result!: ImportResult;
    db.withTransactionSync(() => {
      const plan = createHevyImportPlan(db, input.snapshot);
      const { snapshot } = plan; const account = snapshot.accountId;
      result = { routines: 0, workouts: 0, exercises: 0, alreadyImported: plan.existingRoutines + plan.existingWorkouts };
      const exerciseIds = new Map<string, number>();
      const resolutions = new Map(plan.resolutions.map(item => [item.template.id, item]));
      for (const resolution of plan.resolutions) {
        let id = resolution.localId;
        if (id === null) {
          // Same-named authored exercises stay separate; a deterministic source mapping handles retries.
          let name = resolution.name;
          for (let suffix = 1; db.getFirstSync('SELECT id FROM exercises WHERE name = ?', name); suffix++) name = `${resolution.name} (Hevy${suffix === 1 ? '' : ` ${suffix}`})`;
          id = db.runSync(`INSERT INTO exercises (name, workout_type, primary_muscle, secondary_muscle, is_custom, equipment, load_type, metric)
            VALUES (?, ?, ?, ?, 1, ?, ?, ?)`, name, resolution.workoutType, resolution.primaryMuscle,
          resolution.template.secondaryMuscles.join(', ') || null, resolution.template.equipment, resolution.loadType, resolution.metric).lastInsertRowId;
          result.exercises++;
        }
        exerciseIds.set(resolution.template.id, id);
        db.runSync(`INSERT INTO imported_exercises (account_id, source_id, exercise_id, data) VALUES (?, ?, ?, ?)
          ON CONFLICT(account_id, source_id) DO UPDATE SET exercise_id = excluded.exercise_id, data = excluded.data`,
        account, resolution.template.id, id, JSON.stringify(resolution.template));
      }
      const groups = new Map<string, number>();
      const now = new Date().toISOString();
      for (const routine of snapshot.routines) {
        if (db.getFirstSync('SELECT workout_id FROM imported_routines WHERE account_id = ? AND source_id = ?', account, routine.id)) continue;
        const groupKey = routine.folderId === null ? 'unfiled' : `folder:${routine.folderId}`;
        let group = groups.get(groupKey) ?? db.getFirstSync<{ split_id: number }>('SELECT split_id FROM imported_routine_groups WHERE account_id = ? AND source_id = ?', account, groupKey)?.split_id;
        if (group === undefined) {
          const name = snapshot.folders.find(item => item.id === routine.folderId)?.name ?? 'Hevy routines';
          group = db.runSync('INSERT INTO custom_splits (name, created_at, updated_at) VALUES (?, ?, ?)', name, now, now).lastInsertRowId;
          db.runSync('INSERT INTO imported_routine_groups (account_id, source_id, split_id) VALUES (?, ?, ?)', account, groupKey, group);
        }
        groups.set(groupKey, group);
        const position = db.getFirstSync<{ next: number }>('SELECT COALESCE(MAX(position), -1) + 1 AS next FROM custom_split_workouts WHERE split_id = ?', group)!.next;
        const workoutId = db.runSync('INSERT INTO custom_split_workouts (split_id, name, position) VALUES (?, ?, ?)', group, routine.name, position).lastInsertRowId;
        for (const [position, exercise] of routine.exercises.entries()) {
          const local = db.runSync('INSERT INTO custom_split_workout_exercises (workout_id, exercise_id, position) VALUES (?, ?, ?)', workoutId, exerciseIds.get(exercise.templateId)!, position).lastInsertRowId;
          db.runSync('INSERT INTO imported_routine_exercises (workout_exercise_id, data) VALUES (?, ?)', local,
            JSON.stringify({ ...exercise, template: resolutions.get(exercise.templateId)!.template }));
        }
        const facts: ImportedRoutineFacts = { ...routine, templates: routine.exercises.map(exercise => resolutions.get(exercise.templateId)!.template) };
        db.runSync('INSERT INTO imported_routines (account_id, source_id, workout_id, data) VALUES (?, ?, ?, ?)', account, routine.id, workoutId, JSON.stringify(facts));
        result.routines++;
      }
      // Chronological insertion makes the existing same-time PR tie breaker deterministic.
      for (const workout of [...snapshot.workouts].sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id))) {
        if (db.getFirstSync('SELECT session_id FROM imported_workouts WHERE account_id = ? AND source_id = ?', account, workout.id)) continue;
        const session = db.runSync("INSERT INTO sessions (date, origin, completed, completed_at, retroactive) VALUES (?, 'legacy', 1, ?, 0)", workout.startedAt, workout.endedAt).lastInsertRowId;
        const types = [...new Set(workout.exercises.map(exercise => resolutions.get(exercise.templateId)!.workoutType))];
        types.forEach((type, position) => db.runSync('INSERT INTO session_workout_types (session_id, workout_type, position) VALUES (?, ?, ?)', session, type, position));
        for (const [position, exercise] of workout.exercises.entries()) {
          const resolved = resolutions.get(exercise.templateId)!;
          const se = db.runSync('INSERT INTO session_exercises (session_id, exercise_id, position, entry_unit, load_type, metric) VALUES (?, ?, ?, ?, ?, ?)',
            session, exerciseIds.get(exercise.templateId)!, position, snapshot.weightUnit, resolved.loadType, resolved.metric).lastInsertRowId;
          for (const [index, set] of exercise.sets.entries()) {
            const usable = usableImportedSet(resolved.template, set);
            db.runSync(`INSERT INTO sets (session_exercise_id, set_index, reps, weight, duration_s, completed, skipped, bonus_type, value_origin)
              VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'user')`, se, index, set.reps ?? 0, set.weightKg ?? 0,
            set.durationS, usable ? 1 : 0, set.kind === 'dropset' ? 'dropset' : null);
          }
        }
        const facts: ImportedWorkoutFacts = { ...workout, templates: workout.exercises.map(exercise => resolutions.get(exercise.templateId)!.template) };
        db.runSync('INSERT INTO imported_workouts (account_id, source_id, session_id, data) VALUES (?, ?, ?, ?)', account, workout.id, session, JSON.stringify(facts));
        result.workouts++;
      }
      if (db.getAllSync('PRAGMA foreign_key_check').length) throw new HevyImportError('persistence');
    });
    return result;
  } catch { throw new HevyImportError('persistence'); }
}
