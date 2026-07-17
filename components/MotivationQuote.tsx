import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { colors, fonts } from '@/constants/theme';

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

  // Deliberately quiet — no card, no competition with the content around it.
  return (
    <View style={{ paddingVertical: 8, alignItems: 'center' }}>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 13,
          fontStyle: 'italic',
          color: colors.ash,
          textAlign: 'center',
        }}
      >
        "{quote}"
      </Text>
    </View>
  );
}
