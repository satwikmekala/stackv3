import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';

const QUOTES = [
  'Consistency beats intensity',
  'Progress, not perfection',
  'Show up, even on hard days',
  'Every workout counts',
  'Small steps, big results',
  'Trust the process',
  "You're stronger than yesterday",
  'One day at a time',
];

export function MotivationQuote() {
  const [quote, setQuote] = useState(QUOTES[0]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * QUOTES.length);
    setQuote(QUOTES[randomIndex]);
  }, []);

  return (
    <View className="bg-surface rounded-xl p-5">
      <Text className="text-text-secondary text-sm italic text-center">"{quote}"</Text>
    </View>
  );
}
