import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useWorkoutStore } from '@/store/workoutStore';
import { clearOnboardingDraft, loadOnboardingDraft, saveOnboardingDraft, useOnboardingDraft, type OnboardingDraft } from '@/store/onboardingDraft';
import { clearProgramConfigurationDraft, loadProgramConfigurationDraft, saveProgramConfigurationDraft, useProgramConfigurationDraft } from '@/store/programConfigurationDraft';
import { loadSharedRoutineHandoff, onboardingDestination } from '@/store/sharedRoutineHandoff';
import { createOnboardingEntry } from '@/features/onboarding/entry';
import { getNextArchetypeVariant, readArchetypeTemplateCatalogSync, readArchetypeVariantsSync } from '@/store/workoutDatabase';
import { useMuscleColors } from '@/store/muscleColors';
import { useCustomSplitDraftStore } from '@/store/customSplitDraft';
import { buildProgramLineup, type ProgramWorkout } from './lineup';
import { createProgramAcceptance } from './acceptance';
import type { ThreeDayStructure } from '@/store/programPreferences';

export function useProgramSetup(step: 'frequency' | 'program-preview') {
  const router = useRouter();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const [context] = useState<'onboarding' | 'configuration'>(() => useWorkoutStore.getState().profile?.onboardingCompleted ? 'configuration' : 'onboarding');
  const onboarding = useOnboardingDraft();
  const configuration = useProgramConfigurationDraft();
  const state = context === 'onboarding' ? onboarding : configuration;
  const save = context === 'onboarding' ? saveOnboardingDraft : saveProgramConfigurationDraft;
  const clear = context === 'onboarding' ? clearOnboardingDraft : clearProgramConfigurationDraft;
  const load = context === 'onboarding' ? loadOnboardingDraft : loadProgramConfigurationDraft;
  const returnTo = source === 'splits' ? '/your-splits' : '/(tabs)';
  const [local, setLocal] = useState<Partial<OnboardingDraft>>({});
  const draft = { ...state.draft, ...local };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lineup, setLineup] = useState<ProgramWorkout[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);
  const [workoutError, setWorkoutError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const colors = useMuscleColors(s => s.preferences);
  const locked = useRef(false), focused = useRef(true), mounted = useRef(true);
  const finished = useRef(false);
  const retry = useRef<() => Promise<void>>(() => Promise.resolve());
  const finish = () => { finished.current = true; if (focused.current) router.dismissTo(context === 'onboarding' ? onboardingDestination() : returnTo); };
  // eslint-disable-next-line react-hooks/refs -- Factories retain callbacks; focus is only read after an action, never during construction.
  const [accept] = useState(() => createProgramAcceptance({
    saveDraft: async (frequency, structure) => { if (context === 'onboarding') await loadSharedRoutineHandoff(); await save({ frequency, structure, step: 'program-preview', choice: 'stack' }); },
    commit: (frequency, structure) => {
      const profile = useWorkoutStore.getState().acceptStackProgram(frequency, structure, context,
        context === 'onboarding' ? useOnboardingDraft.getState().draft.name : undefined);
      if (context === 'configuration') useCustomSplitDraftStore.getState().discardStackPlanDrafts();
      return profile;
    },
    clearDraft: clear, finish,
  }));
  // eslint-disable-next-line react-hooks/refs -- Entry retains the navigation callback for asynchronous acceptance.
  const [explore] = useState(() => createOnboardingEntry({
    prepare: loadSharedRoutineHandoff,
    saveChoice: choice => saveOnboardingDraft({ choice }),
    completeProfile: () => useWorkoutStore.getState().completeNoProgramOnboarding(useOnboardingDraft.getState().draft.name),
    clearDraft: clearOnboardingDraft, enterApp: finish,
  }));
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const perform = useCallback((operation: () => Promise<void>) => {
    if (locked.current || !focused.current) return;
    locked.current = true; setBusy(true); setError(null); retry.current = operation;
    void operation().catch(() => { if (mounted.current) setError(context === 'onboarding' ? 'Could not save your choices. Try again.' : 'Couldn’t save your choices. Try again.'); })
      .finally(() => { locked.current = false; if (mounted.current) setBusy(false); });
  }, [context]);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    if (finished.current) router.dismissTo(context === 'onboarding' ? onboardingDestination() : returnTo);
    else if (context === 'onboarding' && useWorkoutStore.getState().profile?.onboardingCompleted) router.replace(onboardingDestination());
    else perform(async () => {
      await load();
      const current = context === 'onboarding' ? useOnboardingDraft.getState() : useProgramConfigurationDraft.getState();
      if (step === 'program-preview' && current.draft.frequency === null) {
        if (focused.current) router.replace({ pathname: '/program-setup', params: { source } });
        return;
      }
      await save({ step, choice: 'stack' });
    });
    return () => { focused.current = false; };
  }, [context, load, perform, returnTo, router, save, source, step]));
  useEffect(() => {
    if (step !== 'program-preview' || !state.ready || draft.frequency === null) return;
    let current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- A new read-only projection has a deliberate loading state and invalidates old cards.
    setLoadingWorkouts(true); setWorkoutError(null); setLineup([]);
    void Promise.resolve().then(() => buildProgramLineup(draft.frequency!, draft.structure, {
      variants: readArchetypeVariantsSync, nextVariant: getNextArchetypeVariant, exercises: readArchetypeTemplateCatalogSync,
    })).then(value => { if (current) setLineup(value); })
      .catch(() => { if (current) setWorkoutError(context === 'onboarding' ? 'Could not load your workouts. Try again.' : 'Couldn’t load your workouts. Try again.'); })
      .finally(() => { if (current) setLoadingWorkouts(false); });
    return () => { current = false; };
  }, [context, colors, draft.frequency, draft.structure, revision, state.ready, step]);
  const selectFrequency = (frequency: number) => {
    if (locked.current || !focused.current) return;
    const structure = frequency === 3 && draft.frequency !== 3 ? 'full-body' : draft.structure;
    setLocal({ frequency, structure });
    perform(async () => { await save({ frequency, structure }); if (mounted.current) setLocal({}); });
  };
  const selectStructure = (structure: ThreeDayStructure) => {
    if (locked.current || !focused.current) return;
    setLocal({ structure });
    perform(async () => { await save({ structure }); if (mounted.current) setLocal({}); });
  };
  const seeWorkouts = () => {
    if (draft.frequency === null || error) return;
    perform(async () => {
      await save({ ...draft, step: 'program-preview' });
      if (focused.current) router.push({ pathname: '/program-setup/preview', params: { source } });
    });
  };
  const skip = () => perform(async () => {
    if (context === 'onboarding') await explore('explore');
    else { await clear(); finish(); }
  });
  const back = () => perform(async () => {
    if (step === 'program-preview') {
      await save({ ...draft, step: 'frequency' });
      if (focused.current) router.dismissTo({ pathname: '/program-setup', params: { source } });
    } else if (context === 'onboarding') {
      await save({ step: 'starting-point' });
      if (focused.current) router.dismissTo('/(onboarding)/starting-point');
    } else { await clear(); finish(); }
  });
  const useWorkouts = () => {
    if (draft.frequency === null || error || loadingWorkouts || workoutError || lineup.length !== draft.frequency) return;
    perform(() => accept(draft.frequency!, draft.structure));
  };
  const loadingError = !state.ready && state.error
    ? context === 'onboarding' ? state.error : 'Couldn’t load your plan. Try again.'
    : null;
  return { ...draft, context, ready: state.ready, busy, error: error ?? loadingError,
    selectFrequency, selectStructure, seeWorkouts, useWorkouts, skip, back,
    retry: () => perform(retry.current), lineup, loadingWorkouts, workoutError, retryWorkouts: () => setRevision(value => value + 1) };
}
