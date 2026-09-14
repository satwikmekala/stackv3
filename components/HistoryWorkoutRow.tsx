import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { DEFAULT_WEIGHT_UNIT } from '@/store/workoutDatabase';
import { formatSummaryDate, deriveWorkoutSummary } from '@/store/workoutSummary';
import { useWorkoutStore, type WorkoutSession } from '@/store/workoutStore';
import { formatWeight, unitLabel, type WeightUnit } from '@/store/weightUnits';

const CARD_BORDER = 'rgba(169, 159, 145, 0.22)';

// Keep display-unit selection aligned with records.tsx. Stored volume remains
// kg-canonical; only the value rendered in this row is converted.
const useWeightUnit = (): WeightUnit =>
  useWorkoutStore((state) => state.profile?.weightUnit ?? DEFAULT_WEIGHT_UNIT);

function shortSummaryDate(date: Date): string {
  return formatSummaryDate(date)
    .replace(/^([A-Za-z]{3})[A-Za-z]*,/, '$1,')
    .toUpperCase();
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
  const summary = deriveWorkoutSummary(session);
  const volume = groupFormattedWeight(formatWeight(summary.volumeKg, weightUnit));

  return (
    <Pressable
      accessibilityHint="Opens the full workout recap"
      accessibilityLabel={`${summary.title}, ${shortSummaryDate(summary.date)}, ${volume} ${unitLabel(weightUnit)}`}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.identity}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          numberOfLines={1}
          style={styles.title}
        >
          {summary.title}
        </Text>
        <Text style={styles.date}>{shortSummaryDate(summary.date)}</Text>
      </View>

      <View style={styles.volume}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          numberOfLines={1}
          style={styles.volumeValue}
        >
          {volume}
        </Text>
        <Text style={styles.volumeUnit}>{unitLabel(weightUnit).toUpperCase()}</Text>
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
    minHeight: 90,
    paddingHorizontal: 17,
    paddingVertical: 15,
    borderRadius: 23,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: redesignColors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: redesignFonts.uiBold,
    fontSize: 17,
    lineHeight: 21,
    color: redesignColors.bone,
  },
  date: {
    marginTop: 4,
    fontFamily: redesignFonts.mono,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.6,
    color: redesignColors.ash,
  },
  volume: {
    width: 86,
    minWidth: 0,
    marginLeft: 10,
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  volumeValue: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 17,
    lineHeight: 22,
    color: redesignColors.bone,
  },
  volumeUnit: {
    marginTop: 3,
    fontFamily: redesignFonts.mono,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.4,
    color: redesignColors.ash,
  },
  chevron: {
    marginLeft: 10,
    flexShrink: 0,
  },
});
