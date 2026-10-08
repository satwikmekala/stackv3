# Backup and restore

The launch promise is: recover the completed workout history and saved configuration included in the last **verified** cloud backup. Active workouts and unsaved drafts remain on this device in the first release. No architecture recovers data deleted before it was uploaded. A durable database acknowledgment is also not a promise of zero loss in a catastrophic provider failure; [operations](08_COSTS_AND_OPERATIONS.md) defines separate disaster recovery targets.

## Existing evidence and gaps

`store/workoutBackup.ts:6` enumerates local tables; capture runs within a SQLite transaction; restore validates before DELETE and checks foreign keys and integrity in a transaction. `features/settings/data.ts:106` additionally restores four preference stores with compensating rollback. That compensation does not survive every process kill between stores. The file format is a foundation, not a cloud protocol. Current file import is capped at 50 MiB, accepts certain schema 21–24 upgrades, excludes drafts and rejects active sessions. Cloud adapters need streaming, structural fingerprints and durable restoration state.

The complete required source set is listed in [01](01_EXISTING_DATA_INVENTORY.md). Keep imported_* evidence, measurement snapshots, canonical kg, original IDs/order, completed/retroactive flags, notes, saved splits including edited Stack plans, profile and portable preferences. Derived PRs/progression/Build are verified by recomputation. Templates/catalog rows are initially retained; exclude only proven rebuildable caches, transient receipts, credentials, notification schedules and animation markers. Old imported facts must not be silently reduced to only the subset representable in current workout tables.

## Consistent snapshot format

A backup is an immutable manifest plus canonical chunks. Envelope fields:

```json
{
  "format": "stack-cloud-backup", "version": 1,
  "dataset_id": "uuid", "source_device_id": "uuid",
  "source_generation": "812", "source_revision": null,
  "sqlite_schema_version": 24, "schema_fingerprint": "sha256",
  "catalog_contract_version": 1, "derivation_contract_version": 1,
  "tables": [{"entity":"sessions","rows":"500","hash":"sha256"}],
  "chunks": [{"ordinal":0,"bytes":262144,"rows":180,"hash":"sha256"}],
  "root_hash": "sha256",
  "exclusions": ["active_workout", "unsaved_drafts", "device_runtime_state"]
}
```

This is illustrative structure, not actual user data. Envelope version defines exact allowed fields, field order-independent canonical key sorting, UTF-8 encoding, binary64 round-trip numeric representation, UUID normalization, explicit nulls, stable table/key order and hash algorithm. Hash canonical uncompressed bytes; cap decompression/row/string limits. Include source local keys, cloud IDs, relationships, original date strings and import payload versions. A snapshot hash detects transport/storage changes; it is not proof a malicious client told the truth about real workouts. TLS/authorization and semantic validation are separate controls.

The v1 chunk body is `{entries:[{table, rows:[...]}]}` using the exact local table/column names from the reviewed SQLite schema, plus reserved `cloud_ids`, `cloud_dataset`, `cloud_preferences` and local counter metadata sections. Rows retain local PK/FK values; `cloud_ids` records the explicit parallel UUID mapping for every replicated entity and composite key. Do not substitute cloud-normalized field names inside this v1 portable format. Imported `data` remains its original text in initial snapshots, including unknown source fields. The manifest declares each table exactly once, even when empty; chunk entries may partition a table at row boundaries. Ordinals concatenate in manifest order, rows sort by canonical primary key, and duplicate rows/unknown tables are rejected. Hashes cover ordered table records and all reserved sections, not just workout rows. Staging-only journal/outbox/session tokens never enter the snapshot.

Stage 4 materializes this same portable contract from normalized tables through a reversible adapter and a stored local-projection-key map. Single-dataset original integer IDs/counters are preserved; newly authored rows supply their originating local keys. JSONB imports reserialize using the source payload's semantic canonicalization when raw source text is no longer available; the adapter version explicitly declares that whitespace/key order is not source meaning. Multi-origin local-key collision handling is a Stage 5 format/adapter gate, never guessed during launch restore.

SQLite tables and portable preferences must share one snapshot boundary. Before launch migrate the four included portable preference keys to a versioned SQLite sidecar as authoritative state; existing AsyncStorage readers become a rebuildable projection. A durable bridge journal copies, validates and records adoption before switching writes. Until this bridge is proven, block backup rather than claim cross-store atomicity. Device permissions never migrate with preference values. This is proposed future implementation, not a current property.

