import { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  type SharedValue,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { GripHorizontal, X } from 'lucide-react-native';

import { motionDuration, motionEasing } from '@/constants/motion';
import { redesignColors, redesignFonts, splitColors } from '@/constants/theme';
import {
  MUSCLE_GROUP_COLORS as GROUP_COLORS,
  getMuscleGroupForExercise,
  type DraftExercise,
} from '@/store/customSplitDraft';

/**
 * Rows are a fixed height so a drag can be expressed as whole-row strides
 * without measuring every row on every frame.
 */
export const REORDER_ROW_HEIGHT = 48;
export const REORDER_ROW_GAP = 6;
const STRIDE = REORDER_ROW_HEIGHT + REORDER_ROW_GAP;

/** Distance from the scroll viewport edge that starts auto-scrolling. */
const AUTO_SCROLL_EDGE = 76;
const AUTO_SCROLL_STEP = 9;

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(Math.max(value, min), max);
};

interface SelectedExerciseListProps {
  /**
   * Scrolls the surrounding builder ScrollView by `delta` and returns the
   * distance actually travelled (0 once the list is pinned at an end).
   */
  autoScrollBy: (delta: number) => number;
  exercises: DraftExercise[];
  /** Absolute-window bounds of the scroll viewport, read at drag start. */
  measureViewport: () => Promise<{ top: number; bottom: number }>;
  onDragStateChange: (dragging: boolean) => void;
  onRemove: (exerciseId: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function SelectedExerciseList({
  autoScrollBy,
  exercises,
  measureViewport,
  onDragStateChange,
  onRemove,
  onReorder,
}: SelectedExerciseListProps) {
  const count = exercises.length;
  const activeIndex = useSharedValue(-1);
  const dragBase = useSharedValue(0);
  const scrollAccum = useSharedValue(0);

  const dragOffset = useDerivedValue(() => dragBase.value + scrollAccum.value);
  const targetIndex = useDerivedValue(() => {
    if (activeIndex.value < 0) return -1;
    return clamp(
      activeIndex.value + Math.round(dragOffset.value / STRIDE),
      0,
      count - 1
    );
  });

  const pointerY = useRef(0);
  const viewport = useRef({ top: 0, bottom: 0 });
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimer.current !== null) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
  }, []);

  useEffect(() => stopAutoScroll, [stopAutoScroll]);

  const beginDrag = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDragStateChange(true);
    void measureViewport().then((bounds) => {
      viewport.current = bounds;
    });
    stopAutoScroll();
    autoScrollTimer.current = setInterval(() => {
      const { top, bottom } = viewport.current;
      if (bottom <= top) return;
      let delta = 0;
      if (pointerY.current < top + AUTO_SCROLL_EDGE) delta = -AUTO_SCROLL_STEP;
      else if (pointerY.current > bottom - AUTO_SCROLL_EDGE) delta = AUTO_SCROLL_STEP;
      if (delta === 0) return;
      const travelled = autoScrollBy(delta);
      // Keep the lifted row under the finger while the content moves beneath it.
      if (travelled !== 0) scrollAccum.value += travelled;
    }, 16);
  }, [autoScrollBy, measureViewport, onDragStateChange, scrollAccum, stopAutoScroll]);

  const trackPointer = useCallback((y: number) => {
    pointerY.current = y;
  }, []);

  const endDrag = useCallback(
    (from: number, to: number) => {
      stopAutoScroll();
      if (from !== to) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onReorder(from, to);
      }
      activeIndex.value = -1;
      dragBase.value = 0;
      scrollAccum.value = 0;
      onDragStateChange(false);
    },
    [activeIndex, dragBase, onDragStateChange, onReorder, scrollAccum, stopAutoScroll]
  );

  return (
    <View style={styles.selectedSection}>
      <View style={styles.sectionHeadingRow}>
        <Text style={styles.sectionHeading}>IN THIS WORKOUT</Text>
        <Text style={styles.sectionCount}>{count}</Text>
      </View>
      <View style={[styles.selectedList, { height: Math.max(0, count * STRIDE - REORDER_ROW_GAP) }]}>
        {exercises.map((exercise, index) => (
          <ExerciseRow
            activeIndex={activeIndex}
            beginDrag={beginDrag}
            count={count}
            dragOffset={dragOffset}
            endDrag={endDrag}
            exercise={exercise}
            index={index}
            key={exercise.id}
            onRemove={onRemove}
            scrollAccum={scrollAccum}
            dragBase={dragBase}
            targetIndex={targetIndex}
            trackPointer={trackPointer}
          />
        ))}
      </View>
    </View>
  );
}

