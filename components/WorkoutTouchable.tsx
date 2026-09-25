import React from 'react';
import { TouchableOpacity, type TouchableOpacityProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { workoutMotion, workoutTiming } from '@/constants/workoutMotion';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// Opt-in for workout controls; callbacks and native cancellation stay intact.
export function WorkoutTouchable({ style, onPressIn, onPressOut, ...props }: TouchableOpacityProps) {
  const scale = useSharedValue(1);
  const feedback = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedTouchable
      {...props}
      style={[style, feedback]}
      onPressIn={(event) => {
        scale.set(withTiming(workoutMotion.pressScale, workoutTiming(workoutMotion.press)));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(withTiming(1, workoutTiming(workoutMotion.press)));
        onPressOut?.(event);
      }}
    />
  );
}
