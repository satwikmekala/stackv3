import { routineLinkErrorCopy, routineImportFailureCopy } from '@/features/sharing/routineCopy';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, ChevronLeft, Layers } from 'lucide-react-native';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { parseSharedSplit } from '@/features/sharing/splitTransport';
import { createSplitImportAction } from '@/features/sharing/importAction';
import { importPortableSplitSync } from '@/store/workoutDatabase';
import { SplitImportError, type ImportedSplit } from '@/store/splitImport';
import { useWorkoutStore } from '@/store/workoutStore';
import { useCustomSplitDraftStore } from '@/store/customSplitDraft';
import { FIRST_RUN_ROUTE } from '@/features/onboarding/config';

import { loadSharedRoutineHandoff, prepareSharedRoutineImport, rememberSharedRoutine, clearSharedRoutineHandoff, useSharedRoutineHandoff } from '@/store/sharedRoutineHandoff';

export default function ImportSplitScreen() {
  const { d } = useLocalSearchParams<{ d?: string | string[] }>();
  const [opening, setOpening] = useState(0);
  useEffect(() => {
    // Expo Router can reuse this screen when the *same* URL arrives again.
    // Each deliberate link opening gets a new preview and its own tap lock.
    const subscription = Linking.addEventListener('url', () => setOpening((value) => value + 1));
    return () => subscription.remove();
  }, []);
  return <SplitPreview key={`${opening}:${JSON.stringify(d) ?? 'missing'}`} token={d} />;
}

