import { displayExerciseName } from '@/constants/exerciseNames';
import { hasMuscleColorPreference, getWorkoutLoggingColor } from '@/constants/muscleColors';
import { useMuscleColors } from '@/store/muscleColors';
import { confirmationEnter } from '@/constants/workoutMotion';
import { WorkoutSetGlyph, WorkoutSetRail } from '@/components/WorkoutSetRail';
import { WorkoutTouchable } from '@/components/WorkoutTouchable';
import { WorkoutHeaderActions } from '@/components/WorkoutHeaderActions';
import { BUILD_SANDBOX_ENABLED } from '../features/build/config';
import { completionDestination } from '../features/build/casting';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkoutMinimizeSurface, type WorkoutMinimizeHandle } from '@/components/WorkoutMinimizeSurface';
import { WorkoutLaunchSection, WorkoutLaunchSurface } from '@/components/WorkoutLaunchSurface';
import { parseWorkoutLaunchOrigin } from '@/utils/workoutLaunch';
import { Check, ChevronRight, Info } from 'lucide-react-native';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import Animated, {
  Easing,
  FadeIn,
  FadeInLeft,
  FadeInRight,
  FadeOutLeft,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from '@/services/haptics';
import { ActiveSetCard } from '@/components/ActiveSetCard';
import { ExerciseActionPill } from '@/components/ExerciseActionPill';
import { ExerciseHistory } from '@/components/ExerciseHistory';
import { ExerciseNotes } from '@/components/ExerciseNotes';
import { ExerciseInfo } from '@/components/ExerciseInfo';
import {
  BONUS_SET_META,
  BonusSet,
  type BonusSetSelection,
} from '@/components/BonusSet';
import { ExerciseFinisher } from '@/components/ExerciseFinisher';
import { SwapExerciseSheet } from '@/components/SwapExerciseSheet';
import { UpNextSheet, type RemainingExercise } from '@/components/UpNextSheet';
import { WorkoutDayLabel } from '@/components/WorkoutDayLabel';
import { WorkoutIntensityPicker } from '@/components/home/WorkoutIntensityPicker';
import { ARCHETYPE_COMPOSITIONS, getSessionWorkoutDisplay } from '@/constants/archetypes';
import { getExerciseInfo, type ExerciseInfoData } from '@/constants/exerciseInfo';
import { motionDuration, motionEasing } from '@/constants/motion';
import {
  workoutCardEntering,
  workoutCardExiting,
  workoutLayoutTransition,
} from '@/constants/workoutLayoutTransitions';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { workoutMeta } from '@/constants/workouts';
import {
  IntensityLevel,
  type Exercise,
  type ExerciseLoadType,
  type ExerciseMetric,
  type ExerciseSet,
  useWorkoutStore,
} from '@/store/workoutStore';
import { clampDuration, formatDuration } from '@/store/exerciseMeasurement';
import { formatWeight, getWeightIncrement, type WeightUnit } from '@/store/weightUnits';
import { WORKOUT_SCREEN_HORIZONTAL_PADDING } from '@/constants/workoutPicker';
import { getActiveSetIndex, getCurrentWorkoutExerciseIndex } from '@/utils/workoutResume';
import { getNextIncompleteExerciseIndex, isExerciseComplete } from '@/store/workoutSetActions';
import {
  getAddSetBase,
  getLastTimeComparison,
  getPreviousBest,
  getRecordHint,
  getRecordSetIndexes,
  isPerformedSet,
} from '@/store/exerciseWrapUp';
import '@/global.css';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const FEEDBACK_LEVELS = [
  { value: 0, label: 'Too easy' },
  { value: 0.5, label: 'Just right' },
  { value: 1, label: 'Too hard' },
] as const;

// Motion is deliberately short and directional: forward actions arrive from
// the right, cancellations return from the left, and replacements simply fade.
// Reanimated's reduced-motion mode collapses these automatically when requested
// by the device accessibility settings.
const FORWARD_ENTER = FadeInRight.duration(motionDuration.transition)
  .easing(motionEasing.decelerate)
  .reduceMotion(ReduceMotion.System);
const BACKWARD_ENTER = FadeInLeft.duration(220)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const REPLACE_ENTER = FadeIn.duration(200)
  .easing(Easing.out(Easing.ease))
  .reduceMotion(ReduceMotion.System);
const EXERCISE_EXIT = FadeOutLeft.duration(160)
  .easing(Easing.in(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const STAGE_EXIT = workoutCardExiting;
const CHECK_ENTER = confirmationEnter;
const LOG_SUBMISSION_GUARD_MS = motionDuration.transition + motionDuration.feedback;

function ExerciseInfoButton({ onPress }: { onPress: () => void }) {
  // Liquid Glass is available only on supported iOS versions. Other platforms
  // retain the same native-sized action with a restrained material fallback.
  const supportsGlass = Platform.OS === 'ios' && isGlassEffectAPIAvailable();

  const icon = <Info color={redesignColors.bone} size={19} strokeWidth={2.2} />;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Exercise info"
      accessibilityHint="Shows how to do this exercise."
      activeOpacity={supportsGlass ? 0.94 : 0.7}
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        flexShrink: 0,
        marginLeft: 8,
        borderRadius: 22,
        overflow: 'hidden',
      }}
    >
      {supportsGlass ? (
        <GlassView
          glassEffectStyle="regular"
          colorScheme="dark"
          isInteractive
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          {icon}
        </GlassView>
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 22,
            borderWidth: 1,
            borderColor: redesignColors.border,
            backgroundColor: redesignColors.raised,
          }}
        >
          {icon}
        </View>
      )}
    </TouchableOpacity>
  );
}

