/**
 * Introduction page 4: page 3's tower stays put, the earlier-dated weeks drop onto it from above
 * one after another, and the camera pulls back to the whole tower. Pure, so the timing and the
 * framing guarantees are testable without a renderer.
 */

/** Hold on page 3's last frame before the first week drops. */
export const OVERVIEW_DROP_START = 250;
export const OVERVIEW_DROP_STAGGER = 150;
export const OVERVIEW_FALL_MS = 300;
const BOUNCE_MS = 80;
const BOUNCE_HEIGHT = 0.045;
/** Same drop height as pages 1–2; taller views get a longer drop so a week never appears mid-air. */
const DROP_LIFT = 3.2;
/** The final pull-back to the whole tower; it overlaps the last landings so there is no pause. */
export const OVERVIEW_PULLBACK_START = 1250;
export const OVERVIEW_PULLBACK_END = 2500;
/** The camera makes room this far ahead of the stack, so a landing is never outside the frame. */
const CAMERA_LEAD_MS = 150;
/** Room left above the stack's top edge, in points. */
const TOP_MARGIN = 28;

/** Half the slab's footprint, and the camera's up vector for its fixed (8, 6, 10) direction. */
const HALF_FOOTPRINT = 1.11;
const CAMERA_UP = (() => {
  const length = Math.hypot(8, 6, 10);
  const [fx, fy, fz] = [-8 / length, -6 / length, -10 / length];
  // right = forward × worldUp, up = right × forward
  const [rx, rz] = [-fz, fx];
  const rightLength = Math.hypot(rx, rz);
  const [nx, nz] = [rx / rightLength, rz / rightLength];
  return { x: -nz * fy, y: nz * fx - nx * fz, z: nx * fy };
})();
/** How far a slab's top corners reach above its top-centre on screen. */
const CORNER_REACH = HALF_FOOTPRINT * (Math.abs(CAMERA_UP.x) + Math.abs(CAMERA_UP.z));

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const ease = (elapsed: number, start: number, end: number) => { const t = clamp01((elapsed - start) / (end - start)); return t * t * (3 - 2 * t); };
const smoother = (elapsed: number, start: number, end: number) => { const t = clamp01((elapsed - start) / (end - start)); return t * t * t * (t * (t * 6 - 15) + 10); };

const dropStart = (index: number) => OVERVIEW_DROP_START + index * OVERVIEW_DROP_STAGGER;
export const overviewLanding = (index: number) => dropStart(index) + OVERVIEW_FALL_MS;

/** Where one dropping week is: hidden until its turn, then the same fall and small bounce as pages 1–2. */
export function overviewDrop(elapsed: number, index: number, dropLift = DROP_LIFT) {
  const local = elapsed - dropStart(index);
  if (local < 0) return { visible: false, lift: dropLift };
  const lift = local < OVERVIEW_FALL_MS
    ? dropLift * (1 - (local / OVERVIEW_FALL_MS) ** 2)
    : local < OVERVIEW_FALL_MS + BOUNCE_MS
      ? BOUNCE_HEIGHT * Math.sin(Math.PI * (local - OVERVIEW_FALL_MS) / BOUNCE_MS)
      : 0;
  return { visible: true, lift };
}

/** The stack's top as the camera sees it: each week's height eases in while it falls, so framing never jumps. */
export function overviewStackTop(elapsed: number, baseTop: number, dropHeights: readonly number[]) {
  return dropHeights.reduce((top, height, index) => top + height * ease(elapsed, dropStart(index), overviewLanding(index)), baseTop);
}

export type OverviewPath = { closeZoom: number; handoffY: number; overview: { targetY: number; zoom: number } };
/**
 * The pull-back at progress 0–1: zooms geometrically so the tower recedes at an even rate, and the
 * view's centre follows its visible span from page 3's frame, so the plinth stays put.
 */
export function overviewCamera(progress: number, { closeZoom, handoffY, overview }: OverviewPath) {
  const zoom = closeZoom * (overview.zoom / closeZoom) ** progress;
  const spanRange = 1 / overview.zoom - 1 / closeZoom;
  const spanProgress = Math.abs(spanRange) < 1e-6 ? progress : (1 / zoom - 1 / closeZoom) / spanRange;
  return { zoom, targetY: handoffY + (overview.targetY - handoffY) * spanProgress };
}

/** The least pull-back that keeps a stack of this height, corners included, inside the frame. */
export function overviewProgressFor(stackTop: number, viewHeight: number, cameraCos: number, path: OverviewPath) {
  const fits = (progress: number) => {
    const { zoom, targetY } = overviewCamera(progress, path);
    return CORNER_REACH + (stackTop - targetY) * cameraCos <= (viewHeight / 2 - TOP_MARGIN) / zoom;
  };
  if (fits(0)) return 0;
  if (!fits(1)) return 1;
  let low = 0;
  let high = 1;
  for (let step = 0; step < 20; step++) {
    const mid = (low + high) / 2;
    if (fits(mid)) high = mid; else low = mid;
  }
  return high;
}

/** Where the camera is heading: at least far enough out for the growing stack, then all the way out. */
export function overviewProgressTarget(elapsed: number, baseTop: number, dropHeights: readonly number[], viewHeight: number, cameraCos: number, path: OverviewPath) {
  const room = overviewProgressFor(overviewStackTop(elapsed + CAMERA_LEAD_MS, baseTop, dropHeights), viewHeight, cameraCos, path);
  return Math.min(1, Math.max(room, smoother(elapsed, OVERVIEW_PULLBACK_START, OVERVIEW_PULLBACK_END)));
}

/**
 * Each week's drop height: from just above the frame the camera is heading to when that week
 * starts falling (its lowest corner clear of the top edge), and never shorter than pages 1–2's.
 */
export function overviewDropLifts(dropYs: readonly number[], baseTop: number, dropHeights: readonly number[], viewHeight: number, cameraCos: number, path: OverviewPath) {
  return dropYs.map((y, index) => {
    const { zoom, targetY } = overviewCamera(overviewProgressTarget(dropStart(index), baseTop, dropHeights, viewHeight, cameraCos, path), path);
    const frameTop = targetY + (viewHeight / 2 / zoom + CORNER_REACH) / cameraCos;
    return Math.max(DROP_LIFT, frameTop - y + 0.1);
  });
}
