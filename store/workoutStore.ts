import { saveActionErrorCopy } from '@/utils/content';
import { toLocalCalendarDate, parseSessionDate, getSessionLocalDate, getStartOfWeek } from '@/store/workoutCalendar';
import { Alert } from 'react-native';
import { getProgramFrequency, weeklyTrainingProgress } from '@/store/trainingPreferences';
import { create } from 'zustand';

import type { Archetype } from '@/constants/archetypes';
import {
  DURATION_STEP_S,
  clampDuration,
  isDurationExercise,
  isValidDuration,
  type ExerciseMetric,
} from '@/store/exerciseMeasurement';
import {
  EMPTY_CUSTOM_WORKOUT_MESSAGE,
  EmptyCustomWorkoutError,
  type CustomSplit,
  type CustomSplitSummary,
} from '@/store/customSplits';

import {
  addExerciseNoteSync,
  deleteExerciseNoteSync,
  readSessionByIdSync,
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
  writeProfileReplacingStackPlanSync,
  deleteWorkoutSync,
  deleteExercise as deleteExerciseRecord,
  discardCurrentSession,
  duplicateWorkoutSync,
  getCustomSplitDetailAsync,
  getCustomSplitsAsync,
  getNextCustomSplitNameAsync,
  hasExerciseHistory as hasExerciseHistoryRecord,
  logArchetypeCompletedRetroactively as persistRetroactiveArchetypeWorkout,
  moveWorkoutSync,
  readCompletedSessionsSync,
  readCustomSplitWorkoutLabelSync,
  readExerciseMeasurementSync,
  readExerciseWorkoutTypeSync,
  readLastCompletedCustomWorkoutIdSync,
  readInitialWorkoutSnapshot,
  readLastExerciseHistorySync,
  readLastWorkoutOfTypeSync,
  readMostOverdueTypeSync,
  readExercisesForWorkoutTypeSync,
  readPrimaryMusclesForWorkoutTypeSync,
  readProfileSync,
  readSplitTemplatesSync,
  removeExerciseFromWorkoutSync,
  renameCustomSplitSync,
  saveCustomSplitDraftSync,
  saveAdhocRoutineSync,
  updateCustomSplitDraftSync,
  renameWorkoutSync,
  renameExercise as renameExerciseRecord,
  replaceCurrentSession,
  replaceCurrentSessionExercise,
  resetWorkoutDatabase,
  startEmptyWorkout as persistEmptyWorkout,
  startWorkoutFromArchetype as persistWorkoutFromArchetype,
  startWorkoutFromCustomWorkout as persistWorkoutFromCustomWorkout,
  setActiveSplitSync,
  chooseNoProgramSync,
  updateCurrentSet,
  updateCurrentSets,
  readCurrentSetTarget,
  readCurrentWorkoutFocusSync,
  writeCurrentWorkoutFocus,
  writeExerciseEntryUnit,
  writeProfile,
} from '@/store/workoutDatabase';
import {
  createSessionExercise,
  makeDefaultExercise,
} from '@/store/workoutProgression';
import { getWeightIncrementKg, type WeightUnit } from '@/store/weightUnits';
import { getActiveSetIndex, getCurrentWorkoutExerciseIndex } from '@/utils/workoutResume';
import { resolveProgramPreferences, type ProgramPreferences, type ThreeDayStructure } from '@/store/programPreferences';
import { validateProgram } from '@/features/program/lineup';
import { projectSetToggle, getNextIncompleteExerciseIndex, isExerciseComplete, type WorkoutSetAction, type WorkoutSetActionResult, type WorkoutSetTarget, type WorkoutSetEditTarget, type WorkoutSetValueAction, sameSetTarget } from '@/store/workoutSetActions';

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
export type { ExerciseMetric };

export interface Exercise {
  name: string;
  /** Is external load recorded? Independent of `metric`. */
  loadType: ExerciseLoadType;
  /** The repeated set measure. Duration sets never carry meaningful reps. */
  metric: ExerciseMetric;
  sets: ExerciseSet[];
}

/**
 * Logging choices belong to this workout occurrence, never the catalog.
 * `loadType`/`metric` are snapshotted when the exercise enters the session, so
 * history keeps its meaning even if the catalog row changes later.
 */
export interface SessionExercise extends Exercise {
  /** Stable catalog identity, distinct from a session exercise/set target ID. */
  exerciseId?: number;
  notes?: import('@/store/exerciseNotes').ExerciseNote[];
  entryUnit: WeightUnit;
}

export type SetValueOrigin = 'template' | 'history' | 'propagated' | 'user';

export interface ExerciseSet {
  /** Original imported kind; warmups never seed working sets or records. */
  sourceKind?: string;
  /** Explicit edits protect the whole set from automatic propagation. */
  valueOrigin?: SetValueOrigin;
  /** Rep-metric sets only. Duration sets store a neutral 0 here. */
  reps: number;
  weight: number;
  /** Duration-metric sets only: canonical integer seconds. */
  durationS?: number;
  type?: BonusSetType;
  targetReps?: number;
  targetWeight?: number;
  targetDurationS?: number;
  completed?: boolean;
  skipped?: boolean;
}

