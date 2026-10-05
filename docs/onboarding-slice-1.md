# Onboarding Slice 1: welcome review

Slice 1 adds two development-only Welcome compositions. Production onboarding, profile state, workout launch, and the Train / Progress / Stack tabs keep their existing behavior. Slices 2–7 have not started.

The object composition is the default review candidate: the Stack has more visual presence, with a compact example workout underneath. The workout composition shows all three sample exercises and their muscle categories alongside a smaller Stack. Both use the current Bricolage / Hanken / JetBrains typography, muscle palette, workout surface treatment, Stack geometry, and native renderer.

The attached Stack Design Rules informed visual hierarchy, expressive content, native controls, interruptible motion, and accessible fallbacks. They are a design reference; the execution boundary comes from the requested seven-slice plan.

## Run the preview

With the existing iPhone simulator booted and a development Stack binary already installed:

```sh
npm run onboarding:preview
# In a second terminal:
npm run onboarding:preview:ios
```

The helper clones the installed development binary into **Stack Welcome Preview**, with its own app container and `stackwelcome` scheme. It removes the clone's widget extensions. It does not change the original binary, native project, or original training database.

Use **Preview** in the welcome header to switch composition, view the static fallback, replay a new visit, or scroll to the example at large text sizes. Direct routes also work:

```sh
xcrun simctl openurl booted 'stackwelcome://onboarding-preview?composition=object&static=0'
xcrun simctl openurl booted 'stackwelcome://onboarding-preview?composition=workout&static=0'
xcrun simctl openurl booted 'stackwelcome://onboarding-preview?composition=object&static=1'
```

Add a changed `visit` query value to request a fresh preview visit. The entry requires both `__DEV__` and `EXPO_PUBLIC_ONBOARDING_PREVIEW=1`; release builds redirect away even when the environment flag is set.

**Get started** and **Explore first** immediately show a native preview acknowledgement. App entry is intentionally connected in Slice 4. These callbacks do not complete onboarding or create a profile or workout.

## Behavior

- Presentation-only example slabs and exercises never identify real sessions or earned pieces. No records or rewards are illustrated as earned.
- The sample sets confirm, their muscle-colored piece forms, and it joins the Stack. The renderer clock runs for 2.6 seconds after native warmup. Actions are independent of this clock and visible immediately.
- Navigation blur, app inactivity/backgrounding, Reduce Motion, and screen-reader use stop playback. Returning shows the completed composition. The renderer returns to demand-only painting after settling.
- iOS uses the existing native scene. Unsupported platforms, system Reduce Motion, renderer error, and a stalled renderer use the existing vector Stack preview. Text explains the relationship without color or movement.
- Scroll movement requests a brief repaint, avoiding a stale native GL drawable when the scene moves into view.
- Content scrolls; actions stay in view. Targets are at least 44 points. Exercise counts move underneath names at large sizes. Display lettering scales up to 1.5× with explicit paragraph metrics; body copy, example details, and actions follow the full system text scale. No descriptions have a line limit or fixed height.

## Checkpoint evidence

Reviewed on **iPhone 17 Pro, iOS 26.3**, at the system `large` and `accessibility-extra-large` text categories.

| Composition | Normal text | Large text |
| --- | --- | --- |
| Object, default | [Screen](qa/onboarding-slice-1/object-normal.png) | [Entry](qa/onboarding-slice-1/object-large-top.png), [scrolled example](qa/onboarding-slice-1/object-large-example.png) |
| Workout | [Screen](qa/onboarding-slice-1/workout-normal.png) | [Entry](qa/onboarding-slice-1/workout-large-top.png), [scrolled exercises](qa/onboarding-slice-1/workout-large-example.png) |

Additional captures: [forming piece](qa/onboarding-slice-1/sequence-forming.png), [static fallback](qa/onboarding-slice-1/static-normal.png), [system Reduce Motion](qa/onboarding-slice-1/reduce-motion.png), [return after background interruption](qa/onboarding-slice-1/after-background.png), and [Increase Contrast](qa/onboarding-slice-1/increase-contrast.png).

The large-text review used the preview's scroll control. Simulator coordinate/gesture automation was unreliable; a full manual touch-scroll check remains outstanding. Readable exercise names and counts, paragraph wrapping, pinned actions, and the native drawable after scroll were visually checked. Text size, Reduce Motion, and Increase Contrast were restored to their original simulator settings afterward.

Verified:

- Both compositions, immediate native action acknowledgement, finite formation/landing, and background interruption without replay.
- System Reduce Motion selects the static scene with the preview's static override off.
- The isolated database still contains **0 sessions, 0 session exercises, 0 sets, 0 custom splits, and no completed onboarding profile** after preview interaction.
- `npm run typecheck` passes.
- ESLint passes for the changed application, renderer, preview helper, and test files.
- **44 tests pass** across `onboardingWelcome`, `buildCasting`, `buildFlow`, and `buildIntroHome`. Coverage includes preview release gating, finite continuous landing, static end state, compatible geometry, presentation data isolation, and existing Build flows.

Not verified: physical hardware, full VoiceOver interaction, narrow-phone layouts, maximum accessibility text category, reduced-transparency setting, non-iOS runtime, offline first launch, and native renderer failure/stall fault injection. These remain explicit QA items for later visual review and the final integration matrix. The preview has no network dependency of its own.

A paired iPhone 14 Pro was discovered, but CoreDevice could not establish a connection; its reported Developer Mode is disabled. Physical-device validation could not run. No device settings were changed.

## Next checkpoint

Review both compositions and settle the visual direction before proceeding. Recommendation: retain the object composition as the welcome candidate. Slice 2 then establishes explicit program modes and compatibility without changing this first-run preview into production onboarding yet.
