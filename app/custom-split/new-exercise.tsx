import { useMuscleColors } from '@/store/muscleColors';
import { getMuscleColor } from '@/constants/muscleColors';
import { SplitPressable as Pressable } from '@/components/custom-split/SplitPressable';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from '@/services/haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Action, Header, ui } from '@/components/custom-split/ui';
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
import { useWorkoutStore, type ExerciseLoadType, type ExerciseMetric } from '@/store/workoutStore';
import '@/global.css';

const GROUP_COLORS: Record<CustomSplitMuscleGroup, string> = {
  get Chest() { return getMuscleColor('chest'); },
  get Back() { return getMuscleColor('back'); },
  get Shoulders() { return getMuscleColor('shoulders'); },
  get Biceps() { return getMuscleColor('arms'); },
  get Triceps() { return getMuscleColor('arms'); },
  get Core() { return getMuscleColor('core'); },
  get Legs() { return getMuscleColor('legs'); },
};

const EQUIPMENT = [
  { label: 'Barbell', value: 'Barbell' },
  { label: 'Dumbbell', value: 'Dumbbell' },
  { label: 'Cable', value: 'Cable' },
  { label: 'Machine', value: 'Machine' },
  { label: 'No equipment', value: 'None' },
] as const;

type Equipment = typeof EQUIPMENT[number]['value'];

// Fixed once created: logged history keeps the measurement it was recorded in.
const LOAD_OPTIONS: { label: string; value: ExerciseLoadType }[] = [
  { label: 'External weight', value: 'external_weight' },
  { label: 'Bodyweight', value: 'bodyweight' },
];
const MEASURE_OPTIONS: { label: string; value: ExerciseMetric }[] = [
  { label: 'Reps', value: 'reps' },
  { label: 'Time', value: 'duration' },
];


