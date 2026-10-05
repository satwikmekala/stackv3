import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { APP_PREFERENCES_KEY, clearAppPreferences, flushAppPreferences, loadAppPreferences, parseAppPreferences } from '@/store/appPreferences';
import { CURRENT_SCHEMA_VERSION, initializeWorkoutDatabase, readInitialWorkoutSnapshot } from '@/store/workoutDatabase';
import { captureWorkoutBackup, restoreWorkoutBackup, validateWorkoutBackup, workoutHistoryCsv, type WorkoutBackup } from '@/store/workoutBackup';
import { useWorkoutStore } from '@/store/workoutStore';
import { clearMuscleColors, loadMuscleColors, useMuscleColors } from '@/store/muscleColors';
import { clearLiftProgressPreferences, loadLiftProgressPreferences, useLiftProgressPreferences } from '@/store/liftProgressPreferences';
import { isMuscleColor } from '@/constants/muscleColors';
import { buildPreferences } from '@/features/build/useBuildAccessibility';
import { BUILD_EFFECTS_KEY } from '@/features/build/preferences';
import { buildIntroduction } from '@/features/build/introductionStore';
import { clearCustomSplitDrafts } from '@/store/customSplitDraft';
import { clearOnboardingDraft } from '@/store/onboardingDraft';
import { clearSharedRoutineHandoff } from '@/store/sharedRoutineHandoff';
import { clearProgramConfigurationDraft } from '@/store/programConfigurationDraft';

const PREFERENCE_KEYS = [APP_PREFERENCES_KEY, 'stack-muscle-colors-v1', 'stack-lift-progress-v1', BUILD_EFFECTS_KEY] as const;
type Preferences = Record<typeof PREFERENCE_KEYS[number], string | null>;
export type StackBackup = WorkoutBackup & { preferences: Preferences };

function requireIdleWorkout() {
  if (useWorkoutStore.getState().currentSession) throw Error('Finish or discard your active workout first.');
}

async function readPreferences(): Promise<Preferences> {
  await flushAppPreferences();
  await buildPreferences.flush();
  return Object.fromEntries(await AsyncStorage.multiGet([...PREFERENCE_KEYS])) as Preferences;
}

function validatePreferences(value: unknown): asserts value is Preferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('This backup is missing its preferences.');
  const prefs = value as Preferences;
  for (const key of PREFERENCE_KEYS) if (!Object.hasOwn(prefs, key) || (prefs[key] !== null && typeof prefs[key] !== 'string'))
    throw Error('This backup has invalid preferences.');
  try {
    parseAppPreferences(prefs[APP_PREFERENCES_KEY]);
    const muscleColors = JSON.parse(prefs['stack-muscle-colors-v1'] ?? '{}');
    if (!muscleColors || typeof muscleColors !== 'object' || Array.isArray(muscleColors) ||
        Object.entries(muscleColors).some(([key, color]) => !['chest', 'back', 'shoulders', 'arms', 'legs', 'core'].includes(key) ||
          (color !== null && !isMuscleColor(color)))) throw Error();
    const lifts = JSON.parse(prefs['stack-lift-progress-v1'] ?? 'null');
    if (lifts !== null && (!Array.isArray(lifts.names) || lifts.names.some((name: unknown) => typeof name !== 'string') ||
        typeof lifts.automatic !== 'boolean')) throw Error();
    if (![null, '0', '1'].includes(prefs[BUILD_EFFECTS_KEY])) throw Error();
  } catch { throw Error('This backup has invalid preferences.'); }
}

async function writePreferences(preferences: Preferences) {
  await AsyncStorage.multiSet(PREFERENCE_KEYS.filter(key => preferences[key] !== null).map(key => [key, preferences[key]!]));
  await AsyncStorage.multiRemove(PREFERENCE_KEYS.filter(key => preferences[key] === null));
}

