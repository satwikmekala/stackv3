/**
 * Every navigation between Build surfaces, as data: which router method and where. Screens
 * perform these; the back-stack order they produce is tested without a navigator.
 */
import type { Href } from 'expo-router';

export type BuildSource = string;
export const caseHref = (source: BuildSource) => ({ pathname: '/build-case' as const, params: { source } });
/** The unpacked week is its own route, keyed by the week's Monday ('YYYY-MM-DD'). */
export const unpackedWeekHref = (weekStart: string, source: BuildSource) => ({ pathname: '/build-case/[week]' as const, params: { week: weekStart, source } });
/** A demo workout (sandbox only) carries its demo size so the summary can rebuild it. */
export const workoutSummaryHref = (sessionId: string, demo?: number) => ({ pathname: '/workout-summary' as const, params: demo === undefined ? { sessionId, source: 'history' } : { sessionId, source: 'history', demo: String(demo) } });

export type BuildIntent =
  | { method: 'push'; href: ReturnType<typeof caseHref> | ReturnType<typeof unpackedWeekHref> | ReturnType<typeof workoutSummaryHref> }
  | { method: 'back' }
  /** Pops back to Home when it is in the stack, without replacing it. */
  | { method: 'dismissTo'; href: '/' };

export const buildIntents = {
  openCase: (source: BuildSource): BuildIntent => ({ method: 'push', href: caseHref(source) }),
  /** Case grid tap and Monolith "Unpack this week" both push the week directly. */
  unpackWeek: (weekStart: string, source: BuildSource): BuildIntent => ({ method: 'push', href: unpackedWeekHref(weekStart, source) }),
  /** Pushed from the unpacked week, so Back returns to it. */
  viewWorkout: (sessionId: string, demo?: number): BuildIntent => ({ method: 'push', href: workoutSummaryHref(sessionId, demo) }),
  closeWeek: (): BuildIntent => ({ method: 'back' }),
  /** Home's start action depends on Home-only state (selected archetype, custom split, launch origin). */
  startWorkout: (): BuildIntent => ({ method: 'dismissTo', href: '/' }),
};

type Router = { push(href: Href): void; back(): void; canGoBack(): boolean; dismissTo(href: Href): void; replace(href: Href): void };
export function performBuildIntent(router: Router, intent: BuildIntent, fallback: '/build' | '/build-case' = '/build') {
  if (intent.method === 'push') router.push(intent.href);
  else if (intent.method === 'dismissTo') router.dismissTo(intent.href);
  else if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
