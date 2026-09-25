import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import { useIsFocused } from 'expo-router';
import { useWorkoutStore } from '../../store/workoutStore';
import { getStartOfWeek, toLocalCalendarDate } from '../../store/workoutCalendar';
import { adaptBuildHistory } from './adapter';
import { makeMonolithDemo, MONOLITH_DEMO_NOW } from './monolithDemo';
import { useBuildHistory } from './useBuildHistory';
import { BUILD_DEMO_ENABLED } from './config';

/** History for the Case and its unpacked weeks: the shared derivation, or a demo source. */
export function useArchiveHistory(sourceParam: string | undefined) {
  const demoCount = BUILD_DEMO_ENABLED && ['0', '12', '104', '260'].includes(sourceParam ?? '') ? Number(sourceParam) : null;
  const sessions = useWorkoutStore((state) => state.sessions);
  const focused = useIsFocused();
  const [now, setNow] = useState(() => new Date());
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (mounted) setReduced(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    const app = AppState.addEventListener('change', (value) => { setActive(value === 'active'); if (value === 'active') setNow(new Date()); });
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => { mounted = false; motion.remove(); app.remove(); clearInterval(timer); };
  }, []);
  const weekKey = toLocalCalendarDate(getStartOfWeek(now));
  const demoSessions = useMemo(() => demoCount === null ? null : makeMonolithDemo(demoCount as 0 | 12 | 104 | 260), [demoCount]);
  // Saved history is the shared derivation, read only while this screen is focused.
  const saved = useBuildHistory(weekKey, focused && demoCount === null);
  const demoHistory = useMemo(() => demoSessions ? adaptBuildHistory(demoSessions, MONOLITH_DEMO_NOW) : null, [demoSessions]);
  return { history: demoHistory ?? saved, sessions: demoSessions ?? sessions, demoCount, focused, active, reduced };
}
