import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { Archetype } from '@/constants/archetypes';

import type {
  BonusSetType,
  Exercise,
  ExerciseSet,
  ExperienceLevel,
  IntensityLevel,
  UserProfile,
  WorkoutSession,
  WorkoutType,
} from '@/store/workoutStore';
import type { WeightUnit } from '@/store/weightUnits';
import {
  createCompletedSessionExercise,
  createSessionExercise,
} from '@/store/workoutProgression';

const DATABASE_NAME = 'workouts.db';
const CURRENT_SCHEMA_VERSION = 11;

// Default step for the manual weight steppers; mirrors the profile column
// default so a fresh row and a migrated row agree.
export const DEFAULT_WEIGHT_INCREMENT = 2.5;

// Display unit for every weight surface; storage stays kg-canonical regardless.
export const DEFAULT_WEIGHT_UNIT: WeightUnit = 'kg';

// Lb-native step, independent of DEFAULT_WEIGHT_INCREMENT — it is not a
// conversion of the kg value, it is the increment lifters expect in lbs.
export const DEFAULT_WEIGHT_INCREMENT_LBS = 5;

export interface ExerciseSeed {
  name: string;
  workoutType: WorkoutType;
  primaryMuscle: string;
  secondaryMuscle: string | null;
}

export interface SplitTemplateSeed {
  workoutType: WorkoutType;
  name: string;
  targetReps: number;
  targetWeight: number;
}

export interface ArchetypeTemplateSeed {
  archetype: Archetype;
  variant: string;
  exerciseName: string;
  matchingExerciseName: string;
  targetReps: number;
  targetWeight: number;
}

export interface ExerciseCatalogItem {
  id: number;
  name: string;
  workoutType: WorkoutType;
  primaryMuscle: string;
  isCustom: boolean;
}

export const EXERCISE_SEEDS: ExerciseSeed[] = [
  { name: 'Bench Press', workoutType: 'chest', primaryMuscle: 'Chest', secondaryMuscle: 'Triceps, Front Delts' },
  { name: 'Incline Dumbbell Press', workoutType: 'chest', primaryMuscle: 'Upper Chest', secondaryMuscle: 'Front Delts, Triceps' },
  { name: 'Chest Dips', workoutType: 'chest', primaryMuscle: 'Lower Chest, Triceps', secondaryMuscle: 'Front Delts' },
  { name: 'Cable Fly', workoutType: 'chest', primaryMuscle: 'Chest', secondaryMuscle: 'Front Delts' },
  { name: 'Incline Bench Press', workoutType: 'chest', primaryMuscle: 'Upper Chest', secondaryMuscle: 'Front Delts, Triceps' },
  { name: 'Push-ups', workoutType: 'chest', primaryMuscle: 'Chest', secondaryMuscle: 'Triceps, Front Delts, Core' },
  { name: 'Pec Deck', workoutType: 'chest', primaryMuscle: 'Chest', secondaryMuscle: null },
  { name: 'Decline Press', workoutType: 'chest', primaryMuscle: 'Lower Chest', secondaryMuscle: 'Triceps' },
  { name: 'Machine Chest Press', workoutType: 'chest', primaryMuscle: 'Chest', secondaryMuscle: 'Triceps' },
  { name: 'Incline Cable Fly', workoutType: 'chest', primaryMuscle: 'Upper Chest', secondaryMuscle: 'Front Delts' },

  { name: 'Deadlift', workoutType: 'back', primaryMuscle: 'Back, Hamstrings, Glutes', secondaryMuscle: 'Traps, Forearms' },
  { name: 'Pull-ups', workoutType: 'back', primaryMuscle: 'Lats', secondaryMuscle: 'Biceps' },
  { name: 'Barbell Rows', workoutType: 'back', primaryMuscle: 'Lats, Mid-back', secondaryMuscle: 'Biceps, Rear Delts' },
  { name: 'Lat Pulldown', workoutType: 'back', primaryMuscle: 'Lats', secondaryMuscle: 'Biceps' },
  { name: 'Seated Cable Row', workoutType: 'back', primaryMuscle: 'Mid-back, Lats', secondaryMuscle: 'Biceps' },
  { name: 'T-Bar Row', workoutType: 'back', primaryMuscle: 'Mid-back', secondaryMuscle: 'Biceps, Rear Delts' },
  { name: 'Single-Arm Dumbbell Row', workoutType: 'back', primaryMuscle: 'Lats', secondaryMuscle: 'Biceps' },
  { name: 'Back Extensions', workoutType: 'back', primaryMuscle: 'Lower Back', secondaryMuscle: 'Glutes, Hamstrings' },
  { name: 'Chest-Supported Row', workoutType: 'back', primaryMuscle: 'Mid-back', secondaryMuscle: 'Rear Delts, Biceps' },
  { name: 'Straight-Arm Pulldown', workoutType: 'back', primaryMuscle: 'Lats', secondaryMuscle: null },

  { name: 'Overhead Press', workoutType: 'shoulders', primaryMuscle: 'Front/Side Delts', secondaryMuscle: 'Triceps' },
  { name: 'Lateral Raises', workoutType: 'shoulders', primaryMuscle: 'Side Delts', secondaryMuscle: null },
  { name: 'Face Pulls', workoutType: 'shoulders', primaryMuscle: 'Rear Delts', secondaryMuscle: 'Traps' },
  { name: 'Front Raises', workoutType: 'shoulders', primaryMuscle: 'Front Delts', secondaryMuscle: null },
  { name: 'Arnold Press', workoutType: 'shoulders', primaryMuscle: 'Front/Side Delts', secondaryMuscle: 'Triceps' },
  { name: 'Rear Delt Fly', workoutType: 'shoulders', primaryMuscle: 'Rear Delts', secondaryMuscle: null },
  { name: 'Upright Rows', workoutType: 'shoulders', primaryMuscle: 'Side Delts, Traps', secondaryMuscle: 'Biceps' },
  { name: 'Shrugs', workoutType: 'shoulders', primaryMuscle: 'Traps', secondaryMuscle: null },
  { name: 'Cable Lateral Raise', workoutType: 'shoulders', primaryMuscle: 'Side Delts', secondaryMuscle: null },
  { name: 'Landmine Press', workoutType: 'shoulders', primaryMuscle: 'Front Delts, Chest', secondaryMuscle: 'Triceps' },

  { name: 'Bicep Curls', workoutType: 'arms', primaryMuscle: 'Biceps', secondaryMuscle: null },
  { name: 'Dumbbell Curl', workoutType: 'arms', primaryMuscle: 'Biceps', secondaryMuscle: null },
  { name: 'Hammer Curls', workoutType: 'arms', primaryMuscle: 'Biceps', secondaryMuscle: 'Forearms' },
  { name: 'Preacher Curls', workoutType: 'arms', primaryMuscle: 'Biceps', secondaryMuscle: null },
  { name: 'Cable Curls', workoutType: 'arms', primaryMuscle: 'Biceps', secondaryMuscle: null },
  { name: 'Tricep Extensions', workoutType: 'arms', primaryMuscle: 'Triceps', secondaryMuscle: null },
  { name: 'Tricep Dips', workoutType: 'arms', primaryMuscle: 'Triceps', secondaryMuscle: 'Chest, Front Delts' },
  { name: 'Tricep Pushdown', workoutType: 'arms', primaryMuscle: 'Triceps', secondaryMuscle: null },
  { name: 'Skull Crushers', workoutType: 'arms', primaryMuscle: 'Triceps', secondaryMuscle: null },
  { name: 'Close-Grip Bench Press', workoutType: 'arms', primaryMuscle: 'Triceps', secondaryMuscle: 'Chest' },

  { name: 'Squats', workoutType: 'legs', primaryMuscle: 'Quads', secondaryMuscle: 'Glutes' },
  { name: 'Leg Press', workoutType: 'legs', primaryMuscle: 'Quads', secondaryMuscle: 'Glutes' },
  { name: 'Romanian Deadlift', workoutType: 'legs', primaryMuscle: 'Hamstrings', secondaryMuscle: 'Glutes, Lower Back' },
  { name: 'Lunges', workoutType: 'legs', primaryMuscle: 'Quads, Glutes', secondaryMuscle: 'Hamstrings' },
  { name: 'Leg Curl', workoutType: 'legs', primaryMuscle: 'Hamstrings', secondaryMuscle: null },
  { name: 'Leg Extension', workoutType: 'legs', primaryMuscle: 'Quads', secondaryMuscle: null },
  { name: 'Calf Raises', workoutType: 'legs', primaryMuscle: 'Calves', secondaryMuscle: null },
  { name: 'Hip Thrusts', workoutType: 'legs', primaryMuscle: 'Glutes', secondaryMuscle: 'Hamstrings' },
  { name: 'Front Squat', workoutType: 'legs', primaryMuscle: 'Quads', secondaryMuscle: 'Core' },
  { name: 'Bulgarian Split Squat', workoutType: 'legs', primaryMuscle: 'Quads, Glutes', secondaryMuscle: 'Hamstrings' },

  { name: 'Plank', workoutType: 'core', primaryMuscle: 'Abs / Core Stability', secondaryMuscle: null },
  { name: 'Crunches', workoutType: 'core', primaryMuscle: 'Abs', secondaryMuscle: null },
  { name: 'Cable Crunch', workoutType: 'core', primaryMuscle: 'Abs', secondaryMuscle: null },
  { name: 'Hanging Leg Raise', workoutType: 'core', primaryMuscle: 'Abs', secondaryMuscle: 'Hip Flexors' },
  { name: 'Leg Raises', workoutType: 'core', primaryMuscle: 'Lower Abs', secondaryMuscle: 'Hip Flexors' },
  { name: 'Russian Twists', workoutType: 'core', primaryMuscle: 'Obliques', secondaryMuscle: null },
  { name: 'Ab Wheel Rollout', workoutType: 'core', primaryMuscle: 'Abs', secondaryMuscle: 'Lower Back, Shoulders' },
  { name: 'Mountain Climbers', workoutType: 'core', primaryMuscle: 'Abs', secondaryMuscle: 'Hip Flexors' },
  { name: 'Side Plank', workoutType: 'core', primaryMuscle: 'Obliques', secondaryMuscle: null },
  { name: 'Cable Woodchopper', workoutType: 'core', primaryMuscle: 'Obliques', secondaryMuscle: 'Core Rotation' },
];

