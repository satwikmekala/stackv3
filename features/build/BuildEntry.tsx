import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { redesignColors as c, redesignFonts as f, splitColors } from '../../constants/theme';
import { useWorkoutStore } from '../../store/workoutStore';
import { getStartOfWeek, toLocalCalendarDate } from '../../store/workoutCalendar';
import { buildIntroduction as introduction } from './introductionStore';
import { INTRO_PAGES, INTRO_PAGE_COUNT, introAnnouncement, introCta, introNextLabel, introPosition } from './introCopy';
import { createIntroExit, isPlayed, pageFromOffset, scheduleCtaFallback, showsNext, showsSkip, type IntroExit } from './introPages';
import { BuildPreview } from './BuildPreview';
import BuildScene from './BuildScene';
import { DEFAULT_TUNING, weeklyHeight } from './model';
import { useLazyBuildHistory } from './useBuildHistory';
import { useBuildAccessibility } from './useBuildAccessibility';
import type { BuildSlab } from './model';

const INTRO_CAMERA_FOCUS = { bottom: 0, top: 0.6 };
const layers = [splitColors.chest, splitColors.back, splitColors.legs].map((color, index) => ({ color, height: 1, record: index === 1 }));
const pieces: BuildSlab[] = layers.map((layer, index) => ({ id: `intro:${index}`, layers: [layer], height: 1, sealed: false }));
const introPieces = pieces.map((slab) => ({ ...slab, layers: slab.layers.map((layer) => ({ ...layer, record: false })) }));
const progressPieces: BuildSlab[] = [
  ...introPieces,
  { id: 'intro:push-progress', height: 1.45, layers: [{ color: splitColors.chest, height: 1.45, record: false }], sealed: false },
  { id: 'intro:pull-record', height: 1, layers: [{ color: splitColors.back, height: 1, record: true }], sealed: false },
];
const earlierWeeks: BuildSlab[] = [
  { id: 'intro:week-1', height: 1.08, layers: [{ color: splitColors.chest, height: 1, record: false }, { color: splitColors.back, height: 1, record: false }], sealed: true },
  { id: 'intro:week-2', height: 1.32, layers: [{ color: splitColors.legs, height: 1, record: false }, { color: splitColors.shoulders, height: 1, record: false }, { color: splitColors.core, height: 1, record: false }], sealed: true },
  { id: 'intro:week-3', height: 0.52, layers: [{ color: splitColors.arms, height: 1, record: false }, { color: splitColors.legs, height: 1, record: false }], sealed: true },
  { id: 'intro:week-4', height: 0.94, layers: [{ color: splitColors.back, height: 1, record: false }, { color: splitColors.chest, height: 1, record: false }, { color: splitColors.legs, height: 1, record: false }], sealed: true },
];
const weeklyLayers = progressPieces.flatMap((piece) => piece.layers);
const compressedWeek: BuildSlab = { id: 'intro:current-week', layers: weeklyLayers, height: weeklyHeight(weeklyLayers, DEFAULT_TUNING.compression), sealed: true };
const introTower = [...earlierWeeks, compressedWeek];
/** Sessions per week (and a lighter week or two) for the months before page 3's tower. */
const OVERVIEW_WEEK_SESSIONS = [3, 4, 2, 4, 5, 3, 4];
const OVERVIEW_COLORS = [splitColors.chest, splitColors.back, splitColors.legs, splitColors.shoulders, splitColors.arms, splitColors.core];
const overviewWeeks: BuildSlab[] = OVERVIEW_WEEK_SESSIONS.map((sessions, week) => {
  const weekLayers = Array.from({ length: sessions }, (_, session) => ({
    color: OVERVIEW_COLORS[(week * 2 + session) % OVERVIEW_COLORS.length],
    height: 1 + ((week + session) % 3) * 0.15,
    record: (week * 3 + session) % 7 === 0,
  }));
  return { id: `intro:overview-week-${week + 1}`, layers: weekLayers, height: weeklyHeight(weekLayers, DEFAULT_TUNING.compression), sealed: true };
});
/** Page 4: about three months (12 weeks). Page 3's tower is the base, so the page change is seamless; the rest drop onto it. */
const overviewTower = [...introTower, ...overviewWeeks];
/** Scene fixtures per page; the copy lives in introCopy.ts. */
const PAGE_SLABS = [introPieces, progressPieces, introTower, pieces];
export default function BuildEntry({ children }: { children: ReactNode }) {
  const accessibility = useBuildAccessibility();
  const workoutHydrated = useWorkoutStore((state) => state.isHydrated);
  const [introNow] = useState(() => new Date());
  // Already known to be seen (read once into memory): go straight in without a loading frame.
  const [show, setShow] = useState<boolean | null>(() => introduction.getSnapshot() ? false : null);
  const [page, setPage] = useState(0);
  const [visited, setVisited] = useState<ReadonlySet<number>>(() => new Set());
  const { width, height: windowHeight } = useWindowDimensions();
  // The scene fills a share of the screen; the Overview zoom is bounded by canvas height.
  const artWidth = Math.min(width - 56, 340);
  const artHeight = Math.round(Math.min(380, Math.max(250, windowHeight * 0.4)));
  const pager = useRef<ScrollView>(null);
  const [introAnimationDone, setIntroAnimationDone] = useState(false);
  const [introSceneFailed, setIntroSceneFailed] = useState(false);
  const [progressAnimationDone, setProgressAnimationDone] = useState(false);
  const [progressSceneFailed, setProgressSceneFailed] = useState(false);
  const [fusionAnimationDone, setFusionAnimationDone] = useState(false);
  const [fusionSceneFailed, setFusionSceneFailed] = useState(false);
  const [overviewAnimationDone, setOverviewAnimationDone] = useState(false);
  const [overviewSceneFailed, setOverviewSceneFailed] = useState(false);
  const [ctaFallback, setCtaFallback] = useState(false);
  const headlineOpacity = useState(() => new Animated.Value(0))[0];
  const bodyOpacity = useState(() => new Animated.Value(0))[0];
  const headlineOffset = useState(() => new Animated.Value(10))[0];
  const bodyOffset = useState(() => new Animated.Value(10))[0];
  const progressHeadlineOpacity = useState(() => new Animated.Value(0))[0];
  const progressBodyOpacity = useState(() => new Animated.Value(0))[0];
  const progressHeadlineOffset = useState(() => new Animated.Value(10))[0];
  const progressBodyOffset = useState(() => new Animated.Value(10))[0];
  const fusionHeadlineOpacity = useState(() => new Animated.Value(0))[0];
  const fusionBodyOpacity = useState(() => new Animated.Value(0))[0];
  const fusionHeadlineOffset = useState(() => new Animated.Value(10))[0];
  const fusionBodyOffset = useState(() => new Animated.Value(10))[0];
  const overviewHeadlineOpacity = useState(() => new Animated.Value(0))[0];
  const overviewBodyOpacity = useState(() => new Animated.Value(0))[0];
  const overviewCtaOpacity = useState(() => new Animated.Value(0))[0];
  const overviewHeadlineOffset = useState(() => new Animated.Value(10))[0];
  const overviewBodyOffset = useState(() => new Animated.Value(10))[0];
  const overviewCtaOffset = useState(() => new Animated.Value(8))[0];
  const weekKey = toLocalCalendarDate(getStartOfWeek(introNow));
  // Only the showing introduction reads saved history (from the shared derivation); a seen one never does.
  const savedHistory = useLazyBuildHistory(weekKey, show === true);
  const hasHistory = workoutHydrated && Boolean(savedHistory && savedHistory.state.metrics.workouts > 0);
  const introReducedMotion = accessibility.ready && accessibility.reducedMotion;
  // A page that finished, or that the user has left, only ever shows its final frame.
  const finishedPages = [introAnimationDone, progressAnimationDone, fusionAnimationDone, overviewAnimationDone];
  const [played0, played1, played2, played3] = [0, 1, 2, 3].map((index) => isPlayed(index, finishedPages, visited));
  const reveal = useCallback((opacity: Animated.Value, offset: Animated.Value) => Animated.parallel([
    Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
    Animated.timing(offset, { toValue: 0, duration: 260, useNativeDriver: true }),
  ]).start(), []);
  const onIntroLanding = useCallback((index: number) => {
    if (index === 0) reveal(headlineOpacity, headlineOffset);
    if (index === 2) reveal(bodyOpacity, bodyOffset);
    if (Platform.OS === 'ios') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [bodyOpacity, bodyOffset, headlineOffset, headlineOpacity, reveal]);
  const onIntroComplete = useCallback(() => setIntroAnimationDone(true), []);
  const onProgressLanding = useCallback((_index: number) => {
    if (Platform.OS === 'ios') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);
  const onProgressGrowthStart = useCallback(() => {
    reveal(progressHeadlineOpacity, progressHeadlineOffset);
    reveal(progressBodyOpacity, progressBodyOffset);
  }, [progressBodyOffset, progressBodyOpacity, progressHeadlineOffset, progressHeadlineOpacity, reveal]);
  const onProgressSeamComplete = useCallback(() => {
    if (Platform.OS === 'ios') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, []);
  const onProgressComplete = useCallback(() => setProgressAnimationDone(true), []);
  const onFusionPressStart = useCallback(() => {
    reveal(fusionHeadlineOpacity, fusionHeadlineOffset);
    reveal(fusionBodyOpacity, fusionBodyOffset);
  }, [fusionBodyOffset, fusionBodyOpacity, fusionHeadlineOffset, fusionHeadlineOpacity, reveal]);
  const onFusionComplete = useCallback(() => setFusionAnimationDone(true), []);
  const onOverviewPullbackComplete = useCallback(() => {
    reveal(overviewHeadlineOpacity, overviewHeadlineOffset);
  }, [overviewHeadlineOffset, overviewHeadlineOpacity, reveal]);
  const onOverviewComplete = useCallback(() => {
    reveal(overviewBodyOpacity, overviewBodyOffset);
    reveal(overviewCtaOpacity, overviewCtaOffset);
    setOverviewAnimationDone(true);
  }, [overviewBodyOffset, overviewBodyOpacity, overviewCtaOffset, overviewCtaOpacity, reveal]);
  useEffect(() => { let mounted = true; void introduction.shouldShow().then((value) => { if (mounted) setShow(value); }); return () => { mounted = false; }; }, []);
  useEffect(() => {
    if (page === 0 && (played0 || introReducedMotion || introSceneFailed)) {
      headlineOpacity.setValue(1);
      bodyOpacity.setValue(1);
      headlineOffset.setValue(0);
      bodyOffset.setValue(0);
    }
  }, [page, played0, introReducedMotion, introSceneFailed, headlineOpacity, bodyOpacity, headlineOffset, bodyOffset]);
  useEffect(() => {
    if (page === 1 && (played1 || introReducedMotion || progressSceneFailed)) {
      progressHeadlineOpacity.setValue(1);
      progressBodyOpacity.setValue(1);
      progressHeadlineOffset.setValue(0);
      progressBodyOffset.setValue(0);
    }
  }, [page, played1, introReducedMotion, progressSceneFailed, progressHeadlineOpacity, progressBodyOpacity, progressHeadlineOffset, progressBodyOffset]);
  useEffect(() => {
    if (page === 2 && (played2 || introReducedMotion || fusionSceneFailed)) {
      fusionHeadlineOpacity.setValue(1);
      fusionBodyOpacity.setValue(1);
      fusionHeadlineOffset.setValue(0);
      fusionBodyOffset.setValue(0);
    }
  }, [page, played2, introReducedMotion, fusionSceneFailed, fusionHeadlineOpacity, fusionBodyOpacity, fusionHeadlineOffset, fusionBodyOffset]);
  useEffect(() => {
    if (page === 3 && (played3 || introReducedMotion || overviewSceneFailed)) {
      overviewHeadlineOpacity.setValue(1);
      overviewBodyOpacity.setValue(1);
      overviewCtaOpacity.setValue(1);
      overviewHeadlineOffset.setValue(0);
      overviewBodyOffset.setValue(0);
      overviewCtaOffset.setValue(0);
    }
  }, [page, played3, introReducedMotion, overviewSceneFailed, overviewHeadlineOpacity, overviewBodyOpacity, overviewCtaOpacity, overviewHeadlineOffset, overviewBodyOffset, overviewCtaOffset]);
  // Page 4 can always be left: if its CTA hasn't been revealed 3 s after the page is shown, reveal it anyway.
  const ctaRevealed = played3 || introReducedMotion || overviewSceneFailed || ctaFallback;
  useEffect(() => {
    if (!show || page !== 3 || ctaRevealed) return;
    return scheduleCtaFallback(() => { setCtaFallback(true); reveal(overviewCtaOpacity, overviewCtaOffset); });
  }, [show, page, ctaRevealed, reveal, overviewCtaOpacity, overviewCtaOffset]);
  useEffect(() => { if (show && accessibility.screenReader) AccessibilityInfo.announceForAccessibility(introAnnouncement(page)); }, [show, page, accessibility.screenReader]);
  // Every way out marks the introduction seen: Skip and the call to action here, and the back
  // gesture/button or the screen being dismissed through the unmount below.
  const [exitGate] = useState(() => createIntroExit(introduction));
  const showing = useRef(false);
  useEffect(() => { showing.current = show === true; }, [show]);
  useEffect(() => () => { if (showing.current) exitGate.exit('dismiss'); }, [exitGate]);
  useEffect(() => {
    if (!show) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => { exitGate.exit('back'); return false; });
    return () => back.remove();
  }, [show, exitGate]);
  const exit = (reason: IntroExit) => { exitGate.exit(reason); setShow(false); };
  const goTo = (next: number) => {
    if (next === page) return;
    setVisited((previous) => new Set(previous).add(page));
    setPage(next);
  };
  const scrollTo = (next: number) => { pager.current?.scrollTo({ x: next * width, animated: !introReducedMotion }); goTo(next); };
  if (show === false) return children;
  if (show === null) return <SafeAreaView style={s.screen}><ActivityIndicator accessibilityLabel="Opening your Stack" color={c.ash} /></SafeAreaView>;
  const slabs = PAGE_SLABS[page];
  const motion = [
    { headline: headlineOpacity, headlineOffset, body: bodyOpacity, bodyOffset },
    { headline: progressHeadlineOpacity, headlineOffset: progressHeadlineOffset, body: progressBodyOpacity, bodyOffset: progressBodyOffset },
    { headline: fusionHeadlineOpacity, headlineOffset: fusionHeadlineOffset, body: fusionBodyOpacity, bodyOffset: fusionBodyOffset },
    { headline: overviewHeadlineOpacity, headlineOffset: overviewHeadlineOffset, body: overviewBodyOpacity, bodyOffset: overviewBodyOffset },
  ];
  return <SafeAreaView style={s.screen}>
    <View style={s.header}><View style={s.button} /><Text maxFontSizeMultiplier={1.4} style={s.brand}>YOUR STACK</Text>{showsSkip(page)
      ? <Pressable accessibilityRole="button" accessibilityLabel="Skip the introduction" onPress={() => exit('skip')} style={s.button}><Text style={s.link}>Skip</Text></Pressable>
      : <View style={s.button} />}</View>
    <ScrollView contentContainerStyle={s.content}>
      {/* One canvas for every page: only its scene mode changes, so the view never remounts. */}
      <View style={[s.art, { width: artWidth, height: artHeight }]} accessible={false}>
        {page === 0 && !introSceneFailed
          ? <BuildScene slabs={slabs} tuning={DEFAULT_TUNING} lamination="strata" overview={false} reducedMotion={introReducedMotion} benchmark={0} onStats={() => {}} onError={() => setIntroSceneFailed(true)} introStack={{ alreadyPlayed: played0, onLanding: onIntroLanding, onComplete: onIntroComplete }} />
          : page === 1 && !progressSceneFailed
            ? <BuildScene slabs={slabs} tuning={DEFAULT_TUNING} lamination="strata" overview={false} focusRange={INTRO_CAMERA_FOCUS} reducedMotion={introReducedMotion} benchmark={0} onStats={() => {}} onError={() => setProgressSceneFailed(true)} introProgress={{ alreadyPlayed: played1, onLanding: onProgressLanding, onGrowthStart: onProgressGrowthStart, onSeamComplete: onProgressSeamComplete, onComplete: onProgressComplete }} />
            : page === 2 && !fusionSceneFailed
              ? <BuildScene slabs={slabs} pieceGap={0} tuning={DEFAULT_TUNING} lamination="strata" overview={false} focusRange={INTRO_CAMERA_FOCUS} reducedMotion={introReducedMotion} benchmark={0} onStats={() => {}} onError={() => setFusionSceneFailed(true)} introFusion={{ alreadyPlayed: played2, loosePieces: progressPieces, historyCount: earlierWeeks.length, onPressStart: onFusionPressStart, onComplete: onFusionComplete }} />
              : page === 3 && !overviewSceneFailed
                ? <BuildScene slabs={overviewTower} pieceGap={0} tuning={DEFAULT_TUNING} lamination="strata" overview reducedMotion={introReducedMotion} benchmark={0} onStats={() => {}} onError={() => setOverviewSceneFailed(true)} introOverview={{ alreadyPlayed: played3, baseCount: introTower.length, onPullbackComplete: onOverviewPullbackComplete, onComplete: onOverviewComplete }} />
                : <BuildPreview slabs={page === 3 ? overviewTower : slabs} width={artWidth} height={artHeight} />}
      </View>
      {/* Copy pages swipe; the page index comes from where the pager settles. */}
      <ScrollView ref={pager} style={s.pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(event) => goTo(pageFromOffset(event.nativeEvent.contentOffset.x, width))}>
        {INTRO_PAGES.map((copy, index) => <View key={index} style={[s.page, { width }]} accessibilityElementsHidden={index !== page} importantForAccessibility={index === page ? 'auto' : 'no-hide-descendants'}>
          <Text style={s.step}>{introPosition(index)}</Text>
          <Animated.Text maxFontSizeMultiplier={2} accessibilityRole="header" accessibilityLiveRegion="polite" style={[s.title, { opacity: motion[index].headline, transform: [{ translateY: motion[index].headlineOffset }] }]}>{copy.title}</Animated.Text>
          <Animated.Text style={[s.body, { opacity: motion[index].body, transform: [{ translateY: motion[index].bodyOffset }] }]}>{copy.body}</Animated.Text>
        </View>)}
      </ScrollView>
    </ScrollView>
    <View style={s.footer}>{showsNext(page)
      ? <>
        <View accessible accessibilityRole="adjustable" accessibilityLabel="Introduction page" accessibilityValue={{ text: `${page + 1} of ${INTRO_PAGE_COUNT}` }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) => { if (event.nativeEvent.actionName === 'increment') scrollTo(Math.min(INTRO_PAGE_COUNT - 1, page + 1)); else if (page > 0) scrollTo(page - 1); }} style={s.dots}>
          {INTRO_PAGES.map((_, index) => <View key={index} style={[s.dot, index === page && s.dotActive]} />)}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={introNextLabel(page)} style={s.arrowButton} onPress={() => scrollTo(page + 1)}><ArrowRight color={c.ink} size={22} /></Pressable>
      </>
      : <Animated.View pointerEvents={workoutHydrated && ctaRevealed ? 'auto' : 'none'} style={[s.nextWrap, { opacity: overviewCtaOpacity, transform: [{ translateY: overviewCtaOffset }] }]}><Pressable accessibilityRole="button" disabled={!workoutHydrated} style={s.next} onPress={() => exit('cta')}><Text style={s.nextText}>{introCta(workoutHydrated, hasHistory)}</Text></Pressable></Animated.View>}</View>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ink }, header: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, button: { minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' }, link: { color: c.ash, fontFamily: f.uiMedium, fontSize: 14 }, brand: { color: c.ash, fontFamily: f.mono, fontSize: 10, letterSpacing: 2 }, content: { flexGrow: 1, paddingBottom: 24, justifyContent: 'center' }, pager: { flexGrow: 0 }, page: { paddingHorizontal: 28 }, dots: { flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 48 }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.border }, dotActive: { width: 18, backgroundColor: c.bone }, art: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }, step: { color: c.ash, fontFamily: f.mono, fontSize: 10, letterSpacing: 1 }, title: { color: c.bone, fontFamily: f.display, fontSize: 35, lineHeight: 40, marginTop: 16 }, body: { color: c.ash, fontFamily: f.ui, fontSize: 16, lineHeight: 25, marginTop: 18 }, footer: { padding: 24, flexDirection: 'row', gap: 18, alignItems: 'center' }, arrowButton: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.bone, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' }, nextWrap: { flex: 1 }, next: { flex: 1, minHeight: 52, backgroundColor: c.bone, borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 12 }, nextText: { color: c.ink, fontFamily: f.uiSemiBold, fontSize: 16 },
});
