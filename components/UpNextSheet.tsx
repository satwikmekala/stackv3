import { useEffect, useMemo, useRef } from 'react';
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
import { ChevronRight, X } from 'lucide-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { redesignColors, redesignFonts } from '@/constants/theme';
import {
  MUSCLE_GROUP_COLORS,
  getMuscleGroupForExercise,
} from '@/store/customSplitDraft';
import { readExerciseCatalogSync } from '@/store/workoutDatabase';
import type { Exercise } from '@/store/workoutStore';

export type RemainingExercise = {
  exercise: Exercise;
  index: number;
};

type UpNextSheetProps = {
  visible: boolean;
  accent: string;
  exercises: RemainingExercise[];
  onNavigate: (exerciseIndex: number) => void;
  onClose: () => void;
};

export function UpNextSheet({
  visible,
  accent,
  exercises,
  onNavigate,
  onClose,
}: UpNextSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  const scrollOffsetRef = useRef(0);

  const catalogByName = useMemo(
    () =>
      visible
        ? new Map(readExerciseCatalogSync().map((exercise) => [exercise.name, exercise]))
        : new Map(),
    [visible]
  );

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [translateY, visible]);

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

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => onCloseRef.current()}
    >
      <GestureHandlerRootView style={styles.modal}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close up next"
          style={styles.backdrop}
          onPress={() => onCloseRef.current()}
        />

        <Animated.View
          {...dragResponder.panHandlers}
          style={[
            styles.sheet,
            {
              maxHeight: Math.max(0, screenHeight - insets.top - 24),
              paddingBottom: Math.max(insets.bottom, 20),
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.dragArea}>
            <View style={styles.handle} />
            <View style={styles.titleRow}>
              <View style={styles.titleCopy}>
                <Text allowFontScaling={false} style={styles.title}>
                  Up Next
                </Text>
                <Text allowFontScaling={false} style={styles.subtitle}>
                  {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'} remaining
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close up next"
                hitSlop={10}
                onPress={() => onCloseRef.current()}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.closeButtonPressed,
                ]}
              >
                <X color={redesignColors.ash} size={21} strokeWidth={2.4} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(event) => {
              scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
            }}
            contentContainerStyle={styles.list}
          >
            {exercises.map(({ exercise, index }, queueIndex) => {
              const catalogExercise = catalogByName.get(exercise.name);
              const muscleColor = catalogExercise
                ? MUSCLE_GROUP_COLORS[getMuscleGroupForExercise(catalogExercise)]
                : accent;

              return (
                <TouchableOpacity
                  key={`${exercise.name}-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${exercise.name}, ${exercise.sets.length} ${
                    exercise.sets.length === 1 ? 'set' : 'sets'
                  }`}
                  accessibilityHint="Jump to this exercise"
                  activeOpacity={0.72}
                  onPress={() => onNavigate(index)}
                  style={[styles.row, queueIndex === exercises.length - 1 && styles.lastRow]}
                >
                  <View style={[styles.dot, { backgroundColor: muscleColor }]} />
                  <Text numberOfLines={1} allowFontScaling={false} style={styles.exerciseName}>
                    {exercise.name}
                  </Text>
                  <Text numberOfLines={1} allowFontScaling={false} style={styles.setCount}>
                    {exercise.sets.length} {exercise.sets.length === 1 ? 'SET' : 'SETS'}
                  </Text>
                  <ChevronRight color={redesignColors.ashDim} size={18} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </GestureHandlerRootView>
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
    paddingBottom: 18,
  },
  handle: {
    width: 38,
    height: 4,
    alignSelf: 'center',
    borderRadius: 2,
    marginBottom: 19,
    backgroundColor: redesignColors.hi,
  },
  titleRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: redesignFonts.display,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: redesignColors.bone,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: redesignFonts.ui,
    fontSize: 13,
    lineHeight: 17,
    color: redesignColors.ashDim,
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
  list: {
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  row: {
    minHeight: 60,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.raised,
  },
  lastRow: {
    marginBottom: 0,
  },
  dot: {
    width: 11,
    height: 11,
    marginRight: 14,
    borderRadius: 6,
  },
  exerciseName: {
    flex: 1,
    minWidth: 0,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 16,
    lineHeight: 20,
    color: redesignColors.bone,
  },
  setCount: {
    marginLeft: 10,
    marginRight: 8,
    fontFamily: redesignFonts.monoBold,
    fontSize: 10,
    letterSpacing: 1.1,
    color: redesignColors.ashDim,
  },
});
