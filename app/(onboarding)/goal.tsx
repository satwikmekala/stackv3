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
import '@/global.css';

const GOAL_ROWS = [
  [1, 2, 3, 4],
  [5, 6],
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedText = Animated.createAnimatedComponent(Text);

interface GoalCircleProps {
  value: number;
  isSelected: boolean;
  onSelect: (value: number) => void;
}

function GoalCircle({ value, isSelected, onSelect }: GoalCircleProps) {
  const selectionProgress = useSharedValue(isSelected ? 1 : 0);
  const pressProgress = useSharedValue(0);

  useEffect(() => {
    selectionProgress.value = withTiming(isSelected ? 1 : 0, {
      duration: 180,
      easing: Easing.inOut(Easing.ease),
    });
  }, [isSelected, selectionProgress]);

  const handlePressIn = () => {
    pressProgress.value = withTiming(1, {
      duration: 150,
      easing: Easing.inOut(Easing.ease),
    });
    void Haptics.selectionAsync();
  };

  const handlePressOut = () => {
    pressProgress.value = withTiming(0, {
      duration: 150,
      easing: Easing.inOut(Easing.ease),
    });
  };

  const animatedStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(selectionProgress.value, [0, 1], ['#484848', '#07e94b']);
    const scale = 1 - pressProgress.value * 0.02;

    return {
      backgroundColor: 'transparent',
      borderColor,
      transform: [{ scale }],
    };
  });

  const textStyle = useAnimatedStyle(() => {
    return {
      color: interpolateColor(selectionProgress.value, [0, 1], ['#FFFFFF', '#07e94b']),
    };
  });

  return (
    <AnimatedPressable
      onPress={() => onSelect(value)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        {
          width: 65,
          height: 65,
          borderRadius: 40,
          borderWidth: 1.5,
          alignItems: 'center',
          justifyContent: 'center',
          marginHorizontal: 8,
          marginVertical: 8,
        },
        animatedStyle,
      ]}
    >
      <AnimatedText
        style={[
          {
            fontSize: 25,
            fontWeight: '600',
          },
          textStyle,
        ]}
      >
        {value}
      </AnimatedText>
    </AnimatedPressable>
  );
}

export default function Goal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedGoal, setSelectedGoal] = useState<number | null>(null);
  const [isFabPressed, setIsFabPressed] = useState(false);

  const handleContinue = () => {
    if (selectedGoal === null) {
      return;
    }

    router.push({
      pathname: '/(onboarding)/intensity',
      params: { ...params, weeklyGoal: selectedGoal.toString() },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background relative">
      <View className="flex-1 px-10">
        <View className="pt-24">
          <Text
            className="text-text font-bold text-left"
            style={{
              fontSize: 29.5,
              letterSpacing: -0.28,
            }}
          >
            {`how many days do\nyou plan on training ?`}
          </Text>
          <Text
            className="text-text-secondary mt-6"
            style={{
              fontSize: 16,
              color: '#B6B6B6',
            }}
          >
            Choose what's realistic for you
          </Text>
        </View>

        <View className="items-center mt-12">
          {GOAL_ROWS.map((row, rowIndex) => (
            <View
              key={row.join('-')}
              className="flex-row justify-center"
              style={{ marginBottom: rowIndex === GOAL_ROWS.length - 1 ? 0 : 8 }}
            >
              {row.map((value) => (
                <GoalCircle
                  key={value}
                  value={value}
                  isSelected={selectedGoal === value}
                  onSelect={setSelectedGoal}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity
        onPress={handleContinue}
        onPressIn={() => setIsFabPressed(true)}
        onPressOut={() => setIsFabPressed(false)}
        className="absolute bottom-24 right-10 w-16 h-16 rounded-full items-center justify-center"
        disabled={selectedGoal === null}
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
        <ArrowRight
          size={28}
          color={isFabPressed ? '#000000' : '#FFFFFF'}
          strokeWidth={2.5}
        />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
