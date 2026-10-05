# Onboarding Slice 4: core entry paths

Slice 4 is complete. Welcome and Starting Point now lead into a genuinely persisted no-program profile for tracking and exploration. The optional program branch remains an informational preview. The development flag remains required; release builds retain production onboarding. Existing workspace changes and ordinary app data were preserved. No commit, push, deployment, publication, app submission or automation was performed.

## Flow and design

With `__DEV__` and `EXPO_PUBLIC_ONBOARDING_PREVIEW=1`, fresh app entry opens `/onboarding-preview`, which restores the saved draft step. Release or flag-off entry continues to the existing onboarding. Completed profiles enter the current Train, Progress and Stack tabs directly. The preview route's parent layout gates every nested screen, and Welcome's scene runtime loads lazily inside that gate.

| Action | Result |
| --- | --- |
| Welcome **Get started** | Save the draft step and open Starting Point. No profile completion. |
| Welcome **Explore first** | Save a no-program profile and enter Train. |
| Starting Point **Track my workouts** | Save a no-program profile and enter Train. No workout starts. |
| Starting Point **Explore first** | Save a no-program profile and enter Train. |
| Starting Point **Get workouts from Stack** | Save only a draft choice and open a preview notice. No profile completion or program activation. |
| Back | Return to Welcome, retaining draft choice, frequency and structure. |

Starting Point uses **How would you like to start?** with two direct-action tactile surfaces and no preselected answer. The tracking surface previews a logged lift in the existing warm orange workout material. Stack's surface previews three named workouts with meaningful muscle colors in a blue workout material. Explanations are one sentence each. The normal-size composition retains generous bold typography, branded content and material depth; navigation stays in the native stack header.

A cold-restored Starting Point has no preceding native screen. Its Back control persists Welcome as the destination and uses `dismissTo`, returning to an existing Welcome when available and creating it when necessary. Native swipe Back remains available when the local stack has an earlier screen and saving is idle.

At accessibility text sizes, decorative choice previews are omitted so choice labels earn the available space. Display labels scale up to 1.5× with explicitly scaled line heights; descriptions scale fully and wrap. Explore remains in a persistent footer. Welcome's existing first-frame actions, motion lifecycle, example-only content and static fallback remain intact. No name, experience, weekday or mandatory custom-builder question was added to the new flow. Legacy production screens remain until final cutover.

## Persistence and recovery

`stack-onboarding-draft-v1` stores step, starting choice, frequency and three-day structure in AsyncStorage, independently from the live profile. Frequency defaults to unselected; structure defaults to Full body. Reads and writes are serialized and validated. Failed reads preserve stored content and offer Retry. Failed writes preserve the prior durable draft and keep the current screen. Back changes only the step. Relaunch restores the draft; until Slice 5, optional-branch draft steps return to Starting Point without losing frequency or structure.

`completeNoProgramOnboarding()` is a new explicit acceptance boundary. It propagates write failures instead of using the older guarded setter that swallows them. Its single SQLite profile upsert must commit before completion is published or navigation happens. Already-completed users return their existing profile without a write.

Fresh tracking/exploration defaults are empty name, zero weekly habit goal, flexible weekdays, `none` mode, null custom identity, inactive three-workout/Full body preferences, kg and unconfirmed units. Entry creates no session, sets, routine or earned piece. Saved routines and existing training data are untouched.

The entry coordinator joins repeated taps into one attempt, navigates once after success, and allows retry after failure. The same screen exposes **Try again** with the original intended action. Setup does not take navigation away from an incoming shared-routine route while a save finishes; returning to completed setup redirects into the app without a second profile write. Existing import payload routing and saved-routine data remain intact. The first-run destination used after import respects the development gate.

Draft cleanup follows successful completion. If AsyncStorage cleanup fails after the SQLite profile commits, the accepted profile remains authoritative, entry proceeds, and the next completed-profile hydration retries cleanup. Cleanup failure cannot invite duplicate acceptance. Reset All Data clears the draft after a successful database reset and drains queued draft writes; a rejected reset preserves it. Full shared-routine acceptance/handoff remains Slice 7 work.

The touched legacy splash uses stable lazy state for its Animated values, resolving the existing changed-file refs lint errors without changing its animation. The development flow bypasses that legacy splash sequence; actions do not wait for an introductory animation.

## Checkpoint validation

