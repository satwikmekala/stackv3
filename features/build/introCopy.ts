/** Copy for the four-page Build introduction. */
export const INTRO_PAGES = [
  { title: 'Every workout\nstacks up.', body: 'Finish a session and it becomes a piece of your Stack. Stay consistent and it keeps building.' },
  { title: 'Progress\nshows.', body: 'Beat your last numbers and the piece grows thicker. Hit a PR and it lands with a line of gold.' },
  { title: 'Every week\nbecomes a layer.', body: 'When the week ends, its pieces press into one block. Look back and see exactly where you pushed, and where you eased off.' },
  { title: "Don't slack.\nJust stack.", body: 'Get to the gym as often as you can. Every session you finish goes up.' },
] as const;
export const INTRO_PAGE_COUNT = INTRO_PAGES.length;

/** "2 / 4" */
export const introPosition = (page: number) => `${page + 1} / ${INTRO_PAGE_COUNT}`;
/** Spoken on each page change for screen-reader users. */
export const introAnnouncement = (page: number) => `Introduction ${page + 1} of ${INTRO_PAGE_COUNT}. ${INTRO_PAGES[page].title.replace(/\n/g, ' ')}`;
export const introNextLabel = (page: number) => `Continue to introduction ${page + 2} of ${INTRO_PAGE_COUNT}`;
/** Page 4 call to action. */
export const introCta = (hydrated: boolean, hasHistory: boolean) => !hydrated ? 'Loading your Stack…' : hasHistory ? 'See your Stack' : 'Start building';
