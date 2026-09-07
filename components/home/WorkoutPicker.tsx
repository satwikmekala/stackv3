import { memo, useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import {
  ARCHETYPE_COMPOSITIONS,
  type Archetype,
} from '@/constants/archetypes';
import { withMotionTiming } from '@/constants/motion';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { usePressScale } from '@/hooks/usePressScale';
import { getWeeklyQueueState } from '@/store/weeklyQueueEngine';

const ALL_ARCHETYPES = Object.keys(ARCHETYPE_COMPOSITIONS) as Archetype[];
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** A workout belonging to the active Custom Split, in saved order. */
export type CustomWorkoutOption = {
  id: number;
  letter: string;
  name: string;
  color: string;
  exerciseCount: number;
};

type WorkoutPickerProps = {
  visible: boolean;
  selected?: Archetype;
  options?: Archetype[];
  eyebrow?: string;
  title?: string;
  onSelect: (archetype: Archetype) => void;
  onClose: () => void;
  onExited?: () => void;
  /** Custom mode: the workouts of the active split replace the archetype
   *  queue entirely. Stack archetypes are never mixed in. */
  customOptions?: CustomWorkoutOption[];
  selectedCustomId?: number | null;
  onSelectCustom?: (workoutId: number) => void;
};

function WorkoutOption({
  archetype,
  isSelected,
  onSelect,
}: {
  archetype: Archetype;
  isSelected: boolean;
  onSelect: (archetype: Archetype) => void;
}) {
  const pressScale = usePressScale('surface');
  const composition = ARCHETYPE_COMPOSITIONS[archetype];

  const handlePress = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    onSelect(archetype);
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`${composition.label}, select workout`}
      accessibilityState={{ selected: isSelected }}
      onPress={handlePress}
      onPressIn={pressScale.onPressIn}
      onPressOut={pressScale.onPressOut}
      style={[
        styles.option,
        isSelected && {
          borderColor: composition.color,
          backgroundColor: redesignColors.raised,
        },
        pressScale.animatedStyle,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: composition.color }]} />
      <View style={styles.optionContent}>
        <Text style={styles.optionLabel}>{composition.label}</Text>
      </View>
    </AnimatedPressable>
  );
}

const CustomWorkoutOptionRow = memo(function CustomWorkoutOptionRow({
  option,
  isSelected,
  onSelect,
}: {
  option: CustomWorkoutOption;
  isSelected: boolean;
  onSelect: (workoutId: number) => void;
}) {
  const pressScale = usePressScale('surface');

  const handlePress = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    onSelect(option.id);
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`Workout ${option.letter}, ${option.name}, select workout`}
      accessibilityState={{ selected: isSelected }}
      onPress={handlePress}
      onPressIn={pressScale.onPressIn}
      onPressOut={pressScale.onPressOut}
      style={[
        styles.option,
        isSelected && {
          borderColor: option.color,
          backgroundColor: redesignColors.raised,
        },
        pressScale.animatedStyle,
      ]}
    >
      <View style={[styles.letterBadge, { backgroundColor: `${option.color}26` }]}>
        <Text style={[styles.letterBadgeText, { color: option.color }]}>
          {option.letter}
        </Text>
      </View>
      <View style={styles.optionContent}>
        <Text numberOfLines={1} style={styles.optionLabel}>
          {option.name}
        </Text>
        <Text style={styles.optionMeta}>
          {`${option.exerciseCount} ${option.exerciseCount === 1 ? 'EXERCISE' : 'EXERCISES'}`}
        </Text>
      </View>
    </AnimatedPressable>
  );
});

export function WorkoutPicker({
  visible,
  selected,
  options,
  eyebrow = 'CHOOSE A SPLIT',
  title,
  onSelect,
  onClose,
  onExited,
  customOptions,
  selectedCustomId,
  onSelectCustom,
}: WorkoutPickerProps) {
  const { height: screenHeight } = useWindowDimensions();
  const [isMounted, setIsMounted] = useState(visible);
  const progress = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      progress.value = withMotionTiming(1);
      return;
    }

    if (isMounted) {
      progress.value = withMotionTiming(
        0,
        { easing: 'accelerate' },
        (finished) => {
          'worklet';
          if (finished) {
            runOnJS(setIsMounted)(false);
            if (onExited) {
              runOnJS(onExited)();
            }
          }
        }
      );
    }
  }, [isMounted, onExited, progress, visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * screenHeight }],
  }));

  if (!isMounted) {
    return null;
  }

  const isCustomMode = customOptions !== undefined;
  const { remaining, nextUp } = isCustomMode
    ? { remaining: [] as Archetype[], nextUp: [] as Archetype[] }
    : getWeeklyQueueState();
  const queuedArchetypes = [...new Set(options ?? [...nextUp, ...remaining])];
  const isWeekComplete = queuedArchetypes.length === 0;
  const isBonusPool = options === undefined && isWeekComplete;
  const archetypes = isBonusPool ? ALL_ARCHETYPES : queuedArchetypes;
  const pickerTitle = title ?? (
    isCustomMode
      ? 'Change workout'
      : isBonusPool
        ? 'What would you like to work out?'
        : isWeekComplete
          ? 'Week complete'
          : 'Change workout'
  );

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <View style={styles.modal}>
        <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[styles.backdrop, backdropStyle]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close workout picker"
            style={StyleSheet.absoluteFill}
            onPress={onClose}
          />
        </Animated.View>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{pickerTitle}</Text>

          {!isCustomMode && isWeekComplete && !isBonusPool ? (
            <Text style={styles.completeMessage}>
              {"YOU'RE DONE FOR THIS WEEK"}
            </Text>
          ) : null}

          {isCustomMode ? (
            customOptions.length > 0 ? (
              <View style={styles.options}>
                {customOptions.map((option) => (
                  <CustomWorkoutOptionRow
                    key={option.id}
                    option={option}
                    isSelected={selectedCustomId === option.id}
                    onSelect={onSelectCustom ?? (() => {})}
                  />
                ))}
              </View>
            ) : (
              <Text style={styles.completeMessage}>
                THIS SPLIT HAS NO WORKOUTS YET
              </Text>
            )
          ) : archetypes.length > 0 ? (
            <View style={styles.options}>
              {archetypes.map((archetype) => {
                const isSelected = selected === archetype;
                return (
                  <WorkoutOption
                    key={archetype}
                    archetype={archetype}
                    isSelected={isSelected}
                    onSelect={onSelect}
                  />
                );
              })}
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  sheet: {
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 42,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.surface,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: redesignColors.hi,
    alignSelf: 'center',
    marginBottom: 25,
  },
  eyebrow: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 11,
    letterSpacing: 1.8,
    color: redesignColors.ash,
    marginBottom: 7,
  },
  title: {
    fontFamily: redesignFonts.display,
    fontSize: 28,
    color: redesignColors.bone,
    marginBottom: 21,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  option: {
    width: '48%',
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: redesignColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: redesignColors.ink,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 11,
  },
  optionLabel: {
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 15,
    color: redesignColors.bone,
  },
  optionContent: {
    flex: 1,
    alignItems: 'flex-start',
  },
  letterBadge: {
    width: 26,
    height: 26,
    borderRadius: 9,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  letterBadgeText: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  optionMeta: {
    marginTop: 2,
    fontFamily: redesignFonts.mono,
    fontSize: 10,
    letterSpacing: 0.6,
    color: redesignColors.ash,
  },
  completeMessage: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 12,
    letterSpacing: 1.2,
    color: redesignColors.ash,
    marginBottom: 16,
  },
});
