import type { FusionPhase } from './fusion';
import type { CastingPhase } from './casting';
import type { FocusRange } from './monolithModel';
import type { BuildSlab, BuildTuning, Lamination } from './model';

export type RenderStats = { frames: number; fps: number; p95Ms: number; calls: number; triangles: number; geometries: number };
export type BuildSceneProps = {
  slabs: BuildSlab[];
  pieceGap?: number;
  focusRange?: FocusRange;
  markers?: { id: string; y: number }[];
  onMarkers?: (markers: { id: string; top: number }[]) => void;
  onSelectSlab?: (id: string) => void;
  tuning: BuildTuning;
  lamination: Lamination;
  overview: boolean;
  paused?: boolean;
  onError?: () => void;
  fusion?: { weekId: string; onPhase: (phase: FusionPhase) => void; onComplete: () => void };
  casting?: { slabId: string; onPhase: (phase: CastingPhase) => void; onComplete: () => void };
  reducedMotion: boolean;
  benchmark: number;
  onStats: (stats: RenderStats) => void;
};
