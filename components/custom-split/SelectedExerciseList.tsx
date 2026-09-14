import { useCallback, useEffect, useLayoutEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  type AnimatedRef,
  type SharedValue,
  cancelAnimation,
  runOnJS,
  runOnUI,
  scrollTo,
  useAnimatedReaction,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { GripHorizontal, Plus, X } from 'lucide-react-native';

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
const AUTO_SCROLL_SPEED = 9 / 16; // Points per millisecond, independent of refresh rate.
const TARGET_HYSTERESIS = 6; // Extra travel past the midpoint before changing slots.

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(Math.max(value, min), max);
};

interface DragValues {
  activeId: SharedValue<number>;
  startIndex: SharedValue<number>;
  targetIndex: SharedValue<number>;
  // 0: idle, 1: dragging, 2: snapping, 3: waiting for the React order commit.
  phase: SharedValue<number>;
  dragBase: SharedValue<number>;
  scrollAccum: SharedValue<number>;
  pointerY: SharedValue<number>;
  positions: SharedValue<Record<number, number>>;
}

interface SelectedExerciseListProps {
  scrollRef: AnimatedRef<Animated.ScrollView>;
  scrollOffset: SharedValue<number>;
  maxScrollOffset: SharedValue<number>;
  exercises: DraftExercise[];
  /** Absolute-window bounds of the scroll viewport, read at drag start. */
  measureViewport: () => Promise<{ top: number; bottom: number }>;
  onAdd: () => void;
  onDragStateChange: (dragging: boolean) => void;
  onRemove: (exerciseId: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function SelectedExerciseList({
  scrollRef,
  scrollOffset,
  maxScrollOffset,
  exercises,
  measureViewport,
  onAdd,
  onDragStateChange,
  onRemove,
  onReorder,
}: SelectedExerciseListProps) {
  const count = exercises.length;
  const activeId = useSharedValue(-1);
  const startIndex = useSharedValue(-1);
  const targetIndex = useSharedValue(-1);
  const phase = useSharedValue(0);
  const dragBase = useSharedValue(0);
  const scrollAccum = useSharedValue(0);
  const pointerY = useSharedValue(0);
  const positions = useSharedValue<Record<number, number>>(
    Object.fromEntries(exercises.map((exercise, index) => [exercise.id, index]))
  );
  const viewport = useSharedValue({ top: 0, bottom: 0 });
  const dragSession = useSharedValue(0);
  const drag: DragValues = {
    activeId, startIndex, targetIndex, phase, dragBase, scrollAccum, pointerY, positions,
  };

  // Rows keep UI-owned absolute positions across React's array commit. Updating
  // indices in React can therefore never combine a new top with an old transform.
  useLayoutEffect(() => {
    const nextPositions = Object.fromEntries(
      exercises.map((exercise, index) => [exercise.id, index])
    );
    runOnUI(() => {
      cancelAnimation(dragBase);
      positions.value = nextPositions;
      activeId.value = -1;
      targetIndex.value = -1;
      dragBase.value = 0;
      scrollAccum.value = 0;
      phase.value = 0;
    })();
  }, [exercises, positions, activeId, targetIndex, dragBase, scrollAccum, phase]);

  useEffect(() => () => {
    runOnUI(() => {
      cancelAnimation(dragBase);
      dragSession.value += 1;
      phase.value = 0;
    })();
    onDragStateChange(false);
  }, [dragBase, dragSession, onDragStateChange, phase]);

  useAnimatedReaction(
    () => phase.value === 1 ? startIndex.value + (dragBase.value + scrollAccum.value) / STRIDE : null,
    (slot) => {
      if (slot === null) return;
      let next = targetIndex.value;
      const margin = TARGET_HYSTERESIS / STRIDE;
      while (next < count - 1 && slot > next + 0.5 + margin) next += 1;
      while (next > 0 && slot < next - 0.5 - margin) next -= 1;
      targetIndex.value = next;
    },
    [count]
  );

  useFrameCallback(({ timeSincePreviousFrame }) => {
    if (phase.value !== 1 || viewport.value.bottom <= viewport.value.top) return;
    let direction = 0;
    if (pointerY.value < viewport.value.top + AUTO_SCROLL_EDGE) direction = -1;
    else if (pointerY.value > viewport.value.bottom - AUTO_SCROLL_EDGE) direction = 1;
    if (direction === 0) return;
    const delta = direction * AUTO_SCROLL_SPEED * Math.min(timeSincePreviousFrame ?? 16, 32);
    const next = clamp(scrollOffset.value + delta, 0, maxScrollOffset.value);
    const travelled = next - scrollOffset.value;
    if (travelled === 0) return;
    // One UI frame issues the native scroll and the matching finger compensation.
    scrollTo(scrollRef, 0, next, false);
    scrollOffset.value = next;
    scrollAccum.value += travelled;
  });

  const beginDrag = useCallback((session: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDragStateChange(true);
    void measureViewport().then((bounds) => {
      runOnUI(() => {
        if (dragSession.value === session && phase.value === 1) viewport.value = bounds;
      })();
    });
  }, [dragSession, measureViewport, onDragStateChange, phase, viewport]);

  const commitDrag = useCallback((from: number, to: number) => {
    if (from !== to) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onReorder(from, to);
      // The exercises layout effect acknowledges the new order before unlocking.
    } else {
      phase.value = 0;
    }
    onDragStateChange(false);
  }, [onDragStateChange, onReorder, phase]);

  const settleDrag = (cancelled: boolean) => {
    'worklet';
    phase.value = 2; // Immediately stops edge scrolling, including during the snap.
    const from = startIndex.value;
    const to = cancelled ? from : targetIndex.value;
    targetIndex.value = to;
    dragBase.value = withTiming(
      (to - from) * STRIDE - scrollAccum.value,
      { duration: motionDuration.feedback, easing: motionEasing.decelerate },
      (finished) => {
        if (!finished) return;
        const nextPositions = { ...positions.value };
        for (const id in nextPositions) {
          const position = nextPositions[id];
          if (Number(id) === activeId.value) nextPositions[id] = to;
          else if (from < position && position <= to) nextPositions[id] = position - 1;
          else if (to <= position && position < from) nextPositions[id] = position + 1;
        }
        // The final visual slots and drag reset are atomic on the UI thread.
        // Siblings animate absolute positions, so this rebase has no return motion.
        positions.value = nextPositions;
        activeId.value = -1;
        targetIndex.value = -1;
        dragBase.value = 0;
        scrollAccum.value = 0;
        phase.value = 3;
        runOnJS(commitDrag)(from, to);
      }
    );
  };

  return (
    <View style={styles.selectedSection}>
      <View style={styles.sectionHeadingRow}>
        <View style={styles.sectionHeadingCopy}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={styles.sectionHeading}>
            IN THIS WORKOUT
          </Text>
          <Text style={styles.sectionCount}>{count}</Text>
        </View>
        <Pressable
          accessibilityLabel="Add a custom exercise"
          accessibilityRole="button"
          hitSlop={6}
          onPress={onAdd}
          style={styles.addExerciseButton}
        >
          <Plus color={splitColors.chest} size={16} strokeWidth={2.4} />
          <Text style={styles.addExerciseText}>Add Exercise</Text>
        </Pressable>
      </View>
      <View style={[styles.selectedList, { height: Math.max(0, count * STRIDE - REORDER_ROW_GAP) }]}>
        {exercises.map((exercise, index) => (
          <ExerciseRow
            beginDrag={beginDrag}
            drag={drag}
            dragSession={dragSession}
            exercise={exercise}
            index={index}
            key={exercise.id}
            onRemove={onRemove}
            settleDrag={settleDrag}
            viewport={viewport}
          />
        ))}
      </View>
    </View>
  );
}

interface ExerciseRowProps {
  beginDrag: (session: number) => void;
  drag: DragValues;
  dragSession: SharedValue<number>;
  exercise: DraftExercise;
  index: number;
  onRemove: (exerciseId: number) => void;
  settleDrag: (cancelled: boolean) => void;
  viewport: SharedValue<{ top: number; bottom: number }>;
}

function ExerciseRow({
  beginDrag,
  drag,
  dragSession,
  exercise,
  index,
  onRemove,
  settleDrag,
  viewport,
}: ExerciseRowProps) {
  const group = getMuscleGroupForExercise(exercise);
  const exerciseId = exercise.id;

  // Keep the handle-only 180 ms activation; a pending snap/commit owns the drag.
  const pan = Gesture.Pan()
    .activateAfterLongPress(180)
    .onStart((event) => {
      if (drag.phase.value !== 0) return;
      drag.activeId.value = exerciseId;
      drag.startIndex.value = drag.positions.value[exerciseId] ?? index;
      drag.targetIndex.value = drag.startIndex.value;
      drag.dragBase.value = 0;
      drag.scrollAccum.value = 0;
      drag.pointerY.value = event.absoluteY;
      viewport.value = { top: 0, bottom: 0 };
      dragSession.value += 1;
      drag.phase.value = 1;
      runOnJS(beginDrag)(dragSession.value);
    })
    .onUpdate((event) => {
      if (drag.phase.value !== 1 || drag.activeId.value !== exerciseId) return;
      drag.dragBase.value = event.translationY;
      drag.pointerY.value = event.absoluteY;
    })
    .onEnd(() => {
      if (drag.phase.value === 1 && drag.activeId.value === exerciseId) settleDrag(false);
    })
    .onFinalize(() => {
      if (drag.phase.value === 1 && drag.activeId.value === exerciseId) settleDrag(true);
    });

  const animatedStyle = useAnimatedStyle(() => {
    const active = drag.activeId.value === exerciseId;
    if (active) {
      return {
        transform: [
          { translateY: drag.startIndex.value * STRIDE + drag.dragBase.value + drag.scrollAccum.value },
          { scale: 1.02 },
        ],
        zIndex: 20,
        elevation: 10,
        shadowOpacity: 0.45,
      };
    }

    const position = drag.positions.value[exerciseId] ?? index;
    const from = drag.startIndex.value;
    const to = drag.targetIndex.value;
    let slot = position;
    if (drag.activeId.value >= 0) {
      if (from < position && to >= position) slot -= 1;
      else if (from > position && to <= position) slot += 1;
    }
    return {
      transform: [
        { translateY: withTiming(slot * STRIDE, {
          duration: motionDuration.feedback,
          easing: motionEasing.decelerate,
        }) },
        { scale: 1 },
      ],
      zIndex: 0,
      elevation: 0,
      shadowOpacity: 0,
    };
  }, [exerciseId, index]);

  return (
    <Animated.View
      style={[styles.selectedExerciseRow, animatedStyle]}
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
    gap: 12,
    marginBottom: 10,
  },
  sectionHeadingCopy: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeading: {
    flexShrink: 1,
    color: redesignColors.ashDim,
    fontFamily: redesignFonts.monoBold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  sectionCount: { color: splitColors.chest, fontFamily: redesignFonts.monoBold, fontSize: 14 },
  addExerciseButton: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: `${splitColors.chest}66`,
    backgroundColor: `${splitColors.chest}14`,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addExerciseText: {
    color: splitColors.chest,
    fontFamily: redesignFonts.uiBold,
    fontSize: 12,
  },
  selectedList: { position: 'relative' },
  selectedExerciseRow: {
    position: 'absolute',
    top: 0,
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
