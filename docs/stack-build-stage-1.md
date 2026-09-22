# Stack Build — Stage 0–1 checkpoint

## Scope

This branch stops at the isolated object sandbox. It does not implement evidence derivation, rewards, week reconciliation, Case, or Home integration. All sandbox history is deterministic fixture data and is never written to the workout database.

The baseline commit `abae5cd` preserves the original checkout's tracked and non-ignored untracked files, including its uncommitted app changes. Feature changes follow that snapshot on `codex/stack-build-prototype`. The original checkout remains untouched.

## Run on the simulator

From this worktree:

```sh
npm ci
npm run build:sandbox
```

In another terminal, boot one iPhone simulator and run:

```sh
npm run build:sandbox:ios
```

The helper installs **Stack Build** as `com.liftwithstack.buildsandbox`, changes only the compiled app's URL scheme to `stackbuild`, and opens `stackbuild://build-sandbox` against Metro on port 8087. It preserves the release identity in source and leaves the existing Stack installation and database alone. Native builds require Xcode and CocoaPods. The helper's default build output lives under ignored `.expo/build-sandbox-native`.

To reuse this session's existing native build:

```sh
STACK_BUILD_DERIVED_DATA=/tmp/stack-build-derived npm run build:sandbox:ios -- --skip-build
```

The feature requires `__DEV__`, iOS, and `EXPO_PUBLIC_BUILD_SANDBOX=1`. Ordinary `npm run dev` keeps it disabled. When enabled, Settings also contains an object-sandbox entry. A direct sandbox link can bypass onboarding in development, without creating a profile or marking onboarding completed.

## What to inspect

- Object mode: baseline, 1.15×, 1.30×, and 1.45× heights; independent gold toggle; weekly composite toggle.
- Tuning: key corner, gold seam width, weekly compression, and three lamination treatments. The default combines full side strata with a top perimeter inlay.
- Monolith mode: 0/1/10/50/104/260 sealed-week presets. Non-empty fixtures include two loose current-week pieces. Zero contains only the plinth.
- Focus/Overview: same scene and fixed isometric angle, with animated orthographic framing. Reduce Motion snaps to the new framing.
- Measure: one second of warmup followed by ten seconds of continuous rendering. Results report average frame cadence, p95 frame interval, draw calls, triangle count, and geometry count. This is a JS/render-loop probe, not a GPU profiler or a release-performance guarantee.

Changes to configuration invalidate previous results. Backgrounding or leaving the screen unmounts the canvas and cancels the run. Idle scenes use demand rendering. Geometry and shared material resources are disposed on replacement/unmount.

## Implementation boundary

`features/build/model.ts` is a scene-input contract, not the future training-evidence engine. `BuildSlab` keeps height and source layers separate. Sealed weeks generate one mesh each, including the colored strata, top inlay, and record seam. The plinth contributes two meshes. No historical child-workout meshes are mounted.

The renderer uses pinned `@react-three/fiber@9.7.0`, `three@0.185.0`, and Expo SDK 57 GL/asset dependencies. Three 0.186 fails at import on Hermes because its CommonJS entry calls Node-only `process.emitWarning`; 0.185 is pinned after reproducing and resolving that failure. Metro resolves one Three module instance for iOS. The native R3F canvas uses native device resolution; no unsupported DPR override is applied. Painted face lighting avoids per-object lights, shadow maps, textures, and postprocessing. This is the initial visual/performance tradeoff to assess before adding richer materials.

## Validation record

- Before feature work: 16 existing tests pass.
- Initial typecheck required Expo's generated, ignored `expo-env.d.ts`; after restoring that normal generated file, the app typechecks.
- `npm run lint` baseline: 85 existing errors. The same command after feature changes still reports 85; these are outside the changed files.
- New tests cover platform/dev gating, deterministic fixtures, no fake empty geometry, distinct scene IDs, compact weekly heights, preserved source layers, outward-facing finite geometry, and gold survival in every material treatment.
- All 21 tests pass; typecheck and ESLint on all changed code pass. The iOS simulator native build succeeds, and the sandbox opens as a separate app.
- Simulator measurements (iPhone 17 Pro / iOS 26.3, Debug/Hermes; one second warmup plus ten seconds sampling): 104-week Overview at 60.0 fps, p95 17.0 ms, 108 draws, 8,684 triangles; 260-week Overview at 60.0 fps, p95 17.1 ms, 264 draws, 21,584 triangles. These measure frame cadence, not physical-device GPU performance.
- The stress check exposed a framing issue: the camera fit initially underestimated projected tower height. The corrected framing includes the full 260-week tower; the measured 264 draws include every weekly block, both current pieces, and the plinth.
- Long towers become narrow in Overview by design; Focus preserves legibility. Review this visual tradeoff on the device before committing to final screen composition.
- 104-week Focus also measures 60.0 fps, p95 17.0 ms, with 15 visible draws and 1,160 triangles. Switching back from 260 weeks leaves 108 GPU geometries, consistent with disposal of the larger fixture. This is a resource-count sanity check, not a long-session memory profile.
- Visually inspected baseline/progressed slabs, gold, all three weekly laminations, empty plinth, long-tower Overview, and close Focus in the simulator.
- Web export fails resolving Expo SQLite's `wa-sqlite.wasm` under the existing Metro asset configuration. Reproduced the same failure in the original checkout with output directed to `/tmp`; it is a baseline issue. Build remains disabled on web.
- No physical iPhone was reachable when implementation began. Device visual approval, frame pacing, haptics, and long-session memory stability remain required before Stage 1 is accepted.

## Next checkpoint

Review the object silhouette, baseline thickness, gold visibility, and three weekly laminations on the physical iPhone. Measure 104 and 260 weeks in both camera modes and repeat entering/leaving the sandbox to inspect memory in Instruments. Do not move on to Stage 2 until the renderer and visual direction are accepted.
