import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  OnboardingBackButton,
  OnboardingNextButton,
  OnboardingProgress,
} from '@/components/OnboardingControls';
import { redesignColors, redesignFonts, splitColors } from '@/constants/theme';
import '@/global.css';

export default function WhatsYourName() {
  const router = useRouter();
  const nameInputRef = useRef<TextInput>(null);
  const [name, setName] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const trimmedName = name.trim();
  const isActive = isFocused || trimmedName.length > 0;

  const handleContinue = () => {
    if (!trimmedName) {
      return;
    }

    router.push({
      pathname: '/(onboarding)/experience',
      params: { name: trimmedName },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.screen}
      >
        <View style={styles.progressHeader}>
          <OnboardingProgress currentStep={2} />
        </View>
        <View style={styles.backControl}>
          <OnboardingBackButton />
        </View>

        <Text style={styles.heading}>What should we call you?</Text>

        <View
          onTouchStart={() => nameInputRef.current?.focus()}
          style={[
            styles.inputGlow,
            isActive && styles.inputGlowActive,
          ]}
        >
          <TextInput
            autoCapitalize="words"
            autoCorrect={false}
            editable
            enterKeyHint="next"
            onBlur={() => setIsFocused(false)}
            onChangeText={setName}
            onFocus={() => setIsFocused(true)}
            onSubmitEditing={handleContinue}
            placeholder="Your name"
            placeholderTextColor={redesignColors.ashDim}
            returnKeyType="next"
            ref={nameInputRef}
            selectionColor={splitColors.chest}
            showSoftInputOnFocus
            style={[
              styles.input,
              { borderColor: isActive ? splitColors.chest : redesignColors.border },
            ]}
            value={name}
          />
        </View>

        <View pointerEvents="box-none" style={styles.footer}>
          <OnboardingNextButton disabled={!trimmedName} onPress={handleContinue} size={64} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: redesignColors.ink,
  },
  screen: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 36,
    paddingBottom: 36,
  },
  progressHeader: {
    width: '100%',
    height: 4,
    marginBottom: 24,
  },
  backControl: {
    alignSelf: 'flex-start',
  },
  heading: {
    maxWidth: 330,
    marginTop: 30,
    color: redesignColors.bone,
    fontFamily: redesignFonts.display,
    fontSize: 32,
    lineHeight: 34.5,
    letterSpacing: -0.32,
  },
  inputGlow: {
    marginTop: 28,
    borderRadius: 16,
  },
  inputGlowActive: {
    shadowColor: splitColors.chest,
    shadowOpacity: 0.26,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  input: {
    minHeight: 58,
    paddingVertical: 16,
    paddingHorizontal: 18,
    color: redesignColors.bone,
    backgroundColor: redesignColors.surface,
    borderWidth: 1.5,
    borderRadius: 16,
    fontFamily: redesignFonts.uiSemiBold,
    fontSize: 19,
    lineHeight: 24,
  },
  footer: {
    position: 'absolute',
    right: 36,
    bottom: 36,
  },
});
