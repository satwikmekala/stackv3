import { Redirect } from 'expo-router';
import { SetupLoading, SetupStatus } from '@/features/onboarding/SetupLoading';
import { useCoreOnboarding } from '@/features/onboarding/useCoreOnboarding';
import { WelcomeScreen } from '@/features/onboarding/WelcomeScreen';

export default function PreviewWelcome() {
  const flow = useCoreOnboarding('welcome');
  if (flow.completedOnEntry) return <Redirect href="/(tabs)" />;
  if (!flow.ready) return <SetupLoading error={flow.error} retry={flow.retry} />;
  return <WelcomeScreen onContinue={flow.getStarted}
    actionStatus={<SetupStatus error={flow.error} retry={flow.retry} />} />;
}
