import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { applyMuscleColorPreferences, isMuscleColor, type MuscleColor, type MuscleColorPreferences } from '@/constants/muscleColors';
import type { WorkoutType } from '@/store/workoutStore';

const STORAGE_KEY = 'stack-muscle-colors-v1';
const TYPES: WorkoutType[] = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core'];
export const useMuscleColors = create<{
  preferences: MuscleColorPreferences;
  hydrated: boolean;
  saving: boolean;
  error: 'load' | 'save' | null;
}>(() => ({ preferences: {}, hydrated: false, saving: false, error: null }));

let loading: Promise<void> | null = null;
let writing: Promise<void> | null = null;
function publish(preferences: MuscleColorPreferences) {
  applyMuscleColorPreferences(preferences);
  useMuscleColors.setState({ preferences, hydrated: true, saving: false, error: null });
}
export function loadMuscleColors(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const stored = raw ? JSON.parse(raw) : {};
      if (!stored || typeof stored !== 'object' || Array.isArray(stored)) throw Error('Invalid muscle colors');
      const preferences: MuscleColorPreferences = {};
      for (const type of TYPES) {
        if (stored[type] === undefined) continue;
        if (stored[type] !== null && !isMuscleColor(stored[type])) throw Error('Invalid muscle color');
        preferences[type] = stored[type];
      }
      publish(preferences);
    } catch {
      useMuscleColors.setState({ error: 'load' });
    } finally { loading = null; }
  })();
  return loading;
}
export async function saveMuscleColor(type: WorkoutType, color: MuscleColor | null): Promise<boolean> {
  const current = useMuscleColors.getState();
  if (!current.hydrated || current.saving || !TYPES.includes(type) || (color !== null && !isMuscleColor(color))) return false;
  const preferences = { ...current.preferences };
  // Keep an explicit default so old day-only accents cannot override a reset.
  preferences[type] = color;
  useMuscleColors.setState({ saving: true });
  try {
    writing = AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    await writing;
    publish(preferences);
    return true;
  } catch {
    useMuscleColors.setState({ saving: false, error: 'save' });
    return false;
  } finally { writing = null; }
}
export async function clearMuscleColors(): Promise<void> {
  if (loading) await loading;
  if (writing) await writing.catch(() => {});
  await AsyncStorage.removeItem(STORAGE_KEY);
  publish({});
}
