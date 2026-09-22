import type { BuildSlab, BuildTuning, Lamination } from './model';

export type RenderStats = { frames: number; fps: number; p95Ms: number; calls: number; triangles: number; geometries: number };
export type BuildSceneProps = {
  slabs: BuildSlab[];
  tuning: BuildTuning;
  lamination: Lamination;
  overview: boolean;
  reducedMotion: boolean;
  benchmark: number;
  onStats: (stats: RenderStats) => void;
};
