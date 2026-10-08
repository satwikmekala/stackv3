# Migration and staged rollout

Proposed implementation sequence, 8 October 2026. The objective is to avoid losing or reinterpreting existing data, including data created during outages. This is a **zero-data-loss engineering intent**, not an absolute guarantee against hardware loss before upload or catastrophe beyond the recovery objectives in [08](08_COSTS_AND_OPERATIONS.md). No feature or migration described here has been implemented by this assignment.

## Release sequence and exit gates

Stages refer consistently to [04](04_CLOUD_DATA_MODEL.md), [05](05_SYNC_PROTOCOL.md) and [06](06_BACKUP_AND_RESTORE.md). Public availability of a backup promise requires a proven restore path: Stage 2 uploads can be internal/beta before Stage 3, but do not advertise public recovery while Stage 3 remains unverified.

| Stage | Deliverables | Exit evidence / accountable role |
|---|---|---|
| 0 — Protect the local baseline | Archive release-era DB fixtures; safe preflight; cloud metadata sidecars; durable ID mapping; authoritative preference bridge; atomic database selector; instrument local commits and source invariants | Mobile/database lead signs fixture parity, interruption matrix, physical-device durability and local-only behavior; no cloud onboarding required |
| 1 — Optional identity | Apple; evaluate/validate Google; internal owner mapping; secure sessions; account-resolution gate; explicit dataset association; account/device deletion and sign-out | Security lead approves provider proof/account-linking behavior, negative authorization matrix and deletion runbook; product signs guest flow parity |
| 2 — Manual cloud backup | Frozen consistent snapshots, bounded transport, immutable chunks, validation worker, committed receipt, scoped retention; no general replicated row tables | Backend lead proves resumed upload/idempotency/fence tests and count/hash/graph parity; internal restores of every committed fixture succeed |
| 3 — Safe user restore | Staging DB, compatibility adapters, semantic verification, atomic pointer activation, runtime invalidation, preference projection, explicit writer takeover | Mobile + QA lead sign real-device reinstall/low-storage/kill tests and two successful operational recovery drills; recovery copy survives activation |
| 4 — One authorized writer sync | Normalized current state seeded from verified checkpoint; transactional outbox/revisions/tombstones/feed; dependency chains; periodic verified checkpoints | Backend/mobile leads prove duplicate/reorder/rollback/fence/convergence tests, migration parity and no cloud-induced workout-save regression; separate canary rollout |
| 5 — Multi-device bidirectional sync | Explicit conflict UX, simultaneous workout policy, deterministic historical ordering/calendar rules, multiple writers | Separate architecture/product/security approval and adversarial convergence test suite; single-writer design does not imply readiness |

Do not assign calendar dates until Stage 0's historical-fixture and native-control feasibility work is complete. Maintain issues with named owners, input/output contracts and reproducible exit evidence rather than an optimistic week estimate.

## Additive local adoption

1. **Inventory before opening an unknown DB:** inspect file existence, recorded version and structural fingerprint read-only where possible. Production initialization currently has destructive fresh-seed and development fallback paths; never feed an unknown recovered DB into those as a repair procedure. If the app has already completed its known current initialization, validate that result but still preserve a pre-cloud-migration recovery copy. A future integration must protect genuinely old upgrades before their first current initializer run.
2. **Capture recovery:** use a supported consistent SQLite backup, verify it opens, record encrypted-by-device private filename and checksum in the control journal. Check sufficient space. No user data content in logs. Disk-full leaves source intact and cloud adoption paused. App launch/workout logging must not require a successful cloud preparation.
3. **Classify supported schema:** match version **and shape**, FKs/indexes/triggers and known additions. Reject unknown future versions for cloud adoption. A populated version-0 DB is a recovery case; never seed over it. Record any preexisting anomalies without silently deleting/deduplicating rows.
4. **Add metadata:** create sidecar tables from [04](04_CLOUD_DATA_MODEL.md), random dataset ID and unassociated owner state. Assign UUIDv4 mappings in bounded transactions. Canonical composite keys encode table/key type unambiguously; do not join strings with collision-prone separators. Unique constraints arbitrate races. Each batch and journal cursor commit together; reruns retain every prior ID.
5. **Preserve identity/semantics:** retain all existing PKs/FKs, source integer references, sequence counters, date strings, kg binary64 values, targets, skipped/bonus flags, original import JSON and hidden Stack plans. Do not add strict positional constraints until duplicate-position preflight has a reviewed, lossless resolution. Cloud IDs alone must not change PR/Build tie-breaks.
6. **Account-independent local generation:** maintain cheap dataset generation for backup-worthy changes even as a guest, without networking or creating an account. Late mapping allocation and writer-unit integration must cover imports and every mutation entry point, not only the Zustand store. Backup freezes a generation, so later local writes truthfully show pending changes.
7. **Complete and verify:** compare source/restored logical manifests, counts, raw values and derived outcomes at fixed time/timezone/rule version. Publish completion only when the durable journal and mapping coverage agree. `owner_id` stays null until separate explicit user consent and server association CAS succeed.