function ChoiceRow<T extends string>({ label, options, value, onSelect }: {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onSelect: (value: T) => void;
}) {
  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View accessibilityRole="radiogroup" style={styles.equipmentRow}>
        {options.map((item) => {
          const selected = item.value === value;
          return (
            <Pressable
              accessibilityLabel={item.label}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={item.value}
              onPress={() => {
                void Haptics.selectionAsync();
                onSelect(item.value);
              }}
              style={({ pressed }) => [styles.equipmentChip, selected && styles.equipmentChipSelected, pressed && ui.pressed]}
            >
              <Text
                style={[styles.equipmentChipText, selected && styles.equipmentChipTextSelected]}
              >
                {selected ? '✓ ' : ''}{item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

export default function NewCustomExerciseScreen() {
  useMuscleColors(state => state.preferences);
  const router = useRouter();
  const { workoutId, picker, initialName } = useLocalSearchParams<{ workoutId?: string; picker?: string; initialName?: string }>();
  const draft = useCustomSplitDraftStore((state) => state.draft);
  const addExercise = useCustomSplitDraftStore((state) => state.addExercise);
  const createCustomExercise = useWorkoutStore((state) => state.createCustomExercise);
  const [name, setName] = useState(initialName ?? '');
  const [primaryMuscle, setPrimaryMuscle] = useState<CustomSplitMuscleGroup | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loadType, setLoadType] = useState<ExerciseLoadType>('external_weight');
  const [metric, setMetric] = useState<ExerciseMetric>('reps');
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
        (exercise) => exercise.name.trim().toLocaleLowerCase() === normalizedName.toLocaleLowerCase()
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
        equipment === 'None' ? null : equipment,
        loadType,
        metric
      );
      if (exerciseId === undefined) {
        setError('Couldn’t add this exercise. Try again.');
        return;
      }
      const createdExercise = readExerciseCatalogSync().find(
        (exercise) => exercise.id === exerciseId
      );
      if (!createdExercise) throw new Error('The new exercise could not be loaded.');

      const store = useCustomSplitDraftStore.getState();
      if (picker === '1' && store.picker?.workoutId === workoutId) {
        store.updatePicker({ selected: [...store.picker.selected.filter(item => item.id !== createdExercise.id), createdExercise] });
      } else addExercise(workoutId, createdExercise);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      close();
    } catch (creationError) {
      const message = creationError instanceof Error ? creationError.message : '';
      setError(
        message.toLowerCase().includes('unique constraint')
          ? 'An exercise with this name already exists.'
          : 'Couldn’t add this exercise. Try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={ui.screen}>
      <Header title="Create exercise" left={<Action title="Cancel" compact onPress={close} />} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
        style={styles.keyboardView}
      >
        <View style={styles.sheet}>
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={ui.title}>Create your lift.</Text><Text style={styles.subtitle}>Saved to your library for every routine.</Text>

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
              placeholderTextColor={redesignColors.ash}
              returnKeyType="done"
              style={[styles.nameInput, nameFocused && styles.nameInputFocused]}
              value={name}
            />

            <Text style={styles.fieldLabel}>PRIMARY MUSCLE</Text>
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
                    style={({ pressed }) => [styles.muscleChip, { backgroundColor: selected ? redesignColors.raised : redesignColors.surface }, pressed && ui.pressed]}
                  >
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                    <Text style={styles.muscleChipText}>
                      {selected ? '✓ ' : ''}{group}
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
                    style={({ pressed }) => [styles.equipmentChip, selected && styles.equipmentChipSelected, pressed && ui.pressed]}
                  >
                    <Text style={[
                      styles.equipmentChipText,
                      selected && styles.equipmentChipTextSelected,
                    ]}
                    >
                      {selected ? '✓ ' : ''}{item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <ChoiceRow
              label="LOAD"
              options={LOAD_OPTIONS}
              value={loadType}
              onSelect={(value) => { setLoadType(value); setError(null); }}
            />
            <ChoiceRow
              label="MEASURE"
              options={MEASURE_OPTIONS}
              value={metric}
              onSelect={(value) => { setMetric(value); setError(null); }}
            />

            <Text style={[ui.label, { marginTop: 12 }]}>These choices set how Stack logs this exercise.</Text>

            {error ? (
              <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
            ) : null}

          </ScrollView>
          <View style={ui.dock}>
            <Pressable
              accessibilityLabel="Create exercise"
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit, busy: submitting }}
              disabled={!canSubmit}
              onPress={submit}
              style={({ pressed }) => [styles.addButton, canSubmit ? styles.addButtonEnabled : styles.addButtonDisabled, pressed && ui.pressed]}
            >
              <Text style={[
                styles.addButtonText,
                !canSubmit && styles.addButtonTextDisabled,
              ]}>
                {submitting ? 'Creating…' : 'Create exercise'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  sheet: { flex: 1, backgroundColor: redesignColors.ink },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
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
    color: redesignColors.ash,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  nameInput: {
    minHeight: 54,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 19,
    borderCurve: 'continuous',
    backgroundColor: redesignColors.raised,
    color: redesignColors.bone,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 19,
  },
  nameInputFocused: {
    backgroundColor: redesignColors.hi,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: 8,
  },
  muscleChip: {
    minHeight: 44,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muscleChipText: {
    color: redesignColors.bone,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 15,
  },
  equipmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  equipmentChip: {
    minWidth: 0,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 15,
    backgroundColor: redesignColors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipmentChipSelected: {
    backgroundColor: redesignColors.hi,
  },
  equipmentChipText: {
    color: redesignColors.ash,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 15,
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
    minHeight: 58,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonEnabled: {
    backgroundColor: redesignColors.accent,
  },
  addButtonDisabled: { backgroundColor: redesignColors.raised },
  addButtonText: {
    color: redesignColors.ink,
    fontFamily: redesignFonts.uiBold,
    fontSize: 16,
  },
  addButtonTextDisabled: { color: redesignColors.ashDim },
});
