import { memo, useId, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient as NativeLinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { redesignColors as c } from '@/constants/theme';

// A small, deterministic tile gives the light a matte finish. It is drawn once
// and repeated by SVG, with no image asset, filter, or continuous animation.
const GRAIN = Array.from({ length: 64 }, (_, index) => {
  const seed = ((index + 1) * 2654435761) >>> 0;
  return { x: (seed % 320) / 10, y: ((seed >>> 8) % 320) / 10, r: index % 3 === 0 ? 0.45 : 0.3 };
});

function tintSurface(color: string, amount: number) {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return c.surface;
  const channels = [29, 25, 21].map((base, index) => {
    const accent = parseInt(color.slice(1 + index * 2, 3 + index * 2), 16);
    return Math.round(base + (accent - base) * amount);
  });
  return `rgb(${channels.join(', ')})`;
}

/** Layered light rather than a flat color wash: the upper-left source spreads
 * across the title, a softer reflection leads toward the slider's destination,
 * and the lower edge settles back into the app's warm, dark surface. */
export const WorkoutCardSurface = memo(function WorkoutCardSurface({ color, radius = 36, showEdge = true, lightHeight, variant = 'hero', showBottomGlow = false }: {
  color: string; radius?: number; showEdge?: boolean;
  /** For tall cards: the light settles within this many points from the top instead of spanning the whole card. */
  lightHeight?: number;
  /** A softer highlight and wider falloff for the tall workout recap. */
  variant?: 'hero' | 'summary';
  showBottomGlow?: boolean;
}) {
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });
  const lit = lightHeight && height > 0 ? Math.min(height, lightHeight) : height;
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const light = `${id}-light`;
  const reflection = `${id}-reflection`;
  const edge = `${id}-edge`;
  const grain = `${id}-grain`;
  const highlight = `${id}-highlight`;
  const bottom = `${id}-bottom`;
  const summary = variant === 'summary';
  const bottomReach = Math.min(260, height * 0.45);

  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden collapsable={false}
    importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}
    onLayout={({ nativeEvent: { layout } }) => {
      // Cover fractional layout points as well; the card clips the outer edge.
      const nextWidth = Math.ceil(layout.width);
      const nextHeight = Math.ceil(layout.height);
      setSize(previous => previous.width === nextWidth && previous.height === nextHeight
        ? previous : { width: nextWidth, height: nextHeight });
    }}>
    <NativeLinearGradient pointerEvents="none" style={StyleSheet.absoluteFill}
      colors={summary
        ? [tintSurface(color, 0.09), tintSurface(color, 0.045), tintSurface(color, 0.012), c.surface]
        : [tintSurface(color, 0.14), tintSurface(color, 0.08), tintSurface(color, 0.025), c.surface]}
      locations={[0, 0.42, 0.78, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: height > 0 ? lit / height : 1 }} />
    {/* Explicit bounds keep SVG's native drawing cache in step with late font,
        workout-name, and device layout changes. Recreate it only when resized. */}
    {width > 0 && height > 0 && <Svg key={`${width}:${height}`} width={width} height={height}
      viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={styles.lighting}>
      <Defs>
        <RadialGradient id={light} gradientUnits="userSpaceOnUse"
          cx={width * 0.08} cy={lit * (summary ? -0.08 : 0.02)} rx={width * 1.05} ry={lit}>
          <Stop offset="0%" stopColor={color} stopOpacity={summary ? 0.34 : 0.28} />
          <Stop offset="30%" stopColor={color} stopOpacity={summary ? 0.19 : 0.17} />
          <Stop offset="62%" stopColor={color} stopOpacity={summary ? 0.06 : 0.055} />
          <Stop offset={summary ? '82%' : '100%'} stopColor={color} stopOpacity={summary ? 0.014 : 0} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
        {summary && <RadialGradient id={highlight} gradientUnits="userSpaceOnUse"
          cx={width * 0.18} cy={-24} rx={width * 0.8} ry={lit * 0.62}>
          <Stop offset="0%" stopColor={c.bone} stopOpacity={0.09} />
          <Stop offset="38%" stopColor={c.bone} stopOpacity={0.035} />
          <Stop offset="72%" stopColor={c.bone} stopOpacity={0.008} />
          <Stop offset="100%" stopColor={c.bone} stopOpacity={0} />
        </RadialGradient>}
        {showBottomGlow && <RadialGradient id={bottom} gradientUnits="userSpaceOnUse"
          cx={width * 0.72} cy={height + bottomReach * 0.2} rx={width * 1.05} ry={bottomReach}>
          <Stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <Stop offset="28%" stopColor={color} stopOpacity={0.18} />
          <Stop offset="52%" stopColor={color} stopOpacity={0.085} />
          <Stop offset="76%" stopColor={color} stopOpacity={0.022} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>}
        <RadialGradient id={reflection} gradientUnits="userSpaceOnUse"
          cx={width * 0.82} cy={lit * 0.62} rx={width * 0.65} ry={lit * 0.7}>
          <Stop offset="0%" stopColor={color} stopOpacity={0.075} />
          <Stop offset="45%" stopColor={color} stopOpacity={0.035} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={edge} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={width * 0.8} y2={Math.max(lit, Math.min(height, lit * 1.6))}>
          <Stop offset="0%" stopColor={c.bone} stopOpacity={summary ? 0.22 : 0.16} />
          <Stop offset="32%" stopColor={c.bone} stopOpacity={0.065} />
          <Stop offset="72%" stopColor={c.bone} stopOpacity={0.015} />
          <Stop offset="100%" stopColor={showBottomGlow ? color : c.bone} stopOpacity={showBottomGlow ? 0.12 : 0.025} />
        </LinearGradient>
        <Pattern id={grain} width={32} height={32} patternUnits="userSpaceOnUse">
          {GRAIN.map((dot, index) => <Circle key={index} cx={dot.x} cy={dot.y} r={dot.r}
            fill={index % 2 === 0 ? c.bone : '#000000'} opacity={index % 2 === 0 ? 0.045 : 0.07} />)}
        </Pattern>
      </Defs>
      <Rect width={width} height={height} fill={`url(#${light})`} />
      {summary && <Rect width={width} height={height} fill={`url(#${highlight})`} />}
      <Rect width={width} height={height} fill={`url(#${reflection})`} />
      {showBottomGlow && <Rect width={width} height={height} fill={`url(#${bottom})`} />}
      <Rect width={width} height={height} fill={`url(#${grain})`} />
      {showEdge && <Rect x={0.5} y={0.5} width={Math.max(0, width - 1)} height={Math.max(0, height - 1)} rx={Math.max(0, radius - 0.5)} fill="none"
        stroke={`url(#${edge})`} strokeWidth={1} />}
    </Svg>}
  </View>;
});

const styles = StyleSheet.create({
  lighting: { position: 'absolute', left: 0, top: 0 },
});
