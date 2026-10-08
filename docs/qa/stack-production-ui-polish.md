# Stack production UI polish

Implemented sequentially on 8 October 2026. The changes address logger clipping, Train departure lifecycle, and weight-picker geometry while retaining the current screen hierarchy, colors, interactions, and persisted workout format. No dependencies were added, no production data was modified, and nothing was pushed or deployed. The working tree was clean at the initial inspection.

The supplied attachment contained the request text, but not the referenced device screenshots. Physical iPhone acceptance remains pending; automated checks and the native simulator preview are described separately below.

## Issue 1 — Up Next clipping

**Root cause:** the logger's flex container reserved `paddingBottom: 96` outside its `Animated.ScrollView`. That shortened the native scroll viewport and produced a horizontal clipping boundary above the floating exercise actions. The card itself retains its 82-point height and 22-point corner radius. The launch/minimize surfaces mask at screen bounds while expanded; they do not account for this additional 96-point strip. There is no keyboard-avoidance container in this branch.

**Fix:** removed the outer bottom padding and put 96 points of clearance in the scroll content: 60 for the floating pill, 20 for its bottom offset, and 16 for separation. The safe-area bottom inset remains on the root. Content can extend behind the floating controls, and scrolling to the end places Up Next entirely above their touch targets. The pill remains a later, absolute sibling of the scroller; its appearance and hit testing are unchanged. On short screens, content still needs scrolling rather than being compressed to fit.

References: [logger viewport](/Users/satwikmekala/stackv3/app/workout.tsx:740), [scroll clearance](/Users/satwikmekala/stackv3/app/workout.tsx:859), [floating pill](/Users/satwikmekala/stackv3/components/ExerciseActionPill.tsx:23), [screen mask](/Users/satwikmekala/stackv3/components/WorkoutMinimizeSurface.tsx:121).

Validation before Issue 2: all 57 workout UI tests and TypeScript passed. The new render regression verifies the viewport ancestors, scroll-content clearance, unchanged card geometry, floating-action ownership, and queue-opening callback. These checks do not emulate native screen layout or prove physical touch clearance.

## Issue 2 — Train appears to contain only Resume

**Code-supported cause:** Train and the hero use `HomeDeparture` to fade the header, hero surface/title, and secondary content during slide-to-start. The Resume button is outside those animated wrappers. The slider's original reaction wrote its offset into that shared value without a focus guard; blur cancelled animation but intentionally retained the final offset. Home only reset the fade on focus. A retained slider or late reaction could therefore reapply a hidden state, and Train could remain hidden underneath the transparent workout modal until focus returned. This code path reproduces the stale-write failure in the hook harness and matches the described visible elements. The intermittent timing has not been reproduced on a physical device.

**Fix:** Home resets the shared departure on both focus and blur. The slider has a UI-thread focus gate, relinquishes the shared fade on blur/unmount, and ignores stale departure values after blur. Its own handle still stays at the destination for the workout launch animation. No force-rerender or data-hydration workaround was added.

The existing active-session hero is intentional and retained. It renders the workout title and in-progress status along with Resume; Train's greeting and program/discovery content remain mounted. There is no dedicated legacy resume-only screen to remove.

References: [Home lifecycle](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:108), [slider lifecycle](/Users/satwikmekala/stackv3/components/home/SlideToStart.tsx:43), [fade implementation](/Users/satwikmekala/stackv3/components/home/HomeDeparture.tsx:8), [hero wrappers and Resume action](/Users/satwikmekala/stackv3/components/home/WorkoutHeroCard.tsx:31), [transparent workout route](/Users/satwikmekala/stackv3/app/_layout.tsx:239).

Lifecycle audit: minimize finishes the surface animation and navigates back, with a tabs fallback when no back route exists. Resume pushes the workout route with `fromActivityCard: '1'`. Neither operation clears `currentSession` or `workoutFocus`. SQLite hydration restores the current session and persisted exercise focus; selected-set inspection is intentionally transient. The current model has no separate paused-workout state. Stopwatch stop/resume is covered by the existing persistence tests; its in-memory running timer does not survive process termination, as documented before this change. Navigation history itself is not newly persisted.

