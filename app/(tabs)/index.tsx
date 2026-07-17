import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ArrowLeftRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScheduleRow } from '@/components/home/ScheduleRow';
import { WorkoutHeroCard } from '@/components/home/WorkoutHeroCard';
import { WorkoutPicker } from '@/components/home/WorkoutPicker';
import { WorkoutIntensityPicker } from '@/components/home/WorkoutIntensityPicker';
import { redesignColors, redesignFonts } from '@/constants/theme';
import { useWorkoutStore, type WorkoutType } from '@/store/workoutStore';
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
  const sessions = useWorkoutStore((state) => state.sessions);
  const splitTemplates = useWorkoutStore((state) => state.splitTemplates);
  const getNextWorkoutType = useWorkoutStore((state) => state.getNextWorkoutType);
  const getWeekSchedule = useWorkoutStore((state) => state.getWeekSchedule);
  const startWorkout = useWorkoutStore((state) => state.startWorkout);

  const nextType = useMemo(() => getNextWorkoutType(), [sessions, getNextWorkoutType]);
  const [selectedType, setSelectedType] = useState<WorkoutType>(nextType);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [intensityPickerType, setIntensityPickerType] = useState<WorkoutType | null>(null);

  useEffect(() => {
    setSelectedType(nextType);
  }, [nextType]);

  const schedule = getWeekSchedule();

  const tapFeedback = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleStartWorkout = (type: WorkoutType) => {
    tapFeedback();
    setIntensityPickerType(type);
  };

  const handleIntensityChosen = () => {
    if (!intensityPickerType) return;
    const type = intensityPickerType;
    setIntensityPickerType(null);
    startWorkout(type);
    router.push('/workout');
  };

  const handleSelectWorkout = (type: WorkoutType) => {
    tapFeedback();
    setSelectedType(type);
    setPickerVisible(false);
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
            type={selectedType}
            exerciseCount={splitTemplates[selectedType].length}
            onPress={() => handleStartWorkout(selectedType)}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change workout"
          onPress={() => {
            tapFeedback();
            setPickerVisible(true);
          }}
          style={styles.changeButton}
        >
          <ArrowLeftRight color={redesignColors.ash} size={18} strokeWidth={2} />
          <Text style={styles.changeButtonText}>Change workout</Text>
        </Pressable>

        <Text style={styles.quote}>
          “Small sessions, stacked. That’s the whole trick.”
        </Text>

        <View style={styles.scheduleSection}>
          <Text style={styles.scheduleTitle}>THIS WEEK</Text>
          <View style={styles.scheduleList}>
            {schedule.map((day, index) => {
              if (day.status === 'today') return null;
              const type = day.completedType ?? day.projectedType;

              return (
                <ScheduleRow
                  key={day.date}
                  day={day}
                  dayLabel={DAY_LABELS[index]}
                  onPress={type ? handleStartWorkout : undefined}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>

      <WorkoutPicker
        visible={pickerVisible}
        selected={selectedType}
        onSelect={handleSelectWorkout}
        onClose={() => setPickerVisible(false)}
      />
      <WorkoutIntensityPicker
        visible={Boolean(intensityPickerType)}
        type={intensityPickerType ?? selectedType}
        onChoose={handleIntensityChosen}
        onClose={() => setIntensityPickerType(null)}
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
  scheduleTitle: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 12,
    letterSpacing: 2,
    color: redesignColors.ash,
    marginBottom: 18,
  },
  scheduleList: {
    gap: 7,
  },
});
