import { useState } from 'react';
import { useWorkoutStore } from '../../store/workoutStore';
import { buildHistoryCache, type BuildHistory } from './buildHistoryCache';

function useSharedHistory(weekStart: string, active: boolean, lazy: boolean): BuildHistory | null {
  const sessions = useWorkoutStore((state) => state.sessions);
  const [last, setLast] = useState<BuildHistory | null>(null);
  // A covered or hidden screen keeps showing its last result and never derives on its own.
  if (!active && (lazy || last)) return last;
  const next = buildHistoryCache.get(sessions, weekStart);
  if (next !== last) setLast(next);
  return next;
}

/** Saved history from the shared derivation. Derives (or reuses the cache) only while `active`. */
export const useBuildHistory = (weekStart: string, active = true): BuildHistory => useSharedHistory(weekStart, active, false)!;

/** As useBuildHistory, but returns null instead of deriving until it has first been active. */
export const useLazyBuildHistory = (weekStart: string, active: boolean): BuildHistory | null => useSharedHistory(weekStart, active, true);
