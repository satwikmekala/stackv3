import Svg, { Polygon, Line, G } from 'react-native-svg';
import type { BuildSlab } from './model';
import { GOLD } from './model';

/** Small vector view of the same ordered slabs. No GL context or animation loop. */
export function BuildPreview({ slabs, width = 90, height = 86 }: { slabs: readonly BuildSlab[]; width?: number; height?: number }) {
  const recent = slabs.slice(-5);
  const total = recent.reduce((sum, slab) => sum + slab.height, 0);
  const scale = Math.min(16, 48 / Math.max(1, total));
  return <Svg width={width} height={height} viewBox="0 0 140 130" accessible={false}>
    <Polygon points="14,100 70,78 126,100 70,122" fill="#3C3328" />
    {recent.map((slab, slabIndex) => {
      const bottom = 100 - recent.slice(0, slabIndex).reduce((sum, previous) => sum + previous.height * scale + 3, 0);
      const h = slab.height * scale;
      const sum = slab.layers.reduce((value, layer) => value + layer.height, 0);
      return <G key={slab.id}>
        {slab.layers.map((layer, index) => {
          const y = bottom - h * slab.layers.slice(0, index).reduce((sum, previous) => sum + previous.height, 0) / sum;
          const end = y - h * layer.height / sum;
          const points = `20,${y - 20} 67,${y} 76,${y} 120,${y - 20} 120,${end - 20} 76,${end} 67,${end} 20,${end - 20}`;
          return <G key={index}><Polygon points={points} fill={layer.color} />{layer.record && <><Line x1="20" y1={end - 20} x2="67" y2={end} stroke={GOLD} strokeWidth="1.5" /><Line x1="67" y1={end} x2="76" y2={end} stroke={GOLD} strokeWidth="1.5" /><Line x1="76" y1={end} x2="120" y2={end - 20} stroke={GOLD} strokeWidth="1.5" /></>}</G>;
        })}
        <Polygon points={`20,${bottom - h - 20} 70,${bottom - h - 40} 120,${bottom - h - 20} 76,${bottom - h} 67,${bottom - h}`} fill={slab.layers.at(-1)?.color ?? '#51483A'} />
      </G>;
    })}
  </Svg>;
}
