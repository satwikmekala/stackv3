import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  ARCHETYPE_COMPOSITIONS,
  type Archetype,
} from '@/constants/archetypes';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { getWeeklyQueueState } from '@/store/weeklyQueueEngine';

const ALL_ARCHETYPES = Object.keys(ARCHETYPE_COMPOSITIONS) as Archetype[];

type WorkoutPickerProps = {
  visible: boolean;
  selected?: Archetype;
  options?: Archetype[];
  eyebrow?: string;
  title?: string;
  onSelect: (archetype: Archetype) => void;
  onClose: () => void;
  onExited?: () => void;
};

export function WorkoutPicker({
  visible,
  selected,
  options,
  eyebrow = 'CHOOSE A SPLIT',
  title,
  onSelect,
  onClose,
  onExited,
}: WorkoutPickerProps) {
  const { height: screenHeight } = useWindowDimensions();
  const [isMounted, setIsMounted] = useState(visible);
  const progress = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      progress.value = withTiming(1, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    if (isMounted) {
      progress.value = withTiming(
        0,
        { duration: 220, easing: Easing.in(Easing.cubic) },
        (finished) => {
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

  const { remaining, nextUp } = getWeeklyQueueState();
  const queuedArchetypes = [...new Set(options ?? [...nextUp, ...remaining])];
  const isWeekComplete = queuedArchetypes.length === 0;
  const isBonusPool = options === undefined && isWeekComplete;
  const archetypes = isBonusPool ? ALL_ARCHETYPES : queuedArchetypes;
  const pickerTitle = title ?? (
    isBonusPool
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

          {isWeekComplete && !isBonusPool ? (
            <Text style={styles.completeMessage}>
              {"YOU'RE DONE FOR THIS WEEK"}
            </Text>
          ) : null}

          {archetypes.length > 0 ? (
            <View style={styles.options}>
              {archetypes.map((archetype) => {
                const composition = ARCHETYPE_COMPOSITIONS[archetype];
                const isSelected = selected === archetype;
                return (
                  <Pressable
                    key={archetype}
                    accessibilityRole="button"
                    accessibilityLabel={`${composition.label}, select workout`}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => onSelect(archetype)}
                    style={[
                      styles.option,
                      isSelected && {
                        borderColor: composition.color,
                        backgroundColor: redesignColors.raised,
                      },
                    ]}
                  >
                    <View style={[styles.dot, { backgroundColor: composition.color }]} />
                    <View style={styles.optionContent}>
                      <Text style={styles.optionLabel}>{composition.label}</Text>
                    </View>
                  </Pressable>
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
  completeMessage: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 12,
    letterSpacing: 1.2,
    color: redesignColors.ash,
    marginBottom: 16,
  },
});
