# Onboarding Slice 6: first-workout units

Slice 6 is complete. All user-created workout starts now pass through one launch coordinator. In the enabled development preview, an unconfirmed profile sees a compact native weight-unit sheet before its intended session is created. Cancellation, failed persistence, retry and existing-session races are covered. The preview flag remains; release and flag-off builds retain their current first-start behavior. Slice 7 and final cutover are not implemented in this execution.

Existing workspace changes, ordinary app data and earlier QA containers were preserved. No commit, push, publication, deployment, app submission, automation or backend change was performed.

## Sheet and launch behavior

The native `formSheet` asks **Which weight unit do you use?** and explains **Choose the default for your workouts and progress.** It offers **Kilograms · kg**, **Pounds · lb**, and **Start workout**. The current profile unit is selected initially; changing the choice alone writes nothing. Pounds retain the canonical stored value `lbs`; the compact `lb` UI label does not change serialization or logging units.

The sheet uses native sizing/dismissal, a grabber and explicit Cancel control. Bricolage headings, Hanken copy, warm Stack surfaces, an orange selected outline/check and orange action preserve the established design language. Targets are at least 44 points. Descriptions and action labels scale fully and wrap; the heading scales to 1.5×. Content is scrollable and capped to the available screen height for accessibility sizes. No additional fitness question appears.

| Condition | Result |
| --- | --- |
| Unconfirmed first start | Capture the intended workout; show the sheet without creating a session. |
| Choose a unit | Update only the pending choice. |
| Cancel, native dismissal or unmount | Drop the pending intent; create no session or workout timer. |
| Start workout | Commit the unit and confirmation first; recheck the latest session; create the captured workout only if none exists. |
| Failed unit write | Keep the sheet and choice; show **Try again**; retain the prior profile and zero sessions. |
| Failed session creation | Keep the captured intent and confirmed unit; show **Try again**. Retry uses the same workout and skips an already successful unit write. |
| Existing session before request, while the sheet is open, or after unit commit | Resume that session without replacing it. A resume discovered before unit commit writes no unit. |
| Already-confirmed profile | Start directly without a unit prompt. |
| Repeated/reentrant presses | Ignore competing attempts; create/navigate once. |
| Flag-off or orphaned unit-route link | Return to the app without displaying the questionnaire or creating a session. |

The existing logger, custom rotation, automatic queue, default sets and progression remain responsible for workout execution. Cancelling after a successful unit save but failed session creation retains the confirmed preference; a future attempt can start directly. Pending intents are transient and deliberately disappear on process restart. A saved confirmation survives relaunch.

## Shared coordinator and persistence

`features/workout-launch/coordinator.ts` owns acceptance, pending intent, selected unit, retry and the navigation latch. `store/workoutLaunch.ts` connects it to the live workout store. `navigateWorkoutLaunch()` sends all successful outcomes through the existing logger/resume route and replaces the sheet on confirmation.

The call-site audit covered `app`, `components`, `features` and `utils`:

- Train's empty hero, automatic hero, custom hero and alternate **Start Empty Workout** action now use the same coordinator.
- Saved routines and the custom builder save/activate a split and return to the library/Train; they do not directly create a session. Their next start therefore uses that same custom intent path.
- Workout-picker changes remain previews until a Start action. Invalid/empty custom days keep the existing edit/error behavior.
- The active-workout bar and Live Activity interactions already resume existing sessions; they remain resume paths and receive no unit prompt. Stack/Progress discovery actions navigate to Train rather than creating sessions.
- Legacy low-level store/database APIs, retroactive logging and restore remain available for their existing non-UI work. No other app/component/feature session-creation call site was found.

The intent owns copied archetypes, explicit Stack variants, custom split/workout IDs and optional presentation origin. Changes to a queue, picker or source object cannot retarget a pending sheet. The existing archetype start API accepts an optional validated variant list; ordinary callers still use the existing next-variant selector. No new workout-generation algorithm or cursor was added.

