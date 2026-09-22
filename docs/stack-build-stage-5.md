# Stack Build — Stage 5 checkpoint

## Delivered

Build now reconciles weekly fusion presentation on entry, foregrounding, and the Monday boundary while visible. Every elapsed active week is already sealed by the pure evidence engine. The animation never saves or seals workout data.

The new presentation lifts the selected week's original pieces, compresses them to the exact composite height, switches to the existing Full Strata block, and seats it back into the tower. Individual workout colors and PR seams remain intact. Key corner 0.24 and weekly compression 0.35 are unchanged.

| Time | Presentation |
| --- | --- |
| 0–0.9 s | Isolate and lift the week's individual pieces. |
| 0.9–2.2 s | Close the gaps and compress each piece proportionally. |
| 2.2–2.9 s | Fuse into the shared weekly composite geometry. |
| 2.9–4.0 s | Seat the block into its final position. |
| 4.0–4.8 s | “Week sealed.” Current-week pieces remain above it. |

Real-history presentations return automatically to the Monolith, focused on the sealed week. Skip, Back, backgrounding, Reduce Motion, renderer failure, and a 6.6-second watchdog all dismiss the presentation while leaving the derived history intact.

## Presentation marker

The only persisted state is a versioned `observedWeek` local-Monday date in AsyncStorage (`stack.build.fusion.v1`). It contains no workout data or geometry.

- First entry, or a missing/damaged marker, initializes at the current week and shows no historical fusion queue.
- At a later week boundary, choose only the latest active sealed week at or after the previous observed week. All other elapsed weeks remain sealed without animation.
- Persist the new observed week before displaying anything. Skip, relaunch, or interrupted animation cannot replay it.
- Serialize concurrent reconciliation requests. Storage read/write failure suppresses the animation; it does not affect sealed history.
- Older backfills and empty weeks create no reward presentation. Moving the local clock backward never lowers the marker.
- Demo history and the preview never read or write this marker.

Reconciliation waits for workout-store hydration and motion preferences, and only runs for the real-history Monolith. The existing local-time convention is preserved; cross-time-zone historical assignment remains a separate data-model concern.

## Renderer lifecycle

Only the selected week temporarily expands into session meshes. All other historical weeks stay composite. The selected week's temporary meshes are replaced visually with its composite at fusion and disposed on dismissal. The underlying Monolith canvas unmounts during fusion, so the presentation does not retain a second hidden tower. Weeks/pieces above the selected block return once it is seated.

Minute refreshes derive history only when the local week changes (or session data changes), avoiding redundant geometry rebuilding and asynchronous presentation-claim cancellation on same-week clock updates.

## Review

Open **Object sandbox → Fusion preview ↗**. The example has four colored workout strata and three PR workouts. It uses no persisted marker and writes no workouts. The preview holds its final frame for inspection until **Return to sandbox**; real-history fusion returns automatically. The modal has its own safe-area provider.

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
