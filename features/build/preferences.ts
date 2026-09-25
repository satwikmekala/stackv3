import type { PresentationStorage } from './casting';
export const BUILD_EFFECTS_KEY = 'stack.build.reduceEffects.v1';
export function createBuildPreferences(storage: PresentationStorage) {
  let snapshot = { ready: false, reduceEffects: false };
  let revision = 0;
  let loaded: Promise<void> | undefined;
  let writes = Promise.resolve();
  const listeners = new Set<() => void>();
  const publish = (next: typeof snapshot) => { snapshot = next; listeners.forEach((listener) => listener()); };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    load() {
      if (loaded) return loaded;
      const started = revision;
      return loaded = storage.getItem(BUILD_EFFECTS_KEY).then((value) => { if (revision === started) publish({ ready: true, reduceEffects: value === '1' }); }).catch(() => { if (revision === started) publish({ ready: true, reduceEffects: false }); });
    },
    setReduceEffects(value: boolean) {
      revision++;
      publish({ ready: true, reduceEffects: value });
      writes = writes.then(() => storage.setItem(BUILD_EFFECTS_KEY, value ? '1' : '0')).catch(() => {});
      return writes;
    },
  };
}
/** Rewards must never outrun reading or bypass an explicit low-effects preference. */
export function shouldSkipBuildReward(reducedMotion: boolean, screenReader: boolean, reduceEffects: boolean, fontScale: number) {
  return reducedMotion || screenReader || reduceEffects || fontScale > 1.3;
}
