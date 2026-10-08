# Stack Cloud — founder decision brief

**Keep workouts local in SQLite. Use Supabase Auth and PostgreSQL behind a separate Stack Cloud API on Railway. Launch optional Apple accounts with verified manual backup and restore, one cloud-writing device per account.** Add Google and continuous synchronization after their safety gates pass.

Proposal researched against repository commit `5435bc1` and the working tree on **8 October 2026**. No application, dependency, database or deployment changes. This brief is under 850 words; the thirteen companion documents contain the engineering contracts.

## The ten answers

**1. What architecture, and why?** SQLite commits every workout immediately. Cloud work runs asynchronously. Immutable, validated snapshots provide recovery; a later transactional queue adds automatic updates. Stack's account ID is independent of Apple, Google and the authentication vendor. This preserves offline use and provider portability.

**2. Which provider?** Choose **Supabase Auth + PostgreSQL**, behind a Railway API. The existing Railway server handles public routine sharing using SQLite; it is not a private-workout backend. Keep it separate. Railway PostgreSQL is viable and now offers recovery/availability options; Supabase's integrated auth/database operations reduce work Stack must own. CloudKit fits Apple-only products more naturally than future cross-platform accounts and coaching. Two vendors add latency and operational coordination. Neither a login SDK nor Supabase Realtime supplies our correctness protocol. [Comparison](02_ARCHITECTURE_COMPARISON.md).

**3. How do existing users adopt accounts safely?** Sign-in moves nothing. Preserve a local recovery copy, validate the installed schema, add stable cloud IDs beside existing integer IDs, then ask users to associate their history with the account. Existing cloud history or another local owner requires an explicit choice. Never merge by email, date or similar names. Failed preparation preserves the source; unknown databases need recovery, not reseeding.

**4. When is history backed up?** Only after every required record and dependency in a frozen snapshot reaches the server, passes integrity/semantic checks, and receives a durable committed manifest receipt. Display its time, scope and count. Newer changes remain “waiting.” Uploaded chunks or queued validation are not success. Active workouts and unsaved drafts are excluded initially. Catastrophic provider failure has a separate recovery window.

**5. How do we prevent duplicates, gaps and corruption?** Preserve stable identities across reinstall; retry with the same operation IDs; commit parent/child changes together; validate complete manifests; resolve concurrency with server revisions, not device clocks. Restore into a separate database, check it, then activate it atomically. Preserve imported metadata, units and original ordering: these affect progress and Stack Build.

**6. Smallest production-worthy release?** Optional Apple Sign-In; safe ownership/sign-out/deletion; manual “Back up now”; truthful status; verified reinstall recovery; export; operational backups and a tested recovery runbook. **Ship backup and restore together publicly.** Guests keep logging without accounts. Stage 2 and 3 can be tested separately internally.

**7. What should wait?** Google until explicit linking is proven safe; continuous synchronization; concurrent device editing; active-workout handoff; automatic history merging; social/coach access; dashboards; subscriptions; user-managed encryption keys. Do not build a generic conflict-resolution platform for launch.

**8. Operating cost?** Illustrative monthly production budgets including point-in-time recovery, retained snapshots and modest monitoring/staging: **$160–220 / $165–255 / $320–520 / $900–1,800** for **100 / 1,000 / 10,000 / 100,000 cloud accounts**. Assumptions include 500 workouts/account, three snapshots and later normalized history. The largest case is roughly 2.5 TB; measured capacity may cost more. Staff, taxes and existing public-share/AI costs are excluded. These are planning envelopes, not quotes. [Cost model](08_COSTS_AND_OPERATIONS.md).

**9. Five biggest failure risks?**

1. Attaching history to the wrong account, especially through automatic email-based identity linking.
2. Losing historical meaning during migrations: metadata, schema differences, units or ordering.
3. Claiming success before a complete recoverable copy exists.
4. Activating partial restores, mixed preferences or stale widget commands.
5. Overwriting data from an old device, or failing operational disaster recovery.

Explicit ownership, staged restore, manifests, device fencing and recovery drills are launch requirements.

**10. First implementation task?** Build the **local preservation and restore proof harness**: historic fixtures → non-destructive preflight → consistent snapshot → candidate restore → authoritative and deterministic progress/Build comparison. Inject process termination at activation boundaries, including the SQLite/preferences boundary. Do this before authentication/cloud tables; fix demonstrated preservation gaps separately.

## Decisions before implementation

Approve providers/budget; Apple-only/manual scope; completed-history exclusions; one-device takeover/no automatic merge; retention/deletion; region/jurisdictions/privacy terms; recovery targets and an accountable operator. Proposed operator targets are a five-minute recovery point and four-hour recovery time, subject to measured drills. Independent provider-loss recovery may lose up to 24 hours. None is an existing guarantee.

Supabase automatically links matching-email OAuth identities; **Google stays blocked until that cannot grant unintended application access**. [Open decisions](12_OPEN_DECISIONS.md) records proposed defaults and alternatives. Begin engineering review with [inventory](01_EXISTING_DATA_INVENTORY.md), [backup/restore](06_BACKUP_AND_RESTORE.md), [roadmap](10_IMPLEMENTATION_ROADMAP.md) and [test gates](11_TESTING_STRATEGY.md).
