import { spokenTrainingCopy } from '@/utils/content';
import { ImportedFacts } from '@/features/import/ImportedFacts';
import { displayExerciseName } from '@/constants/exerciseNames';
import { useMuscleColors } from '@/store/muscleColors';
import { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from '@/services/haptics';
import { ArrowUpRight, Check, ChevronDown, ChevronUp, Share, Trophy, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  ReduceMotion,
} from 'react-native-reanimated';
import { WorkoutCardSurface } from '@/components/home/WorkoutCardSurface';
import { getMuscleColor } from '@/constants/muscleColors';
import { deriveLiftProgress, formatLiftPerformance, type LiftPerformance } from '@/store/liftProgress';
import { parseSessionDate } from '@/store/workoutCalendar';
import { SaveAdhocRoutine } from '@/components/SaveAdhocRoutine';
import { buildWorkoutReport, type ReportExercise } from '@/features/report/workoutReport';
import { ShareSheet } from '@/components/ShareSheet';
import type { StackPosterLayer } from '@/components/StackPosterCard';
import { deriveLiftLog } from '@/store/liftLog';
import { shareWorkoutReportPdf } from '@/features/report/shareWorkoutReport';
import { BUILD_DEMO_ENABLED } from '@/features/build/config';
import { motionDuration, motionEasing } from '@/constants/motion';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { DEFAULT_WEIGHT_UNIT } from '@/store/workoutDatabase';
import {
  deriveWorkoutSummary,
  formatExercisePerformance,
  displayVolume,
  formatSummaryDate,
  formatSummaryNumber,
  intensitySummaryLabel,
  specialSetSummaryLabel,
  type WorkoutSummary,
  type WorkoutSummaryExercise,
} from '@/store/workoutSummary';
import { unitLabel, type WeightUnit } from '@/store/weightUnits';
import { getWorkoutLetter } from '@/store/customSplitDraft';
import { useWorkoutStore } from '@/store/workoutStore';
import '@/global.css';

const HERO_ENTER = FadeInDown.duration(motionDuration.entrance)
  .easing(motionEasing.decelerate)
  .reduceMotion(ReduceMotion.System);
const CONTENT_ENTER = FadeInDown.delay(130)
  .duration(motionDuration.entrance)
  .easing(motionEasing.decelerate)
  .reduceMotion(ReduceMotion.System);
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
      accessibilityLabel={`${completed} of ${goal} weekly training days completed`}
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
      <Text style={styles.weeklyCount}>
        {completed} / {goal}
      </Text>
    </View>
  );
}

function SummaryDetails({
  summary,
  weeklyCompleted,
  weeklyGoal,
  showWeeklyGoal,
}: {
  summary: WorkoutSummary;
  weeklyCompleted: number;
  weeklyGoal: number;
  showWeeklyGoal: boolean;
}) {
  const specialLabel = specialSetSummaryLabel(summary.specialSets);

  return (
    <View style={styles.detailList}>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>How it felt</Text>
        <Text style={styles.detailText}>
          {intensitySummaryLabel(summary.intensity)}
        </Text>
      </View>

      {specialLabel ? (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Bonus sets</Text>
          <View accessibilityLabel={specialLabel.toLowerCase()} style={styles.specialPill}>
            <Text
              style={[styles.specialText, { color: summary.accent }]}
            >
              {specialLabel}
            </Text>
          </View>
        </View>
      ) : null}

      {showWeeklyGoal && weeklyGoal > 0 ? (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>This week</Text>
          <WeeklyGoal
            completed={weeklyCompleted}
            goal={weeklyGoal}
            accent={summary.accent}
          />
        </View>
      ) : null}
    </View>
  );
}

