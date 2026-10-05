# Onboarding Slice 7: discovery and handoffs — cutover deferred

Slice 7's discovery and shared-routine work is implemented and reviewable in the development preview. **Slice 7 is partial: the replacement onboarding has not become the default.** Actual VoiceOver, physical-device use, complete maximum-size touch scrolling, and actual network-disconnected operation are not verified. The resumed simulator review repaired additional live-text and surface-layering issues. All temporary simulator accessibility settings are now restored. Native Files selection and touch scrolling remain blocked by the computer-use interface; the physical phone could not connect.

The temporary `__DEV__ && EXPO_PUBLIC_ONBOARDING_PREVIEW === '1'` flag remains. Release and flag-off builds retain the legacy first-run flow and automatic Stack introduction. No declaration of final cutover or completion of all seven slices is intended.

The user's request controls scope and authorization. `Stack_Design_Rules_2026.docx` supplied the visual reference: existing Stack geometry, warm surfaces, muscle colors and Bricolage/Hanken/JetBrains typography. Existing workspace changes and ordinary app data were preserved. No commit, push, publication, deployment, app submission, automation, new backend, telemetry system or workout-generation algorithm was added.

## Delivered behavior

### Discovery

- Progress's lift-history empty state uses the Stack mark, a chest-colored tactile surface, **Make your next workout count.**, an explanation of logged-set value and **Go to Train**. Existing watched lifts and weekly controls remain available.
- The preview Stack tab shows **Your Stack starts here**, an empty base and a blue **Built by you.** surface explaining pieces, muscle colors and gold record seams. **Go to Train** and optional **See an example** provide concrete next steps.
- Only the existing saved-history derivation determines whether an earned Stack exists. When it does, the existing Monolith renderer remains responsible for displaying it.
- The example route uses existing vector Stack geometry and illustrative IDs. It explicitly says **EXAMPLE ONLY** and explains that it adds nothing to workouts, records or the real Stack. Accessible text describes the illustrative weeks and muscles.
- **How your Stack grows** opens the retained four-page introduction deliberately from empty/earned Stack and Settings → Help & About. It can reopen after previously being seen, then return to its caller. It is no longer automatic in the enabled preview.
- Empty names now receive **Good morning / afternoon / evening**. Named greetings retain the existing behavior. No automatic name, goal, weekday or watched-lift prompts were introduced.
- Progress/history completion destinations use **Go to Train** consistently.

### Shared routines

A separately persisted handoff owns the valid shared token and, after a successful save, the imported split identity. It is independent of onboarding and program drafts. Back, draft cleanup and cold relaunch retain the context; successful setup returns to the pending routine instead of losing it in Train.

After onboarding, a saved routine offers **Use this routine**, **View split**, and **Save for later**. Saving alone does not activate it. Use validates the existing split, commits program mode and identity, then publishes the profile; it does not create a workout. Save for later leaves the current program alone and opens Your Splits.

The importer keeps its committed result if subsequent context persistence fails, so Continue retries the handoff without importing again in that visit. The durable identity survives relaunch after the handoff write succeeds.

The resumed review identified and repaired the earlier crash boundary between SQLite import and the AsyncStorage saved-ID write. Before import, the preview persists a UUID for that import attempt. The routine graph and its recovery receipt then commit in **one SQLite transaction**. If the saved-ID write never happens, a cold reload/retry with the durable attempt retrieves the same graph. Payload binding rejects reuse of an attempt for different content. Clearing the handoff gives a later deliberate import a new attempt, so independent repeated imports remain supported; flag-off imports keep their existing independent behavior.

The private receipt table is part of the same additive schema-22 work. Idempotent schema bootstrap installs it on already-migrated development containers without rewriting their program fields. It uses no AUTOINCREMENT counter, stays out of training backups, cascades when its routine is deleted, and clears inside reset/restore transactions. Existing strict schema-21 validation/upgrade and schema-22 backup formats remain unchanged. A failed restore rolls back receipt cleanup along with the training restore. The repair does not guess which historical routine belongs to a handoff that lost its result before attempt receipts existed.

