import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Modal,
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
import {
  ArrowUp,
  Check,
  Flame,
  Settings,
  SlidersHorizontal,
  Trophy,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { redesignColors, redesignFonts, splitColors } from '@/constants/theme';
import { useWorkoutStore, type WorkoutSession } from '@/store/workoutStore';
import '@/global.css';

type StrengthMetric = {
  key: string;
  label: string;
  aliases: string[];
  weight: number;
  gain: number;
  periodWeeks: number;
  color: string;
  weeklyPoints: StrengthWeekPoint[];
};

type StrengthRange = 4 | 8 | 12 | 16;

type StrengthWeekPoint = {
  week: number;
  weight: number | null;
  change: number;
  recorded: boolean;
};

type PersonalRecord = {
  key: string;
  label: string;
  aliases: string[];
  weight: number;
  reps: number;
  daysAgo: number;
  color: string;
};

const PREVIEW_STRENGTH: StrengthMetric[] = [
  {
    key: 'bench',
    label: 'Bench Press',
    aliases: ['Bench Press'],
    weight: 50,
    gain: 7.5,
    periodWeeks: 4,
    color: splitColors.chest,
    weeklyPoints: [],
  },
  {
    key: 'deadlift',
    label: 'Deadlift',
    aliases: ['Deadlift'],
    weight: 110,
    gain: 12.5,
    periodWeeks: 4,
    color: splitColors.back,
    weeklyPoints: [],
  },
  {
    key: 'squat',
    label: 'Squat',
    aliases: ['Squat', 'Squats'],
    weight: 90,
    gain: 10,
    periodWeeks: 4,
    color: splitColors.legs,
    weeklyPoints: [],
  },
  {
    key: 'overhead-press',
    label: 'Overhead Press',
    aliases: ['Overhead Press'],
    weight: 35,
    gain: 5,
    periodWeeks: 4,
    color: splitColors.shoulders,
    weeklyPoints: [],
  },
];

const PREVIEW_RECORDS: PersonalRecord[] = [
  {
    key: 'deadlift',
    label: 'Deadlift',
    aliases: ['Deadlift'],
    weight: 110,
    reps: 5,
    daysAgo: 3,
    color: splitColors.back,
  },
  {
    key: 'bench',
    label: 'Bench Press',
    aliases: ['Bench Press'],
    weight: 50,
    reps: 8,
    daysAgo: 6,
    color: splitColors.chest,
  },
  {
    key: 'squat',
    label: 'Squat',
    aliases: ['Squat', 'Squats'],
    weight: 90,
    reps: 5,
    daysAgo: 9,
    color: splitColors.legs,
  },
];

const PREVIEW_WEEKS = [
  true,
  true,
  true,
  true,
  false,
  true,
  true,
  true,
  true,
  true,
  false,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
];

const SECTION_BORDER = 'rgba(169, 159, 145, 0.18)';
const STREAK_ORANGE = splitColors.chest;
const STRENGTH_RANGES: StrengthRange[] = [4, 8, 12, 16];

const formatNumber = (value: number) =>
  value.toLocaleString('en-US', { maximumFractionDigits: 1 });

const getSessionVolume = (session: WorkoutSession) => {
  const allSets = session.exercises.flatMap((exercise) => exercise.sets);
  const completedSets = allSets.filter((set) => set.completed);
  const setsToCount = completedSets.length > 0 ? completedSets : allSets;
  return setsToCount.reduce((sum, set) => sum + set.weight * set.reps, 0);
};

const getStartOfWeek = (date: Date) => {
  const start = new Date(date);
  const day = start.getDay();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - day + (day === 0 ? -6 : 1));
  return start;
};

const matchingExercise = (session: WorkoutSession, aliases: string[]) =>
  session.exercises.find((exercise) => aliases.includes(exercise.name));

const roundToHalf = (value: number) => Math.round(value * 2) / 2;

const getExerciseHistory = (completedSessions: WorkoutSession[], aliases: string[]) =>
  completedSessions
    .map((session) => {
      const exercise = matchingExercise(session, aliases);
      if (!exercise) return null;
      const completedSets = exercise.sets.filter((set) => set.completed);
      const sets = completedSets.length > 0 ? completedSets : exercise.sets;
      const weight = Math.max(...sets.map((set) => set.weight), 0);
      return { date: new Date(session.date), weight };
    })
    .filter((entry): entry is { date: Date; weight: number } => Boolean(entry))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

function buildPreviewStrengthMetric(preview: StrengthMetric, rangeWeeks: StrengthRange) {
  const estimatedGain = Math.min(
    preview.weight,
    roundToHalf(preview.gain * Math.sqrt(rangeWeeks / 4))
  );
  const startWeight = Math.max(0, preview.weight - estimatedGain);
  const step = estimatedGain / Math.max(rangeWeeks - 1, 1);
  let previousWeight = startWeight;
  const weeklyPoints = Array.from({ length: rangeWeeks }, (_, index) => {
    const weight = index === rangeWeeks - 1
      ? preview.weight
      : roundToHalf(startWeight + step * index);
    const change = index === 0 ? 0 : Math.max(0, weight - previousWeight);
    previousWeight = weight;
    return {
      week: index + 1,
      weight,
      change,
      recorded: true,
    };
  });

  return {
    ...preview,
    gain: Math.max(0, preview.weight - startWeight),
    periodWeeks: rangeWeeks,
    weeklyPoints,
  };
}

