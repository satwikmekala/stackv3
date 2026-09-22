# Stack Build — Stage 4 checkpoint

## Delivered

After `completeWorkout` successfully commits and returns its session, the iOS development build replaces the workout screen with `/build-casting?sessionId=…`. Casting replaces itself with the existing `/workout-summary` for that same session. Other platforms, production, and builds without `EXPO_PUBLIC_BUILD_SANDBOX=1` keep the previous summary path. Duplicate feedback taps are guarded; no workout persistence or schema changes were introduced.

The 5.6-second scene uses the existing procedural slab, locked Full Strata materials and camera model:

| Time | Beat |
| --- | --- |
| 0–0.8 s | The pigment slab forms to baseline thickness. |
| 0.8–1.8 s | Validated progression grows it to its final height. |
| 1.8–2.6 s | Earned gold seams appear; no-record workouts retain pigment only. |
| 2.6–3.8 s | The existing tower appears as the camera reveals where the piece belongs. |
| 3.8–4.7 s | The piece lowers into its final position. |
| 4.7–5.6 s | “Stacked.” and supporting metrics, then the existing summary. |

Gold uses an overlay containing only PR seam triangles from the shared geometry; it never paints a whole key-corner face. The completed workout is represented once: the casting mesh temporarily replaces its ordinary scene mesh. No fake sessions, geometry records, or reward totals are persisted.

## Safe completion paths

- Skip and the summary button remain available during preparation and every beat.
- Each successful live completion grants a single in-memory presentation ticket. The route removes it before any asynchronous work and records a consumed marker in AsyncStorage before animation starts.
- Repeated navigation, historical links, and reopening the route after process death go directly to the summary. Initial history never grants presentation tickets. A normal app cold start retains existing app startup behavior; Build does not introduce startup navigation recovery.
- Storage failure or an unavailable motion preference skips casting. Reduce Motion skips directly to the summary, including when enabled during playback.
- Backgrounding/inactive state and hardware Back finish the presentation. Native swipe-back is disabled for this route.
- Both renderer errors and module/render failures reach the same idempotent finish function. An independent timer caps preparation at eight seconds and renderer playback at 6.5 seconds, so a missing/stalled GL callback cannot trap the saved workout.
- Finishing discards any outstanding ticket, including module-loading failure before the claim. Marker state is separate from the workout database.

## Review

Open **Object sandbox → Casting preview ↗**. This uses the Stage 2 example sessions, labels itself PREVIEW, and returns to the sandbox automatically or on Skip. It never creates a workout. Deep link: `stackbuild://build-casting?demo=1`.

For a development error-boundary check, use `stackbuild://build-casting?demo=1&failure=renderer`. The preview returns to the sandbox; React Native's expected development error overlay may require dismissal. The production feature flag remains disabled.

## Validation

- 47 tests pass, including timeline ordering/bounds, one-shot claims, persisted replay prevention, storage failures, multiple finish signals, and seam-only gold geometry.
- A real SQLite integration test deliberately rejects the completion write, verifies that the workout stays active and grants no casting route, then completes successfully and verifies that presentation/replay does not change SQL data or duplicate its derived piece.
- Type checking passes. Changed Build files and tests pass lint. `app/workout.tsx` retains its seven existing lint errors, confirmed against the preceding commit.
- Simulator checks cover baseline formation, gold, reveal/landing, automatic return, Skip during formation, injected render failure, and a historical/repeated casting link reaching the existing saved-session summary.
- No physical-iPhone timing, reduced-motion, background-interruption, or resource-stability acceptance is claimed. Those remain device review items.

## Boundary

Stage 4 ends here. Weekly fusion, Case, Home, and introduction remain later milestones. Casting never determines whether a workout is saved.
