import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Redirect, Stack, useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, X } from 'lucide-react-native';
import { SplitPressable as Pressable } from '@/components/custom-split/SplitPressable';
import { redesignColors as c, redesignFonts as f } from '@/constants/theme';
import { useWorkoutLaunch, workoutLaunch } from '@/store/workoutLaunch';
import { navigateWorkoutLaunch } from '@/features/workout-launch/navigation';
import { ONBOARDING_PREVIEW_ENABLED } from '@/features/onboarding/config';

export default function WorkoutUnitSheet() {
  const router = useRouter(), navigation = useNavigation();
  const state = useWorkoutLaunch();
  const [ownedIntent] = useState(state.intent);
  const handingOff = useRef(false);
  const insets = useSafeAreaInsets();
  const { height, fontScale } = useWindowDimensions();
  const close = () => {
    if (workoutLaunch.getState().busy || handingOff.current) return;
    handingOff.current = true; workoutLaunch.cancel(); router.back();
  };
  useEffect(() => {
    const remove = navigation.addListener('beforeRemove', event => {
      if (workoutLaunch.getState().busy) event.preventDefault();
      else {
        handingOff.current = true;
        if (workoutLaunch.getState().intent === ownedIntent) workoutLaunch.cancel();
      }
    });
    return () => { remove(); if (ownedIntent && workoutLaunch.getState().intent === ownedIntent) workoutLaunch.cancel(); };
  }, [navigation, ownedIntent]);
  useEffect(() => {
    if (ONBOARDING_PREVIEW_ENABLED && ownedIntent && !state.intent && !handingOff.current) router.dismissTo('/(tabs)');
  }, [ownedIntent, router, state.intent]);
  const start = () => {
    if (handingOff.current) return;
    const result = workoutLaunch.confirm();
    if (result.kind === 'started' || result.kind === 'resume') handingOff.current = true;
    navigateWorkoutLaunch(router, result, true);
  };
  if (!ONBOARDING_PREVIEW_ENABLED || !ownedIntent) return <Redirect href="/(tabs)" />;
  return <>
    <Stack.Screen options={{ gestureEnabled: !state.busy }} />
    <ScrollView style={{ maxHeight: height - insets.top - 24 }} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) }]}>
      <View key={`heading:${fontScale}`} style={styles.heading}>
        <Text accessibilityRole="header" allowFontScaling={false} style={[styles.title, { fontSize: 30 * Math.min(fontScale, 1.5), lineHeight: 34 * Math.min(fontScale, 1.5) }]}>Which weight unit do you use?</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Cancel workout start" disabled={state.busy} onPress={close} style={styles.close}><X size={22} color={c.ash} /></Pressable>
      </View>
      <Text key={`body:${fontScale}`} style={styles.body}>Choose the default for your workouts and progress.</Text>
      <View key={`units:${fontScale}`} accessibilityRole="radiogroup" style={styles.units}>
        {([{ value: 'kg', label: 'Kilograms (kg)' }, { value: 'lbs', label: 'Pounds (lb)' }] as const).map(option => <Pressable key={option.value}
          accessibilityRole="radio" accessibilityState={{ selected: state.unit === option.value, disabled: state.busy }} disabled={state.busy}
          onPress={() => workoutLaunch.selectUnit(option.value)} style={[styles.unit, state.unit === option.value && styles.selected]}>
          <Text style={styles.unitText}>{option.label}</Text>{state.unit === option.value && <Check color={c.accent} size={22} />}
        </Pressable>)}
      </View>
      {state.error && <Text accessibilityRole="alert" style={styles.error}>{state.error}</Text>}
      <Pressable key={`start:${fontScale}`} accessibilityRole="button" accessibilityState={{ disabled: state.busy || !state.intent, busy: state.busy }} disabled={state.busy || !state.intent}
        onPress={start} style={[styles.start, state.busy && { opacity: 0.5 }]}><Text style={styles.startText}>{state.busy ? 'Starting…' : state.error ? 'Try again' : 'Start workout'}</Text></Pressable>
    </ScrollView>
  </>;
}
const styles = StyleSheet.create({
  content: { padding: 24, gap: 18, backgroundColor: c.ink },
  heading: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  title: { flex: 1, fontFamily: f.display, color: c.bone, letterSpacing: -0.7 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  body: { fontFamily: f.ui, fontSize: 16, lineHeight: 23, color: c.ash }, units: { gap: 10 },
  unit: { minHeight: 56, borderRadius: 18, backgroundColor: c.raised, borderColor: c.raised, borderWidth: 1, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
  selected: { borderColor: c.accent }, unitText: { flex: 1, fontFamily: f.uiMedium, fontSize: 17, color: c.bone },
  error: { fontFamily: f.ui, fontSize: 15, lineHeight: 22, color: c.accent },
  start: { minHeight: 56, borderRadius: 20, padding: 16, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  startText: { fontFamily: f.uiSemiBold, fontSize: 17, color: c.ink, textAlign: 'center' },
});
