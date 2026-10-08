# Costs and operations

Planning estimate in USD, checked 2026-10-08. This is not a quote, a capacity guarantee or a production-billing audit. User counts below mean cloud-enabled accounts, assumed all monthly active for conservative auth billing. Guest users produce no cloud traffic. Taxes, staffing, App Store fees, existing website/public-share hosting and AI routine-parsing charges are excluded.

## Verified pricing inputs

| Input | Published rate |
|---|---|
| Supabase Pro | $25/month; $10 compute credit; 100,000 MAU; 8 GB DB; 250 GB uncached egress |
| Overage | DB $0.125/GB-month; uncached egress $0.09/GB; MAU $0.00325 |
| Example DB compute | Small $15; Medium $60; Large $110; XL $210 monthly, before $10 credit |
| Supabase recovery | Daily backups retained 7 days; PITR 7 days approximately $100/month and requires at least Small |
| Railway Pro | $20/month usage floor, credited toward usage; memory $10/GB-month, CPU $20/vCPU-month, egress $0.05/GB, volume $0.15/GB-month |

Sources: [Supabase pricing](https://supabase.com/pricing), [PITR prerequisites and rates](https://supabase.com/docs/guides/platform/backups), [Railway pricing](https://docs.railway.com/pricing/plans). Recheck before purchase. No Supabase Free project is proposed for production recovery. No Supabase Realtime or Edge Functions meter is needed for this design.

## Explicit workload assumptions

These are sizing hypotheses to replace with synthetic fixtures and beta measurements:

- Average account starts with 500 completed workouts; each has 6 exercises × 4 sets. At 12,000 sets/account, record/index/revision overhead matters more than compact JSON alone.
- Budget **5 MB/account per canonical uncompressed backup generation**, with up to 3 retained immutable generations: **15 MB/account in Stage 2–3**. Stage 4 adds **10 MB/account for normalized current state, indexes and normal feed/idempotency metadata**, for **25 MB/account steady-state total**. This excludes PITR storage and independent exports. Reserve additional space for one staged generation/account (5 MB), restore pins and vacuum. A high-history sensitivity case is 50 MB of current state + three 25 MB generations = 125 MB/account. Bloat, long notes and lifetime receipt growth can exceed this.
- First upload is **5 MB/account canonical**, or **2 MB/account on the wire only if transport compression is implemented and measured**; stored chunks remain canonical bytes under the current contract. Normal monthly outbound changes from the phone total **0.25 MB/account**; 2% of accounts restore 2 MB compressed each per month (5 MB if compression is unavailable). Continuous backup is batched: **300 API requests/account/month**, including empty checks/auth-related cloud calls/retries. Avoid every-set network requests and tight polling.
- For network planning, reserve **1 MB/account/month on each provider's metered egress side**. This covers small acknowledgements, SQL transport amplification and ordinary restores. It is a conservative budgeting simplification, not measured wire usage. Separate daily exports may dominate Supabase egress at scale.
- Network traffic uses decimal MB/GB here. Round budget values; production dashboards may use different units.

| Cloud accounts | Sets represented | Steady DB Stage 2–3 / Stage 4 | First upload, one time (compressed hypothesis / canonical) | Incremental upload/month | 2% restore download/month | API requests/month | Average requests/sec |
|---|---:|---:|---:|---:|---:|---:|---:|
| 100 | 1.2 million | 1.5 / 2.5 GB | 0.2 / 0.5 GB | 0.025 GB | 0.004 GB | 30,000 | 0.012 |
| 1,000 | 12 million | 15 / 25 GB | 2 / 5 GB | 0.25 GB | 0.04 GB | 300,000 | 0.12 |
| 10,000 | 120 million | 150 / 250 GB | 20 / 50 GB | 2.5 GB | 0.4 GB | 3 million | 1.2 |
| 100,000 | 1.2 billion | 1,500 / 2,500 GB | 200 / 500 GB | 25 GB | 4 GB | 30 million | 11.6 |

The traffic table is a Stage 4 continuous-sync model, not a promise that Stage 2–3 has background uploads. For manual snapshots, each explicit backup sends another complete generation (2–5 MB in this hypothesis); frequent manual requests and retries can exceed incremental traffic. Restore downloads are the compressed hypothesis; multiply that column by 2.5 without compression.

Average request rate hides after-work peaks and simultaneous first backups. Load-test at 20× average plus a queued onboarding wave; throttle first backups independently of normal incremental writes. 100,000 users with years of history is a billion-row normalized workload in Stage 4, plus retained chunk storage; Stage 2–3 stores chunks, not 1.2 billion normalized set rows. SQL compatibility does not imply a Small database can handle it. Review indexes, vacuum, partitioning and export time before this stage; partition only when measured pressure warrants it.

## Monthly budget for the chosen architecture

The baseline includes PITR. Representative compute allocations are **budget assumptions**, subject to load tests. This table uses the larger Stage 4 retained-snapshot-plus-normalized storage footprint; Stage 2–3 disk cost is lower, but validation compute must still be measured. Railway figures include one allocated workspace floor for comparison; if the existing workspace already covers it, incremental cost can be lower. Do not add the floor a second time to usage.

| Accounts | Supabase plan + assumed compute + DB overage | PITR | Cloud API Railway allocation | Monitoring, independent backup storage/transfer, staging allowance | Planning total/month |
|---|---:|---:|---:|---:|---:|
| 100 | ~$30: Small | ~$100 | $20–35 | $10–55 | **$160–220** |
| 1,000 | ~$32: Small, ~17 GB overage | ~$100 | $20–50 | $10–70 | **$165–255** |
| 10,000 | ~$155: Large, ~242 GB overage | ~$100 | $40–100 | $25–160 | **$320–520** |
| 100,000 | ~$536: XL, ~2,492 GB overage | ~$100 | $120–350 | $150–800 | **$900–1,800** |

The Supabase calculation is `25 + compute_price - 10 + max(0, disk_GB - 8) × 0.125`. All four auth counts are within the modeled included quota. Above 100,000 MAU, each additional 100,000 adds about $325/month at the published rate. A 100,000-account case needing 2XL rather than XL adds about $200/month; larger compute, high-performance disks or replicas can exceed the table substantially. The 125 MB/account total sensitivity makes the largest database 12.5 TB and adds roughly $1,250/month in ordinary disk charges before additional compute/export cost. In-progress first backups across all accounts can add 0.5 TB transiently at the largest size; rate-limit concurrency and reserve capacity. Restore pins may temporarily prevent oldest-generation pruning.

Example Railway budget at scale: 4 GB resident memory plus 2 average utilized vCPUs gives ~$80/month of compute before egress. Allocating 2–3 replicas for capacity/availability raises usage; the table is an allowance, not an assertion that 30 million requests demands three replicas. Rate limiting must then be shared/durable or enforced at ingress, not the current in-process map.

Under the simplified normal-traffic model, 100,000 accounts generate about 100 GB on each egress side: below Supabase's included pool and about $5 at Railway. One provider charge does not pay the other provider's network bill. First-upload proxying adds Railway outbound bytes to Postgres. Exporting a 2.5 TB database every day could transfer 75 TB/month before compression and cause large overages. Therefore the independent export allowance assumes **compact canonical exports**, approximately 2 MB/account compressed per generation, daily incremental exports plus periodic full exports of all retained generations, measured compression, and 30-day retention; it does not assume free daily uncompressed database dumps. At 100,000 accounts, three generations could occupy 600 GB compressed. A full weekly 600 GB compact export plus daily deltas could itself exceed the Supabase egress pool by hundreds of GB. Instrument actual exported bytes and include restore-test traffic.

Monitoring and staging figures are allowances without a selected vendor quote. They include a small isolated paid staging DB where needed, object storage and a modest alert/error service. Optional paid log-drain products, premium support, replicas, high availability and enterprise access controls must be priced separately. As history grows, longer restore drills and on-call engineering dominate operational cost even when hosting remains affordable.

## Cost comparison with the alternatives

Option A can have a smaller hosting floor. For an illustrative same-size Railway database, 2 GB RAM + 0.1 average CPU + 1 GB volume is about $22/month of DB resources; add API usage, identity broker, PITR/WAL/archive storage and monitoring. At 1 TB, disk alone is about $150/month; 16 GB RAM + 2 average CPU adds about $200/month. These are arithmetic examples, not managed-auth quotes or equivalently protected totals. Current Railway backups/PITR exist; evaluate the actual configured recovery cost rather than assuming a fixed Supabase-style surcharge. [Railway recovery guide](https://docs.railway.com/guides/postgres-backups-restores)

Option C moves private-data storage to users' iCloud quota. Do not call it unlimited free storage, and do not assign an invented per-100,000-user hosting price. Current public-cloud overage tariffs were not reliably verified; no public CloudKit storage is budgeted. Native integration, iCloud-full support, device testing, monitoring and exports remain costs. [Apple storage model](https://developer.apple.com/library/archive/documentation/General/Conceptual/iCloudDesignGuide/DesigningforCloudKit/DesigningforCloudKit.html)

The cheapest daily-backup-only B configuration saves approximately $100 PITR plus $5 Small uplift at the smallest tier. It permits roughly a day of provider-disaster data exposure. **It is not the recommended launch baseline** and needs an explicit founder decision and honest user promise if considered.

## Reliability targets and operator recovery

Targets are proposed internal release/operating objectives, not provider SLAs:

| Measure | Initial target / alert |
|---|---|
| Workout local commit | No network dependency; zero cloud-induced logging blocks |
| Manual backup completion, Stage 2–3 | ≥99.5% of supported representative histories within 5 minutes after explicit Backup now while active/connected/auth valid; large-history target separately measured |
| Automatic checkpoint completion, Stage 4 | ≥99.5% within 5 minutes of an eligible completed save while active/connected/auth valid; operations alone do not advance verified-backup label |
| Foreground sync lag, Stage 4 | p95 ≤60 seconds; warn if p95 >5 minutes for 15 minutes |
| Server accepted operation failures | <0.5%; page on >2% 5xx for 5 minutes with sufficient traffic, or synthetic failure 3 times |
| Restore integrity | 100% count/hash/reference validation; any mismatch pages and blocks readiness |
| User restore completion | ≥99% of supported, connected, adequately provisioned attempts; cancellations/network interruptions separately labeled |
| Authorization isolation | Any suspected cross-account access is severity 1; quarantine cloud writes |
| Provider recovery | Proposed RPO ≤5 minutes, RTO ≤4 hours, demonstrated in drills; not guaranteed merely by PITR's time granularity |
| Independent recovery copy | Last successful export ≤24 hours; alert on age/integrity failure; provider/account-loss RPO up to 24 hours unless stronger replication is approved |

A backup receipt means the required account generation committed durably to the primary database and passed manifest checks. It does not claim that no acknowledged write can ever be lost after catastrophic loss of all recovery copies. PITR protects recent operator/database mistakes within its configured window; a separate account/provider recovery export protects a different failure class. Never equate the seven-day PITR window with seven days of user undo history.

Use seven-day PITR plus encrypted independent exports retained 30 days as the proposed baseline. Restore drills monthly at launch, quarterly after stable operation, and before major schema changes. Restore to an isolated environment, verify manifest/owner/FK invariants, exercise real client restore, record elapsed time and delete the drill copy. Account deletion must purge live data promptly and age out retained copies within the approved retention policy. Preserve and replay a separate deletion ledger before allowing a disaster-restored service to answer requests, to prevent deleted accounts resurfacing.

## Essential telemetry

Emit bounded metadata: request ID, API/schema version, deployment, operation kind, byte/count bucket, status/error code, phase and duration. Never include tokens, emails, provider subjects, workout names/notes/sets or raw SQL. Restrict short-lived pseudonymous correlation to authorized incident tools; avoid account IDs as unbounded metric labels.

Collect `backup_started/validated/committed`, receipt generation age, pending-operation count/oldest age, retry reasons, restore_started/validated/failed, auth renewal failures, owner-binding mismatches, stale-writer rejections, idempotency replay/hash mismatches, DB transaction errors, pool waits, deadlocks, disk/WAL growth and checksum/FK anomalies. Measure successful restore of a synthetic account regularly using synthetic workout records. `/health` proves process liveness only; separate readiness/dependency checks and synthetic recovery probes are required.

Alert on missing backups, expired auth signing/Apple credentials where applicable, disk >70% (warning)/85% (urgent), sustained CPU/pool saturation, repeated timeout/deadlock rates, billing forecast >approved threshold and export growth. Budget hard stops must not silently disable acknowledged-data recovery: reserve capacity and prefer throttling onboarding/first backups while retaining reads/restores. Local logging always continues.

## Operational runbooks

- **Bad deployment:** disable cloud mutations, preserve local outboxes, roll back API only if schema-compatible. Do not roll back SQLite on devices or erase queues. Resume with canary account round-trip checks.
- **Corruption or missing receipt data:** stop writes to affected generation/account, retain forensic copy and audit metadata, restore into isolation, compare manifests, repair under reviewed procedure. Never hide the event by changing counts.
- **Provider outage:** exponential backoff/jitter and visible pending state; no failover to an empty database. Publish service status through a channel independent of the failing API.
- **Credential compromise:** revoke/rotate restricted secrets, invalidate sessions/writer authority, audit affected scope, preserve evidence and follow the incident notification assessment in document 03.
- **Database disaster:** freeze API, locate last valid PITR point/export, restore isolated, replay deletion ledger, validate generation receipts and identity mappings, rotate recovery epoch to invalidate old cursors, then permit controlled client rebaseline. Clients retain pending mutations and must not infer cloud deletions from an older restored dataset.
- **Account/provider-wide loss:** recover SQL domain and independent account mapping first; verify managed Auth recovery separately. If Auth restoration is not portable, require secure reauthentication/rebinding; never reconstruct ownership by email matching.

Assign a named primary and backup responder before public release. Record provider contacts, access recovery, export location, key recovery and synthetic-account instructions outside the production account. Require MFA, least privilege, audited temporary production access and two-person review for destructive recovery actions. Review costs weekly during rollout, monthly afterward; renew restore evidence rather than merely checking that a backup job ran.
