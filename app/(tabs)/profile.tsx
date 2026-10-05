/** @jsxImportSource react */
import { useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import * as Haptics from '@/services/haptics';
import { Check, ChevronRight, History as HistoryIcon, Settings, Trophy } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { redesignColors, redesignFonts, splitColors } from '@/constants/theme';
import { useWorkoutStore } from '@/store/workoutStore';
import { DEFAULT_WEIGHT_UNIT } from '@/store/workoutDatabase';
import { derivePersonalRecords } from '@/store/personalRecords';
import { deriveLiftProgress } from '@/store/liftProgress';
import { loadLiftProgressPreferences, saveWatchedLifts, useLiftProgressPreferences } from '@/store/liftProgressPreferences';
import { useWatchedLifts } from '@/hooks/useWatchedLifts';
import { LiftProgressCard } from '@/components/LiftProgressCard';
import { StackLogo } from '@/components/StackLogo';
import { WorkoutCardSurface } from '@/components/home/WorkoutCardSurface';
import '@/global.css';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function WeeklySummary({ completed, goal }: { completed: number; goal: number }) {
  const router = useRouter();
  const { fontScale } = useWindowDimensions();
  const trainingDays = useWorkoutStore((state) => state.profile?.trainingDays);
  const days = useWorkoutStore((state) => state.getWeekStreak)();
  const planned = new Set(trainingDays ?? []);
  const today = (new Date().getDay() + 6) % 7;
  const remaining = Math.max(0, goal - completed);
  const caption = goal <= 0 ? `${completed} ${completed === 1 ? 'day' : 'days'} trained`
    : remaining > 0 ? `${remaining} to go`
      : completed > goal ? `Goal met +${completed - goal}` : 'Goal met';

  return (
    <View style={styles.weeklySummary}>
      <WorkoutCardSurface color={redesignColors.accent} radius={28} />
      <Pressable accessibilityRole="button" accessibilityLabel={goal > 0 ? `This week. ${completed} of ${goal} training days. ${caption}. Edit weekly goal.` : `This week. ${caption}. Set a weekly goal.`}
        onPress={() => router.push({ pathname: '/settings', params: { page: 'goal' } })}
        style={[styles.weeklyHeading, fontScale > 1.6 && styles.weeklyHeadingLarge]}>
        <View style={[styles.weeklyCopy, fontScale > 1.6 && styles.weeklyCopyLarge]}>
          <Text style={styles.weeklyTitle}>This week</Text>
          <Text style={[styles.weeklyCaption, goal <= 0 && styles.weeklyGoalPrompt]}>{caption}</Text>
        </View>
        <Text style={styles.weeklyCount}>{completed}{goal > 0 && <Text style={styles.weeklyTotal}>/{goal}</Text>}</Text>
      </Pressable>
      <View style={[styles.weekdays, fontScale > 1.6 && styles.weekdaysWrapped]}>
        {WEEKDAYS.map((letter, index) => {
          const workouts = days[index]?.workouts ?? 0;
          const trained = workouts > 0;
          const upcoming = !trained && planned.has(index) && index >= today;
          return (
            <View key={index} accessible
              accessibilityLabel={`${WEEKDAY_NAMES[index]}${index === today ? ', today' : ''}. ${trained
                ? `${workouts} ${workouts === 1 ? 'workout' : 'workouts'} completed`
                : upcoming ? 'Planned training day' : 'No workouts logged'}.`}
              style={[styles.day, fontScale > 1.6 && styles.dayLarge]}>
              <View style={styles.dayLabel}>
                <Text style={[styles.dayLetter, index === today && styles.todayLetter]}>{letter}</Text>
                {index === today && <View style={styles.todayDot} />}
              </View>
              <View style={[styles.dayMark, trained && styles.dayTrained, upcoming && styles.dayPlanned]}>
                {trained ? workouts > 1
                  ? <Text style={styles.dayCount}>{workouts}</Text>
                  : <Check color={redesignColors.ink} size={13} strokeWidth={3} />
                  : <Text style={styles.dayDash}>{upcoming ? '○' : '–'}</Text>}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ProgressSettingsButton({ onPress }: { onPress: () => void }) {
  const supportsGlass = Platform.OS === 'ios'
    && isGlassEffectAPIAvailable()
    && isLiquidGlassAvailable();
  const icon = Platform.OS === 'ios' ? (
    <SymbolView
      name="gearshape"
      size={22}
      weight="medium"
      tintColor={redesignColors.bone}
      style={styles.settingsIcon}
    />
  ) : (
    <Settings color={redesignColors.bone} size={22} strokeWidth={2} />
  );

  return (
    <Pressable
      accessibilityLabel="Open settings"
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingsButton,
        !supportsGlass && styles.settingsButtonFallback,
        !supportsGlass && pressed && styles.buttonPressed,
      ]}
    >
      {supportsGlass ? (
        <GlassView
          glassEffectStyle="regular"
          colorScheme="dark"
          isInteractive
          style={styles.settingsGlass}
        >
          {icon}
        </GlassView>
      ) : icon}
    </Pressable>
  );
}

export default function Progress() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const profile = useWorkoutStore((state) => state.profile);
  const sessions = useWorkoutStore((state) => state.sessions);
  const weekly = useWorkoutStore((state) => state.getWeeklyProgress)();
  const lifts = useMemo(() => deriveLiftProgress(sessions), [sessions]);
  const records = useMemo(() => derivePersonalRecords(sessions), [sessions]);
  const { names, preferences } = useWatchedLifts(lifts);
  const watched = names.flatMap((name) => lifts.filter((lift) => lift.name === name));
  const unit = profile?.weightUnit ?? DEFAULT_WEIGHT_UNIT;
  const completed = sessions.filter((session) => session.completed).length;
  const stacked = width < 360 || fontScale > 1.2;
  const tap = (action: () => void) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    action();
  };
  const openLifts = (choose = false) => tap(() => router.push({ pathname: '/lift-progress', params: choose ? { choose: '1' } : {} }));
  const retry = () => {
    if (preferences.error === 'load') void loadLiftProgressPreferences();
    else {
      useLiftProgressPreferences.setState({ error: null });
      void saveWatchedLifts(names, preferences.automatic);
    }
  };

  if (!profile) return null;
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: 20, paddingBottom: insets.bottom + 110 }]}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={[styles.title, fontScale > 1.6 && {
            // Orientation stays compact; workout content still follows the full text size.
            fontSize: 54 / fontScale, lineHeight: 66 / fontScale, letterSpacing: -1,
          }]}>Progress</Text>
          <ProgressSettingsButton onPress={() => tap(() => router.push('/settings'))} />
        </View>
        <WeeklySummary completed={weekly.completed} goal={weekly.goal} />
        <View style={styles.liftSection}>
          <View style={styles.sectionHeading}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Lift progress</Text>
            {lifts.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Change featured exercises"
              disabled={!preferences.hydrated || preferences.saving || preferences.error === 'load'} onPress={() => openLifts(true)}
              style={({ pressed }) => [styles.textButton, pressed && styles.buttonPressed]}>
              <Text style={styles.textButtonLabel}>Change</Text>
            </Pressable>}
          </View>
          {preferences.error && <View style={styles.preferenceError}>
            <Text accessibilityRole="alert" style={styles.emptyCopy}>{preferences.error === 'load'
              ? 'Couldn’t load your exercise choices.' : 'Couldn’t save your exercise choices.'}</Text>
            <Pressable accessibilityRole="button" onPress={retry} style={styles.textButton}>
              <Text style={styles.textButtonLabel}>Retry</Text>
            </Pressable>
          </View>}
          {preferences.error === 'load' ? <View style={styles.emptyState}>
            <Text style={styles.emptyCopy}>Retry to restore your featured exercises. Your full lift history is available below.</Text>
          </View> : !preferences.hydrated ? <View style={styles.emptyState}>
            <Text style={styles.emptyCopy}>Loading your lift progress…</Text>
          </View> : watched.length > 0 ? <View style={[styles.cards, stacked && styles.cardsStacked]}>
            {watched.map((lift) => <LiftProgressCard key={lift.name} lift={lift} unit={unit}
              onPress={() => tap(() => router.push({ pathname: '/lift-detail', params: { exerciseName: lift.name } }))} />)}
          </View> : <View key={`empty-progress:${fontScale}`} style={styles.emptyState}>
            {lifts.length === 0 && <WorkoutCardSurface color={splitColors.chest} radius={22} showEdge={false} />}
            {lifts.length === 0 && <View style={styles.emptyBrand} accessible accessibilityRole="image" accessibilityLabel="Your logged sets build your lift history."><StackLogo size={28} /><Text style={styles.emptyEyebrow}>SET BY SET</Text></View>}
            <Text accessibilityRole="header" style={styles.emptyTitle}>{lifts.length > 0 ? 'Follow the lifts you care about' : 'No lift history yet.'}</Text>
            <Text style={styles.emptyCopy}>{lifts.length > 0
              ? 'Choose up to two exercises to compare here.'
              : 'Your logged sets will show how your lifts change.'}</Text>
            <Pressable accessibilityRole="button"
              onPress={() => lifts.length > 0 ? openLifts(true) : tap(() => router.navigate('/(tabs)'))}
              style={({ pressed }) => [styles.emptyAction, pressed && styles.buttonPressed]}>
              <Text style={styles.textButtonLabel}>{lifts.length > 0 ? 'Choose exercises' : 'Go to Train'}</Text>
              <ChevronRight size={17} color={redesignColors.bone} />
            </Pressable>
          </View>}
          {lifts.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="View all lift progress" onPress={() => openLifts()}
            style={({ pressed }) => [styles.viewAll, pressed && styles.buttonPressed]}>
            <Text style={styles.viewAllLabel}>View all lift progress</Text>
            <ChevronRight size={17} color={redesignColors.ash} />
          </Pressable>}
        </View>
        <View style={styles.destinations}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Personal records. ${records.length} ${records.length === 1 ? 'exercise' : 'exercises'} tracked`}
            onPress={() => tap(() => router.push('/records'))} style={({ pressed }) => [styles.destination, pressed && styles.buttonPressed]}>
            <View style={styles.destinationIcon}><Trophy size={20} strokeWidth={2} color={redesignColors.bone} /></View>
            <View style={styles.destinationCopy}>
              <Text style={styles.destinationTitle}>Personal records</Text>
              <Text style={styles.destinationMeta}>{records.length} {records.length === 1 ? 'exercise' : 'exercises'} tracked</Text>
            </View>
            <ChevronRight size={18} color={redesignColors.ash} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`History. ${completed} ${completed === 1 ? 'workout' : 'workouts'} logged`}
            onPress={() => tap(() => router.push('/history'))} style={({ pressed }) => [styles.destination, styles.destinationLast, pressed && styles.buttonPressed]}>
            <View style={styles.destinationIcon}><HistoryIcon size={20} strokeWidth={2} color={redesignColors.bone} /></View>
            <View style={styles.destinationCopy}>
              <Text style={styles.destinationTitle}>History</Text>
              <Text style={styles.destinationMeta}>{completed} {completed === 1 ? 'workout' : 'workouts'} logged</Text>
            </View>
            <ChevronRight size={18} color={redesignColors.ash} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: redesignColors.ink },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24 },
  header: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  title: { flex: 1, fontFamily: redesignFonts.display, lineHeight: 42, fontSize: 34, letterSpacing: -1.6, color: redesignColors.bone },
  settingsButton: { width: 44, height: 44, borderRadius: 22, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  settingsGlass: { width: 44, height: 44, borderRadius: 22, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  settingsIcon: { width: 22, height: 22 },
  settingsButtonFallback: { borderWidth: 1, borderColor: redesignColors.border, backgroundColor: redesignColors.surface },
  buttonPressed: { opacity: 0.7 },
  weeklySummary: { marginTop: 24, padding: 18, borderRadius: 28, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: redesignColors.surface },
  weeklyHeading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  weeklyHeadingLarge: { flexDirection: 'column', alignItems: 'flex-start' },
  weeklyCopyLarge: { flex: 0, alignSelf: 'stretch' },
  weeklyCopy: { flex: 1, minWidth: 0, gap: 4 },
  weeklyTitle: { fontFamily: redesignFonts.uiMedium, lineHeight: 18, fontSize: 12, color: redesignColors.bone, opacity: 0.75 },
  weeklyCount: { fontFamily: redesignFonts.monoBold, fontVariant: ['tabular-nums'], lineHeight: 42, fontSize: 32, letterSpacing: -1, color: redesignColors.accent },
  weeklyTotal: { fontFamily: redesignFonts.mono, lineHeight: 26, fontSize: 18, color: redesignColors.ash },
  weekdays: { flexDirection: 'row', gap: 6, marginTop: 14 },
  weekdaysWrapped: { flexWrap: 'wrap' },
  day: { flex: 1, minWidth: 0, gap: 10, alignItems: 'center', paddingVertical: 5 },
  dayLarge: { flexGrow: 0, flexShrink: 0, flexBasis: '22%' },
  dayLabel: { alignItems: 'center' },
  dayLetter: { fontFamily: redesignFonts.uiMedium, lineHeight: 18, fontSize: 12, color: redesignColors.ash },
  todayLetter: { color: redesignColors.bone, fontFamily: redesignFonts.uiBold },
  todayDot: { position: 'absolute', bottom: -5, width: 3, height: 3, borderRadius: 1.5, backgroundColor: redesignColors.accent },
  dayMark: { minWidth: 28, minHeight: 28, borderRadius: 14, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center' },
  dayTrained: { backgroundColor: redesignColors.accent },
  dayPlanned: { backgroundColor: redesignColors.surface },
  dayCount: { fontFamily: redesignFonts.monoBold, lineHeight: 18, fontSize: 12, color: redesignColors.ink },
  dayDash: { fontFamily: redesignFonts.uiMedium, lineHeight: 20, fontSize: 14, color: redesignColors.ash },
  weeklyCaption: { fontFamily: redesignFonts.display, lineHeight: 30, fontSize: 24, letterSpacing: -0.6, color: redesignColors.bone },
  weeklyGoalPrompt: { fontFamily: redesignFonts.uiMedium, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  liftSection: { marginTop: 24 },
  sectionHeading: { marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  sectionTitle: { fontFamily: redesignFonts.uiSemiBold, lineHeight: 29, fontSize: 22, color: redesignColors.bone },
  textButton: { minHeight: 44, minWidth: 44, paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center' },
  textButtonLabel: { fontFamily: redesignFonts.uiSemiBold, lineHeight: 20, fontSize: 14, color: redesignColors.bone },
  cards: { flexDirection: 'row', gap: 12 },
  cardsStacked: { flexDirection: 'column' },
  viewAll: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  viewAllLabel: { fontFamily: redesignFonts.uiMedium, lineHeight: 20, fontSize: 14, color: redesignColors.ash },
  emptyBrand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  emptyEyebrow: { fontFamily: redesignFonts.mono, fontSize: 11, letterSpacing: 1.5, color: splitColors.chest },
  emptyState: { overflow: 'hidden', minHeight: 190, borderRadius: 22, backgroundColor: redesignColors.surface, padding: 20, justifyContent: 'center', gap: 8 },
  emptyTitle: { fontFamily: redesignFonts.display, lineHeight: 33, fontSize: 28, color: redesignColors.bone },
  emptyCopy: { fontFamily: redesignFonts.ui, lineHeight: 20, fontSize: 14, color: redesignColors.ash },
  emptyAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  preferenceError: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  destinations: { marginTop: 12 },
  destination: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: redesignColors.border },
  destinationLast: { borderBottomWidth: 0 },
  destinationIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: redesignColors.raised, alignItems: 'center', justifyContent: 'center' },
  destinationCopy: { flex: 1, minWidth: 0, gap: 3 },
  destinationTitle: { fontFamily: redesignFonts.uiSemiBold, lineHeight: 22, fontSize: 16, color: redesignColors.bone },
  destinationMeta: { fontFamily: redesignFonts.ui, lineHeight: 19, fontSize: 13, color: redesignColors.ash },
});
