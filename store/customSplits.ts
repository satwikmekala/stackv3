import type { DayColor } from '@/features/custom-split/colors';
import type { ExerciseLoadType, ExerciseMetric, WorkoutType } from '@/store/workoutStore';

export const EMPTY_CUSTOM_WORKOUT_MESSAGE =
  "This workout doesn't have any exercises yet — add some first.";

export class EmptyCustomWorkoutError extends Error {
  constructor(workoutId: number) {
    super(`Custom split workout ${workoutId} has no exercises`);
    this.name = 'EmptyCustomWorkoutError';
  }
}

export interface CustomSplitSummary {
  hasHevyDetails?: boolean;
  /** The edited Stack's plan. Shown as Stack's plan, never in the routine library. */
  isStackPlan?: boolean;
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
  isStackPlan?: boolean;
  workouts: CustomSplitWorkout[];
}

export interface CustomSplitWorkout {
  color?: DayColor | null;
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
  metric: ExerciseMetric;
  workoutType: WorkoutType;
  isCustom: boolean;
  position: number;
}
