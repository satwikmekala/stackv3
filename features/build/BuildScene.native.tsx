/* eslint-disable react/no-unknown-property -- React Three Fiber elements use Three.js properties. */
import { Component, createRef, memo, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { BufferGeometry, Group, MeshBasicMaterial, OrthographicCamera, Vector3 } from 'three';
import { cameraFrame, overviewFillFrame } from './monolithModel';
import { fusionVisibleHistory, fusionFrame, fusionPeakHeight, type FusionPhase } from './fusion';
import { castingFrame, type CastingPhase } from './casting';
import { createHistoryGeometry, createRecordSeamGeometry, createSlabGeometry } from './geometry';
import { BASE_HEIGHT, layoutSlabs, type BuildSlab, type BuildTuning, type Lamination } from './model';
import type { BuildSceneProps } from './sceneTypes';

/** Where page 3 (weekly fusion) leaves the camera; page 4 starts its pull-back from here. */
const INTRO_HANDOFF_Y = 0.08;
/** Introduction pages 1–3 sit their small stack this share of the canvas below centre. */
const INTRO_DROP = 0.2;
/** The camera looks down at the target, so a world-Y shift shows on screen scaled by this. */
const CAMERA_ELEVATION_COS = Math.hypot(8, 10) / Math.hypot(8, 6, 10);
/** Raising the camera target lowers the object on screen; this is the rise for the intro drop. */
const introDropY = (zoom: number, height: number) => INTRO_DROP * height / (zoom * CAMERA_ELEVATION_COS);
const introSmoother = (elapsed: number, start: number, end: number) => {
  const t = Math.max(0, Math.min(1, (elapsed - start) / (end - start)));
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const introEase = (elapsed: number, start: number, end: number) => {
  const t = Math.max(0, Math.min(1, (elapsed - start) / (end - start)));
  return t * t * (3 - 2 * t);
};

// Matches a UIKit-style critically damped spring with a ~0.45s response: it moves on the
// very first frame and is visually settled in about half a second, with no long creep.
const CAMERA_SMOOTH_TIME = 0.14;
/** Frame-rate independent critically damped spring (Game Programming Gems 4, 1.10). */
function smoothDamp(current: number, goal: number, velocity: number, dt: number) {
  const omega = 2 / CAMERA_SMOOTH_TIME;
  const x = omega * dt;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - goal;
  const temp = (velocity + omega * change) * dt;
  return { value: goal + (change + temp) * decay, velocity: (velocity - omega * temp) * decay };
}

class SceneBoundary extends Component<{ children: ReactNode; onError?: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error('[Build renderer]', error); this.props.onError?.(); }
  render() {
    return this.state.failed && this.props.onError ? null : this.state.failed
      ? <View style={styles.error}><Text style={styles.errorText}>The 3D preview could not open. Your training is saved. Close Your Stack and open it again to retry.</Text></View>
      : this.props.children;
  }
}

function Slab({ slab, tuning, lamination, y, material, onSelect }: {
  slab: BuildSlab; tuning: BuildTuning; lamination: Lamination; y: number; material: MeshBasicMaterial; onSelect?: (id: string) => void;
}) {
  const geometry = useMemo(() => createSlabGeometry(slab, tuning, lamination), [slab, tuning, lamination]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh onClick={onSelect ? (event) => { event.stopPropagation(); onSelect(slab.id); } : undefined} position={[0, y, 0]} geometry={geometry} material={material} dispose={null} />;
}

function IntroSlab({ slab, tuning, y, material, objectRef, visible }: {
  slab: BuildSlab; tuning: BuildTuning; y: number; material: MeshBasicMaterial; objectRef: RefObject<Group | null>; visible: boolean;
}) {
  const geometry = useMemo(() => createSlabGeometry(slab, tuning, 'strata'), [slab, tuning]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <group ref={objectRef} position={[0, y, 0]} visible={visible}>
    <mesh geometry={geometry} material={material} dispose={null} />
  </group>;
}

function IntroProgressSlab({ slab, tuning, y, material, goldMaterial, objectRef, visible, seamGeometry }: {
  slab: BuildSlab; tuning: BuildTuning; y: number; material: MeshBasicMaterial; goldMaterial: MeshBasicMaterial;
  objectRef: RefObject<Group | null>; visible: boolean; seamGeometry?: BufferGeometry;
}) {
  const geometry = useMemo(() => createSlabGeometry(slab, tuning, 'strata'), [slab, tuning]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <group ref={objectRef} position={[0, y, 0]} visible={visible}>
    <mesh geometry={geometry} material={material} dispose={null} />
    {seamGeometry && <mesh geometry={seamGeometry} material={goldMaterial} dispose={null} />}
  </group>;
}

function CastingSlab({ slab, tuning, objectRef, material, goldMaterial }: {
  slab: BuildSlab; tuning: BuildTuning; objectRef: RefObject<Group | null>; material: MeshBasicMaterial; goldMaterial: MeshBasicMaterial;
}) {
  const [pigment, seams] = useMemo(() => [
    createSlabGeometry({ ...slab, layers: slab.layers.map((layer) => ({ ...layer, record: false })) }, tuning, 'strata'),
    createRecordSeamGeometry(slab, tuning),
  ], [slab, tuning]);
  useEffect(() => () => { pigment.dispose(); seams.dispose(); }, [pigment, seams]);
  return <group ref={objectRef}><mesh geometry={pigment} material={material} dispose={null} /><mesh geometry={seams} material={goldMaterial} dispose={null} /></group>;
}

function FusionSlab({ slab, tuning, objectRef, material }: {
  slab: BuildSlab; tuning: BuildTuning; objectRef: RefObject<Group | null>; material: MeshBasicMaterial;
}) {
  const geometries = useMemo(() => [
    ...slab.layers.map((layer, index) => createSlabGeometry({ id: `${slab.id}:${index}`, height: layer.height, sealed: false, layers: [layer] }, tuning, 'strata')),
    createSlabGeometry(slab, tuning, 'strata'),
  ], [slab, tuning]);
  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries]);
  return <group ref={objectRef}>{geometries.map((geometry, index) => <mesh key={index} geometry={geometry} material={material} dispose={null} />)}</group>;
}

function FusionHistory({ items, tuning, material }: { items: { slab: BuildSlab; y: number }[]; tuning: BuildTuning; material: MeshBasicMaterial }) {
  const geometry = useMemo(() => createHistoryGeometry(items, tuning), [items, tuning]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={material} dispose={null} />;
}

function Scene(props: BuildSceneProps) {
  const { slabs, tuning, lamination, overview, reducedMotion, benchmark, onStats, focusRange, markers, onMarkers, onSelectSlab, paused, casting, fusion, introStack, introProgress, introFusion, introOverview } = props;
  const { size, invalidate, gl } = useThree();
  const { items, top } = useMemo(() => layoutSlabs(slabs, props.pieceGap), [slabs, props.pieceGap]);
  const looseItems = useMemo(() => layoutSlabs(introFusion?.loosePieces ?? []).items, [introFusion?.loosePieces]);
  const material = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false }), []);
  useEffect(() => () => material.dispose(), [material]);
  const pieceMaterial = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false }), []);
  const goldMaterial = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), []);
  useEffect(() => () => { pieceMaterial.dispose(); goldMaterial.dispose(); }, [pieceMaterial, goldMaterial]);
  // GPU resources are intentionally imperative; React state only tracks phase labels.
  const animationMaterials = useRef({ history: material, gold: goldMaterial });
  const castObject = useRef<Group>(null);
  const historyObject = useRef<Group>(null);
  const introHistoryObject = useRef<Group>(null);
  const introFusionObject = useRef<Group>(null);
  const castItem = casting ? items.find((item) => item.slab.id === casting.slabId) : undefined;
  const castWarmup = useRef(0);
  const castElapsed = useRef(0);
  // Casting's hidden history is one merged mesh clipped to where the reveal leaves the camera,
  // as fusion does, rather than a mesh per slab across the whole history.
  const castHistory = useMemo(() => {
    if (!castItem) return [];
    const frame = cameraFrame(top, size.width, size.height, overview, focusRange);
    return fusionVisibleHistory(items, castItem.y, frame.targetY, size.height, frame.zoom);
  }, [castItem, items, top, size.width, size.height, overview, focusRange]);
  const castPhase = useRef<CastingPhase | null>(null);
  const castFinished = useRef(false);
  const introObjects = useRef<RefObject<Group | null>[]>([]);
  const introElapsed = useRef(0);
  const introLandings = useRef([false, false, false]);
  const introFinished = useRef(false);
  const introIsStatic = Boolean(introStack?.alreadyPlayed || introProgress?.alreadyPlayed || introFusion?.alreadyPlayed || reducedMotion);
  const hasIntroScene = Boolean(introStack || introProgress || introFusion);
  const introProgressSeam = useMemo(() => {
    const source = introProgress ? items[4]?.slab : undefined;
    if (!source) return null;
    return createRecordSeamGeometry({ ...source, layers: source.layers.map((layer) => ({ ...layer, record: true })) }, tuning, true);
  }, [Boolean(introProgress), items, tuning]);
  useEffect(() => () => introProgressSeam?.dispose(), [introProgressSeam]);
  while (introObjects.current.length < items.length) introObjects.current.push(createRef<Group>());
  const progressElapsed = useRef(0);
  const progressLandings = useRef([false, false]);
  const progressGrowthStarted = useRef(false);
  const progressSeamCompleted = useRef(false);
  const progressFinished = useRef(false);
  const introFusionElapsed = useRef(0);
  const introFusionPressStarted = useRef(false);
  const introFusionFinished = useRef(false);
  const introOverviewElapsed = useRef(0);
  const introOverviewWarmup = useRef(0);
  const introOverviewPullbackFinished = useRef(false);
  const introOverviewFinished = useRef(false);
  const introHistoryHeight = introFusion
    ? Math.max(0, (items[introFusion.historyCount]?.y ?? items[0]?.y ?? 0) - (items[0]?.y ?? 0))
    : 0;
  const fusionObject = useRef<Group>(null);
  const futureObject = useRef<Group>(null);
  const fusionItem = fusion ? items.find((item) => item.slab.id === fusion.weekId) : undefined;
  const fusionBounds = useMemo(() => fusionItem ? { bottom: Math.max(0, fusionItem.y - .4), top: fusionItem.y + 1.1 + fusionPeakHeight(fusionItem.slab.layers, fusionItem.slab.height) + .3 } : undefined, [fusionItem]);
  const fusionFraming = useMemo(() => cameraFrame(top, size.width, size.height, false, fusionBounds), [top, size.width, size.height, fusionBounds]);
  // Include a generous viewport margin, but do not upload years of offscreen vertices
  // into one native GL buffer. Only fusion uses this fixed camera window.
  const fusionHistory = useMemo(() => fusionItem ? fusionVisibleHistory(items, fusionItem.y, fusionFraming.targetY, size.height, fusionFraming.zoom) : [], [items, fusionItem, fusionFraming, size.height]);
  const fusionWarmup = useRef(0);
  const fusionElapsed = useRef(0);
  const fusionSamples = useRef<number[]>([]);
  const fusionLast = useRef<number | null>(null);
  const fusionPhase = useRef<FusionPhase | null>(null);
  const fusionFinished = useRef(false);
  const target = useRef(new Vector3());
  const cameraVelocity = useRef({ y: 0, zoom: 0 });
  const repaintUntil = useRef(0);
  const positioned = useRef(false);
  const markerPoint = useRef(new Vector3());
  const lastMarkers = useRef('');
  const measure = useRef<{ start: number; last: number; samples: number[] } | null>(null);

  useEffect(() => { if (!paused) invalidate(); }, [overview, top, size, reducedMotion, focusRange, markers, paused, invalidate]);
  useEffect(() => {
    if (paused) return;
    // Native GL can recreate its drawable after the layout commit, and a screen handoff
    // (intro -> Your Stack, a sheet closing) can take longer than any fixed timer. Keep
    // painting every frame for a short window instead, then return to demand-only rendering.
    repaintUntil.current = performance.now() + 700;
    invalidate();
  }, [size.width, size.height, paused, invalidate]);
  useEffect(() => {
    if (!benchmark) return;
    measure.current = { start: performance.now(), last: 0, samples: [] };
    invalidate();
    return () => { measure.current = null; };
  }, [benchmark, invalidate]);

  useFrame(({ camera }, delta) => {
    const ortho = camera as OrthographicCamera;
    let { targetY, zoom: desiredZoom } = overview && !introOverview ? overviewFillFrame(top, size.width, size.height) : cameraFrame(top, size.width, size.height, overview, focusRange);
    if (introOverview && (introOverview.alreadyPlayed || reducedMotion)) {
      const frame = cameraFrame(top, size.width, size.height, true);
      targetY = frame.targetY;
      desiredZoom = frame.zoom;
      introOverviewFinished.current = true;
    } else if (introOverview && !introOverviewFinished.current) {
      // The first frames on this page upload the whole tower to the GPU; hold the clock
      // until they are through so the pull-back never starts on a stalled frame.
      if (introOverviewWarmup.current++ >= 3) introOverviewElapsed.current += Math.min(delta * 1000, 34);
      const overviewFrame = cameraFrame(top, size.width, size.height, true);
      const closeZoom = cameraFrame(top, size.width, size.height, false, { bottom: 0, top: 0.6 }).zoom;
      const progress = introSmoother(introOverviewElapsed.current, 300, 1800);
      // Zoom geometrically so the tower recedes at an even perceived rate instead of
      // crawling and then rushing at the end. The view's centre follows its visible span
      // from where page 3 leaves the camera, so the plinth stays put across the page change.
      desiredZoom = closeZoom * (overviewFrame.zoom / closeZoom) ** progress;
      const spanRange = 1 / overviewFrame.zoom - 1 / closeZoom;
      const spanProgress = Math.abs(spanRange) < 1e-6 ? progress : (1 / desiredZoom - 1 / closeZoom) / spanRange;
      // Start from page 3's lowered frame; the drop eases out as the tower fills the view.
      const handoffY = INTRO_HANDOFF_Y + introDropY(closeZoom, size.height);
      targetY = handoffY + (overviewFrame.targetY - handoffY) * spanProgress;
      if (!introOverviewPullbackFinished.current && introOverviewElapsed.current >= 1800) {
        introOverviewPullbackFinished.current = true;
        introOverview.onPullbackComplete();
      }
      if (introOverviewElapsed.current >= 2100) {
        introOverviewFinished.current = true;
        introOverview.onComplete();
      } else invalidate();
    }
    if (introStack && introIsStatic) {
      introFinished.current = true;
      items.forEach((item, index) => {
        const object = introObjects.current[index]?.current;
        if (object) { object.visible = true; object.position.y = item.y; }
      });
    } else if (introProgress && introIsStatic) {
      progressFinished.current = true;
      items.forEach((item, index) => {
        const object = introObjects.current[index]?.current;
        if (object) { object.visible = true; object.position.y = item.y; object.scale.y = 1; }
      });
      if (introObjects.current[3]?.current) introObjects.current[3].current!.scale.y = 1.45;
      if (introProgressSeam) introProgressSeam.setDrawRange(0, introProgressSeam.getAttribute('position').count);
      animationMaterials.current.gold.opacity = 0.9;
    } else if (introFusion && introIsStatic) {
      introFusionFinished.current = true;
      const history = introHistoryObject.current;
      if (history) { history.visible = true; history.position.y = 0; }
      const object = introFusionObject.current;
      const block = items[introFusion.historyCount];
      if (object && block) {
        object.position.y = block.y;
        const layerCount = block.slab.layers.length;
        object.children.forEach((child, index) => { child.visible = index === layerCount; child.position.y = 0; child.scale.y = 1; });
      }
      targetY = 0.08;
    } else if (introStack && !introFinished.current) {
      introElapsed.current += Math.min(delta * 1000, 34);
      const starts = [400, 1000, 1600];
      const fallMs = 280;
      const bounceMs = 80;
      const bounceHeight = 0.045;
      items.forEach((item, index) => {
        const object = introObjects.current[index]?.current;
        if (!object) return;
        const local = introElapsed.current - starts[index];
        if (local < 0) {
          object.visible = false;
          return;
        }
        object.visible = true;
        if (!introLandings.current[index] && local >= fallMs) {
          introLandings.current[index] = true;
          introStack.onLanding(index);
        }
        const lift = local < fallMs
          ? 3.2 * (1 - (local / fallMs) ** 2)
          : local < fallMs + bounceMs
            ? bounceHeight * Math.sin(Math.PI * (local - fallMs) / bounceMs)
            : 0;
        object.position.y = item.y + lift;
      });
      if (introLandings.current.every(Boolean) && introElapsed.current >= starts[2] + fallMs + bounceMs) {
        introFinished.current = true;
        introStack.onComplete();
      } else invalidate();
    }
    if (introProgress && !introIsStatic && !progressFinished.current) {
      progressElapsed.current += Math.min(delta * 1000, 34);
      const elapsed = progressElapsed.current;
      const firstThree = items.slice(0, 3);
      firstThree.forEach((item, index) => {
        const object = introObjects.current[index]?.current;
        if (object) { object.visible = true; object.position.y = item.y; }
      });

      const push = items[3];
      const pushObject = introObjects.current[3]?.current;
      if (push && pushObject) {
        const pushStart = 300;
        const fallMs = 280;
        const local = elapsed - pushStart;
        pushObject.visible = local >= 0;
        const lift = local < 0 ? 3.2 : local < fallMs ? 3.2 * (1 - (local / fallMs) ** 2) : local < fallMs + 80 ? 0.045 * Math.sin(Math.PI * (local - fallMs) / 80) : 0;
        pushObject.position.y = push.y + lift;
        const steps = [1.15, 1.3, 1.45];
        const stepStarts = [900, 1200, 1500];
        let scale = 1;
        for (let index = 0; index < steps.length; index++) {
          const stepProgress = (elapsed - stepStarts[index]) / 140;
          if (stepProgress <= 0) break;
          if (stepProgress < 1) {
            const easeOut = 1 - (1 - stepProgress) ** 3;
            scale += (steps[index] - scale) * easeOut;
            break;
          }
          scale = steps[index];
        }
        pushObject.scale.y = scale;
        if (!progressLandings.current[0] && local >= fallMs) {
          progressLandings.current[0] = true;
          introProgress.onLanding(0);
        }
        if (!progressGrowthStarted.current && elapsed >= stepStarts[0]) {
          progressGrowthStarted.current = true;
          introProgress.onGrowthStart();
        }
      }

      const pull = items[4];
      const pullObject = introObjects.current[4]?.current;
      if (pull && pullObject) {
        const pullStart = 2000;
        const fallMs = 280;
        const local = elapsed - pullStart;
        pullObject.visible = local >= 0;
        const lift = local < 0 ? 3.2 : local < fallMs ? 3.2 * (1 - (local / fallMs) ** 2) : local < fallMs + 80 ? 0.045 * Math.sin(Math.PI * (local - fallMs) / 80) : 0;
        pullObject.position.y = pull.y + lift;
        if (!progressLandings.current[1] && local >= fallMs) {
          progressLandings.current[1] = true;
          introProgress.onLanding(1);
        }
      }

      const seamStart = 2400;
      const seamElapsed = elapsed - seamStart;
      if (introProgressSeam) {
        const vertexCount = introProgressSeam.getAttribute('position').count;
        if (seamElapsed <= 0) {
          introProgressSeam.setDrawRange(0, 0);
          animationMaterials.current.gold.opacity = 0;
        } else if (seamElapsed < 500) {
          const revealed = Math.floor(vertexCount * (seamElapsed / 500) / 3) * 3;
          introProgressSeam.setDrawRange(0, revealed);
          animationMaterials.current.gold.opacity = 0.9;
        } else {
          introProgressSeam.setDrawRange(0, vertexCount);
          const pulse = seamElapsed < 680 ? Math.sin(Math.PI * (seamElapsed - 500) / 180) : 0;
          animationMaterials.current.gold.opacity = 0.9 + pulse * 0.3;
          if (!progressSeamCompleted.current) {
            progressSeamCompleted.current = true;
            introProgress.onSeamComplete();
          }
        }
      }
      if (seamElapsed >= 680) {
        progressFinished.current = true;
        introProgress.onComplete();
      } else invalidate();
    }
    if (introFusion && !introIsStatic && !introFusionFinished.current) {
      introFusionElapsed.current += Math.min(delta * 1000, 34);
      const elapsed = introFusionElapsed.current;
      const layers = items[introFusion.historyCount]?.slab.layers ?? [];
      const block = items[introFusion.historyCount];
      const object = introFusionObject.current;
      const gather = introEase(elapsed, 300, 800);
      const compression = introEase(elapsed, 800, 1400);
      const historyRise = introEase(elapsed, 1700, 2500);
      if (object && block) {
        const groupLift = 0.07 * gather * (1 - compression);
        object.position.y = (looseItems[0]?.y ?? 0.12) + introHistoryHeight * historyRise + groupLift;
        const pieceScale = 1 - compression * 0.65;
        const gap = (0.045 + gather * 0.07) * (1 - compression);
        let cursor = 0;
        layers.forEach((layer, index) => {
          const child = object.children[index];
          child.visible = elapsed < 1400;
          child.position.y = cursor;
          child.scale.y = pieceScale;
          cursor += layer.height * BASE_HEIGHT * pieceScale + gap;
        });
        const composite = object.children[layers.length];
        if (composite) composite.visible = elapsed >= 1400;
      }
      const history = introHistoryObject.current;
      if (history) {
        history.visible = elapsed >= 1700;
        history.position.y = -introHistoryHeight * (1 - historyRise);
      }
      targetY = 0.3 - 0.22 * historyRise;
      if (!introFusionPressStarted.current && elapsed >= 800) {
        introFusionPressStarted.current = true;
        introFusion.onPressStart();
      }
      if (elapsed >= 2500) {
        introFusionFinished.current = true;
        introFusion.onComplete();
      } else invalidate();
    }
    if (casting && castItem) {
      // Same warm-up and delta clamp as fusion: a stalled first frame cannot eat the form beat.
      if (castWarmup.current++ >= 3) castElapsed.current += Math.min(delta * 1000, 34);
      const playback = castElapsed.current;
      casting.onProgress?.(playback);
      const frame = castingFrame(casting.animationTime ? casting.animationTime(playback) : playback, castItem.slab.height);
      if (castObject.current) { castObject.current.position.y = castItem.y + frame.lift; castObject.current.scale.y = frame.scaleY; }
      if (historyObject.current) historyObject.current.visible = frame.reveal > 0;
      animationMaterials.current.history.transparent = true;
      animationMaterials.current.history.opacity = frame.reveal;
      animationMaterials.current.gold.opacity = frame.gold;
      const isolatedY = castItem.y + 1.3 + castItem.slab.height * BASE_HEIGHT * frame.scaleY / 2;
      // Frame the tower as if it were as tall as the still-lifted piece, so the camera settles
      // with the piece as it lands instead of arriving first and cropping it; at lift 0 this is
      // exactly the resting frame, so nothing moves once the landing ends.
      const landing = cameraFrame(Math.max(top, castItem.y + castItem.slab.height * BASE_HEIGHT + frame.lift), size.width, size.height, overview, focusRange);
      targetY = isolatedY + (landing.targetY - isolatedY) * frame.reveal;
      desiredZoom = size.width / 4.6 + (landing.zoom - size.width / 4.6) * frame.reveal;
      if (frame.phase !== castPhase.current) { castPhase.current = frame.phase; casting.onPhase(frame.phase); }
      if (frame.done && !castFinished.current) { castFinished.current = true; casting.onComplete(); }
      if (!frame.done) invalidate();
    }
    if (fusion && fusionItem) {
      const now = performance.now();
      if (!fusionFinished.current && fusionLast.current !== null) fusionSamples.current.push(now - fusionLast.current);
      fusionLast.current = now;
      // Let the first submitted frames upload geometry before starting the motion.
      // A delayed frame must not jump the object through a large part of a beat.
      if (fusionWarmup.current++ >= 3) fusionElapsed.current += Math.min(delta * 1000, 34);
      fusion.onProgress?.(fusionElapsed.current);
      const frame = fusionFrame(fusionElapsed.current, fusionItem.slab.layers, fusionItem.slab.height);
      const object = fusionObject.current;
      if (object) {
        object.position.y = fusionItem.y + frame.lift;
        frame.pieces.forEach((piece, index) => {
          const child = object.children[index];
          child.visible = !frame.fused;
          child.position.y = piece.y;
          child.scale.y = piece.scaleY;
        });
        object.children[frame.pieces.length].visible = frame.fused;
      }
      if (futureObject.current) futureObject.current.visible = frame.seated;
      // Zoom fits the whole lift; the view centres on the week itself, following half of its
      // rise, so it starts and lands in the middle of the stage instead of below the headroom.
      targetY = fusionItem.y + frame.height / 2 + frame.lift * 0.5;
      desiredZoom = fusionFraming.zoom;
      if (frame.phase !== fusionPhase.current) { fusionPhase.current = frame.phase; fusion.onPhase(frame.phase); }
      if (frame.done && !fusionFinished.current) { fusionFinished.current = true;
        const samples = fusionSamples.current;
        const sorted = [...samples].sort((a, b) => a - b);
        if (samples.length) onStats({ frames: samples.length, fps: samples.length * 1000 / samples.reduce((sum, ms) => sum + ms, 0), p95Ms: sorted[Math.floor(sorted.length * .95)], calls: gl.info.render.calls, triangles: gl.info.render.triangles, geometries: gl.info.memory.geometries });
        fusion.onComplete(); }
      if (!frame.done) invalidate();
    }
    if (introStack || introProgress || introFusion) targetY += introDropY(desiredZoom, size.height);
    const logZoom = Math.log(desiredZoom);
    let moving = false;
    if (casting || fusion || introOverview || reducedMotion || !positioned.current) {
      target.current.y = targetY;
      ortho.zoom = desiredZoom;
      cameraVelocity.current.y = 0;
      cameraVelocity.current.zoom = 0;
    } else {
      // Critically damped spring: carries velocity through retargets (rapid Focus/All of it
      // taps) and never overshoots. Zoom springs in log space so zooming out feels as even
      // as zooming in. A stalled frame is clamped so the camera never jumps.
      // The first frame after an idle period reports the whole idle time as its delta.
      const dt = cameraVelocity.current.y === 0 && cameraVelocity.current.zoom === 0 ? 1 / 60 : Math.min(delta, 1 / 20);
      const y = smoothDamp(target.current.y, targetY, cameraVelocity.current.y, dt);
      const zoom = smoothDamp(Math.log(ortho.zoom), logZoom, cameraVelocity.current.zoom, dt);
      cameraVelocity.current.y = y.velocity;
      cameraVelocity.current.zoom = zoom.velocity;
      // Settle once the remaining motion is below a third of a point on screen, so the
      // camera stops cleanly instead of creeping through sub-pixel distances.
      const pointsPerUnit = Math.exp(zoom.value);
      const halfHeight = size.height / 2;
      moving = Math.abs(targetY - y.value) * pointsPerUnit > 0.33 || Math.abs(logZoom - zoom.value) * halfHeight > 0.33
        || Math.abs(y.velocity) * pointsPerUnit > 6 || Math.abs(zoom.velocity) * halfHeight > 6;
      target.current.y = moving ? y.value : targetY;
      ortho.zoom = moving ? Math.exp(zoom.value) : desiredZoom;
      if (!moving) { cameraVelocity.current.y = 0; cameraVelocity.current.zoom = 0; }
    }
    // Move far enough away for very tall orthographic towers; perspective never changes.
    const distance = Math.max(1, top / 10);
    camera.position.set(8 * distance, target.current.y + 6 * distance, 10 * distance);
    camera.lookAt(target.current);
    ortho.updateProjectionMatrix();
    camera.updateMatrixWorld();
    positioned.current = true;
    if (onMarkers) {
      // Ruler labels are React views. Publishing them every frame re-renders the whole screen
      // on the JS thread that also drives this frame loop, so hide them while the camera moves
      // and publish once it settles.
      const visible = overview || moving ? [] : (markers ?? []).map((marker) => {
        const projected = markerPoint.current.set(-1, marker.y, 1).project(camera);
        return { id: marker.id, top: Math.round((1 - projected.y) * size.height / 2) };
      }).filter((marker) => marker.top > 24 && marker.top < size.height - 24);
      const signature = JSON.stringify(visible);
      if (signature !== lastMarkers.current) { lastMarkers.current = signature; onMarkers(visible); }
    }
    if (moving || performance.now() < repaintUntil.current) invalidate();

    const run = measure.current;
    if (run) {
      const now = performance.now();
      // Ignore shader compilation and the first second of warmup.
      if (now - run.start >= 1000 && run.last) run.samples.push(now - run.last);
      run.last = now;
      if (now - run.start >= 11000 && run.samples.length) {
        const sorted = [...run.samples].sort((a, b) => a - b);
        const result = {
          frames: sorted.length,
          fps: sorted.length * 1000 / sorted.reduce((sum, ms) => sum + ms, 0),
          p95Ms: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))],
          calls: gl.info.render.calls, triangles: gl.info.render.triangles, geometries: gl.info.memory.geometries,
        };
        measure.current = null;
        console.info('[Build benchmark]', JSON.stringify({ weeks: slabs.filter((slab) => slab.sealed).length, overview, ...result }));
        onStats(result);
      } else invalidate();
    }
  });

  return <>
    <group ref={historyObject}>
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[2.22, 0.15, 2.22]} />
      <meshBasicMaterial color="#51483A" />
    </mesh>
    <mesh position={[0, -0.11, 0]}>
      <boxGeometry args={[2.36, 0.075, 2.36]} />
      <meshBasicMaterial color="#29231B" />
    </mesh>
    {fusionItem ? <FusionHistory items={fusionHistory} tuning={tuning} material={material} /> : castItem ? castHistory.length > 0 && <FusionHistory items={castHistory} tuning={tuning} material={material} /> : introOverview ? <FusionHistory items={items} tuning={tuning} material={material} /> : !hasIntroScene && items.filter(({ slab }) => slab.id !== casting?.slabId).map(({ slab, y }) => <Slab key={slab.id} slab={slab} y={y} onSelect={onSelectSlab} tuning={tuning} lamination={lamination} material={material} />)}
    {introStack && items.map(({ slab, y }, index) => <IntroSlab key={slab.id} slab={slab} y={y} tuning={tuning} material={material} objectRef={introObjects.current[index]} visible={introIsStatic} />)}
    {introProgress && items.map(({ slab, y }, index) => <IntroProgressSlab key={slab.id} slab={{ ...slab, height: index === 3 ? 1 : slab.height, layers: slab.layers.map((layer) => ({ ...layer, record: false })) }} y={y} tuning={tuning} material={material} goldMaterial={goldMaterial} objectRef={introObjects.current[index]} visible={introIsStatic || index < 3} seamGeometry={index === 4 ? introProgressSeam ?? undefined : undefined} />)}
    {introFusion && <group ref={introHistoryObject} position={[0, -introHistoryHeight, 0]} visible={introIsStatic}>{items.slice(0, introFusion.historyCount).map(({ slab, y }) => <Slab key={slab.id} slab={slab} y={y} tuning={tuning} lamination="strata" material={material} />)}</group>}
    {introFusion && items[introFusion.historyCount] && <FusionSlab slab={items[introFusion.historyCount].slab} tuning={tuning} objectRef={introFusionObject} material={material} />}
    </group>
    {fusionItem && <>
      <FusionSlab slab={fusionItem.slab} tuning={tuning} objectRef={fusionObject} material={material} />
      <group ref={futureObject}>{items.filter(({ y }) => y > fusionItem.y).map(({ slab, y }) => <Slab key={slab.id} slab={slab} y={y} tuning={tuning} lamination={lamination} material={material} />)}</group>
    </>}
    {castItem && <CastingSlab slab={castItem.slab} tuning={tuning} objectRef={castObject} material={pieceMaterial} goldMaterial={goldMaterial} />}
  </>;
}

const MemoScene = memo(Scene);

export default function BuildScene(props: BuildSceneProps) {
  return <SceneBoundary onError={props.onError}>
    <Canvas
      orthographic camera={{ position: [8, 6, 10], zoom: 70, near: 0.1, far: 2000 }}
      frameloop={props.paused ? 'never' : 'demand'} gl={{ antialias: true, alpha: true }}
      style={styles.canvas}
    >
      <MemoScene {...props} />
    </Canvas>
  </SceneBoundary>;
}

const styles = StyleSheet.create({
  canvas: { flex: 1, width: '100%', height: '100%' },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  errorText: { color: '#F5F0E8', textAlign: 'center', lineHeight: 24 },
});
