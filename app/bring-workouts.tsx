import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SplitPressable as Pressable } from '@/components/custom-split/SplitPressable';
import { ui } from '@/components/custom-split/ui';
import { onboardingBackOptions } from '@/features/onboarding/OnboardingActions';
import { saveOnboardingDraft } from '@/store/onboardingDraft';
import { useWorkoutStore } from '@/store/workoutStore';
import { redesignColors as c } from '@/constants/theme';

export default function BringWorkouts() {
  const router = useRouter();
  // A separate native stack entry keeps Back/gestures correct without changing the Pro route.
  const choosingHevyPlan = useLocalSearchParams<{ hevyPlan?: string }>().hevyPlan === 'choose';
  const completed = useWorkoutStore(state => state.profile?.onboardingCompleted);
  const [error, setError] = useState<string | null>(null);
  const back = () => { if (choosingHevyPlan) { if (router.canGoBack()) router.back(); else router.replace('/bring-workouts'); return; }
    void saveOnboardingDraft({ step: 'starting-point' }).then(() => router.dismissTo('/(onboarding)/starting-point'))
    .catch(() => setError('Couldn’t save your setup. Try again.')); };
  if (completed) return <Redirect href="/(tabs)" />;
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={ui.screen}>
    <Stack.Screen options={{ headerShown: true, title: '', headerStyle: { backgroundColor: c.ink }, headerTintColor: c.bone,
      headerShadowVisible: false, ...onboardingBackOptions(choosingHevyPlan ? 'Back to import choices' : 'Back to training choice', back) }} />
    <ScrollView contentContainerStyle={ui.content}>
      {choosingHevyPlan ? <>
        <Text accessibilityRole="header" style={ui.title}>Which Hevy plan do you use?</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Hevy Pro" onPress={() => router.push('/hevy-import')}
          style={({ pressed }) => [ui.card, pressed && ui.pressed]}>
          <Text style={ui.subtitle}>Hevy Pro</Text><Text style={ui.body}>Import your routines and workout history.</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Hevy Free" onPress={() => router.push('/hevy-file-import')}
          style={({ pressed }) => [ui.card, pressed && ui.pressed]}>
          <Text style={ui.subtitle}>Hevy Free</Text><Text style={ui.body}>Import your workout history from a Hevy export.</Text>
        </Pressable>
      </> : <>
        <View style={ui.section}><Text accessibilityRole="header" style={ui.title}>Bring your workouts over</Text>
          <Text style={ui.body}>Start where you left off.</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Import from Hevy" onPress={() => router.push({ pathname: '/bring-workouts', params: { hevyPlan: 'choose' } })}
          style={({ pressed }) => [ui.card, pressed && ui.pressed]}>
          <Text style={ui.subtitle}>Import from Hevy</Text><Text style={ui.body}>Bring your routines and workout history into Stack.</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Paste my routine" onPress={() => router.push('/paste-routine')}
          style={({ pressed }) => [ui.card, pressed && ui.pressed]}>
          <Text style={ui.subtitle}>Paste my routine</Text><Text style={ui.body}>Paste what you already train.</Text>
        </Pressable>
      </>}
      {error ? <Text accessibilityRole="alert" style={ui.error}>{error}</Text> : null}
    </ScrollView>
  </SafeAreaView>;
}
