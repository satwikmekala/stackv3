import { BufferGeometry, Color, Float32BufferAttribute } from 'three';
import { BASE_HEIGHT, GOLD, type BuildSlab, type BuildTuning, type Lamination } from './model';

type Point = [number, number, number];

/** One mesh, including strata, key face, seam and inlay; no child session meshes. */
export function createSlabGeometry(slab: BuildSlab, tuning: BuildTuning, lamination: Lamination): BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const height = slab.height * BASE_HEIGHT;
  const cut = Math.min(0.55, Math.max(0.08, tuning.chamfer));
  const perimeter: [number, number][] = [[-1, -1], [1, -1], [1, 1 - cut], [1 - cut, 1], [-1, 1]];
  const layers = slab.layers;
  if (!layers.length) throw new Error('A slab needs at least one layer');
  const topColor = layers[layers.length - 1].color;
  const hasRecord = layers.some((layer) => layer.record);
  const seam = hasRecord ? Math.min(height * 0.12, tuning.seam) : 0;
  const triangle = (a: Point, b: Point, c: Point, color: string, light = 1) => {
    positions.push(...a, ...b, ...c);
    const rgb = new Color(color).multiplyScalar(light);
    for (let i = 0; i < 3; i++) colors.push(rgb.r, rgb.g, rgb.b);
  };
  const quad = (a: Point, b: Point, c: Point, d: Point, color: string, light = 1) => {
    triangle(a, b, c, color, light); triangle(a, c, d, color, light);
  };
  const point = ([x, z]: [number, number], y: number): Point => [x, y, z];
  const total = layers.reduce((sum, layer) => sum + layer.height, 0);
  const bandHeight = slab.sealed && lamination === 'edge-grain' ? height * 0.28 : height - seam;

  perimeter.forEach((a, edge) => {
    const b = perimeter[(edge + 1) % perimeter.length];
    const key = edge === 2;
    const light = key ? 1.16 : edge === 1 ? 0.45 : 0.69;
    let y = 0;
    layers.forEach((layer) => {
      const next = y + bandHeight * layer.height / total;
      quad(point(a, y), point(a, next), point(b, next), point(b, y), key && hasRecord ? GOLD : layer.color, light);
      y = next;
    });
    if (height - seam - y > 1e-8) {
      quad(point(a, y), point(a, height - seam), point(b, height - seam), point(b, y), key && hasRecord ? GOLD : topColor, light);
    }
    if (seam > 0) quad(point(a, height - seam), point(a, height), point(b, height), point(b, height - seam), GOLD, key ? 1.2 : 0.95);

    // Thin top perimeter inlay carries each source colour; the centre stays solid pigment.
    const inset = slab.sealed && lamination === 'strata-inlay' ? 0.09 : hasRecord ? 0.014 : 0;
    const innerA: [number, number] = [a[0] * (1 - inset), a[1] * (1 - inset)];
    const innerB: [number, number] = [b[0] * (1 - inset), b[1] * (1 - inset)];
    triangle([0, height, 0], point(innerB, height), point(innerA, height), topColor, 1.05);
    if (inset > 0) {
      const lerp = (p: [number, number], q: [number, number], t: number): Point => [p[0] + (q[0] - p[0]) * t, height, p[1] + (q[1] - p[1]) * t];
      layers.forEach((layer, index) => {
        const start = index / layers.length; const end = (index + 1) / layers.length;
        quad(lerp(a, b, start), lerp(innerA, innerB, start), lerp(innerA, innerB, end), lerp(a, b, end),
          hasRecord && (key || lamination !== 'strata-inlay') ? GOLD : layer.color, 1.1);
      });
    }
    triangle([0, 0, 0], point(a, 0), point(b, 0), topColor, 0.4);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  return geometry;
}
