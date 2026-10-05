import { exerciseMatchKey, serializeSharedSplit, parseSharedSplitJson, type PortableSplit } from './splitProtocol';
import type { DraftCustomSplit, DraftExercise, SharedDraftWorkout } from '@/store/customSplitDraft';
import type { ExerciseSeed } from '@/store/workoutDatabase';
import { portableSplitFromCustomSplit } from './customSplitAdapter';

/** Seed metadata supplies rendering without restoring missing/renamed DB rows.
 * Every received exercise remains staged, even if a local equivalent exists. */
export function buildSharedRoutineDraft(split: PortableSplit, seeds: readonly ExerciseSeed[]):
  SharedDraftWorkout[] {
  const byKey = new Map(seeds.map(seed => [exerciseMatchKey(seed.name), seed]));
  const staged = new Map<string, DraftExercise>();
  return split.workouts.map(day => ({ name: day.name, color: day.color ?? null, pending: [],
    exercises: day.exercises.map(exercise => {
      const key = exerciseMatchKey(exercise.name);
      const existing = staged.get(key);
      if (existing) return { ...existing, portable: { ...existing.portable! } };
      const seed = exercise.kind === 'builtin' ? byKey.get(key) : null;
      if (exercise.kind === 'builtin' && !seed) throw new Error('This routine needs a newer Stack. Update to open it.');
      const definition = seed ?? (exercise.kind === 'custom' ? exercise : null)!;
      const item: DraftExercise = { id: -(staged.size + 1), name: definition.name,
        workoutType: definition.workoutType, primaryMuscle: definition.primaryMuscle,
        equipment: seed ? null : (exercise.kind === 'custom' ? exercise.equipment : null),
        loadType: definition.loadType, metric: definition.metric, isCustom: !seed,
        portable: seed ? { kind: 'builtin', name: seed.name } : { ...exercise } };
      staged.set(key, item);
      return item;
    }),
  }));
}

/** Use the existing adapter for catalog picks, preserving staged definitions
 * and exact wire workout names (including named empty workouts) for imports. */
export function sharedDraftToPortable(draft: DraftCustomSplit, builtInNames: ReadonlySet<string>): PortableSplit {
  const projected = portableSplitFromCustomSplit({ id: 0, name: draft.name, createdAt: '', updatedAt: '',
    workouts: draft.workouts.map((day, position) => ({ id: position, splitId: 0, position, name: day.customName,
      color: day.color ?? null, exercises: day.exercises.map((exercise, index) => ({ ...exercise,
        exerciseId: exercise.id, position: index })) })) }, builtInNames);
  projected.workouts.forEach((day, index) => {
    day.exercises = draft.workouts[index].exercises.map((exercise, position) => exercise.portable ?? day.exercises[position]);
  });
  const serialized = serializeSharedSplit(projected);
  if (!serialized.ok) throw new Error('Check your routine name, workouts and exercises before saving.');
  const parsed = parseSharedSplitJson(serialized.value);
  if (!parsed.ok) throw new Error('Check your routine before saving.');
  return parsed.value;
}

export function stageSharedCustomExercise(draft: DraftCustomSplit, picked: DraftExercise[], exercise: Omit<DraftExercise, 'id' | 'portable'>, allocatedId?: number): DraftExercise {
  const ids = [...draft.workouts.flatMap(day => day.exercises), ...picked].map(item => item.id);
  return { ...exercise, id: allocatedId ?? Math.min(0, ...ids) - 1, portable: { kind: 'custom', name: exercise.name,
    workoutType: exercise.workoutType, primaryMuscle: exercise.primaryMuscle,
    equipment: exercise.equipment as 'Barbell' | 'Dumbbell' | 'Cable' | 'Machine' | null,
    loadType: exercise.loadType, metric: exercise.metric } };
}
