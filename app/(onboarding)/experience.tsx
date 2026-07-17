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
import { ExperienceLevel } from '@/store/workoutStore';
import { redesignColors, redesignFonts, splitColors } from '@/constants/theme';
import '@/global.css';

const EXPERIENCE_OPTIONS: {
  value: ExperienceLevel;
  title: string;
  description: string;
  level: number;
}[] = [
  {
    value: 'beginner',
    title: 'Beginner',
    description: 'New to lifting, or just back.',
    level: 1,
  },
  {
    value: 'intermediate',
    title: 'Intermediate',
    description: 'Training steadily for 6+ months.',
    level: 2,
  },
  {
    value: 'advanced',
    title: 'Advanced',
    description: 'Years in, chasing numbers.',
    level: 3,
  },
];

const BAR_HEIGHTS = [8, 14, 20] as const;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ExperienceRowProps {
  option: (typeof EXPERIENCE_OPTIONS)[number];
  selected: boolean;
  onSelect: (value: ExperienceLevel) => void;
}

function ExperienceRow({ option, selected, onSelect }: ExperienceRowProps) {
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
    shadowOpacity: selection.value * 0.2,
    elevation: selection.value * 4,
    transform: [{ scale: 1 - press.value * 0.02 }],
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
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
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={() => onSelect(option.value)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.optionRow, containerStyle]}
    >
      <View style={styles.levelMeter}>
        {BAR_HEIGHTS.map((height, index) => (
          <View
            key={height}
            style={{
              width: 5,
              height,
              borderRadius: 2,
              backgroundColor:
                index < option.level
                  ? selected
                    ? splitColors.chest
                    : redesignColors.ash
                  : redesignColors.hi,
            }}
          />
        ))}
      </View>

      <View style={styles.optionCopy}>
        <Text style={styles.optionTitle}>{option.title}</Text>
        <Text numberOfLines={1} style={styles.optionDescription}>
          {option.description}
        </Text>
      </View>

      <Animated.View style={[styles.selectionIndicator, indicatorStyle]}>
        {selected ? (
          <Check color={redesignColors.ink} size={14} strokeWidth={3.5} />
        ) : null}
      </Animated.View>
    </AnimatedPressable>
  );
}

export default function Experience() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string }>();
  const [selectedLevel, setSelectedLevel] = useState<ExperienceLevel | null>(null);

  const handleContinue = () => {
    if (!selectedLevel) {
      return;
    }

    router.push({
      pathname: '/(onboarding)/current-week',
      params: { name: params.name ?? '', experienceLevel: selectedLevel },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.progressHeader}>
          <OnboardingProgress currentStep={3} />
        </View>
        <View style={styles.backControl}>
          <OnboardingBackButton />
        </View>

        <Text style={styles.heading}>How long have you been training?</Text>

        <View accessibilityRole="radiogroup" style={styles.options}>
          {EXPERIENCE_OPTIONS.map((option) => (
            <ExperienceRow
              key={option.value}
              onSelect={setSelectedLevel}
              option={option}
              selected={selectedLevel === option.value}
            />
          ))}
        </View>

        <View pointerEvents="box-none" style={styles.footer}>
          <OnboardingNextButton
            disabled={!selectedLevel}
            onPress={handleContinue}
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
    maxWidth: 330,
    marginTop: 30,
    color: redesignColors.bone,
    fontFamily: redesignFonts.display,
    fontSize: 30,
    lineHeight: 32.4,
    letterSpacing: -0.3,
  },
  options: {
    marginTop: 26,
    gap: 11,
  },
  optionRow: {
    width: '100%',
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderRadius: 16,
    shadowColor: splitColors.chest,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  levelMeter: {
    height: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  optionCopy: {
    minWidth: 0,
    flex: 1,
  },
  optionTitle: {
    color: redesignColors.bone,
    fontFamily: redesignFonts.uiBold,
    fontSize: 16,
  },
  optionDescription: {
    marginTop: 2,
    color: redesignColors.ash,
    fontFamily: redesignFonts.ui,
    fontSize: 11.5,
    lineHeight: 15.5,
  },
  selectionIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  footer: {
    position: 'absolute',
    right: 36,
    bottom: 36,
  },
});
