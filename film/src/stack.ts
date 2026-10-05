// What the Build stage holds at time t: every slab's rest position, lift, and squash.
// Pure function of (format, t). The DOM lay-down transitions read the same numbers, so a card
// that lies flat hands over to its 3D slab at exactly the same place on screen.
import { BASE_HEIGHT, SLAB_GAP } from '../../features/build/model';
import { fusionFrame, FUSION_DURATION_MS } from '../../features/build/fusion';
import { BOUNCE_HEIGHT, BOUNCE_MS, GRAVITY, fallTime, impulse, outCubic, prog } from './ease';
import type { Format } from './formats';
import { cameraAt, uiOrigin } from './camera';
import { worldYAtScreen, CORNER_REACH, COS_ELEVATION, type Cam } from './projection';
import { BASE_Y, SET_COUNT, UI_REST_Y, WEEK_LAYOUT, setRestY } from './schedule';
import { EXERCISES, FINAL_WEEK, HISTORY, RAIN_WEEKS, SET_HEIGHT, SET_GAP, T, UI_SLAB_HEIGHT, WEEK_ONE, finalLanding, rainLand } from './timeline';
import { CARD_CENTER, UI_CENTER } from './ui/layout';

/** A card takes this long to lie flat before its slab takes over. */
export const LAY_S = 0.2;
export const UI_LAY_S = 0.3;
/** The press: the pile compresses into one piece over this long after the screen lands on it. */
export const PRESS_S = 0.42;

export type Flight = { handoff: number; landing: number; lift0: number; dx0: number };
export type SlabPose = { y: number; lift: number; dx: number; scaleY: number; visible: boolean; opacity?: number };

/** Remaining lift for a body released at `handoff` from `lift0`, with Build's bounce on landing. */
function flightLift(t: number, flight: Flight) {
  if (t < flight.landing) return Math.max(0, flight.lift0 - 0.5 * GRAVITY * (t - flight.handoff) ** 2);
  const local = (t - flight.landing) * 1000;
  return local < BOUNCE_MS ? BOUNCE_HEIGHT * 0.6 * Math.sin((Math.PI * local) / BOUNCE_MS) : 0;
}

/** A flat card centred at screen (x, y) becomes a slab whose top face sits there. */
function flightFrom(cam: Cam, screen: { x: number; y: number }, restTop: number, handoff: number): Flight {
  const lift0 = Math.max(0, worldYAtScreen(cam, screen.y) - restTop);
  return { handoff, landing: handoff + fallTime(lift0) / 1000, lift0, dx0: (screen.x - cam.ax) / cam.ppu };
}

const flights = new WeakMap<Format, { sets: Flight[]; ui: Flight; pieces: Flight[] }>();
/** Flight plans depend only on the camera at each handoff, which never depends on the stack. */
export function flightsFor(format: Format) {
  let plan = flights.get(format);
  if (plan) return plan;
  const sets = EXERCISES.flatMap((exercise, e) => exercise.logs.map((log, s) => {
    const index = e * 3 + s;
    const handoff = log + LAY_S;
    const cam = cameraAt(format, handoff);
    const origin = uiOrigin(format, cam);
    const screen = { x: origin.x + CARD_CENTER.x * cam.z, y: origin.y + CARD_CENTER.y * cam.z };
    return flightFrom(cam, screen, setRestY(index) + SET_HEIGHT * BASE_HEIGHT, handoff);
  }));
  const uiHandoff = T.layDown + UI_LAY_S;
  const uiCam = cameraAt(format, uiHandoff);
  const origin = uiOrigin(format, uiCam);
  const ui = flightFrom(uiCam, { x: origin.x + UI_CENTER.x * uiCam.z, y: origin.y + UI_CENTER.y * uiCam.z }, UI_REST_Y + UI_SLAB_HEIGHT * BASE_HEIGHT, uiHandoff);
  // Pull and Legs drop from just above the top of the frame onto the loose stack.
  const loose = looseLayout();
  const pieces = T.pieces.map((start, index) => {
    const y = loose[index + 1].y;
    const cam = cameraAt(format, start + 0.3);
    const lift0 = worldYAtScreen(cam, -40 * format.s) - y + CORNER_REACH / COS_ELEVATION;
    return { handoff: start, landing: start + fallTime(lift0) / 1000, lift0, dx0: 0 };
  });
  plan = { sets, ui, pieces };
  flights.set(format, plan);
  return plan;
}

/** Week one's pieces while the week is still open: Push, Pull, Legs stacked with the app's gap. */
export function looseLayout() {
  let y = BASE_Y;
  return WEEK_ONE.map((piece) => {
    const item = { y, height: piece.height };
    y += piece.height * BASE_HEIGHT + SLAB_GAP;
    return item;
  });
}

