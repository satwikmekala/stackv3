import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/Button';
import { IntensityLevel } from '@/store/workoutStore';
import '@/global.css';

const INTENSITY_OPTIONS: { value: IntensityLevel; label: string; description: string }[] = [
  { value: 'easy', label: 'Taking it Steady', description: 'Build consistency without pushing too hard' },
  { value: 'medium', label: 'Balanced Approach', description: 'Challenge yourself while staying sustainable' },
  { value: 'hard', label: 'Going Hard', description: 'Push your limits and maximize gains' },
];

export default function Intensity() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedIntensity, setSelectedIntensity] = useState<IntensityLevel>('medium');

  const handleContinue = () => {
    router.push({
      pathname: '/(onboarding)/current-week',
      params: { ...params, preferredIntensity: selectedIntensity },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 justify-center">
        <View className="mb-12">
          <Text className="text-4xl font-bold text-text mb-3">Training Intensity</Text>
          <Text className="text-lg text-text-secondary leading-relaxed">
            How do you want to approach your training?
          </Text>
        </View>

        <View className="mb-8">
          {INTENSITY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => setSelectedIntensity(option.value)}
              className={`mb-3 p-5 rounded-xl border-2 ${
                selectedIntensity === option.value
                  ? 'border-primary bg-primary/10'
                  : 'border-surface-light bg-surface'
              }`}
            >
              <Text
                className={`text-lg font-semibold mb-1 ${
                  selectedIntensity === option.value ? 'text-primary' : 'text-text'
                }`}
              >
                {option.label}
              </Text>
              <Text className="text-text-secondary text-sm">{option.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button title="Continue" onPress={handleContinue} />
      </View>
    </SafeAreaView>
  );
}
