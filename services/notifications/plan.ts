import { DEFAULT_REMINDER_TIME, NOTIFICATION_COPY, NOTIFICATION_DESTINATION } from '@/constants/notifications';
import { getSessionLocalDate, getStartOfWeek, toLocalCalendarDate } from '@/store/workoutCalendar';
import { weeklyTrainingProgress } from '@/store/trainingPreferences';
import type { UserProfile, WorkoutSession } from '@/store/workoutStore';
import { reminderTimeDate } from './time';

type Profile = Pick<UserProfile, 'remindersEnabled' | 'reminderTime' | 'trainingDays' | 'weeklyGoal'>;
export type NotificationPlanItem = {
  identifier: string;
  date: Date;
  title: string;
  body: string;
  data: { url: typeof NOTIFICATION_DESTINATION };
};
type Inputs = {
  now: Date;
  profile: Profile;
  sessions: readonly Pick<WorkoutSession, 'date' | 'completed'>[];
  permissionGranted: boolean;
  inProgress: boolean;
  nextName: string | null;
};

/** Calendar ordinals stay stable across timezone/DST offsets; no rotation writes. */
function calendarOrdinal(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}
function interpolate(template: string, next: string | null, done: number, goal: number) {
  return template.replace(/\{next\}|\{done\}|\{goal\}/g, token =>
    token === '{next}' ? next ?? '' : String(token === '{done}' ? done : goal));
}

export function buildNotificationPlan({ now, profile, sessions, permissionGranted, inProgress, nextName }: Inputs): NotificationPlanItem[] {
  if (!permissionGranted) return [];
  const start = getStartOfWeek(now);
  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return toLocalCalendarDate(date);
  });
  const { completed: done, goal } = weeklyTrainingProgress(sessions, weekDates, profile.weeklyGoal);
  const today = toLocalCalendarDate(now);
  const completedToday = sessions.some(session => session.completed && getSessionLocalDate(session.date) === today);
  const goalMet = goal >= 1 && done >= goal;
  const days = new Set(profile.trainingDays);
  const reminders: Date[] = [];
  if (profile.remindersEnabled && days.size && !inProgress) {
    for (let offset = 0; offset < 14; offset += 1) {
      const day = new Date(now);
      day.setDate(now.getDate() + offset);
      if (!days.has((day.getDay() + 6) % 7)) continue;
      const date = reminderTimeDate(profile.reminderTime, day);
      const key = toLocalCalendarDate(date);
      if (date <= now || (key === today && completedToday)) continue;
      // Today's progress says nothing about future weeks.
      if (goalMet && weekDates.includes(key)) continue;
      reminders.push(date);
    }
  }

  const saturday = new Date(start);
  saturday.setDate(start.getDate() + 5);
  const weeklyDate = reminderTimeDate(profile.remindersEnabled ? profile.reminderTime : DEFAULT_REMINDER_TIME, saturday);
  const weekly = goal >= 2 && done === goal - 1 && weeklyDate > now && !(inProgress && now.getDay() === 6);
  const saturdayKey = toLocalCalendarDate(saturday);
  const dates = weekly ? reminders.filter(date => toLocalCalendarDate(date) !== saturdayKey) : reminders;
  const pool = nextName !== null ? NOTIFICATION_COPY.withNext : NOTIFICATION_COPY.noPlan;
  // Seed from the first pending date, then advance per scheduled reminder.
  // Same inputs rebuild identically; consecutive entries never repeat (except
  // the deliberately single-line no-plan pool).
  const seed = dates.length ? calendarOrdinal(dates[0]) : 0;
  const plan: NotificationPlanItem[] = dates.map((date, index) => {
    const copy = pool[(seed + index) % pool.length];
    return {
      identifier: `stack-reminder-${toLocalCalendarDate(date)}`,
      date, title: interpolate(copy.title, nextName, done, goal), body: interpolate(copy.body, nextName, done, goal),
      data: { url: NOTIFICATION_DESTINATION },
    };
  });
  if (weekly) {
    const copy = NOTIFICATION_COPY.weekly[Math.floor(calendarOrdinal(start) / 7) % NOTIFICATION_COPY.weekly.length];
    plan.push({
      identifier: `stack-weekly-${toLocalCalendarDate(start)}`, date: weeklyDate,
      title: copy.title, body: interpolate(copy.body, nextName, done, goal), data: { url: NOTIFICATION_DESTINATION },
    });
  }
  return plan.sort((a, b) => a.date.getTime() - b.date.getTime());
}
