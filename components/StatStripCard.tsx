import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { redesignColors, redesignFonts } from '@/constants/theme';

export const STAT_STRIP_WIDTH = 1080;
export const STAT_STRIP_HEIGHT = 1920;

const CAPTURE_SCALE = STAT_STRIP_WIDTH / 324;
const scaled = (value: number) => value * CAPTURE_SCALE;

export interface StatStripCardProps {
  accent: string;
  title: string;
  date: string;
  volumeValue: string;
  volumeUnit: string;
  setCount: number;
  repCount: number;
  specialSetLabel?: string;
}

/**
 * A fixed 1080 x 1920 Stat Strip canvas. Preview surfaces should scale the
 * component's parent so the outer ref remains an unscaled capture target.
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
  },
  ref
) {
  return (
    <View ref={ref} style={styles.canvas} collapsable={false}>
      <View style={styles.strip}>
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            <View style={[styles.accentDot, { backgroundColor: accent }]} />
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={styles.title}
            >
              {title}
            </Text>
            {specialSetLabel ? (
              <View style={[styles.badge, { borderColor: accent }]}>
                <Text allowFontScaling={false} numberOfLines={1} style={styles.badgeText}>
                  {specialSetLabel}
                </Text>
              </View>
            ) : null}
          </View>

          <Text allowFontScaling={false} numberOfLines={1} style={styles.date}>
            {date}
          </Text>
        </View>

        <View style={styles.horizontalRule} />

        <View style={styles.statsRow}>
          <View style={styles.volumeStat}>
            <Text
              adjustsFontSizeToFit
              allowFontScaling={false}
              minimumFontScale={0.72}
              numberOfLines={1}
              style={styles.volumeValue}
            >
              {volumeValue}
            </Text>
            <Text allowFontScaling={false} style={styles.metricLabel}>
              {volumeUnit} VOLUME
            </Text>
          </View>

          <View style={styles.verticalRule} />

          <View style={styles.setStat}>
            <Text allowFontScaling={false} style={styles.supportingValue}>
              {setCount}
            </Text>
            <Text allowFontScaling={false} style={styles.metricLabel}>SETS</Text>
          </View>

          <View style={styles.verticalRule} />

          <View style={styles.repStat}>
            <Text allowFontScaling={false} style={styles.supportingValue}>
              {repCount}
            </Text>
            <Text allowFontScaling={false} style={styles.metricLabel}>REPS</Text>
          </View>

          <View style={styles.wordmarkStat}>
            <Text allowFontScaling={false} numberOfLines={1} style={styles.wordmark}>
              STACK
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
});

StatStripCard.displayName = 'StatStripCard';

const styles = StyleSheet.create({
  canvas: {
    width: STAT_STRIP_WIDTH,
    height: STAT_STRIP_HEIGHT,
    backgroundColor: 'transparent',
  },
  strip: {
    position: 'absolute',
    left: scaled(25.5),
    right: scaled(25.5),
    bottom: scaled(91),
  },
  headerRow: {
    height: scaled(17),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: scaled(12),
  },
  titleGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  accentDot: {
    width: scaled(5.5),
    height: scaled(5.5),
    marginRight: scaled(8),
    borderRadius: 999,
  },
  title: {
    flexShrink: 0,
    fontFamily: redesignFonts.monoBold,
    fontSize: scaled(10.5),
    lineHeight: scaled(14),
    letterSpacing: scaled(2),
    textTransform: 'uppercase',
    color: redesignColors.bone,
  },
  date: {
    flexShrink: 0,
    maxWidth: scaled(78),
    textAlign: 'right',
    fontFamily: redesignFonts.mono,
    fontSize: scaled(8.5),
    lineHeight: scaled(12),
    letterSpacing: scaled(1.2),
    textTransform: 'uppercase',
    color: redesignColors.bone,
  },
  badge: {
    flexShrink: 0,
    height: scaled(17),
    marginLeft: scaled(10),
    paddingHorizontal: scaled(8),
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: redesignFonts.mono,
    fontSize: scaled(7.5),
    lineHeight: scaled(10),
    letterSpacing: scaled(1.25),
    textTransform: 'uppercase',
    color: redesignColors.bone,
  },
  horizontalRule: {
    height: 1,
    marginTop: scaled(6),
    backgroundColor: redesignColors.border,
  },
  statsRow: {
    height: scaled(44),
    marginTop: scaled(5),
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  volumeStat: {
    width: scaled(105),
    height: '100%',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  volumeValue: {
    width: '100%',
    fontFamily: redesignFonts.display,
    fontSize: scaled(27),
    lineHeight: scaled(27),
    letterSpacing: scaled(0.2),
    fontVariant: ['tabular-nums'],
    color: redesignColors.bone,
  },
  setStat: {
    width: scaled(57),
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  repStat: {
    width: scaled(63),
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  supportingValue: {
    fontFamily: redesignFonts.monoBold,
    fontSize: scaled(27),
    lineHeight: scaled(31),
    fontVariant: ['tabular-nums'],
    color: redesignColors.bone,
  },
  metricLabel: {
    fontFamily: redesignFonts.uiMedium,
    fontSize: scaled(8.5),
    lineHeight: scaled(10),
    letterSpacing: scaled(2),
    textTransform: 'uppercase',
    color: redesignColors.ash,
  },
  verticalRule: {
    alignSelf: 'center',
    width: 1,
    height: scaled(35),
    backgroundColor: redesignColors.border,
  },
  wordmarkStat: {
    width: scaled(47.4),
    height: '100%',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  wordmark: {
    fontFamily: redesignFonts.monoBold,
    fontSize: scaled(6.5),
    lineHeight: scaled(10),
    letterSpacing: scaled(1.2),
    color: redesignColors.bone,
    opacity: 0.8,
  },
});
