import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ARCHETYPE_COMPOSITIONS,
  type Archetype,
  type SessionWorkoutClassification,
} from '@/constants/archetypes';
import { redesignColors, redesignFonts } from '@/constants/theme';
import {
  parseSessionDate,
  useWorkoutStore,
  type ExerciseSet,
  type WorkoutSession,
} from '@/store/workoutStore';
import '@/global.css';

type RecordFilter = 'all' | Archetype;

type RecordItem = {
  id: string;
  exercise: string;
  weight: number;
  reps: number;
  date: Date;
  session: SessionWorkoutClassification;
};

const RECORD_ARCHETYPES: Archetype[] = [
  'push',
  'pull',
  'legs',
  'upper',
  'lower',
  'full_body',
];

const RECORD_FILTERS: { label: string; value: RecordFilter }[] = [
  { label: 'ALL', value: 'all' },
  ...RECORD_ARCHETYPES.map((archetype) => ({
    label: ARCHETYPE_COMPOSITIONS[archetype].shortLabel.toUpperCase(),
    value: archetype,
  })),
];

const MONTHS = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
];

const CARD_BORDER = 'rgba(169, 159, 145, 0.22)';

const formatNumber = (value: number) =>
  value.toLocaleString('en-US', { maximumFractionDigits: 1 });

const strongestSet = (sets: ExerciseSet[]) =>
  [...sets].sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];

function deriveRecordHistory(sessions: WorkoutSession[]): RecordItem[] {
  const completedSessions = sessions
    .filter((session) => session.completed)
    .sort(
      (a, b) =>
        parseSessionDate(a.date).getTime() - parseSessionDate(b.date).getTime()
    );

  if (completedSessions.length === 0) {
    return [];
  }

  const bestByExercise = new Map<string, { weight: number; reps: number }>();
  const records: RecordItem[] = [];

  completedSessions.forEach((session) => {
    const sessionClassification: SessionWorkoutClassification = {
      archetype: session.archetype,
      secondaryArchetype: session.secondaryArchetype,
      workoutTypes: session.workoutTypes,
    };

    session.exercises.forEach((exercise, exerciseIndex) => {
      const completedSets = exercise.sets.filter((set) => set.completed);
      const availableSets = completedSets.length > 0 ? completedSets : exercise.sets;
      const bestSet = strongestSet(availableSets);
      if (!bestSet) return;

      const previous = bestByExercise.get(exercise.name);
      const improved =
        !previous ||
        bestSet.weight > previous.weight ||
        (bestSet.weight === previous.weight && bestSet.reps > previous.reps);

      if (improved) {
        bestByExercise.set(exercise.name, { weight: bestSet.weight, reps: bestSet.reps });
        records.push({
          id: `${session.id}-${exerciseIndex}`,
          exercise: exercise.name === 'Squats' ? 'Squat' : exercise.name,
          weight: bestSet.weight,
          reps: bestSet.reps,
          date: parseSessionDate(session.date),
          session: sessionClassification,
        });
      }
    });
  });

  return records.sort((a, b) => b.date.getTime() - a.date.getTime());
}

