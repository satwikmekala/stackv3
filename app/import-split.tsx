import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, ChevronLeft, Layers } from 'lucide-react-native';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { parseSharedSplit } from '@/features/sharing/splitTransport';
import { createSplitImportAction } from '@/features/sharing/importAction';
import { importPortableSplitSync } from '@/store/workoutDatabase';
import { SplitImportError, type ImportedSplit } from '@/store/splitImport';
import { useWorkoutStore } from '@/store/workoutStore';
import { useCustomSplitDraftStore } from '@/store/customSplitDraft';

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
  const parsed = useMemo(() => parseSharedSplit(token), [token]);
  const profile = useWorkoutStore((state) => state.profile);
  const refreshCustomSplits = useWorkoutStore((state) => state.refreshCustomSplits);
  const discardDraft = useCustomSplitDraftStore((state) => state.discardDraft);
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState<ImportedSplit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [persist] = useState(() => createSplitImportAction(() => {
    if (!parsed.ok) throw new SplitImportError(parsed.error.message);
    return importPortableSplitSync(parsed.value);
  }));

  const done = () => router.replace(profile?.onboardingCompleted ? '/your-splits' : '/(onboarding)/welcome');
  const back = () => { if (router.canGoBack()) router.back(); else done(); };
  const add = async () => {
    if (!parsed.ok || saving || added) return;
    setSaving(true);
    setError(null);
    try {
      const result = await persist();
      // The transaction is committed. Refresh is deliberately separate: a
      // library refresh failure must never offer a second persistence attempt.
      setAdded(result);
      void refreshCustomSplits();
    } catch (failure) {
      setError(failure instanceof SplitImportError ? failure.message : "Couldn't add this split. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  const viewSplit = () => {
    if (!added) return;
    discardDraft();
    router.replace({ pathname: '/custom-split', params: { source: 'library', splitId: String(added.splitId) } });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" disabled={saving}
          onPress={back} style={styles.back}>
          <ChevronLeft color={redesignColors.bone} size={22} />
        </Pressable>
        <Text style={styles.eyebrow}>SHARED SPLIT</Text>
      </View>
      {!parsed.ok ? (
        <View style={styles.state}>
          <Layers size={36} color={redesignColors.ash} />
          <Text accessibilityRole="header" style={styles.title}>Can&apos;t open this Stack split.</Text>
          <Text style={styles.copy}>{parsed.error.message}</Text>
          <Action label="Back to Stack" onPress={back} />
        </View>
      ) : added ? (
        <View style={styles.state}>
          <View style={styles.successIcon}><Check size={32} color={redesignColors.accent} /></View>
          <Text accessibilityRole="header" style={styles.title}>Added to Stack</Text>
          <Text style={styles.successName}>{added.name}</Text>
          <Text style={styles.copy}>{profile?.onboardingCompleted
            ? 'Your own editable copy is in Your Splits. Your active program is unchanged.'
            : 'Your own editable copy is saved. Finish setting up Stack to find it in Your Splits.'}</Text>
          {profile?.onboardingCompleted ? <Action label="View split" onPress={viewSplit} /> : null}
          <Action label={profile?.onboardingCompleted ? 'Done' : 'Continue to Stack'}
            onPress={done} secondary={Boolean(profile?.onboardingCompleted)} />
        </View>
      ) : (
        <>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
          <View style={styles.footer}>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <Action label={saving ? 'Adding…' : 'Add to Stack'} onPress={() => { void add(); }} disabled={saving} busy={saving} />
            <Text style={styles.hint}>Saves to Your Splits. Your active program stays the same.</Text>
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
  state: { flex: 1, justifyContent: 'center', padding: 24, gap: 20 },
  successIcon: { alignSelf: 'flex-start', padding: 16, borderRadius: 40, backgroundColor: redesignColors.surface },
  successName: { color: redesignColors.bone, fontFamily: redesignFonts.uiBold, fontSize: 22 },
});
