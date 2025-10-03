import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/Button';
import '@/global.css';

const GOAL_OPTIONS = [2, 3, 4, 5, 6];

export default function Goal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedGoal, setSelectedGoal] = useState(3);

  const handleContinue = () => {
    router.push({
      pathname: '/(onboarding)/intensity',
      params: { ...params, weeklyGoal: selectedGoal.toString() },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 justify-center">
        <View className="mb-12">
          <Text className="text-4xl font-bold text-text mb-3">Your Weekly Goal</Text>
          <Text className="text-lg text-text-secondary leading-relaxed">
            How many days per week can you realistically commit to training?
          </Text>
        </View>

        <View className="mb-8">
          {GOAL_OPTIONS.map((goal) => (
            <TouchableOpacity
              key={goal}
              onPress={() => setSelectedGoal(goal)}
              className={`mb-3 p-5 rounded-xl border-2 ${
                selectedGoal === goal
                  ? 'border-primary bg-primary/10'
                  : 'border-surface-light bg-surface'
              }`}
            >
              <Text
                className={`text-center text-lg font-semibold ${
                  selectedGoal === goal ? 'text-primary' : 'text-text'
                }`}
              >
                {goal} days per week
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button title="Continue" onPress={handleContinue} />
      </View>
    </SafeAreaView>
  );
}
