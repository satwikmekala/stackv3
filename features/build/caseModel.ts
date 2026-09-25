import { getStartOfWeek, parseSessionDate, toLocalCalendarDate } from '../../store/workoutCalendar';
import type { BuildState, BuildWeek } from './evidence';
import type { BuildSlab } from './model';

export type CaseEntry = { id: string; weekStart: string; week: BuildWeek | null };
/** Calendar stepping (rather than milliseconds) preserves local weeks across DST. */
export function caseEntries(state: BuildState): CaseEntry[] {
  const active = [...state.sealedWeeks, state.currentWeek].filter((week) => week.pieces.length);
  if (!active.length) return [];
  const byDate = new Map(active.map((week) => [week.weekStart, week]));
  const cursor = getStartOfWeek(parseSessionDate(active[0].weekStart));
  const last = active[active.length - 1].weekStart;
  const result: CaseEntry[] = [];
  while (toLocalCalendarDate(cursor) <= last) {
    const date = toLocalCalendarDate(cursor);
    result.push({ id: `case:${date}`, weekStart: date, week: byDate.get(date) ?? null });
    cursor.setDate(cursor.getDate() + 7);
  }
  return result.reverse();
}
export function unpackWeek(week: BuildWeek): BuildSlab[] {
  return week.pieces.map((piece) => ({ id: piece.id, height: piece.height, sealed: false,
    layers: [{ color: piece.color, height: piece.height, record: piece.records.length > 0 }] }));
}

export type CaseCard =
  | { id: string; kind: 'week'; week: BuildWeek }
  /** One card per run of consecutive empty weeks: Monday of the first to Sunday of the last. */
  | { id: string; kind: 'empty'; start: string; end: string; weeks: number };
const sunday = (weekStart: string) => {
  const date = parseSessionDate(weekStart);
  date.setDate(date.getDate() + 6);
  return toLocalCalendarDate(date);
};
/** Collapses empty runs within the caseEntries() range; the range itself is unchanged. Newest first. */
export function caseCards(entries: readonly CaseEntry[]): CaseCard[] {
  const cards: CaseCard[] = [];
  for (const entry of entries) {
    const previous = cards.at(-1);
    if (entry.week) cards.push({ id: entry.id, kind: 'week', week: entry.week });
    // Entries run newest first, so each further empty week extends the run backwards in time.
    else if (previous?.kind === 'empty') cards[cards.length - 1] = { ...previous, start: entry.weekStart, weeks: previous.weeks + 1 };
    else cards.push({ id: entry.id, kind: 'empty', start: entry.weekStart, end: sunday(entry.weekStart), weeks: 1 });
  }
  return cards;
}