export const SPLIT_TEMPLATE_SEEDS: SplitTemplateSeed[] = [
  { workoutType: 'chest', name: 'Bench Press', targetReps: 8, targetWeight: 40 },
  { workoutType: 'chest', name: 'Incline Dumbbell Press', targetReps: 10, targetWeight: 15 },
  { workoutType: 'chest', name: 'Chest Dips', targetReps: 10, targetWeight: 0 },
  { workoutType: 'chest', name: 'Cable Fly', targetReps: 12, targetWeight: 10 },
  { workoutType: 'back', name: 'Deadlift', targetReps: 6, targetWeight: 60 },
  { workoutType: 'back', name: 'Pull-ups', targetReps: 8, targetWeight: 0 },
  { workoutType: 'back', name: 'Barbell Rows', targetReps: 8, targetWeight: 40 },
  { workoutType: 'back', name: 'Lat Pulldown', targetReps: 10, targetWeight: 35 },
  { workoutType: 'shoulders', name: 'Overhead Press', targetReps: 8, targetWeight: 25 },
  { workoutType: 'shoulders', name: 'Lateral Raises', targetReps: 12, targetWeight: 7.5 },
  { workoutType: 'shoulders', name: 'Face Pulls', targetReps: 15, targetWeight: 12.5 },
  { workoutType: 'shoulders', name: 'Front Raises', targetReps: 12, targetWeight: 7.5 },
  { workoutType: 'arms', name: 'Bicep Curls', targetReps: 12, targetWeight: 12.5 },
  { workoutType: 'arms', name: 'Tricep Extensions', targetReps: 12, targetWeight: 15 },
  { workoutType: 'arms', name: 'Hammer Curls', targetReps: 12, targetWeight: 10 },
  { workoutType: 'arms', name: 'Tricep Dips', targetReps: 10, targetWeight: 0 },
  { workoutType: 'legs', name: 'Squats', targetReps: 8, targetWeight: 60 },
  { workoutType: 'legs', name: 'Leg Press', targetReps: 10, targetWeight: 100 },
  { workoutType: 'legs', name: 'Lunges', targetReps: 12, targetWeight: 20 },
  { workoutType: 'legs', name: 'Calf Raises', targetReps: 15, targetWeight: 40 },
  { workoutType: 'core', name: 'Plank', targetReps: 60, targetWeight: 0 },
  { workoutType: 'core', name: 'Crunches', targetReps: 20, targetWeight: 0 },
  { workoutType: 'core', name: 'Leg Raises', targetReps: 15, targetWeight: 0 },
  { workoutType: 'core', name: 'Russian Twists', targetReps: 30, targetWeight: 5 },
];

const ARCHETYPE_TEMPLATE_SEEDS: ArchetypeTemplateSeed[] = [
  { archetype: 'full_body', variant: 'a', exerciseName: 'Squat', matchingExerciseName: 'Squats', targetReps: 8, targetWeight: 60 },
  { archetype: 'full_body', variant: 'a', exerciseName: 'Bench Press', matchingExerciseName: 'Bench Press', targetReps: 8, targetWeight: 40 },
  { archetype: 'full_body', variant: 'a', exerciseName: 'Deadlift', matchingExerciseName: 'Deadlift', targetReps: 6, targetWeight: 60 },
  { archetype: 'full_body', variant: 'a', exerciseName: 'Overhead Press', matchingExerciseName: 'Overhead Press', targetReps: 8, targetWeight: 25 },
  { archetype: 'full_body', variant: 'a', exerciseName: 'Pull-Up', matchingExerciseName: 'Pull-ups', targetReps: 8, targetWeight: 0 },
  { archetype: 'push', variant: 'a', exerciseName: 'Barbell Bench Press', matchingExerciseName: 'Bench Press', targetReps: 8, targetWeight: 40 },
  { archetype: 'push', variant: 'a', exerciseName: 'Overhead Press', matchingExerciseName: 'Overhead Press', targetReps: 8, targetWeight: 25 },
  { archetype: 'push', variant: 'a', exerciseName: 'Incline Dumbbell Press', matchingExerciseName: 'Incline Dumbbell Press', targetReps: 10, targetWeight: 15 },
  { archetype: 'push', variant: 'a', exerciseName: 'Dips', matchingExerciseName: 'Chest Dips', targetReps: 10, targetWeight: 0 },
  { archetype: 'push', variant: 'a', exerciseName: 'Lateral Raise', matchingExerciseName: 'Lateral Raises', targetReps: 12, targetWeight: 7.5 },
  { archetype: 'pull', variant: 'a', exerciseName: 'Deadlift', matchingExerciseName: 'Deadlift', targetReps: 6, targetWeight: 60 },
  { archetype: 'pull', variant: 'a', exerciseName: 'Pull-Up', matchingExerciseName: 'Pull-ups', targetReps: 8, targetWeight: 0 },
  { archetype: 'pull', variant: 'a', exerciseName: 'Barbell Row', matchingExerciseName: 'Barbell Rows', targetReps: 8, targetWeight: 40 },
  { archetype: 'pull', variant: 'a', exerciseName: 'Face Pull', matchingExerciseName: 'Face Pulls', targetReps: 15, targetWeight: 12.5 },
  { archetype: 'pull', variant: 'a', exerciseName: 'Barbell Curl', matchingExerciseName: 'Barbell Curl', targetReps: 12, targetWeight: 20 },
  { archetype: 'legs', variant: 'a', exerciseName: 'Back Squat', matchingExerciseName: 'Back Squat', targetReps: 8, targetWeight: 60 },
  { archetype: 'legs', variant: 'a', exerciseName: 'Romanian Deadlift', matchingExerciseName: 'Romanian Deadlift', targetReps: 8, targetWeight: 60 },
  { archetype: 'legs', variant: 'a', exerciseName: 'Leg Press', matchingExerciseName: 'Leg Press', targetReps: 10, targetWeight: 100 },
  { archetype: 'legs', variant: 'a', exerciseName: 'Bulgarian Split Squat', matchingExerciseName: 'Bulgarian Split Squat', targetReps: 12, targetWeight: 20 },
  { archetype: 'legs', variant: 'a', exerciseName: 'Calf Raise', matchingExerciseName: 'Calf Raises', targetReps: 15, targetWeight: 40 },
  { archetype: 'upper', variant: 'a', exerciseName: 'Bench Press', matchingExerciseName: 'Bench Press', targetReps: 8, targetWeight: 40 },
  { archetype: 'upper', variant: 'a', exerciseName: 'Barbell Row', matchingExerciseName: 'Barbell Rows', targetReps: 8, targetWeight: 40 },
  { archetype: 'upper', variant: 'a', exerciseName: 'Overhead Press', matchingExerciseName: 'Overhead Press', targetReps: 8, targetWeight: 25 },
  { archetype: 'upper', variant: 'a', exerciseName: 'Lat Pulldown', matchingExerciseName: 'Lat Pulldown', targetReps: 10, targetWeight: 35 },
  { archetype: 'upper', variant: 'a', exerciseName: 'Biceps Curl', matchingExerciseName: 'Bicep Curls', targetReps: 12, targetWeight: 12.5 },
  { archetype: 'upper', variant: 'a', exerciseName: 'Face Pull', matchingExerciseName: 'Face Pulls', targetReps: 15, targetWeight: 12.5 },
  { archetype: 'lower', variant: 'a', exerciseName: 'Squat', matchingExerciseName: 'Squats', targetReps: 8, targetWeight: 60 },
  { archetype: 'lower', variant: 'a', exerciseName: 'Romanian Deadlift', matchingExerciseName: 'Romanian Deadlift', targetReps: 8, targetWeight: 60 },
  { archetype: 'lower', variant: 'a', exerciseName: 'Leg Press', matchingExerciseName: 'Leg Press', targetReps: 10, targetWeight: 100 },
  { archetype: 'lower', variant: 'a', exerciseName: 'Leg Curl', matchingExerciseName: 'Leg Curl', targetReps: 12, targetWeight: 0 },
  { archetype: 'lower', variant: 'a', exerciseName: 'Calf Raise', matchingExerciseName: 'Calf Raises', targetReps: 15, targetWeight: 40 },

  { archetype: 'lower', variant: 'b', exerciseName: 'Bulgarian Split Squat', matchingExerciseName: 'Bulgarian Split Squat', targetReps: 12, targetWeight: 20 },
  { archetype: 'lower', variant: 'b', exerciseName: 'Hip Thrust', matchingExerciseName: 'Hip Thrusts', targetReps: 10, targetWeight: 60 },
  { archetype: 'lower', variant: 'b', exerciseName: 'Walking Lunge', matchingExerciseName: 'Walking Lunge', targetReps: 12, targetWeight: 20 },
  { archetype: 'lower', variant: 'b', exerciseName: 'Leg Curl', matchingExerciseName: 'Leg Curl', targetReps: 12, targetWeight: 0 },
  { archetype: 'lower', variant: 'b', exerciseName: 'Calf Raise', matchingExerciseName: 'Calf Raises', targetReps: 15, targetWeight: 40 },
  { archetype: 'legs', variant: 'b', exerciseName: 'Front Squat', matchingExerciseName: 'Front Squat', targetReps: 8, targetWeight: 40 },
  { archetype: 'legs', variant: 'b', exerciseName: 'Hip Thrust', matchingExerciseName: 'Hip Thrusts', targetReps: 10, targetWeight: 60 },
  { archetype: 'legs', variant: 'b', exerciseName: 'Walking Lunge', matchingExerciseName: 'Walking Lunge', targetReps: 12, targetWeight: 20 },
  { archetype: 'legs', variant: 'b', exerciseName: 'Leg Curl', matchingExerciseName: 'Leg Curl', targetReps: 12, targetWeight: 0 },
  { archetype: 'legs', variant: 'b', exerciseName: 'Calf Raise', matchingExerciseName: 'Calf Raises', targetReps: 15, targetWeight: 40 },
  { archetype: 'upper', variant: 'b', exerciseName: 'Incline Dumbbell Press', matchingExerciseName: 'Incline Dumbbell Press', targetReps: 10, targetWeight: 15 },
  { archetype: 'upper', variant: 'b', exerciseName: 'Pull-Up', matchingExerciseName: 'Pull-ups', targetReps: 8, targetWeight: 0 },
  { archetype: 'upper', variant: 'b', exerciseName: 'Arnold Press', matchingExerciseName: 'Arnold Press', targetReps: 10, targetWeight: 15 },
  { archetype: 'upper', variant: 'b', exerciseName: 'Seated Cable Row', matchingExerciseName: 'Seated Cable Row', targetReps: 10, targetWeight: 35 },
  { archetype: 'upper', variant: 'b', exerciseName: 'Triceps Pushdown', matchingExerciseName: 'Tricep Pushdown', targetReps: 12, targetWeight: 15 },
  { archetype: 'upper', variant: 'b', exerciseName: 'Face Pull', matchingExerciseName: 'Face Pulls', targetReps: 15, targetWeight: 12.5 },
  { archetype: 'push', variant: 'b', exerciseName: 'Incline Barbell Press', matchingExerciseName: 'Incline Bench Press', targetReps: 8, targetWeight: 40 },
  { archetype: 'push', variant: 'b', exerciseName: 'Arnold Press', matchingExerciseName: 'Arnold Press', targetReps: 10, targetWeight: 15 },
  { archetype: 'push', variant: 'b', exerciseName: 'Chest Dips', matchingExerciseName: 'Chest Dips', targetReps: 10, targetWeight: 0 },
  { archetype: 'push', variant: 'b', exerciseName: 'Cable Fly', matchingExerciseName: 'Cable Fly', targetReps: 12, targetWeight: 10 },
  { archetype: 'push', variant: 'b', exerciseName: 'Overhead Triceps Extension', matchingExerciseName: 'Overhead Triceps Extension', targetReps: 12, targetWeight: 15 },
  { archetype: 'pull', variant: 'b', exerciseName: 'T-Bar Row', matchingExerciseName: 'T-Bar Row', targetReps: 8, targetWeight: 40 },
  { archetype: 'pull', variant: 'b', exerciseName: 'Lat Pulldown', matchingExerciseName: 'Lat Pulldown', targetReps: 10, targetWeight: 35 },
  { archetype: 'pull', variant: 'b', exerciseName: 'Single-Arm Dumbbell Row', matchingExerciseName: 'Single-Arm Dumbbell Row', targetReps: 10, targetWeight: 20 },
  { archetype: 'pull', variant: 'b', exerciseName: 'Face Pull', matchingExerciseName: 'Face Pulls', targetReps: 15, targetWeight: 12.5 },
  { archetype: 'pull', variant: 'b', exerciseName: 'Hammer Curl', matchingExerciseName: 'Hammer Curls', targetReps: 12, targetWeight: 10 },
  { archetype: 'full_body', variant: 'b', exerciseName: 'Front Squat', matchingExerciseName: 'Front Squat', targetReps: 8, targetWeight: 40 },
  { archetype: 'full_body', variant: 'b', exerciseName: 'Incline Dumbbell Press', matchingExerciseName: 'Incline Dumbbell Press', targetReps: 10, targetWeight: 15 },
  { archetype: 'full_body', variant: 'b', exerciseName: 'Romanian Deadlift', matchingExerciseName: 'Romanian Deadlift', targetReps: 8, targetWeight: 60 },
  { archetype: 'full_body', variant: 'b', exerciseName: 'Barbell Row', matchingExerciseName: 'Barbell Rows', targetReps: 8, targetWeight: 40 },
  { archetype: 'full_body', variant: 'b', exerciseName: 'Lat Pulldown', matchingExerciseName: 'Lat Pulldown', targetReps: 10, targetWeight: 35 },
  { archetype: 'full_body', variant: 'c', exerciseName: 'Bulgarian Split Squat', matchingExerciseName: 'Bulgarian Split Squat', targetReps: 12, targetWeight: 20 },
  { archetype: 'full_body', variant: 'c', exerciseName: 'Push-ups', matchingExerciseName: 'Push-ups', targetReps: 12, targetWeight: 0 },
  { archetype: 'full_body', variant: 'c', exerciseName: 'Hip Thrust', matchingExerciseName: 'Hip Thrusts', targetReps: 10, targetWeight: 60 },
  { archetype: 'full_body', variant: 'c', exerciseName: 'Seated Cable Row', matchingExerciseName: 'Seated Cable Row', targetReps: 10, targetWeight: 35 },
  { archetype: 'full_body', variant: 'c', exerciseName: 'Overhead Press', matchingExerciseName: 'Overhead Press', targetReps: 8, targetWeight: 25 },
  { archetype: 'push', variant: 'a', exerciseName: 'Face Pull', matchingExerciseName: 'Face Pulls', targetReps: 15, targetWeight: 12.5 },
  { archetype: 'push', variant: 'b', exerciseName: 'Face Pull', matchingExerciseName: 'Face Pulls', targetReps: 15, targetWeight: 12.5 },
  { archetype: 'full_body', variant: 'a', exerciseName: 'Calf Raise', matchingExerciseName: 'Calf Raises', targetReps: 15, targetWeight: 40 },
  { archetype: 'full_body', variant: 'b', exerciseName: 'Calf Raise', matchingExerciseName: 'Calf Raises', targetReps: 15, targetWeight: 40 },
  { archetype: 'full_body', variant: 'c', exerciseName: 'Calf Raise', matchingExerciseName: 'Calf Raises', targetReps: 15, targetWeight: 40 },
];

