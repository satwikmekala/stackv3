import { displayExerciseName } from '@/constants/exerciseNames';
import { useMuscleColors } from '@/store/muscleColors';
import { getMuscleColor } from '@/constants/muscleColors';
/** @jsxImportSource react */
import { useMemo, useState } from 'react';
import { ActionSheetIOS, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ChevronDown, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { useWorkoutStore } from '@/store/workoutStore';
import { DEFAULT_WEIGHT_UNIT } from '@/store/workoutDatabase';
import { deriveLiftProgress, formatLiftDate, formatLiftPerformance, liftComparisonCopy } from '@/store/liftProgress';
import { WorkoutCardSurface } from '@/components/home/WorkoutCardSurface';

const RANGES = [4, 8, 12, null] as const;
type Range = (typeof RANGES)[number];
const rangeLabel = (range: Range) => range === null ? 'All time' : `Last ${range} weeks`;

export default function LiftDetail() {
  useMuscleColors(state => state.preferences);
  const { exerciseName } = useLocalSearchParams<{ exerciseName?: string | string[] }>();
  const name = (Array.isArray(exerciseName) ? exerciseName[0] : exerciseName) ?? '';
  const insets = useSafeAreaInsets();
  const sessions = useWorkoutStore((state) => state.sessions);
  const unit = useWorkoutStore((state) => state.profile?.weightUnit ?? DEFAULT_WEIGHT_UNIT);
  const lift = useMemo(() => deriveLiftProgress(sessions).find((entry) => entry.name === name), [sessions, name]);
  const workoutType = useWorkoutStore((state) => state.getExerciseWorkoutType)(name);
  const color = workoutType ? getMuscleColor(workoutType) : redesignColors.bone;
  const [range, setRange] = useState<Range>(null);
  const [showRange, setShowRange] = useState(false);
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (range ?? 0) * 7);
  const history = lift?.history.filter((entry) => range === null || entry.date >= cutoff) ?? [];
  const openRange = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options: [...RANGES.map(rangeLabel), 'Cancel'],
        cancelButtonIndex: 4, title: 'Workout history', userInterfaceStyle: 'dark' }, (index) => {
        if (index < 4) setRange(RANGES[index]);
      });
    } else setShowRange(true);
  };

  return <View style={styles.screen}>
    <Stack.Screen options={{ headerShown: true, title: 'Lift history',
      headerStyle: { backgroundColor: redesignColors.ink }, headerTintColor: redesignColors.bone,
      headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal', headerBackTitle: 'Back' }} />
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
      <Text accessibilityRole="header" style={styles.title}>{displayExerciseName(name) || 'Lift history'}</Text>
      {lift ? <>
        <Text style={styles.explanation}>{lift.latest.bodyweight
          ? 'Most reps in a completed set, by workout.'
          : 'Your heaviest completed set from each workout.'}</Text>
        <View style={styles.summary}>
          <WorkoutCardSurface color={color} radius={24} />
          <Text style={styles.label}>Latest workout · {formatLiftDate(lift.latest.date)}</Text>
          <Text style={[styles.latest, { color }]}>{formatLiftPerformance(lift.latest, unit)}</Text>
          {lift.previous && <Text style={styles.copy}>{liftComparisonCopy(lift, unit)}</Text>}
        </View>
        <View style={styles.historyHeading}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Workout history</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`History range, ${rangeLabel(range)}. Change range`}
            onPress={openRange} style={({ pressed }) => [styles.rangeButton, pressed && styles.pressed]}>
            <Text style={styles.rangeLabel}>{rangeLabel(range)}</Text>
            <ChevronDown size={15} color={redesignColors.ash} />
          </Pressable>
        </View>
        {history.map((entry) => <View key={entry.sessionId} accessible
          accessibilityLabel={`${formatLiftDate(entry.date)}. Top set, ${formatLiftPerformance(entry, unit).replace('BW', 'bodyweight')}.`}
          style={styles.historyRow}>
          <Text style={styles.date}>{formatLiftDate(entry.date)}</Text>
          <Text style={styles.performance}>{formatLiftPerformance(entry, unit)}</Text>
        </View>)}
        {history.length === 0 && <View style={styles.empty}>
          <Text style={styles.copy}>No workouts logged in this range.</Text>
          <Pressable accessibilityRole="button" onPress={() => setRange(null)} style={styles.rangeButton}>
            <Text style={styles.rangeLabel}>Show all time</Text>
          </Pressable>
        </View>}
      </> : <View style={styles.empty}>
        <Text style={styles.copy}>No performed weight or rep sets are available for this exercise yet.</Text>
      </View>}
    </ScrollView>
    <Modal visible={showRange} transparent animationType="fade" onRequestClose={() => setShowRange(false)}>
      <View style={styles.modal}>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss range choices" onPress={() => setShowRange(false)} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={styles.menu}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Workout history</Text>
          {RANGES.map((option) => <Pressable key={String(option)} accessibilityRole="radio" accessibilityState={{ checked: option === range }}
            onPress={() => { setRange(option); setShowRange(false); }} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
            <Text style={styles.rangeLabel}>{rangeLabel(option)}</Text>
            {option === range && <Check size={18} color={redesignColors.bone} />}
          </Pressable>)}
          <Pressable accessibilityRole="button" onPress={() => setShowRange(false)} style={styles.menuRow}><Text style={styles.rangeLabel}>Cancel</Text></Pressable>
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: redesignColors.ink },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 20 },
  title: { fontFamily: redesignFonts.display, lineHeight: 39, fontSize: 30, letterSpacing: -1, color: redesignColors.bone },
  explanation: { marginTop: 10, fontFamily: redesignFonts.ui, lineHeight: 22, fontSize: 15, color: redesignColors.ash },
  summary: { marginTop: 24, padding: 20, gap: 10, borderRadius: 24, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: redesignColors.surface },
  label: { fontFamily: redesignFonts.uiMedium, lineHeight: 20, fontSize: 14, color: redesignColors.bone },
  latest: { fontFamily: redesignFonts.monoBold, lineHeight: 38, fontSize: 28, fontVariant: ['tabular-nums'], color: redesignColors.bone },
  copy: { fontFamily: redesignFonts.uiMedium, lineHeight: 22, fontSize: 15, color: redesignColors.ash },
  historyHeading: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
  sectionTitle: { fontFamily: redesignFonts.uiSemiBold, lineHeight: 25, fontSize: 18, color: redesignColors.bone },
  rangeButton: { minHeight: 44, paddingHorizontal: 4, flexDirection: 'row', gap: 6, alignItems: 'center', alignSelf: 'flex-start' },
  rangeLabel: { fontFamily: redesignFonts.uiMedium, lineHeight: 20, fontSize: 14, color: redesignColors.bone },
  pressed: { opacity: 0.65 },
  historyRow: { minHeight: 64, paddingVertical: 18, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: redesignColors.border },
  date: { fontFamily: redesignFonts.uiMedium, lineHeight: 22, fontSize: 15, color: redesignColors.ash },
  performance: { fontFamily: redesignFonts.monoBold, lineHeight: 24, fontSize: 17, fontVariant: ['tabular-nums'], color: redesignColors.bone },
  empty: { paddingVertical: 30, gap: 10 },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 24, justifyContent: 'center' },
  menu: { padding: 20, borderRadius: 22, backgroundColor: redesignColors.surface },
  menuRow: { minHeight: 48, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
});
