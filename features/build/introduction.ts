import type { PresentationStorage } from './casting';

export const BUILD_INTRO_KEY = 'stack.build.introduction.v1';
/**
 * Completion/skip is presentation state only, independent of account onboarding. The flag is
 * read from storage once into memory and republished only when dismissal writes it.
 */
export function createBuildIntroduction(storage: PresentationStorage) {
  let seen: boolean | null = null;
  let reading: Promise<boolean> | null = null;
  const listeners = new Set<() => void>();
  const publish = (value: boolean) => { seen = value; listeners.forEach((listener) => listener()); };
  const load = (): Promise<boolean> => {
    if (seen) return Promise.resolve(true);
    // An unseen answer can still be read again later, so a closed-before-dismissal entry retries.
    return reading ??= storage.getItem(BUILD_INTRO_KEY)
      .then((value) => value === 'seen', () => false /* Allow the introduction when local storage is unavailable. */)
      .then((value) => { reading = null; if (!seen) publish(value); return seen === true; });
  };
  return {
    load,
    /** null until the first read settles. */
    getSnapshot: () => seen,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async shouldShow() { return !(await load()); },
    async dismiss() {
      publish(true);
      try { await storage.setItem(BUILD_INTRO_KEY, 'seen'); } catch { /* Never block entry; remember for this app session. */ }
    },
  };
}