interface ExerciseRowProps {
  activeIndex: SharedValue<number>;
  beginDrag: () => void;
  count: number;
  dragBase: SharedValue<number>;
  dragOffset: SharedValue<number>;
  endDrag: (from: number, to: number) => void;
  exercise: DraftExercise;
  index: number;
  onRemove: (exerciseId: number) => void;
  scrollAccum: SharedValue<number>;
  targetIndex: SharedValue<number>;
  trackPointer: (y: number) => void;
}

function ExerciseRow({
  activeIndex,
  beginDrag,
  count,
  dragBase,
  dragOffset,
  endDrag,
  exercise,
  index,
  onRemove,
  scrollAccum,
  targetIndex,
  trackPointer,
}: ExerciseRowProps) {
  const group = getMuscleGroupForExercise(exercise);
  // Set between onEnd and onFinalize so the cancel path does not double-commit.
  const settling = useSharedValue(false);

  // The drag lives on the handle only, and waits out a short long-press, so a
  // flick anywhere on the row (handle included) still scrolls the builder.
  const pan = Gesture.Pan()
    .activateAfterLongPress(180)
    .onStart(() => {
      activeIndex.value = index;
      dragBase.value = 0;
      scrollAccum.value = 0;
      runOnJS(beginDrag)();
    })
    .onUpdate((event) => {
      dragBase.value = event.translationY;
      runOnJS(trackPointer)(event.absoluteY);
    })
    .onEnd(() => {
      const to = targetIndex.value < 0 ? index : targetIndex.value;
      settling.value = true;
      // Snap to the destination slot and hold there until the draft commits,
      // so the row never flashes back to where the drag started.
      dragBase.value = (to - index) * STRIDE - scrollAccum.value;
      runOnJS(endDrag)(index, to);
    })
    .onFinalize(() => {
      if (!settling.value && activeIndex.value === index) {
        activeIndex.value = -1;
        dragBase.value = 0;
        scrollAccum.value = 0;
        runOnJS(endDrag)(index, index);
      }
      settling.value = false;
    });

  const animatedStyle = useAnimatedStyle(() => {
    const active = activeIndex.value === index;
    if (active) {
      return {
        transform: [{ translateY: dragOffset.value }, { scale: 1.02 }],
        zIndex: 20,
        elevation: 10,
        shadowOpacity: 0.45,
      };
    }

    const from = activeIndex.value;
    const to = targetIndex.value;
    let shift = 0;
    if (from >= 0) {
      if (from < index && to >= index) shift = -STRIDE;
      else if (from > index && to <= index) shift = STRIDE;
    }
    return {
      transform: [
        {
          translateY: withTiming(shift, {
            duration: motionDuration.feedback,
            easing: motionEasing.decelerate,
          }),
        },
        { scale: 1 },
      ],
      zIndex: 0,
      elevation: 0,
      shadowOpacity: 0,
    };
  }, [count, index]);

  return (
    <Animated.View
      style={[styles.selectedExerciseRow, { top: index * STRIDE }, animatedStyle]}
    >
      <GestureDetector gesture={pan}>
        <View
          accessibilityHint="Press and hold, then drag to reorder"
          accessibilityLabel={`Reorder ${exercise.name}`}
          accessibilityRole="adjustable"
          style={styles.dragHandle}
        >
          <GripHorizontal color={redesignColors.ashDim} size={19} strokeWidth={2} />
        </View>
      </GestureDetector>
      <View style={[styles.exerciseDot, { backgroundColor: GROUP_COLORS[group] }]} />
      <Text numberOfLines={1} style={styles.selectedExerciseName}>{exercise.name}</Text>
      <Pressable
        accessibilityLabel={`Remove ${exercise.name}`}
        accessibilityRole="button"
        hitSlop={10}
        onPress={() => onRemove(exercise.id)}
      >
        <X color={redesignColors.ashDim} size={19} strokeWidth={2.5} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  selectedSection: { marginTop: 23 },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeading: {
    color: redesignColors.ashDim,
    fontFamily: redesignFonts.monoBold,
    fontSize: 13,
    letterSpacing: 2.1,
  },
  sectionCount: { color: splitColors.chest, fontFamily: redesignFonts.monoBold, fontSize: 14 },
  selectedList: { position: 'relative' },
  selectedExerciseRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: REORDER_ROW_HEIGHT,
    paddingRight: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000000',
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  dragHandle: {
    height: REORDER_ROW_HEIGHT,
    paddingLeft: 16,
    paddingRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseDot: { width: 9, height: 9, borderRadius: 5 },
  selectedExerciseName: {
    minWidth: 0,
    flex: 1,
    color: redesignColors.bone,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 18,
  },
});
