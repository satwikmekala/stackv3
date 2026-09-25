import {
  FadeInDown,
  FadeOut,
  LinearTransition,
  ReduceMotion,
} from 'react-native-reanimated';
import { motionEasing } from '@/constants/motion';

// Shared, restrained motion for changes to the live workout's structure.
// System reduced motion removes the movement when the device requests it.
export const workoutLayoutTransition = LinearTransition.duration(220)
  .easing(motionEasing.decelerate)
  .reduceMotion(ReduceMotion.System);

export const workoutRowEntering = FadeInDown.duration(180)
  .easing(motionEasing.decelerate)
  .withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })
  .reduceMotion(ReduceMotion.System);

export const workoutRowExiting = FadeOut.duration(160)
  .easing(motionEasing.accelerate)
  .reduceMotion(ReduceMotion.System);

export const workoutCardEntering = FadeInDown.duration(200)
  .easing(motionEasing.decelerate)
  .withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })
  .reduceMotion(ReduceMotion.System);

export const workoutCardExiting = FadeOut.duration(180)
  .easing(motionEasing.accelerate)
  .reduceMotion(ReduceMotion.System);