function buildRecordedStrengthMetric(
  preview: StrengthMetric,
  history: { date: Date; weight: number }[],
  rangeWeeks: StrengthRange
) {
  const latest = history[history.length - 1];
  const rangeEnd = getStartOfWeek(latest.date);
  const rangeStart = new Date(rangeEnd);
  rangeStart.setDate(rangeEnd.getDate() - (rangeWeeks - 1) * 7);

  let carriedWeight = [...history]
    .reverse()
    .find((entry) => entry.date < rangeStart)?.weight ?? null;
  let previousWeight = carriedWeight;

  const weeklyPoints = Array.from({ length: rangeWeeks }, (_, index) => {
    const weekStart = new Date(rangeStart);
    weekStart.setDate(rangeStart.getDate() + index * 7);
    const nextWeek = new Date(weekStart);
    nextWeek.setDate(weekStart.getDate() + 7);
    const entries = history.filter((entry) => entry.date >= weekStart && entry.date < nextWeek);
    const recorded = entries.length > 0;

    if (recorded) carriedWeight = entries[entries.length - 1].weight;
    const weight = carriedWeight;
    const change = weight !== null && previousWeight !== null
      ? weight - previousWeight
      : 0;
    if (weight !== null) previousWeight = weight;

    return { week: index + 1, weight, change, recorded };
  });

  const firstWeight = weeklyPoints.find((point) => point.weight !== null)?.weight ?? latest.weight;

  return {
    ...preview,
    weight: latest.weight,
    gain: Math.max(0, latest.weight - firstWeight),
    periodWeeks: rangeWeeks,
    weeklyPoints,
  };
}

function deriveStrengthMetrics(
  completedSessions: WorkoutSession[],
  rangeWeeks: StrengthRange
) {
  return PREVIEW_STRENGTH.map((preview) => {
    const history = getExerciseHistory(completedSessions, preview.aliases);
    return history.length === 0
      ? buildPreviewStrengthMetric(preview, rangeWeeks)
      : buildRecordedStrengthMetric(preview, history, rangeWeeks);
  });
}

function derivePersonalRecords(completedSessions: WorkoutSession[]) {
  return PREVIEW_RECORDS.map((preview) => {
    const candidates = completedSessions.flatMap((session) => {
      const exercise = matchingExercise(session, preview.aliases);
      if (!exercise) return [];
      const completedSets = exercise.sets.filter((set) => set.completed);
      const sets = completedSets.length > 0 ? completedSets : exercise.sets;
      return sets.map((set) => ({
        weight: set.weight,
        reps: set.reps,
        date: new Date(session.date),
      }));
    });

    if (candidates.length === 0) return preview;

    const best = [...candidates].sort(
      (a, b) => b.weight - a.weight || b.reps - a.reps || b.date.getTime() - a.date.getTime()
    )[0];
    const daysAgo = Math.max(
      0,
      Math.floor((Date.now() - best.date.getTime()) / 86_400_000)
    );

    return { ...preview, weight: best.weight, reps: best.reps, daysAgo };
  });
}

function deriveConsistency(completedSessions: WorkoutSession[], weeklyGoal: number) {
  if (completedSessions.length === 0) {
    return { weeks: PREVIEW_WEEKS, hitWeeks: 22, streak: 6 };
  }

  const currentWeek = getStartOfWeek(new Date());
  const weeks = Array.from({ length: 24 }, (_, index) => {
    const weekStart = new Date(currentWeek);
    weekStart.setDate(currentWeek.getDate() - (23 - index) * 7);
    const nextWeek = new Date(weekStart);
    nextWeek.setDate(weekStart.getDate() + 7);
    const count = completedSessions.filter((session) => {
      const date = new Date(session.date);
      return date >= weekStart && date < nextWeek;
    }).length;
    return count >= weeklyGoal;
  });

  let streak = 0;
  for (let index = weeks.length - 1; index >= 0 && weeks[index]; index -= 1) {
    streak += 1;
  }

  return { weeks, hitWeeks: weeks.filter(Boolean).length, streak };
}

function SectionHeader({
  label,
  meta,
  action,
}: {
  label: string;
  meta?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text numberOfLines={1} style={styles.sectionLabel}>{label}</Text>
      {action ?? (meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null)}
    </View>
  );
}

