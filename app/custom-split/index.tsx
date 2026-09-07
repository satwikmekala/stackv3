import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  type GestureResponderEvent,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Check,
  ChevronLeft,
  Copy,
  List,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react-native';

import { SelectedExerciseList } from '@/components/custom-split/SelectedExerciseList';
import { getWeeklyArchetypeSequence } from '@/constants/archetypes';
import { redesignColors, redesignFonts, splitColors } from '@/constants/theme';
import {
  CUSTOM_SPLIT_MUSCLE_GROUPS,
  MUSCLE_GROUP_COLORS as GROUP_COLORS,
  getDraftPrefillRecommendation,
  getMuscleGroupForExercise,
  getWorkoutDisplayName,
  getWorkoutLetter,
  type CustomSplitMuscleGroup,
  type CustomSplitSource,
  type DraftExercise,
  type DraftWorkout,
  useCustomSplitDraftStore,
} from '@/store/customSplitDraft';
import {
  getCustomSplitDetailAsync,
  getNextCustomSplitNameAsync,
  readArchetypeTemplateCatalogSync,
  readArchetypeVariantsSync,
  readExerciseCatalogSync,
} from '@/store/workoutDatabase';
import { useWorkoutStore } from '@/store/workoutStore';
import '@/global.css';

export type { CustomSplitSource };

const alpha = (color: string, opacity: string) => `${color}${opacity}`;

interface WorkoutTabsProps {
  activeWorkoutId: string;
  contextWorkoutId: string | null;
  onAdd: () => void;
  onLongPress: (workoutId: string, event: GestureResponderEvent) => void;
  onSelect: (workoutId: string) => void;
  workouts: DraftWorkout[];
}

function WorkoutTabs({
  activeWorkoutId,
  contextWorkoutId,
  onAdd,
  onLongPress,
  onSelect,
  workouts,
}: WorkoutTabsProps) {
  const compact = workouts.length >= 5;
  return (
    <ScrollView
      contentContainerStyle={[styles.tabsContent, compact && styles.tabsContentCompact]}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabs}
    >
      {workouts.map((workout, index) => {
        const selected = workout.id === activeWorkoutId;
        return (
          <Pressable
            accessibilityLabel={`Workout ${getWorkoutLetter(index)}`}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={workout.id}
            delayLongPress={380}
            onLongPress={(event) => onLongPress(workout.id, event)}
            onPress={() => {
              void Haptics.selectionAsync();
              onSelect(workout.id);
            }}
            style={[
              styles.workoutTab,
              compact && styles.workoutTabCompact,
              selected && styles.workoutTabSelected,
              workout.id === contextWorkoutId && styles.workoutTabContext,
            ]}
          >
            <Text style={[
              styles.workoutTabText,
              selected && styles.workoutTabTextSelected,
              workout.id === contextWorkoutId && styles.workoutTabTextContext,
            ]}>
              {getWorkoutLetter(index)}
            </Text>
          </Pressable>
        );
      })}
      <Pressable
        accessibilityLabel="Add workout"
        accessibilityRole="button"
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onAdd();
        }}
        style={[styles.addWorkoutTab, compact && styles.workoutTabCompact]}
      >
        <Plus color={redesignColors.ash} size={25} strokeWidth={2.2} />
      </Pressable>
    </ScrollView>
  );
}

interface PrefillControlProps {
  compact?: boolean;
  enabled: boolean;
  onToggle: () => void;
  unavailable: boolean;
  workoutLetter: string;
}