function ExerciseProgressSegment({
  state,
  accent,
}: {
  state: 'completed' | 'current' | 'upcoming';
  accent: string;
}) {
  const fill = useSharedValue(state === 'upcoming' ? 0 : 1);
  const focus = useSharedValue(state === 'current' ? 1 : 0);

  useEffect(() => {
    fill.value = withTiming(state === 'upcoming' ? 0 : 1, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
    focus.value = withTiming(state === 'current' ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.ease),
      reduceMotion: ReduceMotion.System,
    });
  }, [fill, focus, state]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      fill.value,
      [0, 1],
      [redesignColors.hi, accent]
    ),
    shadowColor: accent,
    shadowOpacity: focus.value * 0.18,
    shadowRadius: 3,
  }));

  return (
    <Animated.View
      style={[
        {
          // The layout wrapper owns the row's flex; flex here would collapse the height.
          width: '100%',
          height: 3,
          borderRadius: 1.5,
          shadowOffset: { width: 0, height: 0 },
        },
        animatedStyle,
      ]}
    />
  );
}

function SetPip({
  state,
  weight,
  reps,
  durationS,
  weightUnit,
  loadType,
  metric,
  accent,
  currentLabel = 'NOW',
  setNumber,
  selected,
  onEdit,
  onReturnToCurrent,
}: {
  state: 'completed' | 'current' | 'upcoming';
  weight: number;
  reps: number;
  durationS?: number;
  weightUnit: WeightUnit;
  loadType: ExerciseLoadType;
  metric: ExerciseMetric;
  accent: string;
  currentLabel?: string;
  setNumber: number;
  selected: boolean;
  onEdit?: () => void;
  onReturnToCurrent?: () => void;
}) {
  const valueLabel = metric === 'duration'
    ? loadType === 'bodyweight'
      ? formatDuration(durationS)
      : `${formatWeight(weight, weightUnit)} · ${formatDuration(durationS)}`
    : loadType === 'bodyweight'
      ? `${reps} reps`
      : `${formatWeight(weight, weightUnit)} × ${reps}`;
  const loggedMeasurement = metric === 'duration' ? formatDuration(durationS) : `${reps} reps`;
  const loggedLoad = loadType === 'bodyweight' ? '' : `${formatWeight(weight, weightUnit)} ${weightUnit}, `;
  const currentDescription = currentLabel === 'NOW' ? 'current' : `current, ${currentLabel}`;
  const accessibilityLabel = state === 'completed'
    ? `${onEdit ? 'Edit completed' : 'Completed'} set ${setNumber}, ${loggedLoad}${loggedMeasurement}`
    : `Set ${setNumber}, ${state === 'current' ? currentDescription : 'upcoming'}`;

  // Every marker keeps the same geometry while selection changes. Completion
  // and selection are independent: inspecting a logged set never moves "Now".
  const content = (
    <View style={{
      width: '100%',
      minHeight: 44,
      paddingHorizontal: 4,
      paddingVertical: 6,
      borderRadius: 999,
      borderCurve: 'continuous',
      borderWidth: 1,
      borderColor: 'transparent',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    }}>
      <WorkoutSetGlyph completed={state === 'completed'} selected={selected} setNumber={setNumber} accent={accent} />
      {state !== 'upcoming' && (
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.2}
          style={{ flexShrink: 1, fontFamily: redesignFonts.uiSemiBold, fontSize: 14, fontVariant: ['tabular-nums'], color: selected ? redesignColors.bone : redesignColors.ash }}>
          {state === 'completed' ? valueLabel : currentLabel === 'NOW' ? 'Now' : currentLabel}
        </Text>
      )}
    </View>
  );

  const onPress = state === 'completed' ? onEdit : state === 'current' ? onReturnToCurrent : undefined;
  const targetStyle = { minHeight: 56, minWidth: 44, width: '100%' as const, paddingVertical: 6, justifyContent: 'center' as const, alignItems: 'center' as const };
  return onPress ? (
    <WorkoutTouchable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      accessibilityHint={state === 'completed' ? 'Shows logged values without changing workout progress' : 'Returns to the current unfinished set'}
      activeOpacity={0.72}
      onPress={onPress}
      style={targetStyle}
    >
      {content}
    </WorkoutTouchable>
  ) : (
    <View accessible accessibilityLabel={accessibilityLabel} accessibilityState={{ selected }} style={targetStyle}>{content}</View>
  );
}

