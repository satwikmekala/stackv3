import { displayExerciseName } from '@/constants/exerciseNames';
import type { WorkoutSession } from '@/store/workoutStore';
import { getVerifiedSessions } from '@/store/verifiedSessions';
import { formatWeight, type WeightUnit } from '@/store/weightUnits';
import { formatDuration, formatDurationScheme, getExerciseMetric } from '@/store/exerciseMeasurement';

export type LiftLogLine = {
  name: string;
  /** The heaviest performed set's load, its reps for a bodyweight lift, or the longest hold. */
  value: string;
  /** "kg", "lbs" or "reps"; empty for an unweighted hold, whose m:ss value speaks for itself. */
  unit: string;
  /** "3 × 5"; "3 × 8–10" when the reps varied; "3 × 0:45–1:00" for holds. */
  scheme: string;
  record: boolean;
};

export type LiftLog = {
  lines: LiftLogLine[];
  /** Lifts left off the card when there are more than fit. */
  more: number;
};

/** The share card fits this many lifts at a size that stays legible over a photo. */
export const LIFT_LOG_MAX_LINES = 6;

type Performed = { weight: number; reps: number };
const beats = (a: Performed, b: Performed) => a.weight - b.weight || a.reps - b.reps;
export const performedSets = (sets: WorkoutSession['exercises'][number]['sets']) =>
  sets.filter((set) => set.completed && !set.skipped);
const topSet = (sets: readonly Performed[]) =>
  sets.reduce<Performed | undefined>((best, set) => (!best || beats(set, best) > 0 ? set : best), undefined);

/** Exact recap by default; the space-constrained Lift Log keeps its range. */
export function formatRepScheme(reps: readonly number[], varied: 'exact' | 'range' = 'exact'): string {
  if (reps.length === 0) return '0 sets';
  const low = Math.min(...reps), high = Math.max(...reps);
  if (low === high) return `${reps.length} × ${low}`;
  return varied === 'range' ? `${reps.length} × ${low}–${high}` : `${reps.join(' · ')} reps`;
}

/**
 * One line per lift in the order it was trained: its top set, sets × reps, and whether that
 * top set beat every earlier verified session of the same exercise (the Records rule: heavier,
 * or the same weight for more reps). A lift's first ever session is not a PR.
 */
export function deriveLiftLog(session: WorkoutSession, history: readonly WorkoutSession[], unit: WeightUnit): LiftLog {
  const earlier = getVerifiedSessions(history).filter((item) =>
    item.id !== session.id && (item.date < session.date || (item.date === session.date && Number(item.id) < Number(session.id))));
  const previousBest = new Map<string, Performed>();
  for (const item of earlier) {
    for (const exercise of item.exercises) {
      // Records are weight/reps only; timed history never sets a baseline.
      if (getExerciseMetric(exercise) !== 'reps') continue;
      const best = topSet(performedSets(exercise.sets));
      const known = previousBest.get(exercise.name);
      if (best && (!known || beats(best, known) > 0)) previousBest.set(exercise.name, best);
    }
  }

  const lines = session.exercises.flatMap<LiftLogLine>((exercise) => {
    const sets = performedSets(exercise.sets);
    if (getExerciseMetric(exercise) === 'duration') {
      if (sets.length === 0) return [];
      const durations = sets.map((set) => set.durationS ?? 0);
      const heaviest = Math.max(...sets.map((set) => set.weight));
      const weighted = exercise.loadType === 'external_weight' && heaviest > 0;
      // No duration records yet, so a timed line is never marked as a PR.
      return [{
        name: displayExerciseName(exercise.name),
        value: weighted ? formatWeight(heaviest, unit) : formatDuration(Math.max(...durations)),
        unit: weighted ? (unit === 'lbs' ? 'lb' : 'kg') : '',
        scheme: formatDurationScheme(durations, 'range'),
        record: false,
      }];
    }
    const best = topSet(sets);
    if (!best) return [];
    const reps = sets.map((set) => set.reps);
    const bodyweight = exercise.loadType === 'bodyweight' || best.weight <= 0;
    const previous = previousBest.get(exercise.name);
    return [{
      name: displayExerciseName(exercise.name),
      value: bodyweight ? String(best.reps) : formatWeight(best.weight, unit),
      unit: bodyweight ? 'reps' : unit === 'lbs' ? 'lb' : 'kg',
      scheme: formatRepScheme(reps, 'range'),
      record: Boolean(previous && beats(best, previous) > 0),
    }];
  });
  return { lines: lines.slice(0, LIFT_LOG_MAX_LINES), more: Math.max(0, lines.length - LIFT_LOG_MAX_LINES) };
}
