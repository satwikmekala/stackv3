import { Stack } from 'expo-router';

/** Compatibility links resolve the saved draft in the normal onboarding. */
export default function PreviewLinkLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