function SetProgress({
  sets,
  currentSetIndex,
  selectedSetIndex = currentSetIndex,
  onReturnToCurrent,
  weightUnit,
  loadType,
  metric,
  accent,
  currentAccent = accent,
  currentLabel,
  onEditCompletedSet,
  enteringSetIndex,
}: {
  sets: ExerciseSet[];
  currentSetIndex: number;
  selectedSetIndex?: number;
  onReturnToCurrent?: () => void;
  weightUnit: WeightUnit;
  loadType: ExerciseLoadType;
  metric: ExerciseMetric;
  accent: string;
  currentAccent?: string;
  currentLabel?: string;
  onEditCompletedSet?: (setIndex: number) => void;
  enteringSetIndex?: number;
}) {
  return (
    <WorkoutSetRail
      selectedIndex={selectedSetIndex}
      accent={selectedSetIndex === currentSetIndex ? currentAccent : accent}
      enteringIndex={enteringSetIndex}
    >
      {sets.map((set, index) => {
        const state = set.completed
          ? 'completed'
          : index === currentSetIndex
            ? 'current'
            : 'upcoming';
        return (
          <SetPip
            key={`${set.type ?? 'working'}-${index}`}
            state={state}
            weight={set.weight}
            reps={set.reps}
            durationS={set.durationS}
            weightUnit={weightUnit}
            loadType={loadType}
            metric={metric}
            accent={index === currentSetIndex ? currentAccent : accent}
            currentLabel={currentLabel}
            setNumber={index + 1}
            selected={index === selectedSetIndex}
            onReturnToCurrent={onReturnToCurrent}
            onEdit={state === 'completed' && onEditCompletedSet ? () => onEditCompletedSet(index) : undefined}
          />
        );
      })}
    </WorkoutSetRail>
  );
}

const getRemainingExercises = (
  exercises: Exercise[],
  currentIndex: number
): RemainingExercise[] => {
  const remaining: RemainingExercise[] = [];

  for (let offset = 1; offset < exercises.length; offset += 1) {
    const index = (currentIndex + offset) % exercises.length;
    const exercise = exercises[index];
    if (!isExerciseComplete(exercise)) remaining.push({ exercise, index });
  }

  return remaining;
};

