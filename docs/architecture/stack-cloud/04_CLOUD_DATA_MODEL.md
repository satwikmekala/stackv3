# Cloud data model

Status: proposed contract, 8 October 2026. No migrations have been applied. Read the [inventory](01_EXISTING_DATA_INVENTORY.md) first. Provider decision: Supabase PostgreSQL and Auth, accessed through a separate Railway cloud API. All UUIDs below use cryptographically random UUIDv4, not device clocks.

## Delivery boundary

Stage 2–3 stores immutable, versioned logical backup chunks in PostgreSQL. This is the smallest useful backup service; it does **not** require writing a general replication engine or maintaining two authoritative copies of every row. The server validates the entire logical graph before publishing a manifest. Stage 4 introduces the normalized current-state tables below and materializes verified backup checkpoints from them. Seed that current state once from the last verified backup, compare a round-trip manifest, then atomically enable incremental writes. Preserve the old checkpoint throughout. Snapshot format and stable identities are shared across both stages.

Do not deploy all future tables in Stage 1. No object store is required initially; monitor large chunk/retention growth and move immutable bytes behind the same manifest contract later. Backups of a PostgreSQL database and end-user workout backups have different recovery objectives.

## Identity and local mapping

`app_users.id` is Stack's owner identity. It is independent of Apple subject, Google subject, email, Supabase auth user ID, and installation ID. The auth binding lives in a separate table; deleting an auth provider must not cascade workout deletion. All APIs derive owner from the authenticated, approved identity. Client-supplied owner IDs never grant access.

Keep existing SQLite integer PKs and their relationships. Add sidecar tables in a future additive migration:

| Local metadata | Contract |
|---|---|
| `cloud_dataset` singleton | random `dataset_id`, nullable bound `owner_id`, association state, monotonically increasing `local_generation`, `account_epoch`, schema fingerprint, migration checkpoint |
| `cloud_ids(entity, local_key)` | unique cloud UUID, original dataset UUID, original local key; unique `(entity,cloud_id)`; local key is a canonical string for composite keys |
| `cloud_outbox` (Stage 4) | immutable operation UUID, owner/dataset/epoch, aggregate ID, generation, base revision, canonical payload/hash, state, retry metadata |
| `cloud_entity_state` (Stage 4) | aggregate ID, last server revision, local generation, dirty state; acknowledged revision separate from pending payload |
| `cloud_sync_state` | server history epoch, cursor, writer fence, verified checkpoint receipt and local generation covered |
| `cloud_preferences` | typed/versioned portable preference values, authoritative once the preference bridge migrates; AsyncStorage becomes a projection for these keys |
| `cloud_migration_journal` | named phase, input/output fingerprint, counts, manifest root, completion marker |

Assign IDs exactly once in SQLite transactions, in bounded resumable batches. A rerun reads existing mappings; it never regenerates them. `dataset_id` persists in backups and restore. A new installation gets a new `device_id`, including after OS/keychain restoration; an installation is not a data owner. Bind ownership only after explicit association. Imported `account_id` is a **source-system namespace**, not a Stack account.

A full restore into an empty installation preserves all original local integer IDs and counters initially, as well as cloud IDs and provenance. This preserves the current numeric-string session tie breakers in `store/personalRecords.ts:58` and `features/build/evidence.ts:117`. Later multi-device projection must carry a stable `history_order_key` composed of original dataset ID and original session integer. Before enabling it, update derivations to use the same tie rule on every device and prove a single-dataset result is unchanged. UUID ordering must not silently replace historical ordering. Legacy file backups have no mapping: importing one into a cloud-bound installation requires replacement/new-dataset confirmation, never heuristic content deduplication.

## Control-plane tables (Stage 1–3)

Types: `uuid`, `bigint`, `timestamptz`, `text`, `jsonb`, `bytea`. Counts/revisions on the wire are decimal strings to avoid JS integer precision loss. Client workout dates remain exact original strings; server timestamps describe operations, not when a workout happened.

