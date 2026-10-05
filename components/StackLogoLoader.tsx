import { useEffect } from 'react';
import { Image, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

// The three tiles of assets/images/logo.png, back to front. Measured on its
// 806px mark: each tile is 616px, offset 95px per step down and to the right.
// The file names must not contain spaces: iOS silently fails to draw those assets.
const TILE = 616 / 806;
const STEP = 95 / 806;
const PIECES = [
  { source: require('@/assets/images/logo-tile-light.png'), offset: 2 },
  { source: require('@/assets/images/logo-tile-medium.png'), offset: 1 },
  { source: require('@/assets/images/logo-tile-hard.png'), offset: 0 },
] as const;

const APPEAR_MS = 380;
const STAGGER_MS = 260;
const HOLD_MS = 900;
const FADE_MS = 420;
const REST_MS = 260;
const CYCLE_MS = STAGGER_MS * 2 + APPEAR_MS + HOLD_MS + FADE_MS + REST_MS;
const ease = Easing.bezier(0.2, 0, 0, 1);

/**
 * One tile's loop as a single progress value: 0 → 1 settles it in, 1 holds,
 * 1 → 2 fades it out in place, then it resets while invisible. Tiles start in
 * turn (light, medium, brightest) and fade out together as one logo.
 */
function cycle(order: number) {
  const before = order * STAGGER_MS;
  const hold = CYCLE_MS - before - APPEAR_MS - FADE_MS - REST_MS;
  return withRepeat(withSequence(
    withTiming(0, { duration: 0 }),
    withDelay(before, withTiming(1, { duration: APPEAR_MS, easing: ease })),
    withDelay(hold, withTiming(2, { duration: FADE_MS, easing: Easing.out(Easing.quad) })),
    withDelay(REST_MS, withTiming(2, { duration: 0 })),
  ), -1);
}

function Tile({ source, offset, size, progress }: { source: number; offset: number; size: number; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const settle = p < 1 ? (1 - p) * size * 0.04 : 0;
    return { opacity: p <= 1 ? p : 2 - p, transform: [{ translateX: -settle }, { translateY: -settle }] };
  });
  const tile = size * TILE;
  return <Animated.View style={[{ position: 'absolute', left: offset * STEP * size, top: offset * STEP * size, width: tile, height: tile }, style]}>
    <Image source={source} fadeDuration={0} style={{ width: tile, height: tile }} />
  </Animated.View>;
}

/** Stack's logo assembling tile by tile, for as long as something is loading. Reduce Motion shows the logo at rest. */
export function StackLogoLoader({ size = 72, label }: { size?: number; label: string }) {
  const reduceMotion = useReducedMotion();
  const light = useSharedValue(reduceMotion ? 1 : 0);
  const medium = useSharedValue(reduceMotion ? 1 : 0);
  const hard = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    const values = [light, medium, hard];
    values.forEach((value, order) => { value.value = reduceMotion ? 1 : cycle(order); });
    return () => values.forEach(cancelAnimation);
  }, [reduceMotion, light, medium, hard]);
  const progress = [light, medium, hard];
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityState={{ busy: true }}
    style={{ width: size, height: size }}>
    {PIECES.map((piece, index) => <Tile key={piece.offset} source={piece.source} offset={piece.offset} size={size} progress={progress[index]} />)}
  </View>;
}
