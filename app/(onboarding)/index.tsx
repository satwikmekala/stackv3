import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useWorkoutStore } from '@/store/workoutStore';
import { clearOnboardingDraft, loadOnboardingDraft, useOnboardingDraft } from '@/store/onboardingDraft';
import { SetupLoading } from '@/features/onboarding/SetupLoading';

export default function OnboardingEntry() {
  const profile = useWorkoutStore(state => state.profile);
  const { ready, draft, error } = useOnboardingDraft();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (profile?.onboardingCompleted) void clearOnboardingDraft().catch(() => {});
    else void loadOnboardingDraft().catch(() => {});
  }, [attempt, profile?.onboardingCompleted]);
  if (profile?.onboardingCompleted) return <Redirect href="/(tabs)" />;
  if (!ready) return <SetupLoading error={error} retry={() => setAttempt(value => value + 1)} />;
  if (draft.step === 'frequency' || draft.step === 'program-preview' || draft.step === 'split-choice') return <Redirect href={{
    pathname: draft.step === 'frequency' || draft.frequency === null ? '/program-setup' : '/program-setup/preview', params: { source: 'onboarding' },
  }} />;
  if (draft.step === 'welcome') return <Redirect href="/(onboarding)/welcome" />;
  if (draft.step === 'bring-workouts' && draft.name) return <Redirect href="/bring-workouts" />;
  // A draft saved before the name step resumes by asking for the nickname first.
  return <Redirect href={draft.step === 'name' || !draft.name ? '/(onboarding)/name' : '/(onboarding)/starting-point'} />;
}
