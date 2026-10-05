import { Redirect, Stack } from 'expo-router';
import { ONBOARDING_PREVIEW_ENABLED } from '@/features/onboarding/config';
import { redesignColors as c } from '@/constants/theme';

export default function ProgramSetupLayout() {
  if (!ONBOARDING_PREVIEW_ENABLED) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: true, title: '', headerTintColor: c.bone,
    headerStyle: { backgroundColor: c.ink }, contentStyle: { backgroundColor: c.ink }, headerShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal' }} />;
}
