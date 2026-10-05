# Onboarding Slice 5: optional Stack program

Slice 5 is complete. The guided choice now connects Frequency and Program Preview end to end, and the same branch is available from Train and Your Splits. The development preview flag remains required; release and flag-off builds retain their existing onboarding and program controls. Existing workspace changes and ordinary app data were preserved. This checkpoint ends Slice 5; first-workout unit confirmation and final cutover remain later slices.

## Experience and design

Frequency asks **How many workouts should Stack plan each week?** with six tactile choices and no initial selection. **See my workouts** is disabled until a frequency is chosen. Selection immediately updates a compact, numbered workout arrangement in the existing textured orange workout material, with meaningful archetype colors and the Stack mark. Training days stay flexible; no experience or weekday question appears.

Preview asks **Your starting lineup.** and displays names, counts and expandable exercise lists read from the actual local templates. Expansion exposes exercise names and muscle descriptions; previewing never edits templates, advances rotation, activates a program or starts a workout. The existing variant rotation determines the first variant, and subsequent occurrences project the following variants without writing them.

| Workouts | Arrangement |
| --- | --- |
| 1 | Full body |
| 2 | Full body / Full body |
| 3 — Full body | Full body / Full body / Full body |
| 3 — Push / Pull / Legs | Push / Pull / Legs |
| 4 | Upper / Lower / Upper / Lower |
| 5 | Push / Pull / Legs / Upper / Lower |
| 6 | Push / Pull / Legs / Push / Pull / Legs |

Newly selecting three workouts defaults to Full body. Preview offers **Full body** (“Train your whole body in each workout.”) and **Push / Pull / Legs** (“Separate pushing lifts, pulling lifts, and legs into their own workouts.”). An explicit structure survives Back, reselecting the same frequency and relaunch; selecting three after another frequency starts with Full body again.

Bold Bricolage headings, Hanken copy, JetBrains step labels, existing workout surfaces and colored exercise markers carry the established Stack personality. The optional branch alone shows **1 of 2** and **2 of 2**. Targets are at least 44 points, descriptions wrap and scale fully, and display headings scale to 1.5×. At normal text sizes actions remain in a footer. At accessibility text sizes they join the scrollable content, avoiding an oversized pinned footer that consumed the viewport during initial review.

The branch uses the native navigation stack and an explicit Back control, including after a cold-restored draft with no preceding screen. Swipe Back is disabled within this branch so every return persists the correct draft step. The Train, Progress and Stack tabs are preserved.

| Action | Fresh setup | Later configuration |
| --- | --- | --- |
| **Use these workouts** | Persist the selected program and completed onboarding together, then enter Train. | Persist the selected program, then return to the originating Train/Your Splits destination. |
| **Decide later** / **Explore without a program** | Complete a no-program profile through the existing retryable entry boundary. | Clear only the configuration draft and return without changing the active profile. |
| Preview Back | Retain frequency and structure; return to Frequency. | Same. |
| Frequency Back | Retain choices; return to Starting Point. | Cancel configuration and preserve the active profile. |

The custom builder stays available inside the app. With the flag enabled, no-program Train's **Get workouts from Stack**, Your Splits' inactive Stack control, and **Edit program** open this branch without activation. Flag-off controls retain their previous behavior.

## Persistence and recovery

`acceptStackProgram(frequency, structure, context)` is the explicit persistence boundary. It validates the frequency and structure and commits `programWeeklyGoal`, `threeDayStructure`, Stack mode, null custom identity and onboarding completion in one SQLite profile upsert. State and navigation are published after that write succeeds. The action propagates failures, preserves the current session and saved routines, and is idempotent for an already accepted matching configuration.

Fresh acceptance uses empty name, zero independent weekly habit goal, flexible weekdays, kg and unconfirmed units. Later acceptance preserves profile identity, name, habit goal, weekdays, units, confirmation and weight preferences. No schema change was needed beyond Slice 2's additive migration.

Fresh setup keeps `stack-onboarding-draft-v1`. Later setup uses the independent `stack-program-configuration-v1` key. Both use the same validated, serialized storage implementation; queued writes cannot revive a cleared draft. Reset All Data clears both after a successful database reset. Later cancellation never changes the onboarding draft or live profile.

Draft and profile failures retain the current screen with **Try again**. Catalog failure shows **Try loading again** and disables acceptance until a complete lineup loads. Repeated taps join one attempt and cannot duplicate acceptance or navigation. Successful acceptance clears the relevant draft. If cleanup fails after a profile commits, the profile remains authoritative and the acceptance latch prevents repeating the write; a later configuration visit can retain the stale draft choices until they are cleared or accepted again.

An incoming shared-routine route keeps navigation ownership while an acceptance finishes. Returning to the completed setup screen exits it without another profile write. Full shared-routine handoff remains Slice 7 work.

## Validation

