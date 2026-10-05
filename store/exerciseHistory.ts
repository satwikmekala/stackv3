import { formatDuration, getExerciseMetric } from '@/store/exerciseMeasurement';
import { compareSetPerformance } from '@/store/personalRecords';
import { getVerifiedSessions } from '@/store/verifiedSessions';
import { parseSessionDate } from '@/store/workoutCalendar';
import { formatWeight, unitLabel, type WeightUnit } from '@/store/weightUnits';
import type {
  BonusSetType,
  ExerciseLoadType,
  ExerciseMetric,
  ExerciseSet,
  WorkoutSession,
} from '@/store/workoutStore';

// Read-only "what did I actually lift?" context for the logger. Derived from the
// same verified completed sessions as progression and records, so it never adds
// storage and never reads the unfinished workout.

/** Enough to see a trend at a glance without becoming an analytics screen. */
export const EXERCISE_HISTORY_LIMIT = 5;

export type ExerciseHistorySet = {
  weight: number;
  reps: number;
  durationS?: number;
  type?: BonusSetType;
  /** Snapshotted per session: history keeps the measure it was logged with. */
  loadType: ExerciseLoadType;
  metric: ExerciseMetric;
  /** The session's best set, emphasized so the useful number stands out. */
  top: boolean;
};

export type ExerciseHistoryEntry = {
  sessionId: string;
  date: Date;
  sets: ExerciseHistorySet[];
};

const isHistorySet = (set: ExerciseSet) =>
  Boolean(set.completed) && !set.skipped && set.sourceKind !== 'warmup';

const isWeighted = (set: Pick<ExerciseHistorySet, 'loadType' | 'weight'>) =>
  set.loadType === 'external_weight' && set.weight > 0;

/** Heaviest, then most reps; holds compare load, then time held. */
const compareHistorySets = (a: ExerciseHistorySet, b: ExerciseHistorySet) =>
  a.metric === 'duration'
    ? (isWeighted(a) ? a.weight : 0) - (isWeighted(b) ? b.weight : 0) || (a.durationS ?? 0) - (b.durationS ?? 0)
    : compareSetPerformance(isWeighted(a) ? a : { ...a, weight: 0 }, isWeighted(b) ? b : { ...b, weight: 0 });

/**
 * The last completed workouts containing `name`, newest first, with only the sets
 * actually performed (no skipped rows or imported warmups). The unfinished
 * workout is excluded both by the verified-session rule and explicitly by ID.
 */
export function getExerciseHistory(
  sessions: readonly WorkoutSession[],
  name: string,
  { excludeSessionId, limit = EXERCISE_HISTORY_LIMIT }: { excludeSessionId?: string; limit?: number } = {}
): ExerciseHistoryEntry[] {
  const entries: (ExerciseHistoryEntry & { order: number })[] = [];
  for (const session of getVerifiedSessions(sessions)) {
    if (session.id === excludeSessionId) continue;
    const sets = session.exercises
      .filter((exercise) => exercise.name === name)
      .flatMap((exercise) => exercise.sets.filter(isHistorySet).map((set): ExerciseHistorySet => ({
        weight: set.weight,
        reps: set.reps,
        durationS: set.durationS,
        type: set.type,
        loadType: exercise.loadType,
        metric: getExerciseMetric(exercise),
        top: false,
      })));
    if (sets.length === 0) continue;
    const top = sets.reduce((best, set) => (compareHistorySets(set, best) > 0 ? set : best));
    top.top = true;
    entries.push({ sessionId: session.id, date: parseSessionDate(session.date), sets, order: Number(session.id) });
  }
  return entries
    .sort((a, b) => b.date.getTime() - a.date.getTime() || b.order - a.order)
    .slice(0, limit)
    .map(({ order: _order, ...entry }) => entry);
}

export type HistorySetLabel = {
  /** Load in the display unit, or null when no external load was recorded. */
  load: string | null;
  unit: string;
  /** "× 8", "8 reps", "0:45" or "· 0:45" after a load. */
  measure: string;
  accessibilityLabel: string;
};

const spokenDuration = (seconds: number | undefined) => {
  const whole = Math.max(0, Math.round(seconds ?? 0));
  const minutes = Math.floor(whole / 60), rest = whole % 60;
  const parts = [
    minutes ? `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}` : '',
    rest || !minutes ? `${rest} ${rest === 1 ? 'second' : 'seconds'}` : '',
  ];
  return parts.filter(Boolean).join(' ');
};

/** One set in the logger's own vocabulary, in the unit the user is entering today. */
export function formatHistorySet(set: ExerciseHistorySet, weightUnit: WeightUnit): HistorySetLabel {
  const load = isWeighted(set) ? formatWeight(set.weight, weightUnit) : null;
  const unit = load ? unitLabel(weightUnit) : '';
  const spokenLoad = load ? `${load} ${weightUnit === 'lbs' ? 'pounds' : 'kilograms'}` : '';
  const spokenMeasure = set.metric === 'duration'
    ? spokenDuration(set.durationS)
    : `${set.reps} ${set.reps === 1 ? 'rep' : 'reps'}`;
  const measure = set.metric === 'duration'
    ? load ? `· ${formatDuration(set.durationS)}` : formatDuration(set.durationS)
    : load ? `× ${set.reps}` : `${set.reps} ${set.reps === 1 ? 'rep' : 'reps'}`;
  return {
    load,
    unit,
    measure,
    accessibilityLabel: [spokenLoad, spokenMeasure].filter(Boolean).join(', ') +
      (set.type === 'dropset' ? ', drop set' : '') + (set.top ? ', best set' : ''),
  };
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** "Oct 3" (with the year once it is not this year) and a short relative hint. */
export function formatHistoryDate(date: Date, now: Date = new Date()): { label: string; relative: string } {
  const label = date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  });
  const days = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000);
  const relative = days <= 0 ? 'Today'
    : days === 1 ? 'Yesterday'
      // Days stay exact for two weeks so neighbouring workouts never share a label.
      : days < 14 ? `${days} days ago`
        : days < 56 ? `${Math.floor(days / 7)} weeks ago`
          : '';
  return { label, relative };
}
