import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ArrowLeftRight } from 'lucide-react-native';
import Animated, {
  FadeInDown,
  ReduceMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScheduleRow } from '@/components/home/ScheduleRow';
import { WorkoutHeroCard } from '@/components/home/WorkoutHeroCard';
import { YourSplitCard } from '@/components/home/YourSplitCard';
import { WorkoutIntensityPicker } from '@/components/home/WorkoutIntensityPicker';
import {
  WorkoutPicker,
  type CustomWorkoutOption,
} from '@/components/home/WorkoutPicker';
import { ARCHETYPE_COMPOSITIONS, type Archetype } from '@/constants/archetypes';
import { motionDuration, motionEasing } from '@/constants/motion';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { getWeeklyQueueState } from '@/store/weeklyQueueEngine';
import {
  getNextArchetypeVariant,
  readArchetypeTemplateSync,
} from '@/store/workoutDatabase';
import {
  MUSCLE_GROUP_COLORS,
  getMuscleGroupForExercise,
  getWorkoutLetter,
} from '@/store/customSplitDraft';
import type { CustomSplitWorkout } from '@/store/customSplits';
import { resolveNextCustomWorkoutIndex } from '@/store/customSplitRotation';
import { toLocalCalendarDate, useWorkoutStore } from '@/store/workoutStore';
import '@/global.css';

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MONTH_LABELS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

const FULL_DAY_LABELS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const SCHEDULE_ENTER_START = 270;
const SCHEDULE_ENTER_STAGGER = 60;
const EMPTY_CUSTOM_WORKOUTS: CustomSplitWorkout[] = [];

function buildHomeEnter(delay: number) {
  return FadeInDown.delay(delay)
    .duration(motionDuration.entrance)
    .easing(motionEasing.decelerate)
    .withInitialValues({
      opacity: 0,
      transform: [{ translateY: 8 }],
    })
    .reduceMotion(ReduceMotion.System);
}

const HEADER_ENTER = buildHomeEnter(0);
const HERO_ENTER = buildHomeEnter(80);
const CHANGE_BUTTON_ENTER = buildHomeEnter(150);
const QUOTE_ENTER = buildHomeEnter(210);
const SPLIT_CARD_ENTER = buildHomeEnter(240);
const SCHEDULE_ROW_ENTERS = DAY_LABELS.map((_, index) =>
  buildHomeEnter(SCHEDULE_ENTER_START + index * SCHEDULE_ENTER_STAGGER)
);

/** Eyebrow for the hero card: which day the queued workout actually belongs to. */
function scheduleEyebrow(nextUpDate: string | null) {
  if (!nextUpDate) return 'NEXT UP';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (nextUpDate === toLocalCalendarDate(today)) return 'TODAY';

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (nextUpDate === toLocalCalendarDate(tomorrow)) return 'TOMORROW';

  const [year, month, day] = nextUpDate.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  return FULL_DAY_LABELS[(target.getDay() + 6) % 7];
}

/** Saved workouts carry their resolved name; the letter is the last resort. */
function customWorkoutTitle(workout: CustomSplitWorkout, index: number) {
  return workout.name.trim() || `Workout ${getWorkoutLetter(index)}`;
}

function customWorkoutAccent(workout: CustomSplitWorkout) {
  const exercise = workout.exercises[0];
  return exercise
    ? MUSCLE_GROUP_COLORS[getMuscleGroupForExercise(exercise)]
    : redesignColors.ash;
}

function plural(count: number, noun: string) {
  return `${noun}${count === 1 ? '' : 's'}`;
}

