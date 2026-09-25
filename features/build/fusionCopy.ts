import type { BuildPiece, BuildState } from './evidence';
import type { FusionPhase } from './fusion';
import type { WeightUnit } from '../../store/weightUnits';
import { countLabel, formatDateRange, formatMovedAggregate, formatMovedSession, formatWeekday, spelledCount } from './buildFormat';

/**
 * Display copy for the week-close sequence. Reads the sealed week exactly as the evidence
 * engine derived it; it never seals, compresses or compares anything new.
 */
export type FusionBeat = 1 | 2 | 3;
export type FusionRow = { title: string; detail: string };
export type FusionCopy = {
  week: { range: string; title: string; rows: FusionRow[] };
  sealed: { kicker: string; title: string; summary: string; thickest: string | null };
  stack: { label: string; before: number; after: number };
};

export const weeksBuilt = (count: number) => `${countLabel(count, 'week')} built`;
/** The weeks-built number shown `progress` (0–1) of the way through the count-up. */
export const builtCount = ({ before, after }: { before: number; after: number }, progress: number) =>
  after <= before ? after : before + Math.round((after - before) * Math.max(0, Math.min(1, progress)));

function pieceRow(piece: BuildPiece, category: string, unit: WeightUnit): FusionRow {
  const moved = formatMovedSession(piece.metrics.volumeKg, unit);
  const lifts = piece.metrics.liftsUp;
  return {
    title: `${category} · ${formatWeekday(piece.date)}`,
    detail: [
      moved?.toLowerCase() ?? null,
      lifts > 0 ? `${countLabel(lifts, 'lift')} up` : null,
      piece.records.length > 1 ? 'PRs' : piece.records.length === 1 ? 'PR' : null,
    ].filter((value): value is string => Boolean(value)).join(' · '),
  };
}

export function fusionCopy({ state, weekId, unit, category, builtBefore }: {
  state: BuildState; weekId: string; unit: WeightUnit; category: (piece: BuildPiece) => string; builtBefore: number;
}): FusionCopy | null {
  const week = state.sealedWeeks.find((item) => item.id === weekId);
  if (!week || !week.pieces.length) return null;
  const range = formatDateRange(week.weekStart, week.weekEnd);
  const count = week.pieces.length;
  const moved = formatMovedAggregate(week.metrics.volumeKg, unit);
  const records = week.metrics.records;
  // Strictly thicker than every earlier sealed week, using the heights already derived.
  const built = state.sealedWeeks.filter((item) => item.pieces.length > 0);
  const earlier = built.filter((item) => item.weekStart < week.weekStart);
  const thickest = earlier.length > 0 && earlier.every((item) => week.compositeHeight > item.compositeHeight);
  return {
    // Pieces are already in chronological order within their week.
    week: { range, title: count === 1 ? 'One piece.' : `${spelledCount(count)} pieces.`, rows: week.pieces.map((piece) => pieceRow(piece, category(piece), unit)) },
    sealed: {
      kicker: `${range} · SEALED`,
      title: 'One week.\nOne layer.',
      summary: [
        `${count} ${count === 1 ? 'PIECE' : 'PIECES'}`,
        moved ? `${moved} MOVED` : null,
        records > 0 ? `${records} ${records >= 2 ? 'PRS' : 'PR'}` : null,
      ].filter((value): value is string => Boolean(value)).join(' · '),
      thickest: thickest ? 'Your thickest layer yet.' : null,
    },
    stack: { label: 'YOUR STACK', before: Math.min(builtBefore, built.length), after: built.length },
  };
}

/** Beat 1 while the pieces lift clear, its text held through the press (Beat 2), sealed once the block seats. */
export function fusionBeat(phase: FusionPhase | null): FusionBeat {
  return phase === null || phase === 'isolate' ? 1 : phase === 'compress' || phase === 'fuse' ? 2 : 3;
}

/** The static sealed screen: Beat 3 in full with the weeks-built count at its final value. */
export function fusionStaticContent(copy: FusionCopy) {
  return { sealed: copy.sealed, stackLabel: copy.stack.label, built: weeksBuilt(copy.stack.after) };
}

/** Announced when the static sealed screen appears. Composed from the copy above; adds no wording. */
export function fusionAnnouncement(copy: FusionCopy) {
  const content = fusionStaticContent(copy);
  return `${[content.sealed.title, content.sealed.summary, content.sealed.thickest, content.built]
    .filter((part): part is string => Boolean(part)).map((part) => part.replace(/\n/g, ' ').replace(/\.$/, '')).join('. ')}.`;
}
