// lucide icons used by the workout screen (same path data as lucide-react-native).
import type { CSSProperties } from 'react';

const PATHS = {
  check: ['M20 6 9 17l-5-5'],
  minus: ['M5 12h14'],
  plus: ['M5 12h14', 'M12 5v14'],
  info: ['M12 16v-4', 'M12 8h.01'],
  repeat2: ['m2 9 3-3 3 3', 'M13 18H7a2 2 0 0 1-2-2V6', 'm22 15-3 3-3-3', 'M11 6h6a2 2 0 0 1 2 2v10'],
  chevronDown: ['m6 9 6 6 6-6'],
  chevronRight: ['m9 18 6-6-6-6'],
  x: ['M18 6 6 18', 'm6 6 12 12'],
  arrowDown: ['M12 5v14', 'm19 12-7 7-7-7'],
  trophy: [
    'M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978',
    'M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978',
    'M18 9h1.5a1 1 0 0 0 0-5H18',
    'M4 22h16',
    'M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z',
    'M6 9H4.5a1 1 0 0 1 0-5H6',
  ],
} as const;

export type IconName = keyof typeof PATHS;
export function Icon({ name, size, color, strokeWidth = 2, style }: {
  name: IconName; size: number; color: string; strokeWidth?: number; style?: CSSProperties;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0, ...style }}>
      {name === 'info' ? <circle cx={12} cy={12} r={10} /> : null}
      {PATHS[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}
