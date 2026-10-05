// Motion primitives. Every curve here is lifted from the app so the film moves like Stack does.

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const lerp = (a, b, t) => a + (b - a) * t;
/** Linear 0–1 progress of `t` through [a, b]. */
export const prog = (t, a, b) => clamp01((t - a) / (b - a));
/** Build's `ease` (fusion.ts, casting.ts): smoothstep over [a, b]. */
export const smooth = (t, a, b) => { const x = prog(t, a, b); return x * x * (3 - 2 * x); };
/** introOverview.ts `smoother`: quintic smootherstep. */
export const smoother = (t, a, b) => { const x = prog(t, a, b); return x * x * x * (x * (x * 6 - 15) + 10); };
/** motionEasing.decelerate / accelerate (constants/motion.ts). */
export const outCubic = (x) => 1 - (1 - clamp01(x)) ** 3;
export const inCubic = (x) => clamp01(x) ** 3;
export const inOutCubic = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
export const outQuint = (x) => 1 - (1 - clamp01(x)) ** 5;

/** CSS-style cubic-bezier easing (Newton + bisection), e.g. the splash's bezier(.22,1,.36,1). */
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (u) => ((ax * u + bx) * u + cx) * u;
  const sy = (u) => ((ay * u + by) * u + cy) * u;
  const dx = (u) => (3 * ax * u + 2 * bx) * u + cx;
  return (x) => {
    x = clamp01(x);
    let u = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(u) - x;
      if (Math.abs(e) < 1e-6) return sy(u);
      const d = dx(u);
      if (Math.abs(d) < 1e-6) break;
      u -= e / d;
    }
    let lo = 0, hi = 1; u = x;
    for (let i = 0; i < 30; i++) { if (sx(u) < x) lo = u; else hi = u; u = (lo + hi) / 2; }
    return sy(u);
  };
}
/** app/index.tsx splash reveal. */
export const splashEase = cubicBezier(0.22, 1, 0.36, 1);
/** WorkoutLaunchSurface EXPAND. */
export const launchEase = cubicBezier(0.32, 0, 0.18, 1);

/**
 * Build's drop (BuildScene intro pages / introOverview): a quadratic fall from `lift` to 0 in
 * `fallMs`, then an 80 ms, 0.045-unit bounce. Returns the remaining lift in world units.
 */
export const FALL_MS = 280;
export const BOUNCE_MS = 80;
export const BOUNCE_HEIGHT = 0.045;
export function buildDrop(localMs, lift, fallMs = FALL_MS) {
  if (localMs < 0) return lift;
  if (localMs < fallMs) return lift * (1 - (localMs / fallMs) ** 2);
  if (localMs < fallMs + BOUNCE_MS) return BOUNCE_HEIGHT * Math.sin(Math.PI * (localMs - fallMs) / BOUNCE_MS);
  return 0;
}
/** The gravity Build's 3.2-unit, 280 ms fall implies. One gravity for the whole film. */
export const GRAVITY = (2 * 3.2) / (0.28 * 0.28);
/** How long something takes to fall `lift` world units under Build gravity, in ms. */
export const fallTime = (lift) => Math.sqrt((2 * Math.max(0, lift)) / GRAVITY) * 1000;

/** Critically damped spring response to an impulse at t0 (for camera kicks / squash). */
export function impulse(t, t0, amplitude, decay = 18, freq = 0) {
  if (t < t0) return 0;
  const x = t - t0;
  return amplitude * Math.exp(-decay * x) * (freq ? Math.cos(freq * x) : (1 + decay * x));
}

/** Smooth minimum (for camera framing that must satisfy two constraints without a kink). */
export function smin(a, b, k) {
  const h = clamp01(0.5 + (0.5 * (b - a)) / k);
  return lerp(b, a, h) - k * h * (1 - h);
}

/** Reanimated FadeInRight / FadeOutLeft / FadeInDown equivalents, as {opacity, x, y}. */
export function enterRight(t, t0, ms = 220, travel = 25) {
  const p = outCubic(prog(t, t0, t0 + ms / 1000));
  return { opacity: p, x: travel * (1 - p), y: 0 };
}
export function exitLeft(t, t0, ms = 160, travel = 25) {
  const p = inCubic(prog(t, t0, t0 + ms / 1000));
  return { opacity: 1 - p, x: -travel * p, y: 0 };
}
export function enterDown(t, t0, ms = 200, travel = 8) {
  const p = outCubic(prog(t, t0, t0 + ms / 1000));
  return { opacity: p, x: 0, y: travel * (1 - p) };
}
export function fadeOut(t, t0, ms = 180) {
  return 1 - inCubic(prog(t, t0, t0 + ms / 1000));
}
/** confirmationEnter keyframe: scale 0.8 → 1.04 (70%) → 1, opacity 0 → 1 by 70%. */
export function confirmScale(t, t0, ms = 220) {
  const p = prog(t, t0, t0 + ms / 1000);
  if (p <= 0) return { opacity: 0, scale: 0.8 };
  if (p < 0.7) { const q = p / 0.7; return { opacity: q, scale: lerp(0.8, 1.04, q) }; }
  return { opacity: 1, scale: lerp(1.04, 1, (p - 0.7) / 0.3) };
}
