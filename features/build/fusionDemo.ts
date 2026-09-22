import { adaptBuildHistory } from './adapter';
import { makeMonolithDemo, MONOLITH_DEMO_NOW } from './monolithDemo';
import type { FusionSnapshot } from './FusionPresentation';

/** Preview never reads or writes the real fusion marker. */
export function makeFusionPreview(): FusionSnapshot {
  const { state } = adaptBuildHistory(makeMonolithDemo(12), MONOLITH_DEMO_NOW);
  return { state, weekId: state.sealedWeeks[state.sealedWeeks.length - 1].id, example: true };
}
