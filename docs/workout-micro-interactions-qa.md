# Workout micro-interaction QA

## Home slide-to-start navigation fade

- The iOS native tab bar uses Home's shared slider progress and the same opacity curve as the secondary actions (2–76% of travel). Its icons, labels, and glass surface fade together; dragging back or cancelling restores them with the slider's spring.
- An invisible native anchor changes only the containing `UITabBarController`'s tab-bar alpha. Fully faded navigation stops receiving touches and accessibility focus. Leaving Home or removing the anchor restores the bar's original alpha, interaction, and accessibility state.
- Device QA: drag halfway and back; release before the commit threshold; slide fully to launch; return Home; switch to Progress and Stack. Check the navigation fades continuously, returns after cancellation, and remains available after returning or changing tabs. Repeat with Reduce Motion enabled.
- Requires an iOS app rebuild for the new native view.
- Validation: TypeScript, targeted ESLint, eight slider tests, whitespace checks, and the iOS simulator build passed. The rebuilt app loads Home with native navigation. Gesture verification remains pending because the simulator UI tool returned `noWindowsAvailable` for coordinate input.

## In-card exercise stopwatch

- Unfinished duration sets expose Start timer inside the measurement card, using the workout accent, existing typography, rounded controls, press feedback, and 44 pt touch targets. Running time replaces the manual stepper; Stop writes measured seconds back into the editable value. Resume excludes paused time, and Reset restores the original duration. Completed-set inspection remains manual.
- Log stops and commits a running stopwatch before completing the set, so timed propagation uses the measured duration. Failed duration writes prevent completion. Skip, exercise changes/swaps, external completion, and discard clear the timer's captured row identity.
- The stopwatch starts at zero while preserving the original duration as context. Timestamp-based ephemeral state survives screen minimization and app backgrounding; stopped measurements use the existing SQLite set action. It does not survive process termination. This implementation covers identified active sets; bonus-set drafts retain manual duration entry.
- Validation: 172 workout UI/persistence/Live Activity tests, TypeScript, targeted ESLint, whitespace checks, and iOS production export passed. Tests cover stop/resume/reset, timestamp accuracy, duration bounds, measured-time persistence/propagation, and stale targets. Simulator visual inspection could not complete because the computer-use API timed out; device layout, VoiceOver, and touch feel remain unverified.

## Side by side weight and reps wheels

