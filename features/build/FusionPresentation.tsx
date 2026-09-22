import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, AppState, BackHandler, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { redesignColors as c, redesignFonts as f } from '../../constants/theme';
import { formatWeight, type WeightUnit } from '../../store/weightUnits';
import { parseSessionDate } from '../../store/workoutCalendar';
import type { BuildState } from './evidence';
import { buildStateToSlabs } from './adapter';
import { DEFAULT_TUNING } from './model';
import { FUSION_DURATION_MS, type FusionPhase } from './fusion';
import BuildScene from './BuildScene';
import { useBuildAccessibility } from './useBuildAccessibility';
import type { RenderStats } from './sceneTypes';

export type FusionSnapshot = { state: BuildState; weekId: string; example: boolean };

class FusionBoundary extends Component<{ children: ReactNode; onFinish: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.warn('[Build fusion skipped]', error.message); this.props.onFinish(); }
  render() { return this.state.failed ? null : this.props.children; }
}
export function FusionPresentation({ snapshot, unit, onFinish }: { snapshot: FusionSnapshot; unit: WeightUnit; onFinish: () => void }) {
  const accessibility = useBuildAccessibility();
  const [phase, setPhase] = useState<FusionPhase>('isolate');
  const [stats, setStats] = useState<RenderStats | null>(null);
  const [ready, setReady] = useState(false);
  const finished = useRef(false);
  const playbackComplete = useRef(false);
  const finish = useCallback(() => { if (!finished.current) { finished.current = true; onFinish(); } }, [onFinish]);
  const complete = useCallback(() => { playbackComplete.current = true; if (!snapshot.example) finish(); }, [snapshot.example, finish]);
  const week = snapshot.state.sealedWeeks.find((item) => item.id === snapshot.weekId);
  const slabs = useMemo(() => buildStateToSlabs(snapshot.state), [snapshot.state]);
  const fusion = useMemo(() => ({ weekId: snapshot.weekId, onPhase: setPhase, onComplete: complete }), [snapshot.weekId, complete]);
  useEffect(() => {
    if (!accessibility.ready) return;
    if (accessibility.skipRewards) { finish(); return; }
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (mounted) { if (reduced || !week) finish(); else setReady(true); }
    }).catch(finish);
    const app = AppState.addEventListener('change', (state) => { if (state !== 'active') finish(); });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced) => { if (reduced) finish(); });
    const back = BackHandler.addEventListener('hardwareBackPress', () => { finish(); return true; });
    if (AppState.currentState !== 'active') finish();
    return () => { mounted = false; app.remove(); motion.remove(); back.remove(); };
  }, [finish, week, accessibility.ready, accessibility.skipRewards]);
  useEffect(() => { const timeout = setTimeout(() => { if (!playbackComplete.current) finish(); }, FUSION_DURATION_MS + 1800); return () => clearTimeout(timeout); }, [finish]);
  const title = !ready ? 'Your week is sealed.' : phase === 'isolate' ? `${week?.pieces.length ?? 0} workouts.\nOne week.` : phase === 'compress' ? 'Pressing\ntogether.' : phase === 'fuse' ? 'One block.\nEvery colour kept.' : phase === 'seat' ? 'Part of your Stack.' : 'Week sealed.';
  return <Modal visible animationType="none" presentationStyle="fullScreen" onRequestClose={finish}>
    <SafeAreaProvider initialMetrics={initialWindowMetrics}><SafeAreaView style={styles.screen}>
      <View style={styles.header}><Text style={styles.brand}>STACK / BUILD{snapshot.example ? ' · PREVIEW' : ''}</Text><Pressable accessibilityRole="button" accessibilityLabel="Skip weekly fusion" onPress={finish} style={styles.skip}><Text style={styles.link}>Skip</Text></Pressable></View>
      <View style={styles.intro}><Text style={styles.kicker}>{week ? `WEEK OF ${parseSessionDate(week.weekStart).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}` : 'YOUR STACK'}</Text><Text accessibilityLiveRegion="polite" style={styles.title}>{title}</Text><Text style={styles.caption}>Every workout and every record stays inside.</Text></View>
      <View style={styles.stage} accessible accessibilityLabel={`${phase}. ${week?.pieces.length ?? 0} workout pieces becoming one weekly block. ${week?.metrics.records ?? 0} records preserved.`}>
        <LinearGradient colors={['#13110E', '#2C1D12', '#13110E']} style={StyleSheet.absoluteFill} />
        <FusionBoundary onFinish={finish}>{ready && week && <BuildScene slabs={slabs} tuning={DEFAULT_TUNING} lamination="strata" overview={false} reducedMotion={false} fusion={fusion} onError={finish} benchmark={0} onStats={setStats} />}</FusionBoundary>
      </View>
      <View style={styles.footer}>{snapshot.example && <Text style={styles.note}>{stats ? `Fusion: ${stats.fps.toFixed(1)} fps · p95 ${stats.p95Ms.toFixed(1)} ms · ${stats.calls} draws` : 'Measuring fusion…'}</Text>}<Text style={styles.metrics}>{week ? `${week.metrics.workouts} workouts · ${formatWeight(week.metrics.volumeKg, unit)} ${unit} moved · ${week.metrics.records} ${week.metrics.records === 1 ? 'PR' : 'PRs'}` : ''}</Text><Text style={styles.note}>{snapshot.example ? 'Illustrative history · nothing is saved.' : 'Already sealed. Your sessions are preserved.'}</Text><Pressable accessibilityRole="button" onPress={finish} style={styles.continue}><Text style={styles.link}>{snapshot.example ? 'Return to sandbox' : 'View your Stack'}</Text></Pressable></View>
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ink },
  header: { paddingHorizontal: 26, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: c.ash, fontFamily: f.mono, fontSize: 10, letterSpacing: 2 },
  skip: { minWidth: 48, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  link: { color: c.bone, fontFamily: f.uiSemiBold, fontSize: 14 },
  intro: { paddingHorizontal: 28, paddingTop: 22, minHeight: 190 },
  kicker: { color: c.accent, fontFamily: f.mono, fontSize: 10, letterSpacing: 1.2 },
  title: { color: c.bone, fontFamily: f.display, fontSize: 36, lineHeight: 39, marginTop: 14, letterSpacing: -1 },
  caption: { color: c.ash, fontFamily: f.ui, fontSize: 13, lineHeight: 19, marginTop: 10 },
  stage: { flex: 1, minHeight: 140, overflow: 'hidden' },
  footer: { paddingHorizontal: 26, paddingBottom: 18, gap: 12 },
  metrics: { color: c.bone, fontFamily: f.uiMedium, fontSize: 13, textAlign: 'center' },
  note: { color: c.ash, fontFamily: f.ui, fontSize: 12, textAlign: 'center' },
  continue: { minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: c.border },
});
