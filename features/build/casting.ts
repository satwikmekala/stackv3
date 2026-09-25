import type { WorkoutSession } from '../../store/workoutStore';

export const CASTING_DURATION_MS = 5600;
export type CastingPhase = 'form' | 'progress' | 'gold' | 'reveal' | 'land' | 'stacked';
/** Animation-time start of each phase. The curves below are keyed to these same values. */
export const CASTING_PHASE_STARTS: Readonly<Record<CastingPhase, number>> = { form: 0, progress: 800, gold: 1800, reveal: 2600, land: 3800, stacked: 4700 };
const ease = (elapsed: number, start: number, end: number) => {
  const t = Math.max(0, Math.min(1, (elapsed - start) / (end - start)));
  return t * t * (3 - 2 * t);
};
/** Presentation only: no frame can change evidence, piece count, or saved history. */
export function castingFrame(elapsed: number, finalHeight: number) {
  const starts = CASTING_PHASE_STARTS;
  const phase: CastingPhase = elapsed < starts.progress ? 'form' : elapsed < starts.gold ? 'progress' : elapsed < starts.reveal ? 'gold'
    : elapsed < starts.land ? 'reveal' : elapsed < starts.stacked ? 'land' : 'stacked';
  const formed = 0.06 + 0.94 * ease(elapsed, 0, 650);
  const progress = ease(elapsed, 800, 1700);
  return {
    phase,
    scaleY: formed * (1 + (finalHeight - 1) * progress) / finalHeight,
    gold: ease(elapsed, 1800, 2400),
    reveal: ease(elapsed, 2600, 3700),
    lift: 1.3 * (1 - ease(elapsed, 3800, 4650)),
    done: elapsed >= CASTING_DURATION_MS,
  };
}

/** A pause in animation time: at `at` ms the frame freezes for `ms` ms of wall-clock time. */
export type CastingHold = { at: number; ms: number };
/**
 * Maps wall-clock playback time to animation time. Holds only delay when the next part of
 * the timeline begins; every frame shown is still an ordinary castingFrame.
 */
export function castingTimeline(holds: readonly CastingHold[]) {
  const ordered = holds.filter((hold) => hold.ms > 0).sort((a, b) => a.at - b.at);
  const held = ordered.reduce((sum, hold) => sum + hold.ms, 0);
  return {
    totalMs: CASTING_DURATION_MS + held,
    animationTime(wallMs: number) {
      let consumed = 0;
      for (const hold of ordered) {
        if (wallMs - consumed <= hold.at) break;
        if (wallMs - consumed <= hold.at + hold.ms) return hold.at;
        consumed += hold.ms;
      }
      return wallMs - consumed;
    },
  };
}

/** Claim and motion-preference checks only; never covers GL creation or the renderer. */
export const PREPARATION_TIMEOUT_MS = 8000;
/** Playback that makes no progress for this long has stalled. */
export const STALL_MS = 2000;
export type Timers = { set: (callback: () => void, ms: number) => unknown; clear: (handle: unknown) => void };
export const systemTimers: Timers = { set: (callback, ms) => setTimeout(callback, ms), clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>) };
/**
 * Safety net for casting and fusion playback. It detects stalls, not elapsed time: it arms on
 * the first frame whose clamped playback clock has advanced (so GL creation, shader compile and
 * warm-up frames can never trip it) and fires only when that clock then makes no progress for
 * STALL_MS. Pausing suspends it; a completed playback disarms it for good.
 */
export function createStallWatchdog(onStall: () => void, timers: Timers = systemTimers, stallMs = STALL_MS) {
  let last = 0;
  let handle: unknown;
  let paused = false;
  let done = false;
  const clear = () => { if (handle !== undefined) timers.clear(handle); handle = undefined; };
  const arm = () => {
    clear();
    if (!paused && !done && last > 0) handle = timers.set(() => { handle = undefined; if (!done) { done = true; onStall(); } }, stallMs);
  };
  return {
    /** Called on every rendered frame with the playback clock the animation uses. */
    frame(playbackMs: number) { if (!done && playbackMs > last) { last = playbackMs; arm(); } },
    pause() { paused = true; clear(); },
    resume() { if (paused) { paused = false; arm(); } },
    complete() { done = true; clear(); },
    dispose() { done = true; clear(); },
  };
}

export type PresentationStorage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };
/**
 * A live completion grants one attempt. Cold starts/history links can only reach the summary.
 * A successful claim is held in memory; it is persisted only by commit() (final beat shown or
 * Skip), and release() makes it claimable again (e.g. backgrounded before the final beat).
 */
export function createCastingGate() {
  const pending = new Set<string>();
  const held = new Set<string>();
  const key = (sessionId: string) => `stack.build.casting.v1:${sessionId}`;
  return {
    issue(sessionId: string) { pending.add(sessionId); },
    discard(sessionId: string) { pending.delete(sessionId); held.delete(sessionId); },
    async claim(sessionId: string, storage: PresentationStorage) {
      if (!pending.delete(sessionId)) return false;
      try {
        if (await storage.getItem(key(sessionId))) return false;
        held.add(sessionId);
        return true;
      } catch { return false; }
    },
    async commit(sessionId: string, storage: PresentationStorage) {
      if (!held.delete(sessionId)) return;
      try { await storage.setItem(key(sessionId), 'consumed'); } catch { /* Seen already; a failed write only allows a replay. */ }
    },
    release(sessionId: string) { if (held.delete(sessionId)) pending.add(sessionId); },
  };
}
export const castingGate = createCastingGate();
export function completionDestination(session: WorkoutSession | undefined, buildEnabled: boolean) {
  if (!session) return null;
  const cast = buildEnabled && session.completed && !session.retroactive;
  if (cast) castingGate.issue(session.id);
  return { pathname: cast ? '/build-casting' as const : '/workout-summary' as const, params: { sessionId: session.id } };
}
export function once(action: () => void) {
  let finished = false;
  return () => { if (!finished) { finished = true; action(); } };
}
