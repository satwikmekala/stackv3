import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Redirect, Stack, useRouter } from 'expo-router';
import { redesignColors as c, redesignFonts as f } from '@/constants/theme';
import { ONBOARDING_PREVIEW_ENABLED } from '@/features/onboarding/config';
import { BuildPreview } from '@/features/build/BuildPreview';
import { WELCOME_SLABS } from '@/features/onboarding/welcomeExample';
import { SplitPressable as Pressable } from '@/components/custom-split/SplitPressable';

/** Pure geometry with illustrative IDs. No session catalog, record derivation,
 * fusion/reward coordinator or workout navigation is connected to this route. */
export default function StackExample() {
  const router = useRouter();
  const { fontScale } = useWindowDimensions();
  if (!ONBOARDING_PREVIEW_ENABLED) return <Redirect href="/(tabs)" />;
  return <>
    <Stack.Screen options={{ headerShown: true, title: 'Example of My Stack', headerBackButtonDisplayMode: 'minimal', headerStyle: { backgroundColor: c.ink }, headerTintColor: c.bone, headerShadowVisible: false }} />
    <ScrollView key={`example:${fontScale}`} style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.eyebrow}>EXAMPLE ONLY</Text>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.8} style={s.title}>Training, taking shape.</Text>
      <View style={s.scene} accessible accessibilityRole="image" accessibilityLabel="Example of My Stack: two weekly layers and three workout blocks. Colors show the muscles trained. Your training data stays unchanged."><BuildPreview slabs={WELCOME_SLABS} width={280} height={280} /></View>
      <Text style={s.copy}>One completed workout becomes a block. Its colors show what you trained.</Text>
      <Text style={s.copy}>When a week ends, its blocks combine into a layer. Layers build My Stack.</Text>
      <Text style={s.note}>This example adds nothing to your workouts, records or My Stack.</Text>
      <Pressable accessibilityRole="button" onPress={() => router.dismissTo('/(tabs)')} style={s.action}><Text style={s.actionText}>Go to Train</Text></Pressable>
    </ScrollView>
  </>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ink }, content: { padding: 24, paddingBottom: 60, gap: 20 },
  eyebrow: { fontFamily: f.mono, fontSize: 11, letterSpacing: 2, color: c.accent }, title: { fontFamily: f.display, fontSize: 40, lineHeight: 46, color: c.bone },
  scene: { alignItems: 'center' }, copy: { fontFamily: f.ui, fontSize: 17, lineHeight: 25, color: c.bone }, note: { fontFamily: f.ui, fontSize: 15, lineHeight: 22, color: c.ash },
  action: { minHeight: 56, borderRadius: 20, padding: 16, backgroundColor: c.accent, alignItems: 'center' }, actionText: { fontFamily: f.uiBold, fontSize: 17, color: c.ink },
});
