# Stack launch film

A 33-second launch film for Stack, built in Remotion from the app's own tokens, fonts, logo
and Build geometry. See [TREATMENT.md](TREATMENT.md) for the concept and storyboard.

It is isolated from the app: its own `package.json` and `node_modules`, and no imports from it
into the app. The app's `tsconfig.json` and ESLint ignore `film/`.

## Workflow

```bash
cd film && npm install --legacy-peer-deps
npm run studio          # Remotion Studio: scrub, loop scenes, tweak props (port 3000; see .claude/launch.json for 3003)
npm run render          # out/stack-launch-9x16.mp4 — 1080×1920 master with the temp SFX mix
npm run render:16x9     # out/stack-launch-16x9.mp4
npm run render:silent   # 9:16 without audio, for a sound designer
npm run stills -- 3.2 14.6 28.47   # full-res PNGs of any timestamps + a contact sheet (out/stills)
npm run sfx             # regenerate out/cues.json + public/sfx/temp-sfx.wav from the timeline
```

`prestudio`/`prerender` copy the fonts and logo from the app into `public/` (gitignored) and
regenerate the SFX, so the app stays the single source for both.

In the Studio, **Scenes/** holds one composition per scene (same film, offset start) for fast
iteration; `StackLaunch` and `StackLaunchLandscape` are the masters.

Remotion is pinned to 4.0.530: the published 4.0.531 CLI ships an empty `render-queue/queue.js`,
which breaks the Studio.

## Where to change things

| Change | File |
|---|---|
| Timing of any beat, exercise data, set weights, history | `src/timeline.ts` |
| Words on screen | `src/copy.ts` |
| Aspect ratio, framing, copy positions | `src/formats.ts` (add a format → add a `<Composition>` in `src/Root.tsx`) |
| Camera moves | `src/camera.ts` |
| Slab physics (fall, press, fusion, time-lapse) | `src/stack.ts`, `src/schedule.ts` |
| Workout UI mirrors | `src/ui/components.tsx`, `src/ui/layout.ts`, state over time in `src/ui/WorkoutLayer.tsx` |
| Build rendering | `src/build/BuildLayer.tsx` |
| Typography motion, end frame | `src/overlay/Overlay.tsx` |
| Sound cues | `src/sound/cues.ts`, synth in `scripts/sfx.mjs` |

Everything is a pure function of time. Nothing holds state between frames, so any frame renders
identically in the Studio, in stills and in the final render.

## What comes straight from the app

- `constants/theme.ts`: every colour.
- `features/build/geometry.ts`, `model.ts`, `fusion.ts`: slab geometry, layout constants and
  the week-fusion motion, imported unchanged.
- The app's `@expo-google-fonts` files and `assets/images/logo *.png`.

The workout screen components (ActiveSetCard, SetProgress, ExerciseFinisher, the finish sheet)
are React Native + Reanimated + store-driven. Remotion renders React DOM and needs every frame to
be settable directly, so those are **mirrored** in `src/ui/`: same style values, labels and
behaviour, taking plain state instead of the store. When an app component changes visually,
update its mirror (each section names its source file).
