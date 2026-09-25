import { CASTING_PHASE_STARTS, type CastingHold, type CastingPhase } from './casting';
import type { BuildPiece, ImprovedSet } from './evidence';
import { formatWeight, unitLabel, type WeightUnit } from '../../store/weightUnits';
import { countLabel, formatLoadReps, formatMovedSession } from './buildFormat';

/**
 * Display copy for the post-workout casting screen. Reads the evidence engine's existing
 * comparisons, records and metrics; it never decides what counts as progress or a PR.
 */
export type CastingBeat = 1 | 2 | 3 | 4;
export type ProgressRow = { delta: string; exercise: string; change: string };
export type CastingMetric = { value: string; label: string };
export type CastingCopy = {
  beats: CastingBeat[];
  pieceLabel: string;
  progress: { title: string; heading: string; rows: ProgressRow[]; more: string | null };
  record: { heading: string; lines: string[]; closing: string };
  landing: { title: string; subtitle: string; metrics: CastingMetric[]; baseline: string | null };
};

const MAX_PROGRESS_ROWS = 4;
const ORDINAL_WORDS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh'];

const trim = (value: number) => Number.isInteger(value) ? value.toString() : value.toFixed(1).replace(/\.0$/, '');

export function pieceOrdinal(position: number) {
  if (position >= 1 && position <= ORDINAL_WORDS.length) return ORDINAL_WORDS[position - 1];
  const tens = position % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[position % 10] ?? 'th';
  return `${position}${suffix}`;
}

/** The engine may mark several sets of one exercise as improved; show the one that moved most. */
function headlineSet(sets: ImprovedSet[]) {
  return sets.reduce((best, set) => {
    const load = set.current.weightKg - set.previous.weightKg;
    const bestLoad = best.current.weightKg - best.previous.weightKg;
    if (load !== bestLoad) return load > bestLoad ? set : best;
    return set.current.reps - set.previous.reps > best.current.reps - best.previous.reps ? set : best;
  });
}

export function progressRow(exercise: string, set: ImprovedSet, unit: WeightUnit): ProgressRow {
  const units = unitLabel(unit);
  if (set.current.weightKg > set.previous.weightKg) {
    const before = formatWeight(set.previous.weightKg, unit);
    const after = formatWeight(set.current.weightKg, unit);
    // Subtract the values as displayed so the delta always matches the two numbers beside it.
    const delta = Math.round((Number(after) - Number(before)) * 10) / 10;
    return { delta: `+${trim(delta)} ${units}`, exercise, change: `${before} → ${after} ${units}` };
  }
  const reps = set.current.reps - set.previous.reps;
  return { delta: `+${countLabel(reps, 'rep')}`, exercise, change: `${set.previous.reps} → ${set.current.reps}` };
}

export const recordLine = (record: BuildPiece['records'][number], unit: WeightUnit) =>
  `${record.exerciseName} · ${formatLoadReps(record.current.weight, record.current.reps, unit)}`;

