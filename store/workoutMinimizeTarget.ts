import { create } from 'zustand';

// Side inset of the active workout card. Matches the tab screens' 24pt content
// padding so the card lines up with the cards around it.
export const WORKOUT_BAR_SIDE_INSET = 24;

// Transient geometry of the card on the screen beneath Workout. Never persisted.
// `lift` is how far the user has dragged the card above its resting position.
export const useWorkoutMinimizeTarget = create<{
  bottom: number | null;
  height: number;
  lift: number;
}>(() => ({ bottom: null, height: 62, lift: 0 }));
