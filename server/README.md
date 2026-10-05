# Stack routine server

Public routine pages, AASA, native verification and path-only hosting:
[Block 3 release guide](../docs/routine-sharing-universal-links.md).

Backend for **Paste my routine**: messy pasted workout text → a Stack-ready
routine, plus immutable V1 routine sharing. Parsing never saves anything. The
app decides later what to import, through the existing split importer.

```
POST /v1/routine-import/parse   { "text": "push\nbench 3x8\n…" }
POST /v1/routine-shares        canonical V1 wire JSON → { "id": "…", "url": "https://liftwithstack.com/r/…" }
GET  /v1/routine-shares/:id    canonical V1 wire JSON
GET  /r/:id                   server-rendered fallback and OG metadata
GET  /.well-known/apple-app-site-association  iOS association
GET  /routine-share-assets/stack-routine-v1.png  generic social preview
GET  /health
```

Runs on Railway with no runtime dependencies (Node ≥ 22.13). The OpenRouter
key lives only in Railway variables.

## Deploy on Railway

1. New service from this repo. **Root directory: `server`**. `railway.json` sets
   the start command and the `/health` check.
2. Variables: `OPENROUTER_API_KEY` (required). Optional: `OPENROUTER_MODEL`,
   `STACK_CLIENT_KEY`, `RATE_LIMIT_PER_MINUTE` (see `.env.example`).
3. Change the model at any time by setting `OPENROUTER_MODEL`. The app is unaffected.

## Routine shares — Block 1

No existing server database or Railway Postgres configuration was found in the
repository. The local Railway CLI is not linked to a project, so provisioned
remote databases could not be confirmed. The smallest dependency-free durable
option is Node's built-in SQLite on an **attached Railway volume**. This is a
single-service/single-replica deployment, not shared storage for horizontal
replicas. Keep the volume for the lifetime of published shares and configure
Railway volume backups. Losing or replacing it loses the snapshots.

Manual setup after code review:

1. Attach a volume to the existing `server` service at `/data`.
2. Set `ROUTINE_SHARES_DB_PATH=/data/routine-shares.sqlite`. Railway supplies
   `RAILWAY_VOLUME_MOUNT_PATH`; when Railway environment variables are present,
   startup checks that the configured database is inside that mount. A missing
   DB path leaves parse/health available and answers share requests with 503.
   An invalid path or storage initialization failure stops startup. There is
   no memory or ephemeral-filesystem fallback. The table initializes at startup;
   no separate SQL migration command is needed.
3. Set `ROUTINE_SHARE_PUBLIC_ORIGIN=https://liftwithstack.com` (also the default).
   Only an HTTPS origin is accepted, without credentials, path, query or fragment.
4. Optionally set `ROUTINE_SHARE_RATE_LIMIT_PER_MINUTE` (default 10 per client
   address). It uses a separate window from the existing parse rate limiter.
   If `STACK_CLIENT_KEY` is set, creations require `x-stack-client-key`; reads
   never require authentication. The limiter remains per process, like parsing.
5. Deploy the reviewed server changes. The app reuses
   `EXPO_PUBLIC_ROUTINE_IMPORT_URL` for API requests, so current build profiles
   need no new API variable. Optionally override it with
   `EXPO_PUBLIC_ROUTINE_SHARE_API_URL`. For a non-production public origin, set
   `EXPO_PUBLIC_ROUTINE_SHARE_PUBLIC_ORIGIN` to match the server; production
   defaults to `https://liftwithstack.com`. Rebuild the app after variable changes.
6. Configure DNS/HTTPS hosting for `liftwithstack.com` if it is not already
   configured. Domain routing was not inspected or changed. This block only
   generates `/r/:id` public URLs; it does **not** serve that browser route,
   associate Universal Links, or resolve these URLs in the recipient app.
   DNS alone does not make the new links importable. Browser fallback and
   recipient HTTPS routing belong to later blocks.

Creation accepts the existing V1 wire object directly as `application/json`
(no `{payload: ...}` wrapper). It caps the raw body at 32 KiB, parses through
the generated copy of `parseSharedSplitJson`, then reserializes through
`serializeSharedSplit`. Unknown fields are filtered at every level by that
validator. Only the canonical JSON is stored; sharing does not call AI.

