import { FadeIn, FadeOut, Keyframe, ReduceMotion } from 'react-native-reanimated';
import { motionEasing } from '@/constants/motion';

// Micro-interactions live inside structural/layout wrappers.
export const workoutMotion = {
  pressScale: 0.97,
  press: 110,
  confirm: 220,
  number: 160,
  numberTravel: 6,
  toggle: 200,
  reward: 300,
} as const;

export const workoutTiming = (duration: number) => ({
  duration,
  easing: motionEasing.decelerate,
  reduceMotion: ReduceMotion.System,
});

export const confirmationEnter = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.8 }] },
  70: { opacity: 1, transform: [{ scale: 1.04 }] },
  100: { opacity: 1, transform: [{ scale: 1 }] },
}).duration(workoutMotion.confirm).reduceMotion(ReduceMotion.System);
export const confirmationExit = FadeOut.duration(workoutMotion.press)
  .reduceMotion(ReduceMotion.System);
export const recordReveal = FadeIn.duration(workoutMotion.reward)
  .reduceMotion(ReduceMotion.System);

// Convert units in place without spinning through every intermediate weight.
export const weightUnitEnter = FadeIn.duration(workoutMotion.number)
  .reduceMotion(ReduceMotion.System);
export const weightUnitExit = FadeOut.duration(workoutMotion.number)
  .reduceMotion(ReduceMotion.System);


// Near-critical, bounded selection glide. Reanimated carries the current
// position and velocity into a new target when the user changes direction.
export const workoutSetSelectionSpring = {
  stiffness: 520,
  damping: 42,
  mass: 1,
  overshootClamping: true,
  reduceMotion: ReduceMotion.System,
} as const;
