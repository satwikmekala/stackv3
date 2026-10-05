import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, ui } from '@/components/custom-split/ui';
import { redesignColors as c } from '@/constants/theme';
import { ImportedFacts } from '@/features/import/ImportedFacts';
import type { ImportedRoutineFacts } from '@/features/import/persistence';
import { initializeWorkoutDatabase } from '@/store/workoutDatabase';
import { useWorkoutStore } from '@/store/workoutStore';

export default function HevyRoutineDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const unit = useWorkoutStore(state => state.profile?.weightUnit ?? 'kg');
  const [routines, setRoutines] = useState<ImportedRoutineFacts[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let mounted = true;
    const read = async () => {
      const group = Number(id); if (!Number.isSafeInteger(group) || group <= 0) throw Error();
      const db = await initializeWorkoutDatabase();
      const rows = await db.getAllAsync<{ data: string }>(`SELECT ir.data FROM imported_routines ir
        JOIN custom_split_workouts w ON w.id = ir.workout_id WHERE w.split_id = ? ORDER BY w.position, w.id`, group);
      const data = rows.map(row => JSON.parse(row.data) as ImportedRoutineFacts);
      if (mounted) { setRoutines(data); setFailed(false); }
    };
    void read().catch(() => { if (mounted) setFailed(true); });
    return () => { mounted = false; };
  }, [id, attempt]);
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={ui.screen}>
    <Stack.Screen options={{ headerShown: true, title: 'Hevy details', headerStyle: { backgroundColor: c.ink },
      headerTintColor: c.bone, headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }} />
    <ScrollView contentContainerStyle={ui.content}>
      <Text style={ui.title}>Imported from Hevy</Text>
      <Text style={ui.body}>These details preserve the original routine. Edits in Stack do not change this reference.</Text>
      {!routines && !failed ? <ActivityIndicator color={c.ash} /> : null}
      {failed ? <><Text style={ui.error}>Couldn’t read your saved details. Try again.</Text><Action title="Try again" onPress={() => setAttempt(value => value + 1)} /></> : null}
      {routines?.map(routine => <ScrollView key={routine.id} scrollEnabled={false} contentContainerStyle={{ gap: 12 }}>
        <Text style={ui.subtitle}>{routine.name}</Text><ImportedFacts exercises={routine.exercises} templates={routine.templates} unit={unit} />
      </ScrollView>)}
      {routines?.length === 0 ? <Text style={ui.body}>No imported details are available for this routine.</Text> : null}
    </ScrollView>
  </SafeAreaView>;
}
