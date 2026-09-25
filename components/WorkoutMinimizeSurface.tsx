import { useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation, Easing, Extrapolation, ReduceMotion, interpolate, interpolateColor, LayoutAnimationConfig,
  runOnJS, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { ActiveWorkoutCard } from '@/components/ActiveWorkoutCard';
import { redesignColors } from '@/constants/theme';
import { WORKOUT_BAR_SIDE_INSET, useWorkoutMinimizeTarget } from '@/store/workoutMinimizeTarget';
import type { WorkoutSession } from '@/store/workoutStore';

export type WorkoutMinimizeHandle = { minimize: () => void };

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
  const progress = useSharedValue(expandFromCard ? 1 : 0);
  const minimizing = useRef(false);
  const [isExpanding, setIsExpanding] = useState(expandFromCard);
  const [isMinimizing, setIsMinimizing] = useState(false);
  const bottom = target.bottom ?? insets.bottom + 88;
  const left = insets.left + WORKOUT_BAR_SIDE_INSET;
  const right = insets.right + WORKOUT_BAR_SIDE_INSET;

  const finishExpanding = useCallback(() => setIsExpanding(false), []);
  useEffect(() => {
    if (!expandFromCard) return;

    // Expand along the collapse path with a quick start and a soft, non-overshooting finish.
    progress.value = withTiming(0, {
      duration: 380,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      reduceMotion: ReduceMotion.System,
    }, (finished) => {
      if (finished) runOnJS(finishExpanding)();
    });
    return () => cancelAnimation(progress);
  }, [expandFromCard, finishExpanding, progress]);

  const isTransitioning = isMinimizing || isExpanding;

  useImperativeHandle(ref, () => ({
    minimize() {
      if (minimizing.current || isExpanding) return;
      minimizing.current = true;
      setIsMinimizing(true);
      progress.value = withTiming(1, {
        duration: 460,
        easing: Easing.inOut(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }, (finished) => {
        if (finished) runOnJS(onMinimize)();
      });
    },
  }), [isExpanding, onMinimize, progress]);

  const surfaceStyle = useAnimatedStyle(() => ({
    top: progress.value * (height - bottom - target.height),
    left: progress.value * left,
    width: width - progress.value * (left + right),
    height: height + progress.value * (target.height - height),
    borderRadius: progress.value * 16,
    backgroundColor: interpolateColor(progress.value, [0, 1], [redesignColors.ink, redesignColors.surface]),
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.55], [1, 0], Extrapolation.CLAMP),
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.5, 1], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <View style={styles.container} pointerEvents={isTransitioning ? 'box-only' : 'auto'}>
      <Animated.View style={[styles.surface, surfaceStyle]}>
        <Animated.View
          accessibilityElementsHidden={isTransitioning}
          importantForAccessibility={isTransitioning ? 'no-hide-descendants' : 'auto'}
          style={[{ width, height }, contentStyle]}
        >
          <LayoutAnimationConfig skipEntering={expandFromCard}>
            {children}
          </LayoutAnimationConfig>
        </Animated.View>
        {isTransitioning && (
          <Animated.View pointerEvents="none" accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, cardStyle]}>
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
