import React from 'react';
import { Text, ActivityIndicator, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { colors, fonts } from '@/constants/theme';
import { usePressScale } from '@/hooks/usePressScale';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CONTAINER_STYLES = {
  primary: { backgroundColor: colors.bone },
  secondary: { backgroundColor: colors.surfaceRaised },
  ghost: { backgroundColor: 'transparent' },
  destructive: { backgroundColor: '#E5484D' },
} as const;

const TEXT_STYLES = {
  primary: { fontFamily: fonts.heading, color: colors.ink },
  secondary: { fontFamily: fonts.bodySemiBold, color: colors.bone },
  ghost: { fontFamily: fonts.bodyMedium, color: colors.ash },
  destructive: { fontFamily: fonts.bodySemiBold, color: colors.bone },
} as const;

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  className = '',
}: ButtonProps) {
  const pressScale = usePressScale();

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={pressScale.onPressIn}
      onPressOut={pressScale.onPressOut}
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
        pressScale.animatedStyle,
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
