import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, ui } from '@/components/custom-split/ui';
import { redesignColors } from '@/constants/theme';
import { flushCustomSplitDrafts, useCustomSplitDraftStore } from '@/store/customSplitDraft';
import { EXERCISE_SEEDS, ARCHETYPE_EXERCISE_SEEDS } from '@/store/workoutDatabase';
import { createSharedRoutineEntry } from '@/features/sharing/sharedRoutineEntry';
import { SharedRoutineLoadFailure } from '@/features/sharing/routineShareClient';
import { ROUTINE_SHARE_ID_PATTERN } from '@/features/sharing/splitTransport';
import { clearSharedRoutineHandoff, rememberSharedRoutineId } from '@/store/sharedRoutineHandoff';
import { useWorkoutStore } from '@/store/workoutStore';
import { FIRST_RUN_ROUTE } from '@/features/onboarding/config';

/** Universal and explicit fallback links both use this existing entry. */
export default function SharedRoutineScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const router = useRouter();
  const hydrated = useCustomSplitDraftStore(state => state.hydrated);
  const storageError = useCustomSplitDraftStore(state => state.storageError);
  const profileReady = useWorkoutStore(state => state.isHydrated);
  const completed = useWorkoutStore(state => Boolean(state.profile?.onboardingCompleted));
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const requestKey = JSON.stringify(id);
  const error = failure?.key === requestKey ? failure.message : null;
  const [retry, setRetry] = useState(0);
  const entry = useMemo(() => createSharedRoutineEntry({
    seeds: [...EXERCISE_SEEDS, ...ARCHETYPE_EXERCISE_SEEDS],
    getDraftStore: useCustomSplitDraftStore.getState,
    openEditor: async (shareId, options) => {
      await flushCustomSplitDrafts();
      if (options?.signal.aborted) return;
      await clearSharedRoutineHandoff(shareId);
      if (!options?.signal.aborted) router.replace({ pathname: '/custom-split', params: { source: 'shared', shareId } });
    },
  }), [router]);
  useFocusEffect(useCallback(() => {
    let focused = true;
    const enter = async () => {
      if (typeof id !== 'string' || !ROUTINE_SHARE_ID_PATTERN.test(id)) throw new SharedRoutineLoadFailure('broken');
      if (!completed) {
        await rememberSharedRoutineId(id);
        if (focused) router.replace(FIRST_RUN_ROUTE);
      } else if (hydrated) await entry.load(id);
    };
    if (profileReady) void enter().catch(failure => {
      if (focused) setFailure({ key: requestKey, message: failure instanceof SharedRoutineLoadFailure ? failure.message :
        failure instanceof Error && failure.message === 'This routine needs a newer Stack. Update to open it.' ? failure.message :
          'Couldn’t load this routine. Try again.' });
    });
    return () => { focused = false; entry.cancel(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Retry deliberately restarts the focused load.
  }, [entry, hydrated, profileReady, completed, id, requestKey, retry, router]));
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={ui.screen}>
    <Stack.Screen options={{ headerShown: true, title: '', headerBackButtonDisplayMode: 'minimal' }} />
    <View style={[ui.content, { flex: 1, justifyContent: 'center', gap: 20 }]}>
      {error || storageError ? <><Text accessibilityRole="alert" style={ui.error}>{error ?? storageError}</Text>
        <Action title="Try again" onPress={() => { setFailure(null); if (!hydrated) void useCustomSplitDraftStore.persist.rehydrate(); setRetry(value => value + 1); }} />
        <Action title="Back" onPress={() => router.canGoBack() ? router.back() : router.replace('/your-splits')} /></> : <>
        <ActivityIndicator color={redesignColors.ash} accessibilityLabel="Loading routine" />
        <Text accessibilityLiveRegion="polite" style={ui.body}>Loading routine…</Text>
      </>}
    </View>
  </SafeAreaView>;
}
