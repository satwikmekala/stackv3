import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { STAT_STRIP_HEIGHT, STAT_STRIP_WIDTH } from '@/components/StatStripCard';
import { StackLogo } from '@/components/StackLogo';
import { redesignColors, redesignFonts } from '@/constants/theme';

const CAPTURE_SCALE = STAT_STRIP_WIDTH / 324;
const scaled = (value: number) => value * CAPTURE_SCALE;

// Transparent canvas: captured translucency pastes much fainter than it previews, so secondary
// text uses a solid softer tone instead of opacity (as on the Stat Strip).
const SOFT = '#D8D1C5';
const GOLD = '#FFE84A';
const MAX_LINES = 8;

/** Design-unit canvas width (the canvas is 324 x 576). */
const W = 324;
// Story chrome (progress bar + name on top, reply bar below) covers roughly the outer 13%,
// so the corners sit inside it and every one reads on a posted story.
const INSET = { x: 29, top: 71, bottom: 89 };
/** Title and weight share one size so the top corners read as a pair. */
const HEADLINE = 28;

export type StackFrameExercise = {
  name: string;
  color: string;
  setCount: number;
  record: boolean;
};

export interface StackFrameCardProps {
  title: string;
  date: string;
  volumeValue: string;
  volumeUnit: string;
  setCount: number;
  repCount: number;
  recordCount?: number;
  /** Exercises in the order they were trained. */
  exercises: StackFrameExercise[];
}

/**
 * "Frame": a 1080 x 1920 transparent story overlay. The middle stays empty for the photo; the
 * session lives in the four corners: what was trained (top left), what was moved (top right),
 * every lift (bottom left) and the Stack mark (bottom right).
 */
