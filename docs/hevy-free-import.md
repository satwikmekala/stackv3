# Hevy Free export import

Implemented 5 October 2026. The existing Pro client, resolver, normalized models, planner, persistence, database schema and Pro tests remain unchanged.

## Routing

`I have my own workouts` → `/bring-workouts` → Import from Hevy → `/bring-workouts?hevyPlan=choose`.

The plan choice is a separate native stack entry displaying two cards. Using a local route parameter lets this small addition keep the existing Pro handler in the Bring screen without changing its tests or destination.

- Hevy Pro → existing `/hevy-import` → Connect → Scan → Preview → Import → Continue → Train.
- Hevy Free → `/hevy-file-import` → Choose export file → Read/normalize/validate → Preview → Import → Continue → Train.

Back from Free returns to the plan choice. Pro retains its existing Back behavior. The onboarding guard admits the new file route; draft recovery still starts at Bring your workouts over. Paste my routine remains Coming soon.

## Observed export contract and evidence

[Hevy’s export instructions](https://help.hevyapp.com/hc/en-us/articles/43708290987415-Exporting-Your-Data-from-Hevy) describe Profile → Settings → Export & Import Data → Export Data → Export Workouts. Measurement exports are a separate file and are not accepted.

The schema was inspected in published [metric CSV fixtures](https://github.com/gossamr/swift-workout-importer/blob/5db7790a1955cf03a73b5451a88092fbde55c43d/Tests/WorkoutImporterTests/Fixtures/hevy-kg-example.csv), [imperial CSV fixtures](https://github.com/gossamr/swift-workout-importer/blob/5db7790a1955cf03a73b5451a88092fbde55c43d/Tests/WorkoutImporterTests/Fixtures/hevy-example.csv), [repeated-exercise fixtures](https://github.com/gossamr/swift-workout-importer/blob/5db7790a1955cf03a73b5451a88092fbde55c43d/Tests/WorkoutImporterTests/Fixtures/hevy-repeated-exercise.csv), and their originating importer source. This is an observed public export contract, not an official versioned Hevy schema. Stack has not obtained a fresh export from a signed-in current-version Hevy device in this task. Verify untouched current iOS and Android exports before release; unknown schema versions fail safely.

CSV, UTF-8, one row per set, with these 14 headers (their order may vary):

```text
title,start_time,end_time,description,exercise_title,superset_id,
exercise_notes,set_index,set_type,weight_kg,reps,distance_km,
duration_seconds,rpe
```

Weight may instead be `weight_lbs`; distance may independently be `distance_miles`. Exactly one weight column and one distance column are required. Quoted and unquoted cells, escaped quotes, multiline notes, UTF-8 BOM and CRLF are supported.

| Fields | Meaning / treatment |
| --- | --- |
| `title` | Workout title, preserved |
| `start_time`, `end_time` | English `d MMM yyyy, HH:mm`, optionally padded day; local wall clock with minute precision and no offset |
| `description` | Workout notes, repeated across its rows |
| `exercise_title` | Exercise name; no template ID |
| `superset_id` | Optional nonnegative numeric group, including zero; preserved for reference |
| `exercise_notes` | Exercise notes, preserved |
| `set_index` | Zero-based set index; resets preserve repeated exercise entries |
| `set_type` | `normal`, `warmup`, `drop_set`, `failure`; `drop_set` normalizes to existing Stack `dropset`; other nonempty kinds remain reference-only |
| `weight_kg` / `weight_lbs` | Nullable numeric load, converted to kg without display rounding; lbs factor 0.45359237 |
| `reps` | Nullable nonnegative integer |
| `distance_km` / `distance_miles` | Nullable distance, converted to metres (1000 / 1609.344) and retained for reference |
| `duration_seconds` | Nullable per-set duration; not rest time |
| `rpe` | Optional 0–10 value, preserved for reference |

The observed file has **no stable workout ID, account ID, routine ID, template ID, reliable source custom-exercise flag, equipment/muscle/type fields, created/updated timestamps, or time zone**. Do not invent those source facts. Required normalized creation/update fields use start/end as adapter defaults; they are not original creation/edit metadata. Equipment qualifiers are only name evidence. Unknown muscles are explicitly `unknown`; the existing resolver’s custom category fallback remains in effect.

## Normalization and reuse

The new parser produces the existing `ImportSnapshot`, with `source: hevy`, a separate local CSV namespace, and empty routines/folders. It validates before preview. `createHevyImportPlan`, `resolveHevyExercise`, `persistHevyImport` and the existing imported-history readers do all resolution, planning, writes and consumption. There is no new SQL mapper, schema migration, API connection, credential, OAuth or remote upload.

Name resolution probes only the existing conservative resolver, with compatible observed measurements and name qualifiers. Known aliases/canonical names can resolve; otherwise the existing pipeline creates a custom exercise. Unknown names without sufficient load/type evidence, mixed reps-and-time, assistance, loaded bodyweight and distance remain reference-only. Missing loads never become valid zero-load performance. Clearly weighted custom rep/time sets and known compatible bodyweight/time exercises remain usable. The export cannot distinguish a user-authored exercise with exactly the same name/measurements as a built-in.

Dates are interpreted in the device’s current zone, named in the preview. This assumption must match the user’s history; it cannot reconstruct travel or the original zone. Impossible dates/DST gaps and ambiguous fall-back times are rejected. Localized or new date formats fail as unsupported. An unfinished workout with no end time is counted and excluded; an export with no completed workouts cannot proceed.

Workout rows form contiguous blocks using title, start, end and workout notes, preserving source order. Exercises remain ordered, including repeated names whose set indices reset. No global title/date merging is performed.

## Duplicate strategy and limits

Workouts use a SHA-256 fingerprint of **the entire ordered workout**: title, canonical wall-clock start/end, workout notes, every exercise name/notes/superset, and every normalized set index/kind/load/reps/time/distance/RPE. A per-fingerprint occurrence ordinal preserves multiple identical nonadjacent blocks in the same export. Template identities hash the exact name and compatible measurement type. `js-sha256` is a small JavaScript dependency; no native rebuild/module is needed.

Workout IDs do not depend on filename, file order between distinct blocks, quoting, BOM, padded dates, column order, device zone, or local exercise mapping. Identical files and expanded exports containing unchanged workout blocks deduplicate, including stale previews: the existing transaction replans under its lock.

Without provider IDs, edited workouts or changed unit settings/rounding can generate a different fingerprint and add another session. CSV and Pro namespaces deliberately remain distinct, so importing the same history through both can duplicate it; preview copy explains this. CSV cannot reliably distinguish different Hevy accounts with identical contents, or separate adjacent workouts with completely indistinguishable exported header fields from repeated entries within one workout. These are missing source information, not safe opportunities for fuzzy deduplication. Do not claim universal edited-history/account reconciliation.

Bounds: 10 MiB UTF-8, 50,000 set rows, 5,000 completed workout blocks, 100,000 characters per cell. File size is checked before reading; text size and structural limits are also checked during parsing. Very large files get static limit copy. Native picker cancellation restores the prior instructions/preview and performs no import. Wrong extensions, malformed data, empty files, unfamiliar schemas and read errors never expose raw errors or partial results.

## Persistence and historical behavior

Preview is read-only. One existing SQLite transaction writes exercises, source mappings, sessions, sets and original normalized details. Failure rolls back all additions and permits retry; onboarding only completes on Continue. Concurrent taps are coalesced, late file reads after unmount are ignored, and disposal before the transaction frame prevents writes.

Free imports completed workout history and original normalized set/notes details. It creates no saved routines or folder groups. Usable measurements inform History, Progress, chronological records, previous values and applicable progression baselines using the existing Pro semantics. Warmups are excluded from records; drop sets keep the existing record semantics but do not seed regular-set baselines. Unsupported facts are not fabricated into performance. Imported sessions do not create historical blocks/layers in Your Stack.

## Validation and release checklist

- Synthetic contract fixture: `tests/fixtures/hevy-free-kg.csv`; no personal workout export copied into Stack’s repository.
- `tests/hevyFreeImport.test.cjs`: parsing, units, notes, set order, repeat entries, strong identity/multiplicity, resolver reuse, file cancellation/type/size, date/zone/DST, limits, duplicate/stale previews, backup/reopen, mid-transaction rollback, history consumers, routing, history-only copy, flow retry/disposal/Continue, 2,000 workouts.
- Existing `tests/hevyImport.test.cjs` remains byte-identical and protects Pro.
- Hevy tests: 46/46 pass (24 new Free tests and 22 unchanged Pro tests). Full suite: 707 pass, 1 pre-existing failure, 708 total.
- Typecheck and changed-file lint pass. iOS and Android production Metro/Hermes exports succeed.
- Simulator: Bring → plan cards → original Pro connection screen; return → Free instructions; system picker opens. System picker accessibility prevents automated file selection/cancel completion in this simulator session; cancellation and selection logic are covered in tests.
- Remaining physical-device work: untouched current Hevy iOS/Android CSVs, kg/lbs and independent distance settings, localized exports’ safe rejection, Files/iCloud/Android document providers, selection/cancellation/retry, complete Preview → Import → Continue → Train, accessibility/large text, and upper-limit memory/UI latency on older phones. Confirm an unchanged second export creates zero new history and verify actual titles, dates, notes, records and previous values against Hevy.

Repository-wide baseline failures are outside this delta: the stale Welcome busy-prop test and 21 existing lint errors in workout/ExerciseInfo/UpNextSheet/WorkoutIntensityPicker/WorkoutPicker. Do not modify those features as part of this import addition.

## Files in this delta

Modified:

- `app/bring-workouts.tsx`: native plan-choice entry and its two cards.
- `app/_layout.tsx`: onboarding guard admits file import.
- `package.json`, `package-lock.json`: `js-sha256` dependency only for the new fingerprints.

Added:

- `app/hevy-file-import.tsx`: file import route, importer wiring and Continue → Train.
- `features/import/hevyCsv/parser.ts`: supported contract, conservative normalization and SHA-256 identities.
- `features/import/hevyCsv/file.ts`: native picker and bounded file read.
- `features/import/hevyCsv/flow.ts`: Free visit state, cancellation, retry and disposal.
- `features/import/hevyCsv/HevyFileContent.tsx`: history-only instructions, preview and result.
- `features/import/hevyCsv/errors.ts`, `features/import/hevyCsv/limits.ts`: static safe errors and intake bounds.
- `tests/hevyFreeImport.test.cjs`, `tests/fixtures/hevy-free-kg.csv`: new delta protection and synthetic fixture.
- `docs/hevy-free-import.md`: contract, behavior, evidence and validation record.
