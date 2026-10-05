import { ChevronDown, Plus, Repeat2, X } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { WorkoutTouchable } from '@/components/WorkoutTouchable';
import { redesignColors, redesignFonts } from '@/constants/theme';
import type { WorkoutHeaderActionsProps } from './WorkoutHeaderActions.types';

export function WorkoutHeaderActions({ addMode, onChange, onMinimize, onExit }: WorkoutHeaderActionsProps) {
  const ChangeIcon = addMode ? Plus : Repeat2;
  return <View style={styles.row}>
    <WorkoutTouchable accessibilityRole="button" accessibilityLabel={addMode ? 'Add exercise or navigate' : 'Change exercise'}
      onPress={onChange} style={[styles.button, styles.change]}>
      <ChangeIcon size={18} color={redesignColors.ash} />
      <Text style={styles.label}>{addMode ? 'Add' : 'Change'}</Text>
    </WorkoutTouchable>
    <WorkoutTouchable accessibilityRole="button" accessibilityLabel="Minimize workout"
      accessibilityHint="Keep your workout active and return to the previous screen" onPress={onMinimize} style={styles.button}>
      <ChevronDown size={20} color={redesignColors.ash} />
    </WorkoutTouchable>
    <WorkoutTouchable accessibilityRole="button" accessibilityLabel="Exit workout" onPress={onExit} style={styles.button}>
      <X size={20} color={redesignColors.ash} />
    </WorkoutTouchable>
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  button: { minWidth: 44, minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: redesignColors.surface },
  change: { flexDirection: 'row', paddingHorizontal: 14, gap: 7 },
  label: { color: redesignColors.ash, fontFamily: redesignFonts.uiSemiBold, fontSize: 15 },
});
