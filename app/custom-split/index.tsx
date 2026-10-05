import { workoutEntryLabel } from '@/utils/content';
import { SplitPressable as Pressable } from '@/components/custom-split/SplitPressable';
import { showActions } from '@/components/custom-split/showActions';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedRef, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { SelectedExerciseList } from '@/components/custom-split/SelectedExerciseList';
import { PendingImportList } from '@/components/custom-split/PendingImportList';
import { WorkoutTabs } from '@/components/custom-split/WorkoutTabs';
import { Action, StackMark, ui } from '@/components/custom-split/ui';
import { ChevronLeft, MoreHorizontal, Plus, SlidersHorizontal } from 'lucide-react-native';
import { useMuscleColors } from '@/store/muscleColors';
import { redesignColors as c, redesignFonts as f } from '@/constants/theme';
import { countPendingImports, getWorkoutDisplayName, splitRevision, useCustomSplitDraftStore, type CustomSplitSource, type DraftExercise } from '@/store/customSplitDraft';
import { getCustomSplitDetailAsync, getNextArchetypeVariant, getNextCustomSplitNameAsync, readArchetypeTemplateCatalogSync, readArchetypeVariantsSync } from '@/store/workoutDatabase';
import { useWorkoutStore } from '@/store/workoutStore';
import { getProgramFrequency } from '@/store/trainingPreferences';
import { buildProgramLineup } from '@/features/program/lineup';