Recovery copies contain sensitive training data; retain privately with device file protection for the proposed 7 days/explicit deletion policy in [06](06_BACKUP_AND_RESTORE.md), record age/size for cleanup, and never count a local copy as cloud protection. Uninstall removes it. Cleanup must not delete the only usable dataset or an active restore pin.

## Portable preference bridge

The four keys currently included in manual backups span AsyncStorage; the new atomic snapshot contract requires their authoritative values in the workout SQLite candidate. Migrate `stack-settings-v1`, `stack-muscle-colors-v1`, `stack-lift-progress-v1` and `stack.build.reduceEffects.v1`. Onboarding/program/split drafts, ceremonies and OS permissions are outside this bridge.

| Durable phase | Required operation and restart behavior |
|---|---|
| `legacy` | AsyncStorage authoritative. Pause preference edits briefly, flush known writes, read/validate all four keys, retain null/default semantics. Failed read must not replace unknown values with defaults |
| `shadow_copied` | One SQLite transaction stores exact typed/versioned values, source hashes and bridge journal. Read back/re-encode and compare. Legacy readers still authoritative; backup remains disabled |
| `verified` | Compare SQLite shadow to freshly flushed source under the same preference write gate; changed source retries capture. Journal records source revision/hashes and successful validation |
| `sqlite_authoritative` | Atomically commit authority marker plus portable values in SQLite. From this point all relevant writes update SQLite value+generation in one transaction; AsyncStorage is a projection and never the recovery source |
| `projection_pending/ready` | Rebuild projection from SQLite before UI hydration; retry failed writes. Reader adapters must respect authority marker and never expose a stale old account's values while projection is pending |

A process kill before authority commit resumes legacy/shadow verification; after commit resumes SQLite reads and projection. Never roll back authority merely because AsyncStorage projection failed. No uncontrolled dual writes with “last timestamp wins.” Startup checks the durable authority marker before loading preference stores. Old binaries that only understand AsyncStorage cannot safely edit the new authoritative dataset; pin a compatible runtime/update policy or present recovery/export until upgraded. A feature flag rollback must not re-enable legacy authority.

Changing active datasets automatically changes authoritative preference scope. Device-specific permission and lock-screen consent are checked again on the target installation; copying a preference is not permission authorization.

## Restore activation and runtime isolation

Implement the tiny durable SQLite control database from [06](06_BACKUP_AND_RESTORE.md) before any replace-in-place cloud restore. It selects a filename/dataset owner and records a pending activation phase. Stage downloads privately, restore into an unopened candidate, validate, close and flush candidate. Keep the prior dataset and manifest.

At activation, briefly gate new workout starts, verify no workout is active, stop the sync worker and native consumers, close handles, then commit the pointer transaction. If a workout starts before the gate is acquired, postpone restore activation; do not discard it. After commit re-open the selected source, increment local epoch, rebuild preferences, invalidate caches/drafts/handoffs for the replaced namespace and clear old Live Activity command inbox before normal UI becomes available. Prove no native callback or stale JS response can mutate reused integer IDs across this boundary.

A crash before pointer commit selects the old complete DB; after commit selects the complete candidate and resumes projection/hydration. Validate actual iOS file flush/directory lifecycle and SQLite WAL handling; renaming a live database or claiming a JSON journal is atomic is insufficient. Boot selection must happen before existing `initializeWorkoutDatabase`. If new-source hydration fails after pointer commit, retain both files and surface recovery; an automated return to old data is allowed only before new local writes and with journaled proof, never after silently losing new workouts.

## Transition to incremental single-writer sync

Stage 4 must not create a second competing authoritative graph while snapshot backup remains active. Pause the affected dataset's cloud writes under writer lock, pin its last verified checkpoint, decode into normalized current-state tables, retain exact cloud IDs/provenance, then canonical re-export and compare. Preserve snapshot, owner and generation throughout. Atomically mark normalized mode enabled and advance fence/history epoch as required by the migration contract. A failed build leaves snapshot mode intact.

