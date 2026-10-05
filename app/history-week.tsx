import { contentDateRange } from '@/utils/content';
import { SplitPressable as Pressable } from '@/components/custom-split/SplitPressable';
import { useMemo } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from '@/services/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HistoryWorkoutRow } from '@/components/HistoryWorkoutRow';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { DEFAULT_WEIGHT_UNIT } from '@/store/workoutDatabase';
import { deriveHistoryGroups } from '@/store/workoutHistory';
import { deriveWorkoutSummary } from '@/store/workoutSummary';
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

function formatWeekRange(weekStart: Date, weekEnd: Date): string {
  return contentDateRange(weekStart, weekEnd);
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
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: 20, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {workoutCount} {workoutCount === 1 ? 'workout' : 'workouts'}
          {workoutCount > 0 ? ` · ${totalVolume} ${unitLabel(weightUnit)} moved` : ''}
        </Text>

        {!week ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No workouts from this week.</Text>
            <Text style={styles.emptyCopy}>Return to History to browse your completed workouts.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.returnButton, pressed && styles.pressed]}
            >
              <Text style={styles.returnLabel}>Back to History</Text>
            </Pressable>
          </View>
        ) : null}

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
  title: {
    fontFamily: redesignFonts.display,
    fontSize: 28,
    lineHeight: 35,
    letterSpacing: -0.6,
    color: redesignColors.bone,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: redesignFonts.ui,
    fontSize: 15,
    lineHeight: 22,
    color: redesignColors.ash,
  },
  emptyState: {
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 20,
    lineHeight: 27,
    color: redesignColors.bone,
  },
  emptyCopy: {
    fontFamily: redesignFonts.ui,
    fontSize: 16,
    lineHeight: 24,
    color: redesignColors.ash,
  },
  returnButton: {
    minHeight: 44,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  returnLabel: {
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 16,
    color: redesignColors.bone,
  },
  pressed: {
    opacity: 0.7,
  },
  workoutList: {
    marginTop: 36,
    gap: 12,
  },
});
