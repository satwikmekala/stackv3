import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Platform,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Check, ChevronRight, Repeat2, X } from 'lucide-react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInLeft,
  FadeInRight,
  FadeOut,
  FadeOutDown,
  FadeOutLeft,
  interpolateColor,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ActiveSetCard } from '@/components/ActiveSetCard';
import {
  BONUS_SET_META,
  BonusSet,
  BonusSetAcknowledgement,
  type BonusSetSelection,
} from '@/components/BonusSet';
import { ExerciseFinisher } from '@/components/ExerciseFinisher';
import { RestTimer } from '@/components/RestTimer';
import { SwapExerciseSheet } from '@/components/SwapExerciseSheet';
import { WorkoutDayLabel } from '@/components/WorkoutDayLabel';
import { WorkoutIntensityPicker } from '@/components/home/WorkoutIntensityPicker';
import { ARCHETYPE_COMPOSITIONS } from '@/constants/archetypes';
import { redesignColors, redesignFonts, workoutLoggingColors } from '@/constants/theme';
import { workoutMeta } from '@/constants/workouts';
import {
  IntensityLevel,
  type Exercise,
  type ExerciseSet,
  useWorkoutStore,
} from '@/store/workoutStore';
import { DEFAULT_WEIGHT_INCREMENT, DEFAULT_WEIGHT_UNIT } from '@/store/workoutDatabase';
import { formatWeight, type WeightUnit } from '@/store/weightUnits';
import '@/global.css';

const FEEDBACK_LEVELS = [
  { value: 0, label: 'TOO EASY' },
  { value: 0.5, label: 'JUST RIGHT' },
  { value: 1, label: 'TOO HARD' },
] as const;

// Motion is deliberately short and directional: forward actions arrive from
// the right, cancellations return from the left, and replacements simply fade.
// Reanimated's reduced-motion mode collapses these automatically when requested
// by the device accessibility settings.
const FORWARD_ENTER = FadeInRight.duration(240)
  .easing(Easing.out(Easing.cubic))
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
const STAGE_EXIT = FadeOut.duration(120).reduceMotion(ReduceMotion.System);
const STAGE_LAYOUT = LinearTransition.duration(220)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const CHECK_ENTER = ZoomIn.springify()
  .damping(17)
  .stiffness(250)
  .reduceMotion(ReduceMotion.System);
