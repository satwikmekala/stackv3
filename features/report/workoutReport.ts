import type { BonusSetType, ExerciseSet, IntensityLevel, WorkoutSession } from '@/store/workoutStore';
import { getVerifiedSessions } from '@/store/verifiedSessions';
import { formatDuration, getExerciseMetric } from '@/store/exerciseMeasurement';
import { formatWeight, unitLabel, type WeightUnit } from '@/store/weightUnits';
import { deriveWorkoutSummary, displayVolume, formatSummaryNumber } from '@/store/workoutSummary';

/*
 * Workout report: a stable, render-ready model of one completed session.
 *
 * Everything here is pure and display-ready (strings already in the user's
 * global Settings unit), so the renderer never touches Zustand, SQLite or
 * unit math, and the same model can feed a share image, history or a PDF.
 * Totals come from deriveWorkoutSummary so the report always agrees with the
 * completion screen; this layer only adds per-set detail.
 */

/** How an exercise is measured, which decides how every set reads. */
export type ReportMeasure =
  | 'weight_reps' // 80 kg × 10
  | 'reps' // 20 reps
  | 'duration' // 1:00
  | 'weight_duration'; // 30 kg · 0:45

export type ReportSetKind = 'working' | BonusSetType;

export type ReportSet = {
  /** 1-based position within the exercise, in logged order. */
  ordinal: number;
  kind: ReportSetKind;
  skipped: boolean;
  /** Full reading: "80 kg × 10", "20 reps", "1:00", "30 kg · 0:45", or "Skipped". */
  text: string;
  /** Unit-free reading for the dense grid, where the unit sits in the header: "80 × 10". */
  compactText: string;
  /** This set beat every earlier verified session of the exercise (the Records rule). */
  record: boolean;
};

export type ReportExercise = {
  /** 1-based among performed exercises; null for one that was entirely skipped. */
  position: number | null;
  name: string;
  measure: ReportMeasure;
  /** Column hint for the compact grid: "kg × reps", "reps", "time", "kg · time". */
  unitHint: string;
  sets: ReportSet[];
  performedCount: number;
  skippedCount: number;
  /** Traditional weight × reps volume; null whenever it would be meaningless. */
  volume: string | null;
  /** Every set was skipped; shown as a single quiet line. */
  skipped: boolean;
  hasRecord: boolean;
};

export type ReportStat = { key: 'duration' | 'exercises' | 'sets' | 'volume'; label: string; value: string; unit?: string };

export type ReportDensity = 'comfortable' | 'compact';

export type WorkoutReport = {
  id: string;
  title: string;
  accent: string;
  unit: WeightUnit;
  /** "Thursday, Oct 2, 2026". */
  dateLabel: string;
  /** Start time when the session recorded one, else null. */
  timeLabel: string | null;
  /** Elapsed time; null for history without a trustworthy completion time. */
  durationLabel: string | null;
  intensityLabel: string | null;
  /** Only non-zero, meaningful stats, in display order. */
  stats: ReportStat[];
  /** Short notes worth surfacing: "2 new bests", "1 drop set". */
  highlights: string[];
  exercises: ReportExercise[];
  density: ReportDensity;
};

export type WorkoutReportOptions = {
  /** Global Settings unit; entry units never decide the report. */
  unit: WeightUnit;
  /** Saved Custom Split workout name, as on the completion screen. */
  titleOverride?: string | null;
  /** Every saved session, so a top set can be judged as a new best. */
  history?: readonly WorkoutSession[];
};

/** Above this many set rows, sets flow into a grid instead of one row each. */
export const REPORT_COMFORTABLE_MAX_ROWS = 20;
/** A session longer than this is not trusted as a real elapsed time. */
const MAX_TRUSTED_DURATION_MS = 8 * 60 * 60 * 1000;

const MEASURE_HINTS: Record<ReportMeasure, (unit: WeightUnit) => string> = {
  weight_reps: (unit) => `${unitLabel(unit)} × reps`,
  reps: () => 'reps',
  duration: () => 'time',
  weight_duration: (unit) => `${unitLabel(unit)} · time`,
};

type Performed = { weight: number; reps: number };
const beats = (a: Performed, b: Performed) => a.weight - b.weight || a.reps - b.reps;
const isPerformed = (set: ExerciseSet) => Boolean(set.completed) && !set.skipped;

