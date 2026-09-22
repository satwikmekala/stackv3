import { splitColors } from '../../constants/theme';

/** Scene inputs only. Training evidence is adapted into this contract. */
export type BuildLayer = { color: string; height: number; record: boolean };
export type BuildSlab = {
  id: string;
  height: number;
  layers: BuildLayer[];
  sealed: boolean;
};
export type Lamination = 'strata-inlay' | 'strata' | 'edge-grain';
export type BuildTuning = { chamfer: number; seam: number; compression: number };
export const DEFAULT_TUNING: BuildTuning = { chamfer: 0.24, seam: 0.022, compression: 0.35 };
export const HEIGHTS = [1, 1.15, 1.3, 1.45] as const;
export const HISTORY_PRESETS = [0, 1, 10, 50, 104, 260] as const;
export const BASE_HEIGHT = 0.28;
export const SLAB_GAP = 0.045;
export const GOLD = '#FFD35A';
export const CATEGORY_COLORS = Object.values(splitColors);

export function weeklyHeight(layers: readonly BuildLayer[], compression: number, min = 0.75, max = 2.5): number {
  return Math.min(max, Math.max(min, layers.reduce((sum, layer) => sum + layer.height, 0) * compression));
}

/** Deterministic demo data; never inserted into SQLite or the workout store. */
export function makeHistoryFixture(weeks: number, compression = DEFAULT_TUNING.compression): BuildSlab[] {
  if (!Number.isInteger(weeks) || weeks < 0 || weeks > 260) throw new Error('Fixture requires 0–260 weeks');
  if (weeks === 0) return [];
  const slabs: BuildSlab[] = Array.from({ length: weeks }, (_, week) => {
    const layers = Array.from({ length: 2 + week % 4 }, (_, session) => ({
      color: CATEGORY_COLORS[(week + session) % CATEGORY_COLORS.length],
      height: HEIGHTS[(week * 3 + session) % HEIGHTS.length],
      record: (week * 5 + session) % 13 === 0,
    }));
    return { id: `week-${week + 1}`, sealed: true, layers, height: weeklyHeight(layers, compression) };
  });
  return [...slabs, ...[0, 1].map((index): BuildSlab => ({
    id: `current-${index + 1}`, sealed: false, height: HEIGHTS[index + 1],
    layers: [{ color: CATEGORY_COLORS[index], height: HEIGHTS[index + 1], record: index === 0 }],
  }))];
}

export function makeObjectFixture(bucket: number, record: boolean, sealed: boolean, compression: number): BuildSlab[] {
  const layers: BuildLayer[] = sealed
    ? [0, 1, 2, 3].map((index) => ({ color: CATEGORY_COLORS[index], height: HEIGHTS[index], record: record && index === 2 }))
    : [{ color: splitColors.chest, height: HEIGHTS[bucket] ?? 1, record }];
  return [{ id: 'object', sealed, layers, height: sealed ? weeklyHeight(layers, compression) : layers[0].height }];
}

export function layoutSlabs(slabs: readonly BuildSlab[]) {
  let top = 0.12;
  const items = slabs.map((slab) => {
    const y = top;
    top += slab.height * BASE_HEIGHT + SLAB_GAP;
    return { slab, y };
  });
  return { items, top };
}
