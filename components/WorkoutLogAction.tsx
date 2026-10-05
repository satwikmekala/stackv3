import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { workoutMotion, workoutTiming } from '@/constants/workoutMotion';
import { usePressScale } from '@/hooks/usePressScale';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
// Finish the glyph transition and give the tick a short beat before advancing.
const CONFIRMATION_HOLD_MS = 320;

export function WorkoutLogAction({ label, accessibilityLabel, accent, onLog }: {
  label: string;
  accessibilityLabel: string;
  accent: string;
  onLog: () => void;
}) {
  const pressScale = usePressScale();
  const reducedMotion = useReducedMotion();
  const [confirming, setConfirming] = useState(false);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const labelProgress = useSharedValue(0);
  const checkProgress = useSharedValue(0);

  useEffect(() => () => {
    if (pending.current !== null) clearTimeout(pending.current);
  }, []);

  const labelStyle = useAnimatedStyle(() => ({
    opacity: 1 - labelProgress.value,
    transform: [{ scale: 1 - labelProgress.value * 0.08 }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkProgress.value,
    transform: [{ scale: 0.8 + checkProgress.value * 0.2 }],
  }));

  const handlePress = () => {
    if (pending.current !== null) return;
    if (label !== 'Log') { onLog(); return; }
    setConfirming(true);
    labelProgress.set(reducedMotion ? 1 : withTiming(1, workoutTiming(90)));
    checkProgress.set(reducedMotion ? 1 : withDelay(50, withTiming(1, workoutTiming(workoutMotion.confirm - 50))));
    pending.current = setTimeout(() => {
      // The caller advances the set after the acknowledgement. A changed set
      // identity unmounts this control and cancels any stale submission.
      onLog();
      pending.current = null;
      setConfirming(false);
      labelProgress.set(0);
      checkProgress.set(0);
    }, reducedMotion ? 150 : CONFIRMATION_HOLD_MS);
  };

  return (
    <AnimatedTouchableOpacity accessibilityRole="button" accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: confirming, busy: confirming }} disabled={confirming}
      onPress={handlePress} onPressIn={pressScale.onPressIn} onPressOut={pressScale.onPressOut}
      activeOpacity={0.78} style={[styles.button, { backgroundColor: accent }, pressScale.animatedStyle]}>
      <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={[styles.glyph, labelStyle]}>
        <Text maxFontSizeMultiplier={1.2} style={styles.label}>{label}</Text>
      </Animated.View>
      <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={[styles.glyph, checkStyle]}>
        <Check color={redesignColors.ink} size={24} strokeWidth={2.8} />
      </Animated.View>
    </AnimatedTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  glyph: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: redesignFonts.uiSemiBold, fontSize: 14, color: redesignColors.ink },
});
