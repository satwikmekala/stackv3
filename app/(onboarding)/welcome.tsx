import React, { useState } from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import '@/global.css';

export default function Welcome() {
  const router = useRouter();
  const [name, setName] = useState('');

  const handleContinue = () => {
    if (name.trim()) {
      router.push({
        pathname: '/(onboarding)/goal',
        params: { name: name.trim() },
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 justify-center">
        <View className="mb-12">
          <Text className="text-4xl font-bold text-text mb-3">Welcome to Stack</Text>
          <Text className="text-lg text-text-secondary leading-relaxed">
            Let's get you set up. We'll keep this quick - just a few questions to personalize your experience.
          </Text>
        </View>

        <View className="mb-8">
          <Input
            label="What's your name?"
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
          />
        </View>

        <Button
          title="Continue"
          onPress={handleContinue}
          disabled={!name.trim()}
        />
      </View>
    </SafeAreaView>
  );
}
