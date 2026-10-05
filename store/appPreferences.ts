import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export const APP_PREFERENCES_KEY = 'stack-settings-v1';
export type AppPreferences = { haptics: boolean; liveActivities: boolean };
export const DEFAULT_APP_PREFERENCES: AppPreferences = { haptics: true, liveActivities: true };
export const useAppPreferences = create<AppPreferences & { ready: boolean; saving: boolean; error: boolean }>(() => ({
  ...DEFAULT_APP_PREFERENCES, ready: false, saving: false, error: false,
}));
let loading: Promise<void> | null = null;
let writing: Promise<boolean> | null = null;
let revision = 0;

export function parseAppPreferences(raw: string | null): AppPreferences {
  if (!raw) return { ...DEFAULT_APP_PREFERENCES };
  const value = JSON.parse(raw);
  if (typeof value?.haptics !== 'boolean' || typeof value?.liveActivities !== 'boolean') throw Error('Invalid preferences');
  return { haptics: value.haptics, liveActivities: value.liveActivities };
}

export function loadAppPreferences(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    if (writing) await writing;
    const started = revision;
    try {
      const values = parseAppPreferences(await AsyncStorage.getItem(APP_PREFERENCES_KEY));
      if (revision === started) useAppPreferences.setState({ ...values, ready: true, error: false });
    } catch {
      // An unread preference cannot authorize visibility or feedback.
      if (revision === started) useAppPreferences.setState({ haptics: false, liveActivities: false, ready: true, error: true });
    } finally { loading = null; }
  })();
  return loading;
}

export function saveAppPreference(key: keyof AppPreferences, value: boolean): Promise<boolean> {
  const state = useAppPreferences.getState();
  if (!state.ready || state.saving || state.error) return Promise.resolve(false);
  revision++;
  useAppPreferences.setState({ saving: true });
  const next = { haptics: state.haptics, liveActivities: state.liveActivities, [key]: value };
  writing = (async () => {
    try {
      await AsyncStorage.setItem(APP_PREFERENCES_KEY, JSON.stringify(next));
      useAppPreferences.setState({ ...next, saving: false });
      return true;
    } catch {
      useAppPreferences.setState({ saving: false });
      return false;
    } finally { writing = null; }
  })();
  return writing;
}

export async function flushAppPreferences() { if (loading) await loading; if (writing) await writing; }
export async function clearAppPreferences() {
  await flushAppPreferences();
  await AsyncStorage.removeItem(APP_PREFERENCES_KEY);
  useAppPreferences.setState({ ...DEFAULT_APP_PREFERENCES, ready: true, saving: false, error: false });
}