export default function Workout() {
  useMuscleColors(state => state.preferences);
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { fromActivityCard, finishFromActivity, launchOrigin: launchOriginParam } = useLocalSearchParams<{
    fromActivityCard?: string;
    finishFromActivity?: string;
    launchOrigin?: string;
  }>();
  const [launchOrigin] = useState(() => fromActivityCard === '1' ? null : parseWorkoutLaunchOrigin(launchOriginParam));
  const minimizeRef = useRef<WorkoutMinimizeHandle>(null);
  const currentSession = useWorkoutStore((state) => state.currentSession);
  const profile = useWorkoutStore((state) => state.profile);
  const sessions = useWorkoutStore((state) => state.sessions);
  const setExerciseEntryUnit = useWorkoutStore((state) => state.setExerciseEntryUnit);
  const selectedSet = useWorkoutStore((state) => state.selectedSet);
  const selectWorkoutSet = useWorkoutStore((state) => state.selectWorkoutSet);
  const clearSelectedSet = useWorkoutStore((state) => state.clearSelectedSet);
  const applySetValueAction = useWorkoutStore((state) => state.applySetValueAction);
  const appendBonusSet = useWorkoutStore((state) => state.appendBonusSet);
  const applyActiveSetAction = useWorkoutStore((state) => state.applyActiveSetAction);
  const toggleSetSkipped = useWorkoutStore((state) => state.toggleSetSkipped);
  const swapCurrentSessionExercise = useWorkoutStore(
    (state) => state.swapCurrentSessionExercise
  );
  const completeWorkout = useWorkoutStore((state) => state.completeWorkout);
  const discardWorkout = useWorkoutStore((state) => state.discardWorkout);

  const workoutFocus = useWorkoutStore((state) => state.workoutFocus);
  const setExerciseIndex = useWorkoutStore((state) => state.setWorkoutExerciseIndex);
  const exerciseIndex = currentSession ? getCurrentWorkoutExerciseIndex(currentSession, workoutFocus) : 0;
  const [showSwapSheet, setShowSwapSheet] = useState(false);
  const [addExerciseOnly, setAddExerciseOnly] = useState(false);
  const [showUpNextSheet, setShowUpNextSheet] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const activityFeedbackVisible = Boolean(currentSession && currentSession.origin !== 'adhoc' && finishFromActivity === currentSession.id &&
    currentSession.exercises.every(isExerciseComplete));
  const [bonusSelection, setBonusSelection] = useState<BonusSetSelection | null>(null);
  const [recentBonusSetIndex, setRecentBonusSetIndex] = useState<number | null>(null);
  const [stageDirection, setStageDirection] = useState<1 | -1>(1);
  const [exerciseMotion, setExerciseMotion] = useState<'forward' | 'backward' | 'replace'>(
    'forward'
  );
  const [infoExercise, setInfoExercise] = useState<ExerciseInfoData | null>(null);
  const [infoVisible, setInfoVisible] = useState(false);
  const infoOpeningRef = useRef(false);
  const closeExerciseInfo = useCallback(() => setInfoVisible(false), [setInfoVisible]);
  const finishClosingExerciseInfo = useCallback(() => {
    infoOpeningRef.current = false;
    setInfoExercise(null);
  }, [setInfoExercise]);
  const loggingSetRef = useRef(false);
  const exitingRef = useRef(false);
  const hasRenderedRef = useRef(false);
  const renderedExerciseIdentityRef = useRef<string | null>(null);
  const exerciseIdentity = `${exerciseIndex}-${currentSession?.exercises[exerciseIndex]?.name ?? ''}`;

  const confirmDiscardWorkout = useCallback(() => {
    if (!currentSession || exitingRef.current) return;

    Alert.alert(
      'Discard workout?',
      "Leaving now will discard this workout. Sets you've logged won't be saved.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            exitingRef.current = true;
            discardWorkout();
            router.back();
          },
        },
      ]
    );
  }, [currentSession, discardWorkout, router]);

  useEffect(() => {
    if (!currentSession && !exitingRef.current) router.back();
  }, [currentSession, router]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (infoExercise) {
        closeExerciseInfo();
        return true;
      }
      confirmDiscardWorkout();
      return true;
    });

    return () => subscription.remove();
  }, [closeExerciseInfo, confirmDiscardWorkout, infoExercise]);

  useEffect(() => {
    setBonusSelection(null);
    setShowFeedbackModal(false);
  }, [exerciseIndex]);

  useEffect(() => {
    hasRenderedRef.current = true;
  }, []);

  // Rest runs from the most recent logged set of this exercise. Sets already
  // logged before the screen mounted have no known time, so no clock shows.
  const performedSetCount = currentSession?.exercises[exerciseIndex]?.sets.filter(isPerformedSet).length ?? 0;
  const restCountRef = useRef<{ identity: string; count: number } | null>(null);
  const [restStart, setRestStart] = useState<{ identity: string; at: number } | null>(null);
  useEffect(() => {
    const previous = restCountRef.current;
    restCountRef.current = { identity: exerciseIdentity, count: performedSetCount };
    if (previous?.identity === exerciseIdentity && performedSetCount > previous.count) {
      setRestStart({ identity: exerciseIdentity, at: Date.now() });
    }
  }, [exerciseIdentity, performedSetCount]);

  useEffect(() => {
    renderedExerciseIdentityRef.current = exerciseIdentity;
  }, [exerciseIdentity]);

  const minimizeWorkout = () => {
    navigation.setOptions({ animation: 'none' });
    minimizeRef.current?.minimize();
  };
  const leaveMinimizedWorkout = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  if (!currentSession || !profile) return null;
  const workoutType = currentSession.workoutTypes[0];
  if (currentSession.exercises.length === 0) return (
    <WorkoutLaunchSurface origin={launchOrigin}>
      <WorkoutMinimizeSurface ref={minimizeRef} expandFromCard={fromActivityCard === '1'} session={currentSession}
        onMinimize={leaveMinimizedWorkout}>
        <View style={{ flex: 1, backgroundColor: redesignColors.ink, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20, paddingHorizontal: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <WorkoutDayLabel label="Workout" accent={redesignColors.accent} />
            <WorkoutHeaderActions addMode onChange={() => setShowSwapSheet(true)}
              onMinimize={minimizeWorkout} onExit={confirmDiscardWorkout} />
          </View>
          <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
            <Text style={{ fontFamily: redesignFonts.display, fontSize: 36, color: redesignColors.bone }}>Empty workout</Text>
            <Text style={{ fontFamily: redesignFonts.ui, fontSize: 18, color: redesignColors.ash }}>Add your first exercise</Text>
            <WorkoutTouchable accessibilityRole="button" onPress={() => setShowSwapSheet(true)} style={{ padding: 20, borderRadius: 18, backgroundColor: redesignColors.accent }}>
              <Text style={{ fontFamily: redesignFonts.uiSemiBold, fontSize: 18, color: redesignColors.ink }}>Add exercise</Text>
            </WorkoutTouchable>
          </View>
          <SwapExerciseSheet mode="add" sessionId={currentSession.id} visible={showSwapSheet} dayLabel="Workout" accent={redesignColors.accent}
            sessionExercises={currentSession.exercises} onNavigate={setExerciseIndex} onClose={() => setShowSwapSheet(false)} />
        </View>
      </WorkoutMinimizeSurface>
    </WorkoutLaunchSurface>
  );

  const legacyMeta = workoutMeta[workoutType];
  const feedbackWorkout = getSessionWorkoutDisplay(currentSession);
  const primaryArchetype = currentSession.archetype;
  const secondaryArchetype = currentSession.secondaryArchetype;
  const archetypeComposition = primaryArchetype
    ? ARCHETYPE_COMPOSITIONS[primaryArchetype]
    : null;
  const dayLabel = currentSession.origin === 'adhoc' ? 'Workout' : archetypeComposition
    ? secondaryArchetype
      ? `${archetypeComposition.shortLabel} + ${ARCHETYPE_COMPOSITIONS[secondaryArchetype].shortLabel}`
      : archetypeComposition.shortLabel
    : legacyMeta.label;
  const exercise = currentSession.exercises[exerciseIndex];
  const exerciseType = useWorkoutStore.getState().getExerciseWorkoutType(exercise.name);
  const accent = exerciseType && hasMuscleColorPreference(exerciseType)
    ? getWorkoutLoggingColor(exerciseType)
    : currentSession.origin === 'adhoc' ? redesignColors.accent : archetypeComposition?.color ?? getWorkoutLoggingColor(workoutType);
  const weightUnit = exercise.entryUnit;
  const weightIncrement = getWeightIncrement(profile, weightUnit);
  const availableExerciseInfo = getExerciseInfo(exercise.name);
  const handleOpenExerciseInfo = () => {
    if (!availableExerciseInfo || infoOpeningRef.current) return;
    infoOpeningRef.current = true;
    setInfoExercise(availableExerciseInfo);
    setInfoVisible(true);
  };
  const activeSetIndex = getActiveSetIndex(exercise);
  const editTarget = useWorkoutStore.getState().getSetEditTarget();
  const inspectingSet = Boolean(selectedSet && editTarget?.completed && editTarget.exerciseIndex === exerciseIndex);
  const setIndex = inspectingSet ? editTarget!.setIndex : activeSetIndex;
  const activeSet = exercise.sets[setIndex];
  const nextIncompleteExerciseIndex = getNextIncompleteExerciseIndex(
    currentSession.exercises,
    exerciseIndex
  );
  const nextExercise =
    nextIncompleteExerciseIndex === -1
      ? undefined
      : currentSession.exercises[nextIncompleteExerciseIndex];
  const remainingExercises = getRemainingExercises(
    currentSession.exercises,
    exerciseIndex
  );
  const exerciseComplete = isExerciseComplete(exercise);
  const previousBest = getPreviousBest(sessions, exercise.name);
  const recordSetIndexes = getRecordSetIndexes(previousBest, exercise);
  const addSetBase = getAddSetBase(exercise);
  // A logged set that beats the record gets a success haptic instead of the usual tap.
  const loggedRecord = (loggedSetIndex: number) => {
    const updated = useWorkoutStore.getState().currentSession?.exercises[exerciseIndex];
    return Boolean(updated && getRecordSetIndexes(previousBest, updated).includes(loggedSetIndex));
  };

  // Each render captures a row identity and completion lease. Keypad drafts
  // retain this callback from editing start, even if Live Activity advances.
  const handleRepsChange = (delta: number) => {
    if (editTarget) applySetValueAction(editTarget, delta > 0 ? 'increaseReps' : 'decreaseReps');
  };
  const handleDurationChange = (delta: number) => {
    if (editTarget) applySetValueAction(editTarget, delta > 0 ? 'increaseDuration' : 'decreaseDuration');
  };
  const handleWeightChange = (delta: number) => {
    if (editTarget && useWorkoutStore.getState().currentSession?.exercises[exerciseIndex]?.entryUnit === weightUnit) {
      applySetValueAction(editTarget, delta > 0 ? 'increaseWeight' : 'decreaseWeight', undefined, Math.abs(delta));
    }
  };
  const currentTarget = () => !inspectingSet && editTarget && !editTarget.completed ? editTarget : null;

  const handleToggleSet = () => {
    if (loggingSetRef.current) return;
    const target = currentTarget();
    if (!target) return;
    loggingSetRef.current = true;
    setStageDirection(1);
    setExerciseMotion('forward');
    // Stay on a finished exercise so its wrap-up can show the sets and offer another one;
    // "Next exercise" there advances. (Live Activity taps still advance on their own.)
    const result = applyActiveSetAction(target, 'completeSet', undefined, { advanceFocus: false });
    if (result.status !== 'applied') {
      loggingSetRef.current = false;
      return;
    }
    setTimeout(() => { loggingSetRef.current = false; }, LOG_SUBMISSION_GUARD_MS);
    if (Platform.OS !== 'web') {
      if (result.completedExercise && loggedRecord(target.setIndex)) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (result.completedExercise) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else void Haptics.selectionAsync();
    }
    if (result.completedExercise) setRecentBonusSetIndex(null);
    if (result.needsFeedback && currentSession.origin !== 'adhoc') setShowFeedbackModal(true);
  };

  const handleSkipSet = () => {
    if (inspectingSet) { clearSelectedSet(); return; }
    const target = currentTarget();
    const actual = useWorkoutStore.getState().getActiveSetTarget();
    if (!target || !actual || actual.setId !== target.setId || actual.exerciseId !== target.exerciseId ||
        actual.workoutId !== target.workoutId) return;
    const wasCompleted = activeSet.completed;
    const completesExercise = exercise.sets.every(
      (set, index) => index === setIndex || set.completed
    );
    setStageDirection(1);
    toggleSetSkipped(exerciseIndex, setIndex);
    if (!wasCompleted && !completesExercise && Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }
  };

  const navigateToExercise = (
    targetIndex: number,
    direction: 'forward' | 'backward' = targetIndex > exerciseIndex ? 'forward' : 'backward'
  ) => {
    if (targetIndex === exerciseIndex) return;
    setRecentBonusSetIndex(null);
    setExerciseMotion(direction);
    setStageDirection(direction === 'forward' ? 1 : -1);
    setExerciseIndex(targetIndex);
  };

  const handleAdvanceExercise = () => {
    if (nextIncompleteExerciseIndex !== -1) {
      // Advancing is logically forward even when the circular search wraps to
      // an earlier deferred exercise.
      navigateToExercise(nextIncompleteExerciseIndex, 'forward');
    } else {
      setShowFeedbackModal(true);
    }
  };

  const handleNavigateExercise = (targetIndex: number) => {
    navigateToExercise(targetIndex);
    setShowSwapSheet(false);
  };

  const handleNavigateFromUpNext = (targetIndex: number) => {
    navigateToExercise(targetIndex, 'forward');
    setShowUpNextSheet(false);
  };

  const handleSwapExercise = (name: string) => {
    setRecentBonusSetIndex(null);
    setExerciseMotion('replace');
    swapCurrentSessionExercise(exerciseIndex, name);
    setShowSwapSheet(false);
  };

  const handleFeedbackSelect = (intensity: IntensityLevel) => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    const completedSession = completeWorkout(intensity);
    if (!completedSession) {
      exitingRef.current = false;
      return;
    }
    setShowFeedbackModal(false);
    const destination = completionDestination(completedSession, BUILD_SANDBOX_ENABLED)!;
    router.replace(destination as Parameters<typeof router.replace>[0]);
  };

  const previousWeight = setIndex > 0 ? exercise.sets[setIndex - 1].weight : null;
  const weightDeltaLabel = (() => {
    if (previousWeight === null) return null;
    if (previousWeight === 0) return activeSet.weight === 0 ? '+0%' : null;
    const percentage = Math.round(((activeSet.weight - previousWeight) / previousWeight) * 100);
    return `${percentage >= 0 ? '+' : ''}${percentage}%`;
  })();
  const previousReps = setIndex > 0 ? exercise.sets[setIndex - 1].reps : null;
  const repsDeltaLabel = (() => {
    if (exercise.metric !== 'reps' || previousReps === null || previousReps <= 0) return null;
    const percentage = Math.round(((activeSet.reps - previousReps) / previousReps) * 100);
    return `${percentage >= 0 ? '+' : ''}${percentage}%`;
  })();
  const stageKey = bonusSelection
    ? 'bonus'
    : exerciseComplete && !inspectingSet
      ? 'finisher'
      : 'active';
  const exerciseEntering =
    exerciseMotion === 'replace'
      ? REPLACE_ENTER
      : exerciseMotion === 'backward'
        ? BACKWARD_ENTER
        : FORWARD_ENTER;
  const stageEntering = stageDirection === -1 ? BACKWARD_ENTER : FORWARD_ENTER;
  const animateExercise = hasRenderedRef.current;
  const animateStage =
    hasRenderedRef.current && renderedExerciseIdentityRef.current === exerciseIdentity;

  return (
    <WorkoutLaunchSurface origin={launchOrigin}>
    <WorkoutMinimizeSurface
      ref={minimizeRef}
      expandFromCard={fromActivityCard === '1'}
      session={currentSession}
      onMinimize={leaveMinimizedWorkout}
    >
    {/* Keep padding tied to the screen, not the moving surface's native bounds.
        Native SafeAreaView recalculates its insets during the morph. */}
    <View style={{
      flex: 1,
      backgroundColor: redesignColors.ink,
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: WORKOUT_SCREEN_HORIZONTAL_PADDING,
          paddingTop: 16,
          paddingBottom: 96,
        }}
      >
        <WorkoutLaunchSection>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <WorkoutDayLabel
            accent={accent}
            label={dayLabel}
            numberOfLines={archetypeComposition ? 2 : 1}
          />

          <WorkoutHeaderActions
            addMode={currentSession.origin === 'adhoc'}
            onChange={() => { setAddExerciseOnly(false); setShowSwapSheet(true); }}
            onMinimize={minimizeWorkout}
            onExit={confirmDiscardWorkout}
          />
        </View>
        </WorkoutLaunchSection>

        <WorkoutLaunchSection order={1}>
        <Animated.View
          layout={workoutLayoutTransition}
          style={{ flexDirection: 'row', gap: 6, marginTop: 24 }}
        >
          {currentSession.exercises.map((item, index) => (
            <Animated.View
              key={`${item.name}-${index}`}
              layout={workoutLayoutTransition}
              style={{ flex: 1 }}
            >
              <ExerciseProgressSegment
                state={
                  index === exerciseIndex
                    ? 'current'
                    : isExerciseComplete(item)
                      ? 'completed'
                      : 'upcoming'
                }
                accent={accent}
              />
            </Animated.View>
          ))}
        </Animated.View>

        <Animated.View
          key={`title-${exerciseIdentity}`}
          entering={animateExercise ? exerciseEntering : undefined}
          exiting={EXERCISE_EXIT}
          style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}
        >
          <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' }}>
            <Text
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              allowFontScaling={false}
              style={{
                flex: 1,
                minWidth: 0,
                fontFamily: redesignFonts.display,
                fontSize: 38,
                lineHeight: 44,
                letterSpacing: -1.1,
                color: redesignColors.bone,
              }}
            >
              {displayExerciseName(exercise.name)}
            </Text>
            {availableExerciseInfo && stageKey !== 'finisher' ? <ExerciseInfoButton onPress={handleOpenExerciseInfo} /> : null}
          </View>
          {exerciseComplete && !bonusSelection ? (
            // Status, not an action: no fill or glow that would read as a button.
            <Animated.View
              entering={CHECK_ENTER}
              accessible
              accessibilityLabel="Exercise complete"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 12 }}
            >
              <Check color={accent} size={16} strokeWidth={3} />
              <Text
                allowFontScaling={false}
                style={{
                  fontFamily: redesignFonts.monoBold,
                  fontSize: 11,
                  letterSpacing: 1.4,
                  color: redesignColors.ash,
                }}
              >
                DONE
              </Text>
            </Animated.View>
          ) : null}
        </Animated.View>

        </WorkoutLaunchSection>

        <WorkoutLaunchSection order={2} fill>
        <Animated.ScrollView
          key={`body-${exerciseIdentity}`}
          entering={animateExercise ? exerciseEntering : undefined}
          exiting={EXERCISE_EXIT}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          directionalLockEnabled
        >
          <Animated.View
            layout={workoutLayoutTransition}
            style={{
              marginTop: 8,
              marginBottom: 22,
            }}
          >
            <Animated.View
              key={`${exerciseIdentity}-${stageKey}`}
              entering={animateStage ? stageEntering : undefined}
              exiting={STAGE_EXIT}
              layout={workoutLayoutTransition}
            >
              {bonusSelection ? (
                <>
                  <SetProgress
                    sets={[
                      ...exercise.sets,
                      { ...bonusSelection, completed: false, skipped: false },
                    ]}
                    currentSetIndex={exercise.sets.length}
                    enteringSetIndex={exercise.sets.length}
                    weightUnit={weightUnit}
                    loadType={exercise.loadType}
                    metric={exercise.metric}
                    accent={accent}
                    currentAccent={bonusSelection.type === 'dropset' ? BONUS_SET_META.dropset.color : accent}
                    currentLabel={bonusSelection.type === 'dropset' ? BONUS_SET_META.dropset.shortTitle : undefined}
                  />
                  <View style={{ marginTop: 20 }}>
                    <BonusSet
                      selection={bonusSelection}
                      setNumber={exercise.sets.length + 1}
                      accent={accent}
                      weightIncrement={weightIncrement}
                      weightUnit={weightUnit}
                      loadType={exercise.loadType}
                      metric={exercise.metric}
                      onTypeChange={(type) => setBonusSelection((current) => current && { ...current, type })}
                      onCancel={() => {
                        setStageDirection(-1);
                        setBonusSelection(null);
                      }}
                      onDone={(loggedSet) => {
                        const loggedIndex = exercise.sets.length;
                        setStageDirection(-1);
                        appendBonusSet(
                          exerciseIndex,
                          loggedSet.type,
                          loggedSet.reps,
                          loggedSet.weight,
                          loggedSet.durationS
                        );
                        // Back to the wrap-up with the new row sliding in; only its
                        // primary action moves on to the next exercise.
                        setRecentBonusSetIndex(loggedIndex);
                        setBonusSelection(null);
                        if (Platform.OS !== 'web') {
                          if (loggedRecord(loggedIndex)) {
                            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          } else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        }
                      }}
                    />
                  </View>
                </>
              ) : exerciseComplete && !inspectingSet ? (
                <ExerciseFinisher
                  sets={exercise.sets}
                  enteringSetIndex={recentBonusSetIndex}
                  nextExercise={nextExercise}
                  accent={accent}
                  addSetBase={addSetBase}
                  recordSetIndexes={recordSetIndexes}
                  recordHint={addSetBase ? getRecordHint(previousBest, exercise, addSetBase) : null}
                  comparison={getLastTimeComparison(sessions, exercise)}
                  restStartedAt={restStart?.identity === exerciseIdentity ? restStart.at : null}
                  weightUnit={weightUnit}
                  loadType={exercise.loadType}
                  metric={exercise.metric}
                  onAddAnother={!nextExercise ? () => {
                    setAddExerciseOnly(true);
                    setShowSwapSheet(true);
                  } : undefined}
                  canFinish={currentSession.exercises.some((item) => item.sets.some((set) => set.completed && !set.skipped))}
                  onAdvance={handleAdvanceExercise}
                  onEditSet={(completedSetIndex) => {
                    setRecentBonusSetIndex(null);
                    loggingSetRef.current = false;
                    setStageDirection(-1);
                    selectWorkoutSet(exerciseIndex, completedSetIndex);
                  }}
                  onAddSet={(selection) => {
                    setRecentBonusSetIndex(null);
                    setStageDirection(1);
                    setBonusSelection(selection);
                    if (Platform.OS !== 'web') void Haptics.selectionAsync();
                  }}
                />
              ) : (
                <>
                  <SetProgress
                    sets={exercise.sets}
                    currentSetIndex={activeSetIndex}
                    selectedSetIndex={setIndex}
                    onReturnToCurrent={inspectingSet ? clearSelectedSet : undefined}
                    weightUnit={weightUnit}
                    loadType={exercise.loadType}
                    metric={exercise.metric}
                    accent={accent}
                    onEditCompletedSet={(completedSetIndex) => {
                      loggingSetRef.current = false;
                      setStageDirection(-1);
                      selectWorkoutSet(exerciseIndex, completedSetIndex);
                    }}
                  />
                  <Animated.View
                    layout={workoutLayoutTransition}
                    style={{ marginTop: 18 }}
                  >
                    <ActiveSetCard
                      valueIdentity={`${exerciseIdentity}-${editTarget?.setId ?? setIndex}`}
                      setNumber={setIndex + 1}
                      primaryLabel={inspectingSet ? 'Done editing' : 'Log'}
                      secondaryLabel={inspectingSet ? 'Back' : 'Skip'}
                      reps={activeSet.reps}
                      weight={activeSet.weight}
                      loadType={exercise.loadType}
                      metric={exercise.metric}
                      durationS={activeSet.durationS}
                      timerTarget={exercise.metric === 'duration' && !inspectingSet ? editTarget : null}
                      weightIncrement={weightIncrement}
                      weightUnit={weightUnit}
                      onWeightUnitChange={(unit) => { if (editTarget) setExerciseEntryUnit(editTarget, unit); }}
                      weightDeltaLabel={weightDeltaLabel}
                      repsDeltaLabel={repsDeltaLabel}
                      accent={accent}
                      onRepsChange={handleRepsChange}
                      onWeightChange={handleWeightChange}
                      onRepsCommit={(reps) => { if (editTarget) applySetValueAction(editTarget, 'setReps', reps); }}
                      onDurationChange={handleDurationChange}
                      onDurationCommit={(seconds) => {
                        if (editTarget) applySetValueAction(editTarget, 'setDuration', clampDuration(seconds));
                      }}
                      onWeightCommit={(weight) => {
                        if (editTarget && useWorkoutStore.getState().currentSession?.exercises[exerciseIndex]?.entryUnit === weightUnit) {
                          applySetValueAction(editTarget, 'setWeight', weight);
                        }
                      }}
                      onLog={inspectingSet ? clearSelectedSet : handleToggleSet}
                      onSkip={handleSkipSet}
                    />
                  </Animated.View>
                </>
              )}
            </Animated.View>
          </Animated.View>

          {nextExercise && !exerciseComplete && !bonusSelection ? (
          <AnimatedTouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Up next, ${remainingExercises.length} ${
              remainingExercises.length === 1 ? 'exercise' : 'exercises'
            } remaining`}
            accessibilityHint="Shows the remaining exercise queue"
            activeOpacity={0.72}
            onPress={() => setShowUpNextSheet(true)}
            entering={animateStage ? workoutCardEntering : undefined}
            exiting={workoutCardExiting}
            layout={workoutLayoutTransition}
            style={{
              height: 82,
              marginTop: 2,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: redesignColors.border,
              backgroundColor: redesignColors.surface,
              paddingHorizontal: 18,
            }}
          >
            {/* "3 SETS" and the chevron centre on the card; the dot sits on the
                name's line, and the label is indented to start with the name. */}
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  allowFontScaling={false}
                  style={{
                    marginLeft: 25,
                    fontFamily: redesignFonts.monoBold,
                    fontSize: 10,
                    letterSpacing: 1.8,
                    color: redesignColors.ashDim,
                  }}
                >
                  UP NEXT
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                  <View
                    style={{
                      width: 11,
                      height: 11,
                      borderRadius: 6,
                      backgroundColor: accent,
                      marginRight: 14,
                    }}
                  />
                  <Text
                    numberOfLines={1}
                    allowFontScaling={false}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontFamily: redesignFonts.uiSemiBold,
                      fontSize: 17,
                      lineHeight: 21,
                      color: redesignColors.bone,
                    }}
                  >
                    {displayExerciseName(nextExercise.name)}
                  </Text>
                </View>
              </View>
              <Text
                numberOfLines={1}
                allowFontScaling={false}
                style={{
                  marginLeft: 10,
                  fontFamily: redesignFonts.monoBold,
                  fontSize: 10,
                  letterSpacing: 1.1,
                  color: redesignColors.ashDim,
                }}
              >
                {nextExercise.sets.length} SETS
              </Text>
              <ChevronRight color={redesignColors.ashDim} size={20} style={{ marginLeft: 7 }} />
            </View>
          </AnimatedTouchableOpacity>
          ) : null}
        </Animated.ScrollView>
        </WorkoutLaunchSection>
      </View>

      <ExerciseActionPill>
        <ExerciseHistory
          key={`history:${currentSession.id}:${exercise.name}`}
          workoutId={currentSession.id}
          exerciseName={exercise.name}
          weightUnit={weightUnit}
          accent={accent}
        />
        {exercise.exerciseId !== undefined ? (
          <ExerciseNotes
            key={`${currentSession.id}:${exercise.exerciseId}`}
            workoutId={currentSession.id}
            exerciseId={exercise.exerciseId}
            exerciseName={exercise.name}
          />
        ) : null}
      </ExerciseActionPill>

      <SwapExerciseSheet
        mode={addExerciseOnly || currentSession.origin === 'adhoc' ? 'add' : 'manage'}
        sessionId={currentSession.id}
        onAdded={() => {
          setShowFeedbackModal(false);
          router.setParams({ finishFromActivity: '' });
          const updatedSession = useWorkoutStore.getState().currentSession;
          if (addExerciseOnly && updatedSession?.id === currentSession.id) {
            navigateToExercise(updatedSession.exercises.length - 1, 'forward');
          }
        }}
        visible={showSwapSheet}
        dayLabel={dayLabel}
        accent={accent}
        currentExerciseIndex={exerciseIndex}
        currentExerciseName={exercise.name}
        completedSetCount={exercise.sets.filter((set) => set.completed).length}
        sessionExercises={currentSession.exercises}
        onNavigate={handleNavigateExercise}
        onReplace={handleSwapExercise}
        onClose={() => setShowSwapSheet(false)}
      />

      <UpNextSheet
        visible={showUpNextSheet}
        accent={accent}
        exercises={remainingExercises}
        onNavigate={handleNavigateFromUpNext}
        onClose={() => setShowUpNextSheet(false)}
      />

      <WorkoutIntensityPicker
        visible={showFeedbackModal || activityFeedbackVisible}
        workoutLabel={feedbackWorkout.label}
        accent={feedbackWorkout.color}
        levels={FEEDBACK_LEVELS}
        heading="Good work!"
        prompt="How did this workout feel?"
        subtext="Don’t forget to stretch it out."
        confirmLabel="Save workout"
        onChoose={(value) => {
          const intensity: IntensityLevel =
            value === 0 ? 'easy' : value === 0.5 ? 'medium' : 'hard';
          handleFeedbackSelect(intensity);
        }}
        onClose={() => { setShowFeedbackModal(false); router.setParams({ finishFromActivity: '' }); }}
      />
      {infoExercise ? (
        <ExerciseInfo
          info={infoExercise}
          visible={infoVisible}
          onClose={closeExerciseInfo}
          onHidden={finishClosingExerciseInfo}
        />
      ) : null}
    </View>
    </WorkoutMinimizeSurface>
    </WorkoutLaunchSurface>
  );
}
