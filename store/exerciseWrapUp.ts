import { getExerciseMetric } from '@/store/exerciseMeasurement';
import { compareSetPerformance } from '@/store/personalRecords';
import { getVerifiedSessions } from '@/store/verifiedSessions';
import { findLastExercisePerformance } from '@/store/workoutProgression';
import type { Exercise, ExerciseSet, WorkoutSession } from '@/store/workoutStore';

// Derived facts for the between-exercise wrap-up. Records use the same
// weight-then-reps rule as the Records screen, so a trophy here always matches
// what Records will show once the workout is saved.

export type Lift = { weight: number; reps: number };

export const isPerformedSet = (set: ExerciseSet) => Boolean(set.completed) && !set.skipped;

/** Best performed set from saved workouts, before this session. Reps exercises only. */
export function getPreviousBest(sessions: readonly WorkoutSession[], name: string): Lift | null {
  let best: Lift | null = null;
  for (const session of getVerifiedSessions(sessions)) {
    for (const exercise of session.exercises) {
      if (exercise.name !== name || getExerciseMetric(exercise) !== 'reps') continue;
      for (const set of exercise.sets) {
        if (isPerformedSet(set) && (!best || compareSetPerformance(set, best) > 0)) {
          best = { weight: set.weight, reps: set.reps };
        }
      }
    }
  }
  return best;
}

/**
 * Indexes of sets that beat everything before them: saved history first, then
 * earlier sets today. A first-ever session sets the baseline instead of
 * celebrating every set.
 */
export function getRecordSetIndexes(previousBest: Lift | null, exercise: Exercise): number[] {
  if (!previousBest || getExerciseMetric(exercise) !== 'reps') return [];
  let best = previousBest;
  const indexes: number[] = [];
  exercise.sets.forEach((set, index) => {
    if (isPerformedSet(set) && compareSetPerformance(set, best) > 0) {
      indexes.push(index);
      best = set;
    }
  });
  return indexes;
}

/** What one more set would need to beat the record, when that is realistic. */
export type RecordHint = { best: Lift; beatReps: number | null };

export function getRecordHint(previousBest: Lift | null, exercise: Exercise, base: Lift): RecordHint | null {
  if (!previousBest || getExerciseMetric(exercise) !== 'reps') return null;
  if (previousBest.weight === base.weight) return { best: previousBest, beatReps: previousBest.reps + 1 };
  // Heavier records stay "within reach" only up to roughly one plate jump.
  if (previousBest.weight > base.weight && previousBest.weight <= base.weight * 1.1) {
    return { best: previousBest, beatReps: null };
  }
  return null;
}

/** The value an added set starts from: the last performed straight set. */
export function getAddSetBase(exercise: Exercise): ExerciseSet | undefined {
  const performed = exercise.sets.filter(isPerformedSet);
  return [...performed].reverse().find((set) => set.type !== 'dropset')
    ?? performed[performed.length - 1]
    ?? exercise.sets[exercise.sets.length - 1];
}

export type WrapUpMeasure = 'volume' | 'reps' | 'duration';
export type LastTimeComparison = {
  measure: WrapUpMeasure;
  /** kg·reps for volume, reps, or seconds. */
  current: number;
  /** Null when there is no comparable previous performance. */
  previous: number | null;
};

const measureOf = (exercise: Exercise): WrapUpMeasure =>
  getExerciseMetric(exercise) === 'duration'
    ? 'duration'
    : exercise.loadType === 'bodyweight' ? 'reps' : 'volume';

const totalOf = (exercise: Exercise, measure: WrapUpMeasure) =>
  exercise.sets.filter(isPerformedSet).reduce((sum, set) => sum + (
    measure === 'volume' ? set.weight * set.reps
      : measure === 'reps' ? set.reps
        : set.durationS ?? 0
  ), 0);

/** Today's total for this exercise against the last saved time it was done. */
export function getLastTimeComparison(
  sessions: readonly WorkoutSession[],
  exercise: Exercise
): LastTimeComparison {
  const measure = measureOf(exercise);
  const last = findLastExercisePerformance(sessions, exercise.name);
  const comparable = last && measureOf(last) === measure && last.sets.some(isPerformedSet);
  return {
    measure,
    current: totalOf(exercise, measure),
    previous: comparable ? totalOf(last, measure) : null,
  };
}
