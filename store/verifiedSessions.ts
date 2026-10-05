import type { WorkoutSession } from '@/store/workoutStore';

/** Sessions backed by actual logging, rather than retroactive attendance. */
export function getVerifiedSessions(sessions: readonly WorkoutSession[]): WorkoutSession[] {
  return sessions.filter((session) => session.completed && !session.retroactive);
}

/** Hevy history informs performance, but V1 cannot reconstruct exact Build evidence. */
export function getBuildSessions(sessions: readonly WorkoutSession[]): WorkoutSession[] {
  return getVerifiedSessions(sessions).filter(session => !session.imported);
}
