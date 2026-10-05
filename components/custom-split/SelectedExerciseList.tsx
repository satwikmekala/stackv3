import { displayExerciseName } from '@/constants/exerciseNames';
import { useMuscleColors } from '@/store/muscleColors';
import { SplitPressable as Pressable } from '@/components/custom-split/SplitPressable';
import { useCallback, useEffect, useLayoutEffect } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { type AnimatedRef, type SharedValue, runOnJS, runOnUI, scrollTo, useAnimatedStyle, useFrameCallback, useSharedValue, withTiming, ReduceMotion } from 'react-native-reanimated';
import { GripHorizontal, MoreHorizontal } from 'lucide-react-native';
import { redesignColors as c } from '@/constants/theme';
import { MUSCLE_GROUP_COLORS, getMuscleGroupForExercise, type DraftExercise } from '@/store/customSplitDraft';
import { ui } from './ui';
import { showActions } from './showActions';

const GAP = 8;
interface Props {
  scrollRef: AnimatedRef<Animated.ScrollView>;
  scrollOffset: SharedValue<number>;
  maxScrollOffset: SharedValue<number>;
  exercises: DraftExercise[];
  measureViewport: () => Promise<{ top: number; bottom: number }>;
  onDragStateChange: (dragging: boolean) => void;
  onRemove: (id: number) => void;
  onReorder: (from: number, to: number) => void;
}
interface Drag {
  dragging: SharedValue<boolean>;
  active: SharedValue<number>;
  target: SharedValue<number>;
  translation: SharedValue<number>;
  scrollStart: SharedValue<number>;
  pointer: SharedValue<number>;
  heights: SharedValue<Record<number, number>>;
  order: SharedValue<number[]>;
  bounds: SharedValue<{ top: number; bottom: number }>;
}
const topOf = (order: number[], heights: Record<number, number>, id: number) => {
  'worklet';
  let top = 0;
  for (const item of order) {
    if (item === id) break;
    top += (heights[item] ?? 64) + GAP;
  }
  return top;
};
const movedOrder = (order: number[], active: number, target: number) => {
  'worklet';
  const result = order.filter(id => id !== active);
  result.splice(target, 0, active);
  return result;
};

export function SelectedExerciseList({ exercises, scrollRef, scrollOffset, maxScrollOffset, measureViewport, onDragStateChange, onRemove, onReorder }: Props) {
  useMuscleColors(state => state.preferences);
  const active = useSharedValue(-1);
  const dragging = useSharedValue(false);
  const target = useSharedValue(0);
  const translation = useSharedValue(0);
  const scrollStart = useSharedValue(0);
  const pointer = useSharedValue(0);
  const heights = useSharedValue<Record<number, number>>({});
  const order = useSharedValue(exercises.map(exercise => exercise.id));
  const bounds = useSharedValue({ top: 0, bottom: 0 });
  const drag: Drag = { dragging, active, target, translation, scrollStart, pointer, heights, order, bounds };

  useLayoutEffect(() => {
    const nextOrder = exercises.map(exercise => exercise.id);
    runOnUI(() => {
      order.value = nextOrder;
      active.value = -1;
      dragging.value = false;
      translation.value = 0;
    })();
  }, [exercises, order, active, dragging, translation]);
  useEffect(() => () => { active.value = -1; onDragStateChange(false); }, [active, onDragStateChange]);
  const begin = useCallback((id: number) => {
    onDragStateChange(true);
    void measureViewport().then(value => { if (active.value === id) bounds.value = value; });
  }, [active, bounds, measureViewport, onDragStateChange]);
  const finish = useCallback((from: number, to: number) => {
    onReorder(from, to);
    onDragStateChange(false);
  }, [onReorder, onDragStateChange]);
  const cancel = useCallback(() => onDragStateChange(false), [onDragStateChange]);

  useFrameCallback(({ timeSincePreviousFrame }) => {
    if (active.value < 0 || !dragging.value) return;
    if (bounds.value.bottom > bounds.value.top) {
      const direction = pointer.value < bounds.value.top + 70 ? -1 : pointer.value > bounds.value.bottom - 70 ? 1 : 0;
      const next = Math.max(0, Math.min(maxScrollOffset.value, scrollOffset.value + direction * Math.min(timeSincePreviousFrame ?? 16, 32) * 0.55));
      if (next !== scrollOffset.value) { scrollTo(scrollRef, 0, next, false); scrollOffset.set(next); }
    }
    const center = topOf(order.value, heights.value, active.value) + translation.value + scrollOffset.value - scrollStart.value + (heights.value[active.value] ?? 64) / 2;
    const others = order.value.filter(id => id !== active.value);
    let nextTarget = 0;
    for (const id of others) {
      const height = heights.value[id] ?? 64;
      if (center > topOf(order.value, heights.value, id) + height / 2) nextTarget += 1;
    }
    target.value = nextTarget;
  });
  return <View style={{ gap: 12 }}>
    <View style={{ gap: 4 }}><Text style={ui.eyebrow}>EXERCISES · {exercises.length}</Text><Text style={ui.label}>Hold the grip to reorder.</Text></View>
    <View style={{ gap: GAP }}>
      {exercises.map((exercise, index) => <ExerciseRow key={exercise.id} exercise={exercise} index={index} count={exercises.length} drag={drag} scrollOffset={scrollOffset}
        begin={begin} finish={finish} cancel={cancel} onRemove={onRemove} onReorder={onReorder} />)}
    </View>
  </View>;
}

