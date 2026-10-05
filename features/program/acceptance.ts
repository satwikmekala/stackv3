import type { ThreeDayStructure } from '@/store/programPreferences';
import { validateProgram } from './lineup';

export function createProgramAcceptance(dependencies: {
  saveDraft: (frequency: number, structure: ThreeDayStructure) => Promise<void>;
  commit: (frequency: number, structure: ThreeDayStructure) => { onboardingCompleted: boolean };
  clearDraft: () => Promise<void>;
  finish: () => void;
}) {
  let pending: Promise<void> | null = null;
  let accepted = false;
  return (frequency: number, structure: ThreeDayStructure): Promise<void> => {
    if (accepted) return Promise.resolve();
    if (pending) return pending;
    pending = (async () => {
      validateProgram(frequency, structure);
      await dependencies.saveDraft(frequency, structure);
      const profile = dependencies.commit(frequency, structure);
      if (!profile.onboardingCompleted) throw Error('Could not save your program. Try again.');
      await dependencies.clearDraft().catch(() => {});
      dependencies.finish();
      accepted = true;
    })().finally(() => { pending = null; });
    return pending;
  };
}
