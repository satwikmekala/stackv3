import { Alert } from 'react-native';
import { create } from 'zustand';

import type { Archetype } from '@/constants/archetypes';

import {
  EXERCISE_SEEDS,
  SPLIT_TEMPLATE_SEEDS,
  type ExerciseCatalogItem,
  addExerciseToSplitRecords,
  appendCurrentBonusSet,
  completeCurrentSession,
  deleteExercise as deleteExerciseRecord,
  discardCurrentSession,
  hasExerciseHistory as hasExerciseHistoryRecord,
  logArchetypeCompletedRetroactively as persistRetroactiveArchetypeWorkout,
  moveExerciseInSplitRecords,
  readCompletedSessionsSync,
  readExerciseWorkoutTypeSync,
  readInitialWorkoutSnapshot,
  readLastExerciseSync,
  readLastWorkoutOfTypeSync,
  readMostOverdueTypeSync,
  readExercisesForWorkoutTypeSync,
  readPrimaryMusclesForWorkoutTypeSync,
  readProfileSync,
  readSplitTemplatesSync,
  removeExerciseFromSplitRecords,
  renameExercise as renameExerciseRecord,
  replaceCurrentSession,
  replaceCurrentSessionExercise,
  resetWorkoutDatabase,
  startWorkoutFromArchetype as persistWorkoutFromArchetype,
  updateCurrentSet,
  writeProfile,
} from '@/store/workoutDatabase';
import { createSessionExercise } from '@/store/workoutProgression';
import { lbsToKg, type WeightUnit } from '@/store/weightUnits';

export type { ExerciseCatalogItem };

export type WorkoutType = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core';
export type IntensityLevel = 'easy' | 'medium' | 'hard';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type BonusSetType = 'extra' | 'dropset' | 'pr';

export interface Exercise {
  name: string;
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
}

export interface UserProfile {
  name: string;
  weeklyGoal: number;
  experienceLevel: ExperienceLevel;
  trainingDays: number[];
  onboardingCompleted: boolean;
  weightIncrement: number;
  weightUnit: WeightUnit;
  weightIncrementLbs: number;
}

// Kept only at the setProfile call boundary so the existing onboarding caller
// can pass its former dead counter without that value entering state or SQLite.
type UserProfileInput = UserProfile & { workoutsCompletedThisWeek?: number };

export interface ScheduleDay {
  date: string;
  status: 'past' | 'today' | 'future';
  completedWorkout?: Pick<
    WorkoutSession,
    'archetype' | 'secondaryArchetype' | 'workoutTypes'
  >;
  projectedWorkoutTypes?: WorkoutType[];
  isTrainingDay: boolean;
}

interface WorkoutStore {
  profile: UserProfile | null;
  sessions: WorkoutSession[];
  currentSession: WorkoutSession | null;
  splitTemplates: Record<WorkoutType, Exercise[]>;
  isHydrated: boolean;
  hydrationError: string | null;

  setProfile: (profile: UserProfileInput) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;

  startWorkout: (workoutTypes: WorkoutType[]) => void;
  startWorkoutFromArchetype: (archetypes: Archetype[]) => void;
  logArchetypeCompletedRetroactively: (archetypes: Archetype[], date: string) => void;
  updateExerciseSet: (exerciseIndex: number, setIndex: number, reps: number, weight: number) => void;
  appendBonusSet: (
    exerciseIndex: number,
    type: BonusSetType,
    reps: number,
    weight: number
  ) => void;
  toggleSetCompleted: (exerciseIndex: number, setIndex: number) => void;
  toggleSetSkipped: (exerciseIndex: number, setIndex: number) => void;
  swapCurrentSessionExercise: (exerciseIndex: number, name: string) => void;
  completeWorkout: (intensity: IntensityLevel) => void;
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