If the device has newer local data than the checkpoint, require an eligible verified snapshot or preserve a provable outbox delta before mode switch; do not mark unuploaded history synchronized. Cloud migration mode transitions are idempotent jobs with leases/journals, not long-lived locks around network transfer. After activation, device uses epoch-aware rebaseline and starts its dependency-ordered outbox. Verified backup status changes only after subsequent checkpoint validation, not each operation receipt.

Mutation coverage includes note delete/detach, exercise rename/delete, routine reorder/delete, imported facts, profile selection, local file restore, reset and newly completed workout aggregate. A metadata failure must pause cloud tracking, durably mark full rescan required and preserve workout via tested local-only path; disk-full failing the actual workout commit still reports local failure. Exactly identify which exception classes permit fallback; do not catch arbitrary SQL corruption and claim a successful save.

## Flags, rollout cohorts and stop conditions

Use independently scoped server capabilities: `account_ui`, `dataset_association`, `backup_upload`, `backup_finalize`, `restore_download`, `restore_activate`, `single_writer_sync`, `multi_device_sync`. `multi_device_sync` remains false. A local capability/migration-version gate must also pass; server flags cannot authorize an unsupported local schema. Sign-out/deletion/revocation checks override all positive flags. Stale flags default to paused cloud mutation; existing data and local workout logging remain available. Do not block an already verified candidate recovery solely because the remote flag service is unavailable; use locally validated supported restore policy.

1. Internal synthetic accounts and developers: all fixture paths, injected kills, two end-to-end restore drills and a seven-day canary.
2. Invited beta: start ≤50 cloud-enabled users; require at least 100 successful backup attempts and 30 complete validated restores across supported device/OS classes over ≥7 days, plus no unresolved severity-1/2 data issue. Repeat synthetic load/abuse tests independently of small cohort traffic.
3. Gradual public expansion: 1%, 5%, 25%, 100% of eligible cloud opt-ins, minimum 48 hours at each step and ≥7 days at 25%. Advance only when enough representative observations exist; low volume extends the hold, not the confidence claim.
4. Stage 4 repeats the canary cycle and changes user copy to explain one-device updates. Stage 5 never piggybacks on a flag without its own shipped conflict UX and data model validation.

Proposed gates: zero count/hash/FK mismatches and unauthorized accesses; zero observed cloud-induced local save failures; ≥99.5% eligible explicitly requested foreground backups verified within 5 minutes; ≥99% supported adequately provisioned restore attempts succeed; local commit p95 overhead ≤10 ms and no new main-thread task >50 ms in agreed large-history reference-device traces. Separate user cancellation, insufficient storage, auth loss and network loss in denominator reporting; do not hide them from product metrics. Stage 4 adds p95 foreground sync lag ≤60 seconds. These are initial internal gates, not published SLAs; revise with measured baseline and owner signoff, never quietly relax after failures.

Immediately stop expansion/new mutations for any suspected cross-owner data, lost acknowledged data, ID reassignment, false success receipt, restore activation corruption or derivation mismatch outside a documented transform. Alert according to [08](08_COSTS_AND_OPERATIONS.md), preserve evidence and keep healthy reads/recovery available unless authorization itself is compromised.

## Rollback without destructive downgrade

Disable association/upload/finalization/sync independently; keep local writes, existing private export and authorized verified restore available. Freeze affected backend dataset generations if corruption suspected. Retain local dirty data, outboxes, mapping sidecars, candidate/recovery files and last verified manifests. Never clear queues to remove an error badge.

Server rollback uses expand/backfill/contract compatibility: deploy N/N−1 readable schema first, retain old decoders for all retained checkpoints, and roll back code only to a build compatible with committed data. Device rollback means a forward corrective migration or cloud feature disablement, not DROP COLUMN or wholesale restore of an older dataset over new workouts. Older application binaries must not operate on unsupported pointer/preference authority semantics.

PITR is an incident, not routine application rollback. Restore in isolation, replay deletion suppression registry, validate manifests/identity bindings, rotate history epoch/fences and reconcile outstanding client receipts/dirty data before serving. Publish known exposure relative to demonstrated RPO/RTO; do not claim all acknowledged generations survived without verification. Release resumes only after root cause, affected-scope reconciliation, regression fixture and independent restore drill are recorded.
