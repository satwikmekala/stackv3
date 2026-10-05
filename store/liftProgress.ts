import type { WorkoutSession } from '@/store/workoutStore';
import { getVerifiedSessions } from '@/store/verifiedSessions';
import { isDurationExercise } from '@/store/exerciseMeasurement';
import { parseSessionDate } from '@/store/workoutCalendar';
import { formatWeight, unitLabel, type WeightUnit } from '@/store/weightUnits';

export type LiftPerformance = {
  sessionId: string;
  date: Date;
  weight: number;
  reps: number;
  bodyweight: boolean;
};

export type LiftProgress = {
  name: string;
  history: LiftPerformance[];
  latest: LiftPerformance;
  previous: LiftPerformance | null;
};

/** One performed top set per session: heaviest load, then most reps at that load.
 * This is a session comparison, not an estimate of strength or a personal record.
 */
export function deriveLiftProgress(sessions: readonly WorkoutSession[]): LiftProgress[] {
  const histories = new Map<string, Map<string, LiftPerformance>>();
  for (const session of getVerifiedSessions(sessions)) {
    const date = parseSessionDate(session.date);
    if (!Number.isFinite(date.getTime())) continue;
    for (const exercise of session.exercises) {
      if (isDurationExercise(exercise)) continue;
      const bodyweight = exercise.loadType === 'bodyweight';
      const performed = exercise.sets.filter((set) => set.completed && !set.skipped && set.sourceKind !== 'warmup'
        && Number.isFinite(set.weight) && set.weight >= 0
        && Number.isInteger(set.reps) && set.reps > 0);
      if (performed.length === 0) continue;
      const best = performed.reduce((a, b) => {
        const loadDifference = bodyweight ? 0 : b.weight - a.weight;
        return loadDifference > 0 || (loadDifference === 0 && b.reps > a.reps) ? b : a;
      });
      const history = histories.get(exercise.name) ?? new Map<string, LiftPerformance>();
      const candidate = { sessionId: session.id, date, weight: bodyweight ? 0 : best.weight, reps: best.reps, bodyweight };
      const existing = history.get(session.id);
      if (!existing || candidate.weight > existing.weight
        || (candidate.weight === existing.weight && candidate.reps > existing.reps)) {
        history.set(session.id, candidate);
      }
      histories.set(exercise.name, history);
    }
  }
  return [...histories].map(([name, entries]) => {
    const history = [...entries.values()].sort((a, b) => b.date.getTime() - a.date.getTime()
      || b.sessionId.localeCompare(a.sessionId, 'en', { numeric: true }));
    const latest = history[0];
    // Do not compare externally loaded sets with a bodyweight-only snapshot.
    const previous = history.slice(1).find((entry) => entry.bodyweight === latest.bodyweight) ?? null;
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
  return set.bodyweight ? `Bodyweight × ${set.reps}` : `${formatWeight(set.weight, unit)} ${unitLabel(unit)} × ${set.reps}`;
}

export function formatLiftDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric',
    ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
}

export function liftComparisonCopy(lift: LiftProgress, unit: WeightUnit): string {
  return lift.previous ? `Previous: ${formatLiftPerformance(lift.previous, unit)}` : '';
}
