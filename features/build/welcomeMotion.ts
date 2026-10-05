export type WelcomePhase = 'workout' | 'forming' | 'joining' | 'settled';
export const WELCOME_DURATION_MS = 2600;

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };

/** A presentation clock, independent of workouts, records, rewards, and persistence. */
export function welcomeFrame(elapsedMs: number, staticFrame = false) {
  const elapsed = staticFrame ? WELCOME_DURATION_MS : Math.max(0, elapsedMs);
  const formation = ease((elapsed - 850) / 450);
  const descent = ease((elapsed - 1500) / 750);
  const settling = clamp((elapsed - 2250) / 250);
  const phase: WelcomePhase = elapsed < 850 ? 'workout' : elapsed < 1500 ? 'forming'
    : elapsed < 2500 ? 'joining' : 'settled';
  return {
    phase,
    visible: elapsed >= 850,
    scale: 0.08 + formation * 0.92,
    lift: elapsed >= 2500 ? 0 : 0.95 * (1 - descent) + (elapsed >= 2250 ? Math.sin(settling * Math.PI) * 0.035 : 0),
    done: elapsed >= WELCOME_DURATION_MS,
  };
}
