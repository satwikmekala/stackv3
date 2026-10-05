import { workoutEntryLabel } from '@/utils/content';
import { useMuscleColors } from '@/store/muscleColors';
import { SplitPressable as Pressable } from '@/components/custom-split/SplitPressable';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, Text, View } from 'react-native';
import Animated, { LinearTransition, ReduceMotion, useReducedMotion } from 'react-native-reanimated';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MoreHorizontal, Pencil, Plus } from 'lucide-react-native';
import { Action, StackMark, ui } from '@/components/custom-split/ui';
import { SplitActivationPill } from '@/components/custom-split/SplitActivationPill';
import { showActions } from '@/components/custom-split/showActions';
import { SplitShareButton } from '@/components/SplitShareButton';
import { redesignColors as c } from '@/constants/theme';
import { motionDuration, motionEasing } from '@/constants/motion';
import { resolveDayColor } from '@/features/custom-split/colors';
import { useCustomSplitDraftStore, splitDraftKey } from '@/store/customSplitDraft';
import { useWorkoutStore } from '@/store/workoutStore';
import { getProgramFrequency } from '@/store/trainingPreferences';
import * as Haptics from '@/services/haptics';

const routineLayout = LinearTransition.duration(motionDuration.transition)
  .easing(motionEasing.decelerate).reduceMotion(ReduceMotion.System);

