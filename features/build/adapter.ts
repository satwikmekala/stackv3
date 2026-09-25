import type { WorkoutSession } from '../../store/workoutStore';
import { deriveBuildState, type BuildRules, type BuildState } from './evidence';
import type { BuildSlab } from './model';

/** Same renderer contract for fixtures and saved history. No copies are written to storage. */
export function buildStateToSlabs(state: BuildState): BuildSlab[] {
  return [
    ...state.sealedWeeks.map((week): BuildSlab => ({
      id: week.id, height: week.compositeHeight, sealed: true,
      layers: week.pieces.map((piece) => ({ color: piece.color, height: piece.height, record: piece.records.length > 0 })),
    })),
    ...state.currentWeek.pieces.map((piece): BuildSlab => ({
      id: piece.id, height: piece.height, sealed: false,
      layers: [{ color: piece.color, height: piece.height, record: piece.records.length > 0 }],
    })),
  ];
}

export function adaptBuildHistory(sessions: readonly WorkoutSession[], now: Date, rules: Partial<BuildRules> = {}) {
  const state = deriveBuildState(sessions, now, rules);
  return { state, slabs: buildStateToSlabs(state) };
}
