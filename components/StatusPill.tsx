import { StyleSheet, Text, View } from 'react-native';
import { redesignColors, redesignFonts } from '@/constants/theme';

type StatusPillProps = {
  label: string;
  color?: string;
  muted?: boolean;
};

export function StatusPill({ label, color, muted = false }: StatusPillProps) {
  const pillColor = color ?? redesignColors.ash;

  return (
    <View
      style={[
        styles.pill,
        muted
          ? styles.mutedPill
          : { borderColor: `${pillColor}99`, backgroundColor: `${pillColor}16` },
      ]}
    >
      <Text
        allowFontScaling={false}
        style={[styles.label, { color: muted ? redesignColors.ash : pillColor }]}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexShrink: 0,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mutedPill: {
    borderColor: redesignColors.ashDim,
    backgroundColor: redesignColors.raised,
  },
  label: {
    fontFamily: redesignFonts.monoBold,
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 1.35,
  },
});
