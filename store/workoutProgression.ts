import {
  DEFAULT_DURATION_S,
  getExerciseMetric,
  type ExerciseMetric,
} from '@/store/exerciseMeasurement';
import type {
  Exercise,
  ExerciseLoadType,
  ExerciseSet,
  SessionExercise,
  UserProfile,
  WorkoutSession,
} from '@/store/workoutStore';
import { getVerifiedSessions } from '@/store/verifiedSessions';
import {
  kgToLbs,
  lbsToKg,
  type WeightUnit,
} from '@/store/weightUnits';

/**
 * Canonical shape for an exercise entering a session with no template targets
 * and no usable history. Shared by the split editor and by custom-split
 * sessions so a first-time exercise always starts the same way.
 */
export const makeDefaultExercise = (
  name: string,
  loadType: ExerciseLoadType = 'external_weight',
  metric: ExerciseMetric = 'reps'
): Exercise => ({
  name,
  loadType,
  metric,
  sets: Array.from({ length: 3 }, () => metric === 'duration'
    ? { reps: 0, weight: 0, durationS: DEFAULT_DURATION_S }
    : { reps: 8, weight: 0 }),
});

/**
 * History recorded under another metric (e.g. reps logged before an exercise
 * became timed) is not "last time" for this exercise and is never reused.
 */
const compatibleHistory = (
  lastExercise: Exercise | undefined,
  metric: ExerciseMetric
): Exercise | undefined =>
  lastExercise && getExerciseMetric(lastExercise) === metric ? lastExercise : undefined;

/** Regular working sets only; bonus/special rows never seed working-set defaults. */
export const getRegularSets = (exercise: Exercise | undefined): ExerciseSet[] =>
  exercise?.sets.filter((set) => !set.type && set.sourceKind !== 'warmup' &&
    (set.sourceKind === undefined || set.completed && !set.skipped)) ?? [];

// A set counts as performed only when it was logged, not skipped.
const wasPerformed = (set: ExerciseSet) => Boolean(set.completed) && !set.skipped;

/**
 * Next-session starting point for one regular set: what was actually lifted.
 * Unperformed rows (skipped, or never logged) fall back to their intended
 * target, so a skip neither progresses nor erases the planned load.
 */
const baselineFromPreviousSet = (
  previousSet: ExerciseSet,
  loadType: ExerciseLoadType
): { reps: number; weight: number; durationS?: number } => ({
  reps: previousSet.targetReps ?? previousSet.reps,
  weight: loadType === 'bodyweight'
    ? 0
    : wasPerformed(previousSet)
      ? previousSet.weight
      : previousSet.targetWeight ?? previousSet.weight,
  // Timed sets start from the duration actually held, exactly as performed.
  durationS: wasPerformed(previousSet)
    ? previousSet.durationS ?? previousSet.targetDurationS
    : previousSet.targetDurationS ?? previousSet.durationS,
});

/** One measurement-correct regular set; timed sets carry no performed reps. */
const sessionSet = (
  metric: ExerciseMetric,
  values: { reps: number; weight: number; durationS?: number },
  extra: Pick<ExerciseSet, 'valueOrigin' | 'completed' | 'skipped'>
): ExerciseSet => metric === 'duration'
  ? {
      reps: 0,
      weight: values.weight,
      durationS: values.durationS ?? DEFAULT_DURATION_S,
      targetWeight: values.weight,
      targetDurationS: values.durationS ?? DEFAULT_DURATION_S,
      ...extra,
    }
  : {
      reps: values.reps,
      weight: values.weight,
      targetReps: values.reps,
      targetWeight: values.weight,
      ...extra,
    };

/**
 * Preloads the last actual regular-set values by position. Progression is
 * never baked in here: see getProgressionSuggestion for the optional nudge.
 */
export const createSessionExercise = (
  templateExercise: Exercise,
  lastExercise: Exercise | undefined,
  profile: Pick<UserProfile, 'weightUnit'>
): SessionExercise => {
  const metric = getExerciseMetric(templateExercise);
  const previousSets = getRegularSets(compatibleHistory(lastExercise, metric));
  const lastPrevious = previousSets[previousSets.length - 1];
  const bodyweight = templateExercise.loadType === 'bodyweight';

  return {
    name: templateExercise.name,
    entryUnit: profile.weightUnit,
    loadType: templateExercise.loadType,
    metric,
    sets: getRegularSets(templateExercise).map((templateSet, setIndex): ExerciseSet => {
      const previousSet = previousSets[setIndex];
      // History for this exact position; otherwise copy the last previous
      // regular set as a derived (propagatable) value; otherwise the template.
      const source = previousSet ?? lastPrevious;
      const values = source
        ? baselineFromPreviousSet(source, templateExercise.loadType)
        : { reps: templateSet.reps, weight: bodyweight ? 0 : templateSet.weight, durationS: templateSet.durationS };
      return sessionSet(metric, values, {
        valueOrigin: previousSet ? 'history' : source ? 'propagated' : 'template',
        completed: false,
        skipped: false,
      });
    }),
  };
};

export type ProgressionSuggestion = {
  /** Canonical kg of the previous performance this suggestion builds on. */
  baselineKg: number;
  /** Canonical kg of the suggested next weight. Never written automatically. */
  suggestedKg: number;
  unit: WeightUnit;
  /** Configured step in `unit`. */
  increment: number;
};

