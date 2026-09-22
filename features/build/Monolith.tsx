import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, AppState, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useIsFocused, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ChevronLeft, ChevronRight, Maximize, Minimize, X } from 'lucide-react-native';
import { redesignColors as c, redesignFonts as f } from '../../constants/theme';
import { useWorkoutStore } from '../../store/workoutStore';
import { getStartOfWeek, parseSessionDate, toLocalCalendarDate } from '../../store/workoutCalendar';
import { formatWeight } from '../../store/weightUnits';
import { adaptBuildHistory } from './adapter';
import { DEFAULT_TUNING, GOLD } from './model';
import { monolithWeeks, pickRulerMarkers } from './monolithModel';
import { makeMonolithDemo, MONOLITH_DEMO_NOW } from './monolithDemo';
import BuildScene from './BuildScene';
import { fusionCoordinator } from './fusionCoordinator';
import { FusionPresentation, type FusionSnapshot } from './FusionPresentation';

const dateLabel = (date: string) => parseSessionDate(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const weekLabel = (date: string) => parseSessionDate(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const ignoreStats = () => {};
const recordLabel = (count: number) => `${count} ${count === 1 ? 'PR' : 'PRs'}`;
type Sheet = 'weeks' | 'current' | 'source' | null;
type Source = 'saved' | 0 | 12 | 104 | 260;
const sources: { value: Source; title: string; detail: string }[] = [
  { value: 'saved', title: 'Your workouts', detail: 'Verified, completed training history' },
  { value: 12, title: 'Demo · three months', detail: 'Mixed workouts, records and a quiet week' },
  { value: 104, title: 'Demo · two years', detail: '104 calendar weeks with training gaps' },
  { value: 260, title: 'Demo · five years', detail: '260 calendar weeks with training gaps' },
  { value: 0, title: 'Demo · empty plinth', detail: 'No workouts, no starter pieces' },
];

export default function Monolith() {
  const router = useRouter();
  const focused = useIsFocused();
  const hydrated = useWorkoutStore((state) => state.isHydrated);
  const sessions = useWorkoutStore((state) => state.sessions);
  const unit = useWorkoutStore((state) => state.profile?.weightUnit ?? 'kg');
  const [source, setSource] = useState<Source>('saved');
  const [now, setNow] = useState(() => new Date());
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [reducedMotion, setReducedMotion] = useState(true);
  const [motionReady, setMotionReady] = useState(false);
  const [fusionSnapshot, setFusionSnapshot] = useState<FusionSnapshot | null>(null);
  const finishFusion = useCallback(() => setFusionSnapshot(null), []);
  useFocusEffect(useCallback(() => finishFusion, [finishFusion]));
  const [overview, setOverview] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [projected, setProjected] = useState<{ id: string; top: number }[]>([]);
  useEffect(() => {
    const app = AppState.addEventListener('change', (state) => { setActive(state === 'active'); if (state === 'active') setNow(new Date()); });
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (mounted) { setReducedMotion(value); setMotionReady(true); } }).catch(() => { if (mounted) setMotionReady(true); });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { mounted = false; app.remove(); motion.remove(); };
  }, []);
  useEffect(() => {
    if (!active || !focused) return;
    const refresh = setTimeout(() => setNow(new Date()), 0);
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => { clearTimeout(refresh); clearInterval(timer); };
  }, [active, focused]);
  const demo = useMemo(() => typeof source === 'number' ? makeMonolithDemo(source) : [], [source]);
  const currentWeekKey = toLocalCalendarDate(getStartOfWeek(now));
  const history = useMemo(() => adaptBuildHistory(source === 'saved' ? sessions : demo, source === 'saved' ? parseSessionDate(currentWeekKey) : MONOLITH_DEMO_NOW), [source, sessions, demo, currentWeekKey]);
  useEffect(() => {
    if (source !== 'saved' || !hydrated || !active || !focused || !motionReady || sheet || fusionSnapshot) return;
    let cancelled = false;
    void fusionCoordinator.reconcile(history.state).then((weekId) => {
      if (!cancelled && weekId && !reducedMotion) {
        setSelectedId(weekId);
        setOverview(false);
        setFusionSnapshot({ state: history.state, weekId, example: false });
      }
    });
    return () => { cancelled = true; };
  }, [source, hydrated, active, focused, motionReady, sheet, fusionSnapshot, history.state, reducedMotion]);
  const entries = useMemo(() => monolithWeeks(history.state, history.slabs), [history]);
  const selected = entries.find((entry) => entry.week.id === selectedId) ?? entries[entries.length - 1];
  const selectedIndex = entries.indexOf(selected);
  const current = history.state.currentWeek;
  const empty = !history.state.pieces.length;
  const markers = useMemo(() => entries.flatMap((entry) => entry.bottom === null || entry.top === null ? [] : [{ id: entry.week.id, y: (entry.bottom + entry.top) / 2 }]), [entries]);
  const focusRange = useMemo(() => selected.bottom === null || selected.top === null ? undefined : { bottom: selected.bottom, top: selected.top }, [selected]);
  const selectWeek = useCallback((id: string) => { setSelectedId(id); setOverview(false); }, []);
  const selectSlab = useCallback((id: string) => {
    const entry = entries.find((item) => item.slabIds.includes(id));
    if (entry) selectWeek(entry.week.id);
  }, [entries, selectWeek]);
  const markerLabels = pickRulerMarkers(projected, selected.week.id);
  const volume = (kg: number) => `${formatWeight(kg, unit)} ${unit}`;
  const close = () => setSheet(null);
  const week = selected.week;

  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close Build" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.icon}><ArrowLeft size={20} color={c.bone} /></Pressable>
      <Text style={styles.brand}>STACK / BUILD</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Choose Build history" onPress={() => setSheet('source')} style={styles.source}><Text style={styles.sourceText}>{source === 'saved' ? 'Your history' : 'Demo'}</Text></Pressable>
    </View>
    <View style={styles.intro}>
      <Text style={styles.eyebrow}>{overview ? 'YOUR STACK · ALL OF IT' : 'YOUR STACK'}{source !== 'saved' ? ' · DEMO' : ''}</Text>
      <Text style={styles.title}>{empty ? 'An empty plinth.' : overview ? 'Your training,\nstanding up.' : `${history.state.sealedWeeks.length} ${history.state.sealedWeeks.length === 1 ? 'week' : 'weeks'} built`}</Text>
      <Text style={styles.caption}>{empty ? 'Finish a session. Your first piece belongs here.' : `${history.state.metrics.workouts} ${history.state.metrics.workouts === 1 ? 'workout' : 'workouts'} · ${volume(history.state.metrics.volumeKg)} moved · ${recordLabel(history.state.metrics.records)}`}</Text>
    </View>
    <View style={styles.stage}>
      <LinearGradient colors={['#13110E', '#2C1D12', '#13110E']} style={StyleSheet.absoluteFill} />
      {active && focused && !fusionSnapshot && <View style={StyleSheet.absoluteFill} accessible accessibilityLabel={empty ? 'Empty plinth. No completed workouts.' : `${history.state.sealedWeeks.length} sealed weekly blocks and ${current.pieces.length} separate current-week pieces. ${overview ? 'Overview' : `Focused on week of ${weekLabel(week.weekStart)}`}.`}>
        <BuildScene slabs={history.slabs} tuning={DEFAULT_TUNING} lamination="strata" paused={sheet !== null} overview={overview} focusRange={focusRange} reducedMotion={reducedMotion} markers={markers} onMarkers={setProjected} onSelectSlab={selectSlab} benchmark={0} onStats={ignoreStats} />
      </View>}
      {!overview && !sheet && <View style={StyleSheet.absoluteFill} pointerEvents="box-none">{markerLabels.map((marker) => {
        const entry = entries.find((item) => item.week.id === marker.id);
        return entry ? <Pressable key={marker.id} accessibilityRole="button" accessibilityLabel={`Focus week of ${weekLabel(entry.week.weekStart)}`} accessibilityState={{ selected: marker.id === week.id }} onPress={() => selectWeek(marker.id)} style={[styles.ruler, { top: marker.top - 22 }]}><Text style={[styles.rulerText, marker.id === week.id && { color: c.bone }]}>{entry.week.sealed ? dateLabel(entry.week.weekStart).toUpperCase() : 'NOW'} ─</Text></Pressable> : null;
      })}</View>}
      <View style={styles.cameraControls}>
        <Pressable accessibilityRole="button" accessibilityLabel={overview ? 'Show Focus' : 'Show Overview'} onPress={() => { setProjected([]); setOverview(!overview); }} style={styles.icon}>{overview ? <Minimize size={19} color={c.bone} /> : <Maximize size={19} color={c.bone} />}</Pressable>
        <Text style={styles.cameraLabel}>{overview ? 'ALL OF IT' : 'FOCUS'}</Text>
      </View>
    </View>
    <View style={styles.footer}>
      {overview ? <View style={styles.metrics}>
        <Metric value={String(history.state.metrics.workouts)} label="WORKOUTS" />
        <Metric value={String(history.state.sealedWeeks.length)} label="WEEKS BUILT" />
        <Metric value={String(history.state.metrics.records)} label="RECORDS" />
      </View> : <View style={styles.weekCard}>
        <Text style={styles.eyebrow}>{week.sealed ? 'SEALED' : 'THIS WEEK · OPEN'} · {dateLabel(week.weekStart).toUpperCase()}–{dateLabel(week.weekEnd).toUpperCase()}</Text>
        <Text style={styles.weekTitle}>{week.pieces.length ? `${week.pieces.length} ${week.pieces.length === 1 ? 'workout' : 'workouts'}, ${week.sealed ? 'one block.' : 'still taking shape.'}` : 'Room for your next session.'}</Text>
        <View style={styles.strata}>{week.pieces.map((piece) => <View key={piece.id} style={[styles.stripe, { backgroundColor: piece.color }]} />)}</View>
        <Text style={styles.caption}>{week.pieces.length ? `${volume(week.metrics.volumeKg)} moved · ${week.metrics.liftsUp} lifts up · ${recordLabel(week.metrics.records)}` : 'Your history stays exactly as you built it.'}</Text>
        {week.sealed && <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/build-case', params: { source: String(source), week: week.id } })} style={styles.detailButton}><Text style={styles.link}>Unpack this week</Text><ChevronRight size={17} color={c.bone} /></Pressable>}
        {!week.sealed && <Pressable accessibilityRole="button" onPress={() => setSheet('current')} style={styles.detailButton}><Text style={styles.link}>This week’s pieces</Text><ChevronRight size={17} color={c.bone} /></Pressable>}
      </View>}
      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/build-case', params: { source: String(source) } })} style={styles.detailButton}><Text style={styles.link}>Open the Case</Text><ChevronRight size={17} color={c.bone} /></Pressable>
      <View style={styles.navigation}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous active week" accessibilityState={{ disabled: selectedIndex === 0 }} disabled={selectedIndex === 0} onPress={() => selectWeek(entries[selectedIndex - 1].week.id)} style={[styles.icon, selectedIndex === 0 && styles.disabled]}><ChevronLeft size={20} color={c.bone} /></Pressable>
        <Pressable accessibilityRole="button" onPress={() => setSheet('weeks')} style={styles.browse}><Text style={styles.link}>Choose a week</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Next active week" accessibilityState={{ disabled: selectedIndex === entries.length - 1 }} disabled={selectedIndex === entries.length - 1} onPress={() => selectWeek(entries[selectedIndex + 1].week.id)} style={[styles.icon, selectedIndex === entries.length - 1 && styles.disabled]}><ChevronRight size={20} color={c.bone} /></Pressable>
      </View>
    </View>
    {fusionSnapshot && <FusionPresentation snapshot={fusionSnapshot} unit={unit} onFinish={finishFusion} />}
    <Modal visible={sheet !== null} animationType={reducedMotion ? 'none' : 'slide'} presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{sheet === 'source' ? 'History source' : sheet === 'weeks' ? 'Your weeks' : 'This week’s pieces'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close Build sheet" onPress={close} style={styles.icon}><X size={20} color={c.bone} /></Pressable></View>
        {sheet === 'source' ? <FlatList data={sources} keyExtractor={(item) => String(item.value)} contentContainerStyle={styles.list} ListHeaderComponent={<Text style={styles.note}>Development preview. Demo sessions are illustrative and never saved to your workout history.</Text>} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityState={{ selected: source === item.value }} onPress={() => { setSource(item.value); setSelectedId(null); setProjected([]); close(); }} style={[styles.listRow, source === item.value && styles.selected]}><Text style={styles.rowTitle}>{item.title}</Text><Text style={styles.note}>{item.detail}</Text></Pressable>} />
          : sheet === 'weeks' ? <FlatList data={[...entries].reverse()} keyExtractor={(item) => item.week.id} contentContainerStyle={styles.list} initialNumToRender={12} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityState={{ selected: item.week.id === week.id }} onPress={() => { selectWeek(item.week.id); close(); }} style={[styles.listRow, item.week.id === week.id && styles.selected]}><Text style={styles.rowTitle}>{item.week.sealed ? `Week of ${weekLabel(item.week.weekStart)}` : 'This week · open'}</Text><View style={styles.strata}>{item.week.pieces.map((piece) => <View key={piece.id} style={[styles.stripe, { backgroundColor: piece.color }]} />)}</View><Text style={styles.note}>{item.week.metrics.workouts} {item.week.metrics.workouts === 1 ? 'workout' : 'workouts'} · {volume(item.week.metrics.volumeKg)} · {recordLabel(item.week.metrics.records)}</Text></Pressable>} />
            : <FlatList data={current.pieces} keyExtractor={(piece) => piece.id} contentContainerStyle={styles.list} ListHeaderComponent={<Text style={styles.note}>{dateLabel(current.weekStart)}–{dateLabel(current.weekEnd)} · Open{source !== 'saved' ? ' · Demo' : ''}{'\n'}Each completed workout is a separate piece until this week closes.</Text>} ListEmptyComponent={<Text style={styles.empty}>Nothing built this week yet. Your next completed session adds a piece here.</Text>} renderItem={({ item: piece }) => <View style={styles.listRow}><View style={[styles.piece, { backgroundColor: piece.color, height: 18 * piece.height }]}>{piece.records.length > 0 && <View style={styles.goldSeam} />}</View><Text style={styles.rowTitle}>{piece.label} · {parseSessionDate(piece.date).toLocaleDateString(undefined, { weekday: 'long' })}</Text><Text style={styles.note}>{volume(piece.metrics.volumeKg)} moved · {piece.metrics.liftsUp} lifts up · {recordLabel(piece.metrics.records)}</Text><Text style={styles.note}>{piece.height.toFixed(2)}× thickness{piece.records.length ? ` · ${piece.records.map((record) => record.exerciseName).join(', ')}` : ''}</Text></View>} />}
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}
function Metric({ value, label }: { value: string; label: string }) { return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ink },
  header: { paddingHorizontal: 20, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#241E18' },
  brand: { color: c.bone, fontFamily: f.mono, fontSize: 10, letterSpacing: 2 },
  source: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  sourceText: { color: c.ash, fontFamily: f.uiMedium, fontSize: 12 },
  intro: { paddingHorizontal: 26, paddingTop: 22 },
  eyebrow: { color: c.ash, fontFamily: f.mono, fontSize: 9, letterSpacing: 1.5 },
  title: { color: c.bone, fontFamily: f.display, fontSize: 34, lineHeight: 37, letterSpacing: -1, marginTop: 10 },
  caption: { color: c.ash, fontFamily: f.ui, fontSize: 12, lineHeight: 18, marginTop: 6 },
  stage: { flex: 1, minHeight: 140 },
  cameraControls: { position: 'absolute', right: 16, top: '40%', gap: 9, alignItems: 'center' },
  cameraLabel: { color: c.ash, fontFamily: f.mono, fontSize: 8, letterSpacing: 1 },
  ruler: { position: 'absolute', left: 18, height: 44, justifyContent: 'center', minWidth: 54 },
  rulerText: { color: '#918371', fontFamily: f.mono, fontSize: 8 },
  footer: { paddingHorizontal: 22, paddingBottom: 8, gap: 12 },
  weekCard: { padding: 16, backgroundColor: '#201B15', borderWidth: 1, borderColor: c.border, borderRadius: 16 },
  weekTitle: { fontFamily: f.display, fontSize: 22, color: c.bone, marginTop: 8 },
  strata: { flexDirection: 'row', gap: 3, marginTop: 10 },
  stripe: { flex: 1, height: 4, borderRadius: 2 },
  detailButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginTop: 6 },
  link: { color: c.bone, fontFamily: f.uiSemiBold, fontSize: 13 },
  navigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  browse: { minHeight: 44, paddingHorizontal: 24, justifyContent: 'center' },
  disabled: { opacity: 0.3 },
  metrics: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#241E18' },
  metricValue: { color: c.bone, fontFamily: f.display, fontSize: 27 },
  metricLabel: { color: c.ash, fontFamily: f.mono, fontSize: 8, marginTop: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 22 },
  sheetTitle: { color: c.bone, fontFamily: f.display, fontSize: 28, flex: 1 },
  list: { paddingHorizontal: 22, paddingBottom: 32, gap: 12 },
  listRow: { borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 16, gap: 6 },
  selected: { borderColor: c.ash, backgroundColor: '#241E18' },
  rowTitle: { color: c.bone, fontFamily: f.uiSemiBold, fontSize: 16 },
  note: { color: c.ash, fontFamily: f.ui, fontSize: 13, lineHeight: 20 },
  empty: { color: c.bone, fontFamily: f.display, fontSize: 24, lineHeight: 30, marginTop: 20 },
  piece: { width: 76, borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
  goldSeam: { height: 2, backgroundColor: GOLD },
});
