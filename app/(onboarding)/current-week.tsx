import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  OnboardingBackButton,
  OnboardingNextButton,
  OnboardingProgress,
} from '@/components/OnboardingControls';
import {
  DEFAULT_WEIGHT_INCREMENT,
  DEFAULT_WEIGHT_INCREMENT_LBS,
  DEFAULT_WEIGHT_UNIT,
} from '@/store/workoutDatabase';
import { ExperienceLevel, useWorkoutStore } from '@/store/workoutStore';
import { redesignColors, redesignFonts, splitColors } from '@/constants/theme';
import '@/global.css';

const WEEKDAYS = [
  { label: 'Monday', index: 0 },
  { label: 'Tuesday', index: 1 },
  { label: 'Wednesday', index: 2 },
  { label: 'Thursday', index: 3 },
  { label: 'Friday', index: 4 },
  { label: 'Saturday', index: 5 },
  { label: 'Sunday', index: 6 },
] as const;

type Weekday = (typeof WEEKDAYS)[number];
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface WeekdayRowProps {
  weekday: Weekday;
  selected: boolean;
  disabled: boolean;
  onToggle: (index: number) => void;
}

function WeekdayRow({ weekday, selected, disabled, onToggle }: WeekdayRowProps) {
  const selection = useSharedValue(selected ? 1 : 0);
  const press = useSharedValue(0);

  useEffect(() => {
    selection.value = withTiming(selected ? 1 : 0, {
      duration: 180,
      easing: Easing.inOut(Easing.ease),
    });
  }, [selected, selection]);

  const containerStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      selection.value,
      [0, 1],
      [redesignColors.surface, `${splitColors.chest}1F`]
    ),
    borderColor: interpolateColor(
      selection.value,
      [0, 1],
      [redesignColors.border, splitColors.chest]
    ),
    transform: [{ scale: 1 - press.value * 0.02 }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      selection.value,
      [0, 1],
      [redesignColors.ash, redesignColors.bone]
    ),
  }));

  const checkboxStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      selection.value,
      [0, 1],
      ['transparent', splitColors.chest]
    ),
    borderColor: interpolateColor(
      selection.value,
      [0, 1],
      [redesignColors.hi, splitColors.chest]
    ),
  }));

  const handlePressIn = () => {
    press.value = withTiming(1, {
      duration: 150,
      easing: Easing.inOut(Easing.ease),
    });
    void Haptics.selectionAsync();
  };

  const handlePressOut = () => {
    press.value = withTiming(0, {
      duration: 150,
      easing: Easing.inOut(Easing.ease),
    });
  };

  return (
    <AnimatedPressable
      accessibilityRole="checkbox"
      accessibilityHint={disabled ? 'At least one rest day is required' : undefined}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={() => onToggle(weekday.index)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.dayRow, disabled && styles.dayRowDisabled, containerStyle]}
    >
      <Animated.Text style={[styles.dayLabel, textStyle]}>
        {weekday.label}
      </Animated.Text>
      <Animated.View style={[styles.checkbox, checkboxStyle]}>
        {selected ? (
          <Check color={redesignColors.ink} size={14} strokeWidth={3.5} />
        ) : null}
      </Animated.View>
    </AnimatedPressable>
  );
}

export default function CurrentWeek() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    name?: string;
    experienceLevel?: ExperienceLevel;
  }>();
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const setProfile = useWorkoutStore((state) => state.setProfile);

  const toggleDay = (index: number) => {
    setSelectedDays((current) => {
      if (current.includes(index)) {
        return current.filter((item) => item !== index);
      }
      return current.length < 6 ? [...current, index] : current;
    });
  };

  const handleFinish = () => {
    if (selectedDays.length === 0) {
      return;
    }

    setProfile({
      name: params.name ?? '',
      weeklyGoal: selectedDays.length,
      experienceLevel: params.experienceLevel ?? 'intermediate',
      trainingDays: [...selectedDays].sort((a, b) => a - b),
      onboardingCompleted: true,
      weightIncrement: DEFAULT_WEIGHT_INCREMENT,
      weightUnit: DEFAULT_WEIGHT_UNIT,
      weightIncrementLbs: DEFAULT_WEIGHT_INCREMENT_LBS,
      workoutsCompletedThisWeek: 0,
    });

    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.progressHeader}>
          <OnboardingProgress currentStep={4} />
        </View>
        <View style={styles.backControl}>
          <OnboardingBackButton />
        </View>

        <Text style={styles.heading}>Which days do you train?</Text>

        <View style={styles.dayList}>
          {WEEKDAYS.map((weekday) => (
            <WeekdayRow
              key={weekday.index}
              disabled={selectedDays.length >= 6 && !selectedDays.includes(weekday.index)}
              onToggle={toggleDay}
              selected={selectedDays.includes(weekday.index)}
              weekday={weekday}
            />
          ))}
        </View>

        <View pointerEvents="box-none" style={styles.footer}>
          <View accessibilityLiveRegion="polite" style={styles.goalIndicator}>
            <View style={styles.goalDot} />
            <Text style={styles.goalLabel}>
              Weekly goal{' '}
              <Text style={styles.goalValue}>
                {selectedDays.length} days/week
              </Text>
            </Text>
          </View>
          <OnboardingNextButton
            accessibilityLabel="Finish onboarding"
            disabled={selectedDays.length === 0}
            onPress={handleFinish}
            size={64}
          />
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
    paddingTop: 40,
    paddingHorizontal: 36,
    paddingBottom: 36,
  },
  progressHeader: {
    width: '100%',
    height: 4,
    marginBottom: 24,
  },
  backControl: {
    alignSelf: 'flex-start',
  },
  heading: {
    marginTop: 24,
    color: redesignColors.bone,
    fontFamily: redesignFonts.display,
    fontSize: 28,
    lineHeight: 30.25,
    letterSpacing: -0.28,
  },
  dayList: {
    marginTop: 14,
    gap: 8,
  },
  dayRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1.5,
    borderRadius: 13,
  },
  dayRowDisabled: {
    opacity: 0.42,
  },
  dayLabel: {
    flex: 1,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  footer: {
    position: 'absolute',
    right: 36,
    bottom: 36,
    left: 36,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalIndicator: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: splitColors.chest,
  },
  goalLabel: {
    color: redesignColors.ash,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 12,
  },
  goalValue: {
    color: redesignColors.bone,
    fontFamily: redesignFonts.uiBold,
  },
});
