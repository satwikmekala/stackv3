import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StackLogo } from '@/components/StackLogo';

import { redesignColors, redesignFonts } from '@/constants/theme';

export const STAT_STRIP_WIDTH = 1080;
export const STAT_STRIP_HEIGHT = 1920;

const CAPTURE_SCALE = STAT_STRIP_WIDTH / 324;
const scaled = (value: number) => value * CAPTURE_SCALE;

// The canvas is transparent, and captured translucency pastes much fainter than it previews,
// so secondary text uses a solid softer tone instead of opacity.
const SOFT = '#D8D1C5';
const GOLD = '#FFE84A';

/** Characters that fit the hero column at full size ("3,406.5"). */
const HERO_FULL_SIZE_CHARS = 7;
const HERO_FONT_SIZE = 62;

/**
 * The hero number shrinks by its length rather than with adjustsFontSizeToFit. On iOS that fitter
 * ignores minimumFontScale and, when no size fits the box (a sub-pixel rounding difference on
 * some devices is enough, since the fixed line height never shrinks), falls back to 4pt, so the
 * number vanished from the card. Sizing from the string is identical on every device.
 */
export function heroFontSize(value: string) {
  return Math.min(HERO_FONT_SIZE, (HERO_FONT_SIZE * HERO_FULL_SIZE_CHARS) / Math.max(1, value.length));
}

export interface StatStripCardProps {
  accent: string;
  title: string;
  date: string;
  volumeValue: string;
  volumeUnit: string;
  setCount: number;
  repCount: number;
  specialSetLabel?: string;
  exerciseCount?: number;
  /** "48 min"; shown when the session has a trustworthy elapsed time. */
  durationLabel?: string;
  /** New bests this session (the Records rule). */
  recordCount?: number;
}

type Stat = { value: string; label: string };

/**
 * A fixed 1080 x 1920 transparent sticker for pasting over a photo (a story, a chat). Preview
 * surfaces should scale the component's parent so the outer ref remains an unscaled capture target.
 */
