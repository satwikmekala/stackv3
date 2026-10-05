import { Redirect, Stack, useNavigation } from 'expo-router';
import { NameScreen } from '@/features/onboarding/NameScreen';
import { onboardingBackOptions } from '@/features/onboarding/OnboardingActions';
import { SetupLoading, SetupStatus } from '@/features/onboarding/SetupLoading';
import { useCoreOnboarding } from '@/features/onboarding/useCoreOnboarding';

export default function PreviewName() {
  const flow = useCoreOnboarding('name');
  const navigation = useNavigation();
  const hasPreviousScreen = (navigation.getState()?.index ?? 0) > 0;
  if (flow.completedOnEntry) return <Redirect href="/(tabs)" />;
  if (!flow.ready) return <SetupLoading error={flow.error} retry={flow.retry} />;
  return <>
    <Stack.Screen options={{ gestureEnabled: hasPreviousScreen, ...onboardingBackOptions('Back to Welcome', flow.backToWelcome) }} />
    <NameScreen initialName={flow.name} busy={flow.busy} onSubmit={flow.submitName}
      status={<SetupStatus error={flow.error} retry={flow.retry} />} />
  </>;
}
