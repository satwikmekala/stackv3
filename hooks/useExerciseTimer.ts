import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { DURATION_MAX_S } from '@/store/exerciseMeasurement';
import { elapsedTimerMs, stopExerciseTimer, useExerciseTimerStore } from '@/store/exerciseTimer';
import { sameSetTarget, type WorkoutSetEditTarget } from '@/store/workoutSetActions';

export function useExerciseTimer(target?: WorkoutSetEditTarget | null) {
  const storedTimer = useExerciseTimerStore(state => state.timer);
  const timer = target && storedTimer && sameSetTarget(target, storedTimer.target) ? storedTimer : null;
  const [, refresh] = useState(0);
  const running = timer?.startedAt !== null && timer !== null;

  useEffect(() => {
    if (!running || !timer) return;
    const tick = () => {
      refresh(value => value + 1);
      if (elapsedTimerMs(timer) >= DURATION_MAX_S * 1000) stopExerciseTimer(timer.target);
    };
    tick();
    const interval = setInterval(tick, 250);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') tick(); });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [running, timer]);

  return { timer, running, elapsedS: timer ? Math.floor(elapsedTimerMs(timer) / 1000) : 0 };
}