- The current set card has no default Set/Logged heading. Set context remains in the set rail; bonus sets retain their descriptive heading. Weight and reps sit side by side, with wider proportional reps space and matching selected-row heights. Each caption and its percentage form one group centered below its wheel. Percentages use the exercise accent color and compare the displayed set with its previous set; reps omit the comparison for a missing or zero baseline and for timed exercises.
- iOS weight entry is a real UIKit `UIPickerView`, exported as the `WeightPicker` view of `StackWorkoutControls`. Whole numbers and decimal digits (0–9) scroll independently with native projection, momentum, snapping, selection feedback, and accessibility. Compact wheels omit the unit suffix; timed weighted exercises retain the full-width weight layout with a unit beside the value. Web/Android use snapping vertical number wheels.
- Weight pickers cap the displayed value at 999 in either unit, preserving tenths below that limit; selecting whole weight 999 resets the decimal to zero. Reps pickers stop at 99, including native accessibility adjustment. Out-of-range input is displayed within the bounds without writing on mount. Compact native/fallback weight pills are centered at up to 160 pt; native full-width weight pickers use up to 196 pt beside the unit, and reps pills are centered at up to 88 pt. These widths reserve space for three whole-weight digits and two rep digits rather than unused fourth/third digits.
- Picker-limit validation: TypeScript, targeted ESLint, 24 workout UI tests (including maximum-weight/decimal and reps boundaries), whitespace checks, and the full iOS simulator build passed. The native changes still require a device app rebuild; this validation did not install the simulator build over an active QA session.
- Weight uses smaller 34 pt numerals in the two-column layout. Native component widths reserve 32 pt for UIKit's component gutters; whole numbers align toward the narrow decimal-point column, and decimal digits align toward it from the other side. This keeps the decimal digit inside the selection pill and tightens the gaps regardless of digit count. Web/Android use the same inward alignment, a 12 pt point column, and compact horizontal padding. Reps use a matching native vertical `UIPickerView`, exported as `RepsPicker`, with the same row height and font so selected values align. Reps expose a separate adjustable accessibility element, with increment/decrement actions and whole-rep bounds. Web/Android use vertical number wheels. Bodyweight exercises center the reps wheel. Weight/reps no longer open a keypad; timed exercises retain their time input and ±5 s controls.
- Decimal-spacing validation: an isolated UIKit preview compiled from the production weight-picker class showed two- and three-digit weights with their decimal digit safely inside the pill at a 178 pt picker width. Targeted ESLint, Swift parsing, and 20 workout UI tests passed. Full TypeScript checking encountered unrelated `/lift-progress` and `/lift-detail` route errors in the profile screen. The full iOS app was not rebuilt because the host had only about 215 MiB free; this native adjustment requires rebuilding before it appears in Stack.
- Compact weight alignment: the pill narrows from 168 to 160 pt around its existing center. The heading shifts 3 pt left; native component widths and asymmetric fallback padding move the digits left within the pill so three-digit values have balanced margins. An isolated simulator preview compiled from the production native picker verified 40.0, 140.0, and 999.0. TypeScript, targeted ESLint, Swift parsing, and all 24 workout UI tests passed. The native content was then fine-tuned another point left, rebuilt, and installed on the iPhone 17 Pro simulator without clearing workout data. The actual workout card at 106.0 measured 65 px left and 66 px right of the visible digits at 3× simulator resolution. The full simulator build passed, and Stack remains open on that workout.
- Skip/Back and the circular Log/Done action sit in a separate row outside the card. A capsule-shaped KG/LBS selector is centered between them, with 44 pt unit targets. Up Next follows that row with consistent spacing. The logger body scrolls when a small display, longer set rail, or larger text needs more room.
- Picker input is in the displayed unit; persistence remains canonical kilograms. Mounting a wheel, changing units, and reviewing sets never commit a rounded load. Existing stale-target checks still protect set edits.
- Log initially shows only text, matching Skip's 14 pt semibold type. Tapping fades the label over 90 ms and reveals a centered tick over 170 ms, with a 50 ms lead-in. The set submits after 320 ms so the acknowledgement remains visible even on the final set. Reduce Motion shows the tick immediately with a 150 ms hold. Repeated taps cannot submit twice; changing the set or leaving cancels a pending submission. The following set gets a fresh Log control. Completed-set editing actions keep their direct callbacks.
- Validation: iOS simulator build, TypeScript, targeted component/test ESLint, whitespace checks, and 165 workout UI/persistence/Live Activity regression tests passed. Simulator inspection covered compact column spacing, aligned weight/reps selection, separate accessible weight/reps controls, the external action row, Up Next placement, completed-set review, return to the current set, and KG → LBS → KG with three-digit weights. Automated component checks cover unit conversion without a mount-time write, reps percentage changes and missing baselines, fallback-wheel momentum settlement/bounds, accessible adjustment, and bodyweight/time/bonus/editing branches. Existing screen-level effect/ref lint errors remain.
- Physical-device drag/momentum feel, repeated flicks, VoiceOver on both weight components, large text, contrast/transparency settings, and Reduce Motion still need review. The simulator computer-use API did not reliably synthesize drag input; screenshots and accessible adjustment checks do not establish touch responsiveness or frame rates.
- Rebuild the iOS app for the new native view; Metro refresh alone cannot register it.

## Native workout header and minimize transition

- iOS Change/Add, Minimize, and Exit use UIKit toolbar items from the local `StackWorkoutControls` Expo module. UIKit owns their Liquid Glass backgrounds on iOS 26 and their SF Symbols, press handling, and older-iOS appearance. Header sizing grows with the preferred system font and can wrap beside the day label.
- Exit retains the existing system discard confirmation. Both empty and populated loggers disable the route animation before minimizing and preserve the active session.
- Minimize/resume share a near-critical spring, with no overshoot beyond the resume card. The preview retains its final text layout, and the surface lands at the stored card position, including a previously dragged position. Minimize can retarget an in-progress expansion; duplicate minimize actions are ignored and unmount cancels the animation.
- Reduce Motion substitutes a 130 ms fade for the surface transformation.
- Validation: iOS simulator build, TypeScript, targeted ESLint, whitespace checks, and 156 workout UI/persistence/Live Activity regression tests passed. Native toolbar glass appearance and resume expansion were inspected in the simulator.
- Still required: physical-device motion review, repeated minimize/resume, dragged-card landing, VoiceOver, large text, reduced transparency, and Reduce Motion. The computer-use tool could inspect the native toolbar but could not invoke its icon controls, so this pass does not claim completed simulator minimize interaction or frame-rate QA.
- Native changes require rebuilding the iOS app; a Metro refresh alone cannot add the local module.

## Implemented scope

- Shared workout motion constants: 110 ms press, 220 ms confirmation, 160 ms / 6 px numbers, 200 ms unit glide, 300 ms record fade.
- Opt-in workout touchables preserve callbacks, accessibility, disabled state, native cancellation, and existing haptics. Existing press-scale controls remain in place.
- Exercise/bonus acknowledgements use a small check confirmation. Set markers show completion quietly and keep selection separate from workout progress. Structural transitions remain on their existing wrappers.
- Weight/reps animate the incoming exact value on programmatic changes. Manual input retains its existing validation, keyboard, selection, and commit behavior and bypasses number motion.
- KG/LBS indicator and text colors retarget from their current animated values. Conversion functions are unchanged.
- Rest progress retargets each existing timer tick on the UI thread; duration, interval, callbacks, and haptics are unchanged. Reduced motion shows current progress immediately rather than prematurely emptying the bar.
- Existing record-detail `isPR` / `hasPR` evidence gates the record fade. A bonus PR attempt is not treated as proof of a record.

