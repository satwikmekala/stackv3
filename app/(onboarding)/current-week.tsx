import React, { useState } from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useWorkoutStore, IntensityLevel } from '@/store/workoutStore';
import '@/global.css';

export default function CurrentWeek() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [workoutsCompleted, setWorkoutsCompleted] = useState('0');
  const setProfile = useWorkoutStore((state) => state.setProfile);

  const handleFinish = () => {
    const completed = parseInt(workoutsCompleted) || 0;

    setProfile({
      name: params.name as string,
      weeklyGoal: parseInt(params.weeklyGoal as string),
      preferredIntensity: params.preferredIntensity as IntensityLevel,
      onboardingCompleted: true,
      workoutsCompletedThisWeek: completed,
    });

    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 justify-center">
        <View className="mb-12">
          <Text className="text-4xl font-bold text-text mb-3">Almost There!</Text>
          <Text className="text-lg text-text-secondary leading-relaxed">
            Have you already worked out this week? Let us know so we can track your progress accurately.
          </Text>
        </View>

        <View className="mb-8">
          <Input
            label="Workouts completed this week"
            value={workoutsCompleted}
            onChangeText={setWorkoutsCompleted}
            placeholder="0"
            keyboardType="numeric"
          />
          <Text className="text-text-tertiary text-xs mt-2">
            This helps us track your weekly streak without restarting at zero
          </Text>
        </View>

        <Button title="Get Started" onPress={handleFinish} />
      </View>
    </SafeAreaView>
  );
}
