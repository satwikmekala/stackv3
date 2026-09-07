import { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  OnboardingBackButton,
  OnboardingNextButton,
  OnboardingProgress,
} from '@/components/OnboardingControls';
import {
  ARCHETYPE_COMPOSITIONS,
  getWeeklyArchetypeSequence,
  type Archetype,
} from '@/constants/archetypes';
import { redesignColors, redesignFonts, splitColors } from '@/constants/theme';
import { usePressScale } from '@/hooks/usePressScale';
import { useWorkoutStore } from '@/store/workoutStore';
import '@/global.css';

type SplitChoice = 'stack' | 'custom';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const WORKOUT_BADGE_COLORS = [
  splitColors.chest,
  splitColors.legs,
  splitColors.back,
  splitColors.core,
  splitColors.shoulders,
  splitColors.arms,
] as const;

function alpha(color: string, opacity: string) {
  return `${color}${opacity}`;
}

function getWorkoutLabels(sequence: Archetype[]): string[] {
  const totals = sequence.reduce<Partial<Record<Archetype, number>>>((counts, archetype) => {
    counts[archetype] = (counts[archetype] ?? 0) + 1;
    return counts;
  }, {});
  const occurrences: Partial<Record<Archetype, number>> = {};

  return sequence.map((archetype) => {
    const occurrence = (occurrences[archetype] ?? 0) + 1;
    occurrences[archetype] = occurrence;
    const baseLabel = ARCHETYPE_COMPOSITIONS[archetype].shortLabel;
    return totals[archetype] && totals[archetype]! > 1
      ? `${baseLabel} ${String.fromCharCode(64 + occurrence)}`
      : baseLabel;
  });
}

interface ChoiceCardProps {
  accessibilityLabel: string;
  children: React.ReactNode;
  onPress: () => void;
  selected: boolean;
}

