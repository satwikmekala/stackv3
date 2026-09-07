import { create } from 'zustand';

import type { Archetype } from '@/constants/archetypes';
import type { CustomSplit } from '@/store/customSplits';
import { splitColors } from '@/constants/theme';
import type { ExerciseCatalogItem, WorkoutType } from '@/store/workoutStore';

export const CUSTOM_SPLIT_MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Core',
  'Legs',
] as const;

export type CustomSplitMuscleGroup = typeof CUSTOM_SPLIT_MUSCLE_GROUPS[number];

/** Where the creation flow began. Lives on the draft so it survives the
 * builder ↔ review round-trip without being threaded through route params. */
export type CustomSplitSource = 'onboarding' | 'library';

export const MUSCLE_GROUP_COLORS: Record<CustomSplitMuscleGroup, string> = {
  Chest: splitColors.chest,
  Back: splitColors.back,
  Shoulders: splitColors.shoulders,
  Biceps: splitColors.arms,
  Triceps: splitColors.arms,
  Core: splitColors.core,
  Legs: splitColors.legs,
};

export type DraftExercise = ExerciseCatalogItem;

export interface DraftWorkout {
  id: string;
  /**
   * Edit-only: the `custom_split_workouts.id` this workout was hydrated from.
   * Never display identity — `id` remains the only key the builder uses — it
   * exists so saving can rewrite the same persistent row instead of replacing
   * it, keeping session history and rotation intact.
   */
  persistedWorkoutId?: number;
  customName: string;
  exercises: DraftExercise[];
  selectedMuscleGroups: CustomSplitMuscleGroup[];
  prefillEnabled: boolean;
}

export interface DraftCustomSplit {
  name: string;
  workouts: DraftWorkout[];
}

interface CustomSplitDraftStore {
  draft: DraftCustomSplit | null;
  activeWorkoutId: string | null;
  source: CustomSplitSource;
  /** Non-null only while an already-saved split is being edited. */
  editingSplitId: number | null;
  initializeDraft: (
    name: string,
    workoutCount: number,
    source: CustomSplitSource
  ) => void;
  hydrateDraftForEdit: (split: CustomSplit) => void;
  discardDraft: () => void;
  setSplitName: (name: string) => void;
  selectWorkout: (workoutId: string) => void;
  addWorkout: () => void;
  duplicateWorkout: (workoutId: string) => void;
  deleteWorkout: (workoutId: string) => void;
  setWorkoutCustomName: (workoutId: string, customName: string) => void;
  toggleMuscleGroup: (
    workoutId: string,
    muscleGroup: CustomSplitMuscleGroup
  ) => void;
  toggleExercise: (workoutId: string, exercise: DraftExercise) => void;
  addExercise: (workoutId: string, exercise: DraftExercise) => void;
  removeExercise: (workoutId: string, exerciseId: number) => void;
  /**
   * Moves one exercise within a single workout. The draft order is canonical —
   * Review reads it directly and the save path writes positions from it.
   */
  reorderExercise: (workoutId: string, fromIndex: number, toIndex: number) => void;
  setPrefillEnabled: (workoutId: string, enabled: boolean) => void;
  mergePrefill: (workoutId: string, exercises: DraftExercise[]) => void;
}

let temporaryIdSequence = 0;

const createTemporaryWorkoutId = (): string => {
  temporaryIdSequence += 1;
  return `draft-workout-${Date.now().toString(36)}-${temporaryIdSequence}`;
};

const createEmptyWorkout = (): DraftWorkout => ({
  id: createTemporaryWorkoutId(),
  customName: '',
  exercises: [],
  selectedMuscleGroups: [],
  prefillEnabled: false,
});

/**
 * Prefill is an action, not a persistent workout mode. Once a workout has no
 * selections left, its next visible prefill control must start off.
 */
