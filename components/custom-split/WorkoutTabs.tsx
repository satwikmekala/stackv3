import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type LayoutRectangle } from 'react-native';
import Animated, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';
import { redesignColors as c } from '@/constants/theme';
import { workoutSetSelectionSpring } from '@/constants/workoutMotion';
import { resolveDayColor } from '@/features/custom-split/colors';
import { getWorkoutDisplayName, type DraftWorkout } from '@/store/customSplitDraft';
import { workoutEntryLabel } from '@/utils/content';
import { SplitPressable as Pressable } from './SplitPressable';
import { Action, ui } from './ui';

const EDGE_SPACE = 20;

export function WorkoutTabs({ workouts, activeWorkoutId, onSelect, onAdd }: {
  workouts: DraftWorkout[];
  activeWorkoutId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  const tabs = useAnimatedRef<Animated.ScrollView>();
  const reduceMotion = useReducedMotion();
  const [frames, setFrames] = useState<Record<string, LayoutRectangle>>({});
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const positioned = useRef(false);
  const revealed = useRef(false);
  const scrollOffset = useSharedValue(0);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);
  const target = frames[activeWorkoutId];
  const onScroll = useAnimatedScrollHandler(event => { scrollOffset.value = event.contentOffset.x; });

  useEffect(() => {
    if (!target) return;
    if (!positioned.current) {
      x.value = target.x;
      y.value = target.y;
      width.value = target.width;
      height.value = target.height;
      positioned.current = true;
    } else {
      // A single surface keeps its position and velocity when taps retarget it.
      x.value = withSpring(target.x, workoutSetSelectionSpring);
      y.value = withSpring(target.y, workoutSetSelectionSpring);
      width.value = withSpring(target.width, workoutSetSelectionSpring);
      height.value = withSpring(target.height, workoutSetSelectionSpring);
    }
    opacity.value = 1;
  }, [height, opacity, target, width, x, y]);

  useEffect(() => {
    if (!target || !viewportWidth || !contentWidth) return;
    const current = scrollOffset.value;
    // Reveal only the clipped edge, keeping visible tabs in place on selection.
    const left = target.x;
    const right = target.x + target.width + EDGE_SPACE * 2 - viewportWidth;
    const next = Math.max(0, Math.min(contentWidth - viewportWidth,
      current > left ? left : current < right ? right : current));
    if (Math.abs(next - current) > 1) {
      tabs.current?.scrollTo({ x: next, animated: revealed.current && !reduceMotion });
    }
    revealed.current = true;
  }, [contentWidth, reduceMotion, scrollOffset, tabs, target, viewportWidth]);

  const selectionStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    width: width.value,
    height: height.value,
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return <View>
    <Animated.ScrollView ref={tabs} horizontal showsHorizontalScrollIndicator={false}
      onScroll={onScroll} scrollEventThrottle={16}
      onLayout={event => setViewportWidth(event.nativeEvent.layout.width)}
      onContentSizeChange={width => setContentWidth(width)} contentContainerStyle={styles.content}>
      <View style={styles.row}>
        <Animated.View pointerEvents="none" accessible={false}
          style={[styles.selection, selectionStyle]} />
        {workouts.map((day, index) => <Pressable key={day.id} accessibilityRole="tab"
          accessibilityLabel={`${workoutEntryLabel(index)}, ${getWorkoutDisplayName(day) || 'No exercises yet'}`}
          accessibilityState={{ selected: day.id === activeWorkoutId }}
          onPress={() => { if (day.id !== activeWorkoutId) onSelect(day.id); }}
          onLayout={({ nativeEvent: { layout } }) => setFrames(previous => {
            const frame = previous[day.id];
            if (frame && frame.x === layout.x && frame.y === layout.y &&
                frame.width === layout.width && frame.height === layout.height) return previous;
            return { ...previous, [day.id]: layout };
          })}
          style={({ pressed }) => [ui.dayTab, pressed && ui.pressed]}>
          <View style={[ui.dot, { backgroundColor: resolveDayColor(day) }]} />
          <Text style={ui.actionText}>{workoutEntryLabel(index)}</Text>
        </Pressable>)}
        <Action title="Add workout" icon={<Plus color={c.ash} size={18} />} onPress={onAdd} />
      </View>
    </Animated.ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: EDGE_SPACE, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selection: { position: 'absolute', left: 0, top: 0, backgroundColor: c.raised,
    borderRadius: 14, borderCurve: 'continuous' },
});
