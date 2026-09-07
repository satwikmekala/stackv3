import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { redesignColors, redesignFonts, splitColors } from '@/constants/theme';
import {
  CUSTOM_SPLIT_MUSCLE_GROUPS,
  getWorkoutTypeForMuscleGroup,
  type CustomSplitMuscleGroup,
  useCustomSplitDraftStore,
} from '@/store/customSplitDraft';
import {
  readExerciseCatalogSync,
} from '@/store/workoutDatabase';
import { useWorkoutStore } from '@/store/workoutStore';
import '@/global.css';

const GROUP_COLORS: Record<CustomSplitMuscleGroup, string> = {
  Chest: splitColors.chest,
  Back: splitColors.back,
  Shoulders: splitColors.shoulders,
  Biceps: splitColors.arms,
  Triceps: splitColors.arms,
  Core: splitColors.core,
  Legs: splitColors.legs,
};

const EQUIPMENT = [
  { label: 'Barbell', value: 'Barbell' },
  { label: 'Dumbbell', value: 'Dumbbell' },
  { label: 'Cable', value: 'Cable' },
  { label: 'Machine', value: 'Machine' },
] as const;

type Equipment = typeof EQUIPMENT[number]['value'];

const alpha = (color: string, opacity: string) => `${color}${opacity}`;

