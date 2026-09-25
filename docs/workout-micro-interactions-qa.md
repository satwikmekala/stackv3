# Workout micro-interaction QA

## Implemented scope

- Shared workout motion constants: 110 ms press, 220 ms confirmation, 160 ms / 6 px numbers, 200 ms unit glide, 300 ms record fade.
- Opt-in workout touchables preserve callbacks, accessibility, disabled state, native cancellation, and existing haptics. Existing press-scale controls remain in place.
- Live set pips and exercise/bonus acknowledgements use a small check confirmation; reopening fades the check away. Structural transitions remain on their existing wrappers.
- Weight/reps animate the incoming exact value on programmatic changes. Manual input retains its existing validation, keyboard, selection, and commit behavior and bypasses number motion.
- KG/LBS indicator and text colors retarget from their current animated values. Conversion functions are unchanged.
- Rest progress retargets each existing timer tick on the UI thread; duration, interval, callbacks, and haptics are unchanged. Reduced motion shows current progress immediately rather than prematurely emptying the bar.
- Existing record-detail `isPR` / `hasPR` evidence gates the record fade. A bonus PR attempt is not treated as proof of a record.

`RestTimer` and legacy `SetInput` are not mounted by the current live workout screen. This pass does not introduce automatic rest behavior or a new live PR detector. There is no standalone exercise-info control in that screen. Extra Set and existing workout actions retain their current behavior.

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
