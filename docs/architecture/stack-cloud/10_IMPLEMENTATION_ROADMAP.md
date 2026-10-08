# Implementation roadmap

Planning only. The package is an engineering contract, not authorization to provision, change native entitlements, install dependencies or deploy. Stage gates are cumulative. Complexity estimates are engineering effort ranges for an experienced small team, not delivery commitments; security review, founder decisions, platform approval and defect repair can extend them.

The first public release comprises Stages 0–3: **optional Apple identity, explicitly requested verified snapshot backup, and tested reinstall restore**. Stage 1 alone is an internal milestone. Shipping upload without tested recovery is not a production backup release. Google linking, continuous synchronization and live multi-device workout continuity are separate gates.

## Stage 0 — Prove the local preservation and provider contracts

**Objective:** remove the highest-risk unknowns before writing account UI or cloud schema. First implementation task is a read-only canonical capture/restore harness over historical SQLite fixtures, plus a native proof of consistent snapshot and crash-safe activation. It must preserve current IDs, imported facts, units, preferences and history-derived results. This is a future task; no harness is implemented by this document.

**Independent slices:**

1. **0A Historical fixture corpus:** fixtures for actual reachable migration branches and structural variants, imports, legacy null values, duplicated positions, active sessions, edited built-in plans and large history. Record expected counts/derived results before any migration. Unknown shapes quarantine; never invoke reseeding as repair.
2. **0B Canonical contract:** versioned graph/envelope/canonicalization implementation and round-trip comparator. Retain original IDs/counters; separate format, SQLite schema and derivation versions. Review what exclusions mean in user-facing copy.
3. **0C Native persistence spike:** temporary database snapshot while workout writes continue; process kills during control-pointer activation; AsyncStorage preference bridge; stale App Group commands and Live Activity cleanup.
4. **0D Identity/security spike:** staging-only Apple proof/account binding, malicious JWT/nonce/replay tests, Supabase automatic-linking behavior and pool identity isolation. Google remains disabled until linking proof meets document 03.
5. **0E Operations spike:** staging cross-provider TLS/connectivity, restored synthetic account, PITR and independent export drills; profile size, compression, peak memory and validation CPU.

**Repository changes:** future tests alongside `tests/workoutPersistence.test.cjs`, fixture utilities around `store/workoutBackup.ts`, `store/workoutDatabase.ts`, `features/settings/data.ts` and four preference stores. Put portable schema/canonicalization code in a shared pure module, separate from UI and server runtime. Add documentation of measured baseline. Existing tests must not acquire live provider credentials.

**Database:** disposable fixture SQLite/candidate files and isolated test Postgres only after implementation authorization. No production migration. Design additive sidecars and control-pointer schema, but validate before shipping.

**API:** freeze OpenAPI/JSON Schema examples for `/v1/cloud` and error codes; create deterministic fake transport. Confirm 202 means persisted pending work, not backup success.

**Security/tests/acceptance:** zero source mutations during capture; exact required-field round trip; every crash point leaves either old or fully validated candidate selected; forged or wrong-owner access fails; inspect token and telemetry leakage; measured 500-workout and maximum-supported histories. Exclusions cannot accidentally remove completed rows. Recompute PR/Build with pinned date/timezone/algorithm fixture.

**Rollback/dependencies/approval:** discard isolated outputs; existing app untouched. Depends on documents 01–06. Founder approves provider, region, scope/exclusions, privacy/retention and budget. **Complexity: high, roughly 2–4 engineer-weeks.** Failure here changes the plan rather than lowering integrity standards.

## Stage 1 — Optional identity and safe ownership

**Objective:** Apple sign-in, renewal, reauthentication, sign-out and deletion work, while guest logging remains unchanged and login moves no workout data.

**Slices:** 1A secure session adapter and native configuration; 1B Stack account mapping/verified-provider gate; 1C Settings account states and association-preview UI; 1D deletion/revocation/audit lifecycle. A recent-auth control must be a verified server capability, not a client boolean.

**Repository:** proposed `features/account/` and secure credential adapter; Settings screens/copy; native Expo config and provisioning only in the future implementation task. Audit existing `@supabase/supabase-js` usage and version before adding another SDK. New stateless Railway cloud entry point/service, shared validation/error helpers and server auth tests; keep the current public-share runtime/volume independent.

