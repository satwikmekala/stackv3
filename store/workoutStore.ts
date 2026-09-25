import { toLocalCalendarDate, parseSessionDate, getSessionLocalDate, getStartOfWeek } from '@/store/workoutCalendar';
import { Alert } from 'react-native';
import { create } from 'zustand';

import type { Archetype } from '@/constants/archetypes';
import {
  EMPTY_CUSTOM_WORKOUT_MESSAGE,
  EmptyCustomWorkoutError,
  type CustomSplit,
  type CustomSplitSummary,
} from '@/store/customSplits';

import {
  EXERCISE_SEEDS,
  SPLIT_TEMPLATE_SEEDS,
  type ExerciseCatalogItem,
  type CustomSplitDraftWorkoutInput,
  type CustomSplitWorkoutLabel,
  type SaveCustomSplitDraftOptions,
  addExerciseToWorkoutSync,
  addExerciseToSplitRecords,
  addWorkoutToSplitSync,
  appendCurrentBonusSet,
  appendCurrentSessionExercise,
  completeCurrentSession,
  createCustomExerciseSync,
  createCustomSplitSync,
  deleteCustomSplitSync,
  deleteWorkoutSync,
  deleteExercise as deleteExerciseRecord,
  discardCurrentSession,
  duplicateWorkoutSync,
  getCustomSplitDetailAsync,
  getCustomSplitsAsync,
  getNextCustomSplitNameAsync,
  hasExerciseHistory as hasExerciseHistoryRecord,
  logArchetypeCompletedRetroactively as persistRetroactiveArchetypeWorkout,
  moveExerciseInSplitRecords,
  moveWorkoutSync,
  readCompletedSessionsSync,
  readCustomSplitWorkoutLabelSync,
  readExerciseLoadTypeSync,
  readExerciseWorkoutTypeSync,
  readLastCompletedCustomWorkoutIdSync,
  readInitialWorkoutSnapshot,
  readLastExerciseSync,
  readLastWorkoutOfTypeSync,
  readMostOverdueTypeSync,
  readExercisesForWorkoutTypeSync,
  readPrimaryMusclesForWorkoutTypeSync,
  readProfileSync,
  readSplitTemplatesSync,
  removeExerciseFromSplitRecords,
  removeExerciseFromWorkoutSync,
  renameCustomSplitSync,
  saveCustomSplitDraftSync,
  updateCustomSplitDraftSync,
  renameWorkoutSync,
  renameExercise as renameExerciseRecord,
  replaceCurrentSession,
  replaceCurrentSessionExercise,
  resetWorkoutDatabase,
  startWorkoutFromArchetype as persistWorkoutFromArchetype,
  startWorkoutFromCustomWorkout as persistWorkoutFromCustomWorkout,
  setActiveSplitSync,
  updateCurrentSet,
  updateCurrentSets,
  readCurrentSetTarget,
  writeProfile,
} from '@/store/workoutDatabase';
import {
  createSessionExercise,
  makeDefaultExercise,
} from '@/store/workoutProgression';
import { getWeightIncrementKg, type WeightUnit } from '@/store/weightUnits';
import { getActiveSetIndex, getCurrentWorkoutExerciseIndex, getInitialExerciseIndex } from '@/utils/workoutResume';
import { projectSetToggle, getNextIncompleteExerciseIndex, isExerciseComplete, type WorkoutSetAction, type WorkoutSetActionResult, type WorkoutSetTarget } from '@/store/workoutSetActions';

export { toLocalCalendarDate, parseSessionDate, getSessionLocalDate, getStartOfWeek } from '@/store/workoutCalendar';

export type { ExerciseCatalogItem };
export type {
  CustomSplit,
  CustomSplitExercise,
  CustomSplitSummary,
  CustomSplitWorkout,
} from '@/store/customSplits';

export type WorkoutType = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core';
export type IntensityLevel = 'easy' | 'medium' | 'hard';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type BonusSetType = 'extra' | 'dropset' | 'pr';
export type ExerciseLoadType = 'external_weight' | 'bodyweight';

export interface Exercise {
  name: string;
  loadType: ExerciseLoadType;
  sets: ExerciseSet[];
}

export interface ExerciseSet {
  reps: number;
  weight: number;
  type?: BonusSetType;
  targetReps?: number;
  targetWeight?: number;
  completed?: boolean;
  skipped?: boolean;
}

export interface WorkoutSession {
  id: string;
  date: string;
  archetype: Archetype | null;
  secondaryArchetype: Archetype | null;
  archetypeVariant: string | null;
  secondaryArchetypeVariant: string | null;
  workoutTypes: WorkoutType[];
  exercises: Exercise[];
  intensity?: IntensityLevel;
  completed: boolean;
  retroactive: boolean;
  /** Set only for sessions started from a saved Custom Split workout. */
  customSplitId?: number | null;
  customSplitWorkoutId?: number | null;
}

