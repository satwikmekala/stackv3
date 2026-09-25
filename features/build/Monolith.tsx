import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, AppState, FlatList, ScrollView, Switch, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useIsFocused, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, LayoutAnimationConfig } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronRight, Dumbbell, LayoutGrid, Maximize, Minimize, X } from 'lucide-react-native';
import { redesignColors as c, redesignFonts as f } from '../../constants/theme';
import { useWorkoutStore } from '../../store/workoutStore';
import { getStartOfWeek, toLocalCalendarDate } from '../../store/workoutCalendar';
import { adaptBuildHistory } from './adapter';
import { useBuildHistory } from './useBuildHistory';
import { DEFAULT_TUNING, GOLD } from './model';
import { monolithWeeks, pickRulerMarkers } from './monolithModel';
import { makeMonolithDemo, MONOLITH_DEMO_NOW } from './monolithDemo';
import BuildScene from './BuildScene';
import { BuildPreview } from './BuildPreview';
import { buildPreferences, useBuildAccessibility } from './useBuildAccessibility';
import { fusionCoordinator } from './fusionCoordinator';
import { buildIntents, performBuildIntent } from './buildNavigation';
import { FusionPresentation, type FusionSnapshot } from './FusionPresentation';
import { MetricTiles } from './MetricTiles';
import { pieceCardCopy } from './caseCopy';
import {
  countLabel, formatDateRange as weekRangeLabel, formatDayA11y as fullDateLabel,
  formatMovedSession as volume, recordLabel, weekAccessibilityLabel,
} from './buildFormat';

const ignoreStats = () => {};
const SELECTED_TOP = 'selected:top';
const SELECTED_BOTTOM = 'selected:bottom';
/** Where ruler labels end; ticks and the selected week's bracket sit just to the right. */
const RULER_LABEL_RIGHT = 62;
/** The stage's edge colour (its gradient's ends), opaque and clear, for the edge fades. */
const STAGE_EDGE = '#13110E';
const STAGE_EDGE_CLEAR = 'rgba(19, 17, 14, 0)';
const movedSegment = (kg: number, unit: 'kg' | 'lbs') => {
  const amount = volume(kg, unit);
  return amount ? `${amount.toLowerCase()} moved` : null;
};
type Sheet = 'weeks' | 'current' | 'source' | null;
type Source = 'saved' | 0 | 12 | 104 | 260;
const sources: { value: Source; title: string; detail: string }[] = [
  { value: 'saved', title: 'Your workouts', detail: 'Verified, completed training history' },
  { value: 12, title: 'Demo · three months', detail: 'Mixed workouts, records and a quiet week' },
  { value: 104, title: 'Demo · two years', detail: '104 calendar weeks with training gaps' },
  { value: 260, title: 'Demo · five years', detail: '260 calendar weeks with training gaps' },
  { value: 0, title: 'Demo · nothing built', detail: 'No stacks yet' },
];

