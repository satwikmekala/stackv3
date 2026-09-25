# Slice 3: read-only workout Live Activity synchronization

Implemented in the `live-actitivity` worktree. Slice 4 actions are not implemented. The minus, plus, and Done controls remain display-only.

## Source of truth and synchronization

`app/_layout.tsx` mounts one subscription through `services/liveActivity/sync.ios.ts`. Android and web use the no-op `sync.ts` module and never load the native layout/factories through this path. Supported iOS builds subscribe to the existing Zustand workout store and app foreground events. There is no polling and no widget code in workout input components.

The subscription waits for successful SQLite hydration. It derives a serializable payload using `deriveWorkoutLiveActivityState()` and sends it to the coordinator. It never treats the initial empty, unhydrated store or a hydration error as a discarded session.

The workout screen's exercise selection now lives in `workoutStore.workoutFocus`, a session-keyed index, rather than component-local React state. This is only a selection pointer; the workout, exercise, and set records still live exclusively in `currentSession`. Start and hydration initialize the pointer using the existing `getInitialExerciseIndex()` rule. Navigation changes the pointer through `setWorkoutExerciseIndex()`. Set completion, skip, swap, bonus logging, and exercise advancement still use the existing actions and handlers.

The active set uses the same shared `getActiveSetIndex()` as the screen: first set with `!completed`, otherwise the last set. Skipped sets already have `completed: true` in Stack. In particular, skipping a final set does not independently advance the exercise; the existing screen action determines that.

`workoutId` is the real session ID. Session exercises do not expose SQLite catalog IDs, and existing lookup/swap/history logic keys them by name. `exerciseId` therefore uses that existing name key, not a fabricated database ID. Full names in domain/history data remain untouched.

## Values and edge cases

- Weight comes from the active set's `weight`, formatted using the same `formatWeight()` used by `ActiveSetCard`. Unit labels come from `unitLabel()`, including Stack's existing `lbs` spelling. Conversion remains outside the widget.
- Reps come directly from the active set's `reps`. Suggested values already present on the set are used as-is; `targetWeight`/`targetReps` are not substituted for missing actual values.
- Bodyweight exercises hide weight in the workout UI. The unchanged Live Activity weight slot shows `—` with an empty unit instead of presenting a fabricated `0 kg`. Missing/nonfinite values also show `—`; real zero values remain zero.
- All sets completed is not the same as the session being finished. While feedback/finisher is open, the activity retains the selected exercise's final committed set. It ends after successful `completeWorkout()`, `discardWorkout()`, or a data reset clears the session.
- Uncommitted keyboard edits and unlogged bonus-set drafts remain screen-local. Only committed workout state is synchronized. A logged bonus set enters the normal session data and updates the activity.
- Selection is shared for the current app process, including when minimized. After a process restart, the original persisted resume rule selects the first incomplete exercise (or last exercise when all are complete); no second persisted navigation/progression model was added.
- Compact names are centralized in `compactExerciseName.ts`, with all requested mappings, case/whitespace normalization, equipment-prefix removal for unknown names, and a Unicode-safe 14-character fallback with ellipsis. The approved compact layout still handles available-width truncation.

## Lifecycle, duplicates, and recovery

The production factory is named `StackWorkoutLiveActivity`; the fake factory retains `StackTestLiveActivity` so old test instances remain discoverable. All real start/update/end operations go through `coordinator.ts`.

The coordinator serializes native operations and coalesces pending changes to the latest payload. One microtask also combines the normal same-event set-completion/exercise-navigation changes. An identical serialized payload causes no native update. It discovers activities before reconciling, keeps one existing instance, and ends duplicates before updating or starting. A queued cancellation prevents a stale pending start, and native errors never roll back or block workout mutations.

On launch after hydration, and whenever the app returns to the foreground, it discovers existing real instances. If one exists, it adopts it; if none exists and a workout is active, it starts one. Expo Widgets exposes activity IDs but no content readback. After a new JavaScript process starts, the adopted activity receives one authoritative update; subsequent identical payloads are deduplicated. Foreground checks in the same process also skip updates when the acknowledged ID/payload are unchanged. If there is no current session, remaining real instances are ended immediately.

