# Paste My Routine — Backend

Messy pasted workout text → a clean, Stack-ready routine. This phase is
**backend only**: no paste screen, no onboarding hook, and no writes to the
user's routine library.

```
paste → POST /v1/routine-import/parse
      → OpenRouter (Gemini 3.1 Flash Lite) reads the text into a strict JSON shape
      → Stack validates it (never trusts the model)
      → Stack grounds every name and number in the pasted text
      → Stack resolves names against its own catalog
      → RoutineImportResult (+ a PortableSplit draft when fully matched)
```

The model **understands** the text. It never chooses Stack exercises: it returns
`rawName: "incl db"`, and Stack decides that means *Incline Dumbbell Press*.

## Where the code lives

| Path | Role |
| --- | --- |
| `features/routineImport/exerciseResolver.ts` | Normalization + resolution order (pure TS) |
| `features/routineImport/exerciseAliases.ts` | Stack-owned shorthand and the never-auto-match ambiguous list |
| `features/routineImport/routineImportProtocol.ts` | Model-output schema, strict validator, result types, limits |
| `features/routineImport/routineImportResult.ts` | Grounding, result building, `toPortableSplit(result, decisions)` |
| `server/` | Railway service: HTTP, OpenRouter call, limits, logging, eval |
| `server/src/stack/` | **Generated** copy of the modules above + `catalog.json` (`npm run sync`) |
| `tests/routineImport.test.cjs` | 17 tests incl. a real-SQLite round trip through `importPortableSplitSync` |
| `server/test/app.test.mjs` | 9 HTTP tests with a scripted OpenRouter |
| `server/eval/` | 26 messy real-world cases and the metrics runner |