const normalizePrefillState = (workout: DraftWorkout): DraftWorkout =>
  workout.exercises.length === 0 &&
  workout.selectedMuscleGroups.length === 0 &&
  workout.prefillEnabled
    ? { ...workout, prefillEnabled: false }
    : workout;

const updateWorkout = (
  draft: DraftCustomSplit | null,
  workoutId: string,
  update: (workout: DraftWorkout) => DraftWorkout
): DraftCustomSplit | null => {
  if (!draft) return null;
  return {
    ...draft,
    workouts: draft.workouts.map((workout) =>
      workout.id === workoutId ? normalizePrefillState(update(workout)) : workout
    ),
  };
};

export const getMuscleGroupForExercise = (
  exercise: Pick<DraftExercise, 'workoutType' | 'primaryMuscle'>
): CustomSplitMuscleGroup => {
  if (exercise.workoutType === 'arms') {
    return /tricep/i.test(exercise.primaryMuscle) ? 'Triceps' : 'Biceps';
  }

  const workoutGroup: Record<Exclude<WorkoutType, 'arms'>, CustomSplitMuscleGroup> = {
    chest: 'Chest',
    back: 'Back',
    shoulders: 'Shoulders',
    legs: 'Legs',
    core: 'Core',
  };
  return workoutGroup[exercise.workoutType];
};

export const getWorkoutTypeForMuscleGroup = (
  muscleGroup: CustomSplitMuscleGroup
): WorkoutType => {
  const workoutTypes: Record<CustomSplitMuscleGroup, WorkoutType> = {
    Chest: 'chest',
    Back: 'back',
    Shoulders: 'shoulders',
    Biceps: 'arms',
    Triceps: 'arms',
    Core: 'core',
    Legs: 'legs',
  };
  return workoutTypes[muscleGroup];
};

export const getDerivedWorkoutName = (workout: DraftWorkout): string => {
  const seen = new Set<CustomSplitMuscleGroup>();
  const groups: CustomSplitMuscleGroup[] = [];

  workout.exercises.forEach((exercise) => {
    const group = getMuscleGroupForExercise(exercise);
    if (!seen.has(group)) {
      seen.add(group);
      groups.push(group);
    }
  });

  return groups.join(', ');
};

export const getWorkoutDisplayName = (workout: DraftWorkout): string =>
  workout.customName.trim() || getDerivedWorkoutName(workout);

/**
 * Ordered, de-duplicated muscle groups for a workout with the exercise count
 * behind each one — drives the proportional color bar on the review card.
 */
export const getWorkoutMuscleSegments = (
  workout: DraftWorkout
): { group: CustomSplitMuscleGroup; color: string; count: number }[] => {
  const counts = new Map<CustomSplitMuscleGroup, number>();
  workout.exercises.forEach((exercise) => {
    const group = getMuscleGroupForExercise(exercise);
    counts.set(group, (counts.get(group) ?? 0) + 1);
  });
  return Array.from(counts, ([group, count]) => ({
    group,
    color: MUSCLE_GROUP_COLORS[group],
    count,
  }));
};

export const getWorkoutLetter = (index: number): string => {
  let value = index + 1;
  let label = '';
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
};

export interface DraftPrefillRecommendation {
  archetype: Archetype;
  variant: string;
}

/**
 * Assigns variants by the workout's occurrence within the weekly sequence,
 * e.g. upper/lower/upper/lower becomes upper-a/lower-a/upper-b/lower-b.
 */
export const getDraftPrefillRecommendation = (
  sequence: readonly Archetype[],
  workoutIndex: number,
  availableVariants: readonly string[]
): DraftPrefillRecommendation | null => {
  const archetype = sequence[workoutIndex];
  if (!archetype || availableVariants.length === 0) return null;

  const occurrence = sequence
    .slice(0, workoutIndex + 1)
    .filter((candidate) => candidate === archetype).length;

  return {
    archetype,
    variant: availableVariants[(occurrence - 1) % availableVariants.length],
  };
};

