import React, { useEffect, useState } from 'react';
import { SafeAreaView, Text, View, TouchableOpacity, Pressable } from 'react-native';
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
import { IntensityLevel } from '@/store/workoutStore';
import '@/global.css';

const INTENSITY_OPTIONS: { value: IntensityLevel; label: string; description: string }[] = [
  { value: 'easy', label: 'Taking it Steady', description: 'Focus on showing up consistently' },
  { value: 'medium', label: 'Balanced Approach', description: 'Challenge yourself sustainably' },
  { value: 'hard', label: 'Going Hard', description: 'Push your limits and maximize gains' },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedText = Animated.createAnimatedComponent(Text);

interface IntensityCardProps {
  option: (typeof INTENSITY_OPTIONS)[number];
  isSelected: boolean;
  onSelect: (value: IntensityLevel) => void;
}

function IntensityCard({ option, isSelected, onSelect }: IntensityCardProps) {
  const selection = useSharedValue(isSelected ? 1 : 0);
  const press = useSharedValue(0);

  useEffect(() => {
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

  const animatedContainer = useAnimatedStyle(() => {
    return {
      backgroundColor: 'transparent',
      borderColor: interpolateColor(selection.value, [0, 1], ['#484848', '#07e94b']),
      transform: [{ scale: 1 - press.value * 0.02 }],
    };
  });

  const titleStyle = useAnimatedStyle(() => ({
    color: interpolateColor(selection.value, [0, 1], ['#FFFFFF', '#07e94b']),
  }));

  return (
    <AnimatedPressable
      onPress={() => onSelect(option.value)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        {
          width: '100%',
          borderRadius: 18,
          borderWidth: 1.5,
          paddingVertical: 20,
          paddingHorizontal: 20,
          marginBottom: 16,
        },
        animatedContainer,
      ]}
    >
      <AnimatedText
        style={[
          {
            fontSize: 18,
            fontWeight: '700',
            marginBottom: 6,
          },
          titleStyle,
        ]}
      >
        {option.label}
      </AnimatedText>
      <Text style={{ color: '#B6B6B6', fontSize: 14, lineHeight: 20 }}>{option.description}</Text>
    </AnimatedPressable>
  );
}

export default function Intensity() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedIntensity, setSelectedIntensity] = useState<IntensityLevel | null>(null);
  const [isFabPressed, setIsFabPressed] = useState(false);

  const handleContinue = () => {
    if (!selectedIntensity) {
      return;
    }

    router.push({
      pathname: '/(onboarding)/current-week',
      params: { ...params, preferredIntensity: selectedIntensity },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background relative">
      <View className="flex-1 px-10">
        <View className="pt-24">
          <Text
            className="text-text font-bold text-left"
            style={{ fontSize: 30, letterSpacing: -0.28 }}
          >
            {`what's your training\nintensity vibe ?`}
          </Text>
          <Text
            className="text-text-secondary mt-3"
            style={{ fontSize: 16, color: '#B6B6B6' }}
          >
            Tune the effort so Stack keeps pace with you
          </Text>
        </View>

        <View className="mt-10">
          {INTENSITY_OPTIONS.map((option) => (
            <IntensityCard
              key={option.value}
              option={option}
              isSelected={selectedIntensity === option.value}
              onSelect={setSelectedIntensity}
            />
          ))}
        </View>
      </View>
      <TouchableOpacity
        onPress={handleContinue}
        onPressIn={() => setIsFabPressed(true)}
        onPressOut={() => setIsFabPressed(false)}
        className="absolute bottom-24 right-10 w-16 h-16 rounded-full items-center justify-center"
        disabled={!selectedIntensity}
        style={{
          backgroundColor: isFabPressed ? '#07e94b' : '#343434',
          borderWidth: 1,
          borderColor: isFabPressed ? '#07e94b' : '#484848',
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
          opacity: selectedIntensity ? 1 : 0.45,
        }}
      >
        <ArrowRight size={28} color={isFabPressed ? '#000000' : '#FFFFFF'} strokeWidth={2.5} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
