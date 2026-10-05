import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WorkoutNumberWheel } from '@/components/WorkoutNumberWheel';
import { redesignColors } from '@/constants/theme';
import { WORKOUT_WEIGHT_MAX, WORKOUT_WEIGHT_PICKER_WIDTH, WORKOUT_WEIGHT_CONTENT_OFFSET } from '@/constants/workoutPicker';
import type { WorkoutWeightPickerProps } from './WorkoutWeightPicker.types';

export function WorkoutWeightPicker({ value, unit, compact = false, onChange }: WorkoutWeightPickerProps) {
  const tenths = Math.min(WORKOUT_WEIGHT_MAX * 10, Math.max(0, Math.round(value * 10)));
  const whole = Math.floor(tenths / 10);
  const decimal = tenths % 10;
  return <View style={[styles.root, compact ? { width: WORKOUT_WEIGHT_PICKER_WIDTH, maxWidth: '100%', alignSelf: 'center', paddingLeft: 12 + WORKOUT_WEIGHT_CONTENT_OFFSET, paddingRight: 12 - WORKOUT_WEIGHT_CONTENT_OFFSET } : { alignSelf: 'center', maxWidth: '100%' }]}>
    <View pointerEvents="none" style={styles.selection} />
    <View style={compact ? { flex: 1, minWidth: 0 } : { width: 96 }}><WorkoutNumberWheel value={whole} minimum={0} maximum={WORKOUT_WEIGHT_MAX} textAlign="right" label={`Weight in ${unit}, whole number`} onChange={next => onChange(Math.min(WORKOUT_WEIGHT_MAX, next + decimal / 10))} /></View>
    <Text accessible={false} style={styles.dot}>.</Text>
    <View style={{ width: compact ? 36 : 48 }}><WorkoutNumberWheel value={decimal} minimum={0} maximum={whole === WORKOUT_WEIGHT_MAX ? 0 : 9} textAlign="left" label={`Weight in ${unit}, decimal digit`} onChange={next => onChange(Math.min(WORKOUT_WEIGHT_MAX, whole + next / 10))} /></View>
    {!compact && <Text accessible={false} style={styles.unit}>{unit}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  root: { height: 220, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  selection: { position: 'absolute', left: 0, right: 0, height: 44, borderRadius: 12, backgroundColor: redesignColors.raised },
  dot: { fontSize: 38, fontWeight: '500', color: redesignColors.bone, width: 12, textAlign: 'center', paddingBottom: 5 },
  unit: { fontSize: 17, fontWeight: '500', color: redesignColors.ash, marginLeft: 8 },
});
