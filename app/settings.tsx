import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useWorkoutStore } from '@/store/workoutStore';
import { Button } from '@/components/Button';
import { colors, fonts } from '@/constants/theme';
import '@/global.css';

// Supported weekly-goal range.
const GOAL_OPTIONS = [1, 2, 3, 4, 5, 6];
const WEEKDAY_INDEXES = [0, 1, 2, 3, 4, 5, 6];

const circularDayDistance = (first: number, second: number) => {
  const distance = Math.abs(first - second);
  return Math.min(distance, 7 - distance);
};

const resizeTrainingDays = (trainingDays: number[], weeklyGoal: number) => {
  const resizedDays = [...new Set(trainingDays)]
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((a, b) => a - b);

  if (resizedDays.length >= weeklyGoal) {
    return resizedDays.slice(0, weeklyGoal);
  }

  if (resizedDays.length === 0) {
    resizedDays.push(0);
  }

  while (resizedDays.length < weeklyGoal) {
    const remainingDays = WEEKDAY_INDEXES.filter((day) => !resizedDays.includes(day));
    const nextDay = remainingDays.reduce((bestDay, day) => {
      const bestSpacing = Math.min(
        ...resizedDays.map((selectedDay) => circularDayDistance(bestDay, selectedDay))
      );
      const daySpacing = Math.min(
        ...resizedDays.map((selectedDay) => circularDayDistance(day, selectedDay))
      );
      return daySpacing > bestSpacing ? day : bestDay;
    });
    resizedDays.push(nextDay);
  }

  return resizedDays.sort((a, b) => a - b);
};

// Shared pill used by both the goal stepper and the intensity selector —
// bone border on the selected option, matching the onboarding convention.
function OptionPill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={{
        flex: 1,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? colors.surfaceRaised : 'transparent',
        borderWidth: 1.5,
        borderColor: selected ? colors.bone : 'rgba(163, 156, 143, 0.3)',
      }}
    >
      <Text
        style={{
          fontFamily: fonts.bodySemiBold,
          fontSize: 14,
          color: selected ? colors.bone : colors.ash,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function Settings() {
  const router = useRouter();
  const profile = useWorkoutStore((state) => state.profile);
  const updateProfile = useWorkoutStore((state) => state.updateProfile);
  const resetAllData = useWorkoutStore((state) => state.resetAllData);

  const [nameFocused, setNameFocused] = useState(false);

  if (!profile) {
    return null;
  }

  const handleWeeklyGoalChange = (weeklyGoal: number) => {
    updateProfile({
      weeklyGoal,
      trainingDays: resizeTrainingDays(profile.trainingDays, weeklyGoal),
    });
  };

  const handleReset = () => {
    Alert.alert(
      'Reset All Data',
      'Are you sure you want to reset all your data? This action cannot be undone and will take you back to the onboarding process.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetAllData();
            router.replace('/(onboarding)/welcome');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ink }}>
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 24 }}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Custom header — modal presentation, close returns to Progress */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 24,
            paddingBottom: 24,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.headingBold,
              fontSize: 30,
              letterSpacing: -0.5,
              color: colors.bone,
            }}
          >
            Settings
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X color={colors.ash} size={20} />
          </TouchableOpacity>
        </View>

        {/* Name — live-editing, unchanged behavior from the old Profile */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 20,
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 12,
              color: colors.ash,
              marginBottom: 8,
            }}
          >
            Name
          </Text>
          <TextInput
            value={profile.name}
            onChangeText={(name) => updateProfile({ name })}
            placeholder="Your name"
            placeholderTextColor={colors.ash}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            style={{
              fontFamily: fonts.bodySemiBold,
              fontSize: 18,
              color: colors.bone,
              backgroundColor: colors.surfaceRaised,
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: nameFocused ? colors.accent : 'transparent',
            }}
          />
        </View>

        {/* Weekly goal — now editable, same 1-6 range as onboarding */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 20,
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 12,
              color: colors.ash,
              marginBottom: 4,
            }}
          >
            Weekly Goal
          </Text>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 13,
              color: colors.ash,
              marginBottom: 12,
            }}
          >
            Days per week you aim to train
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {GOAL_OPTIONS.map((value) => (
              <OptionPill
                key={value}
                label={String(value)}
                selected={profile.weeklyGoal === value}
                onPress={() => handleWeeklyGoalChange(value)}
              />
            ))}
          </View>
        </View>

        {/* Danger zone — moved as-is from the old Profile */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 20,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 12,
              color: colors.ash,
              marginBottom: 12,
            }}
          >
            Danger Zone
          </Text>
          <Button title="Reset All Data" onPress={handleReset} variant="secondary" />
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 11,
              color: colors.ash,
              textAlign: 'center',
              marginTop: 10,
            }}
          >
            This will clear all your workout data and return you to onboarding
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
