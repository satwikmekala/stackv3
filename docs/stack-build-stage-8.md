# Stage 8 — hardening and release acceptance

Implementation checkpoint in `codex/stack-build-prototype`. **Physical-device acceptance is still pending; Build remains behind its existing iOS development flag.** Android, web and ordinary production builds remain disabled. No backend/schema change or release exposure is included.

## Changes

- Build → Options → **Reduce effects** is a persistent local preference. Monolith and Case use static previews without mounting GL; workouts, totals, selection and archive access remain available. Reduced-effects Overview is a recent-layer preview with full-history totals.
- Casting and fusion bypass their timed presentation for reduced motion, screen readers, reduced effects, or text scaling above 1.3. Workouts are already persisted, weeks are already derived as sealed, and the existing continuation/fallback paths remain authoritative. Changes to accessibility settings during a presentation also exit safely.
- Preference reads cannot overwrite a newer explicit choice. Rapid writes serialize, listeners unsubscribe, and failed writes retain the choice for the app session. Rendering waits for preference hydration to avoid briefly loading GL for a saved reduced-effects user.
- Monolith scrolls at large text sizes; Case uses one column and places its heading inside the scrollable archive. Display headings cap at 2×, decorative branding at 1.4×, and supporting copy retains system scaling. Workout links include the source workout/date in accessibility labels. Introduction pages announce their title and position for screen-reader users.
- Native GL receives two bounded redraw requests after layout changes, with timers canceled on resize/unmount. This covers the delayed native drawable resize previously seen at a demand-rendered final frame. Casting reserves final-metric space from the beginning. Marker projection reuses a vector instead of allocating one per marker per frame. Existing geometry/material disposal and hidden-route suspension remain in place.
- No palette, Full Strata, per-workout gold logic, corner (0.24), compression (0.35), or casting timeline changes.

## Evidence from this pass

- **67 automated tests pass**, covering evidence, calendar boundaries, records, persistence, replay claims, fusion reconciliation, geometry, introduction, and the new preference/routing policy cases.
- TypeScript passes. All touched feature files pass ESLint. Repository-wide ESLint reports 88 errors and 2 warnings in existing unrelated files; none are in Build feature code. Whole-repository lint is not green.
- iPhone 17 Pro / iOS 26.3 **simulator**, development build, 10-second continuous rendering after one-second warmup:

| Fixture | FPS | p95 frame time | Draws | Triangles | Geometries |
|---|---:|---:|---:|---:|---:|
| 104 sealed weeks + 2 pieces | 60.0 | 16.7 ms | 108 | 5,324 | 108 |
| 260 sealed weeks + 2 pieces | 59.8 | 16.7 ms | 264 | 13,184 | 264 |

These are simulator CPU/frame-callback measurements, not physical GPU acceptance. Normal still scenes return to demand-only rendering.

- Nine Case week open/close cycles with the five-year archive, after a cold app launch: host process RSS after cycles 3/6/9 was 685,072 / 672,320 / 684,256 KiB (about 669 / 657 / 668 MiB). This short development-build smoke test showed no sustained growth; it does not establish a device memory ceiling or replace a longer soak.
- Maximum simulator Dynamic Type: inspected the one-column archive, scrolled to a week, opened its details, and verified the close action remains reachable. Restored the original `large` content-size setting afterward.
- Enabled reduced effects, verified the static Monolith, cold-restarted, confirmed the saved switch state, and confirmed the casting demo bypassed to its continuation. Restored effects to the original off setting after testing.
- Opened a saved-session casting URL without a live completion claim: reached its existing summary with the same 2,922 kg volume. Injected the development renderer error: boundary continued to the sandbox; expected development diagnostics were dismissed. No workout data was inserted or modified.

## Remaining acceptance gate

`xcrun devicectl list devices` reports both paired physical iPhones unavailable, including Satwik’s iPhone 14 Pro. Do not enable wider exposure yet.

On the physical iPhone, validate:

1. Complete a workout through casting, then summary; repeat with Skip, Reduce Motion, VoiceOver, and interruption. Confirm one session/piece and unchanged summary totals.
2. Run 104/260-week fixture measurements, Focus/Overview transitions and fusion. Check perceived smoothness, thermal behavior and final-frame correctness with both effects modes.
3. Navigate Monolith/Case/detail repeatedly for at least ten minutes; record device memory with Instruments and verify a stable working set after warmup and background/foreground cycles.
4. With VoiceOver, traverse Home → introduction → Build → week chooser → Case → workout summary; verify focus order and descriptive labels. Repeat with maximum text size and landscape/smaller available viewport.
5. Verify first backfill has no animation queue and skipped/missed weeks remain sealed across relaunches.

Only after these pass should the development-only exposure policy be reconsidered.
