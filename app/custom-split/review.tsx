import { displayExerciseName } from '@/constants/exerciseNames';
import { workoutEntryLabel } from '@/utils/content';
import { useMuscleColors } from '@/store/muscleColors';
import { SplitPressable as Pressable } from '@/components/custom-split/SplitPressable';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { Stack, useNavigation, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MoreHorizontal, Pencil } from 'lucide-react-native';
import { showActions } from '@/components/custom-split/showActions';
import { Action, ui } from '@/components/custom-split/ui';
import { resolveDayColor } from '@/features/custom-split/colors';
import { redesignColors as c } from '@/constants/theme';
import { getWorkoutDisplayName, splitRevision, useCustomSplitDraftStore } from '@/store/customSplitDraft';
import { getCustomSplitDetailAsync } from '@/store/workoutDatabase';
import { useWorkoutStore } from '@/store/workoutStore';

export default function ReviewSplit() {
  useMuscleColors(state => state.preferences);
  const router = useRouter();
  const navigation = useNavigation();
  const state = useCustomSplitDraftStore();
  const workouts = useWorkoutStore();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const locked = useRef(false);
  const busy = saving || deleting;
  useEffect(() => {
    return navigation.addListener('beforeRemove', event => {
      if (locked.current) event.preventDefault();
    });
  }, [navigation]);
  const draft = state.draft;
  const editing = state.editingSplitId !== null;
  // Stack's plan is always updated in place: never deleted, renamed or saved as a new routine.
  const stackPlan = state.source === 'stack';
  const discard = useCallback(() => {
    if (!draft || locked.current) return;
    Alert.alert('Discard this draft?', 'This removes your unfinished changes. Your saved routine and workout history stay intact.', [
      { text: 'Keep building', style: 'cancel' }, { text: 'Discard draft', style: 'destructive', onPress: () => {
        if (locked.current) return;
        state.discardDraft(); router.dismissTo('/your-splits');
      } },
    ]);
  }, [draft, state, router]);
  const deleteSplit = useCallback(() => {
    const splitId = state.editingSplitId;
    if (!draft || splitId === null || locked.current) return;
    Alert.alert(`Delete “${draft.name}”?`, 'This deletes the saved routine and its unfinished changes. Your completed workout history stays intact.', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Delete routine', style: 'destructive', onPress: () => {
        if (locked.current) return;
        locked.current = true; setDeleting(true); setError(null);
        void (async () => {
          try {
            await workouts.deleteSplit(splitId);
            // The store's guarded action can resolve after a failed write. Confirm deletion before removing the draft.
            if (await getCustomSplitDetailAsync(splitId)) throw new Error('Couldn’t delete this routine. Your draft is still here. Try again.');
            locked.current = false;
            state.discardDraft(); router.dismissTo('/your-splits');
          } catch { setError('Couldn’t delete this routine. Your draft is still here. Try again.'); }
          finally { locked.current = false; setDeleting(false); }
        })();
      } },
    ]);
  }, [draft, state, workouts, router]);
  const headerOptions = useMemo(() => ({
    headerShown: true, title: 'Review routine', gestureEnabled: !busy,
    headerBackVisible: Platform.OS !== 'ios' && !busy,
    unstable_headerLeftItems: Platform.OS === 'ios' ? () => [{ type: 'button' as const,
      label: 'Back', accessibilityLabel: 'Back to edit routine', disabled: busy,
      icon: { type: 'sfSymbol' as const, name: 'chevron.left' as const }, onPress: () => { if (!locked.current) router.back(); } }] : undefined,
    unstable_headerRightItems: Platform.OS === 'ios' ? () => [{ type: 'menu' as const,
      label: 'Routine actions', accessibilityLabel: 'Routine actions', disabled: busy || !draft,
      icon: { type: 'sfSymbol' as const, name: 'ellipsis' as const },
      menu: { items: [
        { type: 'action' as const, label: 'Discard draft', destructive: true, onPress: discard },
        ...(editing && !stackPlan ? [{ type: 'action' as const, label: 'Delete routine', destructive: true,
          icon: { type: 'sfSymbol' as const, name: 'trash' as const }, onPress: deleteSplit }] : []),
      ] },
    }] : undefined,
    headerRight: Platform.OS === 'ios' ? undefined : () => <Pressable accessibilityRole="button"
      accessibilityLabel="Routine actions" disabled={busy || !draft} style={ui.iconButton}
      onPress={() => showActions('Routine actions', [
        { title: 'Discard draft', destructive: true, onPress: discard },
        ...(editing && !stackPlan ? [{ title: 'Delete routine', destructive: true, onPress: deleteSplit }] : []),
      ])}><MoreHorizontal color={c.bone} size={22} /></Pressable>,
  }), [busy, draft, editing, stackPlan, discard, deleteSplit, router]);
  const invalid = !draft?.name.trim() ? 'Give your routine a name.' : draft.workouts.some(day => !day.exercises.length) ? 'Add exercises to every workout, or remove the workouts you don’t need.' : null;
  const save = async (activate: boolean) => {
    if (!draft || invalid || locked.current) return;
    locked.current = true; setSaving(true); setError(null);
    try {
      if (state.editingSplitId !== null) {
        const saved = await getCustomSplitDetailAsync(state.editingSplitId);
        if (!saved || splitRevision(saved) !== state.sourceRevision) {
          setConflict(true); throw new Error('The saved routine changed while you were editing. Recover this draft as a new routine to keep your work.');
        }
      }
      const inputs = draft.workouts.map((day, index) => ({
        name: getWorkoutDisplayName(day) || workoutEntryLabel(index), color: day.color ?? null,
        exerciseIds: day.exercises.map(exercise => exercise.id), persistedWorkoutId: day.persistedWorkoutId ?? null,
      }));
      const success = state.editingSplitId !== null
        ? await workouts.updateCustomSplitDraft(state.editingSplitId, draft.name.trim(), inputs)
        : stackPlan
          // First edit of Stack's plan: it stays the active plan if it already was.
          ? (await workouts.saveCustomSplitDraft(draft.name.trim(), inputs, { stackPlan: true, activate: workouts.profile?.programMode === 'stack' })) !== undefined
          : (await workouts.saveCustomSplitDraft(draft.name.trim(), inputs, { activate, completeOnboarding: state.source === 'onboarding' })) !== undefined;
      if (!success) throw new Error('Couldn’t save your routine. Your draft is still here. Try again.');
      locked.current = false;
      state.discardDraft();
      if (state.source === 'onboarding') router.replace('/your-splits');
      else router.dismissTo('/your-splits');
    } catch { setError('Couldn’t save your routine. Your draft is still here. Try again.'); }
    finally { locked.current = false; setSaving(false); }
  };
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={ui.screen}>
    <Stack.Screen options={headerOptions} />
    {draft ? <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.content}>
        <View style={ui.section}>
          <Text accessibilityRole="header" style={ui.title}>{editing || stackPlan ? 'Ready to update?' : 'Ready to save?'}</Text>
          <Text style={ui.body}>{stackPlan ? 'Check the workout order, then save Stack’s plan.' : 'Check the workout order, then save your routine.'}</Text>
        </View>
        <View style={{ gap: 8 }}>
          {stackPlan ? null : <>
            <Text style={ui.label}>Routine name</Text>
            <TextInput accessibilityLabel="Routine name" maxLength={48} value={draft.name} onChangeText={state.setSplitName} editable={!busy}
              style={ui.input} placeholder="Name your routine" placeholderTextColor={c.ash} returnKeyType="done" />
          </>}
          <Text style={ui.label}>{draft.workouts.length} {draft.workouts.length === 1 ? 'workout' : 'workouts'} · {draft.workouts.reduce((total, day) => total + day.exercises.length, 0)} {draft.workouts.reduce((total, day) => total + day.exercises.length, 0) === 1 ? 'exercise' : 'exercises'}</Text>
        </View>
        {draft.workouts.map((day, index) => <View key={day.id} style={ui.card}>
          <View style={ui.row}>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={ui.row}><View style={[ui.dot, { backgroundColor: resolveDayColor(day) }]} /><Text style={ui.eyebrow}>{workoutEntryLabel(index).toUpperCase()}</Text></View>
              <Text style={ui.subtitle}>{getWorkoutDisplayName(day) || workoutEntryLabel(index)}</Text>
            </View>
            {draft.workouts.length > 1 ? <Pressable accessibilityRole="button" accessibilityLabel={`Reorder or remove ${workoutEntryLabel(index)}`} disabled={busy}
              style={({ pressed }) => [ui.iconButton, pressed && ui.pressed, busy && ui.disabled]}
              onPress={() => showActions(workoutEntryLabel(index), [
                ...(index > 0 ? [{ title: 'Move up', onPress: () => state.reorderWorkout(index, index - 1) }] : []),
                ...(index < draft.workouts.length - 1 ? [{ title: 'Move down', onPress: () => state.reorderWorkout(index, index + 1) }] : []),
                ...(draft.workouts.length > 1 ? [{ title: 'Remove workout', destructive: true, onPress: () => {
                  if (!day.exercises.length) state.deleteWorkout(day.id);
                  else Alert.alert(`Remove ${workoutEntryLabel(index)}?`, 'This removes the workout and its exercises from your draft.', [
                    { text: 'Cancel', style: 'cancel' }, { text: 'Remove workout', style: 'destructive', onPress: () => state.deleteWorkout(day.id) },
                  ]);
                } }] : []),
              ])}><MoreHorizontal color={c.ash} size={22} /></Pressable> : null}
          </View>
          {day.exercises.length ? <View style={{ gap: 12 }}>{day.exercises.map((exercise, position) => <View key={exercise.id} style={[ui.row, { alignItems: 'flex-start' }]}>
            <Text style={[ui.number, { paddingTop: 3 }]}>{String(position + 1).padStart(2, '0')}</Text>
            <Text style={[ui.body, { flex: 1, color: c.bone }]}>{displayExerciseName(exercise.name)}</Text>
          </View>)}</View> : <Text style={ui.body}>This workout needs exercises before you can save.</Text>}
          <Action title={day.exercises.length ? 'Edit workout' : 'Add exercises'} secondary icon={<Pencil color={c.bone} size={16} />} disabled={busy} label={`Edit ${workoutEntryLabel(index)}`}
            onPress={() => { state.selectWorkout(day.id); router.back(); }} />
        </View>)}
        <Text style={ui.body}>Your draft stays on this device until you save or discard it.</Text>
      </ScrollView>
      <View style={ui.dock}>
        {error || invalid || state.storageError ? <Text accessibilityLiveRegion="polite" style={ui.error}>{error ?? invalid ?? state.storageError}</Text> : null}
        {conflict ? <Action title="Recover draft" disabled={busy} onPress={() => {
          if (locked.current) return;
          if (state.drafts.new) { setError('Finish or discard your other new routine draft in Your routines first. Both drafts are safe.'); return; }
          state.recoverAsNew(); setConflict(false); setError(null);
        }} /> : null}
        <Action title={deleting ? 'Deleting…' : saving ? 'Saving…' : editing || stackPlan ? 'Save changes' : 'Save and use'} primary disabled={busy || !!invalid || conflict} onPress={() => { void save(true); }} />
        {!editing && !stackPlan && state.source !== 'onboarding' ? <Action title="Save for later" disabled={busy || !!invalid || conflict} onPress={() => { void save(false); }} /> : null}
      </View>
    </KeyboardAvoidingView> : <View style={ui.content}><Text style={ui.body}>Your routine has been saved or closed.</Text><Action title="Your routines" onPress={() => router.replace('/your-splits')} /></View>}
  </SafeAreaView>;
}
