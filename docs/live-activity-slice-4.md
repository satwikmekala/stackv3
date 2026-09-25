# Slice 4 — real workout controls

> Historical report for the original host-driven implementation. Its foreground-launch behavior, process-local inbox, and QA expectations below are superseded by [the local-feedback refactor](live-activity-local-feedback.md). Use that report for the current implementation and device checklist.

Implemented in the `live-actitivity` worktree. Physical-device sign-off is **pending**. The paired iPhone 14 Pro and iPhone 17 Pro Max were unavailable during this implementation.

## Execution mechanism and limitations

The Lock Screen and expanded Island now wrap the approved minus, plus and check artwork in Expo UI `Button` components with `target` strings. Compact/minimal presentations remain display-only. Native plain button styling supplies press feedback; no optimistic weight, reps or completion state is maintained in the widget.

SDK 57 `expo-widgets` maps these buttons to SwiftUI `Button(intent:)` and sends interaction notifications through `onExpoWidgetsUserInteraction`. Its unmodified Live Activity intent immediately posts to `NotificationCenter`; that notification is not a cold-start inbox and does not wait for React Native hydration. [Expo documents the runtime separation and interaction listener limitations](https://docs.expo.dev/versions/latest/sdk/widgets/).

`patches/expo-widgets+57.0.20.patch` adds a narrowly scoped `StackWorkoutLiveActivityInteraction: LiveActivityIntent` for `stack.workout.v1:` targets. It sets `openAppWhenRun = true`, buffers commands in a lock-protected, process-local FIFO **before** notifying JavaScript, and exposes a synchronous `takeStackLiveActivityActions` method. Other Expo widget/Live Activity intents retain their original behavior. The existing `patch-package` postinstall applies the patch; a native rebuild is required. An OTA/Metro refresh alone is insufficient.

Apple supports running these intents in the host process and requesting foreground presentation. See [LiveActivityIntent](https://developer.apple.com/documentation/appintents/liveactivityintent) and [openAppWhenRun](https://developer.apple.com/documentation/appintents/appintent/openappwhenrun-5iruo).

**This implementation opens Stack for each action.** From a locked phone, iOS may require authentication before the host action proceeds. It does not promise to edit the workout while keeping the phone locked or keeping Stack backgrounded. The normal app launch activates React Native, waits for fonts/router/store hydration, subscribes to native events, then drains queued actions. A foreground event also drains the queue. There is no polling, push service, or background JavaScript daemon.

The inbox buffers native-to-JS startup timing; it is not durable across process termination. If iOS or the user kills the host before delivery, an undelivered tap is lost rather than replayed later against a different workout. Failed mutations are consumed and show the existing save-error alert; they are not automatically retried. The actual widget-tap/foreground/unlock path still needs device verification.

Interactive controls require iOS 17+. Older iOS builds and binaries without the patched native capability render the existing read-only artwork. The development fake activity stays read-only.

## Single mutation path

`Button → native LiveActivityIntent → startup FIFO/event → action bridge → applyActiveSetAction → existing updateExerciseSet/toggleSetCompleted → SQLite → Zustand → Slice 3 synchronizer`.

The workout screen's plus/minus and Log button now call that same `applyActiveSetAction`. Manual numeric entry continues using `updateExerciseSet`, whose shared validation enforces finite values, integer reps, minimum 1 rep, minimum 0 weight, and bodyweight weight 0. Weight steps use the existing profile's `getWeightIncrementKg`, including the configured lbs step converted to canonical kg.

The shared completion action preserves Increase Between Sets. Completion and next-set propagation now commit in one SQLite transaction, including the propagated targets; a failed second write rolls back both rows before Zustand changes. This requires **no database migration**.

The screen's circular next-incomplete-exercise search is shared domain logic. Final-set completion selects the next exercise, or returns `needsFeedback`. The host routes to the existing workout screen and intensity picker for the final exercise. It does not save or end the workout until the normal feedback action succeeds. Slice 3 continues owning Live Activity creation, redraw, recovery, duplicate cleanup and ending.

## Stale actions and repeated taps

Each command contains the action, session ID/start timestamp, existing SQLite session-exercise ID and set ID, exercise name, and expected positions. The native intent and bridge both reject non-active ActivityKit instances; the bridge also checks the source against instances of the real workout factory. The store rereads persisted IDs and compares every target field with the authoritative selected exercise and first incomplete set before writing.

Replacing an exercise allocates new set IDs, including a replacement at the same position with the same name. Completed sets, a different session, changed selection, missing hydration/profile, and malformed commands are no-ops. Bodyweight targets omit weight commands, and the store rejects forged weight commands too.

The native queue consumes each event once. The JS bridge also deduplicates native event UUIDs. Each store mutation is synchronous through its SQLite commit; rapid increments read the latest committed values, never a value embedded in the widget. Two Done events for the same displayed set carry the same target: after the first completes it, the second cannot match the active set. Rejected actions request an authoritative refresh.

## Files changed in this slice

- `components/live-activity/WorkoutLiveActivityLayout.tsx` — interactive wrappers and accessibility labels; artwork/layout unchanged.
- `services/liveActivity/actions.ts` — action encoding, validation, serialized inbox handling.
- `services/liveActivity/interaction.ios.ts`, `interaction.ts` — native listener/startup/foreground bridge and non-iOS no-op.
- `services/liveActivity/state.ts` — optional action targets in display props.
- `services/liveActivity/sync.ios.ts`, `sync.ts`, `coordinator.ts` — safe target creation, native capability gating and authoritative refresh.
- `store/workoutSetActions.ts` — explicit action/target/result types and shared exercise progression helper.
- `store/workoutStore.ts` — shared actions, validation, target checks, persist-before-publish semantics.
- `store/workoutDatabase.ts` — existing row identity lookup and atomic completion/next-set writes.
- `app/workout.tsx` — shared action calls and normal feedback handoff.
- `app/_layout.tsx` — attach interaction bridge only after host readiness; route successful actions to workout.
- `patches/expo-widgets+57.0.20.patch` — native intent, FIFO, consume method and scoped button routing.
- `tests/workoutPersistence.test.cjs`, `tests/workoutLiveActivity.test.cjs` — integration and failure coverage.
- `tests/native/live-activity-inbox/main.swift` — native FIFO/concurrency test.
- This report.

## Verification performed

- `node --test tests/workoutLiveActivity.test.cjs tests/workoutPersistence.test.cjs`: **39 tests passed**. Includes every action, rapid increments, duplicate delivery, double Done, stale identities/source/session/selection, malformed events, no workout, hydration, kg/lbs, decimals, bodyweight, Increase Between Sets on/off, transaction rollback, final progression, authoritative redraw and ending after normal feedback.
- `npm run typecheck`: passed.
- Focused ESLint for Live Activity services/layout, shared action types, root layout and resume helper: passed. Existing workout screen lint still reports 7 `react-hooks/refs` errors and 1 `react-hooks/set-state-in-effect` error; the store retains 2 pre-existing duplicate-import warnings.
- Native Debug simulator build: **BUILD SUCCEEDED**, iOS 26.3 iPhone 17 Pro destination. The new Swift intent and button routing compiled in the app/widget build.
- Actual native FIFO source compiled and executed with Swift: ordered delivery, 1,000 concurrent enqueues, unique IDs and consume-once all passed. Reproduce:

  ```sh
  swiftc node_modules/expo-widgets/ios/WidgetsEvents.swift tests/native/live-activity-inbox/main.swift -o /tmp/stack-live-activity-inbox-test
  /tmp/stack-live-activity-inbox-test
  ```

- Simulator visual check: approved Lock Screen artwork renders after the native rebuild. Shared in-app controls verified 50 → 52.5 → 50 kg, 8 → 9 → 8 reps, Set 2 → Set 3 at 52.5 kg, and final Bench set → Overhead Press Set 1. The simulator's original SQLite snapshot was restored afterward.
- Widget tap automation: **blocked**. The simulator's widget controls were absent from its accessibility tree, and coordinate clicks failed with `noWindowsAvailable`. No claim of successful widget taps, unlock handoff, expanded-Island interaction, or physical-device completion is made.

## Physical-device QA — pending

Install a new native build from this worktree with the patch applied. Use a disposable workout; note its original increment, unit, weight and reps. For **each** widget tap below, expect Stack to foreground (unlock if prompted); return to the Lock Screen/expanded Island to verify the redraw before the next tap.

1. Start a workout with an externally weighted exercise and verify exactly one real Live Activity.
2. Set a known decimal weight, reps and custom kg increment in Stack.
3. Lock the phone, tap Weight +, authenticate if requested, and verify exactly one configured increment in Stack and the refreshed activity.
4. Repeat Weight − and verify the original value.
5. Repeat Reps + and Reps −; verify the original reps.
6. Check weight cannot fall below 0 and reps cannot fall below 1.
7. From Lock Screen tap Done: exactly the displayed set completes, and the next set uses the normal Increase Between Sets values.
8. Complete the exercise's final set from Lock Screen: the existing next incomplete exercise appears.
9. Background Stack, expand the Dynamic Island, and repeat weight ±, reps ± and Done. Each action must foreground and route to the matching workout.
10. Confirm compact Island stays display-only and opens Stack normally.
11. Attempt several rapid Weight + and Reps + taps before the handoff dismisses the widget. Count accepted presses; no delivered increment may be lost or applied twice.
12. Double-tap Done before the old presentation disappears. Only that set may complete.
13. Tap + and Done in quick succession; updates must follow delivered order and an old-set + after Done must be rejected.
14. Change exercise/set in Stack, then trigger an old widget target before its redraw. It must not mutate the newly selected set.
15. Swap an exercise; verify an old target cannot modify the replacement.
16. Discard/start another workout and confirm old targets do nothing and only one new activity remains.
17. Change to lbs with a distinct custom lbs increment. Repeat ± with decimals; check the converted value agrees exactly with the app display.
18. Test bodyweight: weight buttons are disabled, weight remains absent/zero, reps and Done work.
19. Repeat completion with Increase Between Sets enabled and disabled; compare next-set reps/weight/targets with in-app logging.
20. Complete the last set of the last exercise from the activity. Stack must show its existing feedback picker; the session must remain active until feedback is submitted.
21. Submit feedback normally; verify workout/history saved once and Live Activity ends.
22. Cold-launch case: terminate Stack with a workout active, then tap a widget control. Once iOS permits the foreground launch, verify startup/hydration delivery once or a safe stale no-op if the resumed selection differs.
23. Check the Lock Screen and expanded Island spacing, typography, progress bars, logo and check artwork against the approved reference; check native press feedback and VoiceOver control labels.

Persistence failure, malformed inputs and duplicate native delivery are covered by automated fault injection; do not corrupt a physical user's database to exercise them.
