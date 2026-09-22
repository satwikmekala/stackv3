import type { PresentationStorage } from './casting';

export const BUILD_INTRO_KEY = 'stack.build.introduction.v1';
/** Completion/skip is presentation state only, independent of account onboarding. */
export function createBuildIntroduction(storage: PresentationStorage) {
  let dismissed = false;
  return {
    async shouldShow() {
      if (dismissed) return false;
      try { if (await storage.getItem(BUILD_INTRO_KEY) === 'seen') dismissed = true; } catch { /* Allow the introduction when local storage is unavailable. */ }
      return !dismissed;
    },
    async dismiss() {
      dismissed = true;
      try { await storage.setItem(BUILD_INTRO_KEY, 'seen'); } catch { /* Never block entry; remember for this app session. */ }
    },
  };
}
