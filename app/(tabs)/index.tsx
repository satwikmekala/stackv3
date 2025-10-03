import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useWorkoutStore, WorkoutType } from '@/store/workoutStore';
import { Button } from '@/components/Button';
import { WeekStreak } from '@/components/WeekStreak';
import { MotivationQuote } from '@/components/MotivationQuote';
import '@/global.css';

const WORKOUT_LABELS: Record<WorkoutType, string> = {
  push: 'Push Day',
  pull: 'Pull Day',
  legs: 'Legs Day',
  abs: 'Abs Day',
};

const WORKOUT_DESCRIPTIONS: Record<WorkoutType, string> = {
  push: 'Chest, shoulders, triceps',
  pull: 'Back, biceps',
  legs: 'Squats, lunges, calves',
  abs: 'Core work',
};

export default function Home() {
  const router = useRouter();
  const profile = useWorkoutStore((state) => state.profile);
  const getNextWorkoutType = useWorkoutStore((state) => state.getNextWorkoutType);
  const getWeeklyProgress = useWorkoutStore((state) => state.getWeeklyProgress);
  const getWeekStreak = useWorkoutStore((state) => state.getWeekStreak);
  const startWorkout = useWorkoutStore((state) => state.startWorkout);

  const [selectedType, setSelectedType] = useState<WorkoutType>(getNextWorkoutType());
  const progress = getWeeklyProgress();
  const streak = getWeekStreak();

  const handleStartWorkout = () => {
    startWorkout(selectedType);
    router.push('/workout');
  };

  if (!profile) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        <View className="pt-8 pb-6">
          <Text className="text-3xl font-bold text-text mb-2">Hey, {profile.name}</Text>
          <Text className="text-lg text-text-secondary">
            {progress.completed}/{progress.goal} workouts this week
          </Text>
        </View>

        <View className="mb-6">
          <WeekStreak streak={streak} />
        </View>

        <View className="mb-6">
          <MotivationQuote />
        </View>

        <View className="bg-surface rounded-xl p-5 mb-6">
          <Text className="text-text font-semibold text-lg mb-4">What's Next?</Text>

          <View className="mb-4">
            {(['push', 'pull', 'legs', 'abs'] as WorkoutType[]).map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setSelectedType(type)}
                className={`mb-3 p-4 rounded-xl border-2 ${
                  selectedType === type
                    ? 'border-primary bg-primary/10'
                    : 'border-surface-light bg-surface-light'
                }`}
              >
                <Text
                  className={`text-base font-semibold mb-1 ${
                    selectedType === type ? 'text-primary' : 'text-text'
                  }`}
                >
                  {WORKOUT_LABELS[type]}
                </Text>
                <Text className="text-text-secondary text-sm">{WORKOUT_DESCRIPTIONS[type]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button title="Start Workout" onPress={handleStartWorkout} />
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
