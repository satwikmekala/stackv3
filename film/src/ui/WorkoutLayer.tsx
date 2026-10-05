// The live workout screen at time t. All state is derived from the timeline; the components are
// stateless mirrors of the app's. Only film devices are added: the lay-down that turns a logged
// set (and finally the whole screen) into its Build slab, and a touch indicator.
import type { CSSProperties, ReactNode } from 'react';
import { confirmScale, enterRight, exitLeft, fadeOut, inOutCubic, lerp, outCubic, prog, smooth, splashEase } from '../ease';
import type { Format } from '../formats';
import { uiOrigin } from '../camera';
import { groundAxes, type Cam } from '../projection';
import { LAY_S, UI_LAY_S } from '../stack';
import { ACCENT, EXERCISES, T, exerciseEnter, touchLead } from '../timeline';
import { ActiveSetCard, ExerciseFinisher, ExerciseTitle, FinishSheet, ProgressSegments, SetProgress, UpNext, WorkoutHeader, type CardState, type PipState } from './components';
import {
  ADVANCE_CENTER, BODY_Y, CARD_CENTER, CARD_H, CARD_Y, CONTENT_W, HEADER_Y, LOG_CENTER, PAD_X, PICKER_TRACK, PICKER_Y,
  SCREEN_W, SEGMENTS_Y, TITLE_Y, UI_BOTTOM, UI_CENTER, UP_NEXT_Y, plusCenter,
} from './layout';
import { formatWeight, View } from './primitives';

const accent = ACCENT;
const lastLog = (e: number) => EXERCISES[e].logs[2];

/** WorkoutLaunchSection-style reveal used while the hook assembles the screen. */
const reveal = (t: number, t0: number) => {
  const p = outCubic(prog(t, t0, t0 + 0.48));
  return { opacity: p, transform: `translateY(${14 * (1 - p)}px)` };
};
export const HOOK_REVEAL = { card: 1.9, body: 2.0, title: 2.08, header: 2.16, upNext: 2.22, button: 1.76 };

/** Press feedback (usePressScale / activeOpacity): 0 → 1 while a finger is down on a target. */
const press = (t: number, tap: number) => (t < tap - 0.12 || t > tap + 0.12 ? 0 : t < tap ? smooth(t, tap - 0.12, tap - 0.06) : 1 - smooth(t, tap, tap + 0.12));

/** A flat card mapped onto the Build slab's top face, as a CSS matrix about the element's centre. */
function layMatrix(cam: Cam, width: number, height: number, p: number) {
  const axes = groundAxes(cam);
  const a = axes.x.x / (width / 2) / cam.z;
  const b = axes.x.y / (width / 2) / cam.z;
  const cc = axes.z.x / (height / 2) / cam.z;
  const d = axes.z.y / (height / 2) / cam.z;
  const k = inOutCubic(p);
  return `matrix(${lerp(1, a, k)}, ${lerp(0, b, k)}, ${lerp(0, cc, k)}, ${lerp(1, d, k)}, 0, 0)`;
}

function pipsFor(e: number, t: number): PipState[] {
  const { logs, sets } = EXERCISES[e];
  return sets.map((set, s) => {
    const completed = t >= logs[s];
    const becameCurrent = s === 0 ? -Infinity : logs[s - 1];
    const current = !completed && t >= becameCurrent;
    const fill = s === 0 ? 1 : outCubic(prog(t, becameCurrent, becameCurrent + 0.24));
    const glowIn = s === 0 ? 1 : outCubic(prog(t, becameCurrent, becameCurrent + 0.22));
    const glow = glowIn * (1 - outCubic(prog(t, logs[s], logs[s] + 0.22)));
    return {
      fill, glow, current,
      check: completed ? confirmScale(t, logs[s]) : null,
      label: completed ? `${formatWeight(set.w)}·${set.r}` : current ? 'NOW' : '–',
    };
  });
}

function cardFor(e: number, s: number, t: number): CardState {
  const set = EXERCISES[e].sets[s];
  const plus = set.plus;
  const rolled = plus !== undefined && t >= plus;
  const weight = rolled || set.from === undefined ? set.w : set.from;
  const previous = s > 0 ? EXERCISES[e].sets[s - 1].w : null;
  const pct = previous === null ? null : Math.round(((weight - previous) / previous) * 100);
  const roll = rolled ? outCubic(prog(t, plus!, plus! + 0.16)) : 1;
  const log = EXERCISES[e].logs[s];
  return {
    setNumber: s + 1,
    weight: formatWeight(weight),
    reps: String(set.r),
    roll: { y: 6 * (1 - roll), opacity: roll },
    delta: pct === null ? null : `${pct >= 0 ? '+' : ''}${pct}%`,
    info: EXERCISES[e].info,
    logPress: press(t, log),
    plusPress: plus !== undefined ? press(t, plus) : 0,
    tint: smooth(t, log + LAY_S * 0.35, log + LAY_S),
  };
}

