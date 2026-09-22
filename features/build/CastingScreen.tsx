import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { redesignColors as c, redesignFonts as f } from '../../constants/theme';
import { useWorkoutStore } from '../../store/workoutStore';
import { formatWeight } from '../../store/weightUnits';
import { adaptBuildHistory } from './adapter';
import { castingGate, CASTING_DURATION_MS, type CastingPhase } from './casting';
import { EVIDENCE_DEMO_NOW, EVIDENCE_DEMO_SESSIONS } from './evidenceDemo';
import { DEFAULT_TUNING } from './model';
import BuildScene from './BuildScene';
import { useBuildAccessibility } from './useBuildAccessibility';

const titles: Record<CastingPhase, string> = { form: 'Casting.', progress: 'Progress has\nsubstance.', gold: 'A record,\nkept in gold.', reveal: 'Where it goes.', land: 'One more piece.', stacked: 'Stacked.' };
const ignoreStats = () => {};
function RendererFailure(): never { throw new Error('Development-only casting fallback check'); }
export default function CastingScreen({ sessionId, demo, onFinish, forceFailure = false }: {
  sessionId: string; demo: boolean; onFinish: () => void; forceFailure?: boolean;
}) {
  const accessibility = useBuildAccessibility();
  const sessions = useWorkoutStore((state) => state.sessions);
  const unit = useWorkoutStore((state) => state.profile?.weightUnit ?? 'kg');
  const history = useMemo(() => adaptBuildHistory(demo ? EVIDENCE_DEMO_SESSIONS : sessions, demo ? EVIDENCE_DEMO_NOW : new Date()), [demo, sessions]);
  const piece = history.state.currentWeek.pieces.find((item) => item.sessionId === (demo ? 'demo-3' : sessionId));
  const eligible = Boolean(piece && history.slabs.at(-1)?.id === piece.id);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<CastingPhase>('form');
  const preparation = useRef<Promise<boolean> | null>(null);
  useEffect(() => {
    if (!accessibility.ready) return;
    if (accessibility.skipRewards || !eligible) { if (!demo) castingGate.discard(sessionId); onFinish(); return; }
    let mounted = true;
    // Claim before rendering. Storage failure, replay, or unknown motion preference skips safely.
    preparation.current ??= Promise.all([
      demo ? Promise.resolve(true) : castingGate.claim(sessionId, AsyncStorage),
      AccessibilityInfo.isReduceMotionEnabled(),
    ]).then(([claimed, reduced]) => eligible && claimed && !reduced).catch(() => false);
    void preparation.current.then((allowed) => { if (mounted) { if (allowed) setReady(true); else onFinish(); } });
    const app = AppState.addEventListener('change', (state) => { if (state !== 'active') onFinish(); });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced) => { if (reduced) onFinish(); });
    const back = BackHandler.addEventListener('hardwareBackPress', () => { onFinish(); return true; });
    if (AppState.currentState !== 'active') onFinish();
    return () => { mounted = false; app.remove(); motion.remove(); back.remove(); };
  }, [demo, eligible, onFinish, sessionId, accessibility.ready, accessibility.skipRewards]);
  useEffect(() => {
    const timeout = setTimeout(onFinish, 8000);
    return () => clearTimeout(timeout);
  }, [onFinish]);
  useEffect(() => {
    if (!ready) return;
    // Independent of WebGL callbacks: a stalled or failed renderer cannot trap completion.
    const watchdog = setTimeout(onFinish, CASTING_DURATION_MS + 900);
    return () => clearTimeout(watchdog);
  }, [ready, onFinish]);
  const casting = useMemo(() => piece ? { slabId: piece.id, onPhase: setPhase, onComplete: onFinish } : undefined, [piece, onFinish]);
  const title = !ready ? 'Workout saved.' : phase === 'progress' && !piece?.bucket ? 'You showed up.' : phase === 'gold' && !piece?.records.length ? 'Your piece.\nYour work.' : titles[phase];
  const supporting = phase === 'progress' ? piece?.bucket ? `${piece.metrics.liftsUp} ${piece.metrics.liftsUp === 1 ? 'exercise improved' : 'exercises improved'} · ${piece.height.toFixed(2)}× thickness` : 'Showing up always creates a full piece.'
    : phase === 'gold' ? piece?.records.length ? piece.records.map((record) => record.exerciseName).join(' · ') : 'Colour and thickness, exactly as earned.'
      : phase === 'reveal' || phase === 'land' ? 'Joining the work you have already done.' : phase === 'stacked' ? 'Saved in your training history.' : 'One session. One piece.';
  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}><Text style={styles.brand}>STACK / BUILD{demo ? ' · PREVIEW' : ''}</Text><Pressable accessibilityRole="button" accessibilityLabel={demo ? 'Skip casting preview' : 'Skip casting and view workout summary'} onPress={onFinish} style={styles.skip}><Text style={styles.skipText}>Skip</Text></Pressable></View>
    <View style={styles.intro}><Text style={styles.kicker}>{piece?.label.toUpperCase() ?? 'WORKOUT'} · COMPLETE</Text><Text accessibilityLiveRegion="polite" style={styles.title}>{title}</Text><Text style={styles.caption}>{supporting}</Text></View>
    <View style={styles.stage} accessible accessibilityLabel={ready ? `${phase}. ${piece?.label ?? 'Workout'} piece, ${piece?.height.toFixed(2) ?? '1.00'} times baseline thickness. ${piece?.records.length ?? 0} records.` : 'Preparing saved workout presentation'}>
      <LinearGradient colors={['#13110E', '#2C1D12', '#13110E']} style={StyleSheet.absoluteFill} />
      {ready && casting && (forceFailure ? <RendererFailure /> : <BuildScene slabs={history.slabs} tuning={DEFAULT_TUNING} lamination="strata" overview={false} reducedMotion={false} casting={casting} onError={onFinish} benchmark={0} onStats={ignoreStats} />)}
    </View>
    <View style={styles.footer}>
      <Text style={styles.note}>{demo ? 'Illustrative sessions · nothing is written to your history.' : 'Your workout is already saved.'}</Text>
      {piece && <Text accessibilityElementsHidden={phase !== 'stacked'} style={[styles.metrics, { opacity: phase === 'stacked' ? 1 : 0 }]}>{formatWeight(piece.metrics.volumeKg, unit)} {unit} moved · {piece.metrics.liftsUp} lifts up · {piece.metrics.records} {piece.metrics.records === 1 ? 'PR' : 'PRs'}</Text>}
      <Pressable accessibilityRole="button" onPress={onFinish} style={styles.continue}><Text style={styles.continueText}>{demo ? 'Return to sandbox' : 'View workout summary'}</Text></Pressable>
    </View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ink },
  header: { paddingHorizontal: 26, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: c.ash, fontFamily: f.mono, fontSize: 10, letterSpacing: 2 },
  skip: { minWidth: 48, minHeight: 44, justifyContent: 'center', alignItems: 'flex-end' },
  skipText: { color: c.bone, fontFamily: f.uiMedium, fontSize: 14 },
  intro: { paddingHorizontal: 28, paddingTop: 26, minHeight: 190 },
  kicker: { color: c.accent, fontFamily: f.mono, fontSize: 10, letterSpacing: 1.5 },
  title: { color: c.bone, fontFamily: f.display, fontSize: 38, lineHeight: 41, marginTop: 14, letterSpacing: -1 },
  caption: { color: c.ash, fontFamily: f.ui, fontSize: 14, lineHeight: 20, marginTop: 12 },
  stage: { flex: 1, minHeight: 150 },
  footer: { paddingHorizontal: 26, paddingBottom: 18, gap: 12 },
  note: { color: c.ash, fontFamily: f.ui, fontSize: 12, textAlign: 'center' },
  metrics: { color: c.bone, fontFamily: f.uiMedium, fontSize: 13, textAlign: 'center' },
  continue: { minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: c.border },
  continueText: { color: c.bone, fontFamily: f.uiSemiBold, fontSize: 14 },
});
