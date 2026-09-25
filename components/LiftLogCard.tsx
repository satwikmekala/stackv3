import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { STAT_STRIP_HEIGHT, STAT_STRIP_WIDTH } from '@/components/StatStripCard';
import { redesignColors, redesignFonts } from '@/constants/theme';
import type { LiftLogLine } from '@/store/liftLog';

const CAPTURE_SCALE = STAT_STRIP_WIDTH / 324;
const scaled = (value: number) => value * CAPTURE_SCALE;

// The canvas is transparent, and captured translucency pastes much fainter than it previews,
// so secondary text uses a solid softer tone instead of opacity.
const SOFT = '#D8D1C5';

export interface LiftLogCardProps {
  accent: string;
  title: string;
  date: string;
  lines: LiftLogLine[];
  more: number;
  volumeValue: string;
  volumeUnit: string;
}

/**
 * A transparent 1080 x 1920 sticker that lists every lift's top set, for pasting over a
 * photo. Same canvas and capture rules as the Stat Strip: preview surfaces scale the parent.
 */
export const LiftLogCard = forwardRef<View, LiftLogCardProps>(function LiftLogCard(
  { accent, title, date, lines, more, volumeValue, volumeUnit },
  ref
) {
  return (
    <View ref={ref} style={styles.canvas} collapsable={false}>
      <View style={styles.column}>
        <View style={styles.header}>
          <View style={[styles.dot, { backgroundColor: accent }]} />
          <Text allowFontScaling={false} numberOfLines={1} style={styles.title}>{title}</Text>
          <Text allowFontScaling={false} numberOfLines={1} style={styles.date}>{date}</Text>
        </View>

        <View style={styles.body}>
          <View style={[styles.rule, { backgroundColor: accent }]} />
          <View style={styles.lines}>
            {lines.map((line, index) => (
              <View key={`${line.name}-${index}`} style={styles.line}>
                <View style={styles.valueRow}>
                  <Text allowFontScaling={false} style={styles.value}>{line.value}</Text>
                  <Text allowFontScaling={false} style={styles.unit}>{line.unit}</Text>
                  {line.record ? (
                    <View style={[styles.record, { backgroundColor: accent }]}>
                      <Text allowFontScaling={false} style={styles.recordText}>PR</Text>
                    </View>
                  ) : null}
                </View>
                <Text allowFontScaling={false} numberOfLines={1} style={styles.label}>
                  {line.name} · {line.scheme}
                </Text>
              </View>
            ))}
            {more > 0 ? (
              <Text allowFontScaling={false} style={styles.more}>
                +{more} MORE {more === 1 ? 'LIFT' : 'LIFTS'}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.footer}>
          <Text allowFontScaling={false} style={styles.wordmark}>STACK</Text>
          {volumeValue !== '0' ? (
            <Text allowFontScaling={false} style={styles.total}>
              {volumeValue} {volumeUnit.toUpperCase()} MOVED
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
});

LiftLogCard.displayName = 'LiftLogCard';

// A soft shadow keeps white type legible over bright photos without reading as a box.
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
    justifyContent: 'center',
  },
  column: {
    marginLeft: scaled(25.5),
    marginRight: scaled(25.5),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: scaled(5.5),
    height: scaled(5.5),
    marginRight: scaled(8),
    borderRadius: 999,
  },
  title: {
    ...shadow,
    fontFamily: redesignFonts.monoBold,
    fontSize: scaled(10.5),
    lineHeight: scaled(14),
    letterSpacing: scaled(2),
    textTransform: 'uppercase',
    color: redesignColors.bone,
  },
  date: {
    ...shadow,
    marginLeft: scaled(10),
    fontFamily: redesignFonts.mono,
    fontSize: scaled(8.5),
    lineHeight: scaled(12),
    letterSpacing: scaled(1.2),
    textTransform: 'uppercase',
    color: SOFT,
  },
  body: {
    flexDirection: 'row',
    marginTop: scaled(14),
    // The rule sits under the header dot's centre.
    marginLeft: scaled(2.25),
  },
  rule: {
    width: scaled(1.2),
    borderRadius: scaled(1),
  },
  lines: {
    flexShrink: 1,
    paddingLeft: scaled(15),
    gap: scaled(13),
  },
  line: {
    gap: scaled(3),
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    ...shadow,
    fontFamily: redesignFonts.display,
    fontSize: scaled(34),
    lineHeight: scaled(36),
    letterSpacing: scaled(-0.8),
    fontVariant: ['tabular-nums'],
    color: redesignColors.bone,
  },
  unit: {
    ...shadow,
    marginLeft: scaled(4),
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: scaled(10),
    lineHeight: scaled(12),
    color: redesignColors.bone,
  },
  record: {
    alignSelf: 'center',
    marginLeft: scaled(7),
    paddingHorizontal: scaled(5),
    height: scaled(12),
    borderRadius: scaled(3),
    justifyContent: 'center',
  },
  recordText: {
    fontFamily: redesignFonts.monoBold,
    fontSize: scaled(7),
    lineHeight: scaled(9),
    letterSpacing: scaled(1),
    color: redesignColors.ink,
  },
  label: {
    ...shadow,
    fontFamily: redesignFonts.uiMedium,
    fontSize: scaled(7.5),
    lineHeight: scaled(10),
    letterSpacing: scaled(1.6),
    textTransform: 'uppercase',
    color: SOFT,
  },
  more: {
    ...shadow,
    fontFamily: redesignFonts.mono,
    fontSize: scaled(7.5),
    lineHeight: scaled(10),
    letterSpacing: scaled(1.6),
    color: SOFT,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaled(10),
    marginTop: scaled(16),
  },
  wordmark: {
    ...shadow,
    fontFamily: redesignFonts.monoBold,
    fontSize: scaled(7.5),
    lineHeight: scaled(10),
    letterSpacing: scaled(2),
    color: redesignColors.bone,
  },
  total: {
    ...shadow,
    fontFamily: redesignFonts.mono,
    fontSize: scaled(7),
    lineHeight: scaled(10),
    letterSpacing: scaled(1.4),
    color: SOFT,
  },
});