type Tap = { at: number; x: number; y: number; drag?: { from: number; to: number; x1: number } };
export const TAPS: Tap[] = [
  ...EXERCISES.flatMap((exercise, e) => [
    ...exercise.logs.map((log) => ({ at: log, ...LOG_CENTER })),
    ...exercise.sets.flatMap((set) => (set.plus !== undefined ? [{ at: set.plus, ...plusCenter(formatWeight(set.from ?? set.w)) }] : [])),
    { at: exercise.moveOn, ...ADVANCE_CENTER },
  ]),
  {
    at: T.pickerRelease, x: PICKER_TRACK.x + PICKER_TRACK.w * 0.5, y: PICKER_TRACK.y,
    drag: { from: T.pickerDrag[0], to: T.pickerDrag[1], x1: PICKER_TRACK.x + PICKER_TRACK.w * 0.6 },
  },
];

function Touch({ t }: { t: number }) {
  const tap = TAPS.find((item) => {
    const start = item.drag ? T.pickerTouch - 0.2 : item.at - touchLead(item.at);
    return t >= start && t <= item.at + 0.3;
  });
  if (!tap) return null;
  const start = tap.drag ? T.pickerTouch - 0.2 : tap.at - touchLead(tap.at);
  const appear = outCubic(prog(t, start, start + 0.12));
  const down = tap.drag ? smooth(t, T.pickerTouch - 0.06, T.pickerTouch) * (1 - smooth(t, tap.at, tap.at + 0.1)) : press(t, tap.at);
  const leave = prog(t, tap.at, tap.at + 0.3);
  const x = tap.drag ? lerp(tap.x, tap.drag.x1, splashEase(prog(t, tap.drag.from, tap.drag.to))) : tap.x;
  const size = 46;
  return (
    <>
      <div style={{
        position: 'absolute', left: x - size / 2, top: tap.y - size / 2, width: size, height: size, borderRadius: size / 2,
        backgroundColor: `rgba(245, 240, 232, ${0.14 + 0.14 * down})`, border: '1.5px solid rgba(245, 240, 232, 0.5)',
        opacity: appear * (1 - outCubic(leave)), transform: `scale(${(1.15 - 0.15 * appear) * (1 - 0.14 * down)})`,
      }} />
      {leave > 0 && leave < 1 ? (
        <div style={{
          position: 'absolute', left: tap.x - size / 2, top: tap.y - size / 2, width: size, height: size, borderRadius: size / 2,
          border: '1.5px solid rgba(245, 240, 232, 0.45)', opacity: 1 - leave, transform: `scale(${1 + outCubic(leave) * 0.9})`,
        }} />
      ) : null}
    </>
  );
}

const at = (x: number, y: number, style?: CSSProperties, children?: ReactNode) => (
  <div style={{ position: 'absolute', left: x, top: y, ...style }}>{children}</div>
);

function Exercise({ e, t, cam }: { e: number; t: number; cam: Cam }) {
  const exercise = EXERCISES[e];
  const enter = exerciseEnter(e);
  const exit = e < EXERCISES.length - 1 ? exercise.moveOn : Infinity;
  if (t < enter || t > exit + 0.2) return null;
  const inMotion = e === 0 ? { opacity: 1, x: 0, y: 0 } : enterRight(t, enter);
  const outMotion = exitLeft(t, exit);
  const motion = t >= exit ? outMotion : inMotion;
  const group: CSSProperties = { opacity: motion.opacity, transform: `translateX(${motion.x}px)` };
  const complete = t >= lastLog(e);
  const hook = e === 0;
  const next = EXERCISES[e + 1]?.name ?? null;

  // The active stage (pips + card) exits when the last set is logged; the finisher arrives.
  const activeOpacity = complete ? fadeOut(t, lastLog(e)) : 1;
  const finisher = complete ? enterRight(t, lastLog(e)) : null;

  return (
    <div style={{ position: 'absolute', inset: 0, ...group }}>
      {at(PAD_X, TITLE_Y, { width: CONTENT_W, ...(hook ? reveal(t, HOOK_REVEAL.title) : null) },
        <ExerciseTitle name={exercise.name} accent={accent} check={complete ? confirmScale(t, lastLog(e)) : null} />)}
      {activeOpacity > 0 ? at(PAD_X, BODY_Y, { width: CONTENT_W, opacity: activeOpacity, ...(hook ? reveal(t, HOOK_REVEAL.body) : null) },
        <SetProgress pips={pipsFor(e, t)} accent={accent} />) : null}
      {exercise.sets.map((_, s) => {
        const log = exercise.logs[s];
        const shownFrom = s === 0 ? enter : exercise.logs[s - 1] + 0.04;
        if (t < shownFrom || t >= log + LAY_S) return null;
        const arrive = s === 0 ? { opacity: 1, x: 0 } : enterRight(t, shownFrom);
        const lay = prog(t, log, log + LAY_S);
        const hookReveal = hook && s === 0
          ? {
            shell: outCubic(prog(t, HOOK_REVEAL.card, HOOK_REVEAL.card + 0.48)),
            button: outCubic(prog(t, HOOK_REVEAL.button, HOOK_REVEAL.button + 0.16)),
            buttonScale: lerp(0.86, 1, outCubic(prog(t, HOOK_REVEAL.button, HOOK_REVEAL.button + 0.36))),
            label: prog(t, HOOK_REVEAL.button + 0.08, HOOK_REVEAL.button + 0.15),
          }
          : undefined;
        return at(PAD_X, CARD_Y, {
          width: CONTENT_W, height: CARD_H, opacity: arrive.opacity,
          transformOrigin: `${CARD_CENTER.x - PAD_X}px ${CARD_CENTER.y - CARD_Y}px`,
          transform: `translateX(${arrive.x}px) ${lay > 0 ? layMatrix(cam, CONTENT_W, CARD_H, lay) : ''}`,
          zIndex: 2,
        }, <ActiveSetCard state={cardFor(e, s, t)} accent={accent} reveal={hookReveal} />);
      })}
      {finisher && finisher.opacity > 0 ? at(PAD_X, BODY_Y, { opacity: finisher.opacity, transform: `translateX(${finisher.x}px)` },
        <ExerciseFinisher sets={exercise.sets} next={next} advancePress={press(t, exercise.moveOn)} />) : null}
      {next ? (() => {
        const opacity = complete ? fadeOut(t, lastLog(e)) : 1;
        return opacity > 0 ? at(PAD_X, UP_NEXT_Y, { opacity, ...(hook ? reveal(t, HOOK_REVEAL.upNext) : null) }, <UpNext name={next} accent={accent} />) : null;
      })() : null}
    </div>
  );
}

