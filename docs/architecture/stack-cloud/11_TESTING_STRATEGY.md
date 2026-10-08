# Testing strategy and measured current baseline

Separate existing local behavior from future cloud correctness. Passing today's persistence tests does not validate the proposed authentication, PostgreSQL schema, upload protocol or native restore activation. These cloud capabilities are not implemented in this planning assignment.

## Baseline actually executed

On 8 October 2026, Node **v22.23.1**, from the existing working tree, with installed dependencies unchanged:

```sh
node --test tests/workoutPersistence.test.cjs tests/hevyImport.test.cjs tests/hevyFreeImport.test.cjs tests/notifications.test.cjs tests/buildEvidence.test.cjs tests/buildSharedHistory.test.cjs
```

Result: **288 tests passed; 0 failed; 0 skipped; 0 cancelled; exit 0; 16.484 seconds**. These tests execute production TypeScript through harnesses and, where applicable, real Node SQLite with mocked native bridges. They exercise existing persistence/migration/backup/import/notification/Build behavior. They are not Expo SQLite physical-device or Railway/Supabase integration tests. No application code or dependency was changed to achieve this baseline. The working tree had unrelated preexisting UI edits; this is a snapshot of that tree, not a clean released-build certification.

Do not infer a complete suite pass: typecheck, UI suites, server suites, native Swift suites, provider flows, production deployment and device tests were not run in this verification. The temporary local test log was `/tmp/stack-cloud-baseline-20261008.log`; the durable evidence is the command and result above, not availability of that temporary file.

## Invariants that determine success

1. All user-owned authoritative facts are retained or explicitly excluded by the agreed backup scope; validation never silently drops malformed rows to make counts match.
2. Restoring a verified supported checkpoint reproduces canonical rows, relationships, IDs/order, portable preferences and derived outcomes under the same calendar/rule inputs. Imported facts, warmups, retroactive flags and measurement snapshots are part of this assertion.
3. A workout's local commit does not await a network request or provider session. A cloud tracking defect must visibly pause cloud protection without suppressing a valid local save; genuine local storage failure must never be reported as saved.
4. Owner/dataset/device/epoch/fence checks hold at every read, write and response application. No email/content-based account ownership or automatic history merge.
5. Every immutable request retry either returns the same committed result or a classified error; it never duplicates rows or acknowledges changed payload under the same operation ID.
6. Restore selection is old complete dataset or new complete dataset after interruption, never a mixture; newly created local work is never overwritten by rollback.
7. Only a committed validated manifest produces “verified backup.” Stage 4 operation acknowledgments and background task acceptance are not equivalent.

## Historical fixture matrix

Inventory evidence and concrete migration entry points are in [01](01_EXISTING_DATA_INVENTORY.md). Keep fixtures as immutable SQL/logical snapshots with hashes, source release/commit, original schema fingerprint, expected row counts, exact values and compatibility transform version. Use synthetic/anonymized records; never commit real workout notes, provider tokens or production exports. Add archived release builds/DBs where available rather than generating all old schemas from today's DDL.