function PrefillControl({
  compact = false,
  enabled,
  onToggle,
  unavailable,
  workoutLetter,
}: PrefillControlProps) {
  return (
    <Pressable
      accessibilityLabel={
        unavailable
          ? `Stack prefill is unavailable for Workout ${workoutLetter}`
          : `Prefill Workout ${workoutLetter} from Stack`
      }
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled, disabled: unavailable }}
      disabled={unavailable}
      onPress={onToggle}
      style={[
        styles.prefillCard,
        compact && styles.prefillCardCompact,
        unavailable && styles.unavailable,
      ]}
    >
      <View style={styles.prefillCopy}>
        <Text style={[styles.prefillTitle, compact && styles.prefillTitleCompact]}>
          Prefill from Stack
        </Text>
        {!compact ? (
          <Text style={styles.prefillDescription}>
            {unavailable
              ? `No Stack template is available for Workout ${workoutLetter}.`
              : `Fills Workout ${workoutLetter} from Stack’s template. Edit freely after.`}
          </Text>
        ) : null}
      </View>
      <View style={[styles.switchTrack, enabled && styles.switchTrackEnabled]}>
        <View style={[styles.switchThumb, enabled && styles.switchThumbEnabled]} />
      </View>
    </Pressable>
  );
}

interface WorkoutNameProps {
  customName: string;
  displayName: string;
  hasExercises: boolean;
  onChange: (value: string) => void;
}

