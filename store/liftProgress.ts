import type { WorkoutSession } from '@/store/workoutStore';
import { getVerifiedSessions } from '@/store/verifiedSessions';
import { formatDuration, isDurationExercise, isValidDuration } from '@/store/exerciseMeasurement';
import { parseSessionDate } from '@/store/workoutCalendar';
import { formatWeight, unitLabel, type WeightUnit } from '@/store/weightUnits';

export type LiftPerformance = {
  sessionId: string;
  date: Date;
  weight: number;
  reps: number;
  bodyweight: boolean;
  durationS?: number;
};

export type LiftProgress = {
  name: string;
  history: LiftPerformance[];
  latest: LiftPerformance;
  previous: LiftPerformance | null;
};

export type LiftProgressSort = 'recent' | 'improved' | 'trained';
export const LIFT_PROGRESS_SORTS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'improved', label: 'Most improved' },
  { value: 'trained', label: 'Most trained' },
] as const satisfies readonly { value: LiftProgressSort; label: string }[];

/** Relative change within one exercise; never compare raw loads across exercises. */
export function liftImprovement(lift: LiftProgress): { change: number; label: string } | null {
  const { latest, previous } = lift;
  if (!previous || latest.bodyweight !== previous.bodyweight
    || (latest.durationS !== undefined) !== (previous.durationS !== undefined)) return null;
  let current: number;
  let baseline: number;
  let label: string;
  if (latest.durationS !== undefined) {
    if (latest.bodyweight || latest.weight === previous.weight) {
      current = latest.durationS;
      baseline = previous.durationS!;
      label = 'Time';
    } else if (latest.durationS === previous.durationS) {
      current = latest.weight;
      baseline = previous.weight;
      label = 'Load';
    } else {
      // A different load and hold time have no direct comparison.
      return null;
    }
  } else if (latest.bodyweight || latest.weight === 0 && previous.weight === 0) {
    current = latest.reps;
    baseline = previous.reps;
    label = 'Reps';
  } else {
    // Epley estimate accounts for both load and reps rather than ranking load alone.
    current = latest.weight * (1 + latest.reps / 30);
    baseline = previous.weight * (1 + previous.reps / 30);
    label = 'Estimated strength';
  }
  if (!Number.isFinite(current) || !Number.isFinite(baseline) || baseline <= 0) return null;
  return { change: (current - baseline) / baseline, label };
}

/** Returns a new list; search and featured selections keep their original state. */
export function sortLiftProgress(lifts: readonly LiftProgress[], sort: LiftProgressSort): LiftProgress[] {
  const improvements = sort === 'improved' ? new Map(lifts.map(lift => [lift, liftImprovement(lift)])) : null;
  return [...lifts].sort((a, b) => {
    const recent = b.latest.date.getTime() - a.latest.date.getTime() || a.name.localeCompare(b.name);
    if (sort === 'trained') return b.history.length - a.history.length || recent;
    if (sort === 'improved') {
      const first = improvements!.get(a);
      const second = improvements!.get(b);
      if (!first || !second) return Number(Boolean(second)) - Number(Boolean(first)) || recent;
      return second.change - first.change || recent;
    }
    return recent;
  });
}

export function liftImprovementCopy(lift: LiftProgress): string {
  const improvement = liftImprovement(lift);
  if (!improvement) return 'No comparable previous workout yet';
  const percent = Math.round(improvement.change * 100);
  return percent === 0 ? `${improvement.label} unchanged from previous workout`
    : `${improvement.label} ${percent > 0 ? '+' : '−'}${Math.abs(percent)}% vs previous workout`;
}

/** One performed top set per session: heaviest load, then most reps or longest time at that load.
 * This is a session comparison, not an estimate of strength or a personal record.
 */
