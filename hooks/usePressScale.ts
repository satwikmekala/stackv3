import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { withMotionTiming } from '@/constants/motion';

export type PressScaleVariant = 'control' | 'surface';

const PRESSED_SCALE: Record<PressScaleVariant, number> = {
  control: 0.98,
  surface: 0.99,
};

export function usePressScale(variant: PressScaleVariant = 'control') {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withMotionTiming(PRESSED_SCALE[variant], {
      duration: 'feedback',
      easing: 'decelerate',
    });
  };

  const onPressOut = () => {
    scale.value = withMotionTiming(1, {
      duration: 'feedback',
      easing: 'decelerate',
    });
  };

  return { animatedStyle, onPressIn, onPressOut };
}
