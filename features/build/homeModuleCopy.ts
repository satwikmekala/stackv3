import { countLabel, numberWord } from './buildFormat';

/**
 * Copy for the Home "My Stack" card. "0 weeks built" never renders.
 * `pendingClose`: a sealed week fusion has not presented yet. Its count is the pre-close total, so
 * Home never spoils the count-up; the not-seen-intro states take priority.
 */
export function homeModuleCopy({ seen, weeksBuilt, piecesThisWeek, pendingClose = null }: {
  seen: boolean; weeksBuilt: number; piecesThisWeek: number; pendingClose?: { builtBefore: number; previousWeek: boolean } | null;
}) {
  const kicker = 'MY STACK';
  const pieces = `${countLabel(piecesThisWeek, 'block')} this week`;
  let title: string;
  let detail: string | null = null;
  if (weeksBuilt === 0 && piecesThisWeek === 0) title = 'Starts with your next workout.';
  else if (seen && pendingClose) {
    const closed = pendingClose.previousWeek ? 'Last week became a layer.' : 'Your latest week became a layer.';
    if (pendingClose.builtBefore > 0) { title = `${countLabel(pendingClose.builtBefore, 'layer')} built`; detail = closed; }
    else title = closed;
  } else if (seen) {
    if (weeksBuilt === 0) title = pieces;
    else { title = `${countLabel(weeksBuilt, 'layer')} built`; detail = piecesThisWeek > 0 ? pieces : 'This week is open'; }
  } else {
    title = weeksBuilt > 0
      ? `You’ve already built ${weeksBuilt === 1 ? `${numberWord(1)} layer` : `${weeksBuilt} layers`}.`
      : piecesThisWeek === 1 ? 'Your first block is in.' : 'Your first blocks are in.';
    detail = 'See it';
  }
  const spoken = [title, detail].filter((part): part is string => Boolean(part)).map((part) => part.replace(/\.$/, '')).join('. ');
  return { kicker, title, detail, a11y: `My Stack. ${spoken}.` };
}