function ChoiceCard({
  accessibilityLabel,
  children,
  onPress,
  selected,
}: ChoiceCardProps) {
  const pressScale = usePressScale('surface');

  const handlePressIn = () => {
    pressScale.onPressIn();
    void Haptics.selectionAsync();
  };

  return (
    <AnimatedPressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={pressScale.onPressOut}
      style={[
        styles.choiceCard,
        selected ? styles.choiceCardSelected : styles.choiceCardUnselected,
        pressScale.animatedStyle,
      ]}
    >
      <View style={styles.choiceContent}>{children}</View>
      <View
        accessibilityElementsHidden
        style={[
          styles.selectionIndicator,
          selected && styles.selectionIndicatorSelected,
        ]}
      >
        {selected ? (
          <Check color={redesignColors.ink} size={18} strokeWidth={3.4} />
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

export default function SplitChoiceScreen() {
  const router = useRouter();
  const profile = useWorkoutStore((state) => state.profile);
  const updateProfile = useWorkoutStore((state) => state.updateProfile);
  const [selectedChoice, setSelectedChoice] = useState<SplitChoice>('stack');

  const workoutLabels = useMemo(() => {
    if (!profile) return [];
    return getWorkoutLabels(
      getWeeklyArchetypeSequence(profile.weeklyGoal, profile.experienceLevel)
    );
  }, [profile]);

  const handleContinue = () => {
    if (selectedChoice === 'custom') {
      router.push({
        pathname: '/custom-split',
        params: { source: 'onboarding' },
      });
      return;
    }

    if (!profile) return;
    updateProfile({ activeSplitId: null, onboardingCompleted: true });
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <OnboardingBackButton />
          <View style={styles.progressHeader}>
            <OnboardingProgress currentStep={5} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heading}>Your split is set. But it&apos;s yours.</Text>
          <Text style={styles.subtitle}>
            We&apos;ve customized a split from your training goals — but you can choose.
          </Text>

          <View accessibilityRole="radiogroup" style={styles.choices}>
            <ChoiceCard
              accessibilityLabel="Continue with Stack's split"
              onPress={() => setSelectedChoice('stack')}
              selected={selectedChoice === 'stack'}
            >
              <Text style={styles.eyebrow}>STACK&apos;S PICK</Text>
              <Text style={styles.cardTitle}>Continue with Stack&apos;s split</Text>
              <Text style={styles.cardDescription}>
                {profile?.weeklyGoal ?? 0} workouts a week
              </Text>

              <View style={styles.divider} />
              <View style={styles.workoutList}>
                {workoutLabels.map((label, index) => {
                  const badgeColor = WORKOUT_BADGE_COLORS[index % WORKOUT_BADGE_COLORS.length];
                  return (
                    <View key={`${label}-${index}`} style={styles.workoutRow}>
                      <View
                        style={[
                          styles.workoutBadge,
                          { backgroundColor: alpha(badgeColor, '26') },
                        ]}
                      >
                        <Text style={[styles.workoutBadgeText, { color: badgeColor }]}>
                          {String.fromCharCode(65 + index)}
                        </Text>
                      </View>
                      <Text style={styles.workoutName}>{label}</Text>
                    </View>
                  );
                })}
              </View>
            </ChoiceCard>

            <Text style={styles.customizableNote}>
              Exercises are customizable inside the split.
            </Text>

            <ChoiceCard
              accessibilityLabel="Customize your own split"
              onPress={() => setSelectedChoice('custom')}
              selected={selectedChoice === 'custom'}
            >
              <Text style={styles.cardTitle}>Customize your own split</Text>
              <Text style={styles.cardDescription}>
                Full agency — build your own workouts and exercises.
              </Text>
            </ChoiceCard>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerNote}>You can change your split anytime.</Text>
            <OnboardingNextButton
              accessibilityLabel={
                selectedChoice === 'stack'
                  ? "Continue with Stack's split"
                  : 'Continue to custom split builder'
              }
              disabled={!profile}
              onPress={handleContinue}
              size={64}
            />
          </View>
        </ScrollView>
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
    paddingTop: 32,
    paddingHorizontal: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  progressHeader: {
    minWidth: 0,
    flex: 1,
    height: 4,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 36,
    paddingBottom: 28,
  },
  heading: {
    maxWidth: 340,
    color: redesignColors.bone,
    fontFamily: redesignFonts.display,
    fontSize: 39,
    lineHeight: 42,
    letterSpacing: -0.55,
  },
  subtitle: {
    maxWidth: 335,
    marginTop: 24,
    color: redesignColors.ash,
    fontFamily: redesignFonts.ui,
    fontSize: 17,
    lineHeight: 25,
  },
  choices: {
    marginTop: 30,
  },
  choiceCard: {
    minHeight: 126,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderWidth: 1.5,
    borderRadius: 24,
  },
  choiceCardSelected: {
    backgroundColor: alpha(splitColors.chest, '12'),
    borderColor: splitColors.chest,
  },
  choiceCardUnselected: {
    backgroundColor: redesignColors.surface,
    borderColor: redesignColors.border,
  },
  choiceContent: {
    minWidth: 0,
    flex: 1,
  },
  selectionIndicator: {
    width: 32,
    height: 32,
    marginTop: 34,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: redesignColors.hi,
  },
  selectionIndicatorSelected: {
    backgroundColor: splitColors.chest,
    borderColor: splitColors.chest,
  },
  eyebrow: {
    marginBottom: 11,
    color: splitColors.chest,
    fontFamily: redesignFonts.monoBold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 2.1,
  },
  cardTitle: {
    maxWidth: 230,
    color: redesignColors.bone,
    fontFamily: redesignFonts.display,
    fontSize: 25,
    lineHeight: 27,
    letterSpacing: -0.25,
  },
  cardDescription: {
    maxWidth: 250,
    marginTop: 8,
    color: redesignColors.ash,
    fontFamily: redesignFonts.ui,
    fontSize: 16,
    lineHeight: 23,
  },
  divider: {
    height: 1,
    marginTop: 20,
    marginBottom: 16,
    backgroundColor: redesignColors.border,
  },
  workoutList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 14,
    rowGap: 10,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  workoutBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutBadgeText: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 12,
  },
  workoutName: {
    color: redesignColors.bone,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 17,
  },
  customizableNote: {
    marginVertical: 10,
    paddingHorizontal: 5,
    color: redesignColors.ashDim,
    fontFamily: redesignFonts.ui,
    fontSize: 13.5,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 20,
    marginTop: 24,
  },
  footerNote: {
    minWidth: 0,
    flex: 1,
    paddingBottom: 4,
    color: redesignColors.ashDim,
    fontFamily: redesignFonts.ui,
    fontSize: 15,
    lineHeight: 22,
  },
});
