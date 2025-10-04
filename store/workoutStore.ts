import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type WorkoutType = 'push' | 'pull' | 'legs' | 'abs';
export type IntensityLevel = 'easy' | 'medium' | 'hard';

export interface Exercise {
  name: string;
  sets: ExerciseSet[];
}

export interface ExerciseSet {
  reps: number;
  weight: number;
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
  preferredIntensity: IntensityLevel;
  onboardingCompleted: boolean;
  workoutsCompletedThisWeek: number;
}

interface WorkoutStore {
  profile: UserProfile | null;
  sessions: WorkoutSession[];
  currentSession: WorkoutSession | null;

  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;

  startWorkout: (type: WorkoutType) => void;
  updateExerciseSet: (exerciseIndex: number, setIndex: number, reps: number, weight: number) => void;
  completeWorkout: (intensity: IntensityLevel) => void;
  discardWorkout: () => void;

  getNextWorkoutType: () => WorkoutType;
  getLastWorkoutOfType: (type: WorkoutType) => WorkoutSession | undefined;
  getWeeklyProgress: () => { completed: number; goal: number };
  getWeekStreak: () => { date: string; workouts: number }[];

  resetWeeklyProgress: () => void;
  resetAllData: () => void;
}

const WORKOUT_ROTATION: WorkoutType[] = ['push', 'pull', 'legs', 'abs'];

const DEFAULT_EXERCISES: Record<WorkoutType, Exercise[]> = {
  push: [
    { name: 'Bench Press', sets: [{ reps: 8, weight: 40 }, { reps: 8, weight: 40 }, { reps: 8, weight: 40 }] },
    { name: 'Overhead Press', sets: [{ reps: 8, weight: 25 }, { reps: 8, weight: 25 }, { reps: 8, weight: 25 }] },
    { name: 'Dips', sets: [{ reps: 10, weight: 0 }, { reps: 10, weight: 0 }, { reps: 10, weight: 0 }] },
    { name: 'Tricep Extensions', sets: [{ reps: 12, weight: 15 }, { reps: 12, weight: 15 }, { reps: 12, weight: 15 }] },
  ],
  pull: [
    { name: 'Deadlift', sets: [{ reps: 6, weight: 60 }, { reps: 6, weight: 60 }, { reps: 6, weight: 60 }] },
    { name: 'Pull-ups', sets: [{ reps: 8, weight: 0 }, { reps: 8, weight: 0 }, { reps: 8, weight: 0 }] },
    { name: 'Barbell Rows', sets: [{ reps: 8, weight: 40 }, { reps: 8, weight: 40 }, { reps: 8, weight: 40 }] },
    { name: 'Bicep Curls', sets: [{ reps: 12, weight: 12.5 }, { reps: 12, weight: 12.5 }, { reps: 12, weight: 12.5 }] },
  ],
  legs: [
    { name: 'Squats', sets: [{ reps: 8, weight: 60 }, { reps: 8, weight: 60 }, { reps: 8, weight: 60 }] },
    { name: 'Leg Press', sets: [{ reps: 10, weight: 100 }, { reps: 10, weight: 100 }, { reps: 10, weight: 100 }] },
    { name: 'Lunges', sets: [{ reps: 12, weight: 20 }, { reps: 12, weight: 20 }, { reps: 12, weight: 20 }] },
    { name: 'Calf Raises', sets: [{ reps: 15, weight: 40 }, { reps: 15, weight: 40 }, { reps: 15, weight: 40 }] },
  ],
  abs: [
    { name: 'Plank', sets: [{ reps: 60, weight: 0 }, { reps: 60, weight: 0 }, { reps: 60, weight: 0 }] },
    { name: 'Crunches', sets: [{ reps: 20, weight: 0 }, { reps: 20, weight: 0 }, { reps: 20, weight: 0 }] },
    { name: 'Leg Raises', sets: [{ reps: 15, weight: 0 }, { reps: 15, weight: 0 }, { reps: 15, weight: 0 }] },
    { name: 'Russian Twists', sets: [{ reps: 30, weight: 5 }, { reps: 30, weight: 5 }, { reps: 30, weight: 5 }] },
  ],
};

const adjustWeight = (weight: number, intensity: IntensityLevel): number => {
  if (intensity === 'easy') {
    return Math.max(0, weight + 2.5);
  } else if (intensity === 'hard') {
    return Math.max(0, weight - 2.5);
  }
  return weight;
};

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

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      profile: null,
      sessions: [],
      currentSession: null,

      setProfile: (profile) => set({ profile }),

      updateProfile: (updates) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...updates } : null,
        })),

      startWorkout: (type) => {
        const lastWorkout = get().getLastWorkoutOfType(type);
        let exercises = JSON.parse(JSON.stringify(DEFAULT_EXERCISES[type]));

        if (lastWorkout && lastWorkout.intensity) {
          exercises = exercises.map((exercise: Exercise, idx: number) => {
            const lastExercise = lastWorkout.exercises[idx];
            if (lastExercise) {
              return {
                ...exercise,
                sets: exercise.sets.map((set, setIdx) => {
                  const lastSet = lastExercise.sets[setIdx];
                  if (lastSet) {
                    return {
                      reps: lastSet.reps,
                      weight: adjustWeight(lastSet.weight, lastWorkout.intensity!),
                    };
                  }
                  return set;
                }),
              };
            }
            return exercise;
          });
        }

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

          const exercises = [...state.currentSession.exercises];
          exercises[exerciseIndex].sets[setIndex] = { reps, weight };

          return {
            currentSession: {
              ...state.currentSession,
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

          const currentWeekStart = getStartOfWeek(new Date()).toISOString().split('T')[0];
          const sessionDate = completedSession.date.split('T')[0];
          const sessionWeekStart = getStartOfWeek(new Date(sessionDate)).toISOString().split('T')[0];

          let updatedProfile = state.profile;
          if (currentWeekStart === sessionWeekStart) {
            updatedProfile = state.profile
              ? {
                  ...state.profile,
                  workoutsCompletedThisWeek: state.profile.workoutsCompletedThisWeek + 1,
                }
              : null;
          }

          return {
            sessions: [...state.sessions, completedSession],
            currentSession: null,
            profile: updatedProfile,
          };
        }),

      discardWorkout: () => set({ currentSession: null }),

      getNextWorkoutType: () => {
        const sessions = get().sessions;
        if (sessions.length === 0) return 'push';

        const lastSession = sessions
          .filter((s) => s.completed)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        if (!lastSession) return 'push';

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

      resetWeeklyProgress: () =>
        set((state) => ({
          profile: state.profile
            ? { ...state.profile, workoutsCompletedThisWeek: 0 }
            : null,
        })),

      resetAllData: () =>
        set({
          profile: null,
          sessions: [],
          currentSession: null,
        }),
    }),
    {
      name: 'workout-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
