import { useEffect, useRef, useState } from 'react';
import { InputAccessoryView, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, ui } from '@/components/custom-split/ui';
import { StackLogoLoader } from '@/components/StackLogoLoader';
import { ExerciseNotesDone } from '@/components/ExerciseNotesDone';
import { redesignColors as c, redesignFonts as f } from '@/constants/theme';
import { onboardingBackOptions } from '@/features/onboarding/OnboardingActions';
import { PASTE_PARSE_MESSAGES, PasteParseFailure, checkPastedText, parsePastedRoutine } from '@/features/routineImport/client';
import { buildImportedDraft } from '@/features/routineImport/importDraft';
import { ROUTINE_IMPORT_LIMITS } from '@/features/routineImport/routineImportProtocol';
import { useCustomSplitDraftStore } from '@/store/customSplitDraft';
import { getNextCustomSplitNameAsync, initializeWorkoutDatabase, readExerciseCatalogSync } from '@/store/workoutDatabase';
import { useWorkoutStore } from '@/store/workoutStore';

const EXAMPLE = `Push
bench 3x8
incline db 3x10
lat raises 4x12

Pull
deadlift 3x5
lat pulldown 3x10`;
const KEYBOARD_ACCESSORY_ID = 'paste-routine-keyboard-done';

export default function PasteRoutine() {
  const router = useRouter();
  const completed = useWorkoutStore((state) => state.profile?.onboardingCompleted);
  const source = completed ? 'library' : 'onboarding';
  const [text, setText] = useState('');
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; request.current?.abort(); }, []);

  const stop = () => { request.current?.abort(); request.current = null; setReading(false); };
  const back = () => {
    if (reading) { stop(); return; }
    if (router.canGoBack()) router.back(); else router.replace(completed ? '/your-splits' : '/bring-workouts');
  };

  const read = async () => {
    const invalid = checkPastedText(text);
    if (invalid) { setError(PASTE_PARSE_MESSAGES[invalid]); return; }
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setError(null);
    setReading(true);
    try {
      const result = await parsePastedRoutine(text, { signal: controller.signal });
      await initializeWorkoutDatabase();
      const imported = buildImportedDraft(result, readExerciseCatalogSync());
      if (!imported.workouts.length) throw new PasteParseFailure('failed');
      const name = imported.name ?? await getNextCustomSplitNameAsync();
      if (controller.signal.aborted || !mounted.current) return;
      // Nothing is saved: the routine becomes an editable draft the person reviews first.
      useCustomSplitDraftStore.getState().initializeImportedDraft(name, imported.workouts, source);
      router.push({ pathname: '/custom-split', params: { source } });
    } catch (failure) {
      if (controller.signal.aborted || !mounted.current) return;
      setError(failure instanceof PasteParseFailure ? failure.message : PASTE_PARSE_MESSAGES.failed);
    } finally {
      if (request.current === controller) request.current = null;
      // The paste stays in place: Back from the editor or a retry starts from it.
      if (mounted.current) setReading(false);
    }
  };

  return <SafeAreaView edges={['left', 'right', 'bottom']} style={ui.screen}>
    <Stack.Screen options={{ headerShown: true, title: '', headerStyle: { backgroundColor: c.ink }, headerTintColor: c.bone,
      headerShadowVisible: false, gestureEnabled: !reading,
      // eslint-disable-next-line react-hooks/refs -- Toolbar creation stores the press callback; it does not invoke it while rendering.
      ...onboardingBackOptions(reading ? 'Stop reading your routine' : completed ? 'Back to Your routines' : 'Back to import choices', back) }} />
    {reading ? <View style={styles.loading}>
      <StackLogoLoader size={72} label="Reading your routine" />
      <Text accessibilityLiveRegion="polite" style={styles.loadingText}>Reading your routine…</Text>
    </View> : <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[ui.content, { flexGrow: 1 }]}>
        <View style={ui.section}>
          <Text accessibilityRole="header" style={ui.title}>Paste your routine</Text>
          <Text style={ui.body}>Paste what you already train. Stack will sort it out.</Text>
        </View>
        <TextInput value={text} onChangeText={(value) => { setText(value); if (error) setError(null); }}
          accessibilityLabel="Your routine" accessibilityHint="Paste workouts and exercises from your notes or messages"
          multiline textAlignVertical="top" autoCapitalize="none" autoCorrect={false} spellCheck={false}
          inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_ACCESSORY_ID : undefined}
          maxLength={ROUTINE_IMPORT_LIMITS.maxTextLength} placeholder={EXAMPLE} placeholderTextColor={c.ashDim}
          style={styles.input} />
        {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={ui.error}>{error}</Text> : null}
      </ScrollView>
      <View style={ui.dock}>
        <Action title="Continue" primary onPress={() => { void read(); }} />
        <Action title="Back" onPress={back} />
      </View>
    </KeyboardAvoidingView>}
    {!reading && Platform.OS === 'ios' && <InputAccessoryView nativeID={KEYBOARD_ACCESSORY_ID}>
      <ExerciseNotesDone accessory onPress={() => Keyboard.dismiss()} />
    </InputAccessoryView>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  input: { ...ui.input, flexGrow: 1, minHeight: 260, fontSize: 17, lineHeight: 24, paddingTop: 16 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28, paddingHorizontal: 24, paddingBottom: 48 },
  loadingText: { fontFamily: f.uiMedium, fontSize: 17, color: c.ash, textAlign: 'center' },
});
