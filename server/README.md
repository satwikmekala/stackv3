# Stack routine import server

Backend for **Paste my routine**: messy pasted workout text → a Stack-ready
routine. It parses only and never saves anything. The app decides later what
to import, through the existing split importer.

```
POST /v1/routine-import/parse   { "text": "push\nbench 3x8\n…" }
GET  /health
```

Runs on Railway with no runtime dependencies (Node ≥ 22). The OpenRouter
key lives only in Railway variables.

## Deploy on Railway

1. New service from this repo. **Root directory: `server`**. `railway.json` sets
   the start command and the `/health` check.
2. Variables: `OPENROUTER_API_KEY` (required). Optional: `OPENROUTER_MODEL`,
   `STACK_CLIENT_KEY`, `RATE_LIMIT_PER_MINUTE` (see `.env.example`).
3. Change the model at any time by setting `OPENROUTER_MODEL`. The app is unaffected.

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
