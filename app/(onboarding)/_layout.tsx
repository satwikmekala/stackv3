import { Stack } from 'expo-router';
import { redesignColors as c } from '@/constants/theme';

const stepHeader = { headerShown: true, title: '', headerBackButtonDisplayMode: 'minimal', headerStyle: { backgroundColor: c.ink },
  headerTintColor: c.bone, headerShadowVisible: false } as const;

export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.ink } }}>
    <Stack.Screen name="index" />
    <Stack.Screen name="welcome" />
    <Stack.Screen name="name" options={stepHeader} />
    <Stack.Screen name="starting-point" options={stepHeader} />
  </Stack>;
}
