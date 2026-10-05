import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BookmarkPlus, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { useWorkoutStore, type WorkoutSession } from '@/store/workoutStore';
import { readExerciseCatalogSync } from '@/store/workoutDatabase';
import { defaultAdhocRoutineName } from '@/store/adhocWorkout';

export function SaveAdhocRoutine({ session, stacked = false, secondary = false }: { session: WorkoutSession; stacked?: boolean; secondary?: boolean }) {
  const insets = useSafeAreaInsets();
  const savedId = useWorkoutStore((state) => state.savedAdhocRoutineIds[session.id]);
  const save = useWorkoutStore((state) => state.saveAdhocRoutine);
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const label = { color: redesignColors.bone, fontFamily: redesignFonts.uiSemiBold, fontSize: 16 };
  return <>
    <Pressable cssInterop={false} accessibilityRole="button" disabled={savedId !== undefined} accessibilityState={{ disabled: savedId !== undefined }}
      onPress={() => { setName(defaultAdhocRoutineName(session, readExerciseCatalogSync())); setError(null); setVisible(true); }}
      style={({ pressed }) => [styles.button, stacked && styles.stackedButton, secondary && styles.secondaryButton, savedId !== undefined && styles.savedButton, pressed && (secondary ? styles.secondaryPressed : styles.pressed)]}>
      {savedId !== undefined ? <Check size={20} color={secondary ? redesignColors.bone : redesignColors.ink} /> : <BookmarkPlus size={20} color={secondary ? redesignColors.bone : redesignColors.ink} />}
      <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{savedId !== undefined ? 'Routine saved' : 'Save as routine'}</Text>
    </Pressable>
    <Modal transparent visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000088' }}>
        <Pressable accessibilityLabel="Close save routine" accessibilityRole="button" onPress={() => setVisible(false)} style={{ flex: 1 }} />
        <View style={{ padding: 24, paddingBottom: insets.bottom + 24, gap: 18, backgroundColor: redesignColors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          <Text style={[label, { fontSize: 24 }]}>Save as routine</Text>
          <Text style={{ color: redesignColors.ash, fontFamily: redesignFonts.ui }}>Save these exercises in order. Your current routine stays active.</Text>
          <TextInput accessibilityLabel="Routine name" value={name} onChangeText={setName} maxLength={80} autoFocus
            placeholder="Workout" placeholderTextColor={redesignColors.ash}
            style={[label, { padding: 16, borderWidth: 1, borderColor: redesignColors.border, borderRadius: 12 }]} />
          {error ? <Text accessibilityRole="alert" style={{ color: redesignColors.bone }}>{error}</Text> : null}
          <Pressable accessibilityRole="button" onPress={() => {
            if (!name.trim()) { setError('Enter a routine name.'); return; }
            if (save(session.id, name) !== undefined) setVisible(false);
            else setError('Couldn’t save your routine. Try again.');
          }} style={{ padding: 18, alignItems: 'center', borderRadius: 12, backgroundColor: redesignColors.raised }}>
            <Text style={label}>Save routine</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setVisible(false)} style={{ padding: 12, alignItems: 'center' }}><Text style={label}>Cancel</Text></Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  button: {
    flex: 1.65,
    minWidth: 0,
    minHeight: 56,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: redesignColors.bone,
  },
  stackedButton: { flex: 0, width: '100%' },
  secondaryButton: { backgroundColor: redesignColors.raised },
  secondaryText: { color: redesignColors.bone },
  secondaryPressed: { backgroundColor: redesignColors.hi },
  savedButton: { opacity: 0.65 },
  pressed: { backgroundColor: '#DCD4C8' },
  buttonText: {
    flexShrink: 1,
    textAlign: 'center',
    color: redesignColors.ink,
    fontFamily: redesignFonts.uiBold,
    fontSize: 16,
    lineHeight: 22,
  },
});
