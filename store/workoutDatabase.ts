import { isDayColor, type DayColor } from '@/features/custom-split/colors';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { Archetype } from '@/constants/archetypes';
import { EmptyCustomWorkoutError } from '@/store/customSplits';
import { persistPortableSplit, type ImportedSplit } from '@/store/splitImport';
import type { PortableSplit } from '@/features/sharing/splitProtocol';
import { resolveProgramPreferences, type ProgramMode, type ThreeDayStructure } from '@/store/programPreferences';

import type {
  CustomSplit,
  CustomSplitExercise,
  CustomSplitSummary,
  CustomSplitWorkout,
} from '@/store/customSplits';

import type {
  BonusSetType,
  Exercise,
  ExerciseLoadType,
  ExerciseSet,
  SessionExercise,
  ExperienceLevel,
  IntensityLevel,
  UserProfile,
  WorkoutSession,
  SessionOrigin,
  WorkoutFocus,
  SetValueOrigin,
  WorkoutType,
} from '@/store/workoutStore';
import { sameSetTarget, type WorkoutSetTarget } from '@/store/workoutSetActions';
import { EXERCISE_NOTE_MAX_LENGTH, normalizeExerciseNote, type ExerciseNote } from '@/store/exerciseNotes';
import type { WeightUnit } from '@/store/weightUnits';
import type { RecordSet } from '@/store/personalRecords';
import { getVerifiedSessions } from '@/store/verifiedSessions';
import { IMPORT_SCHEMA, type ImportedWorkoutFacts } from '@/features/import/persistence';
import type { ImportExercise, ImportTemplate } from '@/features/import/models';
import { routineWorkingSets, unsupportedRoutineTarget } from '@/features/import/models';
import { templateMeasurement } from '@/features/import/hevy/exerciseResolver';
import { DEFAULT_DURATION_S, getExerciseMetric, type ExerciseMetric } from '@/store/exerciseMeasurement';
import {
  createCompletedSessionExercise,
  createSessionExercise,
  makeDefaultExercise,
} from '@/store/workoutProgression';

const DATABASE_NAME = 'workouts.db';
export const CURRENT_SCHEMA_VERSION = 23;

// Kg-native step assigned only when a brand-new profile is created. Legacy
// profiles that predate this column retain the historical 2.5 kg migration
// backfill below.
export const NEW_PROFILE_WEIGHT_INCREMENT = 0.5;

// Global display preference; session exercises keep their own input units; storage stays kg-canonical regardless.
export const DEFAULT_WEIGHT_UNIT: WeightUnit = 'kg';

// Lb-native step, independent of the new-profile kg increment — it is not a
// conversion of the kg value, it is the increment lifters expect in lbs.
export const DEFAULT_WEIGHT_INCREMENT_LBS = 5;

export interface ExerciseSeed {
  name: string;
  workoutType: WorkoutType;
  primaryMuscle: string;
  secondaryMuscle: string | null;
  loadType: ExerciseLoadType;
  metric: ExerciseMetric;
}

type ExerciseSeedDefinition = Omit<ExerciseSeed, 'loadType' | 'metric'> & {
  loadType?: ExerciseLoadType;
  metric?: ExerciseMetric;
};

const defineExerciseSeeds = (
  seeds: ExerciseSeedDefinition[]
): ExerciseSeed[] =>
  seeds.map((seed) => ({
    ...seed,
    loadType: seed.loadType ?? 'external_weight',
    metric: seed.metric ?? 'reps',
  }));

export interface SplitTemplateSeed {
  workoutType: WorkoutType;
  name: string;
  /** 0 for timed exercises; their target lives in `targetDurationS`. */
  targetReps: number;
  targetWeight: number;
  targetDurationS?: number;
}

/**
 * Built-ins whose pre-v17 history stored seconds in `sets.reps`. Verified,
 * not inferred from names: Plank's shipped split template targeted "60 reps",
 * a 60-second hold. Side Plank, Hollow Body Hold and the carries become timed
 * from v17 on, but no seeded target ever gave their logged reps a seconds
 * meaning, so their old sessions keep the rep metric they were recorded with.
 */
export const LEGACY_SECONDS_EXERCISES: readonly string[] = ['Plank'];

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
  equipment: string | null;
  loadType: ExerciseLoadType;
  metric: ExerciseMetric;
}

export const EXERCISE_SEEDS: ExerciseSeed[] = defineExerciseSeeds([
  { name: 'Bench Press', workoutType: 'chest', primaryMuscle: 'Chest', secondaryMuscle: 'Triceps, Front Delts' },
  { name: 'Incline Dumbbell Press', workoutType: 'chest', primaryMuscle: 'Upper Chest', secondaryMuscle: 'Front Delts, Triceps' },
  { name: 'Chest Dips', workoutType: 'chest', primaryMuscle: 'Lower Chest, Triceps', secondaryMuscle: 'Front Delts', loadType: 'bodyweight' },
  { name: 'Cable Fly', workoutType: 'chest', primaryMuscle: 'Chest', secondaryMuscle: 'Front Delts' },
  { name: 'Incline Bench Press', workoutType: 'chest', primaryMuscle: 'Upper Chest', secondaryMuscle: 'Front Delts, Triceps' },
  { name: 'Push-ups', workoutType: 'chest', primaryMuscle: 'Chest', secondaryMuscle: 'Triceps, Front Delts, Core', loadType: 'bodyweight' },
  { name: 'Pec Deck', workoutType: 'chest', primaryMuscle: 'Chest', secondaryMuscle: null },
  { name: 'Decline Press', workoutType: 'chest', primaryMuscle: 'Lower Chest', secondaryMuscle: 'Triceps' },
  { name: 'Machine Chest Press', workoutType: 'chest', primaryMuscle: 'Chest', secondaryMuscle: 'Triceps' },
  { name: 'Incline Cable Fly', workoutType: 'chest', primaryMuscle: 'Upper Chest', secondaryMuscle: 'Front Delts' },
  { name: 'Dumbbell Bench Press', workoutType: 'chest', primaryMuscle: 'Chest', secondaryMuscle: 'Triceps, Front Delts' },
  { name: 'Dumbbell Fly', workoutType: 'chest', primaryMuscle: 'Chest', secondaryMuscle: 'Front Delts' },
  { name: 'Cable Crossover', workoutType: 'chest', primaryMuscle: 'Chest', secondaryMuscle: 'Front Delts' },
  { name: 'Low-to-High Cable Fly', workoutType: 'chest', primaryMuscle: 'Chest', secondaryMuscle: 'Front Delts' },
  { name: 'High-to-Low Cable Fly', workoutType: 'chest', primaryMuscle: 'Chest', secondaryMuscle: 'Front Delts' },
  { name: 'Single-Arm Cable Fly', workoutType: 'chest', primaryMuscle: 'Chest', secondaryMuscle: 'Front Delts' },
  { name: 'Smith Machine Bench Press', workoutType: 'chest', primaryMuscle: 'Chest', secondaryMuscle: 'Triceps, Front Delts' },
  { name: 'Smith Machine Incline Press', workoutType: 'chest', primaryMuscle: 'Chest', secondaryMuscle: 'Triceps, Front Delts' },
  { name: 'Decline Dumbbell Press', workoutType: 'chest', primaryMuscle: 'Chest', secondaryMuscle: 'Triceps, Front Delts' },
  { name: 'Decline Dumbbell Fly', workoutType: 'chest', primaryMuscle: 'Lower Chest', secondaryMuscle: 'Front Delts' },
  { name: 'Incline Machine Chest Press', workoutType: 'chest', primaryMuscle: 'Chest', secondaryMuscle: 'Triceps, Front Delts' },
  { name: 'Flat Machine Chest Press', workoutType: 'chest', primaryMuscle: 'Chest', secondaryMuscle: 'Triceps' },
  { name: 'Svend Press', workoutType: 'chest', primaryMuscle: 'Chest', secondaryMuscle: 'Front Delts, Triceps' },

  { name: 'Deadlift', workoutType: 'back', primaryMuscle: 'Back, Hamstrings, Glutes', secondaryMuscle: 'Traps, Forearms' },
  { name: 'Pull-ups', workoutType: 'back', primaryMuscle: 'Lats', secondaryMuscle: 'Biceps', loadType: 'bodyweight' },
  { name: 'Barbell Rows', workoutType: 'back', primaryMuscle: 'Lats, Mid-back', secondaryMuscle: 'Biceps, Rear Delts' },
  { name: 'Lat Pulldown', workoutType: 'back', primaryMuscle: 'Lats', secondaryMuscle: 'Biceps' },
  { name: 'Seated Cable Row', workoutType: 'back', primaryMuscle: 'Mid-back, Lats', secondaryMuscle: 'Biceps' },
  { name: 'T-Bar Row', workoutType: 'back', primaryMuscle: 'Mid-back', secondaryMuscle: 'Biceps, Rear Delts' },
  { name: 'Single-Arm Dumbbell Row', workoutType: 'back', primaryMuscle: 'Lats', secondaryMuscle: 'Biceps' },
  { name: 'Back Extensions', workoutType: 'back', primaryMuscle: 'Lower Back', secondaryMuscle: 'Glutes, Hamstrings' },
  { name: 'Chest-Supported Row', workoutType: 'back', primaryMuscle: 'Mid-back', secondaryMuscle: 'Rear Delts, Biceps' },
  { name: 'Straight-Arm Pulldown', workoutType: 'back', primaryMuscle: 'Lats', secondaryMuscle: null },
  { name: 'Chin-ups', workoutType: 'back', primaryMuscle: 'Back', secondaryMuscle: 'Biceps', loadType: 'bodyweight' },
  { name: 'Wide-Grip Lat Pulldown', workoutType: 'back', primaryMuscle: 'Back', secondaryMuscle: 'Biceps' },
  { name: 'Close-Grip Lat Pulldown', workoutType: 'back', primaryMuscle: 'Back', secondaryMuscle: 'Biceps' },
  { name: 'Neutral-Grip Lat Pulldown', workoutType: 'back', primaryMuscle: 'Back', secondaryMuscle: 'Biceps' },
  { name: 'Single-Arm Lat Pulldown', workoutType: 'back', primaryMuscle: 'Back', secondaryMuscle: 'Biceps' },
  { name: 'Pendlay Row', workoutType: 'back', primaryMuscle: 'Back', secondaryMuscle: 'Biceps, Rear Delts' },
  { name: 'Meadows Row', workoutType: 'back', primaryMuscle: 'Back', secondaryMuscle: 'Biceps' },
  { name: 'Machine Row', workoutType: 'back', primaryMuscle: 'Back', secondaryMuscle: 'Biceps' },
  { name: 'High Row Machine', workoutType: 'back', primaryMuscle: 'Back', secondaryMuscle: 'Biceps' },
  { name: 'Dumbbell Pullover', workoutType: 'back', primaryMuscle: 'Back', secondaryMuscle: 'Chest, Triceps' },
  { name: 'Cable Pullover', workoutType: 'back', primaryMuscle: 'Back', secondaryMuscle: null },
  { name: 'Seal Row', workoutType: 'back', primaryMuscle: 'Back', secondaryMuscle: 'Biceps, Rear Delts' },
  { name: 'Rack Pull', workoutType: 'back', primaryMuscle: 'Back', secondaryMuscle: 'Glutes, Hamstrings, Traps' },
  { name: 'Inverted Row', workoutType: 'back', primaryMuscle: 'Back', secondaryMuscle: 'Biceps, Rear Delts', loadType: 'bodyweight' },

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
  { name: 'Seated Dumbbell Shoulder Press', workoutType: 'shoulders', primaryMuscle: 'Shoulders', secondaryMuscle: 'Triceps' },
  { name: 'Machine Shoulder Press', workoutType: 'shoulders', primaryMuscle: 'Shoulders', secondaryMuscle: 'Triceps' },
  { name: 'Smith Machine Shoulder Press', workoutType: 'shoulders', primaryMuscle: 'Shoulders', secondaryMuscle: 'Triceps' },
  { name: 'Single-Arm Cable Lateral Raise', workoutType: 'shoulders', primaryMuscle: 'Shoulders', secondaryMuscle: null },
  { name: 'Lean-Away Cable Lateral Raise', workoutType: 'shoulders', primaryMuscle: 'Shoulders', secondaryMuscle: null },
  { name: 'Cable Rear Delt Fly', workoutType: 'shoulders', primaryMuscle: 'Shoulders', secondaryMuscle: null },
  { name: 'Reverse Pec Deck', workoutType: 'shoulders', primaryMuscle: 'Shoulders', secondaryMuscle: null },
  { name: 'Dumbbell Rear Delt Fly', workoutType: 'shoulders', primaryMuscle: 'Shoulders', secondaryMuscle: null },
  { name: 'Y Raise', workoutType: 'shoulders', primaryMuscle: 'Shoulders', secondaryMuscle: 'Traps' },
  { name: 'Plate Front Raise', workoutType: 'shoulders', primaryMuscle: 'Shoulders', secondaryMuscle: null },
  { name: 'Cable Front Raise', workoutType: 'shoulders', primaryMuscle: 'Shoulders', secondaryMuscle: null },
  { name: 'Bradford Press', workoutType: 'shoulders', primaryMuscle: 'Shoulders', secondaryMuscle: 'Triceps' },

  { name: 'Bicep Curls', workoutType: 'arms', primaryMuscle: 'Biceps', secondaryMuscle: null },
  { name: 'Dumbbell Curl', workoutType: 'arms', primaryMuscle: 'Biceps', secondaryMuscle: null },
  { name: 'Hammer Curls', workoutType: 'arms', primaryMuscle: 'Biceps', secondaryMuscle: 'Forearms' },
  { name: 'Preacher Curls', workoutType: 'arms', primaryMuscle: 'Biceps', secondaryMuscle: null },
  { name: 'Cable Curls', workoutType: 'arms', primaryMuscle: 'Biceps', secondaryMuscle: null },
  { name: 'Tricep Extensions', workoutType: 'arms', primaryMuscle: 'Triceps', secondaryMuscle: null },
  { name: 'Tricep Dips', workoutType: 'arms', primaryMuscle: 'Triceps', secondaryMuscle: 'Chest, Front Delts', loadType: 'bodyweight' },
  { name: 'Tricep Pushdown', workoutType: 'arms', primaryMuscle: 'Triceps', secondaryMuscle: null },
  { name: 'Skull Crushers', workoutType: 'arms', primaryMuscle: 'Triceps', secondaryMuscle: null },
  { name: 'Close-Grip Bench Press', workoutType: 'arms', primaryMuscle: 'Triceps', secondaryMuscle: 'Chest' },
  { name: 'EZ-Bar Curl', workoutType: 'arms', primaryMuscle: 'Biceps', secondaryMuscle: 'Forearms' },
  { name: 'Incline Dumbbell Curl', workoutType: 'arms', primaryMuscle: 'Biceps', secondaryMuscle: null },
  { name: 'Concentration Curl', workoutType: 'arms', primaryMuscle: 'Biceps', secondaryMuscle: null },
  { name: 'Bayesian Cable Curl', workoutType: 'arms', primaryMuscle: 'Biceps', secondaryMuscle: null },
  { name: 'Spider Curl', workoutType: 'arms', primaryMuscle: 'Biceps', secondaryMuscle: null },
  { name: 'Reverse Curl', workoutType: 'arms', primaryMuscle: 'Biceps', secondaryMuscle: 'Forearms' },
  { name: 'Rope Hammer Curl', workoutType: 'arms', primaryMuscle: 'Biceps', secondaryMuscle: 'Forearms' },
  { name: 'Cross-Body Hammer Curl', workoutType: 'arms', primaryMuscle: 'Biceps', secondaryMuscle: 'Forearms' },
  { name: 'Machine Bicep Curl', workoutType: 'arms', primaryMuscle: 'Biceps', secondaryMuscle: null },
  { name: 'Single-Arm Cable Curl', workoutType: 'arms', primaryMuscle: 'Biceps', secondaryMuscle: null },
  { name: 'Drag Curl', workoutType: 'arms', primaryMuscle: 'Biceps', secondaryMuscle: null },
  { name: 'Zottman Curl', workoutType: 'arms', primaryMuscle: 'Biceps', secondaryMuscle: 'Forearms' },
  { name: 'Rope Triceps Pushdown', workoutType: 'arms', primaryMuscle: 'Triceps', secondaryMuscle: null },
  { name: 'Overhead Cable Triceps Extension', workoutType: 'arms', primaryMuscle: 'Triceps', secondaryMuscle: null },
  { name: 'Single-Arm Cable Triceps Pushdown', workoutType: 'arms', primaryMuscle: 'Triceps', secondaryMuscle: null },
  { name: 'Single-Arm Overhead Cable Extension', workoutType: 'arms', primaryMuscle: 'Triceps', secondaryMuscle: null },
  { name: 'Dumbbell Overhead Triceps Extension', workoutType: 'arms', primaryMuscle: 'Triceps', secondaryMuscle: null },
  { name: 'Triceps Kickback', workoutType: 'arms', primaryMuscle: 'Triceps', secondaryMuscle: null },
  { name: 'Cable Triceps Kickback', workoutType: 'arms', primaryMuscle: 'Triceps', secondaryMuscle: null },
  { name: 'JM Press', workoutType: 'arms', primaryMuscle: 'Triceps', secondaryMuscle: 'Chest, Front Delts' },
  { name: 'Reverse-Grip Triceps Pushdown', workoutType: 'arms', primaryMuscle: 'Triceps', secondaryMuscle: null },
  { name: 'Assisted Dip', workoutType: 'arms', primaryMuscle: 'Triceps', secondaryMuscle: 'Chest, Front Delts' },
  { name: 'Machine Dip', workoutType: 'arms', primaryMuscle: 'Triceps', secondaryMuscle: 'Chest, Front Delts' },

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
  { name: 'Hack Squat', workoutType: 'legs', primaryMuscle: 'Legs', secondaryMuscle: 'Glutes' },
  { name: 'Goblet Squat', workoutType: 'legs', primaryMuscle: 'Legs', secondaryMuscle: 'Glutes' },
  { name: 'Smith Machine Squat', workoutType: 'legs', primaryMuscle: 'Legs', secondaryMuscle: 'Glutes' },
  { name: 'Sumo Deadlift', workoutType: 'legs', primaryMuscle: 'Legs', secondaryMuscle: 'Glutes, Hamstrings, Back' },
  { name: 'Good Morning', workoutType: 'legs', primaryMuscle: 'Legs', secondaryMuscle: 'Glutes, Lower Back' },
  { name: 'Step-Up', workoutType: 'legs', primaryMuscle: 'Legs', secondaryMuscle: 'Glutes' },
  { name: 'Reverse Lunge', workoutType: 'legs', primaryMuscle: 'Legs', secondaryMuscle: 'Glutes' },
  { name: 'Walking Dumbbell Lunge', workoutType: 'legs', primaryMuscle: 'Legs', secondaryMuscle: 'Glutes' },
  { name: 'Seated Leg Curl', workoutType: 'legs', primaryMuscle: 'Legs', secondaryMuscle: null },
  { name: 'Lying Leg Curl', workoutType: 'legs', primaryMuscle: 'Legs', secondaryMuscle: null },
  { name: 'Nordic Hamstring Curl', workoutType: 'legs', primaryMuscle: 'Legs', secondaryMuscle: null, loadType: 'bodyweight' },
  { name: 'Single-Leg Curl', workoutType: 'legs', primaryMuscle: 'Legs', secondaryMuscle: null },
  { name: 'Adductor Machine', workoutType: 'legs', primaryMuscle: 'Legs', secondaryMuscle: null },
  { name: 'Abductor Machine', workoutType: 'legs', primaryMuscle: 'Legs', secondaryMuscle: null },
  { name: 'Seated Calf Raise', workoutType: 'legs', primaryMuscle: 'Legs', secondaryMuscle: null },
  { name: 'Standing Calf Raise', workoutType: 'legs', primaryMuscle: 'Legs', secondaryMuscle: null },
  { name: 'Donkey Calf Raise', workoutType: 'legs', primaryMuscle: 'Legs', secondaryMuscle: null },
  { name: 'Glute Bridge', workoutType: 'legs', primaryMuscle: 'Legs', secondaryMuscle: 'Hamstrings' },
  { name: 'Cable Pull-Through', workoutType: 'legs', primaryMuscle: 'Legs', secondaryMuscle: 'Hamstrings' },
  { name: 'Belt Squat', workoutType: 'legs', primaryMuscle: 'Legs', secondaryMuscle: 'Glutes' },
  { name: 'Pendulum Squat', workoutType: 'legs', primaryMuscle: 'Legs', secondaryMuscle: 'Glutes' },
  { name: 'Single-Leg Press', workoutType: 'legs', primaryMuscle: 'Legs', secondaryMuscle: 'Glutes' },

  { name: 'Plank', workoutType: 'core', primaryMuscle: 'Abs / Core Stability', secondaryMuscle: null, loadType: 'bodyweight', metric: 'duration' },
  { name: 'Crunches', workoutType: 'core', primaryMuscle: 'Abs', secondaryMuscle: null, loadType: 'bodyweight' },
  { name: 'Cable Crunch', workoutType: 'core', primaryMuscle: 'Abs', secondaryMuscle: null },
  { name: 'Hanging Leg Raise', workoutType: 'core', primaryMuscle: 'Abs', secondaryMuscle: 'Hip Flexors', loadType: 'bodyweight' },
  { name: 'Leg Raises', workoutType: 'core', primaryMuscle: 'Lower Abs', secondaryMuscle: 'Hip Flexors', loadType: 'bodyweight' },
  { name: 'Russian Twists', workoutType: 'core', primaryMuscle: 'Obliques', secondaryMuscle: null },
  { name: 'Ab Wheel Rollout', workoutType: 'core', primaryMuscle: 'Abs', secondaryMuscle: 'Lower Back, Shoulders', loadType: 'bodyweight' },
  { name: 'Mountain Climbers', workoutType: 'core', primaryMuscle: 'Abs', secondaryMuscle: 'Hip Flexors', loadType: 'bodyweight' },
  { name: 'Side Plank', workoutType: 'core', primaryMuscle: 'Obliques', secondaryMuscle: null, loadType: 'bodyweight', metric: 'duration' },
  { name: 'Cable Woodchopper', workoutType: 'core', primaryMuscle: 'Obliques', secondaryMuscle: 'Core Rotation' },
  { name: 'Hanging Knee Raise', workoutType: 'core', primaryMuscle: 'Core', secondaryMuscle: 'Hip Flexors', loadType: 'bodyweight' },
  { name: 'Reverse Crunch', workoutType: 'core', primaryMuscle: 'Core', secondaryMuscle: null, loadType: 'bodyweight' },
  { name: 'Bicycle Crunch', workoutType: 'core', primaryMuscle: 'Core', secondaryMuscle: 'Hip Flexors', loadType: 'bodyweight' },
  { name: 'Dead Bug', workoutType: 'core', primaryMuscle: 'Core', secondaryMuscle: null, loadType: 'bodyweight' },
  { name: 'Pallof Press', workoutType: 'core', primaryMuscle: 'Core', secondaryMuscle: 'Shoulders' },
  { name: 'V-Ups', workoutType: 'core', primaryMuscle: 'Core', secondaryMuscle: 'Hip Flexors', loadType: 'bodyweight' },
  { name: 'Hollow Body Hold', workoutType: 'core', primaryMuscle: 'Core', secondaryMuscle: null, loadType: 'bodyweight', metric: 'duration' },
  { name: 'Decline Crunch', workoutType: 'core', primaryMuscle: 'Core', secondaryMuscle: null, loadType: 'bodyweight' },
  { name: 'Ab Crunch Machine', workoutType: 'core', primaryMuscle: 'Core', secondaryMuscle: null },
  { name: 'Toe Touches', workoutType: 'core', primaryMuscle: 'Core', secondaryMuscle: null, loadType: 'bodyweight' },
  { name: 'Kneeling Cable Crunch', workoutType: 'core', primaryMuscle: 'Core', secondaryMuscle: null },
  { name: 'Weighted Sit-Up', workoutType: 'core', primaryMuscle: 'Core', secondaryMuscle: null },
  { name: 'Bird Dog', workoutType: 'core', primaryMuscle: 'Core', secondaryMuscle: 'Glutes', loadType: 'bodyweight' },
  // Carries are logged as load held for time; distance is not modelled yet.
  { name: 'Suitcase Carry', workoutType: 'core', primaryMuscle: 'Core', secondaryMuscle: 'Forearms', metric: 'duration' },
  { name: 'Farmer Carry', workoutType: 'core', primaryMuscle: 'Core', secondaryMuscle: 'Forearms, Traps', metric: 'duration' },
]);

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
  { workoutType: 'core', name: 'Plank', targetReps: 0, targetWeight: 0, targetDurationS: 60 },
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

