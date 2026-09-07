import {
  Easing,
  ReduceMotion,
  withTiming,
  type AnimatableValue,
  type AnimationCallback,
} from 'react-native-reanimated';

export const motionDuration = {
  feedback: 120,
  transition: 220,
  entrance: 480,
} as const;

export const motionEasing = {
  decelerate: Easing.out(Easing.cubic),
  accelerate: Easing.in(Easing.cubic),
} as const;

export type MotionDuration = keyof typeof motionDuration;
export type MotionEasing = keyof typeof motionEasing;

export type MotionTimingOptions = {
  duration?: MotionDuration;
  easing?: MotionEasing;
};

export function withMotionTiming<T extends AnimatableValue>(
  toValue: T,
  options: MotionTimingOptions = {},
  callback?: AnimationCallback
): T {
  'worklet';

  const duration = options.duration ?? 'transition';
  const easing = options.easing ?? 'decelerate';

  return withTiming(
    toValue,
    {
      duration: motionDuration[duration],
      easing: motionEasing[easing],
      reduceMotion: ReduceMotion.System,
    },
    callback
  );
}
