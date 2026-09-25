import { Component, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentProps, type ReactNode } from 'react';
import { AppState, InteractionManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';
import { redesignColors as c, redesignFonts as f } from '../../constants/theme';
import { useWorkoutStore } from '../../store/workoutStore';
import { getStartOfWeek, toLocalCalendarDate } from '../../store/workoutCalendar';
import { BuildPreview } from './BuildPreview';
import { buildCounts, pendingWeekClose } from './buildCounts';
import { fusionCoordinator } from './fusionCoordinator';
import { buildHistoryCache } from './buildHistoryCache';
import { buildIntroduction } from './introductionStore';
import { homeModuleCopy } from './homeModuleCopy';
import { useLazyBuildHistory } from './useBuildHistory';

// Read once at Home's module load, well before Home's first frame; later writes publish in memory.
void buildIntroduction.load();
void fusionCoordinator.load();
const NO_SLABS: [] = [];

type Entering = ComponentProps<typeof Animated.View>['entering'];

/**
 * Home's first frame and every focus stay cheap: the text uses plain counts, and the tower
 * preview reads the shared derivation only after Home's entrance and interactions settle.
 */
type Props = { entering?: Entering; previewDelayMs?: number };
/** Build must never affect Home: any error inside the card renders nothing instead. */
class BuildHomeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { if (__DEV__) console.warn('[Build Home card hidden]', error.message); }
  render() { return this.state.failed ? null : this.props.children; }
}
export default function BuildHome(props: Props) {
  return <BuildHomeBoundary><BuildHomeCard {...props} /></BuildHomeBoundary>;
}

function BuildHomeCard({ entering, previewDelayMs = 0 }: Props) {
  const router = useRouter();
  const sessions = useWorkoutStore((state) => state.sessions);
  const hydrated = useWorkoutStore((state) => state.isHydrated);
  const introductionSeen = useSyncExternalStore(buildIntroduction.subscribe, buildIntroduction.getSnapshot, buildIntroduction.getSnapshot);
  const fusionMarker = useSyncExternalStore(fusionCoordinator.subscribe, fusionCoordinator.getSnapshot, fusionCoordinator.getSnapshot);
  const [week, setWeek] = useState(() => toLocalCalendarDate(getStartOfWeek(new Date())));
  const [previewReady, setPreviewReady] = useState(false);
  // Only the first focus waits for Home's entrance; later focuses wait for interactions alone.
  const entranceDelay = useRef(previewDelayMs);
  const refresh = useCallback(() => setWeek(toLocalCalendarDate(getStartOfWeek(new Date()))), []);
  useFocusEffect(useCallback(() => {
    refresh();
    const timer = setInterval(refresh, 60_000);
    const wait = entranceDelay.current;
    entranceDelay.current = 0;
    let task: { cancel: () => void } | undefined;
    let delay: ReturnType<typeof setTimeout> | undefined;
    // A warm cache (e.g. casting just derived this history) costs nothing to show now.
    if (buildHistoryCache.peek(useWorkoutStore.getState().sessions, toLocalCalendarDate(getStartOfWeek(new Date())))) setPreviewReady(true);
    else task = InteractionManager.runAfterInteractions(() => { delay = setTimeout(() => setPreviewReady(true), wait); });
    return () => { clearInterval(timer); task?.cancel(); clearTimeout(delay); setPreviewReady(false); };
  }, [refresh]));
  useEffect(() => { const subscription = AppState.addEventListener('change', (value) => { if (value === 'active') refresh(); }); return () => subscription.remove(); }, [refresh]);
  const counts = useMemo(() => buildCounts(sessions, week), [sessions, week]);
  // A sealed week fusion hasn't presented yet shows the pre-close count, never the new total.
  const pendingClose = useMemo(() => pendingWeekClose(counts, week, fusionMarker), [counts, week, fusionMarker]);
  // Hidden or not yet settled: keep the last preview (or the placeholder) and never derive.
  const history = useLazyBuildHistory(week, previewReady);
  const ready = hydrated && introductionSeen !== null && fusionMarker !== undefined;
  const copy = homeModuleCopy({ seen: introductionSeen ?? true, weeksBuilt: counts.weeksBuilt, piecesThisWeek: counts.piecesThisWeek, pendingClose });
  // The card, its preview and its copy lines are laid out from the first frame so nothing below moves.
  return <Animated.View entering={entering}>
    <Pressable accessibilityRole="button" accessibilityLabel={ready ? copy.a11y : undefined} accessibilityElementsHidden={!ready} disabled={!ready} onPress={() => router.push('/build')} style={s.card}>
      <BuildPreview slabs={history?.slabs ?? NO_SLABS} />
      <View style={[s.copy, !ready && s.pending]}><Text style={s.kicker}>{copy.kicker}</Text><Text style={s.title}>{copy.title}</Text>{copy.detail && <Text style={s.detail}>{copy.detail}</Text>}</View><ChevronRight size={18} color={c.ash} style={s.chevron} />
    </Pressable>
  </Animated.View>;
}
const s = StyleSheet.create({ card: { marginTop: 16, minHeight: 104, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: c.border, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }, copy: { flex: 1 }, pending: { opacity: 0 }, kicker: { color: c.ash, fontFamily: f.mono, fontSize: 9, letterSpacing: 1.2 }, title: { color: c.bone, fontFamily: f.uiMedium, fontSize: 14, marginTop: 6 }, detail: { color: c.ash, fontFamily: f.ui, fontSize: 12, lineHeight: 18, marginTop: 4 }, chevron: { marginRight: 6 } });
