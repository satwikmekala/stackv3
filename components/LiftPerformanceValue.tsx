import { StyleSheet, Text, View } from 'react-native';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { formatDuration } from '@/store/exerciseMeasurement';
import type { LiftPerformance } from '@/store/liftProgress';
import { formatWeight, unitLabel, type WeightUnit } from '@/store/weightUnits';

/** Numbers lead; load types and measurement labels stay secondary. */
export function LiftPerformanceValue({ performance, unit, color }: {
  performance: LiftPerformance; unit: WeightUnit; color: string;
}) {
  const timed = performance.durationS !== undefined;
  const value = performance.bodyweight
    ? timed ? formatDuration(performance.durationS) : String(performance.reps)
    : formatWeight(performance.weight, unit);
  const valueUnit = performance.bodyweight ? timed ? 'time' : 'reps' : unitLabel(unit);
  return <View style={styles.performance}>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.value, { color }]}>
      {value}<Text style={styles.unit}> {valueUnit}</Text>
      {!performance.bodyweight && <Text style={styles.measure}>{timed ? ` · ${formatDuration(performance.durationS)}` : ` × ${performance.reps}`}</Text>}
    </Text>
    {performance.bodyweight
      ? <Text numberOfLines={1} adjustsFontSizeToFit style={styles.label}>Bodyweight</Text>
      : null}
  </View>;
}

const styles = StyleSheet.create({
  performance: { marginTop: 4, gap: 4 },
  value: { flexShrink: 1, minWidth: 0, fontFamily: redesignFonts.monoBold, lineHeight: 36, fontSize: 28, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: redesignFonts.uiMedium, lineHeight: 19, fontSize: 13, color: redesignColors.bone },
  label: { fontFamily: redesignFonts.uiMedium, lineHeight: 20, fontSize: 14, color: redesignColors.bone },
  measure: { fontFamily: redesignFonts.mono, lineHeight: 22, fontSize: 15, fontVariant: ['tabular-nums'], color: redesignColors.bone },
});
