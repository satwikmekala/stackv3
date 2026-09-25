import { getWeightIncrementKg } from '@/store/weightUnits';
import type { Exercise, ExerciseSet, UserProfile } from '@/store/workoutStore';

export const workoutSetActions = [
  'increaseWeight', 'decreaseWeight', 'increaseReps', 'decreaseReps', 'completeSet',
] as const;
export type WorkoutSetAction = typeof workoutSetActions[number];

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
export function projectSetToggle(source: Exercise[], exerciseIndex: number, setIndex: number, profile: UserProfile | null) {
  const exercises = source.map((exercise) => ({ ...exercise, sets: exercise.sets.map((set) => ({ ...set })) }));
  const exercise = exercises[exerciseIndex];
  const target = exercise.sets[setIndex];
  const completed = !target.completed;
  const updated = { ...target, completed, skipped: completed ? target.skipped : false };
  const updates: { setIndex: number; set: ExerciseSet }[] = [{ setIndex, set: updated }];
  exercise.sets[setIndex] = updated;
  let propagation: { setIndex: number; weightOffsetKg?: number; repsFromCurrent: boolean } | undefined;
  const next = exercise.sets[setIndex + 1];
  if (completed && next && !next.completed && !next.skipped) {
    if (!profile) throw new Error('A profile is required to progress a set');
    const offset = profile.autoIncreaseWeight ? getWeightIncrementKg(profile) : 0;
    const weight = exercise.loadType === 'bodyweight' ? 0 : target.weight + offset;
    propagation = { setIndex: setIndex + 1,
      weightOffsetKg: exercise.loadType === 'bodyweight' ? undefined : offset,
      repsFromCurrent: !profile.autoIncreaseWeight,
    };
    const propagated = { ...next,
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
