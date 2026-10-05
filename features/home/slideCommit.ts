/** Shared by the gesture and its boundary tests; velocity never commits a workout. */
export const SLIDE_COMMIT_RATIO = 0.9;
export function shouldCommitSlide(distance: number, travel: number, verticalDistance: number, succeeded: boolean) {
  'worklet';
  return succeeded && travel > 0 && distance >= travel * SLIDE_COMMIT_RATIO && Math.abs(verticalDistance) <= 64;
}