export const useCustomSplitDraftStore = create<CustomSplitDraftStore>()((set) => ({
  draft: null,
  activeWorkoutId: null,
  source: 'library',
  editingSplitId: null,

  initializeDraft: (name, workoutCount, source) =>
    set((state) => {
      if (state.draft) return state;
      const workouts = Array.from(
        { length: Math.max(1, workoutCount) },
        createEmptyWorkout
      );
      return {
        draft: { name, workouts },
        activeWorkoutId: workouts[0].id,
        source,
        // A fresh creation can never inherit edit metadata from an
        // abandoned edit session.
        editingSplitId: null,
      };
    }),

  hydrateDraftForEdit: (split) =>
    set((state) => {
      // Re-entrancy guard: a second resolution of the same load must not
      // rebuild the draft and throw away in-progress edits.
      if (state.draft && state.editingSplitId === split.id) return state;
      const workouts: DraftWorkout[] = split.workouts.map((workout) => {
        const exercises: DraftExercise[] = workout.exercises.map((exercise) => ({
          id: exercise.exerciseId,
          name: exercise.name,
          workoutType: exercise.workoutType,
          primaryMuscle: exercise.primaryMuscle,
          equipment: exercise.equipment,
          isCustom: exercise.isCustom,
        }));
        const selectedMuscleGroups: CustomSplitMuscleGroup[] = [];
        exercises.forEach((exercise) => {
          const group = getMuscleGroupForExercise(exercise);
          if (!selectedMuscleGroups.includes(group)) {
            selectedMuscleGroups.push(group);
          }
        });
        return {
          id: createTemporaryWorkoutId(),
          persistedWorkoutId: workout.id,
          // The saved name is authoritative; leaving it as the custom name
          // keeps renames explicit rather than re-deriving from exercises.
          customName: workout.name,
          exercises,
          selectedMuscleGroups,
          prefillEnabled: false,
        };
      });

      if (workouts.length === 0) {
        const workout = createEmptyWorkout();
        workouts.push(workout);
      }

      return {
        draft: { name: split.name, workouts },
        activeWorkoutId: workouts[0].id,
        source: 'library' as CustomSplitSource,
        editingSplitId: split.id,
      };
    }),

  discardDraft: () =>
    set({
      draft: null,
      activeWorkoutId: null,
      source: 'library',
      editingSplitId: null,
    }),

  setSplitName: (name) =>
    set((state) => (state.draft ? { draft: { ...state.draft, name } } : state)),

  selectWorkout: (workoutId) => set({ activeWorkoutId: workoutId }),

  addWorkout: () =>
    set((state) => {
      if (!state.draft) return state;
      const workout = createEmptyWorkout();
      return {
        draft: {
          ...state.draft,
          workouts: [...state.draft.workouts, workout],
        },
        activeWorkoutId: workout.id,
      };
    }),

  duplicateWorkout: (workoutId) =>
    set((state) => {
      if (!state.draft) return state;
      const sourceIndex = state.draft.workouts.findIndex(
        (workout) => workout.id === workoutId
      );
      if (sourceIndex < 0) return state;

      const source = state.draft.workouts[sourceIndex];
      const duplicate: DraftWorkout = {
        ...source,
        id: createTemporaryWorkoutId(),
        // A copy is a new workout — it must not claim the original's
        // persistent row when the edit is saved.
        persistedWorkoutId: undefined,
        exercises: source.exercises.map((exercise) => ({ ...exercise })),
        selectedMuscleGroups: [...source.selectedMuscleGroups],
      };
      const workouts = [...state.draft.workouts];
      workouts.splice(sourceIndex + 1, 0, duplicate);
      return {
        draft: { ...state.draft, workouts },
        activeWorkoutId: duplicate.id,
      };
    }),

  deleteWorkout: (workoutId) =>
    set((state) => {
      if (!state.draft || state.draft.workouts.length <= 1) return state;
      const deleteIndex = state.draft.workouts.findIndex(
        (workout) => workout.id === workoutId
      );
      if (deleteIndex < 0) return state;

      const workouts = state.draft.workouts.filter(
        (workout) => workout.id !== workoutId
      );
      const selectedWorkout = workouts[Math.min(deleteIndex, workouts.length - 1)];
      return {
        draft: { ...state.draft, workouts },
        activeWorkoutId: selectedWorkout.id,
      };
    }),

  setWorkoutCustomName: (workoutId, customName) =>
    set((state) => ({
      draft: updateWorkout(state.draft, workoutId, (workout) => ({
        ...workout,
        customName,
      })),
    })),

  toggleMuscleGroup: (workoutId, muscleGroup) =>
    set((state) => ({
      draft: updateWorkout(state.draft, workoutId, (workout) => ({
        ...workout,
        selectedMuscleGroups: workout.selectedMuscleGroups.includes(muscleGroup)
          ? workout.selectedMuscleGroups.filter((group) => group !== muscleGroup)
          : [...workout.selectedMuscleGroups, muscleGroup],
      })),
    })),

  toggleExercise: (workoutId, exercise) =>
    set((state) => ({
      draft: updateWorkout(state.draft, workoutId, (workout) => {
        const selected = workout.exercises.some((item) => item.id === exercise.id);
        return {
          ...workout,
          exercises: selected
            ? workout.exercises.filter((item) => item.id !== exercise.id)
            : [...workout.exercises, exercise],
        };
      }),
    })),

  addExercise: (workoutId, exercise) =>
    set((state) => ({
      draft: updateWorkout(state.draft, workoutId, (workout) => {
        if (workout.exercises.some((item) => item.id === exercise.id)) return workout;
        const group = getMuscleGroupForExercise(exercise);
        return {
          ...workout,
          exercises: [...workout.exercises, exercise],
          selectedMuscleGroups: workout.selectedMuscleGroups.includes(group)
            ? workout.selectedMuscleGroups
            : [...workout.selectedMuscleGroups, group],
        };
      }),
    })),

  removeExercise: (workoutId, exerciseId) =>
    set((state) => ({
      draft: updateWorkout(state.draft, workoutId, (workout) => ({
        ...workout,
        exercises: workout.exercises.filter((item) => item.id !== exerciseId),
      })),
    })),

  reorderExercise: (workoutId, fromIndex, toIndex) =>
    set((state) => ({
      draft: updateWorkout(state.draft, workoutId, (workout) => {
        const count = workout.exercises.length;
        if (
          fromIndex === toIndex ||
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= count ||
          toIndex >= count
        ) {
          return workout;
        }
        // Splice the same object references so persistent exercise ids — and
        // the workout's own identity, including persistedWorkoutId — survive.
        const exercises = [...workout.exercises];
        const [moved] = exercises.splice(fromIndex, 1);
        exercises.splice(toIndex, 0, moved);
        return { ...workout, exercises };
      }),
    })),

  setPrefillEnabled: (workoutId, enabled) =>
    set((state) => ({
      draft: updateWorkout(state.draft, workoutId, (workout) => ({
        ...workout,
        prefillEnabled: enabled,
      })),
    })),

  mergePrefill: (workoutId, exercises) =>
    set((state) => ({
      draft: updateWorkout(state.draft, workoutId, (workout) => {
        const existingIds = new Set(workout.exercises.map((item) => item.id));
        const additions = exercises.filter((item) => !existingIds.has(item.id));
        const representedGroups = exercises.map(getMuscleGroupForExercise);
        const groupsToAdd = representedGroups.filter(
          (group, index) =>
            representedGroups.indexOf(group) === index &&
            !workout.selectedMuscleGroups.includes(group)
        );
        return {
          ...workout,
          prefillEnabled: true,
          exercises: [...workout.exercises, ...additions],
          selectedMuscleGroups: [...workout.selectedMuscleGroups, ...groupsToAdd],
        };
      }),
    })),
}));
