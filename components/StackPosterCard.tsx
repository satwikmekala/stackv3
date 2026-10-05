import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Polygon, Polyline, RadialGradient, Rect, Stop } from 'react-native-svg';

import { STAT_STRIP_HEIGHT, STAT_STRIP_WIDTH } from '@/components/StatStripCard';
import { StackLogo } from '@/components/StackLogo';
import { redesignColors, redesignFonts } from '@/constants/theme';

const CAPTURE_SCALE = STAT_STRIP_WIDTH / 324;
const scaled = (value: number) => value * CAPTURE_SCALE;

const INK = '#13110E';
const GOLD = '#FFE84A';
const SOFT = '#A99F91';
const MAX_LAYERS = 8;

export type StackPosterLayer = {
  name: string;
  color: string;
  /** Relative share of the session's work; layers are drawn this thick. */
  weight: number;
  /** "3 SETS · 1,098 KG". */
  detail: string;
  record: boolean;
};

export interface StackPosterCardProps {
  accent: string;
  title: string;
  date: string;
  volumeValue: string;
  volumeUnit: string;
  setCount: number;
  repCount: number;
  durationLabel?: string;
  /** Exercises in the order they were trained; the first sits at the base. */
  layers: StackPosterLayer[];
}

// ---------------------------------------------------------------------------
// Isometric slabs: the same footprint, chamfer and face lighting as the Build.
// ---------------------------------------------------------------------------

const COS = Math.cos(Math.PI / 6);
const CUT = 0.24;
const FOOTPRINT: [number, number][] = [[-1, -1], [1, -1], [1, 1 - CUT], [1 - CUT, 1], [-1, 1]];
/** Visible side faces: right (+x), left (+z), then the chamfered key face. */
const FACES = [{ edge: 1, light: 0.66 }, { edge: 3, light: 0.86 }, { edge: 2, light: 1.1 }];

function shade(hex: string, light: number) {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value.slice(0, 6);
  const channels = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  if (channels.some((channel) => !Number.isFinite(channel))) return hex;
  return `#${channels.map((channel) => {
    const mixed = light <= 1 ? channel * light : channel + (255 - channel) * (light - 1);
    return Math.round(Math.max(0, Math.min(255, mixed))).toString(16).padStart(2, '0');
  }).join('')}`;
}

type Point = [number, number];
const points = (list: Point[]) => list.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

/** Art box, in design units (the canvas is 324 wide). */
const ART = { width: 324, height: 236, cx: 112, size: 46 };

function layout(layers: readonly StackPosterLayer[]) {
  // Very long sessions fold their tail into one quiet layer, so every slab stays readable.
  const shown = layers.length > MAX_LAYERS
    ? [...layers.slice(0, MAX_LAYERS - 1), {
      name: `+${layers.length - MAX_LAYERS + 1} more`, color: '#6F6558', detail: 'MORE EXERCISES',
      weight: layers.slice(MAX_LAYERS - 1).reduce((sum, layer) => sum + layer.weight, 0), record: false,
    }]
    : [...layers];
  const total = shown.reduce((sum, layer) => sum + Math.max(0, layer.weight), 0) || 1;
  const gap = 2.2;
  const budget = 112 - gap * Math.max(0, shown.length - 1);
  const minimum = Math.min(8, budget / Math.max(1, shown.length));
  // Floor every slab, then share what is left by work.
  const spare = Math.max(0, budget - minimum * shown.length);
  const heights = shown.map((layer) => minimum + spare * Math.max(0, layer.weight) / total);
  const stackHeight = heights.reduce((sum, h) => sum + h, 0) + gap * Math.max(0, shown.length - 1);
  const depth = 2 * ART.size;
  const baseY = (ART.height - (depth + stackHeight + 8)) / 2 + stackHeight + depth / 2 + 6;
  const project = (x: number, z: number, y: number): Point =>
    [ART.cx + (x - z) * COS * ART.size, baseY + (x + z) * 0.5 * ART.size - y];
  let bottom = 0;
  const slabs = shown.map((layer, index) => {
    const slab = { layer, bottom, height: heights[index] };
    bottom += heights[index] + gap;
    return slab;
  });
  return { slabs, project };
}