Snapshot creation uses a consistent SQLite online backup into a private temporary database or a measured read-transaction export. Never copy an open database file without its journaling semantics. [SQLite's backup API](https://www.sqlite.org/backup.html) provides a consistent destination copy; implementation must prove Expo57 API behavior on a physical device. Capture ID mappings/preferences/local generation in that copy. Expensive encoding/compression occurs from the copy outside the live writer lock. Local logging continues during upload; a new workout makes the snapshot stale without invalidating it. First backup is offered after active workout completion; if a new workout begins during preparation, pause capture/retry at a safe point, never prevent starting it.

## First backup

1. **Discover:** complete existing local initialization safely, validate schema shape and relational facts; do not invoke destructive seeding to “repair” unknown data. Preserve a consistent local recovery copy first.
2. **Authenticate:** provider login resolves internal Stack user; it moves no data. Confirm “Back up this iPhone's history to this account.” Empty cloud account is required for initial association. Nonempty cloud data enters the recovery-choice flow below.
3. **Prepare:** bind dataset and persist stable mappings transactionally; validate all required rows and the portable preference bridge. Capture frozen snapshot at local generation G; include only eligible completed history and saved entities. Required anomalies block success with recovery/export instructions.
4. **Stage:** reserve upload under current writer fence; upload resumable immutable chunks. Server accepts exact hash retries. Progress is acknowledged bytes/chunks, not queued requests. Local frozen snapshot and upload journal survive process termination.
5. **Validate:** server verifies manifest count/hash, every chunk, unique identities, allowed schema/version, FK graph, positional uniqueness, source/import mapping, completion/measurement/profile semantics. Check expected counts against decoded graph; never trust client counts alone. Run the versioned restore adapter against a disposable validation database using the same contract (server SQLite execution may be a sandboxed validation worker, not the public sharing DB). Large jobs are persisted and leased with idempotent completion.
6. **Commit:** one PostgreSQL transaction verifies owner/fence still valid, publishes immutable manifest and updates last verified pointer. Return receipt `{backup_id, root_hash, source_generation, record_counts, committed_at, format_version}`. Validation failure retains previous verified checkpoint.
7. **Confirm:** client fetches receipt if final response was lost; compare root/generation and persist receipt. Say “Backed up through [time]” with count and exclusions. If local generation has advanced, say “Backup saved. New changes are waiting.” Store a timestamp for display, never for completeness ordering.

Backup success requires **all** required entities, their dependencies and portable preferences in one validated manifest, server commit, and matching receipt recorded locally. An uncommitted chunk, accepted background task, HTTP 202, or a partially acknowledged batch does not satisfy it.

## Restore after reinstall

```mermaid
flowchart LR
  A[Fresh install and sign in] --> B[Choose verified checkpoint]
  B --> C[Download to private staging]
  C --> D[Hash and schema validation]
  D --> E[Restore to candidate SQLite]
  E --> F[Integrity and semantic comparison]
  F --> G[Atomic activation journal]
  G --> H[Reload stores and enable local use]
  H --> I[Optional explicit writer takeover]
```

1. Fresh install creates a new installation ID and shows Restore / Continue without restoring. A surviving keychain token is not proof this installation owns a local database. Empty onboarding defaults can be replaced, but any guest workout/split/note requires explicit choice first.
2. Fetch only committed backup list under authenticated owner; show counts, captured time, backup time and exclusions. Pin selected immutable checkpoint while downloading. No automatic choice of an unfinished/latest upload.
3. Check space before download: conservative estimate **live DB + candidate DB + uncompressed payload + recovery copy + 20% margin**, updating from actual sizes. Fail with a clear free-space action, never delete the live source to make room. Streaming avoids multiple giant JS arrays.
4. Download/resume numbered chunks to application-private staging; verify bytes/hash on each and root/counts at completion. Write a durable restore journal with phase and manifest ID. Never make partial history visible in the normal app.
5. Create candidate SQLite with a supported adapter, disable app seeding on the candidate, restore referenced exercises/catalog, splits/workouts/children/templates, sessions/types/exercises/sets, notes, import maps, then profile/preferences/mappings/counters. Defer FKs only within candidate transactions and run `foreign_key_check` after the full graph. Keep intentionally dangling historical source split IDs. Restore profile.active_split_id after its target. Restored cloud IDs and dataset origin are preserved.
6. Run integrity_check, typed constraints, counts and canonical re-export comparison. Account for documented lossless adapter transforms; compare before/after semantics, not only physical SQL bytes. With fixed time/timezone/rule version compare history ordering, PRs, progression inputs and Build including imported/retroactive exclusions. Current clock/timezone affects Build grouping; cross-timezone display equality is not promised without a product rule change.
7. Activate only while no workout is active. For future design use a tiny durable SQLite control database containing active database filename/owner/restore state. Close live workout connections and native consumers, atomically commit the pointer to a **fully closed and flushed** candidate; keep old file for rollback. On restart read this control pointer before opening workout store. Do not swap a WAL file by rename. Exact filesystem durability and extension lifecycle are physical-device release gates.
8. Portable preferences live in candidate SQLite; rebuild AsyncStorage projection on next startup before UI hydration. Projection failure is retryable and never reverts a valid source DB to half-restored data. Bump local account epoch, stop Live Activity, clear App Group command inbox, caches, selection/focus, handoff and draft state for replaced namespace; ensure old native commands cannot hit reused integer IDs. Never replay old widget commands after restore.
9. Mark restore complete only after store hydration and candidate checks pass. Request notification permission separately and recreate schedules only if permitted. Do not restore push tokens/OS permission results. Keep encrypted-by-device local recovery file for 7 days or until user explicitly deletes it; disclose storage use. Local-only recovery is lost on uninstall.
10. To upload from this installation, require confirmed writer takeover. It increments server fence; old phone retains offline data but cannot overwrite cloud history. Download/restore alone is not writer authorization.

If candidate validation fails, retain old active pointer, report error and offer retry/previous verified checkpoint/export existing data. If process dies after pointer commit, startup sees the complete candidate and resumes projections. If pointer commit never occurred, startup uses the old DB. A journal alone without atomic source selection is insufficient.

## Existing account plus local data

No silent union/replacement. Show both counts and account identity, with three actions: restore cloud data after preserving/exporting the local dataset; keep local data on this phone and leave cloud unassociated; cancel. For same dataset/cloud IDs, compare base checkpoint and revisions; identical records deduplicate by identity/hash, not date/name similarity. Different datasets or users remain separate even if workouts look equal. Replacing cloud history or combining independent histories is excluded from first release; provide export and a later explicit, previewed import path. “Sign in” itself grants no upload permission.

## Retention and deletion proposals

Keep at most 3 completed checkpoints: latest plus up to 2 previous checkpoints captured within the last 30 days; the latest persists until explicit deletion even if older than 30 days. Never evict the last verified checkpoint due to failed upload. Pins for active restore expire after 24 hours and can renew. Staged uploads expire after 7 days. Stage 4 feed retention is 90 days plus lifetime compact identity tombstones. Storage cost model must include retained snapshots; approval may change these values before launch.

Deleting a workout updates current state and the next checkpoint; older retained snapshots may still contain it until retention expiry. Explain this in privacy/export UI. “Delete cloud backups” removes all user-accessible checkpoints and pauses backup; it must also clear normalized current state/change payloads if the user asks to remove cloud workout data, using a dataset generation/fence reset. Account deletion blocks reads/writes immediately, purges live data within proposed 7 days and operator backups within proposed 30 days, subject to verified provider retention and applicable law. No promise of earlier erasure from immutable operator backups without evidence. Separate suppression ledger prevents restoration of deleted accounts after PITR. Detailed workflow in [03](03_IDENTITY_AND_SECURITY.md).

## Disaster scenarios

| Scenario | Expected behavior and recovery |
|---|---|
| App deleted before first backup completes | No verified recovery copy; incomplete staged upload is not offered as complete. Explain beforehand; only an existing file/OS backup may help, without promising it |
| Connection drops midway through 500 workouts | Retain frozen source + upload ID; query missing ordinals and retry exact chunks; last verified checkpoint remains available |
| Sign into an account with older history | Compare checkpoint/dataset identity; no timestamp winner. Same lineage reconciles; different lineage shows explicit choices; no upload before consent |
| Accidentally switch accounts | Pause worker/increment epoch; keep owned local namespace isolated; new account cannot adopt those rows; return to former account or export |
| Cloud backup incomplete | Never publish manifest; resume from chunks, retry validation or use previous committed checkpoint; counts show pending scope |
| Restored DB missing references | Candidate fails FK/semantic checks; old database remains active; quarantine/report opaque diagnostic and try older backup |
| Same workout local and remote | Equal stable UUID+revision/hash means one record; unequal content means conflict; similar content without shared identity is not automatically deduplicated |
| Sign out during upload | Late commits can affect only old owner under old authorization; fence/epoch checks block publication/application after revocation when observed; signing in again queries receipt |
| Device changes during migration | Incomplete local ID migration is retryable on original phone; new phone can restore only a published checkpoint; takeover invalidates original writer; no automatic transfer of unuploaded data |
| Service unavailable | Workout logging continues; pending work persists with last verified date and Retry; restore waits or guest usage starts in a separate local namespace |
| Device storage full | Fail snapshot/candidate creation safely; never remove source; local save failures explicitly shown separately from cloud errors |
| Provider rollback loses acknowledged recent revisions | Declare incident, fence writes, change history epoch, reconcile local receipts/outboxes and independent backups; disclose RPO window; never silently rewrite receipts |