- **290 tests passed** across `onboardingCore`, `onboardingWelcome`, `workoutPersistence`, `adhocWorkoutUI`, `customSplitUI`, `settingsBehavior`, `splitSharingExperience` and `homeSlide`.
- **19 new cases**: 17 core draft/entry/UI checks and two real SQLite acceptance checks. Coverage includes all core choices, guided preview, Back, relaunch, valid/invalid draft restoration, queued-write cleanup, Reset success/failure, failed saves and Retry, repeated taps, completed-profile preservation, and a shared-routine navigation interruption.
- SQLite failure injection proves a rejected profile upsert leaves completion unpublished and the profile absent. Retry persists the exact defaults, retains a previously saved routine, and leaves all workout tables empty. Completed none/Stack/custom profiles retain their preferences and selection without a write.
- Release-gate coverage verifies the new first-run route is available only in an explicitly enabled development build.
- `npm run typecheck`, ESLint on changed code, and `git diff --check` passed.

### Isolated simulator evidence

Reviewed the existing iPhone 17 Pro simulator on iOS 26.3 at normal `large` and `accessibility-extra-large` text categories. Three fresh isolated app containers exercised the real paths; the earlier Slice 3 QA container and the user's ordinary app container were untouched.

| Case | Isolated bundle | Evidence |
| --- | --- | --- |
| Welcome exploration | `com.liftwithstack.onboardingpreview4explore` | [Saved profile and zero-session counts](qa/onboarding-slice-4/welcome-explore-entry.json), [Train](qa/onboarding-slice-4/welcome-explore-train.png) |
| Starting Point tracking | `com.liftwithstack.onboardingpreview4` | [Saved profile and zero-session counts](qa/onboarding-slice-4/tracking-entry.json), [Train at large text](qa/onboarding-slice-4/tracking-train-large.png) |
| Starting Point exploration | `com.liftwithstack.onboardingpreview4start` | [Saved profile and zero-session counts](qa/onboarding-slice-4/starting-point-explore-entry.json), [Train](qa/onboarding-slice-4/starting-point-explore-train.png) |

Each entry produced exactly one completed profile and **zero sessions, session exercises, sets and custom splits**, with the onboarding draft cleared. [Completed-user cold relaunch](qa/onboarding-slice-4/completed-user-relaunch.json) retained the same defaults and zero-session state and opened Train directly.

Before acceptance, the real guided choice left the database entirely empty and stored only `starting-point`/`stack`: [preview-only evidence](qa/onboarding-slice-4/guided-preview-only.json). Cold relaunch restored Starting Point. Back returned to Welcome and retained the guided choice: [Back evidence](qa/onboarding-slice-4/back-retains-choice.json).

Visual review: [Welcome normal](qa/onboarding-slice-4/welcome-normal.png), [Starting Point normal](qa/onboarding-slice-4/starting-point-normal.png), [Welcome large](qa/onboarding-slice-4/welcome-large.png), [Starting Point large](qa/onboarding-slice-4/starting-point-large.png). The simulator was restored to its original `large` text category.

### Remaining native checks

Large content extends below the initial viewport and requires scrolling. Lower-viewport touch scrolling, native swipe Back, actual VoiceOver operation, narrow phones, maximum Dynamic Type, live text-category changes, Reduce Motion, Increase Contrast, reduced transparency, offline operation and physical-device behavior remain unverified. The earlier simulator gesture-automation limitation remains; no claim of manual touch-scroll verification is made. Large-text screenshots were taken after cold remounting.

The development launcher sends a preview URL immediately after launch. This can temporarily expose two Welcome instances in the accessibility tree when ordinary flagged startup also opens Welcome. The path checks used a subsequent plain cold launch; repeated preview-link accessibility behavior remains a development-only review limitation. Release preview routes remain gated. The isolated app's existing widget/shared Live Activity warning was dismissed for screenshots; its native integration was not changed.

Failed-write, Reset and incoming-link interruption checks use focused behavioral/SQLite tests; these failure cases were not injected into the iOS app. Existing Stack/custom preservation is verified in real SQLite tests rather than on a physical device. These limits remain part of the final integration matrix.

## Next execution: Slice 5 only

Connect Program Frequency and Program Preview using the existing 1–6 arrangements and exercise templates, including the explicit three-day Full body/PPL choice. Program acceptance must persist configuration and completion together; preview/cancellation must leave the live program unchanged. Reuse the branch from Train and Your Splits. Keep the temporary release gate and the recorded native/accessibility limitations until final integration passes.