| Table and primary key | Required columns and constraints |
|---|---|
| `app_users(id)` | created_at, status active/deleting/deleted, authorization_epoch bigint, deletion_requested_at; no required email/name |
| `auth_bindings(auth_issuer, auth_subject)` | user_id FK RESTRICT; unique provider binding, status; reviewed provider proof gate from [03](03_IDENTITY_AND_SECURITY.md) |
| `linked_identities(issuer, provider_subject, audience_scope)` | user_id FK RESTRICT, provider, approved_at, revoked_at; verified server-only writes; email optional display metadata, never unique ownership key |
| `devices(user_id,id)` | label, created_at, revoked_at, last_seen_at, platform, app_version; no advertising/hardware identifier |
| `cloud_sessions(user_id,broker_session_id,device_id)` | authorization_epoch, approved_identity FK, revoked_at, expiry; check on **all** reads/writes/restores, not just uploads; future Google gate adds hashed authorization grant bound to this row |
| `datasets(user_id,id)` | format_version, status, last_verified_backup_id nullable; one active dataset per user initially (partial unique index); owner cannot be changed by update |
| `writer_state(user_id,dataset_id)` | active_device_id, fence bigint, next_change_seq bigint, history_epoch UUID; locked for cloud mutations and handoff |
| `backup_uploads(user_id,id)` | dataset_id, device_id, fence, request_id, manifest_hash, format/schema fingerprints, captured_generation, state, bytes_limit, expires_at; unique `(user_id,request_id)` with payload hash |
| `backup_chunks(user_id,backup_id,ordinal)` | canonical_bytes bytea, sha256, uncompressed_bytes, row_count; FK upload; immutable, exact retry only |
| `backup_manifests(user_id,id)` | dataset_id, root_hash, version, counts jsonb, source_generation, source_revision nullable, validated_at, committed_at, restore_contract_version, exclusions jsonb; immutable; only validator can insert |
| `restore_jobs(user_id,id)` | manifest_id, device_id, expiry, state; pins checkpoint against normal retention until expiry |
| `audit_events(id)` | pseudonymous user reference, action/result/correlation ID/server time; no payload/token/note/email; limited retention |
| `deletion_jobs(user_id)` | phase, retry_at, purge_deadline, completion; separate retained minimum suppression registry prevents PITR resurrection |

Chunk receipt is not a backup manifest. A committed manifest only references immutable fully validated chunks. Finalization under the writer lock atomically inserts manifest, updates dataset pointer and stores the idempotent response. Never overwrite the only verified backup during an upload. All composite references include user_id and dataset_id where relevant. Add indices on owner/dataset/status, expiry, and every referencing FK. Separate minimal deletion suppression storage from ordinary recoverable user data; restoration runbooks must reconcile it before serving traffic.

## Normalized domain tables (Stage 4)

Each replicated row has `(user_id,dataset_id,id)` as PK, FK to dataset, `revision bigint > 0`, `deleted_at` nullable, `origin_dataset_id`, `origin_local_key`. Enforce unique `(user_id,dataset_id,entity origin)` via each table's provenance index. Use application-domain names below; payload names preserve existing SQLite columns except transformed FK IDs and explicitly described additions. Do not deduplicate names across owners.

| Cloud table → local table | Required fields beyond common columns; relations |
|---|---|
| `exercise_definitions` → exercises | name, workout_type, primary_muscle, secondary_muscle, is_custom, equipment, load_type, metric; scoped unique live name for current app compatibility; optional stable catalog_key; preserve referenced built-in definitions too |
| `custom_splits` | name, created_at_raw, updated_at_raw, is_stack_plan |
| `split_workouts` → custom_split_workouts | split_id FK, name, color, position |
| `split_exercises` → custom_split_workout_exercises | workout_id FK, exercise_id FK, position |
| `split_templates` | workout_type, exercise_id FK, position, target_reps, target_weight_kg, target_duration_s |
| `archetype_templates` | archetype, variant, exercise_id FK, position, target_reps, target_weight_kg, target_duration_s |
| `workout_sessions` → sessions | date_raw, completed_at_raw nullable, origin, archetype, secondary_archetype, both variants, intensity nullable, completed, retroactive, source_split_uuid/source_workout_uuid nullable, original source integer references, history_order_key; completed=true initially |
| `session_workout_types` | session_id FK, workout_type, position; scoped UNIQUE(session_id,position); deterministic UUID mapping from local composite key |
| `workout_exercises` → session_exercises | session_id FK, exercise_id FK, position, entry_unit, load_type, metric; **snapshot** measurement columns must not be replaced from live exercise catalog |
| `workout_sets` → sets | session_exercise_id FK, set_index, reps, weight_kg, target_reps, target_weight_kg, completed, skipped, bonus_type, value_origin, duration_s, target_duration_s |
| `exercise_notes` | exercise_id FK, session_id nullable FK, text, created_at_raw; deletion of session detaches note rather than deleting its text |
| `user_profile` → profile(id=1) | one per dataset; name, weekly_goal, program_weekly_goal, experience_level, training_days integer[], onboarding_completed, auto_increase_weight, weight_increment_kg, weight_increment_lbs, weight_unit, active_split_id nullable FK, program_mode, three_day_structure, weight_unit_confirmed, reminders_enabled, reminder_time |
| `portable_preferences` | one row per known key, payload version + typed JSON; muscle colors, watched lifts, haptics/Live Activity preference, reduced Build effects; device permission results excluded |
| `imported_exercises` | source_account_id, source_id, exercise_id FK, data jsonb; unique source pair |
| `imported_routine_groups` | source_account_id, source_id, split_id FK; unique source pair |
| `imported_routines` | source_account_id, source_id, workout_id unique FK, data jsonb; unique source pair |
| `imported_routine_exercises` | workout_exercise_id unique FK, data jsonb |
| `imported_workouts` | source_account_id, source_id, session_id unique FK, data jsonb; unique source pair |

Imported JSON is versioned authoritative evidence, including information not representable by current sets. Preserve unknown **source payload** fields losslessly under its versioned contract, while rejecting unknown envelope/control fields. Do not retain source access tokens or uploaded raw import files. Validate data limits and relation matches before accepting payloads.