export const pressLand = (format: Format) => flightsFor(format).ui.landing;
export const fuseAt = (format: Format) => pressLand(format) + PRESS_S;
export const fusionElapsed = (t: number) => (t - T.fusion) * 1000 * T.fusionSpeed;
export const fusionDone = T.fusion + FUSION_DURATION_MS / T.fusionSpeed / 1000;

/** The pile of set layers (and the screen's slab on top) pressing into one piece. */
function pressPoses(format: Format, t: number): SlabPose[] {
  const plan = flightsFor(format);
  const fuse = fuseAt(format);
  const heights = [...Array(SET_COUNT).fill(SET_HEIGHT), UI_SLAB_HEIGHT];
  const total = heights.reduce((sum, h) => sum + h, 0);
  const c = outCubic(prog(t, pressLand(format), fuse));
  const scale = 1 + (WEEK_ONE[0].height / total - 1) * c;
  const gap = SET_GAP * (1 - c);
  let cursor = BASE_Y;
  return heights.map((height, index) => {
    const flight = index < SET_COUNT ? plan.sets[index] : plan.ui;
    const y = cursor;
    cursor += height * BASE_HEIGHT * scale + gap;
    const inFlight = t < flight.landing;
    return {
      y: inFlight ? (index < SET_COUNT ? setRestY(index) : UI_REST_Y) : y,
      lift: flightLift(t, flight),
      dx: flight.dx0 * (1 - prog(t, flight.handoff, flight.landing)),
      scaleY: inFlight ? 1 : scale,
      visible: t >= flight.handoff && t < fuse,
    };
  });
}

export type StackState = {
  press: SlabPose[];
  piece: { visible: boolean; y: number; pop: number };
  loose: SlabPose[];
  fusion: null | { lift: number; fused: boolean; pieces: { y: number; scaleY: number }[] };
  weekOne: boolean;
  rain: SlabPose[];
  final: SlabPose;
  /** Whole-tower squash on the final impact. */
  squash: number;
  goldReveal: number;
  goldGlow: number;
};

export function stackAt(format: Format, t: number): StackState {
  const plan = flightsFor(format);
  const fuse = fuseAt(format);
  const loose = looseLayout();
  const inFusion = t >= T.fusion && t < fusionDone;
  const frame = inFusion ? fusionFrame(fusionElapsed(t), WEEK_ONE, HISTORY[0].height) : null;

  const loosePoses: SlabPose[] = plan.pieces.map((flight, index) => ({
    y: loose[index + 1].y,
    lift: flightLift(t, flight),
    dx: 0,
    scaleY: 1,
    visible: t >= flight.handoff && t < T.fusion,
  }));

  const rain = RAIN_WEEKS.map((week, index): SlabPose => {
    const y = WEEK_LAYOUT[index + 1].y;
    const landing = rainLand(index);
    const cam = cameraAt(format, landing);
    // Build's own drops appear mid-air (never less than its 3.2-unit drop); here, just under the
    // Your Stack header so no week falls through the count.
    const lift0 = Math.max(1.2, worldYAtScreen(cam, format.rainFromY) - y);
    const flight = { handoff: landing - fallTime(lift0) / 1000, landing, lift0, dx0: 0 };
    return { y, lift: flightLift(t, flight), dx: 0, scaleY: 1, visible: t >= flight.handoff };
  });

  const finalY = WEEK_LAYOUT[HISTORY.length - 1].y;
  const finalFlight = { handoff: T.justStack, landing: finalLanding, lift0: 0.5 * GRAVITY * (T.finalFallMs / 1000) ** 2, dx0: 0 };
  void FINAL_WEEK;

  return {
    press: pressPoses(format, t),
    piece: { visible: t >= fuse && t < T.fusion, y: BASE_Y, pop: impulse(t, fuse, 0.05, 20, 38) },
    loose: loosePoses,
    fusion: frame ? { lift: frame.lift, fused: frame.fused, pieces: frame.pieces } : null,
    weekOne: t >= fusionDone,
    rain,
    final: { y: finalY, lift: flightLift(t, finalFlight), dx: 0, scaleY: 1, visible: t >= T.justStack },
    squash: impulse(t, finalLanding, 0.022, 13, 30),
    goldReveal: prog(t, T.gold[0], T.gold[1]),
    goldGlow: t < T.gold[1] ? 0 : Math.max(0, Math.sin(Math.PI * prog(t, T.gold[1], T.gold[1] + 0.18))),
  };
}
