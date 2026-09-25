import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, View, Text } from 'react-native';
import { Button } from '@/components/Button';
import { colors, fonts } from '@/constants/theme';
import StackTestLiveActivity from './StackTestLiveActivity';
import { workoutActivity } from '@/services/liveActivity/factories.ios';
import { useWorkoutStore } from '@/store/workoutStore';

export function TestLiveActivityControls() {
  const currentSession = useWorkoutStore((state) => state.currentSession);
  const isHydrated = useWorkoutStore((state) => state.isHydrated);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [hasActivity, setHasActivity] = useState(
    () => StackTestLiveActivity.getInstances().length > 0
  );
  const [hasRealActivity, setHasRealActivity] = useState(() => workoutActivity.getInstances().length > 0);
  useEffect(() => {
    const refresh = () => {
      setHasActivity(StackTestLiveActivity.getInstances().length > 0);
      setHasRealActivity(workoutActivity.getInstances().length > 0);
    };
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [currentSession]);

  const runOnce = async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      Alert.alert('Test Live Activity', error instanceof Error ? error.message : String(error));
    } finally {
      setHasActivity(StackTestLiveActivity.getInstances().length > 0);
      busyRef.current = false;
      setBusy(false);
    }
  };

  const start = () =>
    runOnce(async () => {
      const state = useWorkoutStore.getState();
      if (!state.isHydrated || state.currentSession || workoutActivity.getInstances().length > 0) return;
      if (StackTestLiveActivity.getInstances().length > 0) return;
      StackTestLiveActivity.start({
        exerciseName: 'Bench Press',
        compactName: 'Bench',
        setNumber: 2,
        totalSets: 4,
        weight: 80,
        unit: 'kg',
        reps: 8,
      });
    });

  const end = () =>
    runOnce(async () => {
      await Promise.all(StackTestLiveActivity.getInstances().map((instance) => instance.end('immediate')));
    });

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 20, marginBottom: 12 }}>
      <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.bone, marginBottom: 8 }}>
        Development: TEST Live Activity
      </Text>
      {currentSession || hasRealActivity ? (
        <Text style={{ color: colors.ash, marginBottom: 8 }}>
          Test starts are disabled while a real workout is active.
        </Text>
      ) : null}
      <View style={{ gap: 10 }}>
        <Button title="Start Test Live Activity" onPress={start} disabled={busy || hasActivity || !isHydrated || !!currentSession || hasRealActivity} />
        <Button title="End Test Live Activity" onPress={end} disabled={busy || !hasActivity} />
      </View>
    </View>
  );
}