function StrengthRangeButton({
  rangeWeeks,
  onPress,
}: {
  rangeWeeks: StrengthRange;
  onPress: () => void;
}) {
  return (
    <View style={styles.strengthRangeControl}>
      <Text style={styles.rangeButtonText}>{rangeWeeks} weeks</Text>
      <Pressable
        accessibilityHint="Change the strength progression time range"
        accessibilityLabel={`Showing ${rangeWeeks} weeks. Adjust time range`}
        accessibilityRole="button"
        hitSlop={6}
        onPress={onPress}
        style={({ pressed }) => [styles.rangeButton, pressed && styles.rangeButtonPressed]}
      >
        <SlidersHorizontal color={STREAK_ORANGE} size={20} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

function StrengthRangePicker({
  selectedRange,
  onSelect,
  onDismiss,
}: {
  selectedRange: StrengthRange;
  onSelect: (range: StrengthRange) => void;
  onDismiss: () => void;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 34 }],
  }));

  const close = () => {
    progress.value = withTiming(
      0,
      { duration: 190, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onDismiss)();
      }
    );
  };

  const selectRange = (range: StrengthRange) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    onSelect(range);
    close();
  };

  return (
    <Modal transparent visible animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={styles.rangeModal}>
        <Animated.View style={[styles.detailBackdrop, backdropStyle]}>
          <Pressable
            accessibilityLabel="Close progress range selector"
            onPress={close}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View
          accessibilityLabel="Select strength progress range"
          accessibilityViewIsModal
          style={[styles.rangeSheet, sheetStyle]}
        >
          <View style={styles.rangeSheetHeader}>
            <View style={styles.rangeSheetHeading}>
              <Text style={styles.rangeSheetEyebrow}>STRENGTH PROGRESSION</Text>
              <Text style={styles.rangeSheetTitle}>Adjust time range</Text>
              <Text style={styles.rangeSheetCopy}>
                Compare every lift across the same training window.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close progress range selector"
              accessibilityRole="button"
              hitSlop={8}
              onPress={close}
              style={({ pressed }) => [styles.detailCloseButton, pressed && styles.buttonPressed]}
            >
              <X color={redesignColors.bone} size={21} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.rangeOptionList}>
            {[STRENGTH_RANGES.slice(0, 2), STRENGTH_RANGES.slice(2, 4)].map((row, rowIndex) => (
              <View key={`range-row-${rowIndex}`} style={styles.rangeOptionRow}>
                {row.map((range) => {
                  const selected = range === selectedRange;
                  return (
                    <View key={range} style={styles.rangeOptionSlot}>
                      <Pressable
                        accessibilityLabel={`${range} weeks`}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => selectRange(range)}
                        style={({ pressed }) => [
                          styles.rangeOption,
                          selected && styles.rangeOptionSelected,
                          pressed && styles.rangeOptionPressed,
                        ]}
                      >
                        <View style={styles.rangeOptionContent}>
                          <View style={[styles.rangeOptionCheck, selected && styles.rangeOptionCheckSelected]}>
                            {selected ? <Check color={redesignColors.ink} size={14} strokeWidth={3} /> : null}
                          </View>
                          <Text
                            numberOfLines={1}
                            style={[styles.rangeOptionLabel, selected && styles.rangeOptionLabelSelected]}
                          >
                            {range} weeks
                          </Text>
                        </View>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function StrengthCard({ metric, onPress }: { metric: StrengthMetric; onPress: () => void }) {
  const hasGain = metric.gain > 0;

  return (
    <View style={styles.strengthCardSlot}>
      <Pressable
        accessibilityHint={`Shows the ${metric.periodWeeks}-week progression breakdown`}
        accessibilityLabel={`${metric.label}, ${formatNumber(metric.weight)} kilograms`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.strengthCardTapTarget, pressed && styles.strengthCardPressed]}
      >
        <View style={styles.strengthCard}>
          <View style={[styles.cardAccent, { backgroundColor: metric.color }]} />
          <View style={styles.exerciseTitleRow}>
            <View style={[styles.exerciseDot, { backgroundColor: metric.color }]} />
            <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={2} style={styles.exerciseTitle}>
              {metric.label}
            </Text>
          </View>

          <View style={styles.weightRow}>
            <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={1} style={styles.weightValue}>
              {formatNumber(metric.weight)}
            </Text>
            <Text style={styles.weightUnit}>kg</Text>
          </View>

          <View style={styles.gainRow}>
            {hasGain ? <ArrowUp color={metric.color} size={17} strokeWidth={2.2} /> : null}
            <Text
              style={[styles.gainText, { color: hasGain ? metric.color : redesignColors.ash }]}
            >
              {hasGain ? `+${formatNumber(metric.gain)} kg` : 'No change'}
            </Text>
          </View>
          <Text style={styles.periodText}>
            in {metric.periodWeeks} {metric.periodWeeks === 1 ? 'week' : 'weeks'}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

function StrengthProgressionDetail({
  metric,
  rangeWeeks,
  bottomInset,
  onRangeChange,
  onDismiss,
}: {
  metric: StrengthMetric;
  rangeWeeks: StrengthRange;
  bottomInset: number;
  onRangeChange: (range: StrengthRange) => void;
  onDismiss: () => void;
}) {
  const progress = useSharedValue(0);
  const hasGain = metric.gain > 0;
  const weeklyChange = metric.gain / Math.max(metric.periodWeeks - 1, 1);
  const firstDataIndex = metric.weeklyPoints.findIndex((point) => point.weight !== null);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * 44 },
      { scale: 0.94 + progress.value * 0.06 },
    ],
  }));

  const close = () => {
    progress.value = withTiming(
      0,
      { duration: 220, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onDismiss)();
      }
    );
  };

  return (
    <Modal transparent visible animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={styles.detailModal}>
        <Animated.View style={[styles.detailBackdrop, backdropStyle]}>
          <Pressable
            accessibilityLabel="Close strength progression"
            onPress={close}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View
          accessibilityLabel={`${metric.label} ${metric.periodWeeks}-week progression`}
          accessibilityViewIsModal
          style={[
            styles.detailCard,
            { marginBottom: Math.max(bottomInset, 12) },
            cardStyle,
          ]}
        >
          <View style={[styles.cardAccent, { height: 4, backgroundColor: metric.color }]} />
          <View style={styles.detailHeader}>
            <View style={styles.detailHeadingCopy}>
              <View style={styles.detailEyebrowRow}>
                <View style={[styles.exerciseDot, styles.detailDot, { backgroundColor: metric.color }]} />
                <Text style={[styles.detailEyebrow, { color: metric.color }]}>
                  {metric.periodWeeks}-WEEK PROGRESSION
                </Text>
              </View>
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.detailTitle}>{metric.label}</Text>
            </View>
            <Pressable
              accessibilityLabel="Close strength progression"
              accessibilityRole="button"
              hitSlop={8}
              onPress={close}
              style={({ pressed }) => [styles.detailCloseButton, pressed && styles.buttonPressed]}
            >
              <X color={redesignColors.bone} size={21} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.detailSummary}>
            <View>
              <Text style={styles.detailSummaryLabel}>CURRENT WEIGHT</Text>
              <View style={styles.detailWeightRow}>
                <Text style={styles.detailWeight}>{formatNumber(metric.weight)}</Text>
                <Text style={styles.detailWeightUnit}>kg</Text>
              </View>
            </View>
            <View style={[styles.detailGainPill, { backgroundColor: `${metric.color}18` }]}>
              {hasGain ? <ArrowUp color={metric.color} size={15} strokeWidth={2.4} /> : null}
              <Text style={[styles.detailGainText, { color: metric.color }]}>
                {hasGain ? `+${formatNumber(metric.gain)} kg` : 'No change'}
              </Text>
            </View>
          </View>

          <View style={styles.detailRangeSelector}>
            {STRENGTH_RANGES.map((range) => {
              const selected = range === rangeWeeks;
              return (
                <View key={range} style={styles.detailRangeSlot}>
                  <Pressable
                    accessibilityLabel={`Show ${range} weeks`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.selectionAsync();
                      onRangeChange(range);
                    }}
                    style={({ pressed }) => [
                      styles.detailRangeOption,
                      selected && {
                        borderColor: metric.color,
                        backgroundColor: `${metric.color}2B`,
                      },
                      pressed && styles.rangeOptionPressed,
                    ]}
                  >
                    <View style={styles.detailRangeOptionContent}>
                      <Text
                        adjustsFontSizeToFit
                        minimumFontScale={0.84}
                        numberOfLines={1}
                        style={[
                          styles.detailRangeOptionText,
                          selected && { color: metric.color },
                        ]}
                      >
                        {range}W
                      </Text>
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>

          <View style={styles.breakdownHeader}>
            <Text style={styles.breakdownTitle}>WEEKLY BREAKDOWN</Text>
            <Text style={styles.breakdownMeta}>WEIGHT</Text>
          </View>

          <ScrollView
            contentContainerStyle={styles.weekList}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            style={styles.detailWeekScroll}
          >
            {metric.weeklyPoints.map((week, index) => {
              const current = index === metric.weeklyPoints.length - 1;
              const weeksAgo = metric.periodWeeks - index;
              const caption = current
                ? week.recorded ? 'This week' : 'This week · no workout'
                : week.recorded
                  ? `${weeksAgo} weeks ago`
                  : 'No workout logged';
              const changeColor = week.change > 0 ? metric.color : redesignColors.ashDim;

              return (
                <View
                  key={week.week}
                  style={[styles.weekRow, current && { borderColor: `${metric.color}73` }]}
                >
                <View style={styles.weekMarkerColumn}>
                  <View
                    style={[
                      styles.weekMarker,
                      current && { backgroundColor: metric.color, borderColor: metric.color },
                    ]}
                  >
                    {current ? (
                      <Check color={redesignColors.ink} size={13} strokeWidth={3} />
                    ) : (
                      <Text style={styles.weekMarkerText}>{index + 1}</Text>
                    )}
                  </View>
                  {index < metric.weeklyPoints.length - 1 ? <View style={styles.weekConnector} /> : null}
                </View>
                <View style={styles.weekCopy}>
                  <Text style={[styles.weekLabel, current && { color: metric.color }]}>WEEK {week.week}</Text>
                  <Text style={styles.weekCaption}>{caption}</Text>
                </View>
                <View style={styles.weekValueGroup}>
                  {week.weight === null ? (
                    <Text style={styles.weekStart}>NO DATA</Text>
                  ) : week.change !== 0 ? (
                    <Text style={[styles.weekIncrease, { color: changeColor }]}>
                      {week.change > 0 ? '+' : ''}{formatNumber(week.change)}
                    </Text>
                  ) : index === firstDataIndex ? (
                    <Text style={styles.weekStart}>START</Text>
                  ) : (
                    <Text style={styles.weekStart}>{week.recorded ? 'HELD' : '—'}</Text>
                  )}
                  <Text style={styles.weekValue}>
                    {week.weight === null ? '—' : `${formatNumber(week.weight)} kg`}
                  </Text>
                </View>
              </View>
              );
            })}
          </ScrollView>

          <View style={[styles.detailInsight, { borderLeftColor: metric.color }]}>
            <Text style={styles.detailInsightText}>
              {hasGain
                ? `You added about ${formatNumber(weeklyChange)} kg per week across this ${metric.periodWeeks}-week range.`
                : `Your working weight stayed consistent across this ${metric.periodWeeks}-week range.`}
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function ConsistencyCard({
  weeks,
  hitWeeks,
  streak,
  weeklyGoal,
}: {
  weeks: boolean[];
  hitWeeks: number;
  streak: number;
  weeklyGoal: number;
}) {
  const rows = [weeks.slice(0, 8), weeks.slice(8, 16), weeks.slice(16, 24)];

  return (
    <View style={styles.consistencyCard}>
      <View style={styles.consistencyCopy}>
        <View style={styles.streakRow}>
          <Flame color={STREAK_ORANGE} fill={STREAK_ORANGE} size={16} strokeWidth={1.7} />
          <Text style={styles.streakLabel}>{streak}-WEEK STREAK</Text>
        </View>
        <View style={styles.weekCountRow}>
          <Text style={styles.weekCount}>{hitWeeks}</Text>
          <Text style={styles.weekCountSuffix}>of 24 weeks</Text>
        </View>
        <Text style={styles.goalCopy}>hit your {weeklyGoal}×/week goal</Text>
      </View>

      <View accessibilityLabel={`${hitWeeks} of 24 weeks met your goal`} style={styles.weekGrid}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.weekGridRow}>
            {row.map((complete, columnIndex) => (
              <View
                key={`${rowIndex}-${columnIndex}`}
                style={[styles.weekCell, complete ? styles.weekCellComplete : styles.weekCellEmpty]}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function WeeklyGoalCard({ completed, goal }: { completed: number; goal: number }) {
  const visibleGoal = Math.max(1, Math.min(goal, 7));
  const visibleCompleted = Math.min(completed, visibleGoal);
  const remaining = Math.max(goal - completed, 0);
  const isComplete = remaining === 0;

  return (
    <View
      accessibilityLabel={`${completed} of ${goal} workouts completed this week`}
      style={styles.weeklyGoalCard}
    >
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(241, 130, 73, 0.20)', 'rgba(42, 35, 29, 0.82)', redesignColors.surface]}
        locations={[0, 0.52, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.weeklyGoalTopRow}>
        <View>
          <Text style={styles.weeklyGoalEyebrow}>WEEKLY WORKOUT GOAL</Text>
          <Text style={styles.weeklyGoalHeadline}>
            {isComplete ? 'Goal met.' : `${remaining} ${remaining === 1 ? 'workout' : 'workouts'} to go.`}
          </Text>
        </View>
        <View style={styles.weeklyGoalCount}>
          <Text style={styles.weeklyGoalCompleted}>{completed}</Text>
          <Text style={styles.weeklyGoalTotal}>/{goal}</Text>
        </View>
      </View>

      <View style={styles.weeklyGoalFooter}>
        <View style={styles.weeklyGoalBars}>
          {Array.from({ length: visibleGoal }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.weeklyGoalBar,
                index < visibleCompleted && styles.weeklyGoalBarComplete,
              ]}
            />
          ))}
        </View>
        <Text style={styles.weeklyGoalCaption}>
          {isComplete ? 'Your target is in the bag.' : `Complete ${remaining} more to hit your target.`}
        </Text>
      </View>
    </View>
  );
}

function VolumeCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.volumeCard}>
      <Text style={styles.volumeLabel}>{label}</Text>
      <Text adjustsFontSizeToFit minimumFontScale={0.74} numberOfLines={1} style={styles.volumeValue}>
        {formatNumber(value)}
      </Text>
      <Text style={styles.volumeUnit}>kg lifted</Text>
    </View>
  );
}

function RecordCard({ record }: { record: PersonalRecord }) {
  return (
    <View style={styles.recordCard}>
      <View style={[styles.trophyTile, { backgroundColor: `${record.color}21` }]}>
        <Trophy color={record.color} size={21} strokeWidth={2} />
      </View>
      <View style={styles.recordCopy}>
        <Text numberOfLines={1} style={styles.recordName}>{record.label}</Text>
        <Text numberOfLines={1} style={styles.recordDetails}>
          {formatNumber(record.weight)} kg × {record.reps} reps
        </Text>
      </View>
      <Text style={styles.recordAge}>{record.daysAgo === 0 ? 'today' : `${record.daysAgo}d ago`}</Text>
    </View>
  );
}

export default function Progress() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [strengthRange, setStrengthRange] = useState<StrengthRange>(4);
  const [showStrengthRangePicker, setShowStrengthRangePicker] = useState(false);
  const [selectedStrengthKey, setSelectedStrengthKey] = useState<string | null>(null);
  const profile = useWorkoutStore((state) => state.profile);
  const sessions = useWorkoutStore((state) => state.sessions);
  const getWeeklyProgress = useWorkoutStore((state) => state.getWeeklyProgress);

  const completedSessions = useMemo(
    () => sessions.filter((session) => session.completed),
    [sessions]
  );
  const strengthMetrics = useMemo(
    () => deriveStrengthMetrics(completedSessions, strengthRange),
    [completedSessions, strengthRange]
  );
  const selectedStrengthMetric = useMemo(
    () => strengthMetrics.find((metric) => metric.key === selectedStrengthKey) ?? null,
    [selectedStrengthKey, strengthMetrics]
  );
  const personalRecords = useMemo(
    () => derivePersonalRecords(completedSessions),
    [completedSessions]
  );
  const consistency = useMemo(
    () => deriveConsistency(completedSessions, profile?.weeklyGoal ?? 4),
    [completedSessions, profile?.weeklyGoal]
  );
  const volumes = useMemo(() => {
    if (completedSessions.length === 0) {
      return { thisWeek: 24_500, allTime: 312_400 };
    }
    const currentWeek = getStartOfWeek(new Date());
    const thisWeek = completedSessions
      .filter((session) => new Date(session.date) >= currentWeek)
      .reduce((sum, session) => sum + getSessionVolume(session), 0);
    const allTime = completedSessions.reduce(
      (sum, session) => sum + getSessionVolume(session),
      0
    );
    return { thisWeek, allTime };
  }, [completedSessions]);
  const weeklyProgress = getWeeklyProgress();

  if (!profile) return null;

  const openSettings = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    router.push('/settings');
  };
  const openAllRecords = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    router.push('/records');
  };
  const openStrengthDetail = (metric: StrengthMetric) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setSelectedStrengthKey(metric.key);
  };
  const openStrengthRangePicker = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setShowStrengthRangePicker(true);
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
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 130 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Progress</Text>
          <Pressable
            accessibilityLabel="Open settings"
            accessibilityRole="button"
            hitSlop={8}
            onPress={openSettings}
            style={({ pressed }) => [styles.settingsButton, pressed && styles.buttonPressed]}
          >
            <Settings color={redesignColors.ash} size={24} strokeWidth={2} />
          </Pressable>
        </View>

        <View style={styles.weeklyGoalSection}>
          <WeeklyGoalCard completed={weeklyProgress.completed} goal={weeklyProgress.goal} />
        </View>

        <View style={styles.section}>
          <SectionHeader
            label="STRENGTH PROGRESSION"
            action={(
              <StrengthRangeButton
                rangeWeeks={strengthRange}
                onPress={openStrengthRangePicker}
              />
            )}
          />
          <View style={styles.strengthGrid}>
            {[strengthMetrics.slice(0, 2), strengthMetrics.slice(2, 4)].map((row, rowIndex) => (
              <View key={`strength-row-${rowIndex}`} style={styles.strengthRow}>
                {row.map((metric) => (
                  <StrengthCard
                    key={metric.key}
                    metric={metric}
                    onPress={() => openStrengthDetail(metric)}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader label="CONSISTENCY" />
          <ConsistencyCard
            weeks={consistency.weeks}
            hitWeeks={consistency.hitWeeks}
            streak={consistency.streak}
            weeklyGoal={profile.weeklyGoal}
          />
        </View>

        <View style={styles.section}>
          <SectionHeader label="VOLUME" />
          <View style={styles.volumeGrid}>
            <VolumeCard label="This week" value={volumes.thisWeek} />
            <VolumeCard label="All-time" value={volumes.allTime} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.recordsHeader}>
            <Text style={styles.sectionLabel}>PERSONAL RECORDS</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View all personal records"
              onPress={openAllRecords}
              style={({ pressed }) => [styles.viewAllButton, pressed && styles.viewAllPressed]}
            >
              <Text numberOfLines={1} style={styles.viewAllText}>VIEW ALL  →</Text>
            </Pressable>
          </View>
          <View style={styles.recordList}>
            {personalRecords.map((record) => (
              <RecordCard key={record.key} record={record} />
            ))}
          </View>
        </View>
      </ScrollView>

      {selectedStrengthMetric ? (
        <StrengthProgressionDetail
          metric={selectedStrengthMetric}
          rangeWeeks={strengthRange}
          bottomInset={insets.bottom}
          onRangeChange={setStrengthRange}
          onDismiss={() => setSelectedStrengthKey(null)}
        />
      ) : null}

      {showStrengthRangePicker ? (
        <StrengthRangePicker
          selectedRange={strengthRange}
          onSelect={setStrengthRange}
          onDismiss={() => setShowStrengthRangePicker(false)}
        />
      ) : null}
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
    minHeight: 57,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: redesignFonts.display,
    fontSize: 45,
    lineHeight: 51,
    letterSpacing: -1.5,
    color: redesignColors.bone,
  },
  settingsButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
  weeklyGoalSection: {
    marginTop: 27,
  },
  weeklyGoalCard: {
    minHeight: 202,
    paddingHorizontal: 24,
    paddingTop: 25,
    paddingBottom: 23,
    borderRadius: 27,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(241, 130, 73, 0.56)',
    backgroundColor: redesignColors.surface,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  weeklyGoalTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  weeklyGoalEyebrow: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.65,
    color: STREAK_ORANGE,
  },
  weeklyGoalHeadline: {
    maxWidth: 228,
    marginTop: 11,
    fontFamily: redesignFonts.display,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1.15,
    color: redesignColors.bone,
  },
  weeklyGoalCount: {
    minWidth: 67,
    paddingTop: 2,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
  },
  weeklyGoalCompleted: {
    fontFamily: redesignFonts.display,
    fontSize: 43,
    lineHeight: 47,
    letterSpacing: -1.4,
    color: redesignColors.bone,
  },
  weeklyGoalTotal: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 16,
    color: redesignColors.ash,
  },
  weeklyGoalFooter: {
    marginTop: 20,
  },
  weeklyGoalBars: {
    flexDirection: 'row',
    gap: 6,
  },
  weeklyGoalBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: redesignColors.raised,
  },
  weeklyGoalBarComplete: {
    backgroundColor: STREAK_ORANGE,
  },
  weeklyGoalCaption: {
    marginTop: 12,
    fontFamily: redesignFonts.uiMedium,
    fontSize: 14,
    lineHeight: 19,
    color: redesignColors.ash,
  },
  section: {
    marginTop: 34,
  },
  sectionHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionLabel: {
    flex: 1,
    minWidth: 0,
    fontFamily: redesignFonts.monoBold,
    fontSize: 12,
    letterSpacing: 2.15,
    color: redesignColors.ash,
  },
  sectionMeta: {
    fontFamily: redesignFonts.mono,
    fontSize: 12,
    letterSpacing: 0.3,
    color: redesignColors.ashDim,
  },
  strengthRangeControl: {
    flexShrink: 0,
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  rangeButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(241, 130, 73, 0.38)',
    backgroundColor: 'rgba(241, 130, 73, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  rangeButtonText: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 10,
    letterSpacing: 0.15,
    color: STREAK_ORANGE,
  },
  strengthGrid: {
    gap: 12,
  },
  strengthRow: {
    flexDirection: 'row',
    gap: 12,
  },
  strengthCardSlot: {
    flex: 1,
    minWidth: 0,
  },
  strengthCardTapTarget: {
    width: '100%',
  },
  strengthCard: {
    width: '100%',
    minHeight: 208,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    borderRadius: 26,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: SECTION_BORDER,
    backgroundColor: redesignColors.surface,
    overflow: 'hidden',
  },
  strengthCardPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.975 }],
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  exerciseTitleRow: {
    minHeight: 45,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  exerciseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 7,
    marginRight: 10,
  },
  exerciseTitle: {
    flex: 1,
    fontFamily: redesignFonts.uiBold,
    fontSize: 18,
    lineHeight: 21,
    color: redesignColors.bone,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  weightValue: {
    fontFamily: redesignFonts.display,
    fontSize: 42,
    lineHeight: 47,
    letterSpacing: -1.3,
    color: redesignColors.bone,
  },
  weightUnit: {
    marginLeft: 7,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 15,
    color: redesignColors.ash,
  },
  gainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
  },
  gainText: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 14,
    lineHeight: 20,
  },
  periodText: {
    marginTop: 2,
    marginLeft: 1,
    fontFamily: redesignFonts.mono,
    fontSize: 12,
    lineHeight: 18,
    color: redesignColors.ash,
  },
  detailModal: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  rangeModal: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 8, 6, 0.76)',
  },
  detailCard: {
    width: '100%',
    height: 630,
    maxWidth: 460,
    maxHeight: '86%',
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 22,
    borderRadius: 30,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: SECTION_BORDER,
    backgroundColor: redesignColors.surface,
    overflow: 'hidden',
  },
  rangeSheet: {
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
    borderRadius: 30,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: SECTION_BORDER,
    backgroundColor: redesignColors.surface,
    overflow: 'hidden',
  },
  rangeSheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 18,
  },
  rangeSheetHeading: {
    flex: 1,
    minWidth: 0,
  },
  rangeSheetEyebrow: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 9,
    lineHeight: 14,
    letterSpacing: 1.3,
    color: STREAK_ORANGE,
  },
  rangeSheetTitle: {
    marginTop: 5,
    fontFamily: redesignFonts.display,
    fontSize: 27,
    lineHeight: 32,
    letterSpacing: -0.85,
    color: redesignColors.bone,
  },
  rangeSheetCopy: {
    maxWidth: 290,
    marginTop: 5,
    fontFamily: redesignFonts.uiMedium,
    fontSize: 13,
    lineHeight: 18,
    color: redesignColors.ash,
  },
  rangeOptionList: {
    marginTop: 17,
    gap: 8,
  },
  rangeOptionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rangeOptionSlot: {
    flex: 1,
    minWidth: 0,
  },
  rangeOption: {
    width: '100%',
    minHeight: 54,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(169, 159, 145, 0.14)',
    backgroundColor: 'rgba(42, 35, 28, 0.54)',
  },
  rangeOptionSelected: {
    borderColor: 'rgba(241, 130, 73, 0.62)',
    backgroundColor: 'rgba(241, 130, 73, 0.11)',
  },
  rangeOptionPressed: {
    opacity: 0.72,
  },
  rangeOptionContent: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  rangeOptionCheck: {
    width: 23,
    height: 23,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: redesignColors.hi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeOptionCheckSelected: {
    borderColor: STREAK_ORANGE,
    backgroundColor: STREAK_ORANGE,
  },
  rangeOptionLabel: {
    flexShrink: 1,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 13,
    color: redesignColors.ash,
  },
  rangeOptionLabelSelected: {
    color: STREAK_ORANGE,
  },
  detailHeader: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  detailHeadingCopy: {
    flex: 1,
    minWidth: 0,
  },
  detailEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailDot: {
    width: 8,
    height: 8,
    marginTop: 0,
    marginRight: 8,
  },
  detailEyebrow: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 1.4,
  },
  detailTitle: {
    marginTop: 6,
    fontFamily: redesignFonts.display,
    fontSize: 31,
    lineHeight: 36,
    letterSpacing: -0.9,
    color: redesignColors.bone,
  },
  detailCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailSummary: {
    minHeight: 84,
    marginTop: 13,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: redesignColors.raised,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailSummaryLabel: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: redesignColors.ashDim,
  },
  detailWeightRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  detailWeight: {
    fontFamily: redesignFonts.display,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1,
    color: redesignColors.bone,
  },
  detailWeightUnit: {
    marginLeft: 6,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 13,
    color: redesignColors.ash,
  },
  detailGainPill: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  detailGainText: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 12,
  },
  detailRangeSelector: {
    marginTop: 16,
    padding: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(42, 35, 28, 0.68)',
    flexDirection: 'row',
    gap: 7,
  },
  detailRangeSlot: {
    flex: 1,
    minWidth: 0,
  },
  detailRangeOption: {
    width: '100%',
    minHeight: 42,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  detailRangeOptionContent: {
    width: '100%',
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailRangeOptionText: {
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 12,
    letterSpacing: 0.15,
    color: redesignColors.ash,
  },
  breakdownHeader: {
    marginTop: 18,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownTitle: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: redesignColors.ash,
  },
  breakdownMeta: {
    fontFamily: redesignFonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    color: redesignColors.ashDim,
  },
  weekList: {
    gap: 7,
    paddingBottom: 2,
  },
  detailWeekScroll: {
    flex: 1,
    minHeight: 0,
  },
  weekRow: {
    minHeight: 59,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 17,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(169, 159, 145, 0.10)',
    backgroundColor: 'rgba(42, 35, 28, 0.52)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekMarkerColumn: {
    alignSelf: 'stretch',
    width: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekMarker: {
    zIndex: 1,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: redesignColors.hi,
    backgroundColor: redesignColors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekMarkerText: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 10,
    color: redesignColors.ash,
  },
  weekConnector: {
    position: 'absolute',
    top: 35,
    width: 1,
    height: 25,
    backgroundColor: redesignColors.border,
  },
  weekCopy: {
    flex: 1,
    marginLeft: 10,
  },
  weekLabel: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.8,
    color: redesignColors.bone,
  },
  weekCaption: {
    marginTop: 2,
    fontFamily: redesignFonts.uiMedium,
    fontSize: 12,
    lineHeight: 15,
    color: redesignColors.ashDim,
  },
  weekValueGroup: {
    alignItems: 'flex-end',
  },
  weekIncrease: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 9,
    lineHeight: 13,
  },
  weekStart: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 8,
    lineHeight: 13,
    letterSpacing: 0.7,
    color: redesignColors.ashDim,
  },
  weekValue: {
    marginTop: 1,
    fontFamily: redesignFonts.monoBold,
    fontSize: 14,
    lineHeight: 19,
    color: redesignColors.bone,
  },
  detailInsight: {
    minHeight: 42,
    marginTop: 14,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderLeftWidth: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(42, 35, 28, 0.42)',
    justifyContent: 'center',
  },
  detailInsightText: {
    fontFamily: redesignFonts.uiMedium,
    fontSize: 12,
    lineHeight: 17,
    color: redesignColors.ash,
  },
  consistencyCard: {
    minHeight: 236,
    paddingHorizontal: 25,
    paddingVertical: 24,
    borderRadius: 27,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: SECTION_BORDER,
    backgroundColor: redesignColors.surface,
    alignItems: 'stretch',
  },
  consistencyCopy: {
    width: '100%',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  streakLabel: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 1.4,
    color: STREAK_ORANGE,
  },
  weekCountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 12,
  },
  weekCount: {
    fontFamily: redesignFonts.display,
    fontSize: 43,
    lineHeight: 46,
    letterSpacing: -1,
    color: redesignColors.bone,
  },
  weekCountSuffix: {
    marginLeft: 8,
    marginBottom: 5,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 14,
    lineHeight: 18,
    color: redesignColors.ash,
  },
  goalCopy: {
    marginTop: 2,
    fontFamily: redesignFonts.uiMedium,
    fontSize: 15,
    lineHeight: 20,
    color: redesignColors.ash,
  },
  weekGrid: {
    width: '100%',
    marginTop: 18,
    gap: 6,
  },
  weekGridRow: {
    flexDirection: 'row',
    gap: 5,
  },
  weekCell: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 27,
    borderRadius: 5,
  },
  weekCellComplete: {
    backgroundColor: STREAK_ORANGE,
  },
  weekCellEmpty: {
    backgroundColor: redesignColors.raised,
  },
  volumeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  volumeCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 130,
    paddingHorizontal: 20,
    paddingVertical: 21,
    borderRadius: 25,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: SECTION_BORDER,
    backgroundColor: redesignColors.surface,
  },
  volumeLabel: {
    fontFamily: redesignFonts.uiMedium,
    fontSize: 14,
    color: redesignColors.ash,
  },
  volumeValue: {
    marginTop: 10,
    fontFamily: redesignFonts.monoBold,
    fontSize: 27,
    lineHeight: 32,
    letterSpacing: -1,
    color: redesignColors.bone,
  },
  volumeUnit: {
    marginTop: 1,
    fontFamily: redesignFonts.mono,
    fontSize: 11,
    letterSpacing: 0.35,
    color: redesignColors.ashDim,
  },
  recordsHeader: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  viewAllButton: {
    width: 104,
    minHeight: 44,
    marginVertical: -8,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  viewAllPressed: {
    opacity: 0.65,
  },
  viewAllText: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: STREAK_ORANGE,
  },
  recordList: {
    gap: 11,
  },
  recordCard: {
    minHeight: 88,
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 23,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: SECTION_BORDER,
    backgroundColor: redesignColors.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trophyTile: {
    width: 50,
    height: 50,
    borderRadius: 16,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 16,
  },
  recordName: {
    fontFamily: redesignFonts.uiBold,
    fontSize: 17,
    lineHeight: 21,
    color: redesignColors.bone,
  },
  recordDetails: {
    marginTop: 2,
    fontFamily: redesignFonts.monoBold,
    fontSize: 12,
    lineHeight: 17,
    color: redesignColors.ash,
  },
  recordAge: {
    marginLeft: 10,
    fontFamily: redesignFonts.mono,
    fontSize: 11,
    color: redesignColors.ashDim,
  },
});
