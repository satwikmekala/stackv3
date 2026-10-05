import { displayExerciseName } from '@/constants/exerciseNames';
import type { WorkoutSession } from '@/store/workoutStore';
import { getVerifiedSessions } from '@/store/verifiedSessions';
import { kgToLbs, unitLabel, type WeightUnit } from '@/store/weightUnits';
import { formatDuration, getExerciseMetric } from '@/store/exerciseMeasurement';
import { parseSessionDate } from '@/store/workoutCalendar';
import { getExerciseVolumeKg, performedSets } from '@/store/workoutVolume';

export { performedSets } from '@/store/workoutVolume';

export type LiftLogLine = {
  name: string;
  /** Total weight moved, "Bodyweight" for unweighted reps, or total time for holds. */
  value: string;
  /** "kg" or "lb" for volume; empty for bodyweight or a m:ss duration. */
  unit: string;
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
const topSet = (sets: readonly Performed[]) =>
  sets.reduce<Performed | undefined>((best, set) => (!best || beats(set, best) > 0 ? set : best), undefined);

/** Exact recap by default; callers can request a compact range. */
export function formatRepScheme(reps: readonly number[], varied: 'exact' | 'range' = 'exact'): string {
  if (reps.length === 0) return '0 sets';
  const low = Math.min(...reps), high = Math.max(...reps);
  if (low === high) return `${reps.length} × ${low}`;
  return varied === 'range' ? `${reps.length} × ${low}–${high}` : `${reps.join(' · ')} reps`;
}

/**
 * One line per lift in training order, showing its total recorded weight moved. PR badges
 * still indicate whether its best working set (rather than its total volume)
 * beat every earlier verified session of the same exercise (the Records rule: heavier,
 * or the same weight for more reps). A lift's first ever session is not a PR.
 */
export function deriveLiftLog(session: WorkoutSession, history: readonly WorkoutSession[], unit: WeightUnit): LiftLog {
  const date = parseSessionDate(session.date).getTime();
  const earlier = getVerifiedSessions(history).filter((item) =>
    item.id !== session.id && (parseSessionDate(item.date).getTime() < date ||
      (parseSessionDate(item.date).getTime() === date && item.id.localeCompare(session.id, 'en', { numeric: true }) < 0)));
  const previousBest = new Map<string, Performed>();
  for (const item of earlier) {
    for (const exercise of item.exercises) {
      // Records are weight/reps only; timed history never sets a baseline.
      if (getExerciseMetric(exercise) !== 'reps') continue;
      const best = topSet(performedSets(exercise.sets)
        .filter((set) => set.sourceKind !== 'warmup')
        .map((set) => ({ weight: exercise.loadType === 'bodyweight' ? 0 : set.weight, reps: set.reps })));
      const known = previousBest.get(exercise.name);
      if (best && (!known || beats(best, known) > 0)) previousBest.set(exercise.name, best);
    }
  }

  const lines = session.exercises.flatMap<LiftLogLine>((exercise) => {
    const sets = performedSets(exercise.sets);
    if (sets.length === 0) return [];
    if (getExerciseMetric(exercise) === 'duration') {
      // Holds have no weight × reps volume, so show total performed time instead.
      return [{
        name: displayExerciseName(exercise.name),
        value: formatDuration(sets.reduce((sum, set) => sum + (set.durationS ?? 0), 0)),
        unit: '',
        record: false,
      }];
    }
    const performances = sets.map((set) => ({ weight: exercise.loadType === 'bodyweight' ? 0 : set.weight, reps: set.reps }));
    const recordBest = topSet(performances.filter((_, index) => sets[index].sourceKind !== 'warmup'));
    const volumeKg = getExerciseVolumeKg(exercise);
    const bodyweight = exercise.loadType === 'bodyweight' || !sets.some((set) => set.weight > 0);
    const previous = previousBest.get(exercise.name);
    return [{
      name: displayExerciseName(exercise.name),
      value: bodyweight ? 'Bodyweight' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
        .format(unit === 'lbs' ? kgToLbs(volumeKg) : volumeKg),
      unit: bodyweight ? '' : unitLabel(unit),
      record: Boolean(previous && recordBest && beats(recordBest, previous) > 0),
    }];
  });
  return { lines: lines.slice(0, LIFT_LOG_MAX_LINES), more: Math.max(0, lines.length - LIFT_LOG_MAX_LINES) };
}
