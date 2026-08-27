import type { UserProfile } from '@/store/workoutStore';

// Display/input unit. Storage is always kg-canonical — nothing in this file
// changes what is persisted, only how a stored kg value is shown or stepped.
export type WeightUnit = 'kg' | 'lbs';

const LBS_PER_KG = 2.20462;

export const kgToLbs = (kg: number): number => kg * LBS_PER_KG;

export const lbsToKg = (lbs: number): number => lbs / LBS_PER_KG;

// Matches the trim-trailing-.0 formatters currently duplicated in
// ExerciseFinisher.tsx and BonusSet.tsx (both identical), so those can be
// replaced by this without any change in output.
export const formatWeight = (kgValue: number, unit: WeightUnit): string => {
  const weight = unit === 'lbs' ? kgToLbs(kgValue) : kgValue;
  return Number.isInteger(weight) ? weight.toString() : weight.toFixed(1).replace(/\.0$/, '');
};

// Returns the step already in the active unit — callers never convert.
export const getWeightIncrement = (
  profile: Pick<UserProfile, 'weightUnit' | 'weightIncrement' | 'weightIncrementLbs'>
): number => (profile.weightUnit === 'lbs' ? profile.weightIncrementLbs : profile.weightIncrement);

export const unitLabel = (unit: WeightUnit): string => (unit === 'lbs' ? 'lbs' : 'kg');
