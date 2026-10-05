import { createContext, useContext } from 'react';
import { Extrapolation, interpolate, useAnimatedStyle, useReducedMotion, type SharedValue } from 'react-native-reanimated';

// One UI-thread value owns the whole departure, including spring-back. No
// React renders or JS callbacks are needed while a finger is on the slider.
export const HomeDeparture = createContext<SharedValue<number> | null>(null);

export function homeDepartureOpacity(progress: number, start = 0.04, end = 0.86) {
  'worklet';
  const amount = interpolate(progress, [start, end], [0, 1], Extrapolation.CLAMP);
  return 1 - amount * amount * (3 - 2 * amount);
}

export function useHomeDepartureStyle(start = 0.04, end = 0.86, lift = 10) {
  const progress = useContext(HomeDeparture);
  const reduceMotion = useReducedMotion();
  return useAnimatedStyle(() => {
    const opacity = homeDepartureOpacity(progress?.get() ?? 0, start, end);
    return {
      opacity,
      transform: [{ translateY: reduceMotion ? 0 : -lift * (1 - opacity) }],
    };
  });
}