Storage reads/writes/removals serialize. A stale link exit cannot clear a newer incoming token. Failed reads block setup acceptance; failed writes/removals retain the last durable context and expose retry through the current action. Repeated taps cannot repeat import or navigate twice. Focus guards prevent an older screen from replacing a newer incoming route.

Reset All Data and successful backup restore clear transient onboarding, program, custom-builder and shared handoff drafts. The handoff is not included as training data in backups.

### Routing and text-size repair

Retired onboarding routes conditionally redirect to the preserved preview draft for fresh users or the app for completed users. Their original five-screen flow remains available with the flag off. Completed preview startup resolves a stored shared handoff before entering the app.

Native QA found that a live Dynamic Type change could leave old native paragraph heights, clipping Welcome actions and program content. Font-scale keys now refresh the affected native layout containers without resetting the owning draft, pending workout intent or workout disclosure state. Welcome's animated scene remains mounted, so this repair does not replay its once-per-visit sequence. Equivalent layout refreshes cover Starting Point, frequency arrangements, the unit sheet and new discovery/example/shared surfaces. The resumed review also repaired Train’s greeting, hero identity/status and action text. Native child containers remeasure without remounting the launch coordinator or slide commit latch. At very large text sizes the alternative Start button omits decorative icons to leave space for its wrapping label. The secondary entrance animation remains mounted.

The existing disclosure test now switches scale while the exercise list is expanded and verifies that it stays expanded without changing templates or selection. Native program QA also retained the selected PPL structure and expanded Push A across a live maximum-size change. At that size, content requires scrolling; the existing scroll offset may leave the top heading above the viewport. Complete lower-screen touch review remains unverified.

## Automated validation

- Final full workspace regression after the source repairs: **641 passed, 0 failed, 0 skipped** (`node --test tests/*.test.cjs`).
- Type checking, ESLint on the changed code/tests, and `git diff --check` passed after the final source changes.
- Added live-text launch coverage verifies that unit selection and the captured custom workout survive scale changes, cancellation creates no workout, and refreshing the alternative Start button cannot commit twice.
- Discovery has 15 cases covering saved-history ownership, sample isolation, durable context/relaunch, unread storage, writes/removals and retry, stale-link ownership, serialized Reset, invalid context handling, import tap locks, retained import identity after context failure, activation failure/retry, Save for later, flag-off import actions, retired routes and Help routing.
- Receipt coverage additionally verifies cold database/state reload with a committed import and missing handoff result, transaction rollback on receipt failure, payload mismatch, independent copies, schema-22 bootstrap, deletion, reset, and schema-21/22 restore cleanup/rollback.
- Real SQLite sharing coverage verifies that importing before setup is dormant, activation requires a completed profile, a failed activation leaves database and store snapshots intact, successful activation retains other profile fields and any current session, and a missing routine cannot activate.
- Existing migration, backup, program, launch, active-workout, history/records and settings regressions all passed in the full run. Two stale baseline harnesses were corrected: build geometry now matches the existing iOS development-rendering capability; personal-record tests resolve the already-present muscle-color module. Their production implementations were not changed for those harness repairs.

Machine-readable results: [validation results](qa/onboarding-slice-7/validation-results.json).

## Native review and evidence

All native training checks used new isolated app containers. No ordinary container or earlier QA container was reset.

| Container | Device | Observed result |
| --- | --- | --- |
| `com.liftwithstack.onboardingpreview7` | Existing iPhone 17 Pro, iOS 26.3 | Explore setup, unnamed greeting, Progress/Stack discovery and read-only example. |
| `com.liftwithstack.onboardingpreview7narrow` | Disposable iPhone SE 3rd generation, iOS 26.3; 375 × 667 points | Welcome normal/max/live text, static scene under Reduce Motion, contrast/transparency review, Back/cold draft restore, all six frequency previews, both three-day structures and expanded exercise list. |
| `com.liftwithstack.onboardingpreview7shared` | Existing iPhone 17 Pro | Shared import before setup, Back/relaunch, return to saved identity, failed activation/retry, optional Help completion/reopen/skip and completed-user retired-route redirect. |
| `com.liftwithstack.onboardingpreview7backup` | Existing iPhone 17 Pro | Fresh shared setup through three-day Full body acceptance, then Save for later; Stack stays active, one saved routine and zero sessions. Native Restore opens Files; file selection remains unverified. A later receipt recovery exercise retains two deliberate saved copies and zero sessions. |
| `com.liftwithstack.onboardingpreview7offline` | Existing iPhone 17 Pro | Embedded-bundle startup, Explore → units → empty workout → add/log exercise → finish → summary → earned Stack, without Metro. |

