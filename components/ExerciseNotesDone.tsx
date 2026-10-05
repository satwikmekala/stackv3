import { Button, View } from 'react-native';

export function ExerciseNotesDone({ onPress }: { onPress: () => void; accessory?: boolean }) {
  return <View style={{ minHeight: 44, justifyContent: 'center' }}><Button title="Done" onPress={onPress} /></View>;
}
