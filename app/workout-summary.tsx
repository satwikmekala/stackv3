import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import {
  Defs,
  RadialGradient,
  Rect,
  Stop,
  Svg,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeInDown,
  ReduceMotion,
  ZoomIn,
} from 'react-native-reanimated';
import { ShareSheet } from '@/components/ShareSheet';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { DEFAULT_WEIGHT_UNIT } from '@/store/workoutDatabase';
import {
  deriveWorkoutSummary,
  displayVolume,
  formatSummaryDate,
  formatSummaryNumber,
  intensitySummaryLabel,
  specialSetSummaryLabel,
  type WorkoutSummary,
} from '@/store/workoutSummary';
import { unitLabel, type WeightUnit } from '@/store/weightUnits';
import { useWorkoutStore } from '@/store/workoutStore';
import '@/global.css';

const HERO_ENTER = FadeInDown.duration(520)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const CONTENT_ENTER = FadeInDown.delay(130)
  .duration(480)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const CHECK_ENTER = ZoomIn.delay(260)
  .springify()
  .damping(14)
  .stiffness(220)
  .reduceMotion(ReduceMotion.System);

const SPECIAL_LABEL = 'SPECIAL SETS';

function rgba(hex: string, opacity: number): string {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((character) => character + character).join('')
    : normalized;
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function HeroGlow({ accent }: { accent: string }) {
  return (
    <Svg
      pointerEvents="none"
      preserveAspectRatio="none"
      style={styles.heroGlow}
      viewBox="0 0 100 100"
    >
      <Defs>
        <RadialGradient
          id="summaryHeroGlow"
          cx="50%"
          cy="104%"
          rx="61%"
          ry="66%"
          fx="50%"
          fy="104%"
        >
          <Stop offset="0%" stopColor={accent} stopOpacity={0.76} />
          <Stop offset="42%" stopColor={accent} stopOpacity={0.42} />
          <Stop offset="74%" stopColor={accent} stopOpacity={0.14} />
          <Stop offset="100%" stopColor={accent} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100" height="100" fill="url(#summaryHeroGlow)" />
    </Svg>
  );
}

function SummaryStat({ value, label }: { value: number; label: string }) {
  return (
    <View
      accessibilityLabel={`${value} ${label.toLowerCase()}`}
      style={styles.statCard}
    >
      <Text allowFontScaling={false} style={styles.statValue}>{value}</Text>
      <Text allowFontScaling={false} style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function WeeklyGoal({
  completed,
  goal,
  accent,
}: {
  completed: number;
  goal: number;
  accent: string;
}) {
  const visibleGoal = Math.max(1, Math.min(goal, 7));

  return (
    <View
      accessibilityLabel={`${completed} of ${goal} weekly workouts completed`}
      style={styles.weeklyValue}
    >
      <View style={styles.weeklyBars}>
        {Array.from({ length: visibleGoal }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.weeklyBar,
              {
                backgroundColor:
                  index < completed ? accent : redesignColors.hi,
              },
            ]}
          />
        ))}
      </View>
      <Text allowFontScaling={false} style={styles.weeklyCount}>
        {completed} / {goal}
      </Text>
    </View>
  );
}

function SummaryDetails({
  summary,
  weeklyCompleted,
  weeklyGoal,
}: {
  summary: WorkoutSummary;
  weeklyCompleted: number;
  weeklyGoal: number;
}) {
  const specialLabel = specialSetSummaryLabel(summary.specialSets);

  return (
    <View style={styles.detailList}>
      <View style={styles.detailRow}>
        <Text allowFontScaling={false} style={styles.detailLabel}>INTENSITY</Text>
        <Text allowFontScaling={false} style={styles.detailText}>
          {intensitySummaryLabel(summary.intensity)}
        </Text>
      </View>

      {specialLabel ? (
        <View style={styles.detailRow}>
          <Text allowFontScaling={false} style={styles.detailLabel}>{SPECIAL_LABEL}</Text>
          <View
            accessibilityLabel={specialLabel.toLowerCase()}
            style={[
              styles.specialPill,
              {
                borderColor: rgba(summary.accent, 0.68),
                backgroundColor: rgba(summary.accent, 0.06),
              },
            ]}
          >
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={[styles.specialText, { color: summary.accent }]}
            >
              {specialLabel}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.detailRow}>
        <Text allowFontScaling={false} style={styles.detailLabel}>WEEKLY GOAL</Text>
        <WeeklyGoal
          completed={weeklyCompleted}
          goal={weeklyGoal}
          accent={summary.accent}
        />
      </View>
    </View>
  );
}

function ExerciseRecap({
  summary,
  weightUnit,
}: {
  summary: WorkoutSummary;
  weightUnit: WeightUnit;
}) {
  return (
    <View style={styles.recapCard}>
      <Text allowFontScaling={false} style={styles.recapTitle}>EXERCISE RECAP</Text>
      <View style={styles.recapHeaderRule} />

      {summary.exercises.map((exercise, index) => (
        <View
          key={`${exercise.name}-${index}`}
          style={[
            styles.exerciseRow,
            index < summary.exercises.length - 1 && styles.exerciseRowBorder,
          ]}
        >
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={styles.exerciseName}
          >
            {exercise.name}
          </Text>
          <Text
            accessibilityLabel={`${exercise.setCount} sets, ${exercise.repCount} reps, ${formatSummaryNumber(displayVolume(exercise.volumeKg, weightUnit))} ${unitLabel(weightUnit)} volume`}
            allowFontScaling={false}
            numberOfLines={1}
            style={styles.exerciseMetric}
          >
            <Text style={styles.exerciseMetricMuted}>
              {exercise.setCount} × {exercise.repCount} ·{' '}
            </Text>
            {formatSummaryNumber(displayVolume(exercise.volumeKg, weightUnit))}
          </Text>
        </View>
      ))}
    </View>
  );
}

function MissingSummary() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.missingScreen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Text style={styles.missingTitle}>Summary unavailable</Text>
      <Text style={styles.missingBody}>
        This completed workout could not be found, but your other workout history is safe.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace('/(tabs)')}
        style={styles.missingButton}
      >
        <Text style={styles.missingButtonText}>Back to home</Text>
      </Pressable>
    </View>
  );
}