Visual evidence: [final Progress](qa/onboarding-slice-7/progress-final-surface.png), [Stack discovery](qa/onboarding-slice-7/stack-normal.png), [example Stack](qa/onboarding-slice-7/stack-example.png), [narrow Welcome](qa/onboarding-slice-7/welcome-narrow-normal.png), [maximum/live Welcome](qa/onboarding-slice-7/welcome-narrow-max-live.png), [reduced-effects Welcome](qa/onboarding-slice-7/welcome-narrow-reduced-effects.png), [maximum/live program viewport](qa/onboarding-slice-7/program-preview-max-live.png). The final Progress chest surface was reviewed natively. Its background previously covered the Stack mark; moving the surface behind the content restored the mark. Your Splits now gives its native Back control the accessible name **Back**, rather than the internal onboarding route name.

### Read-only previews

The example finished with one no-program profile and **zero sessions, exercises and sets**: [after example](qa/onboarding-slice-7/after-example.json). Frequency/structure previews likewise retained **zero profiles and training rows**: [preview state](qa/onboarding-slice-7/all-frequency-preview-no-writes.json). The observed native lineup names/counts are recorded in [frequency matrix](qa/onboarding-slice-7/native-program-preview-matrix.json). The matrix records accessibility controls, not proof of hand-driven scrolling through every visible exercise.

The narrow device's Back/cold-relaunch/static-fallback review retained its onboarding draft and zero training rows: [draft evidence](qa/onboarding-slice-7/back-and-fallback.json). A retired-route link later restored its existing Program Preview with PPL selected rather than reopening the retired questionnaire.

### Shared handoff and failure

1. Add before setup saved exactly one routine with no profile or training: [saved before setup](qa/onboarding-slice-7/shared-saved-before-setup.json).
2. Continue → Starting Point → cold relaunch → Back → Explore returned to **Added to Stack**, with that same routine and a no-program profile: [state](qa/onboarding-slice-7/shared-return-after-setup.json), [screen](qa/onboarding-slice-7/shared-return-after-setup.png).
3. A temporary failure trigger in only that isolated database made Use fail. The screen showed **Could not save your choice. Try again.** Mode remained none, the pending identity stayed durable, and training stayed empty: [failure](qa/onboarding-slice-7/shared-failed-activation.json).
4. Removing that trigger and retrying activated custom split ID 1 and opened Train's **Shared push** hero; no session was created: [success](qa/onboarding-slice-7/shared-used.json). The QA trigger was removed.
5. Opening the four-page explanation, completing it, reopening through Help & About and skipping back preserved zero training rows: [after Help](qa/onboarding-slice-7/after-optional-help.json).

An additional fresh shared setup accepted Stack’s three-day Full body program and returned to the same saved routine: [guided acceptance](qa/onboarding-slice-7/shared-after-guided-acceptance.json). **Save for later** opened Your Splits, left Stack active, cleared the handoff and retained one routine with zero sessions: [saved for later](qa/onboarding-slice-7/shared-saved-for-later.json). Newer-link races and context-write failure/retry have behavioral tests. The earlier two-storage import duplication risk was then repaired with receipts and checked below.

### Embedded-bundle local operation

The separate QA app bundled JavaScript, fonts and other local assets. It used a production JS runtime to avoid embedded-development devtools requirements; only the compiled QA config was patched to enable preview. The repository flag was unchanged. Its Metro port had no listener.

The real UI completed a Bench Press workout with three 40 kg × 8 sets and displayed its earned orange Stack piece using the existing renderer: [started](qa/onboarding-slice-7/embedded-start.json), [completed](qa/onboarding-slice-7/embedded-completed.json), [summary](qa/onboarding-slice-7/embedded-completion.png), [earned Stack](qa/onboarding-slice-7/embedded-earned-stack.png). Sample viewing had not generated this history.

