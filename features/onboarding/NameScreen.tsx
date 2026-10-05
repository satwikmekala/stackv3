import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { redesignColors as c, redesignFonts as f } from '@/constants/theme';
import { NICKNAME_MAX_LENGTH } from '@/store/onboardingDraft';
import { OnboardingPrimaryAction } from './OnboardingActions';

/** Presentation only: the route owns persistence and navigation. */
export function NameScreen({ initialName, busy, onSubmit, status }: {
  initialName: string; busy: boolean; onSubmit: (name: string) => void; status?: ReactNode;
}) {
  const { width, fontScale } = useWindowDimensions();
  const scale = Math.min(fontScale, 1.5);
  const [name, setName] = useState(initialName);
  const [focused, setFocused] = useState(false);
  const ready = name.trim().length > 0;
  const submit = () => { if (ready && !busy) onSubmit(name); };
  // Follow the keyboard frame by frame so Continue rides above it like a system sheet.
  const keyboard = useAnimatedKeyboard();
  const { bottom } = useSafeAreaInsets();
  const lift = useAnimatedStyle(() => ({ paddingBottom: 8 + Math.max(0, keyboard.height.value - bottom) }));
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
      <Text key={`title:${fontScale}`} accessibilityRole="header" allowFontScaling={false}
        style={[styles.title, { fontSize: (width < 360 ? 37 : 42) * scale, lineHeight: 46 * scale }]}>What should we call you?</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Nickname" placeholderTextColor={c.ashDim}
        accessibilityLabel="Nickname" accessibilityHint="Stack uses this to greet you."
        autoFocus autoCapitalize="words" autoCorrect={false} autoComplete="nickname" textContentType="nickname"
        maxLength={NICKNAME_MAX_LENGTH} returnKeyType="next" submitBehavior="submit" onSubmitEditing={submit}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        selectionColor={c.accent} cursorColor={c.accent}
        style={[styles.input, focused && styles.inputFocused]} />
    </ScrollView>
    <Animated.View key={`actions:${fontScale}`} style={[styles.footer, lift]}>
      {status}
      <OnboardingPrimaryAction label="Continue" disabled={!ready || busy} onPress={submit} />
    </Animated.View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ink },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 32, width: '100%', maxWidth: 568, alignSelf: 'center' },
  title: { fontFamily: f.display, color: c.bone, letterSpacing: -1.2 },
  input: { minHeight: 60, paddingVertical: 16, paddingHorizontal: 20, borderRadius: 18, borderWidth: 1.5, borderColor: c.border,
    backgroundColor: c.surface, color: c.bone, fontFamily: f.uiSemiBold, fontSize: 20 },
  inputFocused: { borderColor: c.accent },
  footer: { paddingHorizontal: 24, paddingTop: 8, gap: 8, width: '100%', maxWidth: 568, alignSelf: 'center' },
});
