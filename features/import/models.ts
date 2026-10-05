import type { ExerciseLoadType, ExerciseMetric, WorkoutType } from '@/store/workoutStore';
import type { WeightUnit } from '@/store/weightUnits';

/** Stack-owned boundary. No credentials or provider response objects cross it. */
export type ImportSet = {
  index: number;
  kind: string;
  weightKg: number | null;
  reps: number | null;
  durationS: number | null;
  distanceM: number | null;
  rpe: number | null;
  customMetric: number | null;
  repRange?: { start: number | null; end: number | null } | null;
};
export type ImportExercise = {
  index: number;
  templateId: string;
  name: string;
  notes: string;
  supersetId: number | null;
  restS?: number | null;
  sets: ImportSet[];
};
export type ImportTemplate = {
  id: string; name: string; type: string; primaryMuscle: string;
  secondaryMuscles: string[]; equipment: string; isCustom: boolean;
};
export type ImportRoutine = {
  id: string; name: string; folderId: number | null;
  createdAt: string; updatedAt: string; exercises: ImportExercise[];
};
export type ImportWorkout = {
  id: string; name: string; routineId: string | null; notes: string;
  startedAt: string; endedAt: string; createdAt: string; updatedAt: string;
  exercises: ImportExercise[];
};
export type ImportFolder = { id: number; index: number; name: string; createdAt: string; updatedAt: string };
export type ImportSnapshot = {
  source: 'hevy'; accountId: string; weightUnit: WeightUnit;
  routines: ImportRoutine[]; workouts: ImportWorkout[]; templates: ImportTemplate[]; folders: ImportFolder[];
  incompleteWorkouts: number;
};
export type ExerciseResolution = {
  template: ImportTemplate; localId: number | null; name: string;
  workoutType: WorkoutType; primaryMuscle: string; loadType: ExerciseLoadType; metric: ExerciseMetric;
  compatible: boolean; method: 'source-id' | 'known-id' | 'alias' | 'exact' | 'metadata' | 'custom';
};
export type ImportPlan = {
  snapshot: ImportSnapshot; resolutions: ExerciseResolution[];
  newRoutines: number; newWorkouts: number; existingRoutines: number; existingWorkouts: number;
  customExercises: number; warnings: string[];
};
export type ImportResult = { routines: number; workouts: number; exercises: number; alreadyImported: number };

export const routineWorkingSets = (sets: ImportSet[]) => sets.filter(set => set.kind === 'normal' || set.kind === 'failure');
export function unsupportedRoutineTarget(template: ImportTemplate, set: ImportSet): boolean {
  if (set.weightKg !== null && set.weightKg < 0) return true;
  if (['bodyweight_reps', 'reps_only', 'duration'].includes(template.type) && set.weightKg !== null && set.weightKg !== 0) return true;
  if (template.type.includes('duration')) return set.durationS !== null && (!Number.isInteger(set.durationS) || set.durationS <= 0);
  const reps = set.repRange?.start ?? set.reps;
  return reps !== null && reps <= 0;
}
export function missingRoutineTarget(template: ImportTemplate, set: ImportSet): boolean {
  return template.type.includes('duration') ? set.durationS === null || template.type === 'weight_duration' && set.weightKg === null
    : (set.repRange?.start ?? set.reps) === null || template.type === 'weight_reps' && set.weightKg === null;
}

/** A valid performed measurement; missing/unsupported facts remain archived, never guessed. */
export function usableImportedSet(template: ImportTemplate, set: ImportSet): boolean {
  if (!['normal', 'warmup', 'dropset', 'failure'].includes(set.kind)) return false;
  switch (template.type) {
    case 'weight_reps': return set.reps !== null && set.reps > 0 && set.weightKg !== null && set.weightKg >= 0;
    case 'reps_only': return set.reps !== null && set.reps > 0 && (set.weightKg === null || set.weightKg === 0);
    case 'bodyweight_reps': return set.reps !== null && set.reps > 0 && (set.weightKg === null || set.weightKg === 0);
    case 'duration': return set.durationS !== null && Number.isInteger(set.durationS) && set.durationS > 0 && (set.weightKg === null || set.weightKg === 0);
    case 'weight_duration': return set.durationS !== null && Number.isInteger(set.durationS) && set.durationS > 0 && set.weightKg !== null && set.weightKg >= 0;
    default: return false;
  }
}
