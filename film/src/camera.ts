// The film camera. One rigid world: the workout screen (UI points) sits above the Build plinth
// (world units), and the camera frames them together, then follows the stack as it grows.
import type { BuildShot, Format, UiShot } from './formats';
import { impulse, lerp, prog, smooth, smoother } from './ease';
import { CORNER_REACH, COS_ELEVATION, type Cam } from './projection';
import { FINAL_TOP, stackTopForFit } from './schedule';
import { T, finalLanding } from './timeline';

export function uiShotCam(format: Format, shot: UiShot): Cam {
  return {
    z: shot.z,
    ax: shot.sx + (format.plinthPt.x - shot.fx) * shot.z,
    ay: shot.sy + (format.plinthPt.y - shot.fy) * shot.z,
    ppu: format.ptPerUnit * shot.z,
  };
}
const buildCam = (format: Format, shot: BuildShot): Cam => ({ ax: shot.ax, ay: shot.ay, ppu: shot.ppu, z: shot.ppu / format.ptPerUnit });

/** Blend two cameras: position linearly, scale geometrically (so zooms feel even). */
function blend(a: Cam, b: Cam, p: number): Cam {
  const ppu = a.ppu * (b.ppu / a.ppu) ** p;
  // Keep the world origin's motion proportional to how far the view has scaled.
  const span = Math.abs(1 / b.ppu - 1 / a.ppu) < 1e-9 ? p : (1 / ppu - 1 / a.ppu) / (1 / b.ppu - 1 / a.ppu);
  return { ax: lerp(a.ax, b.ax, span), ay: lerp(a.ay, b.ay, span), ppu, z: ppu / (a.ppu / a.z) };
}

/** UI screen origin (top-left of the 393-pt screen) for a camera. */
export const uiOrigin = (format: Format, cam: Cam) => ({
  x: cam.ax - format.plinthPt.x * cam.z,
  y: cam.ay - format.plinthPt.y * cam.z,
});

function overviewCam(format: Format): Cam {
  const { ax, ay, topY } = format.overview;
  const ppu = (ay - topY) / (FINAL_TOP * COS_ELEVATION + CORNER_REACH);
  return { ax, ay, ppu, z: ppu / format.ptPerUnit };
}

/** The least pull-back progress that keeps a stack this tall below the format's top line. */
function neededProgress(format: Format, from: Cam, to: Cam, top: number) {
  const fits = (p: number) => {
    const cam = blend(from, to, p);
    return cam.ay - (top * COS_ELEVATION + CORNER_REACH) * cam.ppu >= format.overview.topY - 1;
  };
  if (fits(0)) return 0;
  if (!fits(1)) return 1;
  let lo = 0; let hi = 1;
  for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
  return hi;
}

export function cameraAt(format: Format, t: number): Cam {
  const tight = uiShotCam(format, format.shots.tight);
  const medium = uiShotCam(format, format.shots.medium);
  const build = buildCam(format, format.build);
  const overview = overviewCam(format);

  let cam: Cam;
  if (t < T.toBuild[0]) {
    cam = blend(tight, medium, smoother(t, T.pullBack[0], T.pullBack[1]));
  } else if (t < T.pullOut[0]) {
    cam = blend(medium, build, smoother(t, T.toBuild[0], T.toBuild[1]));
  } else {
    const timed = smoother(t, T.pullOut[0], T.pullOut[1]);
    const needed = neededProgress(format, build, overview, stackTopForFit(t + 0.15));
    cam = blend(build, overview, Math.max(timed, needed));
  }

  // The hold breathes in slightly; the final landing kicks the camera; the end frame lowers the tower.
  const drift = 1 + 0.018 * smooth(t, T.copyShowUp[0], T.end);
  const kick = impulse(t, finalLanding, 9 * format.s, 16, 42);
  const settle = smoother(t, T.end, T.end + 1.1);
  return {
    ...cam,
    ppu: cam.ppu * drift * (1 - 0.14 * settle),
    z: cam.z * drift * (1 - 0.14 * settle),
    ay: cam.ay + kick + settle * format.height * 0.1,
  };
}

/** 0 → 1 as the workout screen hands the frame to Build. */
export const buildness = (t: number) => prog(t, T.toBuild[0], T.toBuild[1]);
