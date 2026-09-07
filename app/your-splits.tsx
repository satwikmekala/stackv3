import { useCallback, useEffect, useRef } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
  ReduceMotion,
} from 'react-native-reanimated';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react-native';

import { motionDuration, motionEasing } from '@/constants/motion';
import { redesignColors, redesignFonts, splitColors } from '@/constants/theme';
import { usePressScale } from '@/hooks/usePressScale';
import {
  MUSCLE_GROUP_COLORS,
  getMuscleGroupForExercise,
  getWorkoutLetter,
  useCustomSplitDraftStore,
} from '@/store/customSplitDraft';
import { useWorkoutStore } from '@/store/workoutStore';
import type { CustomSplit, CustomSplitSummary } from '@/store/customSplits';
import '@/global.css';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const alpha = (color: string, opacity: string) => `${color}${opacity}`;

const plural = (count: number, noun: string) => `${noun}${count === 1 ? '' : 's'}`;

const DAY_MS = 24 * 60 * 60 * 1000;

const PROGRAM_LAYOUT = LinearTransition.duration(motionDuration.transition)
  .easing(motionEasing.decelerate)
  .reduceMotion(ReduceMotion.System);
const ACTIVE_DETAIL_ENTER = FadeInDown.duration(motionDuration.transition)
  .easing(motionEasing.decelerate)
  .withInitialValues({
    opacity: 0,
    transform: [{ translateY: 4 }],
  })
  .reduceMotion(ReduceMotion.System);
const ACTIVE_DETAIL_EXIT = FadeOut.duration(motionDuration.feedback)
  .easing(motionEasing.accelerate)
  .reduceMotion(ReduceMotion.System);

/**
 * "edited today" / "edited 3d ago", falling back to a compact date for older
 * splits. Returns null for missing or unparseable timestamps so the caller can
 * drop the segment instead of rendering "Invalid Date".
 */
const formatEditedLabel = (timestamp: string | undefined): string | null => {
  if (!timestamp) return null;
  const edited = Date.parse(timestamp);
  if (Number.isNaN(edited)) return null;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const editedDay = new Date(edited);
  editedDay.setHours(0, 0, 0, 0);

  const days = Math.round((startOfToday.getTime() - editedDay.getTime()) / DAY_MS);
  if (days <= 0) return 'edited today';
  if (days < 30) return `edited ${days}d ago`;
  return `edited ${editedDay.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })}`;
};

const workoutAccent = (workout: CustomSplit['workouts'][number]): string => {
  const exercise = workout.exercises[0];
  return exercise
    ? MUSCLE_GROUP_COLORS[getMuscleGroupForExercise(exercise)]
    : redesignColors.ash;
};

interface ActiveSplitCardProps {
  animateDetail: boolean;
  detail: CustomSplit | null;
  onEdit: () => void;
  summary: CustomSplitSummary;
}

