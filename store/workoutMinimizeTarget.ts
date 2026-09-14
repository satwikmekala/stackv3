import { create } from 'zustand';

// Transient geometry of the card on the screen beneath Workout. Never persisted.
export const useWorkoutMinimizeTarget = create<{
  bottom: number | null;
  height: number;
}>(() => ({ bottom: null, height: 62 }));