The app source is the single source of truth. The resolver and validators are
pure TypeScript in the app tree, so the future UI can re-run the same matching
on-device (for example against the user's own custom exercises). The server
gets a compiled copy, because Railway builds only `server/`. A test fails if
that copy goes stale.

## Reused Stack systems

- **Canonical names**: `EXERCISE_SEEDS` + `ARCHETYPE_EXERCISE_SEEDS` (163 exercises), read from `store/workoutDatabase.ts` by AST, not copied by hand.
- **Existing aliases**: `ARCHETYPE_TEMPLATE_SEEDS` (`exerciseName → matchingExerciseName`, e.g. *Triceps Pushdown → Tricep Pushdown*) and `constants/exerciseInfo.ts` titles with exactly one catalog alias (e.g. *Barbell Squat → Squats*). 22 aliases.
- **Name identity**: `exerciseMatchKey` semantics and the split protocol's forbidden-character rules.
- **Import format**: the output draft is a `PortableSplit`, validated by `validatePortableSplit`, and goes straight into `importPortableSplitSync` (atomic, creates a new split, never activates it). No competing routine format was introduced.

## Endpoint

`POST /v1/routine-import/parse`, `Content-Type: application/json`

```json
{ "text": "Push\nbench 3x8\nincline db 3 sets\nshoulder press 10 10 8" }
```

Response `200`:

```jsonc
{
  "type": "stack.routineImport",
  "v": 1,
  "routine": {
    "name": null,                         // only if the text names the program
    "workouts": [{
      "id": "w1",
      "name": "Push",
      "notes": [],
      "exercises": [
        { "id": "w1e1", "rawName": "bench", "status": "matched", "matchMethod": "alias",
          "matchedName": "Bench Press", "suggestedMatch": null, "alternatives": [],
          "sets": 3, "reps": { "type": "fixed", "value": 8 }, "durationSeconds": null,
          "notes": [], "group": null },
        { "id": "w1e2", "rawName": "incline db", "status": "matched", "matchMethod": "alias",
          "matchedName": "Incline Dumbbell Press", "sets": 3, "reps": null, "...": "…" },
        { "id": "w1e3", "rawName": "shoulder press", "status": "uncertain", "matchMethod": "ambiguous",
          "matchedName": null, "suggestedMatch": null,
          "alternatives": ["Seated Dumbbell Shoulder Press", "Overhead Press", "Machine Shoulder Press"],
          "sets": 3, "reps": { "type": "perSet", "values": [10, 10, 8] }, "...": "…" }
      ]
    }],
    "notes": [],
    "unsupported": [{ "text": "Sat/Sun rest", "reason": "schedule note" }]
  },
  "summary": { "workouts": 1, "exercises": 3, "matched": 2, "uncertain": 1, "unresolved": 0 },
  "importDraft": {
    "ready": false,                      // true only when everything matched and validates
    "split": null,                       // PortableSplit when ready
    "issues": [{ "code": "needs_confirmation", "message": "Confirm which exercise \"shoulder press\" is.", "path": "w1e3" }]
  },
  "warnings": [],                        // e.g. ungrounded_value, ungrounded_exercise, measurement_mismatch
  "meta": { "requestId": "…", "model": "google/gemini-3.1-flash-lite", "servedModel": "…", "provider": "…",
            "promptVersion": "2026-10-05.2", "attempts": 1, "latencyMs": 2400,
            "usage": { "promptTokens": 1250, "completionTokens": 420, "costUsd": 0.0002 } }
}
```

- `reps` is `{fixed}`, `{perSet}` or `{range}`. Missing data stays `null`.
- `status`: `matched` (safe to import), `uncertain` (the person must confirm `suggestedMatch` or pick from `alternatives`), `unresolved` (pick an exercise or create a custom one).
- `group` preserves supersets and circuits. Anything that doesn't fit lands in `notes` or `unsupported` rather than being lost.

Errors: `{ "error": { "code", "message" }, "requestId" }`

| Status | Code |
| --- | --- |
| 400 | `empty_text`, `invalid_request`, `invalid_json` |
| 401 | `unauthorized` (only when `STACK_CLIENT_KEY` is set) |
| 413 | `text_too_long` (> 10,000 chars), `body_too_large` (> 64 KiB) |
| 415 | `unsupported_media_type` |
| 429 | `rate_limited` (default 10/min per address, `Retry-After`) |
| 502 | `invalid_model_output` (after one retry) |
| 503 | `ai_unavailable`, `ai_rate_limited`, `ai_not_configured` |
| 504 | `ai_timeout` (60 s per attempt, 90 s total) |

### Future review → import

```ts
const draft = toPortableSplit(result, {
  name: 'My PPL',
  decisions: {
    w1e3: { type: 'builtin', name: 'Overhead Press' },
    w2e4: { type: 'custom', exercise: { name: 'Shoulder Burnout', workoutType: 'shoulders', primaryMuscle: 'Shoulders', equipment: null, loadType: 'external_weight', metric: 'reps' } },
    w2e5: { type: 'skip' },
  },
});
if (draft.ok) importPortableSplitSync(draft.value);
```

## Exercise matching

Order, first hit wins:

1. **Exact** Stack name.
2. **Alias**: Stack's template/exercise-info aliases plus the curated shorthand in `exerciseAliases.ts` (`bench`, `incl db`, `lat pull`, `seated row`, `tri push`…).
3. **Normalized**: NFKC, case, punctuation and spacing (`pull-down` = `pulldown`), plurals (`raises` → `raise`), and word abbreviations (`db`, `bb`, `incl`, `tri`, `ohp`, `rdl`, `bss`, `dl`…). No two catalog names share a key (tested).
4. **Typo** (still `matched`): exactly one word differs, by exactly one edit, that word is ≥ 4 letters with the **same first letter**, only one exercise qualifies, and no other exercise is within two edits. *lat pulldwn*, *inclne db press* and *deadlfit* match. *jack squat* never becomes Hack/Back Squat.
5. **Uncertain**: curated ambiguous shorthand (`shoulder press`, `dips`, `flies`, `curls`, `rows`, `incline press`…), or a looser likely match (word containment, partial overlap, larger typos). A `suggestedMatch` is given only when one candidate clearly wins and the input is more than one word; *chest* or *lat* alone get alternatives only.
6. **Unresolved**: nothing credible (*shoulder burnout*, *box jumps*, *treadmill*).

## Never trusting the model

- Strict JSON Schema structured output, sent only to providers that support it (`require_parameters`), and only to providers that don't store or train on prompts (`data_collection: deny`). `temperature: 0`, reasoning off.
- The output is re-validated anyway: wrong types → `invalid_model_output` and one retry; implausible numbers (sets > 20, reps > 100, fractions) are dropped with a warning; strings are sanitized with the split protocol's character rules and length-limited.
- **Grounding**: each exercise must appear in the pasted text, in order. Its numbers must appear between it and the next exercise (`1:30` → 90 s and minutes are understood, and `12 12 12` may be read as 3 × 12). Invented numbers are dropped (`ungrounded_value`). An exercise that isn't in the text can never be `matched`; it is downgraded to `uncertain` (`ungrounded_exercise`).
- The pasted text is sent as data in the user message; the system prompt tells the model to ignore instructions inside it.

## Privacy and secrets

- The OpenRouter key exists only in Railway variables and in the `Authorization` header to OpenRouter. It is never logged or returned. Logged strings are additionally scrubbed of the key, and a test injects the key into a provider error to prove it doesn't leak.
- Logs are one JSON line per request: request id, character/line counts, status, timings, attempts, provider, token usage, cost, match counts, warning codes. **No pasted text and no model output** (also tested).
- Nothing is persisted on the server.

## Evaluation (October 5, 2026)

`server/eval/cases.mjs`: 26 routines, 134 exercises. They cover normal formatting, WhatsApp style, notes and bullets, numbered lists, tables, multiple workouts (PPL, upper/lower, 5-day bro split), misspellings, shorthand, missing sets, comments, supersets, unsupported lines (warm-ups, rest days, progression rules), weights/RPE, rep ranges, timed holds, unknown movements, variants, prompt injection, and a non-routine. Each exercise lists the Stack names that count as correct. Any other match is **incorrect**.

Both models via OpenRouter, privacy routing (`data_collection: deny`), reasoning off, prompt `2026-10-05.2`, identical settings, 3 runs × 26 = 78 parses each:

| Metric | **Gemini 3.1 Flash Lite** (default) | DeepSeek V4 Flash |
| --- | --- | --- |
| Served by | Google | Venice (only compliant provider) |
| Parsed successfully | **78 / 78** | 77 / 78 |
| Workout structure correct | 78 / 78 | 77 / 77 |
| Matched automatically | 348 (all correct) | 331 (all correct) |
| **Incorrect matches** | **0** | **0** |
| Uncertain | 36 (18 with correct suggestion) | 36 (18) |
| Unresolved | 18 | 20 |
| Missing / invented exercises | 0 / 0 | 0 / 0 |
| Sets/reps/duration correct | **369 / 369** | 353 / 354 |
| Grounding warnings (invented values) | 0 | 0 |
| Invalid model responses | **0** | 1 attempt in 79 |
| Latency avg / p50 / p95 | **4.1 s / 3.4 s / 12.5 s** | 8.1 s / 5.8 s / 21.7 s |
| 15-exercise 5-day split | 4.4–12.7 s | 26–30 s |
| Cost per parse avg / max | $0.0011 / $0.0027 (~880 per $1) | $0.00014 / $0.00063 (~7,000 per $1) |
| Tokens (prompt + completion) | ~1,480 + 510 | ~820 + 450 |

Notes, superset groups (2/2) and unsupported lines were preserved in all Gemini runs.

**Decision:** switched the default to `google/gemini-3.1-flash-lite`. It met the bar: 0 incorrect matches, with roughly half the latency (−49% average, −42% p95). It costs ~8× more per parse, still about a tenth of a cent. DeepSeek stays one variable away (`OPENROUTER_MODEL=deepseek/deepseek-v4-flash`).

An earlier full run with prompt v1 (same 78 parses) had 78/78 successes and 0 incorrect matches. It also showed two model slips that the v2 prompt fixed (10/10 clean on reruns): "paused bench" was shortened to "bench", and "shoulder burnout" was dropped once.

Offline (perfect parse, resolver and grounding only, `--offline`): 134 exercises, 116 matched, 0 incorrect, 12 uncertain, 6 unresolved, 123/123 prescriptions.

Reproduce:

```bash
node --env-file=server/.env server/eval/run-eval.mjs --runs 3
```

## Open decisions before the UI

1. **Latency on long routines.** With Gemini, typical pastes take 3–5 s, but long multi-day routines still reach ~13 s (p95 12.5 s) because output tokens dominate. Is a ~5 s spinner with a 15 s worst case acceptable? If not: parse each workout in parallel, or use a more compact output schema.
2. **Cost vs. speed.** Gemini is ~$0.0011 per parse vs. DeepSeek's ~$0.00014. Both are negligible per user. Revisit only if imports get very frequent.
3. **Sets/reps aren't importable yet.** `PortableSplit` V1 carries structure only, so targets are returned but dropped on import. Either add an optional per-exercise `targets` field (additive, no version bump per the protocol) or decide targets come from Stack's progression.
4. **Review UX for `uncertain` vs `unresolved`.** Pick from suggestion and alternatives, search the catalog, or create a custom exercise (needs workoutType, muscle, equipment, load type, metric).
5. **Duplicates in one workout** (e.g. bench twice) are legal in a paste but rejected by `PortableSplit`. Merge, skip or rename?
6. **Routine name** when none is written (`Imported Routine` fallback, or ask).
7. **Abuse control.** Rate limit per IP plus an optional shared `STACK_CLIENT_KEY`. Real per-user auth (e.g. Supabase JWT) before public launch?
8. **Custom exercises already in the user's library** aren't known to the server. Re-run `exerciseResolver` on-device with the local catalog, or send custom names with the request?
9. **Supersets and notes**: preserved in the result, but Stack has nowhere to store them yet.
