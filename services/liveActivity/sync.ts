// Android/web never import the SwiftUI layout or initialize a native factory.
export function startWorkoutLiveActivitySync(): () => void {
  return () => {};
}

export function refreshWorkoutLiveActivity(): void {}