async function reloadData() {
  const snapshot = await readInitialWorkoutSnapshot();
  useWorkoutStore.setState({ ...snapshot, selectedSet: null, currentCustomSplit: null, savedAdhocRoutineIds: {}, isHydrated: true, hydrationError: null });
  await Promise.all([loadAppPreferences(), loadMuscleColors(), loadLiftProgressPreferences(), buildPreferences.load(true)]);
}

async function shareFile(contents: string, filename: string, mimeType: string, UTI: string) {
  if (Platform.OS === 'web') {
    const link = document.createElement('a');
    const url = URL.createObjectURL(new Blob([contents], { type: mimeType }));
    link.href = url; link.download = filename; link.click();
    URL.revokeObjectURL(url);
    return;
  }
  if (!(await Sharing.isAvailableAsync())) throw Error('File sharing is unavailable on this device.');
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(contents);
  await Sharing.shareAsync(file.uri, { mimeType, UTI, dialogTitle: 'Save Stack data' });
}

const stamp = () => new Date().toISOString().slice(0, 10);
export async function exportHistory() {
  await shareFile(workoutHistoryCsv(useWorkoutStore.getState().sessions), `stack-history-${stamp()}.csv`, 'text/csv', 'public.comma-separated-values-text');
}

export async function exportBackup() {
  requireIdleWorkout();
  if (useMuscleColors.getState().saving || useLiftProgressPreferences.getState().saving) throw Error('Wait for your preferences to finish saving.');
  const preferences = await readPreferences();
  requireIdleWorkout();
  const db = await initializeWorkoutDatabase();
  const backup: StackBackup = { ...captureWorkoutBackup(db, CURRENT_SCHEMA_VERSION), preferences };
  await shareFile(JSON.stringify(backup), `stack-backup-${stamp()}.json`, 'application/json', 'public.json');
}

export async function chooseBackup(): Promise<StackBackup | null> {
  requireIdleWorkout();
  const file = await File.pickFileAsync({ mimeTypes: ['application/json'] });
  if (file.canceled) return null;
  if (file.result.size > 50 * 1024 * 1024) throw Error('This file is too large to be a Stack backup.');
  let value: unknown;
  try { value = JSON.parse(await file.result.text()); } catch { throw Error('Choose a valid Stack backup file.'); }
  const db = await initializeWorkoutDatabase();
  validateWorkoutBackup(value, db, CURRENT_SCHEMA_VERSION);
  validatePreferences((value as StackBackup).preferences);
  return value as StackBackup;
}

export async function restoreBackup(backup: StackBackup) {
  requireIdleWorkout();
  const db = await initializeWorkoutDatabase();
  validateWorkoutBackup(backup, db, CURRENT_SCHEMA_VERSION);
  validatePreferences(backup.preferences);
  const preferences = await readPreferences();
  requireIdleWorkout();
  const previous = captureWorkoutBackup(db, CURRENT_SCHEMA_VERSION);
  try {
    restoreWorkoutBackup(db, backup, CURRENT_SCHEMA_VERSION);
    await writePreferences(backup.preferences);
    await reloadData();
  } catch (error) {
    // SQLite and AsyncStorage cannot share a transaction. Compensate either failure.
    restoreWorkoutBackup(db, previous, CURRENT_SCHEMA_VERSION);
    await writePreferences(preferences);
    await reloadData();
    throw error;
  }
  await Promise.all([clearCustomSplitDrafts(), clearOnboardingDraft(), clearProgramConfigurationDraft(), clearSharedRoutineHandoff()]);
}

export async function deleteAllData() {
  requireIdleWorkout();
  useWorkoutStore.getState().resetAllData();
  if (useWorkoutStore.getState().profile) throw Error('Couldn’t delete your data. Try again.');
  await Promise.all([clearAppPreferences(), clearMuscleColors(), clearLiftProgressPreferences(),
    clearCustomSplitDrafts(), clearOnboardingDraft(), clearProgramConfigurationDraft(), clearSharedRoutineHandoff(), buildPreferences.setReduceEffects(false), buildIntroduction.reset()]);
}