function Slab({ project, bottom, height, color, record }: {
  project: (x: number, z: number, y: number) => Point; bottom: number; height: number; color: string; record: boolean;
}) {
  const top = bottom + height;
  const seam = record ? Math.min(height * 0.3, 2.2) : 0;
  return <G>
    {FACES.map(({ edge, light }) => {
      const a = FOOTPRINT[edge];
      const b = FOOTPRINT[(edge + 1) % FOOTPRINT.length];
      return <G key={edge}>
        <Polygon points={points([project(a[0], a[1], bottom), project(b[0], b[1], bottom), project(b[0], b[1], top - seam), project(a[0], a[1], top - seam)])}
          fill={shade(color, light)} />
        {seam > 0 && <Polygon points={points([project(a[0], a[1], top - seam), project(b[0], b[1], top - seam), project(b[0], b[1], top), project(a[0], a[1], top)])}
          fill={shade(GOLD, light < 1 ? 0.82 + light * 0.18 : 1)} />}
      </G>;
    })}
    <Polygon points={points(FOOTPRINT.map(([x, z]) => project(x, z, top)))} fill={shade(color, 1.04)} />
    {record && <Polyline points={points([FOOTPRINT[4], FOOTPRINT[3], FOOTPRINT[2], FOOTPRINT[1]].map(([x, z]) => project(x, z, top)))}
      fill="none" stroke={GOLD} strokeWidth={0.9} />}
  </G>;
}

/**
 * "The Stack": a full-bleed 1080 x 1920 poster of one session as the app's own object.
 * Every exercise is a slab in its muscle colour, as thick as the work it took, laid in the
 * order it was trained, with a gold seam where a new best was set.
 */
