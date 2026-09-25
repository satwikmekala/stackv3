# Stack Build — Stage 5 checkpoint

## Delivered

Build now reconciles weekly fusion presentation on entry, foregrounding, and the Monday boundary while visible. Every elapsed active week is already sealed by the pure evidence engine. The animation never saves or seals workout data.

The new presentation lifts the selected week's original pieces, compresses them to the exact composite height, switches to the existing Full Strata block, and seats it back into the tower. Individual workout colors and PR seams remain intact. Key corner 0.24 and weekly compression 0.35 are unchanged.

The renderer phases keep their original curves and timing. One screen plays three text beats over them:

| Time | Renderer phase | Beat |
| --- | --- | --- |
| 0–0.9 s (and preparation) | Isolate and lift the week's individual pieces. | 1 · The week |
| 0.9–2.9 s | Close the gaps and compress (0.9–2.2 s), then fuse into the composite (2.2–2.9 s). | 2 · Fusion: no new text, Beat 1 stays visible |
| 2.9 s onward | Seat the block (2.9–4.0 s), then “sealed” (4.0–4.8 s). | 3 · Sealed, until Done |

**Beat 1 · The week.** The date range in the Monolith's format (`14–20 SEP`; across months `29 SEP–5 OCT`), then `One piece.` or the count spelled out (`Three pieces.`), then one row per piece in chronological order: `{Category} · {Weekday}   {moved} · {n} lifts up · PR`. The category uses the shared short label and fallback from `pieceCategory` (the same lookup as the post-workout Beat 1). The weekday is short (`Mon`). Moved is a per-session value: full kg/lb with thousands separators, never tonnes (`1,205 kg`, `2,205 lb`). `lifts up` is omitted when 0 (`1 lift up` when 1); `PR` is omitted without a record and becomes `PRs` for several.

**Beat 2 · Fusion.** No text change while the pieces press together.

**Beat 3 · Sealed.** `{date range} · SEALED` · `One week.` / `One layer.` · `{n} PIECES · {moved} MOVED · {n} PR` (`1 PIECE`; the PR segment is omitted at 0 and becomes `PRS` for 2 or more). Moved here is an aggregate, so the tonnes rule applies from 1,000 kg (`2.3 T`); lb profiles show whole pounds (`4,189 LB`). Then `YOUR STACK` / `{n} weeks built` and **Done**.

- `Your thickest layer yet.` appears only when this week's derived block height (`compositeHeight`) is strictly greater than that of every earlier sealed week. It is hidden on ties, for a lighter week, and for the first sealed week. No new derivation is added.
- `{n} weeks built` counts up over 0.9 s as the block seats (from 2.9 s): from the count the user last saw (`builtBefore`, returned by `claim()`) to every sealed week with at least one piece, including weeks sealed silently since the last visit.

**Done waits for a tap.** A completed playback rests on Beat 3 until Done, which dismisses the sequence onto the Monolith in Focus with the new block already selected. Only Skip, Back, backgrounding, Reduce Motion, renderer failure, or the 6.6-second watchdog (a playback that never completes) dismiss automatically, leaving the derived history intact.

## Presentation marker

The only persisted state is a versioned `observedWeek` local-Monday date in AsyncStorage (`stack.build.fusion.v1`). It contains no workout data or geometry. No other "seen" state exists; the rules below all follow from this one watermark.

- The sequence plays only when the user opens Build (the real-history Monolith, including foregrounding or a Monday boundary while it is visible). It never plays on app launch, over Home, or during a workout.
- First entry, or a missing/damaged marker, initializes at the current week and shows no historical fusion queue.
- At a later week boundary, `claim()` chooses only the most recent sealed week with at least one piece at or after the previous observed week. Every other unseen week counts as seen, with no ceremony. Weeks with no pieces never trigger it.
- `claim()` also returns `builtBefore`: the sealed weeks with pieces before the previous observed week, i.e. the weeks-built count the user last saw. `reconcile()` remains as the week-only form.
- Persist the new observed week before displaying anything. Played, skipped, relaunched or interrupted, a week never replays.
- Serialize concurrent reconciliation requests. Storage read/write failure suppresses the animation; it does not affect sealed history.
- Older backfills and empty weeks create no reward presentation. Moving the local clock backward never lowers the marker.
- Demo history and the preview never read or write this marker.

Reconciliation waits for workout-store hydration and motion preferences, and only runs for the real-history Monolith. The existing local-time convention is preserved; cross-time-zone historical assignment remains a separate data-model concern.

## Renderer lifecycle

Only the selected week temporarily expands into session meshes. All other historical weeks stay composite. The selected week's temporary meshes are replaced visually with its composite at fusion and disposed on dismissal. The underlying Monolith canvas unmounts during fusion, so the presentation does not retain a second hidden tower. Weeks/pieces above the selected block return once it is seated.

Minute refreshes derive history only when the local week changes (or session data changes), avoiding redundant geometry rebuilding and asynchronous presentation-claim cancellation on same-week clock updates.

## Review

Open **Object sandbox → Fusion preview ↗**. The example has four colored workout strata and three PR workouts. It uses no persisted marker and writes no workouts. Like real-history fusion, the preview rests on Beat 3 until **Done**, which returns to the sandbox. The modal has its own safe-area provider.

## Validation

- 57 tests pass, including the previous evidence, geometry, casting, records, and persistence suites.
- Added first-backfill suppression, Monday transition, missed-week/latest-only selection, concurrent claims, relaunch replay prevention, invalid markers, storage failures, clock rollback, older backfills, empty weeks, DST, and year-boundary cases.
- Animation tests verify compression reaches the exact weekly height, closes the gaps, retains source evidence, and seats at the final position.
- A real SQLite test proves reconciliation/consumed markers do not write or alter workout history, and a recreated coordinator reconstructs the same sealed block without replay.
- Type checking and targeted lint pass.
- Simulator review verified isolated pieces, fused Full Strata, the final seated tower, safe-area layout, and Skip during the opening phase.

Physical-iPhone timing, memory, and interruption acceptance remains pending. No claim of physical-device performance is made.

## Boundary

This checkpoint stops at Stage 5. Case archive and unpacked week detail are Stage 6. Workout completion, summary, Home, and onboarding behavior are unchanged by this stage.
