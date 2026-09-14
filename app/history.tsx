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
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HistoryWorkoutRow } from '@/components/HistoryWorkoutRow';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { deriveHistoryGroups, type HistoryWeekGroup } from '@/store/workoutHistory';
import { formatSummaryDate } from '@/store/workoutSummary';
import {
  toLocalCalendarDate,
  useWorkoutStore,
  type WorkoutSession,
} from '@/store/workoutStore';
import '@/global.css';

function formatWeekDate(date: Date): string {
  return formatSummaryDate(date).replace(/^[^,]+,\s*/, '');
}

function formatWeekRange(weekStart: Date, weekEnd: Date): string {
  return `${formatWeekDate(weekStart)} \u2013 ${formatWeekDate(weekEnd)}`;
}

function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionDivider} />
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

  return (
    <Pressable
      accessibilityHint="Opens workouts from this week"
      accessibilityLabel={`${formatWeekRange(group.weekStart, group.weekEnd)}, ${workoutCount} ${workoutCount === 1 ? 'workout' : 'workouts'}`}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.earlierRow}
    >
      <View style={styles.weekIdentity}>
        <Text numberOfLines={1} style={styles.weekRange}>
          {formatWeekRange(group.weekStart, group.weekEnd)}
        </Text>
      </View>
      <Text style={styles.workoutCount}>
        {workoutCount} {workoutCount === 1 ? 'workout' : 'workouts'}
      </Text>
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
        // Slice 4 owns this route; keep its calendar-date contract explicit.
        pathname: '/history-week' as '/workout-summary',
        params: { weekStart: toLocalCalendarDate(group.weekStart) },
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
            accessibilityLabel="Back to progress"
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
              minimumFontScale={0.85}
              numberOfLines={1}
              style={styles.title}
            >
              History
            </Text>
            <Text style={styles.subtitle}>
              {totalWorkouts === 0
                ? 'NO WORKOUTS LOGGED'
                : `${totalWorkouts} WORKOUTS LOGGED`}
            </Text>
          </View>
        </View>

        {totalWorkouts === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyRule} />
            <Text style={styles.emptyTitle}>Your log starts with the first set.</Text>
            <Text style={styles.emptyCopy}>
              Every workout you finish lands here \u2014 volume, sets, and the full
              recap, ready to reopen or share any time after.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => tap(() => router.replace('/(tabs)'))}
              style={styles.startButton}
            >
              <Text style={styles.startButtonText}>Start today&apos;s workout</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.historyContent}>
            {hasThisWeek ? (
              <View>
                <SectionHeader label="THIS WEEK" count={groups.thisWeek.length} />
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
                <SectionHeader label="EARLIER" />
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
    fontSize: 42,
    lineHeight: 45,
    letterSpacing: -1.4,
    color: redesignColors.bone,
  },
  subtitle: {
    marginTop: 3,
    fontFamily: redesignFonts.mono,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 2.2,
    color: redesignColors.ash,
  },
  historyContent: {
    marginTop: 34,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionLabel: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2.6,
    color: redesignColors.ash,
  },
  sectionDivider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    backgroundColor: redesignColors.border,
  },
  sectionCount: {
    fontFamily: redesignFonts.mono,
    fontSize: 11,
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
  },
  weekRange: {
    flexShrink: 1,
    fontFamily: redesignFonts.monoBold,
    fontSize: 15,
    lineHeight: 20,
    color: redesignColors.bone,
  },
  workoutCount: {
    marginLeft: 16,
    marginRight: 13,
    fontFamily: redesignFonts.ui,
    fontSize: 14,
    color: redesignColors.ash,
  },
  emptyState: {
    flex: 1,
    minHeight: 500,
    justifyContent: 'center',
    paddingBottom: 48,
  },
  emptyRule: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 35,
    backgroundColor: redesignColors.border,
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
    minHeight: 58,
    alignSelf: 'flex-start',
    marginTop: 32,
    paddingHorizontal: 28,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: redesignColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    fontFamily: redesignFonts.uiBold,
    fontSize: 16,
    color: redesignColors.ink,
  },
});
