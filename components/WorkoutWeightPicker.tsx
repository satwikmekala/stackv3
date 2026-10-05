import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { WorkoutNumberWheel } from '@/components/WorkoutNumberWheel';
import { redesignColors } from '@/constants/theme';
import { WORKOUT_WEIGHT_MAX, WORKOUT_WEIGHT_PICKER_WIDTH } from '@/constants/workoutPicker';
import type { WorkoutWeightPickerProps } from './WorkoutWeightPicker.types';

const DIGIT_WIDTH = 25;
const DOT_WIDTH = 12;
const SIDE_PADDING = 16;

export function WorkoutWeightPicker({ value, unit, compact = false, onChange }: WorkoutWeightPickerProps) {
  const tenths = Math.min(WORKOUT_WEIGHT_MAX * 10, Math.max(0, Math.round(value * 10)));
  const whole = Math.floor(tenths / 10);
  const decimal = tenths % 10;
  const reducedMotion = useReducedMotion();
  const targetWidth = String(whole).length * DIGIT_WIDTH;
  const wholeWidth = useSharedValue(targetWidth);
  useEffect(() => {
    wholeWidth.set(withTiming(targetWidth, { duration: reducedMotion ? 0 : 300 }));
  }, [reducedMotion, targetWidth, wholeWidth]);
  const wholeStyle = useAnimatedStyle(() => ({ width: wholeWidth.get() }));
  const pillStyle = useAnimatedStyle(() => ({
    width: wholeWidth.get() + DIGIT_WIDTH + DOT_WIDTH + SIDE_PADDING * 2,
  }));

  return <View style={styles.root}>
    <View style={styles.weight}>
      <Animated.View pointerEvents="none" style={[styles.selection, pillStyle]} />
      <View style={styles.digits}>
        <Animated.View style={wholeStyle}><WorkoutNumberWheel value={whole} minimum={0} maximum={WORKOUT_WEIGHT_MAX} textAlign="right" label={`Weight in ${unit}, whole number`} onChange={next => onChange(Math.min(WORKOUT_WEIGHT_MAX, next + decimal / 10))} /></Animated.View>
        <Text accessible={false} style={styles.dot}>.</Text>
        <View style={{ width: DIGIT_WIDTH }}><WorkoutNumberWheel value={decimal} minimum={0} maximum={whole === WORKOUT_WEIGHT_MAX ? 0 : 9} textAlign="left" label={`Weight in ${unit}, decimal digit`} onChange={next => onChange(Math.min(WORKOUT_WEIGHT_MAX, whole + next / 10))} /></View>
      </View>
    </View>
    {!compact && <Text accessible={false} style={styles.unit}>{unit}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  root: { height: 220, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', maxWidth: '100%' },
  weight: { width: WORKOUT_WEIGHT_PICKER_WIDTH, maxWidth: '100%', alignItems: 'center', justifyContent: 'center' },
  digits: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  selection: { position: 'absolute', height: 44, borderRadius: 22, backgroundColor: redesignColors.raised },
  dot: { fontSize: 38, fontWeight: '500', color: redesignColors.bone, width: DOT_WIDTH, textAlign: 'center', paddingBottom: 5 },
  unit: { fontSize: 17, fontWeight: '500', color: redesignColors.ash, marginLeft: 8 },
});