export default function YourSplitsScreen() {
  useMuscleColors(state => state.preferences);
  const router = useRouter();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const state = useWorkoutStore();
  const draftStore = useCustomSplitDraftStore();
  const [deleting, setDeleting] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = state.refreshCustomSplits;
  const programMode = state.profile?.programMode ?? 'none';
  const active = programMode === 'custom' ? state.profile?.activeSplitId ?? null : null;
  const reducedMotion = useReducedMotion();
  const [delayedActive, setDelayedActive] = useState(active);
  const orderedActive = reducedMotion ? active : delayedActive;
  useEffect(() => {
    if (reducedMotion || delayedActive === active) return;
    // Show the confirmed badge where the user tapped before moving that card.
    const timer = setTimeout(() => setDelayedActive(active), motionDuration.feedback);
    return () => clearTimeout(timer);
  }, [active, delayedActive, reducedMotion]);
  // Once edited, Stack's plan is saved like a routine but stays out of the library.
  const stackPlan = state.customSplits.find(split => split.isStackPlan) ?? null;
  const stackActive = programMode === 'stack' || (stackPlan !== null && active === stackPlan.id);
  const orderedStackActive = stackPlan !== null && orderedActive === stackPlan.id;
  const stackFirst = focus === 'stack' || (focus !== 'library' && (orderedActive === null || orderedStackActive));
  useFocusEffect(useCallback(() => {
    let mounted = true;
    void refresh().catch(() => { if (mounted) setError('Couldn’t load Your routines. Try again.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [refresh]));
  const selection = `${programMode}:${active}`;
  const previousActive = useRef(selection);
  useEffect(() => {
    if (previousActive.current === selection) return;
    previousActive.current = selection;
    void refresh();
  }, [selection, refresh]);
  const open = (id?: number) => {
    draftStore.closeDraft();
    router.push({ pathname: '/custom-split', params: { source: 'library', ...(id ? { splitId: String(id) } : {}) } });
  };
  const summaries = state.customSplits.filter(split => !split.isStackPlan).sort((a, b) => Number(b.id === orderedActive) - Number(a.id === orderedActive));
  const orphanDrafts = Object.values(draftStore.drafts).filter(draft => draft.editingSplitId !== null && !state.customSplits.some(split => split.id === draft.editingSplitId));
  const sharedDrafts = Object.values(draftStore.drafts).filter(draft => draft.source === 'shared' && draft.sharedContext);
  // An existing Stack's plan opens in the routine editor; the setup flow only creates one.
  const stackEditable = stackPlan !== null || programMode === 'stack';
  const stackDraft = draftStore.drafts[splitDraftKey(stackPlan?.id ?? null, 'stack')];
  const editStack = () => {
    if (!stackEditable) {
      router.push({ pathname: '/program-setup', params: { source: 'splits' } });
      return;
    }
    draftStore.closeDraft();
    router.push({ pathname: '/custom-split', params: { source: 'stack', ...(stackPlan ? { splitId: String(stackPlan.id) } : {}) } });
  };
  const activate = (splitId: number | null) => {
    const before = useWorkoutStore.getState().profile;
    state.setActiveSplit(splitId);
    // Guarded store actions can swallow write failures; confirm the new selection.
    const after = useWorkoutStore.getState().profile;
    const mode = splitId === null ? 'stack' : 'custom';
    if (after?.programMode === mode && after.activeSplitId === splitId &&
        (before?.programMode !== mode || before.activeSplitId !== splitId) && Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };
  const stack = <Animated.View key="stack-plan" layout={routineLayout} style={ui.card}>
    <View style={[ui.wrap, { justifyContent: 'space-between' }]}><Text style={ui.eyebrow}>BY STACK</Text>
      <SplitActivationPill active={stackActive} name="Stack’s plan" disabled={deleting !== null} onPress={() =>
        stackPlan ? activate(stackPlan.id)
          : router.push({ pathname: '/program-setup', params: { source: 'splits' } })} />
    </View>
    <Text style={ui.subtitle}>Stack’s plan</Text>
    <Text style={ui.body}>{stackPlan
      ? `${stackPlan.workoutCount} ${stackPlan.workoutCount === 1 ? 'workout' : 'workouts'} · ${stackPlan.exerciseCount} ${stackPlan.exerciseCount === 1 ? 'exercise' : 'exercises'}`
      : state.profile ? `${getProgramFrequency(state.profile)} ${getProgramFrequency(state.profile) === 1 ? 'workout' : 'workouts'} a week` : 'Choose your workout frequency.'}</Text>
    {stackEditable && stackDraft ? <Text style={ui.label}>Unfinished changes · not applied yet</Text> : null}
    <Action title={stackEditable && stackDraft ? 'Continue editing' : 'Edit Stack’s plan'} secondary
      disabled={stackEditable && (!draftStore.hydrated || !!draftStore.storageError || deleting !== null)} onPress={editStack} />
  </Animated.View>;
  const remove = (id: number, name: string) => Alert.alert(`Delete “${name}”?`, 'Your completed workout history will remain. Any unfinished edit can be recovered as a new routine.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Delete routine', style: 'destructive', onPress: () => {
      setDeleting(id); void state.deleteSplit(id).catch(() => setError('Couldn’t delete this routine. Try again.')).finally(() => setDeleting(null));
    } },
  ]);
  const library = summaries.length ? <Animated.View key="library" layout={routineLayout} style={{ gap: 24 }}>
    <Text style={ui.eyebrow}>YOUR LIBRARY · {summaries.length}</Text>
    {summaries.map(split => {
      const isActive = programMode === 'custom' && split.id === active;
      const draft = draftStore.drafts[splitDraftKey(split.id)];
      const detail = state.currentCustomSplit?.id === split.id ? state.currentCustomSplit : null;
      return <Animated.View key={split.id} layout={routineLayout} style={[ui.card, { overflow: 'hidden' }]}>
        <View style={[ui.wrap, { justifyContent: 'space-between' }]}>
          <View style={[ui.row, { gap: 4, flexShrink: 1, maxWidth: '100%' }]}>
            <Text style={[ui.eyebrow, { flexShrink: 1 }]}>{isActive ? 'CURRENT ROUTINE' : 'SAVED ROUTINE'}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`More actions for ${split.name}`} disabled={deleting !== null}
              style={({ pressed }) => [ui.iconButton, pressed && ui.pressed, deleting !== null && ui.disabled]}
              onPress={() => showActions(split.name, [{ title: 'Delete routine', destructive: true, onPress: () => remove(split.id, split.name) }])}>
              {deleting === split.id ? <ActivityIndicator color={c.ash} /> : <MoreHorizontal color={c.ash} size={22} />}
            </Pressable>
          </View>
          <SplitActivationPill active={isActive} name={split.name} disabled={deleting !== null} onPress={() => activate(split.id)} />
        </View>
        <View style={{ gap: 6 }}><Text style={ui.subtitle}>{split.name}</Text>
          <Text style={ui.body}>{split.workoutCount} {split.workoutCount === 1 ? 'workout' : 'workouts'} · {split.exerciseCount} {split.exerciseCount === 1 ? 'exercise' : 'exercises'}</Text></View>
        {detail?.workouts.length ? <View style={{ gap: 12 }}>{detail.workouts.map((day, index) => <View key={day.id} style={ui.row}>
          <View style={[ui.dot, { backgroundColor: resolveDayColor(day) }]} /><Text style={[ui.label, { flex: 1 }]}>{workoutEntryLabel(index)} · {day.name || 'Needs exercises'}</Text>
        </View>)}</View> : null}
        {draft ? <Text style={ui.label}>Unfinished changes · not applied yet</Text> : null}
        {split.hasHevyDetails ? <Action title="Original Hevy details" secondary onPress={() => router.push({ pathname: '/hevy-routine-details', params: { id: String(split.id) } })} /> : null}
        <View style={[ui.wrap, { justifyContent: 'space-between' }]}>
          <SplitShareButton splitId={split.id} name={split.name} compact />
          <Action title={draft ? 'Continue editing' : 'Edit routine'} compact icon={<Pencil color={c.ash} size={16} />}
            disabled={!draftStore.hydrated || !!draftStore.storageError || deleting !== null} label={`Edit ${split.name}`} onPress={() => open(split.id)} />
        </View>
      </Animated.View>;
    })}
  </Animated.View> : null;
  const pasteRoutine = () => router.push('/paste-routine');
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={ui.screen}>
    <Stack.Screen options={{ headerShown: true, title: 'Your routines',
      headerStyle: { backgroundColor: c.ink }, headerTintColor: c.bone,
      headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal', headerBackTitle: 'Back',
      unstable_headerRightItems: Platform.OS === 'ios' ? () => [{ type: 'menu',
        label: 'Routine actions', accessibilityLabel: 'Routine actions',
        icon: { type: 'sfSymbol', name: 'ellipsis' },
        menu: { items: [{ type: 'action', label: 'Paste my routine', onPress: pasteRoutine }] },
      }] : undefined,
      headerRight: Platform.OS === 'ios' ? undefined : () => <Pressable accessibilityRole="button"
        accessibilityLabel="Routine actions" style={ui.iconButton}
        onPress={() => showActions('Routine actions', [{ title: 'Paste my routine', onPress: pasteRoutine }])}>
        <MoreHorizontal color={c.bone} size={22} />
      </Pressable> }} />
    <ScrollView contentContainerStyle={ui.content}>
      <View style={ui.section}><Text maxFontSizeMultiplier={1.5} style={ui.title}>Make it your own.</Text><Text style={ui.body}>Use Stack’s workouts, choose a saved routine, or train as you go.</Text></View>
      {loading || !draftStore.hydrated ? <ActivityIndicator color={c.ash} accessibilityLabel="Loading Your routines" /> : null}
      {error ? <View style={ui.card}><Text accessibilityRole="alert" style={ui.error}>{error}</Text><Action title="Try again" secondary onPress={() => { setError(null); setLoading(true); void refresh().catch(() => setError('Couldn’t load Your routines. Try again.')).finally(() => setLoading(false)); }} /></View> : null}
      {draftStore.storageError ? <View style={ui.card}><Text style={ui.error}>{draftStore.storageError}</Text><Action title="Retry drafts" onPress={() => { if (draftStore.hydrated) useCustomSplitDraftStore.setState({}); else void useCustomSplitDraftStore.persist.rehydrate(); }} /></View> : null}
      {draftStore.drafts.new ? <View style={ui.card}>
        <Text style={ui.eyebrow}>PICK UP WHERE YOU LEFT OFF</Text><Text style={ui.subtitle}>{draftStore.drafts.new.draft.name}</Text>
        <Text style={ui.body}>Your draft is saved on this device.</Text><Action title="Continue building" secondary onPress={() => open()} />
      </View> : null}
      {sharedDrafts.map(snapshot => <View key={snapshot.sharedContext!.shareId} style={ui.card}>
        <Text style={ui.eyebrow}>PICK UP WHERE YOU LEFT OFF</Text><Text style={ui.subtitle}>{snapshot.draft.name}</Text>
        <Text style={ui.body}>Your draft is saved on this device.</Text>
        <Action title="Continue building" secondary disabled={!draftStore.hydrated || !!draftStore.storageError} label={`Continue ${snapshot.draft.name}`}
          onPress={() => { draftStore.closeDraft(); router.push({ pathname: '/custom-split', params: { source: 'shared', shareId: snapshot.sharedContext!.shareId } }); }} />
      </View>)}
      {stackFirst ? [stack, library] : [library, stack]}
      <View style={ui.section}>
        {programMode === 'none' ? <Text style={ui.eyebrow}>CURRENT · NO PLAN</Text> : null}
        <Text style={ui.body}>Start workouts as you go. Your saved routines stay in your library.</Text>
        <Action title="Train as you go" secondary disabled={programMode === 'none' || deleting !== null}
          onPress={() => state.chooseNoProgram()} />
      </View>
      {orphanDrafts.map(draft => <View key={draft.editingSplitId} style={ui.card}><Text style={ui.subtitle}>{draft.draft.name}</Text><Text style={ui.body}>The original routine is unavailable. Your unfinished draft is safe.</Text><Action title="Recover draft" secondary onPress={() => open(draft.editingSplitId!)} /></View>)}
      {!loading && !summaries.length && !draftStore.drafts.new && !sharedDrafts.length ? <View style={[ui.section, { paddingVertical: 12 }]}><StackMark /><Text style={ui.subtitle}>No routines yet.</Text><Text style={ui.body}>Save your lifts in workout order.</Text></View> : null}
    </ScrollView>
    <View style={ui.dock}><Action title={draftStore.drafts.new ? 'Continue building' : 'Create routine'} primary icon={<Plus color={c.ink} size={20} />} disabled={!draftStore.hydrated || !!draftStore.storageError} onPress={() => open()} /></View>
  </SafeAreaView>;
}
