// The sound-design cue sheet, generated from the same timeline as the picture.
// `scripts/sfx.mjs` renders a temp mix from it; a sound designer can use cues.json directly.
import { FORMATS } from '../formats';
import { EXERCISES, FINAL_WEEK, RAIN_WEEKS, T, finalLanding, rainLand } from '../timeline';
import { flightsFor, fuseAt, fusionDone, pressLand, LAY_S } from '../stack';

export type CueKind =
  | 'tap' | 'tick' | 'snap' | 'land' | 'roll' | 'whoosh' | 'success' | 'press' | 'fuse' | 'gold'
  | 'drop' | 'seal' | 'week' | 'rise' | 'silence' | 'impact' | 'card' | 'tone' | 'textDrop';
export type Cue = { t: number; kind: CueKind; note: string; level?: number; pitch?: number; length?: number };

export function buildCues(): Cue[] {
  const format = FORMATS.vertical;
  const plan = flightsFor(format);
  const cues: Cue[] = [
    { t: T.lift + 0.28, kind: 'textDrop', note: '"Lift." lands' },
    { t: T.logIt + 0.28, kind: 'textDrop', note: '"Log it." lands', pitch: 1.12 },
    { t: T.morph, kind: 'whoosh', note: '"Log it." travels into the button', level: 0.5 },
  ];
  EXERCISES.forEach((exercise, e) => {
    exercise.logs.forEach((log, s) => {
      const index = e * 3 + s;
      cues.push({ t: log, kind: 'tap', note: `Log it · ${exercise.name} set ${s + 1}` });
      cues.push({ t: log + 0.02, kind: 'tick', note: 'pip check', pitch: 1 + index * 0.025 });
      cues.push({ t: log + LAY_S, kind: 'snap', note: 'card lies flat → slab' });
      cues.push({ t: plan.sets[index].landing, kind: 'land', note: `set layer ${index + 1} lands`, pitch: 1 + index * 0.045 });
    });
    exercise.sets.forEach((set) => { if (set.plus !== undefined) cues.push({ t: set.plus, kind: 'roll', note: `weight rolls to ${set.w} kg` }); });
    cues.push({ t: exercise.moveOn, kind: e === EXERCISES.length - 1 ? 'tap' : 'whoosh', note: e === EXERCISES.length - 1 ? 'Finish workout' : 'move on', level: 0.6 });
  });
  cues.push(
    { t: T.pickerRelease, kind: 'success', note: 'slide to finish (Haptics success)' },
    { t: T.layDown + 0.3, kind: 'snap', note: 'screen lies flat', level: 1.2 },
    { t: pressLand(format), kind: 'press', note: 'the screen presses the pile' },
    { t: fuseAt(format), kind: 'fuse', note: 'one piece' },
    { t: T.gold[0], kind: 'gold', note: 'record seam draws', length: T.gold[1] - T.gold[0] + 0.3 },
    ...plan.pieces.map((flight, index) => ({ t: flight.landing, kind: 'drop' as const, note: `${['Pull', 'Legs'][index]} lands`, pitch: 1 + index * 0.12 })),
    { t: T.fusion + 2200 / T.fusionSpeed / 1000, kind: 'fuse', note: 'week presses into a layer', level: 0.8 },
    { t: T.fusion + 4000 / T.fusionSpeed / 1000, kind: 'seal', note: 'week sealed' },
    { t: T.rain[0] - 0.2, kind: 'rise', note: 'time-lapse bed swells', length: T.copyShowUp[1] - T.rain[0] + 0.2 },
    ...RAIN_WEEKS.map((_, index) => ({ t: rainLand(index), kind: 'week' as const, note: `week ${index + 2}`, pitch: 1 + index * 0.03, level: 0.55 + 0.45 * (index / RAIN_WEEKS.length) })),
    { t: T.copyShowUp[1], kind: 'silence', note: 'beat of silence before the payoff' },
    { t: T.dontSlack + 0.28, kind: 'textDrop', note: '"Don\'t slack." lands' },
    { t: finalLanding, kind: 'impact', note: `"Just stack." + final week (${FINAL_WEEK.layers.length} pieces) lands`, length: 1.6 },
    { t: T.logo + 0.3, kind: 'card', note: 'logo card 1' },
    { t: T.logo + 0.48, kind: 'card', note: 'logo card 2', pitch: 1.12 },
    { t: T.logo + 0.66, kind: 'card', note: 'logo card 3', pitch: 1.26 },
    { t: T.wordmark + 0.1, kind: 'tone', note: 'wordmark', length: 1.6 },
  );
  void fusionDone;
  return cues.sort((a, b) => a.t - b.t);
}
