import type { WorkoutSession } from '@/store/workoutStore';

/** Sessions backed by actual logging, rather than retroactive attendance. */
export function getVerifiedSessions(sessions: readonly WorkoutSession[]): WorkoutSession[] {
  return sessions.filter((session) => session.completed && !session.retroactive);
}
