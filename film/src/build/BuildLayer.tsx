// The Build stage: the app's own slab geometry (features/build/geometry.ts), camera angle,
// plinth and unlit vertex-coloured materials, posed each frame from stackAt().
import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { ThreeCanvas } from '@remotion/three';
import { BufferGeometry, MeshBasicMaterial, type OrthographicCamera } from 'three';
import { createRecordSeamGeometry, createSlabGeometry } from '../../../features/build/geometry';
import { BASE_HEIGHT, type BuildSlab } from '../../../features/build/model';
import type { Format } from '../formats';
import { CAMERA_DIRECTION, SCREEN_RIGHT, type Cam } from '../projection';
import { SET_COUNT } from '../schedule';
import { stackAt, type SlabPose } from '../stack';
import { ACCENT, T, BUILD_TUNING, FINAL_WEEK, HISTORY, RAIN_WEEKS, SET_HEIGHT, UI_SLAB_HEIGHT, WEEK_ONE, type Layer } from '../timeline';

const slab = (id: string, height: number, layers: Layer[], sealed = false): BuildSlab => ({ id, height, layers, sealed });
const single = (id: string, layer: Layer) => slab(id, layer.height, [layer]);

function useGeometry(factory: () => BufferGeometry) {
  const geometry = useMemo(factory, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

/** Materials for slabs fading in, quantised so a handful of materials serve every frame. */
const fading = new Map<number, MeshBasicMaterial>();
function fadingMaterial(opacity: number) {
  const step = Math.round(opacity * 8) / 8;
  let material = fading.get(step);
  if (!material) {
    material = new MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, opacity: step });
    fading.set(step, material);
  }
  return material;
}

function Slab({ geometry, material, pose, extra }: { geometry: BufferGeometry; material: MeshBasicMaterial; pose: SlabPose; extra?: React.ReactNode }) {
  if (!pose.visible || pose.opacity === 0) return null;
  if (pose.opacity !== undefined && pose.opacity < 1) material = fadingMaterial(pose.opacity);
  const x = SCREEN_RIGHT.x * pose.dx;
  const z = SCREEN_RIGHT.z * pose.dx;
  return (
    <group position={[x, pose.y + pose.lift, z]} scale={[1, pose.scaleY, 1]}>
      <mesh geometry={geometry} material={material} />
      {extra}
    </group>
  );
}

/** Frames the orthographic camera so the world origin lands on (ax, ay) at `ppu` px per unit. */
function FilmCamera({ cam, format }: { cam: Cam; format: Format }) {
  const camera = useThree((state) => state.camera) as OrthographicCamera;
  camera.left = -cam.ax / cam.ppu;
  camera.right = (format.width - cam.ax) / cam.ppu;
  camera.top = cam.ay / cam.ppu;
  camera.bottom = -(format.height - cam.ay) / cam.ppu;
  camera.zoom = 1;
  camera.near = 0.1;
  camera.far = 4000;
  camera.position.copy(CAMERA_DIRECTION).multiplyScalar(200);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return null;
}