  getNextWorkoutType: () => WorkoutType;
  getLastWorkoutOfType: (type: WorkoutType) => WorkoutSession | undefined;
  getWeeklyProgress: () => { completed: number; goal: number };
  getWeekStreak: () => { date: string; workouts: number }[];
  getWeekSchedule: () => ScheduleDay[];
  getWeeklyVolumeTrend: (weeks?: number) => { weekStart: string; volume: number }[];
  getRecentIntensity: (n?: number) => IntensityLevel[];

  resetAllData: () => void;
}

const WORKOUT_ROTATION: WorkoutType[] = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core'];

const makeDefaultExercise = (name: string): Exercise => ({
  name,
  sets: [
    { reps: 8, weight: 0 },
    { reps: 8, weight: 0 },
    { reps: 8, weight: 0 },
  ],
});

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
      sets: Array.from({ length: 3 }, () => ({
        reps: seed.targetReps,
        weight: seed.targetWeight,
      })),
    });
  }
  return templates;
};

export const toLocalCalendarDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseSessionDate = (dateString: string): Date => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateString);
};

export const getSessionLocalDate = (dateString: string): string =>
  toLocalCalendarDate(parseSessionDate(dateString));

export const getStartOfWeek = (date: Date): Date => {
  const start = new Date(date);
  const day = start.getDay();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - day + (day === 0 ? -6 : 1));
  return start;
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
  weightIncrement: profile.weightIncrement,
  weightUnit: profile.weightUnit,
  weightIncrementLbs: profile.weightIncrementLbs,
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