function todayLabel() {
  const today = new Date();
  const day = DAY_LABELS[(today.getDay() + 6) % 7];
  return `${day} · ${MONTH_LABELS[today.getMonth()]} ${today.getDate()}`;
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useWorkoutStore((state) => state.profile);
  useWorkoutStore((state) => state.sessions);
  const currentSession = useWorkoutStore((state) => state.currentSession);
  const getWeekSchedule = useWorkoutStore((state) => state.getWeekSchedule);
  const startWorkoutFromArchetype = useWorkoutStore(
    (state) => state.startWorkoutFromArchetype
  );
  const logArchetypeCompletedRetroactively = useWorkoutStore(
    (state) => state.logArchetypeCompletedRetroactively
  );
  const currentCustomSplit = useWorkoutStore((state) => state.currentCustomSplit);
  const customSplits = useWorkoutStore((state) => state.customSplits);
  const loadCustomSplit = useWorkoutStore((state) => state.loadCustomSplit);
  const setActiveSplit = useWorkoutStore((state) => state.setActiveSplit);
  const startWorkoutFromCustomWorkout = useWorkoutStore(
    (state) => state.startWorkoutFromCustomWorkout
  );
  const getLastCompletedCustomWorkoutId = useWorkoutStore(
    (state) => state.getLastCompletedCustomWorkoutId
  );

  // profile.activeSplitId is the single source of truth for which program Home
  // presents: null means Stack's automatic program, anything else means the
  // saved Custom Split with that ID.
  const activeSplitId = profile?.activeSplitId ?? null;

  // The selectors above make queue state refresh whenever profile or completed
  // sessions change; the engine itself remains the single source of truth.
  const queueState = getWeeklyQueueState();
  const nextUp = queueState.nextUp;
  const schedule = getWeekSchedule();
  const heroEyebrow = scheduleEyebrow(queueState.nextUpDate);
  const exerciseCount = nextUp.reduce(
    (count, archetype) =>
      count +
      readArchetypeTemplateSync(archetype, getNextArchetypeVariant(archetype)).length,
    0
  );
  const intensityPickerType = nextUp[0]
    ? ARCHETYPE_COMPOSITIONS[nextUp[0]].workoutTypes[0]
    : 'chest';
  const [intensityPickerVisible, setIntensityPickerVisible] = useState(false);
  const [pendingArchetypes, setPendingArchetypes] = useState<Archetype[]>([]);
  const [workoutPickerVisible, setWorkoutPickerVisible] = useState(false);
  const [selectedCustomWorkoutId, setSelectedCustomWorkoutId] = useState<number | null>(
    null
  );
  const [pendingCustomWorkoutId, setPendingCustomWorkoutId] = useState<number | null>(
    null
  );
  const [activeSplitMissing, setActiveSplitMissing] = useState(false);
  const [retroactiveDate, setRetroactiveDate] = useState<string | null>(null);
  const [retroactiveConfirmation, setRetroactiveConfirmation] = useState<string | null>(
    null
  );
  const isLoggingRetroactiveRef = useRef(false);
  // Unlike Stack selection, a Custom selection changes the hero's identity.
  // Keep that update out of the picker's UI-runtime exit animation and commit
  // it at the same lifecycle boundary that already drives Stack's follow-up.
  const selectedCustomWorkoutAfterPickerExitRef = useRef<number | null>(null);
  const hasAnimatedHomeRef = useRef(false);

  const shouldAnimateHomeEntrance = Boolean(profile) && !hasAnimatedHomeRef.current;

  useEffect(() => {
    if (profile) {
      hasAnimatedHomeRef.current = true;
    }
  }, [profile]);

  useEffect(() => {
    if (!retroactiveConfirmation) return;
    const timeout = setTimeout(() => setRetroactiveConfirmation(null), 2400);
    return () => clearTimeout(timeout);
  }, [retroactiveConfirmation]);

  // Load the active split's persistent detail whenever Home is focused or the
  // active program changes, so activating a split in Your Splits shows up here
  // without an app restart.
  useFocusEffect(
    useCallback(() => {
      if (activeSplitId === null) {
        setActiveSplitMissing(false);
        return;
      }
      let cancelled = false;
      void (async () => {
        const loaded = await loadCustomSplit(activeSplitId);
        if (cancelled) return;
        // undefined means the read itself failed and was already surfaced;
        // null means the split genuinely no longer exists.
        if (loaded === null) {
          console.warn(
            `[home] active split ${activeSplitId} could not be loaded; falling back to Stack`
          );
          setActiveSplitMissing(true);
          setActiveSplit(null);
        } else if (loaded) {
          setActiveSplitMissing(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [activeSplitId, loadCustomSplit, setActiveSplit])
  );

  const customSplit =
    activeSplitId !== null && currentCustomSplit?.id === activeSplitId
      ? currentCustomSplit
      : null;
  const activeSplitSummary = activeSplitId === null
    ? null
    : customSplits.find((split) => split.id === activeSplitId) ?? null;
  const isCustomMode = activeSplitId !== null && !activeSplitMissing;
  const customWorkouts = customSplit?.workouts ?? EMPTY_CUSTOM_WORKOUTS;
  // Durable position: derived from this split's own completed session history
  // every render, so it survives relaunch, split switching and manual detours
  // without a cursor of its own. The `sessions` subscription above is what
  // makes it re-resolve as soon as a workout is completed.
  const durableNextCustomIndex =
    activeSplitId !== null && customWorkouts.length > 0
      ? resolveNextCustomWorkoutIndex(
          customWorkouts,
          getLastCompletedCustomWorkoutId(activeSplitId)
        )
      : 0;
  // A manual Change Workout pick only overrides what Home previews; a stale or
  // absent pick falls back to the durable position rather than to workout A.
  const manualCustomIndex = customWorkouts.findIndex(
    (workout) => workout.id === selectedCustomWorkoutId
  );
  // An unfinished session is execution state and outranks both: the hero has to
  // name the workout that tapping it will actually resume.
  const activeCustomIndex =
    activeSplitId !== null && currentSession?.customSplitId === activeSplitId
      ? customWorkouts.findIndex(
          (workout) => workout.id === currentSession.customSplitWorkoutId
        )
      : -1;
  const selectedCustomIndex =
    activeCustomIndex >= 0
      ? activeCustomIndex
      : manualCustomIndex >= 0
        ? manualCustomIndex
        : durableNextCustomIndex;
  const selectedCustomWorkout: CustomSplitWorkout | undefined =
    customWorkouts[selectedCustomIndex];
  const customWorkoutReady = Boolean(
    selectedCustomWorkout && selectedCustomWorkout.exercises.length > 0
  );
  const customSplitBroken = Boolean(
    isCustomMode &&
      customSplit &&
      (customWorkouts.length === 0 || !customWorkoutReady)
  );
  const customOptions = useMemo<CustomWorkoutOption[]>(
    () =>
      customWorkouts.map((workout, index) => ({
        id: workout.id,
        letter: getWorkoutLetter(index),
        name: customWorkoutTitle(workout, index),
        color: customWorkoutAccent(workout),
        exerciseCount: workout.exercises.length,
      })),
    [customWorkouts]
  );

  // Each split owns its own rotation, so a pick made under one split must not
  // leak into another.
  useEffect(() => {
    setSelectedCustomWorkoutId(null);
  }, [activeSplitId]);

  useEffect(() => {
    if (customSplitBroken) {
      console.warn(
        `[home] active split ${activeSplitId} has a workout with no resolvable exercises`
      );
    }
  }, [activeSplitId, customSplitBroken]);

  const tapFeedback = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleStartWorkout = () => {
    tapFeedback();
    // An already-created session resumes through the existing mechanism,
    // whatever program produced it.
    if (currentSession) {
      router.push('/workout');
      return;
    }
    if (isCustomMode) {
      if (!selectedCustomWorkout || !customWorkoutReady) return;
      setPendingCustomWorkoutId(selectedCustomWorkout.id);
      setIntensityPickerVisible(true);
      return;
    }
    if (nextUp.length > 0) {
      setPendingArchetypes(nextUp);
      setIntensityPickerVisible(true);
    }
  };

  const handleIntensityChosen = () => {
    if (currentSession) {
      setIntensityPickerVisible(false);
      router.push('/workout');
      return;
    }
    if (pendingCustomWorkoutId !== null) {
      if (activeSplitId === null) return;
      setIntensityPickerVisible(false);
      startWorkoutFromCustomWorkout(activeSplitId, pendingCustomWorkoutId);
      setPendingCustomWorkoutId(null);
      // Hand Home back to durable resolution: completing this session advances
      // the rotation, and abandoning it leaves the durable position untouched.
      setSelectedCustomWorkoutId(null);
      router.push('/workout');
      return;
    }
    if (pendingArchetypes.length === 0) return;
    setIntensityPickerVisible(false);
    startWorkoutFromArchetype(pendingArchetypes);
    setPendingArchetypes([]);
    router.push('/workout');
  };

  // Selection only changes what Home previews: the saved split, its ordering
  // and the archetype queue are all left untouched.
  const handleSelectCustomWorkout = useCallback((workoutId: number) => {
    selectedCustomWorkoutAfterPickerExitRef.current = workoutId;
    setWorkoutPickerVisible(false);
  }, []);

  const handleSelectWorkout = (archetype: Archetype) => {
    setWorkoutPickerVisible(false);
    setPendingArchetypes([archetype]);
  };

  const handleOpenWorkoutPicker = () => {
    tapFeedback();
    setWorkoutPickerVisible(true);
  };

  const handleWorkoutPickerExited = useCallback(() => {
    // Custom mode only re-previews the chosen workout; starting stays an
    // explicit tap on the hero card.
    if (isCustomMode) {
      const workoutId = selectedCustomWorkoutAfterPickerExitRef.current;
      selectedCustomWorkoutAfterPickerExitRef.current = null;
      if (workoutId !== null) {
        setSelectedCustomWorkoutId(workoutId);
      }
      return;
    }
    if (currentSession) {
      router.push('/workout');
      return;
    }
    if (pendingArchetypes.length > 0) {
      setIntensityPickerVisible(true);
    }
  }, [currentSession, isCustomMode, pendingArchetypes.length, router]);

  const handleRetroactiveWorkout = (archetype: Archetype) => {
    if (isLoggingRetroactiveRef.current) return;
    isLoggingRetroactiveRef.current = true;
    if (!retroactiveDate) return;
    logArchetypeCompletedRetroactively([archetype], retroactiveDate);
    setRetroactiveDate(null);
    setRetroactiveConfirmation(
      `${ARCHETYPE_COMPOSITIONS[archetype].shortLabel} logged as complete`
    );
  };

  if (!profile) {
    return null;
  }

  // Summary and detail hydrate independently. The summary is enough to keep a
  // real program identity on screen until its workout rows arrive.
  const customSplitName =
    customSplit?.name ?? activeSplitSummary?.name ?? currentCustomSplit?.name ?? 'Your split';
  // The card names the program Home is actually running: an unloadable active
  // split has already fallen back to Stack above, and a split whose detail is
  // still in flight shows its family without inventing a count.
  const splitCardName = isCustomMode ? customSplitName : "Stack's split";
  const splitCardMeta = isCustomMode
    ? customSplit
      ? `Custom · ${customWorkouts.length} ${plural(customWorkouts.length, 'workout')}`
      : activeSplitSummary
        ? `Custom · ${activeSplitSummary.workoutCount} ${plural(activeSplitSummary.workoutCount, 'workout')}`
        : 'Custom'
    : `Auto-generated · ${profile.weeklyGoal} ${plural(profile.weeklyGoal, 'workout')}`;
  const splitCardLabel = isCustomMode
    ? `Open Your Splits. Active split: ${splitCardName}.`
    : "Open Your Splits. Stack's split is active.";
  const customHeroEyebrow = queueState.completedToday ? 'NEXT UP' : 'TODAY';
  const customIntensityType =
    selectedCustomWorkout?.exercises[0]?.workoutType ?? 'chest';
  const firstName = profile.name?.trim().split(/\s+/)[0] || 'there';
  const visibleSchedule = schedule
    .map((day, index) => ({ day, dayLabel: DAY_LABELS[index] }))
    .filter(({ day }) => day.status !== 'today' || Boolean(day.completedWorkout));

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
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 128 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={shouldAnimateHomeEntrance ? HEADER_ENTER : undefined}
          style={styles.header}
        >
          <View style={styles.greetingColumn}>
            <Text style={styles.date}>{todayLabel()}</Text>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              numberOfLines={1}
              style={styles.greeting}
            >
              Hey, {firstName}
            </Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={shouldAnimateHomeEntrance ? HERO_ENTER : undefined}
          style={styles.heroWrap}
        >
          {isCustomMode ? (
            <WorkoutHeroCard
              exerciseCount={selectedCustomWorkout?.exercises.length ?? 0}
              whenLabel={customHeroEyebrow}
              title={
                customSplitBroken
                  ? 'Nothing to train yet'
                  : selectedCustomWorkout
                    ? customWorkoutTitle(selectedCustomWorkout, selectedCustomIndex)
                    : customSplitName
              }
              groupLabel={
                customSplitBroken
                  ? 'Add exercises'
                  : selectedCustomWorkout
                    ? `Workout ${getWorkoutLetter(selectedCustomIndex)}`
                    : customSplitName
              }
              accentColor={
                selectedCustomWorkout && !customSplitBroken
                  ? customWorkoutAccent(selectedCustomWorkout)
                  : redesignColors.ash
              }
              onPress={
                customSplitBroken
                  ? () => router.push('/your-splits')
                  : customWorkoutReady
                    ? handleStartWorkout
                    : undefined
              }
            />
          ) : (
            <WorkoutHeroCard
              archetypes={nextUp}
              exerciseCount={exerciseCount}
              whenLabel={heroEyebrow}
              completed={nextUp.length === 0}
              onPress={nextUp.length > 0 ? handleStartWorkout : handleOpenWorkoutPicker}
            />
          )}
        </Animated.View>

        <Animated.View
          entering={shouldAnimateHomeEntrance ? CHANGE_BUTTON_ENTER : undefined}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change workout"
            onPress={handleOpenWorkoutPicker}
            style={styles.changeButton}
          >
            <ArrowLeftRight color={redesignColors.ash} size={18} strokeWidth={2} />
            <Text style={styles.changeButtonText}>Change workout</Text>
          </Pressable>
        </Animated.View>

        {retroactiveConfirmation ? (
          <Text accessibilityLiveRegion="polite" style={styles.confirmation}>
            {retroactiveConfirmation}
          </Text>
        ) : null}

        <Animated.Text
          entering={shouldAnimateHomeEntrance ? QUOTE_ENTER : undefined}
          style={styles.quote}
        >
          “Small sessions, stacked. That’s the whole trick.”
        </Animated.Text>

        <Animated.View
          entering={shouldAnimateHomeEntrance ? SPLIT_CARD_ENTER : undefined}
          style={styles.splitCardWrap}
        >
          <YourSplitCard
            accessibilityLabel={splitCardLabel}
            meta={splitCardMeta}
            name={splitCardName}
            onPress={() => router.push('/your-splits')}
          />
        </Animated.View>

        <View style={styles.scheduleSection}>
          <View style={styles.scheduleList}>
            {visibleSchedule.map(({ day, dayLabel }, visibleIndex) => (
              <Animated.View
                entering={
                  shouldAnimateHomeEntrance
                    ? SCHEDULE_ROW_ENTERS[visibleIndex]
                    : undefined
                }
                key={day.date}
              >
                <ScheduleRow
                  day={day}
                  dayLabel={dayLabel}
                  onPress={
                    day.status === 'past' && !day.completedWorkout
                      ? () => {
                          isLoggingRetroactiveRef.current = false;
                          setRetroactiveDate(day.date);
                        }
                      : undefined
                  }
                />
              </Animated.View>
            ))}
          </View>
        </View>
      </ScrollView>

      <WorkoutPicker
        visible={workoutPickerVisible}
        selected={nextUp[0]}
        onSelect={handleSelectWorkout}
        onClose={() => setWorkoutPickerVisible(false)}
        onExited={handleWorkoutPickerExited}
        {...(isCustomMode
          ? {
              eyebrow: customSplitName.toUpperCase(),
              customOptions,
              selectedCustomId: selectedCustomWorkout?.id ?? null,
              onSelectCustom: handleSelectCustomWorkout,
            }
          : {})}
      />
      <WorkoutPicker
        visible={Boolean(retroactiveDate)}
        options={queueState.remaining}
        eyebrow="QUICK CORRECTION"
        title="What did you finish?"
        onSelect={handleRetroactiveWorkout}
        onClose={() => {
          isLoggingRetroactiveRef.current = false;
          setRetroactiveDate(null);
        }}
      />
      <WorkoutIntensityPicker
        visible={intensityPickerVisible}
        type={
          pendingCustomWorkoutId !== null
            ? customIntensityType
            : pendingArchetypes[0]
              ? ARCHETYPE_COMPOSITIONS[pendingArchetypes[0]].workoutTypes[0]
              : intensityPickerType
        }
        onChoose={handleIntensityChosen}
        onClose={() => {
          setIntensityPickerVisible(false);
          setPendingArchetypes([]);
          setPendingCustomWorkoutId(null);
        }}
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
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  greetingColumn: {
    flex: 1,
    minWidth: 0,
  },
  date: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 12,
    letterSpacing: 1,
    color: redesignColors.ash,
    marginBottom: 12,
  },
  greeting: {
    fontFamily: redesignFonts.display,
    fontSize: 42,
    lineHeight: 46,
    letterSpacing: -1.6,
    color: redesignColors.bone,
  },
  heroWrap: {
    marginTop: 24,
  },
  changeButton: {
    alignSelf: 'center',
    height: 52,
    marginTop: 24,
    paddingHorizontal: 24,
    borderRadius: 26,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: redesignColors.border,
    backgroundColor: redesignColors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  changeButtonText: {
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 16,
    color: redesignColors.ash,
  },
  confirmation: {
    alignSelf: 'center',
    marginTop: 12,
    fontFamily: redesignFonts.monoBold,
    fontSize: 11,
    letterSpacing: 0.7,
    color: redesignColors.ash,
  },
  quote: {
    maxWidth: 320,
    alignSelf: 'center',
    marginTop: 28,
    fontFamily: redesignFonts.uiItalic,
    fontSize: 16,
    lineHeight: 23,
    color: redesignColors.ashDim,
    textAlign: 'center',
  },
  splitCardWrap: {
    marginTop: 32,
  },
  scheduleSection: {
    marginTop: 24,
  },
  scheduleList: {
    gap: 8,
  },
});
