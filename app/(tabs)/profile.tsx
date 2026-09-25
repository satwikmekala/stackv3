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
  Check,
  ChevronRight,
  History as HistoryIcon,
  Settings,
  SlidersHorizontal,
  Trophy,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { withMotionTiming } from '@/constants/motion';
import { redesignColors, redesignFonts, splitColors } from '@/constants/theme';
import {
  getStartOfWeek,
  parseSessionDate,
  useWorkoutStore,
  type WorkoutSession,
} from '@/store/workoutStore';
import { formatWeight, unitLabel, type WeightUnit } from '@/store/weightUnits';
import { DEFAULT_WEIGHT_UNIT } from '@/store/workoutDatabase';
import { derivePersonalRecords } from '@/store/personalRecords';
import { getVerifiedSessions } from '@/store/verifiedSessions';
import '@/global.css';

type StrengthMetric = {
  key: string;
  label: string;
  color: string;
  weight: number;
  startWeight: number;
  percentageGain: number;
  periodWeeks: number;
  weeklyPoints: StrengthWeekPoint[];
};

type StrengthRange = 4 | 8 | 12 | 16;

type StrengthWeekPoint = {
  week: number;
  weight: number | null;
  change: number;
  recorded: boolean;
};

const SECTION_BORDER = 'rgba(169, 159, 145, 0.18)';
const STREAK_ORANGE = splitColors.chest;
const STRENGTH_RANGES: StrengthRange[] = [4, 8, 12, 16];
const STRENGTH_COLOR_PALETTE = [
  splitColors.chest,
  splitColors.back,
  splitColors.legs,
  splitColors.shoulders,
  splitColors.arms,
  splitColors.core,
];

// Display unit lives on the profile; this is a screen, so its cards read the
// store directly rather than threading a prop the way the set components do.
const useWeightUnit = (): WeightUnit =>
  useWorkoutStore((state) => state.profile?.weightUnit ?? DEFAULT_WEIGHT_UNIT);

const formatNumber = (value: number) =>
  value.toLocaleString('en-US', { maximumFractionDigits: 1 });

type StrengthHistoryEntry = { date: Date; weight: number };

const getStrengthColor = (exerciseName: string) => {
  const hash = [...exerciseName].reduce(
    (value, character) => ((value << 5) - value + character.charCodeAt(0)) | 0,
    0
  );
  return STRENGTH_COLOR_PALETTE[(hash >>> 0) % STRENGTH_COLOR_PALETTE.length];
};

function buildRecordedStrengthMetric(
  label: string,
  history: StrengthHistoryEntry[],
  rangeWeeks: StrengthRange,
  rangeStart: Date
) {
  const startWeight = history[0].weight;
  const bestWeight = Math.max(...history.map((entry) => entry.weight));
  let carriedWeight: number | null = null;
  let previousWeight: number | null = null;

  const weeklyPoints = Array.from({ length: rangeWeeks }, (_, index) => {
    const weekStart = new Date(rangeStart);
    weekStart.setDate(rangeStart.getDate() + index * 7);
    const nextWeek = new Date(weekStart);
    nextWeek.setDate(weekStart.getDate() + 7);
    const entries = history.filter((entry) => entry.date >= weekStart && entry.date < nextWeek);
    const recorded = entries.length > 0;

    if (recorded) carriedWeight = Math.max(...entries.map((entry) => entry.weight));
    const weight = carriedWeight;
    const change = weight !== null && previousWeight !== null
      ? weight - previousWeight
      : 0;
    if (weight !== null) previousWeight = weight;

    return { week: index + 1, weight, change, recorded };
  });

  return {
    key: label,
    label,
    color: getStrengthColor(label),
    weight: bestWeight,
    startWeight,
    percentageGain: startWeight > 0 ? ((bestWeight - startWeight) / startWeight) * 100 : 0,
    periodWeeks: rangeWeeks,
    weeklyPoints,
  };
}

