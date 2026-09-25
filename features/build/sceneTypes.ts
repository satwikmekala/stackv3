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
  /** `onProgress` receives the clamped playback clock on every rendered frame (stall detection). */
  fusion?: { weekId: string; onPhase: (phase: FusionPhase) => void; onComplete: () => void; onProgress?: (playbackMs: number) => void };
  /** `animationTime` maps playback time to castingFrame time (readable-beat holds); identity when omitted. */
  casting?: { slabId: string; onPhase: (phase: CastingPhase) => void; onComplete: () => void; animationTime?: (playbackMs: number) => number; onProgress?: (playbackMs: number) => void };
  introStack?: { alreadyPlayed: boolean; onLanding: (index: number) => void; onComplete: () => void };
  introProgress?: {
    alreadyPlayed: boolean;
    onLanding: (index: number) => void;
    onGrowthStart: () => void;
    onSeamComplete: () => void;
    onComplete: () => void;
  };
  introFusion?: {
    alreadyPlayed: boolean;
    loosePieces: BuildSlab[];
    historyCount: number;
    onPressStart: () => void;
    onComplete: () => void;
  };
  introOverview?: {
    alreadyPlayed: boolean;
    onPullbackComplete: () => void;
    onComplete: () => void;
  };
  reducedMotion: boolean;
  benchmark: number;
  onStats: (stats: RenderStats) => void;
};
