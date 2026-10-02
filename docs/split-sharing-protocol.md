# Split Sharing Protocol — V1

Pure serialization and validation for sharing a Stack custom split. No database
writes, no deep-link route, no UI, no backend.

The V1 user experience and importer now wrap these pure modules. See
[Split Sharing V1](split-sharing-v1.md) for the shipped flow, atomic import
policy, native-link handling, transport budget and verification results. The
future-policy notes below record the original protocol design.

```
CustomSplit ──portableSplitFromCustomSplit──▶ PortableSplit (domain)
PortableSplit ──serializeSharedSplit──▶ canonical JSON  ──encodeSharedSplit──▶ base64url token
token ──parseSharedSplit──▶ strict base64url ▶ strict UTF-8 ▶ parseSharedSplitJson ▶ validated PortableSplit
```

| Module | Role |
| --- | --- |
| `features/sharing/splitProtocol.ts` | Domain types, limits, match key, validation, canonical JSON serializer/parser |
| `features/sharing/splitTransport.ts` | UTF-8 + base64url, token encode/parse, `stack://import-split?d=` helpers |
| `features/sharing/customSplitAdapter.ts` | `CustomSplit` → `PortableSplit` (type-only imports, no DB) |
| `tests/splitSharing.test.cjs` | 36 protocol tests + size measurements |

## V1 wire schema

```jsonc
{
  "type": "stack.split",          // payload kind; a future single-workout share is a new type
  "v": 1,                         // integer protocol version
  "name": "Push Pull Legs",       // 1–64 chars, trimmed
  "workouts": [                   // 1–14, order = rotation order
    {
      "name": "Push",             // 0–64 chars; "" = Stack derives the label from exercises
      "exercises": [              // 0–30, order = exercise order; display names
        "Bench Press",
        "Incline Dumbbell Press",
        "Satwik Cable Rear Delt"
      ]
    },
    { "name": "Pull", "exercises": ["Lat Pulldown", "Seated Cable Row"] },
    { "name": "", "exercises": ["Back Squat", "Leg Press"] }
  ],
  "custom": [                     // omitted when empty; each defined once, in first-use order
    {
      "name": "Satwik Cable Rear Delt",
      "workoutType": "shoulders",          // chest|back|shoulders|arms|legs|core
      "primaryMuscle": "Shoulders",        // 1–48 chars
      "equipment": "Cable",                // Barbell|Dumbbell|Cable|Machine|null (required key)
      "loadType": "external_weight"        // external_weight|bodyweight
      // "metric": "duration"              // optional; written only for timed exercises, absent = reps
    }
  ]
}
```

An exercise reference whose match key equals a `custom` definition **is** that
custom exercise (and must spell its name exactly the same); any other reference
names a built-in. Canonical text is `JSON.stringify` with the fixed key order
above, and equal input always produces byte-identical output.

## Product-data boundary

**Shared:** split name, workout names (including empty/derived), workout order,
exercise order, built-in exercise display names, custom exercise definitions
(name, workoutType, primaryMuscle, equipment, loadType, metric).

**Never shared:** any SQLite id (split, workout, workout-exercise, exercise,
session), `position` columns (array order carries order), created/updated
timestamps, sessions, sets, reps, weights, PRs, working weights, history,
progression, Build data, intensity, kg/lb preference or per-exercise entry unit,
Live Activity state, `secondary_muscle`.

