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
| RN and authoritative update | `rnMutationBegin`, `rnMutationEnd`, `rnReconcileRequested`, `rnPresentationDeriveBegin`/`End`, `rnAuthoritativeNativeCallBegin`/`End`, `reconcileDecodeAndRevision`, `reconcilePendingCheck`, `reconcileAccepted`/`Skipped`, `activityUpdateAuthoritative` |

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
