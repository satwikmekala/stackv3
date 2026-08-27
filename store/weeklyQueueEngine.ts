import {
  getWeeklyArchetypeSequence,
  type Archetype,
} from '@/constants/archetypes';
import { readCompletedSessionsSync } from '@/store/workoutDatabase';
import {
  deriveDefaultSlots,
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
  /** Local calendar date (YYYY-MM-DD) the nextUp workout is scheduled for,
   *  or null when no training day is left in the week. */
  nextUpDate: string | null;
  /** True when a workout has already been completed today. */
  completedToday: boolean;
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
      nextUpDate: null,
      completedToday: false,
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
  const todayDate = weekDates[todayIndex];
  const completedToday = sessionsThisWeek.some(
    (session) => getSessionLocalDate(session.date) === todayDate
  );
  const trainingDays = new Set(
    profile.trainingDays?.length
      ? profile.trainingDays
      : deriveDefaultSlots(profile.weeklyGoal)
  );

  // Today only still counts as an available training day if nothing has been
  // logged for it yet — otherwise the next workout belongs to a later day.
  const firstOpenIndex = completedToday ? todayIndex + 1 : todayIndex;
  let trainingDaysRemaining = 0;
  let nextTrainingIndex: number | null = null;
  for (let dayIndex = firstOpenIndex; dayIndex < 7; dayIndex += 1) {
    if (trainingDays.has(dayIndex)) {
      trainingDaysRemaining += 1;
      if (nextTrainingIndex === null) nextTrainingIndex = dayIndex;
    }
  }

  const nextUp = remaining.slice(0, 1);
  // With work still queued but no training day scheduled ahead, fall back to
  // the next open calendar day so the workout is still dated rather than
  // silently presented as "today".
  const nextUpDayIndex =
    nextTrainingIndex ?? (firstOpenIndex < 7 ? firstOpenIndex : null);
  const nextUpDate =
    nextUp.length > 0 && nextUpDayIndex !== null ? weekDates[nextUpDayIndex] : null;

  return {
    sequence,
    completedKnown,
    unknownCompletedCount,
    remaining,
    trainingDaysRemaining,
    nextUp,
    nextUpDate,
    completedToday,
  };
};
