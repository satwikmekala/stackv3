// The film's single source of timing and content. Every scene reads from here, and the sound
// cue sheet is generated from the same numbers, so picture and sound can never drift apart.
import { redesignColors, splitColors, workoutLoggingColors } from '../../constants/theme';
import { HEIGHTS, weeklyHeight, DEFAULT_TUNING } from '../../features/build/model';

export const FPS = 30;
export const DURATION = 33.0;

/** Push day: the archetype colour is chest's (constants/archetypes.ts). */
export const ACCENT = workoutLoggingColors.chest;

// ─── Workout content ────────────────────────────────────────────────────────
// Real exercises from store/workoutDatabase.ts, three sets each (the app default).
// `plus`: the time the weight stepper's + is tapped on that set (value rolls by the 2.5 kg increment).
export type WorkoutSet = { w: number; r: number; from?: number; plus?: number };
export type ExercisePlan = { name: string; info: boolean; sets: WorkoutSet[]; logs: number[]; moveOn: number };
export const EXERCISES: ExercisePlan[] = [
  {
    name: 'Bench Press', info: true,
    sets: [{ w: 80, r: 8 }, { w: 80, r: 8 }, { w: 82.5, r: 8, from: 80, plus: 5.72 }],
    logs: [3.2, 4.8, 6.6],
    moveOn: 7.55,
  },
  {
    name: 'Incline Dumbbell Press', info: true,
    sets: [{ w: 30, r: 10 }, { w: 30, r: 10 }, { w: 32.5, r: 10, from: 30, plus: 9.08 }],
    logs: [8.3, 8.85, 9.42],
    moveOn: 9.86,
  },
  {
    name: 'Overhead Press', info: false,
    sets: [{ w: 45, r: 8 }, { w: 45, r: 8 }, { w: 45, r: 8 }],
    logs: [10.3, 10.72, 11.1],
    moveOn: 11.45,
  },
  {
    name: 'Tricep Pushdown', info: false,
    sets: [{ w: 30, r: 12 }, { w: 30, r: 12 }, { w: 30, r: 12 }],
    logs: [11.85, 12.17, 12.48],
    moveOn: 12.84, // "Finish workout"
  },
];
/** When each exercise's title/body enters. Exercise 0 is assembled by the hook. */
export const exerciseEnter = (index: number) => (index === 0 ? T.uiIn : EXERCISES[index - 1].moveOn);
/** How long before a tap the touch indicator arrives. */
export const touchLead = (t: number) => (t < 7.8 ? 0.34 : 0.2);

// ─── Master timeline (seconds) ──────────────────────────────────────────────
export const T = {
  // 1 · Hook
  lift: 0.15,
  logIt: 0.75,
  morph: 1.45, // "Log it." travels into the button
  uiIn: 1.55,
  // 2 · Logging
  pullBack: [3.28, 4.25],
  copySet: [3.95, 6.25],
  // 3 · Momentum
  copyThink: [8.15, 10.65],
  picker: 12.84,
  pickerTouch: 13.3,
  pickerDrag: [13.42, 13.82],
  pickerRelease: 13.98,
  // 4 · Transformation
  layDown: 14.1,
  kickerPush: 14.72,
  gold: [15.28, 15.78],
  toBuild: [14.95, 16.3],
  copyWorkout: [15.85, 18.35],
  pieces: [16.62, 17.3], // Pull, Legs drop starts
  // 5 · Time
  fusion: 18.3,
  fusionSpeed: 2.6,
  rain: [20.25, 24.25],
  pullOut: [20.1, 24.7],
  metrics: 24.05,
  copyShowUp: [24.75, 27.1],
  // 6 · Payoff
  dontSlack: 27.25,
  justStack: 27.87, // final week starts falling; lands with the line
  finalFallMs: 600,
  // End
  end: 30.1,
  logo: 30.4,
  wordmark: 31.3,
  tagline: 31.72,
};
export const finalLanding = T.justStack + T.finalFallMs / 1000;

// ─── Build content ──────────────────────────────────────────────────────────
export const BUILD_TUNING = DEFAULT_TUNING;
/** A set layer's slab thickness (BuildSlab height units, ×0.28 world units each). */
export const SET_HEIGHT = 0.36;
export const SET_GAP = 0.022;
/** The workout-completion slab (the whole screen, laid flat). */
export const UI_SLAB_HEIGHT = 0.5;

/** Week 1 is the week this film's workout belongs to: Push (today), Pull, Legs. */
export const WEEK_ONE = [
  { label: 'Push', color: splitColors.chest, height: HEIGHTS[2], record: true },
  { label: 'Pull', color: splitColors.back, height: HEIGHTS[1], record: false },
  { label: 'Legs', color: splitColors.legs, height: HEIGHTS[1], record: false },
];

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic training history for the time-lapse: a Push/Pull/Legs lifter (weekly goal 3,
 * the app's intermediate archetype sequence), with the occasional fourth session, busy weeks
 * with one or two, and progress that makes later pieces thicker more often.
 */
export const HISTORY = (() => {
  const random = mulberry32(20260105);
  const rotation = [
    { label: 'Push', color: splitColors.chest },
    { label: 'Pull', color: splitColors.back },
    { label: 'Legs', color: splitColors.legs },
  ];
  const weeks: { layers: Layer[] }[] = [{ layers: WEEK_ONE.map(({ color, height, record }) => ({ color, height, record })) }];
  for (let week = 1; week < 36; week++) {
    const roll = random();
    const count = week % 11 === 6 ? 1 : roll < 0.14 ? 2 : roll < 0.8 ? 3 : 4;
    const trend = week / 36;
    const layers = Array.from({ length: count }, (_, index) => {
      const pick = random() + trend * 0.45;
      const bucket = pick < 0.35 ? 0 : pick < 0.7 ? 1 : pick < 1.05 ? 2 : 3;
      return { color: rotation[index % 3].color, height: HEIGHTS[bucket], record: random() < 0.09 + trend * 0.05 };
    });
    weeks.push({ layers });
  }
  return weeks.map((week, index) => ({
    id: `week-${index + 1}`,
    sealed: true,
    layers: week.layers,
    height: weeklyHeight(week.layers, DEFAULT_TUNING.compression),
  }));
})();
/** Weeks that rain in during the time-lapse (after week one); the last history week is the payoff drop. */
export const RAIN_WEEKS = HISTORY.slice(1, -1);
export const FINAL_WEEK = HISTORY[HISTORY.length - 1];

/** When rain week i lands: an accelerating cadence (≈240 ms apart, closing to ≈55 ms). */
export const rainLand = (index: number) => {
  const n = RAIN_WEEKS.length;
  const [a, b] = T.rain;
  const u = index / (n - 1);
  // Integral of a linearly shrinking interval, normalised into the rain window.
  const shape = (x: number) => (x * (1 - 0.38 * x)) / (1 - 0.38);
  return a + (b - a) * shape(u);
};

/** Monolith header metrics for the finished history (Monolith.tsx headerMetrics format). */
export const HISTORY_METRICS = (() => {
  const random = mulberry32(77);
  let workouts = 0; let volume = 0; let records = 0;
  for (const week of HISTORY) for (const layer of week.layers) {
    workouts += 1;
    volume += 5200 + random() * 4200 + layer.height * 900;
    if (layer.record) records += 1;
  }
  return { workouts, volumeT: (volume / 1000).toFixed(1), records };
})();

export const WEEK_ONE_RANGE = '5–11 JAN';
export const colors = redesignColors;
export type Layer = { color: string; height: number; record: boolean };
