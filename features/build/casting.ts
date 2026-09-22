import type { WorkoutSession } from '../../store/workoutStore';

export const CASTING_DURATION_MS = 5600;
export type CastingPhase = 'form' | 'progress' | 'gold' | 'reveal' | 'land' | 'stacked';
const ease = (elapsed: number, start: number, end: number) => {
  const t = Math.max(0, Math.min(1, (elapsed - start) / (end - start)));
  return t * t * (3 - 2 * t);
};
/** Presentation only: no frame can change evidence, piece count, or saved history. */
export function castingFrame(elapsed: number, finalHeight: number) {
  const phase: CastingPhase = elapsed < 800 ? 'form' : elapsed < 1800 ? 'progress' : elapsed < 2600 ? 'gold' : elapsed < 3800 ? 'reveal' : elapsed < 4700 ? 'land' : 'stacked';
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

export type PresentationStorage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };
/** A live completion grants one attempt. Cold starts/history links can only reach the summary. */
export function createCastingGate() {
  const pending = new Set<string>();
  return {
    issue(sessionId: string) { pending.add(sessionId); },
    discard(sessionId: string) { pending.delete(sessionId); },
    async claim(sessionId: string, storage: PresentationStorage) {
      if (!pending.delete(sessionId)) return false;
      try {
        const key = `stack.build.casting.v1:${sessionId}`;
        if (await storage.getItem(key)) return false;
        await storage.setItem(key, 'consumed');
        return true;
      } catch { return false; }
    },
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
