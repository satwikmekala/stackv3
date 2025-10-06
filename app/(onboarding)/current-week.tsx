import React, { useMemo, useState } from 'react';
import { SafeAreaView, Text, View, Pressable, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useWorkoutStore, IntensityLevel } from '@/store/workoutStore';
import '@/global.css';

const WORKOUT_PILLS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Legs',
  'Core',
  'Full Body',
] as const;

type WorkoutSelection = (typeof WORKOUT_PILLS)[number];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedText = Animated.createAnimatedComponent(Text);

interface WorkoutPillProps {
  label: WorkoutSelection;
  isSelected: boolean;
  onToggle: (label: WorkoutSelection) => void;
}

function WorkoutPill({ label, isSelected, onToggle }: WorkoutPillProps) {
  const selection = useSharedValue(isSelected ? 1 : 0);
  const press = useSharedValue(0);

  React.useEffect(() => {
    selection.value = withTiming(isSelected ? 1 : 0, {
      duration: 180,
      easing: Easing.inOut(Easing.ease),
    });
  }, [isSelected, selection]);

  const handlePressIn = () => {
    press.value = withTiming(1, { duration: 150, easing: Easing.inOut(Easing.ease) });
    void Haptics.selectionAsync();
  };

  const handlePressOut = () => {
    press.value = withTiming(0, { duration: 150, easing: Easing.inOut(Easing.ease) });
  };

  const animatedContainer = useAnimatedStyle(() => ({
    backgroundColor: 'transparent',
    borderColor: interpolateColor(selection.value, [0, 1], ['#484848', '#07e94b']),
    transform: [{ scale: 1 - press.value * 0.02 }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(selection.value, [0, 1], ['#FFFFFF', '#07e94b']),
  }));

  return (
    <AnimatedPressable
      onPress={() => onToggle(label)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        {
          borderRadius: 999,
          borderWidth: 1.5,
          paddingVertical: 14,
          paddingHorizontal: 20,
          marginBottom: 16,
          flexBasis: '48%',
          alignItems: 'center',
        },
        animatedContainer,
      ]}
    >
      <AnimatedText
        style={[
          {
            fontSize: 16,
            fontWeight: '600',
          },
          textStyle,
        ]}
      >
        {label}
      </AnimatedText>
    </AnimatedPressable>
  );
}

export default function CurrentWeek() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedWorkouts, setSelectedWorkouts] = useState<WorkoutSelection[]>([]);
  const [isFabPressed, setIsFabPressed] = useState(false);
  const setProfile = useWorkoutStore((state) => state.setProfile);

  const toggleWorkout = (label: WorkoutSelection) => {
    setSelectedWorkouts((current) => {
      if (current.includes(label)) {
        return current.filter((item) => item !== label);
      }
      return [...current, label];
    });
  };

  const handleFinish = () => {
    setProfile({
      name: params.name as string,
      weeklyGoal: parseInt(params.weeklyGoal as string),
      preferredIntensity: params.preferredIntensity as IntensityLevel,
      onboardingCompleted: true,
      workoutsCompletedThisWeek: selectedWorkouts.length,
    });

    router.push({
      pathname: '/(tabs)',
      params: { completedWorkouts: JSON.stringify(selectedWorkouts) },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background relative">
      <View className="flex-1 px-12">
        <View className="pt-24">
          <Text
            className="text-text font-bold text-left"
            style={{ fontSize: 30, letterSpacing: -0.28 }}
          >
            {`done any workouts\nthis week ?`}
          </Text>
          <Text
            className="text-text-secondary mt-3"
            style={{ fontSize: 17, color: '#B6B6B6' }}
          >
            Help us catch up on your progress
          </Text>
          <Text
            className="text-text-tertiary mt-4"
            style={{ fontSize: 14, color: '#7A7A7A' }}
          >
            Select all that apply
          </Text>
        </View>

        <View className="mt-12 flex-row flex-wrap justify-between">
          {WORKOUT_PILLS.map((label) => (
            <WorkoutPill
              key={label}
              label={label}
              isSelected={selectedWorkouts.includes(label)}
              onToggle={toggleWorkout}
            />
          ))}
        </View>
      </View>

      <TouchableOpacity
        onPress={handleFinish}
        onPressIn={() => setIsFabPressed(true)}
        onPressOut={() => setIsFabPressed(false)}
        className="absolute bottom-24 right-10 w-16 h-16 rounded-full items-center justify-center"
        style={{
          backgroundColor: isFabPressed ? '#00FF95' : '#343434',
          borderWidth: 1,
          borderColor: isFabPressed ? '#00FF95' : '#484848',
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
      >
        <ArrowRight size={28} color={isFabPressed ? '#000000' : '#FFFFFF'} strokeWidth={2.5} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
