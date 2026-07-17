import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type WorkoutType = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core';
export type IntensityLevel = 'easy' | 'medium' | 'hard';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type BonusSetType = 'extra' | 'dropset' | 'pr';

export interface Exercise {
  name: string;
  sets: ExerciseSet[];
}

export interface ExerciseSet {
  reps: number; // logged/actual value, editable in-session
  weight: number; // logged/actual value, editable in-session
  type?: BonusSetType; // absent for normal sets; present only for appended bonus sets
  // Prescribed goal for this set, stamped at startWorkout. Optional because
  // template sets and sessions persisted before this field existed lack it —
  // readers must fall back to the set's own reps/weight.
  targetReps?: number;
  targetWeight?: number;
  completed?: boolean;
  skipped?: boolean; // true if marked done via the skip path (no confirmed data)
}

export interface WorkoutSession {
  id: string;
  date: string;
  type: WorkoutType;
  exercises: Exercise[];
  intensity?: IntensityLevel;
  completed: boolean;
}

export interface UserProfile {
  name: string;
  weeklyGoal: number;
  experienceLevel: ExperienceLevel;
  trainingDays: number[];
  onboardingCompleted: boolean;
  workoutsCompletedThisWeek: number;
}

// One entry per day of the current week (Monday-first). `completedType` is
// what was actually trained that day; `projectedType` is the forward-looking
// rotation preview, set only for today/future training slots that don't
// already have a completed session. Both absent = a rest day.
export interface ScheduleDay {
  date: string;
  status: 'past' | 'today' | 'future';
  completedType?: WorkoutType;
  projectedType?: WorkoutType;
}

interface WorkoutStore {
  profile: UserProfile | null;
  sessions: WorkoutSession[];
  currentSession: WorkoutSession | null;
  splitTemplates: Record<WorkoutType, Exercise[]>;

  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;

  startWorkout: (type: WorkoutType) => void;
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