export interface UserProfile {
  name: string;
  weeklyGoal: number;
  experienceLevel: ExperienceLevel;
  trainingDays: number[];
  onboardingCompleted: boolean;
  autoIncreaseWeight: boolean;
  weightIncrement: number;
  weightUnit: WeightUnit;
  weightIncrementLbs: number;
  activeSplitId: number | null;
}

// Kept only at the setProfile call boundary so the existing onboarding caller
// can pass its former dead counter without that value entering state or SQLite.
type UserProfileInput = UserProfile & { workoutsCompletedThisWeek?: number };

export type WorkoutFocus = { workoutId: string; exerciseIndex: number };

interface WorkoutStore {
  profile: UserProfile | null;
  sessions: WorkoutSession[];
  currentSession: WorkoutSession | null;
  // The workout screen's current selection, shared with read-only surfaces.
  // On process restart, the existing first-incomplete resume rule still applies.
  workoutFocus: WorkoutFocus | null;
  setWorkoutExerciseIndex: (exerciseIndex: number) => void;
  getActiveSetTarget: () => WorkoutSetTarget | null;
  applyActiveSetAction: (target: WorkoutSetTarget, action: WorkoutSetAction, expectedWeightStepKg?: number) => WorkoutSetActionResult;
  splitTemplates: Record<WorkoutType, Exercise[]>;
  customSplits: CustomSplitSummary[];
  currentCustomSplit: CustomSplit | null;
  isHydrated: boolean;
  hydrationError: string | null;

  setProfile: (profile: UserProfileInput) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;

  refreshCustomSplits: () => Promise<void>;
  loadCustomSplit: (splitId: number) => Promise<CustomSplit | null | undefined>;
  createSplit: (name?: string) => Promise<number | undefined>;
  renameSplit: (splitId: number, name: string) => Promise<void>;
  deleteSplit: (splitId: number) => Promise<void>;
  addWorkout: (splitId: number, name: string) => Promise<number | undefined>;
  renameWorkout: (workoutId: number, name: string) => Promise<void>;
  deleteWorkout: (workoutId: number) => Promise<void>;
  moveWorkout: (workoutId: number, toIndex: number) => Promise<void>;
  duplicateWorkout: (workoutId: number) => Promise<number | undefined>;
  addExerciseToWorkout: (
    workoutId: number,
    exerciseId: number
  ) => Promise<number | undefined>;
  removeExerciseFromWorkout: (workoutExerciseId: number) => Promise<void>;
  createCustomExercise: (
    name: string,
    workoutType: WorkoutType,
    primaryMuscle: string,
    equipment: string
  ) => number | undefined;
  setActiveSplit: (splitId: number | null) => void;
  saveCustomSplitDraft: (
    name: string,
    workouts: CustomSplitDraftWorkoutInput[],
    options?: SaveCustomSplitDraftOptions
  ) => Promise<number | undefined>;
  updateCustomSplitDraft: (
    splitId: number,
    name: string,
    workouts: CustomSplitDraftWorkoutInput[]
  ) => Promise<boolean>;

  startWorkout: (workoutTypes: WorkoutType[]) => void;
  startWorkoutFromArchetype: (archetypes: Archetype[]) => void;
  startWorkoutFromCustomWorkout: (splitId: number, workoutId: number) => boolean;
  logArchetypeCompletedRetroactively: (archetypes: Archetype[], date: string) => void;
  updateExerciseSet: (exerciseIndex: number, setIndex: number, reps: number, weight: number) => boolean | undefined;
  appendBonusSet: (
    exerciseIndex: number,
    type: BonusSetType,
    reps: number,
    weight: number
  ) => void;
  toggleSetCompleted: (exerciseIndex: number, setIndex: number) => boolean | undefined;
  toggleSetSkipped: (exerciseIndex: number, setIndex: number) => void;
  swapCurrentSessionExercise: (exerciseIndex: number, name: string) => void;
  appendExerciseToSession: (name: string) => void;
  completeWorkout: (intensity: IntensityLevel) => WorkoutSession | undefined;
  discardWorkout: () => void;

  addExerciseToSplit: (type: WorkoutType, name: string, primaryMuscle: string) => void;
  renameExercise: (id: number, newName: string) => void;
  hasExerciseHistory: (exerciseId: number) => boolean;
  deleteExercise: (exerciseId: number) => void;
  getExerciseWorkoutType: (name: string) => WorkoutType | undefined;
  getExercisesForWorkoutType: (type: WorkoutType) => ExerciseCatalogItem[];
  getPrimaryMusclesForWorkoutType: (type: WorkoutType) => string[];
  removeExerciseFromSplit: (type: WorkoutType, exerciseIndex: number) => void;
  moveExerciseInSplit: (type: WorkoutType, fromIndex: number, toIndex: number) => void;

  getLastCompletedCustomWorkoutId: (splitId: number) => number | null;
  getCustomWorkoutLabel: (workoutId: number) => CustomSplitWorkoutLabel | null;

  getNextWorkoutType: () => WorkoutType;
  getLastWorkoutOfType: (type: WorkoutType) => WorkoutSession | undefined;
  getWeeklyProgress: () => { completed: number; goal: number };
  getWeekStreak: () => { date: string; workouts: number }[];
  getWeeklyVolumeTrend: (weeks?: number) => { weekStart: string; volume: number }[];
  getRecentIntensity: (n?: number) => IntensityLevel[];

