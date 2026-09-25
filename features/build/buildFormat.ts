import { formatWeight, unitLabel, type WeightUnit } from '../../store/weightUnits';
import { parseSessionDate } from '../../store/workoutCalendar';
import type { WorkoutSession } from '../../store/workoutStore';
import { ARCHETYPE_COMPOSITIONS } from '../../constants/archetypes';
import { workoutMeta } from '../../constants/workouts';

/** The one set of text formatters shared by every Build surface (Monolith, casting, fusion, Case). */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** "14 SEP" */
export function formatDay(date: string) {
  const value = parseSessionDate(date);
  return `${value.getDate()} ${MONTHS[value.getMonth()]}`;
}

/** Spoken form of a date: "14 September". */
export function formatDayA11y(date: string) {
  const value = parseSessionDate(date);
  return `${value.getDate()} ${FULL_MONTHS[value.getMonth()]}`;
}

/** "14–20 SEP"; across months "28 SEP–4 OCT". */
export function formatDateRange(start: string, end: string) {
  const first = parseSessionDate(start);
  const last = parseSessionDate(end);
  const [firstMonth, lastMonth] = [MONTHS[first.getMonth()], MONTHS[last.getMonth()]];
  return firstMonth === lastMonth ? `${first.getDate()}–${last.getDate()} ${lastMonth}` : `${first.getDate()} ${firstMonth}–${last.getDate()} ${lastMonth}`;
}

/** A week as a heading: "14–20 September"; across months "28 September–4 October". */
export function formatDateRangeTitle(start: string, end: string) {
  const first = parseSessionDate(start);
  const last = parseSessionDate(end);
  const [firstMonth, lastMonth] = [FULL_MONTHS[first.getMonth()], FULL_MONTHS[last.getMonth()]];
  return firstMonth === lastMonth ? `${first.getDate()}–${last.getDate()} ${lastMonth}` : `${first.getDate()} ${firstMonth}–${last.getDate()} ${lastMonth}`;
}

/** Spoken form of a range: "14 September to 5 October". */
export const formatDateRangeA11y = (start: string, end: string) => `${formatDayA11y(start)} to ${formatDayA11y(end)}`;

/** "Mon" */
export const formatWeekday = (date: string) => WEEKDAYS[parseSessionDate(date).getDay()];

/** Lower-case words for 0–99 ("twenty-one"), digits from 100. */
export function numberWord(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value >= 100) return String(value);
  return value < 20 ? ONES[value] : `${TENS[Math.floor(value / 10)]}${value % 10 ? `-${ONES[value % 10]}` : ''}`;
}

/** Sentence-start form: "One", "Twenty-one", "104". */
export function spelledCount(value: number) {
  const words = numberWord(value);
  return words[0].toUpperCase() + words.slice(1);
}

/** "1 piece", "3 pieces". The plural defaults to singular + "s". */
export const countLabel = (count: number, singular: string, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`;
/** "1 PR", "3 PRs". */
export const recordLabel = (count: number) => countLabel(count, 'PR', 'PRs');

/** Spoken summary of a week: "Week of 14 September (14–20 SEP), 4 pieces, 1 PR". */
export function weekAccessibilityLabel(week: { weekStart: string; weekEnd: string; pieces: readonly unknown[]; metrics: { records: number } }) {
  const pieces = countLabel(week.pieces.length, 'piece', 'pieces');
  const records = week.metrics.records ? `, ${recordLabel(week.metrics.records)}` : '';
  return `Week of ${formatDayA11y(week.weekStart)} (${formatDateRange(week.weekStart, week.weekEnd)}), ${pieces}${records}`;
}

/**
 * Moved volume. A single session always shows its full weight ("5,240 KG", "11,552 LB").
 * Aggregates (stack or week totals) use tonnes from 1,000 kg ("138.2 T"); lb stays whole pounds.
 */
export function formatMoved(kg: number, unit: WeightUnit, scope: 'session' | 'aggregate'): string | null {
  if (!(kg > 0)) return null;
  if (unit === 'lbs') {
    const rounded = Math.round(Number(formatWeight(kg, 'lbs')));
    return rounded > 0 ? `${rounded.toLocaleString('en-US')} LB` : null;
  }
  if (scope === 'aggregate' && kg >= 1000) return `${(kg / 1000).toFixed(1)} T`;
  const rounded = Math.round(kg);
  return rounded > 0 ? `${rounded.toLocaleString('en-US')} KG` : null;
}
export const formatMovedSession = (kg: number, unit: WeightUnit) => formatMoved(kg, unit, 'session');
export const formatMovedAggregate = (kg: number, unit: WeightUnit) => formatMoved(kg, unit, 'aggregate');

/** "85 kg × 5", "187.4 lbs × 8", "Bodyweight × 15". Trailing zeros are trimmed by formatWeight. */
export const formatLoadReps = (weightKg: number, reps: number, unit: WeightUnit) =>
  `${weightKg > 0 ? `${formatWeight(weightKg, unit)} ${unitLabel(unit)}` : 'Bodyweight'} × ${reps}`;

/**
 * The short training category for a piece ("Push", "Push + Legs", "Chest"), shared by every
 * Build sequence. Sessions without a split fall back to their first muscle group, then to
 * the piece's own label.
 */
export function pieceCategory(session: Pick<WorkoutSession, 'archetype' | 'secondaryArchetype' | 'workoutTypes'> | undefined, fallback: string) {
  if (session?.archetype) {
    const primary = ARCHETYPE_COMPOSITIONS[session.archetype].shortLabel;
    return session.secondaryArchetype ? `${primary} + ${ARCHETYPE_COMPOSITIONS[session.secondaryArchetype].shortLabel}` : primary;
  }
  const type = session?.workoutTypes[0];
  return type ? workoutMeta[type].shortLabel : fallback;
}
