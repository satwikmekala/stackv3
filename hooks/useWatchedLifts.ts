import { useEffect, useMemo } from 'react';
import { resolveWatchedLifts, type LiftProgress } from '@/store/liftProgress';
import { loadLiftProgressPreferences, saveWatchedLifts, useLiftProgressPreferences } from '@/store/liftProgressPreferences';

export function useWatchedLifts(lifts: readonly LiftProgress[]) {
  const preferences = useLiftProgressPreferences();
  const names = useMemo(() => resolveWatchedLifts(lifts, preferences.names, preferences.automatic),
    [lifts, preferences.names, preferences.automatic]);

  useEffect(() => {
    if (!useLiftProgressPreferences.getState().hydrated) void loadLiftProgressPreferences();
  }, []);

  useEffect(() => {
    // Synchronize durable defaults only after hydration; manual selections are never backfilled.
    if (!preferences.hydrated || preferences.saving || preferences.error || !preferences.automatic || names.length === 0) return;
    if (JSON.stringify(names) !== JSON.stringify(preferences.names)) void saveWatchedLifts(names, true);
  }, [names, preferences]);

  return { names, preferences };
}
