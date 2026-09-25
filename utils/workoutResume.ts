import type { ImperativeRouter } from 'expo-router';
import type { Exercise } from '@/store/workoutStore';

export const resumeWorkout = (router: Pick<ImperativeRouter, 'push'>) => {
  router.push({ pathname: '/workout', params: { fromActivityCard: '1' } });
};

// The mini-bar describes the same persisted position that Workout resumes.
export const getInitialExerciseIndex = (exercises: Exercise[]) => {
  const firstIncomplete = exercises.findIndex((exercise) =>
    exercise.sets.some((set) => !set.completed)
  );
  return firstIncomplete === -1 ? Math.max(0, exercises.length - 1) : firstIncomplete;
};
