# Stage 7 — Home and introduction

Implemented in the isolated `codex/stack-build-prototype` worktree. Stage 8 is not started.

## Behavior

### Home: "Your Stack" card

- `BuildHome` sits directly below the **Change workout** button and above `YourSplitCard`, which keeps its bottom-pinning wrapper. The workout hero, Change workout and the split card are otherwise unchanged. The card is shown only with the Build development flag.
- The whole card is one button with a small vector preview of recent slabs (no GL), the copy, and a chevron icon; there is no "Open" label. It opens `/build`, which shows the introduction first on a first visit.
- Copy comes from the pure `homeModuleCopy({ seen, weeksBuilt, piecesThisWeek })`. Weeks built are sealed weeks with at least one piece (the Monolith/Case source); pieces this week are the current week's pieces. "0 weeks built" never renders.

| State | Copy |
| --- | --- |
| Seen intro, pieces this week | `YOUR STACK` / `{n} weeks built` / `{n} pieces this week` |
| Seen intro, 0 pieces this week | `YOUR STACK` / `{n} weeks built` / `This week is open` |
| Seen intro, 0 weeks built, pieces this week | `YOUR STACK` / `{n} pieces this week` |
| Not seen, weeks built ≥ 1 | `YOUR STACK` / `You've already built {n} weeks.` (`one week`) / `See it` |
| Not seen, 0 weeks built, pieces this week | `YOUR STACK` / `Your first pieces are in.` (`Your first piece is in.`) / `See it` |
| No history | `YOUR STACK` / `Starts with your next workout.` |

Singulars: `1 week built`, `1 piece this week`. The card derives from the same evidence and slab models, loads no Three.js renderer, and refreshes when sessions change, on focus/foreground, and at local week boundaries.

### Introduction

Shown once, the first time Build opens from any entry (`/build` or `/build-case`); casting never shows it. The Monolith/Case does not mount while it is visible, so fusion reconciliation cannot run behind it; on a first-ever visit the fusion marker then initializes with no ceremony.

- **Four pages, one canvas.** Copy lives in `introCopy.ts`. A single 3D view stays mounted across all pages and only its scene mode changes (drop, growth and seam, fusion with earlier blocks rising, Overview pull-back). Continuity comes from matched frames: each page starts where the previous one ended. Pages 1–3 use scripted demo pieces; page 4 always shows a 12-week (about three months) demo tower that ends in page 3's blocks; only its call to action depends on saved history.
  1. `Every workout` / `stacks up.` Push, Pull and Legs drop onto the plinth (0.4 / 1.0 / 1.6 s); the headline appears with the first landing, the body after the third.
  2. `Progress` / `shows.` Piece 4 drops and grows 1.15× → 1.30× → 1.45×; piece 5 drops and its top-edge seam draws left to right, pulses once and settles. Copy appears as growth starts.
  3. `Every week` / `becomes a layer.` The five pieces lift, press into one weekly block (Full Strata, compression 0.35, seam kept on the Pull stratum), and four earlier blocks rise in beneath as the camera eases down. Copy appears as the pieces press.
  4. `Don't slack.` / `Just stack.` The camera starts at the base of the tower, as page 3 ended, then rises and pulls back to Overview framing (ruler hidden, no rotation). The headline appears at the end of the pull-back; the body and CTA follow. The CTA is `See your Stack` with history (Monolith Focus) or `Start building` (the empty Monolith).
- **Navigation.** The copy area is a paged horizontal scroll view beneath the fixed 3D view; the page index comes from where it settles. Swipe left or use the next arrow beside the page dots on pages 1–3; swipe right to go back. The dots are also a screen-reader adjustable control. Skip appears on pages 1–3 only; page 4 shows only its CTA.
- **No replays.** Each page plays once and holds its final frame. A page that finished, or that the user has left (`introPages.ts`: played = finished or visited), only ever shows its final frame and copy, even if it was left mid-animation.
- **Exit rule.** There is no Close. Every exit marks the introduction seen with the local `stack.build.introduction.v1` marker: Skip, the page 4 CTA, the Android back button, or leaving the screen any other way (for example the iOS back swipe), which is caught when the introduction unmounts while showing. Only the first exit counts. A failed write still keeps it dismissed for the running app session.
- **Reduced Motion** (and screen reader or reduced effects): every page shows its final frame statically and its copy immediately.
- **Haptics:** a light impact on each landing and a medium impact when the seam completes (iOS).
- Build remains behind the existing explicit iOS development flag. Account onboarding, Android/web, ordinary production Home, and workout persistence are unchanged.

## Validation

- 64 tests pass, including introduction first-entry, interruption-before-dismissal, persisted dismissal, and storage-failure handling, plus the existing Build/persistence/record regressions.
- Type checking passes. New feature files and Build routes pass ESLint. Home retains the same 16 pre-existing lint errors as HEAD (verified before/after); no new Home lint errors were introduced.
- iPhone 17 Pro simulator: visually inspected all three screens; completed the introduction into saved-history Monolith; cold-restarted and verified it did not repeat; inspected Home with the workout action still primary; scrolled the Build card clear of the tabs and used it to reopen Build.
- No saved workouts or account onboarding values were changed during validation.

Physical-device, VoiceOver, and large-text acceptance remain part of the release-hardening checkpoint.
