import type { BuildState } from './evidence';
import type { BuildLayer } from './model';
import { BASE_HEIGHT, SLAB_GAP } from './model';
import type { PresentationStorage } from './casting';
import { getStartOfWeek, parseSessionDate, toLocalCalendarDate } from '../../store/workoutCalendar';

export const FUSION_MARKER_KEY = 'stack.build.fusion.v1';
export type FusionMarker = { version: 1; observedWeek: string };
export type FusionPhase = 'isolate' | 'compress' | 'fuse' | 'seat' | 'sealed';
export const FUSION_DURATION_MS = 4800;

export function readFusionMarker(raw: string | null): FusionMarker | null {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (value?.version !== 1 || typeof value.observedWeek !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.observedWeek)) return null;
    const date = parseSessionDate(value.observedWeek);
    return Number.isFinite(date.getTime()) && toLocalCalendarDate(getStartOfWeek(date)) === value.observedWeek ? value : null;
  } catch { return null; }
}

/**
 * All historical weeks are already sealed. This only chooses one optional presentation: the
 * most recent unseen week with at least one piece. Every other unseen week is seen silently.
 * `builtBefore` is the weeks-built count the user last saw (weeks sealed before the previous
 * observed week), so the ceremony can count up to the new total including silent weeks.
 */
export function reconcileFusion(state: BuildState, previous: FusionMarker | null) {
  const current = state.currentWeek.weekStart;
  const observedWeek = previous && previous.observedWeek > current ? previous.observedWeek : current;
  const built = state.sealedWeeks.filter((week) => week.pieces.length > 0);
  const latest = previous && current > previous.observedWeek
    ? built.filter((week) => week.weekStart >= previous.observedWeek && week.weekStart < current).at(-1)
    : undefined;
  const builtBefore = previous ? built.filter((week) => week.weekStart < previous.observedWeek).length : built.length;
  return { marker: { version: 1 as const, observedWeek }, weekId: latest?.id ?? null, builtBefore };
}

/**
 * Serialize reads/claims across remounts. A presented week is held in memory: commit() persists
 * it (final beat shown or Skip), release() lets it play again on the next entry. Silent updates
 * (first entry, weeks with nothing to present) persist straight away. The last known marker is
 * kept in memory for Home, which never reads storage or derives history to know a close is pending.
 */
