// Film typography. Headlines drop in with Build's fall-and-bounce, so even the words stack.
import type { CSSProperties } from 'react';
import { Img, staticFile } from 'remotion';
import { redesignColors as c } from '../../../constants/theme';
import { COPY, HUD, KICKERS, weeksBuiltLabel, type CopyLine } from '../copy';
import { FONT } from '../fonts';
import type { Format, TextSlot } from '../formats';
import { inCubic, inOutCubic, lerp, outCubic, prog, smooth, splashEase } from '../ease';
import { uiOrigin } from '../camera';
import type { Cam } from '../projection';
import { weeksBuilt } from '../schedule';
import { LOG_CENTER } from '../ui/layout';
import { HOOK_REVEAL } from '../ui/WorkoutLayer';
import { T, finalLanding } from '../timeline';

const display = (size: number): CSSProperties => ({
  fontFamily: FONT.display, fontSize: size, lineHeight: 1, letterSpacing: `${-0.028 * size}px`, color: c.bone, whiteSpace: 'nowrap',
});

/** Build's drop, in screen space: a quadratic fall and an 80 ms bounce. */
function dropIn(t: number, t0: number, distance: number, fallS = 0.28, bounceHeight = Math.min(distance * 0.06, 14)) {
  const local = t - t0;
  if (local < 0) return { y: -distance, opacity: 0 };
  const opacity = outCubic(local / 0.1);
  if (local < fallS) return { y: -distance * (1 - (local / fallS) ** 2), opacity };
  const bounce = local - fallS;
  return { y: bounce < 0.08 ? -bounceHeight * Math.sin((Math.PI * bounce) / 0.08) : 0, opacity };
}
function liftOut(t: number, t0: number, distance: number) {
  const p = inCubic(prog(t, t0, t0 + 0.26));
  return { y: -distance * p, opacity: 1 - p };
}

function Lines({ t, line, slot, format }: { t: number; line: CopyLine; slot: TextSlot; format: Format }) {
  if (t < line.in || t > line.out + 0.3) return null;
  const size = slot.size * format.s;
  const lineHeight = size * 1.02;
  return (
    <>
      {line.lines.map((text, index) => {
        // Later lines land first-to-last, top to bottom, each a beat after the previous.
        const drop = dropIn(t, line.in + index * (line.stagger ?? 0.12), size * 0.55);
        const out = liftOut(t, line.out + index * 0.04, size * 0.3);
        return (
          <div key={text} style={{
            position: 'absolute', top: slot.y + index * lineHeight, left: slot.x - slot.width / 2, width: slot.width,
            textAlign: slot.align, ...display(size),
            opacity: drop.opacity * out.opacity, transform: `translateY(${drop.y + out.y}px)`,
          }}>{text}</div>
        );
      })}
    </>
  );
}

function Kicker({ t, format }: { t: number; format: Format }) {
  const current = KICKERS.filter((k) => t >= k.in - 0.02 && t <= k.out + 0.2);
  return (
    <>
      {current.map((k) => {
        const p = outCubic(prog(t, k.in, k.in + 0.22));
        const q = inCubic(prog(t, k.out, k.out + 0.2));
        return (
          <div key={k.text} style={{
            position: 'absolute', left: format.copyTop.x - format.copyTop.width / 2, width: format.copyTop.width, top: format.kickerY, textAlign: 'center',
            fontFamily: FONT.monoBold, fontSize: 26 * format.s, letterSpacing: 3.9 * format.s, color: k.color,
            opacity: p * (1 - q), transform: `translateY(${10 * (1 - p) - 8 * q}px)`,
          }}>{k.text}</div>
        );
      })}
    </>
  );
}

