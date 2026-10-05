import React from 'react';
import { View } from 'react-native';
import { WorkoutNumberWheel } from '@/components/WorkoutNumberWheel';
import { redesignColors } from '@/constants/theme';
import type { WorkoutRepsPickerProps } from './WorkoutRepsPicker.types';
import { WORKOUT_REPS_MAX, WORKOUT_REPS_PICKER_WIDTH } from '@/constants/workoutPicker';

export function WorkoutRepsPicker({ value, onChange }: WorkoutRepsPickerProps) {
  return <View style={{ width: WORKOUT_REPS_PICKER_WIDTH, maxWidth: '100%', alignSelf: 'center' }}>
    <View pointerEvents="none" style={{ position: 'absolute', top: 88, left: 0, right: 0, height: 44, borderRadius: 12, backgroundColor: redesignColors.raised }} />
    <WorkoutNumberWheel value={Math.min(WORKOUT_REPS_MAX, Math.max(1, value))} minimum={1} maximum={WORKOUT_REPS_MAX} label="Repetitions" onChange={onChange} />
  </View>;
}
