import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, AppState, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';
import { redesignColors as c, redesignFonts as f } from '../../constants/theme';
import { useWorkoutStore } from '../../store/workoutStore';
import { getStartOfWeek, toLocalCalendarDate, parseSessionDate } from '../../store/workoutCalendar';
import { formatWeight } from '../../store/weightUnits';
import { adaptBuildHistory } from './adapter';
import { caseEntries, unpackWeek } from './caseModel';
import { makeMonolithDemo, MONOLITH_DEMO_NOW } from './monolithDemo';
import { DEFAULT_TUNING, GOLD } from './model';
import BuildScene from './BuildScene';
import { BuildPreview } from './BuildPreview';
import { useBuildAccessibility } from './useBuildAccessibility';

const label = (date: string) => parseSessionDate(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const ignoreStats = () => {};
const countLabel = (count: number, singular: string, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`;
export default function Case() {
  const accessibility = useBuildAccessibility();
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string; week?: string }>();
  const demoCount = ['0', '12', '104', '260'].includes(params.source ?? '') ? Number(params.source) : null;
  const sessions = useWorkoutStore((state) => state.sessions);
  const unit = useWorkoutStore((state) => state.profile?.weightUnit ?? 'kg');
  const focused = useIsFocused();
  const [now, setNow] = useState(() => new Date());
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [reduced, setReduced] = useState(true);
  const [selected, setSelected] = useState<string | null>(params.week ?? null);
  const [pieceId, setPieceId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (mounted) setReduced(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    const app = AppState.addEventListener('change', (value) => { setActive(value === 'active'); if (value === 'active') setNow(new Date()); });
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => { mounted = false; motion.remove(); app.remove(); clearInterval(timer); };
  }, []);
  const weekKey = toLocalCalendarDate(getStartOfWeek(now));
  const history = useMemo(() => adaptBuildHistory(demoCount === null ? sessions : makeMonolithDemo(demoCount as 0 | 12 | 104 | 260), demoCount === null ? parseSessionDate(weekKey) : MONOLITH_DEMO_NOW), [demoCount, sessions, weekKey]);
  const entries = useMemo(() => caseEntries(history.state), [history]);
  const week = entries.find((entry) => entry.week?.id === selected)?.week;
  const slabs = useMemo(() => week ? unpackWeek(week) : [], [week]);
  const volume = (kg: number) => `${formatWeight(kg, unit)} ${unit}`;
  const close = () => { setSelected(null); setPieceId(null); setFailed(false); };
  return <SafeAreaView style={s.screen}>
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Back to Build" style={s.button} onPress={() => router.canGoBack() ? router.back() : router.replace('/build')}><Text style={s.link}>← Build</Text></Pressable><Text maxFontSizeMultiplier={1.4} style={s.kicker}>STACK / CASE{demoCount !== null ? ' · DEMO' : ''}</Text></View>
    <FlatList key={accessibility.largeText ? 'large' : 'regular'} data={entries} numColumns={accessibility.largeText ? 1 : 2} keyExtractor={(entry) => entry.id} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={5} contentContainerStyle={s.grid} columnWrapperStyle={accessibility.largeText ? undefined : s.columns}
      ListHeaderComponent={<><Text accessibilityRole="header" maxFontSizeMultiplier={2} style={s.title}>The weeks you built.</Text><Text style={s.intro}>Every session, kept inside.</Text></>}
      ListEmptyComponent={<Text style={s.empty}>Your first completed workout will find its place here.</Text>}
      renderItem={({ item }) => <Pressable accessibilityRole={item.week ? 'button' : undefined} disabled={!item.week} accessibilityLabel={`Week of ${label(item.weekStart)}. ${item.week ? `${countLabel(item.week.metrics.workouts, 'workout')}, ${countLabel(item.week.metrics.records, 'record')}. Unpack week.` : 'No logged workouts.'}`} style={[s.niche, accessibility.largeText && { maxWidth: '100%' }]} onPress={() => { setSelected(item.week!.id); setPieceId(null); setFailed(false); }}>
        <View style={s.preview}>{item.week ? <View style={s.block}>{[...item.week.pieces].reverse().map((piece) => <View key={piece.id} style={{ flex: piece.height, backgroundColor: piece.color }}>{piece.records.length > 0 && <View style={s.gold} />}</View>)}</View> : <View style={s.emptySlot} />}</View>
        <Text style={s.date}>{label(item.weekStart)}</Text><Text style={s.note}>{item.week ? `${countLabel(item.week.metrics.workouts, 'workout')} · ${item.week.sealed ? 'sealed' : 'open'}` : 'No logged workouts'}</Text>
      </Pressable>} />
    <Modal visible={!!week} animationType={reduced || accessibility.reducedMotion ? 'none' : 'slide'} presentationStyle="fullScreen" onRequestClose={close}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}><SafeAreaView style={s.screen}>
        <View style={s.header}><Text maxFontSizeMultiplier={1.4} style={s.kicker}>WEEK OF {week ? label(week.weekStart).toUpperCase() : ''}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close week" onPress={close} style={s.button}><Text style={s.link}>Close</Text></Pressable></View>
        {week && <FlatList data={week.pieces} keyExtractor={(piece) => piece.id} contentContainerStyle={s.details} initialNumToRender={5}
          ListHeaderComponent={<><Text maxFontSizeMultiplier={2} style={s.detailTitle}>Every piece of the week.</Text><View style={s.scene} accessible accessibilityLabel={`${week.pieces.length} unpacked workout pieces, in chronological order from bottom to top.`}>{active && focused && accessibility.ready && !failed && !accessibility.reduceEffects && <BuildScene slabs={slabs} pieceGap={0.22} tuning={DEFAULT_TUNING} lamination="strata" overview reducedMotion={reduced} benchmark={0} onStats={ignoreStats} onSelectSlab={setPieceId} onError={() => setFailed(true)} />}{accessibility.reduceEffects && <View style={{ alignItems: 'center' }}><BuildPreview slabs={slabs} width={230} height={230} /></View>}{failed && <Text style={s.note}>The 3D preview is unavailable. All sessions are listed below.</Text>}</View><Text style={s.summary}>{countLabel(week.metrics.workouts, 'workout')} · {volume(week.metrics.volumeKg)} moved{'\n'}{countLabel(week.metrics.liftsUp, 'lift', 'lifts')} up · {countLabel(week.metrics.records, 'PR')}</Text>{week.previousActiveWeek && <Text style={s.note}>{week.previousActiveWeek.volumeDeltaKg >= 0 ? '+' : '−'}{volume(Math.abs(week.previousActiveWeek.volumeDeltaKg))} vs active week of {label(week.previousActiveWeek.weekStart)}</Text>}</>}
          renderItem={({ item: piece }) => <View style={[s.row, pieceId === piece.id && s.selected]}><View style={[s.pigment, { backgroundColor: piece.color, height: 18 * piece.height }]}>{piece.records.length > 0 && <View style={s.gold} />}</View><Text style={s.rowTitle}>{piece.label}</Text><Text style={s.note}>{label(piece.date)} · {piece.height.toFixed(2)}× thickness</Text><Text style={s.note}>{volume(piece.metrics.volumeKg)} moved · {countLabel(piece.metrics.liftsUp, 'lift', 'lifts')} up · {countLabel(piece.records.length, 'PR')}</Text>{piece.records.map((record) => <Text key={record.exerciseName} style={s.record}>{record.exerciseName}: {volume(record.current.weight)} × {record.current.reps}</Text>)}{demoCount === null && <Pressable accessibilityRole="button" accessibilityLabel={`View ${piece.label} workout on ${label(piece.date)}`} style={s.button} onPress={() => { close(); router.push({ pathname: '/workout-summary', params: { sessionId: piece.sessionId, source: 'history' } }); }}><Text style={s.link}>View workout →</Text></Pressable>}</View>} />}
      </SafeAreaView></SafeAreaProvider>
    </Modal>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ink }, header: { paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }, link: { color: c.bone, fontFamily: f.uiSemiBold, fontSize: 14 }, kicker: { flexShrink: 1, color: c.ash, fontFamily: f.mono, fontSize: 10 },
  title: { color: c.bone, fontFamily: f.display, fontSize: 34, marginHorizontal: 24, marginTop: 22 }, intro: { color: c.ash, marginHorizontal: 24, marginTop: 8, marginBottom: 22, fontFamily: f.ui },
  grid: { paddingHorizontal: 18, paddingBottom: 28 }, columns: { gap: 12 }, niche: { flex: 1, maxWidth: '50%', marginBottom: 16, padding: 12, backgroundColor: '#201B15', borderRadius: 12, borderWidth: 1, borderColor: c.border },
  preview: { height: 100, alignItems: 'center', justifyContent: 'center', backgroundColor: '#15120F', borderRadius: 8, marginBottom: 12 }, block: { width: 92, height: 48, overflow: 'hidden', borderTopRightRadius: 12, transform: [{ skewY: '-8deg' }] }, gold: { height: 2, backgroundColor: GOLD }, emptySlot: { width: 70, height: 2, backgroundColor: '#51483A' },
  date: { color: c.bone, fontFamily: f.uiSemiBold, fontSize: 12 }, note: { color: c.ash, fontFamily: f.ui, fontSize: 12, lineHeight: 19, marginTop: 5 }, empty: { color: c.ash, fontSize: 22, lineHeight: 30, padding: 24 },
  details: { padding: 22, gap: 14 }, detailTitle: { color: c.bone, fontFamily: f.display, fontSize: 29 }, scene: { height: 240, marginVertical: 12, backgroundColor: '#1B1611', borderRadius: 16, overflow: 'hidden' }, summary: { color: c.bone, fontFamily: f.uiMedium, lineHeight: 24 }, row: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: c.border }, selected: { borderColor: c.bone }, rowTitle: { color: c.bone, fontFamily: f.uiSemiBold, fontSize: 17 }, pigment: { width: 76, borderTopRightRadius: 6, overflow: 'hidden', marginBottom: 12 }, record: { color: GOLD, fontFamily: f.ui, fontSize: 12, marginTop: 5 },
});