- **312 tests passed** across `onboardingCore`, `onboardingWelcome`, `workoutPersistence`, `adhocWorkoutUI`, `customSplitUI`, `settingsBehavior`, `splitSharingExperience` and `homeSlide`.
- **22 added cases**: 17 core program/draft/recovery/disclosure/adaptive-layout cases, three real SQLite cases, and two program discovery entry-point cases. Coverage includes all six frequencies, both three-day structures, Back, relaunch, missing catalogs, failed draft/profile writes, retry, repeated taps, later cancellation in none/Stack/custom modes, and incoming-route focus ownership.
- Real SQLite failure injection verifies completion stays unpublished when acceptance fails. Existing custom profiles retain schedules, an independent habit goal, pounds and confirmed units, saved routines and an active empty workout when accepting Stack's program.
- Real template checks exercise all seven arrangements against existing variants and catalog exercise IDs and observe no SQL writes or training history from previewing.
- `npm run typecheck`, ESLint on changed code and `git diff --check` passed.

### Isolated simulator review

Used a new isolated `com.liftwithstack.onboardingpreview5` container on the existing iPhone 17 Pro simulator, iOS 26.3. The ordinary app and earlier QA containers were untouched. The simulator's original `large` text category was restored after reviewing `accessibility-extra-large`.

1. Fresh Welcome → Starting Point → guided Frequency. The initial continuation was disabled; all six choices updated their arrangements immediately. [Unselected frequency](qa/onboarding-slice-5/frequency-unselected-normal.png), [six workouts](qa/onboarding-slice-5/frequency-six-normal.png).
2. Newly selected three showed actual Full Body A/B/C, each with six exercises. Switching to PPL showed Push A (six), Pull A (five) and Legs A (five). [Full body](qa/onboarding-slice-5/preview-full-body-normal.png), [PPL](qa/onboarding-slice-5/preview-ppl-normal.png).
3. Cold launch restored Preview with three/PPL; Back retained that arrangement, and another cold launch restored Frequency. [Large Preview](qa/onboarding-slice-5/preview-large-text.png), [large Frequency](qa/onboarding-slice-5/frequency-large-text.png), [restored draft evidence](qa/onboarding-slice-5/restored-preview-large.json).
4. Before acceptance there were **zero profiles, sessions, session exercises, sets and routines**. After accepting PPL there was exactly one completed Stack profile, an empty draft, and still zero workout/routine rows. [Before](qa/onboarding-slice-5/before-acceptance.json), [after](qa/onboarding-slice-5/accepted-onboarding.json), [Train](qa/onboarding-slice-5/accepted-train-normal.png).
5. Your Splits → Edit program → two-workout Preview → Explore returned to Your Splits with the original three/PPL profile unchanged. [Later preview](qa/onboarding-slice-5/later-preview.json), [cancelled state](qa/onboarding-slice-5/cancelled-later.json), [Your Splits](qa/onboarding-slice-5/cancelled-your-splits.png).
6. Chose Train without a program, returned to Train, opened **Get workouts from Stack**, and expanded the actual Full Body A exercise list. Preview retained no-program mode. Accepted one workout and returned to Train. [Exercise disclosure](qa/onboarding-slice-5/preview-exercises-normal.png), [before later acceptance](qa/onboarding-slice-5/train-preview.json), [after](qa/onboarding-slice-5/accepted-train-configuration.json).
7. Completed-user cold launch opened Train directly with the same accepted profile. [Relaunch evidence](qa/onboarding-slice-5/completed-relaunch.json), [Train](qa/onboarding-slice-5/completed-relaunch-train.png).

Comparisons across these native snapshots verified zero workout/routine creation throughout, exact profile equality before/after later cancellation, unchanged non-program fields after later acceptance, cleared drafts and an unchanged hash of every archetype-template row.

### Unverified before final cutover

Lower-viewport touch scrolling at accessibility text sizes remains unverified: simulator scroll/drag automation did not produce a reliable native swipe. Screenshots establish the reviewed initial viewport, and the adaptive action placement is covered by component behavior checks. Actual VoiceOver operation, narrow phones, maximum Dynamic Type, live category changes, Reduce Motion, Increase Contrast, reduced transparency, offline operation and physical-device behavior remain part of the final matrix.

Failure injection, all-mode cancellation and preservation of populated custom programs/sessions use behavioral and real SQLite tests; those failure/populated-profile cases were not injected into the iOS app. The isolated clone's existing missing widget/shared Live Activity warning was dismissed for review. The native integration was not changed.

## Next execution: Slice 6 only

Add the shared first-workout launch coordinator and compact weight-unit sheet. Confirm and persist the unit before creating the intended empty, Stack or custom session; cancellation and failed saves must create nothing, existing sessions must resume, and repeated starts must not duplicate sessions. Keep this development gate until Slice 7 integration passes.
