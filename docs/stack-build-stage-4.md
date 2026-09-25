# Stack Build — Stage 4 checkpoint

## Delivered

After `completeWorkout` successfully commits and returns its session, the iOS development build replaces the workout screen with `/build-casting?sessionId=…`. Casting replaces itself with the existing `/workout-summary` for that same session. Other platforms, production, and builds without `EXPO_PUBLIC_BUILD_SANDBOX=1` keep the previous summary path. Duplicate feedback taps are guarded; no workout persistence or schema changes were introduced.

The scene uses the existing procedural slab, locked Full Strata materials and camera model. Animation phases keep their original curves and start times (form 0 s, progress 0.8 s, gold 1.8 s, reveal 2.6 s, land 3.8 s, stacked 4.7 s, complete 5.6 s). One screen plays four text beats over them; Beats 2 and 3 appear only when earned.

| Beat | Shown | Starts with | Copy |
| --- | --- | --- | --- |
| 1 · The piece | Always | Preparation / form | `{CATEGORY} · DONE` (short category, e.g. `PUSH · DONE`); the only text on screen. |
| 2 · Progression | Lifts up ≥ 1 | Progress | `Better than` / `last time.` · `WHAT MADE IT THICKER` · one row per improved exercise in performed order: `+5 kg   Bench press   80 → 85 kg` or `+2 reps   Cable fly   12 → 14`, at most four rows, then `+{n} more`. |
| 3 · PR | ≥ 1 validated PR | Gold | `NEW RECORD` (`NEW RECORDS` for several) · `{Exercise} · {load} × {reps}` per PR · `Your best yet.` once. |
| 4 · Land + metrics | Always | Land | `Stacked.` · `{Ordinal} piece this week.` (First … Seventh, then `8th`) · `{moved} MOVED`, `{n} LIFTS UP`, `{n} PR`/`PRS` (zero rows omitted) · `Done`. First piece ever: `Your first piece.`, metrics, `Every lift today sets your baseline.` |

An unearned beat leaves the previous beat on screen, and the camera reveal (2.6–3.8 s) keeps Beat 3, 2 or 1 until the piece lands. Rows use the comparison the evidence engine already made; when several sets of one exercise improved, the row shows the one with the largest load gain, then the largest rep gain.

**Minimum hold times.** Beat 2 stays on screen for at least 2.2 s and Beat 3 for at least 2.0 s. Where a beat would be shorter, playback pauses on the last frame before the next beat's phase (the piece at its grown height, or the seam drawn) and then continues on the same curves. Playback time is mapped to animation time before `castingFrame`; the curves are unchanged. In practice only a workout with both lifts up and a PR is held (1.2 s at the end of growth):

| Workout | Beat 1 | Beat 2 | Beat 3 | Beat 4 | Playback ends |
| --- | --- | --- | --- | --- | --- |
| Baseline | 0–3.8 s | — | — | 3.8 s → Done | 5.6 s |
| Lifts up, no PR | 0–0.8 s | 0.8–3.8 s | — | 3.8 s → Done | 5.6 s |
| PR, no lifts up | 0–1.8 s | — | 1.8–3.8 s | 3.8 s → Done | 5.6 s |
| Lifts up and PR | 0–0.8 s | 0.8–3.0 s (incl. 1.2 s hold) | 3.0–5.0 s | 5.0 s → Done | 6.8 s |

**No auto-advance.** After Beat 4 appears the screen stays until Done, which goes to the existing `/workout-summary` for the session (the sandbox preview returns to the sandbox).

**Moved volume.** A single session shows its full weight in the preferred unit with thousands separators, never tonnes: `5,240 KG` in Beat 4 and `5,240 kg moved` in the Monolith's current-week rows; lb profiles show whole pounds (`11,552 LB`). Aggregates (the Monolith header total and week totals) keep the tonnes rule from 1,000 kg (`138.2 T`); lb aggregates are unchanged.

Gold uses an overlay containing only PR seam triangles from the shared geometry; it never paints a whole key-corner face. The completed workout is represented once: the casting mesh temporarily replaces its ordinary scene mesh. No fake sessions, geometry records, or reward totals are persisted.

## Safe completion paths

- Skip remains available during preparation and every beat; Done appears with Beat 4.
- Each successful live completion grants a single in-memory presentation ticket. The route removes it before any asynchronous work and records a consumed marker in AsyncStorage before animation starts.
- Repeated navigation, historical links, and reopening the route after process death go directly to the summary. Initial history never grants presentation tickets. A normal app cold start retains existing app startup behavior; Build does not introduce startup navigation recovery.
- Storage failure or an unavailable motion preference skips casting. Reduce Motion skips directly to the summary, including when enabled during playback.
- Backgrounding/inactive state and hardware Back finish the presentation. Native swipe-back is disabled for this route.
- Both renderer errors and module/render failures reach the same idempotent finish function. An independent watchdog caps preparation at eight seconds and renderer playback at its full length (including any holds) plus 0.9 seconds, so a missing/stalled GL callback cannot trap the saved workout. A playback that completes cancels the watchdog and waits for Done; only failures advance automatically.
- Finishing discards any outstanding ticket, including module-loading failure before the claim. Marker state is separate from the workout database.

## Review

Open **Object sandbox → Casting preview ↗**. This uses the Stage 2 example sessions, labels itself PREVIEW, and returns to the sandbox on Done or Skip. It never creates a workout. Deep link: `stackbuild://build-casting?demo=1`.

For a development error-boundary check, use `stackbuild://build-casting?demo=1&failure=renderer`. The preview returns to the sandbox; React Native's expected development error overlay may require dismissal. The production feature flag remains disabled.

## Validation

- 47 tests pass, including timeline ordering/bounds, one-shot claims, persisted replay prevention, storage failures, multiple finish signals, and seam-only gold geometry.
- A real SQLite integration test deliberately rejects the completion write, verifies that the workout stays active and grants no casting route, then completes successfully and verifies that presentation/replay does not change SQL data or duplicate its derived piece.
- Type checking passes. Changed Build files and tests pass lint. `app/workout.tsx` retains its seven existing lint errors, confirmed against the preceding commit.
- Simulator checks cover baseline formation, gold, reveal/landing, automatic return, Skip during formation, injected render failure, and a historical/repeated casting link reaching the existing saved-session summary.
- No physical-iPhone timing, reduced-motion, background-interruption, or resource-stability acceptance is claimed. Those remain device review items.

## Boundary

Stage 4 ends here. Weekly fusion, Case, Home, and introduction remain later milestones. Casting never determines whether a workout is saved.