export function createFusionCoordinator(storage: PresentationStorage) {
  let tail: Promise<unknown> = Promise.resolve();
  let held: FusionMarker | null = null;
  /** undefined until the first read settles. */
  let known: FusionMarker | null | undefined;
  let loading: Promise<FusionMarker | null> | undefined;
  const listeners = new Set<() => void>();
  const publish = (marker: FusionMarker | null) => { known = marker; listeners.forEach((listener) => listener()); };
  const serial = <T,>(task: () => Promise<T>): Promise<T> => { const run = tail.then(task); tail = run.catch(() => {}); return run; };
  /** `isStale`: the entry that asked has since ended, so nothing is held for it. */
  const claim = (state: BuildState, isStale: () => boolean = () => false): Promise<{ weekId: string; builtBefore: number } | null> => serial(async () => {
    if (held) return null;
    const previous = readFusionMarker(await storage.getItem(FUSION_MARKER_KEY));
    if (known === undefined) publish(previous);
    const result = reconcileFusion(state, previous);
    if (result.weekId) {
      if (isStale()) return null;
      held = result.marker;
      return { weekId: result.weekId, builtBefore: result.builtBefore };
    }
    if (!previous || previous.observedWeek !== result.marker.observedWeek) {
      await storage.setItem(FUSION_MARKER_KEY, JSON.stringify(result.marker));
      publish(result.marker);
    }
    return null;
  }).catch(() => null);
  const commit = () => serial(async () => {
    const marker = held;
    held = null;
    if (!marker) return;
    await storage.setItem(FUSION_MARKER_KEY, JSON.stringify(marker));
    publish(marker);
  });
  return {
    /** The week to present (if any) and the weeks-built count before it closed. Held until commit/release. */
    claim,
    /** Persist the held week: its final beat was shown, or the user skipped. Rejects if storage fails. */
    commit,
    /** Forget the held week without persisting, so the next entry presents it again. */
    release() { held = null; },
    /** Claim and persist in one step (no presentation in between). */
    reconcile: async (state: BuildState): Promise<string | null> => {
      const claimed = await claim(state);
      if (!claimed) return null;
      try { await commit(); return claimed.weekId; } catch { return null; }
    },
    load(): Promise<FusionMarker | null> {
      if (known !== undefined) return Promise.resolve(known);
      return loading ??= storage.getItem(FUSION_MARKER_KEY).then(readFusionMarker, () => null)
        .then((marker) => { if (known === undefined) publish(marker); return known ?? null; });
    },
    getSnapshot: () => known,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
const ease = (elapsed: number, start: number, end: number) => {
  const t = Math.max(0, Math.min(1, (elapsed - start) / (end - start)));
  return t * t * (3 - 2 * t);
};
/** Pieces peel off one after another, top first, this far apart (shortened for tall weeks). */
const LIFT_STAGGER_MS = 110;
/** The lifted pieces hover this much further apart before they press together. */
const HOVER_SPREAD = 0.12;
/**
 * Transform only the selected week's temporary meshes, then replace them with its composite.
 * isolate: the pieces peel off one by one, top first, and hover apart; compress: they close the gaps and
 * press to the week's height; fuse: one block; seat: it settles back onto the tower.
 */
export function fusionFrame(elapsed: number, layers: readonly BuildLayer[], compositeHeight: number) {
  const compression = ease(elapsed, 900, 2200);
  const total = layers.reduce((sum, layer) => sum + layer.height, 0);
  const scale = 1 + (compositeHeight / total - 1) * compression;
  const lift = 1.1 * ease(elapsed, 0, 850) * (1 - ease(elapsed, 2900, 4000));
  // Every piece has finished its own lift by 1.2 s, well before the gaps close.
  const stagger = layers.length > 1 ? Math.min(LIFT_STAGGER_MS, 350 / (layers.length - 1)) : 0;
  const spread = HOVER_SPREAD * ease(elapsed, 200, 900) * (1 - ease(elapsed, 900, 1700));
  let cursor = 0;
  const pieces = layers.map((layer, index) => {
    // Top first, so a piece never rises through one still resting on it: each is held back by
    // how far its own later lift trails the group's.
    const delay = (layers.length - 1 - index) * stagger;
    const lag = 1.1 * Math.max(0, ease(elapsed, 0, 850) - ease(elapsed, delay, delay + 850));
    const y = cursor - lag;
    cursor += layer.height * BASE_HEIGHT * scale + SLAB_GAP * (1 - compression) + spread;
    return { y, scaleY: scale };
  });
  const phase: FusionPhase = elapsed < 900 ? 'isolate' : elapsed < 2200 ? 'compress' : elapsed < 2900 ? 'fuse' : elapsed < 4000 ? 'seat' : 'sealed';
  return {
    phase, pieces, fused: elapsed >= 2200,
    height: cursor - (layers.length ? SLAB_GAP * (1 - compression) + spread : 0),
    lift,
    seated: elapsed >= 4000, done: elapsed >= FUSION_DURATION_MS,
  };
}

/** The tallest the lifted week gets (hovering apart), for framing the camera around it. */
export const fusionPeakHeight = (layers: readonly BuildLayer[], compositeHeight: number) =>
  Math.max(fusionFrame(0, layers, compositeHeight).height, fusionFrame(900, layers, compositeHeight).height);

/** Keep every block intersecting the camera's conservative lower margin. */
export function fusionVisibleHistory<T extends { y: number; slab: { height: number } }>(items: readonly T[], selectedY: number, targetY: number, viewportHeight: number, zoom: number): T[] {
  const bottom = targetY - viewportHeight / Math.max(zoom, 0.001) - 4;
  return items.filter((item) => item.y < selectedY && item.y + item.slab.height * BASE_HEIGHT >= bottom);
}
