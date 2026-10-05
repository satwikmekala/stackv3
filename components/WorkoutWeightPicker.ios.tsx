import React from 'react';
import { useAppPreferences } from '@/store/appPreferences';
import { requireNativeView } from 'expo';
import type { NativeSyntheticEvent, ViewProps } from 'react-native';
import type { WorkoutWeightPickerProps } from './WorkoutWeightPicker.types';
import { WORKOUT_WEIGHT_MAX } from '@/constants/workoutPicker';

const NativeWeightPicker = requireNativeView<ViewProps & {
  value: number;
  unit: string;
  compact: boolean;
  hapticsEnabled: boolean;
  onValueChange: (event: NativeSyntheticEvent<{ value: number }>) => void;
}>('StackWorkoutControls', 'WeightPicker');

export function WorkoutWeightPicker({ value, unit, compact = false, onChange }: WorkoutWeightPickerProps) {
  const hapticsEnabled = useAppPreferences(state => state.ready && !state.error && state.haptics);
  return <NativeWeightPicker value={Math.min(WORKOUT_WEIGHT_MAX, Math.max(0, value))} unit={unit} compact={compact}
    hapticsEnabled={hapticsEnabled} onValueChange={({ nativeEvent }) => onChange(nativeEvent.value)}
    style={{ width: '100%', height: compact ? 180 : 190 }} />;
}