export const useWorkoutStore = create<WorkoutStore>()((set, get) => ({
  profile: null,
  sessions: [],
  currentSession: null,
  splitTemplates: seedSplitTemplates(),
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

  startWorkout: (workoutTypes) => {
    const type = workoutTypes[0];
    if (!type || workoutTypes.length > 2 || new Set(workoutTypes).size !== workoutTypes.length) {
      throw new Error('A workout session must have one or two distinct workout types');
    }
    const template = readSplitTemplatesSync()[type];
    const lastWorkout = readLastWorkoutOfTypeSync(type);
    const experienceLevel = readProfileSync()?.experienceLevel;
    const exercises = template.map((templateExercise) =>
      createSessionExercise(
        templateExercise,
        lastWorkout?.exercises.find((exercise) => exercise.name === templateExercise.name),
        experienceLevel
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
    set({ currentSession: newSession });
  },

  startWorkoutFromArchetype: (archetypes) => runGuardedAction('startWorkoutFromArchetype', () => {
    const newSession = persistWorkoutFromArchetype(archetypes);
    set({ currentSession: newSession });
  }),

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
    const updated = { ...target, reps, weight };
    updateCurrentSet(exerciseIndex, setIndex, updated);
    exercises[exerciseIndex].sets[setIndex] = updated;
    set({ currentSession: { ...session, exercises } });
  }),

  appendBonusSet: (exerciseIndex, type, reps, weight) => runGuardedAction('appendBonusSet', () => {
    const session = get().currentSession;
    if (!session) return;
    const exercises = cloneExercises(session.exercises);
    const exercise = exercises[exerciseIndex];
    if (!exercise) return;

    appendCurrentBonusSet(exerciseIndex, type, reps, weight);
    exercise.sets.push({ type, reps, weight, completed: true, skipped: false });
    set({ currentSession: { ...session, exercises } });
  }),

  toggleSetCompleted: (exerciseIndex, setIndex) => runGuardedAction('toggleSetCompleted', () => {
    const session = get().currentSession;
    if (!session) return;
    const exercises = cloneExercises(session.exercises);
    const target = exercises[exerciseIndex].sets[setIndex];
    const nowCompleted = !target.completed;
    const updated = {
      ...target,
      completed: nowCompleted,
      skipped: nowCompleted ? target.skipped : false,
    };

    updateCurrentSet(exerciseIndex, setIndex, updated);
    exercises[exerciseIndex].sets[setIndex] = updated;
    const nextSet = exercises[exerciseIndex].sets[setIndex + 1];
    if (nowCompleted && nextSet && !nextSet.completed && !nextSet.skipped) {
      // Bump is unit-native (2.5 kg / 5 lbs) but stored in kg-canonical terms.
      const bumpKg = get().profile?.weightUnit === 'lbs' ? lbsToKg(5) : 2.5;
      const nextUpdated = {
        ...nextSet,
        weight: target.weight + bumpKg,
        targetWeight: target.weight + bumpKg,
      };
      updateCurrentSet(exerciseIndex, setIndex + 1, nextUpdated);
      exercises[exerciseIndex].sets[setIndex + 1] = nextUpdated;
    }
    set({ currentSession: { ...session, exercises } });
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
          weight: target.targetWeight ?? target.weight,
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
      makeDefaultExercise(name);
    const replacement = createSessionExercise(
      { ...templateExercise, name },
      lastExercise,
      readProfileSync()?.experienceLevel
    );

    replaceCurrentSessionExercise(exerciseIndex, replacement);
    const exercises = [...session.exercises];
    exercises[exerciseIndex] = replacement;
    set({ currentSession: { ...session, exercises } });
  }),

  completeWorkout: (intensity) => runGuardedAction('completeWorkout', () => {
    const session = get().currentSession;
    if (!session) return;
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
    });
  }),

  discardWorkout: () => runGuardedAction('discardWorkout', () => {
    discardCurrentSession();
    set({ currentSession: null });
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

  getWeekSchedule: () => {
    const weekDates = getWeekDates();
    const sessions = readCompletedSessionsSync();
    const profile = readProfileSync();
    const goal = profile?.weeklyGoal ?? 3;
    const today = toLocalCalendarDate(new Date());
    const trainingSlots = new Set<number>(
      profile?.trainingDays?.length ? profile.trainingDays : deriveDefaultSlots(goal)
    );

    return weekDates.map((date, index) => {
      const status: ScheduleDay['status'] =
        date === today ? 'today' : date < today ? 'past' : 'future';
      const isTrainingDay = trainingSlots.has(index);
      const completedSession = sessions
        .filter((session) => getSessionLocalDate(session.date) === date)
        .sort((a, b) => parseSessionDate(b.date).getTime() - parseSessionDate(a.date).getTime())[0];
      const completedWorkout = completedSession
        ? {
            archetype: completedSession.archetype,
            secondaryArchetype: completedSession.secondaryArchetype,
            workoutTypes: completedSession.workoutTypes,
          }
        : undefined;
      let projectedWorkoutTypes: WorkoutType[] | undefined;
      if (status === 'today' && !completedWorkout) {
        projectedWorkoutTypes = [get().getNextWorkoutType()];
      }
      return {
        date,
        status,
        completedWorkout,
        projectedWorkoutTypes,
        isTrainingDay,
      };
    });
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
    set({ ...snapshot, isHydrated: true, hydrationError: null });
  }),
}));

let initializationPromise: Promise<void> | null = null;

export const initializeWorkoutStore = (): Promise<void> => {
  if (useWorkoutStore.getState().isHydrated) return Promise.resolve();
  if (initializationPromise) return initializationPromise;

  initializationPromise = readInitialWorkoutSnapshot()
    .then((snapshot) => {
      // [BOOT] 7 — right before setState({ isHydrated: true })
      console.log('[BOOT] initializeWorkoutStore: snapshot received, about to setState isHydrated=true');
      useWorkoutStore.setState({ ...snapshot, isHydrated: true, hydrationError: null });
    })
    .catch((error) => {
      // [BOOT] 7 — inside .catch block
      console.log('[BOOT] initializeWorkoutStore: .catch fired, error:', error);
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
  if (uniqueSeedNames.size !== 60 || SPLIT_TEMPLATE_SEEDS.length !== 24) {
    throw new Error('Workout seed data must contain 60 exercises and 24 templates');
  }
}
