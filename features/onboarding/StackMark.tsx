import { View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { StackLogo } from '@/components/StackLogo';

// The official logo settling into place. Reduce Motion shows it at rest.
export function StackMark({ size }: { size: number }) {
  return <View accessible accessibilityRole="image" accessibilityLabel="Stack">
    <Animated.View entering={FadeInDown.delay(80).duration(520).reduceMotion(ReduceMotion.System)
      .withInitialValues({ opacity: 0, transform: [{ translateY: -12 }] })}>
      <StackLogo size={size} />
    </Animated.View>
  </View>;
}