  resetAllData: () => void;
}

const WORKOUT_ROTATION: WorkoutType[] = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core'];

const cloneExercises = (exercises: Exercise[]): Exercise[] =>
  JSON.parse(JSON.stringify(exercises));

const renameExercises = (
  exercises: Exercise[],
  oldName: string,
  newName: string
): Exercise[] =>
  exercises.map((exercise) =>
    exercise.name === oldName ? { ...exercise, name: newName } : exercise
  );

const seedSplitTemplates = (): Record<WorkoutType, Exercise[]> => {
  const templates: Record<WorkoutType, Exercise[]> = {
    chest: [],
    back: [],
    shoulders: [],
    arms: [],
    legs: [],
    core: [],
  };

  for (const seed of SPLIT_TEMPLATE_SEEDS) {
    templates[seed.workoutType].push({
      name: seed.name,
      loadType:
        EXERCISE_SEEDS.find((exercise) => exercise.name === seed.name)?.loadType ??
        'external_weight',
      sets: Array.from({ length: 3 }, () => ({
        reps: seed.targetReps,
        weight: seed.targetWeight,
      })),
    });
  }
  return templates;
};

export const getWeekDates = (): string[] => {
  const dates: string[] = [];
  const start = getStartOfWeek(new Date());
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(toLocalCalendarDate(date));
  }
  return dates;
};

export const deriveDefaultSlots = (goal: number): number[] => {
  const slots: number[] = [];
  for (let i = 0; i < Math.min(goal, 7); i++) {
    slots.push(Math.round((i * 7) / goal));
  }
  return slots;
};

const normalizeProfile = (profile: UserProfileInput): UserProfile => ({
  name: profile.name,
  weeklyGoal: profile.weeklyGoal,
  experienceLevel: profile.experienceLevel,
  trainingDays: profile.trainingDays,
  onboardingCompleted: profile.onboardingCompleted,
  autoIncreaseWeight: profile.autoIncreaseWeight,
  weightIncrement: profile.weightIncrement,
  weightUnit: profile.weightUnit,
  weightIncrementLbs: profile.weightIncrementLbs,
  activeSplitId: profile.activeSplitId ?? null,
});

const runGuardedAction = <T>(actionName: string, action: () => T): T | undefined => {
  try {
    return action();
  } catch (error) {
    console.error(`[workoutStore] ${actionName} failed`, error);
    Alert.alert("Couldn't save", 'Something went wrong. Please try again.');
    return undefined;
  }
};

const runGuardedAsyncAction = async <T>(
  actionName: string,
  action: () => Promise<T>
): Promise<T | undefined> => {
  try {
    return await action();
  } catch (error) {
    console.error(`[workoutStore] ${actionName} failed`, error);
    Alert.alert("Couldn't save", 'Something went wrong. Please try again.');
    return undefined;
  }
};

const readCustomSplitState = async (
  currentSplitId: number | null
): Promise<{
  customSplits: CustomSplitSummary[];
  currentCustomSplit: CustomSplit | null;
}> => {
  const [customSplits, currentCustomSplit] = await Promise.all([
    getCustomSplitsAsync(),
    currentSplitId === null
      ? Promise.resolve(null)
      : getCustomSplitDetailAsync(currentSplitId),
  ]);
  return { customSplits, currentCustomSplit };
};

const customSplitStateEqual = (left: unknown, right: unknown): boolean =>
  left === right || JSON.stringify(left) === JSON.stringify(right);

