import { longContentDate } from '@/utils/content';
import { getProgramFrequency } from '@/store/trainingPreferences';
import { useMuscleColors } from '@/store/muscleColors';
import { resolveDayColor } from '@/features/custom-split/colors';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Platform,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from '@/services/haptics';
import { Plus, ChevronRight } from 'lucide-react-native';
import Animated, {
  FadeInDown,
  cancelAnimation,
  ReduceMotion,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeDeparture, useHomeDepartureStyle } from '@/components/home/HomeDeparture';
import { HomeTabBarDeparture } from '@/components/home/HomeTabBarDeparture';
import { WorkoutHeroCard } from '@/components/home/WorkoutHeroCard';
import { YourSplitCard } from '@/components/home/YourSplitCard';
import { EMPTY_CUSTOM_WORKOUT_MESSAGE } from '@/store/customSplits';
import {
  WorkoutPicker,
  type CustomWorkoutOption,
} from '@/components/home/WorkoutPicker';
import { getSessionWorkoutDisplay, type Archetype } from '@/constants/archetypes';
import { motionDuration, motionEasing } from '@/constants/motion';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { getWeeklyQueueState } from '@/store/weeklyQueueEngine';
import {
  getNextArchetypeVariant,
  readArchetypeTemplateSync,
} from '@/store/workoutDatabase';
import {
  getWorkoutLetter,
} from '@/store/customSplitDraft';
import type { CustomSplitWorkout } from '@/store/customSplits';
import { resolveNextCustomWorkoutIndex } from '@/store/customSplitRotation';
import { toLocalCalendarDate, useWorkoutStore } from '@/store/workoutStore';
import type { WorkoutLaunchOrigin } from '@/utils/workoutLaunch';
import { useWorkoutLaunch, workoutLaunch } from '@/store/workoutLaunch';
import { navigateWorkoutLaunch } from '@/features/workout-launch/navigation';
import type { WorkoutIntent } from '@/features/workout-launch/coordinator';
import '@/global.css';

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
const SPLIT_CARD_ENTER = buildHomeEnter(160);

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

/** Saved workouts carry their resolved name; the letter is the last resort. */
function customWorkoutTitle(workout: CustomSplitWorkout, index: number) {
  return workout.name.trim() || `Workout ${getWorkoutLetter(index)}`;
}

function customWorkoutAccent(workout: CustomSplitWorkout) {
  return resolveDayColor(workout);
}

function plural(count: number, noun: string) {
  return `${noun}${count === 1 ? '' : 's'}`;
}

function todayLabel(today: Date) {
  return longContentDate(today);
}

export default function Home() {
  const departure = useSharedValue(0);
  useFocusEffect(useCallback(() => {
    const reset = () => { cancelAnimation(departure); departure.set(0); };
    reset();
    // Train remains mounted beneath the transparent workout modal. Restore it
    // on blur too, before minimizing exposes it again.
    return reset;
  }, [departure]));
  return <HomeDeparture.Provider value={departure}><HomeContent /><HomeTabBarDeparture /></HomeDeparture.Provider>;
}

