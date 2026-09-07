import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check, Pencil, Plus, Repeat2, X } from 'lucide-react-native';
import Reanimated from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatusPill } from '@/components/StatusPill';
import { WorkoutDayLabel } from '@/components/WorkoutDayLabel';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { usePressScale } from '@/hooks/usePressScale';
import {
  CUSTOM_SPLIT_MUSCLE_GROUPS,
  getMuscleGroupForExercise,
  getWorkoutTypeForMuscleGroup,
  type CustomSplitMuscleGroup,
} from '@/store/customSplitDraft';
import { readExerciseCatalogSync } from '@/store/workoutDatabase';
import {
  type Exercise,
  type ExerciseCatalogItem,
  useWorkoutStore,
} from '@/store/workoutStore';

type SwapExerciseSheetProps = {
  visible: boolean;
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
  onEdit?: () => void;
  onDelete?: () => void;
  isSwipeable?: boolean;
};

type ExerciseEditor =
  | { kind: 'add' }
  | { kind: 'rename'; exercise: ExerciseCatalogItem }
  | null;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';

const ReanimatedPressable = Reanimated.createAnimatedComponent(Pressable);
const ReanimatedTouchableOpacity = Reanimated.createAnimatedComponent(TouchableOpacity);

function selectionFeedback() {
  if (Platform.OS !== 'web') void Haptics.selectionAsync();
}

function ExerciseSwapRow({
  name,
  accent,
  isCurrent,
  isCompleted = false,
  action = 'navigate',
  isLast,
  onPress,
  onEdit,
  onDelete,
  isSwipeable = false,
}: ExerciseSwapRowProps) {
  const pressScale = usePressScale('surface');

  const handlePress = () => {
    selectionFeedback();
    onPress();
  };

  return (
    <View
      style={[
        styles.row,
        isCurrent && {
          borderColor: `${accent}8C`,
          backgroundColor: `${accent}16`,
        },
        isLast && styles.lastRow,
        isSwipeable && styles.swipeableRow,
      ]}
    >
      <View style={styles.rowContent}>
        <ReanimatedTouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={
            action === 'replace'
              ? `Replace current exercise with ${name}`
              : `${name}${isCompleted ? ', completed' : ''}${
                  isCurrent ? ', current exercise' : ''
                }`
          }
          accessibilityState={{ selected: isCurrent }}
          accessibilityHint={
            onEdit
              ? 'Swipe left to reveal Rename, or use the Rename accessibility action.'
              : onDelete
                ? 'Swipe left to reveal Delete, or use the Delete accessibility action.'
                : undefined
          }
          accessibilityActions={
            onEdit
              ? [{ name: 'rename', label: `Rename ${name}` }]
              : onDelete
                ? [{ name: 'delete', label: `Delete ${name}` }]
                : undefined
          }
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'rename') onEdit?.();
            if (event.nativeEvent.actionName === 'delete') onDelete?.();
          }}
          activeOpacity={0.72}
          onPress={handlePress}
          onPressIn={pressScale.onPressIn}
          onPressOut={pressScale.onPressOut}
          style={[styles.rowMain, pressScale.animatedStyle]}
        >
          <View style={styles.nameGroup}>
            <Text
              numberOfLines={1}
              allowFontScaling={false}
              style={[styles.exerciseName, isCurrent && { color: accent }]}
            >
              {name}
            </Text>
            {isCurrent ? (
              <View style={styles.currentBadge}>
                <StatusPill label="Current" color={accent} />
              </View>
            ) : null}
          </View>

          <View style={styles.rowTrailing}>
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
        </ReanimatedTouchableOpacity>
      </View>
    </View>
  );
}

type SwipeableExerciseRowProps = Omit<
  ExerciseSwapRowProps,
  'onDelete' | 'onEdit' | 'isSwipeable'
> & {
  swipeAction: 'delete' | 'rename';
  onAction: (close: () => void) => void;
  onOpen?: (swipeable: SwipeableMethods) => void;
  onClose?: (swipeable: SwipeableMethods) => void;
};

