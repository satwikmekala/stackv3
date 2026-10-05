import { Redirect, Stack } from 'expo-router';
import { ONBOARDING_PREVIEW_ENABLED } from '@/features/onboarding/config';
import { redesignColors as c } from '@/constants/theme';

const stepHeader = { headerShown: true, title: '', headerBackButtonDisplayMode: 'minimal', headerStyle: { backgroundColor: c.ink },
  headerTintColor: c.bone, headerShadowVisible: false } as const;

export default function PreviewLayout() {
  if (!ONBOARDING_PREVIEW_ENABLED) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.ink } }}>
    <Stack.Screen name="index" />
    <Stack.Screen name="welcome" />
    <Stack.Screen name="name" options={stepHeader} />
    <Stack.Screen name="starting-point" options={stepHeader} />
  </Stack>;
}