export const StatStripCard = forwardRef<View, StatStripCardProps>(function StatStripCard(
  {
    accent,
    title,
    date,
    volumeValue,
    volumeUnit,
    setCount,
    repCount,
    specialSetLabel,
    exerciseCount,
    durationLabel,
    recordCount = 0,
  },
  ref
) {
  // Bodyweight sessions lead with reps; everything else leads with the weight moved.
  const moved = volumeValue !== '0';
  const hero = moved
    ? { value: volumeValue, unit: volumeUnit, label: 'MOVED' }
    : { value: String(repCount), unit: '', label: 'TOTAL REPS' };
  const stats: Stat[] = [
    { value: String(setCount), label: setCount === 1 ? 'SET' : 'SETS' },
    ...(moved ? [{ value: String(repCount), label: 'REPS' }] : []),
    ...(exerciseCount ? [{ value: String(exerciseCount), label: exerciseCount === 1 ? 'EXERCISE' : 'EXERCISES' }] : []),
    ...(durationLabel ? [{ value: durationLabel, label: 'TIME' }] : []),
  ].slice(0, 3);
  const heroSize = scaled(heroFontSize(hero.value));

  return (
    <View ref={ref} style={styles.canvas} collapsable={false}>
      <View style={styles.block}>
        <View style={styles.topRow}>
          <Text allowFontScaling={false} numberOfLines={1} style={styles.date}>{date}</Text>
          <View style={styles.brand}>
            <StackLogo size={scaled(13)} />
            <Text allowFontScaling={false} style={styles.wordmark}>STACK</Text>
          </View>
        </View>

        <Text allowFontScaling={false} numberOfLines={1} style={styles.title}>{title}</Text>

        <View style={styles.markRow}>
          <View style={[styles.accentBar, { backgroundColor: accent }]} />
          {recordCount > 0 ? (
            <View style={styles.recordPill}>
              <Text allowFontScaling={false} style={styles.recordText}>
                {recordCount} {recordCount === 1 ? 'PR' : 'PRs'}
              </Text>
            </View>
          ) : null}
          {specialSetLabel ? (
            <View style={[styles.pill, { borderColor: accent }]}>
              <Text allowFontScaling={false} numberOfLines={1} style={styles.pillText}>{specialSetLabel}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.heroRow}>
          <Text allowFontScaling={false} numberOfLines={1}
            style={[styles.heroValue, { fontSize: heroSize, lineHeight: heroSize * 1.02 }]}>
            {hero.value}
          </Text>
          {hero.unit ? <Text allowFontScaling={false} style={styles.heroUnit}>{hero.unit}</Text> : null}
        </View>
        <Text allowFontScaling={false} style={styles.heroLabel}>{hero.label}</Text>

        <View style={styles.rule} />

        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Text allowFontScaling={false} numberOfLines={1} style={styles.statValue}>{stat.value}</Text>
              <Text allowFontScaling={false} numberOfLines={1} style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
});

StatStripCard.displayName = 'StatStripCard';

// A soft shadow keeps light type legible over bright photos without reading as a box.
const shadow = {
  textShadowColor: 'rgba(0, 0, 0, 0.45)',
  textShadowOffset: { width: 0, height: scaled(0.6) },
  textShadowRadius: scaled(5),
} as const;

const styles = StyleSheet.create({
  canvas: {
    width: STAT_STRIP_WIDTH,
    height: STAT_STRIP_HEIGHT,
    backgroundColor: 'transparent',
  },
  block: {
    position: 'absolute',
    left: scaled(25.5),
    right: scaled(25.5),
    bottom: scaled(88),
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: scaled(12),
  },
  date: {
    ...shadow,
    flexShrink: 1,
    fontFamily: redesignFonts.mono,
    fontSize: scaled(8),
    lineHeight: scaled(12),
    letterSpacing: scaled(2),

    color: SOFT,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaled(5),
  },
  wordmark: {
    ...shadow,
    fontFamily: redesignFonts.monoBold,
    fontSize: scaled(7.5),
    lineHeight: scaled(10),
    letterSpacing: scaled(2.4),
    color: redesignColors.bone,
  },
  title: {
    ...shadow,
    marginTop: scaled(6),
    fontFamily: redesignFonts.display,
    fontSize: scaled(30),
    lineHeight: scaled(33),
    letterSpacing: scaled(-0.9),
    color: redesignColors.bone,
  },
  markRow: {
    marginTop: scaled(9),
    minHeight: scaled(14),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaled(7),
  },
  accentBar: {
    width: scaled(22),
    height: scaled(3),
    borderRadius: scaled(2),
  },
  recordPill: {
    height: scaled(14),
    paddingHorizontal: scaled(6),
    borderRadius: scaled(4),
    justifyContent: 'center',
    backgroundColor: GOLD,
  },
  recordText: {
    fontFamily: redesignFonts.monoBold,
    fontSize: scaled(6.5),
    lineHeight: scaled(9),
    letterSpacing: scaled(1),
    color: redesignColors.ink,
  },
  pill: {
    flexShrink: 1,
    height: scaled(14),
    paddingHorizontal: scaled(6),
    borderWidth: scaled(0.6),
    borderRadius: scaled(4),
    justifyContent: 'center',
  },
  pillText: {
    ...shadow,
    fontFamily: redesignFonts.mono,
    fontSize: scaled(6.5),
    lineHeight: scaled(9),
    letterSpacing: scaled(1),

    color: redesignColors.bone,
  },
  heroRow: {
    marginTop: scaled(14),
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  heroValue: {
    ...shadow,
    flexShrink: 1,
    fontFamily: redesignFonts.display,
    letterSpacing: scaled(-1.8),
    fontVariant: ['tabular-nums'],
    color: redesignColors.bone,
  },
  heroUnit: {
    ...shadow,
    marginLeft: scaled(5),
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: scaled(15),
    lineHeight: scaled(18),
    color: redesignColors.bone,
  },
  heroLabel: {
    ...shadow,
    marginTop: scaled(2),
    fontFamily: redesignFonts.mono,
    fontSize: scaled(7),
    lineHeight: scaled(10),
    letterSpacing: scaled(2),
    color: SOFT,
  },
  rule: {
    height: scaled(0.7),
    marginTop: scaled(14),
    backgroundColor: '#9C9487',
  },
  statsRow: {
    marginTop: scaled(11),
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    minWidth: 0,
  },
  statValue: {
    ...shadow,
    fontFamily: redesignFonts.display,
    fontSize: scaled(22),
    lineHeight: scaled(25),
    letterSpacing: scaled(-0.5),
    fontVariant: ['tabular-nums'],
    color: redesignColors.bone,
  },
  statLabel: {
    ...shadow,
    marginTop: scaled(2),
    fontFamily: redesignFonts.mono,
    fontSize: scaled(6.5),
    lineHeight: scaled(9),
    letterSpacing: scaled(1.6),
    color: SOFT,
  },
});