export const StackFrameCard = forwardRef<View, StackFrameCardProps>(function StackFrameCard(
  { title, date, volumeValue, volumeUnit, setCount, repCount, recordCount = 0, exercises },
  ref
) {
  // Bodyweight sessions lead with reps; everything else leads with the weight moved.
  const moved = volumeValue !== '0';
  const hero = moved ? { value: volumeValue, unit: volumeUnit } : { value: String(repCount), unit: 'reps' };
  const heroSize = scaled(Math.min(HEADLINE, 196 / Math.max(1, hero.value.length)));
  const tally = [
    `${setCount} ${setCount === 1 ? 'SET' : 'SETS'}`,
    ...(moved ? [`${repCount} ${repCount === 1 ? 'REP' : 'REPS'}`] : []),
  ].join(' · ');

  // Long sessions fold their tail into one quiet line so the corner never climbs into the photo.
  const overflow = exercises.length > MAX_LINES ? exercises.length - (MAX_LINES - 1) : 0;
  const lines = overflow ? exercises.slice(0, MAX_LINES - 1) : exercises;

  return (
    <View ref={ref} style={styles.canvas} collapsable={false}>
      <View style={styles.top}>
        {/* Top left: the session. */}
        <View style={styles.topLeft}>
          <Text allowFontScaling={false} numberOfLines={2} style={styles.title}>{title}</Text>
          <Text allowFontScaling={false} numberOfLines={1} style={styles.sub}>{date.toUpperCase()}</Text>
        </View>

        {/* Top right: what was moved. */}
        <View style={styles.topRight}>
          <View style={styles.heroRow}>
            <Text allowFontScaling={false} numberOfLines={1} style={[styles.heroValue, { fontSize: heroSize }]}>
              {hero.value}
            </Text>
            <Text allowFontScaling={false} style={styles.heroUnit}>{hero.unit}</Text>
          </View>
          <Text allowFontScaling={false} numberOfLines={1} style={[styles.sub, styles.subRight]}>{tally}</Text>
          {recordCount > 0 ? (
            <View style={styles.recordPill}>
              <Text allowFontScaling={false} style={styles.recordText}>
                {recordCount} {recordCount === 1 ? 'PR' : 'PRs'}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Bottom left: every lift, one quiet line each. */}
      <View style={styles.bottomLeft}>
        {lines.map((exercise, index) => (
          <View key={`${exercise.name}-${index}`} style={styles.line}>
            <View style={[styles.lineMark, { backgroundColor: exercise.color }]} />
            <Text allowFontScaling={false} numberOfLines={1} style={styles.lineName}>{exercise.name}</Text>
            <Text allowFontScaling={false} style={styles.lineSets}>×{exercise.setCount}</Text>
            {exercise.record ? <Text allowFontScaling={false} style={styles.linePr}>PR</Text> : null}
          </View>
        ))}
        {overflow ? (
          <Text allowFontScaling={false} style={styles.more}>+{overflow} MORE</Text>
        ) : null}
      </View>

      {/* Bottom right: the mark. */}
      <View style={styles.bottomRight}>
        <StackLogo size={scaled(17)} />
        <Text allowFontScaling={false} style={styles.wordmark}>STACK</Text>
      </View>
    </View>
  );
});

StackFrameCard.displayName = 'StackFrameCard';

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
  top: {
    position: 'absolute',
    left: scaled(INSET.x),
    right: scaled(INSET.x),
    top: scaled(INSET.top),
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: scaled(16),
  },
  topLeft: { flexShrink: 1 },
  topRight: { flexShrink: 0, alignItems: 'flex-end' },
  title: {
    ...shadow,
    fontFamily: redesignFonts.display,
    fontSize: scaled(HEADLINE),
    lineHeight: scaled(HEADLINE * 1.04),
    letterSpacing: scaled(-1),
    color: redesignColors.bone,
  },
  sub: {
    ...shadow,
    marginTop: scaled(4),
    fontFamily: redesignFonts.mono,
    fontSize: scaled(6),
    lineHeight: scaled(9),
    letterSpacing: scaled(1.6),
    color: SOFT,
  },
  subRight: { textAlign: 'right' },
  // Same line box as the title, so the two numbers sit on one line however long the weight is.
  heroRow: { height: scaled(HEADLINE * 1.04), flexDirection: 'row', alignItems: 'baseline' },
  heroValue: {
    ...shadow,
    lineHeight: scaled(HEADLINE * 1.04),
    fontFamily: redesignFonts.display,
    letterSpacing: scaled(-1),
    fontVariant: ['tabular-nums'],
    color: redesignColors.bone,
  },
  heroUnit: {
    ...shadow,
    marginLeft: scaled(3),
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: scaled(10),
    lineHeight: scaled(12),
    color: redesignColors.bone,
  },
  recordPill: {
    marginTop: scaled(6),
    height: scaled(13),
    paddingHorizontal: scaled(6),
    borderRadius: scaled(4),
    justifyContent: 'center',
    backgroundColor: GOLD,
  },
  recordText: {
    fontFamily: redesignFonts.monoBold,
    fontSize: scaled(6),
    lineHeight: scaled(9),
    letterSpacing: scaled(1),
    color: redesignColors.ink,
  },
  bottomLeft: {
    position: 'absolute',
    left: scaled(INSET.x),
    bottom: scaled(INSET.bottom),
    maxWidth: scaled(W / 2 - INSET.x + 20),
  },
  line: {
    height: scaled(13.5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaled(5),
  },
  lineMark: { width: scaled(2.2), height: scaled(8), borderRadius: scaled(1) },
  lineName: {
    ...shadow,
    flexShrink: 1,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: scaled(9.5),
    lineHeight: scaled(12),
    color: redesignColors.bone,
  },
  lineSets: {
    ...shadow,
    fontFamily: redesignFonts.mono,
    fontSize: scaled(6.2),
    lineHeight: scaled(9),
    color: SOFT,
  },
  linePr: {
    ...shadow,
    fontFamily: redesignFonts.monoBold,
    fontSize: scaled(5.6),
    lineHeight: scaled(9),
    letterSpacing: scaled(1),
    color: GOLD,
  },
  more: {
    ...shadow,
    marginTop: scaled(2),
    marginLeft: scaled(7.2),
    fontFamily: redesignFonts.mono,
    fontSize: scaled(6),
    lineHeight: scaled(9),
    letterSpacing: scaled(1.4),
    color: SOFT,
  },
  bottomRight: {
    position: 'absolute',
    right: scaled(INSET.x),
    bottom: scaled(INSET.bottom),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaled(5),
  },
  wordmark: {
    ...shadow,
    fontFamily: redesignFonts.monoBold,
    fontSize: scaled(9),
    lineHeight: scaled(12),
    letterSpacing: scaled(3),
    // Trailing tracking would pull the right-aligned word off the edge.
    marginRight: scaled(-3),
    color: redesignColors.bone,
  },
});
