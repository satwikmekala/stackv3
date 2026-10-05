import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Linking, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, ui } from '@/components/custom-split/ui';
import { redesignColors as c } from '@/constants/theme';
import { onboardingBackOptions } from '@/features/onboarding/OnboardingActions';
import { createHevyFlow, type HevyFlowState } from '@/features/import/hevy/flow';
import { HEVY_DEVELOPER_URL } from '@/features/import/hevy/client';
import { createHevyImportPlan } from '@/features/import/hevy/importPlan';
import { persistHevyImport } from '@/features/import/persistence';
import { initializeWorkoutDatabase, readCompletedSessionsSync, getCustomSplitsAsync } from '@/store/workoutDatabase';
import { clearOnboardingDraft, loadOnboardingDraft, useOnboardingDraft } from '@/store/onboardingDraft';
import { useWorkoutStore } from '@/store/workoutStore';

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;
export default function HevyImport() {
  const router = useRouter();
  const [key, setKey] = useState('');
  const [state, setState] = useState<HevyFlowState>({ stage: 'connect' });
  const [linkError, setLinkError] = useState<string | null>(null);
  const flow = useRef<ReturnType<typeof createHevyFlow> | null>(null);
  useEffect(() => {
    const controller = createHevyFlow({ publish: setState,
      plan: async snapshot => createHevyImportPlan(await initializeWorkoutDatabase(), snapshot),
      persist: async plan => {
        // Give the progress screen a frame before the atomic local transaction.
        await new Promise(resolve => setTimeout(resolve, 32));
        return persistHevyImport(await initializeWorkoutDatabase(), plan);
      },
      finish: async unit => {
        await loadOnboardingDraft();
        const customSplits = await getCustomSplitsAsync();
        const sessions = readCompletedSessionsSync();
        useWorkoutStore.getState().completeNoProgramOnboarding(useOnboardingDraft.getState().draft.name, unit);
        useWorkoutStore.setState({ customSplits, sessions });
        await clearOnboardingDraft().catch(() => {});
        router.replace('/(tabs)');
      },
    });
    flow.current = controller;
    return () => { controller.dispose(); flow.current = null; };
  }, [router]);
  const busy = state.stage === 'scanning' || state.stage === 'importing';
  const back = () => { if (state.stage !== 'importing') { setKey(''); flow.current?.dispose(); router.dismissTo('/bring-workouts'); } };
  const connect = () => { const input = key; setKey(''); Keyboard.dismiss(); void flow.current?.connect(input); };
  const plan = state.plan;
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={ui.screen}>
    <Stack.Screen options={{ headerShown: true, title: '', headerStyle: { backgroundColor: c.ink }, headerTintColor: c.bone,
      headerShadowVisible: false, gestureEnabled: !busy,
      // eslint-disable-next-line react-hooks/refs -- Toolbar creation stores the press callback; it does not invoke it while rendering.
      ...onboardingBackOptions('Back to import choices', back) }} />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.content}>
        {state.stage === 'connect' ? <>
          <View style={ui.section}><Text accessibilityRole="header" style={ui.title}>Connect Hevy</Text>
            <Text style={ui.body}>Bring your routines and workout history into Stack.</Text></View>
          <View style={ui.card}>
            <Text style={ui.subtitle}>Get your API key</Text>
            <Text style={ui.body}>1. Open Hevy’s website using the button below.</Text>
            <Text style={ui.body}>2. Sign in with your Hevy Pro account.</Text>
            <Text style={ui.body}>3. In Settings → Developer, copy your API key. Generate one if you don’t have one yet.</Text>
            <Text style={ui.body}>4. Return to Stack, paste the key and tap Connect.</Text>
            <Text style={ui.label}>Can’t see Developer settings on your phone? Open hevy.com/settings?developer on a computer.</Text>
          </View>
          <View style={ui.section}><Text style={ui.label}>Hevy API key</Text>
            <TextInput value={key} onChangeText={setKey} accessibilityLabel="Hevy API key" secureTextEntry
              autoCapitalize="none" autoCorrect={false} autoComplete="off" textContentType="none" spellCheck={false}
              placeholder="API key" placeholderTextColor={c.ashDim} style={ui.input} returnKeyType="go"
              onSubmitEditing={() => { if (key.trim()) connect(); }} />
            <Text style={ui.label}>Your key is used only to read Hevy for this import. Stack does not save it.</Text>
          </View>
          <View style={{ gap: 8 }}>
            <Action title="Connect" primary disabled={!key.trim()} onPress={connect} />
            <Action title="Get your Hevy API key" secondary onPress={() => { setLinkError(null); void Linking.openURL(HEVY_DEVELOPER_URL)
              .catch(() => setLinkError('Couldn’t open Hevy. Try again.')); }} />
            <Text style={ui.label}>Opens Hevy’s Developer settings in your browser. Sign in if asked.</Text>
          </View>
        </> : null}
        {busy ? <View style={ui.section}>
          <Text accessibilityRole="header" style={ui.title}>{state.stage === 'scanning' ? 'Reading your Hevy data…' : 'Importing from Hevy…'}</Text>
          <ActivityIndicator color={c.bone} accessibilityLabel={state.stage === 'scanning' ? 'Reading Hevy' : 'Saving your workouts'} />
          {state.progress ? <Text accessibilityLiveRegion="polite" style={ui.body}>{state.progress.stage === 'routines' ? count(state.progress.read, 'routine')
            : state.progress.stage === 'workouts' ? `${count(state.progress.read, 'workout')}${state.progress.total ? ` of ${state.progress.total}` : ''}`
              : count(state.progress.read, 'exercise')}</Text> : <Text style={ui.body}>Routines · Workouts · Exercises</Text>}
        </View> : null}
        {state.stage === 'preview' && plan ? <>
          <Text accessibilityRole="header" style={ui.title}>Ready to import</Text>
          <View style={ui.card}><Text style={ui.subtitle}>{count(plan.newRoutines, 'routine')}</Text>
            <Text style={ui.subtitle}>{count(plan.newWorkouts, 'workout')}</Text>
            <Text style={ui.body}>{count(plan.resolutions.length, 'exercise')}</Text>
            <Text style={ui.body}>{count(plan.customExercises, 'custom exercise')} will be added.</Text>
            {plan.existingRoutines + plan.existingWorkouts > 0 ? <Text style={ui.label}>{count(plan.existingRoutines, 'routine')} and {count(plan.existingWorkouts, 'workout')} already in Stack will be kept.</Text> : null}
          </View>
          {plan.warnings.map(warning => <Text key={warning} style={ui.body}>{warning}</Text>)}
          <Text style={ui.label}>Saved routines go into Your routines. Choose which one to use after setup.</Text>
          <Action title="Import from Hevy" primary onPress={() => { void flow.current?.import(); }} />
        </> : null}
        {state.stage === 'done' && state.result ? <>
          <Text style={ui.eyebrow}>IMPORTED FROM HEVY</Text><Text accessibilityRole="header" style={ui.title}>You’re ready.</Text>
          <Text style={ui.body}>{count(state.result.routines, 'routine')} and {count(state.result.workouts, 'workout')} added to Stack.</Text>
          <Text style={ui.body}>{count(state.result.exercises, 'custom exercise')} added.</Text>
          {state.result.alreadyImported ? <Text style={ui.label}>{count(state.result.alreadyImported, 'saved item')} already in Stack kept.</Text> : null}
          <Action title="Continue" primary onPress={() => { void flow.current?.continue(); }} />
        </> : null}
        {state.error || linkError ? <Text accessibilityRole="alert" style={ui.error}>{state.error ?? linkError}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
