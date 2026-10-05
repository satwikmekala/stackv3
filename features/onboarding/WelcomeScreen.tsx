import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { redesignColors as c, redesignFonts as f } from '@/constants/theme';
import { OnboardingPrimaryAction } from './OnboardingActions';
import { StackMark } from './StackMark';

/** Presentation only: the route owns persistence and navigation. */
export function WelcomeScreen({ onContinue, actionStatus }: { onContinue: () => void; actionStatus?: ReactNode }) {
  const { width, fontScale } = useWindowDimensions();
  // Native paragraph measurement can reserve the uncapped line height even when
  // maxFontSizeMultiplier caps the painted display font. Scale both explicitly.
  const displayScale = Math.min(fontScale, 1.5);
  const compact = width < 360;
  return <SafeAreaView style={styles.screen}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <StackMark size={compact ? 64 : 76} />
      <Animated.View key={`copy:${fontScale}`} entering={FadeIn.delay(380).duration(480).reduceMotion(ReduceMotion.System)} style={styles.copy}>
        {/* Display lettering stays legible as a headline; the supporting copy follows the full text-size range. */}
        <Text accessibilityRole="header" allowFontScaling={false}
          style={[styles.headline, { fontSize: (compact ? 43 : 48) * displayScale, lineHeight: (compact ? 46 : 51) * displayScale }]}>
          Every workout{'\n'}stacks up.
        </Text>
        <Text style={styles.body}>Log your training.{'\n'}See your progress take shape.</Text>
      </Animated.View>
    </ScrollView>
    <View key={`actions:${fontScale}`} style={styles.footer}>
      {actionStatus}
      <OnboardingPrimaryAction label="Continue" onPress={onContinue} />
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.ink },
  scroll: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', gap: 36, width: '100%', maxWidth: 568, alignSelf: 'center', paddingHorizontal: 28, paddingTop: 24, paddingBottom: 48 },
  copy: { gap: 16 },
  headline: { fontFamily: f.display, color: c.bone, letterSpacing: -1.8 },
  body: { fontFamily: f.ui, color: c.ash, fontSize: 18, lineHeight: 26, maxWidth: 440 },
  footer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8, gap: 8, width: '100%', maxWidth: 568, alignSelf: 'center' },
});