/** Best earlier weight/reps top set per exercise name, from verified history only. */
function previousBests(session: WorkoutSession, history: readonly WorkoutSession[]): Map<string, Performed> {
  const earlier = getVerifiedSessions(history).filter((item) =>
    item.id !== session.id &&
    (item.date < session.date || (item.date === session.date && Number(item.id) < Number(session.id))));
  const bests = new Map<string, Performed>();
  for (const item of earlier) {
    for (const exercise of item.exercises) {
      if (getExerciseMetric(exercise) !== 'reps') continue;
      for (const set of exercise.sets) {
        if (!isPerformed(set)) continue;
        const known = bests.get(exercise.name);
        if (!known || beats(set, known) > 0) bests.set(exercise.name, { weight: set.weight, reps: set.reps });
      }
    }
  }
  return bests;
}

function measureOf(exercise: WorkoutSession['exercises'][number], performed: readonly ExerciseSet[]): ReportMeasure {
  const loaded = exercise.loadType === 'external_weight' && performed.some((set) => set.weight > 0);
  if (getExerciseMetric(exercise) === 'duration') return loaded ? 'weight_duration' : 'duration';
  return loaded ? 'weight_reps' : 'reps';
}

/**
 * One set's reading. A loaded exercise's unloaded set (weight 0) reads as
 * plain reps or time rather than a meaningless "0 kg".
 */
function readSet(set: ExerciseSet, measure: ReportMeasure, unit: WeightUnit): { text: string; compactText: string } {
  const timed = measure === 'duration' || measure === 'weight_duration';
  const loaded = (measure === 'weight_reps' || measure === 'weight_duration') && set.weight > 0;
  const weight = loaded ? formatWeight(set.weight, unit) : null;
  if (timed) {
    const time = formatDuration(set.durationS);
    return weight
      ? { text: `${weight} ${unitLabel(unit)} · ${time}`, compactText: `${weight} · ${time}` }
      : { text: time, compactText: time };
  }
  return weight
    ? { text: `${weight} ${unitLabel(unit)} × ${set.reps}`, compactText: `${weight} × ${set.reps}` }
    : { text: `${set.reps} ${set.reps === 1 ? 'rep' : 'reps'}`, compactText: String(set.reps) };
}