function SwipeableExerciseRow({
  swipeAction,
  onAction,
  onOpen,
  onClose,
  ...rowProps
}: SwipeableExerciseRowProps) {
  const swipeableRef = useRef<SwipeableMethods>(null);
  const isOpenRef = useRef(false);
  const suppressPressUntilRef = useRef(0);
  const close = useCallback(() => swipeableRef.current?.close(), []);
  const isRename = swipeAction === 'rename';

  const suppressRowPress = useCallback(() => {
    suppressPressUntilRef.current = Date.now() + 450;
  }, []);

  const handleRowPress = useCallback(() => {
    if (Date.now() < suppressPressUntilRef.current) return;
    if (isOpenRef.current) {
      close();
      return;
    }
    rowProps.onPress();
  }, [close, rowProps]);

  return (
    <Swipeable
      ref={swipeableRef}
      friction={isRename ? 1 : 2}
      rightThreshold={isRename ? 28 : 56}
      dragOffsetFromRightEdge={isRename ? 6 : 10}
      overshootRight={false}
      onSwipeableOpenStartDrag={suppressRowPress}
      onSwipeableCloseStartDrag={suppressRowPress}
      onSwipeableWillOpen={() => {
        isOpenRef.current = true;
        if (swipeableRef.current) onOpen?.(swipeableRef.current);
      }}
      onSwipeableClose={() => {
        isOpenRef.current = false;
        if (swipeableRef.current) onClose?.(swipeableRef.current);
      }}
      renderRightActions={() => (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`${isRename ? 'Rename' : 'Delete'} ${rowProps.name}`}
          accessibilityHint={
            isRename ? 'Opens the exercise name editor' : 'Deletes this exercise permanently'
          }
          activeOpacity={0.78}
          onPress={() => onAction(close)}
          style={[
            styles.swipeAction,
            isRename ? { backgroundColor: rowProps.accent } : styles.deleteAction,
          ]}
        >
          {isRename ? (
            <Pencil color={redesignColors.ink} size={16} strokeWidth={2.3} />
          ) : null}
          <Text
            allowFontScaling={false}
            style={[styles.swipeActionLabel, isRename && styles.renameActionLabel]}
          >
            {isRename ? 'Rename' : 'Delete'}
          </Text>
        </TouchableOpacity>
      )}
      containerStyle={[styles.swipeableContainer, rowProps.isLast && styles.lastRow]}
    >
      <ExerciseSwapRow
        {...rowProps}
        isSwipeable
        onPress={handleRowPress}
        onEdit={isRename ? () => onAction(close) : undefined}
        onDelete={isRename ? undefined : () => onAction(close)}
      />
    </Swipeable>
  );
}

