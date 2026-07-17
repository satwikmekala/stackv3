import React, { useState } from 'react';
import { View, TextInput, Text } from 'react-native';
import { colors, fonts } from '@/constants/theme';

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
}

export function Input({ label, value, onChangeText, placeholder, keyboardType = 'default' }: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontFamily: fonts.bodyMedium,
          fontSize: 13,
          color: colors.ash,
          marginBottom: 8,
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.ash}
        keyboardType={keyboardType}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          backgroundColor: colors.surfaceRaised,
          color: colors.bone,
          fontFamily: fonts.body,
          fontSize: 16,
          paddingHorizontal: 16,
          paddingVertical: 16,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: focused ? colors.accent : 'transparent',
        }}
      />
    </View>
  );
}
