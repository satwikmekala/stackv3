# Evidence index and confidence

Investigation date: **8 October 2026, Asia/Kolkata**. Repository baseline: `5435bc1` (`Ship onboarding, workout history, reminders and routine sharing`) plus the pre-existing working tree. This is a planning-only investigation. Source paths are relative to repository root; line anchors identify the reviewed working tree and can move later. The file inventory and migration map in [01](01_EXISTING_DATA_INVENTORY.md) give finer-grained evidence. External links below were read during this investigation unless explicitly labeled unavailable; vendor documentation is a living source, not a contractual guarantee.

## Reading map and contract precedence

| Document | Purpose |
|---|---|
| [00](00_EXECUTIVE_DECISION.md) | Founder brief, final recommendation, ten answers |
| [01](01_EXISTING_DATA_INVENTORY.md) | Actual persistent entities, migrations, semantics and risks |
| [02](02_ARCHITECTURE_COMPARISON.md) | Provider alternatives and tradeoffs |
| [03](03_IDENTITY_AND_SECURITY.md) | Authentication, explicit ownership, linking gate, threats/privacy |
| [04](04_CLOUD_DATA_MODEL.md) | Proposed local metadata/cloud entity/constraint contract |
| [05](05_SYNC_PROTOCOL.md) | APIs, transactions, revisions, queues, cursor/fence behavior |
| [06](06_BACKUP_AND_RESTORE.md) | Snapshot format, durable receipt, staged restore and disaster cases |
| [07](07_PRODUCT_EXPERIENCE.md) | Screen states, copy and user decisions |
| [08](08_COSTS_AND_OPERATIONS.md) | Cost assumptions, metrics, incident/recovery procedures |
| [09](09_MIGRATION_AND_ROLLOUT.md) | Migration checkpoints, release flags, rollout/rollback |
| [10](10_IMPLEMENTATION_ROADMAP.md) | Independently testable engineering slices/dependencies |
| [11](11_TESTING_STRATEGY.md) | Invariants, test matrix, measurable release gates and baseline |
| [12](12_OPEN_DECISIONS.md) | Founder decisions with proposed defaults and consequences |

All decisions are proposals. If future edits disagree, 04 defines stored fields, 05 defines wire/state transitions, 06 defines the backup-success/restore contract, and 03 defines auth requirements; resolve differences explicitly before implementation. Nothing in a summary relaxes a correctness gate. Stage 2–3 means manual immutable snapshots; Stage 4 means incremental single-writer cloud state plus verified checkpoints. No document should imply Supabase supplies application replication automatically.

## Repository evidence supporting recommendations

