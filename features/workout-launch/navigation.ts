import type { ImperativeRouter } from 'expo-router';
import { resumeWorkout } from '@/utils/workoutResume';
import type { LaunchResult } from './coordinator';

export function navigateWorkoutLaunch(router: Pick<ImperativeRouter, 'push' | 'replace'>, result: LaunchResult, fromSheet = false) {
  if (result.kind === 'confirmation') router.push('/workout-unit');
  else if (result.kind === 'resume') {
    if (fromSheet) router.replace({ pathname: '/workout', params: { fromActivityCard: '1' } });
    else resumeWorkout(router);
  } else if (result.kind === 'started') {
    // Train's source handle resets while the native sheet is open. Use the
    // ordinary logger entrance after confirmation rather than stale geometry.
    const target = { pathname: '/workout' as const, params: !fromSheet && result.origin ? { launchOrigin: JSON.stringify(result.origin) } : {} };
    if (fromSheet) router.replace(target); else router.push(target);
  }
}
