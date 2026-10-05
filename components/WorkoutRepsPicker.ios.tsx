import React from 'react';
import { useAppPreferences } from '@/store/appPreferences';
import { requireNativeView } from 'expo';
import type { NativeSyntheticEvent, ViewProps } from 'react-native';
import type { WorkoutRepsPickerProps } from './WorkoutRepsPicker.types';
import { WORKOUT_REPS_MAX } from '@/constants/workoutPicker';

const NativeRepsPicker = requireNativeView<ViewProps & {
  value: number;
  hapticsEnabled: boolean;
  onValueChange: (event: NativeSyntheticEvent<{ value: number }>) => void;
}>('StackWorkoutControls', 'RepsPicker');

export function WorkoutRepsPicker({ value, onChange }: WorkoutRepsPickerProps) {
  const hapticsEnabled = useAppPreferences(state => state.ready && !state.error && state.haptics);
  return <NativeRepsPicker value={Math.min(WORKOUT_REPS_MAX, Math.max(1, value))} hapticsEnabled={hapticsEnabled} onValueChange={({ nativeEvent }) => onChange(nativeEvent.value)}
    style={{ width: '100%', height: 180 }} />;
}
