import { useCallback, useContext, useState } from 'react';
import { requireNativeView } from 'expo';
import { useFocusEffect } from 'expo-router';
import type { ViewProps } from 'react-native';
import Animated, { useAnimatedProps } from 'react-native-reanimated';
import { HomeDeparture, homeDepartureOpacity } from './HomeDeparture';

const NativeTabBarDeparture = Animated.createAnimatedComponent(requireNativeView<ViewProps & {
  active: boolean;
  departureOpacity?: number;
}>('StackWorkoutControls', 'TabBarDeparture'));

export function HomeTabBarDeparture() {
  const progress = useContext(HomeDeparture);
  const [active, setActive] = useState(false);
  useFocusEffect(useCallback(() => {
    setActive(true);
    return () => setActive(false);
  }, []));
  const animatedProps = useAnimatedProps(() => {
    // Match the secondary Home elements, including their spring-back.
    return { departureOpacity: homeDepartureOpacity(progress?.get() ?? 0, 0.02, 0.76) };
  });

  return <NativeTabBarDeparture active={active} animatedProps={animatedProps}
    pointerEvents="none" accessible={false} style={{ position: 'absolute', width: 0, height: 0 }} />;
}