**Database:** deploy only `app_users`, approved auth/provider bindings, devices, audit/deletion control-plane tables and restrictive SQL roles/policies. Independent Stack UUID owns records; provider-email changes do not alter ownership. A local association sidecar may record identity state but cannot upload.

**API:** `/account/resolve`, `/devices`, account summary, reauthentication, session/device revocation, export/deletion job status. Dataset association contract may return preview/blocked state before Stage 2 is enabled. All hidden cloud features reject requests when disabled.

**Security/tests/acceptance:** nonce/state/audience/issuer/expiry/revocation and token storage tests; no account enumeration; switch-account/sign-out races; Keychain survives reinstall; Apple hidden email; existing auth user; identical provider emails; deleting auth identity does not cascade workouts. Physical iPhone signed-build login succeeds. Public-share APIs and guest workout tests remain unchanged. Apple-only release decision must be encoded in server capability checks, not just a hidden button.

**Rollback/dependencies/approval:** turn off enrollment/login promotion, retain existing sessions/account deletion routes where appropriate; do not delete mappings. Guest/local UI remains usable. Depends on 0D and secure storage/ownership decisions. Founder approves Apple-only launch, account recovery policy and reviewed linking gate. **Complexity: medium-high, 2–4 engineer-weeks.**

## Stage 2 — Complete first backup

**Objective:** a manually requested frozen snapshot is fully validated, committed and truthfully labeled. New local work during upload never changes the immutable snapshot.

**Slices:** 2A resumable ID mapping/preferences bridge and snapshot preflight; 2B bounded uploader/journal; 2C cloud chunk staging/validation worker; 2D atomic manifest publication/receipt and Settings status; 2E retention and account export/deletion coverage.

**Repository:** additive mapping/journal/preference sidecars integrated with `store/workoutDatabase.ts`; canonical capture adapter built on `store/workoutBackup.ts`; mutation-generation hooks for all eligible data, including `features/import/persistence.ts` and preference setters. This stage tracks dirty generations; it does not require a transactional replication outbox. Add proposed `features/cloudBackup/`, server cloud validator/job worker and contract fixtures. Catalog/shared code generation must be deterministic and freshness-checked where reused.

**Database:** datasets, writer state/fence, immutable chunks/uploads/manifests, restore pins, migration metadata. No normalized workout cloud tables yet. Idempotent chunk writes, owner-scoped FKs/RLS, immutable publication, previous verified checkpoint retained. Bounded persisted validation jobs survive process death; cleanup cannot delete committed or pinned generations.

**API:** dataset summary/associate; create upload; chunk PUT; query missing ordinals; finalize/status/receipt; committed checkpoint list. Use document 05 limits, exact-retry hashes and caller fence. Store immutable response receipt in same transaction as manifest pointer publication.

**Security/tests/acceptance:** interruption at every chunk/validation/commit boundary; lost responses; hash/idempotency mismatch; owner/fence changed mid-upload; oversized/decompression bombs; malformed/corrupt/FK/ordering graphs; upload expiry; concurrent local saves. Receipt counts/hashes match decoded required graph. All user-visible success comes from verified receipt; error leaves previous backup available. PITR/export jobs and alerts exist before external beta.

**Rollback/dependencies/approval:** disable new uploads/finalization, retain downloads/status/deletion and every completed backup; preserve frozen local copy and journal for retry. Never remove source or reinterpret failed chunks as a backup. Depends on 0A–0E and Stage 1. Founder approves explicit manual backup, active-workout exclusions, limits, 3-checkpoint/30-day policy and launch operations budget. **Complexity: high, 3–5 engineer-weeks.**

## Stage 3 — Reinstall restore and public release

**Objective:** a new installation recovers a verified backup without exposing partial data, wrong ownership or stale native commands.

**Slices:** 3A download/pin/resume and space preflight; 3B candidate reconstruction and semantic validation; 3C atomic pointer activation plus projection/native cleanup; 3D account-plus-local-data choice and explicit writer takeover; 3E canary/TestFlight and operator recovery drills.

**Repository:** candidate restore adapter/control-database startup in the workout database boot path; Settings/account recovery screens; derived-store/cache reset; App Group command-generation checks and Live Activity cleanup; existing file import/export regression tests. File restore into a bound dataset needs explicit replacement/new-dataset rules, not an untracked mutation.

**Database:** restore jobs/pins plus durable local restore journal/control pointer. No cloud normalized graph needed. Candidate has original integer IDs/counters and stable cloud IDs. Preference values are candidate SQLite authority; AsyncStorage is a retryable projection.

