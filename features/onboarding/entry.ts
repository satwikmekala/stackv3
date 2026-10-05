import type { StartingChoice } from '@/store/onboardingDraft';

/** One attempt owns persistence and navigation. A rejected attempt is retryable. */
export function createOnboardingEntry(dependencies: {
  prepare?: () => Promise<void>;
  saveChoice: (choice: StartingChoice) => Promise<void>;
  completeProfile: () => { onboardingCompleted: boolean };
  clearDraft: () => Promise<void>;
  enterApp: () => void;
}) {
  let pending: Promise<void> | null = null;
  let entered = false;
  return (choice: 'track' | 'explore'): Promise<void> => {
    if (entered) return Promise.resolve();
    if (pending) return pending;
    pending = (async () => {
      await dependencies.prepare?.();
      await dependencies.saveChoice(choice);
      const profile = dependencies.completeProfile();
      if (!profile.onboardingCompleted) throw Error('Could not save your profile. Try again.');
      // Profile is durably complete. Cleanup failure cannot turn this into a
      // second acceptance; the entry route retries cleanup on the next visit.
      await dependencies.clearDraft().catch(() => {});
      dependencies.enterApp();
      entered = true;
    })().finally(() => { pending = null; });
    return pending;
  };
}
