import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState, Linking, Platform } from 'react-native';
import { REMINDER_SETTINGS_COPY as copy } from '@/constants/notifications';
import { useWorkoutStore } from '@/store/workoutStore';
import { WEEKDAY_NAMES } from '@/store/trainingPreferences';
import { notificationPermissionGranted, readReminderPermission, requestReminderPermission } from '@/services/notifications/permissions';
import { rescheduleNotifications } from '@/services/notifications/scheduling';
import { reminderTimeFromDate } from '@/services/notifications/time';
import type { SettingsSection } from './types';

type Permission = 'loading' | 'granted' | 'denied' | 'undetermined' | 'unavailable';

export function useReminderSettings() {
  const profile = useWorkoutStore(state => state.profile);
  const [permission, setPermission] = useState<Permission>('loading');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const focused = useRef(false);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    if (!locked.current) setBusy(false);
    let disposed = false;
    let readRevision = 0;
    const check = async () => {
      // Foreground refreshes can overlap; only the latest read may update settings.
      const revision = ++readRevision;
      try {
        const result = await readReminderPermission();
        if (disposed || revision !== readRevision || locked.current) return;
        const granted = result && notificationPermissionGranted(result);
        setPermission(!result ? 'unavailable' : granted ? 'granted' : result.status === 'denied' ? 'denied' : 'undetermined');
        if (!granted && useWorkoutStore.getState().profile?.remindersEnabled) {
          useWorkoutStore.getState().updateProfile({ remindersEnabled: false });
        }
        void rescheduleNotifications();
      } catch (error) {
        if (!disposed && revision === readRevision) setPermission('unavailable');
        console.error('[notifications] Settings permission read failed', error);
      }
    };
    void check();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void check(); });
    return () => { disposed = true; focused.current = false; subscription.remove(); };
  }, []));

  const setEnabled = async (enabled: boolean) => {
    if (locked.current) return;
    if (!enabled) {
      useWorkoutStore.getState().updateProfile({ remindersEnabled: false });
      return;
    }
    locked.current = true;
    setBusy(true);
    try {
      const result = await requestReminderPermission();
      if (!focused.current) return;
      const granted = Boolean(result && notificationPermissionGranted(result));
      setPermission(!result ? 'unavailable' : granted ? 'granted' : 'denied');
      useWorkoutStore.getState().updateProfile({ remindersEnabled: granted });
      void rescheduleNotifications();
    } catch (error) {
      if (focused.current) setPermission('unavailable');
      console.error('[notifications] Enable reminders failed', error);
    } finally {
      locked.current = false;
      if (focused.current) setBusy(false);
    }
  };
  const sections: SettingsSection[] = profile ? [
    { id: 'enabled', footer: permission === 'denied'
      ? Platform.OS === 'ios' ? copy.deniedIos : copy.deniedAndroid
      : permission === 'unavailable' ? copy.unavailable
        : profile.remindersEnabled && !profile.trainingDays.length ? copy.chooseDays : undefined,
    rows: [
      { id: 'enabled', kind: 'toggle', label: copy.title, value: profile.remindersEnabled && permission === 'granted',
        disabled: busy || permission === 'loading' || permission === 'unavailable', onChange: value => { void setEnabled(value); } },
      ...(permission === 'denied' ? [{ id: 'system', kind: 'action' as const, label: copy.openSettings,
        onPress: () => { void Linking.openSettings().catch(error => console.error('[notifications] Open Settings failed', error)); } }] : []),
    ] },
    { id: 'days', title: copy.days, footer: copy.sharedDays, rows: WEEKDAY_NAMES.map((label, day) => ({
      id: `day-${day}`, kind: 'toggle', label, value: profile.trainingDays.includes(day), onChange: selected => {
        const days = new Set(useWorkoutStore.getState().profile?.trainingDays ?? []);
        if (selected) days.add(day); else days.delete(day);
        useWorkoutStore.getState().updateProfile({ trainingDays: [...days].sort((a, b) => a - b) });
      },
    })) },
  ] : [];
  return { profile, busy, sections, setTime: (date: Date) => {
    useWorkoutStore.getState().updateProfile({ reminderTime: reminderTimeFromDate(date) });
  } };
}