This verifies Metro-independent bundled startup and the local training path. The Mac/simulator still had network access, so it does **not** establish airplane-mode or actual network-disconnected acceptance. The artifact preceded the final live-font remeasurement changes; those changes were reviewed with Metro and behavioral tests, not by re-exporting this bundle.

## Final acceptance matrix and cutover gate

| Requirement | Evidence / status |
| --- | --- |
| Fresh Explore / Track / Stack acceptance | Real SQLite and behavioral tests pass; prior Slice 4/5 native acceptance retained. This execution natively rechecked Explore, Track, shared Explore, guided shared acceptance and all preview frequencies/structures. |
| Existing Stack/custom migration, retained metadata/history, completed-user skip | Real SQLite schema-21 migration/reopen tests pass, including units/goals/schedules/history and missing custom selection. Completed native custom user enters Train; ordinary existing-user data was not used as a test fixture. |
| Relaunch, Back, failed saves, repeated taps | Behavioral/SQLite coverage passes. Native draft relaunch and shared activation retry pass; earlier Slice 4–6 native failure/retry evidence remains applicable. |
| Flexible schedule and independent habit goals | SQLite regressions pass; native fresh settings show None goal and Flexible schedule. No automatic prompts. |
| Empty / Stack / custom first launch, resume and completion | All coordinator/SQLite cases pass. Slice 6 native evidence covers every origin, confirmation/cancellation/failures and resume. Slice 7 embedded path adds actual empty-workout completion and earned Stack. |
| Shared setup and old/new backup restore | Sharing/backup SQLite and behavioral tests pass, including schema-21 upgrade, current backups and rollback. Native shared setup/explicit activation pass. Native Files restore remains unverified. The import crash boundary is repaired and covered by real SQLite/cold-state tests plus a native simulated missing-result state; the native test did not time a process kill inside the write window. |
| Narrow phone, maximum and live Dynamic Type | Narrow normal/maximum/native live checks found and repaired layout issues. Final Progress and repaired Train captures are current. Complete lower-screen hand scrolling remains pending. |
| Reduce Motion, Increase Contrast, reduced transparency | All three enabled on the disposable device; Welcome static fallback reviewed. Full-screen matrix under each combination remains pending. |
| VoiceOver | Simulator Settings offers no VoiceOver control. Accessibility-tree labels/actions were inspected; **actual VoiceOver operation was not tested**. [Availability evidence](qa/onboarding-slice-7/simulator-accessibility-availability.png). |
| Physical device | The iPhone 14 Pro is listed as paired/available, but the detailed connection fails: tunnel disconnected, cached Developer Mode disabled and developer services unavailable. A USB connection/unlock request is pending. No physical QA was performed and no security settings were changed. |
| Offline operation | Embedded local startup/training passes; actual network-disconnected check remains pending. |
| Color/motion equivalents | Example/discovery copy and accessible labels explain meaning, and static fallback preserves Welcome meaning. Full VoiceOver/contrast review still pending. |
| Flag-off/release and default cutover | Flag-off behaviors covered by tests; default replacement **not enabled** because the complete acceptance matrix has not passed. |

Prior integration checkpoints: [Slice 2 migration/backup](onboarding-slice-2.md), [Slice 3 no-program training](onboarding-slice-3.md), [Slice 4 core setup](onboarding-slice-4.md), [Slice 5 programs](onboarding-slice-5.md), [Slice 6 first-workout units](onboarding-slice-6.md).

## Resumed native review and remaining manual checks

The narrow device completed **Track my workouts** with an empty name, no habit goal, flexible days and no active program: [tracking entry](qa/onboarding-slice-7/narrow-track-entry.json). Its first-workout unit sheet was inspected after a live maximum-size change: [sheet viewport](qa/onboarding-slice-7/unit-narrow-max-live.png). Cancel returned to Train with kg still unconfirmed, no draft/timer and **zero sessions, exercises and sets**: [cancelled state](qa/onboarding-slice-7/narrow-unit-cancelled.json).

