import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { WorkoutNumberWheel } from '@/components/WorkoutNumberWheel';
import { redesignColors } from '@/constants/theme';
import { WORKOUT_WEIGHT_MAX, WORKOUT_WEIGHT_PICKER_WIDTH } from '@/constants/workoutPicker';
import type { WorkoutWeightPickerProps } from './WorkoutWeightPicker.types';

const DIGIT_WIDTH = 25;
const DOT_WIDTH = 12;

export function WorkoutWeightPicker({ value, unit, compact = false, onChange }: WorkoutWeightPickerProps) {
  const { fontScale } = useWindowDimensions();
  // Match the wheel's capped text scaling while reserving its largest row.
  const digitWidth = Math.ceil(DIGIT_WIDTH * Math.min(fontScale, 1.25));
  const wholeWidth = String(WORKOUT_WEIGHT_MAX).length * digitWidth;
  const tenths = Math.min(WORKOUT_WEIGHT_MAX * 10, Math.max(0, Math.round(value * 10)));
  const whole = Math.floor(tenths / 10);
  const decimal = tenths % 10;

  return <View style={styles.root}>
    <View style={styles.weight}>
      <View pointerEvents="none" style={styles.selection} />
      <View style={styles.digits}>
        <View style={{ width: wholeWidth }}><WorkoutNumberWheel value={whole} minimum={0} maximum={WORKOUT_WEIGHT_MAX} textAlign="right" label={`Weight in ${unit}, whole number`} onChange={next => onChange(Math.min(WORKOUT_WEIGHT_MAX, next + decimal / 10))} /></View>
        <Text accessible={false} style={styles.dot}>.</Text>
        <View style={{ width: digitWidth }}><WorkoutNumberWheel value={decimal} minimum={0} maximum={whole === WORKOUT_WEIGHT_MAX ? 0 : 9} textAlign="left" label={`Weight in ${unit}, decimal digit`} onChange={next => onChange(Math.min(WORKOUT_WEIGHT_MAX, whole + next / 10))} /></View>
      </View>
    </View>
    {!compact && <Text accessible={false} style={styles.unit}>{unit}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  root: { height: 220, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', maxWidth: '100%' },
  weight: { width: WORKOUT_WEIGHT_PICKER_WIDTH, maxWidth: '100%', alignItems: 'center', justifyContent: 'center' },
  digits: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  selection: { position: 'absolute', width: '100%', height: 44, borderRadius: 22, backgroundColor: redesignColors.raised },
  dot: { fontSize: 38, fontWeight: '500', color: redesignColors.bone, width: DOT_WIDTH, textAlign: 'center', paddingBottom: 5 },
  unit: { fontSize: 17, fontWeight: '500', color: redesignColors.ash, marginLeft: 8 },
});
