import { BASE_HEIGHT, layoutSlabs, type BuildSlab } from './model';
import type { BuildState } from './evidence';

/** Selection describes existing geometry; changing camera modes never rebuilds history. */
export function monolithWeeks(state: BuildState, slabs: BuildSlab[]) {
  const { items } = layoutSlabs(slabs);
  const byId = new Map(items.map((item) => [item.slab.id, item]));
  return [...state.sealedWeeks, state.currentWeek].map((week) => {
    const slabIds = week.sealed ? [week.id] : week.pieces.map((piece) => piece.id);
    const members = slabIds.flatMap((id) => byId.has(id) ? [byId.get(id)!] : []);
    return {
      week, slabIds,
      bottom: members[0]?.y ?? null,
      top: members.length ? members[members.length - 1].y + members[members.length - 1].slab.height * BASE_HEIGHT : null,
    };
  });
}

export type FocusRange = { bottom: number; top: number };
export function cameraFrame(top: number, width: number, height: number, overview: boolean, focus?: FocusRange) {
  const span = focus ? focus.top - focus.bottom : Math.min(top, 3.4);
  return {
    targetY: overview ? top / 2 : focus ? (focus.bottom + focus.top) / 2 : Math.max(0.3, top - 1.65),
    zoom: overview
      ? Math.min(width / 4.6, height / (top * 0.91 + 3.1))
      : Math.min(width / 4.6, height / (span * 0.91 + 3.1)),
  };
}

/**
 * Your Stack's Overview: the whole tower, as large as the stage allows and set a little low. On screen
 * the tower spans top·0.906 + 1.41 units tall and 3.32 wide (plinth corners included) under
 * the fixed camera angle; the fill leaves a small margin on every side.
 */
export function overviewFillFrame(top: number, width: number, height: number) {
  const zoom = Math.min(width * 0.84 / 3.32, height * 0.84 / (top * 0.906 + 1.41));
  // Sit the tower slightly low: raising the target by this much lowers it 5% of the stage.
  return { targetY: top / 2 + (height * 0.05) / (zoom * 0.906), zoom };
}

/** Keep the selected label, then pack nearby labels without overlapping touch targets. */
export function pickRulerMarkers(markers: { id: string; top: number }[], selectedId: string) {
  const result: typeof markers = [];
  const ordered = [...markers].sort((a, b) => Number(b.id === selectedId) - Number(a.id === selectedId) || b.top - a.top);
  for (const marker of ordered) if (result.every((other) => Math.abs(other.top - marker.top) >= 44)) result.push(marker);
  return result;
}