`confirmWorkoutWeightUnit()` validates `kg`/`lbs`, commits unit and `weightUnitConfirmed` in one profile upsert, and publishes state after success. It propagates failures rather than using the guarded profile setter. A matching already-confirmed preference returns without another SQL write. Profile identity, name, goals, schedule, program selection, weight increments, saved routines and training data are preserved. No additional database migration was needed.

The coordinator checks the latest session before requesting units, before persisting them and immediately before session creation. Its busy/navigation guards cover reentrant presses. Native removal is blocked during the synchronous acceptance boundary. Sheet cleanup cancels only the intent owned by that sheet and cannot clear a finished handoff or a later request.

Train resets its shared departure value and remounts only the source slide control when the sheet opens or an attempt fails. This restores the handle, text/surface opacity and tab-bar departure state while the sheet is present and after cancellation. Successful direct starts keep their tactile origin. Confirmation uses the ordinary logger entrance because the source handle has reset and its earlier geometry would be stale. Native simulation verified the sheet-to-logger transition.

Existing guarded start failures still emit their native **Couldn't save** alert. After it is dismissed, the sheet retains a more specific inline error and Retry. The coordinator creates no workout/rest/exercise timer; logging interactions retain their existing timer behavior.

## Validation

- **339 tests passed** across `workoutLaunch`, `onboardingCore`, `onboardingWelcome`, `workoutPersistence`, `adhocWorkoutUI`, `customSplitUI`, `settingsBehavior`, `splitSharingExperience` and `homeSlide`.
- **27 added cases**: 17 coordinator/navigation cases, four screen/entry cases and six real SQLite cases. They cover all origins, explicit/native cancellation, unmount, failed unit and session writes, Retry, duplicate/reentrant presses, captured variants/IDs, both existing-session race boundaries, confirmed-user skips, unconfirmed resumes, relaunch, unit validation, native removal guards and release/orphan route handling.
- Real SQLite triggers prove failed unit writes retain the entire profile and create no training rows. Failed session insertion rolls back sessions, exercises and sets while retaining the already committed unit; retry creates exactly one correct session. Tests verify pounds in new exercise snapshots, explicit merged-workout variants, custom IDs, unchanged non-unit metadata and saved routine retention.
- Real SQLite race cases create an arriving empty session before confirmation or after unit commit and verify it is resumed intact instead of being replaced by the intended custom workout.
- `npm run typecheck`, ESLint on changed code and `git diff --check` passed.

### Isolated simulator evidence

Reviewed the existing iPhone 17 Pro simulator on iOS 26.3 in three new isolated containers. Fresh onboarding and the existing custom builder created their profiles/routines through the real UI. No ordinary app container was reset or edited. The simulator's original `large` text category was restored after `accessibility-extra-large` review.

| Origin | Bundle | Before confirmation | Accepted workout |
| --- | --- | --- | --- |
| Empty | `com.liftwithstack.onboardingpreview6empty` | [Zero sessions and unconfirmed kg](qa/onboarding-slice-6/empty-before-confirmation.json) | [One ad hoc session, confirmed lbs](qa/onboarding-slice-6/empty-launched.json), [logger](qa/onboarding-slice-6/empty-workout-launched.png) |
| Stack | `com.liftwithstack.onboardingpreview6stack` | [Active three/Full body program; zero sessions](qa/onboarding-slice-6/stack-before-confirmation.json) | [Full Body A, six exercises, 18 planned sets in kg](qa/onboarding-slice-6/stack-launched.json), [logger](qa/onboarding-slice-6/stack-workout-launched.png) |
| Custom | `com.liftwithstack.onboardingpreview6custom` | [One saved active routine; zero sessions](qa/onboarding-slice-6/custom-before-confirmation.json) | [Same split/workout IDs, Bench Press and three planned sets in lbs](qa/onboarding-slice-6/custom-launched.json), [logger](qa/onboarding-slice-6/custom-workout-launched.png) |