export const StackPosterCard = forwardRef<View, StackPosterCardProps>(function StackPosterCard(
  { accent, title, date, volumeValue, volumeUnit, setCount, repCount, durationLabel, layers },
  ref
) {
  const { slabs, project } = layout(layers);
  const moved = volumeValue !== '0';

  // Labels in a column to the right of the stack, spread so they never collide; newest on top.
  const anchors = slabs.map((slab) => {
    const [x, y] = project(1, -1, slab.bottom + slab.height / 2);
    return { x, y, slab };
  }).sort((a, b) => a.y - b.y);
  const minGap = anchors.length > 6 ? 21 : 25;
  const ys = anchors.map((anchor) => anchor.y);
  for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + minGap);
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  const shift = mean(anchors.map((anchor) => anchor.y)) - mean(ys);
  for (let i = 0; i < ys.length; i++) ys[i] += shift;
  const overflow = ys.length ? ys[ys.length - 1] - (ART.height - 14) : 0;
  if (overflow > 0) for (let i = 0; i < ys.length; i++) ys[i] -= overflow;
  for (let i = 0; i < ys.length; i++) ys[i] = Math.max(ys[i], 14 + i * minGap);
  const labelX = ART.cx + 2 * COS * ART.size + 26;

  const stats = [
    { value: String(setCount), label: setCount === 1 ? 'SET' : 'SETS' },
    ...(moved ? [{ value: String(repCount), label: 'REPS' }] : []),
    ...(durationLabel ? [{ value: durationLabel, label: 'TIME' }] : [{ value: String(layers.length), label: layers.length === 1 ? 'EXERCISE' : 'EXERCISES' }]),
  ];
  const hero = moved ? { value: volumeValue, unit: volumeUnit, label: 'MOVED' } : { value: String(repCount), unit: '', label: 'REPS' };
  const heroSize = scaled(Math.min(58, (58 * 7) / Math.max(1, hero.value.length)));

  return (
    <View ref={ref} style={styles.canvas} collapsable={false}>
      <Svg style={StyleSheet.absoluteFill} width={STAT_STRIP_WIDTH} height={STAT_STRIP_HEIGHT}
        viewBox={`0 0 ${STAT_STRIP_WIDTH} ${STAT_STRIP_HEIGHT}`}>
        <Defs>
          <RadialGradient id="posterGlow" cx={scaled(ART.cx + 20)} cy={scaled(150 + ART.height * 0.52)}
            rx={scaled(250)} ry={scaled(230)} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={accent} stopOpacity={0.26} />
            <Stop offset="0.45" stopColor={accent} stopOpacity={0.09} />
            <Stop offset="1" stopColor={accent} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="posterFloor" cx={scaled(162)} cy={scaled(576)} rx={scaled(300)} ry={scaled(200)} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#2A231C" stopOpacity={0.9} />
            <Stop offset="1" stopColor="#2A231C" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={STAT_STRIP_WIDTH} height={STAT_STRIP_HEIGHT} fill={INK} />
        <Rect width={STAT_STRIP_WIDTH} height={STAT_STRIP_HEIGHT} fill="url(#posterFloor)" />
        <Rect width={STAT_STRIP_WIDTH} height={STAT_STRIP_HEIGHT} fill="url(#posterGlow)" />
      </Svg>

      <View style={styles.topRow}>
        <View style={styles.brand}>
          <StackLogo size={scaled(14)} />
          <Text allowFontScaling={false} style={styles.wordmark}>STACK</Text>
        </View>
        <Text allowFontScaling={false} numberOfLines={1} style={styles.date}>{date}</Text>
      </View>

      <View style={styles.headline}>
        <Text allowFontScaling={false} style={styles.eyebrow}>
          {slabs.length} {slabs.length === 1 ? 'LAYER' : 'LAYERS'} STACKED
        </Text>
        <Text allowFontScaling={false} numberOfLines={2} style={styles.title}>{title}</Text>
      </View>

      <View style={styles.art}>
        <Svg width={scaled(ART.width)} height={scaled(ART.height)} viewBox={`0 0 ${ART.width} ${ART.height}`}>
          {/* Plinth */}
          {FACES.map(({ edge, light }) => {
            const ring = FOOTPRINT.map(([x, z]) => [x * 1.14, z * 1.14] as Point);
            const a = ring[edge];
            const b = ring[(edge + 1) % ring.length];
            return <Polygon key={edge} points={points([project(a[0], a[1], -6), project(b[0], b[1], -6), project(b[0], b[1], -1.5), project(a[0], a[1], -1.5)])}
              fill={shade('#3C3328', light)} />;
          })}
          <Polygon points={points(FOOTPRINT.map(([x, z]) => project(x * 1.14, z * 1.14, -1.5)))} fill="#4A3F32" />
          {slabs.map((slab, index) => <Slab key={index} project={project} bottom={slab.bottom} height={slab.height}
            color={slab.layer.color} record={slab.layer.record} />)}
          {anchors.map((anchor, index) => {
            const y = ys[index];
            const elbow = labelX - 10;
            return <G key={index}>
              <Polyline points={points([[anchor.x + 2.5, anchor.y], [elbow - 8, anchor.y], [elbow, y], [labelX - 5, y]])}
                fill="none" stroke={redesignColors.bone} strokeOpacity={0.3} strokeWidth={0.6} />
              <Circle cx={anchor.x + 2.5} cy={anchor.y} r={1.4} fill={redesignColors.bone} />
              <Rect x={labelX} y={y - 7.5} width={2.4} height={15} rx={1} fill={anchor.slab.layer.color} />
            </G>;
          })}
        </Svg>
        {anchors.map((anchor, index) => (
          <View key={index} style={[styles.label, { left: scaled(labelX + 8), top: scaled(ys[index] - 8.5) }]}>
            <Text allowFontScaling={false} numberOfLines={1} style={styles.labelName}>{anchor.slab.layer.name}</Text>
            <Text allowFontScaling={false} numberOfLines={1} style={styles.labelDetail}>
              {anchor.slab.layer.detail}
              {anchor.slab.layer.record ? <Text style={{ color: GOLD }}>  PR</Text> : null}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.bottom}>
        <View style={styles.heroRow}>
          <Text allowFontScaling={false} numberOfLines={1}
            style={[styles.heroValue, { fontSize: heroSize, lineHeight: heroSize * 1.04 }]}>{hero.value}</Text>
          {hero.unit ? <Text allowFontScaling={false} style={styles.heroUnit}>{hero.unit}</Text> : null}
          <Text allowFontScaling={false} style={[styles.heroLabel, { color: accent }]}>{hero.label}</Text>
        </View>
        <View style={styles.rule} />
        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Text allowFontScaling={false} numberOfLines={1} style={styles.statValue}>{stat.value}</Text>
              <Text allowFontScaling={false} numberOfLines={1} style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
        <Text allowFontScaling={false} style={styles.tagline}>BUILT ONE SET AT A TIME</Text>
      </View>
    </View>
  );
});

StackPosterCard.displayName = 'StackPosterCard';

const styles = StyleSheet.create({
  canvas: {
    width: STAT_STRIP_WIDTH,
    height: STAT_STRIP_HEIGHT,
    backgroundColor: INK,
    overflow: 'hidden',
  },
  topRow: {
    position: 'absolute',
    left: scaled(26),
    right: scaled(26),
    top: scaled(40),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: scaled(6) },
  wordmark: {
    fontFamily: redesignFonts.monoBold,
    fontSize: scaled(8),
    lineHeight: scaled(11),
    letterSpacing: scaled(2.6),
    color: redesignColors.bone,
  },
  date: {
    fontFamily: redesignFonts.mono,
    fontSize: scaled(7.5),
    lineHeight: scaled(11),
    letterSpacing: scaled(2),
    color: SOFT,
  },
  headline: {
    position: 'absolute',
    left: scaled(26),
    right: scaled(26),
    top: scaled(82),
  },
  eyebrow: {
    fontFamily: redesignFonts.mono,
    fontSize: scaled(7),
    lineHeight: scaled(10),
    letterSpacing: scaled(2.2),
    color: SOFT,
  },
  title: {
    marginTop: scaled(6),
    fontFamily: redesignFonts.display,
    fontSize: scaled(44),
    lineHeight: scaled(46),
    letterSpacing: scaled(-1.6),
    color: redesignColors.bone,
  },
  art: {
    position: 'absolute',
    left: 0,
    top: scaled(150),
    width: scaled(ART.width),
    height: scaled(ART.height),
  },
  label: { position: 'absolute', right: scaled(14) },
  labelName: {
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: scaled(8.6),
    lineHeight: scaled(11),
    color: redesignColors.bone,
  },
  labelDetail: {
    marginTop: scaled(1),
    fontFamily: redesignFonts.mono,
    fontSize: scaled(5.6),
    lineHeight: scaled(8),
    letterSpacing: scaled(0.8),
    color: SOFT,
  },
  bottom: {
    position: 'absolute',
    left: scaled(26),
    right: scaled(26),
    bottom: scaled(34),
  },
  heroRow: { flexDirection: 'row', alignItems: 'baseline' },
  heroValue: {
    flexShrink: 1,
    fontFamily: redesignFonts.display,
    letterSpacing: scaled(-2),
    fontVariant: ['tabular-nums'],
    color: redesignColors.bone,
  },
  heroUnit: {
    marginLeft: scaled(5),
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: scaled(15),
    lineHeight: scaled(18),
    color: redesignColors.bone,
  },
  heroLabel: {
    marginLeft: scaled(10),
    fontFamily: redesignFonts.monoBold,
    fontSize: scaled(7),
    lineHeight: scaled(10),
    letterSpacing: scaled(2.2),
  },
  rule: { height: scaled(0.6), marginTop: scaled(14), backgroundColor: '#3A322A' },
  statsRow: { marginTop: scaled(12), flexDirection: 'row' },
  stat: { flex: 1, minWidth: 0 },
  statValue: {
    fontFamily: redesignFonts.display,
    fontSize: scaled(21),
    lineHeight: scaled(24),
    letterSpacing: scaled(-0.4),
    fontVariant: ['tabular-nums'],
    color: redesignColors.bone,
  },
  statLabel: {
    marginTop: scaled(2),
    fontFamily: redesignFonts.mono,
    fontSize: scaled(6.2),
    lineHeight: scaled(9),
    letterSpacing: scaled(1.6),
    color: SOFT,
  },
  tagline: {
    marginTop: scaled(22),
    textAlign: 'center',
    fontFamily: redesignFonts.mono,
    fontSize: scaled(6),
    lineHeight: scaled(9),
    letterSpacing: scaled(3),
    color: '#6F6558',
  },
});