**Set/rep targets:** custom split tables (`custom_splits`,
`custom_split_workouts`, `custom_split_workout_exercises`) store only names,
order and exercise references. Targets live in `split_templates` /
`archetype_templates` (Stack's own templates) and in per-user progression, so
none of that is a routine-definition property of a custom split, and V1
carries none. If routines gain targets later, they can be added as an optional
per-exercise field (see Versioning).

The normaliser copies only known fields into fresh objects, so a `CustomSplit`
or session object with extra properties cannot leak them. A test feeds ids,
weights, sets, units and history through the serializer and asserts none
survive.

## Exercise identity

`exercises.id` is `AUTOINCREMENT` and device-local, so it is never serialized.
`exercises.name` is `UNIQUE` (BINARY, case-sensitive), so the display name is the
practical portable key.

**Built-ins** are sent as a bare name. The adapter only emits a built-in
reference when the row is `is_custom = 0` **and** the name is still a bundled
seed name. Two real cases fail that test and are sent as full custom
definitions:
- a built-in the user renamed (`renameExercise` doesn't check `is_custom`, only
  history), whose name is now meaningless elsewhere;
- a custom exercise that predates a seed of the same name (seed reconciliation
  is `INSERT OR IGNORE`, so the custom row wins).

The caller passes the seed-name set. `EXERCISE_SEEDS` is exported, but
`ARCHETYPE_EXERCISE_SEEDS` is not yet. The future share-side wiring will need
both, which means a one-line export in `workoutDatabase.ts` once Slice 2 lands.

**Custom exercises** carry exactly what `createCustomExerciseSync` writes:
`loadType` and, since schema v17, `metric` (`reps` | `duration`), because the
logger needs both. `secondary_muscle` is always NULL for custom rows, so it's
omitted.

`metric` was added to v1 in place rather than bumping the version: no
importer has shipped, the key is written only when it is `"duration"`, and a
missing key parses as `"reps"`. Every rep-based payload therefore encodes
byte-for-byte as before. If an importer ships before this lands, timed
exercises would need a v2 so an older reader cannot silently import them as
rep-based.

**Matching.** Display names are preserved verbatim (only trimmed, as Stack
does on save). Matching uses a derived key that is never transmitted:
`exerciseMatchKey(name) = NFKC → trim → collapse whitespace → toLowerCase()`.
"Lat Pulldown", "lat  pulldown" and "LAT PULLDOWN" share one key. This is
deliberately broader than SQLite `COLLATE NOCASE` (ASCII-only).

Inside one payload, one key means exactly one exercise. These are rejected:
- the same exercise twice in a workout;
- a built-in and a custom exercise whose names differ only by case;
- two different definitions for one custom name.

A sender who has both a built-in "Bench Press" and a custom "bench press" in
the same split gets a clear error and must rename one. That state is legal in
Stack today, but it's rare.

**Expected future importer policy** (not implemented):
1. *Built-in ref*: resolve to the recipient's `is_custom = 0` row with that
   seed name. If it's missing (the recipient renamed it), re-resolve from
   the bundled seed catalog. If the name is unknown to the recipient's app
   version (the sender is on a newer catalog), block the import with "Update
   Stack" rather than guess.
2. *Custom def*: find recipient exercises with the same match key.
   - Same key, same `workoutType` + `loadType` + `metric` (custom **or** built-in) →
     reuse it. The logger behaves identically.
   - Same key, different metadata → create a new custom exercise under a
     deterministic disambiguated name, e.g. `"<name> (shared)"`, then
     `(shared 2)`, and so on, checked case-insensitively.
   - No match → create the custom exercise with the sender's display name.
3. Always create a **new** split for the recipient. Never merge into or
   activate an existing one without confirmation.

## Versioning

- `type` names the payload kind. Unknown type → `unsupported_type`.
- `v` must be a safe integer ≥ 1. Non-integers, strings, `0` and negatives →
  `invalid_version`. Missing → `missing_version`. An integer that isn't
  supported → `unsupported_version` ("shared from a newer version of Stack.
  Update Stack to open it.").
- **Additive, ignorable fields do not bump `v`.** V1 parsers ignore unknown
  keys at every level, so e.g. optional per-exercise `targets` or a split
  colour can ship as V1. A V1 reader then simply doesn't see them.
- **Bump `v`** only when an old reader would misread the payload: a changed
  meaning, a new required field, or a different reference scheme. The parser
  dispatches by version (`readVersion` → `fromWireV1`), and newer parsers keep
  accepting V1.
- A single-workout share should be `type: "stack.workout"` (or `stack.split`
  with one workout). Neither needs a V1 change.

## Validation and security limits

| Limit | Value | Basis |
| --- | --- | --- |
| Split name | 1–64 UTF-16 units | UI `maxLength` 48 |
| Workout name | 0–64 | UI `maxLength` 48; empty = derived label (DB default `''`) |
| Exercise name | 1–80 | custom-exercise and rename inputs `maxLength` 80 |
| Primary muscle | 1–48 | muscle-group labels; seeds like "Lower Chest, Triceps" |
| Workouts | 1–14 | builder is uncapped; two weeks of distinct days |
| Exercises / workout | 0–30 | builder de-duplicates; no real session comes close |
| Exercises / split | 1–200 | ≥ 1 mirrors `saveCustomSplitDraftSync` |
| Custom definitions | ≤ 100 | |
| Canonical JSON | ≤ 32 KiB UTF-8 | worst case allowed by the UI is ~24 KB (see sizes) |
| Token | ≤ 43,691 chars | 32 KiB × 4/3, checked before decoding |

Every limit sits above the matching in-app input limit. The payload byte cap
is the one deliberate exception: you could hit it with 14 days of 30
max-length custom exercises, and the serializer returns `payload_too_large`
rather than producing something the parser would reject.

**Also rejected:**
- empty or whitespace-only names;
- a workout that has neither a name nor exercises;
- a split with zero exercises;
- unknown enum values (case-sensitive, so `"Chest"` is not a workout type);
- unknown `kind`;
- non-string names;
- C0/C1 control characters, bidi overrides/isolates (U+202A–E, U+2066–9),
  ZWSP, BOM and lone surrogates, which guards against spoofed previews;
- duplicate JSON keys at any depth (`JSON.parse` would silently keep the last
  one);
- non-canonical base64url (padding, `+`/`/`, non-zero trailing bits, length ≡ 1
  mod 4);
- invalid UTF-8 (overlongs, surrogates, truncation, values > U+10FFFF);
- custom definitions that are never referenced;
- references that differ in case from their definition.

`__proto__` keys can't pollute anything because only own properties are read.
No public function throws. Every failure is
`{ ok: false, error: { code, message, path? } }`, and even hostile getters
fail closed.

## Payload sizes

Fixtures use real seed names and include custom exercises
(`tests/splitSharing.test.cjs`). URL = `stack://import-split?d=` + token.
"Deflated" is raw DEFLATE + base64url, for reference only; it is not
implemented.

| Fixture | Exercises (custom) | JSON bytes | Token chars | URL chars | Deflated token |
| --- | --- | --- | --- | --- | --- |
| Small 3×5 | 15 (2) | 726 | 968 | 991 | 427 |
| Medium 5×8 | 40 (4) | 1,528 | 2,038 | 2,061 | 723 |
| Large 7×10–12 | 78 (6) | 2,644 | 3,526 | 3,549 | 1,112 |
| UI max: 7×12, all custom, 80-char names | 84 (84) | 23,996 | 31,995 | 32,018 | (padding compresses unrealistically) |

**Verdict.** `stack://import-split?d=…` is technically viable for V1. iOS
`openURL`, Expo Linking and iMessage handle URLs of this length.

| Length | How it holds up |
| --- | --- |
| Under ~2 KB (small to medium) | Comfortable everywhere |
| ~2–4 KB (a realistic large split) | Works, but the link becomes a wall of text. Some chat apps truncate previews or fail to auto-link very long URLs, and a QR code would need version 25 or above, which is impractical to scan from a phone screen. |
| Above ~8 KB (unusual long-name splits) | Too fragile to rely on |

Recommendations:
- Ship a custom-scheme link for small and medium splits.
- Plan for a universal link (`https://…/s#<token>`). It renders as a tappable
  link in every messenger, and with the token in the fragment it never reaches
  a server.
- Add DEFLATE (`fflate` is already in `node_modules` transitively, not as a
  direct dependency) as a transport-level option, if links must stay under
  ~1.5 KB. It shrinks realistic tokens by about 3×.
- If QR matters, use a short backend share token instead. That doesn't change
  this protocol.

## Notes for the future importer and share UI

- The parsed `PortableSplit` is the importer's only input. Re-parse; never
  trust a cached token.
- `exerciseMatchKey` relies on `String.prototype.normalize`. Verify it exists
  on the production Hermes build before shipping the importer. Node tests can't
  prove that.
