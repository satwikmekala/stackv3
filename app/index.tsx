import { Redirect } from 'expo-router';
import { useWorkoutStore } from '@/store/workoutStore';

export default function Index() {
  const profile = useWorkoutStore((state) => state.profile);

  if (!profile || !profile.onboardingCompleted) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return <Redirect href="/(tabs)" />;
}
