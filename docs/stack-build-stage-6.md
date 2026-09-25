# Stage 6 — Case and fusion performance

Implemented in the isolated `codex/stack-build-prototype` worktree. Original checkout and workout persistence are unchanged. Stage 7 is not started.

## Review

Open Build → **Open the Case**, or choose a sealed week → **Unpack this week**. Case inherits the selected saved/demo source. The archive uses a two-column virtualized list of lightweight native previews. Empty histories have no fabricated blocks.

**Archive header.** `YOUR CASE` · `{N spelled} weeks` / `on the shelf.` (`One week` / `on the shelf.`; digits from 100, e.g. `104 weeks`) · `{aggregate} MOVED · ALL TIME`. N is the sealed weeks with at least one piece, the same count as "weeks built" on the Monolith; the total is `state.metrics.volumeKg`, the Monolith header's source. With no sealed weeks the headline is `Nothing on the shelf` / `yet.` with `Every finished week is kept here.`, and the total is shown only when non-zero (pieces this week).

**Cards.** Sealed week: `{date range}` / `{n} pieces · {aggregate}`. Current week: `THIS WEEK` / `{n} pieces · OPEN`. Empty week: `{date range}` / `NO SESSIONS`. Weekly totals use the aggregate tonnes rule; date ranges use the shared Build format (`14–20 SEP`, `28 SEP–4 OCT`). Accessibility labels use the spoken form (`Week of 14 September, 4 pieces`; `14 September to 5 October, no sessions`).

- **Range rule.** Cards run from the week of the first piece to the last active week, newest first; the current week appears only when it has pieces. There are no cards before the first piece.
- **Collapse rule.** Within that range, consecutive empty weeks collapse into one `NO SESSIONS` card spanning the first empty week's Monday to the last empty week's Sunday (`10 AUG–13 SEP`), using the existing empty preview. A single empty week keeps its own card.
- **Empty weeks are not tappable.** There is no empty-week detail view.

**Unpacked week.** Opening a week (sealed, or the current week) mounts one shared renderer with its original, uncompressed pieces and more space between them. The chronological colors, height buckets and per-workout gold seams come from the evidence engine.

- Header: sealed `{date range} · SEALED` · `{N spelled} pieces,` / `one layer.` (`One piece,` / `one layer.`); current week `THIS WEEK · OPEN` · `{N spelled} pieces` / `so far.` (`One piece` / `so far.`).
- Summary: `{aggregate} MOVED` · `{n} PIECES · {n} LIFTS UP · {n} PR` (`1 PIECE`, `1 LIFT UP`, `PRS` for 2 or more). Week lifts up is the evidence engine's `BuildWeek.metrics.liftsUp`. Zero segments are omitted.
- There is no comparison with any other week.
- Piece cards: `{Category} · {Weekday}` (shared short-label lookup) · `{session moved} moved · {n} lifts up · PR: {Exercise} · {load × reps}`. Session moved is full kg/lb with separators, never tonnes (`2,260 lb moved`). Several records read `PRs: Bench press · 85 kg × 8, Squat · 105 kg × 5`; a bodyweight record reads `Pull-up · Bodyweight × 15`. Zero segments are omitted. Piece thickness is not shown.
- Saved piece cards keep **View workout**, opening the existing workout summary in history mode; demo sessions never navigate to fabricated summaries. No duration is invented.

Removed from the Case: `STACK / CASE`, `The weeks you built.`, `Every session, kept inside.`, `Your first completed workout will find its place here.`, locale dates such as `14 Sep 2026`, `{n} workouts · sealed/open`, `No logged workouts`, `WEEK OF {date}`, `Every piece of the week.`, `{n} workouts` count labels, the `+{x} kg vs active week of …` comparison, `{date} · {x}× thickness`, and the separate `Exercise: load × reps` record lines.

The detail scene stops when the app is inactive or route hidden, disposes geometry on close, and renders on demand while still. Reduced motion disables the native sheet transition. A renderer error leaves the readable session list available. Full Strata, corner 0.24 and compression 0.35 remain the defaults.

## Fusion changes

- Fixed camera framing during fusion removes compression-time zoom changes.
- Three initial frames allow resource upload before motion; elapsed steps are capped at 34 ms so a stall does not leap through an animation beat. Existing watchdog/skip behavior remains.
- Static surrounding history is batched into one geometry, restricted to a conservative camera window. This avoids uploading years of invisible geometry. A separate blank/magenta final-frame issue reproduced when the new timing label resized the native GL surface after animation stopped. Reserving the timing label space from the start keeps the surface dimensions stable and fixed the final-frame issue in replay.
- Memoized scene avoids React work on phase-label changes. Idle rendering remains on demand.
- Preview reports actual animation frame intervals. Tower fixtures of 104/260 weeks now select the corresponding fusion history. Default object-mode fusion remains the 12-week example. Casting's animation math and sequence are unchanged.

## Validation

- 62 tests pass, including full persistence/records regressions, Case calendar gaps across DST/year changes, five-year reconstruction of source IDs/metrics/geometry, fusion camera-window bounds and batched vertex/color preservation.
- TypeScript and ESLint on all touched app/feature files pass. Existing repository-wide lint debt is unchanged.
- iPhone 17 Pro / iOS 26.3 **simulator**, development build: baseline 12-week fusion 59.5 fps, p95 16.7 ms, 15 final-frame draws; optimized replay 59.4 fps, p95 16.7 ms, 6 draws. Five-year final replay 60.0 fps, p95 16.8 ms, 4 draws. Two-year final replay 60.0 fps, p95 16.7 ms, 4 draws. Draw counts differ with frustum visibility; these are not physical-device GPU measurements.
- Visually inspected archive, unpacked week, gold seams and saved-history navigation. Actual saved session opened the existing summary with matching 2,922 kg volume; no workouts were inserted or edited.

Physical iPhone animation acceptance, long-session memory profiling, and VoiceOver/large-text acceptance remain device review items. Simulator timing cannot guarantee that the reported phone lag is fully resolved.