function groupByMonth(records: RecordItem[]) {
  const groups: { key: string; label: string; records: RecordItem[] }[] = [];

  records.forEach((record) => {
    const key = `${record.date.getFullYear()}-${record.date.getMonth()}`;
    let group = groups.find((item) => item.key === key);
    if (!group) {
      group = {
        key,
        label: `${MONTHS[record.date.getMonth()]} ${record.date.getFullYear()}`,
        records: [],
      };
      groups.push(group);
    }
    group.records.push(record);
  });

  return groups;
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Show ${label.toLowerCase()} records`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        {
          backgroundColor: selected ? '#FF7A3D' : '#1D1915',
          borderColor: selected ? '#FF7A3D' : '#71685E',
        },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.filterText, { color: selected ? '#13110E' : '#F5F0E8' }]}>{label}</Text>
    </Pressable>
  );
}

function RecordRow({ record, isLast }: { record: RecordItem; isLast: boolean }) {
  return (
    <View style={[styles.recordRow, !isLast && styles.recordRowBorder]}>
      <View style={styles.recordIdentity}>
        <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={2} style={styles.exerciseName}>
          {record.exercise}
        </Text>
      </View>
      <View style={styles.performance}>
        <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={1} style={styles.performanceText}>
          {record.weight === 0 ? 'BW' : `${formatNumber(record.weight)} kg`}
          <Text style={styles.multiply}> × </Text>
          <Text style={styles.reps}>{record.reps}</Text>
        </Text>
      </View>
    </View>
  );
}

export default function AllRecords() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sessions = useWorkoutStore((state) => state.sessions);
  const [selectedFilters, setSelectedFilters] = useState<Archetype[]>([]);

  const allRecords = useMemo(() => deriveRecordHistory(sessions), [sessions]);
  const visibleRecords = useMemo(
    () => allRecords.filter((record) => {
      if (selectedFilters.length === 0) return true;
      if (!record.session.archetype) return false;
      return selectedFilters.includes(record.session.archetype) ||
        Boolean(
          record.session.secondaryArchetype &&
          selectedFilters.includes(record.session.secondaryArchetype)
        );
    }),
    [allRecords, selectedFilters]
  );
  const groups = useMemo(() => groupByMonth(visibleRecords), [visibleRecords]);

  const tap = (callback: () => void) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    callback();
  };

  const toggleFilter = (value: RecordFilter) => {
    if (value === 'all') {
      setSelectedFilters([]);
      return;
    }

    setSelectedFilters((filters) =>
      filters.includes(value)
        ? filters.filter((filter) => filter !== value)
        : [...filters, value]
    );
  };

  return (
    <View style={styles.screen}>
      <LinearGradient
        pointerEvents="none"
        colors={['#17130F', redesignColors.ink, '#100E0C']}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 25, paddingBottom: insets.bottom + 132 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back to progress"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => tap(() => router.back())}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <ChevronLeft color={redesignColors.bone} size={29} strokeWidth={2.3} />
          </Pressable>
          <Text adjustsFontSizeToFit minimumFontScale={0.85} numberOfLines={1} style={styles.title}>
            All Records
          </Text>
        </View>

        <View style={styles.filters}>
          {RECORD_FILTERS.map((item) => {
            const selected = item.value === 'all'
              ? selectedFilters.length === 0
              : selectedFilters.includes(item.value);
            return (
              <FilterChip
                key={item.value}
                label={item.label}
                selected={selected}
                onPress={() => tap(() => toggleFilter(item.value))}
              />
            );
          })}
        </View>

        <View style={styles.monthList}>
          {groups.map((group) => (
            <View key={group.key} style={styles.monthSection}>
              <Text style={styles.monthLabel}>{group.label}</Text>
              <View style={styles.recordCard}>
                {group.records.map((record, index) => (
                  <RecordRow
                    key={record.id}
                    record={record}
                    isLast={index === group.records.length - 1}
                  />
                ))}
              </View>
            </View>
          ))}

          {groups.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No records here yet</Text>
              <Text style={styles.emptyCopy}>Your next personal best will show up in this category.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: redesignColors.ink,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
  title: {
    flex: 1,
    minWidth: 0,
    marginLeft: 20,
    fontFamily: redesignFonts.display,
    fontSize: 42,
    lineHeight: 50,
    letterSpacing: -1.4,
    color: redesignColors.bone,
  },
  filters: {
    marginTop: 30,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    minHeight: 42,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#71685E',
    backgroundColor: redesignColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: redesignColors.bone,
  },
  monthList: {
    marginTop: 32,
    gap: 31,
  },
  monthSection: {
    gap: 16,
  },
  monthLabel: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 12,
    letterSpacing: 2.6,
    color: redesignColors.ash,
  },
  recordCard: {
    borderRadius: 25,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: redesignColors.surface,
    overflow: 'hidden',
  },
  recordRow: {
    minHeight: 81,
    paddingHorizontal: 18,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: redesignColors.border,
  },
  recordIdentity: {
    flex: 1,
    minWidth: 0,
  },
  exerciseName: {
    fontFamily: redesignFonts.uiBold,
    fontSize: 17,
    lineHeight: 21,
    color: redesignColors.bone,
  },
  performance: {
    width: 112,
    minWidth: 0,
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  performanceText: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 14,
    lineHeight: 20,
    color: redesignColors.bone,
  },
  multiply: {
    color: redesignColors.ashDim,
  },
  reps: {
    color: redesignColors.ash,
  },
  emptyState: {
    minHeight: 190,
    padding: 28,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: redesignColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: redesignFonts.uiBold,
    fontSize: 18,
    color: redesignColors.bone,
  },
  emptyCopy: {
    maxWidth: 245,
    marginTop: 8,
    fontFamily: redesignFonts.ui,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: redesignColors.ash,
  },
});