Normal native sheet review: [empty](qa/onboarding-slice-6/unit-sheet-normal.png), [Stack](qa/onboarding-slice-6/stack-unit-sheet.png), [custom](qa/onboarding-slice-6/custom-unit-sheet.png). [Accessibility text size](qa/onboarding-slice-6/unit-sheet-large-text.png) shows the expanded scrollable sheet and reviewed initial viewport.

The empty path exercised explicit cancellation after choosing pounds, native grabber dismissal, and a subsequent fresh attempt. [Cancelled evidence](qa/onboarding-slice-6/empty-cancelled.json) retains the exact original profile and zero training rows. Stack's alternate empty-workout action also opened the same sheet; cancelling it retained the intended Full body hero before the actual automatic start.

Temporary failure triggers were added **only** to the isolated empty-workout database:

1. A unit-save failure kept kg/unconfirmed and zero sessions, exercises and sets. [Evidence](qa/onboarding-slice-6/empty-unit-save-failed.json), [Retry](qa/onboarding-slice-6/unit-save-retry.png).
2. After removing that trigger, a session-start failure saved lbs/confirmed but retained zero training rows and the pending empty intent. [Evidence](qa/onboarding-slice-6/empty-start-failed.json), [Retry after the existing native alert](qa/onboarding-slice-6/workout-start-retry.png).
3. Removing the session trigger and retrying opened the empty logger exactly once. Both triggers were removed afterward.

Cold relaunch and Resume retained the same confirmed profile and session ID: [evidence](qa/onboarding-slice-6/empty-confirmed-relaunch-resume.json). Discarding that disposable empty QA session through the normal logger control, then starting again, opened the logger directly without units; its new ID was 2 and only one session remained: [evidence](qa/onboarding-slice-6/confirmed-new-start.json), [logger](qa/onboarding-slice-6/confirmed-new-start.png).

For the unconfirmed-resume case, the stopped isolated Stack QA profile's confirmation flag was deliberately set back to false while preserving its existing session. Cold launch → Resume opened the same Full Body A logger without a sheet or unit write: [evidence](qa/onboarding-slice-6/unconfirmed-existing-resume.json). This was a controlled QA fixture, not a migration or a change to ordinary user data.

Comparisons verify unchanged archetype templates across all snapshots, exact profiles through cancellation/failed unit writes, correct kg/lbs exercise snapshots after acceptance, stable custom identities, and no duplicate session creation. No completed session or completed set was generated in these checks.

### Outstanding checks

Both paired physical devices currently report **unavailable** via `devicectl`; no physical-device check was performed. Actual VoiceOver operation, narrow phones, maximum Dynamic Type, live category changes, Reduce Motion, Increase Contrast, reduced transparency and offline operation remain outstanding before final cutover.

At accessibility-extra-large, the sheet expands and lower content needs scrolling. Its text wraps and the actions remain exposed in the accessibility tree, but manual lower-viewport touch scrolling remains unverified because of the previously recorded simulator gesture-automation limitation. Native grabber dismissal and the explicit Cancel control were verified; a hand-driven swipe dismissal was not.

Incoming-session races and merged-variant preservation use behavioral/real SQLite tests rather than concurrent actions in the native simulator. All three native first starts, empty-path failure/retry and confirmed/unconfirmed resume skips were exercised. Existing-profile migration and populated-history preservation retain the earlier real SQLite coverage. Physical Live Activities remain unverified. Existing widget warnings and the intentionally induced development error banner were dismissed for screenshots; their native integration was not changed.

## Next execution: Slice 7 only

Finish Progress/Stack discovery and contextual help, preserve shared-routine handoffs, safely retire old onboarding routes, and run the complete first-run/accessibility matrix. Only then remove the temporary flag and enable the replacement flow by default, including this first-workout coordinator. This checkpoint ends Slice 6 without starting that cutover.
