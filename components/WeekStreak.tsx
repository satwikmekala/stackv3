import React from 'react';
import { View, Text } from 'react-native';

interface WeekStreakProps {
  streak: { date: string; workouts: number }[];
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeekStreak({ streak }: WeekStreakProps) {
  const getIntensityColor = (workouts: number) => {
    if (workouts === 0) return 'bg-surface-light';
    if (workouts === 1) return 'bg-primary/40';
    return 'bg-primary';
  };

  return (
    <View className="bg-surface rounded-xl p-5">
      <Text className="text-text font-semibold text-lg mb-4">This Week</Text>
      <View className="flex-row justify-between">
        {streak.map((day, index) => (
          <View key={day.date} className="items-center">
            <View
              className={`w-11 h-11 rounded-full mb-2 items-center justify-center ${getIntensityColor(
                day.workouts
              )}`}
            >
              {day.workouts > 1 && (
                <Text className="text-background font-bold text-xs">+{day.workouts - 1}</Text>
              )}
            </View>
            <Text className="text-text-tertiary text-xs">{DAY_LABELS[index]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
