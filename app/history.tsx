import { contentDateRange } from '@/utils/content';
import { SplitPressable as Pressable } from '@/components/custom-split/SplitPressable';
import { useMemo } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from '@/services/haptics';
import { ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HistoryWorkoutRow } from '@/components/HistoryWorkoutRow';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { deriveHistoryGroups, type HistoryWeekGroup } from '@/store/workoutHistory';
import {
  toLocalCalendarDate,
  useWorkoutStore,
  type WorkoutSession,
} from '@/store/workoutStore';
import '@/global.css';

function formatWeekRange(weekStart: Date, weekEnd: Date): string {
  return contentDateRange(weekStart, weekEnd);
}

function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text accessibilityRole="header" style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionSpacer} />
      {count !== undefined ? <Text style={styles.sectionCount}>{count}</Text> : null}
    </View>
  );
}

function EarlierWeekRow({
  group,
  onPress,
}: {
  group: HistoryWeekGroup;
  onPress: () => void;
}) {
  const workoutCount = group.sessions.length;
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale > 1.3;

  return (
    <Pressable
      accessibilityHint="Opens workouts from this week"
      accessibilityLabel={`${formatWeekRange(group.weekStart, group.weekEnd)}, ${workoutCount} ${workoutCount === 1 ? 'workout' : 'workouts'}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.earlierRow, pressed && styles.pressed]}
    >
      <View style={[styles.weekIdentity, stacked && styles.stackedWeek]}>
        <Text style={[styles.weekRange, stacked && styles.stackedWeekRange]}>
          {formatWeekRange(group.weekStart, group.weekEnd)}
        </Text>
        <Text style={styles.workoutCount}>
          {workoutCount} {workoutCount === 1 ? 'workout' : 'workouts'}
        </Text>
      </View>
      <ChevronRight color={redesignColors.ash} size={20} strokeWidth={2.1} />
    </Pressable>
  );
}

export default function History() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sessions = useWorkoutStore((state) => state.sessions);
  const groups = useMemo(() => deriveHistoryGroups(sessions), [sessions]);
  const totalWorkouts = useMemo(
    () =>
      groups.thisWeek.length +
      groups.pastWeeks.reduce((total, group) => total + group.sessions.length, 0),
    [groups]
  );
  const hasThisWeek = groups.thisWeek.length > 0;
  const hasPastWeeks = groups.pastWeeks.length > 0;

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

  const openWeek = (group: HistoryWeekGroup) => {
    tap(() =>
      router.push({
        pathname: '/history-week',
        params: { weekStart: toLocalCalendarDate(group.weekStart) },
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
        <Text style={styles.subtitle}>
          {totalWorkouts === 0
            ? 'No workouts logged yet'
            : `${totalWorkouts} ${totalWorkouts === 1 ? 'workout' : 'workouts'} logged`}
        </Text>

        {totalWorkouts === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Your log starts with the first set.</Text>
            <Text style={styles.emptyCopy}>
              Your completed workouts will show here.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => tap(() => router.replace('/(tabs)'))}
              style={({ pressed }) => [styles.startButton, pressed && styles.pressed]}
            >
              <Text style={styles.startButtonText}>View today&apos;s workout</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.historyContent}>
            {hasThisWeek ? (
              <View>
                <SectionHeader label="This week" count={groups.thisWeek.length} />
                <View style={styles.thisWeekList}>
                  {groups.thisWeek.map((session) => (
                    <HistoryWorkoutRow
                      key={session.id}
                      onPress={() => openSession(session)}
                      session={session}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {hasPastWeeks ? (
              <View style={hasThisWeek ? styles.earlierSection : undefined}>
                <SectionHeader label="Earlier" />
                <View style={styles.earlierList}>
                  {groups.pastWeeks.map((group) => (
                    <EarlierWeekRow
                      group={group}
                      key={toLocalCalendarDate(group.weekStart)}
                      onPress={() => openWeek(group)}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        )}
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
  subtitle: {
    fontFamily: redesignFonts.ui,
    fontSize: 15,
    lineHeight: 21,
    color: redesignColors.ash,
  },
  historyContent: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionLabel: {
    flexShrink: 1,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 15,
    lineHeight: 21,
    color: redesignColors.ash,
  },
  sectionSpacer: {
    flex: 1,
    minWidth: 12,
  },
  sectionCount: {
    fontFamily: redesignFonts.mono,
    fontVariant: ['tabular-nums'],
    fontSize: 13,
    color: redesignColors.ash,
  },
  thisWeekList: {
    marginTop: 15,
    gap: 12,
  },
  earlierSection: {
    marginTop: 36,
  },
  earlierList: {
    marginTop: 13,
  },
  earlierRow: {
    minHeight: 84,
    paddingVertical: 17,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: redesignColors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stackedWeek: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  weekRange: {
    flex: 1,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 15,
    lineHeight: 20,
    color: redesignColors.bone,
  },
  stackedWeekRange: {
    flex: 0,
  },
  workoutCount: {
    marginRight: 8,
    fontFamily: redesignFonts.ui,
    fontSize: 14,
    color: redesignColors.ash,
  },
  emptyState: {
    flex: 1,
    paddingTop: 48,
    justifyContent: 'center',
    paddingBottom: 48,
  },
  emptyTitle: {
    maxWidth: 350,
    fontFamily: redesignFonts.display,
    fontSize: 34,
    lineHeight: 39,
    letterSpacing: -0.8,
    color: redesignColors.bone,
  },
  emptyCopy: {
    maxWidth: 355,
    marginTop: 21,
    fontFamily: redesignFonts.ui,
    fontSize: 17,
    lineHeight: 27,
    color: redesignColors.ash,
  },
  startButton: {
    minHeight: 52,
    alignSelf: 'flex-start',
    marginTop: 32,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: redesignColors.bone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  startButtonText: {
    fontFamily: redesignFonts.uiBold,
    fontSize: 16,
    color: redesignColors.ink,
  },
});