function ExerciseRow({ exercise, index, count, drag, scrollOffset, begin, finish, cancel, onRemove, onReorder }: {
  exercise: DraftExercise; index: number; count: number; drag: Drag; scrollOffset: SharedValue<number>;
  begin: (id: number) => void; finish: (from: number, to: number) => void; cancel: () => void;
  onRemove: (id: number) => void; onReorder: (from: number, to: number) => void;
}) {
  const id = exercise.id;
  const pan = Gesture.Pan().activateAfterLongPress(180)
    .onStart(event => {
      if (drag.active.value >= 0) return;
      drag.dragging.set(true);
      drag.active.set(id); drag.target.set(index); drag.translation.set(0);
      drag.scrollStart.set(scrollOffset.value); drag.pointer.set(event.absoluteY);
      drag.bounds.set({ top: 0, bottom: 0 });
      runOnJS(begin)(id);
    })
    .onUpdate(event => { if (drag.active.value !== id || !drag.dragging.value) return; drag.translation.set(event.translationY); drag.pointer.set(event.absoluteY); })
    .onEnd(() => {
      if (drag.active.value !== id) return;
      // Hold the final visual positions until React commits the reordered rows.
      drag.dragging.set(false);
      const to = drag.target.value;
      if (to === index) drag.active.set(-1);
      runOnJS(finish)(index, to);
    })
    .onFinalize((_event, success) => {
      if (!success && drag.active.value === id) { drag.dragging.set(false); drag.active.set(-1); drag.translation.set(0); runOnJS(cancel)(); }
    });
  const animatedStyle = useAnimatedStyle(() => {
    const active = drag.active.value === id;
    const projected = drag.active.value >= 0 ? movedOrder(drag.order.value, drag.active.value, drag.target.value) : drag.order.value;
    const offset = topOf(projected, drag.heights.value, id) - topOf(drag.order.value, drag.heights.value, id);
    return { zIndex: active ? 10 : 0, transform: [{ translateY: active
      ? drag.translation.value + scrollOffset.value - drag.scrollStart.value
      : drag.active.value < 0 ? 0 : withTiming(offset, { duration: 130, reduceMotion: ReduceMotion.System }) }], backgroundColor: active ? c.raised : c.surface };
  });
  const move = (direction: number) => {
    const next = index + direction;
    if (next < 0 || next >= count) return;
    onReorder(index, next);
    AccessibilityInfo.announceForAccessibility(`${displayExerciseName(exercise.name)}, position ${next + 1} of ${count}`);
  };
  return <Animated.View onLayout={event => { const height = event.nativeEvent.layout.height; if (drag.heights.value[id] !== height) drag.heights.set({ ...drag.heights.value, [id]: height }); }}
    style={[ui.row, { borderRadius: 16, gap: 6, paddingRight: 6, minHeight: 76 }, animatedStyle]}>
    <GestureDetector gesture={pan}><View accessible accessibilityRole="adjustable" accessibilityLabel={`Reorder ${displayExerciseName(exercise.name)}, position ${index + 1} of ${count}`}
      accessibilityHint="Drag to reorder, or use Move up and Move down" accessibilityActions={[
        ...(index > 0 ? [{ name: 'decrement', label: 'Move up' }] : []),
        ...(index < count - 1 ? [{ name: 'increment', label: 'Move down' }] : []),
      ]} onAccessibilityAction={event => move(event.nativeEvent.actionName === 'decrement' ? -1 : 1)}
      style={{ minWidth: 44, minHeight: 64, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}><GripHorizontal color={c.ash} size={20} /></View></GestureDetector>
    <View style={{ flex: 1, paddingVertical: 14, gap: 4 }}><Text style={[ui.actionText, { textAlign: 'left' }]}>{displayExerciseName(exercise.name)}</Text>
      <View style={ui.row}><View style={[ui.dot, { width: 7, height: 7, backgroundColor: MUSCLE_GROUP_COLORS[getMuscleGroupForExercise(exercise)] }]} /><Text style={[ui.label, { flexShrink: 1 }]}>{getMuscleGroupForExercise(exercise)}</Text></View>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Actions for ${displayExerciseName(exercise.name)}`} style={({ pressed }) => [ui.iconButton, pressed && ui.pressed]}
      onPress={() => showActions(exercise.name, [
        ...(index > 0 ? [{ title: 'Move up', onPress: () => move(-1) }] : []),
        ...(index < count - 1 ? [{ title: 'Move down', onPress: () => move(1) }] : []),
        { title: 'Remove exercise', destructive: true, onPress: () => onRemove(id) },
      ])}><MoreHorizontal color={c.ash} /></Pressable>
  </Animated.View>;
}