function WorkoutName({
  customName,
  displayName,
  hasExercises,
  onChange,
}: WorkoutNameProps) {
  const [editing, setEditing] = useState(false);

  if (!hasExercises || editing) {
    return (
      <View>
        <View style={styles.nameInputShell}>
          <TextInput
            accessibilityLabel="Workout name"
            autoCapitalize="words"
            autoFocus={editing}
            maxLength={48}
            onBlur={() => setEditing(false)}
            onChangeText={onChange}
            placeholder="Name this workout"
            placeholderTextColor={redesignColors.ashDim}
            returnKeyType="done"
            style={styles.nameInput}
            value={customName}
          />
          <Text style={styles.optionalLabel}>OPTIONAL</Text>
        </View>
        {!hasExercises ? (
          <Text style={styles.nameHelper}>Names itself from the muscle groups you pick.</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.nameDisplay}>
      <Text numberOfLines={1} style={styles.nameDisplayText}>{displayName}</Text>
      <Pressable
        accessibilityLabel="Rename workout"
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => setEditing(true)}
        style={styles.renameButton}
      >
        <Pencil color={splitColors.chest} size={19} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

const formatLetterList = (letters: string[]): string => {
  if (letters.length <= 1) return letters[0] ?? '';
  if (letters.length === 2) return `${letters[0]} and ${letters[1]}`;
  return `${letters.slice(0, -1).join(', ')} and ${letters[letters.length - 1]}`;
};

export const getDeleteWorkoutConsequence = (
  workoutIndex: number,
  workoutCount: number
): string => {
  const deletedLetter = getWorkoutLetter(workoutIndex);
  const followingCount = Math.max(0, workoutCount - workoutIndex - 1);
  if (followingCount === 0) {
    return `Exercises in ${deletedLetter} are discarded.`;
  }

  const oldLetters = Array.from(
    { length: followingCount },
    (_, index) => getWorkoutLetter(workoutIndex + index + 1)
  );
  const newLetters = Array.from(
    { length: followingCount },
    (_, index) => getWorkoutLetter(workoutIndex + index)
  );
  const verb = followingCount === 1 ? 'becomes' : 'become';
  return `${formatLetterList(oldLetters)} ${verb} ${formatLetterList(newLetters)}. Exercises in ${deletedLetter} are discarded.`;
};

interface WorkoutContextMenuProps {
  anchorX: number;
  anchorY: number;
  canDelete: boolean;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  workoutCount: number;
  workoutIndex: number;
}

function WorkoutContextMenu({
  anchorX,
  anchorY,
  canDelete,
  onClose,
  onDelete,
  onDuplicate,
  workoutCount,
  workoutIndex,
}: WorkoutContextMenuProps) {
  const workoutLetter = getWorkoutLetter(workoutIndex);
  const arrowLeft = Math.max(24, Math.min(anchorX - 38, 430));

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible
    >
      <View style={styles.menuModal}>
        <Pressable
          accessibilityLabel="Close workout menu"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.menuBackdrop}
        />
        <View style={[styles.workoutMenu, { top: anchorY }]}>
          <View style={[styles.menuArrow, { left: arrowLeft }]} />
          <Pressable
            accessibilityRole="button"
            onPress={onDuplicate}
            style={styles.menuAction}
          >
            <Copy color={redesignColors.bone} size={23} strokeWidth={2.2} />
            <Text style={styles.menuActionText}>Duplicate</Text>
          </Pressable>
          <View style={styles.menuDivider} />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canDelete }}
            disabled={!canDelete}
            onPress={onDelete}
            style={[
              styles.deleteAction,
              !canDelete && styles.deleteActionDisabled,
            ]}
          >
            <Trash2 color={splitColors.core} size={23} strokeWidth={2.3} />
            <Text style={styles.deleteActionText}>Delete Workout {workoutLetter}</Text>
          </Pressable>
          <Text style={styles.deleteExplanation}>
            {canDelete
              ? getDeleteWorkoutConsequence(workoutIndex, workoutCount)
              : 'A split must keep at least one workout.'}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

interface MuscleFiltersProps {
  onToggle: (group: CustomSplitMuscleGroup) => void;
  selected: CustomSplitMuscleGroup[];
}

function MuscleFilters({ onToggle, selected }: MuscleFiltersProps) {
  return (
    <View style={styles.filterWrap}>
      {CUSTOM_SPLIT_MUSCLE_GROUPS.map((group) => {
        const color = GROUP_COLORS[group];
        const isSelected = selected.includes(group);
        return (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            key={group}
            onPress={() => {
              void Haptics.selectionAsync();
              onToggle(group);
            }}
            style={[
              styles.filterChip,
              {
                backgroundColor: isSelected ? color : alpha(color, '13'),
                borderColor: isSelected ? color : alpha(color, '66'),
              },
            ]}
          >
            <Text style={[styles.filterChipText, { color: isSelected ? redesignColors.ink : color }]}>
              {group}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface CatalogSectionProps {
  exercises: DraftExercise[];
  group: CustomSplitMuscleGroup;
  onToggle: (exercise: DraftExercise) => void;
  selectedIds: Set<number>;
}

function CatalogSection({ exercises, group, onToggle, selectedIds }: CatalogSectionProps) {
  const color = GROUP_COLORS[group];
  return (
    <View style={styles.catalogSection}>
      <View style={styles.catalogHeadingRow}>
        <View style={[styles.catalogHeadingDot, { backgroundColor: color }]} />
        <Text style={[styles.catalogHeading, { color }]}>{group.toUpperCase()}</Text>
      </View>
      {exercises.map((exercise) => {
        const selected = selectedIds.has(exercise.id);
        return (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            key={exercise.id}
            onPress={() => onToggle(exercise)}
            style={styles.catalogRow}
          >
            <View
              style={[
                styles.checkbox,
                { borderColor: selected ? color : redesignColors.hi },
                selected && { backgroundColor: color },
              ]}
            >
              {selected ? <Check color={redesignColors.ink} size={18} strokeWidth={3} /> : null}
            </View>
            <Text numberOfLines={1} style={styles.catalogExerciseName}>{exercise.name}</Text>
            {exercise.equipment ? (
              <Text numberOfLines={1} style={styles.equipmentText}>
                {exercise.equipment.toUpperCase()}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function CustomSplitBuilderScreen() {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const { source, splitId } = useLocalSearchParams<{
    source?: CustomSplitSource;
    splitId?: string;
  }>();
  // Presence of a persistent id is what puts the builder in edit mode; the
  // whole split is never threaded through route params.
  const editingTargetId = splitId ? Number(splitId) : null;
  const editTarget =
    editingTargetId !== null && Number.isInteger(editingTargetId) && editingTargetId > 0
      ? editingTargetId
      : null;
  const profile = useWorkoutStore((state) => state.profile);
  const draft = useCustomSplitDraftStore((state) => state.draft);
  const activeWorkoutId = useCustomSplitDraftStore((state) => state.activeWorkoutId);
  const initializeDraft = useCustomSplitDraftStore((state) => state.initializeDraft);
  const hydrateDraftForEdit = useCustomSplitDraftStore((state) => state.hydrateDraftForEdit);
  const editingSplitId = useCustomSplitDraftStore((state) => state.editingSplitId);
  const discardDraft = useCustomSplitDraftStore((state) => state.discardDraft);
  const selectWorkout = useCustomSplitDraftStore((state) => state.selectWorkout);
  const addWorkout = useCustomSplitDraftStore((state) => state.addWorkout);
  const duplicateWorkout = useCustomSplitDraftStore((state) => state.duplicateWorkout);
  const deleteWorkout = useCustomSplitDraftStore((state) => state.deleteWorkout);
  const setWorkoutCustomName = useCustomSplitDraftStore((state) => state.setWorkoutCustomName);
  const toggleMuscleGroup = useCustomSplitDraftStore((state) => state.toggleMuscleGroup);
  const toggleExercise = useCustomSplitDraftStore((state) => state.toggleExercise);
  const removeExercise = useCustomSplitDraftStore((state) => state.removeExercise);
  const reorderExercise = useCustomSplitDraftStore((state) => state.reorderExercise);
  const setPrefillEnabled = useCustomSplitDraftStore((state) => state.setPrefillEnabled);
  const mergePrefill = useCustomSplitDraftStore((state) => state.mergePrefill);

  const [catalog, setCatalog] = useState(() => readExerciseCatalogSync());
  const [contextMenu, setContextMenu] = useState<{
    workoutId: string;
    anchorX: number;
    anchorY: number;
  } | null>(null);
  const [bottomBarHeight, setBottomBarHeight] = useState(75);
  const [reordering, setReordering] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  // Measured separately from the ScrollView itself: only a host View exposes
  // measureInWindow, and the drag needs window coordinates for its edge zones.
  const scrollAreaRef = useRef<View>(null);
  const scrollOffset = useRef(0);
  const scrollViewportHeight = useRef(0);
  const scrollContentHeight = useRef(0);

  const measureScrollViewport = useCallback(
    () =>
      new Promise<{ top: number; bottom: number }>((resolve) => {
        const node = scrollAreaRef.current;
        if (!node) {
          resolve({ top: 0, bottom: 0 });
          return;
        }
        node.measureInWindow((_x: number, y: number, _width: number, height: number) => {
          resolve({ top: y, bottom: y + height });
        });
      }),
    []
  );

  // Returns the distance actually scrolled so the dragged row can compensate
  // exactly, including when the list is already pinned at either end.
  const autoScrollBy = useCallback((delta: number) => {
    const maxOffset = Math.max(
      0,
      scrollContentHeight.current - scrollViewportHeight.current
    );
    const next = Math.min(Math.max(scrollOffset.current + delta, 0), maxOffset);
    const travelled = next - scrollOffset.current;
    if (travelled === 0) return 0;
    scrollOffset.current = next;
    scrollRef.current?.scrollTo({ y: next, animated: false });
    return travelled;
  }, []);

  useFocusEffect(
    useCallback(() => {
      setCatalog(readExerciseCatalogSync());
    }, [])
  );

  const leaveMissingSplit = useCallback(() => {
    Alert.alert(
      'Split unavailable',
      'That split is no longer saved on this device.'
    );
    router.replace('/your-splits');
  }, [router]);

  useEffect(() => {
    if (draft || !profile) return;
    let cancelled = false;

    if (splitId !== undefined) {
      // Edit mode: hydrate the saved split into the transient draft. Nothing is
      // written back to SQLite until Review saves.
      if (editTarget === null) {
        leaveMissingSplit();
        return;
      }
      void getCustomSplitDetailAsync(editTarget).then((split) => {
        if (cancelled) return;
        if (!split) {
          leaveMissingSplit();
          return;
        }
        hydrateDraftForEdit(split);
      });
      return () => { cancelled = true; };
    }

    void getNextCustomSplitNameAsync().then((name) => {
      if (!cancelled) initializeDraft(name, profile.weeklyGoal, source ?? 'library');
    });
    return () => { cancelled = true; };
  }, [
    draft,
    editTarget,
    hydrateDraftForEdit,
    initializeDraft,
    leaveMissingSplit,
    profile,
    source,
    splitId,
  ]);

  if (!draft || !activeWorkoutId || !profile) {
    return <SafeAreaView style={styles.safeArea} />;
  }

  const activeWorkoutIndex = draft.workouts.findIndex((workout) => workout.id === activeWorkoutId);
  const activeWorkout = draft.workouts[activeWorkoutIndex] ?? draft.workouts[0];
  const workoutLetter = getWorkoutLetter(activeWorkoutIndex);
  const weeklySequence = getWeeklyArchetypeSequence(profile.weeklyGoal, profile.experienceLevel);
  const archetype = weeklySequence[activeWorkoutIndex];
  const recommendation = archetype
    ? getDraftPrefillRecommendation(
        weeklySequence,
        activeWorkoutIndex,
        readArchetypeVariantsSync(archetype)
      )
    : null;
  const hasAnyExercise = draft.workouts.some((workout) => workout.exercises.length > 0);
  const hasExercises = activeWorkout.exercises.length > 0;
  const canPrefillFromStack =
    activeWorkout.selectedMuscleGroups.length === 0 && activeWorkout.exercises.length === 0;
  const selectedIds = new Set(activeWorkout.exercises.map((exercise) => exercise.id));
  const displayName = getWorkoutDisplayName(activeWorkout);
  const contextWorkoutIndex = contextMenu
    ? draft.workouts.findIndex((workout) => workout.id === contextMenu.workoutId)
    : -1;

  const openWorkoutMenu = (workoutId: string, event: GestureResponderEvent) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    selectWorkout(workoutId);
    setContextMenu({
      workoutId,
      anchorX: event.nativeEvent.pageX,
      anchorY: Math.max(
        180,
        Math.min(event.nativeEvent.pageY + 42, Math.max(180, windowHeight - 360))
      ),
    });
  };

  const catalogByGroup = CUSTOM_SPLIT_MUSCLE_GROUPS.reduce<
    Record<CustomSplitMuscleGroup, DraftExercise[]>
  >((groups, group) => {
    groups[group] = catalog.filter((exercise) => getMuscleGroupForExercise(exercise) === group);
    return groups;
  }, {} as Record<CustomSplitMuscleGroup, DraftExercise[]>);

  const handlePrefill = () => {
    if (!recommendation) return;
    void Haptics.selectionAsync();
    if (activeWorkout.prefillEnabled) {
      setPrefillEnabled(activeWorkout.id, false);
      return;
    }
    mergePrefill(
      activeWorkout.id,
      readArchetypeTemplateCatalogSync(recommendation.archetype, recommendation.variant)
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel={
              editingSplitId === null ? 'Back to split choice' : 'Back to your splits'
            }
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              discardDraft();
              router.back();
            }}
            style={styles.circleButton}
          >
            <ChevronLeft color={redesignColors.bone} size={22} strokeWidth={2.3} />
          </Pressable>
          <Text numberOfLines={1} style={styles.splitName}>{draft.name}</Text>
          <Pressable
            accessibilityLabel="Review custom split"
            accessibilityRole="button"
            accessibilityState={{ disabled: !hasAnyExercise }}
            disabled={!hasAnyExercise}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/custom-split/review');
            }}
            style={[
              styles.completeButton,
              hasAnyExercise && styles.completeButtonEnabled,
            ]}
          >
            <Check
              color={hasAnyExercise ? redesignColors.ink : redesignColors.ashDim}
              size={27}
              strokeWidth={3}
            />
          </Pressable>
        </View>

        <WorkoutTabs
          activeWorkoutId={activeWorkout.id}
          contextWorkoutId={contextMenu?.workoutId ?? null}
          onAdd={addWorkout}
          onLongPress={openWorkoutMenu}
          onSelect={selectWorkout}
          workouts={draft.workouts}
        />

        <View ref={scrollAreaRef} style={styles.scrollArea}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: bottomBarHeight + 28 },
            ]}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={(_width, height) => {
              scrollContentHeight.current = height;
            }}
            onLayout={(event) => {
              scrollViewportHeight.current = event.nativeEvent.layout.height;
            }}
            onScroll={(event) => {
              scrollOffset.current = event.nativeEvent.contentOffset.y;
            }}
            ref={scrollRef}
            scrollEnabled={!reordering}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
          >
            {canPrefillFromStack ? (
              <PrefillControl
                enabled={activeWorkout.prefillEnabled}
                onToggle={handlePrefill}
                unavailable={!recommendation}
                workoutLetter={workoutLetter}
              />
            ) : null}

            <WorkoutName
              customName={activeWorkout.customName}
              displayName={displayName}
              hasExercises={hasExercises}
              key={activeWorkout.id}
              onChange={(value) => setWorkoutCustomName(activeWorkout.id, value)}
            />

            {!hasExercises ? <Text style={styles.muscleLabel}>MUSCLE GROUPS</Text> : null}
            <MuscleFilters
              onToggle={(group) => toggleMuscleGroup(activeWorkout.id, group)}
              selected={activeWorkout.selectedMuscleGroups}
            />

            {hasExercises ? (
              <SelectedExerciseList
                autoScrollBy={autoScrollBy}
                exercises={activeWorkout.exercises}
                // Namespaced: the sibling WorkoutName is already keyed by the
                // raw workout id, and sibling keys must be unique.
                key={`selected-${activeWorkout.id}`}
                measureViewport={measureScrollViewport}
                onDragStateChange={setReordering}
                onRemove={(exerciseId) => removeExercise(activeWorkout.id, exerciseId)}
                onReorder={(fromIndex, toIndex) =>
                  reorderExercise(activeWorkout.id, fromIndex, toIndex)
                }
              />
            ) : null}

            {activeWorkout.selectedMuscleGroups.length === 0 ? (
              <View style={styles.emptyState}>
                <List color={redesignColors.ashDim} size={32} strokeWidth={1.8} />
                <Text style={styles.emptyStateText}>
                  Pick a muscle group and its{`\n`}exercises appear here.
                </Text>
              </View>
            ) : (
              activeWorkout.selectedMuscleGroups.map((group) => (
                <CatalogSection
                  exercises={catalogByGroup[group]}
                  group={group}
                  key={group}
                  onToggle={(exercise) => {
                    void Haptics.selectionAsync();
                    toggleExercise(activeWorkout.id, exercise);
                  }}
                  selectedIds={selectedIds}
                />
              ))
            )}

          </ScrollView>
        </View>

        <View
          onLayout={(event) => setBottomBarHeight(event.nativeEvent.layout.height)}
          style={styles.bottomBar}
        >
          <Pressable
            accessibilityLabel="Add a custom exercise"
            accessibilityRole="button"
            onPress={() => router.push({
              pathname: '/custom-split/new-exercise',
              params: { workoutId: activeWorkout.id },
            })}
            style={[
              styles.addExerciseButton,
              hasExercises ? styles.addExerciseButtonFilled : styles.addExerciseButtonEmpty,
            ]}
          >
            <Plus
              color={hasExercises ? redesignColors.ink : redesignColors.ashDim}
              size={26}
              strokeWidth={2.4}
            />
            <Text style={[
              styles.addExerciseText,
              hasExercises ? styles.addExerciseTextFilled : styles.addExerciseTextEmpty,
            ]}>
              Add Exercise
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {contextMenu && contextWorkoutIndex >= 0 ? (
        <WorkoutContextMenu
          anchorX={contextMenu.anchorX}
          anchorY={contextMenu.anchorY}
          canDelete={draft.workouts.length > 1}
          onClose={() => setContextMenu(null)}
          onDelete={() => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteWorkout(contextMenu.workoutId);
            setContextMenu(null);
          }}
          onDuplicate={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            duplicateWorkout(contextMenu.workoutId);
            setContextMenu(null);
          }}
          workoutCount={draft.workouts.length}
          workoutIndex={contextWorkoutIndex}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: redesignColors.ink },
  screen: { flex: 1 },
  header: {
    height: 64,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: redesignColors.surface,
    borderWidth: 1.5,
    borderColor: redesignColors.border,
  },
  splitName: {
    minWidth: 0,
    flex: 1,
    color: redesignColors.bone,
    fontFamily: redesignFonts.uiBold,
    fontSize: 25,
    lineHeight: 30,
    letterSpacing: -0.45,
  },
  completeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: redesignColors.raised,
  },
  completeButtonEnabled: {
    backgroundColor: splitColors.chest,
    shadowColor: splitColors.chest,
    shadowOpacity: 0.34,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  // The tab strip is a horizontal ScrollView, which clips to its own bounds —
  // without this vertical padding the selected tab's glow is sheared off along
  // a hard horizontal line that reads as a mask across the screen.
  tabs: { flexGrow: 0 },
  tabsContent: { paddingHorizontal: 28, paddingTop: 10, paddingBottom: 18, gap: 10 },
  tabsContentCompact: { gap: 7 },
  workoutTab: {
    width: 50,
    height: 50,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: redesignColors.surface,
    borderWidth: 1.5,
    borderColor: redesignColors.border,
  },
  workoutTabSelected: {
    backgroundColor: splitColors.chest,
    borderColor: splitColors.chest,
    shadowColor: splitColors.chest,
    shadowOpacity: 0.34,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  workoutTabContext: {
    backgroundColor: alpha(splitColors.core, '24'),
    borderColor: splitColors.core,
    shadowColor: splitColors.core,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  workoutTabCompact: { width: 45, height: 45, borderRadius: 15 },
  workoutTabText: {
    color: redesignColors.ash,
    fontFamily: redesignFonts.monoBold,
    fontSize: 21,
  },
  workoutTabTextSelected: { color: redesignColors.ink },
  workoutTabTextContext: { color: redesignColors.bone },
  addWorkoutTab: {
    width: 50,
    height: 50,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: redesignColors.border,
  },
  scrollArea: { flex: 1 },
  scroll: { flex: 1 },
  // paddingBottom is applied inline from the measured sticky-footer height.
  scrollContent: { paddingHorizontal: 28 },
  prefillCard: {
    minHeight: 96,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 14,
  },
  prefillCardCompact: { minHeight: 54, paddingVertical: 10, marginTop: 12, marginBottom: 0 },
  prefillCopy: { minWidth: 0, flex: 1 },
  prefillTitle: {
    color: redesignColors.bone,
    fontFamily: redesignFonts.uiBold,
    fontSize: 19,
    lineHeight: 24,
  },
  prefillTitleCompact: { fontSize: 16, lineHeight: 20 },
  prefillDescription: {
    marginTop: 5,
    color: redesignColors.ash,
    fontFamily: redesignFonts.ui,
    fontSize: 15,
    lineHeight: 19,
  },
  unavailable: { opacity: 0.44 },
  switchTrack: {
    width: 56,
    height: 34,
    padding: 4,
    borderRadius: 17,
    backgroundColor: redesignColors.raised,
    justifyContent: 'center',
  },
  switchTrackEnabled: { backgroundColor: alpha(splitColors.chest, '66') },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: redesignColors.ashDim,
  },
  switchThumbEnabled: { alignSelf: 'flex-end', backgroundColor: splitColors.chest },
  nameInputShell: {
    height: 66,
    paddingHorizontal: 24,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  nameInput: {
    minWidth: 0,
    flex: 1,
    color: redesignColors.bone,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 19,
    // Zero vertical padding lets the shell's alignItems: 'center' place the
    // text and caret on the same centre line as the OPTIONAL label.
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  optionalLabel: {
    color: redesignColors.ashDim,
    fontFamily: redesignFonts.monoBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.8,
    includeFontPadding: false,
  },
  nameHelper: {
    marginTop: 8,
    marginLeft: 7,
    color: redesignColors.ashDim,
    fontFamily: redesignFonts.ui,
    fontSize: 14,
    lineHeight: 19,
  },
  nameDisplay: {
    minHeight: 70,
    paddingHorizontal: 24,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nameDisplayText: {
    minWidth: 0,
    flex: 1,
    color: redesignColors.bone,
    fontFamily: redesignFonts.uiBold,
    fontSize: 24,
    letterSpacing: -0.35,
  },
  renameButton: {
    width: 44,
    height: 44,
    marginRight: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muscleLabel: {
    marginTop: 22,
    color: redesignColors.ashDim,
    fontFamily: redesignFonts.monoBold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 2.2,
  },
  filterWrap: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 10,
    rowGap: 10,
  },
  filterChip: {
    minHeight: 40,
    paddingHorizontal: 17,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: { fontFamily: redesignFonts.uiSemiBold, fontSize: 16 },
  emptyState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  emptyStateText: {
    color: redesignColors.ashDim,
    fontFamily: redesignFonts.ui,
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
  },
  catalogSection: { marginTop: 24 },
  catalogHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  catalogHeadingDot: { width: 8, height: 8, borderRadius: 4 },
  catalogHeading: { fontFamily: redesignFonts.monoBold, fontSize: 13, letterSpacing: 2.1 },
  catalogRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: redesignColors.border,
  },
  checkbox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogExerciseName: {
    minWidth: 0,
    flex: 1,
    color: redesignColors.bone,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 18,
  },
  equipmentText: {
    maxWidth: 92,
    color: redesignColors.ashDim,
    fontFamily: redesignFonts.mono,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 28,
    paddingTop: 9,
    paddingBottom: 8,
    backgroundColor: redesignColors.ink,
  },
  addExerciseButton: {
    height: 58,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  addExerciseButtonFilled: {
    backgroundColor: splitColors.chest,
    shadowColor: splitColors.chest,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  addExerciseButtonEmpty: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: redesignColors.border,
  },
  addExerciseText: { fontFamily: redesignFonts.uiBold, fontSize: 20 },
  addExerciseTextFilled: { color: redesignColors.ink },
  addExerciseTextEmpty: { color: redesignColors.ashDim },
  menuModal: { flex: 1 },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.76)',
  },
  workoutMenu: {
    position: 'absolute',
    left: 28,
    right: 28,
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 20,
    borderRadius: 23,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.raised,
    shadowColor: '#000000',
    shadowOpacity: 0.38,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  menuArrow: {
    position: 'absolute',
    top: -8,
    width: 18,
    height: 18,
    transform: [{ rotate: '45deg' }],
    borderLeftWidth: 1.5,
    borderTopWidth: 1.5,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.raised,
  },
  menuAction: {
    minHeight: 58,
    paddingHorizontal: 12,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  menuActionText: {
    color: redesignColors.bone,
    fontFamily: redesignFonts.uiBold,
    fontSize: 19,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 8,
    marginVertical: 8,
    backgroundColor: redesignColors.border,
  },
  deleteAction: {
    minHeight: 62,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    backgroundColor: alpha(splitColors.core, '1F'),
  },
  deleteActionDisabled: { opacity: 0.42 },
  deleteActionText: {
    color: splitColors.core,
    fontFamily: redesignFonts.uiBold,
    fontSize: 19,
  },
  deleteExplanation: {
    marginTop: 8,
    paddingHorizontal: 16,
    color: redesignColors.ash,
    fontFamily: redesignFonts.ui,
    fontSize: 15,
    lineHeight: 21,
  },
});
