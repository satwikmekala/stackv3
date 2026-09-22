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

/** All historical weeks are already sealed. This only chooses one optional presentation. */
export function reconcileFusion(state: BuildState, previous: FusionMarker | null) {
  const current = state.currentWeek.weekStart;
  const observedWeek = previous && previous.observedWeek > current ? previous.observedWeek : current;
  const latest = previous && current > previous.observedWeek
    ? state.sealedWeeks.filter((week) => week.weekStart >= previous.observedWeek && week.weekStart < current).at(-1)
    : undefined;
  return { marker: { version: 1 as const, observedWeek }, weekId: latest?.id ?? null };
}

/** Serialize reads/claims across remounts. Persist before animation, never after it. */
export function createFusionCoordinator(storage: PresentationStorage) {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    reconcile(state: BuildState): Promise<string | null> {
      const run = tail.then(async () => {
        const raw = await storage.getItem(FUSION_MARKER_KEY);
        const previous = readFusionMarker(raw);
        const result = reconcileFusion(state, previous);
        if (!previous || previous.observedWeek !== result.marker.observedWeek) {
          await storage.setItem(FUSION_MARKER_KEY, JSON.stringify(result.marker));
        }
        return result.weekId;
      }).catch(() => null);
      tail = run;
      return run;
    },
  };
}
const ease = (elapsed: number, start: number, end: number) => {
  const t = Math.max(0, Math.min(1, (elapsed - start) / (end - start)));
  return t * t * (3 - 2 * t);
};
/** Transform only the selected week's temporary meshes, then replace them with its composite. */
export function fusionFrame(elapsed: number, layers: readonly BuildLayer[], compositeHeight: number) {
  const compression = ease(elapsed, 900, 2200);
  const total = layers.reduce((sum, layer) => sum + layer.height, 0);
  const scale = 1 + (compositeHeight / total - 1) * compression;
  let cursor = 0;
  const pieces = layers.map((layer) => {
    const y = cursor;
    cursor += layer.height * BASE_HEIGHT * scale + SLAB_GAP * (1 - compression);
    return { y, scaleY: scale };
  });
  const phase: FusionPhase = elapsed < 900 ? 'isolate' : elapsed < 2200 ? 'compress' : elapsed < 2900 ? 'fuse' : elapsed < 4000 ? 'seat' : 'sealed';
  return {
    phase, pieces, fused: elapsed >= 2200,
    height: cursor - (layers.length ? SLAB_GAP * (1 - compression) : 0),
    lift: 1.1 * ease(elapsed, 0, 850) * (1 - ease(elapsed, 2900, 4000)),
    seated: elapsed >= 4000, done: elapsed >= FUSION_DURATION_MS,
  };
}
