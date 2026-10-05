import { getMuscleColor } from '@/constants/muscleColors';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DayColor } from '@/features/custom-split/colors';
import type { ImportedDraftWorkout, PendingImportExercise } from '@/features/routineImport/importDraft';
import { exerciseMatchKey, type PortableExercise } from '@/features/sharing/splitProtocol';
import { ROUTINE_SHARE_ID_PATTERN } from '@/features/sharing/splitTransport';

import type { Archetype } from '@/constants/archetypes';
import type { CustomSplit } from '@/store/customSplits';
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
export type CustomSplitSource = 'onboarding' | 'library' | 'stack' | 'shared';

export const STACK_PLAN_NAME = 'Stack’s plan';

export const MUSCLE_GROUP_COLORS: Record<CustomSplitMuscleGroup, string> = {
  get Chest() { return getMuscleColor('chest'); },
  get Back() { return getMuscleColor('back'); },
  get Shoulders() { return getMuscleColor('shoulders'); },
  get Biceps() { return getMuscleColor('arms'); },
  get Triceps() { return getMuscleColor('arms'); },
  get Core() { return getMuscleColor('core'); },
  get Legs() { return getMuscleColor('legs'); },
};

export type DraftExercise = ExerciseCatalogItem & { portable?: PortableExercise };
export interface SharedDraftContext { shareId: string; attemptId?: string; nextExerciseId?: number }
export interface SharedDraftWorkout extends Omit<ImportedDraftWorkout, 'exercises'> { exercises: DraftExercise[] }

export interface DraftWorkout {
  color?: DayColor | null;
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
  /**
   * Pasted exercises Stack wasn't sure about. Each must be confirmed (it then
   * joins `exercises`) or removed before the routine can be saved.
   */
  pendingImports?: PendingImportExercise[];
}

export interface DraftCustomSplit {
  name: string;
  workouts: DraftWorkout[];
}

export interface SplitDraftSnapshot {
  sharedContext?: SharedDraftContext;
  draft: DraftCustomSplit;
  activeWorkoutId: string | null;
  source: CustomSplitSource;
  editingSplitId: number | null;
  sourceRevision: string | null;
}
/** Stack's plan has its own slot until its first save, so it never collides with a new routine. */
export const splitDraftKey = (id: number | null, source?: CustomSplitSource, shareId?: string) =>
  id !== null ? `edit:${id}` : source === 'shared' ? `shared:${shareId}` : source === 'stack' ? 'stack' : 'new';
export const splitRevision = (split: CustomSplit) => JSON.stringify(split);

