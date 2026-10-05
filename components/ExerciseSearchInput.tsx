import { Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { Search, X } from 'lucide-react-native';

import { redesignColors, redesignFonts } from '@/constants/theme';

interface ExerciseSearchInputProps {
  value: string;
  onChangeText: (value: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function ExerciseSearchInput({ value, onChangeText, style }: ExerciseSearchInputProps) {
  return (
    <View style={[styles.container, style]}>
      <Search color={redesignColors.ash} size={20} />
      <TextInput
        accessibilityLabel="Search exercises"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder="Search exercises"
        placeholderTextColor={redesignColors.ash}
        returnKeyType="search"
        style={styles.input}
        value={value}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityLabel="Clear exercise search"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => onChangeText('')}
          style={styles.clearButton}
        >
          <X color={redesignColors.ash} size={20} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: redesignColors.border,
    borderRadius: 14,
    backgroundColor: redesignColors.surface,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    color: redesignColors.bone,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 16,
  },
  clearButton: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
});
