import type { WeightUnit } from '../../store/weightUnits';
import type { BuildPiece, BuildState, BuildWeek } from './evidence';
import type { CaseCard } from './caseModel';
import {
  countLabel, formatDateRange, formatDateRangeA11y, formatDateRangeTitle, formatDayA11y, formatLoadReps, formatMovedSession,
  formatWeekday,
} from './buildFormat';

/**
 * Display copy for the Case archive and its unpacked week. Reads the evidence engine's weeks
 * and pieces as derived; no comparisons between weeks and no zero metrics.
 */
const join = (parts: (string | null)[]) => parts.filter((part): part is string => Boolean(part)).join(' · ');

export function caseHeader(state: BuildState) {
  // Same count as "weeks built" on the Monolith: every finished week with a session in it.
  const shelved = state.sealedWeeks.filter((week) => week.pieces.length > 0).length;
  return {
    title: 'Your Case',
    count: shelved === 0 ? null : `${shelved} ${shelved === 1 ? 'WEEK' : 'WEEKS'}`,
    note: shelved === 0 ? 'Every finished week is kept here.' : null,
  };
}

export function caseCardCopy(card: CaseCard, unit: WeightUnit): { title: string; detail: string; a11y: string } {
  if (card.kind === 'empty') {
    return card.weeks === 1
      ? { title: formatDateRange(card.start, card.end), detail: 'NO SESSIONS', a11y: `Week of ${formatDayA11y(card.start)}, no sessions` }
      : { title: formatDateRange(card.start, card.end), detail: 'NO SESSIONS', a11y: `${formatDateRangeA11y(card.start, card.end)}, no sessions` };
  }
  const { week } = card;
  const stacks = countLabel(week.pieces.length, 'stack');
  return week.sealed
    ? { title: formatDateRange(week.weekStart, week.weekEnd), detail: join([stacks, formatMovedSession(week.metrics.volumeKg, unit)]), a11y: `Week of ${formatDayA11y(week.weekStart)}, ${stacks}` }
    : { title: 'THIS WEEK', detail: `${stacks} · OPEN`, a11y: `This week, open, ${stacks}` };
}

/** An unpacked week: its dates as the heading, then moved (in full), stacks and PRs as tiles. */
export function unpackedHeader(week: BuildWeek, unit: WeightUnit) {
  const count = week.pieces.length;
  const moved = formatMovedSession(week.metrics.volumeKg, unit);
  const { records } = week.metrics;
  const split = moved?.lastIndexOf(' ') ?? -1;
  return {
    title: week.sealed ? formatDateRangeTitle(week.weekStart, week.weekEnd) : 'This week',
    tiles: [
      ...(moved ? [{ value: moved.slice(0, split), label: `${moved.slice(split + 1)} MOVED` }] : []),
      { value: String(count), label: count === 1 ? 'STACK' : 'STACKS' },
      ...(records > 0 ? [{ value: String(records), label: records === 1 ? 'PR' : 'PRS' }] : []),
    ],
  };
}

/** A workout row: its name and weekday, then what it moved (or Bodyweight) and any PRs. */
export function pieceCardCopy(piece: BuildPiece, name: string, unit: WeightUnit) {
  const moved = formatMovedSession(piece.metrics.volumeKg, unit);
  const records = piece.records.map((record) => `${record.exerciseName} · ${formatLoadReps(record.current.weight, record.current.reps, unit)}`);
  return {
    title: `${name} · ${formatWeekday(piece.date)}`,
    detail: join([
      moved ? `${moved.toLowerCase()} moved` : 'Bodyweight',
      records.length ? `${records.length === 1 ? 'PR' : 'PRs'}: ${records.join(', ')}` : null,
    ]),
    a11y: `View ${name} summary, ${formatDayA11y(piece.date)}`,
  };
}
