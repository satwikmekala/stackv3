import React, { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, useReducedMotion } from 'react-native-reanimated';
import * as Haptics from '@/services/haptics';
import { redesignColors } from '@/constants/theme';

const ITEM_SIZE = 44;

function WheelNumber({ number, index, offset, horizontal, reducedMotion, textAlign }: {
  number: number; index: number; offset: ReturnType<typeof useSharedValue<number>>;
  horizontal: boolean; reducedMotion: boolean;
  textAlign: 'left' | 'center' | 'right';
}) {
  const style = useAnimatedStyle(() => {
    const distance = (index * ITEM_SIZE - offset.get()) / ITEM_SIZE;
    return {
      opacity: interpolate(Math.abs(distance), [0, 1, 2], [1, 0.46, 0.18], Extrapolation.CLAMP),
      transform: reducedMotion ? [] : horizontal
        ? [{ scale: interpolate(Math.abs(distance), [0, 1, 2], [1, 0.76, 0.64], Extrapolation.CLAMP) }]
        : [{ perspective: 400 }, { rotateX: `${interpolate(distance, [-2, 0, 2], [52, 0, -52], Extrapolation.CLAMP)}deg` }],
    };
  });
  return <View style={{ width: horizontal ? ITEM_SIZE : '100%', height: ITEM_SIZE, alignItems: 'center', justifyContent: 'center' }}>
    <Animated.Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4} maxFontSizeMultiplier={1.25}
      style={[styles.number, { fontSize: horizontal ? 32 : 38, textAlign }, style]}>{number}</Animated.Text>
  </View>;
}

/** A snapping horizontal reps ruler; vertical mode supports platforms without UIKit. */
export function WorkoutNumberWheel({ value, minimum, maximum, label, horizontal = false, textAlign = 'center', onChange }: {
  value: number; minimum: number; maximum: number; label: string; horizontal?: boolean; textAlign?: 'left' | 'center' | 'right'; onChange: (value: number) => void;
}) {
  const list = useRef<FlatList<number>>(null);
  const interacting = useRef(false);
  const currentValue = useRef(value);
  const [width, setWidth] = useState(0);
  const reducedMotion = useReducedMotion();
  const index = Math.round(value) - minimum;
  const offset = useSharedValue(index * ITEM_SIZE);
  const data = React.useMemo(() => Array.from({ length: maximum - minimum + 1 }, (_, i) => minimum + i), [maximum, minimum]);
  const padding = horizontal ? Math.max(0, (width - ITEM_SIZE) / 2) : ITEM_SIZE * 2;
  const onScroll = useAnimatedScrollHandler(event => { offset.set(horizontal ? event.contentOffset.x : event.contentOffset.y); });

  useEffect(() => {
    currentValue.current = value;
    if (!interacting.current) {
      list.current?.scrollToOffset({ offset: index * ITEM_SIZE, animated: false });
      offset.set(index * ITEM_SIZE);
    }
  }, [index, offset, value, width]);

  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const position = horizontal ? event.nativeEvent.contentOffset.x : event.nativeEvent.contentOffset.y;
    const next = Math.max(minimum, Math.min(maximum, minimum + Math.round(position / ITEM_SIZE)));
    interacting.current = false;
    list.current?.scrollToOffset({ offset: (next - minimum) * ITEM_SIZE, animated: !reducedMotion });
    if (next !== currentValue.current) {
      currentValue.current = next;
      onChange(next);
      void Haptics.selectionAsync();
    }
  };

  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)}
    accessible accessibilityRole="adjustable" accessibilityLabel={label}
    accessibilityHint={horizontal ? 'Swipe left or right to choose a number' : 'Swipe up or down to choose a number'}
    accessibilityValue={{ min: minimum, max: maximum, now: value, text: horizontal ? `${value} reps` : String(value) }}
    accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
    onAccessibilityAction={event => {
      const next = Math.max(minimum, Math.min(maximum, value + (event.nativeEvent.actionName === 'increment' ? 1 : -1)));
      if (next !== value) onChange(next);
    }}
    style={{ width: '100%', height: horizontal ? ITEM_SIZE : ITEM_SIZE * 5, overflow: 'hidden' }}>
    {width > 0 && <Animated.FlatList
      ref={list} data={data} horizontal={horizontal} keyExtractor={number => String(number)}
      initialScrollIndex={index} getItemLayout={(_, i) => ({ length: ITEM_SIZE, offset: ITEM_SIZE * i, index: i })}
      contentContainerStyle={horizontal ? { paddingHorizontal: padding } : { paddingVertical: padding }}
      renderItem={({ item, index: i }) => <WheelNumber number={item} index={i} offset={offset} horizontal={horizontal} reducedMotion={reducedMotion} textAlign={textAlign} />}
      initialNumToRender={9} windowSize={5} maxToRenderPerBatch={9}
      showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_SIZE} decelerationRate="fast" bounces={false} nestedScrollEnabled
      scrollEventThrottle={16} onScroll={onScroll} directionalLockEnabled
      onScrollBeginDrag={() => { interacting.current = true; }}
      onMomentumScrollEnd={settle}
      onScrollEndDrag={event => {
        const velocity = horizontal ? event.nativeEvent.velocity?.x : event.nativeEvent.velocity?.y;
        if (!velocity || Math.abs(velocity) < 0.05) settle(event);
      }}
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    />}
  </View>;
}

const styles = StyleSheet.create({
  number: { width: '100%', color: redesignColors.bone, fontWeight: '500', fontVariant: ['tabular-nums'], textAlign: 'center' },
});