Built-in templates are retained in first backup because present local rows, catalog names and numeric IDs affect reconstruction; a future format can replace proven immutable defaults with a pinned catalog version plus deviations. Do not assume today's seeds reconstruct yesterday's data. `sqlite_sequence` is local reconstruction metadata, not a replicated domain entity. Cloud backups include counter maxima for safe faithful restore. No tables for PRs, volume, weekly queues, Build geometry or session view caches.

Historical split references intentionally have no mandatory FK: deleting a routine must not delete a workout. Keep nullable provenance and original keys even if the source routine no longer exists. In contrast, exercise/set parent FKs are mandatory. Active workout and focus pointer are device-local and absent from first-release cloud backups; excluded notes belonging to an active workout wait for completion. Unsaved drafts/OS notifications/widget state are excluded explicitly.

## Constraint and mutation rules

- All child FKs use `(user_id,dataset_id,parent_id)`; cloud SQL must make cross-account references impossible. RLS forced where supported; API runtime role is neither table owner nor BYPASSRLS, and `SET LOCAL` owner context is set only after token verification inside a transaction. Tables are in a private schema and direct mobile Data API grants are absent. Pool checkout cannot retain identity.
- Parent-child writes use one aggregate transaction. A workout aggregate contains session, ordered type rows, exercises, sets and imported workout facts. Notes are separate aggregates; profile is a singleton aggregate; a split contains its workouts/exercises/import metadata. Import completion may span multiple aggregates; dependency barrier ensures no manifest publishes a partial import.
- Scoped unique `(parent_id,position)` / `(parent_id,set_index)` constraints are deferrable for reorders. Existing duplicate positions must fail preflight with a report; never discard rows. Legacy repair, if approved, uses stable position+local ID ordering on a copy and records a compatibility transform.
- Preserve SQLite REAL values with binary64 round-trip serialization and finite-number validation; PostgreSQL double precision for weights avoids an arbitrary decimal rounding migration. Canonical kilograms, separate entry/display unit; never reconvert on sync. Canonical JSON must round-trip binary64; normalize negative zero. Imported raw decimal/string data stays in imported JSON.
- Match actual enum contracts; profile weekly_goal 0..7 versus program_weekly_goal 1..6. Validate days unique 0..6, time HH:mm, notes 1..existing max, valid color enum, positive IDs, safe integer counts, known origin/value_origin/metric. Do not invent a required non-null completion time for old completed sessions.
- Check metric semantics on newly authored records. Legacy anomalous data is retained in a local recovery copy and blocks a full-success claim until a reviewed lossless transform exists. Current backup validation accepts some domain anomalies; SQL constraints alone are insufficient.
- No implicit SQL hard cascades from user/provider deletion. Account purge is an explicit audited job. For domain delete, write a tombstone and child removals plus detached-note updates as one aggregate change; historical source links remain provenance. Exercise deletion is rejected while history requires it.

Illustrative constraint shape, **not deployment SQL**:

```sql
PRIMARY KEY (user_id, dataset_id, id),
FOREIGN KEY (user_id, dataset_id, session_id)
  REFERENCES workout_sessions(user_id, dataset_id, id),
UNIQUE (user_id, dataset_id, session_id, position)
  DEFERRABLE INITIALLY DEFERRED,
CHECK (entry_unit IN ('kg','lbs'))
```

## Incremental bookkeeping (Stage 4)

`operation_receipts(user_id,dataset_id,operation_id)` contains request hash, result revision/sequence and result code. Same ID + different hash is 409. Keep receipt IDs/hashes for dataset lifetime initially; compact large responses later without losing replay rejection.

`change_log(user_id,dataset_id,seq)` contains aggregate type/id, revision, operation_id, upsert/deletion payload, hash and server time. An aggregate envelope is indivisible. `tombstones(user_id,dataset_id,entity,id)` keeps deletion revision and sequence; retain identity tombstones for dataset lifetime initially to prevent resurrection. Large deleted payloads follow retention policy, not indefinite tombstone retention. `sync_devices` records cursor/epoch and revoked status; never allow one device's progress to purge another device's required history implicitly.

Changes use a per-dataset transactional sequence counter under `writer_state ... FOR UPDATE`, not an ordinary PostgreSQL sequence as a visibility watermark. Commit order must match feed order; [PostgreSQL sequences are not rolled back](https://www.postgresql.org/docs/current/functions-sequence.html). A 90-day feed retention proposal requires 410/reset to a verified snapshot for older clients. UUID tombstones still protect identity after feed compaction.

## Format evolution

Maintain independent versions: SQLite schema+structural fingerprint, portable backup format, imported source payload version, protocol major, server schema, derivation version. Support N and N-1 network contracts during rollout; retain decoders for every retained snapshot or migrate a copy and prove semantic equality before retiring a decoder. Unsupported newer backup yields `UPGRADE_REQUIRED`; never attempt best-effort field dropping. Server schema changes are expand/backfill/verify/contract; contract only after no supported client uses the old shape. No cloud outage or forced client update may stop offline workout logging.
