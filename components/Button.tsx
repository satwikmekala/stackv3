import React from 'react';
import { Text, ActivityIndicator, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CONTAINER_STYLES = {
  primary: { backgroundColor: colors.bone },
  secondary: { backgroundColor: colors.surfaceRaised },
  ghost: { backgroundColor: 'transparent' },
} as const;

const TEXT_STYLES = {
  primary: { fontFamily: fonts.heading, color: colors.ink },
  secondary: { fontFamily: fonts.bodySemiBold, color: colors.bone },
  ghost: { fontFamily: fonts.bodyMedium, color: colors.ash },
} as const;

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  className = '',
}: ButtonProps) {
  const press = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.03 }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => (press.value = withTiming(1, { duration: 120 }))}
      onPressOut={() => (press.value = withTiming(0, { duration: 120 }))}
      className={className}
      style={[
        {
          height: 54,
          borderRadius: 16,
          paddingHorizontal: 24,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled || loading ? 0.45 : 1,
        },
        CONTAINER_STYLES[variant],
        animatedStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.ink : colors.bone} />
      ) : (
        <Text style={[{ fontSize: 16 }, TEXT_STYLES[variant]]}>{title}</Text>
      )}
    </AnimatedPressable>
  );
}