function HomeContent() {
  useMuscleColors(state => state.preferences);
  const headerDeparture = useHomeDepartureStyle(0, 0.7, 8);
  const secondaryDeparture = useHomeDepartureStyle(0.02, 0.76, -12);
  const backgroundDeparture = useHomeDepartureStyle(0, 1, 0);
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(useCallback(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setNow(new Date());
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []));
  const insets = useSafeAreaInsets();
  const { height: windowHeight, fontScale } = useWindowDimensions();
  const compactness = compactnessForHeight(windowHeight);
  const profile = useWorkoutStore((state) => state.profile);
  useWorkoutStore((state) => state.sessions);
  const liveSession = useWorkoutStore((state) => state.currentSession);
  const [departing, setDeparting] = useState(false);
  const departure = useContext(HomeDeparture);
  const [launchRevision, setLaunchRevision] = useState(0);
  const launchError = useWorkoutLaunch(state => state.intent ? null : state.error);
  // Keep the source handle mounted while session creation updates the store.
  const currentSession = departing ? null : liveSession;
  const currentCustomSplit = useWorkoutStore((state) => state.currentCustomSplit);
  const customSplits = useWorkoutStore((state) => state.customSplits);
  const loadCustomSplit = useWorkoutStore((state) => state.loadCustomSplit);
  const getLastCompletedCustomWorkoutId = useWorkoutStore(
    (state) => state.getLastCompletedCustomWorkoutId
  );

  const programMode = profile?.programMode ?? 'none';
  const isNoProgramMode = programMode === 'none';
  const isCustomMode = programMode === 'custom';
  const activeSplitId = isCustomMode ? profile?.activeSplitId ?? null : null;

  // The selectors above make queue state refresh whenever profile or completed
  // sessions change; the engine itself remains the single source of truth.
  const queueState = getWeeklyQueueState();
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | null>(null);
  const nextUp = programMode === 'stack' ? selectedArchetype ? [selectedArchetype] : queueState.nextUp : [];
  const heroEyebrow =
    queueState.nextUpDate === toLocalCalendarDate(now) ? 'TODAY' : 'NEXT UP';
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
  // Commit preview changes after the picker finishes its exit animation.
  const selectedArchetypeAfterPickerExitRef = useRef<Archetype | null>(null);
  const selectedCustomWorkoutAfterPickerExitRef = useRef<number | null>(null);
  const startingWorkoutRef = useRef(false);

  useFocusEffect(useCallback(() => {
    if (startingWorkoutRef.current || workoutLaunch.didHandOff()) {
      setSelectedArchetype(null);
      setSelectedCustomWorkoutId(null);
    }
    startingWorkoutRef.current = false;
    workoutLaunch.resetAfterNavigation();
    setDeparting(false);
  }, [setSelectedArchetype, setSelectedCustomWorkoutId]));

  // A failed read keeps the selection and offers Retry; a proven missing
  // routine is reconciled to no-program mode by the store.
  useFocusEffect(useCallback(() => {
    if (activeSplitId !== null) void loadCustomSplit(activeSplitId);
  }, [activeSplitId, loadCustomSplit]));

  const customSplit =
    activeSplitId !== null && currentCustomSplit?.id === activeSplitId
      ? currentCustomSplit
      : null;
  const activeSplitSummary = activeSplitId === null
    ? null
    : customSplits.find((split) => split.id === activeSplitId) ?? null;
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
  const customOptions: CustomWorkoutOption[] = customWorkouts.map((workout, index) => ({
    id: workout.id,
    letter: getWorkoutLetter(index),
    name: customWorkoutTitle(workout, index),
    color: customWorkoutAccent(workout),
    exerciseCount: workout.exercises.length,
  }));

  // Each split owns its own rotation, so a pick made under one split must not
  // leak into another.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset a manual preview when its owning split changes.
    setSelectedCustomWorkoutId(null);
    setSelectedArchetype(null);
    selectedArchetypeAfterPickerExitRef.current = null;
    selectedCustomWorkoutAfterPickerExitRef.current = null;
  }, [activeSplitId, programMode]);

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

  const handleStartWorkout = (origin?: WorkoutLaunchOrigin, empty = false) => {
    if (startingWorkoutRef.current) return;
    startingWorkoutRef.current = true;
    tapFeedback();
    let intent: WorkoutIntent;
    // A stale callback still resumes a session that arrived after render.
    if (useWorkoutStore.getState().currentSession || empty || isNoProgramMode) intent = { kind: 'empty', origin };
    else if (isCustomMode && activeSplitId !== null && selectedCustomWorkout && customWorkoutReady)
      intent = { kind: 'custom', splitId: activeSplitId, workoutId: selectedCustomWorkout.id, origin };
    else if (!isCustomMode && nextUp.length) intent = { kind: 'stack', archetypes: [...nextUp], variants: nextUp.map(getNextArchetypeVariant), origin };
    else { startingWorkoutRef.current = false; return; }
    setDeparting(true);
    const result = workoutLaunch.request(intent);
    if (result.kind !== 'started' && result.kind !== 'resume') {
      startingWorkoutRef.current = false;
      setDeparting(false);
      if (departure) { cancelAnimation(departure); departure.set(0); }
      setLaunchRevision(value => value + 1);
    }
    navigateWorkoutLaunch(router, result);
  };

  // Selection only changes what Home previews: the saved split, its ordering
  // and the archetype queue are all left untouched.
  const handleSelectCustomWorkout = (workoutId: number) => {
    selectedCustomWorkoutAfterPickerExitRef.current = workoutId;
    setWorkoutPickerVisible(false);
  };

  const handleSelectWorkout = (archetype: Archetype) => {
    selectedArchetypeAfterPickerExitRef.current = archetype;
    setWorkoutPickerVisible(false);
  };

  const handleOpenWorkoutPicker = () => {
    tapFeedback();
    setWorkoutPickerVisible(true);
  };

  const handleWorkoutPickerExited = () => {
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
  };

  if (!profile) {
    return null;
  }

  // Summary and detail hydrate independently. The summary is enough to keep a
  // real program identity on screen until its workout rows arrive.
  const customSplitName =
    customSplit?.name ?? activeSplitSummary?.name ?? 'My routine';
  // A loading program keeps its identity without inventing a workout count.
  // An edited Stack's plan runs like a routine but keeps Stack's identity.
  const isEditedStackPlan = Boolean(customSplit?.isStackPlan ?? activeSplitSummary?.isStackPlan);
  const splitCardName = isCustomMode ? customSplitName : 'Stack’s plan';
  const customMetaLabel = isEditedStackPlan ? 'Edited' : 'Custom';
  const splitCardMeta = isCustomMode
    ? customSplit
      ? `${customMetaLabel} · ${customWorkouts.length} ${plural(customWorkouts.length, 'workout')}`
      : activeSplitSummary
        ? `${customMetaLabel} · ${activeSplitSummary.workoutCount} ${plural(activeSplitSummary.workoutCount, 'workout')}`
        : customMetaLabel
    : `Auto-generated · ${getProgramFrequency(profile)} ${plural(getProgramFrequency(profile), 'workout')}`;
  const splitCardLabel = isCustomMode && !isEditedStackPlan
    ? `Open Your routines. Active routine: ${splitCardName}.`
    : 'Open Your routines. Stack’s plan is active.';
  const hasEditedStackPlan = customSplits.some((split) => split.isStackPlan);
  const customHeroEyebrow = 'NEXT UP';
  const firstName = profile.name?.trim().split(/\s+/)[0];
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';


  return (
    <View style={styles.screen}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, backgroundDeparture]}><LinearGradient
        pointerEvents="none"
        colors={['#17130F', redesignColors.ink, '#100E0C']}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      /></Animated.View>

      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + blend(28, 24, compactness),
            paddingBottom: insets.bottom + (currentSession ? 220 : 100),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={HEADER_ENTER}
          style={[styles.header, headerDeparture]}
        >
          <View key={`greeting:${fontScale}`} style={styles.greetingColumn}>
            <Text style={[styles.date, { marginBottom: 10 }]}>
              {todayLabel(now)}
            </Text>
            <Text
              maxFontSizeMultiplier={1.5}
              style={styles.greeting}
            >
              {firstName ? `${greeting}, ${firstName}` : `Good ${greeting.toLowerCase()}`}
            </Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={HERO_ENTER}
          style={{ marginTop: 24 }}
        >
          {currentSession ? (
            <WorkoutHeroCard resetKey={launchRevision} title={getSessionWorkoutDisplay(currentSession).label} groupLabel={currentSession.origin === 'adhoc' ? 'Workout' : 'In progress'}
              exerciseCount={currentSession.exercises.length} accentColor={getSessionWorkoutDisplay(currentSession).color}
              whenLabel="IN PROGRESS" actionLabel="Resume workout" onPress={handleStartWorkout} />
          ) : isNoProgramMode ? (
            <WorkoutHeroCard resetKey={launchRevision} title="Ready when you are."
              description="Start a workout and add exercises as you go."
              whenLabel="YOUR TRAINING" exerciseCount={0} accentColor={redesignColors.accent}
              showStackMark startWorkoutName="empty workout" onPress={handleStartWorkout} />
          ) : isCustomMode ? (
            <WorkoutHeroCard
              resetKey={launchRevision}
              exerciseCount={selectedCustomWorkout?.exercises.length ?? 0}
              whenLabel={customHeroEyebrow}
              onChangeWorkout={handleOpenWorkoutPicker}
              loading={!customSplit}
              actionLabel={customSplitBroken ? 'Edit your routine' : undefined}
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
              resetKey={launchRevision}
              archetypes={nextUp}
              exerciseCount={exerciseCount}
              whenLabel={heroEyebrow}
              onChangeWorkout={handleOpenWorkoutPicker}
              completed={nextUp.length === 0}
              onPress={nextUp.length > 0 ? handleStartWorkout : handleOpenWorkoutPicker}
            />
          )}
          {isCustomMode && selectedCustomWorkout && !customWorkoutReady ? (
            <Text accessibilityLiveRegion="polite" style={styles.emptyWorkoutMessage}>
              {EMPTY_CUSTOM_WORKOUT_MESSAGE}
            </Text>
          ) : null}
          {launchError && <Text accessibilityRole="alert" style={styles.emptyWorkoutMessage}>{launchError}</Text>}
        </Animated.View>

        <Animated.View
          entering={SPLIT_CARD_ENTER}
          style={[styles.secondary, secondaryDeparture]}
        >
          {!currentSession && !isNoProgramMode && <TouchableOpacity key={`empty-action:${fontScale}`} activeOpacity={0.65} accessibilityRole="button" accessibilityLabel="Start empty workout"
            accessibilityHint="Build as you go. Add exercises after starting."
            onPress={() => handleStartWorkout(undefined, true)} style={styles.emptyAction}>
            <Plus color={redesignColors.accent} size={22} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.secondaryTitle}>Start empty workout</Text>
              <Text style={styles.secondaryDetail}>Build as you go</Text>
            </View>
            <ChevronRight color={redesignColors.accent} size={18} />
          </TouchableOpacity>}
          {isNoProgramMode ? <>
            <TouchableOpacity key={`program-action:${fontScale}`} activeOpacity={0.65} accessibilityRole="button" accessibilityLabel="Get Stack’s plan"
              accessibilityHint="Preview Stack’s plan."
              onPress={() => router.push(!hasEditedStackPlan
                ? { pathname: '/program-setup', params: { source: 'train' } }
                : { pathname: '/your-splits', params: { focus: 'stack' } })} style={styles.discoveryAction}>
              <View style={{ flex: 1, gap: 4 }}><Text style={styles.secondaryTitle}>Get Stack’s plan</Text>
                <Text style={styles.secondaryDetail}>Preview your weekly workouts</Text></View>
              <ChevronRight color={redesignColors.ash} size={20} />
            </TouchableOpacity>
            <TouchableOpacity key={`routines-action:${fontScale}`} activeOpacity={0.65} accessibilityRole="button" accessibilityLabel="Your routines"
              accessibilityHint="Open Your routines."
              onPress={() => router.push({ pathname: '/your-splits', params: { focus: 'library' } })} style={styles.discoveryAction}>
              <View style={{ flex: 1, gap: 4 }}><Text style={styles.secondaryTitle}>Your routines</Text>
                <Text style={styles.secondaryDetail}>Keep your favorites ready for later</Text></View>
              <ChevronRight color={redesignColors.ash} size={20} />
            </TouchableOpacity>
          </> : <YourSplitCard key={`program-summary:${fontScale}`}
            accessibilityLabel={splitCardLabel}
            meta={splitCardMeta}
            name={splitCardName}
            onPress={() => router.push('/your-splits')}
          />}

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
    fontFamily: redesignFonts.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    color: redesignColors.ash,
  },
  greeting: {
    fontFamily: redesignFonts.ui,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.6,
    color: redesignColors.bone,
  },
  secondary: { marginTop: 24, gap: 8 },
  discoveryAction: { minHeight: 88, paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 20 },
  emptyAction: { minHeight: 88, paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 16,
    borderRadius: 20, borderWidth: 1, borderColor: `${redesignColors.accent}40`, backgroundColor: `${redesignColors.accent}0D` },
  secondaryTitle: { fontFamily: redesignFonts.uiSemiBold, fontSize: 17, color: redesignColors.bone },
  secondaryDetail: { fontFamily: redesignFonts.ui, fontSize: 15, color: redesignColors.ash },
});
