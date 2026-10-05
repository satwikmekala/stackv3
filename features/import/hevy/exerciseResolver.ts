import { displayExerciseName } from '@/constants/exerciseNames';
import type { ExerciseCatalogItem } from '@/store/workoutDatabase';
import type { ExerciseResolution, ImportTemplate } from '../models';

const normalized = (name: string) => name.normalize('NFKC').trim().toLowerCase().replace(/[\s_-]+/g, ' ');
// The stable ID and its documented title must both agree. Never trust an ID alone if the catalog changes.
const KNOWN_IDS: Record<string, { title: string; stackName: string }> = {
  '05293BCA': { title: 'Bench Press (Barbell)', stackName: 'Bench Press' },
};
const HEVY_ALIASES: Record<string, string> = {
  'Bench Press (Barbell)': 'Bench Press', 'Bench Press (Dumbbell)': 'Dumbbell Bench Press',
  'Incline Bench Press (Barbell)': 'Incline Bench Press', 'Incline Bench Press (Dumbbell)': 'Incline Dumbbell Press',
  'Squat (Barbell)': 'Back Squat', 'Deadlift (Barbell)': 'Deadlift',
  'Romanian Deadlift (Barbell)': 'Romanian Deadlift', 'Bicep Curl (Barbell)': 'Barbell Curl',
  'Bicep Curl (Dumbbell)': 'Dumbbell Curl', 'Overhead Press (Barbell)': 'Overhead Press',
};
export function templateMeasurement(template: ImportTemplate) {
  const supported = ['weight_reps', 'reps_only', 'bodyweight_reps', 'duration', 'weight_duration'].includes(template.type);
  return { compatible: supported,
    loadType: (['reps_only', 'bodyweight_reps', 'duration'].includes(template.type) ? 'bodyweight' : 'external_weight') as ExerciseResolution['loadType'],
    metric: (template.type.includes('duration') ? 'duration' : 'reps') as ExerciseResolution['metric'] };
}
export function resolveHevyExercise(template: ImportTemplate, catalog: readonly ExerciseCatalogItem[], sourceId?: number): ExerciseResolution {
  const measurement = templateMeasurement(template);
  const muscle = template.primaryMuscle;
  const workoutType: ExerciseResolution['workoutType'] = ['quadriceps', 'hamstrings', 'calves', 'glutes', 'abductors', 'adductors'].includes(muscle)
    ? 'legs' : ['lats', 'upper_back', 'traps', 'lower_back'].includes(muscle) ? 'back'
      : ['biceps', 'triceps', 'forearms'].includes(muscle) ? 'arms' : muscle === 'chest' ? 'chest'
        : muscle === 'shoulders' ? 'shoulders' : 'core';
  const primaryMuscle = muscle.split('_').map(word => word[0]?.toUpperCase() + word.slice(1)).join(' ');
  const result = (item: ExerciseCatalogItem | undefined, method: ExerciseResolution['method']): ExerciseResolution => ({
    template, localId: item?.id ?? null, name: item?.name ?? template.name,
    workoutType: item?.workoutType ?? workoutType, primaryMuscle: item?.primaryMuscle ?? primaryMuscle,
    ...measurement, method,
  });
  const compatible = (item: ExerciseCatalogItem) => item.loadType === measurement.loadType && item.metric === measurement.metric;
  const previous = catalog.find(item => item.id === sourceId);
  if (previous && compatible(previous)) return result(previous, 'source-id');
  // Authored source exercises have an independent identity even if their names match a built-in.
  if (template.isCustom || !measurement.compatible) return result(undefined, 'custom');
  const qualifier = template.name.match(/\((Barbell|Dumbbell|Kettlebell|Machine)\)$/i)?.[1];
  if (qualifier && normalized(qualifier) !== normalized(template.equipment)) return result(undefined, 'custom');
  const candidates = catalog.filter(item => !item.isCustom && compatible(item));
  const known = KNOWN_IDS[template.id];
  const knownItem = known?.title === template.name ? candidates.find(item => item.name === known.stackName) : undefined;
  if (knownItem) return result(knownItem, 'known-id');
  const alias = HEVY_ALIASES[template.name];
  const aliased = alias ? candidates.find(item => item.name === alias) : undefined;
  if (aliased) return result(aliased, 'alias');
  const display = normalized(displayExerciseName(template.name));
  const displayMatches = candidates.filter(item => normalized(displayExerciseName(item.name)) === display);
  const canonical = displayMatches.find(item => normalized(item.name) === display);
  if (canonical || displayMatches.length === 1) return result(canonical ?? displayMatches[0], 'alias');
  const exact = candidates.filter(item => normalized(item.name) === normalized(template.name));
  if (exact.length === 1) return result(exact[0], 'exact');
  // Only an exact equipment-qualified spelling; no fuzzy muscle/name similarity.
  const base = template.name.match(/^(.+) \(([^)]+)\)$/);
  if (base && normalized(base[2]) === normalized(template.equipment)) {
    const expected = normalized(`${template.equipment} ${base[1]}`);
    const matches = candidates.filter(item => normalized(item.name) === expected);
    if (matches.length === 1) return result(matches[0], 'metadata');
  }
  return result(undefined, 'custom');
}
