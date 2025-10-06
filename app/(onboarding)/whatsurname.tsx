import React, { useState } from 'react';
import { View, Text, SafeAreaView, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import '@/global.css';

export default function Welcome() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isFabPressed, setIsFabPressed] = useState(false);
  const hasValue = name.trim().length > 0;

  const goToNext = () => {
    router.push('/(onboarding)/goal');
  };

  return (
    <SafeAreaView className="flex-1 bg-background relative">
      <View className="flex-1 px-10">
        {/* Main title with proper spacing */}
        <View className="pt-24">
          <Text className="text-text font-bold text-left"
            style={{
              fontSize: 29.5,
              letterSpacing: -0.28,
            }}
          >
            what should we call you ?
          </Text>
        </View>

        {/* Input section with underline style */}
        <View className="mt-12">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="your nickname"
            placeholderTextColor="oklch(0.7122 0 0)"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="text-base py-4 px-4 rounded-lg"
            style={{
              fontSize: 16,
              fontWeight: '400',
              lineHeight: 20,
              color: '#FFFFFF',
              borderWidth: 1,
              borderColor: hasValue
                ? 'rgba(7, 233, 75, 0.7)'
                : isFocused
                ? '#555555'
                : '#333333',
              backgroundColor: 'transparent',
              textAlignVertical: 'center',
            }}
          />
        </View>
      </View>

      <TouchableOpacity
        onPress={goToNext}
        onPressIn={() => setIsFabPressed(true)}
        onPressOut={() => setIsFabPressed(false)}
        className="absolute bottom-24 right-10 w-16 h-16 rounded-full items-center justify-center"
        style={{
          backgroundColor: isFabPressed ? '#07e94b' : '#343434',
          borderWidth: 1,
          borderColor: isFabPressed ? '#07e94b' : '#484848',
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
          paddingVertical: 0,
          paddingHorizontal: 0,
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