export type SessionOrigin = 'archetype' | 'custom' | 'adhoc' | 'legacy';

export interface WorkoutSession {
  /** Full whitelisted source facts. Unsupported measurements remain readable in history. */
  imported?: import('@/features/import/persistence').ImportedWorkoutFacts;
  origin: SessionOrigin;
  id: string;
  date: string;
  archetype: Archetype | null;
  secondaryArchetype: Archetype | null;
  archetypeVariant: string | null;
  secondaryArchetypeVariant: string | null;
  workoutTypes: WorkoutType[];
  exercises: SessionExercise[];
  /** Elapsed duration ends here; unknown historical/retroactive times stay null. */
  completedAt: string | null;
  intensity?: IntensityLevel;
  completed: boolean;
  retroactive: boolean;
  /** Set only for sessions started from a saved Custom Split workout. */
  customSplitId?: number | null;
  customSplitWorkoutId?: number | null;
}

export interface UserProfile extends ProgramPreferences {
  name: string;
  weeklyGoal: number;
  /** Independent automatic-program frequency. Legacy profiles inherit their old goal once. */
  programWeeklyGoal?: number;
  experienceLevel: ExperienceLevel;
  trainingDays: number[];
  remindersEnabled: boolean;
  reminderTime: string;
  onboardingCompleted: boolean;
  autoIncreaseWeight: boolean;
  weightIncrement: number;
  weightUnit: WeightUnit;
  weightIncrementLbs: number;
  activeSplitId: number | null;
}

// Kept only at the setProfile call boundary so the existing onboarding caller
// can pass its former dead counter without that value entering state or SQLite.
type UserProfileInput = Omit<UserProfile, keyof ProgramPreferences> & Partial<ProgramPreferences> & { workoutsCompletedThisWeek?: number };

/** Inactive automatic defaults are preferences, never a program acceptance. */
export const createNoProgramProfile = (): UserProfile => ({
  name: '', weeklyGoal: 0, programWeeklyGoal: 3, experienceLevel: 'intermediate',
  trainingDays: [], remindersEnabled: false, reminderTime: '18:00', onboardingCompleted: false, autoIncreaseWeight: false,
  weightIncrement: 0.5, weightUnit: 'kg', weightIncrementLbs: 5,
  activeSplitId: null, programMode: 'none', threeDayStructure: 'full-body',
  weightUnitConfirmed: false,
});

export type WorkoutFocus = { workoutId: string; exerciseIndex: number; exerciseId?: string };

interface WorkoutStore {
  profile: UserProfile | null;
  sessions: WorkoutSession[];
  currentSession: WorkoutSession | null;
  // Persisted current exercise for progression and Live Activity.
  // Set inspection is ephemeral and never changes this focus.
  workoutFocus: WorkoutFocus | null;
  selectedSet: WorkoutSetEditTarget | null;
  selectWorkoutSet: (exerciseIndex: number, setIndex: number) => void;
  clearSelectedSet: () => void;
  getSetEditTarget: () => WorkoutSetEditTarget | null;
  applySetValueAction: (target: WorkoutSetEditTarget, action: WorkoutSetValueAction, value?: number, expectedWeightStepKg?: number) => WorkoutSetActionResult;
  setWorkoutExerciseIndex: (exerciseIndex: number) => void;
  setExerciseEntryUnit: (target: WorkoutSetTarget, unit: WeightUnit) => WorkoutSetActionResult;
  getActiveSetTarget: () => WorkoutSetTarget | null;
  /**
   * `advanceFocus` (default true) moves focus to the next incomplete exercise when this set finishes
   * the exercise. The Live Activity relies on it; the app passes false so its wrap-up can review
   * the sets and offer another one first.
   */
  applyActiveSetAction: (target: WorkoutSetTarget, action: WorkoutSetAction, expectedWeightStepKg?: number,
    options?: { advanceFocus?: boolean }) => WorkoutSetActionResult;
  splitTemplates: Record<WorkoutType, Exercise[]>;
  customSplits: CustomSplitSummary[];
  currentCustomSplit: CustomSplit | null;
  isHydrated: boolean;
  hydrationError: string | null;

