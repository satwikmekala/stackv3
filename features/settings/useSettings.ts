import { settingsErrorCopy } from './copy';
import { useEffect, useRef, useState } from 'react';
import { unitLabel } from '@/store/weightUnits';
import { Alert, AppState, Linking, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { requireOptionalNativeModule } from 'expo';
import Constants from 'expo-constants';
import { useWorkoutStore } from '@/store/workoutStore';
import { getProgramFrequency, trainingDaysLabel, WEEKDAY_NAMES } from '@/store/trainingPreferences';
import { loadAppPreferences, saveAppPreference, useAppPreferences, type AppPreferences } from '@/store/appPreferences';
import { buildPreferences, useBuildAccessibility } from '@/features/build/useBuildAccessibility';
import { FIRST_RUN_ROUTE } from '@/features/onboarding/config';
import { BUILD_SANDBOX_ENABLED } from '@/features/build/config';
import { chooseBackup, deleteAllData, exportBackup, exportHistory, restoreBackup } from './data';
import { SETTINGS_PAGES, type SettingsPage, type SettingsRow, type SettingsSection } from './types';
import { REMINDER_SETTINGS_COPY } from '@/constants/notifications';
import { reminderTimeLabel } from '@/services/notifications/time';

export const SETTINGS_TITLES: Record<SettingsPage, string> = {
  name: 'Name', goal: 'Weekly goal', schedule: 'Training schedule', program: 'Stack’s plan',
  unit: 'Weight unit', adjustments: 'Weight adjustments', data: 'Manage data', about: 'Help and about',
  reminders: REMINDER_SETTINGS_COPY.title,
};

function liveActivityAvailability() {
  if (Platform.OS !== 'ios' || Number.parseFloat(String(Platform.Version)) < 16.2 ||
      !requireOptionalNativeModule('ExpoWidgets')) return 'unsupported';
  const module = requireOptionalNativeModule<{ areLiveActivitiesEnabled?: () => boolean }>('StackWorkoutControls');
  if (!module?.areLiveActivitiesEnabled) return 'unknown';
  return module.areLiveActivitiesEnabled() ? 'available' : 'denied';
}

export function useSettings() {
  const router = useRouter();
  const params = useLocalSearchParams<{ page?: string }>();
  const page = SETTINGS_PAGES.includes(params.page as SettingsPage) ? params.page as SettingsPage : null;
  const profile = useWorkoutStore(state => state.profile);
  const preferences = useAppPreferences();
  const effects = useBuildAccessibility();
  const [name, setName] = useState(profile?.name ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const busyRef = useRef(false);
  const [availability, setAvailability] = useState(liveActivityAvailability);
  useEffect(() => {
    void loadAppPreferences();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setAvailability(liveActivityAvailability());
    });
    return () => subscription.remove();
  }, []);

  const open = (nextPage: SettingsPage) => {
    if (!busyRef.current) {
      if (nextPage === 'reminders') router.push('/workout-reminders');
      else router.push({ pathname: '/settings', params: { page: nextPage } });
    }
  };
  const back = () => {
    if (busyRef.current) return;
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile');
  };
  const updateProfile = (updates: Parameters<ReturnType<typeof useWorkoutStore.getState>['updateProfile']>[0]) => {
    useWorkoutStore.getState().updateProfile(updates);
  };
  const run = async (id: string, action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(id);
    try { await action(); }
    catch (error) { Alert.alert('Couldn’t complete that', settingsErrorCopy(id, error)); }
    finally { busyRef.current = false; setBusy(null); }
  };
  const savePreference = (key: keyof AppPreferences, value: boolean) => {
    void run(key, async () => {
      if (!(await saveAppPreference(key, value))) throw Error('Couldn’t save your preference. Try again.');
    });
  };
  const saveName = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    updateProfile({ name: trimmed });
    if (useWorkoutStore.getState().profile?.name === trimmed) back();
  };
  const importBackup = () => {
    void run('restore', async () => {
      const backup = await chooseBackup();
      if (!backup) return;
      Alert.alert('Restore this backup?',
        'This replaces your workouts, routines, notes and preferences with the backup. Export a backup of your current data first if you want to keep it.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Restore', style: 'destructive', onPress: () => {
          void run('restore', async () => { await restoreBackup(backup); Alert.alert('Backup restored', 'My Stack data is ready.'); });
        } }]);
    });
  };
  const confirmDelete = () => Alert.alert('Delete all data?',
    'All workouts, routines, notes, records and preferences will be removed from this device. This cannot be undone. Export a backup first if you want to keep them.',
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete all data', style: 'destructive', onPress: () => {
      void run('delete', async () => { await deleteAllData(); router.replace(FIRST_RUN_ROUTE); });
    } }]);

  const link = (id: SettingsPage, label: string, value?: string): SettingsRow => ({ id, kind: 'link', label, page: id, value });
  const choice = (id: string, label: string, selected: boolean, onPress: () => void): SettingsRow => ({ id, kind: 'choice', label, selected, onPress });
  const action = (id: string, label: string, onPress: () => void, destructive = false): SettingsRow => ({
    id, kind: 'action', label: busy === id ? ({ csv: 'Exporting…', backup: 'Exporting…', restore: 'Restoring…', delete: 'Deleting…', retry: 'Loading preferences…' }[id] ?? 'Saving…') : label, onPress, destructive, disabled: Boolean(busy),
  });
  const activeWorkout = Boolean(useWorkoutStore(state => state.currentSession));
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const build = Constants.expoConfig?.ios?.buildNumber;

  function sections(page: SettingsPage | null): SettingsSection[] {
    if (!profile) return [];
    if (!page) return [
      { id: 'personal', title: 'Personal', rows: [
        link('name', 'Name', profile.name || 'Add name'),
        link('goal', 'Weekly goal', profile.weeklyGoal > 0 ? `${profile.weeklyGoal} ${profile.weeklyGoal === 1 ? 'training day' : 'training days'}` : 'None'),
        link('schedule', 'Training schedule', profile.trainingDays.length ? `${profile.trainingDays.length} planned ${profile.trainingDays.length === 1 ? 'day' : 'days'}` : 'Flexible'),
      ] },
      { id: 'workout', title: 'Workout', rows: [
        link('unit', 'Weight unit', unitLabel(profile.weightUnit)),
        link('adjustments', 'Weight adjustments', `${profile.weightUnit === 'kg' ? profile.weightIncrement : profile.weightIncrementLbs} ${unitLabel(profile.weightUnit)}`),
        { id: 'liveActivities', kind: 'toggle', label: 'Live Activities', value: preferences.liveActivities && availability === 'available',
          disabled: availability !== 'available' || !preferences.ready || preferences.error || preferences.saving,
          onChange: value => savePreference('liveActivities', value) },
        { id: 'haptics', kind: 'toggle', label: 'Haptic feedback', value: preferences.haptics,
          disabled: !preferences.ready || preferences.error || preferences.saving, onChange: value => savePreference('haptics', value) },
        ...(availability === 'denied' ? [action('system', 'Open iPhone Settings', () => { void Linking.openSettings(); })] : []),
      ], footer: availability === 'available' ? 'Live Activities show your active workout on the Lock Screen and Dynamic Island.'
        : availability === 'denied' ? 'Live Activities are disabled in iPhone Settings.'
          : availability === 'unsupported' ? 'Live Activities are available on supported iPhones.' : 'Live Activities are unavailable in this app build.' },
      ...(BUILD_SANDBOX_ENABLED ? [{ id: 'experience', title: 'Experience', rows: [
        { id: 'effects', kind: 'toggle' as const, label: 'Reduce effects', value: effects.reduceEffects,
          disabled: !effects.ready, onChange: (value: boolean) => { void run('effects', async () => { await buildPreferences.setReduceEffects(value); }); } },
      ], footer: 'Use simpler Stack previews and skip celebrations. System Reduce Motion is always respected.' }] : []),
      { id: 'reminders', title: REMINDER_SETTINGS_COPY.title, rows: [
        link('reminders', REMINDER_SETTINGS_COPY.title, profile.remindersEnabled
          ? `${trainingDaysLabel(profile.trainingDays)} · ${reminderTimeLabel(profile.reminderTime)}` : REMINDER_SETTINGS_COPY.off),
      ] },
      { id: 'dataSupport', rows: [link('data', 'Manage data'), link('about', 'Help and about')] },
      ...(preferences.error ? [{ id: 'preferenceError', footer: 'Your workout preferences couldn’t be read. Retry before making changes.',
        rows: [action('retry', 'Retry loading preferences', () => { void run('retry', loadAppPreferences); })] }] : []),
    ];
    if (page === 'name') return [{ id: 'name', footer: 'The name Stack uses to greet you.', rows: [
      { id: 'name', kind: 'input', label: 'Your name', value: name, onChange: setName },
    ] }];
    if (page === 'goal') return [{ id: 'goal', footer: 'Each day with a completed workout counts once. Your goal is separate from your plan and schedule.', rows: [
      choice('none', 'No weekly goal', profile.weeklyGoal === 0, () => updateProfile({ weeklyGoal: 0 })),
      ...Array.from({ length: 7 }, (_, index) => index + 1).map(value => choice(`goal-${value}`, `${value} ${value === 1 ? 'training day' : 'training days'} a week`, profile.weeklyGoal === value, () => updateProfile({ weeklyGoal: value }))),
    ] }];
    if (page === 'schedule') return [
      { id: 'days', title: 'Planned days', footer: 'Planned days appear in Progress and date your next workout from Stack’s plan. Leave them off for a flexible schedule.', rows: WEEKDAY_NAMES.map((label, day) => ({
        id: `day-${day}`, kind: 'toggle', label, value: profile.trainingDays.includes(day), onChange: (selected: boolean) => {
          const days = new Set(useWorkoutStore.getState().profile?.trainingDays ?? []);
          if (selected) days.add(day); else days.delete(day);
          updateProfile({ trainingDays: [...days].sort((a, b) => a - b) });
        },
      })) },
      { id: 'program', footer: 'Your weekly goal counts training days; Stack’s plan counts workouts.', rows: [link('program', 'Stack’s plan', `${getProgramFrequency(profile)} ${getProgramFrequency(profile) === 1 ? 'workout' : 'workouts'}`)] },
    ];
    if (page === 'program') return [
      { id: 'frequency', title: 'Workouts per week', footer: profile.programMode === 'stack'
        ? 'Changes update upcoming workouts in Stack’s plan. Your active workout and history stay.'
        : 'These preferences apply to Stack’s plan. Your active plan stays the same.', rows:
        [1, 2, 3, 4, 5, 6].map(value => choice(`program-${value}`, `${value} ${value === 1 ? 'workout' : 'workouts'}`, getProgramFrequency(profile) === value, () => updateProfile({ programWeeklyGoal: value }))) },
      { id: 'structure', title: 'Three workouts a week', footer: 'Choose the workout order for a plan with three workouts a week.', rows: [
        choice('full-body', 'Full body', profile.threeDayStructure === 'full-body', () => updateProfile({ threeDayStructure: 'full-body' })),
        choice('push-pull-legs', 'Push / Pull / Legs', profile.threeDayStructure === 'push-pull-legs', () => updateProfile({ threeDayStructure: 'push-pull-legs' })),
      ] },
    ];
    if (page === 'unit') return [{ id: 'unit', footer: 'Used for new workouts, Progress, records and reports. You can change an exercise’s unit while logging.', rows: [
      choice('kg', 'Kilograms (kg)', profile.weightUnit === 'kg', () => updateProfile({ weightUnit: 'kg', weightUnitConfirmed: true })),
      choice('lbs', 'Pounds (lb)', profile.weightUnit === 'lbs', () => updateProfile({ weightUnit: 'lbs', weightUnitConfirmed: true })),
    ] }];
    if (page === 'adjustments') return [
      ...(['kg', 'lbs'] as const).map(unit => ({ id: unit, title: unit === 'kg' ? 'Kilograms' : 'Pounds', rows:
        (unit === 'kg' ? [0.5, 1, 1.25, 1.5, 2.5, 5] : [1, 2.5, 5, 10]).map(value => choice(`${unit}-${value}`, `${value} ${unitLabel(unit)}`,
          (unit === 'kg' ? profile.weightIncrement : profile.weightIncrementLbs) === value,
          () => updateProfile(unit === 'kg' ? { weightIncrement: value } : { weightIncrementLbs: value }))),
        footer: unit === 'lbs' ? 'The + and − buttons use the step for the exercise’s unit, including in Live Activities. These steps do not change progression suggestions or completed sets.' : undefined,
      })),
    ];
    if (page === 'data') return [
      { id: 'export', title: 'Export', rows: [
        action('csv', 'Export workout history', () => { void run('csv', exportHistory); }),
      ], footer: 'A CSV of completed workouts and set values for spreadsheets. Timed sets keep their duration in seconds; weights are in kilograms.' },
      { id: 'backup', title: 'Backup', rows: [
        { ...action('backup', 'Export backup', () => { void run('backup', exportBackup); }), disabled: activeWorkout || Boolean(busy) },
        { ...action('restore', 'Restore backup', importBackup), disabled: activeWorkout || Boolean(busy) || Platform.OS === 'web' },
      ], footer: activeWorkout ? 'Finish or discard your active workout before backing up, restoring or deleting data.'
        : 'Backups include workouts, saved routines, notes and preferences; unsaved drafts are excluded. Restoring replaces this device’s data and clears drafts.' },
      { id: 'delete', rows: [{ ...action('delete', 'Delete all data', confirmDelete, true), disabled: activeWorkout || Boolean(busy) }],
        footer: 'Removes all Stack data from this device and returns to setup.' },
    ];
    return [
      { id: 'version', rows: [{ id: 'version', kind: 'info', label: 'Stack', value: build ? `${version} (${build})` : version }] },
      { id: 'stackHelp', rows: [action('stack-introduction', 'How My Stack grows', () => router.push('/stack-help'))] },
      { id: 'logging', title: 'Logging workouts', footer: 'Stack restores previous values when available and keeps edited targets. Tap a “Try” suggestion to choose an increase.', rows: [] },
      { id: 'goalHelp', title: 'Your week', footer: `Your goal measures training days. Your schedule marks preferred days (${trainingDaysLabel(profile.trainingDays)}). Stack’s plan sets your workout order.`, rows: [] },
      { id: 'privacy', title: 'Your data', footer: 'Your workout data stays on this device; Stack has no cloud sync. You choose when to share exports and backups.', rows: [] },
    ];
  }
  return { profile, open, back, sections, name, saveName, busy, page };
}
