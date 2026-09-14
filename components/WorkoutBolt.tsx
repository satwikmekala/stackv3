import Svg, { Path } from 'react-native-svg';
import { redesignColors } from '@/constants/theme';

export function WorkoutBolt({ color = redesignColors.ink }: { color?: string }) {
  return (
    <Svg width={32} height={40} viewBox="0 0 32 40">
      <Path d="M18 1L2 24H14L11 39L30 15H17L18 1Z" fill={color} />
    </Svg>
  );
}
