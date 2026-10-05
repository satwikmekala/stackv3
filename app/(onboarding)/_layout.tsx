import { Redirect, Stack } from 'expo-router';

import { FIRST_RUN_ROUTE, ONBOARDING_PREVIEW_ENABLED } from '@/features/onboarding/config';
import { useWorkoutStore } from '@/store/workoutStore';

export default function OnboardingLayout() {
  const completed = useWorkoutStore(state => state.profile?.onboardingCompleted);
  if (ONBOARDING_PREVIEW_ENABLED) return <Redirect href={completed ? '/(tabs)' : FIRST_RUN_ROUTE} />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="whatsurname" />
      <Stack.Screen name="experience" />
      <Stack.Screen name="current-week" />
      <Stack.Screen name="split-choice" />
    </Stack>
  );
}
