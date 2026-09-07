import { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  FadeOut,
  ReduceMotion,
} from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';

import { motionDuration, motionEasing } from '@/constants/motion';
import { redesignColors, redesignFonts, splitColors } from '@/constants/theme';
import { usePressScale } from '@/hooks/usePressScale';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ACCENT = splitColors.chest;
const CONTENT_ENTER = FadeInDown.duration(motionDuration.transition)
  .easing(motionEasing.decelerate)
  .withInitialValues({
    opacity: 0,
    transform: [{ translateY: 3 }],
  })
  .reduceMotion(ReduceMotion.System);
const CONTENT_EXIT = FadeOut.duration(motionDuration.feedback)
  .easing(motionEasing.accelerate)
  .reduceMotion(ReduceMotion.System);

interface YourSplitCardProps {
  /** Spoken as one button; the chevron stays decorative. */
  accessibilityLabel: string;
  /** Name of the program that is actually driving Home right now. */
  name: string;
  /**
   * "Custom" / "Auto-generated" plus a workout count. Omitted while the active
   * split's detail is still loading so the card never claims "0 workouts".
   */
  meta: string;
  onPress: () => void;
}

export function YourSplitCard({
  accessibilityLabel,
  meta,
  name,
  onPress,
}: YourSplitCardProps) {
  const pressScale = usePressScale('surface');
  const hasMountedContent = useRef(false);

  useEffect(() => {
    hasMountedContent.current = true;
  }, []);

  const handlePress = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    onPress();
  };

  return (
    <AnimatedPressable
      accessibilityHint="Choose which split Stack runs with you"
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={handlePress}
      onPressIn={pressScale.onPressIn}
      onPressOut={pressScale.onPressOut}
      style={[styles.card, pressScale.animatedStyle]}
    >
      <Animated.View
        entering={hasMountedContent.current ? CONTENT_ENTER : undefined}
        exiting={CONTENT_EXIT}
        key={`${name}\u0000${meta}`}
        style={styles.copy}
      >
        <View style={styles.eyebrowRow}>
          <View style={styles.accentDot} />
          <Text style={styles.eyebrow}>YOUR SPLIT</Text>
        </View>
        <Text numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {meta}
        </Text>
      </Animated.View>
      <ChevronRight
        accessibilityElementsHidden
        color={redesignColors.ash}
        importantForAccessibility="no"
        size={20}
        strokeWidth={2.2}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.surface,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  accentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  eyebrow: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 11,
    letterSpacing: 1,
    color: redesignColors.ash,
  },
  name: {
    marginTop: 8,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 18,
    color: redesignColors.bone,
  },
  meta: {
    marginTop: 3,
    fontFamily: redesignFonts.ui,
    fontSize: 14.5,
    color: redesignColors.ash,
  },
});
