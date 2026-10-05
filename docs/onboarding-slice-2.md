# Onboarding Slice 2: explicit program state

Slice 2 is complete. The object-dominant Welcome is the accepted direction; its development preview and release gate remain intact. This execution did not implement Slice 3 or switch production onboarding. Existing workspace changes were preserved. No commits, pushes, publishing, deployment, app submission, or automation creation occurred.

## Profile and migration

`UserProfile` now carries `programMode`, `threeDayStructure`, and `weightUnitConfirmed`. Program selection and custom split identity are persisted together:

| Action | Mode | Custom identity |
| --- | --- | --- |
| `setActiveSplit(null)` | `stack` | `null` |
| `setActiveSplit(id)` or accepted custom draft | `custom` | selected ID |
| `chooseNoProgram()` | `none` | `null` |
| Delete an active custom split or prove it missing | `none` | `null` |
| Save a routine for later | preserved | preserved |

Schema **22** adds the three columns in one transactional migration. Existing profiles retain their name, habit goal, automatic frequency, experience, schedule, weight preferences, training data, saved routines and completed onboarding status. Legacy beginners retain three full-body workouts; intermediate/advanced profiles retain Push / Pull / Legs. Existing units are marked confirmed. A genuinely orphaned custom selection migrates to `none`; a valid custom selection retains its ID. Reopening does not reapply these defaults.

Legacy onboarding callers can still omit the new fields at the `setProfile` boundary. `createNoProgramProfile()` supplies the future tracking/exploration defaults: empty name, zero habit goal, flexible days, inactive three-workout/full-body preferences, kg, and unconfirmed units. Creating this profile alone does not complete onboarding or start a workout.

The automatic queue runs only in Stack mode. Three-day structure is independent of experience in queue generation, the existing template builder, the retained onboarding preview, and Settings. Editing automatic preferences preserves the current mode and the independent habit goal. Choosing a unit explicitly in Settings marks it confirmed. The first-workout confirmation sheet belongs to Slice 6.

## Persistence and recovery

Custom acceptance writes mode, identity, and optional onboarding completion in the same draft transaction. Failed acceptance rolls back the entire routine graph; a missing profile cannot silently accept a program. A committed save publishes its profile before asynchronously refreshing details, so a failed follow-up read returns the saved ID rather than inviting duplicate creation.

Failed routine reads preserve the selected program and offer a native Retry action. Successful reads can establish that a routine is missing and persist `none`. Startup catalog failure blocks hydration and can retry without changing the profile. A stale missing-detail read cannot clear a newer selection. Home no longer responds to a missing custom split by activating Stack.

Schema-21 backups are validated against their original profile columns, copied and upgraded in memory, then restored transactionally into schema 22. Existing structure and confirmed units are inferred once. Schema-22 backups preserve explicit no-program mode and unconfirmed units. Other incompatible schemas, extra or missing row columns, invalid enums/booleans, inconsistent mode/identity pairs, and invalid schedules are rejected. Foreign-key/integrity checks and SQL rollback remain in place. Restore does not mutate the supplied backup object.

## Checkpoint validation

- **202 tests passed** across `workoutPersistence`, `settingsBehavior`, and `splitSharingExperience`; **18** are new focused onboarding-state cases.
- Checked legacy Stack/custom/missing-custom migration, both three-day arrangements, lbs retention, unchanged training rows and IDs, repeated reopening, migration rollback/retry, hydration retry, no-program persistence, dormant preferences, activation/deletion, failed profile writes, committed-save read failure, load Retry, stale reads, old/current backups, malformed backup rejection, and transactional restore failure.
- Existing persistence and sharing checks cover retained routine/session/history behavior. Custom history does not consume the automatic queue, including history without a routine identity.
- `npm run typecheck` passed.
- ESLint passed on all application and test files changed in this slice.
- `git diff --check` passed.

The real SQLite tests reopen the production database initializer and hydrate the production store against a disposable Node SQLite database. They do not replace iOS or physical-device validation. Existing catalog seeding advances the exercise AUTOINCREMENT counter on ignored inserts; migration checks preserve training rows, IDs, and routine/session counters rather than treating that existing maintenance behavior as a profile migration.

No new visual composition was introduced in this state slice. Simulator first-run/no-program interaction belongs to the next slices; no physical-device checks were performed here. Slice 1 records the paired-device connection/Developer Mode limitation. VoiceOver, narrow phones, maximum Dynamic Type, reduced transparency, offline operation, and the remaining native matrix are still outstanding before final cutover.

## Next execution: Slice 3 only

Build the no-program Train hero with **Ready when you are**, an empty-workout primary action, and destinations for Stack workouts and saved routines. Use `programMode` for program controls and active labels; add **Train without a program** without deleting saved routines. An active session takes precedence and shows **Resume workout**. Opening the app alone must create no session or timer.

The full seven-slice plan remains the contract. Keep the new Welcome development-only and production onboarding unchanged until the later core paths, program branch, launch coordinator, discovery/handoffs and final acceptance matrix pass. Continue without a routine approval pause; this checkpoint is the boundary between executions.
