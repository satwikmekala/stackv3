/* eslint-disable react/no-unknown-property -- React Three Fiber elements use Three.js properties. */
import { Component, memo, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { Group, MeshBasicMaterial, OrthographicCamera, Vector3 } from 'three';
import { cameraFrame } from './monolithModel';
import { fusionVisibleHistory, fusionFrame, type FusionPhase } from './fusion';
import { castingFrame, type CastingPhase } from './casting';
import { createHistoryGeometry, createRecordSeamGeometry, createSlabGeometry } from './geometry';
import { BASE_HEIGHT, layoutSlabs, type BuildSlab, type BuildTuning, type Lamination } from './model';
import type { BuildSceneProps } from './sceneTypes';

class SceneBoundary extends Component<{ children: ReactNode; onError?: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error('[Build renderer]', error); this.props.onError?.(); }
  render() {
    return this.state.failed && this.props.onError ? null : this.state.failed
      ? <View style={styles.error}><Text style={styles.errorText}>The 3D preview could not open. Close and reopen the sandbox to retry.</Text></View>
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
  const { slabs, tuning, lamination, overview, reducedMotion, benchmark, onStats, focusRange, markers, onMarkers, onSelectSlab, paused, casting, fusion } = props;
  const { size, invalidate, gl } = useThree();
  const { items, top } = useMemo(() => layoutSlabs(slabs, props.pieceGap), [slabs, props.pieceGap]);
  const material = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false }), []);
  useEffect(() => () => material.dispose(), [material]);
  const pieceMaterial = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false }), []);
  const goldMaterial = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), []);
  useEffect(() => () => { pieceMaterial.dispose(); goldMaterial.dispose(); }, [pieceMaterial, goldMaterial]);
  // GPU resources are intentionally imperative; React state only tracks phase labels.
  const animationMaterials = useRef({ history: material, gold: goldMaterial });
  const castObject = useRef<Group>(null);
  const historyObject = useRef<Group>(null);
  const castItem = casting ? items.find((item) => item.slab.id === casting.slabId) : undefined;
  const castStart = useRef<number | null>(null);
  const castPhase = useRef<CastingPhase | null>(null);
  const castFinished = useRef(false);
  const fusionObject = useRef<Group>(null);
  const futureObject = useRef<Group>(null);
  const fusionItem = fusion ? items.find((item) => item.slab.id === fusion.weekId) : undefined;
  const fusionBounds = useMemo(() => fusionItem ? { bottom: Math.max(0, fusionItem.y - .4), top: fusionItem.y + 1.1 + fusionFrame(0, fusionItem.slab.layers, fusionItem.slab.height).height + .3 } : undefined, [fusionItem]);
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
  const positioned = useRef(false);
  const lastMarkers = useRef('');
  const measure = useRef<{ start: number; last: number; samples: number[] } | null>(null);

  useEffect(() => { if (!paused) invalidate(); }, [overview, top, size, reducedMotion, focusRange, markers, paused, invalidate]);
  useEffect(() => {
    if (!benchmark) return;
    measure.current = { start: performance.now(), last: 0, samples: [] };
    invalidate();
    return () => { measure.current = null; };
  }, [benchmark, invalidate]);

  useFrame(({ camera }, delta) => {
    const ortho = camera as OrthographicCamera;
    let { targetY, zoom: desiredZoom } = cameraFrame(top, size.width, size.height, overview, focusRange);
    if (casting && castItem) {
      const now = performance.now();
      castStart.current ??= now;
      const frame = castingFrame(now - castStart.current, castItem.slab.height);
      if (castObject.current) { castObject.current.position.y = castItem.y + frame.lift; castObject.current.scale.y = frame.scaleY; }
      if (historyObject.current) historyObject.current.visible = frame.reveal > 0;
      animationMaterials.current.history.transparent = true;
      animationMaterials.current.history.opacity = frame.reveal;
      animationMaterials.current.gold.opacity = frame.gold;
      const isolatedY = castItem.y + 1.3 + castItem.slab.height * BASE_HEIGHT * frame.scaleY / 2;
      targetY = isolatedY + (targetY - isolatedY) * frame.reveal;
      desiredZoom = size.width / 4.6 + (desiredZoom - size.width / 4.6) * frame.reveal;
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
      const framing = fusionFraming;
      targetY = framing.targetY;
      desiredZoom = framing.zoom;
      if (frame.phase !== fusionPhase.current) { fusionPhase.current = frame.phase; fusion.onPhase(frame.phase); }
      if (frame.done && !fusionFinished.current) { fusionFinished.current = true;
        const samples = fusionSamples.current;
        const sorted = [...samples].sort((a, b) => a - b);
        if (samples.length) onStats({ frames: samples.length, fps: samples.length * 1000 / samples.reduce((sum, ms) => sum + ms, 0), p95Ms: sorted[Math.floor(sorted.length * .95)], calls: gl.info.render.calls, triangles: gl.info.render.triangles, geometries: gl.info.memory.geometries });
        fusion.onComplete(); }
      if (!frame.done) invalidate();
    }
    const blend = casting || fusion || reducedMotion || !positioned.current ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 9);
    target.current.y += (targetY - target.current.y) * blend;
    ortho.zoom += (desiredZoom - ortho.zoom) * blend;
    // Move far enough away for very tall orthographic towers; perspective never changes.
    const distance = Math.max(1, top / 10);
    camera.position.set(8 * distance, target.current.y + 6 * distance, 10 * distance);
    camera.lookAt(target.current);
    ortho.updateProjectionMatrix();
    camera.updateMatrixWorld();
    positioned.current = true;
    if (onMarkers) {
      const visible = overview ? [] : (markers ?? []).map((marker) => {
        const projected = new Vector3(-1, marker.y, 1).project(camera);
        return { id: marker.id, top: Math.round((1 - projected.y) * size.height / 2) };
      }).filter((marker) => marker.top > 24 && marker.top < size.height - 24);
      const signature = JSON.stringify(visible);
      if (signature !== lastMarkers.current) { lastMarkers.current = signature; onMarkers(visible); }
    }
    const moving = Math.abs(targetY - target.current.y) > 0.001 || Math.abs(desiredZoom - ortho.zoom) > 0.01;
    if (moving) invalidate();

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
    {fusionItem ? <FusionHistory items={fusionHistory} tuning={tuning} material={material} /> : items.filter(({ slab }) => slab.id !== casting?.slabId).map(({ slab, y }) => <Slab key={slab.id} slab={slab} y={y} onSelect={onSelectSlab} tuning={tuning} lamination={lamination} material={material} />)}
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
  canvas: { flex: 1 },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  errorText: { color: '#F5F0E8', textAlign: 'center', lineHeight: 24 },
});
