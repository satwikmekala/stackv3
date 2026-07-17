import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import type { WorkoutType } from '@/store/workoutStore';
import { workoutMeta } from '@/constants/workouts';
import { redesignColors, redesignFonts } from '@/constants/theme';

type WorkoutIntensityPickerProps = {
  visible: boolean;
  type: WorkoutType;
  onChoose: () => void;
  onClose: () => void;
};

const LEVELS = [
  { value: 0, label: 'CHILL' },
  { value: 0.5, label: 'BALANCED' },
  { value: 1, label: 'ALL OUT' },
];

function rgba(hex: string, opacity: number) {
  const value = hex.replace('#', '');
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

export function WorkoutIntensityPicker({
  visible,
  type,
  onChoose,
  onClose,
}: WorkoutIntensityPickerProps) {
  const trackWidthRef = useRef(0);
  const onChooseRef = useRef(onChoose);
  const [value, setValue] = useState(0.5);
  const valueRef = useRef(0.5);
  const committedRef = useRef(false);
  const meta = workoutMeta[type];
  const nearestLevel = LEVELS.reduce((closest, level) =>
    Math.abs(level.value - value) < Math.abs(closest.value - value) ? level : closest
  );

  useEffect(() => {
    onChooseRef.current = onChoose;
  }, [onChoose]);

  useEffect(() => {
    if (visible) {
      setValue(0.5);
      valueRef.current = 0.5;
      committedRef.current = false;
    }
  }, [visible, type]);

  const updateValue = (nextValue: number) => {
    const clamped = Math.max(0, Math.min(1, nextValue));
    setValue(clamped);
    valueRef.current = clamped;
  };

  const snapToLevel = (nextValue: number) =>
    LEVELS.reduce((closest, level) =>
      Math.abs(level.value - nextValue) < Math.abs(closest.value - nextValue) ? level : closest
    ).value;

  const finishSelection = () => {
    const snappedValue = snapToLevel(valueRef.current);
    updateValue(snappedValue);

    if (committedRef.current) {
      return;
    }
    committedRef.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onChooseRef.current();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        if (trackWidthRef.current) updateValue(event.nativeEvent.locationX / trackWidthRef.current);
      },
      onPanResponderMove: (event) => {
        if (trackWidthRef.current) updateValue(event.nativeEvent.locationX / trackWidthRef.current);
      },
      onPanResponderRelease: finishSelection,
      onPanResponderTerminate: finishSelection,
    })
  ).current;

  const chooseLevel = (level: number) => {
    updateValue(level);
    committedRef.current = true;
    void Haptics.selectionAsync();
    onChooseRef.current();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modal}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close workout intensity picker"
          style={styles.backdrop}
          onPress={onClose}
        />
        <View style={[styles.card, { borderColor: rgba(meta.color, 0.55) }]}>
          <View style={styles.handle} />
          <Text style={[styles.eyebrow, { color: meta.color }]}>{meta.label.toUpperCase()}</Text>
          <Text style={styles.title}>How hard do you want to go?</Text>

          <View style={styles.sliderArea}>
            <View
              accessibilityRole="adjustable"
              accessibilityLabel="Workout intensity"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100), text: nearestLevel.label }}
              onAccessibilityAction={(event) => {
                const direction = event.nativeEvent.actionName === 'increment' ? 0.5 : -0.5;
                const snappedValue = snapToLevel(valueRef.current + direction);
                updateValue(snappedValue);
                if (!committedRef.current) {
                  committedRef.current = true;
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  onChooseRef.current();
                }
              }}
              onLayout={(event) => {
                const width = event.nativeEvent.layout.width;
                trackWidthRef.current = width;
              }}
              style={styles.trackTouchArea}
              {...panResponder.panHandlers}
            >
              <View style={styles.track}>
                <View style={[styles.trackFill, { width: `${value * 100}%`, backgroundColor: meta.color }]} />
                {LEVELS.map((level) => (
                  <View
                    key={level.label}
                    pointerEvents="none"
                    style={[
                      styles.tick,
                      { left: `${level.value * 100}%` },
                      Math.abs(level.value - value) < 0.14 && { backgroundColor: redesignColors.bone },
                    ]}
                  />
                ))}
                <View
                  pointerEvents="none"
                  style={[
                    styles.thumb,
                    {
                      left: `${value * 100}%`,
                      borderColor: meta.color,
                      shadowColor: meta.color,
                    },
                  ]}
                />
              </View>
            </View>
            <View style={styles.levelLabels}>
              {LEVELS.map((level, index) => (
                <Pressable
                  key={level.label}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose ${level.label.toLowerCase()} intensity`}
                  onPress={() => chooseLevel(level.value)}
                  style={styles.levelButton}
                >
                  <Text
                    style={[
                      styles.levelLabel,
                      index === 1 && styles.levelLabelCenter,
                      index === 2 && styles.levelLabelEnd,
                      Math.abs(level.value - value) < 0.14 && { color: meta.color },
                    ]}
                  >
                    {level.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Text style={styles.hint}>SLIDE TO START</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  card: {
    minHeight: 306,
    overflow: 'hidden',
    borderRadius: 30,
    borderCurve: 'continuous',
    borderWidth: 1,
    paddingHorizontal: 25,
    paddingTop: 16,
    paddingBottom: 25,
    backgroundColor: redesignColors.surface,
  },
  handle: {
    width: 38,
    height: 4,
    alignSelf: 'center',
    borderRadius: 2,
    marginBottom: 29,
    backgroundColor: redesignColors.hi,
  },
  eyebrow: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 12,
    letterSpacing: 1.7,
    marginBottom: 11,
  },
  title: {
    maxWidth: 280,
    fontFamily: redesignFonts.display,
    fontSize: 32,
    lineHeight: 37,
    letterSpacing: -0.8,
    color: redesignColors.bone,
  },
  sliderArea: {
    marginTop: 31,
  },
  trackTouchArea: {
    height: 42,
    justifyContent: 'center',
  },
  track: {
    height: 7,
    borderRadius: 4,
    backgroundColor: redesignColors.hi,
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  tick: {
    position: 'absolute',
    top: -3,
    width: 13,
    height: 13,
    marginLeft: -6.5,
    borderRadius: 6.5,
    backgroundColor: redesignColors.ashDim,
  },
  thumb: {
    position: 'absolute',
    top: -10,
    width: 27,
    height: 27,
    marginLeft: -13.5,
    borderRadius: 13.5,
    borderWidth: 5,
    backgroundColor: redesignColors.bone,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.48,
    shadowRadius: 8,
    elevation: 8,
  },
  levelLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 11,
  },
  levelButton: {
    width: '33.333%',
  },
  levelLabel: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 10,
    letterSpacing: 0.7,
    color: redesignColors.ashDim,
  },
  levelLabelCenter: {
    textAlign: 'center',
  },
  levelLabelEnd: {
    textAlign: 'right',
  },
  hint: {
    alignSelf: 'center',
    marginTop: 29,
    fontFamily: redesignFonts.monoBold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: redesignColors.ash,
  },
});
