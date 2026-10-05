// React Native → DOM primitives. A View is a flex column with border-box sizing, exactly as RN
// lays it out, so style objects can be mirrored from the app 1:1.
import type { CSSProperties, ReactNode } from 'react';
import { redesignColors } from '../../../constants/theme';

export const c = redesignColors;

export function View({ style, children }: { style?: CSSProperties; children?: ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', boxSizing: 'border-box', position: 'relative', flexShrink: 0, ...style }}>{children}</div>;
}
export function Row({ style, children }: { style?: CSSProperties; children?: ReactNode }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', ...style }}>{children}</View>;
}
export function Text({ font, size, color, lineHeight, spacing, style, children }: {
  font: string; size: number; color: string; lineHeight?: number; spacing?: number; style?: CSSProperties; children?: ReactNode;
}) {
  return (
    <div style={{
      fontFamily: font, fontSize: size, color, lineHeight: lineHeight ? `${lineHeight}px` : 1.25,
      letterSpacing: spacing ?? 0, whiteSpace: 'nowrap', fontKerning: 'normal', ...style,
    }}>{children}</div>
  );
}

/** interpolateColor for two hex colours. */
export function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p: number, shift: number) => (p >> shift) & 255;
  const m = (shift: number) => Math.round(ch(pa, shift) + (ch(pb, shift) - ch(pa, shift)) * t);
  return `rgb(${m(16)}, ${m(8)}, ${m(0)})`;
}
export function rgba(hex: string, alpha: number) {
  const p = parseInt(hex.slice(1), 16);
  return `rgba(${(p >> 16) & 255}, ${(p >> 8) & 255}, ${p & 255}, ${alpha})`;
}

/** formatWeight: trailing zeros trimmed ("80", "82.5"). */
export const formatWeight = (kg: number) => String(Math.round(kg * 10) / 10);