export default function Monolith() {
  const accessibility = useBuildAccessibility();
  const router = useRouter();
  const focused = useIsFocused();
  const hydrated = useWorkoutStore((state) => state.isHydrated);
  const unit = useWorkoutStore((state) => state.profile?.weightUnit ?? 'kg');
  const [source, setSource] = useState<Source>('saved');
  const [now, setNow] = useState(() => new Date());
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [reducedMotion, setReducedMotion] = useState(true);
  const [motionReady, setMotionReady] = useState(false);
  const [fusionSnapshot, setFusionSnapshot] = useState<FusionSnapshot | null>(null);
  const finishFusion = useCallback(() => setFusionSnapshot(null), []);
  const commitFusion = useCallback(() => { void fusionCoordinator.commit().catch(() => {}); }, []);
  const releaseFusion = useCallback(() => fusionCoordinator.release(), []);
  useFocusEffect(useCallback(() => finishFusion, [finishFusion]));
  const [overview, setOverview] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [projected, setProjected] = useState<{ id: string; top: number }[]>([]);
  // The 3D stage is the flexible middle of this screen. Keep the copy above and the card
  // below the same height in both camera modes so toggling never resizes the GL canvas
  // mid-animation (a native drawable rebuild shows as a stutter or a blank frame).
  const [cardHeight, setCardHeight] = useState(0);
  const measureCard = useCallback((height: number) => setCardHeight((previous) => Math.max(previous, Math.ceil(height))), []);
  const toggleOverview = useCallback(() => setOverview((value) => !value), []);
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
  // Saved history is the shared derivation, read only while this screen is focused.
  const saved = useBuildHistory(currentWeekKey, focused && source === 'saved');
  const demoHistory = useMemo(() => typeof source === 'number' ? adaptBuildHistory(demo, MONOLITH_DEMO_NOW) : null, [source, demo]);
  const history = demoHistory ?? saved;
  useEffect(() => {
    if (source !== 'saved' || !hydrated || !active || !focused || !motionReady || !accessibility.ready || sheet || fusionSnapshot) return;
    let cancelled = false;
    void fusionCoordinator.claim(history.state, () => cancelled).then((claimed) => {
      // A claim that arrives after this entry ended stays unseen and plays on the next one.
      if (claimed && cancelled) fusionCoordinator.release();
      // Assistive settings get the static sealed screen inside the presentation, not a skip.
      else if (claimed) {
        // Done simply dismisses the sequence: Focus is already on the new block underneath.
        setSelectedId(claimed.weekId);
        setOverview(false);
        setFusionSnapshot({ state: history.state, weekId: claimed.weekId, builtBefore: claimed.builtBefore, example: false });
      }
    });
    return () => { cancelled = true; };
  }, [source, hydrated, active, focused, motionReady, sheet, fusionSnapshot, history.state, accessibility.ready]);
  const entries = useMemo(() => monolithWeeks(history.state, history.slabs), [history]);
  const selected = entries.find((entry) => entry.week.id === selectedId) ?? entries[entries.length - 1];
  const selectedIndex = entries.indexOf(selected);
  const week = selected.week;
  const current = history.state.currentWeek;
  const empty = !history.state.pieces.length;
  const firstPieceDate = history.state.pieces[0]?.date;
  const weeksBuilt = history.state.sealedWeeks.length;
  const headerMetrics = [
    countLabel(history.state.metrics.workouts, 'stack', 'stacks').toUpperCase(),
    movedSegment(history.state.metrics.volumeKg, unit)?.toUpperCase() ?? null,
    history.state.metrics.records ? recordLabel(history.state.metrics.records) : null,
  ].filter((value): value is string => Boolean(value)).join(' · ');
  const selectedWeekA11y = week.sealed
    ? weekAccessibilityLabel(week)
    : `This week, open, ${current.pieces.length ? countLabel(current.pieces.length, 'stack', 'stacks') : 'nothing yet'}${current.metrics.records ? `, ${recordLabel(current.metrics.records)}` : ''}`;
  const markers = useMemo(() => entries.flatMap((entry) => entry.bottom === null || entry.top === null ? [] : [{ id: entry.week.id, y: (entry.bottom + entry.top) / 2 }]), [entries]);
  const focusRange = useMemo(() => selected.bottom === null || selected.top === null ? undefined : { bottom: selected.bottom, top: selected.top }, [selected]);
  const selectWeek = useCallback((id: string) => { setSelectedId(id); setOverview(false); }, []);
  const selectSlab = useCallback((id: string) => {
    const entry = entries.find((item) => item.slabIds.includes(id));
    if (entry) selectWeek(entry.week.id);
  }, [entries, selectWeek]);
  // Every week gets a tick; labels only where they fit, and the selected week always gets its
  // label plus a bracket over exactly its layers, so compressed weeks can still be found.
  const rulerMarkers = useMemo(() => selected.bottom === null || selected.top === null ? markers
    : [...markers, { id: SELECTED_TOP, y: selected.top }, { id: SELECTED_BOTTOM, y: selected.bottom }], [markers, selected]);
  const weekTicks = projected.filter((marker) => marker.id !== SELECTED_TOP && marker.id !== SELECTED_BOTTOM);
  const bracketTop = projected.find((marker) => marker.id === SELECTED_TOP)?.top;
  const bracketBottom = projected.find((marker) => marker.id === SELECTED_BOTTOM)?.top;
  const markerLabels = pickRulerMarkers(weekTicks, selected.week.id);
  const close = () => setSheet(null);

  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to Your Stack" hitSlop={8} onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backButton}><ChevronLeft size={23} color={c.bone} /></Pressable>
      <Text maxFontSizeMultiplier={1.4} style={styles.brand}>YOUR STACK</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Your Stack options and history source" onPress={() => setSheet('source')} style={styles.source}><Text style={styles.sourceText}>Options</Text></Pressable>
    </View>
    <ScrollView scrollEnabled={accessibility.largeText} contentContainerStyle={{ flexGrow: 1 }}>
    {/* Overview gives everything above the metrics to the tower. */}
    {!overview && <View style={styles.intro}>
        <Text maxFontSizeMultiplier={2} style={styles.title}>{empty ? 'Nothing built yet.' : weeksBuilt ? countLabel(weeksBuilt, 'week built', 'weeks built') : 'Your Stack is taking shape.'}</Text>
        {empty ? <Text style={styles.caption}>Your first session lays your first stack.</Text> : Boolean(headerMetrics) && <Text style={styles.caption}>{headerMetrics}</Text>}
    </View>}
    <View style={[styles.stage, accessibility.largeText && { flex: 0, height: 280 }]}>
      <LinearGradient colors={['#13110E', '#2C1D12', '#13110E']} style={StyleSheet.absoluteFill} />
      {active && focused && accessibility.ready && !fusionSnapshot && <View style={StyleSheet.absoluteFill} accessible accessibilityLabel={empty ? 'Your Stack. Nothing built yet. Your first session lays your first stack.' : `${accessibility.reduceEffects ? 'Static preview of recent layers. ' : ''}${overview ? `Your Stack overview, since ${fullDateLabel(firstPieceDate!)}.` : selectedWeekA11y}.`}>
        {accessibility.reduceEffects ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><BuildPreview slabs={overview ? history.slabs : history.slabs.filter((slab) => selected.slabIds.includes(slab.id))} width={230} height={220} /></View> : <BuildScene slabs={history.slabs} tuning={DEFAULT_TUNING} lamination="strata" paused={sheet !== null} overview={overview} focusRange={focusRange} reducedMotion={reducedMotion || accessibility.reducedMotion} markers={rulerMarkers} onMarkers={setProjected} onSelectSlab={selectSlab} benchmark={0} onStats={ignoreStats} />}
      </View>}
      {/* Focus crops the tower at the stage edges; fade it into the background instead of a hard cut. */}
      <LinearGradient pointerEvents="none" colors={[STAGE_EDGE, STAGE_EDGE_CLEAR]} style={[styles.edgeFade, { top: 0, height: 56 }]} />
      <LinearGradient pointerEvents="none" colors={[STAGE_EDGE_CLEAR, STAGE_EDGE]} style={[styles.edgeFade, { bottom: 0, height: 28 }]} />
      {!overview && !sheet && !accessibility.reduceEffects && <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {weekTicks.map((marker) => <View key={`tick:${marker.id}`} pointerEvents="none" style={[styles.tick, { top: marker.top }, marker.id === week.id && styles.tickSelected]} />)}
        {bracketTop !== undefined && bracketBottom !== undefined && <View pointerEvents="none" style={[styles.bracket, { top: Math.min(bracketTop, bracketBottom), height: Math.max(2, Math.abs(bracketBottom - bracketTop)) }]} />}
        {markerLabels.map((marker) => {
          const entry = entries.find((item) => item.week.id === marker.id);
          return entry ? <Pressable key={marker.id} accessibilityRole="button" accessibilityLabel={entry.week.sealed ? weekAccessibilityLabel(entry.week) : selectedWeekA11y} accessibilityState={{ selected: marker.id === week.id }} onPress={() => selectWeek(marker.id)} style={[styles.ruler, { top: marker.top - 22 }]}><Text numberOfLines={1} style={[styles.rulerText, marker.id === week.id && styles.rulerTextSelected]}>{entry.week.sealed ? weekRangeLabel(entry.week.weekStart, entry.week.weekEnd) : 'THIS WEEK'}</Text></Pressable> : null;
        })}
      </View>}
      <View style={styles.cameraControls}>
        <Pressable accessibilityRole="button" accessibilityLabel={overview ? 'Show Focus' : 'Show Overview'} onPress={toggleOverview} style={styles.icon}>{overview ? <Minimize size={19} color={c.bone} /> : <Maximize size={19} color={c.bone} />}</Pressable>
        <Text style={styles.cameraLabel}>{overview ? 'OVERVIEW' : 'FOCUS'}</Text>
      </View>
    </View>
    <View style={styles.footer}>
      <View style={[styles.cardSlot, { minHeight: cardHeight }]}><LayoutAnimationConfig skipEntering>
      {overview ? <Animated.View key="metrics" entering={FadeIn.duration(220)}>
        <MetricTiles tiles={[
          ...(history.state.metrics.workouts > 0 ? [{ value: String(history.state.metrics.workouts), label: history.state.metrics.workouts === 1 ? 'STACK' : 'STACKS' }] : []),
          ...(weeksBuilt > 0 ? [{ value: String(weeksBuilt), label: weeksBuilt === 1 ? 'WEEK BUILT' : 'WEEKS BUILT' }] : []),
          ...(history.state.metrics.records > 0 ? [{ value: String(history.state.metrics.records), label: history.state.metrics.records === 1 ? 'PR' : 'PRS' }] : []),
        ]} />
      </Animated.View> : <Animated.View key="week" entering={FadeIn.duration(220)} onLayout={(event) => measureCard(event.nativeEvent.layout.height)}>
        {/* The whole card opens the week: sealed weeks unpack, this week opens its sheet. */}
        <Pressable accessibilityRole="button" accessibilityLabel={week.sealed ? `Unpack ${selectedWeekA11y}` : `Open this week, ${selectedWeekA11y}`} onPress={() => week.sealed ? performBuildIntent(router, buildIntents.unpackWeek(week.weekStart, String(source))) : setSheet('current')} style={styles.weekCard}>
          <View style={styles.weekCardTop}><Text style={styles.eyebrow}>{week.sealed ? weekRangeLabel(week.weekStart, week.weekEnd) : 'THIS WEEK'}</Text><ChevronRight size={17} color={c.ash} /></View>
          <Text maxFontSizeMultiplier={2} style={styles.weekTitle}>{week.pieces.length
            ? `${countLabel(week.pieces.length, 'stack', 'stacks')}${week.metrics.records ? ` · ${recordLabel(week.metrics.records)}` : ''}`
            : 'Nothing yet.'}</Text>
          {week.pieces.length > 0 && <View style={styles.strata}>{week.pieces.map((piece) => <View key={piece.id} style={[styles.stripe, { backgroundColor: piece.color }]} />)}</View>}
          {week.pieces.length > 0 && Boolean(movedSegment(week.metrics.volumeKg, unit)) && <Text style={styles.caption}>{movedSegment(week.metrics.volumeKg, unit)}</Text>}
        </Pressable>
      </Animated.View>}
      </LayoutAnimationConfig></View>
      <Pressable accessibilityRole="button" accessibilityLabel={empty ? 'Start a workout' : 'Open the Case'} onPress={() => performBuildIntent(router, empty ? buildIntents.startWorkout() : buildIntents.openCase(String(source)))} style={styles.caseButton}>
        {empty ? <Dumbbell size={18} color={c.bone} /> : <LayoutGrid size={18} color={c.bone} />}
        <Text style={[styles.link, { flex: 1 }]}>{empty ? 'Start a workout' : 'Open the Case'}</Text>
        <ChevronRight size={17} color={c.ash} />
      </Pressable>
      <View style={styles.navigation}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous active week" accessibilityState={{ disabled: selectedIndex === 0 }} disabled={selectedIndex === 0} onPress={() => selectWeek(entries[selectedIndex - 1].week.id)} style={[styles.icon, selectedIndex === 0 && styles.disabled]}><ChevronLeft size={20} color={c.bone} /></Pressable>
        <Pressable accessibilityRole="button" onPress={() => setSheet('weeks')} style={styles.browse}><Text style={styles.link}>Choose a week</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Next active week" accessibilityState={{ disabled: selectedIndex === entries.length - 1 }} disabled={selectedIndex === entries.length - 1} onPress={() => selectWeek(entries[selectedIndex + 1].week.id)} style={[styles.icon, selectedIndex === entries.length - 1 && styles.disabled]}><ChevronRight size={20} color={c.bone} /></Pressable>
      </View>
    </View>
    </ScrollView>
    {fusionSnapshot && <FusionPresentation snapshot={fusionSnapshot} unit={unit} onFinish={finishFusion} onCommit={commitFusion} onRelease={releaseFusion} />}
    <Modal visible={sheet !== null} animationType={reducedMotion || accessibility.reducedMotion ? 'none' : 'slide'} presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.sheetHeader}><Text maxFontSizeMultiplier={2} style={styles.sheetTitle}>{sheet === 'source' ? 'Your Stack options' : sheet === 'weeks' ? 'Your weeks' : 'This week'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close Your Stack sheet" onPress={close} style={styles.icon}><X size={20} color={c.bone} /></Pressable></View>
        {sheet === 'source' ? <FlatList data={sources} keyExtractor={(item) => String(item.value)} contentContainerStyle={styles.list} ListHeaderComponent={<View style={{ gap: 12 }}><View style={styles.detailButton}><Text style={styles.link}>Reduce effects</Text><Switch accessibilityLabel="Reduce Your Stack effects" value={accessibility.reduceEffects} disabled={!accessibility.ready} onValueChange={(value) => { void buildPreferences.setReduceEffects(value); }} /></View><Text style={styles.note}>Use static previews and skip reward animations. All workouts and records stay available.</Text><Text style={styles.note}>Demo sessions are illustrative and never saved to your workout history.</Text></View>} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityState={{ selected: source === item.value }} onPress={() => { setSource(item.value); setSelectedId(null); setProjected([]); close(); }} style={[styles.listRow, source === item.value && styles.selected]}><Text style={styles.rowTitle}>{item.title}</Text><Text style={styles.note}>{item.detail}</Text></Pressable>} />
          : sheet === 'weeks' ? <FlatList data={[...entries].reverse()} keyExtractor={(item) => item.week.id} contentContainerStyle={styles.list} initialNumToRender={12} renderItem={({ item }) => {
            const rowMetrics = [
              item.week.pieces.length ? countLabel(item.week.pieces.length, 'stack', 'stacks') : 'Nothing yet.',
              movedSegment(item.week.metrics.volumeKg, unit),
              item.week.metrics.records ? recordLabel(item.week.metrics.records) : null,
            ].filter((value): value is string => Boolean(value)).join(' · ');
            const label = item.week.sealed
              ? weekAccessibilityLabel(item.week)
              : `This week, open${item.week.pieces.length ? `, ${countLabel(item.week.pieces.length, 'stack', 'stacks')}` : ', nothing yet'}${item.week.metrics.records ? `, ${recordLabel(item.week.metrics.records)}` : ''}`;
            return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: item.week.id === week.id }} onPress={() => { selectWeek(item.week.id); close(); }} style={[styles.listRow, item.week.id === week.id && styles.selected]}><Text style={styles.rowTitle}>{item.week.sealed ? weekRangeLabel(item.week.weekStart, item.week.weekEnd) : 'THIS WEEK · OPEN'}</Text><View style={styles.strata}>{item.week.pieces.map((piece) => <View key={piece.id} style={[styles.stripe, { backgroundColor: piece.color }]} />)}</View><Text style={styles.note}>{rowMetrics}</Text></Pressable>;
          }} />
            : <FlatList data={current.pieces} keyExtractor={(piece) => piece.id} contentContainerStyle={styles.list} ListHeaderComponent={current.pieces.length > 0 ? <View style={styles.pill}><Text style={styles.pillText}>{countLabel(current.pieces.length, 'stack', 'stacks').toUpperCase()}</Text></View> : null} ListEmptyComponent={<View style={{ gap: 5, marginTop: 20 }}><Text maxFontSizeMultiplier={2} style={styles.empty}>Nothing yet.</Text><Text style={styles.note}>Your next session starts it.</Text></View>} renderItem={({ item: piece }) => {
              // Same row as an unpacked week: the workout's name, what it moved and any PRs.
              const copy = pieceCardCopy(piece, piece.label, unit);
              return <Pressable accessibilityRole="button" accessibilityLabel={copy.a11y} onPress={() => { close(); performBuildIntent(router, buildIntents.viewWorkout(piece.sessionId, source === 'saved' ? undefined : Number(source))); }} style={styles.listRow}>
                <View style={styles.pieceTop}><View style={[styles.piece, { backgroundColor: piece.color, height: 18 * piece.height }]}>{piece.records.length > 0 && <View style={styles.goldSeam} />}</View><ChevronRight size={17} color={c.ash} /></View>
                <Text style={styles.rowTitle}>{copy.title}</Text>{copy.detail.length > 0 && <Text style={styles.note}>{copy.detail}</Text>}
              </Pressable>;
            }} />}
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ink },
  header: { flexWrap: 'wrap', paddingHorizontal: 20, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#241E18' },
  brand: { color: c.bone, fontFamily: f.mono, fontSize: 10, letterSpacing: 2 },
  source: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  sourceText: { color: c.ash, fontFamily: f.uiMedium, fontSize: 12 },
  intro: { paddingHorizontal: 26, paddingTop: 10 },
  cardSlot: { justifyContent: 'center' },
  eyebrow: { color: c.ash, fontFamily: f.mono, fontSize: 9, letterSpacing: 1.5 },
  title: { color: c.bone, fontFamily: f.display, fontSize: 34, lineHeight: 37, letterSpacing: -1 },
  caption: { color: c.ash, fontFamily: f.ui, fontSize: 12, lineHeight: 18, marginTop: 6 },
  stage: { flex: 1, minHeight: 140 },
  cameraControls: { position: 'absolute', right: 16, top: '40%', gap: 9, alignItems: 'center' },
  cameraLabel: { color: c.ash, fontFamily: f.mono, fontSize: 8, letterSpacing: 1 },
  // Ruler: right-aligned labels, then a tick per week, then the selected week's bracket.
  edgeFade: { position: 'absolute', left: 0, right: 0 },
  ruler: { position: 'absolute', left: 4, width: RULER_LABEL_RIGHT - 4, height: 44, justifyContent: 'center', alignItems: 'flex-end' },
  rulerText: { color: '#918371', fontFamily: f.mono, fontSize: 8 },
  rulerTextSelected: { color: c.bone },
  tick: { position: 'absolute', left: RULER_LABEL_RIGHT + 4, width: 6, height: 1, backgroundColor: '#5A4F42' },
  tickSelected: { width: 8, backgroundColor: '#8C7F6E' },
  // Marks the selected week quietly: a hairline in the label's muted tone, never brighter than the label.
  bracket: { position: 'absolute', left: RULER_LABEL_RIGHT + 11, width: StyleSheet.hairlineWidth * 2, backgroundColor: '#8C7F6E', opacity: 0.7 },
  footer: { paddingHorizontal: 22, paddingBottom: 8, gap: 12 },
  weekCard: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#201B15', borderWidth: 1, borderColor: c.border, borderRadius: 16 },
  weekCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekTitle: { fontFamily: f.display, fontSize: 22, color: c.bone, marginTop: 4 },
  strata: { flexDirection: 'row', gap: 3, marginTop: 10 },
  stripe: { flex: 1, height: 4, borderRadius: 2 },
  detailButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginTop: 6 },
  link: { flexShrink: 1, color: c.bone, fontFamily: f.uiSemiBold, fontSize: 13 },
  navigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  browse: { flex: 1, alignItems: 'center', minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  disabled: { opacity: 0.3 },
  caseButton: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: '#201B15' },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: '#241E18' },
  pillText: { color: c.bone, fontFamily: f.mono, fontSize: 10, letterSpacing: 1 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 22 },
  sheetTitle: { color: c.bone, fontFamily: f.display, fontSize: 28, flex: 1 },
  list: { paddingHorizontal: 22, paddingBottom: 32, gap: 12 },
  listRow: { borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 16, gap: 6 },
  selected: { borderColor: c.ash, backgroundColor: '#241E18' },
  rowTitle: { color: c.bone, fontFamily: f.uiSemiBold, fontSize: 16 },
  note: { color: c.ash, fontFamily: f.ui, fontSize: 13, lineHeight: 20 },
  empty: { color: c.bone, fontFamily: f.display, fontSize: 24, lineHeight: 30, marginTop: 20 },
  pieceTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  piece: { width: 76, borderRadius: 3, overflow: 'hidden' },
  goldSeam: { height: 2, backgroundColor: GOLD },
});
