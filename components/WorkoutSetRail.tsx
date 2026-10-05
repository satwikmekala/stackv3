import React, { useEffect, useRef, useState } from 'react';
import { View, type LayoutRectangle } from 'react-native';
import { Check } from 'lucide-react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { workoutSetSelectionSpring, workoutTiming } from '@/constants/workoutMotion';
import { workoutLayoutTransition, workoutRowEntering } from '@/constants/workoutLayoutTransitions';

// One persistent surface travels between measured slots. Keeping it outside
// the touchables avoids press-scale transforms disturbing the selection path.
export function WorkoutSetRail({
  children,
  selectedIndex,
  accent,
  enteringIndex,
}: {
  children: React.ReactElement[];
  selectedIndex: number;
  accent: string;
  enteringIndex?: number;
}) {
  const [frames, setFrames] = useState<Record<string, LayoutRectangle>>({});
  const positioned = useRef(false);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);
  const selectedChild = children[selectedIndex];
  const selectedKey = selectedChild ? String(selectedChild.key ?? selectedIndex) : null;
  const target = selectedKey === null ? undefined : frames[selectedKey];

  useEffect(() => {
    if (selectedKey === null) {
      opacity.set(0);
      return;
    }
    if (!target) return;
    const next = { x: target.x, y: target.y + 6, width: target.width, height: Math.max(44, target.height - 12) };
    if (!positioned.current) {
      x.set(next.x);
      y.set(next.y);
      width.set(next.width);
      height.set(next.height);
      positioned.current = true;
    } else {
      // Retarget existing springs without resetting position or cancelling
      // velocity. Both logging forward and reviewing backward share this path.
      x.set(withSpring(next.x, workoutSetSelectionSpring));
      y.set(withSpring(next.y, workoutSetSelectionSpring));
      width.set(withSpring(next.width, workoutSetSelectionSpring));
      height.set(withSpring(next.height, workoutSetSelectionSpring));
    }
    opacity.set(1);
  }, [height, opacity, selectedKey, target, width, x, y]);

  const selectionStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    width: width.value,
    height: height.value,
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 6, minHeight: 56, overflow: 'hidden' }}>
      <Animated.View
        testID="set-selection-highlight"
        pointerEvents="none"
        accessible={false}
        style={[{
          position: 'absolute', left: 0, top: 0,
          borderRadius: 999, borderCurve: 'continuous', borderWidth: 1,
          borderColor: accent, backgroundColor: `${accent}0D`,
        }, selectionStyle]}
      />
      {children.map((child, index) => {
        const key = String(child.key ?? index);
        return (
          <Animated.View
            key={key}
            onLayout={({ nativeEvent: { layout } }) => {
              setFrames((previous) => {
                const existing = previous[key];
                if (existing && existing.x === layout.x && existing.y === layout.y &&
                    existing.width === layout.width && existing.height === layout.height) return previous;
                return { ...previous, [key]: layout };
              });
            }}
            layout={workoutLayoutTransition}
            entering={index === enteringIndex ? workoutRowEntering : undefined}
            style={{ flexGrow: 1, flexBasis: 96, minWidth: 96, maxWidth: '100%' }}
          >
            {child}
          </Animated.View>
        );
      })}
    </View>
  );
}

// Completion changes the glyph in place. Neither layer is remounted, so rapid
// updates retarget the fade and reopening a set never replays a celebration.
export function WorkoutSetGlyph({ completed, selected, setNumber, accent }: {
  completed: boolean;
  selected: boolean;
  setNumber: number;
  accent: string;
}) {
  const completion = useSharedValue(completed ? 1 : 0);
  const selection = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    completion.set(withTiming(completed ? 1 : 0, workoutTiming(160)));
    selection.set(withTiming(selected ? 1 : 0, workoutTiming(160)));
  }, [completed, completion, selected, selection]);
  const badgeStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(completion.value, [0, 1], ['transparent', `${accent}26`]),
  }));
  const numberStyle = useAnimatedStyle(() => ({
    opacity: 1 - completion.value,
    color: interpolateColor(selection.value, [0, 1], [redesignColors.ash, accent]),
  }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: completion.value }));
  return (
    <Animated.View style={[{
      minWidth: 26, minHeight: 26, flexShrink: 0, paddingHorizontal: 4, borderRadius: 999,
      alignItems: 'center', justifyContent: 'center',
    }, badgeStyle]}>
      <Animated.Text maxFontSizeMultiplier={1.2} style={[{
        fontFamily: redesignFonts.uiBold, fontSize: 15, fontVariant: ['tabular-nums'],
      }, numberStyle]}>{setNumber}</Animated.Text>
      <Animated.View pointerEvents="none" style={[{
        position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center',
      }, checkStyle]}>
        <Check color={accent} size={15} strokeWidth={2.6} />
      </Animated.View>
    </Animated.View>
  );
}