export const useWorkoutStore = create<WorkoutStore>()((set, get) => ({
  profile: null,
  sessions: [],
  currentSession: null,
  workoutFocus: null,
  getActiveSetTarget: () => {
    const { currentSession, workoutFocus } = get();
    if (!currentSession || currentSession.completed) return null;
    const exerciseIndex = getCurrentWorkoutExerciseIndex(currentSession, workoutFocus);
    const exercise = currentSession.exercises[exerciseIndex];
    if (!exercise?.sets.length) return null;
    const setIndex = getActiveSetIndex(exercise);
    if (exercise.sets[setIndex].completed) return null;
    try {
      const target = readCurrentSetTarget(exerciseIndex, setIndex);
      return target?.workoutId === currentSession.id && target.workoutStartedAt === currentSession.date &&
        target.exerciseName === exercise.name ? target : null;
    } catch {
      // Identification failure is a no-op, including a database unavailable
      // during recovery. No caller may guess a row from its position.
      return null;
    }
  },
  applyActiveSetAction: (target, action, expectedWeightStepKg) => {
    const state = get();
    if (!state.isHydrated || state.hydrationError || !state.profile) return { status: 'unavailable' };
    return runGuardedAction('applyActiveSetAction', (): WorkoutSetActionResult => {
      const active = get().getActiveSetTarget();
      if (!active || Object.keys(active).some((key) => active[key as keyof WorkoutSetTarget] !== target[key as keyof WorkoutSetTarget])) {
        return { status: 'stale' };
      }
      const { exerciseIndex, setIndex } = active;
      const exercise = get().currentSession!.exercises[exerciseIndex];
      const currentSet = exercise.sets[setIndex];
      if (action === 'completeSet') {
        // Never toggle a completed set back off. Every caller supplies the set it
        // displayed, so a second Done cannot accidentally complete the next one.
        if (!get().toggleSetCompleted(exerciseIndex, setIndex)) return { status: 'failed' };
        const exercises = get().currentSession!.exercises;
        const completedExercise = isExerciseComplete(exercises[exerciseIndex]);
        const next = getNextIncompleteExerciseIndex(exercises, exerciseIndex);
        if (completedExercise && next !== -1) get().setWorkoutExerciseIndex(next);
        return { status: 'applied', completedExercise, needsFeedback: completedExercise && next === -1 };
      }
      let { reps, weight } = currentSet;
      if (action === 'increaseReps') reps += 1;
      else if (action === 'decreaseReps') reps -= 1;
      else if (action === 'increaseWeight' || action === 'decreaseWeight') {
        if (exercise.loadType === 'bodyweight') return { status: 'unavailable' };
        const step = getWeightIncrementKg(state.profile!);
        if (expectedWeightStepKg !== undefined && expectedWeightStepKg !== step) return { status: 'stale' };
        weight += (action === 'increaseWeight' ? 1 : -1) * step;
      } else return { status: 'unavailable' };
      return { status: get().updateExerciseSet(exerciseIndex, setIndex, reps, weight) ? 'applied' : 'failed' };
    }) ?? { status: 'failed' };
  },
  setWorkoutExerciseIndex: (exerciseIndex) => {
    const { currentSession, workoutFocus } = get();
    if (!currentSession || !Number.isInteger(exerciseIndex) || !currentSession.exercises[exerciseIndex]) return;
    if (workoutFocus?.workoutId === currentSession.id && workoutFocus.exerciseIndex === exerciseIndex) return;
    set({ workoutFocus: { workoutId: currentSession.id, exerciseIndex } });
  },
  splitTemplates: seedSplitTemplates(),
  customSplits: [],
  currentCustomSplit: null,
  isHydrated: false,
  hydrationError: null,

  setProfile: (profile) => runGuardedAction('setProfile', () => {
    const nextProfile = normalizeProfile(profile);
    writeProfile(nextProfile);
    set({ profile: nextProfile });
  }),

  updateProfile: (updates) => runGuardedAction('updateProfile', () => {
    const profile = get().profile;
    if (!profile) return;
    const nextProfile = { ...profile, ...updates };
    writeProfile(nextProfile);
    set({ profile: nextProfile });
  }),

  refreshCustomSplits: async () => {
    await runGuardedAsyncAction('refreshCustomSplits', async () => {
      const requestedActiveSplitId = get().profile?.activeSplitId ?? null;
      const refreshed = await readCustomSplitState(requestedActiveSplitId);
      const state = get();
      const customSplits = customSplitStateEqual(state.customSplits, refreshed.customSplits)
        ? state.customSplits
        : refreshed.customSplits;
      // A rapid activation can finish while the focus read is in flight. Never
      // let that stale read replace the newly requested program's detail.
      const refreshedDetail = state.profile?.activeSplitId === requestedActiveSplitId
        ? refreshed.currentCustomSplit
        : state.currentCustomSplit;
      const currentCustomSplit = customSplitStateEqual(
        state.currentCustomSplit,
        refreshedDetail
      )
        ? state.currentCustomSplit
        : refreshedDetail;

      if (
        customSplits !== state.customSplits ||
        currentCustomSplit !== state.currentCustomSplit
      ) {
        set({ customSplits, currentCustomSplit });
      }
    });
  },

  loadCustomSplit: (splitId) =>
    runGuardedAsyncAction('loadCustomSplit', async () => {
      const currentCustomSplit = await getCustomSplitDetailAsync(splitId);
      const state = get();
      if (!customSplitStateEqual(state.currentCustomSplit, currentCustomSplit)) {
        set({ currentCustomSplit });
      }
      return currentCustomSplit;
    }),

  createSplit: (name) =>
    runGuardedAsyncAction('createSplit', async () => {
      const splitName = name ?? (await getNextCustomSplitNameAsync());
      const splitId = createCustomSplitSync(splitName);
      set(await readCustomSplitState(splitId));
      return splitId;
    }),

  renameSplit: async (splitId, name) => {
    await runGuardedAsyncAction('renameSplit', async () => {
      renameCustomSplitSync(splitId, name);
      const currentSplitId = get().currentCustomSplit?.id ?? null;
      set(await readCustomSplitState(currentSplitId));
    });
  },

  deleteSplit: async (splitId) => {
    await runGuardedAsyncAction('deleteSplit', async () => {
      deleteCustomSplitSync(splitId);
      const currentSplitId = get().currentCustomSplit?.id === splitId
        ? null
        : get().currentCustomSplit?.id ?? null;
      const customSplitState = await readCustomSplitState(currentSplitId);
      set({ ...customSplitState, profile: readProfileSync() });
    });
  },

  addWorkout: (splitId, name) =>
    runGuardedAsyncAction('addWorkout', async () => {
      const workoutId = addWorkoutToSplitSync(splitId, name);
      set(await readCustomSplitState(splitId));
      return workoutId;
    }),

  renameWorkout: async (workoutId, name) => {
    await runGuardedAsyncAction('renameWorkout', async () => {
      renameWorkoutSync(workoutId, name);
      const currentSplitId = get().currentCustomSplit?.id ?? null;
      set(await readCustomSplitState(currentSplitId));
    });
  },

  deleteWorkout: async (workoutId) => {
    await runGuardedAsyncAction('deleteWorkout', async () => {
      deleteWorkoutSync(workoutId);
      const currentSplitId = get().currentCustomSplit?.id ?? null;
      set(await readCustomSplitState(currentSplitId));
    });
  },

  moveWorkout: async (workoutId, toIndex) => {
    await runGuardedAsyncAction('moveWorkout', async () => {
      moveWorkoutSync(workoutId, toIndex);
      const currentSplitId = get().currentCustomSplit?.id ?? null;
      set(await readCustomSplitState(currentSplitId));
    });
  },

  duplicateWorkout: (workoutId) =>
    runGuardedAsyncAction('duplicateWorkout', async () => {
      const duplicateId = duplicateWorkoutSync(workoutId);
      const currentSplitId = get().currentCustomSplit?.id ?? null;
      set(await readCustomSplitState(currentSplitId));
      return duplicateId;
    }),

  addExerciseToWorkout: (workoutId, exerciseId) =>
    runGuardedAsyncAction('addExerciseToWorkout', async () => {
      const workoutExerciseId = addExerciseToWorkoutSync(workoutId, exerciseId);
      const currentSplitId = get().currentCustomSplit?.id ?? null;
      set(await readCustomSplitState(currentSplitId));
      return workoutExerciseId;
    }),

  removeExerciseFromWorkout: async (workoutExerciseId) => {
    await runGuardedAsyncAction('removeExerciseFromWorkout', async () => {
      removeExerciseFromWorkoutSync(workoutExerciseId);
      const currentSplitId = get().currentCustomSplit?.id ?? null;
      set(await readCustomSplitState(currentSplitId));
    });
  },

  createCustomExercise: (name, workoutType, primaryMuscle, equipment) =>
    runGuardedAction('createCustomExercise', () =>
      createCustomExerciseSync(name, workoutType, primaryMuscle, equipment)
    ),

  setActiveSplit: (splitId) => runGuardedAction('setActiveSplit', () => {
    setActiveSplitSync(splitId);
    set({ profile: readProfileSync() });
  }),

  saveCustomSplitDraft: (name, workouts, options) =>
    runGuardedAsyncAction('saveCustomSplitDraft', async () => {
      const splitId = saveCustomSplitDraftSync(name, workouts, options);
      const customSplitState = await readCustomSplitState(splitId);
      set({ ...customSplitState, profile: readProfileSync() });
      return splitId;
    }),

  updateCustomSplitDraft: async (splitId, name, workouts) => {
    const result = await runGuardedAsyncAction(
      'updateCustomSplitDraft',
      async () => {
        updateCustomSplitDraftSync(splitId, name, workouts);
        // Activation is untouched by the update, so the profile only needs
        // re-reading to stay in step with any concurrent write.
        const customSplitState = await readCustomSplitState(
          get().currentCustomSplit?.id ?? null
        );
        set({ ...customSplitState, profile: readProfileSync() });
        return true;
      }
    );
    return result === true;
  },

  startWorkout: (workoutTypes) => {
    const type = workoutTypes[0];
    if (!type || workoutTypes.length > 2 || new Set(workoutTypes).size !== workoutTypes.length) {
      throw new Error('A workout session must have one or two distinct workout types');
    }
    const template = readSplitTemplatesSync()[type];
    const lastWorkout = readLastWorkoutOfTypeSync(type);
    const profile = readProfileSync();
    if (!profile) throw new Error('A profile is required to start a workout');
    const exercises = template.map((templateExercise) =>
      createSessionExercise(
        templateExercise,
        lastWorkout?.exercises.find((exercise) => exercise.name === templateExercise.name),
        profile
      )
    );
    const newSession = replaceCurrentSession({
      // SQLite assigns the AUTOINCREMENT key; it is mapped back to the existing
      // public string ID shape before state is published.
      id: '',
      date: new Date().toISOString(),
      archetype: null,
      secondaryArchetype: null,
      archetypeVariant: null,
      secondaryArchetypeVariant: null,
      workoutTypes: [...workoutTypes],
      exercises,
      completed: false,
      retroactive: false,
    });
    set({ currentSession: newSession, workoutFocus: { workoutId: newSession.id, exerciseIndex: getInitialExerciseIndex(newSession.exercises) } });
  },

  startWorkoutFromArchetype: (archetypes) => runGuardedAction('startWorkoutFromArchetype', () => {
    const newSession = persistWorkoutFromArchetype(archetypes);
    set({ currentSession: newSession, workoutFocus: { workoutId: newSession.id, exerciseIndex: getInitialExerciseIndex(newSession.exercises) } });
  }),

  startWorkoutFromCustomWorkout: (splitId, workoutId) =>
    runGuardedAction('startWorkoutFromCustomWorkout', () => {
      try {
        const newSession = persistWorkoutFromCustomWorkout(splitId, workoutId);
        set({ currentSession: newSession, workoutFocus: { workoutId: newSession.id, exerciseIndex: getInitialExerciseIndex(newSession.exercises) } });
        return true;
      } catch (error) {
        if (!(error instanceof EmptyCustomWorkoutError)) throw error;
        Alert.alert('This workout is empty', EMPTY_CUSTOM_WORKOUT_MESSAGE);
        return false;
      }
    }) === true,

  logArchetypeCompletedRetroactively: (archetypes, date) =>
    runGuardedAction('logArchetypeCompletedRetroactively', () => {
      const completedSession = persistRetroactiveArchetypeWorkout(archetypes, date);
      set({ sessions: [...get().sessions, completedSession] });
    }),

  updateExerciseSet: (exerciseIndex, setIndex, reps, weight) => runGuardedAction('updateExerciseSet', () => {
    const session = get().currentSession;
    if (!session) return;
    const exercises = cloneExercises(session.exercises);
    const target = exercises[exerciseIndex].sets[setIndex];
    if (!target || !Number.isFinite(reps) || !Number.isInteger(reps) || !Number.isFinite(weight)) return false;
    const updated = {
      ...target,
      reps: Math.max(1, reps),
      weight: exercises[exerciseIndex].loadType === 'bodyweight' ? 0 : Math.max(0, weight),
    };
    updateCurrentSet(exerciseIndex, setIndex, updated);
    exercises[exerciseIndex].sets[setIndex] = updated;
    set({ currentSession: { ...session, exercises } });
    return true;
  }),

  appendBonusSet: (exerciseIndex, type, reps, weight) => runGuardedAction('appendBonusSet', () => {
    const session = get().currentSession;
    if (!session) return;
    const exercises = cloneExercises(session.exercises);
    const exercise = exercises[exerciseIndex];
    if (!exercise) return;

    const storedWeight = exercise.loadType === 'bodyweight' ? 0 : weight;
    appendCurrentBonusSet(exerciseIndex, type, reps, storedWeight);
    exercise.sets.push({ type, reps, weight: storedWeight, completed: true, skipped: false });
    set({ currentSession: { ...session, exercises } });
  }),

  toggleSetCompleted: (exerciseIndex, setIndex) => runGuardedAction('toggleSetCompleted', () => {
    const session = get().currentSession;
    if (!session) return;
    const { exercises, updates } = projectSetToggle(session.exercises, exerciseIndex, setIndex, get().profile);
    updateCurrentSets(exerciseIndex, updates);
    set({ currentSession: { ...session, exercises } });
    return true;
  }),

  toggleSetSkipped: (exerciseIndex, setIndex) => runGuardedAction('toggleSetSkipped', () => {
    const session = get().currentSession;
    if (!session) return;
    const exercises = cloneExercises(session.exercises);
    const target = exercises[exerciseIndex].sets[setIndex];
    const updated = target.skipped
      ? { ...target, completed: false, skipped: false }
      : {
          ...target,
          completed: true,
          skipped: true,
          reps: target.targetReps ?? target.reps,
          weight: exercises[exerciseIndex].loadType === 'bodyweight'
            ? 0
            : target.targetWeight ?? target.weight,
        };

    updateCurrentSet(exerciseIndex, setIndex, updated);
    exercises[exerciseIndex].sets[setIndex] = updated;
    set({ currentSession: { ...session, exercises } });
  }),

  swapCurrentSessionExercise: (exerciseIndex, name) => runGuardedAction('swapCurrentSessionExercise', () => {
    const session = get().currentSession;
    const outgoingExercise = session?.exercises[exerciseIndex];
    const type = outgoingExercise
      ? readExerciseWorkoutTypeSync(outgoingExercise.name)
      : undefined;
    if (
      !session ||
      !type ||
      exerciseIndex < 0 ||
      exerciseIndex >= session.exercises.length ||
      readExerciseWorkoutTypeSync(name) !== type ||
      session.exercises.some(
        (exercise, index) => index !== exerciseIndex && exercise.name === name
      )
    ) {
      return;
    }
    if (session.exercises[exerciseIndex].name === name) return;

    const lastExercise = readLastExerciseSync(type, name);
    const templateExercise =
      readSplitTemplatesSync()[type].find((exercise) => exercise.name === name) ??
      lastExercise ??
      makeDefaultExercise(name, readExerciseLoadTypeSync(name));
    const profile = readProfileSync();
    if (!profile) throw new Error('A profile is required to swap an exercise');
    const replacement = createSessionExercise(
      { ...templateExercise, name },
      lastExercise,
      profile
    );

    replaceCurrentSessionExercise(exerciseIndex, replacement);
    const exercises = [...session.exercises];
    exercises[exerciseIndex] = replacement;
    set({ currentSession: { ...session, exercises } });
  }),

  appendExerciseToSession: (name) => runGuardedAction('appendExerciseToSession', () => {
    const session = get().currentSession;
    const type = readExerciseWorkoutTypeSync(name);
    if (!session || !type) return;
    if (session.exercises.some((exercise) => exercise.name === name)) return;

    const lastExercise = readLastExerciseSync(type, name);
    const templateExercise =
      readSplitTemplatesSync()[type].find((exercise) => exercise.name === name) ??
      lastExercise ??
      makeDefaultExercise(name, readExerciseLoadTypeSync(name));
    const profile = readProfileSync();
    if (!profile) throw new Error('A profile is required to append an exercise');
    const newExercise = createSessionExercise(
      { ...templateExercise, name },
      lastExercise,
      profile
    );

    appendCurrentSessionExercise(newExercise);
    set({
      currentSession: {
        ...session,
        workoutTypes: session.workoutTypes.includes(type)
          ? session.workoutTypes
          : [...session.workoutTypes, type],
        exercises: [...session.exercises, newExercise],
      },
    });
  }),

  completeWorkout: (intensity) => runGuardedAction('completeWorkout', () => {
    const session = get().currentSession;
    if (!session) return undefined;
    completeCurrentSession(intensity);
    const completedSession = {
      ...session,
      workoutTypes: [...session.workoutTypes],
      intensity,
      completed: true,
    };
    set({
      sessions: [...get().sessions, completedSession],
      currentSession: null,
      workoutFocus: null,
    });
    return completedSession;
  }),

  discardWorkout: () => runGuardedAction('discardWorkout', () => {
    discardCurrentSession();
    set({ currentSession: null, workoutFocus: null });
  }),

  addExerciseToSplit: (type, name, primaryMuscle) => {
    addExerciseToSplitRecords(type, name, primaryMuscle);
    const state = get();
    const splitTemplates = {
      ...state.splitTemplates,
      [type]: [...state.splitTemplates[type], makeDefaultExercise(name)],
    };
    set({ splitTemplates });
  },

  renameExercise: (id, newName) => {
    const { oldName, newName: normalizedName } = renameExerciseRecord(id, newName);
    if (oldName === normalizedName) return;

    const state = get();
    const splitTemplates = Object.fromEntries(
      Object.entries(state.splitTemplates).map(([type, exercises]) => [
        type,
        renameExercises(exercises, oldName, normalizedName),
      ])
    ) as Record<WorkoutType, Exercise[]>;
    const sessions = state.sessions.map((session) => ({
      ...session,
      exercises: renameExercises(session.exercises, oldName, normalizedName),
    }));
    const currentSession = state.currentSession
      ? {
          ...state.currentSession,
          exercises: renameExercises(
            state.currentSession.exercises,
            oldName,
            normalizedName
          ),
        }
      : null;

    set({ splitTemplates, sessions, currentSession });
  },

  hasExerciseHistory: (exerciseId) => hasExerciseHistoryRecord(exerciseId),

  deleteExercise: (exerciseId) => {
    const catalogExercise = WORKOUT_ROTATION
      .flatMap((type) => readExercisesForWorkoutTypeSync(type))
      .find((item) => item.id === exerciseId);
    deleteExerciseRecord(exerciseId);
    const state = get();
    const deletedName = catalogExercise?.name;
    const splitTemplates = deletedName
      ? Object.fromEntries(
          Object.entries(state.splitTemplates).map(([type, exercises]) => [
            type,
            exercises.filter((item) => item.name !== deletedName),
          ])
        ) as Record<WorkoutType, Exercise[]>
      : state.splitTemplates;
    set({ splitTemplates });
  },

  getExercisesForWorkoutType: (type) => readExercisesForWorkoutTypeSync(type),

  getExerciseWorkoutType: (name) => readExerciseWorkoutTypeSync(name),

  getPrimaryMusclesForWorkoutType: (type) =>
    readPrimaryMusclesForWorkoutTypeSync(type),

  removeExerciseFromSplit: (type, exerciseIndex) => {
    const state = get();
    if (state.splitTemplates[type].length <= 1) return;
    removeExerciseFromSplitRecords(type, exerciseIndex);
    const splitTemplates = {
      ...state.splitTemplates,
      [type]: state.splitTemplates[type].filter((_, index) => index !== exerciseIndex),
    };
    const currentSession =
      state.currentSession?.workoutTypes.includes(type)
        ? {
            ...state.currentSession,
            exercises: state.currentSession.exercises.filter(
              (_, index) => index !== exerciseIndex
            ),
          }
        : state.currentSession;
    set({ splitTemplates, currentSession });
  },

  moveExerciseInSplit: (type, fromIndex, toIndex) => {
    const state = get();
    const templateList = [...state.splitTemplates[type]];
    if (
      toIndex < 0 ||
      toIndex >= templateList.length ||
      fromIndex < 0 ||
      fromIndex >= templateList.length
    ) {
      return;
    }

    moveExerciseInSplitRecords(type, fromIndex, toIndex);
    const [moved] = templateList.splice(fromIndex, 1);
    templateList.splice(toIndex, 0, moved);
    const splitTemplates = { ...state.splitTemplates, [type]: templateList };

    let currentSession = state.currentSession;
    if (currentSession?.workoutTypes.includes(type)) {
      const sessionList = [...currentSession.exercises];
      const [movedSession] = sessionList.splice(fromIndex, 1);
      sessionList.splice(toIndex, 0, movedSession);
      currentSession = { ...currentSession, exercises: sessionList };
    }
    set({ splitTemplates, currentSession });
  },

  // Rotation state for Custom Splits lives in completed session history, so
  // both getters read straight through to SQLite rather than mirroring a
  // cursor in memory.
  getLastCompletedCustomWorkoutId: (splitId) =>
    readLastCompletedCustomWorkoutIdSync(splitId),

  getCustomWorkoutLabel: (workoutId) => readCustomSplitWorkoutLabelSync(workoutId),

  getNextWorkoutType: () => {
    return readMostOverdueTypeSync();
  },

  getLastWorkoutOfType: (type) => readLastWorkoutOfTypeSync(type),

  getWeeklyProgress: () => {
    const profile = readProfileSync();
    if (!profile) return { completed: 0, goal: 3 };
    const weekDates = getWeekDates();
    const sessionsThisWeek = readCompletedSessionsSync().filter((session) =>
      weekDates.includes(getSessionLocalDate(session.date))
    );
    return { completed: sessionsThisWeek.length, goal: profile.weeklyGoal };
  },

  getWeekStreak: () => {
    const weekDates = getWeekDates();
    const sessions = readCompletedSessionsSync();
    return weekDates.map((date) => ({
      date,
      workouts: sessions.filter((session) => getSessionLocalDate(session.date) === date).length,
    }));
  },

  getWeeklyVolumeTrend: (weeks = 8) => {
    const volumeByWeek = new Map<string, number>();
    for (const session of readCompletedSessionsSync()) {
      let volume = 0;
      for (const exercise of session.exercises) {
        for (const exerciseSet of exercise.sets) {
          if (exerciseSet.completed) volume += exerciseSet.reps * exerciseSet.weight;
        }
      }
      const weekStart = toLocalCalendarDate(
        getStartOfWeek(parseSessionDate(session.date))
      );
      volumeByWeek.set(weekStart, (volumeByWeek.get(weekStart) ?? 0) + volume);
    }

    const currentWeekStart = getStartOfWeek(new Date());
    const trend: { weekStart: string; volume: number }[] = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const start = new Date(currentWeekStart);
      start.setDate(currentWeekStart.getDate() - i * 7);
      const weekStart = toLocalCalendarDate(start);
      trend.push({ weekStart, volume: volumeByWeek.get(weekStart) ?? 0 });
    }
    return trend;
  },

  getRecentIntensity: (n = 5) =>
    readCompletedSessionsSync()
      .filter((session) => session.intensity)
      .sort((a, b) => parseSessionDate(a.date).getTime() - parseSessionDate(b.date).getTime())
      .slice(-n)
      .map((session) => session.intensity as IntensityLevel),

  resetAllData: () => runGuardedAction('resetAllData', () => {
    const snapshot = resetWorkoutDatabase();
    set({
      ...snapshot,
      workoutFocus: null,
      currentCustomSplit: null,
      isHydrated: true,
      hydrationError: null,
    });
  }),
}));

