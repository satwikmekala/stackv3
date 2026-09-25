import type { WorkoutSession } from '../../store/workoutStore';
import { parseSessionDate } from '../../store/workoutCalendar';
import { adaptBuildHistory } from './adapter';

export type BuildHistory = ReturnType<typeof adaptBuildHistory>;

/**
 * One derivation for the whole app per (sessions array, current week start). Every Build
 * surface reads the same result, so the evidence engine runs at most once per sessions change.
 */
export function createBuildHistoryCache(derive: typeof adaptBuildHistory = adaptBuildHistory) {
  let key: { sessions: readonly WorkoutSession[]; weekStart: string } | null = null;
  let value: BuildHistory | null = null;
  return {
    get(sessions: readonly WorkoutSession[], weekStart: string): BuildHistory {
      if (!value || !key || key.sessions !== sessions || key.weekStart !== weekStart) {
        value = derive(sessions, parseSessionDate(weekStart));
        key = { sessions, weekStart };
      }
      return value;
    },
    /** The cached result, only when it already matches; never derives. */
    peek(sessions: readonly WorkoutSession[], weekStart: string): BuildHistory | null {
      return value && key?.sessions === sessions && key.weekStart === weekStart ? value : null;
    },
  };
}

export const buildHistoryCache = createBuildHistoryCache();