  addExerciseToSplit: (type: WorkoutType, name: string) => void;
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

// Pool of exercises available when editing a split. Includes every default
// exercise so removed ones can always be re-added.
export const EXERCISE_POOL: Record<WorkoutType, string[]> = {
  chest: [
    'Bench Press',
    'Incline Dumbbell Press',
    'Chest Dips',
    'Cable Fly',
    'Incline Bench Press',
    'Push-ups',
    'Pec Deck',
    'Decline Press',
  ],
  back: [
    'Deadlift',
    'Pull-ups',
    'Barbell Rows',
    'Lat Pulldown',
    'Seated Cable Row',
    'T-Bar Row',
    'Single-Arm Dumbbell Row',
    'Back Extensions',
  ],
  shoulders: [
    'Overhead Press',
    'Lateral Raises',
    'Face Pulls',
    'Front Raises',
    'Arnold Press',
    'Rear Delt Fly',
    'Upright Rows',
    'Shrugs',
  ],
  arms: [
    'Bicep Curls',
    'Tricep Extensions',
    'Hammer Curls',
    'Tricep Dips',
    'Preacher Curls',
    'Tricep Pushdown',
    'Skull Crushers',
    'Cable Curls',
  ],
  legs: [
    'Squats',
    'Leg Press',
    'Romanian Deadlift',
    'Lunges',
    'Leg Curl',
    'Leg Extension',
    'Calf Raises',
    'Hip Thrusts',
  ],
  core: [
    'Plank',
    'Crunches',
    'Cable Crunch',
    'Hanging Leg Raise',
    'Leg Raises',
    'Russian Twists',
    'Ab Wheel Rollout',
    'Mountain Climbers',
  ],
};

const DEFAULT_EXERCISES: Record<WorkoutType, Exercise[]> = {
  chest: [
    { name: 'Bench Press', sets: [{ reps: 8, weight: 40 }, { reps: 8, weight: 40 }, { reps: 8, weight: 40 }] },
    { name: 'Incline Dumbbell Press', sets: [{ reps: 10, weight: 15 }, { reps: 10, weight: 15 }, { reps: 10, weight: 15 }] },
    { name: 'Chest Dips', sets: [{ reps: 10, weight: 0 }, { reps: 10, weight: 0 }, { reps: 10, weight: 0 }] },
    { name: 'Cable Fly', sets: [{ reps: 12, weight: 10 }, { reps: 12, weight: 10 }, { reps: 12, weight: 10 }] },
  ],
  back: [
    { name: 'Deadlift', sets: [{ reps: 6, weight: 60 }, { reps: 6, weight: 60 }, { reps: 6, weight: 60 }] },
    { name: 'Pull-ups', sets: [{ reps: 8, weight: 0 }, { reps: 8, weight: 0 }, { reps: 8, weight: 0 }] },
    { name: 'Barbell Rows', sets: [{ reps: 8, weight: 40 }, { reps: 8, weight: 40 }, { reps: 8, weight: 40 }] },
    { name: 'Lat Pulldown', sets: [{ reps: 10, weight: 35 }, { reps: 10, weight: 35 }, { reps: 10, weight: 35 }] },
  ],
  shoulders: [
    { name: 'Overhead Press', sets: [{ reps: 8, weight: 25 }, { reps: 8, weight: 25 }, { reps: 8, weight: 25 }] },
    { name: 'Lateral Raises', sets: [{ reps: 12, weight: 7.5 }, { reps: 12, weight: 7.5 }, { reps: 12, weight: 7.5 }] },
    { name: 'Face Pulls', sets: [{ reps: 15, weight: 12.5 }, { reps: 15, weight: 12.5 }, { reps: 15, weight: 12.5 }] },
    { name: 'Front Raises', sets: [{ reps: 12, weight: 7.5 }, { reps: 12, weight: 7.5 }, { reps: 12, weight: 7.5 }] },
  ],
  arms: [
    { name: 'Bicep Curls', sets: [{ reps: 12, weight: 12.5 }, { reps: 12, weight: 12.5 }, { reps: 12, weight: 12.5 }] },
    { name: 'Tricep Extensions', sets: [{ reps: 12, weight: 15 }, { reps: 12, weight: 15 }, { reps: 12, weight: 15 }] },
    { name: 'Hammer Curls', sets: [{ reps: 12, weight: 10 }, { reps: 12, weight: 10 }, { reps: 12, weight: 10 }] },
    { name: 'Tricep Dips', sets: [{ reps: 10, weight: 0 }, { reps: 10, weight: 0 }, { reps: 10, weight: 0 }] },
  ],
  legs: [
    { name: 'Squats', sets: [{ reps: 8, weight: 60 }, { reps: 8, weight: 60 }, { reps: 8, weight: 60 }] },
    { name: 'Leg Press', sets: [{ reps: 10, weight: 100 }, { reps: 10, weight: 100 }, { reps: 10, weight: 100 }] },
    { name: 'Lunges', sets: [{ reps: 12, weight: 20 }, { reps: 12, weight: 20 }, { reps: 12, weight: 20 }] },
    { name: 'Calf Raises', sets: [{ reps: 15, weight: 40 }, { reps: 15, weight: 40 }, { reps: 15, weight: 40 }] },
  ],
  core: [
    { name: 'Plank', sets: [{ reps: 60, weight: 0 }, { reps: 60, weight: 0 }, { reps: 60, weight: 0 }] },
    { name: 'Crunches', sets: [{ reps: 20, weight: 0 }, { reps: 20, weight: 0 }, { reps: 20, weight: 0 }] },
    { name: 'Leg Raises', sets: [{ reps: 15, weight: 0 }, { reps: 15, weight: 0 }, { reps: 15, weight: 0 }] },
    { name: 'Russian Twists', sets: [{ reps: 30, weight: 5 }, { reps: 30, weight: 5 }, { reps: 30, weight: 5 }] },
  ],
};

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

// Derive the seed generically from DEFAULT_EXERCISES so a future category
// change never requires hunting down every hardcoded seed site again.
const seedSplitTemplates = (): Record<WorkoutType, Exercise[]> => {
  const seeded = {} as Record<WorkoutType, Exercise[]>;
  for (const type of Object.keys(DEFAULT_EXERCISES) as WorkoutType[]) {
    seeded[type] = cloneExercises(DEFAULT_EXERCISES[type]);
  }
  return seeded;
};

const adjustWeight = (weight: number, intensity: IntensityLevel): number => {
  if (intensity === 'easy') {
    return Math.max(0, weight + 2.5);
  } else if (intensity === 'hard') {
    return Math.max(0, weight - 2.5);
  }
  return weight;
};

const WEIGHT_INCREMENT_BY_LEVEL: Record<ExperienceLevel, number> = {
  beginner: 5,
  intermediate: 2.5,
  advanced: 1.25,
};

const getWeightIncrement = (level: ExperienceLevel | undefined): number => {
  return WEIGHT_INCREMENT_BY_LEVEL[level ?? 'intermediate'];
};

// Deterministic progressive overload: hit the prescribed reps last time → nudge
// the weight up one increment; miss them → repeat the same prescription. Skipped
// sets carry no verified data, so the prescription repeats unchanged. Sets
// persisted before target fields existed fall back to their own logged numbers.
const computeNextTarget = (
  lastSet: ExerciseSet | undefined,
  templateSet: { reps: number; weight: number },
  experienceLevel: ExperienceLevel | undefined
): { targetReps: number; targetWeight: number } => {
  if (!lastSet) {
    return { targetReps: templateSet.reps, targetWeight: templateSet.weight };
  }
  const priorTargetReps = lastSet.targetReps ?? lastSet.reps;
  const priorTargetWeight = lastSet.targetWeight ?? lastSet.weight;

  if (lastSet.skipped) {
    // No verified data — repeat exactly, no change either direction.
    return { targetReps: priorTargetReps, targetWeight: priorTargetWeight };
  }
  const hitTarget = lastSet.reps >= priorTargetReps;
  return {
    targetReps: priorTargetReps,
    targetWeight: hitTarget
      ? Math.max(0, priorTargetWeight + getWeightIncrement(experienceLevel))
      : priorTargetWeight,
  };
};

const createSessionExercise = (
  templateExercise: Exercise,
  lastExercise: Exercise | undefined,
  experienceLevel: ExperienceLevel | undefined
): Exercise => ({
  name: templateExercise.name,
  // Historical exercises can act as a temporary template for a pool-only
  // swap. Excluding tagged bonus sets here keeps their stretch/drop numbers
  // out of every future prescription without changing computeNextTarget.
  sets: templateExercise.sets
    .filter((set) => !set.type)
    .map((templateSet, setIndex) => {
      const { targetReps, targetWeight } = computeNextTarget(
        lastExercise?.sets[setIndex],
        templateSet,
        experienceLevel
      );

      return {
        reps: targetReps,
        weight: targetWeight,
        targetReps,
        targetWeight,
        completed: false,
        skipped: false,
      };
    }),
});

const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const getWeekDates = (): string[] => {
  const dates: string[] = [];
  const start = getStartOfWeek(new Date());
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
};

const deriveDefaultSlots = (goal: number): number[] => {
  const slots: number[] = [];
  for (let i = 0; i < Math.min(goal, 7); i++) {
    slots.push(Math.round((i * 7) / goal));
  }
  return slots;
};

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      profile: null,
      sessions: [],
      currentSession: null,
      splitTemplates: seedSplitTemplates(),