Validation before Issue 3: 270 UI, slide, launch, and persistence tests plus TypeScript passed. New tests execute blur/refocus and a late slider callback, and repeat resume/minimize lifecycle callbacks three times in no-program, Stack, and custom modes while checking session/focus identity and home content. These are mocked navigation lifecycle tests, not native navigation gesture tests. Existing real SQLite tests cover restored focus, values, unit conversion, and timer stop/resume.

## Issue 3 — Weight typography and highlight snap

**Root cause:** native `wholeDigitCount` was derived from the last committed selection. Three-digit rows could enter a column still sized for one or two digits, while each label enabled font fitting down to 40%. `didSelectRow` then resized the picker through `resizeForSelection`, animated the new frame, and reloaded its components. The fallback picker similarly animated its whole-number column and selection width only after the committed value changed.

| Approach | Assessment |
| --- | --- |
| A: Stable width | Chosen. Reserves all three whole-number digits, keeps the decimal anchor fixed, and avoids selection-driven layout work. |
| B: Continuous adaptive highlight | Would require continuous native scroll-position tracking and careful coordination between whole/decimal wheels. It adds motion and complexity without a demonstrated benefit here. |

**Fix:** the native picker uses a stable width up to 160 points compact or 196 points with a unit suffix. Both supported unit suffixes have the same reserved space. All rows use a single monospaced-digit font fitted to the viewport and accessibility text size, with space for UIKit's gutters. Individual labels no longer shrink. Frame/font recalculation and component reloads occur for layout changes rather than selection changes. The fallback reserves three-digit capacity, including its existing capped text scaling, and uses a static selection background.

The 0–999 displayed-unit limit, tenth formatting, cap behavior at 999, canonical kilogram conversion, callback deduplication, selection haptics, and accessibility component labels remain intact. At extremely narrow widths or large accessibility settings, the native font is fitted uniformly for the entire range; it never changes with the selected digit count. No frame-rate or performance improvement is claimed.

References: [native picker geometry and selection](/Users/satwikmekala/stackv3/modules/stack-workout-controls/ios/StackWorkoutControlsModule.swift:142), [fallback picker](/Users/satwikmekala/stackv3/components/WorkoutWeightPicker.tsx:10), [unchanged canonical conversion](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:430).

## Exact changed files

- `app/workout.tsx` — moved floating-control clearance into the scroller.
- `app/(tabs)/index.tsx` — restores departure on blur as well as focus.
- `components/home/SlideToStart.tsx` — focus ownership and stale-update guard for departure.
- `components/WorkoutWeightPicker.tsx` — fixed capacity and selection background.
- `modules/stack-workout-controls/ios/StackWorkoutControlsModule.swift` — stable native picker geometry and uniform font fitting.
- `tests/adhocWorkoutUI.test.cjs` — ScrollView mock, focus/reaction harness, six new regression cases covering the three issues.
- `tests/native/weight-picker/main.swift` — standalone UIKit assertions and preview, with Expo bridge stubs.
- `tests/runWeightPickerNativeTests.cjs` — extracts the production picker verbatim, compiles and runs it in a specified booted simulator, and fails if native assertions do not finish.
- `docs/qa/stack-production-ui-polish/native-weight-boundaries.png` — inspected native preview.
- `docs/qa/stack-production-ui-polish.md` — this report.

## Executed verification

