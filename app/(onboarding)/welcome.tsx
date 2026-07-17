import React from 'react';
import { Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BarChart3, Target, TrendingUp } from 'lucide-react-native';
import {
  OnboardingNextButton,
  OnboardingProgress,
} from '@/components/OnboardingControls';
import { redesignColors, redesignFonts, splitColors } from '@/constants/theme';
import '@/global.css';

const FEATURES = [
  {
    accent: splitColors.chest,
    icon: BarChart3,
    title: 'Track your progress',
    description: 'Every lift, PR and streak in one place.',
  },
  {
    accent: splitColors.legs,
    icon: Target,
    title: 'Set weekly gym goals',
    description: 'Pick your days and hit them each week.',
  },
  {
    accent: splitColors.shoulders,
    icon: TrendingUp,
    title: 'See your journey',
    description: 'Watch strength climb week over week.',
  },
] as const;

export default function Welcome() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.progressHeader}>
          <OnboardingProgress currentStep={1} />
        </View>

        <View style={styles.brand}>
          <Image
            accessibilityLabel="Stack logo"
            source={require('@/assets/images/stack logo.png')}
            style={styles.brandMark}
          />
          <Text style={styles.brandName}>Stack</Text>
        </View>

        <View style={styles.intro}>
          <Text style={styles.heading}>{'Strength,\nstacked daily.'}</Text>
          <Text style={styles.subtitle}>
            Small sessions, stacked up over weeks. {"Let's"} set up your training.
          </Text>
        </View>

        <View style={styles.featureList}>
          {FEATURES.map(({ accent, description, icon: Icon, title }) => (
            <View key={title} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: `${accent}24` }]}>
                <Icon color={accent} size={28} strokeWidth={2.2} />
              </View>
              <View style={styles.featureCopy}>
                <Text style={styles.featureTitle}>{title}</Text>
                <Text style={styles.featureDescription}>
                  {description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View pointerEvents="box-none" style={styles.footer}>
          <OnboardingNextButton
            onPress={() => router.push('/(onboarding)/whatsurname')}
            size={64}
          />
        </View>
      </View>
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
    marginBottom: 38,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandMark: {
    width: 42,
    height: 42,
  },
  brandName: {
    color: redesignColors.bone,
    fontFamily: redesignFonts.display,
    fontSize: 28,
    letterSpacing: -0.28,
  },
  intro: {
    marginTop: 30,
  },
  heading: {
    color: redesignColors.bone,
    fontFamily: redesignFonts.display,
    fontSize: 40,
    lineHeight: 43,
    letterSpacing: -0.4,
  },
  subtitle: {
    maxWidth: 295,
    marginTop: 16,
    color: redesignColors.ash,
    fontFamily: redesignFonts.ui,
    fontSize: 16,
    lineHeight: 24,
  },
  featureList: {
    marginTop: 42,
    gap: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  featureIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCopy: {
    minWidth: 0,
    flex: 1,
  },
  featureTitle: {
    color: redesignColors.bone,
    fontFamily: redesignFonts.uiBold,
    fontSize: 20,
    lineHeight: 24,
  },
  featureDescription: {
    marginTop: 3,
    color: redesignColors.ash,
    fontFamily: redesignFonts.ui,
    fontSize: 16,
    lineHeight: 23,
  },
  footer: {
    position: 'absolute',
    right: 36,
    bottom: 36,
  },
});
