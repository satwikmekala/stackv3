import {
  getSessionLocalDate,
  getStartOfWeek,
  getWeekDates,
  parseSessionDate,
  type WorkoutSession,
} from '@/store/workoutStore';

export interface HistoryWeekGroup {
  weekStart: Date;
  weekEnd: Date;
  sessions: WorkoutSession[];
}

export interface HistoryGroups {
  thisWeek: WorkoutSession[];
  pastWeeks: HistoryWeekGroup[];
}

const sortSessionsDescending = (
  sessions: WorkoutSession[]
): WorkoutSession[] =>
  sessions.sort(
    (a, b) =>
      parseSessionDate(b.date).getTime() - parseSessionDate(a.date).getTime()
  );

export function deriveHistoryGroups(
  sessions: WorkoutSession[]
): HistoryGroups {
  const currentWeekDates = new Set(getWeekDates());
  const thisWeek: WorkoutSession[] = [];
  const pastWeeksByStart = new Map<number, HistoryWeekGroup>();

  sessions.forEach((session) => {
    if (!session.completed) return;

    if (currentWeekDates.has(getSessionLocalDate(session.date))) {
      thisWeek.push(session);
      return;
    }

    const weekStart = getStartOfWeek(parseSessionDate(session.date));
    const weekStartTime = weekStart.getTime();
    const existingGroup = pastWeeksByStart.get(weekStartTime);

    if (existingGroup) {
      existingGroup.sessions.push(session);
      return;
    }

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    pastWeeksByStart.set(weekStartTime, {
      weekStart,
      weekEnd,
      sessions: [session],
    });
  });

  const pastWeeks = Array.from(pastWeeksByStart.values())
    .map((group) => ({
      ...group,
      sessions: sortSessionsDescending(group.sessions),
    }))
    .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());

  return {
    thisWeek: sortSessionsDescending(thisWeek),
    pastWeeks,
  };
}
