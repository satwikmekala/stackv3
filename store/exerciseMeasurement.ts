// Pure measurement vocabulary shared by storage, logging and presentation.
// Load type (is external load recorded?) and metric (what is the repeated
// measure?) are independent: Plank is bodyweight + duration, Farmer Carry is
// external_weight + duration.

export type ExerciseMetric = 'reps' | 'duration';
export const EXERCISE_METRICS = ['reps', 'duration'] as const satisfies readonly ExerciseMetric[];

/** One fixed duration step everywhere (logger, bonus sets, Live Activity). */
export const DURATION_STEP_S = 5;
export const DURATION_MIN_S = 1;
/** 99:59 — the widest value the m:ss logger and Live Activity render. */
export const DURATION_MAX_S = 5999;
/** First-time timed exercise with no template target and no history. */
export const DEFAULT_DURATION_S = 30;

/** Legacy rows and plain fixtures without a metric were always rep-based. */
export const getExerciseMetric = (exercise: { metric?: ExerciseMetric } | undefined): ExerciseMetric =>
  exercise?.metric ?? 'reps';

export const isDurationExercise = (exercise: { metric?: ExerciseMetric } | undefined): boolean =>
  getExerciseMetric(exercise) === 'duration';

export const isValidDuration = (seconds: unknown): seconds is number =>
  typeof seconds === 'number' && Number.isInteger(seconds) &&
  seconds >= DURATION_MIN_S && seconds <= DURATION_MAX_S;

export const clampDuration = (seconds: number): number =>
  Math.min(DURATION_MAX_S, Math.max(DURATION_MIN_S, Math.round(seconds)));

/** Canonical integer seconds → "m:ss" (45 → 0:45, 125 → 2:05). */
export const formatDuration = (seconds: number | undefined): string => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return '—';
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

/**
 * Typed duration entry. Plain digits are seconds ("90" → 90); a colon means
 * minutes and seconds ("1:30" → 90). Anything else is rejected, never guessed.
 */
export const parseDurationInput = (text: string): number | null => {
  const value = text.trim();
  if (/^\d{1,4}$/.test(value)) return Number(value);
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

/** Equal sets "3 × 1:00"; varied sets list every set, or a range when compact. */
export const formatDurationScheme = (
  durations: readonly number[],
  varied: 'exact' | 'range' = 'exact'
): string => {
  if (durations.length === 0) return '0 sets';
  const low = Math.min(...durations), high = Math.max(...durations);
  if (low === high) return `${durations.length} × ${formatDuration(low)}`;
  return varied === 'range'
    ? `${durations.length} × ${formatDuration(low)}–${formatDuration(high)}`
    : durations.map(formatDuration).join(' · ');
};
