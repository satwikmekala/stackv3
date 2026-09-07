import type { WorkoutType } from '@/store/workoutStore';

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
  workoutType: WorkoutType;
  isCustom: boolean;
  position: number;
}