const ARCHETYPE_EXERCISE_SEEDS: ExerciseSeed[] = [
  { name: 'Back Squat', workoutType: 'legs', primaryMuscle: 'Quads, Glutes', secondaryMuscle: 'Core' },
  { name: 'Barbell Curl', workoutType: 'arms', primaryMuscle: 'Biceps', secondaryMuscle: 'Forearms' },
  { name: 'Walking Lunge', workoutType: 'legs', primaryMuscle: 'Quads, Glutes', secondaryMuscle: 'Hamstrings' },
  { name: 'Overhead Triceps Extension', workoutType: 'arms', primaryMuscle: 'Triceps', secondaryMuscle: null },
];

export const WORKOUT_DATABASE_SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  workout_type TEXT NOT NULL,
  primary_muscle TEXT NOT NULL,
  secondary_muscle TEXT,
  is_custom INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS split_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_type TEXT NOT NULL,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  position INTEGER NOT NULL,
  target_reps INTEGER NOT NULL,
  target_weight REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS archetype_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  archetype TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT 'a',
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  position INTEGER NOT NULL,
  target_reps INTEGER NOT NULL,
  target_weight REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  archetype TEXT DEFAULT NULL,
  secondary_archetype TEXT DEFAULT NULL,
  archetype_variant TEXT DEFAULT NULL,
  secondary_archetype_variant TEXT DEFAULT NULL,
  intensity TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  retroactive INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS session_workout_types (
  session_id INTEGER NOT NULL,
  workout_type TEXT NOT NULL,
  position INTEGER NOT NULL,
  PRIMARY KEY (session_id, position),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS session_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_exercise_id INTEGER NOT NULL REFERENCES session_exercises(id),
  set_index INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight REAL NOT NULL,
  target_reps INTEGER,
  target_weight REAL,
  completed INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  bonus_type TEXT
);

CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL DEFAULT '',
  weekly_goal INTEGER NOT NULL DEFAULT 3,
  experience_level TEXT NOT NULL DEFAULT 'intermediate',
  training_days TEXT NOT NULL DEFAULT '[]',
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  weight_increment REAL NOT NULL DEFAULT 2.5,
  weight_unit TEXT NOT NULL DEFAULT 'kg',
  weight_increment_lbs REAL NOT NULL DEFAULT 5
);

CREATE UNIQUE INDEX IF NOT EXISTS sessions_one_in_progress
  ON sessions(completed) WHERE completed = 0;
CREATE INDEX IF NOT EXISTS split_templates_type_position
  ON split_templates(workout_type, position);
CREATE INDEX IF NOT EXISTS archetype_templates_archetype_position
  ON archetype_templates(archetype, position);
CREATE INDEX IF NOT EXISTS session_workout_types_type_session
  ON session_workout_types(workout_type, session_id);
CREATE INDEX IF NOT EXISTS session_exercises_session_position
  ON session_exercises(session_id, position);
CREATE INDEX IF NOT EXISTS sets_exercise_index
  ON sets(session_exercise_id, set_index);
`;

interface ProfileRow {
  name: string;
  weekly_goal: number;
  experience_level: ExperienceLevel;
  training_days: string;
  onboarding_completed: number;
  weight_increment: number;
  weight_unit: WeightUnit;
  weight_increment_lbs: number;
}

interface SessionJoinRow {
  session_id: number;
  date: string;
  archetype: Archetype | null;
  secondary_archetype: Archetype | null;
  archetype_variant: string | null;
  secondary_archetype_variant: string | null;
  workout_type: WorkoutType | null;
  workout_type_position: number | null;
  intensity: IntensityLevel | null;
  session_completed: number;
  session_retroactive: number;
  session_exercise_id: number | null;
  exercise_name: string | null;
  exercise_position: number | null;
  set_id: number | null;
  set_index: number | null;
  reps: number | null;
  weight: number | null;
  target_reps: number | null;
  target_weight: number | null;
  set_completed: number | null;
  skipped: number | null;
  bonus_type: BonusSetType | null;
}

interface SplitTemplateRow {
  workout_type: WorkoutType;
  name: string;
  target_reps: number;
  target_weight: number;
}

interface ArchetypeTemplateRow {
  name: string;
  target_reps: number;
  target_weight: number;
}

interface ExerciseIdRow {
  id: number;
}

interface ExerciseCatalogRow {
  id: number;
  name: string;
  workout_type: WorkoutType;
  primary_muscle: string;
  is_custom: number;
}

interface PositionedIdRow {
  id: number;
  position: number;
}

export interface WorkoutDatabaseSnapshot {
  profile: UserProfile | null;
  sessions: WorkoutSession[];
  currentSession: WorkoutSession | null;
  splitTemplates: Record<WorkoutType, Exercise[]>;
}

let database: SQLiteDatabase | null = null;
let databasePromise: Promise<SQLiteDatabase> | null = null;

const sessionJoinSql = (where = '') => `
  SELECT
    s.id AS session_id,
    s.date,
    s.archetype,
    s.secondary_archetype,
    s.archetype_variant,
    s.secondary_archetype_variant,
    swt.workout_type,
    swt.position AS workout_type_position,
    s.intensity,
    s.completed AS session_completed,
    s.retroactive AS session_retroactive,
    se.id AS session_exercise_id,
    e.name AS exercise_name,
    se.position AS exercise_position,
    st.id AS set_id,
    st.set_index,
    st.reps,
    st.weight,
    st.target_reps,
    st.target_weight,
    st.completed AS set_completed,
    st.skipped,
    st.bonus_type
  FROM sessions s
  LEFT JOIN session_workout_types swt ON swt.session_id = s.id
  LEFT JOIN session_exercises se ON se.session_id = s.id
  LEFT JOIN exercises e ON e.id = se.exercise_id
  LEFT JOIN sets st ON st.session_exercise_id = se.id
  ${where}
  ORDER BY s.id ASC, swt.position ASC, se.position ASC, st.set_index ASC