| Fixture / dispatcher path | Assertions before/after/reopen |
|---|---|
| Genuine empty version 0 | Seed once; profile absence/defaults as current contract; stable seeds and no duplicate IDs on reopen |
| Populated version 0 or corrupt/missing version | New cloud preflight refuses destructive seeding, retains original file and offers recovery; current initializer's assumption is not accepted as safe recovery |
| Legacy `sessions.workout_type` with multiple sessions and existing join rows | Correct ordered join migration without duplicate type row; old column removal; stable IDs, data and variant defaults; failure rollback; production never invokes dev rebuild |
| Legacy dispatcher failure injection | Fail each statement/drop/seed validation; original/recovery copy remains valid; restart retries safely; test release `__DEV__=false` separately from dev behavior |
| Nonlegacy positive version <3 | Archetype template/variant seed creation and version stamp; existing history unchanged |
| Nonlegacy version 3–13 | Session archetype additions + variant seeds; idempotent repeat; preserve actual old seed counts/targets and dangling permitted source provenance |
| Versions 1–13 custom `test` cleanup | Session/archetype references retained; custom routine-only FK reference cannot be lost; mixed-case names and unrelated authored rows survive; failure remains recoverable |
| Missing retroactive/custom-source/profile auto-increase/increment/unit columns | Add only absent columns, preserve present values; old kg increment 2.5 versus new 0.5; lb increment independently 5; no mass kg conversion |
| Custom split schema/equipment/active split/color additions | Preserve ordered duplicates/names, hidden plans, colors, selection; test same-version with and without added columns |
| Real v14 SQL fixture | All later additions/backfills, row/value equality, old current session/focus, reopen idempotence; preserve backup before adoption |
| Real v15 SQL fixture in kg and lbs | Entry-unit migration snapshots preference once; nullable completion timestamp remains null; targets/weights untouched |
| Real v16 SQL fixture | Only builtin verified Plank seconds migrate from reps/targets; active/completed/bonus sets handled once; custom Plank and other newly timed exercises keep historic reps |
| Real v17 SQL fixture | Custom/archetype/legacy origin inference; no fabricated origin/timestamps; imported-vs-native flags remain correctly reconstructable |
| Program-frequency shape pre-v21/21 | Goal-derived clamped initial program frequency once; later independent goal edits do not rewrite program |
| Notes absent/present | Notes/table/index bootstrap; attached and detached notes survive session deletion/restore; arbitrary sensitive text never enters diagnostics |
| v21 program-preference combinations | Active valid/missing/null split × beginner/intermediate/advanced; preserve or explicitly clear orphan selection per existing transform; no new training rows |
| Partially added v22 program columns | Failure at each field addition; transactional retry; absent fields backfill without overwriting already existing choices |
| v22 same-version receipts variants | Present/absent receipts and pending AsyncStorage attempt; table added idempotently; backup excludes receipts; restore clears only the replaced dataset's recovery state |
| v23 imports and hidden-plan variants | Five source tables, source-pair deduplication, JSON facts, row mappings, hidden-plan defaults; v23 same-version `is_stack_plan` addition/default compatibility |
| v24 reminder variants | Enabled/time absent/present and invalid values; additive defaults, schedule unchanged; no implicit OS permission grant |
| Unknown newer version/shape | `UPGRADE_REQUIRED` for cloud operation; no best-effort dropping fields; live source preserved; offline compatibility/recovery behavior explicit |
| Partial startup after each ensure step | Source fingerprint and journal permit bounded retry; version stamp alone never means complete; constraints/indexes/triggers verified |
| Existing file backups v21/v22/v23/v24 | Supported adapters match current behavior; unsupported v20/newer rejected without mutation; exact ID/counter restore, including IDs above row maximum |

The checked-in physical SQL fixture baseline is v14–v17. All missing release-era paths above are **new test requirements**, not claims of coverage. Same-version structural fingerprints must have individual fixtures.

Each fixture includes empty history, 500 completed workouts, an active workout, retroactive attendance, imported unsupported metrics, warmups/dropsets/failure sets, repeat exercise occurrences, bodyweight/reps and timed history, null completion dates, date-only records, edited Stack plan, optional notes, custom-name collisions, deleted-source routine IDs and profile selection. Supplement combinations systematically rather than constructing an unbounded Cartesian product.

## Serializer, graph and derivation tests

Maintain a canonical logical dump independent of SQLite row physical layout. Compare every authoritative entity's row count and sorted key/value hash, plus entire manifest root. Golden tests cover finite binary64 edge values, kg/lb input conversion without restore conversion, `-0` normalization, Unicode/custom names, empty vs null, source JSON unknown fields under supported source version, large notes, timestamps and composite-key encoding. Canonicalization must be identical in client and server runtimes. Reject duplicate keys/IDs, malformed envelope fields, unsupported source version, NaN/infinity, broken graph, out-of-range profile data, duplicate positions, decompression bombs and bytes beyond declared ceilings. Preserve source evidence when a validation failure blocks backup.

Round trip SQLite → frozen copy → canonical chunks → server validation → manifest → candidate SQLite → re-export. Compare exact stable identity mappings and AUTOINCREMENT high-water values. Verify deliberately non-FK routine provenance stays detached, note session deletion keeps text, and imported target/raw facts remain unchanged. One flipped byte, missing/duplicate/reordered chunk, incorrect table count or final root must prevent publication/activation.

