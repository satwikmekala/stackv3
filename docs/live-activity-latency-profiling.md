# Live Activity latency profiling

The Debug iOS build emits `os_signpost` intervals and events under subsystem
`com.liftwithstack.stack`, category `LiveActivityLatency`. This is measurement
code only. The signposts are compiled out of release builds unless
`STACK_LIVE_ACTIVITY_PROFILE` is set. The RN markers are active only with
`__DEV__`.

## Correlation and span map

`intentPerform` creates a trace UUID at the first line of App Intent `perform()`.
`actorQueueWaitPress` begins when `press` is called and ends after the prior
serialized task finishes. The `journalPersisted` event includes the existing
command UUID and sequence; use those to join subsequent `LiveActivityBridge`
events and the authoritative update's `ack`/revision. No product identity is
changed.

| Stage | Signposts or markers |
| --- | --- |
| Intent and actor | `intentPerform`, `intentDispatch`, `actorQueueWaitPress`, `pressProcessing`, `actorQueueWaitReconcile`, `authoritativeReconcile` |
| JS | `jsRuntimeLockWait`, `jsRuntimeCold`/`jsRuntimeWarm`, `jsContextCreate`, `jsBundleRead`/`jsBundleCached`, `jsBundleEvaluate`, `jsLayoutFunctionEvaluate`/`jsLayoutFunctionCached`, `jsLayoutAndCallback`, `jsTotal` |
| Optimistic state and journal | `currentPresentationDecode`, `optimisticMergeAndValidation`, `journalLockWaitEnqueue`, `journalFileRead`, `journalDecode`, `journalAppend`, `journalEncode`, `journalAtomicWrite`, `journalPersisted`, `optimisticStateEncode` |
| First update and bridge | `activityUpdateOptimistic`, `optimisticUpdateReturned`, `nativeNotificationBegin`, `nativeNotificationPosted`, `nativeEventEmit`, `rnNotificationReceived`, `rnDrainInvoked`, `nativeCommandTake`, `commandRetrieved`, `rnCommandRetrieved` |
| RN and authoritative update | `rnMutationBegin`, `rnMutationEnd`, `rnReconcileRequested`, `rnPresentationDeriveBegin`/`End`, `rnAuthoritativeNativeCallBegin`/`End`, `reconcileDecodeAndRevision`, `reconcilePendingCheck`, `reconcileAccepted`/`Skipped`, `activityUpdateAuthoritative`, `activityUpdateAuthoritativeSkipped` |

`rnMutationBegin` to `rnMutationEnd` includes SQLite and Zustand together. These
are not separately instrumented because Slice 2 owns the store/database files.
`jsLayoutAndCallback` is the Expo JS handler call and includes both the full
layout walk and callback execution; splitting those requires work inside the
callback system. Signposts stop at completion of `Activity.update`; ActivityKit
does not report the actual pixel presentation time.

## Physical device procedure

1. Connect and unlock an iPhone, trust this Mac, enable Developer Mode, and
   confirm it appears online with `xcrun xctrace list devices`. The devices
   visible on this Mac during instrumentation were offline, so no tap timings
   were collected.
2. Open `ios/Stack.xcworkspace` in Xcode. Select the **Stack** scheme, the
   connected iPhone destination, and the **Debug** configuration. Build and
   install. Start a workout and confirm its Lock Screen Live Activity is visible.
   Stop the Xcode run only after checking that the Live Activity remains.
3. Open Instruments with `open -a Instruments`. Select the connected iPhone,
   choose **Time Profiler**, add **Points of Interest** from the instrument
   library, and set the target to **All Processes**. App Intent execution may
   occur in the app or widget extension; filtering to Stack alone can miss it.
   In this Xcode 26.2 installation, Points of Interest is an instrument, not a
   listed template.
4. Record for each run. Filter Points of Interest by subsystem
   `com.liftwithstack.stack` and category `LiveActivityLatency`. In the detail
   view, group `LiveActivityStage` intervals by the `trace` UUID and read the
   stage name in the message. `LiveActivityMark` and `LiveActivityBridge` events
   carry the command UUID or revision needed to connect the RN and reconcile
   stages. Use Time Profiler to inspect expensive stacks within long intervals.
5. Record one warm tap each for increase weight, decrease weight, increase
   reps, and Done. Then record five and ten rapid increase-weight taps with
   approximately the same cadence. For each tap, capture queue wait, JS total,
   journal I/O, optimistic ActivityKit update, RN mutation, authoritative
   ActivityKit update, and intent-entry-to-authoritative-completion. Compare
   queue wait by tap order.
