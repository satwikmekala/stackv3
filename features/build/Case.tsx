import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { redesignColors as c, redesignFonts as f } from '../../constants/theme';
import { useWorkoutStore } from '../../store/workoutStore';
import { useMemo } from 'react';
import { caseCards, caseEntries } from './caseModel';
import { caseCardCopy, caseHeader } from './caseCopy';
import { GOLD } from './model';
import { buildIntents, performBuildIntent } from './buildNavigation';
import { useArchiveHistory } from './useArchiveHistory';
import { useBuildAccessibility } from './useBuildAccessibility';

export default function Case() {
  const accessibility = useBuildAccessibility();
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string }>();
  const { history } = useArchiveHistory(params.source);
  const unit = useWorkoutStore((state) => state.profile?.weightUnit ?? 'kg');
  const entries = useMemo(() => caseEntries(history.state), [history]);
  const cards = useMemo(() => caseCards(entries), [entries]);
  const header = caseHeader(history.state);
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={s.screen}>
    <Stack.Screen options={{
      headerShown: true,
      title: '',
      headerBackTitle: 'My Stack',
      headerBackButtonDisplayMode: 'minimal',
      unstable_nativeProps: { headerConfig: { experimental_userInterfaceStyle: 'dark' } },
      headerStyle: { backgroundColor: c.ink },
      headerTintColor: c.bone,
      headerShadowVisible: false,
      animation: 'slide_from_right',
    }} />
    <FlatList key={accessibility.largeText ? 'large' : 'regular'} data={cards} numColumns={accessibility.largeText ? 1 : 2} keyExtractor={(entry) => entry.id} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={5} contentContainerStyle={s.grid} columnWrapperStyle={accessibility.largeText ? undefined : s.columns}
      ListHeaderComponent={<View style={s.shelf}><Text accessibilityRole="header" maxFontSizeMultiplier={2} style={s.title}>{header.title}</Text>{header.count && <Text style={s.intro}>{header.count}</Text>}{header.note && <Text style={s.intro}>{header.note}</Text>}</View>}
      renderItem={({ item }) => {
        const copy = caseCardCopy(item, unit);
        // Empty weeks and collapsed runs are not tappable.
        return <Pressable accessibilityRole={item.kind === 'week' ? 'button' : undefined} disabled={item.kind !== 'week'} accessibilityLabel={copy.a11y} accessibilityHint={item.kind === 'week' ? 'Opens this week’s workouts.' : undefined} style={[s.niche, accessibility.largeText && { maxWidth: '100%' }]} onPress={() => { if (item.kind === 'week') performBuildIntent(router, buildIntents.unpackWeek(item.week.weekStart, params.source ?? 'saved')); }}>
          <View style={s.preview}>{item.kind === 'week' ? <View style={s.block}>{[...item.week.pieces].reverse().map((piece) => <View key={piece.id} style={{ flex: piece.height, backgroundColor: piece.color }}>{piece.records.length > 0 && <View style={s.gold} />}</View>)}</View> : <View style={s.emptySlot} />}</View>
          <Text style={s.date}>{copy.title}</Text><Text style={s.note}>{copy.detail}</Text>
        </Pressable>;
      }} />
  </SafeAreaView>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ink },
  shelf: { marginHorizontal: 8, marginTop: 10, marginBottom: 22 }, title: { color: c.bone, fontFamily: f.display, fontSize: 34, lineHeight: 37, letterSpacing: -1 }, intro: { color: c.ash, fontFamily: f.ui, fontSize: 12, lineHeight: 18, marginTop: 6 },
  grid: { paddingHorizontal: 18, paddingBottom: 28 }, columns: { gap: 12 }, niche: { flex: 1, maxWidth: '50%', marginBottom: 16, padding: 12, backgroundColor: '#201B15', borderRadius: 12, borderWidth: 1, borderColor: c.border },
  preview: { height: 100, alignItems: 'center', justifyContent: 'center', backgroundColor: '#15120F', borderRadius: 8, marginBottom: 12 }, block: { width: 92, height: 48, overflow: 'hidden', borderTopRightRadius: 12, transform: [{ skewY: '-8deg' }] }, gold: { height: 2, backgroundColor: GOLD }, emptySlot: { width: 70, height: 2, backgroundColor: '#51483A' },
  date: { color: c.bone, fontFamily: f.uiSemiBold, fontSize: 12 }, note: { color: c.ash, fontFamily: f.ui, fontSize: 12, lineHeight: 19, marginTop: 5 },
});