/** Elapsed time only when both ends are real timestamps and the span is plausible. */
export function reportDuration(session: Pick<WorkoutSession, 'date' | 'completedAt'>): number | null {
  if (!session.completedAt || !session.date.includes('T')) return null;
  const start = Date.parse(session.date);
  const end = Date.parse(session.completedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  const elapsed = end - start;
  return elapsed >= 60_000 && elapsed <= MAX_TRUSTED_DURATION_MS ? elapsed : null;
}

/** 4 min, 48 min, 1h 05m. */
export function formatReportDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

/** Date-only history ("2026-10-02") is a calendar day, not UTC midnight. */
function sessionDate(value: string): Date {
  const dayOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return dayOnly ? new Date(Number(dayOnly[1]), Number(dayOnly[2]) - 1, Number(dayOnly[3])) : new Date(value);
}

const INTENSITY_LABELS: Record<IntensityLevel, string> = {
  easy: 'Felt easy',
  medium: 'Felt just right',
  hard: 'Felt hard',
};

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

export function buildWorkoutReport(session: WorkoutSession, options: WorkoutReportOptions): WorkoutReport {
  const { unit, titleOverride, history = [] } = options;
  const summary = deriveWorkoutSummary(session, titleOverride);
  const bests = previousBests(session, history);

  const exercises = session.exercises.flatMap<ReportExercise>((exercise) => {
    // Unfinished sets (neither performed nor skipped) were never reached; they
    // are not part of what happened and are left out entirely.
    const logged = exercise.sets.filter((set) => set.completed || set.skipped);
    if (logged.length === 0) return [];
    const performed = logged.filter(isPerformed);
    const measure = measureOf(exercise, performed);

    // Only the first copy of the top set is marked, so a repeated 100 × 5 earns one tag.
    let recordIndex = -1;
    const previous = bests.get(exercise.name);
    if (measure === 'weight_reps' || measure === 'reps') {
      let top: Performed | undefined;
      logged.forEach((set, index) => {
        if (!isPerformed(set)) return;
        if (!top || beats(set, top) > 0) { top = set; recordIndex = index; }
      });
      if (!top || !previous || beats(top, previous) <= 0) recordIndex = -1;
    }

    const sets = logged.map<ReportSet>((set, index) => {
      const kind: ReportSetKind = set.type ?? 'working';
      if (set.skipped) return { ordinal: index + 1, kind, skipped: true, text: 'Skipped', compactText: 'Skipped', record: false };
      return { ordinal: index + 1, kind, skipped: false, ...readSet(set, measure, unit), record: index === recordIndex };
    });

    const volumeKg = measure === 'weight_reps'
      ? performed.reduce((sum, set) => sum + set.reps * set.weight, 0)
      : 0;

    return [{
      position: 0,
      name: exercise.name.trim() || 'Exercise',
      measure,
      unitHint: MEASURE_HINTS[measure](unit),
      sets,
      performedCount: performed.length,
      skippedCount: logged.length - performed.length,
      volume: volumeKg > 0 ? `${formatSummaryNumber(displayVolume(volumeKg, unit))} ${unitLabel(unit)}` : null,
      skipped: performed.length === 0,
      hasRecord: recordIndex >= 0,
    }];
  });
  let performedPosition = 0;
  for (const exercise of exercises) exercise.position = exercise.skipped ? null : ++performedPosition;

  const elapsed = reportDuration(session);
  const durationLabel = elapsed === null ? null : formatReportDuration(elapsed);
  const stats: ReportStat[] = [];
  if (durationLabel) stats.push({ key: 'duration', label: 'Duration', value: durationLabel });
  if (summary.exerciseCount > 0) stats.push({ key: 'exercises', label: 'Exercises', value: String(summary.exerciseCount) });
  if (summary.setCount > 0) stats.push({ key: 'sets', label: 'Sets', value: String(summary.setCount) });
  if (summary.volumeKg > 0) {
    stats.push({ key: 'volume', label: 'Volume', value: formatSummaryNumber(Math.round(displayVolume(summary.volumeKg, unit))), unit: unitLabel(unit) });
  }

  const records = exercises.filter((exercise) => exercise.hasRecord).length;
  const highlights: string[] = [];
  if (records > 0) highlights.push(plural(records, 'new best'));
  if (summary.specialSets.pr > 0) highlights.push(plural(summary.specialSets.pr, 'PR attempt'));
  if (summary.specialSets.dropset > 0) highlights.push(plural(summary.specialSets.dropset, 'drop set'));
  if (summary.specialSets.extra > 0) highlights.push(plural(summary.specialSets.extra, 'extra set'));
  const skippedSets = exercises.reduce((sum, exercise) => sum + exercise.skippedCount, 0);
  if (skippedSets > 0) highlights.push(`${plural(skippedSets, 'set')} skipped`);

  const date = sessionDate(session.date);
  const rows = exercises.reduce((sum, exercise) => sum + (exercise.skipped ? 1 : exercise.sets.length), 0);

  return {
    id: session.id,
    title: summary.title,
    accent: summary.accent,
    unit,
    dateLabel: new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }).format(date),
    timeLabel: session.date.includes('T')
      ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date)
      : null,
    durationLabel,
    intensityLabel: session.intensity ? INTENSITY_LABELS[session.intensity] : null,
    stats,
    highlights,
    exercises,
    density: rows <= REPORT_COMFORTABLE_MAX_ROWS ? 'comfortable' : 'compact',
  };
}

/** Plain-text twin of the image, for accessibility and as the share message fallback. */
export function workoutReportText(report: WorkoutReport): string {
  const lines = [report.title, [report.dateLabel, report.durationLabel].filter(Boolean).join(' · ')];
  const stats = report.stats.filter((stat) => stat.key !== 'duration')
    .map((stat) => `${stat.value}${stat.unit ? ` ${stat.unit}` : ''} ${stat.label.toLowerCase()}`);
  if (stats.length) lines.push(stats.join(' · '));
  for (const exercise of report.exercises) {
    lines.push('', `${exercise.position ?? '–'}. ${exercise.name}${exercise.volume ? ` — ${exercise.volume}` : ''}`);
    if (exercise.skipped) { lines.push('   Skipped'); continue; }
    for (const set of exercise.sets) {
      const tags = [set.kind !== 'working' ? REPORT_SET_TAGS[set.kind] : null, set.record ? 'NEW BEST' : null].filter(Boolean);
      lines.push(`   ${set.ordinal}  ${set.text}${tags.length ? `  (${tags.join(', ')})` : ''}`);
    }
  }
  return lines.join('\n');
}

export const REPORT_SET_TAGS: Record<BonusSetType, string> = {
  extra: 'EXTRA',
  dropset: 'DROP',
  pr: 'PR ATTEMPT',
};
