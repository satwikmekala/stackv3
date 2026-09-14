import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Search, X } from 'lucide-react-native';

import { redesignColors, redesignFonts } from '@/constants/theme';

interface ExerciseSearchInputProps {
  value: string;
  onChangeText: (value: string) => void;
}

export function ExerciseSearchInput({ value, onChangeText }: ExerciseSearchInputProps) {
  return (
    <View style={styles.container}>
      <Search color={redesignColors.ashDim} size={20} />
      <TextInput
        accessibilityLabel="Search exercises"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder="Search exercises"
        placeholderTextColor={redesignColors.ashDim}
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
  clearButton: { minHeight: 32, justifyContent: 'center' },
});
