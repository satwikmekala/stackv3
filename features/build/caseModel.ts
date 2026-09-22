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