      setProfile: (profile) => set({ profile }),

      updateProfile: (updates) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...updates } : null,
        })),

      startWorkout: (type) => {
        const template = get().splitTemplates[type];
        const lastWorkout = get().getLastWorkoutOfType(type);
        const experienceLevel = get().profile?.experienceLevel;

        const exercises: Exercise[] = template.map((templateExercise) =>
          createSessionExercise(
            templateExercise,
            lastWorkout?.exercises.find((exercise) => exercise.name === templateExercise.name),
            experienceLevel
          )
        );

        const newSession: WorkoutSession = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          type,
          exercises,
          completed: false,
        };

        set({ currentSession: newSession });
      },

      updateExerciseSet: (exerciseIndex, setIndex, reps, weight) =>
        set((state) => {
          if (!state.currentSession) return state;

          const exercises = cloneExercises(state.currentSession.exercises);
          const target = exercises[exerciseIndex].sets[setIndex];
          exercises[exerciseIndex].sets[setIndex] = { ...target, reps, weight };

          return {
            currentSession: {
              ...state.currentSession,
              exercises,
            },
          };
        }),

      appendBonusSet: (exerciseIndex, type, reps, weight) =>
        set((state) => {
          if (!state.currentSession) return state;

          const exercises = cloneExercises(state.currentSession.exercises);
          const exercise = exercises[exerciseIndex];
          if (!exercise) return state;

          exercise.sets.push({ type, reps, weight, completed: true, skipped: false });

          return {
            currentSession: {
              ...state.currentSession,
              exercises,
            },
          };
        }),

      toggleSetCompleted: (exerciseIndex, setIndex) =>
        set((state) => {
          if (!state.currentSession) return state;

          const exercises = cloneExercises(state.currentSession.exercises);
          const target = exercises[exerciseIndex].sets[setIndex];
          const nowCompleted = !target.completed;
          exercises[exerciseIndex].sets[setIndex] = {
            ...target,
            completed: nowCompleted,
            // Unchecking clears the skip flag so re-checking later can go down
            // either path fresh.
            skipped: nowCompleted ? target.skipped : false,
          };

          return {
            currentSession: {
              ...state.currentSession,
              exercises,
            },
          };
        }),

      toggleSetSkipped: (exerciseIndex, setIndex) =>
        set((state) => {
          if (!state.currentSession) return state;

          const exercises = cloneExercises(state.currentSession.exercises);
          const target = exercises[exerciseIndex].sets[setIndex];

          if (target.skipped) {
            exercises[exerciseIndex].sets[setIndex] = {
              ...target,
              completed: false,
              skipped: false,
            };
          } else {
            exercises[exerciseIndex].sets[setIndex] = {
              ...target,
              completed: true,
              skipped: true,
              // Never save a number that wasn't verified as performed — discard
              // any stepper nudges and restore the prescription.
              reps: target.targetReps ?? target.reps,
              weight: target.targetWeight ?? target.weight,
            };
          }

          return {
            currentSession: {
              ...state.currentSession,
              exercises,
            },
          };
        }),

      swapCurrentSessionExercise: (exerciseIndex, name) =>
        set((state) => {
          const session = state.currentSession;
          if (
            !session ||
            !EXERCISE_POOL[session.type].includes(name) ||
            exerciseIndex < 0 ||
            exerciseIndex >= session.exercises.length ||
            session.exercises.some((exercise, index) =>
              index !== exerciseIndex && exercise.name === name
            )
          ) {
            return state;
          }

          if (session.exercises[exerciseIndex].name === name) return state;

          const lastExercise = state.sessions
            .filter(
              (candidate) =>
                candidate.type === session.type &&
                candidate.completed &&
                candidate.exercises.some((exercise) => exercise.name === name)
            )
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
            ?.exercises.find((exercise) => exercise.name === name);

          // A pool-only exercise has no permanent template. Reuse its latest
          // set structure when history exists; otherwise follow the established
          // newly-added exercise default of 3 sets x 8 reps at zero weight.
          const templateExercise =
            state.splitTemplates[session.type].find((exercise) => exercise.name === name) ??
            lastExercise ??
            makeDefaultExercise(name);
          const replacement = createSessionExercise(
            { ...templateExercise, name },
            lastExercise,
            state.profile?.experienceLevel
          );
          const exercises = [...session.exercises];
          exercises[exerciseIndex] = replacement;

          return {
            currentSession: {
              ...session,
              exercises,
            },
          };
        }),

      completeWorkout: (intensity) =>
        set((state) => {
          if (!state.currentSession) return state;

          const completedSession = {
            ...state.currentSession,
            intensity,
            completed: true,
          };

          // Sessions are the single source of truth for weekly progress,
          // streak dots, and profile stats — no separate counters.
          return {
            sessions: [...state.sessions, completedSession],
            currentSession: null,
          };
        }),

      discardWorkout: () => set({ currentSession: null }),

      addExerciseToSplit: (type, name) =>
        set((state) => {
          const splitTemplates = {
            ...state.splitTemplates,
            [type]: [...state.splitTemplates[type], makeDefaultExercise(name)],
          };

          const sessionExercise = makeDefaultExercise(name);
          sessionExercise.sets = sessionExercise.sets.map((s) => ({ ...s, completed: false }));

          const currentSession =
            state.currentSession && state.currentSession.type === type
              ? {
                  ...state.currentSession,
                  exercises: [...state.currentSession.exercises, sessionExercise],
                }
              : state.currentSession;

          return { splitTemplates, currentSession };
        }),

      removeExerciseFromSplit: (type, exerciseIndex) =>
        set((state) => {
          if (state.splitTemplates[type].length <= 1) return state;

          const splitTemplates = {
            ...state.splitTemplates,
            [type]: state.splitTemplates[type].filter((_, i) => i !== exerciseIndex),
          };

          const currentSession =
            state.currentSession && state.currentSession.type === type
              ? {
                  ...state.currentSession,
                  exercises: state.currentSession.exercises.filter((_, i) => i !== exerciseIndex),
                }
              : state.currentSession;

          return { splitTemplates, currentSession };
        }),

      moveExerciseInSplit: (type, fromIndex, toIndex) =>
        set((state) => {
          const templateList = [...state.splitTemplates[type]];
          if (
            toIndex < 0 ||
            toIndex >= templateList.length ||
            fromIndex < 0 ||
            fromIndex >= templateList.length
          ) {
            return state;
          }

          const [moved] = templateList.splice(fromIndex, 1);
          templateList.splice(toIndex, 0, moved);
          const splitTemplates = { ...state.splitTemplates, [type]: templateList };

          let currentSession = state.currentSession;
          if (currentSession && currentSession.type === type) {
            const sessionList = [...currentSession.exercises];
            const [movedSession] = sessionList.splice(fromIndex, 1);
            sessionList.splice(toIndex, 0, movedSession);
            currentSession = { ...currentSession, exercises: sessionList };
          }

          return { splitTemplates, currentSession };
        }),

      getNextWorkoutType: () => {
        const sessions = get().sessions;
        if (sessions.length === 0) return 'chest';

        const lastSession = sessions
          .filter((s) => s.completed)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        if (!lastSession) return 'chest';

        const currentIndex = WORKOUT_ROTATION.indexOf(lastSession.type);
        const nextIndex = (currentIndex + 1) % WORKOUT_ROTATION.length;
        return WORKOUT_ROTATION[nextIndex];
      },

      getLastWorkoutOfType: (type) => {
        const sessions = get().sessions;
        return sessions
          .filter((s) => s.type === type && s.completed)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      },

      getWeeklyProgress: () => {
        const profile = get().profile;
        if (!profile) return { completed: 0, goal: 3 };

        const weekDates = getWeekDates();
        const sessionsThisWeek = get().sessions.filter((s) => {
          const sessionDate = s.date.split('T')[0];
          return weekDates.includes(sessionDate) && s.completed;
        });

        return {
          completed: sessionsThisWeek.length,
          goal: profile.weeklyGoal,
        };
      },

      getWeekStreak: () => {
        const weekDates = getWeekDates();
        const sessions = get().sessions;

        return weekDates.map((date) => {
          const workoutsOnDate = sessions.filter(
            (s) => s.date.split('T')[0] === date && s.completed
          ).length;
          return { date, workouts: workoutsOnDate };
        });
      },

      getWeekSchedule: () => {
        const weekDates = getWeekDates();
        const sessions = get().sessions;
        const profile = get().profile;
        const goal = profile?.weeklyGoal ?? 3;
        const today = new Date().toISOString().split('T')[0];

        const trainingSlots = new Set<number>(
          profile?.trainingDays?.length ? profile.trainingDays : deriveDefaultSlots(goal)
        );

        // getNextWorkoutType() stays the single source of truth for "what's
        // next" — the schedule walks the rotation forward from that anchor, so
        // today's projected slot (when today is a training day) always
        // matches it. This is a preview layered on top, not a second system.
        let rotationIndex = WORKOUT_ROTATION.indexOf(get().getNextWorkoutType());

        return weekDates.map((date, index) => {
          const status: ScheduleDay['status'] =
            date === today ? 'today' : date < today ? 'past' : 'future';

          const completedType = sessions
            .filter((s) => s.completed && s.date.split('T')[0] === date)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
            ?.type;

          // Past days only report what actually happened; projections exist
          // for today and forward, and never override a logged session.
          let projectedType: WorkoutType | undefined;
          if (status !== 'past' && !completedType && trainingSlots.has(index)) {
            projectedType = WORKOUT_ROTATION[rotationIndex % WORKOUT_ROTATION.length];
            rotationIndex += 1;
          }

          return { date, status, completedType, projectedType };
        });
      },

      getWeeklyVolumeTrend: (weeks = 8) => {
        // Bucket completed-session volume by Monday-start week, reusing the
        // same getStartOfWeek convention as every other weekly read.
        const volumeByWeek = new Map<string, number>();
        for (const session of get().sessions) {
          if (!session.completed) continue;
          let volume = 0;
          for (const exercise of session.exercises) {
            for (const set of exercise.sets) {
              // Checked-off sets only. Skipped sets count at their target
              // numbers (toggleSetSkipped restores targets into reps/weight);
              // sets nobody verified contribute nothing.
              if (set.completed) volume += set.reps * set.weight;
            }
          }
          const weekStart = getStartOfWeek(new Date(session.date))
            .toISOString()
            .split('T')[0];
          volumeByWeek.set(weekStart, (volumeByWeek.get(weekStart) ?? 0) + volume);
        }

        const currentWeekStart = getStartOfWeek(new Date());
        const trend: { weekStart: string; volume: number }[] = [];
        for (let i = weeks - 1; i >= 0; i--) {
          const start = new Date(currentWeekStart);
          start.setDate(currentWeekStart.getDate() - i * 7);
          const weekStart = start.toISOString().split('T')[0];
          trend.push({ weekStart, volume: volumeByWeek.get(weekStart) ?? 0 });
        }
        return trend;
      },

      getRecentIntensity: (n = 5) =>
        get()
          .sessions.filter((s) => s.completed && s.intensity)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(-n)
          .map((s) => s.intensity as IntensityLevel),

      resetAllData: () =>
        set({
          profile: null,
          sessions: [],
          currentSession: null,
          splitTemplates: seedSplitTemplates(),
        }),
    }),
    {
      name: 'workout-store',
      storage: createJSONStorage(() => AsyncStorage),
      // v1: WorkoutType expanded from 4 splits to 6. Deliberately no migrate
      // function (pre-release, no history worth keeping) — the version bump
      // discards stale persisted state instead of crashing on splitTemplates
      // still keyed by the old push/pull/legs/abs types.
      version: 1,
    }
  )
);
