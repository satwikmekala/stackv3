import { useEffect, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ui } from '@/components/custom-split/ui';
import { redesignColors as c } from '@/constants/theme';
import { onboardingBackOptions } from '@/features/onboarding/OnboardingActions';
import { createHevyFileFlow, type HevyFileState } from '@/features/import/hevyCsv/flow';
import { pickHevyExportFile } from '@/features/import/hevyCsv/file';
import { parseHevyExport } from '@/features/import/hevyCsv/parser';
import { HevyFileContent } from '@/features/import/hevyCsv/HevyFileContent';
import { createHevyImportPlan, readImportCatalog } from '@/features/import/hevy/importPlan';
import { persistHevyImport } from '@/features/import/persistence';
import { initializeWorkoutDatabase, getCustomSplitsAsync, readCompletedSessionsSync } from '@/store/workoutDatabase';
import { clearOnboardingDraft, loadOnboardingDraft, useOnboardingDraft } from '@/store/onboardingDraft';
import { useWorkoutStore } from '@/store/workoutStore';

export default function HevyFileImport() {
  const router = useRouter();
  const [state, setState] = useState<HevyFileState>({ stage: 'instructions' });
  const flow = useRef<ReturnType<typeof createHevyFileFlow> | null>(null);
  useEffect(() => {
    const controller = createHevyFileFlow({ publish: setState,
      read: async () => {
        const text = await pickHevyExportFile();
        if (text === null) return null;
        return parseHevyExport(text, readImportCatalog(await initializeWorkoutDatabase()));
      },
      plan: async snapshot => createHevyImportPlan(await initializeWorkoutDatabase(), snapshot),
      persist: async plan => persistHevyImport(await initializeWorkoutDatabase(), plan),
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
  const busy = state.stage === 'reading' || state.stage === 'importing';
  const back = () => {
    if (state.stage === 'importing') return;
    flow.current?.dispose();
    router.dismissTo({ pathname: '/bring-workouts', params: { hevyPlan: 'choose' } });
  };
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={ui.screen}>
    <Stack.Screen options={{ headerShown: true, title: '', headerStyle: { backgroundColor: c.ink }, headerTintColor: c.bone,
      headerShadowVisible: false, gestureEnabled: !busy,
      // eslint-disable-next-line react-hooks/refs -- Creates a toolbar callback; the ref is read only when pressed.
      ...onboardingBackOptions('Back to Hevy plan choice', back) }} />
    <ScrollView contentContainerStyle={ui.content}>
      <HevyFileContent state={state} choose={() => { void flow.current?.choose(); }} save={() => { void flow.current?.import(); }}
        finish={() => { void flow.current?.continue(); }} />
    </ScrollView>
  </SafeAreaView>;
}
