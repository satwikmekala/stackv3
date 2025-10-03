import React from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';
import { useWorkoutStore } from '@/store/workoutStore';
import '@/global.css';

export default function Profile() {
  const profile = useWorkoutStore((state) => state.profile);
  const sessions = useWorkoutStore((state) => state.sessions);

  if (!profile) {
    return null;
  }

  const completedSessions = sessions.filter((s) => s.completed);
  const totalWorkouts = completedSessions.length;

  const workoutBreakdown = {
    push: completedSessions.filter((s) => s.type === 'push').length,
    pull: completedSessions.filter((s) => s.type === 'pull').length,
    legs: completedSessions.filter((s) => s.type === 'legs').length,
    abs: completedSessions.filter((s) => s.type === 'abs').length,
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        <View className="pt-8 pb-6">
          <Text className="text-3xl font-bold text-text mb-2">Profile</Text>
        </View>

        <View className="bg-surface rounded-xl p-5 mb-4">
          <Text className="text-text-secondary text-sm font-medium mb-2">Name</Text>
          <Text className="text-text text-xl font-semibold">{profile.name}</Text>
        </View>

        <View className="bg-surface rounded-xl p-5 mb-4">
          <Text className="text-text-secondary text-sm font-medium mb-2">Weekly Goal</Text>
          <Text className="text-text text-xl font-semibold">{profile.weeklyGoal} days per week</Text>
        </View>

        <View className="bg-surface rounded-xl p-5 mb-4">
          <Text className="text-text-secondary text-sm font-medium mb-2">Training Intensity</Text>
          <Text className="text-text text-xl font-semibold capitalize">{profile.preferredIntensity}</Text>
        </View>

        <View className="bg-surface rounded-xl p-5 mb-4">
          <Text className="text-text font-semibold text-lg mb-4">Total Stats</Text>
          <View className="mb-3">
            <Text className="text-text-secondary text-sm mb-1">Total Workouts Completed</Text>
            <Text className="text-text text-2xl font-bold">{totalWorkouts}</Text>
          </View>
        </View>

        <View className="bg-surface rounded-xl p-5 mb-6">
          <Text className="text-text font-semibold text-lg mb-4">Workout Breakdown</Text>
          <View className="space-y-3">
            <View className="flex-row justify-between mb-3">
              <Text className="text-text-secondary">Push Days</Text>
              <Text className="text-text font-semibold">{workoutBreakdown.push}</Text>
            </View>
            <View className="flex-row justify-between mb-3">
              <Text className="text-text-secondary">Pull Days</Text>
              <Text className="text-text font-semibold">{workoutBreakdown.pull}</Text>
            </View>
            <View className="flex-row justify-between mb-3">
              <Text className="text-text-secondary">Leg Days</Text>
              <Text className="text-text font-semibold">{workoutBreakdown.legs}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-text-secondary">Ab Days</Text>
              <Text className="text-text font-semibold">{workoutBreakdown.abs}</Text>
            </View>
          </View>
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