| Claim | Evidence | Confidence / limitation |
|---|---|---|
| SQLite source of truth; current v24, integer keys and singleton profile | `store/workoutDatabase.ts:48`, `:411`, `:549`, `:1798`; `store/workoutStore.ts:447` | Confirmed in source; no production device DB accessed |
| Each installed schema cannot be inferred from version alone | `store/workoutDatabase.ts:1454`, `:1803`; `store/workoutBackup.ts:30` | Confirmed additive shape checks/same-version additions |
| Legacy v0 populated database can enter destructive fresh seeding | `store/workoutDatabase.ts:1241`, `:1827` | Confirmed control path; prevalence unknown; must guard before cloud adoption |
| Dev-only fallback rebuilds after legacy migration error | `store/workoutDatabase.ts:1817` | Production rethrows; no claim all release migrations currently lose data |
| Workout state, completion and notes persisted locally | `store/workoutDatabase.ts:3390`, `:3604`, `:4063` | Direct SQL writes require transactional instrumentation later |
| Existing backup has table whitelist, transaction and integrity checks | `store/workoutBackup.ts:6`, `:20`, `:34`, `:115` | Useful reuse; not a cloud acknowledgment or crash-safe cross-store restore |
| File backup includes four non-SQLite preferences | `features/settings/data.ts:20`, `:83`, `:106` | Read/write boundary and compensating rollback confirmed |
| Imported facts required beyond normalized set fields | `features/import/persistence.ts:7`, `:40`; `features/import/models.ts`; `store/workoutDatabase.ts:862`, `:2055`, `:3139` | Preserve source identity, warmups/unsupported data; source account is not Stack identity |
| Build is derived and excludes imported/retroactive sessions | `store/verifiedSessions.ts:4`, `features/build/evidence.ts:83`, `features/build/adapter.ts:19` | Recompute with same time/timezone/rules; no persisted earned Build model |
| IDs/order and names affect derived history | `store/personalRecords.ts:58`, `features/build/evidence.ts:108`, `store/workoutDatabase.ts:3711` | UUID retrofit must retain historical ordering/name semantics |
| Weights canonical kg; input units snapshotted | `store/weightUnits.ts:3`, `store/workoutDatabase.ts:508`, `:1661` | Never repeatedly convert on upload/restore |
| Drafts and presentation state persist separately | `store/customSplitDraft.ts:714`, `store/onboardingDraft.ts:5`, `features/build/casting.ts:92`, `features/build/fusion.ts:7` | Exclusion must be disclosed, account namespace prevents stale IDs |
| Native command inbox survives process lifecycle | `patches/expo-widgets+57.0.20.patch:538`, `services/liveActivity/interaction.ios.ts` | Invalidate at restore/account switch; not a network outbox |
| Native and general Settings implementations both exist | `features/settings/SettingsScreen.ios.tsx`, `features/settings/SettingsScreen.tsx`, `features/settings/useSettings.ts` | UX changes must cover both; cloud-only promise currently absent |
| Supabase dependency is not implemented Stack auth | `package.json`; search of app/store/services/features/server | No application auth usage found; runtime deployment not inspected |
| Apple auth/SecureStore configuration missing | `package.json`, `app.json`, `ios/Stack/Stack.entitlements` | Future dependencies/capability build needed; none added here |
| Current privacy manifest collected data is empty | `ios/Stack/PrivacyInfo.xcprivacy` | Must review actual collection/privacy labels separately |
| Backend has public parse/share endpoints, not user backup APIs | `server/README.md`, `server/src/app.mjs`, `server/src/server.mjs`, `server/src/routineShareStore.mjs` (see 02) | Repository configuration only; no production secrets/service inspection |
| Backend share persistence uses SQLite volume | [02 backend evidence](02_ARCHITECTURE_COMPARISON.md) | Do not scale current volume-backed share app as if stateless |
| Existing tests use production SQL with real disposable SQLite | `tests/workoutPersistence.test.cjs:1`, `tests/hevyImport.test.cjs`, `tests/notifications.test.cjs` | Selected baseline results recorded in 11; planned cloud tests are not yet implemented |

## Verified official external sources