**API:** create restore job; fetch manifest/chunks; status/expiry; explicit recent-auth `/devices/takeover`. Reading or restoring never implicitly takes the writer fence.

**Security/tests/acceptance:** physical-device uninstall/reinstall and real provider login; low space; background/force quit; missing/corrupt chunk; unavailable provider; pinned retention; last-millisecond new workout; crashes before/after pointer commit; old account widget command after ID reuse; history/units/import/PR/Build comparison. Every interrupted attempt leaves a usable prior DB or valid candidate, never a half-restored live graph. Meet measurable gates in document 11 before public backup claims.

**Rollback/dependencies/approval:** stop restore enrollment if unsafe, preserve published checkpoints and old local recovery file; roll forward a compatibility fix. A client version unable to open selected DB/control metadata must not be offered as rollback. Disabling cloud cannot erase local data. Depends on Stage 2 and successful 0C proof. Founder approves recovery UX/local-file retention, support coverage, rollout cohort and release language. **Complexity: high, 3–5 engineer-weeks.**

## Stage 4 — Continuous one-device synchronization

**Objective:** one authorized device sends transactional incremental changes while local logging stays independent; only validated checkpoint receipts advance last-verified-backup status.

**Slices:** 4A mutation unit-of-work/outbox and full-rescan fallback; 4B normalized cloud schema and initial checkpoint materialization; 4C idempotent push/change feed; 4D inbound/echo/reset handling; 4E automatic checkpoints, monitoring and fenced device replacement.

**Repository:** all mutation paths in `store/workoutDatabase.ts`, `store/splitImport.ts`, import persistence and Settings data/reset flow; proposed sync worker/state machine; outbox instrumentation that covers imports and native actions. No subscription-only change capture. Share the canonical graph adapter with Stages 2–3.

**Database:** normalized tables from document 04, operation receipts, per-dataset commit-ordered counter, immutable feed payloads, tombstones and device cursors; local outbox/entity-state tables. Atomically seed current state from last verified checkpoint, validate re-export, then enable incremental writes. Later local changes form the next outbox work; do not silently seed stale history over them.

**API:** `/sync/push`, ordered `/sync/changes`, checkpoint request/status, history-epoch reset and fence errors. Seal one immutable payload/hash before first send; batch results individually acknowledge atomic aggregates. Future reset never interprets a rolled-back cloud dataset as proof of deletion.

**Security/tests/acceptance:** state-machine/property tests, concurrent commit-order tests, wrong-owner pooled connection tests, repeated/lost/out-of-order operations, CAS conflicts, stale writer, deletion/edit races, clock skew, feed expiry, PITR epoch reset and long offline gap. Killing app between domain/outbox commit cannot lose eligible change capture. Cloud metadata failure preserves local logging and forces visible full rescan. Achieve document 08 lag/checkpoint targets in canary cohorts. Profile DB size with retained snapshots before enabling all accounts.

**Rollback/dependencies/approval:** server rejects incremental mutations; preserve outboxes and normalized current state; allow last verified snapshot reads. Do not re-enable manual full-snapshot overwrites until owner/revision reconciliation is verified. Expand-only DB rollback; retain protocol N/N-1. Depends on successful Stage 3 operations and full mutation inventory. Founder approves automatic-backup promise, checkpoint cadence and expanded support/cost scope. **Complexity: very high, 4–8 engineer-weeks.**

## Stage 5 — Bidirectional multi-device use

**Objective:** multiple devices safely add/edit completed data with explicit conflicts. This is a separately reviewed architecture increment, not a feature flag over single-writer code.

**Repository/database:** replace single-writer assumptions with reviewed multi-writer authorization and aggregate revisions; introduce durable local conflict records/UI; maintain globally stable provenance/history ordering; migrate derivations before multiple datasets intermix. Preserve tombstones and operation receipts. Active-workout continuity requires a separate state machine and reconsideration of today's one-active-session index.

**API/security:** capability/version negotiation, per-device mutation authority and conflict-resolution operations; recent-auth device management; no whole-account timestamp winner. A resolution explicitly references both base versions. A displaced/revoked device must remain unable to sync even when other devices are authorized.

**Tests/acceptance:** two physical devices offline editing same/different workouts, routine reorder, notes, profile, exercise rename and delete/edit races; arbitrary delivery reorder/duplication; complete conflict UI and preserved alternatives. Prove deterministic history/Build rules across timezones and old clients. No automatic merging of distinct identities/histories.

