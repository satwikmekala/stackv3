import { splitColors } from '@/constants/theme';
import type { BuildSlab } from '@/features/build/model';

export const WELCOME_EXERCISES = [
  { name: 'Bench press', sets: '3 × 8', muscle: 'Chest', color: splitColors.chest },
  { name: 'Shoulder press', sets: '3 × 10', muscle: 'Shoulders', color: splitColors.shoulders },
  { name: 'Triceps pushdown', sets: '3 × 12', muscle: 'Arms', color: splitColors.arms },
] as const;

/** Illustrative geometry only: these IDs never identify saved workouts or earned pieces. */
export const WELCOME_SLABS: BuildSlab[] = [
  { id: 'welcome:week-1', sealed: true, height: 1.5, layers: [
    { color: splitColors.back, height: 1, record: false },
    { color: splitColors.legs, height: 1, record: false },
    { color: splitColors.chest, height: 1, record: false },
  ] },
  { id: 'welcome:week-2', sealed: true, height: 1.65, layers: [
    { color: splitColors.shoulders, height: 1, record: false },
    { color: splitColors.arms, height: 1, record: false },
    { color: splitColors.legs, height: 1, record: false },
  ] },
  { id: 'welcome:pull', sealed: false, height: 1.15, layers: [{ color: splitColors.back, height: 1, record: false }] },
  { id: 'welcome:legs', sealed: false, height: 1, layers: [{ color: splitColors.legs, height: 1, record: false }] },
  { id: 'welcome:push', sealed: false, height: 1.15, layers: [...WELCOME_EXERCISES].reverse().map(({ color, muscle }) => ({
    color, height: muscle === 'Chest' ? 3 : 1, record: false,
  })) },
];

export type WelcomeComposition = 'object' | 'workout';
export function welcomeComposition(value: unknown): WelcomeComposition {
  return value === 'workout' ? 'workout' : 'object';
}
