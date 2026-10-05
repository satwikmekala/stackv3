import { Stack } from 'expo-router';
import { redesignColors as c } from '@/constants/theme';

export default function ProgramSetupLayout() {
  return <Stack screenOptions={{ headerShown: true, title: '', headerTintColor: c.bone,
    headerStyle: { backgroundColor: c.ink }, contentStyle: { backgroundColor: c.ink }, headerShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal' }} />;
}
