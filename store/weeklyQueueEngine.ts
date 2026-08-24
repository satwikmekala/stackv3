import {
  getWeeklyArchetypeSequence,
  type Archetype,
} from '@/constants/archetypes';
import { readCompletedSessionsSync } from '@/store/workoutDatabase';
import {
  getSessionLocalDate,
  getWeekDates,
  useWorkoutStore,
} from '@/store/workoutStore';

export interface WeeklyQueueState {
  sequence: Archetype[];
  completedKnown: Archetype[];
  unknownCompletedCount: number;
  remaining: Archetype[];
  trainingDaysRemaining: number;
  nextUp: Archetype[];
}

export const getWeeklyQueueState = (): WeeklyQueueState => {
  const profile = useWorkoutStore.getState().profile;
  if (!profile) {
    return {
      sequence: [],
      completedKnown: [],
      unknownCompletedCount: 0,
      remaining: [],
      trainingDaysRemaining: 0,
      nextUp: [],
    };
  }

  const sequence = getWeeklyArchetypeSequence(
    profile.weeklyGoal,
    profile.experienceLevel
  );
  const weekDates = getWeekDates();
  const sessionsThisWeek = readCompletedSessionsSync().filter((session) =>
    weekDates.includes(getSessionLocalDate(session.date))
  );
  const completedKnown: Archetype[] = [];
  let unknownCompletedCount = 0;

  for (const session of sessionsThisWeek) {
    if (session.archetype) {
      completedKnown.push(session.archetype);
    } else {
      unknownCompletedCount += 1;
    }
  }

  const remaining = [...sequence];
  for (const completed of completedKnown) {
    const completedIndex = remaining.indexOf(completed);
    if (completedIndex >= 0) {
      remaining.splice(completedIndex, 1);
    }
  }
  for (let i = 0; i < unknownCompletedCount && remaining.length > 0; i += 1) {
    remaining.shift();
  }

  const todayIndex = (new Date().getDay() + 6) % 7;
  const trainingDays = new Set(profile.trainingDays);
  let trainingDaysRemaining = 0;
  for (let dayIndex = todayIndex; dayIndex < 7; dayIndex += 1) {
    if (trainingDays.has(dayIndex)) {
      trainingDaysRemaining += 1;
    }
  }

  const nextUp = remaining.slice(0, 1);

  return {
    sequence,
    completedKnown,
    unknownCompletedCount,
    remaining,
    trainingDaysRemaining,
    nextUp,
  };
};
