import { SplitPressable as Pressable } from '@/components/custom-split/SplitPressable';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { DEFAULT_WEIGHT_UNIT } from '@/store/workoutDatabase';
import { formatSummaryDate, deriveWorkoutSummary } from '@/store/workoutSummary';
import { useWorkoutStore, type WorkoutSession } from '@/store/workoutStore';
import { formatWeight, unitLabel, type WeightUnit } from '@/store/weightUnits';

// Keep display-unit selection aligned with records.tsx. Stored volume remains
// kg-canonical; only the value rendered in this row is converted.
const useWeightUnit = (): WeightUnit =>
  useWorkoutStore((state) => state.profile?.weightUnit ?? DEFAULT_WEIGHT_UNIT);

function shortSummaryDate(date: Date): string {
  return formatSummaryDate(date)
    .replace(/^([A-Za-z]{3})[A-Za-z]*,/, '$1,');
}

function groupFormattedWeight(value: string): string {
  const [whole, decimal] = value.split('.');
  const groupedWhole = Number(whole).toLocaleString('en-US');
  return decimal ? `${groupedWhole}.${decimal}` : groupedWhole;
}

export type HistoryWorkoutRowProps = {
  session: WorkoutSession;
  onPress: () => void;
};

export function HistoryWorkoutRow({
  session,
  onPress,
}: HistoryWorkoutRowProps) {
  const weightUnit = useWeightUnit();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale > 1.3;
  const summary = deriveWorkoutSummary(session);
  const volume = groupFormattedWeight(formatWeight(summary.volumeKg, weightUnit));

  return (
    <Pressable
      accessibilityHint="Opens the full workout recap"
      accessibilityLabel={`${summary.title}, ${shortSummaryDate(summary.date)}, ${volume} ${unitLabel(weightUnit)} moved`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.content, stacked && styles.stackedContent]}>
        <View style={[styles.identity, stacked && styles.stackedIdentity]}>
          <Text style={styles.title}>{summary.title}</Text>
          <Text style={styles.date}>{shortSummaryDate(summary.date)}</Text>
        </View>

        <View style={[styles.volume, stacked && styles.stackedVolume]}>
          <Text style={styles.volumeValue}>{volume}</Text>
          <Text style={styles.volumeUnit}>{unitLabel(weightUnit)} moved</Text>
        </View>
      </View>

      <ChevronRight
        color={redesignColors.ash}
        size={21}
        strokeWidth={2.1}
        style={styles.chevron}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    minHeight: 92,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: redesignColors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  pressed: {
    backgroundColor: redesignColors.raised,
  },
  content: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stackedContent: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 14,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  stackedIdentity: {
    flex: 0,
  },
  title: {
    fontFamily: redesignFonts.uiBold,
    fontSize: 19,
    lineHeight: 25,
    color: redesignColors.bone,
  },
  date: {
    marginTop: 4,
    fontFamily: redesignFonts.ui,
    fontSize: 14,
    lineHeight: 20,
    color: redesignColors.ash,
  },
  volume: {
    minWidth: 0,
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  stackedVolume: {
    alignItems: 'flex-start',
  },
  volumeValue: {
    fontFamily: redesignFonts.mono,
    fontVariant: ['tabular-nums'],
    fontSize: 17,
    lineHeight: 22,
    color: redesignColors.bone,
  },
  volumeUnit: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: redesignFonts.ui,
    color: redesignColors.ash,
  },
  chevron: {
    marginLeft: 10,
    flexShrink: 0,
  },
});