let initializationPromise: Promise<void> | null = null;

export const initializeWorkoutStore = (): Promise<void> => {
  if (useWorkoutStore.getState().isHydrated) return Promise.resolve();
  if (initializationPromise) return initializationPromise;

  initializationPromise = readInitialWorkoutSnapshot()
    .then((snapshot) => {
      useWorkoutStore.setState({
        ...snapshot,
        workoutFocus: snapshot.currentSession
          ? { workoutId: snapshot.currentSession.id, exerciseIndex: getInitialExerciseIndex(snapshot.currentSession.exercises) }
          : null,
        isHydrated: true,
        hydrationError: null,
      });
    })
    .catch((error) => {
      initializationPromise = null;
      useWorkoutStore.setState({
        hydrationError: error instanceof Error ? error.message : String(error),
      });
      throw error;
    });

  return initializationPromise;
};

// Keep the normalized catalog honest during development without changing the
// runtime pool contract. This expression is tree-shakeable and has no I/O.
if (__DEV__) {
  const uniqueSeedNames = new Set(EXERCISE_SEEDS.map((exercise) => exercise.name));
  if (uniqueSeedNames.size !== 159 || SPLIT_TEMPLATE_SEEDS.length !== 24) {
    throw new Error('Workout seed data must contain 159 exercises and 24 templates');
  }
}