`;

const emptySplitTemplates = (): Record<WorkoutType, Exercise[]> => ({
  chest: [],
  back: [],
  shoulders: [],
  arms: [],
  legs: [],
  core: [],
});

const profileFromRow = (row: ProfileRow | null): UserProfile | null => {
  if (!row) return null;

  let trainingDays: number[] = [];
  try {
    const parsed = JSON.parse(row.training_days);
    if (Array.isArray(parsed)) trainingDays = parsed;
  } catch {
    trainingDays = [];
  }

  return {
    name: row.name,
    weeklyGoal: row.weekly_goal,
    experienceLevel: row.experience_level,
    trainingDays,
    onboardingCompleted: Boolean(row.onboarding_completed),
    weightIncrement: row.weight_increment ?? DEFAULT_WEIGHT_INCREMENT,
    weightUnit: row.weight_unit ?? DEFAULT_WEIGHT_UNIT,
    weightIncrementLbs: row.weight_increment_lbs ?? DEFAULT_WEIGHT_INCREMENT_LBS,
  };
};

const sessionsFromRows = (rows: SessionJoinRow[]): WorkoutSession[] => {
  const sessions = new Map<number, WorkoutSession>();
  const exercises = new Map<number, Exercise>();
  const sets = new Set<number>();

  for (const row of rows) {
    let session = sessions.get(row.session_id);
    if (!session) {
      session = {
        id: String(row.session_id),
        date: row.date,
        archetype: row.archetype,
        secondaryArchetype: row.secondary_archetype,
        archetypeVariant: row.archetype_variant,
        secondaryArchetypeVariant: row.secondary_archetype_variant,
        workoutTypes: [],
        exercises: [],
        ...(row.intensity ? { intensity: row.intensity } : {}),
        completed: Boolean(row.session_completed),
        retroactive: Boolean(row.session_retroactive),
      };
      sessions.set(row.session_id, session);
    }

    if (row.workout_type !== null && !session.workoutTypes.includes(row.workout_type)) {
      session.workoutTypes.push(row.workout_type);
    }

    if (row.session_exercise_id === null || row.exercise_name === null) continue;

    let exercise = exercises.get(row.session_exercise_id);
    if (!exercise) {
      exercise = { name: row.exercise_name, sets: [] };
      exercises.set(row.session_exercise_id, exercise);
      session.exercises.push(exercise);
    }

    if (
      row.set_id === null ||
      sets.has(row.set_id) ||
      row.set_index === null ||
      row.reps === null ||
      row.weight === null
    ) {
      continue;
    }

    const set: ExerciseSet = {
      reps: row.reps,
      weight: row.weight,
      completed: Boolean(row.set_completed),
      skipped: Boolean(row.skipped),
    };
    if (row.target_reps !== null) set.targetReps = row.target_reps;
    if (row.target_weight !== null) set.targetWeight = row.target_weight;
    if (row.bonus_type !== null) set.type = row.bonus_type;
    exercise.sets.push(set);
    sets.add(row.set_id);
  }

  return [...sessions.values()];
};

const splitTemplatesFromRows = (
  rows: SplitTemplateRow[]
): Record<WorkoutType, Exercise[]> => {
  const templates = emptySplitTemplates();
  for (const row of rows) {
    templates[row.workout_type].push({
      name: row.name,
      sets: Array.from({ length: 3 }, () => ({
        reps: row.target_reps,
        weight: row.target_weight,
      })),
    });
  }
  return templates;
};

const insertSeedDataAsync = async (db: SQLiteDatabase): Promise<void> => {
  for (const seed of EXERCISE_SEEDS) {
    await db.runAsync(
      `INSERT INTO exercises
        (name, workout_type, primary_muscle, secondary_muscle, is_custom)
       VALUES (?, ?, ?, ?, 0)`,
      seed.name,
      seed.workoutType,
      seed.primaryMuscle,
      seed.secondaryMuscle
    );
  }

  const positions = new Map<WorkoutType, number>();
  for (const seed of SPLIT_TEMPLATE_SEEDS) {
    const exercise = await db.getFirstAsync<ExerciseIdRow>(
      'SELECT id FROM exercises WHERE name = ?',
      seed.name
    );
    if (!exercise) throw new Error(`Missing seeded exercise: ${seed.name}`);

    const position = positions.get(seed.workoutType) ?? 0;
    await db.runAsync(
      `INSERT INTO split_templates
        (workout_type, exercise_id, position, target_reps, target_weight)
       VALUES (?, ?, ?, ?, ?)`,
      seed.workoutType,
      exercise.id,
      position,
      seed.targetReps,
      seed.targetWeight
    );
    positions.set(seed.workoutType, position + 1);
  }

  await insertArchetypeTemplateSeedsAsync(db);
};

const insertSeedDataSync = (db: SQLiteDatabase): void => {
  for (const seed of EXERCISE_SEEDS) {
    db.runSync(
      `INSERT INTO exercises
        (name, workout_type, primary_muscle, secondary_muscle, is_custom)
       VALUES (?, ?, ?, ?, 0)`,
      seed.name,
      seed.workoutType,
      seed.primaryMuscle,
      seed.secondaryMuscle
    );
  }

  const positions = new Map<WorkoutType, number>();
  for (const seed of SPLIT_TEMPLATE_SEEDS) {
    const exercise = db.getFirstSync<ExerciseIdRow>(
      'SELECT id FROM exercises WHERE name = ?',
      seed.name
    );
    if (!exercise) throw new Error(`Missing seeded exercise: ${seed.name}`);

    const position = positions.get(seed.workoutType) ?? 0;
    db.runSync(
      `INSERT INTO split_templates
        (workout_type, exercise_id, position, target_reps, target_weight)
       VALUES (?, ?, ?, ?, ?)`,
      seed.workoutType,
      exercise.id,
      position,
      seed.targetReps,
      seed.targetWeight
    );
    positions.set(seed.workoutType, position + 1);
  }

  insertArchetypeTemplateSeedsSync(db);
};

const insertArchetypeTemplateSeedsAsync = async (
  db: SQLiteDatabase,
  templateSeeds: ArchetypeTemplateSeed[] = ARCHETYPE_TEMPLATE_SEEDS,
  skipExisting = false
): Promise<void> => {
  for (const seed of ARCHETYPE_EXERCISE_SEEDS) {
    const existing = await db.getFirstAsync<ExerciseIdRow>(
      'SELECT id FROM exercises WHERE name = ?',
      seed.name
    );
    if (!existing) {
      await db.runAsync(
        `INSERT INTO exercises
          (name, workout_type, primary_muscle, secondary_muscle, is_custom)
         VALUES (?, ?, ?, ?, 0)`,
        seed.name,
        seed.workoutType,
        seed.primaryMuscle,
        seed.secondaryMuscle
      );
    }
  }

  const positions = new Map<string, number>();
  for (const seed of templateSeeds) {
    const positionKey = `${seed.archetype}:${seed.variant}`;
    const position = positions.get(positionKey) ?? 0;
    positions.set(positionKey, position + 1);
    if (
      skipExisting &&
      (await db.getFirstAsync<ExerciseIdRow>(
        `SELECT id
         FROM archetype_templates
         WHERE archetype = ? AND variant = ? AND position = ?`,
        seed.archetype,
        seed.variant,
        position
      ))
    ) {
      continue;
    }

    const exercise = await db.getFirstAsync<ExerciseIdRow>(
      'SELECT id FROM exercises WHERE name = ? AND is_custom = 0',
      seed.matchingExerciseName
    );
    if (!exercise) throw new Error(`Missing archetype exercise: ${seed.exerciseName}`);

    await db.runAsync(
      `INSERT INTO archetype_templates
        (archetype, variant, exercise_id, position, target_reps, target_weight)
       VALUES (?, ?, ?, ?, ?, ?)`,
      seed.archetype,
      seed.variant,
      exercise.id,
      position,
      seed.targetReps,
      seed.targetWeight
    );
  }
};

const insertArchetypeTemplateSeedsSync = (db: SQLiteDatabase): void => {
  for (const seed of ARCHETYPE_EXERCISE_SEEDS) {
    const existing = db.getFirstSync<ExerciseIdRow>(
      'SELECT id FROM exercises WHERE name = ?',
      seed.name
    );
    if (!existing) {
      db.runSync(
        `INSERT INTO exercises
          (name, workout_type, primary_muscle, secondary_muscle, is_custom)
         VALUES (?, ?, ?, ?, 0)`,
        seed.name,
        seed.workoutType,
        seed.primaryMuscle,
        seed.secondaryMuscle
      );
    }
  }

  const positions = new Map<string, number>();
  for (const seed of ARCHETYPE_TEMPLATE_SEEDS) {
    const exercise = db.getFirstSync<ExerciseIdRow>(
      'SELECT id FROM exercises WHERE name = ?',
      seed.matchingExerciseName
    );
    if (!exercise) throw new Error(`Missing archetype exercise: ${seed.exerciseName}`);

    const positionKey = `${seed.archetype}:${seed.variant}`;
    const position = positions.get(positionKey) ?? 0;
    db.runSync(
      `INSERT INTO archetype_templates
        (archetype, variant, exercise_id, position, target_reps, target_weight)
       VALUES (?, ?, ?, ?, ?, ?)`,
      seed.archetype,
      seed.variant,
      exercise.id,
      position,
      seed.targetReps,
      seed.targetWeight
    );
    positions.set(positionKey, position + 1);
  }
};

const verifySeedDataAsync = async (db: SQLiteDatabase): Promise<void> => {
  const exerciseCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM exercises'
  );
  const templateCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM split_templates'
  );
  const archetypeTemplateCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM archetype_templates'
  );
  if (
    exerciseCount?.count !== EXERCISE_SEEDS.length + ARCHETYPE_EXERCISE_SEEDS.length ||
    templateCount?.count !== SPLIT_TEMPLATE_SEEDS.length ||
    archetypeTemplateCount?.count !== ARCHETYPE_TEMPLATE_SEEDS.length
  ) {
    throw new Error(
      'Workout database seed did not produce 64 exercises, 24 split templates, and 72 archetype templates'
    );
  }
};

const verifySeedDataSync = (db: SQLiteDatabase): void => {
  const exerciseCount = db.getFirstSync<{ count: number }>('SELECT COUNT(*) AS count FROM exercises');
  const templateCount = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM split_templates'
  );
  const archetypeTemplateCount = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM archetype_templates'
  );
  if (
    exerciseCount?.count !== EXERCISE_SEEDS.length + ARCHETYPE_EXERCISE_SEEDS.length ||
    templateCount?.count !== SPLIT_TEMPLATE_SEEDS.length ||
    archetypeTemplateCount?.count !== ARCHETYPE_TEMPLATE_SEEDS.length
  ) {
    throw new Error(
      'Workout database seed did not produce 64 exercises, 24 split templates, and 72 archetype templates'
    );
  }
};

const seedFreshDatabaseAsync = async (db: SQLiteDatabase): Promise<void> => {
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM sets;
      DELETE FROM session_exercises;
      DELETE FROM session_workout_types;
      DELETE FROM sessions;
      DELETE FROM split_templates;
      DELETE FROM archetype_templates;
      DELETE FROM exercises;
      DELETE FROM profile;
    `);
    await insertSeedDataAsync(db);
    await verifySeedDataAsync(db);
    await db.execAsync(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION}`);
  });
};

const sessionsHasLegacyWorkoutTypeAsync = async (db: SQLiteDatabase): Promise<boolean> => {
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(sessions)');
  return columns.some((column) => column.name === 'workout_type');
};

const sessionsHasArchetypeAsync = async (db: SQLiteDatabase): Promise<boolean> => {
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(sessions)');
  return columns.some((column) => column.name === 'archetype');
};

const sessionsHasSecondaryArchetypeAsync = async (
  db: SQLiteDatabase
): Promise<boolean> => {
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(sessions)');
  return columns.some((column) => column.name === 'secondary_archetype');
};

const tableHasColumnAsync = async (
  db: SQLiteDatabase,
  table: 'archetype_templates' | 'sessions' | 'profile',
  columnName: string
): Promise<boolean> => {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return columns.some((column) => column.name === columnName);
};

const ensureArchetypeVariantColumnsAsync = async (db: SQLiteDatabase): Promise<void> => {
  if (!(await tableHasColumnAsync(db, 'archetype_templates', 'variant'))) {
    await db.execAsync(
      "ALTER TABLE archetype_templates ADD COLUMN variant TEXT NOT NULL DEFAULT 'a';"
    );
    // Make the legacy meaning explicit rather than depending on ALTER TABLE's
    // default-value behavior for pre-existing curated rows.
    await db.execAsync("UPDATE archetype_templates SET variant = 'a';");
  }

  if (!(await tableHasColumnAsync(db, 'sessions', 'archetype_variant'))) {
    await db.execAsync(
      'ALTER TABLE sessions ADD COLUMN archetype_variant TEXT DEFAULT NULL;'
    );
  }
  if (!(await tableHasColumnAsync(db, 'sessions', 'secondary_archetype_variant'))) {
    await db.execAsync(
      'ALTER TABLE sessions ADD COLUMN secondary_archetype_variant TEXT DEFAULT NULL;'
    );
  }

  if (await sessionsHasArchetypeAsync(db)) {
    await db.execAsync(`
      UPDATE sessions
      SET archetype_variant = 'a'
      WHERE archetype IS NOT NULL AND archetype_variant IS NULL;
    `);
  }
  if (await sessionsHasSecondaryArchetypeAsync(db)) {
    await db.execAsync(`
      UPDATE sessions
      SET secondary_archetype_variant = 'a'
      WHERE secondary_archetype IS NOT NULL
        AND secondary_archetype_variant IS NULL;
    `);
  }
};

const ensureSessionRetroactiveColumnAsync = async (
  db: SQLiteDatabase
): Promise<void> => {
  if (!(await tableHasColumnAsync(db, 'sessions', 'retroactive'))) {
    await db.execAsync(
      'ALTER TABLE sessions ADD COLUMN retroactive INTEGER NOT NULL DEFAULT 0;'
    );
  }
};

const ensureProfileWeightIncrementColumnAsync = async (
  db: SQLiteDatabase
): Promise<void> => {
  if (!(await tableHasColumnAsync(db, 'profile', 'weight_increment'))) {
    await db.execAsync(
      `ALTER TABLE profile ADD COLUMN weight_increment REAL NOT NULL DEFAULT ${DEFAULT_WEIGHT_INCREMENT};`
    );
  }
};

const ensureProfileWeightUnitColumnAsync = async (
  db: SQLiteDatabase
): Promise<void> => {
  if (!(await tableHasColumnAsync(db, 'profile', 'weight_unit'))) {
    await db.execAsync(
      `ALTER TABLE profile ADD COLUMN weight_unit TEXT NOT NULL DEFAULT '${DEFAULT_WEIGHT_UNIT}';`
    );
  }
};

const ensureProfileWeightIncrementLbsColumnAsync = async (
  db: SQLiteDatabase
): Promise<void> => {
  if (!(await tableHasColumnAsync(db, 'profile', 'weight_increment_lbs'))) {
    await db.execAsync(
      `ALTER TABLE profile ADD COLUMN weight_increment_lbs REAL NOT NULL DEFAULT ${DEFAULT_WEIGHT_INCREMENT_LBS};`
    );
  }
};

const migrateLegacySessionWorkoutTypesAsync = async (db: SQLiteDatabase): Promise<void> => {
  await db.withTransactionAsync(async () => {
    const hasLegacyWorkoutType = await sessionsHasLegacyWorkoutTypeAsync(db);
    if (hasLegacyWorkoutType) {
      const legacyWorkoutTypes = await db.getAllAsync<{
        id: number;
        workout_type: WorkoutType;
      }>('SELECT id, workout_type FROM sessions');

      for (const legacyWorkoutType of legacyWorkoutTypes) {
        const existing = await db.getFirstAsync<{ session_id: number }>(
          `SELECT session_id
           FROM session_workout_types
           WHERE session_id = ? AND position = 0`,
          legacyWorkoutType.id
        );
        if (existing) continue;

        await db.runAsync(
          `INSERT INTO session_workout_types (session_id, workout_type, position)
           VALUES (?, ?, 0)`,
          legacyWorkoutType.id,
          legacyWorkoutType.workout_type
        );
      }
    }

    const missingWorkoutTypes = await db.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) AS count
      FROM sessions s
      WHERE NOT EXISTS (
        SELECT 1
        FROM session_workout_types swt
        WHERE swt.session_id = s.id
      )
    `);
    if ((missingWorkoutTypes?.count ?? 0) > 0) {
      throw new Error('Session workout type migration left sessions without a workout type');
    }

    if (hasLegacyWorkoutType) {
      await db.execAsync('ALTER TABLE sessions DROP COLUMN workout_type;');
    }
    if (!(await sessionsHasArchetypeAsync(db))) {
      await db.execAsync('ALTER TABLE sessions ADD COLUMN archetype TEXT DEFAULT NULL;');
    }
    if (!(await sessionsHasSecondaryArchetypeAsync(db))) {
      await db.execAsync(
        'ALTER TABLE sessions ADD COLUMN secondary_archetype TEXT DEFAULT NULL;'
      );
    }
    await ensureArchetypeVariantColumnsAsync(db);
    await insertArchetypeTemplateSeedsAsync(db, ARCHETYPE_TEMPLATE_SEEDS, true);
    await verifyArchetypeTemplateSeedsAsync(db);
    await db.execAsync(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION};`);
  });
};

const verifyArchetypeTemplateSeedsAsync = async (db: SQLiteDatabase): Promise<void> => {
  const archetypeTemplateCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM archetype_templates'
  );
  if (archetypeTemplateCount?.count !== ARCHETYPE_TEMPLATE_SEEDS.length) {
    throw new Error('Archetype template seed did not produce 72 templates');
  }
};

const migrateArchetypeTemplatesAsync = async (db: SQLiteDatabase): Promise<void> => {
  await db.withTransactionAsync(async () => {
    await ensureArchetypeVariantColumnsAsync(db);
    await insertArchetypeTemplateSeedsAsync(db, ARCHETYPE_TEMPLATE_SEEDS, true);
    await verifyArchetypeTemplateSeedsAsync(db);
    await db.execAsync('PRAGMA user_version = 3;');
  });
};

const migrateArchetypeVariantsAsync = async (db: SQLiteDatabase): Promise<void> => {
  await db.withTransactionAsync(async () => {
    await ensureArchetypeVariantColumnsAsync(db);
    await insertArchetypeTemplateSeedsAsync(
      db,
      ARCHETYPE_TEMPLATE_SEEDS.filter((seed) => seed.variant !== 'a'),
      true
    );
    await insertArchetypeTemplateSeedsAsync(db, ARCHETYPE_TEMPLATE_SEEDS, true);
    await verifyArchetypeTemplateSeedsAsync(db);
  });
};

const migrateSessionArchetypesAsync = async (db: SQLiteDatabase): Promise<void> => {
  await db.withTransactionAsync(async () => {
    if (!(await sessionsHasArchetypeAsync(db))) {
      await db.execAsync('ALTER TABLE sessions ADD COLUMN archetype TEXT DEFAULT NULL;');
    }
    if (!(await sessionsHasSecondaryArchetypeAsync(db))) {
      await db.execAsync(
        'ALTER TABLE sessions ADD COLUMN secondary_archetype TEXT DEFAULT NULL;'
      );
    }
  });
};

const removeLegacyTestExerciseAsync = async (db: SQLiteDatabase): Promise<void> => {
  await db.withTransactionAsync(async () => {
    const testExercises = await db.getAllAsync<ExerciseIdRow>(
      `SELECT id
       FROM exercises
       WHERE is_custom = 1 AND name = ? COLLATE NOCASE`,
      'test'
    );

    for (const exercise of testExercises) {
      await db.runAsync(
        'DELETE FROM split_templates WHERE exercise_id = ?',
        exercise.id
      );

      const references = await db.getFirstAsync<{ count: number }>(
        `SELECT (
          (SELECT COUNT(*) FROM session_exercises WHERE exercise_id = ?) +
          (SELECT COUNT(*) FROM archetype_templates WHERE exercise_id = ?)
        ) AS count`,
        exercise.id,
        exercise.id
      );

      // Keep the catalog row when another table still references it so the
      // migration cannot discard session data or violate foreign keys.
      if ((references?.count ?? 0) === 0) {
        await db.runAsync('DELETE FROM exercises WHERE id = ?', exercise.id);
      }
    }

  });
};

const rebuildFreshDatabaseAsync = async (db: SQLiteDatabase): Promise<void> => {
  await db.execAsync('PRAGMA foreign_keys = OFF');
  try {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        DROP TABLE IF EXISTS sets;
        DROP TABLE IF EXISTS session_exercises;
        DROP TABLE IF EXISTS session_workout_types;
        DROP TABLE IF EXISTS sessions;
        DROP TABLE IF EXISTS split_templates;
        DROP TABLE IF EXISTS archetype_templates;
        DROP TABLE IF EXISTS exercises;
        DROP TABLE IF EXISTS profile;
      `);
      await db.execAsync(WORKOUT_DATABASE_SCHEMA);
      await insertSeedDataAsync(db);
      await verifySeedDataAsync(db);
      await db.execAsync(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION}`);
    });
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON');
  }

  const foreignKeyErrors = await db.getAllAsync('PRAGMA foreign_key_check');
  if (foreignKeyErrors.length > 0) {
    throw new Error('Workout database rebuild failed its foreign key check');
  }
};

export const initializeWorkoutDatabase = async (): Promise<SQLiteDatabase> => {
  if (database) return database;
  if (databasePromise) return databasePromise;

  databasePromise = (async () => {
    // [BOOT] 1 — very start of initializeWorkoutDatabase
    console.log('[BOOT] initializeWorkoutDatabase: start — calling openDatabaseAsync');
    const opened = await openDatabaseAsync(DATABASE_NAME);
    // [BOOT] 2 — openDatabaseAsync resolved
    console.log('[BOOT] initializeWorkoutDatabase: openDatabaseAsync resolved, db handle obtained:', !!opened);
    await opened.execAsync(WORKOUT_DATABASE_SCHEMA);

    // [BOOT] 3a — before PRAGMA user_version read
    console.log('[BOOT] initializeWorkoutDatabase: reading PRAGMA user_version');
    const schemaVersion = await opened.getFirstAsync<{ user_version: number }>(
      'PRAGMA user_version'
    );
    const version = schemaVersion?.user_version ?? 0;
    // [BOOT] 3b — after PRAGMA user_version read
    console.log('[BOOT] initializeWorkoutDatabase: PRAGMA user_version =', version);
    const hasLegacyWorkoutType = await sessionsHasLegacyWorkoutTypeAsync(opened);
    console.log('[BOOT] initializeWorkoutDatabase: hasLegacyWorkoutType =', hasLegacyWorkoutType);

    if (hasLegacyWorkoutType) {
      try {
        // [BOOT] 4 — before migrateLegacySessionWorkoutTypesAsync
        console.log('[BOOT] initializeWorkoutDatabase: calling migrateLegacySessionWorkoutTypesAsync (version=', version, ')');
        await migrateLegacySessionWorkoutTypesAsync(opened);
        // [BOOT] 4 — after migrateLegacySessionWorkoutTypesAsync
        console.log('[BOOT] initializeWorkoutDatabase: migrateLegacySessionWorkoutTypesAsync done');
      } catch (error) {
        if (!__DEV__) {
          throw error;
        }
        console.warn('Session workout type migration failed; rebuilding development database', error);
        // [BOOT] 4 — before rebuildFreshDatabaseAsync (dev fallback)
        console.log('[BOOT] initializeWorkoutDatabase: calling rebuildFreshDatabaseAsync (dev fallback)');
        await rebuildFreshDatabaseAsync(opened);
        // [BOOT] 4 — after rebuildFreshDatabaseAsync
        console.log('[BOOT] initializeWorkoutDatabase: rebuildFreshDatabaseAsync done');
      }
    } else if (version === 0) {
      // [BOOT] 4 — before seedFreshDatabaseAsync
      console.log('[BOOT] initializeWorkoutDatabase: calling seedFreshDatabaseAsync (version=0)');
      await seedFreshDatabaseAsync(opened);
      // [BOOT] 4 — after seedFreshDatabaseAsync
      console.log('[BOOT] initializeWorkoutDatabase: seedFreshDatabaseAsync done');
    } else if (version < 3) {
      // [BOOT] 4 — before migrateArchetypeTemplatesAsync
      console.log('[BOOT] initializeWorkoutDatabase: calling migrateArchetypeTemplatesAsync (version=', version, ')');
      await migrateArchetypeTemplatesAsync(opened);
      // [BOOT] 4 — after migrateArchetypeTemplatesAsync
      console.log('[BOOT] initializeWorkoutDatabase: migrateArchetypeTemplatesAsync done');
    }
    if (!hasLegacyWorkoutType && version > 0 && version < CURRENT_SCHEMA_VERSION) {
      // [BOOT] 4 — before migrateSessionArchetypesAsync
      console.log('[BOOT] initializeWorkoutDatabase: calling migrateSessionArchetypesAsync (version=', version, ')');
      await migrateSessionArchetypesAsync(opened);
      // [BOOT] 4 — after migrateSessionArchetypesAsync
      console.log('[BOOT] initializeWorkoutDatabase: migrateSessionArchetypesAsync done');
    }
    if (!hasLegacyWorkoutType && version >= 3 && version < CURRENT_SCHEMA_VERSION) {
      // [BOOT] 4 — before migrateArchetypeVariantsAsync
      console.log('[BOOT] initializeWorkoutDatabase: calling migrateArchetypeVariantsAsync (version=', version, ')');
      await migrateArchetypeVariantsAsync(opened);
      // [BOOT] 4 — after migrateArchetypeVariantsAsync
      console.log('[BOOT] initializeWorkoutDatabase: migrateArchetypeVariantsAsync done');
    }
    if (version > 0 && version < CURRENT_SCHEMA_VERSION) {
      // [BOOT] 4 — before removeLegacyTestExerciseAsync
      console.log('[BOOT] initializeWorkoutDatabase: calling removeLegacyTestExerciseAsync (version=', version, ')');
      await removeLegacyTestExerciseAsync(opened);
      // [BOOT] 4 — after removeLegacyTestExerciseAsync
      console.log('[BOOT] initializeWorkoutDatabase: removeLegacyTestExerciseAsync done');
    }
    // [BOOT] 4 — before ensureSessionRetroactiveColumnAsync (always runs)
    console.log('[BOOT] initializeWorkoutDatabase: calling ensureSessionRetroactiveColumnAsync');
    await ensureSessionRetroactiveColumnAsync(opened);
    // [BOOT] 4 — after ensureSessionRetroactiveColumnAsync
    console.log('[BOOT] initializeWorkoutDatabase: ensureSessionRetroactiveColumnAsync done');
    // [BOOT] 4 — before ensureProfileWeightIncrementColumnAsync (always runs)
    console.log('[BOOT] initializeWorkoutDatabase: calling ensureProfileWeightIncrementColumnAsync');
    await ensureProfileWeightIncrementColumnAsync(opened);
    // [BOOT] 4 — after ensureProfileWeightIncrementColumnAsync
    console.log('[BOOT] initializeWorkoutDatabase: ensureProfileWeightIncrementColumnAsync done');
    // [BOOT] 4 — before ensureProfileWeightUnitColumnAsync (always runs)
    console.log('[BOOT] initializeWorkoutDatabase: calling ensureProfileWeightUnitColumnAsync');
    await ensureProfileWeightUnitColumnAsync(opened);
    // [BOOT] 4 — after ensureProfileWeightUnitColumnAsync
    console.log('[BOOT] initializeWorkoutDatabase: ensureProfileWeightUnitColumnAsync done');
    // [BOOT] 4 — before ensureProfileWeightIncrementLbsColumnAsync (always runs)
    console.log('[BOOT] initializeWorkoutDatabase: calling ensureProfileWeightIncrementLbsColumnAsync');
    await ensureProfileWeightIncrementLbsColumnAsync(opened);
    // [BOOT] 4 — after ensureProfileWeightIncrementLbsColumnAsync
    console.log('[BOOT] initializeWorkoutDatabase: ensureProfileWeightIncrementLbsColumnAsync done');
    if (!hasLegacyWorkoutType && version > 0 && version < CURRENT_SCHEMA_VERSION) {
      console.log('[BOOT] initializeWorkoutDatabase: bumping user_version to', CURRENT_SCHEMA_VERSION);
      await opened.execAsync(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION}`);
    }

    database = opened;
    console.log('[BOOT] initializeWorkoutDatabase: complete — database ready');
    return opened;
  })().catch((error) => {
    databasePromise = null;
    throw error;
  });

  return databasePromise;
};

