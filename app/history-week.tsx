import { useMemo } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HistoryWorkoutRow } from '@/components/HistoryWorkoutRow';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { DEFAULT_WEIGHT_UNIT } from '@/store/workoutDatabase';
import { deriveHistoryGroups } from '@/store/workoutHistory';
import { deriveWorkoutSummary, formatSummaryDate } from '@/store/workoutSummary';
import {
  parseSessionDate,
  toLocalCalendarDate,
  useWorkoutStore,
  type WorkoutSession,
} from '@/store/workoutStore';
import { formatWeight, unitLabel, type WeightUnit } from '@/store/weightUnits';
import '@/global.css';

const useWeightUnit = (): WeightUnit =>
  useWorkoutStore((state) => state.profile?.weightUnit ?? DEFAULT_WEIGHT_UNIT);

function formatWeekDate(date: Date): string {
  return formatSummaryDate(date).replace(/^[^,]+,\s*/, '');
}

function formatWeekRange(weekStart: Date, weekEnd: Date): string {
  return `${formatWeekDate(weekStart)} \u2013 ${formatWeekDate(weekEnd)}`;
}

function groupFormattedWeight(value: string): string {
  const [whole, decimal] = value.split('.');
  const groupedWhole = Number(whole).toLocaleString('en-US');
  return decimal ? `${groupedWhole}.${decimal}` : groupedWhole;
}

export default function HistoryWeek() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ weekStart?: string | string[] }>();
  const requestedWeekStart = Array.isArray(params.weekStart)
    ? params.weekStart[0]
    : params.weekStart;
  const sessions = useWorkoutStore((state) => state.sessions);
  const weightUnit = useWeightUnit();
  const groups = useMemo(() => deriveHistoryGroups(sessions), [sessions]);
  const week = useMemo(
    () =>
      groups.pastWeeks.find(
        (group) => toLocalCalendarDate(group.weekStart) === requestedWeekStart
      ),
    [groups.pastWeeks, requestedWeekStart]
  );
  const fallbackWeekStart = useMemo(
    () => (requestedWeekStart ? parseSessionDate(requestedWeekStart) : null),
    [requestedWeekStart]
  );
  const fallbackWeekEnd = useMemo(() => {
    if (!fallbackWeekStart) return null;
    const end = new Date(fallbackWeekStart);
    end.setDate(fallbackWeekStart.getDate() + 6);
    return end;
  }, [fallbackWeekStart]);
  const title = week
    ? formatWeekRange(week.weekStart, week.weekEnd)
    : fallbackWeekStart && fallbackWeekEnd
      ? formatWeekRange(fallbackWeekStart, fallbackWeekEnd)
      : 'History';
  const workoutCount = week?.sessions.length ?? 0;
  const totalVolumeKg = useMemo(
    () =>
      week?.sessions.reduce(
        (total, session) => total + deriveWorkoutSummary(session).volumeKg,
        0
      ) ?? 0,
    [week]
  );
  const totalVolume = groupFormattedWeight(
    formatWeight(totalVolumeKg, weightUnit)
  );

  const tap = (callback: () => void) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    callback();
  };

  const openSession = (session: WorkoutSession) => {
    tap(() =>
      router.push({
        pathname: '/workout-summary',
        params: { sessionId: session.id, source: 'history' },
      })
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
          { paddingTop: insets.top + 25, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back to history"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => tap(() => router.back())}
            style={styles.backButton}
          >
            <ChevronLeft color={redesignColors.bone} size={29} strokeWidth={2.3} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.68}
              numberOfLines={1}
              style={styles.title}
            >
              {title}
            </Text>
            <Text style={styles.subtitle}>
              {workoutCount} WORKOUTS \u00b7 {totalVolume}{' '}
              {unitLabel(weightUnit).toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.workoutList}>
          {week?.sessions.map((session) => (
            <HistoryWorkoutRow
              key={session.id}
              onPress={() => openSession(session)}
              session={session}
            />
          ))}
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
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 30,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 20,
  },
  title: {
    fontFamily: redesignFonts.display,
    fontSize: 36,
    lineHeight: 43,
    letterSpacing: -1.2,
    color: redesignColors.bone,
  },
  subtitle: {
    marginTop: 3,
    fontFamily: redesignFonts.mono,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.8,
    color: redesignColors.ash,
  },
  workoutList: {
    marginTop: 36,
    gap: 12,
  },
});
