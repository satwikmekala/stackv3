import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, AppState, BackHandler, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { redesignColors as c, redesignFonts as f } from '../../constants/theme';
import type { WeightUnit } from '../../store/weightUnits';
import { useWorkoutStore, type WorkoutSession } from '../../store/workoutStore';
import type { BuildPiece, BuildState } from './evidence';
import { buildStateToSlabs } from './adapter';
import { DEFAULT_TUNING } from './model';
import type { FusionPhase } from './fusion';
import { createStallWatchdog } from './casting';
import { builtCount, fusionAnnouncement, fusionBeat, fusionCopy, weeksBuilt } from './fusionCopy';
import { BuildPreview } from './BuildPreview';
import { createPresentationRun } from './presentation';
import { pieceCategory } from './buildFormat';
import BuildScene from './BuildScene';
import { useBuildAccessibility } from './useBuildAccessibility';
import type { RenderStats } from './sceneTypes';

/** `builtBefore` is the weeks-built count the user last saw; `sessions` overrides the store for previews. */
export type FusionSnapshot = { state: BuildState; weekId: string; example: boolean; builtBefore: number; sessions?: readonly WorkoutSession[] };
/** How long "{n} weeks built" takes to count up while the block settles. */
const COUNT_MS = 900;

class FusionBoundary extends Component<{ children: ReactNode; onFinish: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.warn('[Build fusion skipped]', error.message); this.props.onFinish(); }
  render() { return this.state.failed ? null : this.props.children; }
}
/**
 * One tap per beat of the ceremony, building in weight: the pieces peel off, press together,
 * fuse into one block, and land back on the tower.
 */
const PHASE_HAPTICS: Partial<Record<FusionPhase, Haptics.ImpactFeedbackStyle>> = {
  isolate: Haptics.ImpactFeedbackStyle.Soft,
  compress: Haptics.ImpactFeedbackStyle.Light,
  fuse: Haptics.ImpactFeedbackStyle.Medium,
  sealed: Haptics.ImpactFeedbackStyle.Heavy,
};
const phaseHaptic = (phase: FusionPhase) => {
  const style = PHASE_HAPTICS[phase];
  if (style !== undefined && Platform.OS === 'ios') void Haptics.impactAsync(style).catch(() => {});
};
/**
 * `onCommit` persists the claimed week (final beat shown, static screen, Skip, or failure);
 * `onRelease` returns it unseen (backgrounded before the final beat, or dismissed early) so it
 * plays again on the next entry. Both are omitted for previews.
 */
