import { requireNativeView } from 'expo';
import type { ViewProps } from 'react-native';

const NativeDone = requireNativeView<ViewProps & {
  onDonePress: () => void;
  accessory: boolean;
}>('StackWorkoutControls', 'NotesDone');

export function ExerciseNotesDone({ onPress, accessory = false }: { onPress: () => void; accessory?: boolean }) {
  return <NativeDone onDonePress={onPress} accessory={accessory}
    style={{ height: 44, width: accessory ? '100%' : 88 }} />;
}
