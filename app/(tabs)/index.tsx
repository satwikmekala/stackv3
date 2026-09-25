import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ArrowLeftRight } from 'lucide-react-native';
import Animated, {
  FadeInDown,
  ReduceMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkoutHeroCard } from '@/components/home/WorkoutHeroCard';
import { YourSplitCard } from '@/components/home/YourSplitCard';
import { EMPTY_CUSTOM_WORKOUT_MESSAGE } from '@/store/customSplits';
import {
  WorkoutPicker,
  type CustomWorkoutOption,
} from '@/components/home/WorkoutPicker';
import type { Archetype } from '@/constants/archetypes';
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
import { resumeWorkout } from '@/utils/workoutResume';
import type { WorkoutLaunchOrigin } from '@/utils/workoutLaunch';
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
const SPLIT_CARD_ENTER = buildHomeEnter(240);

// The 6.1-inch and 6.3-inch phones are close in width but have meaningfully
// different vertical room. Keep the Home hierarchy intact while tightening it
// gradually on the shorter viewport; this deliberately keys off layout space,
// never a device model.
const COMPACT_HOME_HEIGHT = 852;
const ROOMY_HOME_HEIGHT = 874;

function compactnessForHeight(height: number) {
  return Math.max(
    0,
    Math.min(1, (ROOMY_HOME_HEIGHT - height) / (ROOMY_HOME_HEIGHT - COMPACT_HOME_HEIGHT))
  );
}

