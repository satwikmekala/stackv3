/**
 * Everything aspect-ratio specific lives here. Scenes never use raw pixel positions: they ask the
 * format for a shot, an anchor or a copy slot. A new aspect ratio is a new entry in FORMATS.
 *
 * Coordinate spaces
 * - UI space: points (pt) of the 393-pt-wide workout screen, exactly as in React Native.
 * - Build space: Three.js world units, as in features/build (a slab footprint is 2 × 2).
 * - Screen: output pixels.
 * The Build plinth sits at a fixed UI-space point (`plinthPt`), so the workout screen and the
 * stack beneath it are always one rigid world that the camera frames together.
 */
export type UiShot = { z: number; fx: number; fy: number; sx: number; sy: number };
export type BuildShot = { ax: number; ay: number; ppu: number };
export type TextSlot = { x: number; y: number; width: number; size: number; align: 'center' | 'left' };

export type Format = {
  id: 'vertical' | 'landscape';
  width: number;
  height: number;
  /** Type scale relative to the 1080-px master. */
  s: number;
  /** Points of UI per Build world unit: the app's Build stage uses width / 4.6 ≈ 85 pt. */
  ptPerUnit: number;
  plinthPt: { x: number; y: number };
  shots: { tight: UiShot; medium: UiShot };
  build: BuildShot;
  /** Overview: plinth screen position and the highest screen y the tower's top may reach. */
  overview: { ax: number; ay: number; topY: number };
  hook: { x: number; y: number; size: number; align: 'center' | 'left' };
  copyGap: TextSlot;
  copyTop: TextSlot;
  kickerY: number;
  /** Screen y the time-lapse weeks appear at (below the Your Stack header). */
  rainFromY: number;
  end: { y: number };
};

export const FORMATS: Record<Format['id'], Format> = {
  vertical: {
    id: 'vertical',
    width: 1080,
    height: 1920,
    s: 1,
    ptPerUnit: 85,
    plinthPt: { x: 196.5, y: 1047 },
    shots: {
      tight: { z: 2.4, fx: 196.5, fy: 430, sx: 540, sy: 1040 },
      medium: { z: 1.5, fx: 196.5, fy: 520, sx: 540, sy: 900 },
    },
    build: { ax: 540, ay: 1330, ppu: 250 },
    overview: { ax: 540, ay: 1765, topY: 700 },
    hook: { x: 540, y: 960, size: 210, align: 'center' },
    copyGap: { x: 540, y: 1205, width: 900, size: 76, align: 'center' },
    copyTop: { x: 540, y: 360, width: 940, size: 96, align: 'center' },
    kickerY: 290,
    rainFromY: 640,
    end: { y: 520 },
  },
  landscape: {
    id: 'landscape',
    width: 1920,
    height: 1080,
    s: 0.8,
    ptPerUnit: 85,
    plinthPt: { x: 855, y: 660 },
    shots: {
      tight: { z: 1.4, fx: 196.5, fy: 380, sx: 700, sy: 540 },
      medium: { z: 1.2, fx: 196.5, fy: 360, sx: 560, sy: 540 },
    },
    build: { ax: 1340, ay: 820, ppu: 170 },
    overview: { ax: 1400, ay: 1010, topY: 110 },
    hook: { x: 960, y: 540, size: 190, align: 'center' },
    copyGap: { x: 1350, y: 250, width: 760, size: 64, align: 'center' },
    copyTop: { x: 560, y: 420, width: 760, size: 84, align: 'center' },
    kickerY: 340,
    rainFromY: -40,
    end: { y: 500 },
  },
};
