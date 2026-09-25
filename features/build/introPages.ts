import { INTRO_PAGE_COUNT } from './introCopy';

/** Navigation rules for the introduction. Pure, so every rule is testable. */

/** A page that finished, or that the user has already left, only ever shows its final frame. */
export const isPlayed = (page: number, finished: readonly boolean[], visited: ReadonlySet<number>) => Boolean(finished[page]) || visited.has(page);
/** Skip and the next arrow appear on pages 1–3; page 4 shows only its call to action. */
export const showsSkip = (page: number) => page < INTRO_PAGE_COUNT - 1;
export const showsNext = showsSkip;
/** The page a paged scroll view has settled on. */
export const pageFromOffset = (offsetX: number, width: number) =>
  width > 0 ? Math.max(0, Math.min(INTRO_PAGE_COUNT - 1, Math.round(offsetX / width))) : 0;

export type IntroExit = 'skip' | 'cta' | 'back' | 'dismiss';
/**
 * Every way out of the introduction marks it seen: Skip, the page 4 call to action, the back
 * gesture/button, or the screen being dismissed. The first exit wins; later ones are ignored.
 */
export function createIntroExit(introduction: { dismiss(): Promise<void> }) {
  let exited: IntroExit | null = null;
  return {
    exit(reason: IntroExit) {
      if (exited) return false;
      exited = reason;
      void introduction.dismiss();
      return true;
    },
    get exited() { return exited; },
  };
}

/** Page 4's call to action appears this long after the page is shown, even if its animation hasn't finished. */
export const PAGE4_CTA_FALLBACK_MS = 3000;
type Timers = { set: (callback: () => void, ms: number) => unknown; clear: (handle: unknown) => void };
const systemTimers: Timers = { set: (callback, ms) => setTimeout(callback, ms), clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>) };
/** Starts when page 4 is shown; returns a cancel for when the page is left or the CTA revealed itself. */
export function scheduleCtaFallback(reveal: () => void, timers: Timers = systemTimers) {
  const handle = timers.set(reveal, PAGE4_CTA_FALLBACK_MS);
  return () => timers.clear(handle);
}
