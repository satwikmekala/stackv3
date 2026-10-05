/** Copy for the four-page Build introduction. */
export const INTRO_PAGES = [
  { title: 'Every workout\nstacks up.', body: 'Every completed workout adds a block to My Stack.' },
  { title: 'Progress\nshows.', body: 'More improved exercises make a thicker block. An earned personal record (PR) adds a line of gold.' },
  { title: 'Every week\nbecomes a layer.', body: 'When the week ends, its blocks combine into a layer.' },
  { title: 'Built one set\nat a time.', body: 'Layers build My Stack over time.' },
] as const;
export const INTRO_PAGE_COUNT = INTRO_PAGES.length;

/** "2 / 4" */
export const introPosition = (page: number) => `${page + 1} / ${INTRO_PAGE_COUNT}`;
/** Spoken on each page change for screen-reader users. */
export const introAnnouncement = (page: number) => `Introduction ${page + 1} of ${INTRO_PAGE_COUNT}. ${INTRO_PAGES[page].title.replace(/\n/g, ' ')}`;
export const introNextLabel = (page: number) => `Continue to introduction ${page + 2} of ${INTRO_PAGE_COUNT}`;
/** Page 4 call to action. */
export const introCta = (hydrated: boolean, hasHistory: boolean) => !hydrated ? 'Loading My Stack…' : hasHistory ? 'See My Stack' : 'Start building';