function segmentsAt(t: number) {
  return EXERCISES.map((_, i) => {
    const enter = exerciseEnter(i);
    const leave = i < EXERCISES.length - 1 ? EXERCISES[i].moveOn : Infinity;
    const current = t >= enter && t < leave;
    const fill = i === 0 ? 1 : outCubic(prog(t, enter, enter + 0.26));
    const focus = current ? (i === 0 ? 1 : smooth(t, enter, enter + 0.22)) : t >= leave ? 1 - smooth(t, leave, leave + 0.22) : 0;
    return { fill, focus: Math.max(0, focus) };
  });
}

function pickerValue(t: number) {
  if (t >= T.pickerRelease) return 0.5; // snaps to JUST RIGHT and commits
  return lerp(0.5, 0.6, splashEase(prog(t, T.pickerDrag[0], T.pickerDrag[1])));
}

/** The screen itself (below the Build layer so falling slabs pass in front of it). */
export function WorkoutLayer({ t, cam, format }: { t: number; cam: Cam; format: Format }) {
  if (t < T.uiIn || t >= T.layDown + UI_LAY_S) return null;
  const origin = uiOrigin(format, cam);
  const lay = prog(t, T.layDown, T.layDown + UI_LAY_S);
  const height = UI_BOTTOM - HEADER_Y;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: SCREEN_W, height: 852, transformOrigin: '0 0', transform: `translate(${origin.x}px, ${origin.y}px) scale(${cam.z})` }}>
      <div style={{
        position: 'absolute', inset: 0,
        transformOrigin: `${UI_CENTER.x}px ${UI_CENTER.y}px`,
        transform: lay > 0 ? layMatrix(cam, CONTENT_W, height, lay) : undefined,
      }}>
        {at(PAD_X, HEADER_Y, { width: CONTENT_W, ...reveal(t, HOOK_REVEAL.header) }, <WorkoutHeader accent={accent} />)}
        {at(PAD_X, SEGMENTS_Y, { width: CONTENT_W, ...reveal(t, HOOK_REVEAL.title) }, <ProgressSegments segments={segmentsAt(t)} accent={accent} />)}
        {EXERCISES.map((_, e) => <Exercise key={e} e={e} t={t} cam={cam} />)}
        {lay > 0 ? <View style={{
          position: 'absolute', left: PAD_X, top: HEADER_Y, width: CONTENT_W, height, borderRadius: 27,
          backgroundColor: accent, opacity: smooth(lay, 0.3, 1),
        }} /> : null}
      </div>
    </div>
  );
}

/** Modal finish sheet and the touch indicator: above everything, as a modal is. */
export function SheetLayer({ t, cam, format }: { t: number; cam: Cam; format: Format }) {
  if (t < T.uiIn || t >= T.layDown + UI_LAY_S) return null;
  const origin = uiOrigin(format, cam);
  const pickerIn = smooth(t, T.picker, T.picker + 0.3);
  const pickerOut = fadeOut(t, T.layDown, 150);
  return (
    <>
      {pickerIn > 0 ? <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.72)', opacity: pickerIn * pickerOut }} /> : null}
      <div style={{ position: 'absolute', left: 0, top: 0, width: SCREEN_W, height: 852, transformOrigin: '0 0', transform: `translate(${origin.x}px, ${origin.y}px) scale(${cam.z})` }}>
        {pickerIn > 0 ? at(20, PICKER_Y, { opacity: pickerIn * pickerOut, transform: `translateY(${8 * (1 - pickerIn)}px)` },
          <FinishSheet value={pickerValue(t)} accent={accent} />) : null}
        <Touch t={t} />
      </div>
    </>
  );
}
