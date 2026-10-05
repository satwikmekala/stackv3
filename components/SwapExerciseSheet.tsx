import { displayExerciseName } from '@/constants/exerciseNames';
import { WorkoutTouchable } from '@/components/WorkoutTouchable';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
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
import * as Haptics from '@/services/haptics';
import {
  Check,
  ChevronLeft,
  Pencil,
  Plus,
  Repeat2,
  Search,
  X,
} from 'lucide-react-native';
import Reanimated, { useReducedMotion } from 'react-native-reanimated';
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
  mode?: 'manage' | 'add';
  sessionId?: string;
  onAdded?: () => void;
  visible: boolean;
  dayLabel: string;
  accent: string;
  currentExerciseIndex?: number;
  currentExerciseName?: string;
  completedSetCount?: number;
  sessionExercises: Exercise[];
  onNavigate: (exerciseIndex: number) => void;
  onReplace?: (name: string) => void;
  onClose: () => void;
};

type ExerciseSwapRowProps = {
  name: string;
  accent: string;
  isCurrent: boolean;
  isCompleted?: boolean;
  isAdded?: boolean;
  action?: 'navigate' | 'replace' | 'add';
  isLast: boolean;
  onPress: () => void;
  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isSwipeable?: boolean;
};

type ExerciseEditor =
  | { kind: 'add' }
  | { kind: 'rename'; exercise: ExerciseCatalogItem }
  | null;

function filterExercises(
  exercises: ExerciseCatalogItem[],
  query: string,
  muscleGroup: CustomSplitMuscleGroup | null,
) {
  const normalizedQuery = query.trim().toLowerCase();
  return exercises.filter(
    (exercise) =>
      (!muscleGroup || getMuscleGroupForExercise(exercise) === muscleGroup) &&
      (exercise.name.toLowerCase().includes(normalizedQuery) || displayExerciseName(exercise.name).toLowerCase().includes(normalizedQuery)),
  );
}

const errorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : '';
  if (message === 'Name is already used' || /^An exercise named ".*" already exists\.$/.test(message))
    return 'An exercise with this name already exists.';
  if (message === 'This exercise has logged history and cannot be renamed.' ||
      message === 'This exercise has logged history and cannot be deleted.') return message;
  return 'Couldn’t save this change. Try again.';
};

const ReanimatedPressable = Reanimated.createAnimatedComponent(Pressable);
const ReanimatedTouchableOpacity =
  Reanimated.createAnimatedComponent(TouchableOpacity);

function selectionFeedback() {
  if (Platform.OS !== 'web') void Haptics.selectionAsync();
}

function ExerciseSwapRow({
  name,
  accent,
  isCurrent,
  isCompleted = false,
  isAdded = false,
  action = 'navigate',
  isLast,
  onPress,
  onAdd,
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
            action === 'add'
              ? `Add ${displayExerciseName(name)}${isAdded ? ', already added' : ''}`
              : action === 'replace'
                ? `Replace current exercise with ${displayExerciseName(name)}`
                : `${displayExerciseName(name)}${isCompleted ? ', completed' : ''}${
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
              ? [{ name: 'rename', label: `Rename ${displayExerciseName(name)}` }]
              : onDelete
                ? [{ name: 'delete', label: `Delete ${displayExerciseName(name)}` }]
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
              allowFontScaling={false}
              style={[styles.exerciseName, isCurrent && { color: accent }]}
            >
              {displayExerciseName(name)}
              {action === 'add' && isAdded ? ' · Already added' : ''}
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
          </View>
        </ReanimatedTouchableOpacity>
        {action === 'replace' ? (
          <>
            <WorkoutTouchable
              accessibilityRole="button"
              accessibilityLabel={
                isAdded
                  ? `${displayExerciseName(name)} is already in today's workout`
                  : `Add ${displayExerciseName(name)} to today's workout`
              }
              accessibilityState={{ disabled: isAdded }}
              disabled={isAdded}
              onPress={() => {
                selectionFeedback();
                onAdd?.();
              }}
              style={styles.rowIconButton}
            >
              {isAdded ? (
                <Check color={accent} size={21} strokeWidth={2.7} />
              ) : (
                <Plus color={accent} size={22} strokeWidth={2.4} />
              )}
            </WorkoutTouchable>
            <WorkoutTouchable
              accessibilityRole="button"
              accessibilityLabel={`Replace current exercise with ${displayExerciseName(name)}`}
              onPress={handlePress}
              style={styles.rowIconButton}
            >
              <Repeat2 color={accent} size={22} strokeWidth={2.4} />
            </WorkoutTouchable>
          </>
        ) : null}
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
        <WorkoutTouchable
          accessibilityRole="button"
          accessibilityLabel={`${isRename ? 'Rename' : 'Delete'} ${rowProps.name}`}
          accessibilityHint={
            isRename
              ? 'Opens the exercise name editor'
              : 'Deletes this exercise permanently'
          }
          activeOpacity={0.78}
          onPress={() => onAction(close)}
          style={[
            styles.swipeAction,
            isRename
              ? { backgroundColor: rowProps.accent }
              : styles.deleteAction,
          ]}
        >
          {isRename ? (
            <Pencil color={redesignColors.ink} size={16} strokeWidth={2.3} />
          ) : null}
          <Text
            allowFontScaling={false}
            style={[
              styles.swipeActionLabel,
              isRename && styles.renameActionLabel,
            ]}
          >
            {isRename ? 'Rename' : 'Delete'}
          </Text>
        </WorkoutTouchable>
      )}
      containerStyle={[
        styles.swipeableContainer,
        rowProps.isLast && styles.lastRow,
      ]}
    >
      <ExerciseSwapRow
        {...rowProps}
        isSwipeable
        onPress={handleRowPress}
        onAdd={() => {
          if (Date.now() < suppressPressUntilRef.current) return;
          if (isOpenRef.current) {
            close();
            return;
          }
          rowProps.onAdd?.();
        }}
        onEdit={isRename ? () => onAction(close) : undefined}
        onDelete={isRename ? undefined : () => onAction(close)}
      />
    </Swipeable>
  );
}

