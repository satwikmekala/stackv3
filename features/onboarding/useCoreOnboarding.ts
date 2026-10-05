import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useWorkoutStore } from '@/store/workoutStore';
import { NICKNAME_MAX_LENGTH, clearOnboardingDraft, loadOnboardingDraft, saveOnboardingDraft, useOnboardingDraft } from '@/store/onboardingDraft';
import { loadSharedRoutineHandoff, onboardingDestination } from '@/store/sharedRoutineHandoff';
import { createOnboardingEntry } from './entry';

export function useCoreOnboarding(step: 'welcome' | 'name' | 'starting-point') {
  const router = useRouter();
  const { ready, error: storageError, draft } = useOnboardingDraft();
  const [completedOnEntry] = useState(() => Boolean(useWorkoutStore.getState().profile?.onboardingCompleted));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  const focused = useRef(true);
  const mounted = useRef(true);
  const retry = useRef<() => Promise<void>>(() => Promise.resolve());
  // eslint-disable-next-line react-hooks/refs -- The factory stores callbacks; focus is read only during acceptance after a press.
  const [entry] = useState(() => createOnboardingEntry({
    prepare: loadSharedRoutineHandoff,
    saveChoice: choice => saveOnboardingDraft({ choice }),
    completeProfile: () => useWorkoutStore.getState().completeNoProgramOnboarding(useOnboardingDraft.getState().draft.name),
    clearDraft: clearOnboardingDraft,
    enterApp: () => { if (focused.current) router.replace(onboardingDestination()); },
  }));
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const perform = useCallback((operation: () => Promise<void>) => {
    if (locked.current || !focused.current) return;
    locked.current = true;
    setBusy(true); setError(null);
    retry.current = operation;
    void operation().catch(() => {
      if (mounted.current) setError('Could not save your setup. Your choices are still here. Try again.');
    }).finally(() => {
      locked.current = false;
      if (mounted.current) setBusy(false);
    });
  }, []);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    if (useWorkoutStore.getState().profile?.onboardingCompleted) {
      if (!completedOnEntry) router.replace(onboardingDestination());
    } else {
      perform(async () => { await loadOnboardingDraft(); await saveOnboardingDraft({ step }); });
    }
    return () => { focused.current = false; };
  }, [completedOnEntry, perform, router, step]));
  const getStarted = () => perform(async () => {
    await saveOnboardingDraft({ step: 'name' });
    if (focused.current) router.push('/(onboarding)/name');
  });
  const submitName = (name: string) => {
    const trimmed = name.trim().slice(0, NICKNAME_MAX_LENGTH);
    if (!trimmed) return;
    perform(async () => {
      await saveOnboardingDraft({ name: trimmed, step: 'starting-point' });
      if (focused.current) router.push('/(onboarding)/starting-point');
    });
  };
  const enter = (choice: 'track' | 'explore') => perform(() => entry(choice));
  const backToWelcome = () => perform(async () => {
    await saveOnboardingDraft({ step: 'welcome' });
    if (focused.current) router.dismissTo('/(onboarding)/welcome');
  });
  const backToName = () => perform(async () => {
    await saveOnboardingDraft({ step: 'name' });
    if (focused.current) router.dismissTo('/(onboarding)/name');
  });
  const getProgram = () => perform(async () => {
    await saveOnboardingDraft({ choice: 'stack', step: 'frequency' });
    if (focused.current) router.push({ pathname: '/program-setup', params: { source: 'onboarding' } });
  });
  const bringWorkouts = () => perform(async () => {
    await saveOnboardingDraft({ choice: 'track', step: 'bring-workouts' });
    if (focused.current) router.push('/bring-workouts');
  });
  return { ready, completedOnEntry, busy, name: draft.name, error: error ?? (!ready ? storageError : null),
    retry: () => perform(retry.current), getStarted, submitName, enter, getProgram, bringWorkouts, backToWelcome, backToName };
}
