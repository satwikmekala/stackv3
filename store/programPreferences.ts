export type ProgramMode = 'none' | 'stack' | 'custom';
export type ThreeDayStructure = 'full-body' | 'push-pull-legs';

export interface ProgramPreferences {
  programMode: ProgramMode;
  threeDayStructure: ThreeDayStructure;
  weightUnitConfirmed: boolean;
}

/** Only legacy callers omit these fields. Resolve their old behavior once. */
export function resolveProgramPreferences(profile: Partial<ProgramPreferences> & {
  activeSplitId: number | null;
  experienceLevel: string;
}): ProgramPreferences {
  const programMode = profile.programMode ?? (profile.activeSplitId === null ? 'stack' : 'custom');
  const threeDayStructure = profile.threeDayStructure ?? (
    profile.experienceLevel === 'beginner' ? 'full-body' : 'push-pull-legs'
  );
  const weightUnitConfirmed = profile.weightUnitConfirmed ?? true;
  if (!['none', 'stack', 'custom'].includes(programMode) ||
      !['full-body', 'push-pull-legs'].includes(threeDayStructure) ||
      typeof weightUnitConfirmed !== 'boolean' ||
      (programMode === 'custom'
        ? !Number.isInteger(profile.activeSplitId) || (profile.activeSplitId ?? 0) <= 0
        : profile.activeSplitId !== null)) {
    throw new Error('Invalid program preferences.');
  }
  return { programMode, threeDayStructure, weightUnitConfirmed };
}