  addExerciseNote: (workoutId: string, exerciseId: number, text: string) => void;
  deleteExerciseNote: (exerciseId: number, noteId: number) => void;
  setProfile: (profile: UserProfileInput) => void;
  prepareTrainingOnboarding: (name: string, frequency: number, experience: ExperienceLevel) => UserProfile;
  completeTrainingOnboarding: () => UserProfile;
  completeNoProgramOnboarding: (name?: string, weightUnit?: 'kg' | 'lbs') => UserProfile;
  confirmWorkoutWeightUnit: (unit: 'kg' | 'lbs') => UserProfile;
  acceptStackProgram: (frequency: number, structure: ThreeDayStructure, context: 'onboarding' | 'configuration', name?: string) => UserProfile;
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
    equipment: string | null,
    loadType?: ExerciseLoadType,
    metric?: ExerciseMetric
  ) => number | undefined;
  activateSharedRoutine: (splitId: number) => UserProfile;
  setActiveSplit: (splitId: number | null) => void;
  chooseNoProgram: () => void;
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

  savedAdhocRoutineIds: Record<string, number>;
  saveAdhocRoutine: (sessionId: string, name: string) => number | undefined;
  startEmptyWorkout: () => boolean;
  startWorkout: (workoutTypes: WorkoutType[]) => void;
  startWorkoutFromArchetype: (archetypes: Archetype[], variants?: string[]) => void;
  startWorkoutFromCustomWorkout: (splitId: number, workoutId: number) => boolean;
  logArchetypeCompletedRetroactively: (archetypes: Archetype[], date: string) => void;
  /** `durationS` is required for, and only used by, duration-metric exercises. */
  updateExerciseSet: (exerciseIndex: number, setIndex: number, reps: number, weight: number, durationS?: number) => boolean | undefined;
  appendBonusSet: (
    exerciseIndex: number,
    type: BonusSetType,
    reps: number,
    weight: number,
    durationS?: number
  ) => void;
  toggleSetCompleted: (exerciseIndex: number, setIndex: number) => boolean | undefined;
  toggleSetSkipped: (exerciseIndex: number, setIndex: number) => void;
  swapCurrentSessionExercise: (exerciseIndex: number, name: string) => void;
  appendExerciseToSession: (name: string, expectedSessionId?: string) => boolean | undefined;
  completeWorkout: (intensity: IntensityLevel) => WorkoutSession | undefined;
  discardWorkout: () => void;

  addExerciseToSplit: (type: WorkoutType, name: string, primaryMuscle: string) => void;
  renameExercise: (id: number, newName: string) => void;
  hasExerciseHistory: (exerciseId: number) => boolean;
  deleteExercise: (exerciseId: number) => void;
  getExerciseWorkoutType: (name: string) => WorkoutType | undefined;
  getExercisesForWorkoutType: (type: WorkoutType) => ExerciseCatalogItem[];
  getPrimaryMusclesForWorkoutType: (type: WorkoutType) => string[];

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

const cloneExercises = <T extends Exercise>(exercises: T[]): T[] =>
  JSON.parse(JSON.stringify(exercises));

const renameExercises = <T extends Exercise>(
  exercises: T[],
  oldName: string,
  newName: string
): T[] =>
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
    const catalog = EXERCISE_SEEDS.find((exercise) => exercise.name === seed.name);
    const metric = catalog?.metric ?? 'reps';
    templates[seed.workoutType].push({
      name: seed.name,
      loadType: catalog?.loadType ?? 'external_weight',
      metric,
      sets: Array.from({ length: 3 }, () => metric === 'duration'
        ? { reps: 0, weight: seed.targetWeight, durationS: seed.targetDurationS }
        : { reps: seed.targetReps, weight: seed.targetWeight }),
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
  programWeeklyGoal: getProgramFrequency(profile),
  experienceLevel: profile.experienceLevel,
  trainingDays: profile.trainingDays,
  remindersEnabled: profile.remindersEnabled ?? false,
  reminderTime: profile.reminderTime ?? '18:00',
  onboardingCompleted: profile.onboardingCompleted,
  autoIncreaseWeight: profile.autoIncreaseWeight,
  weightIncrement: profile.weightIncrement,
  weightUnit: profile.weightUnit,
  weightIncrementLbs: profile.weightIncrementLbs,
  activeSplitId: profile.activeSplitId ?? null,
  ...resolveProgramPreferences({ ...profile, activeSplitId: profile.activeSplitId ?? null }),
});