function SplitPreview({ token }: { token: unknown }) {
  const router = useRouter();
  const { fontScale } = useWindowDimensions();
  const parsed = useMemo(() => parseSharedSplit(token), [token]);
  const profile = useWorkoutStore((state) => state.profile);
  const refreshCustomSplits = useWorkoutStore((state) => state.refreshCustomSplits);
  const closeDraft = useCustomSplitDraftStore((state) => state.closeDraft);
  const handoff = useSharedRoutineHandoff();
  const focused = useRef(true), leaving = useRef(false), locked = useRef(false);
  useFocusEffect(useCallback(() => { focused.current = true; return () => { focused.current = false; }; }, []));
  useEffect(() => () => { focused.current = false; }, []);
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState<ImportedSplit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [persist] = useState(() => createSplitImportAction(async () => {
    if (!parsed.ok) throw new SplitImportError(routineLinkErrorCopy(parsed.error));
    const attemptId = typeof token === 'string'
      ? await prepareSharedRoutineImport(token) : undefined;
    return importPortableSplitSync(parsed.value, attemptId);
  }));

  const saved = added ?? (typeof token === 'string' && handoff.pending?.token === token ? handoff.pending.saved : null);
  useEffect(() => {
    if (!parsed.ok || typeof token !== 'string') return;
    void (profile?.onboardingCompleted ? loadSharedRoutineHandoff() : rememberSharedRoutine(token)).catch(() => {
      if (focused.current) setError('Couldn’t keep your shared routine. Try again.');
    });
  }, [parsed.ok, profile?.onboardingCompleted, token]);
  const leave = async (backwards = false, useRoutine = false) => {
    if (locked.current || leaving.current || !focused.current) return;
    locked.current = true; setSaving(true); setError(null);
    try {
      if (parsed.ok && typeof token === 'string') {
        if (!useWorkoutStore.getState().profile?.onboardingCompleted) {
          await rememberSharedRoutine(token, saved);
          if (focused.current) { leaving.current = true; router.replace(FIRST_RUN_ROUTE); }
          return;
        }
        if (useRoutine && saved) useWorkoutStore.getState().activateSharedRoutine(saved.splitId);
        await clearSharedRoutineHandoff(token);
      }
      if (!focused.current) return;
      leaving.current = true;
      if (useRoutine) router.replace('/(tabs)');
      else if (backwards && router.canGoBack()) router.back();
      else router.replace(useWorkoutStore.getState().profile?.onboardingCompleted ? '/your-splits' : FIRST_RUN_ROUTE);
    } catch { if (focused.current) setError('Couldn’t save your choice. Try again.'); }
    finally { locked.current = false; if (focused.current) setSaving(false); }
  };
  const done = () => { void leave(); };
  const back = () => { void leave(true); };
  const add = async () => {
    if (!parsed.ok || locked.current || leaving.current || saved || !focused.current) return;
    locked.current = true;
    setSaving(true);
    setError(null);
    try {
      const result = await persist();
      // The transaction is committed. Refresh is deliberately separate: a
      // library refresh failure must never offer a second persistence attempt.
      if (focused.current) setAdded(result);
      void refreshCustomSplits();
      if (typeof token === 'string' && focused.current) await rememberSharedRoutine(token, result);
    } catch (failure) {
      if (focused.current) setError(routineImportFailureCopy(failure));
    } finally {
      locked.current = false;
      if (focused.current) setSaving(false);
    }
  };
  const viewSplit = async () => {
    if (!saved || locked.current || !focused.current) return;
    locked.current = true; setSaving(true);
    try {
      if (typeof token === 'string') await clearSharedRoutineHandoff(token);
      if (!focused.current) return;
      leaving.current = true; closeDraft();
      router.replace({ pathname: '/custom-split', params: { source: 'library', splitId: String(saved.splitId) } });
    } catch { if (focused.current) setError('Couldn’t open your routine. Try again.'); }
    finally { locked.current = false; if (focused.current) setSaving(false); }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View key={`header:${fontScale}`} style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" disabled={saving}
          onPress={back} style={styles.back}>
          <ChevronLeft color={redesignColors.bone} size={22} />
        </Pressable>
        <Text style={styles.eyebrow}>SHARED ROUTINE</Text>
      </View>
      {!parsed.ok ? (
        <View key={`invalid:${fontScale}`} style={styles.state}>
          <Layers size={36} color={redesignColors.ash} />
          <Text accessibilityRole="header" style={styles.title}>Couldn’t open this routine.</Text>
          <Text style={styles.copy}>{routineLinkErrorCopy(parsed.error)}</Text>
          <Action label="Back to Stack" onPress={back} />
        </View>
      ) : saved ? (
        <ScrollView key={`saved:${fontScale}`} contentContainerStyle={styles.state}>
          <View style={styles.successIcon}><Check size={32} color={redesignColors.accent} /></View>
          <Text accessibilityRole="header" style={styles.title}>Added to Your routines</Text>
          <Text style={styles.successName}>{saved.name}</Text>
          <Text style={styles.copy}>{profile?.onboardingCompleted
            ? 'Your editable copy is in Your routines.'
            : 'Routine saved. Finish setup to open Your routines.'}</Text>
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          {profile?.onboardingCompleted && <Action label="Use this routine" onPress={() => { void leave(false, true); }} disabled={saving} />}
          {profile?.onboardingCompleted ? <Action label="View routine" onPress={() => { void viewSplit(); }} disabled={saving} secondary /> : null}
          <Action label={profile?.onboardingCompleted ? 'Save for later' : 'Continue to Stack'}
            onPress={done} disabled={saving} secondary={Boolean(profile?.onboardingCompleted)} />
        </ScrollView>
      ) : (
        <>
          <ScrollView key={`preview:${fontScale}`} style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text accessibilityRole="header" style={styles.title}>{parsed.value.name}</Text>
            <Text style={styles.meta}>{parsed.value.workouts.length} {parsed.value.workouts.length === 1 ? 'workout' : 'workouts'} · {parsed.value.workouts.reduce((total, workout) => total + workout.exercises.length, 0)} exercises</Text>
            <Text style={styles.copy}>Add your own copy, then edit it to suit you. You&apos;ll use your own weights, history and settings.</Text>
            {parsed.value.workouts.map((workout, index) => (
              <View key={index} style={styles.card}>
                <View style={styles.workoutHeading}>
                  <Text style={styles.number}>{String(index + 1).padStart(2, '0')}</Text>
                  <Text accessibilityRole="header" style={styles.workoutName}>{workout.name || `Workout ${String.fromCharCode(65 + index)}`}</Text>
                </View>
                {workout.exercises.length === 0 ? <Text style={styles.exerciseContext}>No exercises yet</Text> : null}
                {workout.exercises.map((exercise, exerciseIndex) => (
                  <View key={exerciseIndex} style={styles.exercise}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    {exercise.kind === 'custom' ? <Text style={styles.exerciseContext}>
                      {['Custom', exercise.primaryMuscle, exercise.equipment,
                        exercise.loadType === 'external_weight' ? 'Weight' : null,
                        exercise.metric === 'duration' ? 'Duration' : 'Reps'].filter(Boolean).join(' · ')}
                    </Text> : null}
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
          <View key={`footer:${fontScale}`} style={styles.footer}>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <Action label={saving ? 'Adding…' : 'Add to Your routines'} onPress={() => { void add(); }} disabled={saving} busy={saving} />
            <Text style={styles.hint}>Saves a copy to Your routines.</Text>
            <Action label="Cancel" onPress={back} disabled={saving} secondary />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function Action({ label, onPress, disabled = false, busy = false, secondary = false }: {
  label: string; onPress: () => void; disabled?: boolean; busy?: boolean; secondary?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled, busy }} disabled={disabled}
    onPress={onPress} style={[styles.action, secondary && styles.secondary, disabled && styles.dimmed]}>
    {busy ? <ActivityIndicator color={redesignColors.ink} /> : null}
    <Text style={[styles.actionText, secondary && styles.secondaryText]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: redesignColors.ink },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: redesignColors.surface },
  eyebrow: { color: redesignColors.ash, fontFamily: redesignFonts.monoBold, fontSize: 12, letterSpacing: 2 },
  scroll: { flex: 1 },
  content: { padding: 24, paddingTop: 8, gap: 16 },
  title: { color: redesignColors.bone, fontFamily: redesignFonts.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.5 },
  meta: { color: redesignColors.ash, fontFamily: redesignFonts.mono, fontSize: 13 },
  copy: { color: redesignColors.ash, fontFamily: redesignFonts.ui, fontSize: 16, lineHeight: 23 },
  card: { padding: 20, borderRadius: 20, borderWidth: 1, borderColor: redesignColors.border, backgroundColor: redesignColors.surface },
  workoutHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  number: { color: redesignColors.accent, fontFamily: redesignFonts.monoBold, fontSize: 13 },
  workoutName: { flex: 1, color: redesignColors.bone, fontFamily: redesignFonts.uiBold, fontSize: 21 },
  exercise: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: redesignColors.border, gap: 4 },
  exerciseName: { color: redesignColors.bone, fontFamily: redesignFonts.uiMedium, fontSize: 17 },
  exerciseContext: { color: redesignColors.ash, fontFamily: redesignFonts.ui, fontSize: 13, lineHeight: 19 },
  footer: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8, gap: 10, borderTopWidth: 1, borderTopColor: redesignColors.border },
  action: { minHeight: 52, padding: 14, borderRadius: 16, backgroundColor: redesignColors.accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  actionText: { color: redesignColors.ink, fontFamily: redesignFonts.uiBold, fontSize: 17 },
  secondary: { backgroundColor: redesignColors.surface },
  secondaryText: { color: redesignColors.bone },
  dimmed: { opacity: 0.6 },
  hint: { color: redesignColors.ash, fontFamily: redesignFonts.ui, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  error: { color: redesignColors.bone, fontFamily: redesignFonts.uiMedium, fontSize: 15, lineHeight: 21 },
  state: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 20 },
  successIcon: { alignSelf: 'flex-start', padding: 16, borderRadius: 40, backgroundColor: redesignColors.surface },
  successName: { color: redesignColors.bone, fontFamily: redesignFonts.uiBold, fontSize: 22 },
});