Local starts are deferred until foreground execution; existing instances can update/end during background execution. These are [ActivityKit execution rules](https://developer.apple.com/documentation/activitykit/activity). No background timer, push service, or polling was added. While the app is terminated, there is no JavaScript execution; recovery reconciles the persisted workout when it opens again.

The coordinator ends fake activities before serving a real workout. Fake starts synchronously check hydration, the real session, and real native instances. The test End button only ends the fake factory's instances. Unmounting the root subscription does not end an active workout.

## Approved UI

The Slice 2 layout moved intact into `components/live-activity/WorkoutLiveActivityLayout.tsx`, shared by real and test factories. Types now accept preformatted weight strings. The only visual adjustment is the permitted dynamic-number scaling floor: `0.7` to `0.5`. Native testing exposed truncation of `110.2 lbs`; the corrected expanded Island displays the complete number. Spacing, font sizes, logo, circle, custom checkmark, progress geometry, and the approved upward offset remain unchanged.

## Files changed for this slice

| File | Purpose |
| --- | --- |
| `app/_layout.tsx` | Mount one synchronization subscription. |
| `app/workout.tsx` | Use shared selection and active-set helpers; preserve existing progression handlers. |
| `components/ActiveWorkoutCard.tsx` | Keep the minimized/resume card on that same selected exercise. |
| `store/workoutStore.ts` | Own the session-keyed exercise selection; initialize/reset it at lifecycle boundaries. |
| `utils/workoutResume.ts` | Shared current-exercise and active-set derivation. |
| `services/liveActivity/state.ts` | Serializable payload and pure source-state derivation. |
| `services/liveActivity/compactExerciseName.ts` | Central compact-name mapping/fallback. |
| `services/liveActivity/coordinator.ts` | Serialized start/update/end, recovery and payload deduplication. |
| `services/liveActivity/factories.ios.ts` | Separate real and test native factories. |
| `services/liveActivity/sync.ios.ts`, `sync.ts` | iOS subscriptions/platform guards and non-iOS no-op. |
| `components/live-activity/WorkoutLiveActivityLayout.tsx` | Shared approved layout and dynamic numeric scaling. |
| `components/dev/StackTestLiveActivity.tsx` | Retain fake factory identity with shared layout. |
| `components/dev/TestLiveActivityControls.ios.tsx`, `.tsx` | Protected iOS-only test controls and non-iOS no-op. |
| `tests/workoutLiveActivity.test.cjs` | Derivation, names, lifecycle, races, failures, hydration, foreground recovery. |
| `tests/workoutPersistence.test.cjs` | Real SQLite/store checks for selection and display derivation. |
| `docs/live-activity-slice-3.md` | Implementation decisions, verification and device QA. |

## Verification performed

- `npm run typecheck` passes.
- New service/layout/dev files, root integration, and shared helpers pass ESLint. The workout screen retains pre-existing `react-hooks/refs` and `react-hooks/set-state-in-effect` findings in its animation code; the store retains existing duplicate-import warnings. No unrelated animation refactor was included.
- `node --test tests/workoutLiveActivity.test.cjs tests/workoutPersistence.test.cjs`: 24 passing tests, including real SQLite writes/progression, selection, units, deduplication, recovery, cancellation during in-flight updates, and cancellation during fake-activity cleanup.
- Native iOS 26.3 simulator: automatic start showed Bench Press, set 1/3, 47.5 kg, 8 reps; app edits updated the expanded Island to 110.2 lbs and 9 reps; process termination/relaunch restored the active workout; completing set 1 displayed set 2/3, 115.2 lbs, 8 reps; completing Bench Press advanced to Overhead Press and compact 1/3; discarding the temporary QA workout removed the activity. The simulator unit preference was restored to kg.
- Physical-device QA is pending: both paired iPhones reported unavailable to `xcrun devicectl list devices`. Simulator checks are not presented as physical iPhone verification. Finish/save and native no-session stale cleanup are covered by automated tests, not claimed as physically exercised.

## Exact physical iPhone QA

Use an installed native Stack development build containing the existing widget extension. Connect the iPhone, enable Stack Live Activities, and use a disposable workout session. Start with no real active workout; fake test controls must not be needed.

1. Start a real workout in Stack. Lock the phone: exactly one workout Live Activity appears automatically.
2. Compare full exercise name, set number/total, weight, reps, and unit against the in-app active card. Check compact name/count and long-press for the expanded layout.
3. Increment/decrement and manually commit weight in Stack. Reopen the Lock Screen and expanded Island: the committed formatted number matches.
4. Change reps in Stack. Verify both presentations update to the committed reps.
5. Toggle kg → lbs → kg while the workout is active. Compare the exact converted display values and labels. Include a decimal pound value such as 110.2 to check scaling.
6. Log a set in Stack. Verify the next set number and that set's actual suggested/current weight and reps, including Increase Between Sets behavior.
7. Log the exercise's final set. Verify the next exercise, set 1/total, current values, and compact short name all change together.
8. Use Change/Up next to select another exercise with earlier incomplete exercises remaining. Verify the Live Activity follows the selected exercise, not simply the first incomplete exercise in the session.
9. Reopen a completed set for editing and skip a set. Verify the same active-set behavior as the workout screen; skipping a final set must not independently change the app's progression.
10. Check a bodyweight exercise: the activity shows no fabricated numeric weight, and reps match. Check a long/custom name for safe truncation. A bonus draft should appear only after it is logged to the real session.
11. Background Stack. Verify the activity remains visible. Reopen it repeatedly: there is still only one real activity and current values remain correct.
12. Force-quit Stack with an incomplete workout, then reopen it. Confirm the persisted workout resumes at Stack's existing first-incomplete position and the existing Live Activity is recovered/updated without another visible copy.
13. Dismiss the activity manually while keeping the workout active. Foreground Stack: it discovers no instance and starts one replacement. Repeat with a new workout after ending the previous one.
14. Complete the entire workout. Before choosing feedback, verify it remains an active session. Submit feedback to finish/save: the Live Activity disappears.
15. Start another disposable workout and discard it. Confirm both the workout and Live Activity disappear. Reopen Stack with no active workout: no stale real activity remains.
16. In development settings, verify fake Start is disabled during a real workout. With no real session, start a fake activity, then start a real workout: the fake disappears and only the real activity remains. Test End must not end a real activity.
17. Compare Lock Screen, compact, and expanded layouts against the approved Slice 2 references. Confirm the minus, plus, and Done elements perform no workout mutations. Restore any unit preference changed for QA.
