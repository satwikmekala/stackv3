import { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react-native';

import { redesignColors, redesignFonts, splitColors } from '@/constants/theme';
import { usePressScale } from '@/hooks/usePressScale';
import {
  MUSCLE_GROUP_COLORS,
  getMuscleGroupForExercise,
  getWorkoutDisplayName,
  getWorkoutLetter,
  getWorkoutMuscleSegments,
  useCustomSplitDraftStore,
  type DraftWorkout,
} from '@/store/customSplitDraft';
import { useWorkoutStore } from '@/store/workoutStore';
import '@/global.css';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const alpha = (color: string, opacity: string) => `${color}${opacity}`;

const plural = (count: number, noun: string) =>
  `${noun}${count === 1 ? '' : 's'}`;

interface SplitNameProps {
  name: string;
  onChange: (name: string) => void;
}

function SplitName({ name, onChange }: SplitNameProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  const commit = () => {
    setEditing(false);
    onChange(value.trim());
  };

  if (editing) {
    return (
      <View style={styles.nameRow}>
        <TextInput
          accessibilityLabel="Split name"
          autoCapitalize="words"
          autoFocus
          maxLength={48}
          onBlur={commit}
          onChangeText={(nextValue) => {
            setValue(nextValue);
            onChange(nextValue);
          }}
          onSubmitEditing={commit}
          placeholder="Name this split"
          placeholderTextColor={redesignColors.ashDim}
          returnKeyType="done"
          selectTextOnFocus
          style={styles.nameInput}
          value={value}
        />
      </View>
    );
  }

  return (
    <View style={styles.nameRow}>
      <Text numberOfLines={1} style={styles.name}>{name}</Text>
      <Pressable
        accessibilityLabel="Rename split"
        accessibilityRole="button"
        hitSlop={10}
        onPress={() => {
          void Haptics.selectionAsync();
          setValue(name);
          setEditing(true);
        }}
        style={styles.renameButton}
      >
        <Pencil color={splitColors.chest} size={18} strokeWidth={2.3} />
      </Pressable>
    </View>
  );
}

interface WorkoutCardProps {
  index: number;
  isMenuTarget: boolean;
  onEdit: () => void;
  onLongPress: () => void;
  workout: DraftWorkout;
}

function WorkoutCard({
  index,
  isMenuTarget,
  onEdit,
  onLongPress,
  workout,
}: WorkoutCardProps) {
  const letter = getWorkoutLetter(index);
  const displayName = getWorkoutDisplayName(workout) || 'Untitled workout';
  const segments = getWorkoutMuscleSegments(workout);
  const badgeColor =
    MUSCLE_GROUP_COLORS[
      workout.exercises[0]
        ? getMuscleGroupForExercise(workout.exercises[0])
        : 'Chest'
    ];

  return (
    <Pressable
      accessibilityHint="Press and hold for workout actions"
      accessibilityLabel={`Workout ${letter}, ${displayName}`}
      delayLongPress={380}
      onLongPress={onLongPress}
      style={[styles.card, isMenuTarget && styles.cardMenuTarget]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.badge, { backgroundColor: alpha(badgeColor, '26') }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>{letter}</Text>
        </View>
        <Text numberOfLines={1} style={styles.cardTitle}>{displayName}</Text>
        <Pressable
          accessibilityLabel={`Edit workout ${letter}, ${displayName}`}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onEdit}
          style={styles.editButton}
        >
          <Text style={styles.editText}>Edit</Text>
          <ChevronRight color={splitColors.chest} size={17} strokeWidth={2.6} />
        </Pressable>
      </View>

      <View style={styles.cardDivider} />

      {workout.exercises.length > 0 ? (
        <Text style={styles.exerciseList}>
          {workout.exercises.map((exercise) => exercise.name).join(' · ')}
        </Text>
      ) : (
        <Text style={styles.emptyWorkoutText}>
          No exercises yet — add at least one to save.
        </Text>
      )}

      {segments.length > 0 ? (
        <View style={styles.muscleBar}>
          {segments.map((segment) => (
            <View
              key={segment.group}
              style={[
                styles.muscleSegment,
                { backgroundColor: segment.color, flexGrow: segment.count },
              ]}
            />
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

/** A focused confirmation sheet for the destructive long-press action. */
interface WorkoutMenuProps {
  canDelete: boolean;
  onClose: () => void;
  onDelete: () => void;
  workout: DraftWorkout;
  workoutIndex: number;
}

function WorkoutMenu({
  canDelete,
  onClose,
  onDelete,
  workout,
  workoutIndex,
}: WorkoutMenuProps) {
  const insets = useSafeAreaInsets();
  const letter = getWorkoutLetter(workoutIndex);
  const displayName = getWorkoutDisplayName(workout) || 'Untitled workout';

  return (
    <Modal
      animationType="slide"
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
        <View
          pointerEvents="box-none"
          style={[styles.menuDock, { paddingBottom: Math.max(insets.bottom, 12) }]}
        >
          <View accessibilityViewIsModal style={styles.workoutMenu}>
            <View style={styles.sheetHandle} />

            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>
                {canDelete ? `Remove Workout ${letter}?` : `Workout ${letter} can’t be removed`}
              </Text>
              <Text numberOfLines={1} style={styles.menuWorkoutName}>
                {canDelete ? displayName : 'A split needs at least one workout.'}
              </Text>
            </View>

            <View style={styles.menuActions}>
              <Pressable
                accessibilityLabel={canDelete ? 'Cancel removal' : 'Close'}
                accessibilityRole="button"
                onPress={onClose}
                style={styles.actionHitbox}
              >
                {({ pressed }) => (
                  <View
                    style={[
                      styles.cancelAction,
                      pressed && styles.cancelActionPressed,
                    ]}
                  >
                    <Text style={styles.cancelActionText}>
                      {canDelete ? 'Cancel' : 'Got it'}
                    </Text>
                  </View>
                )}
              </Pressable>

              {canDelete ? (
                <Pressable
                  accessibilityLabel={`Remove Workout ${letter}`}
                  accessibilityRole="button"
                  onPress={onDelete}
                  style={styles.actionHitbox}
                >
                  {({ pressed }) => (
                    <View
                      style={[
                        styles.deleteAction,
                        pressed && styles.deleteActionPressed,
                      ]}
                    >
                      <Text style={styles.deleteActionText}>Remove</Text>
                    </View>
                  )}
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function CustomSplitReviewScreen() {
  const router = useRouter();
  const draft = useCustomSplitDraftStore((state) => state.draft);
  const source = useCustomSplitDraftStore((state) => state.source);
  const setSplitName = useCustomSplitDraftStore((state) => state.setSplitName);
  const selectWorkout = useCustomSplitDraftStore((state) => state.selectWorkout);
  const deleteWorkout = useCustomSplitDraftStore((state) => state.deleteWorkout);
  const discardDraft = useCustomSplitDraftStore((state) => state.discardDraft);
  const editingSplitId = useCustomSplitDraftStore((state) => state.editingSplitId);
  const saveCustomSplitDraft = useWorkoutStore((state) => state.saveCustomSplitDraft);
  const updateCustomSplitDraft = useWorkoutStore((state) => state.updateCustomSplitDraft);
  const deleteSplit = useWorkoutStore((state) => state.deleteSplit);

  const [menu, setMenu] = useState<{ workoutId: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savePressScale = usePressScale();

  if (!draft) {
    return <SafeAreaView style={styles.safeArea} />;
  }

  const workoutCount = draft.workouts.length;
  const exerciseCount = draft.workouts.reduce(
    (total, workout) => total + workout.exercises.length,
    0
  );

  const trimmedName = draft.name.trim();
  const emptyWorkoutLetters = draft.workouts
    .map((workout, index) => (workout.exercises.length === 0 ? getWorkoutLetter(index) : null))
    .filter((letter): letter is string => letter !== null);
  const validationError =
    !trimmedName
      ? 'Give this split a name before saving.'
      : workoutCount === 0
        ? 'Add at least one workout before saving.'
        : emptyWorkoutLetters.length > 0
          ? `Workout${emptyWorkoutLetters.length === 1 ? '' : 's'} ${emptyWorkoutLetters.join(', ')} ${emptyWorkoutLetters.length === 1 ? 'has' : 'have'} no exercises. Add at least one or remove ${emptyWorkoutLetters.length === 1 ? 'it' : 'them'}.`
          : null;
  const menuWorkoutIndex = menu
    ? draft.workouts.findIndex((workout) => workout.id === menu.workoutId)
    : -1;
  const isEditing = editingSplitId !== null;
  const canSave = validationError === null && !saving && !deleting;

  const returnToLibrary = () => {
    try {
      router.dismissTo('/your-splits');
    } catch {
      router.replace('/your-splits');
    }
  };

  const handleEdit = (workoutId: string) => {
    void Haptics.selectionAsync();
    selectWorkout(workoutId);
    router.back();
  };

  const openWorkoutMenu = (workoutId: string) => {
    if (saving || deleting) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMenu({ workoutId });
  };

  // Draft-only: the persistent split is untouched until Save is pressed.
  const handleDeleteWorkout = (workout: DraftWorkout) => {
    setMenu(null);
    if (workoutCount <= 1 || saving || deleting) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    deleteWorkout(workout.id);
    // A stale save-time failure must not outlive the edit that may have fixed it.
    setError(null);
  };

  const handleSave = async () => {
    if (saving || deleting) return;
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const workoutInputs = draft.workouts.map((workout) => ({
      name: getWorkoutDisplayName(workout),
      exerciseIds: workout.exercises.map((exercise) => exercise.id),
      persistedWorkoutId: workout.persistedWorkoutId ?? null,
    }));

    if (editingSplitId !== null) {
      // Edit mode rewrites the same split row; activation and onboarding state
      // are deliberately left exactly as they are.
      const updated = await updateCustomSplitDraft(
        editingSplitId,
        trimmedName,
        workoutInputs
      );
      if (!updated) {
        setSaving(false);
        setError("Couldn't save these changes. Please try again.");
        return;
      }
      discardDraft();
      returnToLibrary();
      return;
    }

    const splitId = await saveCustomSplitDraft(trimmedName, workoutInputs, {
      completeOnboarding: source === 'onboarding',
    });

    if (splitId === undefined) {
      setSaving(false);
      setError("Couldn't save this split. Please try again.");
      return;
    }

    // Only once the split graph and the profile update have both landed.
    discardDraft();
    if (source === 'onboarding') {
      // The refreshed completed profile lets the root redirect architecture
      // keep onboarding out of the post-save navigation path.
      router.replace('/your-splits');
      return;
    }
    // The library flow entered from Your Splits — drop the builder stack.
    returnToLibrary();
  };

  const handleDelete = () => {
    if (editingSplitId === null || saving || deleting) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      `Delete "${trimmedName || draft.name}"?`,
      'This permanently deletes this split. Your completed workout history will remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Split',
          style: 'destructive',
          onPress: () => {
            setDeleting(true);
            setError(null);
            void deleteSplit(editingSplitId).then(() => {
              discardDraft();
              returnToLibrary();
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back to split builder"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.back()}
            style={styles.circleButton}
          >
            <ChevronLeft color={redesignColors.bone} size={22} strokeWidth={2.3} />
          </Pressable>
          <Text style={styles.eyebrow}>REVIEW</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <SplitName name={draft.name} onChange={setSplitName} />

          <Text style={styles.counts}>
            <Text style={styles.countValue}>{workoutCount}</Text>
            {`  ${plural(workoutCount, 'workout')}  ·  `}
            <Text style={styles.countValue}>{exerciseCount}</Text>
            {`  ${plural(exerciseCount, 'exercise')}`}
          </Text>

          <View style={styles.cards}>
            {draft.workouts.map((workout, index) => (
              <WorkoutCard
                index={index}
                isMenuTarget={menu?.workoutId === workout.id}
                key={workout.id}
                onEdit={() => handleEdit(workout.id)}
                onLongPress={() => openWorkoutMenu(workout.id)}
                workout={workout}
              />
            ))}
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          {(error ?? validationError) ? (
            <Text style={styles.errorText}>{error ?? validationError}</Text>
          ) : null}
          <AnimatedPressable
            accessibilityLabel={isEditing ? 'Save changes' : 'Save split'}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave, busy: saving }}
            disabled={!canSave}
            onPress={() => { void handleSave(); }}
            onPressIn={savePressScale.onPressIn}
            onPressOut={savePressScale.onPressOut}
            style={[
              styles.saveButton,
              canSave ? styles.saveButtonEnabled : styles.saveButtonDisabled,
              savePressScale.animatedStyle,
            ]}
          >
            <Text
              style={[
                styles.saveButtonText,
                canSave ? styles.saveButtonTextEnabled : styles.saveButtonTextDisabled,
              ]}
            >
              {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Save split'}
            </Text>
          </AnimatedPressable>

          {isEditing ? (
            <Pressable
              accessibilityLabel="Delete split"
              accessibilityRole="button"
              accessibilityState={{ disabled: saving || deleting }}
              disabled={saving || deleting}
              hitSlop={6}
              onPress={handleDelete}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteText}>
                {deleting ? 'Deleting…' : 'Delete split'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {menu && menuWorkoutIndex >= 0 ? (
        <WorkoutMenu
          canDelete={workoutCount > 1}
          onClose={() => setMenu(null)}
          onDelete={() =>
            handleDeleteWorkout(draft.workouts[menuWorkoutIndex])
          }
          workout={draft.workouts[menuWorkoutIndex]}
          workoutIndex={menuWorkoutIndex}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: redesignColors.ink,
  },
  screen: {
    flex: 1,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: redesignColors.surface,
    borderWidth: 1,
    borderColor: redesignColors.border,
  },
  eyebrow: {
    color: redesignColors.ashDim,
    fontFamily: redesignFonts.monoBold,
    fontSize: 13,
    letterSpacing: 2.4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 26,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  name: {
    flexShrink: 1,
    color: redesignColors.bone,
    fontFamily: redesignFonts.display,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.6,
  },
  nameInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 4 : 0,
    color: redesignColors.bone,
    fontFamily: redesignFonts.display,
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  renameButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: alpha(splitColors.chest, '66'),
  },
  counts: {
    marginTop: 10,
    color: redesignColors.ash,
    fontFamily: redesignFonts.ui,
    fontSize: 16,
  },
  countValue: {
    color: redesignColors.bone,
    fontFamily: redesignFonts.uiBold,
    fontSize: 16,
  },
  cards: {
    marginTop: 26,
    gap: 16,
  },
  card: {
    padding: 18,
    borderRadius: 22,
    backgroundColor: redesignColors.surface,
    borderWidth: 1,
    borderColor: redesignColors.border,
  },
  cardMenuTarget: {
    borderColor: splitColors.core,
    backgroundColor: alpha(splitColors.core, '14'),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 14,
  },
  cardTitle: {
    minWidth: 0,
    flex: 1,
    color: redesignColors.bone,
    fontFamily: redesignFonts.uiBold,
    fontSize: 20,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  editText: {
    color: splitColors.chest,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 16,
  },
  cardDivider: {
    height: 1,
    marginTop: 14,
    marginBottom: 12,
    backgroundColor: redesignColors.border,
  },
  exerciseList: {
    color: redesignColors.ash,
    fontFamily: redesignFonts.ui,
    fontSize: 15.5,
    lineHeight: 24,
  },
  emptyWorkoutText: {
    color: redesignColors.ashDim,
    fontFamily: redesignFonts.uiItalic,
    fontSize: 15.5,
    lineHeight: 24,
  },
  muscleBar: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 16,
  },
  muscleSegment: {
    flexBasis: 0,
    height: 6,
    borderRadius: 3,
  },
  bottomBar: {
    paddingTop: 10,
    paddingHorizontal: 24,
    paddingBottom: 12,
    gap: 12,
  },
  errorText: {
    color: splitColors.core,
    fontFamily: redesignFonts.uiMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  saveButton: {
    height: 58,
    borderRadius: 19,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonEnabled: {
    backgroundColor: splitColors.chest,
  },
  saveButtonDisabled: {
    backgroundColor: redesignColors.raised,
  },
  saveButtonText: {
    fontFamily: redesignFonts.display,
    fontSize: 20,
    letterSpacing: -0.2,
  },
  saveButtonTextEnabled: {
    color: redesignColors.ink,
  },
  saveButtonTextDisabled: {
    color: redesignColors.ashDim,
  },
  deleteButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  deleteText: {
    color: splitColors.core,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 16,
  },
  menuModal: { flex: 1 },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 6, 5, 0.72)',
  },
  menuDock: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
  },
  workoutMenu: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,
    borderRadius: 28,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: redesignColors.hi,
    backgroundColor: redesignColors.surface,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 18,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    alignSelf: 'center',
    marginBottom: 18,
    borderRadius: 2,
    backgroundColor: redesignColors.hi,
  },
  menuHeader: {
    alignItems: 'flex-start',
  },
  menuTitle: {
    color: redesignColors.bone,
    fontFamily: redesignFonts.uiBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  menuWorkoutName: {
    marginTop: 3,
    color: redesignColors.ash,
    fontFamily: redesignFonts.uiMedium,
    fontSize: 17,
    lineHeight: 22,
  },
  menuActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    marginTop: 24,
  },
  actionHitbox: {
    minWidth: 0,
    flexBasis: 0,
    flexGrow: 1,
    height: 54,
  },
  cancelAction: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: redesignColors.raised,
    borderWidth: 1,
    borderColor: redesignColors.border,
  },
  cancelActionPressed: {
    backgroundColor: redesignColors.hi,
  },
  cancelActionText: {
    color: redesignColors.bone,
    fontFamily: redesignFonts.uiBold,
    fontSize: 16,
  },
  deleteAction: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: splitColors.core,
    overflow: 'hidden',
  },
  deleteActionPressed: {
    opacity: 0.78,
  },
  deleteActionText: {
    color: redesignColors.ink,
    fontFamily: redesignFonts.uiBold,
    fontSize: 16,
  },
});
