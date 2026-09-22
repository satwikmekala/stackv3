import type { FocusRange } from './monolithModel';
import type { BuildSlab, BuildTuning, Lamination } from './model';

export type RenderStats = { frames: number; fps: number; p95Ms: number; calls: number; triangles: number; geometries: number };
export type BuildSceneProps = {
  slabs: BuildSlab[];
  focusRange?: FocusRange;
  markers?: { id: string; y: number }[];
  onMarkers?: (markers: { id: string; top: number }[]) => void;
  onSelectSlab?: (id: string) => void;
  tuning: BuildTuning;
  lamination: Lamination;
  overview: boolean;
  paused?: boolean;
  reducedMotion: boolean;
  benchmark: number;
  onStats: (stats: RenderStats) => void;
};