export const ARCHETYPE_EXERCISE_SEEDS: ExerciseSeed[] = defineExerciseSeeds([
  { name: 'Back Squat', workoutType: 'legs', primaryMuscle: 'Quads, Glutes', secondaryMuscle: 'Core' },
  { name: 'Barbell Curl', workoutType: 'arms', primaryMuscle: 'Biceps', secondaryMuscle: 'Forearms' },
  { name: 'Walking Lunge', workoutType: 'legs', primaryMuscle: 'Quads, Glutes', secondaryMuscle: 'Hamstrings' },
  { name: 'Overhead Triceps Extension', workoutType: 'arms', primaryMuscle: 'Triceps', secondaryMuscle: null },
]);

const COMPLETION_GUARD_SQL = `CREATE TRIGGER IF NOT EXISTS sessions_require_performed_set
BEFORE UPDATE OF completed ON sessions
WHEN OLD.completed = 0 AND NEW.completed = 1 AND NOT EXISTS (
  SELECT 1 FROM session_exercises se JOIN sets st ON st.session_exercise_id = se.id
  WHERE se.session_id = OLD.id AND st.completed = 1 AND st.skipped <> 1
)
BEGIN SELECT RAISE(ABORT, 'Log at least one non-skipped set before finishing your workout.'); END;
`;

export const WORKOUT_DATABASE_SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  workout_type TEXT NOT NULL,
  primary_muscle TEXT NOT NULL,
  secondary_muscle TEXT,
  is_custom INTEGER NOT NULL DEFAULT 0,
  equipment TEXT,
  load_type TEXT NOT NULL DEFAULT 'external_weight'
    CHECK (load_type IN ('external_weight', 'bodyweight')),
  metric TEXT NOT NULL DEFAULT 'reps' CHECK (metric IN ('reps', 'duration'))
);

CREATE TABLE IF NOT EXISTS custom_splits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  -- 1 marks the edited Stack's plan: owned by Stack, never listed as a user routine.
  is_stack_plan INTEGER NOT NULL DEFAULT 0 CHECK (is_stack_plan IN (0, 1))
);