const UP_NEXT_EXIT = FadeOutDown.duration(150)
  .easing(Easing.in(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
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
          flex: 1,
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
  weightUnit,
  accent,
  currentLabel = 'NOW',
  setNumber,
  onEdit,
}: {
  state: 'completed' | 'current' | 'upcoming';
  weight: number;
  reps: number;
  weightUnit: WeightUnit;
  accent: string;
  currentLabel?: string;
  setNumber: number;
  onEdit?: () => void;
}) {
  const glowOpacity = useSharedValue(0);
  const activeFill = useSharedValue(state === 'upcoming' ? 0 : 1);

  useEffect(() => {
    glowOpacity.value = withTiming(state === 'current' ? 1 : 0, {
      duration: 360,
      easing: Easing.out(Easing.ease),
      reduceMotion: ReduceMotion.System,
    });
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
        {state === 'current' ? (
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: accent,
                shadowColor: accent,
                shadowOpacity: 0.9,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 0 },
                elevation: 10,
              },
              glowStyle,
            ]}
          />
        ) : null}
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
            <Animated.View entering={CHECK_ENTER}>
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
        {state === 'completed' ? `${formatWeight(weight, weightUnit)}·${reps}` : state === 'current' ? currentLabel : '–'}
      </Text>
    </>
  );

  return state === 'completed' && onEdit ? (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Edit completed set ${setNumber}`}
      accessibilityHint="Reopens this set for editing"
      activeOpacity={0.72}
      onPress={onEdit}
      style={{ flex: 1, alignItems: 'center' }}
    >
      {content}
    </TouchableOpacity>
  ) : (
    <View style={{ flex: 1, alignItems: 'center' }}>{content}</View>
  );
}

function SetProgress({
  sets,
  currentSetIndex,
  weightUnit,
  accent,
  currentAccent = accent,
  currentLabel,
  onEditCompletedSet,
}: {
  sets: ExerciseSet[];
  currentSetIndex: number;
  weightUnit: WeightUnit;
  accent: string;
  currentAccent?: string;
  currentLabel?: string;
  onEditCompletedSet?: (setIndex: number) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
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
          <SetPip
            key={`${set.type ?? 'working'}-${index}`}
            state={state}
            weight={set.weight}
            reps={set.reps}
            weightUnit={weightUnit}
            accent={index === currentSetIndex ? currentAccent : accent}
            currentLabel={currentLabel}
            setNumber={index + 1}
            onEdit={state === 'completed' ? () => onEditCompletedSet?.(index) : undefined}
          />
        );
      })}
    </View>
  );
}

const getInitialExerciseIndex = (
  exercises: NonNullable<ReturnType<typeof useWorkoutStore.getState>['currentSession']>['exercises']
) => {
  const firstIncomplete = exercises.findIndex((exercise) =>
    exercise.sets.some((set) => !set.completed)
  );
  return firstIncomplete === -1 ? Math.max(0, exercises.length - 1) : firstIncomplete;
};

const isExerciseComplete = (exercise: Exercise) =>
  exercise.sets.every((set) => set.completed);

const getNextIncompleteExerciseIndex = (
  exercises: Exercise[],
  currentIndex: number
) => {
  for (let offset = 1; offset < exercises.length; offset += 1) {
    const candidateIndex = (currentIndex + offset) % exercises.length;
    if (!isExerciseComplete(exercises[candidateIndex])) return candidateIndex;
  }

  return -1;
};

export default function Workout() {
  const router = useRouter();
  const currentSession = useWorkoutStore((state) => state.currentSession);
  const weightIncrement = useWorkoutStore(
    (state) => state.profile?.weightIncrement ?? DEFAULT_WEIGHT_INCREMENT
  );
  const weightUnit = useWorkoutStore(
    (state) => state.profile?.weightUnit ?? DEFAULT_WEIGHT_UNIT
  );
  const updateExerciseSet = useWorkoutStore((state) => state.updateExerciseSet);
  const appendBonusSet = useWorkoutStore((state) => state.appendBonusSet);
  const toggleSetCompleted = useWorkoutStore((state) => state.toggleSetCompleted);
  const toggleSetSkipped = useWorkoutStore((state) => state.toggleSetSkipped);
  const swapCurrentSessionExercise = useWorkoutStore(
    (state) => state.swapCurrentSessionExercise
  );
  const completeWorkout = useWorkoutStore((state) => state.completeWorkout);
  const discardWorkout = useWorkoutStore((state) => state.discardWorkout);

  const [exerciseIndex, setExerciseIndex] = useState(() =>
    currentSession ? getInitialExerciseIndex(currentSession.exercises) : 0
  );
  const [showSwapSheet, setShowSwapSheet] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [bonusSelection, setBonusSelection] = useState<BonusSetSelection | null>(null);
  const [loggedBonusSet, setLoggedBonusSet] = useState<BonusSetSelection | null>(null);
  const [stageDirection, setStageDirection] = useState<1 | -1>(1);
  const [exerciseMotion, setExerciseMotion] = useState<'forward' | 'backward' | 'replace'>(
    'forward'
  );
  const [restContext, setRestContext] = useState<{
    id: number;
    exerciseIndex: number;
    setIndex: number;
  } | null>(null);
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
      confirmDiscardWorkout();
      return true;
    });

    return () => subscription.remove();
  }, [confirmDiscardWorkout]);

  useEffect(() => {
    setBonusSelection(null);
    setLoggedBonusSet(null);
  }, [exerciseIndex]);

  useEffect(() => {
    hasRenderedRef.current = true;
  }, []);

  useEffect(() => {
    renderedExerciseIdentityRef.current = exerciseIdentity;
  }, [exerciseIdentity]);

  if (!currentSession) return null;
  const workoutType = currentSession.workoutTypes[0];
  if (!workoutType) return null;

  const legacyMeta = workoutMeta[workoutType];
  const primaryArchetype = currentSession.archetype;
  const secondaryArchetype = currentSession.secondaryArchetype;
  const archetypeComposition = primaryArchetype
    ? ARCHETYPE_COMPOSITIONS[primaryArchetype]
    : null;
  const dayLabel = archetypeComposition
    ? secondaryArchetype
      ? `${archetypeComposition.shortLabel} + ${ARCHETYPE_COMPOSITIONS[secondaryArchetype].shortLabel}`
      : archetypeComposition.shortLabel
    : legacyMeta.label;
  const accent = archetypeComposition?.color ?? workoutLoggingColors[workoutType];
  const exercise = currentSession.exercises[exerciseIndex];
  const firstIncompleteSetIndex = exercise.sets.findIndex((set) => !set.completed);
  const setIndex =
    firstIncompleteSetIndex === -1 ? Math.max(0, exercise.sets.length - 1) : firstIncompleteSetIndex;
  const activeSet = exercise.sets[setIndex];
  const nextIncompleteExerciseIndex = getNextIncompleteExerciseIndex(
    currentSession.exercises,
    exerciseIndex
  );
  const nextExercise =
    nextIncompleteExerciseIndex === -1
      ? undefined
      : currentSession.exercises[nextIncompleteExerciseIndex];
  const exerciseComplete = isExerciseComplete(exercise);

  const handleRepsChange = (delta: number) => {
    const newReps = Math.max(1, activeSet.reps + delta);
    updateExerciseSet(exerciseIndex, setIndex, newReps, activeSet.weight);
  };

  const handleWeightChange = (delta: number) => {
    const newWeight = Math.max(0, activeSet.weight + delta);
    updateExerciseSet(exerciseIndex, setIndex, activeSet.reps, newWeight);
  };

  const handleToggleSet = () => {
    const wasCompleted = activeSet.completed;
    const completesExercise = exercise.sets.every(
      (set, index) => index === setIndex || set.completed
    );
    setStageDirection(1);
    toggleSetCompleted(exerciseIndex, setIndex);

    if (!wasCompleted && !completesExercise) {
      if (Platform.OS !== 'web') void Haptics.selectionAsync();
      setRestContext((previous) => ({
        id: (previous?.id ?? 0) + 1,
        exerciseIndex,
        setIndex,
      }));
    } else if (!wasCompleted && completesExercise) {
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } else if (
      restContext?.exerciseIndex === exerciseIndex &&
      restContext.setIndex === setIndex
    ) {
      setRestContext(null);
    }
  };

  const handleSkipSet = () => {
    const wasCompleted = activeSet.completed;
    const completesExercise = exercise.sets.every(
      (set, index) => index === setIndex || set.completed
    );
    setStageDirection(1);
    toggleSetSkipped(exerciseIndex, setIndex);

    if (!wasCompleted && !completesExercise) {
      if (Platform.OS !== 'web') void Haptics.selectionAsync();
      setRestContext((previous) => ({
        id: (previous?.id ?? 0) + 1,
        exerciseIndex,
        setIndex,
      }));
    } else if (
      restContext?.exerciseIndex === exerciseIndex &&
      restContext.setIndex === setIndex
    ) {
      setRestContext(null);
    }
  };

  const dismissRest = () => {
    setRestContext(null);
  };

  const navigateToExercise = (
    targetIndex: number,
    direction: 'forward' | 'backward' = targetIndex > exerciseIndex ? 'forward' : 'backward'
  ) => {
    if (targetIndex === exerciseIndex) return;
    setExerciseMotion(direction);
    setStageDirection(direction === 'forward' ? 1 : -1);
    setExerciseIndex(targetIndex);
    setRestContext(null);
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
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
  };

  const handleSwapExercise = (name: string) => {
    setExerciseMotion('replace');
    swapCurrentSessionExercise(exerciseIndex, name);
    setRestContext(null);
    setShowSwapSheet(false);
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
  };

  const handleFeedbackSelect = (intensity: IntensityLevel) => {
    exitingRef.current = true;
    completeWorkout(intensity);
    setShowFeedbackModal(false);
    router.replace('/(tabs)');
  };

  const previousWeight = setIndex > 0 ? exercise.sets[setIndex - 1].weight : null;
  const targetWeight = activeSet.targetWeight ?? activeSet.weight;
  const weightDeltaLabel = (() => {
    if (previousWeight === null) return null;
    if (previousWeight === 0) return activeSet.weight === 0 ? '+0%' : null;
    const percentage = Math.round(((activeSet.weight - previousWeight) / previousWeight) * 100);
    return `${percentage >= 0 ? '+' : ''}${percentage}%`;
  })();
  const stageKey = loggedBonusSet
    ? `logged-${loggedBonusSet.type}`
    : bonusSelection
      ? `bonus-${bonusSelection.type}`
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
    <SafeAreaView style={{ flex: 1, backgroundColor: redesignColors.ink }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 20,
        }}
      >
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
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Change exercise"
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
              <Repeat2 color={redesignColors.ash} size={18} strokeWidth={2.2} />
              <Text
                allowFontScaling={false}
                style={{
                  marginLeft: 8,
                  fontFamily: redesignFonts.uiSemiBold,
                  fontSize: 15,
                  color: redesignColors.ash,
                }}
              >
                Change
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
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
            </TouchableOpacity>
          </View>
        </View>

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

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
          {currentSession.exercises.map((item, index) => (
            <ExerciseProgressSegment
              key={`${item.name}-${index}`}
              state={
                index === exerciseIndex
                  ? 'current'
                  : isExerciseComplete(item)
                    ? 'completed'
                    : 'upcoming'
              }
              accent={accent}
            />
          ))}
        </View>

        <Animated.View
          key={`body-${exerciseIdentity}`}
          entering={animateExercise ? exerciseEntering : undefined}
          exiting={EXERCISE_EXIT}
          style={{ flex: 1 }}
        >
          <Animated.View
            style={{
              flex: 1,
              justifyContent: exerciseComplete ? 'flex-start' : 'center',
              paddingTop: exerciseComplete ? 36 : 18,
              paddingBottom: 18,
            }}
          >
            <Animated.View
              key={`${exerciseIdentity}-${stageKey}`}
              entering={animateStage ? stageEntering : undefined}
              exiting={STAGE_EXIT}
              layout={STAGE_LAYOUT}
            >
              {loggedBonusSet ? (
                <BonusSetAcknowledgement
                  set={loggedBonusSet}
                  weightUnit={weightUnit}
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
                    weightUnit={weightUnit}
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
                          loggedSet.weight
                        );
                        setBonusSelection(null);
                        setLoggedBonusSet(loggedSet);
                        if (Platform.OS !== 'web') {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        }
                      }}
                    />
                  </View>
                </>
              ) : exerciseComplete ? (
                <ExerciseFinisher
                  sets={exercise.sets}
                  nextExerciseName={nextExercise?.name}
                  weightUnit={weightUnit}
                  onAdvance={handleAdvanceExercise}
                  onEditSet={(completedSetIndex) => {
                    setStageDirection(-1);
                    toggleSetCompleted(exerciseIndex, completedSetIndex);
                  }}
                  onSelectBonus={(selection) => {
                    setStageDirection(1);
                    setBonusSelection(selection);
                    if (Platform.OS !== 'web') void Haptics.selectionAsync();
                  }}
                />
              ) : (
                <>
                  <SetProgress
                    sets={exercise.sets}
                    currentSetIndex={setIndex}
                    weightUnit={weightUnit}
                    accent={accent}
                    onEditCompletedSet={(completedSetIndex) => {
                      setStageDirection(-1);
                      toggleSetCompleted(exerciseIndex, completedSetIndex);
                    }}
                  />
                  <Animated.View
                    key={`active-card-${setIndex}`}
                    entering={animateStage ? FORWARD_ENTER : undefined}
                    exiting={STAGE_EXIT}
                    layout={STAGE_LAYOUT}
                    style={{ marginTop: 20 }}
                  >
                    <ActiveSetCard
                      setNumber={setIndex + 1}
                      reps={activeSet.reps}
                      weight={activeSet.weight}
                      weightIncrement={weightIncrement}
                      weightUnit={weightUnit}
                      weightDeltaLabel={weightDeltaLabel}
                      accent={accent}
                      onRepsChange={handleRepsChange}
                      onWeightChange={handleWeightChange}
                      onLog={handleToggleSet}
                      onSkip={handleSkipSet}
                    />
                  </Animated.View>
                </>
              )}
            </Animated.View>
          </Animated.View>

          {nextExercise && !exerciseComplete && !bonusSelection && !loggedBonusSet ? (
          <Animated.View
            exiting={UP_NEXT_EXIT}
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
            <View
              style={{ flex: 1, justifyContent: 'center' }}
            >
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
            </View>
          </Animated.View>
          ) : null}
        </Animated.View>
      </View>

      {restContext ? (
        <RestTimer
          key={restContext.id}
          accent={accent}
          onFinish={dismissRest}
          onDismiss={dismissRest}
        />
      ) : null}

      <SwapExerciseSheet
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

      <WorkoutIntensityPicker
        visible={showFeedbackModal}
        type={workoutType}
        levels={FEEDBACK_LEVELS}
        prompt="How did it feel?"
        subtext="This helps us adjust your next workout to keep you progressing"
        footerText="SLIDE TO FINISH"
        onChoose={(value) => {
          const intensity: IntensityLevel =
            value === 0 ? 'easy' : value === 0.5 ? 'medium' : 'hard';
          handleFeedbackSelect(intensity);
        }}
        onClose={() => setShowFeedbackModal(false)}
      />
    </SafeAreaView>
  );
}