export function SwapExerciseSheet({
  visible,
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
  const confirmPressScale = usePressScale();
  const onCloseRef = useRef(onClose);
  const scrollOffsetRef = useRef(0);
  const openSwipeableRef = useRef<SwipeableMethods | null>(null);
  const getExercisesForWorkoutType = useWorkoutStore(
    (state) => state.getExercisesForWorkoutType
  );
  const getExerciseWorkoutType = useWorkoutStore((state) => state.getExerciseWorkoutType);
  const addExerciseToSplit = useWorkoutStore((state) => state.addExerciseToSplit);
  const renameExercise = useWorkoutStore((state) => state.renameExercise);
  const hasExerciseHistory = useWorkoutStore((state) => state.hasExerciseHistory);
  const deleteExercise = useWorkoutStore((state) => state.deleteExercise);

  const [exerciseCatalog, setExerciseCatalog] = useState<ExerciseCatalogItem[]>([]);
  const [addCatalog, setAddCatalog] = useState<ExerciseCatalogItem[]>([]);
  const [addMuscleGroup, setAddMuscleGroup] = useState<CustomSplitMuscleGroup | null>(null);
  const [pendingExerciseName, setPendingExerciseName] = useState<string | null>(null);
  // Exercises added from this sheet land in Other Exercises, not the session —
  // the user picks one to swap in when they choose to.
  const [addedExerciseNames, setAddedExerciseNames] = useState<string[]>([]);
  const [editor, setEditor] = useState<ExerciseEditor>(null);
  const [exerciseName, setExerciseName] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const closeOpenSwipeable = useCallback(() => {
    openSwipeableRef.current?.close();
    openSwipeableRef.current = null;
  }, []);

  const handleSwipeableOpen = useCallback((swipeable: SwipeableMethods) => {
    if (openSwipeableRef.current !== swipeable) {
      openSwipeableRef.current?.close();
      openSwipeableRef.current = swipeable;
    }
  }, []);

  const handleSwipeableClose = useCallback((swipeable: SwipeableMethods) => {
    if (openSwipeableRef.current === swipeable) openSwipeableRef.current = null;
  }, []);

  const refreshCatalog = useCallback(() => {
    const type = getExerciseWorkoutType(currentExerciseName);
    setExerciseCatalog(type ? getExercisesForWorkoutType(type) : []);
    // The Add Exercise catalog is intentionally independent of the currently
    // viewed exercise — it always covers every muscle group, unlike Swap's
    // same-type-only suggestions.
    setAddCatalog(readExerciseCatalogSync());
  }, [currentExerciseName, getExerciseWorkoutType, getExercisesForWorkoutType]);

  const scheduledNames = useMemo(
    () => new Set(sessionExercises.map((exercise) => exercise.name)),
    [sessionExercises]
  );
  const catalogByName = useMemo(
    () => new Map(addCatalog.map((exercise) => [exercise.name, exercise])),
    [addCatalog]
  );
  const otherExercises = useMemo(() => {
    const listed = new Set(exerciseCatalog.map((exercise) => exercise.name));
    const added = addedExerciseNames
      .filter((name) => !listed.has(name))
      .map((name) => catalogByName.get(name))
      .filter((exercise): exercise is ExerciseCatalogItem => Boolean(exercise));
    return [...exerciseCatalog, ...added].filter(
      (exercise) => !scheduledNames.has(exercise.name)
    );
  }, [addedExerciseNames, catalogByName, exerciseCatalog, scheduledNames]);
  const normalizedExerciseQuery = exerciseName.trim().toLowerCase();
  const addMatches = useMemo(
    () =>
      addMuscleGroup
        ? addCatalog.filter(
            (exercise) =>
              getMuscleGroupForExercise(exercise) === addMuscleGroup &&
              !scheduledNames.has(exercise.name) &&
              exercise.name.toLowerCase().includes(normalizedExerciseQuery)
          )
        : [],
    [addCatalog, addMuscleGroup, normalizedExerciseQuery, scheduledNames]
  );

  useEffect(() => {
    onCloseRef.current = () => {
      closeOpenSwipeable();
      onClose();
    };
  }, [closeOpenSwipeable, onClose]);

  useEffect(() => {
    if (!visible) {
      closeOpenSwipeable();
      return;
    }

    translateY.setValue(0);
    setPendingExerciseName(null);
    setEditor(null);
    setExerciseName('');
    setAddMuscleGroup(null);
    setFormError(null);
    setAddedExerciseNames([]);
    refreshCatalog();
  }, [closeOpenSwipeable, currentExerciseName, refreshCatalog, translateY, visible]);

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

  const closeEditor = () => {
    setEditor(null);
    setExerciseName('');
    setAddMuscleGroup(null);
    setFormError(null);
  };

  const openAddEditor = () => {
    closeOpenSwipeable();
    setPendingExerciseName(null);
    setEditor({ kind: 'add' });
    setExerciseName('');
    setAddMuscleGroup(null);
    setFormError(null);
  };

  const openRenameEditor = (exercise: ExerciseCatalogItem) => {
    closeOpenSwipeable();
    setPendingExerciseName(null);
    setEditor({ kind: 'rename', exercise });
    setExerciseName(exercise.name);
    setAddMuscleGroup(null);
    setFormError(null);
  };

  const chooseRenameExercise = (exercise: ExerciseCatalogItem, close: () => void) => {
    close();
    selectionFeedback();
    openRenameEditor(exercise);
  };

  const rememberAddedExercise = (name: string) => {
    setAddedExerciseNames((names) => (names.includes(name) ? names : [...names, name]));
  };

  const chooseAddExercise = (name: string) => {
    selectionFeedback();
    rememberAddedExercise(name);
    closeEditor();
  };

  const submitEditor = () => {
    if (!editor) return;

    const name = exerciseName.trim();
    if (!name) {
      setFormError('Exercise name cannot be empty.');
      return;
    }

    if (editor.kind === 'rename') {
      try {
        renameExercise(editor.exercise.id, name);
        refreshCatalog();
        closeEditor();
      } catch (error) {
        setFormError(errorMessage(error));
      }
      return;
    }

    // Typing the name of an exercise that already exists just adds that
    // exercise — it never creates a duplicate catalog row.
    const existingMatch = addCatalog.find(
      (exercise) => exercise.name.toLowerCase() === name.toLowerCase()
    );
    if (existingMatch) {
      rememberAddedExercise(existingMatch.name);
      closeEditor();
      return;
    }

    if (!addMuscleGroup) {
      setFormError('Choose a muscle group.');
      return;
    }

    try {
      const newExerciseType = getWorkoutTypeForMuscleGroup(addMuscleGroup);
      addExerciseToSplit(newExerciseType, name, addMuscleGroup);
      rememberAddedExercise(name);
      refreshCatalog();
      closeEditor();
    } catch (error) {
      setFormError(errorMessage(error));
    }
  };

  const chooseExercise = (name: string) => {
    closeOpenSwipeable();
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
    if (pendingExerciseName) {
      selectionFeedback();
      onReplace(pendingExerciseName);
    }
  };

  const requestDeleteExercise = (exercise: ExerciseCatalogItem, close: () => void) => {
    close();
    if (hasExerciseHistory(exercise.id)) {
      Alert.alert(
        'Can’t Delete Exercise',
        `${exercise.name} can’t be deleted because it has logged history.`
      );
      return;
    }

    Alert.alert('Delete Exercise?', `Delete ${exercise.name}? This can’t be undone.`, [
      { text: 'Cancel', style: 'cancel', onPress: close },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          close();
          try {
            deleteExercise(exercise.id);
            refreshCatalog();
          } catch (error) {
            const message = errorMessage(error);
            if (message.includes('logged history')) {
              Alert.alert(
                'Can’t Delete Exercise',
                `${exercise.name} can’t be deleted because it has logged history.`
              );
            } else {
              Alert.alert('Couldn’t Delete Exercise', message);
            }
          }
        },
      },
    ]);
  };

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
          accessibilityLabel="Close exercises"
          style={styles.backdrop}
          onPress={() => onCloseRef.current()}
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
                onPress={() => onCloseRef.current()}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.closeButtonPressed,
                ]}
              >
                <X color={redesignColors.ash} size={21} strokeWidth={2.4} />
              </Pressable>
            </View>
            <View style={styles.dayActions}>
              <WorkoutDayLabel accent={accent} label={dayLabel} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add exercise"
                onPress={openAddEditor}
                style={({ pressed }) => [
                  styles.addExerciseButton,
                  pressed && styles.addExerciseButtonPressed,
                ]}
              >
                <View style={styles.addExerciseContent}>
                  <Plus color={accent} size={16} strokeWidth={2.5} />
                  <Text
                    numberOfLines={1}
                    allowFontScaling={false}
                    style={[styles.addExerciseLabel, { color: accent }]}
                  >
                    Add exercise
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>

          {editor ? (
            <View style={styles.editor}>
              <View style={styles.editorTitleRow}>
                <Text allowFontScaling={false} style={styles.editorTitle}>
                  {editor.kind === 'rename' ? 'Rename exercise' : 'Add exercise'}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel editing exercise"
                  hitSlop={8}
                  onPress={closeEditor}
                >
                  <X color={redesignColors.ash} size={18} strokeWidth={2.3} />
                </Pressable>
              </View>

              <Text allowFontScaling={false} style={styles.fieldLabel}>
                EXERCISE NAME
              </Text>
              <TextInput
                autoFocus
                autoCorrect={false}
                maxLength={80}
                returnKeyType={editor.kind === 'rename' ? 'done' : 'next'}
                value={exerciseName}
                onChangeText={(value) => {
                  setExerciseName(value);
                  setFormError(null);
                }}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                onSubmitEditing={submitEditor}
                placeholder="Exercise name"
                placeholderTextColor={redesignColors.ashDim}
                style={[
                  styles.textInput,
                  nameFocused && { borderColor: accent },
                ]}
              />

              {editor.kind === 'add' ? (
                <>
                  <View style={styles.muscleLabelRow}>
                    <Text allowFontScaling={false} style={[styles.fieldLabel, styles.muscleLabel]}>
                      MUSCLE GROUP
                    </Text>
                    <Text allowFontScaling={false} style={styles.muscleHint}>
                      Choose one
                    </Text>
                  </View>
                  <View style={styles.muscleTags}>
                    {CUSTOM_SPLIT_MUSCLE_GROUPS.map((group) => {
                      const isSelected = addMuscleGroup === group;
                      return (
                        <TouchableOpacity
                          key={group}
                          accessibilityRole="radio"
                          accessibilityLabel={group}
                          accessibilityState={{ checked: isSelected }}
                          activeOpacity={0.72}
                          onPress={() => {
                            setAddMuscleGroup(group);
                            setFormError(null);
                          }}
                          style={[
                            styles.muscleTag,
                            {
                              borderColor: accent,
                              backgroundColor: `${accent}18`,
                            },
                            isSelected && {
                              borderColor: accent,
                              backgroundColor: accent,
                            },
                          ]}
                        >
                          <Text
                            allowFontScaling={false}
                            style={[
                              styles.muscleTagLabel,
                              { color: accent },
                              isSelected && styles.muscleTagLabelSelected,
                            ]}
                          >
                            {group}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {addMuscleGroup ? (
                    <View style={styles.addMatches}>
                      <Text allowFontScaling={false} style={styles.muscleHint}>
                        {addMatches.length
                          ? `Existing ${addMuscleGroup.toLowerCase()} exercises`
                          : `No existing ${addMuscleGroup.toLowerCase()} exercises — create one below.`}
                      </Text>
                      {addMatches.map((exercise) => (
                        <TouchableOpacity
                          key={exercise.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Add ${exercise.name} to today's workout`}
                          activeOpacity={0.72}
                          onPress={() => chooseAddExercise(exercise.name)}
                          style={styles.addMatchRow}
                        >
                          <Text allowFontScaling={false} style={styles.addMatchName}>
                            {exercise.name}
                          </Text>
                          <Plus color={accent} size={15} strokeWidth={2.5} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </>
              ) : null}

              {formError ? (
                <Text accessibilityRole="alert" allowFontScaling={false} style={styles.formError}>
                  {formError}
                </Text>
              ) : null}

              <View style={styles.editorActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={closeEditor}
                  style={({ pressed }) => [
                    styles.cancelButton,
                    styles.editorCancelButton,
                    pressed && styles.actionButtonPressed,
                  ]}
                >
                  <Text allowFontScaling={false} style={styles.cancelLabel}>
                    Cancel
                  </Text>
                </Pressable>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={
                    editor.kind === 'rename' ? 'Save exercise name' : 'Create new exercise'
                  }
                  activeOpacity={0.78}
                  onPress={submitEditor}
                  style={[
                    styles.continueButton,
                    editor.kind === 'rename' && styles.saveButton,
                    { backgroundColor: accent, borderColor: accent },
                  ]}
                >
                  {editor.kind === 'add' ? (
                    <Plus color={redesignColors.ink} size={15} strokeWidth={2.8} />
                  ) : null}
                  <Text allowFontScaling={false} style={styles.continueLabel}>
                    {editor.kind === 'rename' ? 'Save' : 'Create exercise'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

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
                  style={({ pressed }) => [
                    styles.cancelButton,
                    pressed && styles.actionButtonPressed,
                  ]}
                >
                  <Text allowFontScaling={false} style={styles.cancelLabel}>
                    Cancel
                  </Text>
                </Pressable>
                <ReanimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel="Confirm exercise replacement"
                  onPress={confirmSwap}
                  onPressIn={confirmPressScale.onPressIn}
                  onPressOut={confirmPressScale.onPressOut}
                  style={[
                    styles.continueButton,
                    { backgroundColor: accent },
                    confirmPressScale.animatedStyle,
                  ]}
                >
                  <Text allowFontScaling={false} style={styles.continueLabel}>
                    Continue
                  </Text>
                </ReanimatedPressable>
              </View>
            </View>
          ) : null}

          <ScrollView
            style={styles.scroll}
            bounces={false}
            keyboardShouldPersistTaps="handled"
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
              const catalogExercise = catalogByName.get(exercise.name);
              const canRename =
                catalogExercise !== undefined &&
                !isCompleted &&
                !hasExerciseHistory(catalogExercise.id);
              const rowProps = {
                name: exercise.name,
                accent,
                isCurrent,
                isCompleted,
                isLast: index === sessionExercises.length - 1,
                onPress: () => {
                  closeOpenSwipeable();
                  if (isCurrent) onClose();
                  else onNavigate(index);
                },
              };

              return canRename && catalogExercise ? (
                <SwipeableExerciseRow
                  {...rowProps}
                  key={`${exercise.name}-${index}`}
                  swipeAction="rename"
                  onAction={(close) => chooseRenameExercise(catalogExercise, close)}
                  onOpen={handleSwipeableOpen}
                  onClose={handleSwipeableClose}
                />
              ) : (
                <ExerciseSwapRow {...rowProps} key={`${exercise.name}-${index}`} />
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
                {otherExercises.map((exercise, index) => (
                  <SwipeableExerciseRow
                    key={exercise.id}
                    name={exercise.name}
                    accent={accent}
                    isCurrent={false}
                    action="replace"
                    isLast={index === otherExercises.length - 1}
                    onPress={() => chooseExercise(exercise.name)}
                    swipeAction="delete"
                    onAction={(close) => requestDeleteExercise(exercise, close)}
                    onOpen={handleSwipeableOpen}
                    onClose={handleSwipeableClose}
                  />
                ))}
              </>
            ) : null}
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
  dayActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  addExerciseButton: {
    minHeight: 34,
    flexShrink: 0,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.raised,
  },
  addExerciseContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addExerciseButtonPressed: {
    backgroundColor: redesignColors.hi,
  },
  addExerciseLabel: {
    marginLeft: 6,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 13,
  },
  editor: {
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.raised,
  },
  editorTitleRow: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editorTitle: {
    fontFamily: redesignFonts.uiBold,
    fontSize: 16,
    color: redesignColors.bone,
  },
  fieldLabel: {
    marginBottom: 7,
    fontFamily: redesignFonts.monoBold,
    fontSize: 9,
    lineHeight: 13,
    letterSpacing: 1.2,
    color: redesignColors.ash,
  },
  muscleLabel: {
    marginTop: 0,
    marginBottom: 0,
  },
  muscleLabelRow: {
    marginTop: 16,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  muscleHint: {
    fontFamily: redesignFonts.ui,
    fontSize: 11,
    lineHeight: 15,
    color: redesignColors.ash,
  },
  textInput: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 16,
    color: redesignColors.bone,
    backgroundColor: redesignColors.surface,
  },
  muscleTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 9,
  },
  muscleTag: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  muscleTagLabel: {
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 13,
    lineHeight: 20,
    color: redesignColors.bone,
  },
  muscleTagLabelSelected: {
    color: redesignColors.bone,
  },
  addMatches: {
    marginTop: 16,
  },
  addMatchRow: {
    minHeight: 46,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderRadius: 13,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.surface,
  },
  addMatchName: {
    flexShrink: 1,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 14,
    color: redesignColors.bone,
  },
  formError: {
    marginTop: 10,
    fontFamily: redesignFonts.ui,
    fontSize: 13,
    lineHeight: 17,
    color: '#FF8074',
  },
  editorActions: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
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
  editorCancelButton: {
    minHeight: 34,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  continueButton: {
    minHeight: 36,
    minWidth: 124,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  saveButton: {
    minWidth: 88,
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 11,
  },
  continueLabel: {
    fontFamily: redesignFonts.uiBold,
    fontSize: 13,
    color: redesignColors.ink,
  },
  actionButtonPressed: {
    opacity: 0.72,
  },
  list: {
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  scroll: {
    flex: 1,
  },
  row: {
    minHeight: 60,
    width: '100%',
    marginBottom: 8,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.raised,
    overflow: 'hidden',
  },
  swipeableContainer: {
    minHeight: 60,
    width: '100%',
    marginBottom: 8,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.raised,
    overflow: 'hidden',
  },
  swipeableRow: {
    marginBottom: 0,
    borderWidth: 0,
    borderRadius: 0,
  },
  swipeAction: {
    width: 106,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 18,
    flexDirection: 'row',
    gap: 7,
  },
  deleteAction: {
    width: 94,
    backgroundColor: '#E5484D',
  },
  swipeActionLabel: {
    fontFamily: redesignFonts.uiBold,
    fontSize: 15,
    color: redesignColors.bone,
  },
  renameActionLabel: {
    color: redesignColors.ink,
  },
  rowContent: {
    minHeight: 58,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowMain: {
    minHeight: 58,
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 10,
  },
  lastRow: {
    marginBottom: 0,
  },
  exerciseName: {
    flexShrink: 1,
    minWidth: 0,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 16,
    lineHeight: 20,
    color: redesignColors.bone,
  },
  nameGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentBadge: {
    flexShrink: 0,
    marginLeft: 8,
  },
  rowTrailing: {
    flexShrink: 0,
    marginLeft: 10,
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