/** Your Stack header: brand, weeks-built count, then the Monolith metrics line. */
function Hud({ t, format }: { t: number; format: Format }) {
  if (t < HUD.counterFrom || t > HUD.until + 0.3) return null;
  const count = weeksBuilt(t);
  const inP = outCubic(prog(t, HUD.counterFrom, HUD.counterFrom + 0.3));
  const out = liftOut(t, HUD.until, 30);
  const brand = smooth(t, HUD.from, HUD.from + 0.3);
  const metrics = outCubic(prog(t, HUD.metricsAt, HUD.metricsAt + 0.4));
  const slot = format.copyTop;
  // The count ticks with each landing: a tiny drop on every change.
  const lastChange = [...Array(60).keys()].map((i) => t - i / 60).find((s) => weeksBuilt(s) !== count);
  const tick = lastChange === undefined ? 0 : dropIn(t, lastChange, 10 * format.s, 0.12).y;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: inP * out.opacity, transform: `translateY(${out.y}px)` }}>
      <div style={{
        position: 'absolute', left: slot.x - slot.width / 2, width: slot.width, top: format.kickerY, textAlign: 'center', opacity: brand,
        fontFamily: FONT.mono, fontSize: 26 * format.s, letterSpacing: 5.2 * format.s, color: c.bone,
      }}>{HUD.brand}</div>
      <div style={{
        position: 'absolute', left: slot.x - slot.width / 2, width: slot.width, top: slot.y, textAlign: 'center',
        ...display(slot.size * format.s * 0.92), transform: `translateY(${tick}px)`,
      }}>{weeksBuiltLabel(count)}</div>
      <div style={{
        position: 'absolute', left: slot.x - slot.width / 2, width: slot.width, top: slot.y + slot.size * format.s * 1.25, textAlign: 'center',
        fontFamily: FONT.mono, fontSize: 24 * format.s, letterSpacing: 2 * format.s, color: c.ash,
        opacity: metrics, transform: `translateY(${8 * (1 - metrics)}px)`,
      }}>{HUD.metrics}</div>
    </div>
  );
}

/** "Lift." / "Log it." — then "Log it." shrinks into the real Log it button. */
function Hook({ t, cam, format }: { t: number; cam: Cam; format: Format }) {
  if (t > HOOK_REVEAL.button + 0.25) return null;
  const size = format.hook.size * format.s;
  const [lift, logIt] = COPY.hook;
  const gap = size * 0.56;
  const first = dropIn(t, T.lift, size * 0.5);
  const firstOut = liftOut(t, T.morph, size * 0.4);
  const second = dropIn(t, T.logIt, size * 0.5);
  // Morph target: the button label ("Log it" is 19 pt Hanken Bold, centred right of its check).
  const origin = uiOrigin(format, cam);
  const target = { x: origin.x + (LOG_CENTER.x + 15.5) * cam.z, y: origin.y + LOG_CENTER.y * cam.z };
  const m = inOutCubic(prog(t, T.morph, HOOK_REVEAL.button + 0.08));
  const from = { x: format.hook.x, y: format.hook.y + gap };
  const x = lerp(from.x, target.x, m);
  const y = lerp(from.y, target.y, m);
  const scale = lerp(1, (19 * cam.z * 1.1) / size, m);
  // Hand over to the real button label (which fades in underneath) as the text arrives.
  const fade = 1 - smooth(t, HOOK_REVEAL.button + 0.08, HOOK_REVEAL.button + 0.15);
  const period = 1 - smooth(t, T.morph, T.morph + 0.2);
  return (
    <>
      <div style={{
        position: 'absolute', left: 0, width: format.width, top: format.hook.y - gap - size / 2, textAlign: 'center', ...display(size),
        opacity: first.opacity * firstOut.opacity, transform: `translateY(${first.y + firstOut.y}px)`,
      }}>{lift}</div>
      <div style={{
        position: 'absolute', left: x, top: y, ...display(size), transformOrigin: '50% 50%',
        transform: `translate(-50%, -50%) translateY(${second.y * (1 - m)}px) scale(${scale})`,
        opacity: second.opacity * fade,
      }}>{logIt.slice(0, -1)}<span style={{ opacity: period }}>.</span></div>
    </>
  );
}

