import { Redirect, Stack, useNavigation } from 'expo-router';
import { onboardingBackOptions } from '@/features/onboarding/OnboardingActions';
import { StartingPointScreen } from '@/features/onboarding/StartingPointScreen';
import { useCoreOnboarding } from '@/features/onboarding/useCoreOnboarding';
import { SetupLoading, SetupStatus } from '@/features/onboarding/SetupLoading';

export default function StartingPoint() {
  const flow = useCoreOnboarding('starting-point');
  const navigation = useNavigation();
  const hasPreviousScreen = (navigation.getState()?.index ?? 0) > 0;
  if (flow.completedOnEntry) return <Redirect href="/(tabs)" />;
  if (!flow.ready) return <SetupLoading error={flow.error} retry={flow.retry} />;
  return <>
    <Stack.Screen options={{ gestureEnabled: hasPreviousScreen,
      // A cold-restored draft has no preceding native stack entry. Keep Back
      // in the native toolbar and persist its destination before replacing.
      ...onboardingBackOptions('Back to name', flow.backToName) }} />
    <StartingPointScreen busy={flow.busy} onTrack={flow.bringWorkouts} onExplore={() => flow.enter('explore')}
      onProgram={flow.getProgram}
      status={<SetupStatus error={flow.error} retry={flow.retry} />} />
  </>;
}
