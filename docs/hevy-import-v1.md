# Hevy import V1

Verified against Hevy’s public OpenAPI on **2026-10-05**. Structural response models, parameter types, enums and examples are in [hevy-api-schemas.json](hevy-api-schemas.json), extracted from the [official Swagger document](https://api.hevyapp.com/docs/swagger-ui-init.js). The [interactive documentation](https://api.hevyapp.com/docs/) describes the API as early and subject to change.

## Diagnostic and architecture decision

- **Authentication:** required personal `api-key` request header, documented as a UUID string. `/v1/user/info` supplies the stable account ID and preferred weight unit. No password or username is requested.
- **Availability:** public API access currently requires Hevy Pro. The key page is `https://hevy.com/settings?developer`.
- **OAuth:** the public OpenAPI supplies no OAuth authorization/token endpoints, scopes or app registration procedure. Stack V1 uses a personal key. Hevy’s own ChatGPT connection is a separate integration; its existence is not evidence that a supported public OAuth contract is available to Stack.
- **Architecture:** native device → Hevy HTTPS directly. No Railway proxy, new server, dependency, persistent connection or secure-storage installation is needed. A proxy would receive the user’s secret without providing an advantage for these read-only requests. Browser CORS compatibility is not promised; V1 targets native iOS.
- **Secret lifetime:** component input is cleared at Connect; the adapter keeps the key in a closure during scan and releases it in `finally`, including failures. Back/unmount aborts reading. The normalized snapshot, preview, SQL, backup and onboarding draft contain no connection credential. Static errors never attach request bodies, URLs with secrets or provider exceptions. No import logging or analytics is added. This is logical release from memory, not a claim of guaranteed JavaScript heap zeroization.
- **Mapping gaps:** Stack has weight/reps and whole-second holds, two load modes, and six muscle categories. It does not exactly represent distance, assistance, added bodyweight load, custom measurements, RPE, active superset scheduling, per-exercise routine rest, routine notes, or original source set kinds.
- **History effects:** valid performed sets enter Workout History, Progress, chronological records and previous working-set values. Import does not call completion/progression actions or change actual historical weights.
- **Your Stack:** excluded from both Build derivation and Build counters. Imported sessions lack Stack intensity, rotation and complete comparable evidence; reconstructing blocks/layers would imply facts we cannot establish. No casting or backdated blocks are written.

## Flow

`I have my own workouts → Bring your workouts over → Import from Hevy → Connect → scan → preview → Import from Hevy → result → Continue → Train`.

The own-workouts branch saves a resumable `bring-workouts` draft, without finishing onboarding. Paste my routine is a static Coming soon card. The current three-screen onboarding remains behind the repository’s existing `EXPO_PUBLIC_ONBOARDING_PREVIEW=1` development flag; this change does not promote that whole onboarding redesign to release.

Connect scans the account; it performs no writes. Preview shows new routine/workout counts, referenced exercise count, custom exercise count, existing items and mapping limitations. The credential has already been discarded at preview. Import is one local atomic action. Continue refreshes in-memory history/library, persists the nickname and Hevy display unit, completes onboarding with no selected plan, clears the draft and enters Train. Saved routines remain selectable in Your routines. Persistence and final profile acceptance are independently retryable. Leaving before Continue does not finish onboarding; scanning again detects saved entities.

## Endpoint contracts and pagination

All requests use the same `api-key` header. Lists use one-based `page` and `pageSize`; default page size is 5.

| Endpoint | Success response | Maximum page size | Use |
| --- | --- | ---: | --- |
| `/v1/user/info` | `{data: UserInfo}` | — | stable account, display unit |
| `/v1/workouts/count` | `{workout_count: integer}` | — | completeness check |
| `/v1/workouts` | `{page, page_count, workouts: Workout[]}` | 10 | all workouts; full nested sets |
| `/v1/routines` | `{page, page_count, routines: Routine[]}` | 10 | all saved routines |
| `/v1/routine_folders` | `{page, page_count, routine_folders: RoutineFolder[]}` | 10 | folder grouping |
| `/v1/exercise_templates` | `{page, page_count, exercise_templates: ExerciseTemplate[]}` | 100 | exercise metadata |
| `/v1/exercise_templates/{exerciseTemplateId}` | `ExerciseTemplate` directly | — | referenced templates missing from list |
| `/v1/workouts/{workoutId}` | `{workout: Workout}` | — | documented; unnecessary extra reads |
| `/v1/routines/{routineId}` | `{routine: Routine}` | — | documented; unnecessary extra reads |
| `/v1/exercise_history/{exerciseTemplateId}` | `{exercise_history: ExerciseHistoryEntry[]}` | — | documented; redundant with workouts |

No numerical request quota is documented. Concurrency is one. Each safe GET has a 15-second timeout and at most three attempts for network failure, HTTP 429 or 5xx. Delay starts at 500 ms, doubles, and respects Retry-After up to 30 seconds. No retries for 401/403, other 4xx, malformed JSON or invalid schemas. Responses are strictly projected into normalized fields. Duplicate identifiers, changed page counts, empty intermediate pages, missing referenced templates/folders, bad timestamps and a workout-count mismatch stop the scan before writing. Pagination is offset-based, so Hevy should remain unchanged during a scan; checks cannot detect every possible concurrent remote edit.

## Models actually exposed

- **Workout:** `id`, `title`, nullable `routine_id`, `description`, `start_time`, `end_time`, `created_at`, `updated_at`, `exercises[]`.
- **Workout exercise:** `index`, `title`, `exercise_template_id`, `notes`, nullable `superset_id`, `sets[]`.
- **Set:** `index`, `type` (normal/warmup/dropset/failure), nullable `weight_kg`, `reps`, `distance_meters`, `duration_seconds`, `rpe`, `custom_metric`.
- **Routine:** `id`, `title`, nullable numeric `folder_id`, `created_at`, `updated_at`, `exercises[]`.
- **Routine exercise:** same indexed identity/notes/superset fields, plus `rest_seconds`; routine sets add nullable `rep_range: {start,end}`. OpenAPI declares rest as string while giving a numeric example; both valid numerical forms are accepted.
- **ExerciseTemplate:** `id`, `title`, `type`, `primary_muscle_group`, `secondary_muscle_groups[]`, `equipment`, `is_custom`, nullable `thumbnail_url`.
- **RoutineFolder:** numeric `id`, `index`, `title`, `created_at`, `updated_at`.
- **UserInfo:** `id`, `username`, `name`, `url`, `weight_unit` (kg/lbs), `distance_unit` (kilometers/miles). Only account ID and weight unit cross the normalized boundary.

Weights are already **kg** and distances **metres**, independent of preferred display units. Dates must contain an explicit timezone and normalize to the equivalent UTC instant. Exercise/set source indices determine order; stored local positions are dense but original indices remain in reference facts. The full exact structural definitions are in the JSON snapshot; thumbnails and unused profile/catalog information are deliberately not imported.

## Mapping and storage

| Source | Stack representation |
| --- | --- |
| Hevy folder | independent saved routine group, same name |
| Unfiled routines | Hevy routines group |
| Hevy routine | saved workout within its group; source list order retained within group |
| Routine exercises | canonical catalog IDs in source index order |
| Routine sets/targets | normalized reference and prescription rows, independent from history |
| Completed workout | completed historical session with original start/end, source title and ordered sets |
| Source facts | original Hevy details accessible in workout summary and Your routines |

Resolver order: prior `(account ID, exercise-template ID)` mapping; documented known ID with matching title; curated Hevy/Stack aliases; exact normalized name; exact equipment-qualified spelling; otherwise a distinct custom exercise. Load mode and measurement must agree before using a built-in. There is no fuzzy muscle/name matching. Custom Hevy templates retain independent identities, even if their names equal a built-in. Colliding names receive a deterministic Hevy suffix. Equipment, primary/secondary muscles and measurement metadata are retained. Source metadata remains alongside local mappings. The sparse known-ID table starts with the documented bench-press example; broad ID coverage is not invented.

Five additive SQLite tables retain exercise mappings, group mappings, routine snapshots, routine prescriptions and workout snapshots. Schema version is 23. Every entity key includes its source account; Hevy is implicit in these V1-specific tables. Import rechecks the preview against the database within its transaction. Already imported routines/workouts are kept, not duplicated or overwritten with later remote edits. This is migration, not continuous sync. Existing native sessions, current workout, selected plan and rotation are untouched by import. Backup/restore includes source mappings and original facts; schema-21/22 backups upgrade with empty import tables.

## Preserved, transformed and unsupported

**Preserved:** routine/workout titles, source IDs internally, dates, exercise/set order, actual kg values, reps, duration, distance, notes, superset identifiers, rest targets, set types, rep ranges, RPE/custom metrics and template metadata. Unknown future set kinds and unsupported measurements remain reference facts.

**Transformed:** folders become routine groups; routine-set counts apply to supported working sets. Lower rep-range bounds start the logger. Original failure sets act as working sets; drop sets use Stack’s drop-set marker; warmups remain marked source facts and comparable warmups appear in recap totals. Supported whole-second holds use Stack’s duration metric. Missing routine targets use Stack’s existing 8-rep/zero-load/default-duration starting values, with disclosure in preview. Muscle metadata outside Stack’s six catalog categories falls back to its core catalog category; original metadata is retained. Original folder ordering is not reproduced in the existing recency-sorted library.

**Reference only:** distance-duration, short-distance-weight, assisted bodyweight, weighted bodyweight, fractional-duration performance, negative/absent required load, unknown set kinds, RPE/custom metrics, active superset grouping, per-exercise rest scheduling, routine notes and warmup/drop routine prescriptions. Unsupported historical sets never count as performed or seed previous values. Null required measurements have neutral legacy-column placeholders, marked unperformed; these placeholders are not displayed as original facts. Historical source notes are read-only reference, separate from newly authored Stack notes.

Launching an imported routine uses source working-set count and explicit prescription targets. The normal logger can prefill actual working values from applicable previous history; source routine target rows are never rewritten from workout history. A routine containing unsupported measurements or unusable working targets requires editing before launch. Editing follows the existing routine editor’s model and can replace its imported prescription rows; the original routine reference remains while the workout exists.

Warmups count as historical logged sets/volume where representable, but cannot become PRs, Progress top sets, previous working sets or progression baselines. Valid drop/failure sets can enter records and Progress; drop sets do not seed regular working-set defaults. Chronological PR derivation is reused and tested, including older imports. Timed performance remains excluded from rep-based records and lift comparisons, matching Stack’s current behavior. Your Stack excludes every imported session.

## Validation and limitations

Automated checks cover authentication/error sanitization, safe retry bounds, all paginated collections, missing-template fallback, consistency checks, conservative resolution, ordering, explicit routine targets, historical units/values, account-scoped idempotency, stale previews, atomic rollback, backup/reopen, chronological records, warmup exclusions, Build exclusions, key disposal and final onboarding acceptance. Real SQLite is used for persistence tests; mocked HTTP follows the captured OpenAPI.

Live public documentation was inspected; no user Hevy Pro credential was available for an end-to-end live-account import. Native connection UI was checked in the iPhone simulator. Large imports are fetched sequentially and committed in one synchronous SQLite transaction after displaying the progress screen; device-specific memory/commit latency for multi-year accounts needs real-device validation. No persistent reconnect, incremental sync, other app import, AI parsing or pasted routine import is included.

### Changed files

- Flow and UI: `app/bring-workouts.tsx`, `app/hevy-import.tsx`, `app/hevy-routine-details.tsx`; `app/onboarding-preview/index.tsx` and `starting-point.tsx`; `features/onboarding/useCoreOnboarding.ts`; `store/onboardingDraft.ts`; onboarding route exemption in `app/_layout.tsx`.
- Adapter and importer: `features/import/models.ts`, `validation.ts`, `persistence.ts`, `ImportedFacts.tsx`; `features/import/hevy/client.ts`, `schemas.ts`, `errors.ts`, `exerciseResolver.ts`, `importPlan.ts`, `flow.ts`.
- Integration: `store/workoutDatabase.ts`, `workoutStore.ts`, `workoutBackup.ts`, `customSplits.ts`, `workoutProgression.ts`, `verifiedSessions.ts`, `personalRecords.ts`, `liftProgress.ts`; `store/workoutSummary.ts`; `constants/archetypes.ts`; `features/build/evidence.ts` and `buildCounts.ts`; `app/workout-summary.tsx` and `your-splits.tsx`.
- Checks: `tests/hevyImport.test.cjs`, `tests/hevyHarness.cjs`, actual own-workouts routing test and native image stub in `tests/onboardingCore.test.cjs`, current-schema assertions in `tests/workoutPersistence.test.cjs`. `features/onboarding/NameScreen.tsx` also honors its existing busy state to keep Continue disabled during persistence.
- Documentation: this report and `docs/hevy-api-schemas.json`.

### Final checks

- Import-specific suite: **22 passed, 0 failed**, including 2,000 completed workouts, repeat import and history readback.
- Full Node suite: **683 passed, 1 failed (684 total)**. The remaining existing Welcome-screen test expects a busy/disabled prop that the current Welcome presentation does not expose; import and routing tests pass.
- TypeScript: passed. Lint on changed import/integration files: passed.
- Whole-project lint: **21 existing errors** in `app/workout.tsx`, `components/ExerciseInfo.tsx`, `components/UpNextSheet.tsx`, `components/home/WorkoutIntensityPicker.tsx` and `components/home/WorkoutPicker.tsx`.
