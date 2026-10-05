import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { loadOnboardingDraft, saveOnboardingDraft, useOnboardingDraft, clearOnboardingDraft, type OnboardingDraft } from '@/store/onboardingDraft';
import { useWorkoutStore } from '@/store/workoutStore';
import { getProgramFrequency } from '@/store/trainingPreferences';

export const TRAINING_ONBOARDING_ROUTES = {
  welcome: '/(onboarding)/welcome', name: '/(onboarding)/whatsurname',
  experience: '/(onboarding)/experience', frequency: '/(onboarding)/current-week',
  'split-choice': '/(onboarding)/split-choice',
} as const;
type Step = keyof typeof TRAINING_ONBOARDING_ROUTES;

export function useTrainingOnboarding(step: Step) {
  const router = useRouter();
  const { draft, ready, error: storageError } = useOnboardingDraft();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false), focused = useRef(true);
  const retry = useRef<() => Promise<void>>(async () => {});
  const perform = useCallback((operation: () => Promise<void>) => {
    if (locked.current || !focused.current) return;
    locked.current = true; setBusy(true); setError(null); retry.current = operation;
    void operation().catch(() => {
      if (focused.current) setError('Could not save your setup. Your choices are still here. Try again.');
    }).finally(() => {
      locked.current = false;
      if (focused.current) setBusy(false);
    });
  }, []);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    perform(async () => {
      await loadOnboardingDraft();
      const profile = useWorkoutStore.getState().profile;
      if (profile?.onboardingCompleted) { if (focused.current) router.replace('/(tabs)'); return; }
      const current = useOnboardingDraft.getState().draft;
      // Old onboarding only saved a profile at the schedule step. Recover its
      // frequency without treating preferred weekdays as a new requirement.
      await saveOnboardingDraft({ step, ...(current.frequency === null && profile ? {
        name: current.name || profile.name, frequency: getProgramFrequency(profile),
        experienceLevel: profile.experienceLevel, structure: profile.threeDayStructure,
      } : {}) });
    });
    return () => { focused.current = false; };
  }, [perform, router, step]));
  const save = (update: Partial<OnboardingDraft>) => perform(() => saveOnboardingDraft(update));
  const next = (destination: Step, update: Partial<OnboardingDraft> = {}, prepare = false) => perform(async () => {
    await saveOnboardingDraft({ ...update, step: destination });
    const current = useOnboardingDraft.getState().draft;
    if (prepare) {
      if (current.frequency === null) throw Error('Choose your training frequency.');
      useWorkoutStore.getState().prepareTrainingOnboarding(current.name, current.frequency, current.experienceLevel ?? 'intermediate');
    }
    if (focused.current) router.push(TRAINING_ONBOARDING_ROUTES[destination]);
  });
  const back = (destination: Step) => perform(async () => {
    await saveOnboardingDraft({ step: destination });
    if (focused.current) router.dismissTo(TRAINING_ONBOARDING_ROUTES[destination]);
  });
  const complete = () => perform(async () => {
    useWorkoutStore.getState().completeTrainingOnboarding();
    await clearOnboardingDraft().catch(() => {});
    if (focused.current) router.replace('/(tabs)');
  });
  return { draft, ready, busy, error: error ?? storageError, save, next, back, complete, retry: () => perform(retry.current) };
}
