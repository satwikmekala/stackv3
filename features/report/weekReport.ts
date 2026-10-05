import { displayExerciseName } from '@/constants/exerciseNames';
import type { WorkoutSession } from '@/store/workoutStore';
import { unitLabel, type WeightUnit } from '@/store/weightUnits';
import { displayVolume, formatSummaryNumber } from '@/store/workoutSummary';
import { parseSessionDate } from '@/store/workoutCalendar';
import type { BuildWeek } from '@/features/build/evidence';
import { formatLoadReps } from '@/features/build/buildFormat';
import { buildWorkoutReport, formatReportDuration, reportDuration, type WorkoutReport } from '@/features/report/workoutReport';

/*
 * Week report: one unpacked Build week as a render-ready model for the PDF.
 * Every workout reuses buildWorkoutReport, so a session reads exactly as it
 * does in its own report; this layer only adds the week's totals and shape.
 */

export type WeekSlab = { color: string; height: number; record: boolean; label: string; detail: string };

export type WeekReportWorkout = {
  slab: WeekSlab;
  /** "SUNDAY · 4 OCT". */
  eyebrow: string;
  report: WorkoutReport;
};

export type WeekReportDay = { weekday: string; date: string; slabs: WeekSlab[] };

export type WeekReport = {
  id: string;
  /** "28 Sep – 4 Oct". */
  title: string;
  /** "WEEK 40 · 2026". */
  eyebrow: string;
  /** "28 SEP – 4 OCT 2026", for running headers. */
  rangeLabel: string;
  open: boolean;
  unit: WeightUnit;
  stats: { label: string; value: string; unit?: string }[];
  days: WeekReportDay[];
  /** Share of the week's moved volume per workout, in workout order; empty for bodyweight weeks. */
  split: { label: string; color: string; share: number }[];
  workouts: WeekReportWorkout[];
  /** The week's new bests (the Build rule), oldest first. */
  records: { exercise: string; value: string; workout: string; color: string }[];
  generatedLabel: string;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const day = (date: Date) => `${date.getDate()} ${MONTHS[date.getMonth()]}`;

/** ISO 8601 week number; weeks here start on Monday, so Thursday decides the year. */
function isoWeek(monday: Date): { week: number; year: number } {
  const thursday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 3);
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  const firstMonday = new Date(firstThursday.getFullYear(), 0, 4 - ((firstThursday.getDay() + 6) % 7));
  return { week: 1 + Math.round((thursday.getTime() - firstMonday.getTime()) / (7 * 864e5)), year: thursday.getFullYear() };
}

const moved = (kg: number, unit: WeightUnit) =>
  kg > 0 ? `${formatSummaryNumber(Math.round(displayVolume(kg, unit)))} ${unitLabel(unit)}` : 'Bodyweight';

export function buildWeekReport(week: BuildWeek, sessions: readonly WorkoutSession[], unit: WeightUnit, now = new Date()): WeekReport {
  const byId = new Map(sessions.map((session) => [session.id, session]));
  const start = parseSessionDate(week.weekStart);
  const end = parseSessionDate(week.weekEnd);

  const entries: { piece: BuildWeek['pieces'][number]; workout: WeekReportWorkout }[] = [];
  let durationMs = 0;
  let sets = 0;
  const exerciseNames = new Set<string>();
  for (const piece of week.pieces) {
    const session = byId.get(piece.sessionId);
    if (!session) continue;
    // The piece's own name, as the unpacked week lists it.
    const report = buildWorkoutReport(session, { unit, titleOverride: piece.label, history: sessions });
    const date = parseSessionDate(piece.date);
    durationMs += reportDuration(session) ?? 0;
    for (const exercise of report.exercises) {
      sets += exercise.performedCount;
      if (!exercise.skipped) exerciseNames.add(exercise.name.toLowerCase());
    }
    entries.push({ piece, workout: {
      slab: {
        color: piece.color, height: piece.height, record: piece.records.length > 0,
        label: report.title, detail: `${WEEKDAYS[date.getDay()].slice(0, 3).toUpperCase()} · ${moved(piece.metrics.volumeKg, unit)}`,
      },
      eyebrow: `${WEEKDAYS[date.getDay()]}, ${day(date)}`,
      report,
    } });
  }
  const workouts = entries.map((entry) => entry.workout);

  const days: WeekReportDay[] = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return {
      weekday: WEEKDAYS[date.getDay()].slice(0, 3),
      date: String(date.getDate()),
      slabs: entries.filter((entry) => parseSessionDate(entry.piece.date).toDateString() === date.toDateString()).map((entry) => entry.workout.slab),
    };
  });

  const volumeKg = week.metrics.volumeKg;
  const stats: WeekReport['stats'] = [];
  if (volumeKg > 0) stats.push({ label: 'Moved', value: formatSummaryNumber(Math.round(displayVolume(volumeKg, unit))), unit: unitLabel(unit) });
  stats.push({ label: workouts.length === 1 ? 'Workout' : 'Workouts', value: String(workouts.length) });
  if (sets > 0) stats.push({ label: 'Sets', value: String(sets) });
  if (durationMs > 0) stats.push({ label: 'Trained', value: formatReportDuration(durationMs) });
  else if (exerciseNames.size > 0) stats.push({ label: 'Exercises', value: String(exerciseNames.size) });
  if (week.metrics.records > 0) stats.push({ label: week.metrics.records === 1 ? 'PR' : 'PRs', value: String(week.metrics.records) });

  const split = volumeKg > 0
    ? entries.filter(({ piece }) => piece.metrics.volumeKg > 0)
      .map(({ piece, workout }) => ({ label: workout.report.title, color: piece.color, share: piece.metrics.volumeKg / volumeKg }))
    : [];

  const records = entries.flatMap(({ piece, workout }) => piece.records.map((record) => ({
    exercise: displayExerciseName(record.exerciseName),
    value: formatLoadReps(record.current.weight, record.current.reps, unit),
    workout: `${workout.report.title} · ${workout.slab.detail.split(' · ')[0]}`,
    color: piece.color,
  })));

  const { week: number, year } = isoWeek(start);
  const sameMonth = start.getMonth() === end.getMonth();
  return {
    id: week.weekStart,
    title: `${sameMonth ? start.getDate() : day(start)}–${day(end)}`,
    eyebrow: `WEEK ${number} · ${year}${week.sealed ? '' : ' · IN PROGRESS'}`,
    rangeLabel: `${sameMonth ? start.getDate() : day(start)}–${day(end)} ${end.getFullYear()}`,
    open: !week.sealed,
    unit,
    stats,
    days,
    split,
    workouts,
    records,
    generatedLabel: `${day(now)} ${now.getFullYear()}`,
  };
}
