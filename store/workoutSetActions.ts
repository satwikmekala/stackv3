import { getWeightIncrementKg } from '@/store/weightUnits';
import { isDurationExercise } from '@/store/exerciseMeasurement';
import type { Exercise, ExerciseLoadType, ExerciseMetric, SessionExercise, ExerciseSet, UserProfile } from '@/store/workoutStore';

export const workoutSetActions = [
  'increaseWeight', 'decreaseWeight', 'increaseReps', 'decreaseReps',
  'increaseDuration', 'decreaseDuration', 'completeSet',
] as const;
export type WorkoutSetAction = typeof workoutSetActions[number];
export type WorkoutSetValueAction = Exclude<WorkoutSetAction, 'completeSet'> | 'setWeight' | 'setReps' | 'setDuration';

/** The only controls an exercise's measurement exposes, on every surface. */
export const getMeasurementActions = (loadType: ExerciseLoadType, metric: ExerciseMetric): WorkoutSetAction[] =>
  workoutSetActions.filter((action) => {
    if (action.endsWith('Weight')) return loadType === 'external_weight';
    if (action.endsWith('Reps')) return metric === 'reps';
    if (action.endsWith('Duration')) return metric === 'duration';
    return true;
  });
// Captured when an editor opens. Completion is part of its lease: an active
// editor cannot become a historical editor merely because the set advanced.
export type WorkoutSetEditTarget = WorkoutSetTarget & { completed: boolean };
export const sameSetTarget = (a: WorkoutSetTarget, b: WorkoutSetTarget) =>
  (['workoutId', 'workoutStartedAt', 'exerciseId', 'setId', 'exerciseName', 'exerciseIndex', 'setIndex'] as const)
    .every((key) => a[key] === b[key]);

// Priority: user > history > propagated > template. Only automatic values that
// carry no "last time" meaning may be recalculated from the previous set.
export const canPropagateToSet = (set: ExerciseSet) =>
  !set.completed && !set.skipped && set.valueOrigin !== 'user' && set.valueOrigin !== 'history';

// IDs come from existing SQLite rows. Positions are checked again, never trusted
// as identities; replacing an exercise allocates new set IDs even with the same name.
export type WorkoutSetTarget = {
  workoutId: string;
  workoutStartedAt: string;
  exerciseId: string;
  setId: string;
  exerciseName: string;
  exerciseIndex: number;
  setIndex: number;
};
export type WorkoutSetActionResult = {
  status: 'applied' | 'stale' | 'unavailable' | 'failed';
  needsFeedback?: boolean;
  completedExercise?: boolean;
};

export const isExerciseComplete = (exercise: Exercise) =>
  exercise.sets.every((set) => set.completed);

// Shared by the screen's Next button and active-set completion from any surface.
export function getNextIncompleteExerciseIndex(exercises: Exercise[], currentIndex: number) {
  for (let offset = 1; offset < exercises.length; offset += 1) {
    const candidate = (currentIndex + offset) % exercises.length;
    if (!isExerciseComplete(exercises[candidate])) return candidate;
  }
  return -1;
}

// One projection is used by persistence and by the next-set presentation preview.
export function projectSetToggle(source: SessionExercise[], exerciseIndex: number, setIndex: number, profile: UserProfile | null) {
  const exercises = source.map((exercise) => ({ ...exercise, sets: exercise.sets.map((set) => ({ ...set })) }));
  const exercise = exercises[exerciseIndex];
  const target = exercise.sets[setIndex];
  // Completion is idempotent. Inspection/correction never reopens a set or
  // replays progression into its neighbours.
  if (target.completed) return { exercises, updates: [], propagation: undefined };
  const updated = { ...target, completed: true };
  const updates: { setIndex: number; set: ExerciseSet }[] = [{ setIndex, set: updated }];
  exercise.sets[setIndex] = updated;
  let propagation: { setIndex: number; weightOffsetKg?: number; repsFromCurrent: boolean; durationFromCurrent?: boolean } | undefined;
  const next = exercise.sets[setIndex + 1];
  if (next && canPropagateToSet(next) && isDurationExercise(exercise)) {
    // Timed sets repeat what was just done: no Increase Between Sets and no
    // invented duration progression. Only automatic values are rewritten.
    const weight = exercise.loadType === 'bodyweight' ? 0 : target.weight;
    propagation = { setIndex: setIndex + 1,
      weightOffsetKg: exercise.loadType === 'bodyweight' ? undefined : 0,
      repsFromCurrent: false,
      durationFromCurrent: true,
    };
    const propagated = { ...next, valueOrigin: 'propagated' as const,
      weight, targetWeight: weight,
      durationS: target.durationS, targetDurationS: target.durationS,
    };
    exercise.sets[setIndex + 1] = propagated;
    updates.push({ setIndex: setIndex + 1, set: propagated });
  } else if (next && canPropagateToSet(next)) {
    if (!profile) throw new Error('A profile is required to progress a set');
    const offset = profile.autoIncreaseWeight ? getWeightIncrementKg(profile, exercise.entryUnit) : 0;
    const weight = exercise.loadType === 'bodyweight' ? 0 : target.weight + offset;
    propagation = { setIndex: setIndex + 1,
      weightOffsetKg: exercise.loadType === 'bodyweight' ? undefined : offset,
      repsFromCurrent: !profile.autoIncreaseWeight,
    };
    const propagated = { ...next, valueOrigin: 'propagated' as const,
      reps: profile.autoIncreaseWeight ? next.reps : target.reps,
      weight,
      targetReps: profile.autoIncreaseWeight ? next.targetReps : target.reps,
      targetWeight: weight,
    };
    exercise.sets[setIndex + 1] = propagated;
    updates.push({ setIndex: setIndex + 1, set: propagated });
  }
  return { exercises, updates, propagation };
}
