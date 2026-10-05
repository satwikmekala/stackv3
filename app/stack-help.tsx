import { Redirect, useRouter } from 'expo-router';
import BuildEntry from '@/features/build/BuildEntry';
import { ONBOARDING_PREVIEW_ENABLED } from '@/features/onboarding/config';

export default function StackHelp() {
  const router = useRouter();
  if (!ONBOARDING_PREVIEW_ENABLED) return <Redirect href="/(tabs)" />;
  return <BuildEntry forceIntroduction onFinish={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/stack')}>{null}</BuildEntry>;
}
