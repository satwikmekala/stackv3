import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, BackHandler, Pressable, ScrollView, StyleSheet, Text, View, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { redesignColors as c, redesignFonts as f } from '../../constants/theme';
import { useWorkoutStore } from '../../store/workoutStore';
import { adaptBuildHistory } from './adapter';
import { getStartOfWeek, toLocalCalendarDate } from '../../store/workoutCalendar';
import { useLazyBuildHistory } from './useBuildHistory';
import { castingGate, castingTimeline, createStallWatchdog, PREPARATION_TIMEOUT_MS, type CastingPhase } from './casting';
import { beatForPhase, beatHolds, castingAnnouncement, castingCopy, castingStaticContent, type CastingBeat } from './castingCopy';
import { pieceCategory } from './buildFormat';
import { EVIDENCE_DEMO_NOW, EVIDENCE_DEMO_SESSIONS } from './evidenceDemo';
import { DEFAULT_TUNING, GOLD } from './model';
import BuildScene from './BuildScene';
import { BuildPreview } from './BuildPreview';
import { createPresentationRun } from './presentation';
import { useBuildAccessibility } from './useBuildAccessibility';

const ignoreStats = () => {};
function RendererFailure(): never { throw new Error('Development-only casting fallback check'); }
/**
 * preparing: claiming; playing: the animated sequence; static: the final state for Reduce
 * Motion / VoiceOver / Reduce effects / large text; away: backgrounded before Beat 4, so the
 * claim was released and the sequence restarts from Beat 1 when the app returns.
 */
