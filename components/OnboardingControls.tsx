import React from 'react';
import { Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ArrowRight, ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { redesignColors, splitColors } from '@/constants/theme';

const TOTAL_STEPS = 4;
export function OnboardingProgress({ currentStep }: { currentStep: number }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: TOTAL_STEPS, now: currentStep }}
      style={styles.progress}
    >
      {Array.from({ length: TOTAL_STEPS }, (_, index) => (
        <View
          key={index}
          style={[
            styles.progressSegment,
            {
              backgroundColor:
                index < currentStep ? splitColors.chest : redesignColors.hi,
            },
          ]}
        />
      ))}
    </View>
  );
}

export function OnboardingBackButton() {
  const router = useRouter();

  return (
    <TouchableOpacity
      accessibilityLabel="Go back"
      accessibilityRole="button"
      activeOpacity={0.72}
      hitSlop={8}
      onPress={() => router.back()}
      style={styles.backButton}
    >
      <ChevronLeft color={redesignColors.bone} size={17} strokeWidth={2.4} />
    </TouchableOpacity>
  );
}

interface OnboardingNextButtonProps {
  accessibilityLabel?: string;
  disabled?: boolean;
  onPress: () => void;
  size?: number;
}

export function OnboardingNextButton({
  accessibilityLabel = 'Continue',
  disabled = false,
  onPress,
  size = 56,
}: OnboardingNextButtonProps) {
  const press = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.02 }],
  }));

  const handlePressIn = () => {
    press.value = withTiming(1, {
      duration: 150,
      easing: Easing.inOut(Easing.ease),
    });
    void Haptics.selectionAsync();
  };

  const handlePressOut = () => {
    press.value = withTiming(0, {
      duration: 150,
      easing: Easing.inOut(Easing.ease),
    });
  };

  return (
    <Animated.View
      pointerEvents={disabled ? 'none' : 'auto'}
      style={[
        styles.nextButton,
        { width: size, height: size, borderRadius: size / 2 },
        disabled && styles.nextButtonDisabled,
        animatedStyle,
      ]}
    >
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        disabled={disabled}
        hitSlop={8}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.nextButtonHitTarget, { borderRadius: size / 2 }]}
      >
        <ArrowRight
          color={redesignColors.ink}
          size={Math.round(size * 0.4)}
          strokeWidth={2.6}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  progress: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: redesignColors.surface,
    borderWidth: 1,
    borderColor: redesignColors.border,
  },
  nextButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: splitColors.chest,
    shadowColor: splitColors.chest,
    shadowOpacity: 0.38,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  nextButtonHitTarget: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.42,
  },
});