Derive workout history order, personal record winners, progression inputs, volume, custom rotation/weekly queue and Build with fixed `now`, local timezone and pinned rule version before/after. Test same timestamp with numeric IDs 2/10/100; UUID migration must preserve existing tie order. Test several timezones and DST boundaries as **separate documented display outcomes**, not accidental equality requirements. Legacy date-only records retain calendar strings. Exclude imported and retroactive history from Build exactly as current code does, but retain imported performance eligibility and warmup exclusions elsewhere.

## Preference bridge and atomic activation crash matrix

Use deterministic fault hooks at every I/O/commit boundary, then restart from actual files, not the same JS heap. For each hook test before/after success and repeated restart.

| Boundary | Expected durable authority after restart |
|---|---|
| AsyncStorage read/flush blocked, corrupt or failed | Legacy values/source retained; backup unavailable; no defaults silently promoted |
| Shadow SQLite insert committed but source changes before verification | Legacy authoritative; recapture under preference edit gate |
| Verification passed, authority transaction not committed | Legacy/shadow recovery; no duplicate cloud IDs or divergent preference writes |
| Authority transaction committed, projection only partly written | SQLite authoritative for all four keys; UI waits or reads SQLite; projection resumes, never reads stale cross-account values |
| Candidate download partial/hash failure/space exhausted | Old active source; retained staged state bounded by expiry; no normal partial-history UI |
| Candidate restored but semantic/FK check fails | Old active source; quarantine candidate and retain readable recovery copy |
| Candidate closed/flushed, control pointer transaction uncommitted | Old complete source |
| Pointer committed, process killed before preferences/cache hydration | New complete source + SQLite preferences; projection/runtime cleanup resumes before UI/native writes |
| First new workout saved after activation, hydration later fails | Preserve new writes; no automatic rollback to old dataset |
| Native callback/request response queued at activation/sign-out | Old epoch/dataset rejected; command inbox invalidated; reused local integer IDs cannot be mutated |
| Recovery file retention cleanup during active restore | Pinned files and active source preserved; bounded cleanup resumes safely |

Exercise physical iOS termination, force-quit, lock/unlock before first authentication, device reboot, OS background suspension, unavailable protected files, low-memory kill and file exhaustion. SQLite native API transaction/backup behavior must be verified on the current Expo57 native build. In-memory Node tests cannot certify filesystem flushing, App Group protection or ActivityKit lifecycle.

## Identity, authorization and privacy

Use two accounts, linked/unlinked Apple/Google identities, multiple datasets and revoked devices. Verify signature/JWKS key rotation, issuer/audience, expiration, nonce/state replay, authorization-code replay, mismatched redirect, stale refresh token, concurrent refresh, revoked Apple authorization, private relay email, changed/absent email and explicit account linking. Auth middleware must derive owner from approved binding; caller-supplied owner never overrides it.

Exercise every `/v1/cloud` method with anonymous token, wrong user, wrong dataset, cross-owner parent IDs, guessed backup/chunk/restore IDs, expired restore pin, deleted user, revoked device, stale fence and signed cursor for another owner. Verify nonenumerating error behavior and zero content leakage. Test RLS with actual restricted runtime role, direct Data API grants denied, pooled connection identity reset and migration/admin role separation. A service-key/admin test alone cannot demonstrate tenant isolation.

Race association on empty account, concurrent takeover, finalize during sign-out/deletion, link two existing populated identities and restore after surviving keychain credentials. Prove no automatic union by email/name/history similarity. Scan telemetry, crash diagnostics, SQL logs, support bundles and retained validation failures for tokens, provider subjects, names, notes and source JSON. Verify bounded log fields and deletion of temporary exports/candidates according to policy.

## Backup transport and incremental protocol

Stage 2–3 tests cover manual trigger, new workout starting during preparation, new writes during upload, resumable missing ordinals, exact chunk/hash retries, 202 validation restart, leased-worker crash, lost final response and subsequent receipt lookup. Expired upload restarts from frozen source under a new upload ID without deleting the last verified checkpoint. Server finalization race with takeover/deletion must recheck fence/owner in the publish transaction. Count/hash success alone must not bypass semantic validation.