`routine_shares` contains `share_id` (primary key), `protocol_version`, `payload`
(canonical JSON text), and `created_at` (server UTC timestamp). No expiry.
Sixteen cryptographically random bytes produce a 22-character unpadded
base64url ID. `INSERT … ON CONFLICT DO NOTHING` arbitrates collisions atomically,
with up to five fresh ID attempts. Triggers reject updates and deletes, so IDs
cannot be reused by the service. Snapshots have no association to local sender
IDs or future routine edits.

| Request | Response |
| --- | --- |
| `POST /v1/routine-shares` valid V1 JSON | `201 {id, url}` using the configured public origin |
| `GET /v1/routine-shares/:id` existing ID | `200` canonical V1 wire object, exact stored JSON bytes |
| Malformed ID | `400 error.code = invalid_share_id` |
| Well-formed but absent ID | `404 error.code = share_not_found` |
| Invalid protocol / JSON | `400` existing V1 validation error code |
| Oversized request | `413 error.code = body_too_large` (or `payload_too_large` after normalization) |
| Creation rate limited | `429 error.code = rate_limited`, `Retry-After` header |
| Storage not configured / SQLite busy or locked | `503 error.code = storage_unavailable` |
| Internal storage/server failure | `500 error.code = internal_error` |

Errors use the existing `{error: {code, message}, requestId}` envelope.
Reads are public bearer access; no user authentication is required. Logs contain
route placeholders, status and timing, never routine contents, share IDs, share
URLs or storage error messages that might contain SQL values. Infrastructure
access logs are controlled outside this application and should also redact IDs.

The sender preserves the routine name, `Shared from Stack` copy and
`Share.share({title, message})`. It uploads a detached canonical snapshot before
opening the sheet and checks the returned URL against the configured public
origin. The existing button spinner/lock/alert remain; concurrent sender calls
for the same routine also coalesce through upload and sheet dismissal. Failed
uploads open no sheet, leave the saved graph untouched and allow retry. Network
creation has a 15-second timeout. A lost response may leave an unused immutable
snapshot; retry creates a fresh ID. No long-link fallback is sent.

All legacy `stack://import-split?d=…` encoding, decoding and cold/warm import
routing remain available. No recipient editor, activation behavior, protocol
field or share-button design changed.

After deployment, test on a physical iPhone: loading and rapid taps during a
slow upload, offline/timeout retry, sheet dismissal/retry, Copy and previews in
Messages/WhatsApp, exact branded URL and routine-name copy, and a previously
shared legacy link on cold and warm launches. Fetch a created ID from the API
before/after a server redeploy to verify volume persistence. HTTPS recipients now open the existing editable draft through cold/warm routing. Current deployment status is in `../docs/routine-sharing-universal-links.md`.

## Local

```bash
cd server
cp .env.example .env            # add OPENROUTER_API_KEY
node --env-file=.env src/server.mjs
npm test                        # HTTP tests with a fake OpenRouter
node --env-file=.env eval/run-eval.mjs --runs 3   # live test set
node eval/run-eval.mjs --offline                  # resolver only, no AI
```

## Shared code (`src/stack/`)

`src/stack/` is **generated** from the app source by `scripts/sync-stack.mjs`:
the pure TypeScript in `features/routineImport/` and
`features/sharing/splitProtocol.ts`, plus `catalog.json` extracted from
`store/workoutDatabase.ts` and `constants/exerciseInfo.ts`. Railway only sees
`server/`, so the copy is committed. Run `npm run sync` after changing any of
those files. `tests/routineImport.test.cjs` fails if the copy is stale.

See `docs/paste-routine-backend.md` for the formats, matching rules and the
eval results.

## Sharing deployment status (2026-10-06)

Production sharing is deployed on the existing Railway service with a single
replica and an attached `/data` volume. `ROUTINE_SHARES_DB_PATH` points to
`/data/routine-shares.sqlite`. The real snapshot was verified byte-for-byte after
a successful redeployment. Preserve this volume for future deployments; do not
replace it with ephemeral service storage. Maintain Railway volume backups.

Vercel’s `liftwithstack-app` project proxies only routine preview paths to this
server. AASA and fonts/preview assets are static website files. Public DNS and
the apex redirect still require correction before branded links work publicly.
See `../docs/routine-sharing-universal-links.md` for deployment IDs and checks.