const getDatabase = (): SQLiteDatabase => {
  if (!database) {
    throw new Error('Workout database used before initialization');
  }
  return database;
};

const readProfileAsync = async (db: SQLiteDatabase): Promise<UserProfile | null> =>
  profileFromRow(await db.getFirstAsync<ProfileRow>('SELECT * FROM profile WHERE id = 1'));

export const readProfileSync = (): UserProfile | null =>
  profileFromRow(
    getDatabase().getFirstSync<ProfileRow>('SELECT * FROM profile WHERE id = 1')
  );

const readSplitTemplatesAsync = async (
  db: SQLiteDatabase
): Promise<Record<WorkoutType, Exercise[]>> =>
  splitTemplatesFromRows(
    await db.getAllAsync<SplitTemplateRow>(`
      SELECT st.workout_type, e.name, st.target_reps, st.target_weight
      FROM split_templates st
      JOIN exercises e ON e.id = st.exercise_id
      ORDER BY st.workout_type, st.position
    `)
  );

export const readSplitTemplatesSync = (): Record<WorkoutType, Exercise[]> =>
  splitTemplatesFromRows(
    getDatabase().getAllSync<SplitTemplateRow>(`
      SELECT st.workout_type, e.name, st.target_reps, st.target_weight
      FROM split_templates st
      JOIN exercises e ON e.id = st.exercise_id
      ORDER BY st.workout_type, st.position
    `)
  );

