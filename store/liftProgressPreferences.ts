import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'stack-lift-progress-v1';
type PreferenceError = 'load' | 'save' | null;
type LiftPreferences = {
  names: string[] | null;
  automatic: boolean;
  hydrated: boolean;
  saving: boolean;
  error: PreferenceError;
};

export const useLiftProgressPreferences = create<LiftPreferences>(() => ({
  names: null, automatic: true, hydrated: false, saving: false, error: null,
}));

let loading: Promise<void> | null = null;
let pendingWrite: Promise<void> | null = null;
export function loadLiftProgressPreferences(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const value = stored ? JSON.parse(stored) : null;
      if (value && (!Array.isArray(value.names) || !value.names.every((name: unknown) => typeof name === 'string')
        || typeof value.automatic !== 'boolean')) throw new Error('Invalid lift preferences');
      useLiftProgressPreferences.setState({
        names: value ? [...new Set<string>(value.names)].slice(0, 2) : null,
        automatic: value?.automatic ?? true, hydrated: true, error: null,
      });
    } catch {
      useLiftProgressPreferences.setState({ hydrated: true, error: 'load' });
    } finally {
      loading = null;
    }
  })();
  return loading;
}

/** Publish only after the write succeeds, so Done never falsely promises a saved choice. */
export async function saveWatchedLifts(names: readonly string[], automatic = false): Promise<boolean> {
  const current = useLiftProgressPreferences.getState();
  if (!current.hydrated || current.error === 'load' || current.saving) return false;
  const next = [...new Set(names)].slice(0, 2);
  useLiftProgressPreferences.setState({ saving: true });
  try {
    pendingWrite = AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ names: next, automatic }));
    await pendingWrite;
    useLiftProgressPreferences.setState({ names: next, automatic, saving: false, error: null });
    return true;
  } catch {
    useLiftProgressPreferences.setState({ saving: false, error: 'save' });
    return false;
  } finally {
    pendingWrite = null;
  }
}

export async function clearLiftProgressPreferences(): Promise<void> {
  // A reset must finish after any in-flight read/write, so old choices cannot reappear.
  if (loading) await loading;
  if (pendingWrite) await pendingWrite.catch(() => {});
  await AsyncStorage.removeItem(STORAGE_KEY);
  useLiftProgressPreferences.setState({ names: null, automatic: true, hydrated: true, saving: false, error: null });
}