**Rollback/dependencies/approval:** stop new multi-writer enrollment; cannot safely turn a live multi-device account into single-writer by configuration alone. Quiesce writers, reconcile pending conflicts and explicitly elect a device. Depends on Stage 4 stability and audited conflict policy. Founder approves whether multi-device demand justifies cost, conflict UX and whether live workout handoff belongs in a later release. **Complexity: very high, 6–12+ engineer-weeks, reassess after discovery.**

## Stage 6 — Optional cloud product features

**Objective:** add explicit, revocable sharing/coach permissions, web views, export and subscription association without broadening private account access implicitly.

**Repository/database:** independent client features and entitlement/grant tables, scoped resources/permissions, audit history and revocation; separate private access grants from existing public bearer routine shares. Subscription association uses Stack account IDs with verified purchase/provider mapping. Export stays open and versioned regardless of subscription.

**API/security:** dedicated permission-scoped endpoints; invitation acceptance, expiry and revocation; no reuse of owner's token for coach/friend sessions. Backup access is not social consent. Public links never expose private history by joining on guessed account IDs.

**Tests/acceptance:** full principal/resource/action authorization matrix, revoked access/cached export tests, invitation replay, subscription account-transfer and export portability tests. Each product slice has explicit consent and delete/export behavior before launch.

**Rollback/dependencies/approval:** revoke/disable feature grants while preserving private backup/restore. Depends on stable Stage 3 for read-only features; shared editing waits for Stage 5 semantics. Founder separately approves each social/coach/web/subscription product and privacy scope. **Complexity: medium to very high by feature; estimate only after requirements, typically 2–6+ engineer-weeks per bounded slice.**

## Safe parallel implementation and integration ownership

After Stage 0 contracts stabilize, separate worktrees may handle (A) pure canonicalization/fixtures, (B) identity/client credential adapter, (C) server validation/authorization tests, and (D) account UI against fake transport. Use `codex/` branches. A designated integrator owns `store/workoutDatabase.ts`, native startup/control-pointer work, shared wire schemas and dependency lockfiles; do not have independent workers silently alter these shared contracts.

Each slice lands with contract tests and preserved fixtures before dependents rebase. Pin a contract version and sample manifest; integration changes require updating both producer/consumer tests. Do not parallelize destructive schema contraction, rollout decisions, account-linking policy or production recovery. Stages 2 and 3 can develop against the same frozen format, but neither is release-ready until the end-to-end loop passes.

Future implementation requests should name one slice, its accepted inputs, concrete files/contracts, acceptance gate and rollback boundary. Keep deploy/provisioning approvals separate from code review; this planning task performs neither.

## Long-term decisions: preserve options without implementing them

| Future capability | Decision required today | Work deliberately deferred |
|---|---|---|
| Cross-device workout continuity | Stable owner/data IDs, revisions, explicit device authority; active workout remains excluded initially | Active-session transfer protocol, simultaneous-session UX, native timer/Live Activity continuity |
| Private friends | Independent accounts, private-by-default schema, resource-specific grants possible | Friend graph, discovery, feeds and visibility defaults; no automatic upload-as-sharing |
| Coach access | Ownership separate from granted access, audit/revocation hooks | Coach roles, read/comment/edit distinctions, invitations, delegated programming and retention after revocation |
| Cross-platform app | Platform-neutral HTTP/JSON and SQL, local IDs mapped without assuming Apple subject owns data | Android secure-store/provider integration and local restore adapters; Google enablement after linking proof |
| Workout export | Versioned portable canonical graph, source/import evidence and user access independent of auth vendor | Additional CSV/vendor formats, scheduled user exports and bulk transfer tools |
| Web dashboard | Read-only API can reuse authorization and canonical read models | Web UX, browser session controls, offline cache and edit conflict behavior |
| User-controlled portability | Ordinary SQL domain model, independent owner UUID, versioned exports containing stable provenance; prove restore outside provider-specific auth IDs | Provider migration automation, import from independent Stack datasets and user-previewed merge tooling |
| Account subscriptions | Stable Stack account UUID and provider namespace for external identifiers | StoreKit/backend entitlement verification, purchase restore, cross-platform entitlement policy and account transfer |

These boundaries keep the initial release small. They do not promise that a future feature needs no migration; they preserve the identity, data integrity and consent foundations needed to perform that migration safely.
