# Live Activity local feedback

Implementation is ready for physical-device validation; **physical sign-off remains pending**. The approved layout, typography, dimensions, progress artwork, logo and compact Island are unchanged. The completion check has a temporary pending opacity while waiting for acknowledgment.

## 1. Why the previous version did not update in place

The original buttons emitted an event and waited for host launch, React Native hydration, SQLite/Zustand mutation and Slice 3 synchronization. Their visual press feedback did not update ActivityKit content. The original custom intent also requested foreground presentation.

The installed `expo-widgets` version is **57.0.20**. Its regular-widget intent evaluates the serialized `onPress` callback and updates timeline props, but its stock Live Activity intent only posts an event. Adding an `onPress` callback alone would therefore not fix this version. The refactor adds a scoped native adapter in `patches/expo-widgets+57.0.20.patch`; this is a custom extension of the installed SDK, not an unmodified Expo Live Activity feature.

## 2. Immediate presentation

Both the Lock Screen and expanded Island use the same pure `onPress` callbacks in `WorkoutLiveActivityLayout.tsx`. The intent evaluates the real Expo widget callback runtime against the latest presentation, then calls `Activity.update` directly. React Native initialization is not in that path. Expo's existing press walker expects one widget tree, so the adapter supplies the banner tree from the Live Activity region object; both interactive surfaces have identical targets and callbacks.

The payload includes canonical kg, the exact configured kg increment embedded in the action target, the display conversion factor and reps. Local arithmetic follows the existing minimums: 0 kg and 1 rep. Bodyweight has no weight controls. The adapter validates the encoded ActivityKit content against the 4 KB limit before accepting a command.

## 3. Mirroring into Stack

Before displaying a local update, native code atomically journals a command in the App Group container. It then updates ActivityKit and notifies the host. The journal contains identifiers, action targets, timestamps and sequencing metadata; it is not another workout database. A storage failure accepts neither the local update nor the command.

The hydrated host drains one command at a time through the existing `applyActiveSetAction`, preserving stable SQLite identities, stale-target checks, UUID deduplication, persist-before-publish behavior and atomic completion/next-set propagation. The configured increment is checked again before a weight action commits. Failed or stale actions are consumed and reconciled, not retried against a new set. Hydrated background JS can drain; startup and foreground also drain. There is no polling loop or background JS daemon.

## 4. Authoritative reconciliation

Local props carry a revision; host snapshots include the consumed-command watermark. Presses and authoritative writes share one native serial task chain. A host snapshot cannot replace newer local props while commands remain pending or its watermark is behind. Once those commands have been processed, the full authoritative snapshot replaces presentation props, including after a rejected or failed mutation. Slice 3 still owns activity lifecycle, duplicate cleanup and ending.

## 5. Foreground and lock behavior

The custom `LiveActivityIntent` now sets `openAppWhenRun = false` and `authenticationPolicy = .alwaysAllowed`. Normal controls do not request navigation or opening Stack. Native callback evaluation and ActivityKit updating do not require React Native to be ready. The intent still executes in the host process; background host execution is different from visibly foregrounding the app.

The App Group journal uses file protection that permits access after the first unlock following a restart. Actual locked-device execution, refresh timing and expanded-Island retention still require the physical checks below. Final workout feedback is delivered through the existing workout route when Stack is foregrounded; the workout remains active until normal feedback/save completes.

## 6. Rapid taps

Every callback is evaluated against the latest native presentation, not the original SwiftUI closure's props. The serial executor also spans the asynchronous ActivityKit update. Three accepted Weight + commands from 80 kg with a 2.5 kg step compute 82.5, 85 and 87.5. The host applies the same commands in order against its latest committed values.

Native and actual Expo/JavaScriptCore tests verify this ordering. They do not establish the physical screen's frame-by-frame repaint cadence: ActivityKit owns rendering and may coalesce frames.

## 7. Done and the next presentation

The host derives one next presentation using the same `projectSetToggle` and next-incomplete-exercise search used by authoritative completion. It includes real persisted identities and the existing Increase Between Sets behavior. The widget contains no independent workout progression algorithm. Weight/reps edits update that preview using the exact propagation offset/flag supplied by the domain projection.