export const readArchetypeVariantsSync = (archetype: Archetype): string[] =>
  getDatabase()
    .getAllSync<{ variant: string }>(
      `SELECT DISTINCT variant
       FROM archetype_templates
       WHERE archetype = ?
       ORDER BY variant`,
      archetype
    )
    .map((row) => row.variant);

export const readLastUsedArchetypeVariantSync = (
  archetype: Archetype
): string | null =>
  getDatabase().getFirstSync<{ variant: string }>(
    `SELECT variant
     FROM (
       SELECT id, date, archetype_variant AS variant
       FROM sessions
       WHERE completed = 1
         AND archetype = ?
         AND archetype_variant IS NOT NULL
       UNION ALL
       SELECT id, date, secondary_archetype_variant AS variant
       FROM sessions
       WHERE completed = 1
         AND secondary_archetype = ?
         AND secondary_archetype_variant IS NOT NULL
     )
     ORDER BY date DESC, id DESC
     LIMIT 1`,
    archetype,
    archetype
  )?.variant ?? null;

export const getNextArchetypeVariant = (archetype: Archetype): string => {
  const variants = readArchetypeVariantsSync(archetype);
  if (variants.length === 0) {
    throw new Error(`No archetype variants found for ${archetype}`);
  }

  const lastUsed = readLastUsedArchetypeVariantSync(archetype);
  if (lastUsed === null) return variants[0];

  const lastIndex = variants.indexOf(lastUsed);
  return variants[(lastIndex + 1) % variants.length] ?? variants[0];
};

export const readArchetypeTemplateSync = (
  archetype: Archetype,
  variant = 'a'
): Exercise[] =>
  getDatabase().getAllSync<ArchetypeTemplateRow>(
    `SELECT e.name, at.target_reps, at.target_weight
     FROM archetype_templates at
     JOIN exercises e ON e.id = at.exercise_id
     WHERE at.archetype = ? AND at.variant = ?
     ORDER BY at.position`,
    archetype,
    variant
  ).map((row) => ({
    name: row.name,
    sets: Array.from({ length: 3 }, () => ({
      reps: row.target_reps,
      weight: row.target_weight,
    })),
  }));

interface SelectedArchetypeVariant {
  archetype: Archetype;
  variant: string;
}

const selectNextArchetypeVariantsSync = (
  archetypes: Archetype[]
): SelectedArchetypeVariant[] =>
  archetypes.map((archetype) => ({
    archetype,
    variant: getNextArchetypeVariant(archetype),
  }));

const combineArchetypeTemplatesSync = (
  selections: SelectedArchetypeVariant[]
): Exercise[] =>
  selections.flatMap(({ archetype, variant }) =>
    readArchetypeTemplateSync(archetype, variant)
  );

const readAllSessionsAsync = async (db: SQLiteDatabase): Promise<WorkoutSession[]> =>
  sessionsFromRows(await db.getAllAsync<SessionJoinRow>(sessionJoinSql()));

export const readCompletedSessionsSync = (): WorkoutSession[] =>
  sessionsFromRows(
    getDatabase().getAllSync<SessionJoinRow>(sessionJoinSql('WHERE s.completed = 1'))
  );

const readSessionByIdSync = (id: number): WorkoutSession | undefined =>
  sessionsFromRows(
    getDatabase().getAllSync<SessionJoinRow>(sessionJoinSql('WHERE s.id = ?'), id)
  )[0];

export const readInitialWorkoutSnapshot = async (): Promise<WorkoutDatabaseSnapshot> => {
  // [BOOT] 6a — very start of readInitialWorkoutSnapshot
  console.log('[BOOT] readInitialWorkoutSnapshot: start');
  const db = await initializeWorkoutDatabase();

  // This first profile read is deliberately awaited before startup routing.
  const profile = await readProfileAsync(db);
  const splitTemplates = await readSplitTemplatesAsync(db);
  const allSessions = await readAllSessionsAsync(db);

  const snapshot = {
    profile,
    sessions: allSessions.filter((session) => session.completed),
    currentSession: allSessions.find((session) => !session.completed) ?? null,
    splitTemplates,
  };
  // [BOOT] 6b — successful end of readInitialWorkoutSnapshot
  console.log(
    '[BOOT] readInitialWorkoutSnapshot: done — profile:', !!snapshot.profile,
    '| sessions:', snapshot.sessions.length,
    '| currentSession:', !!snapshot.currentSession
  );
  return snapshot;
};

export const writeProfile = (profile: UserProfile): void => {
  getDatabase().runSync(
    `INSERT INTO profile
      (id, name, weekly_goal, experience_level, training_days, onboarding_completed,
       weight_increment, weight_unit, weight_increment_lbs)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       weekly_goal = excluded.weekly_goal,
       experience_level = excluded.experience_level,
       training_days = excluded.training_days,
       onboarding_completed = excluded.onboarding_completed,
       weight_increment = excluded.weight_increment,
       weight_unit = excluded.weight_unit,
       weight_increment_lbs = excluded.weight_increment_lbs`,
    profile.name,
    profile.weeklyGoal,
    profile.experienceLevel,
    JSON.stringify(profile.trainingDays),
    profile.onboardingCompleted ? 1 : 0,
    profile.weightIncrement,
    profile.weightUnit,
    profile.weightIncrementLbs
  );
};

const deleteIncompleteSessionsSync = (db: SQLiteDatabase): void => {
  db.runSync(`
    DELETE FROM sets
    WHERE session_exercise_id IN (
      SELECT se.id
      FROM session_exercises se
      JOIN sessions s ON s.id = se.session_id
      WHERE s.completed = 0
    )
  `);
  db.runSync(`
    DELETE FROM session_exercises
    WHERE session_id IN (SELECT id FROM sessions WHERE completed = 0)
  `);
  db.runSync(`
    DELETE FROM session_workout_types
    WHERE session_id IN (SELECT id FROM sessions WHERE completed = 0)
  `);
  db.runSync('DELETE FROM sessions WHERE completed = 0');
};

const validateSessionWorkoutTypes = (workoutTypes: WorkoutType[]): void => {
  if (workoutTypes.length < 1 || workoutTypes.length > 2) {
    throw new Error('A workout session must have one or two workout types');
  }
  if (new Set(workoutTypes).size !== workoutTypes.length) {
    throw new Error('A workout session cannot contain the same workout type twice');
  }
};

const requireExerciseIdSync = (db: SQLiteDatabase, name: string): number => {
  const exercise = db.getFirstSync<ExerciseIdRow>(
    'SELECT id FROM exercises WHERE name = ?',
    name
  );
  if (!exercise) throw new Error(`Unknown exercise: ${name}`);
  return exercise.id;
};

const workoutTypesForExercisesSync = (
  db: SQLiteDatabase,
  exercises: Exercise[]
): WorkoutType[] => {
  const workoutTypes = new Set<WorkoutType>();
  for (const exercise of exercises) {
    const row = db.getFirstSync<{ workout_type: WorkoutType }>(
      'SELECT workout_type FROM exercises WHERE name = ?',
      exercise.name
    );
    if (!row) throw new Error(`Unknown exercise: ${exercise.name}`);
    workoutTypes.add(row.workout_type);
  }
  return [...workoutTypes];
};

