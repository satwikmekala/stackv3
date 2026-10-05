import { useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation, Easing, Extrapolation, ReduceMotion, interpolate, interpolateColor, LayoutAnimationConfig,
  runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated';
import { ActiveWorkoutCard } from '@/components/ActiveWorkoutCard';
import { redesignColors } from '@/constants/theme';
import { WORKOUT_BAR_SIDE_INSET, useWorkoutMinimizeTarget } from '@/store/workoutMinimizeTarget';
import type { WorkoutSession } from '@/store/workoutStore';

export type WorkoutMinimizeHandle = { minimize: () => void };

// Near-critical damping: immediate travel, a quiet landing, no bounce beyond
// the card's bounds. Expansion and collapse share a spring so a new target
// preserves velocity when the user minimizes during an arrival.
const SURFACE_SPRING = {
  stiffness: 500,
  damping: 45,
  mass: 1,
  overshootClamping: true,
  energyThreshold: 0.000001,
  reduceMotion: ReduceMotion.System,
};

export function WorkoutMinimizeSurface({ children, session, onMinimize, expandFromCard = false, ref }: {
  children: ReactNode;
  session: WorkoutSession;
  onMinimize: () => void;
  expandFromCard?: boolean;
  ref: Ref<WorkoutMinimizeHandle>;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const target = useWorkoutMinimizeTarget();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(expandFromCard ? 1 : 0);
  const minimizing = useRef(false);
  const [isExpanding, setIsExpanding] = useState(expandFromCard);
  const [isMinimizing, setIsMinimizing] = useState(false);
  const bottom = Math.min(target.bottom ?? insets.bottom + 88, Math.max(0, height - insets.top - target.height));
  const left = insets.left + WORKOUT_BAR_SIDE_INSET;
  const right = insets.right + WORKOUT_BAR_SIDE_INSET;
  const cardWidth = Math.max(1, width - left - right);
  const cardHeight = Math.max(1, Math.min(target.height, height - insets.top - bottom));
  const cardTop = Math.max(insets.top, height - bottom - cardHeight);

  const finishExpanding = useCallback(() => setIsExpanding(false), []);
  useEffect(() => () => cancelAnimation(progress), [progress]);
  useEffect(() => {
    if (!expandFromCard) return;

    const complete = (finished?: boolean) => {
      'worklet';
      if (finished) runOnJS(finishExpanding)();
    };
    progress.set(reduceMotion
      ? withTiming(0, { duration: 130, easing: Easing.linear, reduceMotion: ReduceMotion.Never }, complete)
      : withSpring(0, SURFACE_SPRING, complete));
    return () => cancelAnimation(progress);
  }, [expandFromCard, finishExpanding, progress, reduceMotion]);

  const isTransitioning = isMinimizing || isExpanding;

  useImperativeHandle(ref, () => ({
    minimize() {
      if (minimizing.current) return;
      minimizing.current = true;
      setIsMinimizing(true);
      const complete = (finished?: boolean) => {
        'worklet';
        if (finished) runOnJS(onMinimize)();
      };
      progress.set(reduceMotion
        ? withTiming(1, { duration: 130, easing: Easing.linear, reduceMotion: ReduceMotion.Never }, complete)
        : withSpring(1, SURFACE_SPRING, complete));
    },
  }), [onMinimize, progress, reduceMotion]);

  const surfaceStyle = useAnimatedStyle(() => ({
    top: reduceMotion ? 0 : progress.value * cardTop,
    left: reduceMotion ? 0 : progress.value * left,
    width: reduceMotion ? width : width + progress.value * (cardWidth - width),
    height: reduceMotion ? height : height + progress.value * (cardHeight - height),
    borderRadius: reduceMotion ? 0 : progress.value * 16,
    opacity: reduceMotion ? 1 - progress.value : 1,
    backgroundColor: interpolateColor(progress.value, [0, 1], [redesignColors.ink, redesignColors.surface]),
  }));
  const contentStyle = useAnimatedStyle(() => {
    const scale = reduceMotion ? 1 : (width + progress.value * (cardWidth - width)) / width;
    return {
      opacity: reduceMotion ? 1 : interpolate(progress.value, [0, 0.42], [1, 0], Extrapolation.CLAMP),
      // Transform the snapshot-sized content instead of reflowing its layout or
      // slicing unscaled controls off as the surface becomes narrower.
      transform: [
        { translateX: (scale - 1) * width / 2 },
        { translateY: (scale - 1) * height / 2 },
        { scale },
      ],
    };
  });
  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.42, 0.85], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateX: (width + progress.value * (cardWidth - width) - cardWidth) / 2 }],
  }));

  return (
    <View style={styles.container} pointerEvents={isMinimizing ? 'box-only' : 'auto'}>
      <Animated.View style={[styles.surface, surfaceStyle]}>
        <Animated.View
          accessibilityElementsHidden={isMinimizing}
          importantForAccessibility={isMinimizing ? 'no-hide-descendants' : 'auto'}
          style={[{ width, height }, contentStyle]}
        >
          <LayoutAnimationConfig skipEntering={expandFromCard}>
            {children}
          </LayoutAnimationConfig>
        </Animated.View>
        {isTransitioning && !reduceMotion && (
          <Animated.View pointerEvents="none" accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[{ position: 'absolute', bottom: 0, width: cardWidth, height: cardHeight }, cardStyle]}>
            <ActiveWorkoutCard session={session} style={{ flex: 1 }} />
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  surface: { position: 'absolute', overflow: 'hidden', borderCurve: 'continuous' },
});
