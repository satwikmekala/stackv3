/**
 * One run of a ceremony (casting or fusion). Its claim is held in memory and persisted only
 * when the final beat is shown or the user skips (or the fallback shows the final state).
 *
 * App state:
 * - 'inactive' (Notification/Control Center, call banners): pause; 'active' resumes.
 * - 'background' before the claim is persisted: the run ends and the claim is released, so the
 *   ceremony plays again on the next entry. After it is persisted: pause, like 'inactive'.
 */
export type PresentationAction = 'pause' | 'resume' | 'end' | 'none';
export type PresentationStatus = 'open' | 'committed' | 'released';

export function createPresentationRun({ commit, release }: { commit: () => void; release: () => void }) {
  let status: PresentationStatus = 'open';
  let paused = false;
  const persist = () => { if (status === 'open') { status = 'committed'; commit(); } };
  return {
    /** Casting Beat 4, fusion Beat 3, or the static final screen. */
    finalBeat: persist,
    skip: persist,
    /** Renderer failure or stall: the fallback exits to the final state, so it counts as seen. */
    failure: persist,
    appState(next: string): PresentationAction {
      if (status === 'released') return 'none';
      if (next === 'active') {
        if (!paused) return 'none';
        paused = false;
        return 'resume';
      }
      if (next === 'background' && status === 'open') {
        status = 'released';
        paused = false;
        release();
        return 'end';
      }
      if ((next === 'inactive' || next === 'background') && !paused) {
        paused = true;
        return 'pause';
      }
      return 'none';
    },
    /** Leaving without a final beat or skip never uses the ceremony up. */
    dispose() { if (status === 'open') { status = 'released'; release(); } },
    get status() { return status; },
    get paused() { return paused; },
  };
}
