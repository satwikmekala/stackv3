import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from '@/services/haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Share, X } from 'lucide-react-native';
import { redesignColors as c, redesignFonts as f } from '../../constants/theme';
import { useWorkoutStore } from '../../store/workoutStore';
import { unpackWeek } from './caseModel';
import { pieceCardCopy, unpackedHeader } from './caseCopy';
import { DEFAULT_TUNING, GOLD } from './model';
import BuildScene from './BuildScene';
import { BuildPreview } from './BuildPreview';
import { buildIntents, performBuildIntent } from './buildNavigation';
import { useArchiveHistory } from './useArchiveHistory';
import { useBuildAccessibility } from './useBuildAccessibility';
import { MetricTiles } from './MetricTiles';
import { buildWeekReport } from '../report/weekReport';
import { shareWeekReportPdf } from '../report/shareWeekReport';

const ignoreStats = () => {};
/** One unpacked week (formerly the Case's modal), as its own route so Back is honest. */
export default function UnpackedWeek() {
  const accessibility = useBuildAccessibility();
  const router = useRouter();
  const params = useLocalSearchParams<{ week?: string; source?: string }>();
  const { history, sessions, demoCount, focused, active, reduced } = useArchiveHistory(params.source);
  const unit = useWorkoutStore((state) => state.profile?.weightUnit ?? 'kg');
  const [pieceId, setPieceId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const week = [...history.state.sealedWeeks, history.state.currentWeek].find((item) => item.weekStart === params.week && item.pieces.length > 0);
  const slabs = useMemo(() => week ? unpackWeek(week) : [], [week]);
  const unpacked = week ? unpackedHeader(week, unit) : null;
  const sharingRef = useRef(false);
  const [sharing, setSharing] = useState(false);
  // The whole week, set by set, as a designed PDF.
  const shareWeek = useCallback(async () => {
    if (!week || sharingRef.current) return;
    sharingRef.current = true;
    setSharing(true);
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    try {
      await shareWeekReportPdf(buildWeekReport(week, sessions, unit));
    } catch {
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Couldn’t share this week', 'The report could not be created. Try again.');
    } finally {
      sharingRef.current = false;
      setSharing(false);
    }
  }, [sessions, unit, week]);
  return <SafeAreaView style={s.screen}>
    <View style={s.header}><Text accessibilityRole="header" maxFontSizeMultiplier={2} style={s.title}>{unpacked?.title}</Text>{week && <Pressable accessibilityRole="button" accessibilityLabel="Share week as PDF" accessibilityState={{ busy: sharing }} disabled={sharing} onPress={shareWeek} style={s.close}>{sharing ? <ActivityIndicator size="small" color={c.bone} /> : <Share size={18} color={c.bone} />}</Pressable>}<Pressable accessibilityRole="button" accessibilityLabel="Close week" onPress={() => performBuildIntent(router, buildIntents.closeWeek(), '/build-case')} style={s.close}><X size={20} color={c.bone} /></Pressable></View>
    {week && <FlatList data={week.pieces} keyExtractor={(piece) => piece.id} contentContainerStyle={s.details} initialNumToRender={5}
      ListHeaderComponent={<><View style={s.scene} accessible accessibilityLabel={`${week.pieces.length} workout blocks, ordered from earliest to latest.`}>{active && focused && accessibility.ready && !failed && !accessibility.reduceEffects && <BuildScene slabs={slabs} pieceGap={0.22} tuning={DEFAULT_TUNING} lamination="strata" overview reducedMotion={reduced} benchmark={0} onStats={ignoreStats} onSelectSlab={setPieceId} onError={() => setFailed(true)} />}{accessibility.reduceEffects && <View style={{ alignItems: 'center' }}><BuildPreview slabs={slabs} width={230} height={230} /></View>}{failed && <Text style={s.note}>Couldn’t open My Stack. Your workouts are listed below.</Text>}</View>{unpacked && <MetricTiles tiles={unpacked.tiles} />}</>}
      renderItem={({ item: piece }) => {
        // The workout's own name, as My Stack shows it. Every row opens that workout's summary.
        const copy = pieceCardCopy(piece, piece.label, unit);
        return <Pressable accessibilityRole="button" accessibilityLabel={copy.a11y} onPress={() => performBuildIntent(router, buildIntents.viewWorkout(piece.sessionId, demoCount ?? undefined))} style={[s.row, pieceId === piece.id && s.selected]}>
          <View style={s.rowTop}><View style={[s.pigment, { backgroundColor: piece.color, height: 18 * piece.height }]}>{piece.records.length > 0 && <View style={s.gold} />}</View><ChevronRight size={17} color={c.ash} /></View>
          <Text style={s.rowTitle}>{copy.title}</Text>{copy.detail.length > 0 && <Text style={s.note}>{copy.detail}</Text>}
        </Pressable>;
      }} />}
  </SafeAreaView>;
}
const s = StyleSheet.create({
  // Same heading-and-close row as My Stack's sheets.
  screen: { flex: 1, backgroundColor: c.ink }, header: { paddingHorizontal: 22, paddingTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { flex: 1, color: c.bone, fontFamily: f.display, fontSize: 28 }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#241E18' },
  button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }, link: { color: c.bone, fontFamily: f.uiSemiBold, fontSize: 14 },
  gold: { height: 2, backgroundColor: GOLD }, note: { color: c.ash, fontFamily: f.ui, fontSize: 12, lineHeight: 19, marginTop: 5 },
  details: { padding: 22, paddingTop: 10, gap: 14 }, scene: { height: 240, marginBottom: 12, backgroundColor: '#1B1611', borderRadius: 16, overflow: 'hidden' }, row: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: c.border }, selected: { borderColor: c.bone }, rowTitle: { color: c.bone, fontFamily: f.uiSemiBold, fontSize: 17 }, rowTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }, pigment: { width: 76, borderTopRightRadius: 6, overflow: 'hidden' },
});
