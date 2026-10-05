import { useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { History, X } from 'lucide-react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseActionButton } from '@/components/ExerciseActionPill';
import { displayExerciseName } from '@/constants/exerciseNames';
import { redesignColors as c, redesignFonts as f } from '@/constants/theme';
import {
  formatHistoryDate,
  formatHistorySet,
  getExerciseHistory,
  type ExerciseHistoryEntry,
} from '@/store/exerciseHistory';
import type { WeightUnit } from '@/store/weightUnits';
import { useWorkoutStore } from '@/store/workoutStore';

type Props = {
  /** The unfinished workout; never shown as its own history. */
  workoutId: string;
  exerciseName: string;
  /** The unit this exercise is being logged in today. */
  weightUnit: WeightUnit;
  accent: string;
};

/** Left-hand action of the logger's floating pill: recent sets for the current exercise. */
export function ExerciseHistory({ workoutId, exerciseName, weightUnit, accent }: Props) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const sessions = useWorkoutStore((state) => state.sessions);
  const [visible, setVisible] = useState(false);
  const name = displayExerciseName(exerciseName);
  const entries = useMemo(
    () => (visible ? getExerciseHistory(sessions, exerciseName, { excludeSessionId: workoutId }) : []),
    [exerciseName, sessions, visible, workoutId]
  );
  const close = () => setVisible(false);

  return (
    <>
      <ExerciseActionButton
        symbol="clock.arrow.circlepath"
        fallback={History}
        accessibilityLabel={`${name} history`}
        accessibilityHint="Shows the sets from your recent workouts with this exercise"
        onPress={() => setVisible(true)}
      />

      <Modal
        visible={visible}
        presentationStyle="pageSheet"
        animationType={reducedMotion ? 'none' : 'slide'}
        allowSwipeDismissal
        onRequestClose={close}
      >
        <View style={[styles.sheet, { paddingTop: Platform.OS === 'ios' ? 28 : insets.top + 16 }]}>
          <View style={styles.header}>
            <View style={styles.heading}>
              <Text accessibilityRole="header" maxFontSizeMultiplier={1.6} style={styles.title}>Exercise history</Text>
              <Text maxFontSizeMultiplier={1.8} style={styles.exerciseName}>{name}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7}
              accessibilityRole="button" accessibilityLabel="Close exercise history"
              onPress={close} style={styles.close}
            >
              <X size={20} color={c.bone} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.list}
            contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) }]}
          >
            {entries.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No history yet</Text>
                <Text style={styles.empty}>
                  Finish a workout with {name} and the sets you log will show up here next time.
                </Text>
              </View>
            ) : entries.map((entry) => (
              <HistoryEntry key={entry.sessionId} entry={entry} weightUnit={weightUnit} accent={accent} />
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function HistoryEntry({ entry, weightUnit, accent }: {
  entry: ExerciseHistoryEntry;
  weightUnit: WeightUnit;
  accent: string;
}) {
  const { label, relative } = formatHistoryDate(entry.date);
  const sets = entry.sets.map((set) => ({ set, text: formatHistorySet(set, weightUnit) }));
  const spokenDate = entry.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const accessibilityLabel = [
    relative ? `${spokenDate}, ${relative}` : spokenDate,
    `${sets.length} ${sets.length === 1 ? 'set' : 'sets'}`,
    ...sets.map(({ text }) => text.accessibilityLabel),
  ].join('. ');

  // One VoiceOver stop per workout keeps the sheet as quick to hear as to scan.
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={styles.entry}>
      <View style={styles.entryHeader}>
        <Text maxFontSizeMultiplier={1.8} style={styles.date}>{label}</Text>
        {relative ? <Text maxFontSizeMultiplier={1.8} style={styles.relative}>{relative}</Text> : null}
      </View>
      {sets.map(({ set, text }, index) => (
        <View key={index} style={styles.set}>
          <View style={[styles.marker, set.top && { backgroundColor: accent }]} />
          <Text maxFontSizeMultiplier={1.8} style={[styles.value, set.top && styles.topValue]}>
            {text.load ? (
              <>
                {text.load}
                <Text style={styles.unit}> {text.unit}</Text>
                {' '}
              </>
            ) : null}
            {text.measure}
          </Text>
          {set.type === 'dropset' ? <Text maxFontSizeMultiplier={1.4} style={styles.tag}>DROP</Text> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: c.ink },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 24, paddingBottom: 20 },
  heading: { flex: 1 },
  title: { fontFamily: f.display, color: c.bone, fontSize: 28 },
  exerciseName: { fontFamily: f.uiMedium, color: c.ash, fontSize: 16, marginTop: 4 },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1 },
  content: { paddingHorizontal: 24, gap: 12 },
  emptyState: { alignItems: 'flex-start', marginTop: 8, gap: 8 },
  emptyTitle: { fontFamily: f.uiSemiBold, color: c.bone, fontSize: 20 },
  empty: { fontFamily: f.ui, color: c.ash, fontSize: 16, lineHeight: 24 },
  entry: {
    borderRadius: 22, borderCurve: 'continuous', borderWidth: 1, borderColor: c.border,
    backgroundColor: c.surface, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10,
  },
  entryHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 12, marginBottom: 6 },
  date: { fontFamily: f.uiSemiBold, color: c.bone, fontSize: 15 },
  relative: { fontFamily: f.ui, color: c.ash, fontSize: 13 },
  set: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 30, paddingVertical: 2 },
  marker: { width: 6, height: 6, borderRadius: 3 },
  value: { flexShrink: 1, fontFamily: f.uiMedium, color: c.ash, fontSize: 17, fontVariant: ['tabular-nums'] },
  topValue: { fontFamily: f.uiSemiBold, color: c.bone },
  unit: { fontFamily: f.uiMedium, color: c.ash, fontSize: 14 },
  tag: { fontFamily: f.monoBold, color: c.ashDim, fontSize: 10, letterSpacing: 1.2 },
});