function Scene({ t, cam, format }: { t: number; cam: Cam; format: Format }) {
  const state = stackAt(format, t);
  const material = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false }), []);
  const gold = useMemo(() => new MeshBasicMaterial({
    vertexColors: true, toneMapped: false, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  }), []);
  useEffect(() => () => { material.dispose(); gold.dispose(); }, [material, gold]);

  const accentLayer = { color: ACCENT, height: 1, record: false };
  const setGeometry = useGeometry(() => createSlabGeometry(slab('set', SET_HEIGHT, [accentLayer]), BUILD_TUNING, 'strata'));
  const uiGeometry = useGeometry(() => createSlabGeometry(slab('ui', UI_SLAB_HEIGHT, [accentLayer]), BUILD_TUNING, 'strata'));
  const push = WEEK_ONE[0];
  // Casting's split: pigment first, then the earned seam drawn in gold, left to right.
  const pushPigment = useGeometry(() => createSlabGeometry(single('push', { ...push, record: false }), BUILD_TUNING, 'strata'));
  const pushSeam = useGeometry(() => createRecordSeamGeometry(single('push', push), BUILD_TUNING, true));
  const weekOnePieces = useMemo(() => WEEK_ONE.map((layer, index) => createSlabGeometry(single(`w1-${index}`, layer), BUILD_TUNING, 'strata')), []);
  const weekOne = useGeometry(() => createSlabGeometry(HISTORY[0], BUILD_TUNING, 'strata'));
  const rainGeometries = useMemo(() => RAIN_WEEKS.map((week) => createSlabGeometry(week, BUILD_TUNING, 'strata')), []);
  const finalGeometry = useGeometry(() => createSlabGeometry(FINAL_WEEK, BUILD_TUNING, 'strata'));
  useEffect(() => () => { weekOnePieces.forEach((g) => g.dispose()); rainGeometries.forEach((g) => g.dispose()); }, [weekOnePieces, rainGeometries]);

  const seamVertices = pushSeam.getAttribute('position').count;
  pushSeam.setDrawRange(0, Math.floor((seamVertices * state.goldReveal) / 3) * 3);
  gold.opacity = state.goldReveal > 0 ? 0.9 + 0.3 * state.goldGlow : 0;

  const still = (y: number): SlabPose => ({ y, lift: 0, dx: 0, scaleY: 1, visible: true });
  return (
    <>
      <FilmCamera cam={cam} format={format} />
      <group scale={[1, 1 - state.squash, 1]}>
        {/* Plinth, as in BuildScene.native.tsx; the stage is set once the workout appears. */}
        {t >= T.uiIn ? <><mesh position={[0, 0, 0]}><boxGeometry args={[2.22, 0.15, 2.22]} /><meshBasicMaterial color="#51483A" toneMapped={false} /></mesh>
        <mesh position={[0, -0.11, 0]}><boxGeometry args={[2.36, 0.075, 2.36]} /><meshBasicMaterial color="#29231B" toneMapped={false} /></mesh></> : null}

        {state.press.map((pose, index) => (
          <Slab key={`press-${index}`} geometry={index < SET_COUNT ? setGeometry : uiGeometry} material={material} pose={pose} />
        ))}
        {state.piece.visible ? (
          <group position={[0, state.piece.y, 0]} scale={[1, 1 + state.piece.pop, 1]}>
            <mesh geometry={pushPigment} material={material} />
            <mesh geometry={pushSeam} material={gold} />
          </group>
        ) : null}
        {state.loose.map((pose, index) => <Slab key={`loose-${index}`} geometry={weekOnePieces[index + 1]} material={material} pose={pose} />)}
        {state.fusion ? (
          <group position={[0, HISTORY_BASE + state.fusion.lift, 0]}>
            {state.fusion.fused
              ? <mesh geometry={weekOne} material={material} />
              : state.fusion.pieces.map((piece, index) => (
                <mesh key={index} geometry={weekOnePieces[index]} material={material} position={[0, piece.y, 0]} scale={[1, piece.scaleY, 1]} />
              ))}
          </group>
        ) : null}
        {state.weekOne ? <Slab geometry={weekOne} material={material} pose={still(HISTORY_BASE)} /> : null}
        {state.rain.map((pose, index) => <Slab key={`rain-${index}`} geometry={rainGeometries[index]} material={material} pose={pose} />)}
        <Slab geometry={finalGeometry} material={material} pose={state.final} />
      </group>
    </>
  );
}
const HISTORY_BASE = 0.12;
void BASE_HEIGHT;

export function BuildLayer({ t, cam, format }: { t: number; cam: Cam; format: Format }) {
  return (
    <ThreeCanvas width={format.width} height={format.height} orthographic gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      style={{ position: 'absolute', inset: 0, zIndex: 1 }} camera={{ position: [8, 6, 10], zoom: 1, near: 0.1, far: 4000 }}>
      <Scene t={t} cam={cam} format={format} />
    </ThreeCanvas>
  );
}
