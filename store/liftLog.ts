import type { WorkoutSession } from '@/store/workoutStore';
import { getVerifiedSessions } from '@/store/verifiedSessions';
import { formatWeight, type WeightUnit } from '@/store/weightUnits';

export type LiftLogLine = {
  name: string;
  /** The heaviest performed set's load, or its reps for a bodyweight lift. */
  value: string;
  /** "kg", "lbs" or "reps". */
  unit: string;
  /** "3 × 5"; "3 × 8–10" when the reps varied. */
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
const performedSets = (sets: WorkoutSession['exercises'][number]['sets']) =>
  sets.filter((set) => set.completed && !set.skipped);
const topSet = (sets: readonly Performed[]) =>
  sets.reduce<Performed | undefined>((best, set) => (!best || beats(set, best) > 0 ? set : best), undefined);

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
      const best = topSet(performedSets(exercise.sets));
      const known = previousBest.get(exercise.name);
      if (best && (!known || beats(best, known) > 0)) previousBest.set(exercise.name, best);
    }
  }

  const lines = session.exercises.flatMap<LiftLogLine>((exercise) => {
    const sets = performedSets(exercise.sets);
    const best = topSet(sets);
    if (!best) return [];
    const reps = sets.map((set) => set.reps);
    const [low, high] = [Math.min(...reps), Math.max(...reps)];
    const bodyweight = exercise.loadType === 'bodyweight' || best.weight <= 0;
    const previous = previousBest.get(exercise.name);
    return [{
      name: exercise.name,
      value: bodyweight ? String(best.reps) : formatWeight(best.weight, unit),
      unit: bodyweight ? 'reps' : unit === 'lbs' ? 'lbs' : 'kg',
      scheme: `${sets.length} × ${low === high ? low : `${low}–${high}`}`,
      record: Boolean(previous && beats(best, previous) > 0),
    }];
  });
  return { lines: lines.slice(0, LIFT_LOG_MAX_LINES), more: Math.max(0, lines.length - LIFT_LOG_MAX_LINES) };
}