6. For the closest reproducible cold-host run, end the Xcode run, confirm the
   Live Activity still exists, wait until Stack and its widget extension are no
   longer running, then start an **All Processes** trace before tapping once.
   Note how the processes were stopped and whether iOS launched an app or
   extension. Discard the run if the activity disappeared or the tap did not
   execute. Repeat at least three times; iOS may choose different hosts.
7. Save the `.trace` in Instruments. Export with **File > Export** if sharing
   the trace, or use `xcrun xctrace export --input PATH.trace --toc` followed by
   an XPath export for the signpost table named in the table of contents. Keep
   the raw trace and record device model, iOS version, Xcode version, build
   configuration, tap cadence, and cold-host method.

Equivalent command-line capture after obtaining the device UDID:

```sh
xcrun xctrace record --device DEVICE_UDID --template 'Time Profiler' \
  --instrument 'Points of Interest' --all-processes \
  --output /tmp/stack-live-activity.trace
```

Start recording first, then perform the taps and stop with Ctrl-C. If the
instrument does not show the signposts, verify the Debug build is installed and
that the filter includes both the Stack app and widget extension processes.

## Measurement worksheet

All cells await a physical device run. Do not substitute simulator or mocked
native test durations for Lock Screen latency.

| Scenario | Intent start to optimistic update | Actor queue wait | JS | Journal | First `Activity.update` | RN mutation | Second `Activity.update` | Intent start to authoritative completion |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Warm, + weight | Awaiting device measurement | | | | | | | |
| Cold, + weight | Awaiting device measurement | | | | | | | |
| Warm, − weight | Awaiting device measurement | | | | | | | |
| Warm, + reps | Awaiting device measurement | | | | | | | |
| Warm, Done | Awaiting device measurement | | | | | | | |
| Five rapid + taps (each tap) | Awaiting device measurement | | | | | | | |
| Ten rapid + taps (each tap) | Awaiting device measurement | | | | | | | |

The first visible number uses `contentTransition('numericText')` with
`monospacedDigit()` in the Live Activity layout. Done also has an ActivityKit
update pulse. The code does not set an explicit transition duration. Record
screen video if perceived motion matters, but report that separately from the
signpost interval timings.

## Responsiveness optimization — 2026-10-02

**Physical performance acceptance remains incomplete.** Both paired phones
(Satwik's iPhone 14 Pro and Shashank's iPhone 17 Pro Max) were reported
`unavailable` by `xcrun devicectl list devices`. No physical before/after traces,
pixel timings, cold-host measurements, or Lock Screen timeout results exist for
this change. Test harness runtimes are not substitutes for those measurements.

Baseline: local `0dca599`, containing the existing latency profiler, one commit
ahead of fetched `origin/main` (`1f6483b`). Existing unrelated working-tree edits
were preserved. Baseline checks: 357 JS tests and all three native harnesses
passed.

### Findings and scope

Code inspection confirmed that every accepted authoritative reconciliation
called `Activity.update`, even if the preceding optimistic update had already
published identical content. This is proven redundant work, **not a measured
explanation of the reported delay**. The old revision check also read only
`_stackRevision`; replacing the cache with an authoritative snapshot erased
that floor because the snapshot carries `acknowledgedRevision` instead.

The patch now uses the maximum of those revision fields, including when a new
actor reads ActivityKit content after restart. After checking pending commands
and revision freshness, it skips the authoritative ActivityKit call only if:

- All payload fields except the two top-level revision fields match. This
  includes action targets, enabled controls, canonical values, units, increments,
  and next-set previews, not merely the displayed number.
- `staleDate` is unchanged.
- ActivityKit content already carries a revision at least as new as the incoming
  acknowledgement. A newer watermark still requires a write so it is not left
  only in the actor's memory.

The host acknowledgement still updates the in-memory snapshot. The optimistic
content's `_stackRevision` remains the recovery barrier after a skipped write.
The new `activityUpdateAuthoritativeSkipped` marker records this outcome; all
existing profiler intervals and markers remain. A completed trace without a
second update must be interpreted using this marker, not as a missing span.

### Interaction pipeline

Tap → serial executor → cached JavaScriptCore callback/layout evaluation →
serialization validation → durable atomic command journal → optimistic
`Activity.update` → host notification → ordered RN command drain → synchronous
SQLite/Zustand mutation → guarded authoritative reconciliation → either skip
identical content or update changed presentation/controls/acknowledgement.

The optimistic response still precedes the RN mutation. Journal-before-display
and one-command-at-a-time consumption are unchanged. The existing narrow
consume-before-SQLite-commit crash window remains; this change does not claim
exactly-once delivery. Batched destructive draining would widen that window and
has not been introduced.