// Clears binary drift (e.g. 179.99997 lb) without snapping onto a coarser grid.
const roundUnitValue = (value: number) => Math.round(value * 1e6) / 1e6;

/**
 * Optional upward nudge derived from one previous regular set. Only a set
 * that was logged (not skipped) and met its target reps qualifies; a miss
 * repeats the weight and never suggests a reduction. Steps in the logging
 * unit of the current exercise, never the global display unit.
 */
export const getProgressionSuggestion = (
  previousSet: ExerciseSet | undefined,
  loadType: ExerciseLoadType,
  _profile: Pick<UserProfile, 'weightUnit' | 'weightIncrement' | 'weightIncrementLbs'>,
  unit: WeightUnit
): ProgressionSuggestion | null => {
  if (!previousSet || previousSet.type || loadType === 'bodyweight' || !wasPerformed(previousSet)) return null;
  const targetReps = previousSet.targetReps ?? previousSet.reps;
  if (!Number.isFinite(previousSet.weight) || previousSet.reps < targetReps) return null;
  // A manual button preference must not change the optional training suggestion.
  const increment = unit === 'lbs' ? 5 : 0.5;
  if (!Number.isFinite(increment) || increment <= 0) return null;
  const toUnit = (kg: number) => (unit === 'lbs' ? kgToLbs(kg) : kg);
  const suggested = roundUnitValue(roundUnitValue(toUnit(previousSet.weight)) + increment);
  return {
    baselineKg: previousSet.weight,
    suggestedKg: unit === 'lbs' ? lbsToKg(suggested) : suggested,
    unit,
    increment,
  };
};

/**
 * Latest non-retroactive completed performance of one exercise, across every
 * routine and split. Mirrors readLastExerciseHistorySync's ordering.
 */
export const findLastExercisePerformance = (
  sessions: readonly WorkoutSession[],
  name: string
): Exercise | undefined => {
  let latest: WorkoutSession | undefined;
  for (const session of getVerifiedSessions(sessions)) {
    if (!session.exercises.some((exercise) => exercise.name === name)) continue;
    if (session.imported && !session.exercises.find(exercise => exercise.name === name)?.sets.some(set => set.completed && !set.skipped && set.sourceKind !== 'warmup' && !set.type)) continue;
    if (!latest || session.date > latest.date ||
        (session.date === latest.date && Number(session.id) < Number(latest.id))) latest = session;
  }
  return latest?.exercises.find((exercise) => exercise.name === name);
};

/**
 * Suggestion for a current-session set that still holds its untouched
 * history baseline. Accepted, edited, propagated or logged sets get none.
 */
export const getSetProgressionSuggestion = (
  sessions: readonly WorkoutSession[],
  exercise: SessionExercise,
  setIndex: number,
  profile: Pick<UserProfile, 'weightUnit' | 'weightIncrement' | 'weightIncrementLbs'>
): ProgressionSuggestion | null => {
  const set = exercise.sets[setIndex];
  if (!set || set.type || set.completed || set.skipped || set.valueOrigin !== 'history') return null;
  // No duration progression yet, and weight progression is not defined
  // against a duration target: timed exercises never get a "Try" nudge.
  if (getExerciseMetric(exercise) !== 'reps') return null;
  const regularIndex = exercise.sets.slice(0, setIndex).filter((item) => !item.type).length;
  const previousSet = getRegularSets(
    compatibleHistory(findLastExercisePerformance(sessions, exercise.name), 'reps')
  )[regularIndex];
  const suggestion = getProgressionSuggestion(previousSet, exercise.loadType, profile, exercise.entryUnit);
  // The baseline must still be what this set holds; otherwise it is not "last time".
  return suggestion && suggestion.baselineKg === set.weight ? suggestion : null;
};

/**
 * Builds an already-completed exercise (retroactive logging). Never applies
 * progression.
 * History values are copied by set position; template values cover exercises
 * (or individual sets) that have never been logged before.
 */
export const createCompletedSessionExercise = (
  templateExercise: Exercise,
  lastExercise: Exercise | undefined,
  entryUnit: UserProfile['weightUnit'] = 'kg'
): SessionExercise => {
  const metric = getExerciseMetric(templateExercise);
  const lastSets = getRegularSets(compatibleHistory(lastExercise, metric));
  return {
    name: templateExercise.name,
    entryUnit,
    loadType: templateExercise.loadType,
    metric,
    sets: getRegularSets(templateExercise)
      .map((templateSet, setIndex): ExerciseSet => {
        const lastSet = lastSets[setIndex];
        const weight = templateExercise.loadType === 'bodyweight'
          ? 0
          : lastSet?.weight ?? templateSet.weight;
        if (metric === 'duration') {
          return sessionSet(metric, {
            reps: 0,
            weight,
            durationS: lastSet?.durationS ?? templateSet.durationS,
          }, { valueOrigin: lastSet ? 'history' : 'template', completed: true, skipped: false });
        }
        const reps = lastSet?.reps ?? templateSet.reps;

        return {
          reps,
          weight,
          targetReps: lastSet?.targetReps ?? reps,
          targetWeight: lastSet?.targetWeight ?? weight,
          valueOrigin: lastSet ? 'history' : 'template',
          completed: true,
          skipped: false,
        };
      }),
  };
};
