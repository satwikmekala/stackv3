import { adaptBuildHistory } from './adapter';
import { makeMonolithDemo, MONOLITH_DEMO_NOW } from './monolithDemo';
import type { FusionSnapshot } from './FusionPresentation';

/** Preview never reads or writes the real fusion marker. */
export function makeFusionPreview(weeks: 12 | 104 | 260 = 12): FusionSnapshot {
  const { state } = adaptBuildHistory(makeMonolithDemo(weeks), MONOLITH_DEMO_NOW);
  return { state, weekId: state.sealedWeeks[state.sealedWeeks.length - 1].id, example: true };
}
