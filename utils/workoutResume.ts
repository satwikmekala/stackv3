import type { ImperativeRouter } from 'expo-router';
import type { Exercise, WorkoutFocus, WorkoutSession } from '@/store/workoutStore';

export const resumeWorkout = (router: Pick<ImperativeRouter, 'push'>) => {
  router.push({ pathname: '/workout', params: { fromActivityCard: '1' } });
};

// Persisted resume fallback after launch, before an explicit exercise selection.
export const getInitialExerciseIndex = (exercises: Exercise[]) => {
  const firstIncomplete = exercises.findIndex((exercise) =>
    exercise.sets.some((set) => !set.completed)
  );
  return firstIncomplete === -1 ? Math.max(0, exercises.length - 1) : firstIncomplete;
};

export const getCurrentWorkoutExerciseIndex = (session: WorkoutSession, focus: WorkoutFocus | null) =>
  focus?.workoutId === session.id && session.exercises[focus.exerciseIndex]
    ? focus.exerciseIndex
    : getInitialExerciseIndex(session.exercises);

export const getActiveSetIndex = (exercise: Exercise) => {
  const index = exercise.sets.findIndex((set) => !set.completed);
  return index === -1 ? Math.max(0, exercise.sets.length - 1) : index;
};