-- Transient recovery metadata, excluded from training backups. Idempotent
-- bootstrap also installs this schema-22 addition in existing preview databases.
CREATE TABLE IF NOT EXISTS shared_split_import_receipts (
  attempt_id TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL,
  split_id INTEGER NOT NULL REFERENCES custom_splits(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS custom_split_workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  split_id INTEGER NOT NULL REFERENCES custom_splits(id),
  name TEXT NOT NULL DEFAULT '',
  color TEXT,
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_split_workout_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL REFERENCES custom_split_workouts(id),
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS split_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_type TEXT NOT NULL,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  position INTEGER NOT NULL,
  target_reps INTEGER NOT NULL,
  target_weight REAL NOT NULL,
  target_duration_s INTEGER DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS archetype_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  archetype TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT 'a',
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  position INTEGER NOT NULL,
  target_reps INTEGER NOT NULL,
  target_weight REAL NOT NULL,
  target_duration_s INTEGER DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  origin TEXT NOT NULL DEFAULT 'legacy' CHECK (origin IN ('archetype', 'custom', 'adhoc', 'legacy')),
  archetype TEXT DEFAULT NULL,
  secondary_archetype TEXT DEFAULT NULL,
  archetype_variant TEXT DEFAULT NULL,
  secondary_archetype_variant TEXT DEFAULT NULL,
  intensity TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT DEFAULT NULL,
  retroactive INTEGER NOT NULL DEFAULT 0,
  -- Source metadata for sessions started from a saved Custom Split. Kept
  -- without foreign keys on purpose: training history must survive a split
  -- (or one of its workouts) being edited or deleted later.
  custom_split_id INTEGER DEFAULT NULL,
  custom_split_workout_id INTEGER DEFAULT NULL,
  focus_session_exercise_id INTEGER DEFAULT NULL
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
  position INTEGER NOT NULL,
  entry_unit TEXT NOT NULL DEFAULT 'kg' CHECK (entry_unit IN ('kg', 'lbs')),
  -- Measurement snapshot taken when the exercise entered the session. History
  -- reads these, never the live catalog row.
  load_type TEXT NOT NULL DEFAULT 'external_weight'
    CHECK (load_type IN ('external_weight', 'bodyweight')),
  metric TEXT NOT NULL DEFAULT 'reps' CHECK (metric IN ('reps', 'duration'))
);

CREATE TABLE IF NOT EXISTS exercise_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
  text TEXT NOT NULL CHECK (length(trim(text)) > 0 AND length(text) <= ${EXERCISE_NOTE_MAX_LENGTH}),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS exercise_notes_exercise_date
  ON exercise_notes(exercise_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS exercise_notes_session ON exercise_notes(session_id);

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
  bonus_type TEXT,
  value_origin TEXT NOT NULL DEFAULT 'user' CHECK (value_origin IN ('template', 'history', 'propagated', 'user')),
  -- Integer seconds for duration-metric sets; reps then holds a neutral 0.
  duration_s INTEGER DEFAULT NULL,
  target_duration_s INTEGER DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL DEFAULT '',
  weekly_goal INTEGER NOT NULL DEFAULT 3,
  program_weekly_goal INTEGER NOT NULL DEFAULT 3,
  experience_level TEXT NOT NULL DEFAULT 'intermediate',
  training_days TEXT NOT NULL DEFAULT '[]',
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  auto_increase_weight INTEGER NOT NULL DEFAULT 1,
  weight_increment REAL NOT NULL DEFAULT ${NEW_PROFILE_WEIGHT_INCREMENT},
  weight_unit TEXT NOT NULL DEFAULT 'kg',
  weight_increment_lbs REAL NOT NULL DEFAULT 5,
  active_split_id INTEGER REFERENCES custom_splits(id),
  program_mode TEXT NOT NULL DEFAULT 'none' CHECK (program_mode IN ('none', 'stack', 'custom')),
  three_day_structure TEXT NOT NULL DEFAULT 'full-body' CHECK (three_day_structure IN ('full-body', 'push-pull-legs')),
  weight_unit_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (weight_unit_confirmed IN (0, 1))
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
CREATE INDEX IF NOT EXISTS custom_split_workouts_split_position
  ON custom_split_workouts(split_id, position);
CREATE INDEX IF NOT EXISTS custom_split_workout_exercises_workout_position
  ON custom_split_workout_exercises(workout_id, position);

${COMPLETION_GUARD_SQL}
${IMPORT_SCHEMA}
`;

interface ProfileRow {
  name: string;
  weekly_goal: number;
  program_weekly_goal?: number;
  experience_level: ExperienceLevel;
  training_days: string;
  onboarding_completed: number;
  auto_increase_weight: number;
  weight_increment: number;
  weight_unit: WeightUnit;
  weight_increment_lbs: number;
  active_split_id: number | null;
  program_mode?: ProgramMode;
  three_day_structure?: ThreeDayStructure;
  weight_unit_confirmed?: number;
}

interface SessionJoinRow {
  imported_session_id: number | null;
  origin: SessionOrigin;
  session_id: number;
  date: string;
  completed_at: string | null;
  entry_unit: WeightUnit;
  archetype: Archetype | null;
  secondary_archetype: Archetype | null;
  archetype_variant: string | null;
  secondary_archetype_variant: string | null;
  custom_split_id: number | null;
  custom_split_workout_id: number | null;
  workout_type: WorkoutType | null;
  workout_type_position: number | null;
  intensity: IntensityLevel | null;
  session_completed: number;
  session_retroactive: number;
  session_exercise_id: number | null;
  catalog_exercise_id: number | null;
  exercise_name: string | null;
  exercise_load_type: ExerciseLoadType | null;
  exercise_metric: ExerciseMetric | null;
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
  value_origin: SetValueOrigin;
  duration_s: number | null;
  target_duration_s: number | null;
}

interface SplitTemplateRow {
  workout_type: WorkoutType;
  name: string;
  load_type: ExerciseLoadType;
  metric: ExerciseMetric;
  target_reps: number;
  target_weight: number;
  target_duration_s: number | null;
}

interface ArchetypeTemplateRow {
  name: string;
  load_type: ExerciseLoadType;
  metric: ExerciseMetric;
  target_reps: number;
  target_weight: number;
  target_duration_s: number | null;
}

interface ArchetypeTemplateCatalogRow extends ExerciseCatalogRow {
  position: number;
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
  equipment: string | null;
  load_type: ExerciseLoadType;
  metric: ExerciseMetric;
}

interface PositionedIdRow {
  id: number;
  position: number;
}

interface CustomSplitSummaryRow {
  has_hevy_details: number;
  is_stack_plan: number;
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  workout_count: number;
  exercise_count: number;
}

interface CustomSplitRow {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  is_stack_plan: number;
}

interface CustomSplitDetailRow {
  color: string | null;
  workout_id: number;
  split_id: number;
  workout_name: string;
  workout_position: number;
  workout_exercise_id: number | null;
  exercise_id: number | null;
  exercise_name: string | null;
  primary_muscle: string | null;
  equipment: string | null;
  load_type: ExerciseLoadType | null;
  metric: ExerciseMetric | null;
  workout_type: WorkoutType | null;
  is_custom: number | null;
  exercise_position: number | null;
}

export interface WorkoutDatabaseSnapshot {
  profile: UserProfile | null;
  sessions: WorkoutSession[];
  currentSession: WorkoutSession | null;
  workoutFocus: WorkoutFocus | null;
  splitTemplates: Record<WorkoutType, Exercise[]>;
  customSplits: CustomSplitSummary[];
}

let database: SQLiteDatabase | null = null;
let databasePromise: Promise<SQLiteDatabase> | null = null;

const sessionJoinSql = (where = '') => `
  SELECT
    iw.session_id AS imported_session_id,
    s.id AS session_id,
    s.origin,
    s.date,
    s.completed_at,
    se.entry_unit,
    s.archetype,
    s.secondary_archetype,
    s.archetype_variant,
    s.secondary_archetype_variant,
    s.custom_split_id,
    s.custom_split_workout_id,
    swt.workout_type,
    swt.position AS workout_type_position,
    s.intensity,
    s.completed AS session_completed,
    s.retroactive AS session_retroactive,
    se.id AS session_exercise_id,
    se.exercise_id AS catalog_exercise_id,
    e.name AS exercise_name,
    se.load_type AS exercise_load_type,
    se.metric AS exercise_metric,
    se.position AS exercise_position,
    st.id AS set_id,
    st.set_index,
    st.reps,
    st.weight,
    st.target_reps,
    st.target_weight,
    st.completed AS set_completed,
    st.skipped,
    st.bonus_type,
    st.value_origin,
    st.duration_s,
    st.target_duration_s
  FROM sessions s
  LEFT JOIN imported_workouts iw ON iw.session_id = s.id
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
    programWeeklyGoal: row.program_weekly_goal ?? Math.max(1, Math.min(6, row.weekly_goal || 3)),
    experienceLevel: row.experience_level,
    trainingDays,
    onboardingCompleted: Boolean(row.onboarding_completed),
    autoIncreaseWeight: Boolean(row.auto_increase_weight),
    weightIncrement: row.weight_increment,
    weightUnit: row.weight_unit ?? DEFAULT_WEIGHT_UNIT,
    weightIncrementLbs: row.weight_increment_lbs ?? DEFAULT_WEIGHT_INCREMENT_LBS,
    activeSplitId: row.active_split_id ?? null,
    ...resolveProgramPreferences({
      activeSplitId: row.active_split_id ?? null,
      experienceLevel: row.experience_level,
      programMode: row.program_mode,
      threeDayStructure: row.three_day_structure,
      weightUnitConfirmed: row.weight_unit_confirmed === undefined ? undefined : Boolean(row.weight_unit_confirmed),
    }),
  };
};

interface ExerciseNoteRow {
  id: number;
  exercise_id: number;
  session_id: number | null;
  text: string;
  created_at: string;
}
const noteFromRow = (row: ExerciseNoteRow): ExerciseNote => ({
  id: row.id, exerciseId: row.exercise_id,
  workoutId: row.session_id === null ? null : String(row.session_id),
  text: row.text, createdAt: row.created_at,
});
const SESSION_NOTES_SQL = 'SELECT * FROM exercise_notes WHERE session_id IS NOT NULL ORDER BY created_at ASC, id ASC';

const sessionsFromRows = (
  rows: SessionJoinRow[],
  notes?: ExerciseNoteRow[]
): WorkoutSession[] => {
  // Targeted readbacks (saving a note or changing an exercise) only fetch the
  // sessions being reconstructed, rather than every historical note.
  if (!notes) {
    const ids = [...new Set(rows.map((row) => row.session_id))];
    notes = ids.length === 0 ? [] : getDatabase().getAllSync<ExerciseNoteRow>(
      `SELECT * FROM exercise_notes WHERE session_id IN (${ids.join(',')}) ORDER BY created_at ASC, id ASC`
    );
  }
  const sessions = new Map<number, WorkoutSession>();
  const exercises = new Map<number, SessionExercise>();
  const sets = new Set<number>();
  // A source snapshot can be large. Read it once per workout, rather than duplicating
  // the JSON across every set and muscle-category row in the history join.
  const imported = new Map<number, ImportedWorkoutFacts>();
  const importedIds = [...new Set(rows.flatMap(row => row.imported_session_id == null ? [] : [row.imported_session_id]))];
  for (let offset = 0; offset < importedIds.length; offset += 400) {
    const ids = importedIds.slice(offset, offset + 400);
    for (const facts of getDatabase().getAllSync<{ session_id: number; data: string }>(
      `SELECT session_id, data FROM imported_workouts WHERE session_id IN (${ids.map(() => '?').join(',')})`, ...ids)) {
      imported.set(facts.session_id, JSON.parse(facts.data) as ImportedWorkoutFacts);
    }
  }

  for (const row of rows) {
    let session = sessions.get(row.session_id);
    if (!session) {
      session = {
        ...(imported.has(row.session_id) ? { imported: imported.get(row.session_id) } : {}),
        id: String(row.session_id),
        origin: row.origin,
        date: row.date,
        completedAt: row.completed_at ?? null,
        archetype: row.archetype,
        secondaryArchetype: row.secondary_archetype,
        archetypeVariant: row.archetype_variant,
        secondaryArchetypeVariant: row.secondary_archetype_variant,
        customSplitId: row.custom_split_id ?? null,
        customSplitWorkoutId: row.custom_split_workout_id ?? null,
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
      exercise = {
        exerciseId: row.catalog_exercise_id ?? undefined,
        notes: [],
        name: row.exercise_name,
        entryUnit: row.entry_unit,
        loadType: row.exercise_load_type ?? 'external_weight',
        metric: row.exercise_metric ?? 'reps',
        sets: [],
      };
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
      ...(session.imported ? { sourceKind: session.imported.exercises[row.exercise_position ?? 0]?.sets[row.set_index]?.kind } : {}),
      valueOrigin: row.value_origin,
      reps: row.reps,
      weight: row.weight,
      completed: Boolean(row.set_completed),
      skipped: Boolean(row.skipped),
    };
    if (row.target_reps !== null) set.targetReps = row.target_reps;
    if (row.target_weight !== null) set.targetWeight = row.target_weight;
    if (row.duration_s !== null) set.durationS = row.duration_s;
    if (row.target_duration_s !== null) set.targetDurationS = row.target_duration_s;
    if (row.bonus_type !== null) set.type = row.bonus_type;
    exercise.sets.push(set);
    sets.add(row.set_id);
  }

  const notesByExercise = new Map<string, ExerciseNote[]>();
  for (const row of notes) {
    const key = `${row.session_id}:${row.exercise_id}`;
    const list = notesByExercise.get(key) ?? [];
    list.push(noteFromRow(row));
    notesByExercise.set(key, list);
  }
  for (const session of sessions.values()) {
    for (const exercise of session.exercises) {
      exercise.notes = notesByExercise.get(`${session.id}:${exercise.exerciseId}`) ?? [];
    }
  }
  return [...sessions.values()];
};

/** Three template sets; a timed template carries its seconds, never reps. */
const templateExerciseFromRow = (row: {
  name: string;
  load_type: ExerciseLoadType;
  metric: ExerciseMetric | null;
  target_reps: number;
  target_weight: number;
  target_duration_s: number | null;
}): Exercise => {
  const metric = row.metric ?? 'reps';
  return {
    name: row.name,
    loadType: row.load_type,
    metric,
    sets: Array.from({ length: 3 }, () => metric === 'duration'
      ? { reps: 0, weight: row.target_weight, durationS: row.target_duration_s ?? DEFAULT_DURATION_S }
      : { reps: row.target_reps, weight: row.target_weight }),
  };
};

const splitTemplatesFromRows = (
  rows: SplitTemplateRow[]
): Record<WorkoutType, Exercise[]> => {
  const templates = emptySplitTemplates();
  for (const row of rows) {
    templates[row.workout_type].push(templateExerciseFromRow(row));
  }
  return templates;
};

const insertSeedDataAsync = async (db: SQLiteDatabase): Promise<void> => {
  for (const seed of EXERCISE_SEEDS) {
    await db.runAsync(
      `INSERT INTO exercises
        (name, workout_type, primary_muscle, secondary_muscle, is_custom, load_type, metric)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      seed.name,
      seed.workoutType,
      seed.primaryMuscle,
      seed.secondaryMuscle,
      seed.loadType,
      seed.metric
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
        (workout_type, exercise_id, position, target_reps, target_weight, target_duration_s)
       VALUES (?, ?, ?, ?, ?, ?)`,
      seed.workoutType,
      exercise.id,
      position,
      seed.targetReps,
      seed.targetWeight,
      seed.targetDurationS ?? null
    );
    positions.set(seed.workoutType, position + 1);
  }

  await insertArchetypeTemplateSeedsAsync(db);
};

const insertSeedDataSync = (db: SQLiteDatabase): void => {
  for (const seed of EXERCISE_SEEDS) {
    db.runSync(
      `INSERT INTO exercises
        (name, workout_type, primary_muscle, secondary_muscle, is_custom, load_type, metric)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      seed.name,
      seed.workoutType,
      seed.primaryMuscle,
      seed.secondaryMuscle,
      seed.loadType,
      seed.metric
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
        (workout_type, exercise_id, position, target_reps, target_weight, target_duration_s)
       VALUES (?, ?, ?, ?, ?, ?)`,
      seed.workoutType,
      exercise.id,
      position,
      seed.targetReps,
      seed.targetWeight,
      seed.targetDurationS ?? null
    );
    positions.set(seed.workoutType, position + 1);
  }

  insertArchetypeTemplateSeedsSync(db);
};

/**
 * Catalog seeds are deliberately reconciled on every launch. `name` is unique,
 * so INSERT OR IGNORE adds only newly shipped built-ins and preserves a custom
 * exercise a user may already have created with the same name.
 */
const insertMissingExerciseSeedsAsync = async (db: SQLiteDatabase): Promise<void> => {
  await db.withTransactionAsync(async () => {
    for (const seed of EXERCISE_SEEDS) {
      await db.runAsync(
        `INSERT OR IGNORE INTO exercises
          (name, workout_type, primary_muscle, secondary_muscle, is_custom, load_type, metric)
         VALUES (?, ?, ?, ?, 0, ?, ?)`,
        seed.name,
        seed.workoutType,
        seed.primaryMuscle,
        seed.secondaryMuscle,
        seed.loadType,
        seed.metric
      );
    }
  });
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
          (name, workout_type, primary_muscle, secondary_muscle, is_custom, load_type)
         VALUES (?, ?, ?, ?, 0, ?)`,
        seed.name,
        seed.workoutType,
        seed.primaryMuscle,
        seed.secondaryMuscle,
        seed.loadType
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
          (name, workout_type, primary_muscle, secondary_muscle, is_custom, load_type)
         VALUES (?, ?, ?, ?, 0, ?)`,
        seed.name,
        seed.workoutType,
        seed.primaryMuscle,
        seed.secondaryMuscle,
        seed.loadType
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
      `Workout database seed did not produce ${EXERCISE_SEEDS.length + ARCHETYPE_EXERCISE_SEEDS.length} exercises, ${SPLIT_TEMPLATE_SEEDS.length} split templates, and ${ARCHETYPE_TEMPLATE_SEEDS.length} archetype templates`
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
      `Workout database seed did not produce ${EXERCISE_SEEDS.length + ARCHETYPE_EXERCISE_SEEDS.length} exercises, ${SPLIT_TEMPLATE_SEEDS.length} split templates, and ${ARCHETYPE_TEMPLATE_SEEDS.length} archetype templates`
    );
  }
};