Done immediately promotes the known next set or next exercise. It then disables Done until authoritative acknowledgment, preventing duplicate completion. Weight and reps on the known next frame can still be edited while that acknowledgment is pending. An old Done target cannot match the new presentation.

For the final workout set or an unavailable next presentation, Done shows a dimmed pending check and disables controls instead of fabricating a next set. A rejection restores authoritative controls/state. If React Native cannot run in the background, the next Done remains pending until the host drains and reconciles; the payload intentionally previews only one transition.

## 8. Actual limitations and validation

- This installed Expo release needs the patched adapter for Live Activity local callbacks. A native rebuild is required; Metro/OTA alone cannot install it. Older native binaries remain read-only.
- ActivityKit controls scheduling and screen rendering; an `Activity.update` call is not proof of immediate physical repaint.
- The durable inbox retains unconsumed commands across process restarts. Consumption immediately precedes the synchronous store mutation; termination in that narrow interval can lose the claimed command. There is no claim of crash-proof, exactly-once delivery. Remaining unconsumed commands survive. Eliminating that window would require a transactionally stored receipt tied to SQLite mutation.
- A suspended React Native runtime may defer authoritative persistence and the next Done acknowledgment until it can run. Local weight/reps presentation does not wait for it.
- No successful physical widget interaction is claimed. Both paired phones were unavailable during the checks. The device Release build was additionally blocked because the available app and widget provisioning profiles do not include required App Group `group.com.liftwithstack.stack`. Keep that entitlement; valid profiles are needed.

Completed checks:

- `npm run typecheck`: passed.
- `node --test tests/workoutLiveActivity.test.cjs tests/workoutPersistence.test.cjs`: **47 passed**. Includes actual serialized Expo callbacks, rapid values, local/authoritative agreement, Done previews, lbs, bodyweight, bounds, stale actions, rejection correction, rollback and encoded content size.
- `node tests/runLiveActivityNativeTests.cjs`: three groups passed. Uses actual Expo JavaScriptCore evaluation and Swift JSON round trips; production native serial executor with mocked ActivityKit; actual durable inbox with 1,000 concurrent enqueues, recovery, revision and corruption checks.
- Focused ESLint for Live Activity services/layout, shared set actions and root layout: passed.
- Native Debug simulator build: **BUILD SUCCEEDED**. Device Release build: **blocked by provisioning entitlements**.

The native ordering tests mock ActivityKit and cannot replace the requested iPhone test. Prior simulator artwork observations in the Slice 4 historical report are not a physical test of this refactor.

## Physical-device acceptance checklist — pending

Use Satwik's iPhone 14 Pro with a newly signed native build from this worktree. Use a disposable workout and preserve any existing user workout.

1. Set an externally weighted exercise to Set 2 / 4, 80 kg, 8 reps, with a 2.5 kg increment. Verify one real activity.
2. Lock the phone. Tap Weight + and verify 82.5 appears in the same visible activity without opening/unlocking Stack. Tap − and verify 80.
3. Tap Reps + and verify 9 immediately; tap − and verify 8. Check minimum 1 rep and 0 weight.
4. Tap Weight + three times quickly; verify the local progression and final 87.5 without dismissing the activity.
5. Tap Done and verify Set 3 / 4 immediately, using the real next-set values. Check the pending Done becomes available after acknowledgment; double taps must not complete two sets.
6. Background Stack, expand the Island, and repeat weight ±, reps ± and Done while keeping the Island visible. Record whether iOS collapses it.
7. Open Stack afterward: completed sets, selected exercise, weight and reps must agree with accepted controls. Relaunch and verify persistence.
8. Repeat next-exercise transition, kg/lbs custom steps, bodyweight and Increase Between Sets on/off.
9. Change selection/session or replace an exercise in Stack while a previous target is still visible; ensure stale commands cannot mutate the new target and the display reconciles.
10. Complete the last workout set: verify the pending completion response, then open Stack for normal feedback. Saving should end the activity and save history once.
11. Repeat with a cold host and locked phone; record local response separately from authoritative drain timing and the next Done acknowledgment. Verify ordinary controls never request Stack foregrounding.
12. Compare both surfaces against approved artwork. Compact/minimal remain display-only.

Use automated fault injection for persistence failure and corrupt storage; do not damage a user's physical-device database to test rejection.