const runGuardedAction = <T>(actionName: string, action: () => T): T | undefined => {
  try {
    return action();
  } catch (error) {
    console.error(`[workoutStore] ${actionName} failed`, error);
    Alert.alert('Couldn’t save', saveActionErrorCopy(actionName));
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
    Alert.alert('Couldn’t save', saveActionErrorCopy(actionName));
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
  addExerciseNote: (workoutId, exerciseId, text) => {
    if (get().currentSession?.id !== workoutId) throw new Error('This workout is no longer active.');
    addExerciseNoteSync(workoutId, exerciseId, text);
    set({ currentSession: readSessionByIdSync(Number(workoutId)) ?? null });
  },
  deleteExerciseNote: (exerciseId, noteId) => {
    deleteExerciseNoteSync(exerciseId, noteId);
    const current = get().currentSession;
    set({
      currentSession: current ? readSessionByIdSync(Number(current.id)) ?? null : null,
      sessions: readCompletedSessionsSync(),
    });
  },
  profile: null,
  sessions: [],
  currentSession: null,
  workoutFocus: null,
  selectedSet: null,
  selectWorkoutSet: (exerciseIndex, setIndex) => runGuardedAction('selectWorkoutSet', () => {
    const { currentSession, workoutFocus } = get();
    if (!currentSession || currentSession.completed ||
        exerciseIndex !== getCurrentWorkoutExerciseIndex(currentSession, workoutFocus)) return;
    const inspected = currentSession.exercises[exerciseIndex]?.sets[setIndex];
    if (!inspected?.completed) return;
    const target = readCurrentSetTarget(exerciseIndex, setIndex);
    if (!target || target.workoutId !== currentSession.id || target.workoutStartedAt !== currentSession.date ||
        target.exerciseName !== currentSession.exercises[exerciseIndex].name) return;
    set({ selectedSet: { ...target, completed: Boolean(inspected.completed) } });
  }),
  clearSelectedSet: () => set({ selectedSet: null }),
  getSetEditTarget: () => {
    const { selectedSet, currentSession } = get();
    if (selectedSet && currentSession) {
      const currentSet = currentSession.exercises[selectedSet.exerciseIndex]?.sets[selectedSet.setIndex];
      try {
        const actual = readCurrentSetTarget(selectedSet.exerciseIndex, selectedSet.setIndex);
        if (actual && sameSetTarget(actual, selectedSet) && currentSession.id === actual.workoutId &&
            Boolean(currentSet?.completed) === selectedSet.completed) return selectedSet;
      } catch { return null; }
      return null;
    }
    const active = get().getActiveSetTarget();
    return active ? { ...active, completed: false } : null;
  },
  applySetValueAction: (target, action, value, expectedWeightStepKg) => {
    const state = get();
    if (!state.isHydrated || state.hydrationError || !state.profile) return { status: 'unavailable' };
    return runGuardedAction('applySetValueAction', (): WorkoutSetActionResult => {
      const actual = get().getSetEditTarget();
      if (!actual || !sameSetTarget(actual, target) || actual.completed !== target.completed) return { status: 'stale' };
      const exercise = get().currentSession!.exercises[actual.exerciseIndex];
      const currentSet = exercise.sets[actual.setIndex];
      const timed = isDurationExercise(exercise);
      let { reps, weight, durationS } = currentSet;
      if (action === 'setReps' || action === 'increaseReps' || action === 'decreaseReps') {
        // Seconds are never edited through rep actions, on any surface.
        if (timed) return { status: 'unavailable' };
        if (action === 'setReps') reps = value!;
        else reps += action === 'increaseReps' ? 1 : -1;
      } else if (action === 'setDuration' || action === 'increaseDuration' || action === 'decreaseDuration') {
        if (!timed) return { status: 'unavailable' };
        if (action === 'setDuration') durationS = value!;
        else durationS = clampDuration((durationS ?? 0) + (action === 'increaseDuration' ? 1 : -1) * DURATION_STEP_S);
      } else if (action === 'setWeight' || action === 'increaseWeight' || action === 'decreaseWeight') {
        if (exercise.loadType === 'bodyweight') return { status: 'unavailable' };
        if (action === 'setWeight') weight = value!;
        else {
          const step = getWeightIncrementKg(state.profile!, exercise.entryUnit);
          if (expectedWeightStepKg !== undefined && expectedWeightStepKg !== step) return { status: 'stale' };
          weight += (action === 'increaseWeight' ? 1 : -1) * step;
        }
      } else return { status: 'unavailable' };
      return { status: get().updateExerciseSet(actual.exerciseIndex, actual.setIndex, reps, weight, durationS) ? 'applied' : 'failed' };
    }) ?? { status: 'failed' };
  },
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
  applyActiveSetAction: (target, action, expectedWeightStepKg, options) => {
    const state = get();
    if (!state.isHydrated || state.hydrationError || !state.profile) return { status: 'unavailable' };
    return runGuardedAction('applyActiveSetAction', (): WorkoutSetActionResult => {
      const active = get().getActiveSetTarget();
      if (!active || !sameSetTarget(active, target)) {
        return { status: 'stale' };
      }
      const { exerciseIndex, setIndex } = active;
      const exercise = get().currentSession!.exercises[exerciseIndex];
      const currentSet = exercise.sets[setIndex];
      if (action === 'completeSet') {
        const session = get().currentSession!;
        const { exercises, updates } = projectSetToggle(session.exercises, exerciseIndex, setIndex, state.profile);
        const completedExercise = isExerciseComplete(exercises[exerciseIndex]);
        const next = getNextIncompleteExerciseIndex(exercises, exerciseIndex);
        // Persist completion, propagation and automatic focus advance together.
        // A failed focus write cannot strand the widget on a finished exercise.
        const advance = options?.advanceFocus !== false && completedExercise && next !== -1;
        const focus = updateCurrentSets(exerciseIndex, updates, advance
          ? { workoutId: session.id, exerciseIndex: next } : undefined);
        set({ currentSession: { ...session, exercises },
          workoutFocus: focus ?? get().workoutFocus,
          selectedSet: focus ? null : get().selectedSet });
        return { status: 'applied', completedExercise, needsFeedback: completedExercise && next === -1 };
      }
      const timed = isDurationExercise(exercise);
      let { reps, weight, durationS } = currentSet;
      if (action === 'increaseReps' || action === 'decreaseReps') {
        if (timed) return { status: 'unavailable' };
        reps += action === 'increaseReps' ? 1 : -1;
      } else if (action === 'increaseDuration' || action === 'decreaseDuration') {
        if (!timed) return { status: 'unavailable' };
        durationS = clampDuration((durationS ?? 0) + (action === 'increaseDuration' ? 1 : -1) * DURATION_STEP_S);
      } else if (action === 'increaseWeight' || action === 'decreaseWeight') {
        if (exercise.loadType === 'bodyweight') return { status: 'unavailable' };
        const step = getWeightIncrementKg(state.profile!, exercise.entryUnit);
        if (expectedWeightStepKg !== undefined && expectedWeightStepKg !== step) return { status: 'stale' };
        weight += (action === 'increaseWeight' ? 1 : -1) * step;
      } else return { status: 'unavailable' };
      return { status: get().updateExerciseSet(exerciseIndex, setIndex, reps, weight, durationS) ? 'applied' : 'failed' };
    }) ?? { status: 'failed' };
  },
  setExerciseEntryUnit: (target, unit) => {
    const state = get();
    if (!state.isHydrated || state.hydrationError) return { status: 'unavailable' };
    if (unit !== 'kg' && unit !== 'lbs') return { status: 'unavailable' };
    return runGuardedAction('setExerciseEntryUnit', (): WorkoutSetActionResult => {
      const session = get().currentSession;
      const actual = readCurrentSetTarget(target.exerciseIndex, target.setIndex);
      if (!session || session.completed || !actual || !sameSetTarget(actual, target) ||
          session.id !== actual.workoutId || session.date !== actual.workoutStartedAt ||
          target.exerciseIndex !== getCurrentWorkoutExerciseIndex(session, get().workoutFocus)) return { status: 'stale' };
      writeExerciseEntryUnit(actual, unit);
      const exercises = session.exercises.map((exercise, index) =>
        index === actual.exerciseIndex ? { ...exercise, entryUnit: unit } : exercise);
      set({ currentSession: { ...session, exercises } });
      return { status: 'applied' };
    }) ?? { status: 'failed' };
  },
  setWorkoutExerciseIndex: (exerciseIndex) => {
    const { currentSession, workoutFocus } = get();
    if (!currentSession || !Number.isInteger(exerciseIndex) || !currentSession.exercises[exerciseIndex]) return;
    if (workoutFocus?.workoutId === currentSession.id && workoutFocus.exerciseIndex === exerciseIndex) return;
    runGuardedAction('setWorkoutExerciseIndex', () => {
      const focus = writeCurrentWorkoutFocus(currentSession.id, exerciseIndex);
      set({ workoutFocus: focus, selectedSet: null });
    });
  },
  splitTemplates: seedSplitTemplates(),
  customSplits: [],
  savedAdhocRoutineIds: {},
  saveAdhocRoutine: (sessionId, name) => runGuardedAction('saveAdhocRoutine', () => {
    const existing = get().savedAdhocRoutineIds[sessionId];
    if (existing !== undefined) return existing;
    const splitId = saveAdhocRoutineSync(sessionId, name);
    set({ savedAdhocRoutineIds: { ...get().savedAdhocRoutineIds, [sessionId]: splitId } });
    void get().refreshCustomSplits();
    return splitId;
  }),
  currentCustomSplit: null,
  isHydrated: false,
  hydrationError: null,

  setProfile: (profile) => runGuardedAction('setProfile', () => {
    const nextProfile = normalizeProfile(profile);
    writeProfile(nextProfile);
    set({ profile: nextProfile });
  }),

  // The original flow previews Stack's plan before choosing Stack or Custom.
  // Propagate write failures so Continue never navigates with an unsaved profile.
  prepareTrainingOnboarding: (name, frequency, experience) => {
    const existing = get().profile;
    if (existing?.onboardingCompleted) return existing;
    const structure = experience === 'beginner' ? 'full-body' : 'push-pull-legs';
    validateProgram(frequency, structure);
    const profile: UserProfile = { ...createNoProgramProfile(), name: name.trim(),
      weeklyGoal: frequency, programWeeklyGoal: frequency, experienceLevel: experience,
      threeDayStructure: structure, programMode: 'stack', weightUnitConfirmed: true };
    writeProfile(profile);
    set({ profile });
    return profile;
  },

  completeTrainingOnboarding: () => {
    const existing = get().profile;
    if (!existing) throw Error('Finish your training setup first.');
    if (existing.onboardingCompleted) return existing;
    const profile: UserProfile = { ...existing, programMode: 'stack', activeSplitId: null, onboardingCompleted: true };
    writeProfile(profile);
    set({ profile });
    return profile;
  },

  // This acceptance boundary intentionally propagates failures to the setup
  // screen. Publish completion only after the single profile upsert commits.
  completeNoProgramOnboarding: (name = '', weightUnit) => {
    const existing = get().profile;
    if (existing?.onboardingCompleted) return existing;
    const profile = { ...createNoProgramProfile(), name: name.trim(), onboardingCompleted: true,
      ...(weightUnit ? { weightUnit, weightUnitConfirmed: true } : {}) };
    writeProfile(profile);
    set({ profile });
    return profile;
  },

  confirmWorkoutWeightUnit: (unit) => {
    if (unit !== 'kg' && unit !== 'lbs') throw Error('Choose kilograms or pounds.');
    const existing = get().profile;
    if (!existing) throw Error('A profile is required to confirm units.');
    if (existing.weightUnitConfirmed && existing.weightUnit === unit) return existing;
    const profile = { ...existing, weightUnit: unit, weightUnitConfirmed: true };
    writeProfile(profile);
    set({ profile });
    return profile;
  },

  acceptStackProgram: (frequency, structure, context, name = '') => {
    validateProgram(frequency, structure);
    const existing = get().profile;
    if (context === 'onboarding' && existing?.onboardingCompleted) return existing;
    if (context === 'configuration' && !existing?.onboardingCompleted) throw Error('Finish setup before configuring a program.');
    const base = context === 'configuration' ? existing! : { ...createNoProgramProfile(), name: name.trim() };
    if (base.programMode === 'stack' && base.programWeeklyGoal === frequency && base.threeDayStructure === structure && base.onboardingCompleted) return base;
    const profile: UserProfile = { ...base, programWeeklyGoal: frequency, threeDayStructure: structure,
      programMode: 'stack', activeSplitId: null, onboardingCompleted: true };
    // A newly generated plan replaces an edited Stack's plan rather than leaving a stale copy.
    if (context === 'configuration') writeProfileReplacingStackPlanSync(profile);
    else writeProfile(profile);
    set({ profile, currentCustomSplit: null });
    if (context === 'configuration') void get().refreshCustomSplits();
    return profile;
  },

  updateProfile: (updates) => runGuardedAction('updateProfile', () => {
    const profile = get().profile;
    if (!profile) return;
    const nextProfile = normalizeProfile({ ...profile, ...updates });
    writeProfile(nextProfile);
    set({ profile: nextProfile });
  }),

  refreshCustomSplits: async () => {
    try {
      const requestedProfile = get().profile;
      const requestedActiveSplitId = requestedProfile?.activeSplitId ?? null;
      const refreshed = await readCustomSplitState(requestedActiveSplitId);
      const state = get();
      if (requestedProfile?.programMode === 'custom' &&
          state.profile?.programMode === 'custom' && state.profile.activeSplitId === requestedActiveSplitId &&
          refreshed.currentCustomSplit === null) {
        chooseNoProgramSync();
        set({ profile: readProfileSync() });
      }
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
    } catch (error) {
      console.error('[workoutStore] refreshCustomSplits failed', error);
      Alert.alert('Couldn’t load your routines', 'Your active plan stays the same. Try again.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retry', onPress: () => { void get().refreshCustomSplits(); } },
      ]);
    }
  },

  loadCustomSplit: async (splitId) => {
    const requestedProfile = get().profile;
    try {
      const currentCustomSplit = await getCustomSplitDetailAsync(splitId);
      const state = get();
      if (currentCustomSplit === null && requestedProfile?.programMode === 'custom' &&
          requestedProfile.activeSplitId === splitId && state.profile === requestedProfile) {
        chooseNoProgramSync();
        set({ profile: readProfileSync() });
      }
      if (state.profile === requestedProfile && !customSplitStateEqual(state.currentCustomSplit, currentCustomSplit)) {
        set({ currentCustomSplit });
      }
      return currentCustomSplit;
    } catch (error) {
      console.error('[workoutStore] loadCustomSplit failed', error);
      Alert.alert('Couldn’t load this routine', 'Your active plan stays the same. Try again.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retry', onPress: () => { void get().loadCustomSplit(splitId); } },
      ]);
      return undefined;
    }
  },

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
      set({ profile: readProfileSync() });
      const currentSplitId = get().currentCustomSplit?.id === splitId
        ? null
        : get().currentCustomSplit?.id ?? null;
      if (currentSplitId === null) set({ currentCustomSplit: null });
      await get().refreshCustomSplits();
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

  createCustomExercise: (name, workoutType, primaryMuscle, equipment, loadType, metric) =>
    runGuardedAction('createCustomExercise', () =>
      createCustomExerciseSync(name, workoutType, primaryMuscle, equipment, loadType, metric)
    ),

  activateSharedRoutine: (splitId) => {
    const existing = get().profile;
    if (!existing?.onboardingCompleted) throw Error('Finish setup before using this routine.');
    if (!Number.isSafeInteger(splitId) || splitId <= 0) throw Error('This routine is no longer available.');
    setActiveSplitSync(splitId);
    const profile: UserProfile = { ...existing, programMode: 'custom', activeSplitId: splitId };
    set({ profile, currentCustomSplit: null });
    void get().refreshCustomSplits();
    return profile;
  },

  setActiveSplit: (splitId) => runGuardedAction('setActiveSplit', () => {
    setActiveSplitSync(splitId);
    set({ profile: readProfileSync() });
  }),

  chooseNoProgram: () => runGuardedAction('chooseNoProgram', () => {
    chooseNoProgramSync();
    set({ profile: readProfileSync() });
  }),

  saveCustomSplitDraft: (name, workouts, options) =>
    runGuardedAsyncAction('saveCustomSplitDraft', async () => {
      const splitId = saveCustomSplitDraftSync(name, workouts, options);
      const profile = readProfileSync();
      // The transaction has committed. A later read failure must not turn a
      // successful save into a retry that creates a duplicate routine.
      set({ profile });
      await get().refreshCustomSplits();
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
    const profile = readProfileSync();
    if (!profile) throw new Error('A profile is required to start a workout');
    // History is global by exercise, never scoped to the routine or split type.
    const exercises = template.map((templateExercise) =>
      createSessionExercise(
        templateExercise,
        readLastExerciseHistorySync(templateExercise.name),
        profile
      )
    );
    const newSession = replaceCurrentSession({
      // SQLite assigns the AUTOINCREMENT key; it is mapped back to the existing
      // public string ID shape before state is published.
      id: '',
      origin: 'legacy',
      date: new Date().toISOString(),
      completedAt: null,
      archetype: null,
      secondaryArchetype: null,
      archetypeVariant: null,
      secondaryArchetypeVariant: null,
      workoutTypes: [...workoutTypes],
      exercises,
      completed: false,
      retroactive: false,
    });
    set({ currentSession: readSessionByIdSync(Number(newSession.id)) ?? newSession, workoutFocus: readCurrentWorkoutFocusSync(), selectedSet: null });
  },

  startEmptyWorkout: () => runGuardedAction('startEmptyWorkout', () => {
    if (!get().isHydrated || !get().profile) return false;
    const currentSession = persistEmptyWorkout();
    set({ currentSession, workoutFocus: readCurrentWorkoutFocusSync(), selectedSet: null });
    return true;
  }) === true,

  startWorkoutFromArchetype: (archetypes, variants) => runGuardedAction('startWorkoutFromArchetype', () => {
    const newSession = persistWorkoutFromArchetype(archetypes, variants);
    set({ currentSession: readSessionByIdSync(Number(newSession.id)) ?? newSession, workoutFocus: readCurrentWorkoutFocusSync(), selectedSet: null });
  }),

  startWorkoutFromCustomWorkout: (splitId, workoutId) =>
    runGuardedAction('startWorkoutFromCustomWorkout', () => {
      try {
        const newSession = persistWorkoutFromCustomWorkout(splitId, workoutId);
        set({ currentSession: readSessionByIdSync(Number(newSession.id)) ?? newSession, workoutFocus: readCurrentWorkoutFocusSync(), selectedSet: null });
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

  updateExerciseSet: (exerciseIndex, setIndex, reps, weight, durationS) => runGuardedAction('updateExerciseSet', () => {
    const session = get().currentSession;
    if (!session) return;
    const exercises = cloneExercises(session.exercises);
    const target = exercises[exerciseIndex]?.sets[setIndex];
    if (!target || !Number.isFinite(weight)) return false;
    const timed = isDurationExercise(exercises[exerciseIndex]);
    if (timed ? !isValidDuration(durationS) : !Number.isFinite(reps) || !Number.isInteger(reps)) return false;
    const updated = {
      ...target,
      valueOrigin: 'user' as const,
      reps: timed ? 0 : Math.max(1, reps),
      weight: exercises[exerciseIndex].loadType === 'bodyweight' ? 0 : Math.max(0, weight),
      ...(timed ? { durationS } : {}),
    };
    updateCurrentSet(exerciseIndex, setIndex, updated);
    exercises[exerciseIndex].sets[setIndex] = updated;
    set({ currentSession: { ...session, exercises } });
    return true;
  }),

  appendBonusSet: (exerciseIndex, type, reps, weight, durationS) => runGuardedAction('appendBonusSet', () => {
    const session = get().currentSession;
    if (!session) return;
    const exercises = cloneExercises(session.exercises);
    const exercise = exercises[exerciseIndex];
    if (!exercise) return;
    const timed = isDurationExercise(exercise);
    if (timed && !isValidDuration(durationS)) return;

    const storedWeight = exercise.loadType === 'bodyweight' ? 0 : weight;
    const storedReps = timed ? 0 : reps;
    appendCurrentBonusSet(exerciseIndex, type, storedReps, storedWeight, timed ? durationS : undefined);
    exercise.sets.push({ type, reps: storedReps, weight: storedWeight, ...(timed ? { durationS } : {}),
      completed: true, skipped: false, valueOrigin: 'user' });
    set({ currentSession: { ...session, exercises } });
  }),

  toggleSetCompleted: (exerciseIndex, setIndex) => runGuardedAction('toggleSetCompleted', () => {
    const session = get().currentSession;
    if (!session) return;
    const { exercises, updates } = projectSetToggle(session.exercises, exerciseIndex, setIndex, get().profile);
    if (updates.length === 0) return true;
    updateCurrentSets(exerciseIndex, updates);
    set({ currentSession: { ...session, exercises } });
    return true;
  }),

  toggleSetSkipped: (exerciseIndex, setIndex) => runGuardedAction('toggleSetSkipped', () => {
    const session = get().currentSession;
    if (!session) return;
    const exercises = cloneExercises(session.exercises);
    const target = exercises[exerciseIndex]?.sets[setIndex];
    if (!target || target.completed) return;
    const updated = { ...target, completed: true, skipped: true };

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

    const lastExercise = readLastExerciseHistorySync(name);
    // A new session exercise always takes the catalog's current measurement,
    // never one snapshotted on an older history row.
    const measurement = readExerciseMeasurementSync(name);
    const templateExercise =
      readSplitTemplatesSync()[type].find((exercise) => exercise.name === name) ??
      (lastExercise?.metric === measurement.metric ? lastExercise : undefined) ??
      makeDefaultExercise(name, measurement.loadType, measurement.metric);
    const profile = readProfileSync();
    if (!profile) throw new Error('A profile is required to swap an exercise');
    const replacement = createSessionExercise(
      { ...templateExercise, ...measurement, name },
      lastExercise,
      profile
    );

    replaceCurrentSessionExercise(exerciseIndex, replacement);
    set({ currentSession: readSessionByIdSync(Number(session.id)) ?? session, selectedSet: null });
  }),

  appendExerciseToSession: (name, expectedSessionId) => runGuardedAction('appendExerciseToSession', () => {
    const session = get().currentSession;
    const type = readExerciseWorkoutTypeSync(name);
    if (!session || !type || (expectedSessionId && session.id !== expectedSessionId)) return false;
    if (session.exercises.some((exercise) => exercise.name === name)) {
      Alert.alert('Already added', 'This exercise is already in your workout.');
      return false;
    }

    const lastExercise = readLastExerciseHistorySync(name);
    const measurement = readExerciseMeasurementSync(name);
    const templateExercise =
      readSplitTemplatesSync()[type].find((exercise) => exercise.name === name) ??
      (lastExercise?.metric === measurement.metric ? lastExercise : undefined) ??
      makeDefaultExercise(name, measurement.loadType, measurement.metric);
    const profile = readProfileSync();
    if (!profile) throw new Error('A profile is required to append an exercise');
    const newExercise = createSessionExercise(
      { ...templateExercise, ...measurement, name },
      lastExercise,
      profile
    );

    appendCurrentSessionExercise(newExercise, session.id, session.origin === 'adhoc');
    set({
      currentSession: readSessionByIdSync(Number(session.id)) ?? {
        ...session,
        workoutTypes: session.workoutTypes.includes(type)
          ? session.workoutTypes
          : [...session.workoutTypes, type],
        exercises: [...session.exercises, newExercise],
      },
      workoutFocus: readCurrentWorkoutFocusSync(),
      selectedSet: session.origin === 'adhoc' ? null : get().selectedSet,
    });
    return true;
  }),

  completeWorkout: (intensity) => runGuardedAction('completeWorkout', () => {
    const session = get().currentSession;
    if (!session) return undefined;
    if (!session.exercises.some((exercise) => exercise.sets.some((set) => set.completed === true && set.skipped !== true))) {
      Alert.alert('Log a set first', 'Log at least one non-skipped set before finishing your workout.');
      return undefined;
    }
    const completedAt = completeCurrentSession(intensity);
    const completedSession = {
      ...session,
      workoutTypes: [...session.workoutTypes],
      intensity,
      completed: true,
      completedAt,
    };
    set({
      sessions: [...get().sessions, completedSession],
      currentSession: null,
      workoutFocus: null,
      selectedSet: null,
    });
    return completedSession;
  }),

  discardWorkout: () => runGuardedAction('discardWorkout', () => {
    discardCurrentSession();
    set({ currentSession: null, workoutFocus: null, selectedSet: null });
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
    return weeklyTrainingProgress(sessionsThisWeek, weekDates, profile.weeklyGoal);
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
        // Traditional volume is weight × reps; timed sets have none.
        if (isDurationExercise(exercise)) continue;
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
      savedAdhocRoutineIds: {},
      workoutFocus: null,
      selectedSet: null,
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
        selectedSet: null,
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
