// Where every slab rests, and when the stack's height changes. Camera framing depends only on
// this schedule (never on the camera itself), which keeps the whole film a pure function of time.
import { BASE_HEIGHT, SLAB_GAP, layoutSlabs } from '../../features/build/model';
import { smooth } from './ease';
import { FINAL_WEEK, HISTORY, RAIN_WEEKS, SET_GAP, SET_HEIGHT, T, finalLanding, rainLand } from './timeline';

/** layoutSlabs' first slab sits here, just above the plinth. */
export const BASE_Y = 0.12;
export const SET_COUNT = 12;
export const setRestY = (index: number) => BASE_Y + index * (SET_HEIGHT * BASE_HEIGHT + SET_GAP);
export const UI_REST_Y = setRestY(SET_COUNT);

/** Sealed history, laid out exactly as Your Stack lays it out. */
export const WEEK_LAYOUT = layoutSlabs(HISTORY).items;
export const weekTop = (index: number) => WEEK_LAYOUT[index].y + WEEK_LAYOUT[index].slab.height * BASE_HEIGHT;
export const FINAL_TOP = weekTop(HISTORY.length - 1);

/** A slab's height counts toward framing as it falls in, as in introOverview's overviewStackTop. */
const easeIn = (t: number, landing: number) => smooth(t, landing - 0.3, landing);

/** Top of the tower the camera must keep in frame during the time-lapse and payoff. */
export function stackTopForFit(t: number) {
  let top = weekTop(0);
  RAIN_WEEKS.forEach((week, index) => {
    top += (week.height * BASE_HEIGHT + SLAB_GAP) * easeIn(t, rainLand(index));
  });
  top += (FINAL_WEEK.height * BASE_HEIGHT + SLAB_GAP) * easeIn(t, finalLanding);
  return top;
}

/** Weeks built (sealed weeks with pieces) shown by the Your Stack counter. */
export function weeksBuilt(t: number) {
  const sealed = t >= T.fusion + 4000 / T.fusionSpeed / 1000 ? 1 : 0;
  return sealed + RAIN_WEEKS.filter((_, index) => t >= rainLand(index)).length + (t >= finalLanding ? 1 : 0);
}