const seedFreshDatabaseAsync = async (db: SQLiteDatabase): Promise<void> => {
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM exercise_notes;
      DELETE FROM sets;
      DELETE FROM session_exercises;
      DELETE FROM session_workout_types;
      DELETE FROM sessions;
      DELETE FROM profile;
      DELETE FROM custom_split_workout_exercises;
      DELETE FROM custom_split_workouts;
      DELETE FROM custom_splits;
      DELETE FROM split_templates;
      DELETE FROM archetype_templates;
      DELETE FROM exercises;
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
  table: 'archetype_templates' | 'exercises' | 'sessions' | 'profile' | 'custom_splits' | 'custom_split_workouts',
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

const ensureSessionCustomSplitColumnsAsync = async (
  db: SQLiteDatabase
): Promise<void> => {
  if (!(await tableHasColumnAsync(db, 'sessions', 'custom_split_id'))) {
    await db.execAsync(
      'ALTER TABLE sessions ADD COLUMN custom_split_id INTEGER DEFAULT NULL;'
    );
  }
  if (!(await tableHasColumnAsync(db, 'sessions', 'custom_split_workout_id'))) {
    await db.execAsync(
      'ALTER TABLE sessions ADD COLUMN custom_split_workout_id INTEGER DEFAULT NULL;'
    );
  }
};

const ensureProfileWeightIncrementColumnAsync = async (
  db: SQLiteDatabase
): Promise<void> => {
  if (!(await tableHasColumnAsync(db, 'profile', 'weight_increment'))) {
    await db.execAsync(
      'ALTER TABLE profile ADD COLUMN weight_increment REAL NOT NULL DEFAULT 2.5;'
    );
  }
};

const ensureProfileAutoIncreaseWeightColumnAsync = async (
  db: SQLiteDatabase
): Promise<void> => {
  if (!(await tableHasColumnAsync(db, 'profile', 'auto_increase_weight'))) {
    await db.execAsync(
      'ALTER TABLE profile ADD COLUMN auto_increase_weight INTEGER NOT NULL DEFAULT 1;'
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

const ensureExerciseLoadTypeColumnAsync = async (
  db: SQLiteDatabase
): Promise<void> => {
  if (!(await tableHasColumnAsync(db, 'exercises', 'load_type'))) {
    await db.execAsync(
      "ALTER TABLE exercises ADD COLUMN load_type TEXT NOT NULL DEFAULT 'external_weight';"
    );
  }
};

// Built-in catalog rows follow the shipped seed. Session snapshots keep each
// workout's own measurement, so this never reinterprets history.
const reconcileExerciseMeasurementsAsync = async (
  db: SQLiteDatabase
): Promise<void> => {
  await db.withTransactionAsync(async () => {
    for (const seed of [...EXERCISE_SEEDS, ...ARCHETYPE_EXERCISE_SEEDS]) {
      await db.runAsync(
        `UPDATE exercises
         SET load_type = ?, metric = ?
         WHERE name = ? AND is_custom = 0`,
        seed.loadType,
        seed.metric,
        seed.name
      );
    }
  });
};

const ensureCustomSplitsSchemaAsync = async (
  db: SQLiteDatabase
): Promise<void> => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS custom_splits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_split_workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      split_id INTEGER NOT NULL REFERENCES custom_splits(id),
      name TEXT NOT NULL DEFAULT '',
      position INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_split_workout_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER NOT NULL REFERENCES custom_split_workouts(id),
      exercise_id INTEGER NOT NULL REFERENCES exercises(id),
      position INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS custom_split_workouts_split_position
      ON custom_split_workouts(split_id, position);
    CREATE INDEX IF NOT EXISTS custom_split_workout_exercises_workout_position
      ON custom_split_workout_exercises(workout_id, position);
  `);

  if (!(await tableHasColumnAsync(db, 'custom_split_workouts', 'color'))) {
    await db.execAsync('ALTER TABLE custom_split_workouts ADD COLUMN color TEXT;');
  }
  if (!(await tableHasColumnAsync(db, 'custom_splits', 'is_stack_plan'))) {
    await db.execAsync('ALTER TABLE custom_splits ADD COLUMN is_stack_plan INTEGER NOT NULL DEFAULT 0 CHECK (is_stack_plan IN (0, 1));');
  }

  if (!(await tableHasColumnAsync(db, 'exercises', 'equipment'))) {
    await db.execAsync('ALTER TABLE exercises ADD COLUMN equipment TEXT;');
  }
  if (!(await tableHasColumnAsync(db, 'profile', 'active_split_id'))) {
    await db.execAsync(
      'ALTER TABLE profile ADD COLUMN active_split_id INTEGER REFERENCES custom_splits(id);'
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
        DROP TABLE IF EXISTS exercise_notes;
        DROP TABLE IF EXISTS sets;
        DROP TABLE IF EXISTS session_exercises;
        DROP TABLE IF EXISTS session_workout_types;
        DROP TABLE IF EXISTS sessions;
        DROP TABLE IF EXISTS custom_split_workout_exercises;
        DROP TABLE IF EXISTS custom_split_workouts;
        DROP TABLE IF EXISTS custom_splits;
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

// v15 preserves unknown legacy values as user-owned rather than risking
// destructive propagation. Newly created sets record their actual source.
const ensureWorkoutStateColumnsAsync = async (db: SQLiteDatabase): Promise<void> => {
  const sets = await db.getAllAsync<{ name: string }>('PRAGMA table_info(sets)');
  const sessions = await db.getAllAsync<{ name: string }>('PRAGMA table_info(sessions)');
  await db.withTransactionAsync(async () => {
    if (!sets.some((column) => column.name === 'value_origin')) {
      await db.execAsync("ALTER TABLE sets ADD COLUMN value_origin TEXT NOT NULL DEFAULT 'user' CHECK (value_origin IN ('template', 'history', 'propagated', 'user'));");
    }
    if (!sessions.some((column) => column.name === 'focus_session_exercise_id')) {
      await db.execAsync('ALTER TABLE sessions ADD COLUMN focus_session_exercise_id INTEGER DEFAULT NULL;');
    }
    await db.execAsync(`UPDATE sessions SET focus_session_exercise_id = COALESCE(
      (SELECT se.id FROM session_exercises se JOIN sets st ON st.session_exercise_id = se.id
       WHERE se.session_id = sessions.id AND st.completed = 0 ORDER BY se.position, st.set_index LIMIT 1),
      (SELECT se.id FROM session_exercises se WHERE se.session_id = sessions.id ORDER BY se.position DESC LIMIT 1)
    ) WHERE completed = 0 AND focus_session_exercise_id IS NULL;`);
  });
};

// v16 snapshots the migration-time preference once for legacy exercises.
// No weights/profile/history timestamps are rewritten. Run after profile-unit
// migration so very old databases can safely use the same fallback.
const ensureExerciseUnitsAndCompletionAsync = async (db: SQLiteDatabase): Promise<void> => {
  const exercises = await db.getAllAsync<{ name: string }>('PRAGMA table_info(session_exercises)');
  const sessions = await db.getAllAsync<{ name: string }>('PRAGMA table_info(sessions)');
  await db.withTransactionAsync(async () => {
    if (!sessions.some((column) => column.name === 'completed_at')) {
      await db.execAsync('ALTER TABLE sessions ADD COLUMN completed_at TEXT DEFAULT NULL;');
    }
    if (!exercises.some((column) => column.name === 'entry_unit')) {
      await db.execAsync("ALTER TABLE session_exercises ADD COLUMN entry_unit TEXT NOT NULL DEFAULT 'kg' CHECK (entry_unit IN ('kg', 'lbs'));");
      await db.execAsync(`UPDATE session_exercises SET entry_unit = CASE
        WHEN (SELECT weight_unit FROM profile WHERE id = 1) = 'lbs' THEN 'lbs' ELSE 'kg' END;`);
    }
  });
};

/**
 * v17 measurement model. Adds the catalog metric, the session measurement
 * snapshot and integer-second duration storage, then moves verified legacy
 * seconds out of `reps`. The whole step is keyed on the snapshot column and
 * runs in one transaction, so it either completes once or not at all; every
 * rewrite is additionally guarded so a repeat can never move a value twice.
 */
const ensureExerciseMeasurementAsync = async (db: SQLiteDatabase): Promise<void> => {
  const columnsOf = async (table: string) =>
    (await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`)).map((column) => column.name);
  const exercises = await columnsOf('exercises');
  const sessionExercises = await columnsOf('session_exercises');
  const sets = await columnsOf('sets');
  const splitTemplates = await columnsOf('split_templates');
  const archetypeTemplates = await columnsOf('archetype_templates');
  const legacy = LEGACY_SECONDS_EXERCISES.map(() => '?').join(', ');
  const legacyExerciseIds = `SELECT id FROM exercises WHERE is_custom = 0 AND name IN (${legacy})`;

  await db.withTransactionAsync(async () => {
    if (!exercises.includes('metric')) {
      // Existing built-in and custom exercises are rep-based until the seed
      // reconciliation below; custom names are never inspected.
      await db.execAsync("ALTER TABLE exercises ADD COLUMN metric TEXT NOT NULL DEFAULT 'reps' CHECK (metric IN ('reps', 'duration'));");
    }
    if (!sets.includes('duration_s')) {
      await db.execAsync('ALTER TABLE sets ADD COLUMN duration_s INTEGER DEFAULT NULL;');
    }
    if (!sets.includes('target_duration_s')) {
      await db.execAsync('ALTER TABLE sets ADD COLUMN target_duration_s INTEGER DEFAULT NULL;');
    }
    if (!splitTemplates.includes('target_duration_s')) {
      await db.execAsync('ALTER TABLE split_templates ADD COLUMN target_duration_s INTEGER DEFAULT NULL;');
    }
    if (!archetypeTemplates.includes('target_duration_s')) {
      await db.execAsync('ALTER TABLE archetype_templates ADD COLUMN target_duration_s INTEGER DEFAULT NULL;');
    }
    if (sessionExercises.includes('metric')) return;

    if (!sessionExercises.includes('load_type')) {
      await db.execAsync("ALTER TABLE session_exercises ADD COLUMN load_type TEXT NOT NULL DEFAULT 'external_weight' CHECK (load_type IN ('external_weight', 'bodyweight'));");
    }
    await db.execAsync("ALTER TABLE session_exercises ADD COLUMN metric TEXT NOT NULL DEFAULT 'reps' CHECK (metric IN ('reps', 'duration'));");
    // Pre-v17 reads used the catalog load type, so snapshotting it now keeps
    // every existing session exactly as it displayed before.
    await db.execAsync(`UPDATE session_exercises SET load_type = COALESCE(
      (SELECT e.load_type FROM exercises e WHERE e.id = session_exercises.exercise_id), 'external_weight');`);
    await db.runAsync(
      `UPDATE session_exercises SET metric = 'duration' WHERE exercise_id IN (${legacyExerciseIds})`,
      ...LEGACY_SECONDS_EXERCISES
    );
    // Completed, active and bonus rows alike: the number was always seconds.
    await db.execAsync(`UPDATE sets
      SET duration_s = reps, target_duration_s = target_reps, reps = 0, target_reps = NULL
      WHERE duration_s IS NULL
        AND session_exercise_id IN (SELECT id FROM session_exercises WHERE metric = 'duration');`);
    for (const table of ['split_templates', 'archetype_templates']) {
      await db.runAsync(
        `UPDATE ${table} SET target_duration_s = target_reps, target_reps = 0
         WHERE target_duration_s IS NULL AND exercise_id IN (${legacyExerciseIds})`,
        ...LEGACY_SECONDS_EXERCISES
      );
    }
  });
};

const ensureSessionOriginAsync = async (db: SQLiteDatabase): Promise<void> => {
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(sessions)');
  if (columns.some((column) => column.name === 'origin')) return;
  await db.withTransactionAsync(async () => {
    await db.execAsync("ALTER TABLE sessions ADD COLUMN origin TEXT NOT NULL DEFAULT 'legacy' CHECK (origin IN ('archetype', 'custom', 'adhoc', 'legacy'));");
    await db.execAsync(`UPDATE sessions SET origin = CASE
      WHEN custom_split_id IS NOT NULL OR custom_split_workout_id IS NOT NULL THEN 'custom'
      WHEN archetype IS NOT NULL OR secondary_archetype IS NOT NULL
        OR archetype_variant IS NOT NULL OR secondary_archetype_variant IS NOT NULL THEN 'archetype'
      ELSE 'legacy' END;`);
  });
};

// Preserve the old program exactly once, before goal editing becomes independent.
const ensureProgramFrequencyAsync = async (db: SQLiteDatabase): Promise<void> => {
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(profile)');
  if (columns.some(column => column.name === 'program_weekly_goal')) return;
  await db.withTransactionAsync(async () => {
    await db.execAsync('ALTER TABLE profile ADD COLUMN program_weekly_goal INTEGER NOT NULL DEFAULT 3;');
    await db.execAsync('UPDATE profile SET program_weekly_goal = MAX(1, MIN(6, CASE WHEN weekly_goal > 0 THEN weekly_goal ELSE 3 END));');
  });
};

/** Schema 22: preserve legacy selection, structure and units together, once. */
const ensureProgramPreferencesAsync = async (db: SQLiteDatabase): Promise<void> => {
  const columns = new Set((await db.getAllAsync<{ name: string }>('PRAGMA table_info(profile)')).map(column => column.name));
  if (['program_mode', 'three_day_structure', 'weight_unit_confirmed'].every(column => columns.has(column))) return;
  await db.withTransactionAsync(async () => {
    if (!columns.has('program_mode')) {
      await db.execAsync("ALTER TABLE profile ADD COLUMN program_mode TEXT NOT NULL DEFAULT 'none' CHECK (program_mode IN ('none', 'stack', 'custom'));");
      // An orphaned reference is genuinely missing, rather than a failed load.
      await db.execAsync("UPDATE profile SET program_mode = CASE WHEN active_split_id IS NULL THEN 'stack' WHEN EXISTS (SELECT 1 FROM custom_splits WHERE id = active_split_id) THEN 'custom' ELSE 'none' END;");
      await db.execAsync('UPDATE profile SET active_split_id = NULL WHERE program_mode = \'none\';');
    }
    if (!columns.has('three_day_structure')) {
      await db.execAsync("ALTER TABLE profile ADD COLUMN three_day_structure TEXT NOT NULL DEFAULT 'full-body' CHECK (three_day_structure IN ('full-body', 'push-pull-legs'));");
      await db.execAsync("UPDATE profile SET three_day_structure = CASE WHEN experience_level = 'beginner' THEN 'full-body' ELSE 'push-pull-legs' END;");
    }
    if (!columns.has('weight_unit_confirmed')) {
      await db.execAsync('ALTER TABLE profile ADD COLUMN weight_unit_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (weight_unit_confirmed IN (0, 1));');
      await db.execAsync('UPDATE profile SET weight_unit_confirmed = 1;');
    }
  });
};

export const initializeWorkoutDatabase = async (): Promise<SQLiteDatabase> => {
  if (database) return database;
  if (databasePromise) return databasePromise;

  databasePromise = (async () => {
    const opened = await openDatabaseAsync(DATABASE_NAME);
    await opened.execAsync(WORKOUT_DATABASE_SCHEMA);
    // Older databases need this before any migration path inserts newly shipped
    // archetype or catalog exercises using the canonical load classification.
    await ensureExerciseLoadTypeColumnAsync(opened);
    await ensureWorkoutStateColumnsAsync(opened);
    await ensureExerciseMeasurementAsync(opened);

    const schemaVersion = await opened.getFirstAsync<{ user_version: number }>(
      'PRAGMA user_version'
    );
    const version = schemaVersion?.user_version ?? 0;
    const hasLegacyWorkoutType = await sessionsHasLegacyWorkoutTypeAsync(opened);

    if (hasLegacyWorkoutType) {
      try {
        await migrateLegacySessionWorkoutTypesAsync(opened);
      } catch (error) {
        if (!__DEV__) {
          throw error;
        }
        console.warn('Session workout type migration failed; rebuilding development database', error);
        await rebuildFreshDatabaseAsync(opened);
      }
    } else if (version === 0) {
      await seedFreshDatabaseAsync(opened);
    } else if (version < 3) {
      await migrateArchetypeTemplatesAsync(opened);
    }
    if (!hasLegacyWorkoutType && version > 0 && version < 14) {
      await migrateSessionArchetypesAsync(opened);
    }
    if (!hasLegacyWorkoutType && version >= 3 && version < 14) {
      await migrateArchetypeVariantsAsync(opened);
    }
    if (version > 0 && version < 14) {
      await removeLegacyTestExerciseAsync(opened);
    }
    await ensureSessionRetroactiveColumnAsync(opened);
    await ensureProfileAutoIncreaseWeightColumnAsync(opened);
    await ensureProfileWeightIncrementColumnAsync(opened);
    await ensureProfileWeightUnitColumnAsync(opened);
    await ensureProfileWeightIncrementLbsColumnAsync(opened);
    await ensureProgramFrequencyAsync(opened);
    await ensureCustomSplitsSchemaAsync(opened);
    await ensureProgramPreferencesAsync(opened);
    await ensureSessionCustomSplitColumnsAsync(opened);
    await ensureExerciseUnitsAndCompletionAsync(opened);
    await ensureSessionOriginAsync(opened);
    await opened.execAsync(COMPLETION_GUARD_SQL);
    await insertMissingExerciseSeedsAsync(opened);
    await reconcileExerciseMeasurementsAsync(opened);
    if (!hasLegacyWorkoutType && version > 0 && version < CURRENT_SCHEMA_VERSION) {
      await opened.execAsync(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION}`);
    }

    database = opened;
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
      SELECT st.workout_type, e.name, e.load_type, e.metric, st.target_reps,
             st.target_weight, st.target_duration_s
      FROM split_templates st
      JOIN exercises e ON e.id = st.exercise_id
      ORDER BY st.workout_type, st.position
    `)
  );

export const readSplitTemplatesSync = (): Record<WorkoutType, Exercise[]> =>
  splitTemplatesFromRows(
    getDatabase().getAllSync<SplitTemplateRow>(`
      SELECT st.workout_type, e.name, e.load_type, e.metric, st.target_reps,
             st.target_weight, st.target_duration_s
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
    `SELECT e.name, e.load_type, e.metric, at.target_reps, at.target_weight, at.target_duration_s
     FROM archetype_templates at
     JOIN exercises e ON e.id = at.exercise_id
     WHERE at.archetype = ? AND at.variant = ?
     ORDER BY at.position`,
    archetype,
    variant
  ).map(templateExerciseFromRow);

/**
 * Read-only builder projection of an archetype template. Unlike the active
 * workout reader above, this keeps each exercise's persistent catalog ID and
 * does not inspect or advance session rotation state.
 */
export const readArchetypeTemplateCatalogSync = (
  archetype: Archetype,
  variant = 'a'
): ExerciseCatalogItem[] =>
  getDatabase()
    .getAllSync<ArchetypeTemplateCatalogRow>(
      `SELECT e.id, e.name, e.workout_type, e.primary_muscle,
              e.is_custom, e.equipment, e.load_type, e.metric, at.position
       FROM archetype_templates at
       JOIN exercises e ON e.id = at.exercise_id
       WHERE at.archetype = ? AND at.variant = ?
       ORDER BY at.position`,
      archetype,
      variant
    )
    .map((row) => ({
      id: row.id,
      name: row.name,
      workoutType: row.workout_type,
      primaryMuscle: row.primary_muscle,
      isCustom: Boolean(row.is_custom),
      equipment: row.equipment,
      loadType: row.load_type,
      metric: row.metric,
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
  sessionsFromRows(
    await db.getAllAsync<SessionJoinRow>(sessionJoinSql()),
    await db.getAllAsync<ExerciseNoteRow>(SESSION_NOTES_SQL)
  );

export const readCompletedSessionsSync = (): WorkoutSession[] =>
  sessionsFromRows(
    getDatabase().getAllSync<SessionJoinRow>(sessionJoinSql('WHERE s.completed = 1'))
  );

/** Set-level history for one exact catalog name, scoped by the shared verification rule. */
export function readExerciseRecordSetsSync(
  exerciseName: string,
  sessions: readonly WorkoutSession[]
): RecordSet[] {
  const verified = new Map(getVerifiedSessions(sessions).map((session) => [session.id, session]));
  if (verified.size === 0) return [];
  return getDatabase().getAllSync<{
    id: number; session_id: number; exercise_index: number; set_index: number;
    weight: number; reps: number;
  }>(
    `SELECT st.id, s.id AS session_id, se.position AS exercise_index,
            st.set_index, st.weight, st.reps
     FROM sets st
     JOIN session_exercises se ON se.id = st.session_exercise_id
     JOIN sessions s ON s.id = se.session_id
     JOIN exercises e ON e.id = se.exercise_id
     WHERE e.name = ? AND se.metric = 'reps' AND st.completed = 1 AND st.skipped = 0
     ORDER BY julianday(s.date) DESC, s.id DESC, se.position ASC, st.set_index ASC`,
    exerciseName
  ).filter((row) => {
    const session = verified.get(String(row.session_id));
    return session && session.exercises[row.exercise_index]?.sets[row.set_index]?.sourceKind !== 'warmup';
  }).map((row) => {
    const session = verified.get(String(row.session_id))!;
    // Preserve the app's local-calendar interpretation of date-only legacy sessions.
    const date = /^\d{4}-\d{2}-\d{2}$/.test(session.date)
      ? new Date(`${session.date}T00:00:00`) : new Date(session.date);
    return {
      id: String(row.id), sessionId: session.id, date,
      exerciseIndex: row.exercise_index, setIndex: row.set_index,
      weight: row.weight, reps: row.reps,
    };
  });
}

/**
 * Stable rotation source for Custom Splits: the workout ID of the most recent
 * successfully completed live session belonging to `splitId`.
 *
 * Ordering is by `id`, not `date`: rows are inserted when a session starts and
 * there is never more than one incomplete session, so the autoincrement key is
 * the real execution order — and unlike the text `date` column it cannot be
 * thrown off by two timestamp spellings sorting against each other. Retroactive
 * logs are excluded because they never come from the live Custom path.
 */
export const readLastCompletedCustomWorkoutIdSync = (
  splitId: number
): number | null =>
  getDatabase().getFirstSync<{ custom_split_workout_id: number }>(
    `SELECT custom_split_workout_id
     FROM sessions
     WHERE completed = 1
       AND retroactive = 0
       AND custom_split_id = ?
       AND custom_split_workout_id IS NOT NULL
     ORDER BY id DESC
     LIMIT 1`,
    splitId
  )?.custom_split_workout_id ?? null;

export interface CustomSplitWorkoutLabel {
  splitId: number;
  name: string;
  position: number;
}

/** Resolves a session's persisted Custom workout back to its saved identity. */
export const readCustomSplitWorkoutLabelSync = (
  workoutId: number
): CustomSplitWorkoutLabel | null => {
  const row = getDatabase().getFirstSync<{
    split_id: number;
    name: string;
    position: number;
  }>(
    'SELECT split_id, name, position FROM custom_split_workouts WHERE id = ?',
    workoutId
  );
  return row
    ? { splitId: row.split_id, name: row.name, position: row.position }
    : null;
};

export const readSessionByIdSync = (id: number): WorkoutSession | undefined =>
  sessionsFromRows(
    getDatabase().getAllSync<SessionJoinRow>(sessionJoinSql('WHERE s.id = ?'), id)
  )[0];

export const readInitialWorkoutSnapshot = async (): Promise<WorkoutDatabaseSnapshot> => {
  const db = await initializeWorkoutDatabase();

  // This first profile read is deliberately awaited before startup routing.
  let profile = await readProfileAsync(db);
  const splitTemplates = await readSplitTemplatesAsync(db);
  const allSessions = await readAllSessionsAsync(db);
  const customSplits = await getCustomSplitsAsync();
  // Only a successful catalog read can prove that the selected routine is gone.
  const selectedSplitId = profile?.activeSplitId;
  if (profile?.programMode === 'custom' && !customSplits.some(split => split.id === selectedSplitId)) {
    chooseNoProgramSync();
    profile = readProfileSync();
  }

  const snapshot = {
    profile,
    sessions: allSessions.filter((session) => session.completed),
    currentSession: allSessions.find((session) => !session.completed) ?? null,
    workoutFocus: readCurrentWorkoutFocusSync(),
    splitTemplates,
    customSplits,
  };
  return snapshot;
};

export const writeProfile = (profile: UserProfile): void => {
  const preferences = resolveProgramPreferences(profile);
  // Older setup callers can still write before additive migrations finish.
  const db = getDatabase();
  const supported = new Set(db.getAllSync<{ name: string }>('PRAGMA table_info(profile)').map(column => column.name));
  const values: Record<string, string | number | null> = {
    name: profile.name, weekly_goal: profile.weeklyGoal,
    program_weekly_goal: profile.programWeeklyGoal ?? Math.max(1, Math.min(6, profile.weeklyGoal || 3)),
    experience_level: profile.experienceLevel, training_days: JSON.stringify(profile.trainingDays),
    onboarding_completed: profile.onboardingCompleted ? 1 : 0,
    auto_increase_weight: profile.autoIncreaseWeight ? 1 : 0,
    weight_increment: profile.weightIncrement, weight_unit: profile.weightUnit,
    weight_increment_lbs: profile.weightIncrementLbs, active_split_id: profile.activeSplitId,
    program_mode: preferences.programMode, three_day_structure: preferences.threeDayStructure,
    weight_unit_confirmed: preferences.weightUnitConfirmed ? 1 : 0,
  };
  const columns = Object.keys(values).filter(column => supported.has(column));
  db.runSync(
    `INSERT INTO profile (id, ${columns.join(', ')}) VALUES (1, ${columns.map(() => '?').join(', ')})
     ON CONFLICT(id) DO UPDATE SET ${columns.map(column => `${column} = excluded.${column}`).join(', ')}`,
    ...columns.map(column => values[column])
  );
};

const customSplitTimestamp = (): string => new Date().toISOString();

const touchCustomSplitSync = (db: SQLiteDatabase, splitId: number): void => {
  const split = db.getFirstSync<{ updated_at: string }>(
    'SELECT updated_at FROM custom_splits WHERE id = ?',
    splitId
  );
  if (!split) throw new Error('Custom split not found.');

  const previousTimestamp = Date.parse(split.updated_at);
  const nextTimestamp = new Date(
    Math.max(
      Date.now(),
      Number.isNaN(previousTimestamp) ? 0 : previousTimestamp + 1
    )
  ).toISOString();
  db.runSync(
    'UPDATE custom_splits SET updated_at = ? WHERE id = ?',
    nextTimestamp,
    splitId
  );
};

const requireCustomSplitSync = (db: SQLiteDatabase, splitId: number): void => {
  if (
    !db.getFirstSync<ExerciseIdRow>(
      'SELECT id FROM custom_splits WHERE id = ?',
      splitId
    )
  ) {
    throw new Error('Custom split not found.');
  }
};

const customSplitIdForWorkoutSync = (
  db: SQLiteDatabase,
  workoutId: number
): number => {
  const workout = db.getFirstSync<{ split_id: number }>(
    'SELECT split_id FROM custom_split_workouts WHERE id = ?',
    workoutId
  );
  if (!workout) throw new Error('Custom split workout not found.');
  return workout.split_id;
};

export const createCustomSplitSync = (name: string): number => {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error('Custom split name cannot be empty.');

  const timestamp = customSplitTimestamp();
  return getDatabase().runSync(
    `INSERT INTO custom_splits (name, created_at, updated_at)
     VALUES (?, ?, ?)`,
    normalizedName,
    timestamp,
    timestamp
  ).lastInsertRowId;
};

/** Sharing uses both seed catalogs; these names are portable, never row IDs. */
export const BUILT_IN_EXERCISE_NAMES: ReadonlySet<string> = new Set(
  [...EXERCISE_SEEDS, ...ARCHETYPE_EXERCISE_SEEDS].map((seed) => seed.name)
);

/** Save an independent copy without activating it. Database must be hydrated. */
export const importPortableSplitSync = (split: PortableSplit, attemptId?: string): ImportedSplit =>
  persistPortableSplit(getDatabase(), split, [...EXERCISE_SEEDS, ...ARCHETYPE_EXERCISE_SEEDS], attemptId);

export const renameCustomSplitSync = (splitId: number, name: string): void => {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error('Custom split name cannot be empty.');

  const db = getDatabase();
  db.withTransactionSync(() => {
    requireCustomSplitSync(db, splitId);
    db.runSync(
      'UPDATE custom_splits SET name = ? WHERE id = ?',
      normalizedName,
      splitId
    );
    touchCustomSplitSync(db, splitId);
  });
};

const deleteCustomSplitRowsSync = (db: SQLiteDatabase, splitId: number): void => {
  db.runSync(
    "UPDATE profile SET active_split_id = NULL, program_mode = 'none' WHERE active_split_id = ?",
    splitId
  );
  db.runSync(
    `DELETE FROM custom_split_workout_exercises
     WHERE workout_id IN (
       SELECT id FROM custom_split_workouts WHERE split_id = ?
     )`,
    splitId
  );
  db.runSync('DELETE FROM custom_split_workouts WHERE split_id = ?', splitId);
  db.runSync('DELETE FROM custom_splits WHERE id = ?', splitId);
};

export const deleteCustomSplitSync = (splitId: number): void => {
  const db = getDatabase();
  db.withTransactionSync(() => {
    requireCustomSplitSync(db, splitId);
    deleteCustomSplitRowsSync(db, splitId);
  });
};

/**
 * Accepting a newly generated Stack's plan replaces the edited one, in the same
 * transaction as the profile write so a failure keeps both. History stays.
 */
export const writeProfileReplacingStackPlanSync = (profile: UserProfile): void => {
  const db = getDatabase();
  db.withTransactionSync(() => {
    const row = db.getFirstSync<ExerciseIdRow>('SELECT id FROM custom_splits WHERE is_stack_plan = 1');
    if (row) deleteCustomSplitRowsSync(db, row.id);
    writeProfile(profile);
  });
};

export const getCustomSplitsAsync = async (): Promise<CustomSplitSummary[]> => {
  const db = await initializeWorkoutDatabase();
  const rows = await db.getAllAsync<CustomSplitSummaryRow>(`
    SELECT
      cs.id,
      cs.name,
      cs.created_at,
      cs.updated_at,
      cs.is_stack_plan,
      COUNT(DISTINCT csw.id) AS workout_count,
      COUNT(cswe.id) AS exercise_count,
      EXISTS(SELECT 1 FROM imported_routines ir JOIN custom_split_workouts iw ON iw.id = ir.workout_id WHERE iw.split_id = cs.id) AS has_hevy_details
    FROM custom_splits cs
    LEFT JOIN custom_split_workouts csw ON csw.split_id = cs.id
    LEFT JOIN custom_split_workout_exercises cswe ON cswe.workout_id = csw.id
    GROUP BY cs.id, cs.name, cs.created_at, cs.updated_at, cs.is_stack_plan
    ORDER BY cs.updated_at DESC, cs.id DESC
  `);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    workoutCount: row.workout_count,
    exerciseCount: row.exercise_count,
    ...(row.has_hevy_details ? { hasHevyDetails: true } : {}),
    ...(row.is_stack_plan ? { isStackPlan: true } : {}),
  }));
};

export const getCustomSplitDetailAsync = async (
  splitId: number
): Promise<CustomSplit | null> => {
  const db = await initializeWorkoutDatabase();
  const split = await db.getFirstAsync<CustomSplitRow>(
    `SELECT id, name, created_at, updated_at, is_stack_plan
     FROM custom_splits
     WHERE id = ?`,
    splitId
  );
  if (!split) return null;

  const rows = await db.getAllAsync<CustomSplitDetailRow>(
    `SELECT
       csw.id AS workout_id,
       csw.split_id,
       csw.name AS workout_name,
       csw.color,
       csw.position AS workout_position,
       cswe.id AS workout_exercise_id,
       e.id AS exercise_id,
       e.name AS exercise_name,
       e.primary_muscle,
       e.equipment,
       e.load_type,
       e.metric,
       e.workout_type,
       e.is_custom,
       cswe.position AS exercise_position
     FROM custom_split_workouts csw
     LEFT JOIN custom_split_workout_exercises cswe ON cswe.workout_id = csw.id
     LEFT JOIN exercises e ON e.id = cswe.exercise_id
     WHERE csw.split_id = ?
     ORDER BY csw.position ASC, csw.id ASC, cswe.position ASC, cswe.id ASC`,
    splitId
  );

  const workouts: CustomSplitWorkout[] = [];
  const workoutById = new Map<number, CustomSplitWorkout>();
  for (const row of rows) {
    let workout = workoutById.get(row.workout_id);
    if (!workout) {
      workout = {
        id: row.workout_id,
        splitId: row.split_id,
        name: row.workout_name,
        color: isDayColor(row.color) ? row.color : null,
        position: row.workout_position,
        exercises: [],
      };
      workoutById.set(row.workout_id, workout);
      workouts.push(workout);
    }

    if (
      row.workout_exercise_id === null ||
      row.exercise_id === null ||
      row.exercise_name === null ||
      row.primary_muscle === null ||
      row.workout_type === null ||
      row.exercise_position === null
    ) {
      continue;
    }

    const exercise: CustomSplitExercise = {
      id: row.workout_exercise_id,
      exerciseId: row.exercise_id,
      name: row.exercise_name,
      primaryMuscle: row.primary_muscle,
      equipment: row.equipment,
      loadType: row.load_type ?? 'external_weight',
      metric: row.metric ?? 'reps',
      workoutType: row.workout_type,
      isCustom: Boolean(row.is_custom),
      position: row.exercise_position,
    };
    workout.exercises.push(exercise);
  }

  return {
    id: split.id,
    name: split.name,
    createdAt: split.created_at,
    updatedAt: split.updated_at,
    ...(split.is_stack_plan ? { isStackPlan: true } : {}),
    workouts,
  };
};

export const getNextCustomSplitNameAsync = async (): Promise<string> => {
  const db = await initializeWorkoutDatabase();
  const rows = await db.getAllAsync<{ name: string }>('SELECT name FROM custom_splits');
  let highestNumber = 0;
  for (const row of rows) {
    const match = /^Split ([1-9]\d*)$/.exec(row.name);
    if (match) highestNumber = Math.max(highestNumber, Number(match[1]));
  }
  return `Split ${highestNumber + 1}`;
};

export const addWorkoutToSplitSync = (splitId: number, name: string): number => {
  const db = getDatabase();
  let workoutId = 0;
  db.withTransactionSync(() => {
    requireCustomSplitSync(db, splitId);
    const position = db.getFirstSync<{ next_position: number }>(
      `SELECT COALESCE(MAX(position) + 1, 0) AS next_position
       FROM custom_split_workouts
       WHERE split_id = ?`,
      splitId
    )?.next_position ?? 0;
    workoutId = db.runSync(
      `INSERT INTO custom_split_workouts (split_id, name, position)
       VALUES (?, ?, ?)`,
      splitId,
      name.trim(),
      position
    ).lastInsertRowId;
    touchCustomSplitSync(db, splitId);
  });
  return workoutId;
};

export const renameWorkoutSync = (workoutId: number, name: string): void => {
  const db = getDatabase();
  db.withTransactionSync(() => {
    const splitId = customSplitIdForWorkoutSync(db, workoutId);
    db.runSync(
      'UPDATE custom_split_workouts SET name = ? WHERE id = ?',
      name.trim(),
      workoutId
    );
    touchCustomSplitSync(db, splitId);
  });
};

export const deleteWorkoutSync = (workoutId: number): void => {
  const db = getDatabase();
  db.withTransactionSync(() => {
    const splitId = customSplitIdForWorkoutSync(db, workoutId);
    db.runSync(
      'DELETE FROM custom_split_workout_exercises WHERE workout_id = ?',
      workoutId
    );
    db.runSync('DELETE FROM custom_split_workouts WHERE id = ?', workoutId);
    const remaining = db.getAllSync<PositionedIdRow>(
      `SELECT id, position
       FROM custom_split_workouts
       WHERE split_id = ?
       ORDER BY position ASC, id ASC`,
      splitId
    );
    renumberPositionsSync(db, 'custom_split_workouts', remaining);
    touchCustomSplitSync(db, splitId);
  });
};

export const moveWorkoutSync = (workoutId: number, toIndex: number): void => {
  const db = getDatabase();
  db.withTransactionSync(() => {
    const splitId = customSplitIdForWorkoutSync(db, workoutId);
    const workouts = db.getAllSync<PositionedIdRow>(
      `SELECT id, position
       FROM custom_split_workouts
       WHERE split_id = ?
       ORDER BY position ASC, id ASC`,
      splitId
    );
    const fromIndex = workouts.findIndex((workout) => workout.id === workoutId);
    if (toIndex < 0 || toIndex >= workouts.length || fromIndex === toIndex) return;
    movePositionedRowsSync(
      db,
      'custom_split_workouts',
      workouts,
      fromIndex,
      toIndex
    );
    touchCustomSplitSync(db, splitId);
  });
};

export const duplicateWorkoutSync = (workoutId: number): number => {
  const db = getDatabase();
  let duplicateId = 0;
  db.withTransactionSync(() => {
    const source = db.getFirstSync<{
      split_id: number;
      name: string;
      color: string | null;
    }>(
      'SELECT split_id, name, color FROM custom_split_workouts WHERE id = ?',
      workoutId
    );
    if (!source) throw new Error('Custom split workout not found.');

    const position = db.getFirstSync<{ next_position: number }>(
      `SELECT COALESCE(MAX(position) + 1, 0) AS next_position
       FROM custom_split_workouts
       WHERE split_id = ?`,
      source.split_id
    )?.next_position ?? 0;
    duplicateId = db.runSync(
      `INSERT INTO custom_split_workouts (split_id, name, position, color)
       VALUES (?, ?, ?, ?)`,
      source.split_id,
      `${source.name} copy`.trim(),
      position,
      source.color
    ).lastInsertRowId;

    const exercises = db.getAllSync<{ exercise_id: number; position: number }>(
      `SELECT exercise_id, position
       FROM custom_split_workout_exercises
       WHERE workout_id = ?
       ORDER BY position ASC, id ASC`,
      workoutId
    );
    for (const exercise of exercises) {
      db.runSync(
        `INSERT INTO custom_split_workout_exercises
          (workout_id, exercise_id, position)
         VALUES (?, ?, ?)`,
        duplicateId,
        exercise.exercise_id,
        exercise.position
      );
    }
    touchCustomSplitSync(db, source.split_id);
  });
  return duplicateId;
};

export const addExerciseToWorkoutSync = (
  workoutId: number,
  exerciseId: number
): number => {
  const db = getDatabase();
  let workoutExerciseId = 0;
  db.withTransactionSync(() => {
    const splitId = customSplitIdForWorkoutSync(db, workoutId);
    const position = db.getFirstSync<{ next_position: number }>(
      `SELECT COALESCE(MAX(position) + 1, 0) AS next_position
       FROM custom_split_workout_exercises
       WHERE workout_id = ?`,
      workoutId
    )?.next_position ?? 0;
    workoutExerciseId = db.runSync(
      `INSERT INTO custom_split_workout_exercises
        (workout_id, exercise_id, position)
       VALUES (?, ?, ?)`,
      workoutId,
      exerciseId,
      position
    ).lastInsertRowId;
    touchCustomSplitSync(db, splitId);
  });
  return workoutExerciseId;
};

export const removeExerciseFromWorkoutSync = (
  workoutExerciseId: number
): void => {
  const db = getDatabase();
  db.withTransactionSync(() => {
    const relationship = db.getFirstSync<{
      workout_id: number;
      split_id: number;
    }>(
      `SELECT cswe.workout_id, csw.split_id
       FROM custom_split_workout_exercises cswe
       JOIN custom_split_workouts csw ON csw.id = cswe.workout_id
       WHERE cswe.id = ?`,
      workoutExerciseId
    );
    if (!relationship) throw new Error('Custom split workout exercise not found.');

    db.runSync(
      'DELETE FROM custom_split_workout_exercises WHERE id = ?',
      workoutExerciseId
    );
    const remaining = db.getAllSync<PositionedIdRow>(
      `SELECT id, position
       FROM custom_split_workout_exercises
       WHERE workout_id = ?
       ORDER BY position ASC, id ASC`,
      relationship.workout_id
    );
    renumberPositionsSync(
      db,
      'custom_split_workout_exercises',
      remaining
    );
    touchCustomSplitSync(db, relationship.split_id);
  });
};

/**
 * Measurement is chosen once, here. No edit path changes it afterwards, and
 * session snapshots keep any logged history in its original measurement.
 */
export const createCustomExerciseSync = (
  name: string,
  workoutType: WorkoutType,
  primaryMuscle: string,
  equipment: string | null,
  loadType: ExerciseLoadType = 'external_weight',
  metric: ExerciseMetric = 'reps'
): number => {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error('Exercise name cannot be empty.');
  if (loadType !== 'external_weight' && loadType !== 'bodyweight') throw new Error('Invalid load type.');
  if (metric !== 'reps' && metric !== 'duration') throw new Error('Invalid exercise metric.');
  return getDatabase().runSync(
    `INSERT INTO exercises
      (name, workout_type, primary_muscle, secondary_muscle, is_custom, equipment, load_type, metric)
     VALUES (?, ?, ?, NULL, 1, ?, ?, ?)`,
    normalizedName,
    workoutType,
    primaryMuscle,
    equipment,
    loadType,
    metric
  ).lastInsertRowId;
};

export interface CustomSplitDraftWorkoutInput {
  color?: DayColor | null;
  name: string;
  exerciseIds: number[];
  /**
   * Edit mode only: the `custom_split_workouts.id` this draft workout was
   * hydrated from. Reusing it keeps completed sessions that reference the
   * workout pointing at the same row after the graph is rewritten.
   */
  persistedWorkoutId?: number | null;
}

export interface SaveCustomSplitDraftOptions {
  activate?: boolean;
  /** Set when the split is being created as the last step of onboarding. */
  completeOnboarding?: boolean;
  /** Saves the first edit of Stack's plan. It never appears in Your routines. */
  stackPlan?: boolean;
}

/** Save structure only. Source provenance, profile and rotation are never written. */
export const saveAdhocRoutineSync = (sessionId: string, name: string): number => {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error('Routine name cannot be empty.');
  const db = getDatabase();
  let splitId = 0;
  db.withTransactionSync(() => {
    const source = db.getFirstSync("SELECT id FROM sessions WHERE id = ? AND completed = 1 AND origin = 'adhoc'", sessionId);
    if (!source) throw new Error('Only completed ad-hoc workouts can be saved as routines.');
    const exercises = db.getAllSync<{ exercise_id: number }>(`SELECT se.exercise_id FROM session_exercises se
      WHERE se.session_id = ? AND EXISTS (SELECT 1 FROM sets st WHERE st.session_exercise_id = se.id
        AND st.completed = 1 AND st.skipped <> 1) ORDER BY se.position, se.id`, sessionId);
    if (!exercises.length) throw new Error('Log at least one non-skipped set before saving a routine.');
    const timestamp = customSplitTimestamp();
    splitId = db.runSync('INSERT INTO custom_splits (name, created_at, updated_at) VALUES (?, ?, ?)', normalizedName, timestamp, timestamp).lastInsertRowId;
    const workoutId = db.runSync('INSERT INTO custom_split_workouts (split_id, name, position) VALUES (?, ?, 0)', splitId, normalizedName).lastInsertRowId;
    exercises.forEach(({ exercise_id }, position) => {
      db.runSync('INSERT INTO custom_split_workout_exercises (workout_id, exercise_id, position) VALUES (?, ?, ?)', workoutId, exercise_id, position);
    });
  });
  return splitId;
};

/**
 * Persists an entire custom split draft — split, workouts, exercises — plus the
 * profile activation that must accompany it, inside one transaction. The
 * individual CRUD helpers above each open their own transaction, so they cannot
 * guarantee that a mid-save failure leaves no partial split behind.
 */
export const saveCustomSplitDraftSync = (
  name: string,
  workouts: CustomSplitDraftWorkoutInput[],
  options: SaveCustomSplitDraftOptions = {}
): number => {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error('Custom split name cannot be empty.');
  if (workouts.length === 0) {
    throw new Error('A custom split needs at least one workout.');
  }
  if (workouts.every((workout) => workout.exerciseIds.length === 0)) {
    throw new Error('A custom split needs at least one exercise.');
  }

  const db = getDatabase();
  let splitId = 0;
  db.withTransactionSync(() => {
    // Later edits update the one Stack's plan in place.
    if (options.stackPlan && db.getFirstSync('SELECT id FROM custom_splits WHERE is_stack_plan = 1')) {
      throw new Error('Stack’s plan has already been edited.');
    }
    const timestamp = customSplitTimestamp();
    splitId = db.runSync(
      `INSERT INTO custom_splits (name, created_at, updated_at, is_stack_plan)
       VALUES (?, ?, ?, ?)`,
      normalizedName,
      timestamp,
      timestamp,
      options.stackPlan ? 1 : 0
    ).lastInsertRowId;

    workouts.forEach((workout, workoutPosition) => {
      const workoutId = db.runSync(
        `INSERT INTO custom_split_workouts (split_id, name, position, color)
         VALUES (?, ?, ?, ?)`,
        splitId,
        workout.name.trim(),
        workoutPosition,
        isDayColor(workout.color) ? workout.color : null
      ).lastInsertRowId;

      workout.exerciseIds.forEach((exerciseId, exercisePosition) => {
        if (
          !db.getFirstSync<ExerciseIdRow>(
            'SELECT id FROM exercises WHERE id = ?',
            exerciseId
          )
        ) {
          throw new Error(`Exercise ${exerciseId} no longer exists.`);
        }
        db.runSync(
          `INSERT INTO custom_split_workout_exercises
            (workout_id, exercise_id, position)
           VALUES (?, ?, ?)`,
          workoutId,
          exerciseId,
          exercisePosition
        );
      });
    });

    // Activation (and onboarding completion) shares the transaction so a retry
    // after a failed profile write can never leave an orphaned saved split.
    if (options.activate !== false || options.completeOnboarding) {
      const result = db.runSync(
        options.completeOnboarding
          ? "UPDATE profile SET active_split_id = ?, program_mode = 'custom', onboarding_completed = 1 WHERE id = 1"
          : "UPDATE profile SET active_split_id = ?, program_mode = 'custom' WHERE id = 1",
        splitId
      );
      if (result.changes !== 1) throw new Error('A profile is required to select a program.');
    }
  });

  return splitId;
};

/**
 * Rewrites an existing split's workout/exercise graph to match an edited draft,
 * in one transaction. The split row itself is never recreated, and activation
 * is left untouched: editing a split must not change which split is active.
 *
 * Draft workouts that were hydrated from a saved workout keep that persistent
 * id — only their name, position and exercise rows are rewritten — so completed
 * sessions referencing `custom_split_workout_id` (and the rotation derived from
 * them) survive an edit. Duplicated and newly added workouts get fresh ids, and
 * workouts the user removed are deleted outright.
 */
export const updateCustomSplitDraftSync = (
  splitId: number,
  name: string,
  workouts: CustomSplitDraftWorkoutInput[]
): void => {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error('Custom split name cannot be empty.');
  if (workouts.length === 0) {
    throw new Error('A custom split needs at least one workout.');
  }
  if (workouts.every((workout) => workout.exerciseIds.length === 0)) {
    throw new Error('A custom split needs at least one exercise.');
  }

  const db = getDatabase();
  db.withTransactionSync(() => {
    requireCustomSplitSync(db, splitId);
    db.runSync(
      'UPDATE custom_splits SET name = ? WHERE id = ?',
      normalizedName,
      splitId
    );

    const existingIds = new Set(
      db
        .getAllSync<ExerciseIdRow>(
          'SELECT id FROM custom_split_workouts WHERE split_id = ?',
          splitId
        )
        .map((row) => row.id)
    );

    // An origin id only survives if the row is still owned by this split and no
    // earlier draft workout already claimed it — a duplicate carries its
    // source's id and must become a new workout rather than steal the original.
    const claimed = new Set<number>();
    const resolved = workouts.map((workout) => {
      const originId = workout.persistedWorkoutId ?? null;
      const reusable =
        originId !== null && existingIds.has(originId) && !claimed.has(originId);
      if (reusable && originId !== null) claimed.add(originId);
      return { workout, workoutId: reusable ? originId : null };
    });

    for (const existingId of existingIds) {
      if (claimed.has(existingId)) continue;
      db.runSync(
        'DELETE FROM custom_split_workout_exercises WHERE workout_id = ?',
        existingId
      );
      db.runSync('DELETE FROM custom_split_workouts WHERE id = ?', existingId);
    }

    resolved.forEach(({ workout, workoutId }, position) => {
      const workoutName = workout.name.trim();
      const id =
        workoutId ??
        db.runSync(
          `INSERT INTO custom_split_workouts (split_id, name, position, color)
           VALUES (?, ?, ?, ?)`,
          splitId,
          workoutName,
          position,
          isDayColor(workout.color) ? workout.color : null
        ).lastInsertRowId;

      if (workoutId !== null) {
        db.runSync(
          'UPDATE custom_split_workouts SET name = ?, position = ?, color = ? WHERE id = ?',
          workoutName,
          position,
          isDayColor(workout.color) ? workout.color : null,
          workoutId
        );
        db.runSync(
          'DELETE FROM custom_split_workout_exercises WHERE workout_id = ?',
          workoutId
        );
      }

      workout.exerciseIds.forEach((exerciseId, exercisePosition) => {
        if (
          !db.getFirstSync<ExerciseIdRow>(
            'SELECT id FROM exercises WHERE id = ?',
            exerciseId
          )
        ) {
          throw new Error(`Exercise ${exerciseId} no longer exists.`);
        }
        db.runSync(
          `INSERT INTO custom_split_workout_exercises
            (workout_id, exercise_id, position)
           VALUES (?, ?, ?)`,
          id,
          exerciseId,
          exercisePosition
        );
      });
    });

    touchCustomSplitSync(db, splitId);
  });
};

export const setActiveSplitSync = (splitId: number | null): void => {
  const db = getDatabase();
  if (splitId !== null) requireCustomSplitSync(db, splitId);
  const result = db.runSync('UPDATE profile SET active_split_id = ?, program_mode = ? WHERE id = 1', splitId, splitId === null ? 'stack' : 'custom');
  if (result.changes !== 1) throw new Error('A profile is required to select a program.');
};

/** Unlike setActiveSplit(null), this explicitly turns the automatic queue off. */
export const chooseNoProgramSync = (): void => {
  const result = getDatabase().runSync("UPDATE profile SET active_split_id = NULL, program_mode = 'none' WHERE id = 1");
  if (result.changes !== 1) throw new Error('A profile is required to select a program.');
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
  exercise: SessionExercise
): void => {
  const exerciseId = requireExerciseIdSync(db, exercise.name);
  const result = db.runSync(
    `INSERT INTO session_exercises (session_id, exercise_id, position, entry_unit, load_type, metric)
     VALUES (?, ?, ?, ?, ?, ?)`,
    sessionId,
    exerciseId,
    position,
    exercise.entryUnit,
    exercise.loadType ?? 'external_weight',
    getExerciseMetric(exercise)
  );
  const sessionExerciseId = result.lastInsertRowId;
  if (position === 0) {
    db.runSync('UPDATE sessions SET focus_session_exercise_id = ? WHERE id = ? AND completed = 0', sessionExerciseId, sessionId);
  }

  exercise.sets.forEach((set, setIndex) => {
    insertSetSync(db, sessionExerciseId, setIndex, exercise, set);
  });
};

// Timed sets store integer seconds and a neutral reps = 0 (the legacy column
// is NOT NULL); rep sets never carry a duration.
const insertSetSync = (
  db: SQLiteDatabase,
  sessionExerciseId: number,
  setIndex: number,
  exercise: Pick<Exercise, 'metric'>,
  set: ExerciseSet
): void => {
  const duration = exercise.metric === 'duration';
  db.runSync(
    `INSERT INTO sets
      (session_exercise_id, set_index, reps, weight, target_reps,
       target_weight, completed, skipped, bonus_type, value_origin,
       duration_s, target_duration_s)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    sessionExerciseId,
    setIndex,
    duration ? 0 : set.reps,
    set.weight,
    duration ? null : set.targetReps ?? null,
    set.targetWeight ?? null,
    set.completed ? 1 : 0,
    set.skipped ? 1 : 0,
    set.type ?? null,
    set.valueOrigin ?? 'user',
    duration ? set.durationS ?? DEFAULT_DURATION_S : null,
    duration ? set.targetDurationS ?? null : null
  );
};

/**
 * Template an exercise entering a session from a saved Custom Split. Saved
 * splits store order only, so targets come from the curated split template when
 * the exercise has one and otherwise from the shared first-time default;
 * progressive overload is then applied by createSessionExercise as usual.
 */
const customWorkoutTemplateExerciseSync = (
  db: SQLiteDatabase,
  name: string
): Exercise => {
  const row = db.getFirstSync<{
    load_type: ExerciseLoadType;
    metric: ExerciseMetric;
    target_reps: number | null;
    target_weight: number | null;
    target_duration_s: number | null;
  }>(
    `SELECT e.load_type, e.metric, st.target_reps, st.target_weight, st.target_duration_s
     FROM exercises e
     LEFT JOIN split_templates st ON st.exercise_id = e.id
     WHERE e.name = ?
     ORDER BY st.position ASC
     LIMIT 1`,
    name
  );
  if (!row) return makeDefaultExercise(name);
  if (row.target_reps === null || row.target_weight === null) {
    return makeDefaultExercise(name, row.load_type, row.metric);
  }
  return templateExerciseFromRow({
    name,
    load_type: row.load_type,
    metric: row.metric,
    target_reps: row.target_reps,
    target_weight: row.target_weight,
    target_duration_s: row.target_duration_s,
  });
};

/** Empty starts never replace an existing live workout. */
export const startEmptyWorkout = (): WorkoutSession => {
  const db = getDatabase();
  let sessionId = 0;
  db.withTransactionSync(() => {
    if (!readProfileSync()) throw new Error('A profile is required to start a workout');
    const active = db.getFirstSync<{ id: number }>('SELECT id FROM sessions WHERE completed = 0');
    sessionId = active?.id ?? db.runSync(
      "INSERT INTO sessions (date, origin) VALUES (?, 'adhoc')", new Date().toISOString()
    ).lastInsertRowId;
  });
  return sessionsFromRows(db.getAllSync<SessionJoinRow>(sessionJoinSql('WHERE s.id = ?'), sessionId))[0];
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
        (date, origin, archetype, secondary_archetype, archetype_variant,
         secondary_archetype_variant, intensity, completed, retroactive)
       VALUES (?, 'legacy', NULL, NULL, NULL, NULL, NULL, 0, 0)`,
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
    origin: 'legacy',
    id: String(sessionId),
    completedAt: null,
    archetype: null,
    secondaryArchetype: null,
    archetypeVariant: null,
    secondaryArchetypeVariant: null,
    workoutTypes,
    retroactive: false,
    customSplitId: null,
    customSplitWorkoutId: null,
  };
};

export const startWorkoutFromCustomWorkout = (
  splitId: number,
  workoutId: number
): WorkoutSession => {
  const db = getDatabase();
  const workoutRow = db.getFirstSync<{ id: number; split_id: number }>(
    'SELECT id, split_id FROM custom_split_workouts WHERE id = ?',
    workoutId
  );
  if (!workoutRow) {
    throw new Error(`Unknown custom split workout: ${workoutId}`);
  }
  if (workoutRow.split_id !== splitId) {
    throw new Error(
      `Custom split workout ${workoutId} does not belong to split ${splitId}`
    );
  }

  // Saved order is the session order; exercises resolve through their real
  // catalog IDs rather than by name.
  const savedExercises = db.getAllSync<{ name: string; imported_targets: string | null }>(
    `SELECT e.name, ire.data AS imported_targets
     FROM custom_split_workout_exercises cswe
     JOIN exercises e ON e.id = cswe.exercise_id
     LEFT JOIN imported_routine_exercises ire ON ire.workout_exercise_id = cswe.id
     WHERE cswe.workout_id = ?
     ORDER BY cswe.position ASC, cswe.id ASC`,
    workoutId
  );
  if (savedExercises.length === 0) {
    throw new EmptyCustomWorkoutError(workoutId);
  }

  const date = new Date().toISOString();
  const profile = readProfileSync();
  if (!profile) throw new Error('A profile is required to start a workout');
  const exercises = savedExercises.map((row) => {
    let template = customWorkoutTemplateExerciseSync(db, row.name);
    let importedTargets: ImportExercise['sets'] | undefined;
    if (row.imported_targets) {
      const source = JSON.parse(row.imported_targets) as ImportExercise & { template: ImportTemplate };
      const measurement = templateMeasurement(source.template);
      if (!measurement.compatible) throw Error('This workout uses measurements Stack cannot log yet. Edit those exercises in Your routines first.');
      importedTargets = routineWorkingSets(source.sets);
      if (importedTargets.some(set => unsupportedRoutineTarget(source.template, set))) throw Error('This workout has targets Stack cannot log yet. Edit it in Your routines first.');
      template = { name: row.name, loadType: measurement.loadType, metric: measurement.metric,
        sets: importedTargets.map(set => ({
          reps: measurement.metric === 'duration' ? 0 : set.repRange?.start ?? set.reps ?? 8,
          weight: set.weightKg ?? 0,
          ...(measurement.metric === 'duration' ? { durationS: Math.round(set.durationS ?? DEFAULT_DURATION_S) } : {}),
        })) };
      if (template.sets.length === 0) throw Error('This workout has no working-set targets. Edit it in Your routines first.');
    }
    const exercise = createSessionExercise(template, readLastExerciseHistorySync(row.name), profile);
    // Previous performance can prefill the logger without rewriting the routine's explicit prescription.
    importedTargets?.forEach((target, index) => {
      const set = exercise.sets[index];
      if (target.weightKg !== null) set.targetWeight = target.weightKg;
      const reps = target.repRange?.start ?? target.reps;
      if (exercise.metric !== 'duration' && reps !== null) set.targetReps = reps;
      if (exercise.metric === 'duration' && target.durationS !== null) set.targetDurationS = Math.round(target.durationS);
    });
    return exercise;
  });
  const workoutTypes = workoutTypesForExercisesSync(db, exercises);
  let sessionId = 0;

  db.withTransactionSync(() => {
    deleteIncompleteSessionsSync(db);
    sessionId = db.runSync(
      `INSERT INTO sessions
        (date, origin, archetype, secondary_archetype, archetype_variant,
         secondary_archetype_variant, intensity, completed, retroactive,
         custom_split_id, custom_split_workout_id)
       VALUES (?, 'custom', NULL, NULL, NULL, NULL, NULL, 0, 0, ?, ?)`,
      date,
      splitId,
      workoutId
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
    origin: 'custom',
    date,
    completedAt: null,
    archetype: null,
    secondaryArchetype: null,
    archetypeVariant: null,
    secondaryArchetypeVariant: null,
    workoutTypes,
    exercises,
    completed: false,
    retroactive: false,
    customSplitId: splitId,
    customSplitWorkoutId: workoutId,
  };
};

export const startWorkoutFromArchetype = (
  archetypes: Archetype[],
  variants?: string[]
): WorkoutSession => {
  if (archetypes.length < 1 || archetypes.length > 2) {
    throw new Error('An archetype workout must have one or two archetypes');
  }

  const db = getDatabase();
  const date = new Date().toISOString();
  const profile = readProfileSync();
  if (!profile) throw new Error('A profile is required to start a workout');
  if (variants && (variants.length !== archetypes.length || variants.some((variant, index) =>
    !readArchetypeVariantsSync(archetypes[index]).includes(variant)))) throw Error('Could not load the selected workout variant.');
  const selections = variants ? archetypes.map((archetype, index) => ({ archetype, variant: variants[index] })) : selectNextArchetypeVariantsSync(archetypes);
  const exercises = combineArchetypeTemplatesSync(selections).map(
    (templateExercise) =>
      createSessionExercise(
        templateExercise,
        readLastExerciseHistorySync(templateExercise.name),
        profile
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
        (date, origin, archetype, secondary_archetype, archetype_variant,
         secondary_archetype_variant, intensity, completed, retroactive)
       VALUES (?, 'archetype', ?, ?, ?, ?, NULL, 0, 0)`,
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
    origin: 'archetype',
    date,
    completedAt: null,
    archetype: primaryArchetype,
    secondaryArchetype,
    archetypeVariant: primaryVariant,
    secondaryArchetypeVariant: secondaryVariant,
    workoutTypes,
    exercises,
    completed: false,
    retroactive: false,
    customSplitId: null,
    customSplitWorkoutId: null,
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
  let exercises: SessionExercise[] = [];
  let workoutTypes: WorkoutType[] = [];
  let selections: SelectedArchetypeVariant[] = [];

  db.withTransactionSync(() => {
    selections = selectNextArchetypeVariantsSync(archetypes);
    exercises = combineArchetypeTemplatesSync(selections).map((templateExercise) =>
      createCompletedSessionExercise(
        templateExercise,
        readLastExerciseHistorySync(templateExercise.name),
        readProfileSync()?.weightUnit ?? DEFAULT_WEIGHT_UNIT
      )
    );
    workoutTypes = workoutTypesForExercisesSync(db, exercises);
    sessionId = db.runSync(
      `INSERT INTO sessions
        (date, origin, archetype, secondary_archetype, archetype_variant,
         secondary_archetype_variant, intensity, completed, retroactive)
       VALUES (?, 'archetype', ?, ?, ?, ?, NULL, 1, 1)`,
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
    origin: 'archetype',
    date,
    completedAt: null,
    archetype: primaryArchetype,
    secondaryArchetype,
    archetypeVariant: selections[0].variant,
    secondaryArchetypeVariant: selections[1]?.variant ?? null,
    workoutTypes,
    exercises,
    completed: true,
    retroactive: true,
    customSplitId: null,
    customSplitWorkoutId: null,
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
  updates: Pick<ExerciseSet, 'reps' | 'weight' | 'completed' | 'skipped' | 'valueOrigin' | 'durationS'>
): void => {
  const db = getDatabase();
  const id = currentSetIdSync(db, exerciseIndex, setIndex);
  if (id === null) throw new Error('The current set no longer exists');
  // The session snapshot decides which column is meaningful for this row.
  db.runSync(
    `UPDATE sets
     SET reps = CASE WHEN (SELECT metric FROM session_exercises WHERE id = sets.session_exercise_id) = 'duration' THEN 0 ELSE ? END,
         weight = ?, completed = ?, skipped = ?, value_origin = ?,
         duration_s = CASE WHEN (SELECT metric FROM session_exercises WHERE id = sets.session_exercise_id) = 'duration' THEN ? ELSE NULL END
     WHERE id = ?`,
    updates.reps,
    updates.weight,
    updates.completed ? 1 : 0,
    updates.skipped ? 1 : 0,
    updates.valueOrigin ?? 'user',
    updates.durationS ?? null,
    id
  );
};

// Existing SQLite identities validate edits from every surface.
export const readCurrentSetTarget = (exerciseIndex: number, setIndex: number) => {
  const row = getDatabase().getFirstSync<{
    workoutId: number; workoutStartedAt: string; exerciseId: number; setId: number; exerciseName: string;
  }>(
    `SELECT s.id AS workoutId, s.date AS workoutStartedAt, se.id AS exerciseId, st.id AS setId, e.name AS exerciseName
     FROM sets st JOIN session_exercises se ON se.id = st.session_exercise_id
     JOIN sessions s ON s.id = se.session_id JOIN exercises e ON e.id = se.exercise_id
     WHERE s.completed = 0 AND se.position = ? AND st.set_index = ? LIMIT 1`,
    exerciseIndex, setIndex
  );
  return row ? {
    workoutId: String(row.workoutId), workoutStartedAt: row.workoutStartedAt, exerciseId: String(row.exerciseId),
    setId: String(row.setId), exerciseName: row.exerciseName, exerciseIndex, setIndex,
  } : null;
};

/** Focus refers to a session exercise row, independent of catalog identity/order. */
export const readCurrentWorkoutFocusSync = (): WorkoutFocus | null => {
  const row = getDatabase().getFirstSync<{ workout_id: number; exercise_id: number; exercise_index: number }>(
    `SELECT s.id AS workout_id, se.id AS exercise_id, se.position AS exercise_index
     FROM sessions s JOIN session_exercises se ON se.id = s.focus_session_exercise_id AND se.session_id = s.id
     WHERE s.completed = 0 LIMIT 1`
  );
  return row ? { workoutId: String(row.workout_id), exerciseId: String(row.exercise_id), exerciseIndex: row.exercise_index } : null;
};

export const writeCurrentWorkoutFocus = (workoutId: string, exerciseIndex: number): WorkoutFocus => {
  const db = getDatabase();
  const row = db.getFirstSync<{ id: number }>(
    `SELECT se.id FROM session_exercises se JOIN sessions s ON s.id = se.session_id
     WHERE s.completed = 0 AND s.id = ? AND se.position = ?`, Number(workoutId), exerciseIndex
  );
  if (!row) throw new Error('The current exercise no longer exists');
  db.runSync('UPDATE sessions SET focus_session_exercise_id = ? WHERE id = ? AND completed = 0', row.id, Number(workoutId));
  return { workoutId, exerciseId: String(row.id), exerciseIndex };
};

export const writeExerciseEntryUnit = (target: WorkoutSetTarget, unit: WeightUnit): void => {
  const actual = readCurrentSetTarget(target.exerciseIndex, target.setIndex);
  if (!actual || !sameSetTarget(actual, target)) throw new Error('The exercise no longer exists');
  if (unit !== 'kg' && unit !== 'lbs') throw new Error('Invalid exercise entry unit');
  const result = getDatabase().runSync(
    `UPDATE session_exercises SET entry_unit = ? WHERE id = ? AND session_id = ?`,
    unit, Number(target.exerciseId), Number(target.workoutId)
  );
  if (result.changes !== 1) throw new Error('The exercise unit could not be saved');
};

// Completion and Increase Between Sets must either both commit or both roll back.
export const updateCurrentSets = (
  exerciseIndex: number,
  updates: { setIndex: number; set: ExerciseSet }[],
  nextFocus?: { workoutId: string; exerciseIndex: number }
) => {
  let focus: WorkoutFocus | undefined;
  getDatabase().withTransactionSync(() => {
    for (const update of updates) {
      updateCurrentSet(exerciseIndex, update.setIndex, update.set);
      const id = currentSetIdSync(getDatabase(), exerciseIndex, update.setIndex);
      getDatabase().runSync(
        'UPDATE sets SET target_reps = ?, target_weight = ?, target_duration_s = ? WHERE id = ?',
        update.set.targetReps ?? null, update.set.targetWeight ?? null, update.set.targetDurationS ?? null, id
      );
    }
    if (nextFocus) focus = writeCurrentWorkoutFocus(nextFocus.workoutId, nextFocus.exerciseIndex);
  });
  return focus;
};

export const appendCurrentBonusSet = (
  exerciseIndex: number,
  type: BonusSetType,
  reps: number,
  weight: number,
  durationS?: number
): void => {
  const db = getDatabase();
  const sessionExercise = db.getFirstSync<ExerciseIdRow & { metric: ExerciseMetric }>(
    `SELECT se.id, se.metric
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

  insertSetSync(db, sessionExercise.id, nextIndex, sessionExercise, {
    reps, weight, durationS, type, completed: true, skipped: false, valueOrigin: 'user',
  });
};

export const replaceCurrentSessionExercise = (
  exerciseIndex: number,
  exercise: SessionExercise
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
      'UPDATE session_exercises SET exercise_id = ?, entry_unit = ?, load_type = ?, metric = ? WHERE id = ?',
      exerciseId,
      exercise.entryUnit,
      exercise.loadType ?? 'external_weight',
      getExerciseMetric(exercise),
      sessionExercise.id
    );
    exercise.sets.forEach((set, setIndex) => {
      insertSetSync(db, sessionExercise.id, setIndex, exercise, set);
    });
  });
};

/**
 * Appends a new exercise entry to the live session, distinct from
 * `replaceCurrentSessionExercise` which overwrites an existing position. Used
 * by the active-workout "Add Exercise" flow to add an exercise alongside the
 * ones already scheduled, rather than substituting one of them.
 */
export const appendCurrentSessionExercise = (
  exercise: SessionExercise, expectedSessionId?: string, focusAdded = false
): void => {
  const db = getDatabase();
  db.withTransactionSync(() => {
    const session = db.getFirstSync<{ id: number }>(
      'SELECT id FROM sessions WHERE completed = 0'
    );
    if (!session || (expectedSessionId && String(session.id) !== expectedSessionId)) {
      throw new Error('This workout is no longer active.');
    }
    if (db.getFirstSync(`SELECT se.id FROM session_exercises se JOIN exercises e ON e.id = se.exercise_id
      WHERE se.session_id = ? AND e.name = ?`, session.id, exercise.name)) {
      throw new Error('This exercise is already in your workout.');
    }

    const nextPosition = db.getFirstSync<{ next_position: number }>(
      `SELECT COALESCE(MAX(position) + 1, 0) AS next_position
       FROM session_exercises WHERE session_id = ?`,
      session.id
    )?.next_position ?? 0;
    insertSessionExerciseSync(db, session.id, nextPosition, exercise);
    if (focusAdded) db.runSync(`UPDATE sessions SET focus_session_exercise_id =
      (SELECT id FROM session_exercises WHERE session_id = ? AND position = ?)
      WHERE id = ?`, session.id, nextPosition, session.id);

    const workoutType = db.getFirstSync<{ workout_type: WorkoutType }>(
      'SELECT workout_type FROM exercises WHERE name = ?',
      exercise.name
    )?.workout_type;
    const alreadyTracked = workoutType
      ? db.getFirstSync<{ workout_type: WorkoutType }>(
          'SELECT workout_type FROM session_workout_types WHERE session_id = ? AND workout_type = ?',
          session.id,
          workoutType
        )
      : null;
    if (workoutType && !alreadyTracked) {
      const nextTypePosition = db.getFirstSync<{ next_position: number }>(
        `SELECT COALESCE(MAX(position) + 1, 0) AS next_position
         FROM session_workout_types WHERE session_id = ?`,
        session.id
      )?.next_position ?? 0;
      db.runSync(
        `INSERT INTO session_workout_types (session_id, workout_type, position)
         VALUES (?, ?, ?)`,
        session.id,
        workoutType,
        nextTypePosition
      );
    }
  });
};

export const completeCurrentSession = (intensity: IntensityLevel): string => {
  const completedAt = new Date().toISOString();
  const result = getDatabase().runSync(
    `UPDATE sessions SET intensity = ?, completed = 1, completed_at = ? WHERE completed = 0
     AND EXISTS (SELECT 1 FROM session_exercises se JOIN sets st ON st.session_exercise_id = se.id
       WHERE se.session_id = sessions.id AND st.completed = 1 AND st.skipped <> 1)`,
    intensity,
    completedAt
  );
  if (result.changes !== 1) throw new Error('Log at least one non-skipped set before finishing your workout.');
  return completedAt;
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
      `SELECT id, name, workout_type, primary_muscle, is_custom, equipment, load_type, metric
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
      equipment: row.equipment,
      loadType: row.load_type,
      metric: row.metric,
    }));

/** Read-only catalog used by the Custom Split draft builder. */
export const readExerciseCatalogSync = (): ExerciseCatalogItem[] =>
  getDatabase()
    .getAllSync<ExerciseCatalogRow>(
      `SELECT id, name, workout_type, primary_muscle, is_custom, equipment, load_type, metric
       FROM exercises
       ORDER BY id`
    )
    .map((row) => ({
      id: row.id,
      name: row.name,
      workoutType: row.workout_type,
      primaryMuscle: row.primary_muscle,
      isCustom: Boolean(row.is_custom),
      equipment: row.equipment,
      loadType: row.load_type,
      metric: row.metric,
    }));

export const readExerciseWorkoutTypeSync = (name: string): WorkoutType | undefined =>
  getDatabase().getFirstSync<{ workout_type: WorkoutType }>(
    'SELECT workout_type FROM exercises WHERE name = ?',
    name
  )?.workout_type;

export const readExerciseLoadTypeSync = (
  name: string
): ExerciseLoadType =>
  getDatabase().getFirstSync<{ load_type: ExerciseLoadType }>(
    'SELECT load_type FROM exercises WHERE name = ?',
    name
  )?.load_type ?? 'external_weight';

/** Catalog measurement for an exercise entering a NEW session. */
export const readExerciseMeasurementSync = (
  name: string
): Pick<Exercise, 'loadType' | 'metric'> => {
  const row = getDatabase().getFirstSync<{ load_type: ExerciseLoadType; metric: ExerciseMetric }>(
    'SELECT load_type, metric FROM exercises WHERE name = ?',
    name
  );
  return { loadType: row?.load_type ?? 'external_weight', metric: row?.metric ?? 'reps' };
};

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
      (name, workout_type, primary_muscle, secondary_muscle, is_custom, load_type)
     VALUES (?, ?, ?, NULL, 1, 'external_weight')`,
    name,
    type,
    primaryMuscle
  ).lastInsertRowId;
};

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
    const timed = db.getFirstSync<{ metric: ExerciseMetric }>(
      'SELECT metric FROM exercises WHERE id = ?', exerciseId
    )?.metric === 'duration';
    db.runSync(
      `INSERT INTO split_templates
        (workout_type, exercise_id, position, target_reps, target_weight, target_duration_s)
       VALUES (?, ?, ?, ?, 0, ?)`,
      type,
      exerciseId,
      position,
      timed ? 0 : 8,
      timed ? DEFAULT_DURATION_S : null
    );
  });
};

const renumberPositionsSync = (
  db: SQLiteDatabase,
  table:
    | 'split_templates'
    | 'session_exercises'
    | 'custom_split_workouts'
    | 'custom_split_workout_exercises',
  rows: PositionedIdRow[]
): void => {
  rows.forEach((row, position) => {
    db.runSync(`UPDATE ${table} SET position = ? WHERE id = ?`, position, row.id);
  });
};

const movePositionedRowsSync = (
  db: SQLiteDatabase,
  table: 'split_templates' | 'session_exercises' | 'custom_split_workouts',
  rows: PositionedIdRow[],
  fromIndex: number,
  toIndex: number
): void => {
  const reordered = [...rows];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  renumberPositionsSync(db, table, reordered);
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
     WHERE s.completed = 1
       AND s.retroactive = 0
       AND swt.workout_type = ?
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
       AND s.retroactive = 0
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
  const rows = getDatabase().getAllSync<{ session_id: number }>(
    `SELECT DISTINCT se.session_id
     FROM session_exercises se
     JOIN sessions s ON s.id = se.session_id
     WHERE s.completed = 1
       AND s.retroactive = 0
       AND se.exercise_id = (SELECT id FROM exercises WHERE name = ?)
     ORDER BY s.date DESC, s.id ASC`,
    name
  );
  for (const row of rows) {
    const session = readSessionByIdSync(row.session_id);
    const exercise = session?.exercises.find(item => item.name === name);
    if (!session?.imported || exercise?.sets.some(set => set.completed && !set.skipped && set.sourceKind !== 'warmup' && !set.type)) return exercise;
  }
  return undefined;
};

export const resetWorkoutDatabase = (): WorkoutDatabaseSnapshot => {
  const db = getDatabase();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM exercise_notes');
    db.runSync('DELETE FROM sets');
    db.runSync('DELETE FROM session_exercises');
    db.runSync('DELETE FROM session_workout_types');
    db.runSync('DELETE FROM sessions');
    db.runSync("UPDATE profile SET active_split_id = NULL, program_mode = 'none'");
    db.runSync('DELETE FROM shared_split_import_receipts');
    db.runSync('DELETE FROM custom_split_workout_exercises');
    db.runSync('DELETE FROM custom_split_workouts');
    db.runSync('DELETE FROM custom_splits');
    db.runSync('DELETE FROM split_templates');
    db.runSync('DELETE FROM archetype_templates');
    db.runSync('DELETE FROM exercises');
    db.runSync('DELETE FROM profile');
    db.runSync(
      `DELETE FROM sqlite_sequence
       WHERE name IN (
         'exercises',
         'split_templates',
         'archetype_templates',
         'sessions',
         'session_exercises',
         'sets',
         'exercise_notes',
         'custom_splits',
         'custom_split_workouts',
         'custom_split_workout_exercises'
       )`
    );
    insertSeedDataSync(db);
    verifySeedDataSync(db);
  });

  return {
    profile: null,
    sessions: [],
    currentSession: null,
    workoutFocus: null,
    splitTemplates: readSplitTemplatesSync(),
    customSplits: [],
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

/** Catalog identity keeps notes available across workout occurrences and renames. */
export const readExerciseNotesSync = (exerciseId: number): ExerciseNote[] =>
  getDatabase().getAllSync<ExerciseNoteRow>(
    'SELECT * FROM exercise_notes WHERE exercise_id = ? ORDER BY created_at DESC, id DESC',
    exerciseId
  ).map(noteFromRow);

export const addExerciseNoteSync = (workoutId: string, exerciseId: number, value: string): void => {
  const text = normalizeExerciseNote(value);
  const db = getDatabase();
  const target = db.getFirstSync<{ id: number }>(
    `SELECT se.id FROM session_exercises se JOIN sessions s ON s.id = se.session_id
     WHERE s.id = ? AND s.completed = 0 AND se.exercise_id = ?`, Number(workoutId), exerciseId
  );
  if (!target) throw new Error('This exercise is no longer in the active workout.');
  db.runSync('INSERT INTO exercise_notes (exercise_id, session_id, text, created_at) VALUES (?, ?, ?, ?)',
    exerciseId, Number(workoutId), text, new Date().toISOString());
};

export const deleteExerciseNoteSync = (exerciseId: number, noteId: number): void => {
  getDatabase().runSync('DELETE FROM exercise_notes WHERE id = ? AND exercise_id = ?', noteId, exerciseId);
};