const insertSessionExerciseSync = (
  db: SQLiteDatabase,
  sessionId: number,
  position: number,
  exercise: Exercise
): void => {
  const exerciseId = requireExerciseIdSync(db, exercise.name);
  const result = db.runSync(
    `INSERT INTO session_exercises (session_id, exercise_id, position)
     VALUES (?, ?, ?)`,
    sessionId,
    exerciseId,
    position
  );
  const sessionExerciseId = result.lastInsertRowId;

  exercise.sets.forEach((set, setIndex) => {
    db.runSync(
      `INSERT INTO sets
        (session_exercise_id, set_index, reps, weight, target_reps,
         target_weight, completed, skipped, bonus_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      sessionExerciseId,
      setIndex,
      set.reps,
      set.weight,
      set.targetReps ?? null,
      set.targetWeight ?? null,
      set.completed ? 1 : 0,
      set.skipped ? 1 : 0,
      set.type ?? null
    );
  });
};

export const replaceCurrentSession = (session: WorkoutSession): WorkoutSession => {
  const db = getDatabase();
  const workoutTypes = [...session.workoutTypes];
  validateSessionWorkoutTypes(workoutTypes);
  let sessionId = 0;
  db.withTransactionSync(() => {
    deleteIncompleteSessionsSync(db);
    sessionId = db.runSync(
      `INSERT INTO sessions
        (date, archetype, secondary_archetype, archetype_variant,
         secondary_archetype_variant, intensity, completed, retroactive)
       VALUES (?, NULL, NULL, NULL, NULL, NULL, 0, 0)`,
      session.date
    ).lastInsertRowId;
    workoutTypes.forEach((workoutType, position) => {
      db.runSync(
        `INSERT INTO session_workout_types (session_id, workout_type, position)
         VALUES (?, ?, ?)`,
        sessionId,
        workoutType,
        position
      );
    });
    session.exercises.forEach((exercise, position) => {
      insertSessionExerciseSync(db, sessionId, position, exercise);
    });
  });
  return {
    ...session,
    id: String(sessionId),
    archetype: null,
    secondaryArchetype: null,
    archetypeVariant: null,
    secondaryArchetypeVariant: null,
    workoutTypes,
    retroactive: false,
  };
};

export const startWorkoutFromArchetype = (
  archetypes: Archetype[]
): WorkoutSession => {
  if (archetypes.length < 1 || archetypes.length > 2) {
    throw new Error('An archetype workout must have one or two archetypes');
  }

  const db = getDatabase();
  const date = new Date().toISOString();
  const experienceLevel = readProfileSync()?.experienceLevel;
  const selections = selectNextArchetypeVariantsSync(archetypes);
  const exercises = combineArchetypeTemplatesSync(selections).map(
    (templateExercise) =>
      createSessionExercise(
        templateExercise,
        readLastExerciseHistorySync(templateExercise.name),
        experienceLevel
      )
  );
  const workoutTypes = workoutTypesForExercisesSync(db, exercises);
  const primaryArchetype = archetypes[0];
  const secondaryArchetype = archetypes[1] ?? null;
  const primaryVariant = selections[0].variant;
  const secondaryVariant = selections[1]?.variant ?? null;
  let sessionId = 0;

  db.withTransactionSync(() => {
    deleteIncompleteSessionsSync(db);
    sessionId = db.runSync(
      `INSERT INTO sessions
        (date, archetype, secondary_archetype, archetype_variant,
         secondary_archetype_variant, intensity, completed, retroactive)
       VALUES (?, ?, ?, ?, ?, NULL, 0, 0)`,
      date,
      primaryArchetype,
      secondaryArchetype,
      primaryVariant,
      secondaryVariant
    ).lastInsertRowId;
    workoutTypes.forEach((workoutType, position) => {
      db.runSync(
        `INSERT INTO session_workout_types (session_id, workout_type, position)
         VALUES (?, ?, ?)`,
        sessionId,
        workoutType,
        position
      );
    });
    exercises.forEach((exercise, position) => {
      insertSessionExerciseSync(db, sessionId, position, exercise);
    });
  });

  return {
    id: String(sessionId),
    date,
    archetype: primaryArchetype,
    secondaryArchetype,
    archetypeVariant: primaryVariant,
    secondaryArchetypeVariant: secondaryVariant,
    workoutTypes,
    exercises,
    completed: false,
    retroactive: false,
  };
};

export const logArchetypeCompletedRetroactively = (
  archetypes: Archetype[],
  date: string
): WorkoutSession => {
  if (archetypes.length < 1 || archetypes.length > 2) {
    throw new Error('A retroactive archetype workout must have one or two archetypes');
  }

  const db = getDatabase();
  const primaryArchetype = archetypes[0];
  const secondaryArchetype = archetypes[1] ?? null;
  let sessionId = 0;
  let exercises: Exercise[] = [];
  let workoutTypes: WorkoutType[] = [];
  let selections: SelectedArchetypeVariant[] = [];

  db.withTransactionSync(() => {
    selections = selectNextArchetypeVariantsSync(archetypes);
    exercises = combineArchetypeTemplatesSync(selections).map((templateExercise) =>
      createCompletedSessionExercise(
        templateExercise,
        readLastExerciseHistorySync(templateExercise.name)
      )
    );
    workoutTypes = workoutTypesForExercisesSync(db, exercises);
    sessionId = db.runSync(
      `INSERT INTO sessions
        (date, archetype, secondary_archetype, archetype_variant,
         secondary_archetype_variant, intensity, completed, retroactive)
       VALUES (?, ?, ?, ?, ?, NULL, 1, 1)`,
      date,
      primaryArchetype,
      secondaryArchetype,
      selections[0].variant,
      selections[1]?.variant ?? null
    ).lastInsertRowId;
    workoutTypes.forEach((workoutType, position) => {
      db.runSync(
        `INSERT INTO session_workout_types (session_id, workout_type, position)
         VALUES (?, ?, ?)`,
        sessionId,
        workoutType,
        position
      );
    });
    exercises.forEach((exercise, position) => {
      insertSessionExerciseSync(db, sessionId, position, exercise);
    });
  });

  return {
    id: String(sessionId),
    date,
    archetype: primaryArchetype,
    secondaryArchetype,
    archetypeVariant: selections[0].variant,
    secondaryArchetypeVariant: selections[1]?.variant ?? null,
    workoutTypes,
    exercises,
    completed: true,
    retroactive: true,
  };
};

const currentSetIdSync = (
  db: SQLiteDatabase,
  exerciseIndex: number,
  setIndex: number
): number | null =>
  db.getFirstSync<ExerciseIdRow>(
    `SELECT st.id
     FROM sets st
     JOIN session_exercises se ON se.id = st.session_exercise_id
     JOIN sessions s ON s.id = se.session_id
     WHERE s.completed = 0 AND se.position = ? AND st.set_index = ?
     LIMIT 1`,
    exerciseIndex,
    setIndex
  )?.id ?? null;

export const updateCurrentSet = (
  exerciseIndex: number,
  setIndex: number,
  updates: Pick<ExerciseSet, 'reps' | 'weight' | 'completed' | 'skipped'>
): void => {
  const db = getDatabase();
  const id = currentSetIdSync(db, exerciseIndex, setIndex);
  if (id === null) return;
  db.runSync(
    `UPDATE sets
     SET reps = ?, weight = ?, completed = ?, skipped = ?
     WHERE id = ?`,
    updates.reps,
    updates.weight,
    updates.completed ? 1 : 0,
    updates.skipped ? 1 : 0,
    id
  );
};

export const appendCurrentBonusSet = (
  exerciseIndex: number,
  type: BonusSetType,
  reps: number,
  weight: number
): void => {
  const db = getDatabase();
  const sessionExercise = db.getFirstSync<ExerciseIdRow>(
    `SELECT se.id
     FROM session_exercises se
     JOIN sessions s ON s.id = se.session_id
     WHERE s.completed = 0 AND se.position = ?`,
    exerciseIndex
  );
  if (!sessionExercise) return;

  const nextIndex = db.getFirstSync<{ next_index: number }>(
    `SELECT COALESCE(MAX(set_index) + 1, 0) AS next_index
     FROM sets WHERE session_exercise_id = ?`,
    sessionExercise.id
  )?.next_index ?? 0;

  db.runSync(
    `INSERT INTO sets
      (session_exercise_id, set_index, reps, weight, target_reps,
       target_weight, completed, skipped, bonus_type)
     VALUES (?, ?, ?, ?, NULL, NULL, 1, 0, ?)`,
    sessionExercise.id,
    nextIndex,
    reps,
    weight,
    type
  );
};

export const replaceCurrentSessionExercise = (
  exerciseIndex: number,
  exercise: Exercise
): void => {
  const db = getDatabase();
  db.withTransactionSync(() => {
    const sessionExercise = db.getFirstSync<ExerciseIdRow>(
      `SELECT se.id
       FROM session_exercises se
       JOIN sessions s ON s.id = se.session_id
       WHERE s.completed = 0 AND se.position = ?`,
      exerciseIndex
    );
    if (!sessionExercise) return;

    const exerciseId = requireExerciseIdSync(db, exercise.name);
    db.runSync('DELETE FROM sets WHERE session_exercise_id = ?', sessionExercise.id);
    db.runSync(
      'UPDATE session_exercises SET exercise_id = ? WHERE id = ?',
      exerciseId,
      sessionExercise.id
    );
    exercise.sets.forEach((set, setIndex) => {
      db.runSync(
        `INSERT INTO sets
          (session_exercise_id, set_index, reps, weight, target_reps,
           target_weight, completed, skipped, bonus_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        sessionExercise.id,
        setIndex,
        set.reps,
        set.weight,
        set.targetReps ?? null,
        set.targetWeight ?? null,
        set.completed ? 1 : 0,
        set.skipped ? 1 : 0,
        set.type ?? null
      );
    });
  });
};

export const completeCurrentSession = (intensity: IntensityLevel): void => {
  getDatabase().runSync(
    'UPDATE sessions SET intensity = ?, completed = 1 WHERE completed = 0',
    intensity
  );
};

export const discardCurrentSession = (): void => {
  const db = getDatabase();
  db.withTransactionSync(() => deleteIncompleteSessionsSync(db));
};

export const readExercisesForWorkoutTypeSync = (
  type: WorkoutType
): ExerciseCatalogItem[] =>
  getDatabase()
    .getAllSync<ExerciseCatalogRow>(
      `SELECT id, name, workout_type, primary_muscle, is_custom
       FROM exercises
       WHERE workout_type = ?
       ORDER BY id`,
      type
    )
    .map((row) => ({
      id: row.id,
      name: row.name,
      workoutType: row.workout_type,
      primaryMuscle: row.primary_muscle,
      isCustom: Boolean(row.is_custom),
    }));

export const readExerciseWorkoutTypeSync = (name: string): WorkoutType | undefined =>
  getDatabase().getFirstSync<{ workout_type: WorkoutType }>(
    'SELECT workout_type FROM exercises WHERE name = ?',
    name
  )?.workout_type;

export const readPrimaryMusclesForWorkoutTypeSync = (type: WorkoutType): string[] => {
  const primaryMuscles = getDatabase()
    .getAllSync<{ primary_muscle: string }>(
      `SELECT DISTINCT primary_muscle
       FROM exercises
       WHERE workout_type = ?
       ORDER BY primary_muscle COLLATE NOCASE`,
      type
    )
    .map((row) => row.primary_muscle);

  return Array.from(
    new Set(
      primaryMuscles.flatMap((primaryMuscle) =>
        primaryMuscle
          .split(',')
          .map((muscle) => muscle.trim())
          .filter(Boolean)
      )
    )
  ).sort((a, b) => a.localeCompare(b));
};

