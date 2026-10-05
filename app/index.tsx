import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { FIRST_RUN_ROUTE } from '@/features/onboarding/config';
import { SetupLoading } from '@/features/onboarding/SetupLoading';
import { loadSharedRoutineHandoff, onboardingDestination, useSharedRoutineHandoff } from '@/store/sharedRoutineHandoff';
import { initializeWorkoutStore, useWorkoutStore } from '@/store/workoutStore';

export default function AppEntry() {
  const profile = useWorkoutStore(state => state.profile);
  const isHydrated = useWorkoutStore(state => state.isHydrated);
  const hydrationError = useWorkoutStore(state => state.hydrationError);
  const handoff = useSharedRoutineHandoff();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { void loadSharedRoutineHandoff().catch(() => {}); }, [attempt]);

  if (!isHydrated || hydrationError) return <SetupLoading error={hydrationError}
    retry={() => { void initializeWorkoutStore().catch(() => {}); }} />;
  if (!profile?.onboardingCompleted) return <Redirect href={FIRST_RUN_ROUTE} />;
  if (!handoff.ready) return <SetupLoading error={handoff.error} retry={() => setAttempt(value => value + 1)} />;
  return <Redirect href={onboardingDestination()} />;
}
