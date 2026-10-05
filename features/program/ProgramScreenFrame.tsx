import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { SplitPressable as Pressable } from '@/components/custom-split/SplitPressable';
import { redesignColors as c, redesignFonts as f } from '@/constants/theme';
import { onboardingBackOptions } from '@/features/onboarding/OnboardingActions';
import { SetupStatus } from '@/features/onboarding/SetupLoading';

export function ProgramScreenFrame({ title, number, busy, error, retry, back, children, primary, onPrimary, disabled, secondary, onSecondary }: {
  title: string; number: number; busy: boolean; error: string | null; retry: () => void; back: () => void;
  children: ReactNode; primary: string; onPrimary: () => void; disabled?: boolean; secondary: string; onSecondary: () => void;
}) {
  const { fontScale, width } = useWindowDimensions();
  const scale = Math.min(fontScale, 1.5);
  // At accessibility sizes the actions share the scroll area so they cannot
  // consume the viewport or clip their fully scaled labels.
  const scrollActions = fontScale > 1.3;
  const actions = <View key={`actions:${fontScale}`} style={[styles.footer, scrollActions && styles.scrollingFooter]}>
    <SetupStatus error={error} retry={retry} />
    {/* Saves are near-instant, so busy only blocks repeat taps; dimming for it would flash. */}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || disabled }} disabled={busy || disabled}
      onPress={onPrimary} style={[styles.action, styles.primary, disabled && styles.disabled]}>
      <Text style={[styles.actionText, { color: c.ink }]}>{primary}</Text></Pressable>
    <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy }} onPress={onSecondary} style={styles.action}>
      <Text style={styles.actionText}>{secondary}</Text></Pressable>
  </View>;
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
    <Stack.Screen options={{ gestureEnabled: false,
      // Explicit toolbar Back also handles a restored draft without earlier routes.
      ...onboardingBackOptions('Back', back) }} />
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text key={`step:${fontScale}`} style={styles.eyebrow}>{number} of 2</Text>
      <Text key={`title:${fontScale}`} accessibilityRole="header" allowFontScaling={false} style={[styles.title, { fontSize: (width < 360 ? 37 : 42) * scale, lineHeight: 46 * scale }]}>{title}</Text>
      {children}
      {scrollActions && actions}
    </ScrollView>
    {!scrollActions && actions}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ink }, scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingVertical: 16, gap: 20, width: '100%', maxWidth: 568, alignSelf: 'center' },
  eyebrow: { fontFamily: f.mono, color: c.ash, fontSize: 12 },
  title: { fontFamily: f.display, color: c.bone, letterSpacing: -1.2 },
  footer: { paddingHorizontal: 24, paddingBottom: 8, paddingTop: 8, gap: 3, width: '100%', maxWidth: 568, alignSelf: 'center' },
  scrollingFooter: { paddingHorizontal: 0 },
  action: { minHeight: 52, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 20 },
  primary: { backgroundColor: c.bone }, disabled: { opacity: 0.45 },
  actionText: { fontFamily: f.uiSemiBold, fontSize: 17, color: c.ash, textAlign: 'center' },
});