export function deriveLiftProgress(sessions: readonly WorkoutSession[]): LiftProgress[] {
  const histories = new Map<string, Map<string, LiftPerformance>>();
  for (const session of getVerifiedSessions(sessions)) {
    const date = parseSessionDate(session.date);
    if (!Number.isFinite(date.getTime())) continue;
    for (const exercise of session.exercises) {
      const timed = isDurationExercise(exercise);
      const bodyweight = exercise.loadType === 'bodyweight';
      const performed = exercise.sets.filter((set) => set.completed && !set.skipped && set.sourceKind !== 'warmup'
        && Number.isFinite(set.weight) && set.weight >= 0
        && (timed ? isValidDuration(set.durationS) : Number.isInteger(set.reps) && set.reps > 0));
      if (performed.length === 0) continue;
      const best = performed.reduce((a, b) => {
        const loadDifference = bodyweight ? 0 : b.weight - a.weight;
        const measureDifference = timed ? b.durationS! - a.durationS! : b.reps - a.reps;
        return loadDifference > 0 || (loadDifference === 0 && measureDifference > 0) ? b : a;
      });
      const history = histories.get(exercise.name) ?? new Map<string, LiftPerformance>();
      const candidate = { sessionId: session.id, date, weight: bodyweight ? 0 : best.weight,
        reps: timed ? 0 : best.reps, bodyweight, ...(timed ? { durationS: best.durationS } : {}) };
      const existing = history.get(session.id);
      if (!existing || candidate.weight > existing.weight
        || (candidate.weight === existing.weight && (candidate.durationS ?? candidate.reps) > (existing.durationS ?? existing.reps))) {
        history.set(session.id, candidate);
      }
      histories.set(exercise.name, history);
    }
  }
  return [...histories].map(([name, entries]) => {
    const history = [...entries.values()].sort((a, b) => b.date.getTime() - a.date.getTime()
      || b.sessionId.localeCompare(a.sessionId, 'en', { numeric: true }));
    const latest = history[0];
    // Compare the same load type and measurement (reps or time).
    const previous = history.slice(1).find((entry) => entry.bodyweight === latest.bodyweight
      && (entry.durationS !== undefined) === (latest.durationS !== undefined)) ?? null;
    return { name, history, latest, previous };
  }).sort((a, b) => b.latest.date.getTime() - a.latest.date.getTime() || a.name.localeCompare(b.name));
}

/** Choose frequent, comparable lifts once. Never rank unrelated exercises by gain. */
export function defaultWatchedLifts(lifts: readonly LiftProgress[]): string[] {
  return [...lifts].sort((a, b) => Number(Boolean(b.previous)) - Number(Boolean(a.previous))
    || b.history.length - a.history.length
    || b.latest.date.getTime() - a.latest.date.getTime()
    || a.name.localeCompare(b.name)).slice(0, 2).map((lift) => lift.name);
}

export function resolveWatchedLifts(lifts: readonly LiftProgress[], names: readonly string[] | null, automatic: boolean): string[] {
  const available = new Set(lifts.map((lift) => lift.name));
  const selected = [...new Set(names ?? [])].filter((name) => available.has(name)).slice(0, 2);
  if (automatic) {
    for (const name of defaultWatchedLifts(lifts)) {
      if (selected.length >= 2) break;
      if (!selected.includes(name)) selected.push(name);
    }
  }
  return selected;
}

export function formatLiftPerformance(set: LiftPerformance, unit: WeightUnit): string {
  if (set.durationS !== undefined) {
    const time = formatDuration(set.durationS);
    return set.bodyweight ? `Bodyweight · ${time}` : `${formatWeight(set.weight, unit)} ${unitLabel(unit)} · ${time}`;
  }
  return set.bodyweight ? `Bodyweight × ${set.reps}` : `${formatWeight(set.weight, unit)} ${unitLabel(unit)} × ${set.reps}`;
}

export function formatLiftDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric',
    ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
}

export function liftComparisonCopy(lift: LiftProgress, unit: WeightUnit): string {
  return lift.previous ? `Previous: ${formatLiftPerformance(lift.previous, unit)}` : '';
}