export type { CustomSplitSource };
export default function CustomSplitBuilderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ splitId?: string; source?: CustomSplitSource }>();
  const state = useCustomSplitDraftStore();
  useMuscleColors(state => state.preferences);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [retry, setRetry] = useState(0);
  const [reordering, setReordering] = useState(false);
  const [undo, setUndo] = useState<{ dayId: string; exercise: DraftExercise; index: number } | null>(null);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollArea = useRef<View>(null);
  const scrollOffset = useSharedValue(0);
  const maxScrollOffset = useSharedValue(0);
  const viewportHeight = useRef(0);
  const onScroll = useAnimatedScrollHandler(event => { scrollOffset.value = event.contentOffset.y; });
  const measureViewport = useCallback(() => new Promise<{ top: number; bottom: number }>(resolve => {
    if (!scrollArea.current) return resolve({ top: 0, bottom: 0 });
    scrollArea.current.measureInWindow((_x, y, _w, height) => resolve({ top: y, bottom: y + height }));
  }), []);

  useEffect(() => {
    if (!state.hydrated) return;
    let cancelled = false;
    const load = async () => {
      const store = useCustomSplitDraftStore.getState();
      const target = params.splitId === undefined ? null : Number(params.splitId);
      const stackPlan = params.source === 'stack';
      if (target !== null && (!Number.isSafeInteger(target) || target <= 0)) throw new Error('This routine link is invalid.');
      if (store.draft && store.editingSplitId === target && (target !== null || (store.source === 'stack') === stackPlan)) {
        if (target !== null) {
          const saved = await getCustomSplitDetailAsync(target);
          if (!cancelled) setConflict(!saved || splitRevision(saved) !== store.sourceRevision);
        }
        return;
      }
      store.closeDraft();
      const saved = target === null ? null : await getCustomSplitDetailAsync(target);
      if (cancelled) return;
      if (store.resumeDraft(target, stackPlan ? 'stack' : undefined)) {
        const resumed = useCustomSplitDraftStore.getState();
        setConflict(target !== null && (!saved || splitRevision(saved) !== resumed.sourceRevision));
      } else if (saved) store.hydrateDraftForEdit(saved);
      else if (target !== null) throw new Error('This routine is no longer saved on this device.');
      else if (stackPlan) {
        // Stack's plan has never been edited: start from the workouts it currently generates.
        const profile = useWorkoutStore.getState().profile;
        if (!profile) throw new Error('A profile is required to edit Stack’s plan.');
        store.initializeStackPlanDraft(buildProgramLineup(getProgramFrequency(profile), profile.threeDayStructure, {
          variants: readArchetypeVariantsSync, nextVariant: getNextArchetypeVariant, exercises: readArchetypeTemplateCatalogSync,
        }));
      } else {
        const name = await getNextCustomSplitNameAsync();
        if (!cancelled) store.initializeDraft(name, 1, params.source === 'onboarding' ? 'onboarding' : 'library');
      }
    };
    void load().catch(e => { if (!cancelled) setError('Couldn’t open this routine. Try again.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.splitId, params.source, state.hydrated, retry]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [state.activeWorkoutId, scrollRef]);

  useEffect(() => () => useCustomSplitDraftStore.getState().closeDraft(), []);
  const headerOptions = useMemo(() => {
    const disabled = loading || !state.draft || conflict || !!error;
    const openReview = () => router.push('/custom-split/review');
    const review = <Action title="Review routine" compact pill disabled={disabled} onPress={openReview} />;
    return { headerShown: true, title: state.source === 'stack' ? 'Edit Stack’s plan' : state.editingSplitId !== null ? 'Edit routine' : 'New routine',
      headerBackButtonDisplayMode: 'minimal' as const,
      headerLeft: Platform.OS === 'ios' ? undefined : () => <Action title="Back" compact
        icon={<ChevronLeft color={c.bone} size={20} />} onPress={() => router.back()} />,
      unstable_headerLeftItems: Platform.OS === 'ios' ? () => [{ type: 'button' as const,
        label: 'Back', accessibilityLabel: 'Back to Your routines',
        icon: { type: 'sfSymbol' as const, name: 'chevron.left' as const }, onPress: () => router.back() }] : undefined,
      headerRight: () => review,
      // UIKit supplies the single pill background and its native press/accessibility behavior.
      unstable_headerRightItems: Platform.OS === 'ios' ? () => [{ type: 'button' as const,
        label: 'Review routine', accessibilityLabel: 'Review routine', variant: 'plain' as const,
        labelStyle: { fontFamily: f.uiSemiBold, fontSize: 15 }, tintColor: c.bone,
        disabled, onPress: openReview }] : undefined };
  }, [state.editingSplitId, state.source, state.draft, loading, conflict, error, router]);
  const workout = state.draft?.workouts.find(day => day.id === state.activeWorkoutId);
  if (loading || !state.hydrated || !workout || !state.draft || error) return <SafeAreaView edges={['left', 'right', 'bottom']} style={ui.screen}>
    <Stack.Screen options={headerOptions} />
    <View style={ui.content}>{error || state.storageError ? <><Text style={ui.error}>{error ?? state.storageError}</Text><Action title="Try again" onPress={() => { setLoading(true); setError(null); if (!state.hydrated) void useCustomSplitDraftStore.persist.rehydrate(); else setRetry(value => value + 1); }} /></> : <ActivityIndicator color={c.ash} accessibilityLabel="Loading your routine" />}</View>
  </SafeAreaView>;

  const index = state.draft.workouts.indexOf(workout);
  const title = getWorkoutDisplayName(workout) || workoutEntryLabel(index);
  const add = () => { state.openPicker(workout.id); router.push('/custom-split/exercises'); };
  const pending = workout.pendingImports ?? [];
  const pendingElsewhere = countPendingImports(state.draft) - pending.length;
  const removeDay = () => {
    if (state.draft!.workouts.length <= 1) return;
    const remove = () => state.deleteWorkout(workout.id);
    if (!workout.exercises.length) remove();
    else Alert.alert(`Delete ${title}?`, 'This removes the workout from your draft. Saved workout history stays intact.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete workout', style: 'destructive', onPress: remove }]);
  };
  const recover = () => {
    if (state.drafts.new) {
      Alert.alert('Finish your other draft first', 'Your new routine draft is also saved. Finish or discard it in Your routines before recovering this edit as a new routine.');
      return;
    }
    state.recoverAsNew(); setConflict(false);
    router.setParams({ splitId: undefined });
  };
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={ui.screen}>
    <Stack.Screen options={headerOptions} />
    <WorkoutTabs workouts={state.draft.workouts} activeWorkoutId={workout.id}
      onSelect={state.selectWorkout} onAdd={state.addWorkout} />
    <View ref={scrollArea} style={{ flex: 1 }}>
      <Animated.ScrollView ref={scrollRef} onScroll={onScroll} scrollEventThrottle={16} scrollEnabled={!reordering}
        onLayout={event => { viewportHeight.current = event.nativeEvent.layout.height; }}
        onContentSizeChange={(_w, height) => { maxScrollOffset.value = Math.max(0, height - viewportHeight.current); }}
        contentContainerStyle={ui.content}>
        {state.storageError ? <View><Text accessibilityRole="alert" style={ui.error}>{state.storageError}</Text><Action title="Retry saving draft" onPress={() => useCustomSplitDraftStore.setState({})} /></View> : null}
        {conflict ? <View style={ui.card}><Text style={ui.subtitle}>Your saved routine changed</Text><Text style={ui.body}>This draft is safe. Save it as a new routine to keep both versions.</Text><Action title="Recover draft" onPress={recover} /><Action title="Discard this draft" onPress={() => Alert.alert('Discard this draft?', 'Your saved routine and workout history stay intact.', [
          { text: 'Keep draft', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: () => { state.discardDraft(); router.replace('/your-splits'); } },
        ])} /></View> : null}
        <View style={ui.section}>
          <Text style={ui.label}>{state.draft.name} · {workoutEntryLabel(index)} of {state.draft.workouts.length}</Text>
          <Text accessibilityRole="header" style={ui.title}>{title}</Text>
          <View style={[ui.wrap, { justifyContent: 'space-between' }]}>
            <Action title="Settings" secondary icon={<SlidersHorizontal color={c.ash} size={18} />}
              onPress={() => router.push('/custom-split/personalize')} />
            <Pressable accessibilityRole="button" accessibilityLabel={`More actions for ${title}`}
              style={({ pressed }) => [ui.iconButton, pressed && ui.pressed]}
              onPress={() => showActions(title, [
                { title: 'Duplicate workout', onPress: () => state.duplicateWorkout(workout.id) },
                ...(state.draft!.workouts.length > 1 ? [{ title: 'Delete workout', destructive: true, onPress: removeDay }] : []),
              ])}><MoreHorizontal color={c.ash} size={22} /></Pressable>
          </View>
          {pendingElsewhere > 0 ? <Text style={ui.label}>{pendingElsewhere === 1 ? '1 exercise' : `${pendingElsewhere} exercises`} in other workouts {pendingElsewhere === 1 ? 'needs' : 'need'} a check.</Text> : null}
        </View>
        {pending.length ? <PendingImportList items={pending}
          onResolve={(key, exercise) => state.resolvePendingImport(workout.id, key, exercise)}
          onSearch={item => { state.openPicker(workout.id, { pendingKey: item.key, query: item.rawName }); router.push('/custom-split/exercises'); }} /> : null}
        {workout.exercises.length ? <SelectedExerciseList key={workout.id} exercises={workout.exercises}
          scrollRef={scrollRef} scrollOffset={scrollOffset} maxScrollOffset={maxScrollOffset} measureViewport={measureViewport}
          onDragStateChange={setReordering} onRemove={id => {
            const position = workout.exercises.findIndex(exercise => exercise.id === id);
            setUndo({ dayId: workout.id, exercise: workout.exercises[position], index: position }); state.removeExercise(workout.id, id);
          }} onReorder={(from, to) => state.reorderExercise(workout.id, from, to)} /> : pending.length ? null :
          <View style={[ui.card, { padding: 24, gap: 16 }]}>
            <StackMark />
            <Text style={ui.subtitle}>Choose your exercises.</Text>
            <Text style={ui.body}>Add the exercises you want to train, in the order you want to do them.</Text>
            <Action title="Use a Stack workout" secondary onPress={() => router.push('/custom-split/template')} />
          </View>}
        {undo && undo.dayId === workout.id ? <View accessibilityLiveRegion="polite" style={[ui.card, ui.row]}><Text style={[ui.body, { flex: 1 }]}>{undo.exercise.name} removed</Text>
          <Action title="Undo" onPress={() => { state.restoreExercise(undo.dayId, undo.exercise, undo.index); setUndo(null); }} /></View> : null}
      </Animated.ScrollView>
    </View>
    <View style={ui.dock}><Action title="Add exercises" primary icon={<Plus color={c.ink} size={20} />} onPress={add} /></View>
  </SafeAreaView>;
}