| Source | Supports | Caveat |
|---|---|---|
| [Supabase pricing](https://supabase.com/pricing) | Pro fee/quotas and metered components in 08 | Current published USD rates, not Stack bill |
| [Supabase backups](https://supabase.com/docs/guides/platform/backups) | Daily backups and PITR, compute prerequisites | Recovery target still requires drill; inspect retention contract |
| [Supabase identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking) | Automatic same-email linking and manual linking | No supported automatic-link-disable control verified; Google gate |
| [Supabase Apple auth](https://supabase.com/docs/guides/auth/social-login/auth-apple) | Native ID-token flow and web secret differences | Prove exact Expo nonce exchange and revocation |
| [Supabase sessions](https://supabase.com/docs/guides/auth/sessions) and [sign-out](https://supabase.com/docs/guides/auth/signout) | Session refresh and outstanding access token behavior | Stack revocation registry needed for immediate denial |
| [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) | Policies and service-role bypass responsibilities | Test actual restricted runtime role and pooled context |
| [Supabase shared responsibility](https://supabase.com/docs/guides/deployment/shared-responsibility-model) | Vendor services do not remove application obligations | Not an assertion of compliance |
| [Railway pricing](https://railway.com/pricing) and [database docs](https://docs.railway.com/databases) | Usage costs, supported operations and database options | Existing deployment plan/settings unknown; no changes made |
| [Apple CloudKit](https://developer.apple.com/icloud/cloudkit/) and [CKSyncEngine](https://developer.apple.com/documentation/cloudkit/cksyncengine-4b4w9?language=objc) | Apple-managed cloud and sync facilities | Native bridge/device tests still required; avoid extrapolating quotas |
| [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) | Persistent SQLite and transaction/API constraints | Repository Expo57 pinned versions differ slightly from latest docs |
| [Expo BackgroundTask](https://docs.expo.dev/versions/latest/sdk/background-task/) | OS decides background execution; user termination limits | Foreground drives reliability; no scheduled-backup guarantee |
| [SQLite backup API](https://www.sqlite.org/backup.html) | Consistent database snapshot mechanism | Expo/native binding and file activation must be proven |
| [PostgreSQL sequences](https://www.postgresql.org/docs/current/functions-sequence.html) | Nontransactional sequence behavior | Per-account transactional counter is our design inference |
| [Expo AppleAuthentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/) | Native capabilities, consent fields, nonce/state | Release physical-device validation required |
| [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) | Native credential storage and uninstall caveats | Surviving keychain data is not installation identity or backup |
| [Expo Google auth](https://docs.expo.dev/guides/google-authentication/) | Native integration/build requirements | Explicit linking remains an application gate |
| [Google ID token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token) | Signature/claim validation and stable subject | Platform/client audiences must match production setup |
| [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) | Account/privacy and third-party sign-in requirements | Recheck before submission; not an approval prediction |
| [Apple account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/) | In-app deletion and Apple token revocation | End-to-end server token revocation spike required |
| [Apple privacy labels](https://developer.apple.com/app-store/app-privacy-details/) | Data collection disclosure | Classify actual shipping behavior with counsel |
| [ICO individual rights](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/) | Example jurisdiction rights requirements | Jurisdictions/health-data classification not yet established |

The [Apple HIG managing accounts page](https://developer.apple.com/design/human-interface-guidelines/managing-accounts) was reached but its client-rendered body was not readable to the research tool. 07 labels this limitation and grounds its recommendations in inspected native UI and readable platform requirements. No claim of full HIG conformance is made.

## Inferences, unknowns and validation obligations

- **Architecture recommendation is judgment**, based on actual persistence and provider features. No provider magically solves ownership, conflict or restore semantics.
- **No production access**: account counts, average history size, deploy topology, actual paid plan, enabled backups, active credentials, regions, DNS behavior, incident history and existing backup health are unknown. No secret files were opened or printed.
- **Historical coverage is incomplete**: checked-in v14–17 fixtures and shape-generated tests do not prove every shipped device upgrade. Collect consented/redacted archived fixtures and release artifacts; do not upload user databases for investigation by default.
- **Performance/cost values are assumptions** until measured. Snapshot size, indexes, CPU, network speed, compression ratio, RPO/RTO and memory headroom are explicit load/drill gates. See 08 and 11.
- **Google is a conditional design**, not verified safe today. A grant/session/provider-proof gate or a broker change must pass adversarial linking tests before enabling it.
- **Atomic restoration is proposed**, not provided by current settings restore. SQLite preference bridge, control DB pointer, native-inbox invalidation and filesystem durability need physical-device fault tests.
- **Legal/retention approval remains open**. Proposed 7/30-day deletion windows and region choices cannot become public guarantees before every service/backup/log path is checked.
- **Background execution is best effort**. Do not market automatic recovery points when the app has been force-quit or never foregrounded.
- **“Zero data loss” is an engineering preservation objective**, tested through old-copy retention and atomic activation, not a guarantee for already corrupted data, uninstall before upload, lost hardware, or an unbounded provider disaster.

## Investigation integrity

Before work, unrelated modifications existed in Home/workout UI, the weight picker, SlideToStart, a native workout controls module and ad-hoc UI tests; untracked QA/native weight-picker files also existed. They were preserved. This work creates only `docs/architecture/stack-cloud/`. Test execution uses existing dependencies and disposable fixtures; selected results and limitations are in 11. No push, merge, deploy, dependency installation, production schema or environment modification occurred.