function deriveStrengthMetrics(
  completedSessions: WorkoutSession[],
  rangeWeeks: StrengthRange
) {
  const currentWeek = getStartOfWeek(new Date());
  const rangeStart = new Date(currentWeek);
  rangeStart.setDate(rangeStart.getDate() - (rangeWeeks - 1) * 7);
  const rangeEnd = new Date(currentWeek);
  rangeEnd.setDate(rangeEnd.getDate() + 7);
  const histories = new Map<string, StrengthHistoryEntry[]>();

  completedSessions.forEach((session) => {
    const date = parseSessionDate(session.date);
    if (date < rangeStart || date >= rangeEnd) return;

    session.exercises.forEach((exercise) => {
      const completedSets = exercise.sets.filter((set) => set.completed);
      const sets = completedSets.length > 0 ? completedSets : exercise.sets;
      if (sets.length === 0) return;

      const history = histories.get(exercise.name) ?? [];
      history.push({ date, weight: Math.max(...sets.map((set) => set.weight)) });
      histories.set(exercise.name, history);
    });
  });

  return [...histories.entries()]
    .map(([label, history]) => {
      history.sort((a, b) => a.date.getTime() - b.date.getTime());
      return buildRecordedStrengthMetric(label, history, rangeWeeks, rangeStart);
    })
    .sort(
      (a, b) => b.percentageGain - a.percentageGain
        || b.weight - a.weight
        || a.label.localeCompare(b.label)
    )
    .slice(0, 4);
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
    progress.value = withMotionTiming(1);
  }, [progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 34 }],
  }));

  const close = () => {
    progress.value = withMotionTiming(
      0,
      { easing: 'accelerate' },
      (finished) => {
        'worklet';
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
  const weightUnit = useWeightUnit();
  const formattedWeight = formatWeight(metric.weight, weightUnit);
  const progressionLabel = metric.percentageGain > 0
    ? `+${formatNumber(metric.percentageGain)}%`
    : '±0%';

  return (
    <View style={styles.strengthCardSlot}>
      <Pressable
        accessibilityHint={`Shows the ${metric.periodWeeks}-week progression breakdown`}
        accessibilityLabel={`${metric.label}, ${formattedWeight} ${unitLabel(weightUnit)}, ${progressionLabel} progress`}
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
              {formattedWeight}
            </Text>
            <Text style={styles.weightUnit}>{unitLabel(weightUnit)}</Text>
          </View>

          <Text style={[styles.gainText, { color: metric.color }]}>{progressionLabel}</Text>
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
  const weightUnit = useWeightUnit();
  const formattedWeight = formatWeight(metric.weight, weightUnit);
  const progressionLabel = metric.percentageGain > 0
    ? `+${formatNumber(metric.percentageGain)}%`
    : '±0%';
  const firstDataIndex = metric.weeklyPoints.findIndex((point) => point.weight !== null);

  useEffect(() => {
    progress.value = withMotionTiming(1);
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
    progress.value = withMotionTiming(
      0,
      { easing: 'accelerate' },
      (finished) => {
        'worklet';
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
              <Text style={styles.detailSummaryLabel}>BEST WEIGHT</Text>
              <View style={styles.detailWeightRow}>
                <Text style={styles.detailWeight}>{formattedWeight}</Text>
                <Text style={styles.detailWeightUnit}>{unitLabel(weightUnit)}</Text>
              </View>
            </View>
            <View style={[styles.detailGainPill, { backgroundColor: `${metric.color}18` }]}>
              <Text style={[styles.detailGainText, { color: metric.color }]}>{progressionLabel}</Text>
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

          <>
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
                          {week.change > 0 ? '+' : ''}{formatWeight(week.change, weightUnit)}
                        </Text>
                      ) : index === firstDataIndex ? (
                        <Text style={styles.weekStart}>START</Text>
                      ) : (
                        <Text style={styles.weekStart}>{week.recorded ? 'HELD' : '—'}</Text>
                      )}
                      <Text style={styles.weekValue}>
                        {week.weight === null ? '—' : `${formatWeight(week.weight, weightUnit)} ${unitLabel(weightUnit)}`}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View style={[styles.detailInsight, { borderLeftColor: metric.color }]}>
              <Text style={styles.detailInsightText}>
                {metric.percentageGain > 0
                  ? `Your best lift is ${progressionLabel} above your first logged weight in this ${metric.periodWeeks}-week range.`
                  : `Your best lift matched your first logged weight in this ${metric.periodWeeks}-week range.`}
              </Text>
            </View>
          </>
        </Animated.View>
      </View>
    </Modal>
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
        colors={['#6F3D25', '#452B1E', '#2C201A']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.weeklyGoalBorder}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['#3E281D', '#35241B', '#2B1F19', '#201B18', '#171716']}
        locations={[0, 0.28, 0.56, 0.82, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.weeklyGoalFill}
      />

      <View style={styles.weeklyGoalTopRow}>
        <Text style={styles.weeklyGoalEyebrow}>WEEKLY GOAL</Text>
        <View style={[styles.weeklyGoalPill, isComplete && styles.weeklyGoalPillComplete]}>
          <Text style={[styles.weeklyGoalPillText, isComplete && styles.weeklyGoalPillTextComplete]}>
            {isComplete ? 'DONE' : `${remaining} TO GO`}
          </Text>
        </View>
      </View>

      <View style={styles.weeklyGoalCount}>
        <Text style={styles.weeklyGoalCompleted}>{completed}</Text>
        <Text style={styles.weeklyGoalTotal}>
          / {goal} {goal === 1 ? 'workout' : 'workouts'}
        </Text>
      </View>

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
  const verifiedSessions = useMemo(
    () => getVerifiedSessions(sessions),
    [sessions]
  );
  const strengthMetrics = useMemo(
    () => deriveStrengthMetrics(verifiedSessions, strengthRange),
    [verifiedSessions, strengthRange]
  );
  const selectedStrengthMetric = useMemo(
    () => strengthMetrics.find((metric) => metric.key === selectedStrengthKey) ?? null,
    [selectedStrengthKey, strengthMetrics]
  );
  const personalRecords = useMemo(
    () => derivePersonalRecords(verifiedSessions),
    [verifiedSessions]
  );
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
  const openHistory = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    router.push('/history' as Parameters<typeof router.push>[0]);
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
            <Settings color={redesignColors.ash} size={20} strokeWidth={2} />
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
          {strengthMetrics.length > 0 ? (
            <View style={styles.strengthGrid}>
              {[strengthMetrics.slice(0, 2), strengthMetrics.slice(2, 4)].map((row, rowIndex) => (
                row.length > 0 ? (
                  <View key={`strength-row-${rowIndex}`} style={styles.strengthRow}>
                    {row.map((metric) => (
                      <StrengthCard
                        key={metric.key}
                        metric={metric}
                        onPress={() => openStrengthDetail(metric)}
                      />
                    ))}
                  </View>
                ) : null
              ))}
            </View>
          ) : (
            <View style={styles.strengthSectionEmpty}>
              <Text style={styles.strengthSectionEmptyText}>
                Log a set to start tracking your strength progression.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Personal Records. ${personalRecords.length} exercises tracked`}
            onPress={openAllRecords}
            style={styles.recordCard}
          >
            <View style={[styles.trophyTile, { backgroundColor: `${STREAK_ORANGE}21` }]}>
              <Trophy color={STREAK_ORANGE} size={21} strokeWidth={2} />
            </View>
            <View style={styles.recordCopy}>
              <Text style={styles.recordName}>Personal Records</Text>
              <Text style={styles.recordDetails}>{personalRecords.length} exercises tracked</Text>
            </View>
            <ChevronRight color={redesignColors.ash} size={21} style={styles.historyChevron} />
          </Pressable>
        </View>

        <View style={[styles.section, styles.compactSection]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View history. ${completedSessions.length} ${completedSessions.length === 1 ? 'workout' : 'workouts'} logged`}
            onPress={openHistory}
            style={[styles.recordCard, styles.historyCard]}
          >
            <View style={[styles.trophyTile, { backgroundColor: `${STREAK_ORANGE}21` }]}>
              <HistoryIcon color={STREAK_ORANGE} size={21} strokeWidth={2} />
            </View>
            <View style={styles.recordCopy}>
              <Text numberOfLines={1} style={styles.recordName}>History</Text>
              <Text numberOfLines={1} style={styles.recordDetails}>
                {completedSessions.length}{' '}
                {completedSessions.length === 1 ? 'workout' : 'workouts'} logged
              </Text>
            </View>
            <ChevronRight
              color={redesignColors.ash}
              size={21}
              strokeWidth={2.1}
              style={styles.historyChevron}
            />
          </Pressable>
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
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: redesignFonts.display,
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -1.6,
    color: redesignColors.bone,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    marginTop: 20,
  },
  weeklyGoalCard: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    borderRadius: 24,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: '#171716',
    shadowColor: STREAK_ORANGE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  weeklyGoalBorder: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
    borderCurve: 'continuous',
  },
  weeklyGoalFill: {
    position: 'absolute',
    top: 1,
    right: 1,
    bottom: 1,
    left: 1,
    borderRadius: 23,
    borderCurve: 'continuous',
  },
  weeklyGoalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weeklyGoalEyebrow: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 11,
    letterSpacing: 1.65,
    color: redesignColors.ash,
  },
  weeklyGoalPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 61, 0.35)',
    backgroundColor: 'rgba(255, 122, 61, 0.1)',
  },
  weeklyGoalPillComplete: {
    borderColor: STREAK_ORANGE,
    backgroundColor: STREAK_ORANGE,
  },
  weeklyGoalPillText: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: STREAK_ORANGE,
  },
  weeklyGoalPillTextComplete: {
    color: redesignColors.ink,
  },
  weeklyGoalCount: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  weeklyGoalCompleted: {
    fontFamily: redesignFonts.display,
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -1.6,
    color: redesignColors.bone,
  },
  weeklyGoalTotal: {
    fontFamily: redesignFonts.uiMedium,
    fontSize: 16,
    color: redesignColors.ash,
  },
  weeklyGoalBars: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 6,
  },
  weeklyGoalBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: redesignColors.raised,
  },
  weeklyGoalBarComplete: {
    backgroundColor: STREAK_ORANGE,
  },
  section: {
    marginTop: 34,
  },
  compactSection: {
    marginTop: 24,
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
  strengthSectionEmpty: {
    minHeight: 112,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderRadius: 24,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: SECTION_BORDER,
    backgroundColor: redesignColors.surface,
    justifyContent: 'center',
  },
  strengthSectionEmptyText: {
    maxWidth: 250,
    fontFamily: redesignFonts.uiMedium,
    fontSize: 15,
    lineHeight: 21,
    color: redesignColors.ash,
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
    ...StyleSheet.absoluteFill,
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
  historyCard: {
    width: '100%',
    overflow: 'hidden',
  },
  historyChevron: {
    marginLeft: 10,
    flexShrink: 0,
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

});