`RestTimer` and legacy `SetInput` are not mounted by the current live workout screen. This pass does not introduce automatic rest behavior or a new live PR detector. Extra Set and existing workout actions retain their current behavior.

## Checks performed

- TypeScript: passed.
- Existing Node regression suite: 16/16 passed (persistence, progression, personal records, settings).
- Targeted ESLint: passed for ActiveSetCard, WorkoutTouchable, workoutMotion, RestTimer, BonusSet, record-detail.
- iOS production export: passed.
- Diff whitespace check: passed.
- Full-project lint: blocked by existing hook/ref errors, including the existing structural workout/sheet code and unrelated screens.
- Web export: blocked by Expo SQLite WASM module resolution.
- Simulator interaction QA: inconclusive; workout state changed between the initial inspection and the first action. No smoothness or frame-rate claim is made.

## Device checks still required

Use a disposable workout and repeat with system Reduce Motion enabled:

1. Complete/reopen one set, then log several rapidly. Confirm persistence is immediate, checks settle without delaying the next card, and reopening is not celebratory.
2. Tap Extra Set, Log, Skip, Change, queue items, add/remove exercise controls, and primary CTAs. Test rapid taps, drag-off cancellation, and sheet swipes.
3. Toggle KG → LBS → KG and rapidly alternate. Verify final selection, readable labels, and exact conversions.
4. Increase/decrease weight and reps; manually enter integers and decimal weights, cancel/blur/submit, and submit an unchanged value. Verify the next stepper tap still animates and displayed values remain exact.
5. In an isolated RestTimer fixture, run the countdown, adjust ±15 seconds repeatedly, skip, finish, and unmount. Check smooth progress, original 90-second duration, callback count, and reduced-motion progress. There is no pause control in this component.
6. Open record detail with known PR and non-PR rows. Verify only existing PR evidence receives the reveal and bonus PR attempts do not trigger a new reward.
7. Use many sets/exercises; scroll/swipe/navigate/minimize repeatedly. Inspect dropped frames on a physical device, stable scroll position, and cleanup after navigation.


## Exercise title and set review refinement

- Exercise info lives beside the exercise name, with a 44 pt target, and opens the existing sheet. It is absent only when no exercise info exists.
- Set markers fill equal-width slots across the available row and wrap for more sets or narrow widths. Logged measurements remain visible; only the displayed set has the outlined selection capsule and VoiceOver selected state.
- Set pills use a 44 pt visible height inside a 56 pt row. Numbers use 15 pt bold type; measurement/Now labels use 14 pt semibold type with single-line fitting down to 80% for longer summaries on narrow screens. Completion badges are 26 pt with 15 pt checks, and tighter horizontal padding/gaps leave more room for values such as `40.5 × 8`. Text scaling is capped at 1.2× within the compact rail; full measurements remain in the accessibility labels. The persistent selection surface continues to follow measured bounds, including wrapped rows.
- Reviewing completed sets preserves the active stage and card identity. Card, unit controls, and actions stay in place; measurements receive a restrained 140 ms opacity recovery that can retarget during another selection. Reduce Motion shows the values immediately.
- Measurement input identity changes with the selected set, so an unfinished keypad draft cannot follow the user into another set. Existing validated edit callbacks still guard stale commits.
- The Now marker returns directly to the unfinished set. Review, Back, and Done editing do not advance workout progress.
- Validation: TypeScript, targeted component/test ESLint, whitespace checks, and 159 workout UI/persistence/Live Activity tests passed. Simulator checks covered Deadlift info open/close, repeated set 1/2 review, correct selected markers/values, and return to set 3, with stable card bounds. Existing screen-level hook/ref lint errors remain.
- Physical-device frame-rate, VoiceOver, large-text, and Reduce Motion review remain outstanding; simulator screenshots do not establish animation frame rates.


## Continuous pill selection and completion color

- A single persistent highlight now moves between measured set targets using a bounded, near-critical spring. Logging forward, reviewing backward, and returning to Now all retarget the same animated position/size without resetting velocity or blocking input.
- Initial placement is immediate; wrapped rows, differing heights, and resized slots use their measured bounds. The surface stays behind the touch targets and is clipped to the rail.
- Completed sets crossfade the number into a check in the exercise accent color over a softly tinted circle of that same color. Checks remain visible when selected; switching between already completed sets does not replay completion feedback.
- System Reduce Motion applies to the selection spring and glyph fades. Semantic completion labels and selected accessibility states update immediately.
- Validation: TypeScript, targeted ESLint, whitespace checks, and 161 workout UI/persistence/Live Activity tests passed. New regression coverage checks logging advancement without stage remounts, initial highlight placement, retargeted bounds, and wrapping. Simulator inspection covered blue completion badges, repeated set 1/2 switching, and return to the unfinished set. Physical-device frame-rate review remains outstanding.