type Mode = 'preparing' | 'playing' | 'static' | 'away';
export default function CastingScreen({ sessionId, demo, onFinish, forceFailure = false }: {
  sessionId: string; demo: boolean; onFinish: () => void; forceFailure?: boolean;
}) {
  const accessibility = useBuildAccessibility();
  const sessions = useWorkoutStore((state) => state.sessions);
  const unit = useWorkoutStore((state) => state.profile?.weightUnit ?? 'kg');
  const source = demo ? EVIDENCE_DEMO_SESSIONS : sessions;
  // Saved history is the shared derivation: with Home covered underneath, completion derives once in total.
  const [weekStart] = useState(() => toLocalCalendarDate(getStartOfWeek(new Date())));
  const saved = useLazyBuildHistory(weekStart, !demo);
  const demoHistory = useMemo(() => demo ? adaptBuildHistory(EVIDENCE_DEMO_SESSIONS, EVIDENCE_DEMO_NOW) : null, [demo]);
  const history = (demoHistory ?? saved)!;
  const piece = history.state.currentWeek.pieces.find((item) => item.sessionId === (demo ? 'demo-3' : sessionId));
  const eligible = Boolean(piece && history.slabs.at(-1)?.id === piece.id);
  const [mode, setMode] = useState<Mode>('preparing');
  const [run, setRun] = useState(0);
  const [paused, setPaused] = useState(false);
  const [phase, setPhase] = useState<CastingPhase>('form');
  const [playbackDone, setPlaybackDone] = useState(false);
  const presentation = useRef<ReturnType<typeof createPresentationRun> | null>(null);
  const stall = useRef<ReturnType<typeof createStallWatchdog> | null>(null);
  const skipRewards = useRef(accessibility.skipRewards);
  const modeRef = useRef(mode);
  // An assistive setting turned on mid-sequence settles on the static final screen.
  const shown: Mode = mode === 'playing' && accessibility.skipRewards ? 'static' : mode;
  useEffect(() => { modeRef.current = mode; skipRewards.current = accessibility.skipRewards; });
  // Only a playing sequence switches; preparation decides for itself once the claim settles.
  const toStatic = useCallback(() => setMode((current) => current === 'playing' ? 'static' : current), []);
  const fail = useCallback(() => { presentation.current?.failure(); onFinish(); }, [onFinish]);
  const skip = useCallback(() => { presentation.current?.skip(); onFinish(); }, [onFinish]);
  const onAppState = useCallback((next: AppStateStatus) => {
    const action = presentation.current?.appState(next) ?? 'none';
    if (action === 'pause') { setPaused(true); stall.current?.pause(); }
    else if (action === 'resume') { setPaused(false); stall.current?.resume(); }
    else if (action === 'end') {
      // Backgrounded before Beat 4: nothing was persisted; start over from Beat 1 on return.
      stall.current?.dispose();
      presentation.current = null;
      setPaused(false); setPhase('form'); setPlaybackDone(false); setMode('away');
    }
  }, []);
  useEffect(() => {
    if (!accessibility.ready || mode !== 'preparing') return;
    if (!eligible) { if (!demo) castingGate.discard(sessionId); onFinish(); return; }
    let mounted = true;
    // Only claiming and the motion check can time out here; GL creation is never on this clock.
    const timeout = setTimeout(() => { mounted = false; onFinish(); }, PREPARATION_TIMEOUT_MS);
    void Promise.all([
      demo ? Promise.resolve(true) : castingGate.claim(sessionId, AsyncStorage),
      AccessibilityInfo.isReduceMotionEnabled().catch(() => true),
    ]).then(([claimed, reduced]) => {
      if (!mounted) { if (claimed && !demo) castingGate.release(sessionId); return; }
      clearTimeout(timeout);
      // Storage failure or replay: this completion can only reach the summary.
      if (!claimed) { onFinish(); return; }
      presentation.current = createPresentationRun(demo
        ? { commit: () => {}, release: () => {} }
        : { commit: () => { void castingGate.commit(sessionId, AsyncStorage); }, release: () => castingGate.release(sessionId) });
      setMode(reduced || skipRewards.current ? 'static' : 'playing');
      if (AppState.currentState !== 'active') onAppState(AppState.currentState);
    }, () => { if (mounted) { clearTimeout(timeout); onFinish(); } });
    return () => { mounted = false; clearTimeout(timeout); };
  }, [demo, eligible, onFinish, sessionId, accessibility.ready, mode, run, onAppState]);
  useEffect(() => {
    const app = AppState.addEventListener('change', (next) => {
      if (next === 'active' && modeRef.current === 'away') { setRun((value) => value + 1); setMode('preparing'); }
      onAppState(next);
    });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced) => { if (reduced) toStatic(); });
    const back = BackHandler.addEventListener('hardwareBackPress', () => { skip(); return true; });
    return () => { app.remove(); motion.remove(); back.remove(); };
  }, [onAppState, toStatic, skip]);
  // Leaving without the final beat or Skip never uses the casting up.
  useEffect(() => () => { presentation.current?.dispose(); stall.current?.dispose(); }, []);
  const copy = useMemo(() => piece ? castingCopy({
    piece, unit,
    category: pieceCategory(source.find((session) => session.id === piece.sessionId), piece.label),
    weekPosition: history.state.currentWeek.pieces.indexOf(piece) + 1,
    firstEver: history.state.pieces[0]?.id === piece.id,
  }) : null, [piece, unit, source, history]);
  // Keyed on the beats only: a store update mid-playback must not re-time the renderer.
  const beatKey = copy?.beats.join(',') ?? '';
  const timeline = useMemo(() => castingTimeline(beatKey ? beatHolds(beatKey.split(',').map(Number) as CastingBeat[]) : []), [beatKey]);
  // Stall detection on the renderer's own clamped clock; a completed playback waits for Done.
  useEffect(() => {
    if (shown !== 'playing') return;
    const watchdog = createStallWatchdog(fail);
    stall.current = watchdog;
    return () => { watchdog.dispose(); if (stall.current === watchdog) stall.current = null; };
  }, [shown, run, fail]);
  const onProgress = useCallback((playbackMs: number) => stall.current?.frame(playbackMs), []);
  const onComplete = useCallback(() => { stall.current?.complete(); setPlaybackDone(true); }, []);
  const slabId = piece?.id;
  const casting = useMemo(() => slabId ? { slabId, onPhase: setPhase, animationTime: timeline.animationTime, onProgress, onComplete } : undefined, [slabId, timeline, onProgress, onComplete]);
  const playing = shown === 'playing';
  // Preparation shows Beat 1 too; the renderer's phases then advance through the earned beats.
  const beat = !copy ? 1 : playbackDone ? 4 : beatForPhase(playing ? phase : null, copy.beats);
  const landed = playing && beat === 4;
  // The final beat on screen (animated Beat 4 or the static screen) is what uses the casting up.
  useEffect(() => { if (landed || shown === 'static') presentation.current?.finalBeat(); }, [landed, shown]);
  useEffect(() => { if (shown === 'static' && copy) AccessibilityInfo.announceForAccessibility(castingAnnouncement(copy)); }, [shown, copy]);
  const header = <View style={styles.header}><Text style={styles.brand}>YOUR STACK{demo ? ' · PREVIEW' : ''}</Text>{shown !== 'static' && <Pressable accessibilityRole="button" accessibilityLabel={demo ? 'Skip casting preview' : 'Skip casting and view workout summary'} onPress={skip} style={styles.skip}><Text style={styles.skipText}>Skip</Text></Pressable>}</View>;
  const done = <Pressable accessibilityRole="button" accessibilityLabel={demo ? 'Done, return to sandbox' : 'Done, view workout summary'} onPress={onFinish} style={styles.continue}><Text style={styles.continueText}>Done</Text></Pressable>;
  const metrics = copy?.landing.metrics.map((metric) => <View key={metric.label} style={styles.metric}>
    <Text maxFontSizeMultiplier={1.4} style={styles.metricValue}>{metric.value}</Text>
    <Text style={styles.label}>{metric.label}</Text>
  </View>);
  if (shown === 'static' && copy) {
    const { record, landing } = castingStaticContent(copy);
    // The landed piece, the record (if any), then Beat 4 in full. Scrolls at large text sizes.
    return <SafeAreaView style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.staticContent}>
        <View style={styles.staticPiece} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><BuildPreview slabs={history.slabs} width={180} height={150} /></View>
        {record && <View style={styles.staticRecord}>
          <Text style={styles.recordLabel}>{record.heading}</Text>
          {record.lines.map((line, index) => <Text key={index} style={styles.recordLine}>{line}</Text>)}
          <Text style={styles.caption}>{record.closing}</Text>
        </View>}
        <Text style={styles.title}>{landing.title}</Text>
        <Text style={styles.caption}>{landing.subtitle}</Text>
        <View style={[styles.landing, styles.staticMetrics]}>{metrics}
          {landing.baseline && <Text style={styles.baseline}>{landing.baseline}</Text>}
        </View>
        <View style={styles.staticDone}>{done}</View>
      </ScrollView>
    </SafeAreaView>;
  }
  return <SafeAreaView style={styles.screen}>
    {header}
    <View style={styles.intro}>
      {!copy ? null : beat === 1 ? <Text style={styles.kicker}>{copy.pieceLabel}</Text>
        : beat === 2 ? <View>
          <Text maxFontSizeMultiplier={1.4} style={styles.title}>{copy.progress.title}</Text>
          <Text style={[styles.label, styles.section]}>{copy.progress.heading}</Text>
          {copy.progress.rows.map((row, index) => <View key={index} style={styles.row}>
            <Text maxFontSizeMultiplier={1.4} style={styles.delta}>{row.delta}</Text>
            <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.exercise}>{row.exercise}</Text>
            <Text maxFontSizeMultiplier={1.4} style={styles.change}>{row.change}</Text>
          </View>)}
          {copy.progress.more && <Text maxFontSizeMultiplier={1.4} style={styles.more}>{copy.progress.more}</Text>}
        </View>
        : beat === 3 ? <View>
          <Text style={styles.recordLabel}>{copy.record.heading}</Text>
          {copy.record.lines.map((line, index) => <Text key={index} maxFontSizeMultiplier={1.4} numberOfLines={2} style={styles.recordLine}>{line}</Text>)}
          <Text maxFontSizeMultiplier={1.4} style={styles.caption}>{copy.record.closing}</Text>
        </View>
        : <View>
          <Text maxFontSizeMultiplier={1.4} style={styles.title}>{copy.landing.title}</Text>
          <Text maxFontSizeMultiplier={1.4} style={styles.caption}>{copy.landing.subtitle}</Text>
        </View>}
    </View>
    <View style={styles.stage} accessible accessibilityLabel={playing ? `${phase}. ${piece?.label ?? 'Workout'} piece, ${piece?.height.toFixed(2) ?? '1.00'} times baseline thickness. ${piece?.records.length ?? 0} records.` : 'Preparing saved workout presentation'}>
      <LinearGradient colors={['#13110E', '#2C1D12', '#13110E']} style={StyleSheet.absoluteFill} />
      {playing && slabId && (forceFailure ? <RendererFailure /> : <BuildScene key={run} slabs={history.slabs} tuning={DEFAULT_TUNING} lamination="strata" overview={false} reducedMotion={false} paused={paused} casting={casting} onError={fail} benchmark={0} onStats={ignoreStats} />)}
    </View>
    {/* Always laid out and only faded in, so revealing Beat 4 never resizes the 3D stage. */}
    <View style={styles.footer} accessibilityElementsHidden={!landed} importantForAccessibility={landed ? 'auto' : 'no-hide-descendants'} pointerEvents={landed ? 'auto' : 'none'}>
      <View style={[styles.landing, { opacity: landed ? 1 : 0 }]}>
        {metrics}
        {copy?.landing.baseline && <Text maxFontSizeMultiplier={1.4} style={styles.baseline}>{copy.landing.baseline}</Text>}
      </View>
      <View style={{ opacity: landed ? 1 : 0 }}>{done}</View>
    </View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ink },
  header: { paddingHorizontal: 26, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: c.ash, fontFamily: f.mono, fontSize: 10, letterSpacing: 2 },
  skip: { minWidth: 48, minHeight: 44, justifyContent: 'center', alignItems: 'flex-end' },
  skipText: { color: c.bone, fontFamily: f.uiMedium, fontSize: 14 },
  // Fixed height fits the tallest beat (progression with four rows and "+n more"), so the
  // 3D stage keeps one size for the whole sequence.
  intro: { paddingHorizontal: 28, paddingTop: 26, height: 300, overflow: 'hidden' },
  kicker: { color: c.accent, fontFamily: f.mono, fontSize: 10, letterSpacing: 1.5 },
  title: { color: c.bone, fontFamily: f.display, fontSize: 38, lineHeight: 41, letterSpacing: -1 },
  caption: { color: c.ash, fontFamily: f.ui, fontSize: 14, lineHeight: 20, marginTop: 12 },
  label: { color: c.ash, fontFamily: f.mono, fontSize: 10, letterSpacing: 1.5 },
  section: { marginTop: 22, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: 8 },
  delta: { color: c.accent, fontFamily: f.uiSemiBold, fontSize: 14, minWidth: 64 },
  exercise: { flex: 1, color: c.bone, fontFamily: f.uiMedium, fontSize: 14 },
  change: { color: c.ash, fontFamily: f.ui, fontSize: 14 },
  more: { color: c.ash, fontFamily: f.ui, fontSize: 13, marginTop: 8 },
  recordLabel: { color: GOLD, fontFamily: f.mono, fontSize: 10, letterSpacing: 1.5, marginBottom: 6 },
  recordLine: { color: c.bone, fontFamily: f.display, fontSize: 22, lineHeight: 28, marginTop: 8 },
  stage: { flex: 1, minHeight: 150 },
  footer: { paddingHorizontal: 26, paddingBottom: 18, gap: 16 },
  landing: { gap: 8 },
  metric: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  metricValue: { color: c.bone, fontFamily: f.display, fontSize: 22, minWidth: 110 },
  baseline: { color: c.ash, fontFamily: f.ui, fontSize: 13, lineHeight: 19, marginTop: 6 },
  continue: { minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: c.border },
  continueText: { color: c.bone, fontFamily: f.uiSemiBold, fontSize: 14 },
  staticContent: { flexGrow: 1, paddingHorizontal: 26, paddingTop: 18, paddingBottom: 18 },
  staticPiece: { alignItems: 'center', marginBottom: 18 },
  staticRecord: { marginBottom: 22 },
  staticMetrics: { marginTop: 18 },
  staticDone: { marginTop: 'auto', paddingTop: 22 },
});