export default function NewCustomExerciseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();
  const draft = useCustomSplitDraftStore((state) => state.draft);
  const addExercise = useCustomSplitDraftStore((state) => state.addExercise);
  const createCustomExercise = useWorkoutStore((state) => state.createCustomExercise);
  const [name, setName] = useState('');
  const [primaryMuscle, setPrimaryMuscle] = useState<CustomSplitMuscleGroup | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [nameFocused, setNameFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const normalizedName = name.trim();
  const canSubmit = Boolean(normalizedName && primaryMuscle && equipment && !submitting);
  const targetWorkoutExists = useMemo(
    () => Boolean(workoutId && draft?.workouts.some((workout) => workout.id === workoutId)),
    [draft?.workouts, workoutId]
  );

  const close = () => router.back();

  const submit = () => {
    if (!canSubmit || !primaryMuscle || !equipment) return;
    if (!targetWorkoutExists || !workoutId) {
      setError('That draft workout is no longer available.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const existing = readExerciseCatalogSync().some(
        (exercise) => exercise.name === normalizedName
      );
      if (existing) {
        setError('An exercise with this name already exists.');
        return;
      }

      const workoutType = getWorkoutTypeForMuscleGroup(primaryMuscle);
      const exerciseId = createCustomExercise(
        normalizedName,
        workoutType,
        primaryMuscle,
        equipment
      );
      if (exerciseId === undefined) {
        setError('Couldn’t add this exercise. Please try again.');
        return;
      }
      const createdExercise = readExerciseCatalogSync().find(
        (exercise) => exercise.id === exerciseId
      );
      if (!createdExercise) throw new Error('The new exercise could not be loaded.');

      addExercise(workoutId, createdExercise);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      close();
    } catch (creationError) {
      const message = creationError instanceof Error ? creationError.message : '';
      setError(
        message.toLowerCase().includes('unique constraint')
          ? 'An exercise with this name already exists.'
          : 'Couldn’t add this exercise. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.modal}>
      <Pressable
        accessibilityLabel="Close new exercise"
        accessibilityRole="button"
        onPress={close}
        style={styles.backdrop}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
        style={styles.keyboardView}
      >
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.handle} />
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>New exercise</Text>
            <Text style={styles.subtitle}>Saved to your library for every split.</Text>

            <Text style={styles.fieldLabel}>NAME</Text>
            <TextInput
              accessibilityLabel="Exercise name"
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={80}
              onBlur={() => setNameFocused(false)}
              onChangeText={(value) => {
                setName(value);
                setError(null);
              }}
              onFocus={() => setNameFocused(true)}
              onSubmitEditing={submit}
              placeholder="Exercise name"
              placeholderTextColor={redesignColors.ashDim}
              returnKeyType="done"
              style={[styles.nameInput, nameFocused && styles.nameInputFocused]}
              value={name}
            />

            <Text style={styles.fieldLabel}>MUSCLE GROUPS</Text>
            <View style={styles.chipWrap}>
              {CUSTOM_SPLIT_MUSCLE_GROUPS.map((group) => {
                const color = GROUP_COLORS[group];
                const selected = group === primaryMuscle;
                return (
                  <Pressable
                    accessibilityLabel={group}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    key={group}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setPrimaryMuscle(group);
                      setError(null);
                    }}
                    style={[
                      styles.muscleChip,
                      {
                        backgroundColor: selected ? color : alpha(color, '13'),
                        borderColor: selected ? color : alpha(color, '66'),
                      },
                    ]}
                  >
                    <Text style={[
                      styles.muscleChipText,
                      { color: selected ? redesignColors.ink : color },
                    ]}>
                      {group}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>EQUIPMENT</Text>
            <View style={styles.equipmentRow}>
              {EQUIPMENT.map((item) => {
                const selected = item.value === equipment;
                return (
                  <Pressable
                    accessibilityLabel={item.label}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    key={item.value}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setEquipment(item.value);
                      setError(null);
                    }}
                    style={[
                      styles.equipmentChip,
                      selected && styles.equipmentChipSelected,
                    ]}
                  >
                    <Text style={[
                      styles.equipmentChipText,
                      selected && styles.equipmentChipTextSelected,
                    ]}
                      adjustsFontSizeToFit
                      minimumFontScale={0.82}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {error ? (
              <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
            ) : null}

            <Pressable
              accessibilityLabel="Add exercise"
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit }}
              disabled={!canSubmit}
              onPress={submit}
              style={[
                styles.addButton,
                canSubmit ? styles.addButtonEnabled : styles.addButtonDisabled,
              ]}
            >
              <Text style={[
                styles.addButtonText,
                !canSubmit && styles.addButtonTextDisabled,
              ]}>
                {submitting ? 'Adding…' : 'Add Exercise'}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: 'transparent' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.76)',
  },
  keyboardView: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    height: '64%',
    overflow: 'hidden',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.surface,
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -8 },
    elevation: 18,
  },
  handle: {
    width: 44,
    height: 4,
    alignSelf: 'center',
    marginTop: 12,
    borderRadius: 2,
    backgroundColor: redesignColors.hi,
  },
  content: { paddingHorizontal: 30, paddingTop: 22, paddingBottom: 2 },
  title: {
    color: redesignColors.bone,
    fontFamily: redesignFonts.display,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.7,
  },
  subtitle: {
    marginTop: 4,
    color: redesignColors.ash,
    fontFamily: redesignFonts.ui,
    fontSize: 17,
    lineHeight: 22,
  },
  fieldLabel: {
    marginTop: 22,
    marginBottom: 8,
    color: redesignColors.ashDim,
    fontFamily: redesignFonts.monoBold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 2.2,
  },
  nameInput: {
    minHeight: 54,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 19,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.raised,
    color: redesignColors.bone,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 19,
  },
  nameInputFocused: {
    borderColor: splitColors.chest,
    shadowColor: splitColors.chest,
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: 8,
  },
  muscleChip: {
    minHeight: 38,
    paddingHorizontal: 15,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muscleChipText: {
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 15,
  },
  equipmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  equipmentChip: {
    minWidth: 0,
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 2,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipmentChipSelected: {
    borderColor: redesignColors.ash,
    backgroundColor: redesignColors.hi,
  },
  equipmentChipText: {
    color: redesignColors.ash,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 13,
  },
  equipmentChipTextSelected: { color: redesignColors.bone },
  error: {
    marginTop: 14,
    color: splitColors.core,
    fontFamily: redesignFonts.ui,
    fontSize: 14,
    lineHeight: 19,
  },
  addButton: {
    width: '100%',
    height: 58,
    marginTop: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonEnabled: {
    backgroundColor: splitColors.chest,
    shadowColor: splitColors.chest,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  addButtonDisabled: { backgroundColor: redesignColors.raised },
  addButtonText: {
    color: redesignColors.ink,
    fontFamily: redesignFonts.uiBold,
    fontSize: 21,
  },
  addButtonTextDisabled: { color: redesignColors.ashDim },
});
