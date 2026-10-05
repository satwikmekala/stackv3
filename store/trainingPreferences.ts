import { getSessionLocalDate } from './workoutCalendar';
import type { UserProfile, WorkoutSession } from './workoutStore';

/** The habit target never changes the automatic program after onboarding. */
export function getProgramFrequency(profile: Pick<UserProfile, 'weeklyGoal' | 'programWeeklyGoal'>): number {
  return Math.max(1, Math.min(6, profile.programWeeklyGoal ?? (profile.weeklyGoal || 3)));
}

export function weeklyTrainingProgress(
  sessions: readonly Pick<WorkoutSession, 'date' | 'completed'>[],
  weekDates: readonly string[],
  goal: number,
) {
  const dates = new Set(weekDates);
  const trained = new Set(sessions.filter(session => session.completed)
    .map(session => getSessionLocalDate(session.date)).filter(date => dates.has(date)));
  return { completed: trained.size, goal };
}

export const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export function trainingDaysLabel(days: readonly number[]) {
  return days.length ? [...days].sort((a, b) => a - b).map(day => WEEKDAY_NAMES[day]?.slice(0, 3)).join(', ') : 'Flexible';
}
