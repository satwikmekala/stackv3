import { BufferGeometry, Color, Float32BufferAttribute } from 'three';
import { BASE_HEIGHT, GOLD, type BuildSlab, type BuildTuning, type Lamination } from './model';

type Point = [number, number, number];

/** One mesh, including strata, key face, seam and inlay; no child session meshes. */
export function createSlabGeometry(slab: BuildSlab, tuning: BuildTuning, lamination: Lamination): BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const recordMask: number[] = [];
  const height = slab.height * BASE_HEIGHT;
  const cut = Math.min(0.55, Math.max(0.08, tuning.chamfer));
  const perimeter: [number, number][] = [[-1, -1], [1, -1], [1, 1 - cut], [1 - cut, 1], [-1, 1]];
  const layers = slab.layers;
  if (!layers.length) throw new Error('A slab needs at least one layer');
  const topColor = layers[layers.length - 1].color;
  const topHasRecord = layers[layers.length - 1].record;
  const triangle = (a: Point, b: Point, c: Point, color: string, light = 1) => {
    positions.push(...a, ...b, ...c);
    recordMask.push(...Array(3).fill(color === GOLD ? 1 : 0));
    const rgb = new Color(color);
    if (color !== GOLD) {
      // Preserve category hues; richer pigment belongs to Build, not the app-wide palette.
      const hsl = { h: 0, s: 0, l: 0 };
      rgb.getHSL(hsl, 'srgb');
      rgb.setHSL(hsl.h, Math.min(1, hsl.s * 1.18), Math.min(0.72, hsl.l + 0.035), 'srgb');
    }
    rgb.multiplyScalar(light);
    for (let i = 0; i < 3; i++) colors.push(rgb.r, rgb.g, rgb.b);
  };
  const quad = (a: Point, b: Point, c: Point, d: Point, color: string, light = 1) => {
    triangle(a, b, c, color, light); triangle(a, c, d, color, light);
  };
  const point = ([x, z]: [number, number], y: number): Point => [x, y, z];
  const total = layers.reduce((sum, layer) => sum + layer.height, 0);
  const bandHeight = slab.sealed && lamination === 'edge-grain' ? height * 0.28 : height;

  perimeter.forEach((a, edge) => {
    const b = perimeter[(edge + 1) % perimeter.length];
    const key = edge === 2;
    const light = key ? 1.08 : edge === 1 ? 0.66 : 0.88;
    let y = 0;
    layers.forEach((layer) => {
      const next = y + bandHeight * layer.height / total;
      const seam = layer.record ? Math.min((next - y) * 0.10, Math.max(0, tuning.seam)) : 0;
      quad(point(a, y), point(a, next - seam), point(b, next - seam), point(b, y), layer.color, light);
      if (seam > 0) quad(point(a, next - seam), point(a, next), point(b, next), point(b, next - seam), GOLD, 1.35);
      y = next;
    });
    if (height - y > 1e-8) {
      quad(point(a, y), point(a, height), point(b, height), point(b, y), topColor, light);
    }

    // Thin top perimeter inlay carries each source colour; the centre stays solid pigment.
    const inset = slab.sealed && lamination === 'strata-inlay' ? 0.09 : topHasRecord && tuning.seam > 0 ? 0.014 : 0;
    const innerA: [number, number] = [a[0] * (1 - inset), a[1] * (1 - inset)];
    const innerB: [number, number] = [b[0] * (1 - inset), b[1] * (1 - inset)];
    triangle([0, height, 0], point(innerB, height), point(innerA, height), topColor, 1.05);
    if (inset > 0) {
      const lerp = (p: [number, number], q: [number, number], t: number): Point => [p[0] + (q[0] - p[0]) * t, height, p[1] + (q[1] - p[1]) * t];
      layers.forEach((layer, index) => {
        const start = index / layers.length; const end = (index + 1) / layers.length;
        quad(lerp(a, b, start), lerp(innerA, innerB, start), lerp(innerA, innerB, end), lerp(a, b, end),
          lamination !== 'strata-inlay' && topHasRecord ? GOLD : layer.color, lamination !== 'strata-inlay' && topHasRecord ? 1.35 : 1.1);
      });
    }
    triangle([0, 0, 0], point(a, 0), point(b, 0), topColor, 0.4);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setAttribute('recordMask', new Float32BufferAttribute(recordMask, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  return geometry;
}

/** Only the earned seams, for casting's late gold reveal over the unchanged pigment. */
export function createRecordSeamGeometry(slab: BuildSlab, tuning: BuildTuning, leftToRight = false): BufferGeometry {
  const full = createSlabGeometry(slab, tuning, 'strata');
  const triangles: { screenX: number; positions: number[]; colors: number[] }[] = [];
  const source = full.getAttribute('position');
  const pigment = full.getAttribute('color');
  const mask = full.getAttribute('recordMask');
  for (let i = 0; i < source.count; i++) if (mask.getX(i)) {
    const point = [source.getX(i), source.getY(i), source.getZ(i)];
    const color = [pigment.getX(i), pigment.getY(i), pigment.getZ(i)];
    const triangle = triangles[triangles.length - 1];
    if (!triangle || triangle.positions.length === 9) {
      triangles.push({ screenX: 0, positions: [], colors: [] });
    }
    const current = triangles[triangles.length - 1];
    current.positions.push(...point);
    current.colors.push(...color);
    current.screenX += point[0] * 10 - point[2] * 8;
  }
  full.dispose();
  if (leftToRight) triangles.sort((a, b) => a.screenX - b.screenX);
  const positions = triangles.flatMap((triangle) => triangle.positions);
  const colors = triangles.flatMap((triangle) => triangle.colors);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Static surroundings of fusion share one draw call, regardless of history length. */
export function createHistoryGeometry(items: { slab: BuildSlab; y: number }[], tuning: BuildTuning): BufferGeometry {
  const sources = items.map(({ slab, y }) => createSlabGeometry(slab, tuning, 'strata').translate(0, y, 0));
  const result = new BufferGeometry();
  for (const name of ['position', 'color']) {
    const length = sources.reduce((sum, source) => sum + source.getAttribute(name).array.length, 0);
    const values = new Float32Array(length);
    let offset = 0;
    for (const source of sources) { const array = source.getAttribute(name).array; values.set(array, offset); offset += array.length; }
    result.setAttribute(name, new Float32BufferAttribute(values, 3));
  }
  sources.forEach((source) => source.dispose());
  result.computeBoundingSphere();
  return result;
}