function blend(roomy: number, compact: number, compactness: number) {
  return roomy + (compact - roomy) * compactness;
}

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
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const compactness = compactnessForHeight(windowHeight);
  const profile = useWorkoutStore((state) => state.profile);
  useWorkoutStore((state) => state.sessions);
  const currentSession = useWorkoutStore((state) => state.currentSession);
  const startWorkoutFromArchetype = useWorkoutStore(
    (state) => state.startWorkoutFromArchetype
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
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | null>(null);
  const nextUp = selectedArchetype ? [selectedArchetype] : queueState.nextUp;
  const heroEyebrow = selectedArchetype ? 'NEXT UP' : scheduleEyebrow(queueState.nextUpDate);
  const exerciseCount = nextUp.reduce(
    (count, archetype) =>
      count +
      readArchetypeTemplateSync(archetype, getNextArchetypeVariant(archetype)).length,
    0
  );
  const [workoutPickerVisible, setWorkoutPickerVisible] = useState(false);
  const [selectedCustomWorkoutId, setSelectedCustomWorkoutId] = useState<number | null>(
    null
  );
  const [activeSplitMissing, setActiveSplitMissing] = useState(false);
  // Commit preview changes after the picker finishes its exit animation.
  const selectedArchetypeAfterPickerExitRef = useRef<Archetype | null>(null);
  const selectedCustomWorkoutAfterPickerExitRef = useRef<number | null>(null);
  const hasAnimatedHomeRef = useRef(false);
  const startingWorkoutRef = useRef(false);

  useFocusEffect(useCallback(() => {
    startingWorkoutRef.current = false;
  }, []));

  const shouldAnimateHomeEntrance = Boolean(profile) && !hasAnimatedHomeRef.current;

  useEffect(() => {
    if (profile) {
      hasAnimatedHomeRef.current = true;
    }
  }, [profile]);

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
    setSelectedArchetype(null);
    selectedArchetypeAfterPickerExitRef.current = null;
    selectedCustomWorkoutAfterPickerExitRef.current = null;
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

  const handleStartWorkout = (origin?: WorkoutLaunchOrigin) => {
    if (startingWorkoutRef.current) return;
    startingWorkoutRef.current = true;
    tapFeedback();
    // An already-created session resumes through the existing mechanism,
    // whatever program produced it.
    if (currentSession) {
      resumeWorkout(router);
      return;
    }
    const openWorkout = () => router.push({
      pathname: '/workout',
      params: origin ? { launchOrigin: JSON.stringify(origin) } : {},
    });
    if (isCustomMode) {
      if (activeSplitId === null || !selectedCustomWorkout || !customWorkoutReady ||
        !startWorkoutFromCustomWorkout(activeSplitId, selectedCustomWorkout.id)) {
        startingWorkoutRef.current = false;
        return;
      }
      // Hand Home back to durable resolution: completing this session advances
      // the rotation, and abandoning it leaves the durable position untouched.
      setSelectedCustomWorkoutId(null);
      openWorkout();
      return;
    }
    if (nextUp.length === 0) {
      startingWorkoutRef.current = false;
      return;
    }
    startWorkoutFromArchetype(nextUp);
    if (!useWorkoutStore.getState().currentSession) {
      startingWorkoutRef.current = false;
      return;
    }
    setSelectedArchetype(null);
    openWorkout();
  };

  // Selection only changes what Home previews: the saved split, its ordering
  // and the archetype queue are all left untouched.
  const handleSelectCustomWorkout = useCallback((workoutId: number) => {
    selectedCustomWorkoutAfterPickerExitRef.current = workoutId;
    setWorkoutPickerVisible(false);
  }, []);

  const handleSelectWorkout = (archetype: Archetype) => {
    selectedArchetypeAfterPickerExitRef.current = archetype;
    setWorkoutPickerVisible(false);
  };

  const handleOpenWorkoutPicker = () => {
    tapFeedback();
    setWorkoutPickerVisible(true);
  };

  const handleWorkoutPickerExited = useCallback(() => {
    // Both programs only update the preview; Start launches the selected workout.
    if (isCustomMode) {
      const workoutId = selectedCustomWorkoutAfterPickerExitRef.current;
      selectedCustomWorkoutAfterPickerExitRef.current = null;
      if (workoutId !== null) {
        setSelectedCustomWorkoutId(workoutId);
      }
      return;
    }
    const archetype = selectedArchetypeAfterPickerExitRef.current;
    selectedArchetypeAfterPickerExitRef.current = null;
    if (archetype !== null) {
      setSelectedArchetype(archetype);
    }
  }, [isCustomMode]);

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
  const firstName = profile.name?.trim().split(/\s+/)[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';


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
        // Home is a fixed dashboard; sizing above keeps all controls visible
        // without exposing a draggable content surface.
        scrollEnabled={false}
        bounces={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + blend(24, 20, compactness),
            paddingBottom: insets.bottom + 128,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={shouldAnimateHomeEntrance ? HEADER_ENTER : undefined}
          style={styles.header}
        >
          <View style={styles.greetingColumn}>
            <Text style={[styles.date, { marginBottom: blend(16, 12, compactness) }]}>
              {todayLabel()}
            </Text>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              numberOfLines={1}
              style={styles.greeting}
            >
              {greeting}, {firstName}
            </Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={shouldAnimateHomeEntrance ? HERO_ENTER : undefined}
          style={{ marginTop: blend(16, 12, compactness) }}
        >
          {isCustomMode ? (
            <WorkoutHeroCard
              hideStartButton={!isFocused && startingWorkoutRef.current}
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
              verticalCompactness={compactness}
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
              hideStartButton={!isFocused && startingWorkoutRef.current}
              archetypes={nextUp}
              exerciseCount={exerciseCount}
              whenLabel={heroEyebrow}
              completed={nextUp.length === 0}
              verticalCompactness={compactness}
              onPress={nextUp.length > 0 ? handleStartWorkout : handleOpenWorkoutPicker}
            />
          )}
          {isCustomMode && selectedCustomWorkout && !customWorkoutReady ? (
            <Text accessibilityLiveRegion="polite" style={styles.emptyWorkoutMessage}>
              {EMPTY_CUSTOM_WORKOUT_MESSAGE}
            </Text>
          ) : null}
        </Animated.View>

        <Animated.View
          entering={shouldAnimateHomeEntrance ? CHANGE_BUTTON_ENTER : undefined}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change workout"
            onPress={handleOpenWorkoutPicker}
            style={[
              styles.changeButton,
              {
                marginTop: blend(10, 8, compactness),
                minHeight: blend(58, 54, compactness),
                paddingVertical: blend(15, 13, compactness),
              },
            ]}
          >
            <ArrowLeftRight color={redesignColors.ash} size={18} strokeWidth={2} />
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.9}
              numberOfLines={1}
              style={styles.changeButtonText}
            >
              Change workout
            </Text>
          </Pressable>
        </Animated.View>

        <Animated.View
          entering={shouldAnimateHomeEntrance ? SPLIT_CARD_ENTER : undefined}
          // When there is spare height, marginTop: 'auto' holds this card at a
          // consistent, intentional distance above the floating tab control.
          // On a compact screen the hero tightens first, then the page remains
          // scrollable rather than letting the controls overlap.
          style={[styles.splitCardWrap, { paddingTop: blend(20, 16, compactness) }]}
        >
          <YourSplitCard
            accessibilityLabel={splitCardLabel}
            meta={splitCardMeta}
            name={splitCardName}
            onPress={() => router.push('/your-splits')}
          />
        </Animated.View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWorkoutMessage: {
    marginTop: 12,
    color: redesignColors.ash,
    fontFamily: redesignFonts.ui,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  screen: {
    flex: 1,
    backgroundColor: redesignColors.ink,
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
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
    letterSpacing: 2.4,
    textAlign: 'center',
    color: redesignColors.ashDim,
  },
  greeting: {
    fontFamily: redesignFonts.display,
    fontSize: 34,
    lineHeight: 42,
    textAlign: 'center',
    letterSpacing: -1.6,
    color: redesignColors.bone,
  },
  changeButton: {
    alignSelf: 'center',
    width: '60%',
    minWidth: 190,
    maxWidth: 240,
    // The hero includes 10 points below the visible start button.
    paddingHorizontal: 16,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: redesignColors.border,
    backgroundColor: 'rgba(29, 25, 21, 0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  changeButtonText: {
    flexShrink: 1,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 16,
    color: redesignColors.ash,
  },
  splitCardWrap: {
    marginTop: 'auto',
  },
});