| Check | Result and scope |
| --- | --- |
| Focused final Node suite | **304 passed, 0 failed** across `adhocWorkoutUI`, `homeSlide`, `workoutLaunch`, `workoutPersistence`, `workoutLiveActivity`, `exerciseWrapUp`, and `settingsBehavior`. |
| Native picker | **20,440 checks passed** using production UIKit picker code. Compact/full layouts; 129, 140, 160, 196, 280-point view widths; normal and maximum accessibility categories; KG/LBS; boundary/fraction samples; every whole weight 0–999. Checks frame/column/font stability, label fit, bounds, callbacks, no prop-update writes, decimal cap, and accessibility labels. |
| TypeScript | `npm run typecheck` passed. |
| Changed-file lint | Passed for Home, SlideToStart, fallback picker, and both JS test files. Workout screen retains seven pre-existing errors: one `set-state-in-effect` and six ref-access diagnostics. Running ESLint on the `HEAD` source confirmed the same seven baseline errors. |
| Swift | Full module syntax parse passed; isolated native picker compiled and executed against the iOS simulator SDK. |
| iOS production export | Passed with `expo export --platform ios`; output in `/tmp/stack-production-ui-polish-export`. This is a JS bundle export, not a full native app rebuild. |
| Whitespace | `git diff --check` passed. |
| Component review | React review focused on hook cleanup, ownership of transient animation state, unchanged callbacks/accessibility, and no per-scroll React state additions. |

Run the Node checks with:

```sh
node --test tests/adhocWorkoutUI.test.cjs tests/homeSlide.test.cjs tests/workoutLaunch.test.cjs tests/workoutPersistence.test.cjs tests/workoutLiveActivity.test.cjs tests/exerciseWrapUp.test.cjs tests/settingsBehavior.test.cjs
```

Run the native checks on a booted, disposable QA simulator with:

```sh
node tests/runWeightPickerNativeTests.cjs <simulator-uuid>
```

The native harness installs only `dev.stack.weight-picker-qa`; it does not install over Stack or touch its workout database. It invokes UIKit delegates programmatically rather than synthesizing finger gestures. During verification it exposed a suffix-width mismatch after adding unit relayout; reserving both suffixes resolved it and the final run passed.

## Visual verification and remaining device QA

The [native preview](/Users/satwikmekala/stackv3/docs/qa/stack-production-ui-polish/native-weight-boundaries.png) shows 9.9, 10.0, 99.9, 100.0, and 999.0 in the production native class. Pill widths and decimal positions match, with all selected digits visible. The preview has shortened wheel heights to show five examples together; it is not a screenshot of the integrated workout screen. No before/after integrated logger or Train screenshot was captured.

A native iOS rebuild is required to deliver the Swift change. Metro refresh alone is insufficient. Before release, use a disposable workout on physical iPhones:

- [ ] Short/small and large screens: inspect Up Next at rest and while scrolling; ensure rounded borders remain visible, scroll to reveal the entire card above History/Notes, and test both overlapping and unobstructed touch targets.
- [ ] Safe areas and keyboard: check home indicator, screen rotation if supported, weighted timed entry, keyboard dismissal, long exercise titles, many set rows, and queue sheets.
- [ ] Minimize/resume at least ten times from a fresh slide launch, from both Resume entry points, and while expansion is still running. Inspect Train throughout the transition for blanks or flashes and check all native tabs.
- [ ] Repeat with an empty, partially logged, completed-exercise, custom, and restored session. Check entered values, reviewed/current set, exercise position, and session ID. Background/foreground, stop/resume a stopwatch, and relaunch using supported persistence behavior.
- [ ] Slowly drag and rapidly flick 9→10 and 99→100 in both directions, including fractions and the 999 cap. Confirm no font correction or highlight snap after release and no missed/duplicate commits.
- [ ] Switch KG→LBS→KG, inspect canonical values, and cover external-weight, bodyweight, duration, bonus, and completed-set editing branches.
- [ ] VoiceOver: adjust each wheel separately, hear correct labels/values, operate Resume and Up Next; repeat with maximum text size, Reduce Motion, and reduced transparency.
- [ ] Assess physical-device scroll responsiveness, frame pacing, and haptic feel. Simulator assertions/static screenshots do not establish these properties.

The principal remaining risk is native animation/focus ordering during real interactions; the new tests cover state ownership but cannot reproduce all React Navigation/Reanimated scheduling or UIKit touch behavior. These checks remain a release requirement, not a completed acceptance claim.
