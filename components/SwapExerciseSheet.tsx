import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Check, Pencil, Plus, Repeat2, X } from 'lucide-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatusPill } from '@/components/StatusPill';
import { WorkoutDayLabel } from '@/components/WorkoutDayLabel';
import { redesignColors, redesignFonts } from '@/constants/theme';
import {
  type Exercise,
  type ExerciseCatalogItem,
  type WorkoutType,
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
        <TouchableOpacity
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
            onDelete
              ? 'Swipe left to reveal Delete, or use the Delete accessibility action.'
              : undefined
          }
          accessibilityActions={
            onDelete ? [{ name: 'delete', label: `Delete ${name}` }] : undefined
          }
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'delete') onDelete?.();
          }}
          activeOpacity={0.72}
          onPress={onPress}
          style={styles.rowMain}
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
        </TouchableOpacity>

        {onEdit ? (
          <View style={styles.editButtonSlot}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Rename ${name}`}
              activeOpacity={0.7}
              onPress={onEdit}
              style={styles.editButton}
            >
              <Pencil color={redesignColors.ash} size={16} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
}

type SwipeableExerciseRowProps = Omit<ExerciseSwapRowProps, 'onDelete' | 'isSwipeable'> & {
  onDelete: (close: () => void) => void;
};

function SwipeableExerciseRow({ onDelete, ...rowProps }: SwipeableExerciseRowProps) {
  const swipeableRef = useRef<SwipeableMethods>(null);
  const close = useCallback(() => swipeableRef.current?.close(), []);

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={56}
      overshootRight={false}
      activeOffsetX={[-12, 12]}
      failOffsetY={[-15, 15]}
      renderRightActions={() => (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Delete ${rowProps.name}`}
          accessibilityHint="Deletes this exercise permanently"
          activeOpacity={0.78}
          onPress={() => onDelete(close)}
          style={styles.deleteAction}
        >
          <Text allowFontScaling={false} style={styles.deleteActionLabel}>
            Delete
          </Text>
        </TouchableOpacity>
      )}
      containerStyle={[styles.swipeableContainer, rowProps.isLast && styles.lastRow]}
    >
      <ExerciseSwapRow {...rowProps} isSwipeable onDelete={() => onDelete(close)} />
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
  const onCloseRef = useRef(onClose);
  const scrollOffsetRef = useRef(0);
  const getExercisesForWorkoutType = useWorkoutStore(
    (state) => state.getExercisesForWorkoutType
  );
  const getExerciseWorkoutType = useWorkoutStore((state) => state.getExerciseWorkoutType);
  const getPrimaryMusclesForWorkoutType = useWorkoutStore(
    (state) => state.getPrimaryMusclesForWorkoutType
  );
  const addExerciseToSplit = useWorkoutStore((state) => state.addExerciseToSplit);
  const renameExercise = useWorkoutStore((state) => state.renameExercise);
  const hasExerciseHistory = useWorkoutStore((state) => state.hasExerciseHistory);
  const deleteExercise = useWorkoutStore((state) => state.deleteExercise);

  const [exerciseCatalog, setExerciseCatalog] = useState<ExerciseCatalogItem[]>([]);
  const [workoutType, setWorkoutType] = useState<WorkoutType | null>(null);
  const [primaryMuscles, setPrimaryMuscles] = useState<string[]>([]);
  const [pendingExerciseName, setPendingExerciseName] = useState<string | null>(null);
  const [editor, setEditor] = useState<ExerciseEditor>(null);
  const [exerciseName, setExerciseName] = useState('');
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [nameFocused, setNameFocused] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const refreshCatalog = useCallback(() => {
    const type = getExerciseWorkoutType(currentExerciseName);
    setWorkoutType(type ?? null);
    setExerciseCatalog(type ? getExercisesForWorkoutType(type) : []);
    setPrimaryMuscles(type ? getPrimaryMusclesForWorkoutType(type) : []);
  }, [
    currentExerciseName,
    getExerciseWorkoutType,
    getExercisesForWorkoutType,
    getPrimaryMusclesForWorkoutType,
  ]);

  const scheduledNames = useMemo(
    () => new Set(sessionExercises.map((exercise) => exercise.name)),
    [sessionExercises]
  );
  const catalogByName = useMemo(
    () => new Map(exerciseCatalog.map((exercise) => [exercise.name, exercise])),
    [exerciseCatalog]
  );
  const otherExercises = useMemo(
    () => exerciseCatalog.filter((exercise) => !scheduledNames.has(exercise.name)),
    [exerciseCatalog, scheduledNames]
  );

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!visible) return;

    translateY.setValue(0);
    setPendingExerciseName(null);
    setEditor(null);
    setExerciseName('');
    setSelectedMuscles([]);
    setFormError(null);
    refreshCatalog();
  }, [currentExerciseName, refreshCatalog, translateY, visible]);

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
    setSelectedMuscles([]);
    setFormError(null);
  };

  const openAddEditor = () => {
    setPendingExerciseName(null);
    setEditor({ kind: 'add' });
    setExerciseName('');
    setSelectedMuscles([]);
    setFormError(null);
  };

  const openRenameEditor = (exercise: ExerciseCatalogItem) => {
    setPendingExerciseName(null);
    setEditor({ kind: 'rename', exercise });
    setExerciseName(exercise.name);
    setSelectedMuscles([]);
    setFormError(null);
  };

  const submitEditor = () => {
    if (!editor) return;

    const name = exerciseName.trim();
    if (!name) {
      setFormError('Exercise name cannot be empty.');
      return;
    }
    if (editor.kind === 'add' && selectedMuscles.length === 0) {
      setFormError('Choose at least one primary muscle.');
      return;
    }

    try {
      if (editor.kind === 'rename') {
        renameExercise(editor.exercise.id, name);
      } else if (workoutType) {
        addExerciseToSplit(workoutType, name, selectedMuscles.join(', '));
      } else {
        setFormError('Could not determine the current exercise type.');
        return;
      }
      refreshCatalog();
      closeEditor();
    } catch (error) {
      setFormError(errorMessage(error));
    }
  };

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
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.modal}>
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
                  {editor.kind === 'rename' ? 'Rename exercise' : 'Add custom exercise'}
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
                onSubmitEditing={editor.kind === 'rename' ? submitEditor : undefined}
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
                      PRIMARY MUSCLES
                    </Text>
                    <Text allowFontScaling={false} style={styles.muscleHint}>
                      Select all that apply
                    </Text>
                  </View>
                  <View style={styles.muscleTags}>
                    {primaryMuscles.map((muscle) => {
                      const isSelected = selectedMuscles.includes(muscle);
                      return (
                        <TouchableOpacity
                          key={muscle}
                          accessibilityRole="checkbox"
                          accessibilityLabel={muscle}
                          accessibilityState={{ checked: isSelected }}
                          activeOpacity={0.72}
                          onPress={() => {
                            setSelectedMuscles((current) =>
                              current.includes(muscle)
                                ? current.filter((item) => item !== muscle)
                                : [...current, muscle]
                            );
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
                            {muscle}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
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
                    editor.kind === 'rename' ? 'Save exercise name' : 'Add custom exercise'
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
                    {editor.kind === 'rename' ? 'Save' : 'Add exercise'}
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
                  onEdit={
                    catalogExercise && !isCompleted
                      ? () => openRenameEditor(catalogExercise)
                      : undefined
                  }
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
                {otherExercises.map((exercise, index) => (
                  <SwipeableExerciseRow
                    key={exercise.id}
                    name={exercise.name}
                    accent={accent}
                    isCurrent={false}
                    action="replace"
                    isLast={index === otherExercises.length - 1}
                    onPress={() => chooseExercise(exercise.name)}
                    onDelete={(close) => requestDeleteExercise(exercise, close)}
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
  deleteAction: {
    width: 94,
    minHeight: 60,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 18,
    backgroundColor: '#E5484D',
  },
  deleteActionLabel: {
    fontFamily: redesignFonts.uiBold,
    fontSize: 15,
    color: redesignColors.bone,
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
  editButtonSlot: {
    width: 60,
    alignSelf: 'stretch',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.raised,
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