Stage 4 model-based tests use a small reference state machine and randomized operations: complete workout, edit profile, add/delete note, reorder/delete split, import history, reset and file restore. Inject request duplication, network loss after commit, reordered delayed responses, partial batch failures, concurrent local edits, clock skew and long offline periods. Immutable in-flight operations keep their sealed payload/hash; only successors rebase. Assert no request can acknowledge a newer generation than it sent.

Verify aggregate all-or-nothing parent/child writes; import dependency barrier; profile waits for selected split; deleted session detaches notes; stale recreation blocked by lifetime tombstone. Feed ordering must match transactional commit order under real concurrent PostgreSQL sessions; ordinary sequence-number tests do not prove the per-dataset watermark design. Server page may not split aggregate; local cursor and applied graph commit together. Duplicate revision with unequal hash raises incident. Dirty inbound conflict stops before cursor advances. Lost-response echoes query receipt before creating false conflicts.

Test 401 refresh-once, 403 stop, classified 409, 410 cursor reset, 413/422 permanent block, 426 cloud update required, 429 Retry-After and jittered network/5xx backoff. Verify device clock changes cannot override revisions or extend writer authority. Expired-feed recovery preserves dirty local branch, requires pinned checkpoint and cannot resurrect tombstoned IDs.

Stage 5 tests remain a separate gate: simultaneous offline new workouts, same-workout edit conflicts, delete/edit conflict, routine reorder forks, active workout handoff and different timezones. Random histories must converge under each explicitly approved conflict policy while retaining conflicting user work. No Stage 4 pass authorizes automatic last-write-wins.

## Scale, latency and operational drills

Use synthetic datasets of 0, 1, 500, 5,000 and 20,000 workouts, plus large imported JSON/notes and a dataset near and beyond the proposed 256 MiB limit. Include a single aggregate larger than a chunk and request ceiling. Measure peak memory, longest UI task, source-lock duration, backup/restore elapsed time, temporary disk amplification and DB validation worker capacity on oldest supported physical iPhone and a contemporary device. Generate fixtures outside the app's live writer transaction. Over-limit produces explicit supported recovery/export options, never truncation.

Gate p95 additional local commit overhead ≤10 ms and no new main-thread task >50 ms on agreed reference traces; Stage 4 p95 active valid-auth sync lag ≤60 seconds. Use realistic after-work burst/20× mean traffic and queued first backups, rate-limit sharing/public import separately from cloud. Assert pagination and streaming stay bounded as histories grow. Reconcile measured compressed/uncompressed byte ratios and query/index costs with [08](08_COSTS_AND_OPERATIONS.md); revise the estimate if limits fail.

Run monthly isolated provider PITR/independent-export recovery drills at launch, before major schema changes, and quarterly only after stable evidence. Record actual RPO/RTO against proposed ≤5 minutes/≤4 hours for PITR and ≤24-hour independent export freshness. Recover auth bindings as well as workout records, replay deletion suppression registry, rotate epoch/fences, and run an actual app restore. Test provider/account loss and a corrupt latest checkpoint with previous checkpoint recovery. Drill data never becomes production and is purged afterward.

Deletion drills race account purge with upload/finalize/restore; confirm immediate access denial, live purge, retained-copy expiry and deletion-ledger replay after disaster recovery. Domain deletion and account deletion are distinct. Validate signed-in device local-data choices do not accidentally issue another user's remote deletion. Verify existing public routine shares remain governed by their separately documented immutable legacy policy, not falsely promised deleted by a private-cloud purge.

## Required release evidence

For each shipped stage retain CI run IDs, clean app/backend build identifiers, fixture manifest hashes, migration/restore adapter versions, test-device/OS matrix, signed physical-device interruption results, restricted-role authorization run, measured performance traces, restore drill report and privacy/security review. Fail launch for any unexplained invariant violation, cross-owner access, false complete receipt or silent source mutation. Cohort metrics and rollback rules are in [09](09_MIGRATION_AND_ROLLOUT.md).

The 288-pass baseline establishes useful local foundations. Every new cloud, preference-bridge, pointer-activation, provider and failure-injection test above is still to be implemented and executed; this document does not turn proposed coverage into evidence.
