import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter, useIsFocused } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, HelpCircle } from 'lucide-react-native';
import { redesignColors as c, redesignFonts as f, splitColors } from '@/constants/theme';
import { SplitPressable as Pressable } from '@/components/custom-split/SplitPressable';
import { WorkoutCardSurface } from '@/components/home/WorkoutCardSurface';
import { getStartOfWeek, toLocalCalendarDate } from '@/store/workoutCalendar';
import { useBuildHistory } from './useBuildHistory';
import { BuildPreview } from './BuildPreview';
import Monolith from './Monolith';

/** Only the saved derivation decides whether an earned Stack exists. The empty
 * plate is presentation geometry; no demonstration session enters this hook. */
export default function StackDiscovery() {
  const router = useRouter();
  const { fontScale } = useWindowDimensions();
  const focused = useIsFocused();
  const history = useBuildHistory(toLocalCalendarDate(getStartOfWeek(new Date())), focused);
  if (history.state.pieces.length > 0) return <Monolith isTab />;
  return <SafeAreaView edges={['top', 'left', 'right']} style={s.screen}>
    <ScrollView key={`discovery:${fontScale}`} contentContainerStyle={s.content}>
      <View style={s.header}><Text accessibilityLabel="My Stack" style={s.brand}>MY STACK</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="How My Stack grows" onPress={() => router.push('/stack-help')} style={s.help}><HelpCircle size={22} color={c.bone} /></Pressable></View>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.8} style={s.title}>Your Stack starts here</Text>
      <Text style={s.copy}>Every completed workout adds a block. Each completed week becomes a layer.</Text>
      <View accessible accessibilityRole="image" accessibilityLabel="My Stack. No completed workouts yet." style={s.stage}>
        <BuildPreview slabs={[]} width={220} height={130} />
        <Text style={s.stageLabel}>A PLACE FOR YOUR FIRST WORKOUT</Text>
      </View>
      <View style={s.context}>
        <WorkoutCardSurface color={splitColors.back} radius={24} showEdge={false} />
        <Text accessibilityRole="header" style={s.contextTitle}>Built by you.</Text>
        <Text accessibilityLabel="Muscle colors show what you trained. An earned personal record adds a gold seam." style={s.copy}>Muscle colors show what you trained. An earned personal record (PR) adds a gold seam.</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.navigate('/(tabs)')} style={s.primary}><Text style={s.primaryText}>Go to Train</Text><ArrowRight size={22} color={c.ink} /></Pressable>
    </ScrollView>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ink }, content: { paddingHorizontal: 24, paddingBottom: 120, gap: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 },
  brand: { fontFamily: f.mono, fontSize: 11, letterSpacing: 2, color: c.ash }, help: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: f.display, fontSize: 42, lineHeight: 46, letterSpacing: -1.4, color: c.bone },
  copy: { fontFamily: f.ui, fontSize: 16, lineHeight: 24, color: c.ash },
  stage: { alignItems: 'center', paddingVertical: 4 }, stageLabel: { fontFamily: f.mono, fontSize: 10, lineHeight: 16, letterSpacing: 1, color: c.ash, textAlign: 'center' },
  context: { overflow: 'hidden', borderRadius: 24, backgroundColor: c.surface, padding: 20, gap: 12 }, contextTitle: { fontFamily: f.display, fontSize: 28, lineHeight: 34, color: c.bone },
  primary: { minHeight: 56, padding: 16, backgroundColor: c.accent, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }, primaryText: { flex: 1, fontFamily: f.uiBold, fontSize: 17, color: c.ink },
});
