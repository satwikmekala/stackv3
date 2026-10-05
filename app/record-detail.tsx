import { displayExerciseName } from '@/constants/exerciseNames';
/** @jsxImportSource react */
import { useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from '@/services/haptics';
import { ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { useWorkoutStore } from '@/store/workoutStore';
import { DEFAULT_WEIGHT_UNIT, readExerciseRecordSetsSync } from '@/store/workoutDatabase';
import { formatLiftDate, formatLiftPerformance } from '@/store/liftProgress';
import { deriveRecordProgression, formatRecordDelta, recordPerformance } from '@/store/personalRecords';
import { formatWeight, unitLabel } from '@/store/weightUnits';
import { WorkoutCardSurface } from '@/components/home/WorkoutCardSurface';
import '@/global.css';

export default function RecordDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ exerciseName?: string | string[] }>();
  const exerciseName = (Array.isArray(params.exerciseName) ? params.exerciseName[0] : params.exerciseName) ?? '';
  const sessions = useWorkoutStore((state) => state.sessions);
  const unit = useWorkoutStore((state) => state.profile?.weightUnit ?? DEFAULT_WEIGHT_UNIT);
  const sets = useMemo(() => exerciseName ? readExerciseRecordSetsSync(exerciseName, sessions) : [], [exerciseName, sessions]);
  const { milestones, current } = useMemo(() => deriveRecordProgression(sets), [sets]);
  const openHistory = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    router.push({ pathname: '/lift-detail', params: { exerciseName } });
  };

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Text accessibilityRole="header" style={styles.title}>{displayExerciseName(exerciseName) || 'Personal record'}</Text>
        {current ? <>
          <View accessible accessibilityLabel={`Personal record, ${formatLiftPerformance(recordPerformance(current.set), unit)}. Set ${formatLiftDate(current.set.date)}.`}
            style={styles.record}>
            <WorkoutCardSurface color={redesignColors.accent} radius={24} />
            <View style={styles.recordHeader}>
              <Text style={styles.recordLabel}>Personal record</Text>
              <Text style={styles.recordDate}>{formatLiftDate(current.set.date)}</Text>
            </View>
            {/* One line, so the record reads as a single fact and fills the card. */}
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={styles.recordLine}>
              {current.set.weight === 0
                ? <><Text style={styles.recordValue}>{current.set.reps}</Text><Text style={styles.recordUnit}> reps</Text></>
                : <><Text style={styles.recordValue}>{formatWeight(current.set.weight, unit)}</Text>
                  <Text style={styles.recordUnit}> {unitLabel(unit)}</Text>
                  <Text style={styles.recordTimes}>  ×  </Text>
                  <Text style={styles.recordReps}>{current.set.reps}</Text></>}
            </Text>
            {current.set.weight === 0 && <Text style={styles.recordCaption}>Bodyweight</Text>}
          </View>

          <Text accessibilityRole="header" style={styles.sectionTitle}>Record progression</Text>
          <Text style={styles.explanation}>{milestones.length === 1
            ? 'Your first record. Beat it to add the next milestone.'
            : 'Only the sets that beat your best at the time.'}</Text>
          {/* A single record would only repeat the card above. */}
          {milestones.length > 1 && <View style={styles.timeline}>
            {milestones.map((milestone, index) => {
              const delta = formatRecordDelta(milestone.delta, unit);
              const performance = formatLiftPerformance(recordPerformance(milestone.set), unit);
              const last = index === milestones.length - 1;
              return (
                <View key={milestone.set.id} accessible
                  accessibilityLabel={`${formatLiftDate(milestone.set.date)}. ${performance}. ${milestone.isCurrent ? 'Current record' : delta ? delta : 'First record'}.`}
                  style={styles.milestone}>
                  <View style={styles.rail}>
                    <View style={[styles.dot, milestone.isCurrent && styles.dotCurrent]} />
                    {!last && <View style={styles.line} />}
                  </View>
                  <View style={[styles.milestoneCopy, !last && styles.milestoneGap]}>
                    <Text style={styles.date}>{formatLiftDate(milestone.set.date)}</Text>
                    <Text style={[styles.performance, milestone.isCurrent && styles.performanceCurrent]}>{performance}</Text>
                    <Text style={[styles.delta, milestone.isCurrent && styles.deltaCurrent]}>
                      {milestone.isCurrent ? delta ? `Current record · ${delta}` : 'Current record' : delta ?? 'First record'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>}

          <Pressable accessibilityRole="button" accessibilityHint="Opens every workout for this exercise"
            onPress={openHistory} style={({ pressed }) => [styles.historyLink, pressed && styles.pressed]}>
            <Text style={styles.historyLabel}>View lift history</Text>
            <ChevronRight size={17} color={redesignColors.ash} />
          </Pressable>
        </> : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No record yet</Text>
            <Text style={styles.copy}>Complete a set of this exercise to set your first record.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: redesignColors.ink },
  content: { paddingHorizontal: 24, paddingTop: 20 },
  title: { fontFamily: redesignFonts.display, lineHeight: 39, fontSize: 30, letterSpacing: -1, color: redesignColors.bone },
  record: { marginTop: 24, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, borderRadius: 24, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: redesignColors.surface },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  recordLabel: { flexShrink: 1, fontFamily: redesignFonts.uiMedium, lineHeight: 20, fontSize: 14, color: redesignColors.bone },
  recordDate: { fontFamily: redesignFonts.uiMedium, lineHeight: 20, fontSize: 14, fontVariant: ['tabular-nums'], color: redesignColors.bone },
  recordLine: { marginTop: 10, lineHeight: 56, fontFamily: redesignFonts.monoBold, fontVariant: ['tabular-nums'], color: redesignColors.bone },
  recordValue: { fontFamily: redesignFonts.monoBold, fontSize: 52, letterSpacing: -2, color: redesignColors.accent },
  recordUnit: { fontFamily: redesignFonts.uiMedium, fontSize: 18, color: redesignColors.bone },
  recordTimes: { fontFamily: redesignFonts.uiMedium, fontSize: 24, color: redesignColors.ash },
  recordReps: { fontFamily: redesignFonts.monoBold, fontSize: 34, letterSpacing: -1, color: redesignColors.bone },
  recordCaption: { fontFamily: redesignFonts.uiMedium, lineHeight: 20, fontSize: 14, color: redesignColors.ash },
  copy: { fontFamily: redesignFonts.uiMedium, lineHeight: 22, fontSize: 15, color: redesignColors.ash },
  sectionTitle: { marginTop: 32, fontFamily: redesignFonts.uiSemiBold, lineHeight: 25, fontSize: 18, color: redesignColors.bone },
  explanation: { marginTop: 6, fontFamily: redesignFonts.ui, lineHeight: 22, fontSize: 15, color: redesignColors.ash },
  timeline: { marginTop: 20 },
  milestone: { flexDirection: 'row', gap: 16 },
  // The rail centres an 11pt dot against the date's first line.
  rail: { width: 11, alignItems: 'center', paddingTop: 5 },
  dot: { width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: redesignColors.ashDim, backgroundColor: redesignColors.ink },
  dotCurrent: { borderColor: redesignColors.accent, backgroundColor: redesignColors.accent },
  line: { flex: 1, width: 2, marginTop: 4, marginBottom: -1, borderRadius: 1, backgroundColor: redesignColors.border },
  milestoneCopy: { flex: 1, minWidth: 0, gap: 4 },
  milestoneGap: { paddingBottom: 26 },
  date: { fontFamily: redesignFonts.uiMedium, lineHeight: 20, fontSize: 14, fontVariant: ['tabular-nums'], color: redesignColors.ash },
  performance: { fontFamily: redesignFonts.monoBold, lineHeight: 24, fontSize: 17, fontVariant: ['tabular-nums'], color: redesignColors.bone },
  performanceCurrent: { color: redesignColors.accent },
  delta: { fontFamily: redesignFonts.ui, lineHeight: 19, fontSize: 13, fontVariant: ['tabular-nums'], color: redesignColors.ash },
  deltaCurrent: { color: redesignColors.bone },
  historyLink: { marginTop: 28, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: redesignColors.border },
  historyLabel: { fontFamily: redesignFonts.uiMedium, lineHeight: 20, fontSize: 15, color: redesignColors.ash },
  pressed: { opacity: 0.65 },
  empty: { paddingVertical: 30, gap: 10 },
  emptyTitle: { fontFamily: redesignFonts.uiSemiBold, lineHeight: 27, fontSize: 20, color: redesignColors.bone },
});
