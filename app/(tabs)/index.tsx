import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ArrowLeftRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScheduleRow } from '@/components/home/ScheduleRow';
import { WorkoutHeroCard } from '@/components/home/WorkoutHeroCard';
import { WorkoutIntensityPicker } from '@/components/home/WorkoutIntensityPicker';
import { WorkoutPicker } from '@/components/home/WorkoutPicker';
import { ARCHETYPE_COMPOSITIONS, type Archetype } from '@/constants/archetypes';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { getWeeklyQueueState } from '@/store/weeklyQueueEngine';
import {
  getNextArchetypeVariant,
  readArchetypeTemplateSync,
} from '@/store/workoutDatabase';
import { useWorkoutStore } from '@/store/workoutStore';
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

  // The selectors above make queue state refresh whenever profile or completed
  // sessions change; the engine itself remains the single source of truth.
  const queueState = getWeeklyQueueState();
  const nextUp = queueState.nextUp;
  const schedule = getWeekSchedule();
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
  const [retroactiveDate, setRetroactiveDate] = useState<string | null>(null);
  const [retroactiveConfirmation, setRetroactiveConfirmation] = useState<string | null>(
    null
  );
  const isLoggingRetroactiveRef = useRef(false);

  useEffect(() => {
    if (!retroactiveConfirmation) return;
    const timeout = setTimeout(() => setRetroactiveConfirmation(null), 2400);
    return () => clearTimeout(timeout);
  }, [retroactiveConfirmation]);

  const tapFeedback = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleStartWorkout = () => {
    tapFeedback();
    if (currentSession) {
      router.push('/workout');
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
    if (pendingArchetypes.length === 0) return;
    setIntensityPickerVisible(false);
    startWorkoutFromArchetype(pendingArchetypes);
    setPendingArchetypes([]);
    router.push('/workout');
  };

  const handleSelectWorkout = (archetype: Archetype) => {
    tapFeedback();
    setWorkoutPickerVisible(false);
    setPendingArchetypes([archetype]);
  };

  const handleOpenWorkoutPicker = () => {
    tapFeedback();
    setWorkoutPickerVisible(true);
  };

  const handleWorkoutPickerExited = useCallback(() => {
    if (currentSession) {
      router.push('/workout');
      return;
    }
    if (pendingArchetypes.length > 0) {
      setIntensityPickerVisible(true);
    }
  }, [currentSession, pendingArchetypes.length, router]);

  const handleRetroactiveWorkout = (archetype: Archetype) => {
    if (isLoggingRetroactiveRef.current) return;
    isLoggingRetroactiveRef.current = true;
    if (!retroactiveDate) return;
    tapFeedback();
    logArchetypeCompletedRetroactively([archetype], retroactiveDate);
    setRetroactiveDate(null);
    setRetroactiveConfirmation(
      `${ARCHETYPE_COMPOSITIONS[archetype].shortLabel} logged as complete`
    );
  };

  if (!profile) {
    return null;
  }

  const firstName = profile.name?.trim().split(/\s+/)[0] || 'there';

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
        <View style={styles.header}>
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
        </View>

        <View style={styles.heroWrap}>
          <WorkoutHeroCard
            archetypes={nextUp}
            exerciseCount={exerciseCount}
            completed={nextUp.length === 0}
            onPress={nextUp.length > 0 ? handleStartWorkout : handleOpenWorkoutPicker}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change workout"
          onPress={handleOpenWorkoutPicker}
          style={styles.changeButton}
        >
          <ArrowLeftRight color={redesignColors.ash} size={18} strokeWidth={2} />
          <Text style={styles.changeButtonText}>Change workout</Text>
        </Pressable>

        {retroactiveConfirmation ? (
          <Text accessibilityLiveRegion="polite" style={styles.confirmation}>
            {retroactiveConfirmation}
          </Text>
        ) : null}

        <Text style={styles.quote}>
          “Small sessions, stacked. That’s the whole trick.”
        </Text>

        <View style={styles.scheduleSection}>
          <View style={styles.scheduleList}>
            {schedule.map((day, index) => {
              if (day.status === 'today') return null;

              return (
                <ScheduleRow
                  key={day.date}
                  day={day}
                  dayLabel={DAY_LABELS[index]}
                  onPress={
                    day.status === 'past' && !day.completedWorkout
                      ? () => {
                          isLoggingRetroactiveRef.current = false;
                          tapFeedback();
                          setRetroactiveDate(day.date);
                        }
                      : undefined
                  }
                />
              );
            })}
          </View>
        </View>
      </ScrollView>

      <WorkoutPicker
        visible={workoutPickerVisible}
        selected={nextUp[0]}
        onSelect={handleSelectWorkout}
        onClose={() => setWorkoutPickerVisible(false)}
        onExited={handleWorkoutPickerExited}
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
        type={pendingArchetypes[0]
          ? ARCHETYPE_COMPOSITIONS[pendingArchetypes[0]].workoutTypes[0]
          : intensityPickerType}
        onChoose={handleIntensityChosen}
        onClose={() => {
          setIntensityPickerVisible(false);
          setPendingArchetypes([]);
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
    minWidth: 0,
  },
  date: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 12,
    letterSpacing: 1,
    color: redesignColors.ash,
    marginBottom: 16,
  },
  greeting: {
    fontFamily: redesignFonts.display,
    fontSize: 43,
    lineHeight: 48,
    letterSpacing: -1.5,
    color: redesignColors.bone,
  },
  heroWrap: {
    marginTop: 28,
  },
  changeButton: {
    alignSelf: 'center',
    width: 200,
    height: 52,
    marginTop: 23,
    paddingHorizontal: 26,
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
    marginTop: 8,
    fontFamily: redesignFonts.monoBold,
    fontSize: 11,
    letterSpacing: 0.7,
    color: redesignColors.ash,
  },
  quote: {
    maxWidth: 310,
    alignSelf: 'center',
    marginTop: 29,
    fontFamily: redesignFonts.uiItalic,
    fontSize: 16,
    lineHeight: 23,
    color: redesignColors.ashDim,
    textAlign: 'center',
  },
  scheduleSection: {
    marginTop: 30,
  },
  scheduleList: {
    gap: 7,
  },
});
