import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, AppState, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect, useIsFocused, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Maximize, Minimize, SlidersHorizontal, X } from 'lucide-react-native';
import { redesignColors as c, redesignFonts as f } from '../../constants/theme';
import BuildScene from './BuildScene';
import { DEFAULT_TUNING, HEIGHTS, HISTORY_PRESETS, makeHistoryFixture, makeObjectFixture, type Lamination } from './model';
import type { RenderStats } from './sceneTypes';
import { useWorkoutStore } from '../../store/workoutStore';
import { adaptBuildHistory } from './adapter';
import { EVIDENCE_DEMO_NOW, EVIDENCE_DEMO_SESSIONS } from './evidenceDemo';
import { EvidenceInspector } from './EvidenceInspector';

function Choice({ text, selected, onPress, disabled = false }: { text: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress}
    style={[styles.chip, selected && styles.selectedChip, disabled && { opacity: 0.35 }]}>
    <Text style={[styles.chipText, selected && { color: c.bone }]}>{text}</Text>
  </Pressable>;
}

export default function BuildSandbox() {
  const router = useRouter();
  const focused = useIsFocused();
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [tweaks, setTweaks] = useState(false);
  const [mode, setMode] = useState<'object' | 'history' | 'evidence'>('object');
  const sessions = useWorkoutStore((state) => state.sessions);
  const unit = useWorkoutStore((state) => state.profile?.weightUnit ?? 'kg');
  const [example, setExample] = useState(false);
  const [inspect, setInspect] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [weeks, setWeeks] = useState(10);
  const [bucket, setBucket] = useState(0);
  const [record, setRecord] = useState(false);
  const [sealed, setSealed] = useState(false);
  const [overview, setOverview] = useState(false);
  const [lamination, setLamination] = useState<Lamination>('strata');
  const [tuning, setTuning] = useState(DEFAULT_TUNING);
  const [benchmark, setBenchmark] = useState(0);
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<RenderStats | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => { setActive(state === 'active'); if (state === 'active') setNow(new Date()); setRunning(false); setBenchmark(0); });
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { subscription.remove(); motion.remove(); };
  }, []);
  useFocusEffect(useCallback(() => () => { setBenchmark(0); setRunning(false); }, []));
  useEffect(() => {
    if (!running) return;
    const timeout = setTimeout(() => { setRunning(false); setBenchmark(0); }, 16000);
    return () => clearTimeout(timeout);
  }, [running]);

  useEffect(() => {
    if (mode !== 'evidence' || !focused || !active || running) return;
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, [mode, focused, active, running]);
  const history = useMemo(() => adaptBuildHistory(
    mode === 'evidence' ? example ? EVIDENCE_DEMO_SESSIONS : sessions : [],
    example ? EVIDENCE_DEMO_NOW : now,
    { compressionFactor: tuning.compression },
  ), [mode, example, sessions, now, tuning.compression]);
  const slabs = useMemo(() => mode === 'evidence' ? history.slabs : mode === 'history'
    ? makeHistoryFixture(weeks, tuning.compression)
    : makeObjectFixture(bucket, record, sealed, tuning.compression), [mode, history.slabs, weeks, bucket, record, sealed, tuning.compression]);
  const onStats = useCallback((result: RenderStats) => { setStats(result); setRunning(false); }, []);
  const configure = (change: () => void) => { setStats(null); setBenchmark(0); setRunning(false); change(); };
  const title = mode === 'evidence' ? history.state.pieces.length ? 'Your work,\naccounted for.' : 'An empty plinth.' : mode === 'history' ? weeks === 0 ? 'An empty plinth.' : 'Time,\nmade tangible.' : sealed ? 'One week.\nEvery colour kept.' : record ? 'A record,\ncast in gold.' : bucket ? 'Progress has\nsubstance.' : 'You showed up.\nIt has weight.';

  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close Build sandbox" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.iconButton}><ArrowLeft size={20} color={c.bone} /></Pressable>
      <Text style={styles.eyebrow}>STACK / BUILD</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Open object tuning" disabled={running} onPress={() => setTweaks(true)} style={styles.iconButton}><SlidersHorizontal size={19} color={c.bone} /></Pressable>
    </View>
    <View style={styles.intro}>
      <Text style={styles.kicker}>{mode === 'evidence' ? 'TRAINING EVIDENCE · 02' : 'OBJECT STUDY · 01'}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.caption}>{mode === 'evidence' && !example ? 'Development sandbox · saved history' : 'Development sandbox · illustrative history'}</Text>
    </View>
    <View style={styles.stage} accessibilityLabel={slabs.length ? `${mode === 'evidence' ? `${history.state.sealedWeeks.length} sealed weeks and ${history.state.currentWeek.pieces.length} current pieces` : mode === 'history' ? `${weeks} sealed weeks and two current pieces` : 'One keyed slab'}. ${slabs.some((slab) => slab.layers.some((layer) => layer.record)) ? 'Gold record treatment.' : ''}` : 'Empty plinth, no workout geometry'}>
      <LinearGradient colors={['#13110E', '#281B11', '#13110E']} style={StyleSheet.absoluteFill} />
      {focused && active && <BuildScene slabs={slabs} tuning={tuning} lamination={lamination} overview={overview} reducedMotion={reducedMotion} benchmark={benchmark} onStats={onStats} />}
      <View style={styles.viewControl}>
        <Pressable accessibilityRole="button" accessibilityLabel={overview ? 'Show Focus view' : 'Show Overview view'} disabled={running} onPress={() => configure(() => setOverview(!overview))} style={styles.iconButton}>
          {overview ? <Minimize size={19} color={c.bone} /> : <Maximize size={19} color={c.bone} />}
        </Pressable>
        <Text style={styles.viewLabel}>{overview ? 'ALL OF IT' : 'FOCUS'}</Text>
      </View>
    </View>
    <View style={styles.controls}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Choice text="The object" selected={mode === 'object'} disabled={running} onPress={() => configure(() => setMode('object'))} />
        <Choice text="The Monolith" selected={mode === 'history'} disabled={running} onPress={() => configure(() => setMode('history'))} />
        <Choice text="Evidence" selected={mode === 'evidence'} disabled={running} onPress={() => configure(() => { setNow(new Date()); setMode('evidence'); })} />
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.options}>
        {mode === 'evidence' ? <>
          <Choice text="Saved workouts" selected={!example} disabled={running} onPress={() => configure(() => setExample(false))} />
          <Choice text="Example history" selected={example} disabled={running} onPress={() => configure(() => setExample(true))} />
        </> : mode === 'object'
          ? HEIGHTS.map((height, index) => <Choice key={height} text={`${height.toFixed(2)}×`} selected={bucket === index} disabled={running || sealed} onPress={() => configure(() => setBucket(index))} />)
          : HISTORY_PRESETS.map((count) => <Choice key={count} text={`${count} wk`} selected={weeks === count} disabled={running} onPress={() => configure(() => { setWeeks(count); setOverview(true); })} />)}
      </ScrollView>
      {mode === 'evidence' ? <Pressable accessibilityRole="button" disabled={running} onPress={() => setInspect(true)} style={{ minHeight: 36, justifyContent: 'center' }}><Text style={styles.label}>Inspect evidence · {history.state.metrics.workouts} {history.state.metrics.workouts === 1 ? 'workout' : 'workouts'} →</Text></Pressable> : mode === 'object' ? <View style={styles.switchRow}>
        <Text style={styles.label}>Record</Text><Switch accessibilityLabel="Gold record treatment" value={record} disabled={running} onValueChange={(value) => configure(() => setRecord(value))} trackColor={{ true: '#8E7131' }} />
        <View style={{ flex: 1 }} /><Text style={styles.label}>Sealed week</Text><Switch accessibilityLabel="Weekly composite" value={sealed} disabled={running} onValueChange={(value) => configure(() => setSealed(value))} trackColor={{ true: c.hi }} />
      </View> : <Text style={styles.note}>{weeks ? `${weeks} sealed blocks · 2 loose pieces · no hidden session meshes` : 'Nothing built in advance. The first workout creates the first piece.'}</Text>}
      <View style={styles.measurement}>
        <Text style={styles.stats}>{running ? 'Measuring 10 seconds after warmup…' : stats ? `${stats.fps.toFixed(1)} fps · p95 ${stats.p95Ms.toFixed(1)} ms\n${stats.calls} draws · ${stats.triangles.toLocaleString()} triangles · ${stats.geometries} geometries` : 'Still scenes render on demand.'}</Text>
        <Pressable accessibilityRole="button" disabled={running} onPress={() => { setStats(null); setRunning(true); setBenchmark((value) => value + 1); }} style={styles.measureButton}>
          <Text style={styles.measureText}>{running ? 'Running' : 'Measure'}</Text>
        </Pressable>
      </View>
    </View>
    <EvidenceInspector state={history.state} visible={inspect} onClose={() => setInspect(false)} unit={unit} example={example} />
    <Modal visible={tweaks} animationType={reducedMotion ? 'none' : 'slide'} presentationStyle="pageSheet" onRequestClose={() => setTweaks(false)}>
      <SafeAreaView style={styles.sheet}>
        <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Object tuning</Text><Pressable accessibilityRole="button" accessibilityLabel="Close tuning" onPress={() => setTweaks(false)} style={styles.iconButton}><X color={c.bone} size={20} /></Pressable></View>
        <ScrollView contentContainerStyle={styles.sheetBody}>
          <Text style={styles.label}>WEEKLY LAMINATION</Text>
          {([['strata-inlay', 'Strata + top inlay'], ['strata', 'Full strata'], ['edge-grain', 'Compressed edge grain']] as const).map(([value, label]) => <Choice key={value} text={label} selected={lamination === value} onPress={() => configure(() => setLamination(value))} />)}
          <Text style={styles.sectionLabel}>KEY CORNER</Text><View style={styles.row}>{[0.14, 0.24, 0.4].map((value) => <Choice key={value} text={value.toFixed(2)} selected={tuning.chamfer === value} onPress={() => configure(() => setTuning({ ...tuning, chamfer: value }))} />)}</View>
          <Text style={styles.sectionLabel}>GOLD SEAM</Text><View style={styles.row}>{[0.012, 0.022, 0.035].map((value, index) => <Choice key={value} text={['Fine', 'Classic', 'Bold'][index]} selected={tuning.seam === value} onPress={() => configure(() => setTuning({ ...tuning, seam: value }))} />)}</View>
          <Text style={styles.sectionLabel}>WEEK COMPRESSION</Text><View style={styles.row}>{[0.25, 0.35, 0.5].map((value) => <Choice key={value} text={value.toFixed(2)} selected={tuning.compression === value} onPress={() => configure(() => setTuning({ ...tuning, compression: value }))} />)}</View>
          <Text style={styles.note}>Tuning changes rendered geometry only. No workouts are created or changed. Camera motion respects Reduce Motion.</Text>
          <Choice text="Reset tuning" selected={false} onPress={() => configure(() => { setTuning(DEFAULT_TUNING); setLamination('strata'); })} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ink },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 8 },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#241E18', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: c.bone, fontFamily: f.mono, fontSize: 11, letterSpacing: 3 },
  intro: { paddingHorizontal: 28, paddingTop: 25 },
  kicker: { color: c.accent, fontFamily: f.mono, fontSize: 9, letterSpacing: 2 },
  title: { color: c.bone, fontFamily: f.display, fontSize: 36, lineHeight: 39, marginTop: 12, letterSpacing: -1.3 },
  caption: { color: c.ash, fontFamily: f.ui, fontSize: 12, marginTop: 10 },
  stage: { flex: 1, minHeight: 160 },
  viewControl: { position: 'absolute', right: 22, top: '42%', alignItems: 'center', gap: 10 },
  viewLabel: { fontFamily: f.mono, color: c.ash, fontSize: 8, letterSpacing: 1 },
  controls: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12, gap: 14 },
  row: { flexDirection: 'row', gap: 8 },
  chip: { minHeight: 42, paddingHorizontal: 16, paddingVertical: 11, borderWidth: 1, borderColor: c.border, borderRadius: 12, justifyContent: 'center' },
  selectedChip: { backgroundColor: c.raised, borderColor: c.ash },
  chipText: { fontFamily: f.uiSemiBold, fontSize: 13, color: c.ash },
  options: { gap: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  label: { fontFamily: f.uiMedium, fontSize: 13, color: c.bone },
  note: { fontFamily: f.ui, color: c.ash, fontSize: 12, lineHeight: 18 },
  measurement: { borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 55 },
  stats: { fontFamily: f.mono, color: c.ash, fontSize: 9, lineHeight: 16, flex: 1 },
  measureButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  measureText: { fontFamily: f.uiSemiBold, fontSize: 13, color: c.bone },
  sheet: { flex: 1, backgroundColor: c.surface },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24 },
  sheetTitle: { fontFamily: f.display, color: c.bone, fontSize: 28 },
  sheetBody: { paddingHorizontal: 24, paddingBottom: 40, gap: 14 },
  sectionLabel: { fontFamily: f.mono, fontSize: 10, letterSpacing: 2, color: c.ash, marginTop: 20 },
});