interface CustomSplitDraftStore {
  sharedContext?: SharedDraftContext;
  drafts: Record<string, SplitDraftSnapshot>;
  hydrated: boolean;
  storageError: string | null;
  setHydrated: () => void;
  sourceRevision: string | null;
  resumeDraft: (id: number | null, source?: CustomSplitSource, shareId?: string) => boolean;
  closeDraft: () => void;
  recoverAsNew: () => void;
  setWorkoutColor: (id: string, color: DayColor | null) => void;
  reorderWorkout: (from: number, to: number) => void;
  restoreExercise: (id: string, exercise: DraftExercise, position: number) => void;
  /** `pendingKey`: the picker is choosing the exercise for a pasted exercise Stack wasn't sure about. */
  picker: { workoutId: string; query: string; group: CustomSplitMuscleGroup | null; selected: DraftExercise[]; pendingKey?: string } | null;
  openPicker: (workoutId: string, options?: { pendingKey?: string; query?: string }) => void;
  updatePicker: (update: Partial<NonNullable<CustomSplitDraftStore['picker']>>) => void;
  closePicker: () => void;
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
  /** Starts editing Stack's plan from its current workouts, before it has ever been saved. */
  initializeStackPlanDraft: (workouts: { name: string; exercises: DraftExercise[] }[]) => void;
  /** A newly generated Stack's plan makes unfinished edits of the old one obsolete. */
  discardStackPlanDrafts: () => void;
  /** Starts a new routine from a pasted routine. Replaces any open new-routine draft: the paste is the newer intent. */
  initializeImportedDraft: (name: string, workouts: ImportedDraftWorkout[], source: Exclude<CustomSplitSource, 'shared'>) => void;
  initializeSharedDraft: (shareId: string, name: string, workouts: SharedDraftWorkout[]) => void;
  allocateSharedExerciseId: () => number;
  /** Confirms a pending pasted exercise as `exercise`, or removes it when `exercise` is null. */
  resolvePendingImport: (workoutId: string, key: string, exercise: DraftExercise | null) => void;
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
  color: null,
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

export const countPendingImports = (draft: DraftCustomSplit | null | undefined): number =>
  draft?.workouts.reduce((total, workout) => total + (workout.pendingImports?.length ?? 0), 0) ?? 0;

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

// Do not overwrite storage if hydration fails, and serialize snapshots so an
// earlier async write can never resurrect a discarded or already-saved draft.
let draftStorageReadable = false;
let draftWriteQueue: Promise<void> = Promise.resolve();

/** Await the same persistence queue used by recovery before a final import. */
export async function flushCustomSplitDrafts() {
  await draftWriteQueue;
  const state = useCustomSplitDraftStore.getState();
  if (!state.hydrated || state.storageError) throw new Error('Couldn’t save your draft. Try again.');
}

/** Clear queued snapshots as well as the live builder when device data is replaced. */
export async function clearCustomSplitDrafts() {
  await draftWriteQueue;
  await AsyncStorage.removeItem('stack-split-drafts');
  const readable = draftStorageReadable;
  draftStorageReadable = false;
  useCustomSplitDraftStore.setState({ drafts: {}, draft: null, activeWorkoutId: null,
    editingSplitId: null, sourceRevision: null, sharedContext: undefined, picker: null, source: 'library', hydrated: true, storageError: null });
  draftStorageReadable = readable;
}

export const useCustomSplitDraftStore = create<CustomSplitDraftStore>()(persist((rawSet, get) => {
  // Every draft mutation updates its resumable snapshot in the same state change.
  const set = (update: Partial<CustomSplitDraftStore> | ((state: CustomSplitDraftStore) => Partial<CustomSplitDraftStore>)) => rawSet((state) => {
    const next = { ...state, ...(typeof update === 'function' ? update(state) : update) };
    if (next.source !== 'shared') next.sharedContext = undefined;
    if (next.draft) next.drafts = { ...next.drafts, [splitDraftKey(next.editingSplitId, next.source, next.sharedContext?.shareId)]: {
      draft: next.draft, activeWorkoutId: next.activeWorkoutId, source: next.source,
      editingSplitId: next.editingSplitId, sourceRevision: next.sourceRevision,
      ...(next.sharedContext ? { sharedContext: next.sharedContext } : {}),
    } };
    return next;
  });
  return {
  drafts: {},
  hydrated: false,
  storageError: null,
  setHydrated: () => rawSet({ hydrated: true, storageError: null }),
  sourceRevision: null,
  picker: null,
  openPicker: (workoutId, options) => set({ picker: { workoutId, query: options?.query ?? '', group: null, selected: [],
    ...(options?.pendingKey ? { pendingKey: options.pendingKey } : {}) } }),
  updatePicker: (update) => set(state => ({ picker: state.picker ? { ...state.picker, ...update } : null })),
  closePicker: () => set({ picker: null }),
  resumeDraft: (id, source, shareId) => {
    const saved = get().drafts[splitDraftKey(id, source, shareId)];
    if (!saved) return false;
    set({ ...saved, picker: null });
    return true;
  },
  closeDraft: () => set({ draft: null, activeWorkoutId: null, editingSplitId: null, sourceRevision: null, sharedContext: undefined, picker: null }),
  recoverAsNew: () => set(state => {
    if (!state.draft) return {};
    const drafts = { ...state.drafts };
    delete drafts[splitDraftKey(state.editingSplitId, state.source, state.sharedContext?.shareId)];
    // Preserve an unrelated new draft rather than silently overwriting it.
    if (drafts.new) return {};
    // A recovered Stack's plan edit becomes the user's own routine.
    return { drafts, editingSplitId: null, sourceRevision: null, source: state.source === 'stack' ? 'library' : state.source,
      draft: { ...state.draft, workouts: state.draft.workouts.map(workout => ({ ...workout, persistedWorkoutId: undefined })) } };
  }),
  setWorkoutColor: (id, color) => set(state => ({ draft: updateWorkout(state.draft, id, workout => ({ ...workout, color })) })),
  reorderWorkout: (from, to) => set(state => {
    if (!state.draft || from < 0 || to < 0 || from >= state.draft.workouts.length || to >= state.draft.workouts.length) return {};
    const workouts = [...state.draft.workouts];
    workouts.splice(to, 0, workouts.splice(from, 1)[0]);
    return { draft: { ...state.draft, workouts } };
  }),
  restoreExercise: (id, exercise, position) => set(state => ({ draft: updateWorkout(state.draft, id, workout => {
    if (workout.exercises.some(item => item.id === exercise.id)) return workout;
    const exercises = [...workout.exercises];
    exercises.splice(Math.min(position, exercises.length), 0, exercise);
    return { ...workout, exercises };
  }) })),
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
        sourceRevision: null,
      };
    }),

  initializeStackPlanDraft: (planWorkouts) =>
    set((state) => {
      if (state.draft || !planWorkouts.length) return state;
      const workouts = planWorkouts.map(({ name, exercises }): DraftWorkout => ({
        ...createEmptyWorkout(),
        customName: name,
        exercises: exercises.map((exercise) => ({ ...exercise })),
        selectedMuscleGroups: exercises.map(getMuscleGroupForExercise)
          .filter((group, index, groups) => groups.indexOf(group) === index),
      }));
      return {
        draft: { name: STACK_PLAN_NAME, workouts },
        activeWorkoutId: workouts[0].id,
        source: 'stack' as CustomSplitSource,
        editingSplitId: null,
        sourceRevision: null,
      };
    }),

  initializeImportedDraft: (name, importedWorkouts, source) =>
    set(() => {
      if (!importedWorkouts.length) return {};
      const workouts = importedWorkouts.map(({ name: workoutName, color, exercises, pending }): DraftWorkout => ({
        ...createEmptyWorkout(),
        color: color ?? null,
        customName: workoutName,
        exercises: exercises.map((exercise) => ({ ...exercise })),
        selectedMuscleGroups: exercises.map(getMuscleGroupForExercise)
          .filter((group, index, groups) => groups.indexOf(group) === index),
        ...(pending.length ? { pendingImports: pending.map((item) => ({ ...item })) } : {}),
      }));
      return {
        draft: { name, workouts },
        activeWorkoutId: workouts[0].id,
        source,
        editingSplitId: null,
        sourceRevision: null,
        picker: null,
      };
    }),

  initializeSharedDraft: (shareId, name, importedWorkouts) => {
    if (!get().hydrated || !ROUTINE_SHARE_ID_PATTERN.test(shareId)) throw new Error('This routine link is broken.');
    if (get().resumeDraft(null, 'shared', shareId)) return;
    const workouts: DraftWorkout[] = importedWorkouts.map(day => ({
      ...createEmptyWorkout(), customName: day.name, color: day.color ?? null,
      exercises: day.exercises.map(exercise => ({ ...exercise, portable: exercise.portable ? { ...exercise.portable } : undefined })),
      selectedMuscleGroups: [...new Set(day.exercises.map(getMuscleGroupForExercise))],
    }));
    if (!workouts.length) throw new Error('This routine link is broken.');
    set({ draft: { name, workouts }, activeWorkoutId: workouts[0].id, source: 'shared',
      sharedContext: { shareId, nextExerciseId: Math.min(0, ...workouts.flatMap(day => day.exercises.map(exercise => exercise.id))) - 1 }, editingSplitId: null, sourceRevision: null, picker: null });
  },

  allocateSharedExerciseId: () => {
    const state = get();
    if (state.source !== 'shared' || !state.sharedContext || !state.draft) throw new Error('Shared draft unavailable.');
    const id = state.sharedContext.nextExerciseId ?? Math.min(0, ...state.draft.workouts.flatMap(day => day.exercises.map(exercise => exercise.id))) - 1;
    set({ sharedContext: { ...state.sharedContext, nextExerciseId: id - 1 } });
    return id;
  },

  resolvePendingImport: (workoutId, key, exercise) =>
    set((state) => ({
      draft: updateWorkout(state.draft, workoutId, (workout) => {
        const pending = workout.pendingImports?.find((item) => item.key === key);
        if (!pending) return workout;
        const pendingImports = workout.pendingImports!.filter((item) => item.key !== key);
        const rest = pendingImports.length ? { pendingImports } : { pendingImports: undefined };
        // Confirming an exercise the workout already has just clears the question.
        if (!exercise || workout.exercises.some((item) => item.id === exercise.id)) return { ...workout, ...rest };
        // Back where it was pasted: after the exercises that came before it.
        const exercises = [...workout.exercises];
        exercises.splice(Math.min(pending.position, exercises.length), 0, { ...exercise });
        const group = getMuscleGroupForExercise(exercise);
        return {
          ...workout,
          ...rest,
          exercises,
          selectedMuscleGroups: workout.selectedMuscleGroups.includes(group)
            ? workout.selectedMuscleGroups
            : [...workout.selectedMuscleGroups, group],
        };
      }),
    })),

  discardStackPlanDrafts: () => rawSet(state => ({
    drafts: Object.fromEntries(Object.entries(state.drafts).filter(([, snapshot]) => snapshot.source !== 'stack')),
    ...(state.source === 'stack' ? { draft: null, activeWorkoutId: null, editingSplitId: null, sourceRevision: null, source: 'library' as CustomSplitSource, picker: null } : {}),
  })),

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
          loadType: exercise.loadType,
          metric: exercise.metric,
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
          color: workout.color ?? null,
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
        source: (split.isStackPlan ? 'stack' : 'library') as CustomSplitSource,
        editingSplitId: split.id,
        sourceRevision: splitRevision(split),
      };
    }),

  discardDraft: () => set(state => {
    const drafts = { ...state.drafts };
    delete drafts[splitDraftKey(state.editingSplitId, state.source, state.sharedContext?.shareId)];
    return { drafts, draft: null, activeWorkoutId: null, editingSplitId: null, sourceRevision: null, source: 'library', picker: null };
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
        pendingImports: source.pendingImports?.map((item) => ({ ...item })),
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
        if (workout.exercises.some((item) => item.id === exercise.id ||
          (state.source === 'shared' && exerciseMatchKey(item.name) === exerciseMatchKey(exercise.name)))) return workout;
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
        const additions = exercises.filter((item) => !existingIds.has(item.id) && (state.source !== 'shared' ||
          !workout.exercises.some(existing => exerciseMatchKey(existing.name) === exerciseMatchKey(item.name))));
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
  };
}, {
  name: 'stack-split-drafts',
  version: 1,
  storage: createJSONStorage(() => ({
    getItem: async (name) => { await draftWriteQueue; const value = await AsyncStorage.getItem(name); draftStorageReadable = true; return value; },
    setItem: (name, value) => {
      if (!draftStorageReadable) return Promise.resolve();
      draftWriteQueue = draftWriteQueue.then(async () => {
        try {
          await AsyncStorage.setItem(name, value);
          if (useCustomSplitDraftStore.getState().storageError) useCustomSplitDraftStore.setState({ storageError: null });
        } catch {
          if (!useCustomSplitDraftStore.getState().storageError) useCustomSplitDraftStore.setState({ storageError: 'Draft could not be saved on this device. Keep this screen open and try again.' });
        }
      });
      return draftWriteQueue;
    },
    removeItem: (name) => AsyncStorage.removeItem(name),
  })),
  partialize: state => ({ drafts: state.drafts }),
  migrate: () => { throw new Error('Unsupported draft version'); },
  merge: (persisted, current) => {
    if (persisted === undefined) return current;
    const saved = persisted as { drafts?: Record<string, SplitDraftSnapshot> };
    if (!saved || !saved.drafts || typeof saved.drafts !== 'object' || Array.isArray(saved.drafts)) throw new Error('Invalid saved drafts');
    for (const [key, snapshot] of Object.entries(saved.drafts)) {
      if (!snapshot || key !== splitDraftKey(snapshot.editingSplitId, snapshot.source, snapshot.sharedContext?.shareId) ||
        (snapshot.source === 'shared' && (snapshot.editingSplitId !== null || !snapshot.sharedContext ||
          !ROUTINE_SHARE_ID_PATTERN.test(snapshot.sharedContext.shareId) ||
          (snapshot.sharedContext.attemptId !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(snapshot.sharedContext.attemptId)))) ||
        !snapshot.draft || typeof snapshot.draft.name !== 'string' ||
        !Array.isArray(snapshot.draft.workouts) || !snapshot.draft.workouts.length ||
        snapshot.draft.workouts.some(day => !day || typeof day.id !== 'string' || typeof day.customName !== 'string' || !Array.isArray(day.exercises))) {
        throw new Error('Invalid saved draft');
      }
    }
    return { ...current, drafts: saved.drafts };
  },
  onRehydrateStorage: () => (state, error) => {
    if (error) {
      draftStorageReadable = false;
      // Leave persisted data intact; a retry can recover it.
      queueMicrotask(() => useCustomSplitDraftStore.setState({ hydrated: false, storageError: 'Couldn’t load your drafts. Try again before editing.' }));
    } else state?.setHydrated();
  },
}));
