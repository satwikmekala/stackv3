import { confirmationEnter, confirmationExit, workoutMotion, workoutTiming } from '@/constants/workoutMotion';
import { WorkoutTouchable } from '@/components/WorkoutTouchable';
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
import { Check, ChevronDown, ChevronRight, Plus, Repeat2, X } from 'lucide-react-native';
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
import * as Haptics from 'expo-haptics';
import { ActiveSetCard } from '@/components/ActiveSetCard';
import { ExerciseInfo } from '@/components/ExerciseInfo';
import {
  BONUS_SET_META,
  BonusSet,
  BonusSetAcknowledgement,
  type BonusSetSelection,
} from '@/components/BonusSet';
import { ExerciseFinisher } from '@/components/ExerciseFinisher';
import { SwapExerciseSheet } from '@/components/SwapExerciseSheet';
import { UpNextSheet, type RemainingExercise } from '@/components/UpNextSheet';
import { WorkoutDayLabel } from '@/components/WorkoutDayLabel';
import { WorkoutIntensityPicker } from '@/components/home/WorkoutIntensityPicker';
import { ARCHETYPE_COMPOSITIONS } from '@/constants/archetypes';
import { getExerciseInfo, type ExerciseInfoData } from '@/constants/exerciseInfo';
import { motionDuration, motionEasing } from '@/constants/motion';
import {
  workoutCardEntering,
  workoutCardExiting,
  workoutLayoutTransition,
  workoutRowEntering,
} from '@/constants/workoutLayoutTransitions';
import { redesignColors, redesignFonts, workoutLoggingColors } from '@/constants/theme';
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
import { getActiveSetIndex, getCurrentWorkoutExerciseIndex } from '@/utils/workoutResume';
import { getNextIncompleteExerciseIndex, isExerciseComplete } from '@/store/workoutSetActions';
import { getSetProgressionSuggestion } from '@/store/workoutProgression';
import '@/global.css';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const FEEDBACK_LEVELS = [
  { value: 0, label: 'TOO EASY' },
  { value: 0.5, label: 'JUST RIGHT' },
  { value: 1, label: 'TOO HARD' },
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
    shadowOpacity: focus.value * 0.55,
    shadowRadius: focus.value * 8,
    transform: [{ scaleY: 1 + focus.value * 0.08 }],
  }));

  return (
    <Animated.View
      style={[
        {
          // The layout wrapper owns the row's flex; flex here would collapse the height.
          width: '100%',
          height: 8,
          borderRadius: 4,
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
  onEdit,
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
  onEdit?: () => void;
}) {
  const glowOpacity = useSharedValue(0);
  const activeFill = useSharedValue(state === 'upcoming' ? 0 : 1);

  useEffect(() => {
    glowOpacity.value = withTiming(state === 'current' ? 1 : 0, workoutTiming(workoutMotion.confirm));
    activeFill.value = withTiming(state === 'upcoming' ? 0 : 1, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [activeFill, glowOpacity, state]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));
  const circleStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      activeFill.value,
      [0, 1],
      [redesignColors.surface, accent]
    ),
    borderColor: interpolateColor(
      activeFill.value,
      [0, 1],
      [redesignColors.border, accent]
    ),
    transform: [{ scale: 0.94 + activeFill.value * 0.06 }],
  }));

  const content = (
    <>
      <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
            style={[
              {
                position: 'absolute',
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: accent,
                shadowColor: accent,
                shadowOpacity: 0.9,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 0 },
                elevation: 12,
              },
              glowStyle,
            ]}
          />
        <Animated.View
          style={[
            {
              width: 30,
              height: 30,
              borderRadius: 15,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
            },
            circleStyle,
          ]}
        >
          {state === 'completed' ? (
            <Animated.View entering={CHECK_ENTER} exiting={confirmationExit}>
              <Check color={redesignColors.ink} size={17} strokeWidth={3.2} />
            </Animated.View>
          ) : null}
        </Animated.View>
      </View>
      <Text
        numberOfLines={1}
        allowFontScaling={false}
        style={{
          marginTop: 3,
          fontFamily: redesignFonts.monoBold,
          fontSize: 10,
          letterSpacing: state === 'current' ? 1.2 : 0,
          color: state === 'current' ? accent : redesignColors.ash,
        }}
      >
        {state === 'completed'
          ? metric === 'duration'
            ? loadType === 'bodyweight'
              ? formatDuration(durationS)
              : `${formatWeight(weight, weightUnit)}·${formatDuration(durationS)}`
            : loadType === 'bodyweight'
              ? `${reps} reps`
              : `${formatWeight(weight, weightUnit)}·${reps}`
          : state === 'current'
            ? currentLabel
            : '–'}
      </Text>
    </>
  );

  return state === 'completed' && onEdit ? (
    <WorkoutTouchable
      accessibilityRole="button"
      accessibilityLabel={`Edit completed set ${setNumber}`}
      accessibilityHint="Shows logged values without changing workout progress"
      activeOpacity={0.72}
      onPress={onEdit}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      {content}
    </WorkoutTouchable>
  ) : (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{content}</View>
  );
}

