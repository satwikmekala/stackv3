/* eslint-disable react/no-unknown-property -- React Three Fiber elements use Three.js properties. */
import { Component, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { MeshBasicMaterial, OrthographicCamera, Vector3 } from 'three';
import { createSlabGeometry } from './geometry';
import { layoutSlabs, type BuildSlab, type BuildTuning, type Lamination } from './model';
import type { BuildSceneProps } from './sceneTypes';

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error('[Build renderer]', error); }
  render() {
    return this.state.failed
      ? <View style={styles.error}><Text style={styles.errorText}>The 3D preview could not open. Close and reopen the sandbox to retry.</Text></View>
      : this.props.children;
  }
}

function Slab({ slab, tuning, lamination, y, material }: {
  slab: BuildSlab; tuning: BuildTuning; lamination: Lamination; y: number; material: MeshBasicMaterial;
}) {
  const geometry = useMemo(() => createSlabGeometry(slab, tuning, lamination), [slab, tuning, lamination]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh position={[0, y, 0]} geometry={geometry} material={material} dispose={null} />;
}

function Scene(props: BuildSceneProps) {
  const { slabs, tuning, lamination, overview, reducedMotion, benchmark, onStats } = props;
  const { size, invalidate, gl } = useThree();
  const { items, top } = useMemo(() => layoutSlabs(slabs), [slabs]);
  const material = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false }), []);
  useEffect(() => () => material.dispose(), [material]);
  const target = useRef(new Vector3());
  const positioned = useRef(false);
  const measure = useRef<{ start: number; last: number; samples: number[] } | null>(null);

  useEffect(() => { invalidate(); }, [overview, top, size, reducedMotion, invalidate]);
  useEffect(() => {
    if (!benchmark) return;
    measure.current = { start: performance.now(), last: 0, samples: [] };
    invalidate();
    return () => { measure.current = null; };
  }, [benchmark, invalidate]);

  useFrame(({ camera }, delta) => {
    const ortho = camera as OrthographicCamera;
    const targetY = overview ? top / 2 : Math.max(0.3, top - 1.65);
    const desiredZoom = overview
      ? Math.min(size.width / 4.6, size.height / (top * 0.91 + 3.1))
      : Math.min(size.width / 4.6, size.height / Math.min(top + 3.1, 6.5));
    const blend = reducedMotion || !positioned.current ? 1 : 1 - Math.exp(-delta * 9);
    target.current.y += (targetY - target.current.y) * blend;
    ortho.zoom += (desiredZoom - ortho.zoom) * blend;
    // Move far enough away for very tall orthographic towers; perspective never changes.
    const distance = Math.max(1, top / 10);
    camera.position.set(8 * distance, target.current.y + 6 * distance, 10 * distance);
    camera.lookAt(target.current);
    ortho.updateProjectionMatrix();
    positioned.current = true;
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
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[2.22, 0.15, 2.22]} />
      <meshBasicMaterial color="#51483A" />
    </mesh>
    <mesh position={[0, -0.11, 0]}>
      <boxGeometry args={[2.36, 0.075, 2.36]} />
      <meshBasicMaterial color="#29231B" />
    </mesh>
    {items.map(({ slab, y }) => <Slab key={slab.id} slab={slab} y={y} tuning={tuning} lamination={lamination} material={material} />)}
  </>;
}

export default function BuildScene(props: BuildSceneProps) {
  return <SceneBoundary>
    <Canvas
      orthographic camera={{ position: [8, 6, 10], zoom: 70, near: 0.1, far: 2000 }}
      frameloop="demand" gl={{ antialias: true, alpha: true }}
      style={styles.canvas}
    >
      <Scene {...props} />
    </Canvas>
  </SceneBoundary>;
}

const styles = StyleSheet.create({
  canvas: { flex: 1 },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  errorText: { color: '#F5F0E8', textAlign: 'center', lineHeight: 24 },
});
