import type { WorkoutSession } from '@/store/workoutStore';
import { getExerciseMetric } from '@/store/exerciseMeasurement';

type SessionExercise = WorkoutSession['exercises'][number];

export const performedSets = (sets: SessionExercise['sets']) =>
  sets.filter((set) => set.completed && !set.skipped);

/** Recorded load × actual reps, shared by the recap and per-exercise share totals. */
export function getExerciseVolumeKg(exercise: SessionExercise): number {
  if (exercise.loadType === 'bodyweight' || getExerciseMetric(exercise) === 'duration') return 0;
  return performedSets(exercise.sets).reduce((sum, set) => sum + set.weight * set.reps, 0);
}