function ExerciseResult({ exercise, detail, previous, unit, accent }: {
  exercise: WorkoutSummaryExercise;
  detail?: ReportExercise;
  previous?: LiftPerformance;
  unit: WeightUnit;
  accent: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const performance = formatExercisePerformance(exercise, unit);
  const sets = detail?.sets ?? [];
  const canExpand = sets.length > 0;
  const previousText = previous ? formatLiftPerformance(previous, unit) : null;

  return (
    <View style={styles.exerciseRow}>
      <Pressable
        cssInterop={false}
        accessibilityRole="button"
        accessibilityLabel={`${displayExerciseName(exercise.name)}. ${performance.value}. ${performance.context}.${detail?.hasRecord ? ' Personal record.' : ''}${previousText ? ` Previous top set: ${previousText}.` : ''}`}
        accessibilityHint={expanded ? 'Hide set details' : 'Show every logged set'}
        accessibilityState={{ expanded, disabled: !canExpand }}
        disabled={!canExpand}
        onPress={() => setExpanded(value => !value)}
        style={({ pressed }) => [styles.exerciseTrigger, pressed && styles.buttonPressed]}
      >
        <View style={[styles.categoryMark, { backgroundColor: accent }]} />
        <View style={styles.exerciseContent}>
          <View style={styles.exerciseHeading}>
            <Text style={styles.exerciseName}>{displayExerciseName(exercise.name)}</Text>
            {canExpand && (expanded
              ? <ChevronUp size={16} color={redesignColors.ash} />
              : <ChevronDown size={16} color={redesignColors.ash} />)}
          </View>
          <Text style={styles.exerciseMetric}>{performance.value}</Text>
          <View style={styles.exerciseContextRow}>
            <Text style={styles.exerciseContext}>{performance.context}</Text>
            {detail?.hasRecord && <View style={styles.recordLabel}>
              <Trophy size={12} color={accent} />
              <Text accessibilityLabel="Personal record" style={[styles.recordText, { color: accent }]}>PR</Text>
            </View>}
          </View>
          {previousText && <Text style={styles.previous}>
            <Text style={styles.previousLabel}>Prev </Text>{previousText}
          </Text>}
        </View>
      </Pressable>
      {expanded && <View style={styles.setList}>
        {sets.map(set => <View key={set.ordinal} style={styles.setRow}>
          <Text accessibilityLabel={spokenTrainingCopy(`Set ${set.ordinal}${set.kind === 'working' ? '' : `, ${set.kind === 'pr' ? 'PR attempt' : set.kind === 'dropset' ? 'Drop set' : 'Extra set'}`}`)} style={styles.setLabel}>Set {set.ordinal}{set.kind === 'working' ? '' : ` · ${set.kind === 'pr' ? 'PR attempt' : set.kind === 'dropset' ? 'Drop set' : 'Extra set'}`}</Text>
          <Text style={[styles.setValue, set.skipped && styles.skippedSet]}>{set.text}</Text>
        </View>)}
      </View>}
    </View>
  );
}

function ExerciseRecap({ summary, reportExercises, previousLifts, weightUnit }: {
  summary: WorkoutSummary;
  reportExercises: ReportExercise[];
  previousLifts: Map<string, LiftPerformance>;
  weightUnit: WeightUnit;
}) {
  const getWorkoutType = useWorkoutStore(state => state.getExerciseWorkoutType);
  const performed = reportExercises.filter(exercise => exercise.performedCount > 0);
  return (
    <View style={styles.recap}>
      <Text style={styles.recapTitle}>EXERCISES COMPLETED</Text>
      {summary.exercises.length === 0 && <Text style={styles.emptyRecap}>No exercise sets were logged for this workout.</Text>}
      {summary.exercises.map((exercise, index) => {
        const type = getWorkoutType(exercise.name);
        const previous = previousLifts.get(exercise.name);
        const comparable = exercise.metric === 'reps' && previous
          && previous.bodyweight === (exercise.loadType === 'bodyweight');
        return <ExerciseResult key={`${summary.id}-${index}`} exercise={exercise}
          detail={performed[index]} previous={comparable ? previous : undefined}
          unit={weightUnit} accent={type ? getMuscleColor(type) : summary.accent} />;
      })}
    </View>
  );
}

function SummaryNavigation({ openedFromHistory }: { openedFromHistory: boolean }) {
  const router = useRouter();
  const close = () => router.dismissTo('/(tabs)');

  return (
    <>
      {Platform.OS === 'ios' ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            hidden={openedFromHistory}
            icon="xmark"
            accessibilityLabel="Close workout summary"
            accessibilityHint="Return to Train"
            onPress={close}
          />
        </Stack.Toolbar>
      ) : (
        <Stack.Screen options={{
          headerRight: openedFromHistory ? undefined : () => (
            <Pressable
              cssInterop={false}
              accessibilityRole="button"
              accessibilityLabel="Close workout summary"
              onPress={close}
              style={({ pressed }) => [styles.closeButton, pressed && styles.buttonPressed]}
            >
              <X size={22} color={redesignColors.bone} />
            </Pressable>
          ),
        }} />
      )}
    </>
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
  const muscleColors = useMuscleColors(state => state.preferences);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const params = useLocalSearchParams<{
    sessionId?: string | string[];
    /** History and history-week pass source=history when reopening a recap. */
    source?: string | string[];
    /** Build sandbox only: the demo history size a demo workout belongs to. */
    demo?: string | string[];
  }>();
  const rawSessionId = params.sessionId;
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
  const rawSource = params.source;
  const source = Array.isArray(rawSource) ? rawSource[0] : rawSource;
  const openedFromHistory = source === 'history';
  const sessions = useWorkoutStore((state) => state.sessions);
  const weightUnit = useWorkoutStore(
    (state) => state.profile?.weightUnit ?? DEFAULT_WEIGHT_UNIT
  );
  const getWeeklyProgress = useWorkoutStore((state) => state.getWeeklyProgress);
  const getCustomWorkoutLabel = useWorkoutStore(
    (state) => state.getCustomWorkoutLabel
  );
  const rawDemo = params.demo;
  const demo = Array.isArray(rawDemo) ? rawDemo[0] : rawDemo;
  // Demo workouts are never saved, so the sandbox rebuilds them to show their summary.
  const demoSessions = useMemo(() => {
    if (!demo || !BUILD_DEMO_ENABLED) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { makeMonolithDemo } = require('@/features/build/monolithDemo') as typeof import('@/features/build/monolithDemo');
    return makeMonolithDemo(Number(demo));
  }, [demo]);
  const history = demoSessions ?? sessions;
  const session = history.find((item) => item.id === sessionId);
  // A Custom Split session has no archetype to name, so the hero title comes
  // from the saved workout it was started from; a workout that has since been
  // removed falls back to the existing archetype/muscle title.
  const customWorkoutId = session?.customSplitWorkoutId ?? null;
  const customTitle = useMemo(() => {
    if (customWorkoutId === null) return null;
    const label = getCustomWorkoutLabel(customWorkoutId);
    if (!label) return null;
    return label.name.trim() || `Workout ${getWorkoutLetter(label.position)}`;
  }, [customWorkoutId, getCustomWorkoutLabel]);
  const summary = useMemo(
    () => session ? deriveWorkoutSummary(session, customTitle) : null,
    // Metadata color getters read these preferences without taking them as an argument.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customTitle, session, muscleColors]
  );
  // Full set-by-set report, in the global Settings unit, for sending to a coach or partner.
  const report = useMemo(
    () => session ? buildWorkoutReport(session, { unit: weightUnit, titleOverride: customTitle, history }) : null,
    [customTitle, history, session, weightUnit]
  );
  const previousLifts = useMemo(() => {
    if (!session) return new Map<string, LiftPerformance>();
    const currentDate = parseSessionDate(session.date).getTime();
    const earlier = history.filter(item => item.id !== session.id && (
      parseSessionDate(item.date).getTime() < currentDate ||
      (parseSessionDate(item.date).getTime() === currentDate && item.id.localeCompare(session.id, 'en', { numeric: true }) < 0)
    ));
    return new Map(deriveLiftProgress(earlier).flatMap(lift => {
      const exercise = session.exercises.find(item => item.name === lift.name);
      const previous = lift.history.find(item => item.bodyweight === (exercise?.loadType === 'bodyweight'));
      return previous ? [[lift.name, previous] as const] : [];
    }));
  }, [history, session]);
  const weeklyProgress = getWeeklyProgress();
  const compact = width < 375;
  const stackActions = compact || fontScale > 1.2;
  // Every lift's top set, for the Lift Log share card.
  const liftLog = useMemo(
    () => session ? deriveLiftLog(session, history, weightUnit) : undefined,
    [history, session, weightUnit]
  );
  const [shareVisible, setShareVisible] = useState(false);
  const getExerciseWorkoutType = useWorkoutStore((state) => state.getExerciseWorkoutType);
  // "The Stack" poster: each performed exercise as a slab in its muscle colour, as thick as
  // its share of the session's sets and volume (so bodyweight work still shows).
  const posterLayers = useMemo<StackPosterLayer[]>(() => {
    if (!summary) return [];
    const performed = summary.exercises.filter((exercise) => exercise.setCount > 0);
    const totalSets = performed.reduce((sum, exercise) => sum + exercise.setCount, 0) || 1;
    const totalVolume = performed.reduce((sum, exercise) => sum + exercise.volumeKg, 0);
    return performed.map((exercise) => {
      const type = getExerciseWorkoutType(exercise.name);
      const sets = `${exercise.setCount} ${exercise.setCount === 1 ? 'SET' : 'SETS'}`;
      const amount = exercise.volumeKg > 0
        ? `${formatSummaryNumber(Math.round(displayVolume(exercise.volumeKg, weightUnit)))} ${unitLabel(weightUnit)}`
        : exercise.repCount > 0 ? `${exercise.repCount} REPS` : null;
      return {
        name: exercise.name,
        color: type ? getMuscleColor(type) : summary.accent,
        weight: exercise.setCount / totalSets + (totalVolume > 0 ? exercise.volumeKg / totalVolume : 0),
        detail: amount ? `${sets} · ${amount}` : sets,
        record: report?.exercises.some((item) => item.name === exercise.name && item.hasRecord) ?? false,
      };
    });
    // Muscle colour getters read user preferences without taking them as an argument.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getExerciseWorkoutType, muscleColors, report, summary, weightUnit]);

  if (!summary) {
    return (
      <>
        <SummaryNavigation openedFromHistory={openedFromHistory} />
        <MissingSummary />
      </>
    );
  }

  const displayedVolume = displayVolume(summary.volumeKg, weightUnit);
  const finish = (destination: '/(tabs)' | '/(tabs)/profile') => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.replace(destination);
  };
  // Share opens the card sheet (copy an image to the clipboard); the full PDF report is one tap further, for sending outside.
  const openShare = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setShareVisible(true);
  };
  const sharePdf = async () => {
    if (!report) return;
    try {
      await shareWorkoutReportPdf(report);
    } catch (error) {
      if (Platform.OS === 'web') Alert.alert('Couldn’t share workout', 'Open Stack on your phone to share your workout as a PDF.');
      throw error;
    }
  };
  const specialLabel = specialSetSummaryLabel(summary.specialSets)?.replace(/ LOGGED$/, '');
  const shareDate = formatSummaryDate(summary.date).replace(/^[^,]+,\s*/, '');

  return (
    <View style={styles.screen}>
      <SummaryNavigation openedFromHistory={openedFromHistory} />
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
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: compact ? 14 : 18,
            paddingBottom: 24,
            paddingHorizontal: compact ? 16 : 20,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentColumn}>
          <Animated.View entering={openedFromHistory ? undefined : HERO_ENTER} style={styles.sessionCard}>
            {/* Both glows share the full card bounds, so the footer light fades into the recap. */}
            <WorkoutCardSurface color={summary.accent} radius={36} lightHeight={420}
              variant="summary" showBottomGlow={summary.volumeKg > 0} />
            <View style={styles.sessionHeader}>
              <View style={[styles.completePill, { borderColor: rgba(summary.accent, 0.6), backgroundColor: rgba(summary.accent, 0.09) }]}>
                <Check color={summary.accent} size={13} strokeWidth={3} />
                <Text style={[styles.completeLabel, { color: summary.accent }]}>
                  {openedFromHistory ? 'WORKOUT SAVED' : 'WORKOUT COMPLETE'}
                </Text>
              </View>
              <Text accessibilityRole="header" style={styles.workoutTitle}>{summary.title}</Text>
              <Text style={styles.workoutDate}>{formatSummaryDate(summary.date)}</Text>
              <Text style={styles.sessionMeta}>
                {summary.exerciseCount} {summary.exerciseCount === 1 ? 'exercise' : 'exercises'} · {summary.setCount} {summary.setCount === 1 ? 'set' : 'sets'}
                {report?.durationLabel ? ` · ${report.durationLabel}` : ''}
              </Text>
              {report?.exercises.some(exercise => exercise.hasRecord) && <View style={styles.sessionHighlight}>
                <Trophy size={14} color={summary.accent} />
                <Text accessibilityLabel={`${report.exercises.filter(exercise => exercise.hasRecord).length} personal ${report.exercises.filter(exercise => exercise.hasRecord).length === 1 ? 'record' : 'records'} this workout`} style={styles.highlightText}>
                  {report.exercises.filter(exercise => exercise.hasRecord).length} {report.exercises.filter(exercise => exercise.hasRecord).length === 1 ? 'PR' : 'PRs'} this workout
                </Text>
              </View>}
            </View>

            <ExerciseRecap summary={summary} reportExercises={report?.exercises ?? []}
              previousLifts={previousLifts} weightUnit={weightUnit} />

            {summary.volumeKg > 0 && <View style={styles.volumeFooter}>
              <Text style={styles.volumeLabel}>MOVED</Text>
              <Text style={styles.volumeValue}>
                {formatSummaryNumber(displayedVolume)} <Text style={styles.volumeUnit}>{unitLabel(weightUnit)}</Text>
              </Text>
              <Text style={styles.volumeContext}>Weight × reps across logged sets</Text>
            </View>}
          </Animated.View>

          <Animated.View entering={openedFromHistory ? undefined : CONTENT_ENTER}>
            {session?.imported ? <ImportedFacts exercises={session.imported.exercises} templates={session.imported.templates} notes={session.imported.notes} unit={weightUnit}
              durationS={(Date.parse(session.imported.endedAt) - Date.parse(session.imported.startedAt)) / 1000} /> : null}
            <SummaryDetails summary={summary} weeklyCompleted={weeklyProgress.completed}
              weeklyGoal={weeklyProgress.goal} showWeeklyGoal={!openedFromHistory} />
            {session?.origin === 'adhoc' && session.completed && <View style={styles.saveRoutine}>
              <SaveAdhocRoutine key={session.id} session={session} stacked secondary />
            </View>}

            <View style={styles.secondaryActions}>
              {!openedFromHistory ? (
                <Pressable
                  cssInterop={false}
                  accessibilityRole="button"
                  onPress={() => finish('/(tabs)/profile')}
                  style={({ pressed }) => [styles.progressButton, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.progressButtonText}>View progress</Text>
                  <ArrowUpRight size={17} color={redesignColors.ash} />
                </Pressable>
              ) : null}
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.actionDock,
          {
            paddingBottom: Math.max(insets.bottom, 10),
            paddingHorizontal: compact ? 16 : 20,
          },
        ]}
      >
        {/* The list softens into the dock rather than meeting it at a hard edge. */}
        <LinearGradient pointerEvents="none" colors={[rgba(redesignColors.ink, 0), redesignColors.ink]}
          style={styles.dockFade} />
        <View style={styles.actionColumn}>
          <View
            style={[
              styles.actionRow,
              stackActions && styles.actionRowStacked,
            ]}
          >
            <Pressable
              cssInterop={false}
              accessibilityRole="button"
              accessibilityLabel="Share workout"
              accessibilityHint="Copy a share card, or send the full workout as a PDF"
              onPress={openShare}
              style={({ pressed }) => [
                styles.actionButton,
                styles.shareButton,
                stackActions && styles.stackedButton,
                pressed && styles.shareButtonPressed,
              ]}
            >
              <Share size={20} color={redesignColors.bone} />
              <Text style={styles.shareButtonText}>Share</Text>
            </Pressable>
            <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel="Done"
              accessibilityHint={openedFromHistory ? 'Return to workout history' : 'Return to Train'}
              onPress={() => openedFromHistory ? router.back() : finish('/(tabs)')}
              style={({ pressed }) => [styles.actionButton, styles.doneButton,
                stackActions && styles.stackedButton, pressed && styles.buttonPressed]}>
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ShareSheet
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        accent={summary.accent}
        title={summary.title}
        date={shareDate}
        volumeValue={formatSummaryNumber(displayedVolume)}
        volumeUnit={unitLabel(weightUnit)}
        setCount={summary.setCount}
        repCount={summary.repCount}
        {...(specialLabel ? { specialSetLabel: specialLabel } : {})}
        exerciseCount={summary.exerciseCount}
        {...(report?.durationLabel ? { durationLabel: report.durationLabel } : {})}
        recordCount={report?.exercises.filter(exercise => exercise.hasRecord).length ?? 0}
        {...(liftLog ? { liftLog } : {})}
        posterLayers={posterLayers}
        {...(report ? { onSharePdf: sharePdf } : {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: redesignColors.ink },
  scrollContent: { flexGrow: 1 },
  contentColumn: { width: '100%', maxWidth: 470, alignSelf: 'center' },
  sessionCard: { borderRadius: 36, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: redesignColors.surface },
  sessionHeader: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 22 },
  completePill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  completeLabel: { fontFamily: redesignFonts.monoBold, fontSize: 10, lineHeight: 14, letterSpacing: 1.8 },
  workoutTitle: { marginTop: 16, fontFamily: redesignFonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -1.3, color: redesignColors.bone },
  workoutDate: { marginTop: 6, fontFamily: redesignFonts.ui, fontSize: 14, lineHeight: 21, color: redesignColors.ash },
  sessionMeta: { marginTop: 4, fontFamily: redesignFonts.uiMedium, fontSize: 14, lineHeight: 21, color: redesignColors.bone, opacity: 0.8, fontVariant: ['tabular-nums'] },
  sessionHighlight: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7 },
  highlightText: { fontFamily: redesignFonts.uiMedium, fontSize: 14, lineHeight: 21, color: redesignColors.bone },
  recap: { paddingHorizontal: 20 },
  recapTitle: { paddingBottom: 4, fontFamily: redesignFonts.mono, fontSize: 10, lineHeight: 16, letterSpacing: 1.8, color: redesignColors.ash },
  emptyRecap: { paddingVertical: 18, fontFamily: redesignFonts.ui, fontSize: 15, lineHeight: 22, color: redesignColors.ash },
  exerciseRow: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: rgba(redesignColors.ash, 0.13) },
  exerciseTrigger: { paddingVertical: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 10, minHeight: 44 },
  categoryMark: { width: 3, height: 18, borderRadius: 2, marginTop: 2 },
  exerciseContent: { flex: 1, minWidth: 0 },
  exerciseHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exerciseName: { flex: 1, fontFamily: redesignFonts.uiSemiBold, fontSize: 17, lineHeight: 23, color: redesignColors.bone },
  exerciseMetric: { marginTop: 5, fontFamily: redesignFonts.monoBold, fontSize: 20, lineHeight: 28, letterSpacing: -0.7, color: redesignColors.bone, fontVariant: ['tabular-nums'] },
  exerciseContextRow: { marginTop: 3, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 5 },
  exerciseContext: { fontFamily: redesignFonts.ui, fontSize: 12, lineHeight: 18, color: redesignColors.ash },
  recordLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recordText: { fontFamily: redesignFonts.uiSemiBold, fontSize: 12, lineHeight: 18 },
  previous: { marginTop: 5, fontFamily: redesignFonts.mono, fontSize: 12, lineHeight: 18, color: redesignColors.bone, fontVariant: ['tabular-nums'] },
  previousLabel: { fontFamily: redesignFonts.uiMedium, color: redesignColors.ash },
  setList: { paddingLeft: 13, paddingBottom: 16, gap: 8 },
  setRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', columnGap: 12, rowGap: 4 },
  setLabel: { fontFamily: redesignFonts.ui, fontSize: 13, lineHeight: 20, color: redesignColors.ash },
  setValue: { fontFamily: redesignFonts.mono, fontSize: 13, lineHeight: 20, color: redesignColors.bone, fontVariant: ['tabular-nums'] },
  skippedSet: { color: redesignColors.ash },
  volumeFooter: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 26, overflow: 'hidden' },
  volumeLabel: { fontFamily: redesignFonts.mono, fontSize: 10, lineHeight: 16, letterSpacing: 1.8, color: redesignColors.ash },
  volumeValue: { marginTop: 7, fontFamily: redesignFonts.monoBold, fontSize: 30, lineHeight: 40, letterSpacing: -1.3, color: redesignColors.bone, fontVariant: ['tabular-nums'] },
  volumeUnit: { fontFamily: redesignFonts.uiMedium, fontSize: 16, letterSpacing: 0, color: redesignColors.bone },
  volumeContext: { marginTop: 2, fontFamily: redesignFonts.ui, fontSize: 12, lineHeight: 18, color: redesignColors.bone, opacity: 0.8 },
  detailList: { marginTop: 16, paddingHorizontal: 4, gap: 4 },
  detailRow: { minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', columnGap: 16, rowGap: 6, paddingVertical: 6 },
  detailLabel: { fontFamily: redesignFonts.ui, fontSize: 14, lineHeight: 21, color: redesignColors.ash },
  detailText: { fontFamily: redesignFonts.uiMedium, fontSize: 14, lineHeight: 21, color: redesignColors.bone },
  specialPill: { paddingVertical: 4 },
  specialText: { fontFamily: redesignFonts.mono, fontSize: 10, lineHeight: 16, letterSpacing: 0.7 },
  weeklyValue: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weeklyBars: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  weeklyBar: { width: 14, height: 4, borderRadius: 2 },
  weeklyCount: { fontFamily: redesignFonts.mono, fontSize: 13, lineHeight: 20, color: redesignColors.bone, fontVariant: ['tabular-nums'] },
  saveRoutine: { marginTop: 16 },
  secondaryActions: { marginTop: 12, alignItems: 'center' },
  progressButton: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14 },
  progressButtonText: { fontFamily: redesignFonts.uiSemiBold, fontSize: 15, lineHeight: 22, color: redesignColors.ash },
  actionDock: { paddingTop: 12, backgroundColor: redesignColors.ink },
  dockFade: { position: 'absolute', left: 0, right: 0, top: -32, height: 32 },
  actionColumn: { width: '100%', maxWidth: 470, alignSelf: 'center' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionRowStacked: { flexDirection: 'column-reverse' },
  actionButton: { minWidth: 0, minHeight: 56, paddingVertical: 15, paddingHorizontal: 16, borderRadius: 18, borderCurve: 'continuous', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  shareButton: { flex: 1, backgroundColor: redesignColors.raised },
  doneButton: { flex: 1.35, backgroundColor: redesignColors.bone },
  stackedButton: { flex: 0, width: '100%' },
  shareButtonText: { flexShrink: 1, textAlign: 'center', fontFamily: redesignFonts.uiSemiBold, fontSize: 16, lineHeight: 22, color: redesignColors.bone },
  doneButtonText: { fontFamily: redesignFonts.uiBold, fontSize: 16, lineHeight: 22, color: redesignColors.ink },
  buttonDisabled: { opacity: 0.65 },
  shareButtonPressed: { backgroundColor: redesignColors.hi },
  closeButton: { minWidth: 44, minHeight: 44, marginRight: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: redesignColors.raised },
  buttonPressed: { opacity: 0.72 },
  missingScreen: { flex: 1, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: redesignColors.ink },
  missingTitle: { textAlign: 'center', fontFamily: redesignFonts.display, fontSize: 34, color: redesignColors.bone },
  missingBody: { maxWidth: 340, marginTop: 12, textAlign: 'center', fontFamily: redesignFonts.ui, fontSize: 16, lineHeight: 24, color: redesignColors.ash },
  missingButton: { minHeight: 54, marginTop: 24, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: redesignColors.accent },
  missingButtonText: { fontFamily: redesignFonts.uiBold, fontSize: 17, color: redesignColors.ink },
});
