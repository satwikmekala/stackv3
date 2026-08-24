import { Text, View } from 'react-native';
import { redesignColors, redesignFonts } from '@/constants/theme';

type WorkoutDayLabelProps = {
  accent: string;
  label: string;
  numberOfLines?: number;
};

export function WorkoutDayLabel({
  accent,
  label,
  numberOfLines = 1,
}: WorkoutDayLabelProps) {
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
        numberOfLines={numberOfLines}
        allowFontScaling={false}
        style={{
          flexShrink: 1,
          fontFamily: redesignFonts.monoBold,
          fontSize: 12,
          ...(numberOfLines > 1 ? { lineHeight: 16 } : {}),
          letterSpacing: 2.5,
          color: redesignColors.ash,
        }}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}
