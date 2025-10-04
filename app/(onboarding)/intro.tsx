import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import '@/global.css';

export default function Intro() {
  const router = useRouter();

  const handleContinue = () => {
    router.push('/(onboarding)/welcome');
  };

  const features = [
    {
      icon: require('../../assets/images/TrackYourProgress.png'),
      title: 'Track Your Progress',
      description: 'Log your sets, reps, and weights.\nTrain with intent. ',
    },
    {
      icon: require('../../assets/images/SetWeeklyGymGoals.png'),
      title: 'Set Weekly Gym Goals',
      description: 'Choose your training days. Stack \nkeeps you on track..',
    },
    {
      icon: require('../../assets/images/SeeYourGrowthOverTime.png'),
      title: 'See Your journey',
      description: 'Review past sessions and watch\nyour progress build.',
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-6">
          {/* Top Section - Header */}
          <View className="pt-28 pb-0">
            <Text className="text-4xl font-bold text-text text-center">
              Welcome to Stack
            </Text>
          </View>

          {/* Feature List Section */}
          <View className="flex-1 justify-center pl-8 -mt-24">
            {features.map((feature, index) => (
              <View key={index} className="mb-6 flex-row items-start">
                {/* PNG Icon */}
                <View className="mr-5 flex-shrink-0 pt-3">
                  <Image 
                    source={feature.icon} 
                    style={{ width: 45, height: 45 }} 
                    resizeMode="contain"
                  />
                </View>
                
                {/* Feature Content */}
                <View className="flex-1">
                  <Text className="text-xl font-bold text-text mb-0">
                    {feature.title}
                  </Text>
                  <Text className="text-base text-text-secondary leading-relaxed">
                    {feature.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Bottom Section - Continue Button */}
          <View className="pb-12 pt-16">
            <TouchableOpacity
              onPress={handleContinue}
              className="bg-primary rounded-xl py-4 px-6"
              activeOpacity={0.8}
            >
              <Text className="text-lg font-bold text-background text-center">
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
