import { useCallback, useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter } from 'expo-router';
import {
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  clamp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';
import { ActiveWorkoutCard } from '@/components/ActiveWorkoutCard';
import { WORKOUT_BAR_SIDE_INSET, useWorkoutMinimizeTarget } from '@/store/workoutMinimizeTarget';
import { useWorkoutStore } from '@/store/workoutStore';
import { resumeWorkout } from '@/utils/workoutResume';

// Match FloatingTabBar's existing 64px height + 12px bottom offset without
// changing the tab bar. Leave another 12px between the two controls.
const TAB_BAR_HEIGHT = 64;
const BOTTOM_GAP = 12;
// The card can be dragged up to this far below the status bar.
const TOP_GAP = 12;
// Vertical travel before a touch becomes a drag, so taps still resume.
const DRAG_SLOP = 8;

// iOS draws the bar in its own window (FullWindowOverlay), which needs its own
// gesture root; elsewhere the app's root already provides one.
const BarRoot = Platform.OS === 'ios' ? GestureHandlerRootView : View;

export function ActiveWorkoutBar() {
  const currentSession = useWorkoutStore((state) => state.currentSession);
  const pathname = usePathname();
  const router = useRouter();
  const resumingRef = useRef(false);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const cardHeight = useWorkoutMinimizeTarget((state) => state.height);
  const savedLift = useWorkoutMinimizeTarget((state) => state.lift);

  // Resting position: just above the tab bar, which the card never overlaps.
  // Screens without the tab bar (e.g. Settings) keep the same limit, so the
  // card stays where the user left it instead of snapping down.
  const bottom = insets.bottom + BOTTOM_GAP + TAB_BAR_HEIGHT + BOTTOM_GAP;
  const maxLift = Math.max(0, height - insets.top - TOP_GAP - bottom - cardHeight);
  const restingLift = Math.min(savedLift, maxLift);

  const lift = useSharedValue(restingLift);
  const dragStart = useSharedValue(0);

  // A smaller range (e.g. rotating or resizing) pulls the card back inside it.
  useEffect(() => {
    lift.set((value) => Math.min(value, maxLift));
  }, [lift, maxLift]);

  useEffect(() => {
    resumingRef.current = false;
    if (pathname !== '/workout') {
      useWorkoutMinimizeTarget.setState({ bottom: bottom + restingLift });
    }
  }, [bottom, pathname, restingLift]);

  const saveLift = useCallback((value: number) => {
    useWorkoutMinimizeTarget.setState({ lift: value });
  }, []);

  // A flick carries the card with momentum and settles inside the range.
  const drag = useMemo(() => Gesture.Pan()
    .activeOffsetY([-DRAG_SLOP, DRAG_SLOP])
    .onBegin(() => {
      cancelAnimation(lift);
      dragStart.set(lift.get());
    })
    .onUpdate((event) => {
      lift.set(clamp(dragStart.get() - event.translationY, 0, maxLift));
    })
    .onEnd((event) => {
      lift.set(withDecay(
        { velocity: -event.velocityY, clamp: [0, maxLift] },
        (finished) => {
          if (finished) runOnJS(saveLift)(lift.get());
        }
      ));
    }), [dragStart, lift, maxLift, saveLift]);

  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -lift.get() }],
  }));

  if (!currentSession || pathname === '/workout') return null;

  const bar = (
    <BarRoot
      collapsable={false}
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, { width, height }]}
    >
      <GestureDetector gesture={drag}>
        <Animated.View
          onLayout={(event) => {
            useWorkoutMinimizeTarget.setState({ height: event.nativeEvent.layout.height });
          }}
          style={[
            {
              position: 'absolute',
              bottom,
              left: insets.left + WORKOUT_BAR_SIDE_INSET,
              right: insets.right + WORKOUT_BAR_SIDE_INSET,
            },
            liftStyle,
          ]}
        >
          <ActiveWorkoutCard
            session={currentSession}
            onPress={() => {
              if (resumingRef.current) return;
              resumingRef.current = true;
              resumeWorkout(router);
            }}
          />
        </Animated.View>
      </GestureDetector>
    </BarRoot>
  );

  // Settings is a native modal on iOS. A plain Stack sibling sits beneath it;
  // this existing screens primitive keeps the in-app bar above that modal.
  return Platform.OS === 'ios' ? (
    <FullWindowOverlay unstable_accessibilityContainerViewIsModal={false}>
      {bar}
    </FullWindowOverlay>
  ) : bar;
}
