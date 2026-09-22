# Stage 6 — Case and fusion performance

Implemented in the isolated `codex/stack-build-prototype` worktree. Original checkout and workout persistence are unchanged. Stage 7 is not started.

## Review

Open Build → **Open the Case**, or choose a sealed week → **Unpack this week**. Case inherits the selected saved/demo source. The archive uses a two-column virtualized list of lightweight native previews, with neutral niches only between active weeks. Current-week pieces are available and labeled open. Empty histories have no fabricated blocks.

Opening a week mounts one shared renderer with its original, uncompressed pieces and more space between them. The chronological colors, height buckets and per-workout gold seams come from the evidence engine. Session cards show volume in the selected unit, lifts up, PRs and record performances. The week includes a comparison with the previous active week. Saved session cards open the existing workout summary in history mode; demo sessions never navigate to fabricated summaries. No duration is invented.

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
