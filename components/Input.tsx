import React from 'react';
import { View, TextInput, Text } from 'react-native';

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
}

export function Input({ label, value, onChangeText, placeholder, keyboardType = 'default' }: InputProps) {
  return (
    <View className="mb-4">
      <Text className="text-text-secondary text-sm font-medium mb-2">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#525252"
        keyboardType={keyboardType}
        className="bg-surface-light text-text px-4 py-4 rounded-xl text-base"
      />
    </View>
  );
}
