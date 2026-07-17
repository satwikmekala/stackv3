import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Check, Repeat2, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusPill } from '@/components/StatusPill';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { EXERCISE_POOL, type Exercise, type WorkoutType } from '@/store/workoutStore';
import { WorkoutDayLabel } from '@/components/WorkoutDayLabel';

type SwapExerciseSheetProps = {
  visible: boolean;
  type: WorkoutType;
  dayLabel: string;
  accent: string;
  currentExerciseIndex: number;
  currentExerciseName: string;
  completedSetCount: number;
  sessionExercises: Exercise[];
  onNavigate: (exerciseIndex: number) => void;
  onReplace: (name: string) => void;
  onClose: () => void;
};

type ExerciseSwapRowProps = {
  name: string;
  accent: string;
  isCurrent: boolean;
  isCompleted?: boolean;
  action?: 'navigate' | 'replace';
  isLast: boolean;
  onPress: () => void;
};

function ExerciseSwapRow({
  name,
  accent,
  isCurrent,
  isCompleted = false,
  action = 'navigate',
  isLast,
  onPress,
}: ExerciseSwapRowProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={
        action === 'replace'
          ? `Replace current exercise with ${name}`
          : `${name}${isCompleted ? ', completed' : ''}${isCurrent ? ', current exercise' : ''}`
      }
      accessibilityState={{ selected: isCurrent }}
      activeOpacity={0.72}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.row,
        isCurrent && {
          borderColor: `${accent}8C`,
          backgroundColor: `${accent}16`,
        },
        pressed && styles.pressedRow,
        isLast && styles.lastRow,
      ]}
    >
      <View style={styles.rowContent}>
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          style={[
            styles.exerciseName,
            isCurrent && { color: accent },
          ]}
        >
          {name}
        </Text>

        <View style={styles.rowTrailing}>
          {isCurrent ? <StatusPill label="Current" color={accent} /> : null}
          {isCompleted ? (
            <View style={[styles.completedIcon, { backgroundColor: accent }]}>
              <Check color={redesignColors.ink} size={14} strokeWidth={3.2} />
            </View>
          ) : null}
          {action === 'replace' ? (
            <View style={styles.replaceAction}>
              <Repeat2 color={accent} size={15} strokeWidth={2.4} />
              <Text allowFontScaling={false} style={[styles.replaceLabel, { color: accent }]}>
                Replace
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function SwapExerciseSheet({
  visible,
  type,
  dayLabel,
  accent,
  currentExerciseIndex,
  currentExerciseName,
  completedSetCount,
  sessionExercises,
  onNavigate,
  onReplace,
  onClose,
}: SwapExerciseSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  const scrollOffsetRef = useRef(0);
  const [pendingExerciseName, setPendingExerciseName] = useState<string | null>(null);
  const scheduledNames = useMemo(
    () => new Set(sessionExercises.map((exercise) => exercise.name)),
    [sessionExercises]
  );
  const otherExercises = useMemo(
    () => EXERCISE_POOL[type].filter((name) => !scheduledNames.has(name)),
    [scheduledNames, type]
  );

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
      setPendingExerciseName(null);
    }
  }, [currentExerciseName, translateY, visible]);

  const finishDrag = (distance: number, velocity: number) => {
    if (distance > 80 || velocity > 0.85) {
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: 180,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onCloseRef.current();
      });
      return;
    }

    Animated.spring(translateY, {
      toValue: 0,
      damping: 22,
      stiffness: 240,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  };

  const dragResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        scrollOffsetRef.current <= 0 &&
        gesture.dy > 4 &&
        Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        translateY.setValue(Math.max(0, gesture.dy));
      },
      onPanResponderRelease: (_, gesture) => finishDrag(gesture.dy, gesture.vy),
      onPanResponderTerminate: (_, gesture) => finishDrag(gesture.dy, gesture.vy),
    })
  ).current;

  const chooseExercise = (name: string) => {
    if (name === currentExerciseName) {
      onClose();
      return;
    }

    if (completedSetCount > 0) {
      setPendingExerciseName(name);
      return;
    }

    onReplace(name);
  };

  const confirmSwap = () => {
    if (pendingExerciseName) onReplace(pendingExerciseName);
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modal}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close exercises"
          style={styles.backdrop}
          onPress={onClose}
        />

        <Animated.View
          {...dragResponder.panHandlers}
          style={[
            styles.sheet,
            {
              height: Math.max(0, screenHeight - insets.top - 12),
              paddingBottom: Math.max(insets.bottom, 20),
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.dragArea}>
            <View style={styles.handle} />
            <View style={styles.titleRow}>
              <Text allowFontScaling={false} style={styles.title}>
                Exercises
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close exercises"
                hitSlop={10}
                onPress={onClose}
                style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
              >
                <X color={redesignColors.ash} size={21} strokeWidth={2.4} />
              </Pressable>
            </View>
            <WorkoutDayLabel accent={accent} label={dayLabel} />
          </View>

          {pendingExerciseName ? (
            <View style={styles.confirmation}>
              <Text allowFontScaling={false} style={styles.confirmationText}>
                Replacing {currentExerciseName} will discard {completedSetCount} logged{' '}
                {completedSetCount === 1 ? 'set' : 'sets'}.
              </Text>
              <View style={styles.confirmationActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setPendingExerciseName(null)}
                  style={styles.cancelButton}
                >
                  <Text allowFontScaling={false} style={styles.cancelLabel}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={confirmSwap}
                  style={[styles.continueButton, { backgroundColor: accent }]}
                >
                  <Text allowFontScaling={false} style={styles.continueLabel}>
                    Continue
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <ScrollView
            style={styles.scroll}
            bounces={false}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(event) => {
              scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
            }}
            contentContainerStyle={styles.list}
          >
            <View style={styles.sectionHeader}>
              <Text allowFontScaling={false} style={styles.sectionTitle}>
                TODAY&apos;S WORKOUT
              </Text>
              <Text allowFontScaling={false} style={styles.sectionDescription}>
                Tap an exercise to move to it
              </Text>
            </View>
            {sessionExercises.map((exercise, index) => {
              const isCurrent = index === currentExerciseIndex;
              const isCompleted = exercise.sets.every((set) => set.completed);
              return (
                <ExerciseSwapRow
                  key={`${exercise.name}-${index}`}
                  name={exercise.name}
                  accent={accent}
                  isCurrent={isCurrent}
                  isCompleted={isCompleted}
                  isLast={index === sessionExercises.length - 1}
                  onPress={() => {
                    if (isCurrent) onClose();
                    else onNavigate(index);
                  }}
                />
              );
            })}

            {otherExercises.length ? (
              <>
                <View style={[styles.sectionHeader, styles.otherSectionHeader]}>
                  <Text allowFontScaling={false} style={styles.sectionTitle}>
                    OTHER EXERCISES
                  </Text>
                  <Text allowFontScaling={false} style={styles.sectionDescription}>
                    Replace {currentExerciseName} for today
                  </Text>
                </View>
                {otherExercises.map((name, index) => (
                  <ExerciseSwapRow
                    key={name}
                    name={name}
                    accent={accent}
                    isCurrent={false}
                    action="replace"
                    isLast={index === otherExercises.length - 1}
                    onPress={() => chooseExercise(name)}
                  />
                ))}
              </>
            ) : null}
          </ScrollView>
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
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
  },
  sheet: {
    overflow: 'hidden',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.surface,
  },
  dragArea: {
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 19,
  },
  titleRow: {
    minHeight: 42,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  handle: {
    width: 38,
    height: 4,
    alignSelf: 'center',
    borderRadius: 2,
    marginBottom: 19,
    backgroundColor: redesignColors.hi,
  },
  title: {
    fontFamily: redesignFonts.display,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: redesignColors.bone,
  },
  closeButton: {
    width: 38,
    height: 38,
    marginLeft: 12,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.raised,
  },
  closeButtonPressed: {
    backgroundColor: redesignColors.hi,
  },
  confirmation: {
    marginHorizontal: 18,
    marginBottom: 7,
    padding: 15,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.raised,
  },
  confirmationText: {
    fontFamily: redesignFonts.ui,
    fontSize: 14,
    lineHeight: 19,
    color: redesignColors.bone,
  },
  confirmationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 9,
    marginTop: 13,
  },
  cancelButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: redesignColors.hi,
  },
  cancelLabel: {
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 13,
    color: redesignColors.ash,
  },
  continueButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderRadius: 12,
  },
  continueLabel: {
    fontFamily: redesignFonts.uiBold,
    fontSize: 13,
    color: redesignColors.ink,
  },
  list: {
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  scroll: {
    flex: 1,
  },
  row: {
    height: 60,
    width: '100%',
    marginBottom: 8,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.raised,
    overflow: 'hidden',
  },
  rowContent: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  lastRow: {
    marginBottom: 0,
  },
  exerciseName: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 16,
    lineHeight: 20,
    color: redesignColors.bone,
  },
  pressedRow: {
    backgroundColor: redesignColors.hi,
  },
  rowTrailing: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completedIcon: {
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replaceAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replaceLabel: {
    marginLeft: 5,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 13,
  },
  sectionHeader: {
    marginBottom: 11,
    paddingHorizontal: 4,
  },
  otherSectionHeader: {
    marginTop: 24,
  },
  sectionTitle: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.5,
    color: redesignColors.ash,
  },
  sectionDescription: {
    marginTop: 4,
    fontFamily: redesignFonts.ui,
    fontSize: 13,
    lineHeight: 17,
    color: redesignColors.ashDim,
  },
});