export default function WorkoutSummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const rawSessionId = params.sessionId;
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
  const sessions = useWorkoutStore((state) => state.sessions);
  const weightUnit = useWorkoutStore(
    (state) => state.profile?.weightUnit ?? DEFAULT_WEIGHT_UNIT
  );
  const getWeeklyProgress = useWorkoutStore((state) => state.getWeeklyProgress);
  const session = sessions.find((item) => item.id === sessionId);
  const summary = useMemo(
    () => session ? deriveWorkoutSummary(session) : null,
    [session]
  );
  const weeklyProgress = getWeeklyProgress();
  const compact = width < 375;
  const [shareVisible, setShareVisible] = useState(false);

  if (!summary) return <MissingSummary />;

  const displayedVolume = displayVolume(summary.volumeKg, weightUnit);
  const specialLabel = specialSetSummaryLabel(summary.specialSets);
  const stripSpecialLabel = specialLabel?.replace(/ LOGGED$/, '');
  const stripDate = formatSummaryDate(summary.date).replace(/^[^,]+,\s*/, '');
  const finish = (destination: '/(tabs)' | '/(tabs)/profile') => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.replace(destination);
  };
  const openShare = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setShareVisible(true);
  };

  return (
    <View style={styles.screen}>
      <LinearGradient
        pointerEvents="none"
        colors={['#17130F', redesignColors.ink, '#0F0D0B']}
        locations={[0, 0.42, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        bounces
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + (compact ? 14 : 22),
            paddingBottom: Math.max(insets.bottom, 12) + 132,
            paddingHorizontal: compact ? 16 : 20,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentColumn}>
          <Animated.View
            entering={HERO_ENTER}
            style={[
              styles.hero,
              compact && styles.heroCompact,
              {
                borderColor: rgba(summary.accent, 0.44),
                shadowColor: summary.accent,
              },
            ]}
          >
            <LinearGradient
              pointerEvents="none"
              colors={[
                rgba(summary.accent, 0),
                rgba(summary.accent, 0.025),
                rgba(summary.accent, 0.2),
              ]}
              locations={[0, 0.48, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <HeroGlow accent={summary.accent} />

            <View
              accessibilityLabel="Workout complete"
              style={[
                styles.completePill,
                {
                  borderColor: rgba(summary.accent, 0.58),
                  backgroundColor: rgba(summary.accent, 0.09),
                },
              ]}
            >
              <Animated.View
                entering={CHECK_ENTER}
                style={[styles.completeIcon, { backgroundColor: summary.accent }]}
              >
                <Check color={redesignColors.ink} size={15} strokeWidth={3.5} />
              </Animated.View>
              <Text
                allowFontScaling={false}
                style={[styles.completeLabel, { color: summary.accent }]}
              >
                WORKOUT COMPLETE
              </Text>
            </View>

            <Text
              adjustsFontSizeToFit
              allowFontScaling={false}
              minimumFontScale={0.74}
              numberOfLines={1}
              style={styles.workoutTitle}
            >
              {summary.title}
            </Text>
            <Text allowFontScaling={false} style={styles.workoutDate}>
              {formatSummaryDate(summary.date)}
            </Text>

            <View style={styles.heroRule} />
            <Text allowFontScaling={false} style={styles.volumeLabel}>
              TOTAL VOLUME LIFTED
            </Text>
            <View style={styles.volumeRow}>
              <Text
                adjustsFontSizeToFit
                allowFontScaling={false}
                minimumFontScale={0.68}
                numberOfLines={1}
                style={[styles.volumeValue, compact && styles.volumeValueCompact]}
              >
                {formatSummaryNumber(displayedVolume)}
              </Text>
              <Text
                allowFontScaling={false}
                style={[styles.volumeUnit, { color: summary.accent }]}
              >
                {unitLabel(weightUnit)}
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={CONTENT_ENTER}>
            <View style={styles.statRow}>
              <SummaryStat value={summary.setCount} label="SETS" />
              <SummaryStat value={summary.exerciseCount} label="EXERCISES" />
              <SummaryStat value={summary.repCount} label="REPS" />
            </View>

            <SummaryDetails
              summary={summary}
              weeklyCompleted={weeklyProgress.completed}
              weeklyGoal={weeklyProgress.goal}
            />

            <ExerciseRecap summary={summary} weightUnit={weightUnit} />
          </Animated.View>
        </View>
      </ScrollView>

      <View
        pointerEvents="box-none"
        style={[
          styles.actionDock,
          {
            paddingBottom: Math.max(insets.bottom, 10),
            paddingHorizontal: compact ? 16 : 20,
          },
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[
            rgba(redesignColors.ink, 0),
            rgba(redesignColors.ink, 0.96),
            redesignColors.ink,
          ]}
          locations={[0, 0.3, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.actionColumn}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Done. Return home"
            onPress={() => finish('/(tabs)')}
            style={({ pressed }) => [
              styles.doneButton,
              { backgroundColor: summary.accent },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text allowFontScaling={false} style={styles.doneButtonText}>Done</Text>
          </Pressable>

          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View progress"
              hitSlop={6}
              onPress={() => finish('/(tabs)/profile')}
              style={({ pressed }) => [
                styles.progressButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text allowFontScaling={false} style={styles.progressButtonText}>
                View progress
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share workout"
              hitSlop={6}
              onPress={openShare}
              style={({ pressed }) => [
                styles.shareButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text allowFontScaling={false} style={styles.progressButtonText}>
                Share
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ShareSheet
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        accent={summary.accent}
        title={summary.title}
        date={stripDate}
        volumeValue={formatSummaryNumber(displayedVolume)}
        volumeUnit={unitLabel(weightUnit)}
        setCount={summary.setCount}
        repCount={summary.repCount}
        {...(stripSpecialLabel ? { specialSetLabel: stripSpecialLabel } : {})}
      />
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
  },
  contentColumn: {
    width: '100%',
    maxWidth: 470,
    alignSelf: 'center',
  },
  hero: {
    height: 296,
    overflow: 'hidden',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 28,
    borderCurve: 'continuous',
    backgroundColor: redesignColors.surface,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  heroCompact: {
    height: 284,
  },
  completePill: {
    height: 30,
    marginTop: 26,
    paddingLeft: 11,
    paddingRight: 14,
    borderWidth: 1,
    borderRadius: 18,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
  },
  completeIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeLabel: {
    marginLeft: 8,
    fontFamily: redesignFonts.monoBold,
    fontSize: 9.5,
    lineHeight: 14,
    letterSpacing: 2.15,
  },
  workoutTitle: {
    width: '84%',
    marginTop: 18,
    textAlign: 'center',
    fontFamily: redesignFonts.display,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
    color: redesignColors.bone,
  },
  workoutDate: {
    marginTop: 1,
    fontFamily: redesignFonts.uiMedium,
    fontSize: 16,
    lineHeight: 22,
    color: redesignColors.ash,
  },
  heroRule: {
    width: '68%',
    height: StyleSheet.hairlineWidth,
    marginTop: 17,
    backgroundColor: rgba(redesignColors.ash, 0.28),
  },
  volumeLabel: {
    marginTop: 16,
    fontFamily: redesignFonts.mono,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 2.6,
    color: redesignColors.ash,
  },
  volumeRow: {
    maxWidth: '92%',
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  volumeValue: {
    flexShrink: 1,
    fontFamily: redesignFonts.monoBold,
    fontSize: 58,
    lineHeight: 68,
    letterSpacing: -3,
    color: redesignColors.bone,
  },
  volumeValueCompact: {
    fontSize: 54,
    lineHeight: 64,
  },
  volumeUnit: {
    marginLeft: 8,
    fontFamily: redesignFonts.monoBold,
    fontSize: 23,
    lineHeight: 31,
    letterSpacing: -0.8,
  },
  heroGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '72%',
  },
  statRow: {
    height: 72,
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: redesignColors.border,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: redesignColors.surface,
  },
  statValue: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 24,
    lineHeight: 29,
    color: redesignColors.bone,
  },
  statLabel: {
    marginTop: 3,
    fontFamily: redesignFonts.mono,
    fontSize: 9,
    lineHeight: 13,
    letterSpacing: 2,
    color: redesignColors.ash,
  },
  detailList: {
    marginTop: 14,
    marginHorizontal: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: rgba(redesignColors.ash, 0.16),
  },
  detailRow: {
    minHeight: 45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLabel: {
    flexShrink: 0,
    fontFamily: redesignFonts.mono,
    fontSize: 10,
    lineHeight: 16,
    letterSpacing: 2.5,
    color: redesignColors.ash,
  },
  detailText: {
    marginLeft: 16,
    fontFamily: redesignFonts.uiBold,
    fontSize: 16,
    lineHeight: 22,
    color: redesignColors.bone,
  },
  specialPill: {
    maxWidth: '64%',
    height: 30,
    marginLeft: 14,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderRadius: 16,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialText: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 9,
    lineHeight: 14,
    letterSpacing: 1.7,
  },
  weeklyValue: {
    minWidth: 148,
    marginLeft: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  weeklyBars: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
  },
  weeklyBar: {
    width: 16,
    height: 4,
  },
  weeklyCount: {
    marginLeft: 16,
    fontFamily: redesignFonts.monoBold,
    fontSize: 14,
    lineHeight: 20,
    color: redesignColors.bone,
  },
  recapCard: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: redesignColors.border,
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: redesignColors.surface,
  },
  recapTitle: {
    fontFamily: redesignFonts.mono,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 2.4,
    color: redesignColors.ash,
  },
  recapHeaderRule: {
    height: StyleSheet.hairlineWidth,
    marginTop: 10,
    backgroundColor: rgba(redesignColors.ash, 0.22),
  },
  exerciseRow: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: rgba(redesignColors.ash, 0.22),
  },
  exerciseName: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 16,
    lineHeight: 21,
    color: redesignColors.bone,
  },
  exerciseMetric: {
    flexShrink: 0,
    textAlign: 'right',
    fontFamily: redesignFonts.monoBold,
    fontSize: 12.5,
    lineHeight: 18,
    color: redesignColors.bone,
  },
  exerciseMetricMuted: {
    fontFamily: redesignFonts.mono,
    color: redesignColors.ash,
  },
  doneButton: {
    height: 58,
    borderRadius: 18,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontFamily: redesignFonts.uiBold,
    fontSize: 18,
    lineHeight: 24,
    color: redesignColors.ink,
  },
  progressButton: {
    minWidth: 120,
    height: 47,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  shareButton: {
    minWidth: 120,
    height: 47,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  progressButtonText: {
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 16,
    lineHeight: 22,
    color: redesignColors.ash,
  },
  actionDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 30,
  },
  actionColumn: {
    width: '100%',
    maxWidth: 470,
    alignSelf: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  missingScreen: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: redesignColors.ink,
  },
  missingTitle: {
    textAlign: 'center',
    fontFamily: redesignFonts.display,
    fontSize: 34,
    color: redesignColors.bone,
  },
  missingBody: {
    maxWidth: 340,
    marginTop: 12,
    textAlign: 'center',
    fontFamily: redesignFonts.ui,
    fontSize: 16,
    lineHeight: 24,
    color: redesignColors.ash,
  },
  missingButton: {
    height: 54,
    marginTop: 24,
    paddingHorizontal: 28,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: redesignColors.accent,
  },
  missingButtonText: {
    fontFamily: redesignFonts.uiBold,
    fontSize: 17,
    color: redesignColors.ink,
  },
});
