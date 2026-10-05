import { StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import type { NativeStackNavigationOptions } from 'expo-router/native-stack';
import { SplitPressable as Pressable } from '@/components/custom-split/SplitPressable';
import { redesignColors as c, redesignFonts as f } from '@/constants/theme';
import { usePressScale } from '@/hooks/usePressScale';

export function OnboardingPrimaryAction({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const press = usePressScale();
  return <Animated.View style={press.animatedStyle}>
    <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{ disabled }} onPress={onPress}
      onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={[styles.primary, disabled && styles.disabled]}>
      <Text style={styles.primaryLabel}>{label}</Text>
    </Pressable>
  </Animated.View>;
}

/**
 * Toolbar Back that persists the destination step, so it also works after a cold draft restore.
 * On iOS it is a real bar button item, so it gets the system back button's glass circle.
 */
export function onboardingBackOptions(label: string, onPress: () => void): NativeStackNavigationOptions {
  return {
    headerBackVisible: false,
    unstable_headerLeftItems: () => [{ type: 'button', label, accessibilityLabel: label, onPress,
      icon: { type: 'sfSymbol', name: 'chevron.left' } }],
    headerLeft: () => <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.back}>
      <ChevronLeft size={22} color={c.bone} />
    </Pressable>,
  };
}

const styles = StyleSheet.create({
  primary: { minHeight: 56, paddingVertical: 15, paddingHorizontal: 22, borderRadius: 20, backgroundColor: c.bone, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.35 },
  primaryLabel: { fontFamily: f.uiSemiBold, fontSize: 17, color: c.ink, textAlign: 'center' },
  back: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
});