export function SwapExerciseSheet({
  mode = 'manage',
  sessionId,
  onAdded,
  visible,
  dayLabel,
  accent,
  currentExerciseIndex,
  currentExerciseName,
  completedSetCount = 0,
  sessionExercises,
  onNavigate,
  onReplace,
  onClose,
}: SwapExerciseSheetProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { height: screenHeight } = useWindowDimensions();
  const [translateY] = useState(() => new Animated.Value(0));
  const confirmPressScale = usePressScale();
  const onCloseRef = useRef(onClose);
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const otherSectionYRef = useRef<number | null>(null);
  const pendingScrollCompensationRef = useRef<{
    offset: number;
    otherSectionY: number;
  } | null>(null);
  const openSwipeableRef = useRef<SwipeableMethods | null>(null);
  const createCustomExercise = useWorkoutStore(
    (state) => state.createCustomExercise,
  );
  const appendExerciseToSession = useWorkoutStore(
    (state) => state.appendExerciseToSession,
  );
  const renameExercise = useWorkoutStore((state) => state.renameExercise);
  const hasExerciseHistory = useWorkoutStore(
    (state) => state.hasExerciseHistory,
  );
  const deleteExercise = useWorkoutStore((state) => state.deleteExercise);

  const [otherQuery, setOtherQuery] = useState('');
  const [otherMuscleGroup, setOtherMuscleGroup] =
    useState<CustomSplitMuscleGroup | null>(null);
  const [addCatalog, setAddCatalog] = useState<ExerciseCatalogItem[]>([]);
  const [addMuscleGroup, setAddMuscleGroup] =
    useState<CustomSplitMuscleGroup | null>(null);
  const [pendingExerciseName, setPendingExerciseName] = useState<string | null>(
    null,
  );
  // Manage mode can stage catalog entries; add mode inserts directly into the session.
  const [addedExerciseNames, setAddedExerciseNames] = useState<string[]>([]);
  const [editor, setEditor] = useState<ExerciseEditor>(null);
  const [exerciseName, setExerciseName] = useState('');
  const [loadType, setLoadType] = useState<'external_weight' | 'bodyweight'>(
    'external_weight',
  );
  const [metric, setMetric] = useState<'reps' | 'duration'>('reps');
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
    const catalog = readExerciseCatalogSync();
    setAddCatalog(catalog);
    return catalog;
  }, []);

  const scheduledNames = useMemo(
    () => new Set(sessionExercises.map((exercise) => exercise.name)),
    [sessionExercises],
  );
  const catalogByName = useMemo(
    () => new Map(addCatalog.map((exercise) => [exercise.name, exercise])),
    [addCatalog],
  );
  const otherExercises = useMemo(() => {
    const addedNames = new Set(addedExerciseNames);
    const added = addedExerciseNames
      .map((name) => catalogByName.get(name))
      .filter((exercise): exercise is ExerciseCatalogItem => Boolean(exercise));
    return [
      ...added,
      ...addCatalog.filter((exercise) => !addedNames.has(exercise.name)),
    ];
  }, [addedExerciseNames, addCatalog, catalogByName]);
  const addMatches = useMemo(
    () =>
      exerciseName.trim()
        ? filterExercises(addCatalog, exerciseName, null).filter(
            (exercise) => !scheduledNames.has(exercise.name),
          )
        : [],
    [addCatalog, exerciseName, scheduledNames],
  );
  const existingNameMatch = addCatalog.find(
    (exercise) =>
      exercise.name.toLowerCase() === exerciseName.trim().toLowerCase(),
  );
  const canSubmitEditor =
    Boolean(exerciseName.trim()) &&
    (editor?.kind === 'rename' ||
      Boolean(existingNameMatch) ||
      Boolean(addMuscleGroup));
  const otherMatches = useMemo(
    () => filterExercises(otherExercises, otherQuery, otherMuscleGroup),
    [otherExercises, otherQuery, otherMuscleGroup],
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
    // Reset the transient editor when the parent presents a new exercise context.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingExerciseName(null);
    setEditor(null);
    setExerciseName('');
    setAddMuscleGroup(null);
    setFormError(null);
    setAddedExerciseNames([]);
    setOtherQuery('');
    const catalog = refreshCatalog();
    const currentExercise = catalog.find(
      (exercise) => exercise.name === currentExerciseName,
    );
    setOtherMuscleGroup(
      mode === 'manage' && currentExercise
        ? getMuscleGroupForExercise(currentExercise)
        : null,
    );
  }, [
    closeOpenSwipeable,
    currentExerciseName,
    mode,
    refreshCatalog,
    translateY,
    visible,
  ]);

  const finishDrag = useCallback(
    (distance: number, velocity: number) => {
      if (distance > 80 || velocity > 0.85) {
        if (reduceMotion) {
          onCloseRef.current();
          return;
        }
        Animated.timing(translateY, {
          toValue: screenHeight,
          duration: 180,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) onCloseRef.current();
        });
        return;
      }

      if (reduceMotion) {
        translateY.setValue(0);
        return;
      }
      Animated.spring(translateY, {
        toValue: 0,
        damping: 22,
        stiffness: 240,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    },
    [reduceMotion, screenHeight, translateY],
  );

  // Only the handle/header owns dismissal. Scrolling and text selection inside
  // the body must never start dragging the entire sheet.
  const dragResponder = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs -- PanResponder stores these handlers; it does not call them during render.
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderGrant: () => translateY.stopAnimation(),
        onPanResponderMove: (_, gesture) => {
          translateY.setValue(Math.max(0, gesture.dy));
        },
        onPanResponderRelease: (_, gesture) =>
          finishDrag(gesture.dy, gesture.vy),
        onPanResponderTerminate: () => finishDrag(0, 0),
      }),
    [finishDrag, translateY],
  );

  const resetScroll = () => {
    scrollOffsetRef.current = 0;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const closeEditor = () => {
    Keyboard.dismiss();
    resetScroll();
    setNameFocused(false);
    setEditor(null);
    setExerciseName('');
    setAddMuscleGroup(null);
    setFormError(null);
  };

  const openAddEditor = () => {
    resetScroll();
    closeOpenSwipeable();
    setPendingExerciseName(null);
    setEditor({ kind: 'add' });
    setLoadType('external_weight');
    setMetric('reps');
    setExerciseName('');
    setAddMuscleGroup(null);
    setFormError(null);
  };

  const openRenameEditor = (exercise: ExerciseCatalogItem) => {
    resetScroll();
    closeOpenSwipeable();
    setPendingExerciseName(null);
    setEditor({ kind: 'rename', exercise });
    setExerciseName(exercise.name);
    setAddMuscleGroup(null);
    setFormError(null);
  };

  const chooseRenameExercise = (
    exercise: ExerciseCatalogItem,
    close: () => void,
  ) => {
    close();
    selectionFeedback();
    openRenameEditor(exercise);
  };

  const rememberAddedExercise = (name: string) => {
    setAddedExerciseNames((names) => [
      name,
      ...names.filter((existing) => existing !== name),
    ]);
    setOtherQuery('');
    setOtherMuscleGroup(null);
  };

  const chooseAddExercise = (name: string) => {
    selectionFeedback();
    try {
      if (mode === 'add' && !addExerciseToSession(name)) {
        setFormError('Couldn’t add exercise. Try again.');
        return;
      }
      if (mode === 'manage') rememberAddedExercise(name);
      closeEditor();
    } catch (error) {
      setFormError(errorMessage(error));
    }
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
      (exercise) => exercise.name.toLowerCase() === name.toLowerCase(),
    );
    if (existingMatch) {
      chooseAddExercise(existingMatch.name);
      return;
    }

    if (!addMuscleGroup) {
      setFormError('Choose a muscle group.');
      return;
    }

    try {
      const newExerciseType = getWorkoutTypeForMuscleGroup(addMuscleGroup);
      const id = createCustomExercise(
        name,
        newExerciseType,
        addMuscleGroup,
        'Other',
        loadType,
        metric,
      );
      if (id === undefined) {
        setFormError('Couldn’t create this exercise. Try again.');
        return;
      }
      refreshCatalog();
      chooseAddExercise(name);
    } catch (error) {
      setFormError(errorMessage(error));
    }
  };

  const chooseExercise = (name: string) => {
    closeOpenSwipeable();
    if (mode === 'add') {
      addExerciseToSession(name);
      return;
    }
    if (name === currentExerciseName) {
      onClose();
      return;
    }

    if (completedSetCount > 0) {
      setPendingExerciseName(name);
      return;
    }

    onReplace?.(name);
  };

  const confirmSwap = () => {
    if (pendingExerciseName) {
      selectionFeedback();
      onReplace?.(pendingExerciseName);
    }
  };

  const addExerciseToSession = (name: string) => {
    if (scheduledNames.has(name)) {
      Alert.alert('Already added', 'This exercise is already in your workout.');
      return false;
    }
    if (mode === 'add') {
      const added = appendExerciseToSession(name, sessionId);
      if (added) {
        onAdded?.();
        onClose();
      }
      return added;
    }

    const previousExerciseCount =
      useWorkoutStore.getState().currentSession?.exercises.length;
    const otherSectionY = otherSectionYRef.current;
    pendingScrollCompensationRef.current =
      scrollOffsetRef.current > 0 && otherSectionY !== null
        ? { offset: scrollOffsetRef.current, otherSectionY }
        : null;

    appendExerciseToSession(name);

    const updatedExercises =
      useWorkoutStore.getState().currentSession?.exercises;
    const wasAdded =
      previousExerciseCount !== undefined &&
      updatedExercises?.length === previousExerciseCount + 1 &&
      updatedExercises.some((exercise) => exercise.name === name);
    if (!wasAdded) pendingScrollCompensationRef.current = null;
    return wasAdded;
  };

  const handleOtherSectionLayout = (nextY: number) => {
    const pendingCompensation = pendingScrollCompensationRef.current;
    otherSectionYRef.current = nextY;
    if (!pendingCompensation) return;

    pendingScrollCompensationRef.current = null;
    const insertedHeight = nextY - pendingCompensation.otherSectionY;
    if (insertedHeight <= 0) return;

    scrollRef.current?.scrollTo({
      y: pendingCompensation.offset + insertedHeight,
      animated: false,
    });
  };

  const requestDeleteExercise = (
    exercise: ExerciseCatalogItem,
    close: () => void,
  ) => {
    close();
    if (hasExerciseHistory(exercise.id)) {
      Alert.alert(
        'Can’t delete exercise',
        `${displayExerciseName(exercise.name)} can’t be deleted because it has logged history.`,
      );
      return;
    }

    Alert.alert(
      'Delete exercise?',
      `Delete ${displayExerciseName(exercise.name)}? This can’t be undone.`,
      [
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
                  'Can’t delete exercise',
                  `${displayExerciseName(exercise.name)} can’t be deleted because it has logged history.`,
                );
              } else {
                Alert.alert('Couldn’t delete exercise', message);
              }
            }
          },
        },
      ],
    );
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType={reduceMotion ? 'fade' : 'slide'}
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

        <KeyboardAvoidingView
          pointerEvents="box-none"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoiding}
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                height: Math.max(0, screenHeight - insets.top - 12),
                paddingBottom: Math.max(insets.bottom, 20),
                transform: [{ translateY }],
              },
            ]}
          >
            <View {...dragResponder.panHandlers} style={styles.dragArea}>
              <View style={styles.handle} />
              <View style={styles.titleRow}>
                {editor ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Back to exercises"
                    onPress={closeEditor}
                    style={({ pressed }) => [
                      styles.backButton,
                      pressed && styles.closeButtonPressed,
                    ]}
                  >
                    <ChevronLeft
                      color={redesignColors.bone}
                      size={24}
                      strokeWidth={2}
                    />
                  </Pressable>
                ) : null}
                <Text style={styles.title}>
                  {editor
                    ? editor.kind === 'rename'
                      ? 'Rename exercise'
                      : 'Add exercise'
                    : mode === 'add'
                      ? 'Add exercise'
                      : 'Exercises'}
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
              {!editor ? (
                <View style={styles.dayActions}>
                  <WorkoutDayLabel accent={accent} label={dayLabel} />
                </View>
              ) : null}
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.scroll}
              automaticallyAdjustKeyboardInsets={false}
              keyboardDismissMode={
                Platform.OS === 'ios' ? 'interactive' : 'on-drag'
              }
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(event) => {
                scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
              }}
              contentContainerStyle={styles.list}
            >
              {editor ? (
                <View style={styles.editor}>
                  <Text style={styles.fieldLabel}>EXERCISE NAME</Text>
                  <TextInput
                    accessibilityLabel="Exercise name"
                    autoFocus
                    autoCorrect={false}
                    selectionColor={accent}
                    submitBehavior="submit"
                    maxLength={80}
                    returnKeyType="done"
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
                      styles.nameInput,
                      nameFocused && { borderColor: accent },
                    ]}
                  />

                  {formError ? (
                    <Text
                      accessibilityRole="alert"
                      accessibilityLiveRegion="polite"
                      style={styles.formError}
                    >
                      {formError}
                    </Text>
                  ) : null}

                  {editor.kind === 'add' && exerciseName.trim() ? (
                    <View style={styles.addMatches}>
                      <Text style={styles.muscleHint}>
                        {addMatches.length
                          ? 'Use an existing exercise'
                          : existingNameMatch
                            ? 'This exercise is already in your workout.'
                            : 'New exercise · choose how to track it below.'}
                      </Text>
                      {addMatches.slice(0, 5).map((exercise) => (
                        <WorkoutTouchable
                          key={exercise.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Use ${displayExerciseName(exercise.name)}`}
                          activeOpacity={0.72}
                          onPress={() => chooseAddExercise(exercise.name)}
                          style={styles.addMatchRow}
                        >
                          <View style={styles.matchText}>
                            <Text style={styles.addMatchName}>
                              {displayExerciseName(exercise.name)}
                            </Text>
                            <Text style={styles.matchDetail}>
                              {getMuscleGroupForExercise(exercise)}
                            </Text>
                          </View>
                          <Plus
                            color={redesignColors.ash}
                            size={20}
                            strokeWidth={2}
                          />
                        </WorkoutTouchable>
                      ))}
                      {addMatches.length > 5 ? (
                        <Text style={[styles.muscleHint, styles.moreMatches]}>
                          {addMatches.length - 5} more matches. Keep typing to
                          narrow the list.
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {editor.kind === 'rename' ? (
                    <Text style={[styles.muscleHint, styles.renameWarning]}>
                      This also renames it in your past workouts and other
                      routines.
                    </Text>
                  ) : null}

                  {editor.kind === 'add' && !existingNameMatch ? (
                    <>
                      <View style={styles.muscleLabelRow}>
                        <Text style={[styles.fieldLabel, styles.muscleLabel]}>
                          MUSCLE GROUP
                        </Text>
                        <Text style={styles.muscleHint}>Choose one</Text>
                      </View>
                      <View style={styles.muscleTags}>
                        {CUSTOM_SPLIT_MUSCLE_GROUPS.map((group) => {
                          const isSelected = addMuscleGroup === group;
                          return (
                            <WorkoutTouchable
                              key={group}
                              accessibilityRole="radio"
                              accessibilityLabel={group}
                              accessibilityState={{ checked: isSelected }}
                              activeOpacity={0.72}
                              onPress={() => {
                                selectionFeedback();
                                setAddMuscleGroup(group);
                                setFormError(null);
                              }}
                              style={[
                                styles.muscleTag,
                                isSelected && {
                                  borderColor: accent,
                                  backgroundColor: `${accent}18`,
                                },
                              ]}
                            >
                              {isSelected ? (
                                <Check
                                  color={accent}
                                  size={15}
                                  strokeWidth={2.5}
                                />
                              ) : null}
                              <Text
                                style={[
                                  styles.muscleTagLabel,
                                  isSelected && { color: accent },
                                ]}
                              >
                                {group}
                              </Text>
                            </WorkoutTouchable>
                          );
                        })}
                      </View>

                      <View style={styles.measurementSection}>
                        <Text style={styles.fieldLabel}>MEASUREMENT</Text>
                        <Text style={styles.measurementHint}>
                          How should this exercise be logged?
                        </Text>
                        <Text style={styles.choiceLabel}>Load</Text>
                        <View style={styles.measurementChoices}>
                          {(['external_weight', 'bodyweight'] as const).map(
                            (value) => {
                              const selected = loadType === value;
                              const label =
                                value === 'bodyweight'
                                  ? 'Bodyweight'
                                  : 'External weight';
                              return (
                                <WorkoutTouchable
                                  key={value}
                                  accessibilityRole="radio"
                                  accessibilityLabel={label}
                                  accessibilityState={{ checked: selected }}
                                  onPress={() => {
                                    selectionFeedback();
                                    setLoadType(value);
                                  }}
                                  style={[
                                    styles.measurementChoice,
                                    selected &&
                                      styles.measurementChoiceSelected,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.muscleTagLabel,
                                      selected && styles.choiceSelectedLabel,
                                    ]}
                                  >
                                    {label}
                                  </Text>
                                  {selected ? (
                                    <Check
                                      color={redesignColors.bone}
                                      size={16}
                                      strokeWidth={2.5}
                                    />
                                  ) : null}
                                </WorkoutTouchable>
                              );
                            },
                          )}
                        </View>
                        <Text style={styles.choiceLabel}>Track</Text>
                        <View style={styles.measurementChoices}>
                          {(['reps', 'duration'] as const).map((value) => {
                            const selected = metric === value;
                            const label = value === 'reps' ? 'Reps' : 'Time';
                            return (
                              <WorkoutTouchable
                                key={value}
                                accessibilityRole="radio"
                                accessibilityLabel={label}
                                accessibilityState={{ checked: selected }}
                                onPress={() => {
                                  selectionFeedback();
                                  setMetric(value);
                                }}
                                style={[
                                  styles.measurementChoice,
                                  selected && styles.measurementChoiceSelected,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.muscleTagLabel,
                                    selected && styles.choiceSelectedLabel,
                                  ]}
                                >
                                  {label}
                                </Text>
                                {selected ? (
                                  <Check
                                    color={redesignColors.bone}
                                    size={16}
                                    strokeWidth={2.5}
                                  />
                                ) : null}
                              </WorkoutTouchable>
                            );
                          })}
                        </View>
                      </View>
                    </>
                  ) : null}
                </View>
              ) : (
                <>
                  {pendingExerciseName ? (
                    <View style={styles.confirmation}>
                      <Text style={styles.confirmationText}>
                        Replacing {currentExerciseName} will discard{' '}
                        {completedSetCount} logged{' '}
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
                          <Text style={styles.cancelLabel}>Cancel</Text>
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
                          <Text style={styles.continueLabel}>Continue</Text>
                        </ReanimatedPressable>
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                      TODAY&apos;S WORKOUT
                    </Text>
                  </View>
                  {/* Session-exercise IDs are not exposed in the UI model yet, so
                these append-only rows currently use name + index keys. */}
                  {sessionExercises.map((exercise, index) => {
                    const isCurrent = index === currentExerciseIndex;
                    const isCompleted = exercise.sets.every(
                      (set) => set.completed,
                    );
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
                        onAction={(close) =>
                          chooseRenameExercise(catalogExercise, close)
                        }
                        onOpen={handleSwipeableOpen}
                        onClose={handleSwipeableClose}
                      />
                    ) : (
                      <ExerciseSwapRow
                        {...rowProps}
                        key={`${exercise.name}-${index}`}
                      />
                    );
                  })}

                  <View
                    onLayout={(event) =>
                      handleOtherSectionLayout(event.nativeEvent.layout.y)
                    }
                    style={[styles.sectionHeader, styles.otherSectionHeader]}
                  >
                    <Text style={styles.sectionTitle}>OTHER EXERCISES</Text>
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
                          style={[styles.addExerciseLabel, { color: accent }]}
                        >
                          Add exercise
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                  <View style={[styles.otherSearchInput, styles.otherSearch]}>
                    <Search color={redesignColors.ashDim} size={19} />
                    <TextInput
                      accessibilityLabel="Search other exercises"
                      placeholder="Search exercises"
                      placeholderTextColor={redesignColors.ashDim}
                      autoCorrect={false}
                      autoCapitalize="none"
                      returnKeyType="search"
                      value={otherQuery}
                      onChangeText={setOtherQuery}
                      style={styles.otherSearchText}
                    />
                    {otherQuery.length > 0 ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Clear exercise search"
                        hitSlop={8}
                        onPress={() => setOtherQuery('')}
                        style={styles.clearOtherSearch}
                      >
                        <X color={redesignColors.ashDim} size={19} />
                      </Pressable>
                    ) : null}
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.otherSearch}
                  >
                    <View style={styles.filterTags}>
                      {[null, ...CUSTOM_SPLIT_MUSCLE_GROUPS].map((group) => (
                        <WorkoutTouchable
                          key={group ?? 'all'}
                          accessibilityRole="button"
                          accessibilityState={{
                            selected: otherMuscleGroup === group,
                          }}
                          onPress={() => {
                            selectionFeedback();
                            setOtherMuscleGroup(group);
                          }}
                          style={[
                            styles.muscleTag,
                            otherMuscleGroup === group && {
                              borderColor: accent,
                              backgroundColor: `${accent}18`,
                            },
                          ]}
                        >
                          {otherMuscleGroup === group ? (
                            <Check color={accent} size={15} strokeWidth={2.5} />
                          ) : null}
                          <Text
                            style={[
                              styles.muscleTagLabel,
                              otherMuscleGroup === group && { color: accent },
                            ]}
                          >
                            {group ?? 'All'}
                          </Text>
                        </WorkoutTouchable>
                      ))}
                    </View>
                  </ScrollView>
                  {otherMatches.map((exercise, index) =>
                    mode === 'add' ? (
                      <ExerciseSwapRow
                        key={exercise.id}
                        name={exercise.name}
                        accent={accent}
                        isCurrent={false}
                        isAdded={scheduledNames.has(exercise.name)}
                        action="add"
                        isLast={index === otherMatches.length - 1}
                        onPress={() => chooseExercise(exercise.name)}
                      />
                    ) : (
                      <SwipeableExerciseRow
                        key={exercise.id}
                        name={exercise.name}
                        accent={accent}
                        isCurrent={false}
                        isAdded={scheduledNames.has(exercise.name)}
                        action="replace"
                        isLast={index === otherMatches.length - 1}
                        onPress={() => chooseExercise(exercise.name)}
                        onAdd={() => {
                          try {
                            addExerciseToSession(exercise.name);
                          } catch (error) {
                            pendingScrollCompensationRef.current = null;
                            Alert.alert(
                              'Couldn’t add exercise',
                              errorMessage(error),
                            );
                          }
                        }}
                        swipeAction="delete"
                        onAction={(close) =>
                          requestDeleteExercise(exercise, close)
                        }
                        onOpen={handleSwipeableOpen}
                        onClose={handleSwipeableClose}
                      />
                    ),
                  )}
                  {!otherMatches.length ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyTitle}>No exercises found</Text>
                      <Text style={styles.measurementHint}>
                        Try another name or muscle group, or add your own
                        exercise.
                      </Text>
                      <WorkoutTouchable
                        accessibilityRole="button"
                        accessibilityLabel="Create an exercise from search"
                        onPress={() => {
                          openAddEditor();
                          setExerciseName(otherQuery);
                        }}
                        style={styles.emptyAction}
                      >
                        <Plus color={redesignColors.bone} size={18} />
                        <Text style={styles.muscleTagLabel}>Add exercise</Text>
                      </WorkoutTouchable>
                    </View>
                  ) : null}
                </>
              )}
            </ScrollView>
            {editor ? (
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
                  <Text style={styles.cancelLabel}>Cancel</Text>
                </Pressable>
                <WorkoutTouchable
                  accessibilityRole="button"
                  accessibilityLabel={
                    editor.kind === 'rename'
                      ? 'Save exercise name'
                      : existingNameMatch
                        ? 'Use existing exercise'
                        : 'Create new exercise'
                  }
                  accessibilityState={{ disabled: !canSubmitEditor }}
                  disabled={!canSubmitEditor}
                  activeOpacity={0.78}
                  onPress={submitEditor}
                  style={[
                    styles.continueButton,
                    styles.editorPrimaryButton,
                    editor.kind === 'rename' && styles.saveButton,
                    { backgroundColor: accent, borderColor: accent },
                    !canSubmitEditor && styles.disabledButton,
                  ]}
                >
                  {editor.kind === 'add' ? (
                    <Plus
                      color={redesignColors.ink}
                      size={15}
                      strokeWidth={2.8}
                    />
                  ) : null}
                  <Text style={styles.continueLabel}>
                    {editor.kind === 'rename'
                      ? 'Save name'
                      : existingNameMatch
                        ? 'Use exercise'
                        : 'Create exercise'}
                  </Text>
                </WorkoutTouchable>
              </View>
            ) : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoiding: { flex: 1, justifyContent: 'flex-end' },
  backButton: {
    width: 44,
    height: 44,
    marginLeft: -8,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInput: { fontSize: 18 },
  measurementSection: { marginTop: 28 },
  measurementHint: {
    fontFamily: redesignFonts.ui,
    fontSize: 14,
    color: redesignColors.ash,
  },
  choiceLabel: {
    marginTop: 18,
    marginBottom: 8,
    fontFamily: redesignFonts.uiMedium,
    fontSize: 14,
    color: redesignColors.ash,
  },
  measurementChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  measurementChoice: {
    flexGrow: 1,
    flexBasis: 136,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.raised,
  },
  measurementChoiceSelected: {
    backgroundColor: redesignColors.hi,
    borderColor: redesignColors.ashDim,
  },
  choiceSelectedLabel: { color: redesignColors.bone },
  matchText: { flex: 1, minWidth: 0, gap: 4 },
  matchDetail: {
    fontFamily: redesignFonts.ui,
    fontSize: 12,
    color: redesignColors.ash,
  },
  moreMatches: { paddingTop: 4 },
  filterTags: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  editorPrimaryButton: { flexGrow: 2, flexBasis: 160 },
  disabledButton: { opacity: 0.4 },
  emptyState: { paddingVertical: 24, gap: 10 },
  emptyTitle: {
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 17,
    color: redesignColors.bone,
  },
  emptyAction: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
  },
  sheet: {
    maxHeight: '100%',
    flexShrink: 1,
    minHeight: 0,
    overflow: 'hidden',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderCurve: 'continuous',
    backgroundColor: redesignColors.surface,
  },
  dragArea: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  titleRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  handle: {
    width: 36,
    height: 4,
    alignSelf: 'center',
    borderRadius: 2,
    marginBottom: 14,
    backgroundColor: redesignColors.hi,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontFamily: redesignFonts.display,
    fontSize: 26,
    letterSpacing: -0.5,
    color: redesignColors.bone,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: redesignColors.raised,
  },
  closeButtonPressed: {
    backgroundColor: redesignColors.hi,
  },
  dayActions: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addExerciseButton: {
    minHeight: 44,
    flexShrink: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: redesignColors.raised,
  },
  addExerciseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addExerciseButtonPressed: {
    backgroundColor: redesignColors.hi,
  },
  addExerciseLabel: {
    flexShrink: 1,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 14,
  },
  editor: {
    paddingTop: 8,
    paddingBottom: 16,
    gap: 0,
  },
  fieldLabel: {
    marginBottom: 10,
    fontFamily: redesignFonts.monoBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: redesignColors.ash,
  },
  muscleLabel: {
    marginTop: 0,
    marginBottom: 0,
  },
  muscleLabelRow: {
    marginTop: 28,
    marginBottom: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  muscleHint: {
    fontFamily: redesignFonts.ui,
    fontSize: 13,
    color: redesignColors.ash,
  },
  textInput: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: redesignColors.border,
    paddingHorizontal: 16,
    paddingVertical: 0,
    textAlignVertical: 'center',
    fontFamily: redesignFonts.uiMedium,
    fontSize: 17,
    color: redesignColors.bone,
    backgroundColor: redesignColors.raised,
  },
  muscleTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 8,
  },
  muscleTag: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.raised,
  },
  muscleTagLabel: {
    flexShrink: 1,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 14,
    color: redesignColors.ash,
  },
  addMatches: {
    marginTop: 16,
    gap: 8,
  },
  addMatchRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: redesignColors.raised,
  },
  addMatchName: {
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 16,
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
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    backgroundColor: redesignColors.surface,
  },
  confirmation: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 18,
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
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: redesignColors.raised,
  },
  cancelLabel: {
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 15,
    color: redesignColors.ash,
  },
  editorCancelButton: {
    flexGrow: 1,
    flexBasis: 72,
  },
  continueButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  saveButton: {
    minWidth: 120,
  },
  continueLabel: {
    flexShrink: 1,
    textAlign: 'center',
    fontFamily: redesignFonts.uiBold,
    fontSize: 15,
    color: redesignColors.ink,
  },
  actionButtonPressed: {
    opacity: 0.72,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  row: {
    minHeight: 64,
    width: '100%',
    marginBottom: 8,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: redesignColors.raised,
    overflow: 'hidden',
  },
  swipeableContainer: {
    minHeight: 64,
    width: '100%',
    marginBottom: 8,
    borderRadius: 16,
    borderCurve: 'continuous',
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
    minHeight: 62,
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 10,
    paddingVertical: 16,
  },
  lastRow: {
    marginBottom: 0,
  },
  exerciseName: {
    flexShrink: 1,
    minWidth: 0,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 16,
    color: redesignColors.bone,
  },
  nameGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  currentBadge: {
    flexShrink: 0,
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
  rowIconButton: {
    width: 48,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renameWarning: { marginTop: 8 },
  otherSearch: { marginBottom: 12 },
  otherSearchInput: {
    minHeight: 52,
    paddingLeft: 15,
    paddingRight: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.raised,
  },
  otherSearchText: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    textAlignVertical: 'center',
    color: redesignColors.bone,
    fontFamily: redesignFonts.uiMedium,
    fontSize: 16,
  },
  clearOtherSearch: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    marginBottom: 11,
    paddingHorizontal: 4,
  },
  otherSectionHeader: {
    marginTop: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: redesignColors.ash,
  },
});
