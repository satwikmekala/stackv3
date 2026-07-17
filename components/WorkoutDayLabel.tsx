import { Text, View } from 'react-native';
import { redesignColors, redesignFonts } from '@/constants/theme';

type WorkoutDayLabelProps = {
  accent: string;
  label: string;
};

export function WorkoutDayLabel({ accent, label }: WorkoutDayLabelProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
      <View
        style={{
          width: 11,
          height: 11,
          borderRadius: 6,
          backgroundColor: accent,
          marginRight: 10,
        }}
      />
      <Text
        numberOfLines={1}
        allowFontScaling={false}
        style={{
          fontFamily: redesignFonts.monoBold,
          fontSize: 12,
          letterSpacing: 2.5,
          color: redesignColors.ash,
        }}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}
