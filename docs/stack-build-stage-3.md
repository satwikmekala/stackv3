# Stack Build — Stage 3 checkpoint

## Delivered

The Monolith lives at `/build`, behind the same explicit iOS development flag as the object sandbox. Open **Settings → Build · Monolith**, or **Object sandbox → Monolith screen ↗**. For the separate simulator app, run `xcrun simctl openurl booted stackbuild://build` after Metro and the app have loaded. Stage 1's run instructions still apply.

- Focus and Overview are guided orthographic cameras over the same scene, with no free rotation. Selection does not alter the slabs, their dimensions, or their evidence.
- Focus follows a selected week. The screen offers direct block taps, accessible ruler labels, previous/next active week controls, and a virtualized week picker with dated labels.
- Overview fits the complete tower and plinth, hides the ruler, and shows totals. Tapping a block returns to Focus on that week.
- The current week keeps its individual workout pieces. Its detail sheet lists those pieces, thickness, volume in the profile's display unit, lifts up, and PR exercise names. This is not the future Case archive/unpacking screen.
- A new history shows an empty plinth. An empty current week adds no geometry and preserves all earlier blocks.
- **Your history / Demo** opens a development source picker. Three-month, two-year, five-year, and empty examples use session-shaped data through the same Stage 2 evidence engine. Long examples intentionally include empty weeks, so calendar span exceeds sealed-block count. Demo data is never written to storage.
- Full Strata, key corner 0.24, compression 0.35, bright category colors, and individual PR seams remain locked on this screen. The earlier object sandbox retains its tuning controls.

## Rendering and lifecycle

Historical weeks remain one mesh each; current workouts remain separate meshes. Camera motion uses demand rendering and clamps the first elapsed frame after idle so returning to the scene still produces a smooth transition. Reduced Motion snaps the camera immediately. Ruler markers project actual week heights and avoid overlapping touch targets.

The canvas pauses behind modal sheets, retaining geometry for the return transition. It unmounts when the route loses focus or the app backgrounds, releasing geometries/materials. Saved history reconciles on foreground/focus and each minute while visible. Selection falls back to the current week if its source disappears.

## Validation

- 40 tests pass, including existing records and real SQLite persistence checks.
- New coverage exercises deterministic empty/12/104/260-week demo history, mapping every rendered slab to exactly one week, camera selection without history mutation, finite framing, and ruler overlap avoidance.
- Type checking and lint on all changed TypeScript/test files pass.
- Simulator review covers saved history, Focus/Overview, direct block selection, week picker, current-week session detail, empty plinth, and five-year Overview framing. Five-year Overview is naturally narrow at a fixed footprint; Focus and the week picker remain the way to inspect individual strata.

## Boundary

This checkpoint stops at Stage 3. It does not introduce casting, fusion animation, Case, Home, or onboarding integration. Workout completion and summary navigation are unchanged. Physical-iPhone visual, motion, performance, and memory acceptance remains pending; simulator review is not a device performance claim.