The serial queue preserves accepted tap order. For 5/10 taps, callbacks see the
latest accumulated value and each accepted command is journaled before its
optimistic update. Matching final acknowledgements no longer add a second
ActivityKit call. This does **not** establish press priority over changed
reconciliations or eliminate waiting behind an in-flight ActivityKit update.

Done still immediately displays its existing next-set/pending feedback. Its
authoritative update restores controls and the next preview, so it is necessary
even when the visible number happens to match. Rejected actions still restore
the authoritative presentation.

Without physical profiling evidence, queue-priority redesign, native arithmetic,
prewarming, storage redesign, batch draining and numeric animation tuning remain
deferred as requested. No quantitative speedup or cold/warm difference is claimed.

### Physical before/after worksheet

| Scenario | Before | After |
| --- | --- | --- |
| Warm weight + / − | Not measured | Not measured |
| Cold weight + | Not measured | Not measured |
| Warm reps/time + | Not measured | Not measured |
| Five rapid taps, final response | Not measured | Not measured |
| Ten rapid taps, final response | Not measured | Not measured |
| Done | Not measured | Not measured |

Use the procedure above on both revisions with the same device, configuration,
workout and cadence. Capture each tap's queue wait, JS evaluation, journal I/O,
optimistic update, RN mutation, reconcile, second update or skip marker, and
intent-to-completion time. Save video separately for perceived response.

### Lock Screen awake test — pending

Run baseline (no taps), then taps every approximately 1, 3 and 5 seconds. Repeat
with Always-On enabled and disabled. Record separately the time until fully
illuminated → Always-On dimmed and display off; use “not observed” for a state
that never occurs. Control brightness, Low Power Mode and phone orientation,
and do not touch the screen outside the Live Activity controls during a run.

No observation yet establishes whether these taps reset the system's timeout.
Lock Screen illumination policy belongs to iOS; Stack has no supported Lock
Screen keep-awake control in this implementation. Apple's
[idle-timer property](https://developer.apple.com/documentation/uikit/uiapplication/isidletimerdisabled)
controls the app's idle timer and is not a documented Live Activity keep-awake
API. Do not interpret it as a solution for the locked system UI. No private API,
fake audio or background keep-alive workaround was added.

### Changed files and automated validation

- `patches/expo-widgets+57.0.20.patch`: production native revision floor and
  conservative identical-content skip, plus the new profiling marker. The
  installed `node_modules/expo-widgets/ios/Widgets/AppIntent.swift` is updated to
  match. A native rebuild is required.
- `tests/native/live-activity-ordering/TestSupport.swift`: 28 burst cases with
  5/10 taps, kg/lb, reps and duration; identical-update counts; warm/restarted
  revision barriers; newer watermark persistence; stale-date and behavioral
  changes; stale exercise targets; Done control restoration.
- `tests/workoutPersistence.test.cjs`: 12 real Expo callback/store/SQLite burst
  cases comparing the complete optimistic and authoritative payloads, plus two
  5/10-tap stale-queue cases after dynamic append and focus change.
- This document: findings, protocol, measurements still needed and device test
  procedure.

The native runtime and ordering harnesses use the actual Expo/JavaScriptCore
callbacks and production actor. ActivityKit itself is mocked for ordering tests.
The durable inbox harness still covers restart recovery, 1,000 concurrent
enqueues, unique IDs, per-command consumption and corrupt-storage rejection.

Final checks on the current shared workspace:

| Check | Result |
| --- | --- |
| `node --test tests/*.test.cjs` | 398 passed, 0 failed |
| `node tests/runLiveActivityNativeTests.cjs` | 3 harnesses passed, 0 failed; includes 28 new native burst cases |
| `npm run typecheck` | Passed |
| `npx eslint tests/workoutPersistence.test.cjs` | Passed |
| `git apply --reverse --check patches/expo-widgets+57.0.20.patch` | Passed; installed source matches persisted patch |
| `git diff --check` | Passed |
| Debug simulator build, Stack workspace/scheme, app and widget extension | BUILD SUCCEEDED |
| Physical latency and Lock Screen/AOD tests | Not run: devices unavailable |

The JS suite includes other ongoing workspace work; this task adds 14 JS tests.
Build command: `xcodebuild -workspace ios/Stack.xcworkspace -scheme Stack
-configuration Debug -destination 'platform=iOS Simulator,id=9854DE6F-4C15-4A60-9494-18649B4BF7DA'
CODE_SIGNING_ALLOWED=NO build`. This establishes native compilation, not a signed
device installation or physical rendering performance.

Git: changes are uncommitted on `main` (already one commit ahead of origin at
start). Only the four listed tracked files were edited for this task. Unrelated
sharing, configuration and film changes remain in the shared workspace.
