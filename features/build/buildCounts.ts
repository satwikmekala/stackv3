import { getVerifiedSessions } from '../../store/verifiedSessions';
import { getStartOfWeek, parseSessionDate, toLocalCalendarDate } from '../../store/workoutCalendar';
import type { WorkoutSession } from '../../store/workoutStore';
import type { FusionMarker } from './fusion';

/** `sealedWeekStarts`: every sealed week with at least one piece, oldest first. */
export type BuildCounts = { weeksBuilt: number; piecesThisWeek: number; hasHistory: boolean; sealedWeekStarts: string[] };

/**
 * The Home card's numbers without running the evidence engine. Applies the same session
 * filters as deriveBuildState (verified, unique ID, valid date, not in a future week), so
 * weeksBuilt = sealed weeks with at least one piece and piecesThisWeek = the current week's
 * pieces, exactly as derived.
 */
export function buildCounts(sessions: readonly WorkoutSession[], currentWeekStart: string): BuildCounts {
  const weekById = new Map<string, string>();
  const seen = new Set<string>();
  for (const session of getVerifiedSessions(sessions)) {
    // Duplicate IDs keep the first row, as the derivation does.
    if (seen.has(session.id)) continue;
    seen.add(session.id);
    const date = parseSessionDate(session.date);
    if (!Number.isFinite(date.getTime()) || (/^\d{4}-\d{2}-\d{2}$/.test(session.date) && toLocalCalendarDate(date) !== session.date)) continue;
    const weekStart = toLocalCalendarDate(getStartOfWeek(date));
    if (weekStart <= currentWeekStart) weekById.set(session.id, weekStart);
  }
  const sealed = new Set<string>();
  let piecesThisWeek = 0;
  for (const weekStart of weekById.values()) {
    if (weekStart === currentWeekStart) piecesThisWeek++;
    else sealed.add(weekStart);
  }
  return { weeksBuilt: sealed.size, piecesThisWeek, hasHistory: weekById.size > 0, sealedWeekStarts: [...sealed].sort() };
}

export type PendingWeekClose = { builtBefore: number; weekStart: string; previousWeek: boolean };
/**
 * A week close fusion has not presented yet, from the counts alone. Mirrors reconcileFusion:
 * the latest built week at or after the observed week and before this one, and builtBefore =
 * built weeks before the observed week. No marker (Build never entered) means nothing pending.
 */
export function pendingWeekClose(counts: Pick<BuildCounts, 'sealedWeekStarts'>, currentWeekStart: string, marker: FusionMarker | null | undefined): PendingWeekClose | null {
  if (!marker || !(currentWeekStart > marker.observedWeek)) return null;
  const weekStart = counts.sealedWeekStarts.filter((week) => week >= marker.observedWeek && week < currentWeekStart).at(-1);
  if (!weekStart) return null;
  const previous = parseSessionDate(currentWeekStart);
  previous.setDate(previous.getDate() - 7);
  return {
    builtBefore: counts.sealedWeekStarts.filter((week) => week < marker.observedWeek).length,
    weekStart,
    previousWeek: weekStart === toLocalCalendarDate(previous),
  };
}