function ActiveSplitCard({
  animateDetail,
  detail,
  onEdit,
  summary,
}: ActiveSplitCardProps) {
  const edited = formatEditedLabel(summary.updatedAt);
  const meta = [
    `${summary.workoutCount} ${plural(summary.workoutCount, 'workout')}`,
    `${summary.exerciseCount} ${plural(summary.exerciseCount, 'exercise')}`,
    ...(edited ? [edited] : []),
  ].join(' · ');

  return (
    <Pressable
      accessibilityHint="Opens this split in the builder"
      accessibilityLabel={`Edit ${summary.name}`}
      accessibilityRole="button"
      onPress={onEdit}
      style={styles.activeCardContent}
    >
      <View style={styles.activeCardHeader}>
        <View style={styles.activePill}>
          <Text style={styles.activePillText}>ACTIVE</Text>
        </View>
        <ChevronRight
          accessibilityElementsHidden
          color={redesignColors.ash}
          importantForAccessibility="no"
          size={22}
          strokeWidth={2.4}
        />
      </View>

      <Text style={styles.activeName}>{summary.name}</Text>
      <Text style={styles.activeMeta}>{meta}</Text>

      {detail && detail.id === summary.id && detail.workouts.length > 0 ? (
        <Animated.View
          entering={animateDetail ? ACTIVE_DETAIL_ENTER : undefined}
          exiting={ACTIVE_DETAIL_EXIT}
        >
          <View style={styles.activeDivider} />
          <View style={styles.workoutRows}>
            {detail.workouts.map((workout, index) => {
              const accent = workoutAccent(workout);
              return (
                <View key={workout.id} style={styles.workoutRow}>
                  <View
                    style={[styles.workoutBadge, { backgroundColor: alpha(accent, '26') }]}
                  >
                    <Text style={[styles.workoutBadgeText, { color: accent }]}>
                      {getWorkoutLetter(index)}
                    </Text>
                  </View>
                  <Text numberOfLines={1} style={styles.workoutName}>
                    {workout.name}
                  </Text>
                  <Text style={styles.workoutCount}>{workout.exercises.length}</Text>
                </View>
              );
            })}
          </View>
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

interface ActivateButtonProps {
  accessibilityLabel: string;
  onPress: () => void;
}

function ActivateButton({ accessibilityLabel, onPress }: ActivateButtonProps) {
  const pressScale = usePressScale();

  return (
    <AnimatedPressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={pressScale.onPressIn}
      onPressOut={pressScale.onPressOut}
      style={[styles.activateButton, pressScale.animatedStyle]}
    >
      <Text style={styles.activateText}>Activate</Text>
    </AnimatedPressable>
  );
}

interface InactiveSplitCardProps {
  onActivate: () => void;
  onEdit: () => void;
  summary: CustomSplitSummary;
}

function InactiveSplitCard({ onActivate, onEdit, summary }: InactiveSplitCardProps) {
  return (
    <View style={styles.inactiveCardContent}>
      {/* The copy is the edit target so Activate keeps its own tap area. */}
      <Pressable
        accessibilityHint="Opens this split in the builder"
        accessibilityLabel={`Edit ${summary.name}`}
        accessibilityRole="button"
        onPress={onEdit}
        style={styles.inactiveCopy}
      >
        <Text numberOfLines={1} style={styles.inactiveName}>{summary.name}</Text>
        <Text style={styles.inactiveMeta}>
          {`${summary.workoutCount} ${plural(summary.workoutCount, 'workout')} · ${summary.exerciseCount} ex`}
        </Text>
      </Pressable>
      <ActivateButton
        accessibilityLabel={`Activate ${summary.name}`}
        onPress={onActivate}
      />
    </View>
  );
}

type SplitProgram =
  | { key: 'stack'; kind: 'stack' }
  | { key: number; kind: 'custom'; summary: CustomSplitSummary };

interface ProgramCardProps {
  animateContent: boolean;
  detail: CustomSplit | null;
  isActive: boolean;
  onActivate: (splitId: number | null) => void;
  onEdit: (splitId: number) => void;
  program: SplitProgram;
  stackWorkouts: number;
}

/**
 * One stable outer card per program. Activation only changes this card's
 * content and position; it never swaps the keyed program object itself.
 */
function ProgramCard({
  animateContent,
  detail,
  isActive,
  onActivate,
  onEdit,
  program,
  stackWorkouts,
}: ProgramCardProps) {
  const cardStyle = program.kind === 'custom' && isActive
    ? styles.activeCard
    : program.kind === 'stack' && isActive
      ? styles.stackActiveCard
      : styles.inactiveCard;

  return (
    <Animated.View layout={PROGRAM_LAYOUT} style={cardStyle}>
      {program.kind === 'stack' ? (
        isActive ? (
          <View style={styles.stackActiveCardContent}>
            <View style={styles.stackIcon}>
              <Zap color={splitColors.chest} size={22} strokeWidth={2.4} />
            </View>
            <View style={styles.stackCopy}>
              <Text style={styles.stackActiveLabel}>CURRENTLY ACTIVE</Text>
              <Text style={styles.stackActiveName}>
                {`Stack's split · ${stackWorkouts} ${plural(stackWorkouts, 'workout')}`}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.inactiveCardContent}>
            <View style={styles.inactiveCopy}>
              <Text numberOfLines={1} style={styles.inactiveName}>Stack&apos;s split</Text>
              <Text style={styles.inactiveMeta}>
                {`Auto-generated · ${stackWorkouts} ${plural(stackWorkouts, 'workout')}`}
              </Text>
            </View>
            <ActivateButton
              accessibilityLabel="Activate Stack's split"
              onPress={() => onActivate(null)}
            />
          </View>
        )
      ) : isActive ? (
        <ActiveSplitCard
          animateDetail={animateContent}
          detail={detail}
          onEdit={() => onEdit(program.summary.id)}
          summary={program.summary}
        />
      ) : (
        <InactiveSplitCard
          onActivate={() => onActivate(program.summary.id)}
          onEdit={() => onEdit(program.summary.id)}
          summary={program.summary}
        />
      )}
    </Animated.View>
  );
}

export default function YourSplitsScreen() {
  const router = useRouter();
  const profile = useWorkoutStore((state) => state.profile);
  const customSplits = useWorkoutStore((state) => state.customSplits);
  const currentCustomSplit = useWorkoutStore((state) => state.currentCustomSplit);
  const refreshCustomSplits = useWorkoutStore((state) => state.refreshCustomSplits);
  const loadCustomSplit = useWorkoutStore((state) => state.loadCustomSplit);
  const setActiveSplit = useWorkoutStore((state) => state.setActiveSplit);
  const discardDraft = useCustomSplitDraftStore((state) => state.discardDraft);
  const hasMountedPrograms = useRef(false);

  const activeSplitId = profile?.activeSplitId ?? null;

  useFocusEffect(
    useCallback(() => {
      void refreshCustomSplits();
    }, [refreshCustomSplits])
  );

  useEffect(() => {
    if (activeSplitId === null) return;
    if (currentCustomSplit?.id === activeSplitId) return;
    void loadCustomSplit(activeSplitId);
  }, [activeSplitId, currentCustomSplit?.id, loadCustomSplit]);

  useEffect(() => {
    hasMountedPrograms.current = true;
  }, []);

  if (!profile) {
    return <SafeAreaView style={styles.safeArea} />;
  }

  const activeSummary =
    customSplits.find((split) => split.id === activeSplitId) ?? null;
  // activeSplitId is the only source of truth; a dangling id resolves to no
  // active custom split rather than promoting the most recently edited one.
  const stackIsActive = activeSplitId === null || activeSummary === null;
  const stackWorkouts = profile.weeklyGoal;
  const programs: SplitProgram[] = [
    ...customSplits.map((summary): SplitProgram => ({
      key: summary.id,
      kind: 'custom',
      summary,
    })),
    { key: 'stack', kind: 'stack' },
  ];
  const orderedPrograms = programs.sort((left, right) => {
    const leftIsActive = left.kind === 'stack'
      ? stackIsActive
      : left.summary.id === activeSummary?.id;
    const rightIsActive = right.kind === 'stack'
      ? stackIsActive
      : right.summary.id === activeSummary?.id;
    return Number(rightIsActive) - Number(leftIsActive);
  });

  const activateSplit = (splitId: number | null) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setActiveSplit(splitId);
  };

  const editSplit = (splitId: number) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Any leftover draft is dropped so the builder hydrates this split cleanly.
    discardDraft();
    router.push({
      pathname: '/custom-split',
      params: { source: 'library', splitId: String(splitId) },
    });
  };

  const startNewSplit = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // A creation flow always starts clean — an abandoned draft must never leak
    // into the next split.
    discardDraft();
    router.push({ pathname: '/custom-split', params: { source: 'library' } });
  };

  const header = (
    <>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Back to profile"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={styles.circleButton}
        >
          <ChevronLeft color={redesignColors.bone} size={22} strokeWidth={2.3} />
        </Pressable>
        <Text style={styles.eyebrow}>TRAINING</Text>
      </View>
      <Text style={styles.title}>Your splits</Text>
    </>
  );

  if (customSplits.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.screen}>
          <View style={styles.headerBlock}>{header}</View>

          <View style={styles.emptyBody}>
            <View style={styles.emptyStackCard}>
              <ProgramCard
                animateContent={hasMountedPrograms.current}
                detail={null}
                isActive
                onActivate={activateSplit}
                onEdit={editSplit}
                program={{ key: 'stack', kind: 'stack' }}
                stackWorkouts={stackWorkouts}
              />
            </View>

            <View style={styles.emptyCenter}>
              <View style={styles.emptyGlyph}>
                {[0, 1, 2].map((index) => (
                  <View key={index} style={styles.emptyGlyphBar} />
                ))}
              </View>
              <Text style={styles.emptyTitle}>No splits of your{`\n`}own yet</Text>
              <Text style={styles.emptyCopy}>
                Already follow a program? Build it once, exercise by exercise, and Stack
                will run it with you.
              </Text>
            </View>
          </View>

          <View style={styles.bottomBar}>
            <Pressable
              accessibilityLabel="Build a split"
              accessibilityRole="button"
              onPress={startNewSplit}
              style={styles.buildButton}
            >
              <Text style={styles.buildButtonText}>Build a split</Text>
            </Pressable>
            <Text style={styles.buildHint}>Takes about two minutes.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.headerBlock}>{header}</View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          {orderedPrograms.map((program) => {
            const isActive = program.kind === 'stack'
              ? stackIsActive
              : program.summary.id === activeSummary?.id;
            return (
              <ProgramCard
                key={program.key}
                animateContent={hasMountedPrograms.current}
                detail={currentCustomSplit}
                isActive={isActive}
                onActivate={activateSplit}
                onEdit={editSplit}
                program={program}
                stackWorkouts={stackWorkouts}
              />
            );
          })}
        </ScrollView>

        <View style={styles.bottomBar}>
          <Pressable
            accessibilityLabel="Create a new split"
            accessibilityRole="button"
            onPress={startNewSplit}
            style={styles.newSplitButton}
          >
            <Text style={styles.newSplitPlus}>+</Text>
            <Text style={styles.newSplitText}>New split</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: redesignColors.ink,
  },
  screen: {
    flex: 1,
    paddingTop: 12,
  },
  headerBlock: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: redesignColors.surface,
    borderWidth: 1,
    borderColor: redesignColors.border,
  },
  eyebrow: {
    color: redesignColors.ashDim,
    fontFamily: redesignFonts.monoBold,
    fontSize: 13,
    letterSpacing: 2.4,
  },
  title: {
    marginTop: 24,
    color: redesignColors.bone,
    fontFamily: redesignFonts.display,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.6,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
  },
  activeCard: {
    borderRadius: 22,
    backgroundColor: alpha(splitColors.chest, '0F'),
    borderWidth: 1.5,
    borderColor: splitColors.chest,
  },
  activeCardContent: {
    padding: 20,
  },
  activeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activePill: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 8,
    backgroundColor: alpha(splitColors.chest, '2E'),
  },
  activePillText: {
    color: splitColors.chest,
    fontFamily: redesignFonts.monoBold,
    fontSize: 12,
    letterSpacing: 1.6,
  },
  activeName: {
    marginTop: 14,
    color: redesignColors.bone,
    fontFamily: redesignFonts.display,
    fontSize: 27,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  activeMeta: {
    marginTop: 6,
    color: redesignColors.ash,
    fontFamily: redesignFonts.ui,
    fontSize: 15,
    lineHeight: 22,
  },
  activeDivider: {
    height: 1,
    marginTop: 16,
    marginBottom: 14,
    backgroundColor: alpha(splitColors.chest, '33'),
  },
  workoutRows: {
    gap: 12,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  workoutBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutBadgeText: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 13,
  },
  workoutName: {
    minWidth: 0,
    flex: 1,
    color: redesignColors.bone,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 17,
  },
  workoutCount: {
    color: redesignColors.ash,
    fontFamily: redesignFonts.mono,
    fontSize: 15,
  },
  inactiveCard: {
    borderRadius: 20,
    backgroundColor: redesignColors.surface,
    borderWidth: 1,
    borderColor: redesignColors.border,
  },
  inactiveCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
  },
  inactiveCopy: {
    minWidth: 0,
    flex: 1,
  },
  inactiveName: {
    color: redesignColors.bone,
    fontFamily: redesignFonts.display,
    fontSize: 21,
    letterSpacing: -0.25,
  },
  inactiveMeta: {
    marginTop: 5,
    color: redesignColors.ash,
    fontFamily: redesignFonts.ui,
    fontSize: 15,
  },
  activateButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: redesignColors.raised,
    borderWidth: 1,
    borderColor: redesignColors.border,
  },
  activateText: {
    color: redesignColors.bone,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 16,
  },
  stackActiveCard: {
    borderRadius: 20,
    backgroundColor: redesignColors.surface,
    borderWidth: 1,
    borderColor: redesignColors.border,
  },
  stackActiveCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
  },
  stackIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha(splitColors.chest, '24'),
  },
  stackCopy: {
    minWidth: 0,
    flex: 1,
  },
  stackActiveLabel: {
    color: splitColors.chest,
    fontFamily: redesignFonts.monoBold,
    fontSize: 12,
    letterSpacing: 1.6,
  },
  stackActiveName: {
    marginTop: 6,
    color: redesignColors.bone,
    fontFamily: redesignFonts.uiBold,
    fontSize: 19,
    lineHeight: 25,
  },
  emptyBody: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  emptyStackCard: {
    marginBottom: 8,
  },
  emptyCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGlyph: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 30,
  },
  emptyGlyphBar: {
    width: 52,
    height: 116,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: redesignColors.border,
  },
  emptyTitle: {
    textAlign: 'center',
    color: redesignColors.bone,
    fontFamily: redesignFonts.display,
    fontSize: 33,
    lineHeight: 38,
    letterSpacing: -0.4,
  },
  emptyCopy: {
    maxWidth: 320,
    marginTop: 14,
    textAlign: 'center',
    color: redesignColors.ash,
    fontFamily: redesignFonts.ui,
    fontSize: 16,
    lineHeight: 24,
  },
  bottomBar: {
    paddingTop: 10,
    paddingHorizontal: 24,
    paddingBottom: 14,
    gap: 10,
  },
  buildButton: {
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: splitColors.chest,
  },
  buildButtonText: {
    color: redesignColors.ink,
    fontFamily: redesignFonts.display,
    fontSize: 24,
    letterSpacing: -0.3,
  },
  buildHint: {
    textAlign: 'center',
    color: redesignColors.ashDim,
    fontFamily: redesignFonts.ui,
    fontSize: 14,
  },
  newSplitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 68,
    borderRadius: 24,
    backgroundColor: redesignColors.surface,
    borderWidth: 1,
    borderColor: redesignColors.border,
  },
  newSplitPlus: {
    color: splitColors.chest,
    fontFamily: redesignFonts.uiBold,
    fontSize: 26,
    lineHeight: 30,
  },
  newSplitText: {
    color: redesignColors.bone,
    fontFamily: redesignFonts.display,
    fontSize: 22,
    letterSpacing: -0.25,
  },
});
