import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from '@/services/haptics';
import Animated, {
  FadeInDown,
  FadeOut,
  ReduceMotion,
} from 'react-native-reanimated';
import { CalendarDays, ChevronRight } from 'lucide-react-native';

import { motionDuration, motionEasing } from '@/constants/motion';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { usePressScale } from '@/hooks/usePressScale';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const handlePress = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    onPress();
  };

  return (
    <AnimatedPressable
      accessibilityHint="Choose which routine Stack runs with you"
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={handlePress}
      onPressIn={pressScale.onPressIn}
      onPressOut={pressScale.onPressOut}
      style={[styles.card, pressScale.animatedStyle]}
    >
      <CalendarDays color={redesignColors.ash} size={22} />
      <Animated.View
        entering={CONTENT_ENTER}
        exiting={CONTENT_EXIT}
        key={`${name}\u0000${meta}`}
        style={styles.copy}
      >
        <View style={styles.eyebrowRow}>
          <Text style={styles.eyebrow}>My routine</Text>
        </View>
        <Text style={styles.name}>
          {name}
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
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    borderCurve: 'continuous',
    minHeight: 88,
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
  eyebrow: {
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 17,
    color: redesignColors.bone,
  },
  name: {
    marginTop: 4,
    fontFamily: redesignFonts.ui,
    fontSize: 15,
    color: redesignColors.ash,
  },
  meta: {
    marginTop: 3,
    fontFamily: redesignFonts.ui,
    fontSize: 14.5,
    color: redesignColors.ash,
  },
});
