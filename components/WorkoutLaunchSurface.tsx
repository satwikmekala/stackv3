import { createContext, useCallback, useContext, useEffect, useId, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  cancelAnimation, Easing, Extrapolation, interpolate, ReduceMotion, runOnJS,
  useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { redesignColors } from '@/constants/theme';
import { WorkoutBolt } from '@/components/WorkoutBolt';
import type { WorkoutLaunchOrigin } from '@/utils/workoutLaunch';

const LaunchProgress = createContext<SharedValue<number> | null>(null);
const DURATION = 720;
const REVEAL_START = 0.32;
const EASE = Easing.bezier(0.22, 1, 0.36, 1).factory();

function phase(value: number, start: number, end: number) {
  'worklet';
  return interpolate(value, [start, end], [0, 1], Extrapolation.CLAMP);
}

/** The handle dissolves around its stationary bolt. A single restrained pulse
 * releases into the workout's entrance, all on the same UI-thread clock. */
export function WorkoutLaunchSurface({ origin, children }: {
  origin: WorkoutLaunchOrigin | null;
  children: ReactNode;
}) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [initialViewport] = useState({ width, height });
  const [active, setActive] = useState(Boolean(origin));
  const progress = useSharedValue(origin ? 0 : 1);
  const finish = useCallback(() => setActive(false), []);
  const x = Math.max(0, Math.min(width, origin?.x ?? width / 2));
  const y = Math.max(0, Math.min(height, origin?.y ?? height / 2));
  const size = origin?.size ?? 56;
  const color = origin?.color ?? redesignColors.accent;
  const glowId = `launch-glow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  useEffect(() => {
    if (!active) return;
    // Finish immediately if the original launch geometry is no longer valid.
    if (width !== initialViewport.width || height !== initialViewport.height) {
      cancelAnimation(progress);
      progress.set(1);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Settle an interrupted viewport transition before the next paint.
      finish();
      return;
    }
    progress.set(withTiming(1, {
      duration: reduceMotion ? 160 : DURATION,
      easing: Easing.linear,
      // Reduced motion uses a short dissolve, not spatial movement.
      reduceMotion: ReduceMotion.Never,
    }, finished => { if (finished) runOnJS(finish)(); }));
    return () => cancelAnimation(progress);
  }, [active, finish, height, initialViewport, progress, reduceMotion, width]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? progress.get() : phase(progress.get(), 0, 0.14),
  }));
  const discStyle = useAnimatedStyle(() => ({
    opacity: 1 - phase(progress.get(), 0.02, 0.22),
    transform: [{ scale: 1 - EASE(phase(progress.get(), 0, 0.22)) * 0.22 }],
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? progress.get() : phase(progress.get(), REVEAL_START, 0.91),
  }));
  const boltStyle = useAnimatedStyle(() => ({
    opacity: 1 - phase(progress.get(), 0.3, 0.57),
    transform: [{ scale: interpolate(progress.get(), [0, 0.12, 0.28, 0.57], [1, 0.92, 1.32, 1.48], Extrapolation.CLAMP) }],
  }));
  const darkBoltStyle = useAnimatedStyle(() => ({
    opacity: 1 - phase(progress.get(), 0.08, 0.2),
  }));
  const lightBoltStyle = useAnimatedStyle(() => ({
    opacity: phase(progress.get(), 0.08, 0.2),
  }));
  const glowStyle = useAnimatedStyle(() => ({
    // A local pool of light, not a full-screen white frame or repeating blink.
    opacity: interpolate(progress.get(), [0, 0.1, 0.24, 0.42, 0.7], [0, 0, 0.3, 0.14, 0], Extrapolation.CLAMP),
    transform: [{ scale: 0.28 + EASE(phase(progress.get(), 0.1, 0.7)) * 0.9 }],
  }));

  return <LaunchProgress.Provider value={progress}>
    <View style={styles.viewport} pointerEvents={active ? 'box-only' : 'box-none'}>
      {active && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />}
      {active && !reduceMotion && <>
        <Animated.View pointerEvents="none" style={[styles.disc, {
          left: x - size / 2, top: y - size / 2, width: size, height: size,
          borderRadius: size / 2, backgroundColor: color,
        }, discStyle]} />
        <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          style={[styles.glow, { left: x - 120, top: y - 120 }, glowStyle]}>
          <Svg width={240} height={240}>
            <Defs><RadialGradient id={glowId} cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor={color} stopOpacity={1} />
              <Stop offset="0.3" stopColor={color} stopOpacity={0.45} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </RadialGradient></Defs>
            <Rect width={240} height={240} fill={`url(#${glowId})`} />
          </Svg>
        </Animated.View>
        <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          style={[styles.bolt, { left: x - size / 2, top: y - size / 2, width: size, height: size }, boltStyle]}>
          <Animated.View style={[styles.symbol, darkBoltStyle]}><WorkoutBolt width={22} height={27.5} /></Animated.View>
          <Animated.View style={[styles.symbol, lightBoltStyle]}><WorkoutBolt width={22} height={27.5} color={redesignColors.bone} /></Animated.View>
        </Animated.View>
      </>}
      <Animated.View accessibilityElementsHidden={active} importantForAccessibility={active ? 'no-hide-descendants' : 'auto'}
        style={[styles.content, contentStyle]}>
        {children}
      </Animated.View>
    </View>
  </LaunchProgress.Provider>;
}

/** The existing staggered entrance settles directly out of the bolt pulse. */
export function WorkoutLaunchSection({ order = 0, children, fill = false }: {
  order?: number; children: ReactNode; fill?: boolean;
}) {
  const progress = useContext(LaunchProgress);
  const reduceMotion = useReducedMotion();
  const style = useAnimatedStyle(() => {
    const arrival = EASE(phase(progress?.get() ?? 1, REVEAL_START + order * 0.045, 0.88 + order * 0.055));
    return { opacity: reduceMotion ? 1 : arrival, transform: [{ translateY: reduceMotion ? 0 : (1 - arrival) * (14 + order * 5) }] };
  });
  return <Animated.View style={[fill && styles.root, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  viewport: { flex: 1, overflow: 'hidden' },
  backdrop: { backgroundColor: redesignColors.ink },
  content: { flex: 1 },
  disc: { position: 'absolute' },
  glow: { position: 'absolute', width: 240, height: 240 },
  bolt: { position: 'absolute' },
  symbol: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