function SetProgress({
  sets,
  currentSetIndex,
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
    <Animated.View
      layout={workoutLayoutTransition}
      style={{
        flexDirection: 'row',
        alignItems: 'stretch',
        height: 96,
        borderRadius: 22,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: redesignColors.surface,
        borderWidth: 1,
        borderColor: redesignColors.border,
      }}
    >
      {sets.map((set, index) => {
        const state = set.completed
          ? 'completed'
          : index === currentSetIndex
            ? 'current'
            : 'upcoming';
        return (
          <Animated.View
            key={`${set.type ?? 'working'}-${index}`}
            layout={workoutLayoutTransition}
            entering={index === enteringSetIndex ? workoutRowEntering : undefined}
            style={{ flex: 1 }}
          >
            <SetPip
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
              onEdit={state === 'completed' ? () => onEditCompletedSet?.(index) : undefined}
            />
          </Animated.View>
        );
      })}
    </Animated.View>
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
  const [showUpNextSheet, setShowUpNextSheet] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const activityFeedbackVisible = Boolean(currentSession && currentSession.origin !== 'adhoc' && finishFromActivity === currentSession.id &&
    currentSession.exercises.every(isExerciseComplete));
  const [bonusSelection, setBonusSelection] = useState<BonusSetSelection | null>(null);
  const [loggedBonusSet, setLoggedBonusSet] = useState<BonusSetSelection | null>(null);
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
    setLoggedBonusSet(null);
    setShowFeedbackModal(false);
  }, [exerciseIndex]);

  useEffect(() => {
    hasRenderedRef.current = true;
  }, []);

  useEffect(() => {
    renderedExerciseIdentityRef.current = exerciseIdentity;
  }, [exerciseIdentity]);

  if (!currentSession || !profile) return null;
  const workoutType = currentSession.workoutTypes[0];
  if (currentSession.exercises.length === 0) return (
    <WorkoutLaunchSurface origin={launchOrigin}>
      <WorkoutMinimizeSurface ref={minimizeRef} expandFromCard={fromActivityCard === '1'} session={currentSession}
        onMinimize={() => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); }}>
        <View style={{ flex: 1, backgroundColor: redesignColors.ink, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20, paddingHorizontal: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <WorkoutDayLabel label="Workout" accent={redesignColors.ash} />
            <WorkoutTouchable accessibilityRole="button" accessibilityLabel="Minimize workout" onPress={() => minimizeRef.current?.minimize()} style={{ padding: 12 }}>
              <Text style={{ color: redesignColors.bone }}>Minimize</Text>
            </WorkoutTouchable>
            <WorkoutTouchable accessibilityRole="button" onPress={confirmDiscardWorkout} style={{ padding: 12 }}>
              <Text style={{ color: redesignColors.ash }}>Cancel</Text>
            </WorkoutTouchable>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
            <Text style={{ fontFamily: redesignFonts.display, fontSize: 36, color: redesignColors.bone }}>Empty workout</Text>
            <Text style={{ fontFamily: redesignFonts.ui, fontSize: 18, color: redesignColors.ash }}>Add your first exercise</Text>
            <WorkoutTouchable accessibilityRole="button" onPress={() => setShowSwapSheet(true)} style={{ padding: 20, borderRadius: 18, backgroundColor: redesignColors.raised }}>
              <Text style={{ fontFamily: redesignFonts.uiSemiBold, fontSize: 18, color: redesignColors.bone }}>Add Exercise</Text>
            </WorkoutTouchable>
          </View>
          <SwapExerciseSheet mode="add" sessionId={currentSession.id} visible={showSwapSheet} dayLabel="Workout" accent={redesignColors.ash}
            sessionExercises={currentSession.exercises} onNavigate={setExerciseIndex} onClose={() => setShowSwapSheet(false)} />
        </View>
      </WorkoutMinimizeSurface>
    </WorkoutLaunchSurface>
  );

  const legacyMeta = workoutMeta[workoutType];
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
  const accent = currentSession.origin === 'adhoc' ? redesignColors.ash : archetypeComposition?.color ?? workoutLoggingColors[workoutType];
  const exercise = currentSession.exercises[exerciseIndex];
  const weightUnit = exercise.entryUnit;
  const weightIncrement = getWeightIncrement(profile, weightUnit);
  const availableExerciseInfo = getExerciseInfo(exercise.name);
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
    const result = applyActiveSetAction(target, 'completeSet');
    if (result.status !== 'applied') {
      loggingSetRef.current = false;
      return;
    }
    setTimeout(() => { loggingSetRef.current = false; }, LOG_SUBMISSION_GUARD_MS);
    if (Platform.OS !== 'web') {
      if (result.completedExercise) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
  // Derived only: the set keeps last time's weight until the user accepts.
  const progressionSuggestion = inspectingSet
    ? null
    : getSetProgressionSuggestion(sessions, exercise, setIndex, profile);
  const suggestionCard = progressionSuggestion ? {
    label: `Last ${formatWeight(progressionSuggestion.baselineKg, weightUnit)} · Try ${formatWeight(progressionSuggestion.suggestedKg, weightUnit)}`,
    accessibilityLabel: `Last time ${formatWeight(progressionSuggestion.baselineKg, weightUnit)} ${weightUnit}. Use suggested ${formatWeight(progressionSuggestion.suggestedKg, weightUnit)} ${weightUnit}`,
    onAccept: () => {
      // Same validated absolute edit as typing the value; it becomes a user value.
      if (editTarget && !editTarget.completed &&
          useWorkoutStore.getState().currentSession?.exercises[exerciseIndex]?.entryUnit === weightUnit) {
        applySetValueAction(editTarget, 'setWeight', progressionSuggestion.suggestedKg);
      }
    },
  } : null;
  const stageKey = loggedBonusSet
    ? `logged-${loggedBonusSet.type}`
    : bonusSelection
      ? `bonus-${bonusSelection.type}`
      : inspectingSet
        ? `inspect-${editTarget!.setId}`
        : exerciseComplete
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
      onMinimize={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)');
      }}
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
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 20,
        }}
      >
        <WorkoutLaunchSection>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <WorkoutDayLabel
            accent={accent}
            label={dayLabel}
            numberOfLines={archetypeComposition ? 2 : 1}
          />

          <View style={{ flexShrink: 0, flexDirection: 'row', alignItems: 'center' }}>
            <WorkoutTouchable
              accessibilityRole="button"
              accessibilityLabel={currentSession.origin === 'adhoc' ? 'Add Exercise or navigate' : 'Change exercise'}
              onPress={() => setShowSwapSheet(true)}
              activeOpacity={0.7}
              style={{
                height: 42,
                marginLeft: 10,
                paddingHorizontal: 14,
                borderRadius: 21,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: redesignColors.border,
                backgroundColor: redesignColors.surface,
              }}
            >
              {currentSession.origin === 'adhoc' ? <Plus color={redesignColors.ash} size={18} strokeWidth={2.2} /> : <Repeat2 color={redesignColors.ash} size={18} strokeWidth={2.2} />}
              <Text
                allowFontScaling={false}
                style={{
                  marginLeft: 8,
                  fontFamily: redesignFonts.uiSemiBold,
                  fontSize: 15,
                  color: redesignColors.ash,
                }}
              >
                {currentSession.origin === 'adhoc' ? 'Add' : 'Change'}
              </Text>
            </WorkoutTouchable>

            <WorkoutTouchable
              accessibilityRole="button"
              accessibilityLabel="Minimize workout"
              accessibilityHint="Keep your workout active and return to the previous screen"
              onPress={() => {
                navigation.setOptions({ animation: 'none' });
                minimizeRef.current?.minimize();
              }}
              activeOpacity={0.7}
              style={{
                width: 42,
                height: 42,
                marginLeft: 10,
                borderRadius: 21,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: redesignColors.border,
                backgroundColor: redesignColors.surface,
              }}
            >
              <ChevronDown color={redesignColors.ash} size={20} strokeWidth={2.4} />
            </WorkoutTouchable>

            <WorkoutTouchable
              accessibilityRole="button"
              accessibilityLabel="Close workout"
              onPress={confirmDiscardWorkout}
              activeOpacity={0.7}
              style={{
                width: 42,
                height: 42,
                marginLeft: 10,
                borderRadius: 21,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: redesignColors.border,
                backgroundColor: redesignColors.surface,
              }}
            >
              <X color={redesignColors.ash} size={20} strokeWidth={2.4} />
            </WorkoutTouchable>
          </View>
        </View>
        </WorkoutLaunchSection>

        <WorkoutLaunchSection order={1}>
        <Animated.View
          key={`title-${exerciseIdentity}`}
          entering={animateExercise ? exerciseEntering : undefined}
          exiting={EXERCISE_EXIT}
          style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18 }}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
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
            {exercise.name}
          </Text>
          {exerciseComplete && !bonusSelection ? (
            <Animated.View
              entering={CHECK_ENTER}
              style={{
                width: 42,
                height: 42,
                marginLeft: 12,
                borderRadius: 21,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: accent,
                shadowColor: accent,
                shadowOpacity: 0.35,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 0 },
              }}
            >
              <Check color={redesignColors.ink} size={23} strokeWidth={3.2} />
            </Animated.View>
          ) : null}
        </Animated.View>

        <Animated.View
          layout={workoutLayoutTransition}
          style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}
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
        </WorkoutLaunchSection>

        <WorkoutLaunchSection order={2} fill>
        <Animated.View
          key={`body-${exerciseIdentity}`}
          entering={animateExercise ? exerciseEntering : undefined}
          exiting={EXERCISE_EXIT}
          style={{ flex: 1 }}
        >
          <Animated.View
            layout={workoutLayoutTransition}
            style={{
              marginTop: 24,
              marginBottom: 22,
            }}
          >
            <Animated.View
              key={`${exerciseIdentity}-${stageKey}`}
              entering={animateStage ? stageEntering : undefined}
              exiting={STAGE_EXIT}
              layout={workoutLayoutTransition}
            >
              {loggedBonusSet ? (
                <BonusSetAcknowledgement
                  set={loggedBonusSet}
                  weightUnit={weightUnit}
                  loadType={exercise.loadType}
                  metric={exercise.metric}
                  onAdvance={() => {
                    setStageDirection(1);
                    setLoggedBonusSet(null);
                    handleAdvanceExercise();
                  }}
                />
              ) : bonusSelection ? (
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
                    currentAccent={BONUS_SET_META[bonusSelection.type].color}
                    currentLabel={BONUS_SET_META[bonusSelection.type].shortTitle}
                  />
                  <View style={{ marginTop: 20 }}>
                    <BonusSet
                      key={bonusSelection.type}
                      selection={bonusSelection}
                      weightIncrement={weightIncrement}
                      weightUnit={weightUnit}
                      loadType={exercise.loadType}
                      metric={exercise.metric}
                      onCancel={() => {
                        setStageDirection(-1);
                        setBonusSelection(null);
                      }}
                      onDone={(loggedSet) => {
                        setStageDirection(1);
                        appendBonusSet(
                          exerciseIndex,
                          loggedSet.type,
                          loggedSet.reps,
                          loggedSet.weight,
                          loggedSet.durationS
                        );
                        setRecentBonusSetIndex(exercise.sets.length);
                        setBonusSelection(null);
                        setLoggedBonusSet(loggedSet);
                        if (Platform.OS !== 'web') {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        }
                      }}
                    />
                  </View>
                </>
              ) : exerciseComplete && !inspectingSet ? (
                <ExerciseFinisher
                  sets={exercise.sets}
                  enteringSetIndex={recentBonusSetIndex}
                  nextExerciseName={nextExercise?.name}
                  weightUnit={weightUnit}
                  loadType={exercise.loadType}
                  metric={exercise.metric}
                  onAddAnother={currentSession.origin === 'adhoc' && !nextExercise ? () => setShowSwapSheet(true) : undefined}
                  canFinish={currentSession.exercises.some((item) => item.sets.some((set) => set.completed && !set.skipped))}
                  onAdvance={handleAdvanceExercise}
                  onEditSet={(completedSetIndex) => {
                    setRecentBonusSetIndex(null);
                    loggingSetRef.current = false;
                    setStageDirection(-1);
                    selectWorkoutSet(exerciseIndex, completedSetIndex);
                  }}
                  onSelectBonus={(selection) => {
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
                    key={`active-card-${editTarget?.setId ?? setIndex}-${inspectingSet}`}
                    entering={animateStage ? FORWARD_ENTER : undefined}
                    exiting={STAGE_EXIT}
                    layout={workoutLayoutTransition}
                    style={{ marginTop: 24 }}
                  >
                    <ActiveSetCard
                      setNumber={setIndex + 1}
                      heading={inspectingSet ? `Set ${setIndex + 1} · logged` : undefined}
                      primaryLabel={inspectingSet ? 'Done editing' : 'Log it'}
                      secondaryLabel={inspectingSet ? 'Back' : 'Skip'}
                      reps={activeSet.reps}
                      weight={activeSet.weight}
                      loadType={exercise.loadType}
                      metric={exercise.metric}
                      durationS={activeSet.durationS}
                      weightIncrement={weightIncrement}
                      weightUnit={weightUnit}
                      onWeightUnitChange={(unit) => { if (editTarget) setExerciseEntryUnit(editTarget, unit); }}
                      onInfoPress={availableExerciseInfo ? () => {
                        if (infoOpeningRef.current) return;
                        infoOpeningRef.current = true;
                        setInfoExercise(availableExerciseInfo);
                        setInfoVisible(true);
                      } : undefined}
                      weightDeltaLabel={weightDeltaLabel}
                      suggestion={suggestionCard}
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

          {nextExercise && !exerciseComplete && !bonusSelection && !loggedBonusSet ? (
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
                    {nextExercise.name}
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
        </Animated.View>
        </WorkoutLaunchSection>
      </View>

      <SwapExerciseSheet
        mode={currentSession.origin === 'adhoc' ? 'add' : 'manage'}
        sessionId={currentSession.id}
        onAdded={() => { setShowFeedbackModal(false); router.setParams({ finishFromActivity: '' }); }}
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
        type={currentSession.origin === 'adhoc' ? undefined : workoutType}
        levels={FEEDBACK_LEVELS}
        prompt="How did it feel?"
        subtext="This helps us adjust your next workout to keep you progressing"
        footerText="SLIDE TO FINISH"
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