/** "Don't slack." then "Just stack." — which falls with the final week and lands with it. */
function Payoff({ t, format }: { t: number; format: Format }) {
  if (t < T.dontSlack || t > T.end + 0.4) return null;
  const slot = format.copyTop;
  const size = slot.size * format.s * 1.18;
  const [first, second] = COPY.payoff;
  const a = dropIn(t, T.dontSlack, size * 0.55);
  const fall = T.finalFallMs / 1000;
  const b = dropIn(t, T.justStack, format.height * 0.42, fall);
  const out = liftOut(t, T.end, size * 0.3);
  const impact = t >= finalLanding ? Math.exp(-(t - finalLanding) * 16) : 0;
  const line = (text: string, index: number, motion: { y: number; opacity: number }, color = c.bone) => (
    <div style={{
      position: 'absolute', left: slot.x - slot.width / 2, width: slot.width, top: slot.y + index * size * 1.04,
      textAlign: slot.align, ...display(size), color,
      opacity: motion.opacity * out.opacity, transform: `translateY(${motion.y + out.y}px) scaleY(${index === 1 ? 1 - 0.06 * impact : 1})`,
      transformOrigin: '50% 100%',
    }}>{text}</div>
  );
  return <>{line(first, 0, a)}{line(second, 1, b)}</>;
}

/** Splash choreography (app/index.tsx): three cards stagger in, then the wordmark. */
function EndFrame({ t, format }: { t: number; format: Format }) {
  if (t < T.logo) return null;
  const k = 2.1 * format.s;
  const card = 72 * k;
  const offset = 12 * k;
  const canvas = card + offset * 2;
  const top = format.end.y - canvas / 2 - 90 * format.s;
  const layer = (src: string, at: number, position: number, z: number) => {
    const p = splashEase(prog(t, at, at + 0.65));
    return (
      <Img key={src} src={staticFile(src)} style={{
        position: 'absolute', left: format.width / 2 - canvas / 2 + position, top: top + position, width: card, height: card, zIndex: z,
        opacity: p, transform: `translate(${10 * k * (1 - p)}px, ${10 * k * (1 - p)}px) scale(${lerp(0.94, 1, p)})`,
      }} />
    );
  };
  const word = splashEase(prog(t, T.wordmark, T.wordmark + 0.52));
  const tag = outCubic(prog(t, T.tagline, T.tagline + 0.5));
  return (
    <>
      {layer('images/logo-light.png', T.logo, offset * 2, 1)}
      {layer('images/logo-medium.png', T.logo + 0.18, offset, 2)}
      {layer('images/logo-hard.png', T.logo + 0.36, 0, 3)}
      <div style={{
        position: 'absolute', left: 0, width: format.width, top: top + canvas + 22 * k, textAlign: 'center',
        fontFamily: FONT.display, fontSize: 56 * k, lineHeight: `${64 * k}px`, letterSpacing: -1.5 * k, color: c.bone,
        opacity: word, transform: `translateY(${12 * k * (1 - word)}px)`,
      }}>{COPY.wordmark}</div>
      <div style={{
        position: 'absolute', left: 0, width: format.width, top: top + canvas + 22 * k + 64 * k + 18 * format.s, textAlign: 'center',
        fontFamily: FONT.ui, fontSize: 38 * format.s, color: c.ash, opacity: tag, transform: `translateY(${8 * (1 - tag)}px)`,
      }}>{COPY.tagline}</div>
    </>
  );
}

export function Overlay({ t, cam, format }: { t: number; cam: Cam; format: Format }) {
  return (
    <>
      <Hook t={t} cam={cam} format={format} />
      <Lines t={t} line={COPY.set} slot={format.copyGap} format={format} />
      <Lines t={t} line={COPY.think} slot={format.copyGap} format={format} />
      <Kicker t={t} format={format} />
      <Lines t={t} line={COPY.workout} slot={format.copyTop} format={format} />
      <Hud t={t} format={format} />
      <Lines t={t} line={COPY.showUp} slot={format.copyTop} format={format} />
      <Payoff t={t} format={format} />
      <EndFrame t={t} format={format} />
    </>
  );
}
