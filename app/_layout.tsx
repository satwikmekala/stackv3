import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useWorkoutStore } from '@/store/workoutStore';
import '@/global.css';

export default function RootLayout() {
  useFrameworkReady();
  const router = useRouter();
  const segments = useSegments();
  const profile = useWorkoutStore((state) => state.profile);

  useEffect(() => {
    if (profile === null) {
      return;
    }

    const inOnboarding = segments[0] === '(onboarding)';

    if (!profile.onboardingCompleted && !inOnboarding) {
      router.replace('/(onboarding)/intro');
    } else if (profile.onboardingCompleted && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [profile, segments]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="workout" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
