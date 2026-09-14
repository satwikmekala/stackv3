import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { WorkoutBolt } from '@/components/WorkoutBolt';
import { redesignColors } from '@/constants/theme';
import type { WorkoutLaunchOrigin } from '@/utils/workoutLaunch';

const LaunchProgress = createContext<SharedValue<number> | null>(null);
const EXPAND = Easing.bezier(0.32, 0, 0.18, 1).factory();
const DURATION = 880;
const CIRCLE_COVERED = 0.55;
const REVEAL_START = CIRCLE_COVERED + 0.09;

function phase(value: number, start: number, end: number) {
  'worklet';
  return interpolate(value, [start, end], [0, 1], Extrapolation.CLAMP);
}

/** The button stays a true circle until its edge has passed every screen corner.
 * Only then does its accent dissolve into the workout. Content is kept at its
 * final screen size inside the clip so the reveal never stretches the text. */
export function WorkoutLaunchSurface({ origin, children }: {
  origin: WorkoutLaunchOrigin | null;
  children: ReactNode;
}) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [initialViewport] = useState({ width, height });
  const [active, setActive] = useState(Boolean(origin) && !reduceMotion);
  const progress = useSharedValue(active ? 0 : 1);
  const finish = useCallback(() => setActive(false), []);
  const x = Math.max(0, Math.min(width, origin?.x ?? width / 2));
  const y = Math.max(0, Math.min(height, origin?.y ?? height / 2));
  const size = origin?.size ?? 92;
  const color = origin?.color ?? redesignColors.accent;
  const coverDiameter = 2 * Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) + 4;

  useEffect(() => {
    if (!active) return;
    // Finish in place if the window changes during the reveal.
    if (width !== initialViewport.width || height !== initialViewport.height) {
      cancelAnimation(progress);
      progress.value = 1;
      finish();
      return;
    }
    progress.value = withTiming(1, {
      duration: DURATION,
      easing: Easing.linear,
      reduceMotion: ReduceMotion.System,
    }, (finished) => {
      if (finished) runOnJS(finish)();
    });
    return () => cancelAnimation(progress);
  }, [active, finish, height, initialViewport, progress, width]);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45, 0.84, 1], [0, 0.65, 0.65, 0]),
  }));
  const surfaceStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const expansion = EXPAND(phase(p, 0.1, CIRCLE_COVERED));
    const compressedSize = size * interpolate(p, [0, 0.1], [1, 0.91], Extrapolation.CLAMP);
    const diameter = compressedSize + (coverDiameter - compressedSize) * expansion;
    // Once fully revealed, restore ordinary viewport bounds so minimize/resume
    // can use the transparent route without retaining an oversized surface.
    if (p === 1) return { left: 0, top: 0, width, height, borderRadius: 0, backgroundColor: 'transparent' };
    return {
      left: x - diameter / 2,
      top: y - diameter / 2,
      width: diameter,
      height: diameter,
      borderRadius: diameter / 2,
      backgroundColor: interpolateColor(p, [CIRCLE_COVERED + 0.04, 0.8], [color, redesignColors.ink]),
    };
  });
  const contentStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const expansion = EXPAND(phase(p, 0.1, CIRCLE_COVERED));
    const compressedSize = size * interpolate(p, [0, 0.1], [1, 0.91], Extrapolation.CLAMP);
    const diameter = compressedSize + (coverDiameter - compressedSize) * expansion;
    return {
      // Counter-translate the clip's origin, keeping destination geometry stable.
      left: p === 1 ? 0 : diameter / 2 - x,
      top: p === 1 ? 0 : diameter / 2 - y,
      opacity: phase(p, REVEAL_START, 0.84),
    };
  });
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.1, 0.24, 0.52], [0, 0.42, 0.24, 0], Extrapolation.CLAMP),
    transform: [{ scale: 1 + Easing.out(Easing.cubic)(phase(progress.value, 0.06, 0.52)) * 1.5 }],
  }));
  const boltStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 0.1, 0.25], [1, 0.91, 1], Extrapolation.CLAMP) },
    ],
  }));
  const darkBoltStyle = useAnimatedStyle(() => ({
    opacity: 1 - phase(progress.value, 0.06, 0.12),
  }));
  // Keep the symbol anchored: white on release, a brief dim during expansion,
  // then a final white blink precisely when the circle covers the viewport.
  // Its fade hands directly into the screen reveal on the same UI-thread clock.
  const sparkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.06, 0.12, 0.2, 0.3, 0.44, CIRCLE_COVERED, CIRCLE_COVERED + 0.035, REVEAL_START + 0.01],
      [0, 0, 1, 1, 0.12, 0.12, 1, 1, 0],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <LaunchProgress.Provider value={progress}>
      <View style={styles.viewport} pointerEvents={active ? 'box-only' : 'box-none'}>
        {active && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]} />}
        {active && (
          <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
            style={[styles.ring, {
              left: x - size / 2, top: y - size / 2, width: size, height: size,
              borderRadius: size / 2, borderColor: color, shadowColor: color,
            }, ringStyle]} />
        )}
        <Animated.View style={[styles.surface, surfaceStyle]}>
          <Animated.View
            accessibilityElementsHidden={active}
            importantForAccessibility={active ? 'no-hide-descendants' : 'auto'}
            style={[styles.content, { width, height }, contentStyle]}
          >
            {children}
          </Animated.View>
        </Animated.View>
        {active && (
          <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
            style={[styles.bolt, { left: x - size / 2, top: y - size / 2, width: size, height: size }, boltStyle]}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.spark, darkBoltStyle]}>
              <WorkoutBolt />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, styles.spark, sparkStyle]}>
              <WorkoutBolt color="#FFFFFF" />
            </Animated.View>
          </Animated.View>
        )}
      </View>
    </LaunchProgress.Provider>
  );
}

/** Small arrival offsets let the workout's hierarchy settle in sequence. */
export function WorkoutLaunchSection({ order = 0, children, fill = false }: {
  order?: number;
  children: ReactNode;
  fill?: boolean;
}) {
  const progress = useContext(LaunchProgress);
  const style = useAnimatedStyle(() => {
    const arrival = Easing.out(Easing.cubic)(phase(progress?.value ?? 1, REVEAL_START + order * 0.035, 0.9 + order * 0.03));
    return { opacity: arrival, transform: [{ translateY: (1 - arrival) * (18 + order * 8) }] };
  });
  return <Animated.View style={[fill && styles.root, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  viewport: { flex: 1, overflow: 'hidden' },
  scrim: { backgroundColor: '#080A10' },
  surface: { position: 'absolute', overflow: 'hidden' },
  content: { position: 'absolute' },
  ring: { position: 'absolute', borderWidth: 1, shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  bolt: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  spark: { alignItems: 'center', justifyContent: 'center' },
});