The live maximum-size return exposed clipped native greeting, status and title heights. After repair, cold maximum-size startup and a live Large → maximum transition displayed the complete wrapped text: [repaired maximum viewport](qa/onboarding-slice-7/train-narrow-max-live-repaired.png). The lower description/actions still require scrolling and were not verified by touch. Returning to Large displayed the normal complete hero; reopening and cancelling the sheet still created no session: [restored Train](qa/onboarding-slice-7/train-narrow-restored.png).

Computer-use AX actions work for exposed controls, but coordinate taps and scroll actions fail with `noWindowsAvailable`. The real Files picker opened from Settings → Manage Data → Restore Backup, but its controls were absent from the accessibility tree and pointer selection failed. No native backup was selected or restored. Accessibility Inspector was also attempted; it produced no completed audit result. A blank inspector result is **not** a zero-warning audit or VoiceOver pass.

Three synthetic fixtures are prepared in the isolated **Stack Onboarding Backup QA** app’s Documents folder. The production validator accepts all three against its current schema: [fixture validation](qa/onboarding-slice-7/backup-fixture-validation.json). That read-only validation is not a native restore result. To finish this check manually:

1. On the iPhone 17 Pro simulator, open **Stack Onboarding Backup QA**, then Settings → Manage Data → Restore Backup → Browse → On My iPhone → Stack Onboarding Backup QA.
2. Select **Legacy-21.json** and confirm restore. Check “Legacy backup QA”, Stack mode, PPL, pounds already confirmed, habit goal 5, weekdays Monday/Wednesday/Friday, and one completed workout with three sets. Ensure setup does not reopen and transient handoffs are cleared.
3. Repeat with **Current-22.json**. Check “Current backup QA”, no-program mode, Full body preferences, kg unconfirmed, no habit goal/flexible days, and the same one-workout/three-set history. Check the next new workout asks for units and cancelling creates no additional session.
4. Restore **Before-restore-QA.json** to return this disposable container to its original Stack/Full body profile, one saved routine and zero workout history. These fixtures contain only synthetic QA data; do not restore them into the ordinary app.

### Receipt recovery on the existing schema-22 native container

Cold launching **Stack Onboarding Backup QA** created the empty receipt table at schema version 22 and preserved the existing Stack profile/routine. A deliberate second opening/import of the same share created routine ID 2 and a native UUID-backed receipt, confirming independent copies still work.

After that real import, the app was stopped and only its isolated AsyncStorage handoff’s saved result was removed, retaining the durable attempt. This reconstructs the persisted state of interruption after SQL commit and before the saved-ID write; it is **not** a timed kill inside the write window. Cold launch returned to the pending share. Retrying Add showed **Added to Stack — Shared first lineup 2**, recovered ID 2, retained exactly two routines total, and created zero sessions. Stack remained active: [recovery evidence](qa/onboarding-slice-7/shared-receipt-recovery.json), [recovered screen](qa/onboarding-slice-7/shared-receipt-recovered.png).

Save for later then cleared the handoff and opened the two-routine library while retaining Stack mode and zero history: [dismissed recovery](qa/onboarding-slice-7/shared-receipt-dismissed.json). **Before-restore-QA.json** still represents the earlier one-routine baseline and can restore that disposable container after the manual Files matrix. No ordinary app data was changed.

## Simulator restoration and cutover checkpoint

The disposable SE’s content size is restored to **large**, Increase Contrast **disabled**, Reduce Motion **off**, and Reduce Transparency **off**. Content size/contrast were read back through `simctl`; motion/transparency were restored and checked through native Settings controls. The original iPhone 17 Pro settings are unchanged. [Restoration status](qa/onboarding-slice-7/restoration-status.json) records the disposable device. Metro remains available for review; the isolated backup app was stopped to close its Files picker, then reopened for receipt recovery and left in Your Splits.

To close Slice 7, complete maximum-size touch scrolling and the screen/effects matrix, run actual VoiceOver/physical-device and network-disconnected checks, and complete native Files restores above. Resolve any resulting failures before removing the preview flag and enabling replacement onboarding. The current automated pass does not satisfy this remaining gate.
