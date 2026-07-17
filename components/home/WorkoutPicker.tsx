import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { WorkoutType } from '@/store/workoutStore';
import { WORKOUT_ORDER, workoutMeta } from '@/constants/workouts';
import { redesignColors, redesignFonts } from '@/constants/theme';

type WorkoutPickerProps = {
  visible: boolean;
  selected: WorkoutType;
  onSelect: (type: WorkoutType) => void;
  onClose: () => void;
};

export function WorkoutPicker({ visible, selected, onSelect, onClose }: WorkoutPickerProps) {
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
          }
        }
      );
    }
  }, [isMounted, progress, visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * screenHeight }],
  }));

  if (!isMounted) {
    return null;
  }

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <View style={styles.modal}>
        <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[styles.backdrop, backdropStyle]}>
          <Pressable accessibilityLabel="Close workout picker" style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>CHOOSE A SPLIT</Text>
          <Text style={styles.title}>Change workout</Text>

          <View style={styles.options}>
            {WORKOUT_ORDER.map((type) => {
              const meta = workoutMeta[type];
              const isSelected = selected === type;
              return (
                <Pressable
                  key={type}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => onSelect(type)}
                  style={[
                    styles.option,
                    isSelected && { borderColor: meta.color, backgroundColor: redesignColors.raised },
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: meta.color }]} />
                  <Text style={styles.optionLabel}>{meta.shortLabel}</Text>
                </Pressable>
              );
            })}
          </View>
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
});
