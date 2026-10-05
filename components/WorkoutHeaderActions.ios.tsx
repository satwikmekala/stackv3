import { useState } from 'react';
import { requireNativeView } from 'expo';
import type { NativeSyntheticEvent, ViewProps } from 'react-native';
import type { WorkoutHeaderActionsProps } from './WorkoutHeaderActions.types';

type Size = { width: number; height: number };
const NativeControls = requireNativeView<ViewProps & {
  addMode: boolean;
  onChangePress: () => void;
  onMinimizePress: () => void;
  onExitPress: () => void;
  onSizeChange: (event: NativeSyntheticEvent<Size>) => void;
}>('StackWorkoutControls');

export function WorkoutHeaderActions(props: WorkoutHeaderActionsProps) {
  const [size, setSize] = useState<Size>({ width: 224, height: 44 });
  return <NativeControls addMode={props.addMode} onChangePress={props.onChange}
    onMinimizePress={props.onMinimize} onExitPress={props.onExit} style={{ ...size, flexShrink: 0 }}
    onSizeChange={({ nativeEvent }) => setSize(nativeEvent)} />;
}