export function FusionPresentation({ snapshot, unit, onFinish, onCommit, onRelease }: {
  snapshot: FusionSnapshot; unit: WeightUnit; onFinish: () => void; onCommit?: () => void; onRelease?: () => void;
}) {
  const accessibility = useBuildAccessibility();
  const storedSessions = useWorkoutStore((state) => state.sessions);
  const [phase, setPhase] = useState<FusionPhase>('isolate');
  const [stats, setStats] = useState<RenderStats | null>(null);
  const [stateMode, setMode] = useState<'preparing' | 'playing' | 'static'>('preparing');
  // An assistive setting turned on mid-sequence settles on the static sealed screen.
  const mode = stateMode === 'playing' && accessibility.skipRewards ? 'static' : stateMode;
  const [paused, setPaused] = useState(false);
  // The copy area only ever grows (the week's rows are its tallest state), so the 3D stage below
  // gets all the remaining space and never resizes once the ceremony is playing.
  const [introHeight, setIntroHeight] = useState(0);
  const [played, setPlayed] = useState(false);
  const finished = useRef(false);
  const stall = useRef<ReturnType<typeof createStallWatchdog> | null>(null);
  const [presentation] = useState(() => createPresentationRun({ commit: () => onCommit?.(), release: () => onRelease?.() }));
  const finish = useCallback(() => { if (!finished.current) { finished.current = true; onFinish(); } }, [onFinish]);
  const skip = useCallback(() => { presentation.skip(); finish(); }, [presentation, finish]);
  const fail = useCallback(() => { presentation.failure(); finish(); }, [presentation, finish]);
  // A completed playback waits for Done; only failures and interruptions dismiss on their own.
  const complete = useCallback(() => { stall.current?.complete(); setPlayed(true); }, []);
  const week = snapshot.state.sealedWeeks.find((item) => item.id === snapshot.weekId);
  const slabs = useMemo(() => buildStateToSlabs(snapshot.state), [snapshot.state]);
  const onPhase = useCallback((next: FusionPhase) => { setPhase(next); phaseHaptic(next); }, []);
  const fusion = useMemo(() => ({ weekId: snapshot.weekId, onPhase, onComplete: complete, onProgress: (playbackMs: number) => stall.current?.frame(playbackMs) }), [snapshot.weekId, onPhase, complete]);
  const sessions = snapshot.sessions ?? storedSessions;
  const copy = useMemo(() => fusionCopy({
    state: snapshot.state, weekId: snapshot.weekId, unit, builtBefore: snapshot.builtBefore,
    category: (piece: BuildPiece) => pieceCategory(sessions.find((session) => session.id === piece.sessionId), piece.label),
  }), [snapshot, unit, sessions]);
  useEffect(() => {
    if (!accessibility.ready || mode !== 'preparing') return;
    if (!week || !copy) { fail(); return; }
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().catch(() => true).then((reduced) => {
      if (mounted) setMode(reduced || accessibility.skipRewards ? 'static' : 'playing');
    });
    return () => { mounted = false; };
  }, [accessibility.ready, accessibility.skipRewards, mode, week, copy, fail]);
  useEffect(() => {
    const onAppState = (next: string) => {
      const action = presentation.appState(next);
      if (action === 'pause') { setPaused(true); stall.current?.pause(); }
      else if (action === 'resume') { setPaused(false); stall.current?.resume(); }
      // Backgrounded before the final beat: released unseen, so the next entry plays it again.
      else if (action === 'end') finish();
    };
    const app = AppState.addEventListener('change', onAppState);
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced) => { if (reduced) setMode((current) => current === 'playing' ? 'static' : current); });
    const back = BackHandler.addEventListener('hardwareBackPress', () => { skip(); return true; });
    if (AppState.currentState !== 'active') onAppState(AppState.currentState);
    return () => { app.remove(); motion.remove(); back.remove(); };
  }, [presentation, finish, skip]);
  useEffect(() => () => { presentation.dispose(); stall.current?.dispose(); }, [presentation]);
  // Stall detection on the renderer's own clamped clock (armed on its first advancing frame).
  useEffect(() => {
    if (mode !== 'playing') return;
    const watchdog = createStallWatchdog(fail);
    stall.current = watchdog;
    return () => { watchdog.dispose(); if (stall.current === watchdog) stall.current = null; };
  }, [mode, fail]);
  // Preparation shows Beat 1; a completed playback always rests on Beat 3.
  const beat = mode === 'static' || played ? 3 : fusionBeat(mode === 'playing' ? phase : null);
  const sealed = beat === 3;
  useEffect(() => { if (sealed) presentation.finalBeat(); }, [sealed, presentation]);
  useEffect(() => { if (mode === 'static' && copy) AccessibilityInfo.announceForAccessibility(fusionAnnouncement(copy)); }, [mode, copy]);
  // "{n} weeks built" counts up from the pre-close total as the block settles.
  const [countProgress, setCountProgress] = useState(0);
  const steps = copy ? copy.stack.after - copy.stack.before : 0;
  useEffect(() => {
    if (!sealed || steps <= 0 || mode === 'static') return;
    const started = Date.now();
    const tick = setInterval(() => {
      const progress = Math.min(1, (Date.now() - started) / COUNT_MS);
      setCountProgress(progress);
      if (progress >= 1) clearInterval(tick);
    }, Math.max(40, COUNT_MS / (steps + 1)));
    return () => clearInterval(tick);
  }, [sealed, steps, mode]);
  const built = copy ? builtCount(copy.stack, mode === 'static' ? 1 : sealed ? countProgress : 0) : 0;
  const header = <View style={styles.header}><Text style={styles.brand}>YOUR STACK{snapshot.example ? ' · PREVIEW' : ''}</Text>{mode !== 'static' && <Pressable accessibilityRole="button" accessibilityLabel="Skip weekly fusion" onPress={skip} style={styles.skip}><Text style={styles.link}>Skip</Text></Pressable>}</View>;
  const sealedCopy = copy && <>
    <Text style={styles.kicker}>{copy.sealed.kicker}</Text>
    <Text maxFontSizeMultiplier={mode === 'static' ? undefined : 1.4} style={styles.title}>{copy.sealed.title}</Text>
    <Text maxFontSizeMultiplier={mode === 'static' ? undefined : 1.4} style={styles.summary}>{copy.sealed.summary}</Text>
    {copy.sealed.thickest && <Text maxFontSizeMultiplier={mode === 'static' ? undefined : 1.4} style={styles.caption}>{copy.sealed.thickest}</Text>}
  </>;
  const stackCount = <View accessible accessibilityLabel={copy ? `Your Stack, ${weeksBuilt(copy.stack.after)}` : undefined}>
    <Text style={styles.label}>{copy?.stack.label}</Text>
    <Text maxFontSizeMultiplier={mode === 'static' ? undefined : 1.4} style={styles.built}>{weeksBuilt(built)}</Text>
  </View>;
  const done = <Pressable accessibilityRole="button" accessibilityLabel={snapshot.example ? 'Done, return to sandbox' : 'Done, back to your Stack'} onPress={finish} style={styles.continue}><Text style={styles.link}>Done</Text></Pressable>;
  const sealedIndex = slabs.findIndex((slab) => slab.id === snapshot.weekId);
  return <Modal visible animationType="none" presentationStyle="fullScreen" onRequestClose={skip}>
    <SafeAreaProvider initialMetrics={initialWindowMetrics}><SafeAreaView style={styles.screen}>
      {header}
      {mode === 'static' ? <ScrollView contentContainerStyle={styles.staticContent}>
        {/* The sealed block in place, then Beat 3 with the count at its final value. Scrolls at large text sizes. */}
        <View style={styles.staticBlock} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><BuildPreview slabs={sealedIndex >= 0 ? slabs.slice(0, sealedIndex + 1) : slabs} width={180} height={150} /></View>
        {sealedCopy}
        <View style={styles.staticFooter}>{stackCount}{done}</View>
      </ScrollView> : <>
        <View style={[styles.intro, { minHeight: introHeight }]} onLayout={(event) => { const height = Math.ceil(event.nativeEvent.layout.height); setIntroHeight((previous) => Math.max(previous, height)); }}>
          {!copy ? null : !sealed ? <View style={styles.fill}>
            <Text style={styles.kicker}>{copy.week.range}</Text>
            <Text maxFontSizeMultiplier={1.4} style={styles.title}>{copy.week.title}</Text>
            <ScrollView style={styles.rows} showsVerticalScrollIndicator={false}>
              {copy.week.rows.map((row, index) => <View key={index} style={styles.row}>
                <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.rowTitle}>{row.title}</Text>
                <Text maxFontSizeMultiplier={1.4} style={styles.rowDetail}>{row.detail}</Text>
              </View>)}
            </ScrollView>
          </View> : <View>{sealedCopy}</View>}
        </View>
        <View style={styles.stage} accessible accessibilityLabel={`${phase}. ${week?.pieces.length ?? 0} workout pieces becoming one weekly block. ${week?.metrics.records ?? 0} records preserved.`}>
          <LinearGradient colors={['#13110E', '#2C1D12', '#13110E']} style={StyleSheet.absoluteFill} />
          <FusionBoundary onFinish={fail}>{mode === 'playing' && week && <BuildScene slabs={slabs} tuning={DEFAULT_TUNING} lamination="strata" overview={false} reducedMotion={false} paused={paused} fusion={fusion} onError={fail} benchmark={0} onStats={setStats} />}</FusionBoundary>
        </View>
        {/* Always laid out and only faded in, so revealing Beat 3 never resizes the 3D stage. */}
        <View style={styles.footer}>
          {snapshot.example && <Text style={styles.note}>{stats ? `Fusion: ${stats.fps.toFixed(1)} fps · p95 ${stats.p95Ms.toFixed(1)} ms · ${stats.calls} draws` : 'Measuring fusion…'}</Text>}
          <View accessibilityElementsHidden={!sealed} importantForAccessibility={sealed ? 'auto' : 'no-hide-descendants'} pointerEvents={sealed ? 'auto' : 'none'} style={[styles.sealedFooter, { opacity: sealed ? 1 : 0 }]}>
            {stackCount}
            {done}
          </View>
        </View>
      </>}
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ink },
  header: { paddingHorizontal: 26, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: c.ash, fontFamily: f.mono, fontSize: 10, letterSpacing: 2 },
  skip: { minWidth: 48, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  link: { color: c.bone, fontFamily: f.uiSemiBold, fontSize: 14 },
  // Sized to its copy, capped so a long week scrolls its rows instead of squeezing the stage.
  intro: { paddingHorizontal: 28, paddingTop: 22, paddingBottom: 8, maxHeight: 320, overflow: 'hidden' },
  fill: { flexShrink: 1 },
  kicker: { color: c.accent, fontFamily: f.mono, fontSize: 10, letterSpacing: 1.2 },
  title: { color: c.bone, fontFamily: f.display, fontSize: 36, lineHeight: 39, marginTop: 14, letterSpacing: -1 },
  rows: { flexGrow: 0, flexShrink: 1, marginTop: 14 },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingVertical: 5 },
  rowTitle: { flexShrink: 1, color: c.bone, fontFamily: f.uiMedium, fontSize: 14 },
  rowDetail: { color: c.ash, fontFamily: f.ui, fontSize: 13 },
  summary: { color: c.bone, fontFamily: f.mono, fontSize: 11, letterSpacing: 1.2, marginTop: 18 },
  caption: { color: c.ash, fontFamily: f.ui, fontSize: 13, lineHeight: 19, marginTop: 10 },
  stage: { flex: 1, minHeight: 140, overflow: 'hidden' },
  footer: { paddingHorizontal: 26, paddingBottom: 18, gap: 12 },
  sealedFooter: { gap: 14 },
  label: { color: c.ash, fontFamily: f.mono, fontSize: 10, letterSpacing: 1.5 },
  built: { color: c.bone, fontFamily: f.display, fontSize: 24, marginTop: 4 },
  note: { color: c.ash, fontFamily: f.ui, fontSize: 12, textAlign: 'center' },
  continue: { minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: c.border },
  staticContent: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 18, paddingBottom: 18 },
  staticBlock: { alignItems: 'center', marginBottom: 18 },
  staticFooter: { marginTop: 'auto', paddingTop: 22, gap: 14 },
});