export function castingCopy({ piece, category, weekPosition, firstEver, unit }: {
  piece: BuildPiece; category: string; weekPosition: number; firstEver: boolean; unit: WeightUnit;
}): CastingCopy {
  // Comparisons are already in the order the exercises were performed.
  const improved = piece.comparisons.filter((comparison) => comparison.improvedSets.length > 0);
  const rows = improved.slice(0, MAX_PROGRESS_ROWS).map((comparison) => progressRow(comparison.exerciseName, headlineSet(comparison.improvedSets), unit));
  const hidden = improved.length - rows.length;
  const beats: CastingBeat[] = [1];
  if (piece.metrics.liftsUp >= 1) beats.push(2);
  if (piece.records.length >= 1) beats.push(3);
  beats.push(4);
  const moved = formatMovedSession(piece.metrics.volumeKg, unit);
  const metrics: CastingMetric[] = [
    ...(moved ? [{ value: moved, label: 'MOVED' }] : []),
    ...(piece.metrics.liftsUp > 0 ? [{ value: String(piece.metrics.liftsUp), label: 'LIFTS UP' }] : []),
    ...(piece.metrics.records > 0 ? [{ value: String(piece.metrics.records), label: piece.metrics.records >= 2 ? 'PRS' : 'PR' }] : []),
  ];
  return {
    beats,
    pieceLabel: `${category.toUpperCase()} · DONE`,
    progress: { title: 'Better than\nlast time.', heading: 'WHAT MADE IT THICKER', rows, more: hidden > 0 ? `+${hidden} more` : null },
    record: {
      heading: piece.records.length > 1 ? 'NEW RECORDS' : 'NEW RECORD',
      lines: piece.records.map((record) => recordLine(record, unit)),
      closing: 'Your best yet.',
    },
    landing: {
      title: 'Stacked.',
      subtitle: firstEver ? 'Your first piece.' : `${pieceOrdinal(weekPosition)} piece this week.`,
      metrics,
      baseline: firstEver ? 'Every lift today sets your baseline.' : null,
    },
  };
}

/** The renderer phase each beat begins with. Beat 4 ("Stacked.") waits for the landing. */
const BEAT_PHASE: Record<CastingBeat, CastingPhase> = { 1: 'form', 2: 'progress', 3: 'gold', 4: 'land' };
/** Minimum time on screen for the beats with text to read. */
export const BEAT_MIN_MS: Partial<Record<CastingBeat, number>> = { 2: 2200, 3: 2000 };

/**
 * Each phase shows the latest beat this workout has earned, so an unearned beat simply
 * leaves the previous one on screen (the camera reveal keeps Beat 3, 2 or 1).
 */
export function beatForPhase(phase: CastingPhase | null, beats: readonly CastingBeat[]): CastingBeat {
  const reached: CastingBeat = phase === null || phase === 'form' ? 1 : phase === 'progress' ? 2 : phase === 'gold' || phase === 'reveal' ? 3 : 4;
  return beats.filter((beat) => beat <= reached).at(-1) ?? 1;
}

/**
 * Where playback must pause so an earned beat stays readable. The pause sits on the last
 * frame before the next beat's phase, so the piece keeps its grown height or drawn seam.
 * Workouts without Beats 2 and 3 get no holds and keep the original timing.
 */
export function beatHolds(beats: readonly CastingBeat[]): CastingHold[] {
  return beats.flatMap((beat, index) => {
    const next = beats[index + 1];
    const minimum = BEAT_MIN_MS[beat];
    if (!next || !minimum) return [];
    const nextStart = CASTING_PHASE_STARTS[BEAT_PHASE[next]];
    const shortfall = minimum - (nextStart - CASTING_PHASE_STARTS[BEAT_PHASE[beat]]);
    return shortfall > 0 ? [{ at: nextStart - 1, ms: shortfall }] : [];
  });
}

const spoken = (parts: (string | null | undefined)[]) =>
  `${parts.filter((part): part is string => Boolean(part)).map((part) => part.replace(/\n/g, ' ').replace(/\.$/, '')).join('. ')}.`;
/**
 * The static final screen (Reduce Motion, VoiceOver, Reduce effects, large text): the record
 * block when the workout earned one, then Beat 4 in full. Progression rows are omitted; the
 * LIFTS UP metric carries them.
 */
export function castingStaticContent(copy: CastingCopy) {
  return { record: copy.beats.includes(3) ? copy.record : null, landing: copy.landing };
}

/** Announced when the static final screen appears. Composed from the copy above; adds no wording. */
export function castingAnnouncement(copy: CastingCopy) {
  const { record } = castingStaticContent(copy);
  return spoken([
    ...(record ? [record.heading, ...record.lines, record.closing] : []),
    copy.landing.title, copy.landing.subtitle,
    ...copy.landing.metrics.map((metric) => `${metric.value} ${metric.label}`),
    copy.landing.baseline,
  ]);
}
