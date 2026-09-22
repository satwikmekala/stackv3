import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { redesignColors as c, redesignFonts as f } from '../../constants/theme';
import { useWorkoutStore } from '../../store/workoutStore';
import { getStartOfWeek, parseSessionDate, toLocalCalendarDate } from '../../store/workoutCalendar';
import { adaptBuildHistory } from './adapter';
import { BuildPreview } from './BuildPreview';

export default function BuildHome() {
  const router = useRouter();
  const sessions = useWorkoutStore((state) => state.sessions);
  const hydrated = useWorkoutStore((state) => state.isHydrated);
  const [week, setWeek] = useState(() => toLocalCalendarDate(getStartOfWeek(new Date())));
  const refresh = useCallback(() => setWeek(toLocalCalendarDate(getStartOfWeek(new Date()))), []);
  useFocusEffect(useCallback(() => { refresh(); const timer = setInterval(refresh, 60_000); return () => clearInterval(timer); }, [refresh]));
  useEffect(() => { const subscription = AppState.addEventListener('change', (value) => { if (value === 'active') refresh(); }); return () => subscription.remove(); }, [refresh]);
  const history = useMemo(() => adaptBuildHistory(sessions, parseSessionDate(week)), [sessions, week]);
  if (!hydrated) return null;
  const count = history.state.metrics.workouts;
  const weeks = history.state.sealedWeeks.length;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open your Build. ${count ? `${count} ${count === 1 ? 'workout' : 'workouts'}, ${weeks} sealed ${weeks === 1 ? 'week' : 'weeks'}.` : 'Your first completed workout creates a piece.'}`} onPress={() => router.push('/build')} style={s.card}>
    <BuildPreview slabs={history.slabs} /><View style={s.copy}><Text style={s.kicker}>YOUR BUILD</Text><Text style={s.title}>{count ? `${count} ${count === 1 ? 'workout' : 'workouts'}. Taking shape.` : 'Your first piece is ahead.'}</Text><Text style={s.detail}>{count ? `${weeks} ${weeks === 1 ? 'week' : 'weeks'} built · View your Stack` : 'Complete a workout to begin.'}</Text></View><Text style={s.arrow}>›</Text>
  </Pressable>;
}
const s = StyleSheet.create({ card: { marginTop: 16, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: c.border, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }, copy: { flex: 1 }, kicker: { color: c.ash, fontFamily: f.mono, fontSize: 9, letterSpacing: 1.2 }, title: { color: c.bone, fontFamily: f.uiMedium, fontSize: 14, marginTop: 6 }, detail: { color: c.ash, fontFamily: f.ui, fontSize: 12, lineHeight: 18, marginTop: 4 }, arrow: { color: c.ash, fontSize: 24, paddingRight: 6 } });