export const renameExercise = (
  id: number,
  newName: string
): { oldName: string; newName: string } => {
  const name = newName.trim();
  if (!name) {
    throw new Error('Exercise name cannot be empty.');
  }

  const db = getDatabase();
  const exercise = db.getFirstSync<{ name: string }>(
    'SELECT name FROM exercises WHERE id = ?',
    id
  );
  if (!exercise) {
    throw new Error('Exercise not found.');
  }
  if (hasExerciseHistoryInDatabase(db, id)) {
    throw new Error('This exercise has logged history and cannot be renamed.');
  }

  const conflict = db.getFirstSync<ExerciseIdRow>(
    'SELECT id FROM exercises WHERE name = ? COLLATE NOCASE AND id != ?',
    name,
    id
  );
  if (conflict) {
    throw new Error(`An exercise named "${name}" already exists.`);
  }

  try {
    db.runSync('UPDATE exercises SET name = ? WHERE id = ?', name, id);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes('unique constraint')
    ) {
      throw new Error(`An exercise named "${name}" already exists.`);
    }
    throw error;
  }

  return { oldName: exercise.name, newName: name };
};

function hasExerciseHistoryInDatabase(db: SQLiteDatabase, exerciseId: number): boolean {
  return Boolean(
    db.getFirstSync<{ has_history: number }>(
      `SELECT EXISTS(
        SELECT 1
        FROM session_exercises se
        JOIN sets st ON st.session_exercise_id = se.id
        WHERE se.exercise_id = ? AND st.completed = 1
      ) AS has_history`,
      exerciseId
    )?.has_history
  );
}

export const hasExerciseHistory = (exerciseId: number): boolean =>
  hasExerciseHistoryInDatabase(getDatabase(), exerciseId);

export const deleteExercise = (exerciseId: number): void => {
  const db = getDatabase();
  db.withTransactionSync(() => {
    if (hasExerciseHistoryInDatabase(db, exerciseId)) {
      throw new Error('This exercise has logged history and cannot be deleted.');
    }

    db.runSync('DELETE FROM split_templates WHERE exercise_id = ?', exerciseId);
    db.runSync('DELETE FROM exercises WHERE id = ?', exerciseId);
  });
};

const ensureExerciseSync = (
  db: SQLiteDatabase,
  type: WorkoutType,
  name: string,
  primaryMuscle: string
): number => {
  const existing = db.getFirstSync<ExerciseIdRow>(
    'SELECT id FROM exercises WHERE name = ?',
    name
  );
  if (existing) return existing.id;

  return db.runSync(
    `INSERT INTO exercises
      (name, workout_type, primary_muscle, secondary_muscle, is_custom)
     VALUES (?, ?, ?, NULL, 1)`,
    name,
    type,
    primaryMuscle
  ).lastInsertRowId;
};

const activeSessionForWorkoutTypeSync = (
  db: SQLiteDatabase,
  type: WorkoutType
): { id: number } | null =>
  db.getFirstSync<{ id: number }>(
    `SELECT s.id
     FROM sessions s
     JOIN session_workout_types swt ON swt.session_id = s.id
     WHERE s.completed = 0 AND swt.workout_type = ?
     LIMIT 1`,
    type
  );

export const addExerciseToSplitRecords = (
  type: WorkoutType,
  name: string,
  primaryMuscle: string
): void => {
  const db = getDatabase();
  db.withTransactionSync(() => {
    const exerciseId = ensureExerciseSync(db, type, name, primaryMuscle);
    const position = db.getFirstSync<{ next_position: number }>(
      `SELECT COALESCE(MAX(position) + 1, 0) AS next_position
       FROM split_templates WHERE workout_type = ?`,
      type
    )?.next_position ?? 0;
    db.runSync(
      `INSERT INTO split_templates
        (workout_type, exercise_id, position, target_reps, target_weight)
       VALUES (?, ?, ?, 8, 0)`,
      type,
      exerciseId,
      position
    );
  });
};

const renumberPositionsSync = (
  db: SQLiteDatabase,
  table: 'split_templates' | 'session_exercises',
  rows: PositionedIdRow[]
): void => {
  rows.forEach((row, position) => {
    db.runSync(`UPDATE ${table} SET position = ? WHERE id = ?`, position, row.id);
  });
};

export const removeExerciseFromSplitRecords = (
  type: WorkoutType,
  exerciseIndex: number
): void => {
  const db = getDatabase();
  db.withTransactionSync(() => {
    const templates = db.getAllSync<PositionedIdRow>(
      `SELECT id, position FROM split_templates
       WHERE workout_type = ? ORDER BY position`,
      type
    );
    const target = templates[exerciseIndex];
    if (!target) return;
    db.runSync('DELETE FROM split_templates WHERE id = ?', target.id);
    renumberPositionsSync(
      db,
      'split_templates',
      templates.filter((row) => row.id !== target.id)
    );

    const active = activeSessionForWorkoutTypeSync(db, type);
    if (!active) return;

    const sessionExercises = db.getAllSync<PositionedIdRow>(
      `SELECT id, position FROM session_exercises
       WHERE session_id = ? ORDER BY position`,
      active.id
    );
    const sessionTarget = sessionExercises[exerciseIndex];
    if (!sessionTarget) return;
    db.runSync('DELETE FROM sets WHERE session_exercise_id = ?', sessionTarget.id);
    db.runSync('DELETE FROM session_exercises WHERE id = ?', sessionTarget.id);
    renumberPositionsSync(
      db,
      'session_exercises',
      sessionExercises.filter((row) => row.id !== sessionTarget.id)
    );
  });
};

const movePositionedRowsSync = (
  db: SQLiteDatabase,
  table: 'split_templates' | 'session_exercises',
  rows: PositionedIdRow[],
  fromIndex: number,
  toIndex: number
): void => {
  const reordered = [...rows];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  renumberPositionsSync(db, table, reordered);
};

export const moveExerciseInSplitRecords = (
  type: WorkoutType,
  fromIndex: number,
  toIndex: number
): void => {
  const db = getDatabase();
  db.withTransactionSync(() => {
    const templates = db.getAllSync<PositionedIdRow>(
      `SELECT id, position FROM split_templates
       WHERE workout_type = ? ORDER BY position`,
      type
    );
    movePositionedRowsSync(db, 'split_templates', templates, fromIndex, toIndex);

    const active = activeSessionForWorkoutTypeSync(db, type);
    if (!active) return;
    const sessionExercises = db.getAllSync<PositionedIdRow>(
      `SELECT id, position FROM session_exercises
       WHERE session_id = ? ORDER BY position`,
      active.id
    );
    movePositionedRowsSync(
      db,
      'session_exercises',
      sessionExercises,
      fromIndex,
      toIndex
    );
  });
};

export const readMostOverdueTypeSync = (): WorkoutType => {
  const rows = getDatabase().getAllSync<{
    workout_type: WorkoutType;
    last_completed_date: string | null;
  }>(`
    WITH workout_types(workout_type, rotation_order) AS (
      VALUES
        ('chest', 0),
        ('back', 1),
        ('shoulders', 2),
        ('arms', 3),
        ('legs', 4),
        ('core', 5)
    )
    SELECT
      wt.workout_type,
      (
        SELECT s.date
        FROM sessions s
        JOIN session_workout_types swt ON swt.session_id = s.id
        WHERE s.completed = 1
          AND swt.workout_type = wt.workout_type
        ORDER BY s.date DESC, s.id ASC
        LIMIT 1
      ) AS last_completed_date
    FROM workout_types wt
    ORDER BY
      last_completed_date IS NOT NULL ASC,
      last_completed_date ASC,
      wt.rotation_order ASC
  `);

  return rows[0]?.workout_type ?? 'chest';
};

export const readMostOverdueArchetypeSync = (): Archetype => {
  const rows = getDatabase().getAllSync<{
    archetype: Archetype;
    last_completed_date: string | null;
  }>(`
    WITH archetypes(archetype, rotation_order) AS (
      VALUES
        ('push', 0),
        ('pull', 1),
        ('legs', 2),
        ('upper', 3),
        ('lower', 4),
        ('full_body', 5)
    )
    SELECT
      a.archetype,
      (
        SELECT s.date
        FROM sessions s
        WHERE s.completed = 1
          AND (s.archetype = a.archetype OR s.secondary_archetype = a.archetype)
        ORDER BY s.date DESC, s.id ASC
        LIMIT 1
      ) AS last_completed_date
    FROM archetypes a
    ORDER BY
      last_completed_date IS NOT NULL ASC,
      last_completed_date ASC,
      a.rotation_order ASC
  `);

  return rows[0]?.archetype ?? 'push';
};

export const readLastWorkoutOfTypeSync = (
  type: WorkoutType
): WorkoutSession | undefined => {
  const row = getDatabase().getFirstSync<{ id: number }>(
    `SELECT s.id
     FROM sessions s
     JOIN session_workout_types swt ON swt.session_id = s.id
     WHERE s.completed = 1 AND swt.workout_type = ?
     ORDER BY s.date DESC, s.id ASC
     LIMIT 1`,
    type
  );
  return row ? readSessionByIdSync(row.id) : undefined;
};

export const readLastExerciseSync = (
  type: WorkoutType,
  name: string
): Exercise | undefined => {
  const row = getDatabase().getFirstSync<{ id: number }>(
    `SELECT s.id
     FROM sessions s
     JOIN session_workout_types swt ON swt.session_id = s.id
     WHERE s.completed = 1
       AND swt.workout_type = ?
       AND EXISTS (
         SELECT 1
         FROM session_exercises se
         JOIN exercises e ON e.id = se.exercise_id
         WHERE se.session_id = s.id AND e.name = ?
       )
     ORDER BY s.date DESC, s.id ASC
     LIMIT 1`,
    type,
    name
  );
  return row
    ? readSessionByIdSync(row.id)?.exercises.find((exercise) => exercise.name === name)
    : undefined;
};

export const readLastExerciseHistorySync = (name: string): Exercise | undefined => {
  const row = getDatabase().getFirstSync<{ session_id: number }>(
    `SELECT se.session_id
     FROM session_exercises se
     JOIN sessions s ON s.id = se.session_id
     WHERE s.completed = 1
       AND se.exercise_id = (SELECT id FROM exercises WHERE name = ?)
     ORDER BY s.date DESC, s.id ASC
     LIMIT 1`,
    name
  );
  return row
    ? readSessionByIdSync(row.session_id)?.exercises.find((exercise) => exercise.name === name)
    : undefined;
};

export const resetWorkoutDatabase = (): WorkoutDatabaseSnapshot => {
  const db = getDatabase();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM sets');
    db.runSync('DELETE FROM session_exercises');
    db.runSync('DELETE FROM session_workout_types');
    db.runSync('DELETE FROM sessions');
    db.runSync('DELETE FROM split_templates');
    db.runSync('DELETE FROM archetype_templates');
    db.runSync('DELETE FROM exercises');
    db.runSync('DELETE FROM profile');
    db.runSync(
      `DELETE FROM sqlite_sequence
       WHERE name IN ('exercises', 'split_templates', 'archetype_templates', 'sessions', 'session_exercises', 'sets')`
    );
    insertSeedDataSync(db);
    verifySeedDataSync(db);
  });

  return {
    profile: null,
    sessions: [],
    currentSession: null,
    splitTemplates: readSplitTemplatesSync(),
  };
};

export const readSeedCountsSync = (): {
  exercises: number;
  splitTemplates: number;
  archetypeTemplates: number;
} => {
  const db = getDatabase();
  return {
    exercises:
      db.getFirstSync<{ count: number }>('SELECT COUNT(*) AS count FROM exercises')
        ?.count ?? 0,
    splitTemplates:
      db.getFirstSync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM split_templates'
      )?.count ?? 0,
    archetypeTemplates:
      db.getFirstSync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM archetype_templates'
      )?.count ?? 0,
  };
};
