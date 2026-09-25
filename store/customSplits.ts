import type { ExerciseLoadType, WorkoutType } from '@/store/workoutStore';

export const EMPTY_CUSTOM_WORKOUT_MESSAGE =
  "This workout doesn't have any exercises yet — add some first.";

export class EmptyCustomWorkoutError extends Error {
  constructor(workoutId: number) {
    super(`Custom split workout ${workoutId} has no exercises`);
    this.name = 'EmptyCustomWorkoutError';
  }
}

export interface CustomSplitSummary {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  workoutCount: number;
  exerciseCount: number;
}

export interface CustomSplit {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  workouts: CustomSplitWorkout[];
}

export interface CustomSplitWorkout {
  id: number;
  splitId: number;
  name: string;
  position: number;
  exercises: CustomSplitExercise[];
}

export interface CustomSplitExercise {
  id: number;
  exerciseId: number;
  name: string;
  primaryMuscle: string;
  equipment: string | null;
  loadType: ExerciseLoadType;
  workoutType: WorkoutType;
  isCustom: boolean;
  position: number;
}
