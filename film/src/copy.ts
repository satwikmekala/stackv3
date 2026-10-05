// All on-screen words in one place. Lines marked (app) are verbatim Stack strings.
import { GOLD } from '../../features/build/model';
import { ACCENT, HISTORY_METRICS, T, WEEK_ONE_RANGE } from './timeline';
import { fusionDone } from './stack';

export type CopyLine = { lines: string[]; in: number; out: number; slot: 'copyGap' | 'copyTop'; stagger?: number };
export type Kicker = { text: string; color: string; in: number; out: number };

export const COPY = {
  hook: ['Lift.', 'Log it.'], // "Log it" is the set card's primary action (app)
  set: { lines: ['Every set', 'counts.'], in: T.copySet[0], out: T.copySet[1], slot: 'copyGap', stagger: 0.12 } as CopyLine,
  think: { lines: ['Less thinking.', 'More lifting.'], in: T.copyThink[0], out: T.copyThink[1], slot: 'copyGap', stagger: 0.45 } as CopyLine,
  workout: { lines: ['Every workout', 'stacks up.'], in: T.copyWorkout[0], out: T.copyWorkout[1], slot: 'copyTop', stagger: 0.14 } as CopyLine, // (app) Build intro page 1
  showUp: { lines: ['See what', 'showing up', 'looks like.'], in: T.copyShowUp[0], out: T.copyShowUp[1], slot: 'copyTop', stagger: 0.16 } as CopyLine,
  payoff: ["Don't slack.", 'Just stack.'], // (app) Build intro page 4
  wordmark: 'stack', // (app) splash wordmark
  tagline: 'Progress, one workout at a time.',
};

const sealedAt = T.fusion + 4000 / T.fusionSpeed / 1000;
export const KICKERS: Kicker[] = [
  { text: 'PUSH · DONE', color: ACCENT, in: T.kickerPush, out: T.gold[0] - 0.25 }, // (app) casting beat 1
  { text: 'NEW RECORD · Bench Press · 82.5 kg × 8', color: GOLD, in: T.gold[0], out: T.pieces[0] + 0.1 }, // (app) casting beat 3
  { text: 'PULL · DONE', color: ACCENT, in: T.pieces[0] + 0.34, out: T.pieces[1] + 0.12 },
  { text: 'LEGS · DONE', color: ACCENT, in: T.pieces[1] + 0.32, out: T.fusion + 0.2 },
  { text: `${WEEK_ONE_RANGE} · SEALED`, color: ACCENT, in: sealedAt, out: 20.7 }, // (app) fusion beat 3
];

/** Your Stack header (Monolith.tsx / homeModuleCopy.ts). */
export const HUD = {
  brand: 'YOUR STACK',
  from: 20.7,
  counterFrom: sealedAt,
  until: T.copyShowUp[0] - 0.05,
  metrics: `${HISTORY_METRICS.workouts} STACKS · ${HISTORY_METRICS.volumeT} T MOVED · ${HISTORY_METRICS.records} PRs`,
  metricsAt: T.metrics,
};
export const weeksBuiltLabel = (count: number) => `${count} ${count === 1 ? 'week' : 'weeks'} built`;
void fusionDone;
