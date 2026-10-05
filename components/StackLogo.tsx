import { Image, View } from 'react-native';

/** The official Stack logo. Its 1563px canvas pads the mark, which fills the 806px square at (378, 378). */
export const STACK_LOGO = require('@/assets/images/logo.png');
const CANVAS = 1563;
const MARK_ORIGIN = 378;
const MARK_SIZE = 806;

/** The official Stack logo (assets/images/logo.png), cropped to the mark so `size` is the mark itself. */
export function StackLogo({ size }: { size: number }) {
  const scale = size / MARK_SIZE;
  return (
    <View style={{ width: size, height: size, overflow: 'hidden' }}>
      <Image source={STACK_LOGO} fadeDuration={0} style={{ position: 'absolute', width: CANVAS * scale,
        height: CANVAS * scale, left: -MARK_ORIGIN * scale, top: -MARK_ORIGIN * scale }} />
    </View>
  );
}
