import { OrthographicCamera, Vector3 } from 'three';

/**
 * Build's fixed orthographic view: the camera sits along (8, 6, 10) and never changes angle
 * (BuildScene.native.tsx). These are that camera's screen axes expressed in world space.
 */
export const CAMERA_DIRECTION = new Vector3(8, 6, 10).normalize();
const probe = new OrthographicCamera();
probe.position.copy(CAMERA_DIRECTION);
probe.lookAt(0, 0, 0);
probe.updateMatrixWorld();
const e = probe.matrixWorld.elements;
export const SCREEN_RIGHT = new Vector3(e[0], e[1], e[2]);
export const SCREEN_UP = new Vector3(e[4], e[5], e[6]);
/** One world unit of height shows as this many units on screen. */
export const COS_ELEVATION = SCREEN_UP.y;
/** How far a slab's back corner reaches above its top-centre on screen (footprint half-size 1.11). */
export const CORNER_REACH = 1.11 * (Math.abs(SCREEN_UP.x) + Math.abs(SCREEN_UP.z));

export type Cam = { z: number; ax: number; ay: number; ppu: number };

/** Screen position of a world point for a camera whose world origin sits at (ax, ay). */
export function toScreen(cam: Cam, x: number, y: number, z: number) {
  return {
    x: cam.ax + (x * SCREEN_RIGHT.x + y * SCREEN_RIGHT.y + z * SCREEN_RIGHT.z) * cam.ppu,
    y: cam.ay - (x * SCREEN_UP.x + y * SCREEN_UP.y + z * SCREEN_UP.z) * cam.ppu,
  };
}

/** World height whose top-centre shows at screen y (on the stack's axis). */
export const worldYAtScreen = (cam: Cam, screenY: number) => (cam.ay - screenY) / (cam.ppu * COS_ELEVATION);

/** Screen images of world +x and +z (per unit): the axes a flat card maps onto to lie on a slab. */
export function groundAxes(cam: Cam) {
  return {
    x: { x: SCREEN_RIGHT.x * cam.ppu, y: -SCREEN_UP.x * cam.ppu },
    z: { x: SCREEN_RIGHT.z * cam.ppu, y: -SCREEN_UP.z * cam.ppu },
  };
}
