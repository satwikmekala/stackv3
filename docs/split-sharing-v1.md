# Split Sharing V1

## Public URLs and Universal Links — Block 3, October 5, 2026

The backend now serves `/r/:shareId` as minimal server-rendered HTML with escaped
routine name, counts, OG/Twitter metadata, generic preview and an explicit ID-only
`stack://shared-routine?id=...` CTA. Its AASA claims only `/r/*`. Native Expo and
tracked iOS configuration carry `applinks:liftwithstack.com`; cold/warm mapping
uses the existing Block 2 entry. First-run pending IDs survive setup through the
existing durable handoff store, then open an unsaved edit draft.

See the [release guide and signed iPhone checklist](routine-sharing-universal-links.md)
for identity evidence, exact deployment/proxy requirements and remaining blockers.
The branded domain is currently parked; deployment and signed physical-device
validation remain required. Universal Links are not yet production-verified.

## Recipient editing — Block 2, October 5, 2026

`/shared-routine?id=<shareId>` is the internal recipient entry for a short share.
It uses the same backend host configuration as the sender, fetches the canonical
V1 snapshot, validates it through `parseSharedSplitJson`, checks built-in names
against both bundled seed catalogs, then replaces the loading route with
`/custom-split?source=shared&shareId=<shareId>`. Block 3 now supplies the HTTPS
link routing, AASA and browser page described above. The legacy
`stack://import-split?d=…` preview/import path remains supported.

The normal editor now supports source `shared`. Each share owns a
`shared:<shareId>` slot within the existing `stack-split-drafts` store, alongside
`new`, `stack` and `edit:<id>`. Other unfinished drafts stay intact. Reopening
the same share resumes its edited draft; a different share gets another slot.
Back closes the live context and retains the slot. The library exposes
Continue building for each shared draft, so restart recovery works offline.
Discard removes only the current slot. Builder cleanup checks ownership so an
older screen cannot close a newer incoming draft.

Received exercises use negative temporary IDs and retain validated portable
definitions. Built-in seed metadata supports rendering even if the local row
was renamed or removed; the importer restores/resolves it only on Save.
Custom exercises created from the shared editor also remain staged, including
picker selections. IDs are allocated monotonically within the context so Undo
cannot restore another exercise. Drag callbacks now use a null idle marker,
supporting both staged and ordinary positive catalog IDs. No routine, workout,
relationship or exercise rows are written before the final Save.

Routine/workout names, colors, workout/exercise order, timed custom definitions,
and named empty workouts survive staging and editing. Shared name inputs accept
the existing V1 64-character limit. Workout colors can be edited in Settings.
An empty workout without a name still fails the existing V1 rules. Normal
new-routine, pasted, onboarding, Stack-plan and edit-existing modes retain their
save paths and validation.

Review shows only **Save routine** for this source. The final draft projects
ordinary catalog picks through the existing portable adapter and retains staged
definitions, then validates again. `saveSharedRoutineDraft` persists an attempt
UUID through the existing draft queue before invoking `importPortableSplitSync`.
That importer performs the single catalog/graph transaction, including custom
equivalence, conflict disambiguation, name collisions, ordering and rollback.
Its existing receipt prevents duplicate saves after repeated taps or a cleanup
failure. A committed receipt detected on cold editor recovery clears the stale
shared draft and returns to the library. No profile, activation, history or
sender connection is written. Successful saves clear only their shared slot
and return to `/your-splits?source=shared`; this destination also works before
onboarding without creating a profile.

Loading requests are cancelled on blur/unmount. An ownership check also ignores
late results from requests that disregard cancellation. IDs/payloads that fail
validation, missing shares, network/server failures and newer protocols use
concise fixed copy. Save failure keeps the draft and permits retry; a draft
storage failure prevents committing until the attempt can be persisted.

Block 2 files: `app/shared-routine.tsx`, `app/_layout.tsx`, `app/your-splits.tsx`,
`app/custom-split/{index,review,exercises,new-exercise,personalize}.tsx`,
`components/custom-split/SelectedExerciseList.tsx`,
`store/{customSplitDraft,workoutDatabase}.ts`,
`features/routineImport/importDraft.ts`, `features/sharing/routineShareClient.ts`,
new `features/sharing/{sharedRoutineDraft,sharedRoutineEntry,saveSharedRoutineDraft}.ts`,
`tests/customSplitUI.test.cjs`, new `tests/sharedRoutine{Draft,Drag}.test.cjs`,
and this document. Unrelated concurrent working-tree edits were preserved.

Device validation still needed: cold resume and swipe-back between editor and
review, negative-ID drag/autoscroll and VoiceOver ordering, staged custom
creation/picker cancellation, long Unicode names and colors, first-run save
without activation, offline library recovery, and storage failure/retry after
a committed save. Automated tests replace native controls/gestures; no physical
iPhone validation was performed for Block 2.

Block 2 automated verification: **791 app tests passed, zero failures/skips**
in the full `tests/*.test.cjs` run, including editor, shared drafts, pasted
routine, onboarding, importer and legacy sharing compatibility; **21 backend
tests passed**. Focused shared/import/draft tests also passed independently.
Type checking, focused lint, the generated-server-code sync check,
`git diff --check` and a production iOS Hermes export passed. Full-suite checks
include unrelated concurrent changes in this shared workspace.

## Current sender transport — Block 1, October 5, 2026

Saved routines now use the existing portable adapter and canonical V1 serializer
to upload a detached snapshot to `POST /v1/routine-shares`, then share the returned
`https://liftwithstack.com/r/<shareId>` link through the same native sheet. The
8,192-character sender URL budget has been removed; the unchanged 32 KiB V1
payload limit still applies. Native copy, button loading/error behavior and the
legacy custom-scheme decoder/import routes are preserved. Upload and share-sheet
calls for the same routine coalesce, and failure releases the lock for retry.

The server stores immutable canonical snapshots in SQLite on a configured
Railway volume and exposes unauthenticated `GET /v1/routine-shares/:id`. See
[server setup and API contract](../server/README.md#routine-shares--block-1) for
the required volume, environment variables, errors and deployment checks.

This block does not add the `/r/:id` browser page, HTTPS recipient routing or
Universal Links. Old `stack://import-split?d=…` links still use the importer
described below. The following local-transport architecture, limits and device
QA document the earlier implementation; they do not verify the new server flow.

Block 1 verification: **117 passed** across `splitSharing`,
`splitSharingExperience`, `routineImport`, `onboardingDiscovery` and
`pasteRoutine`; **21 passed** across the backend HTTP suites. Type checking,
focused lint on all touched source/tests, generated-server-code sync,
`git diff --check` and a production iOS Hermes export passed. Native sharing
and HTTP responses are mocked in app tests; backend tests use real HTTP and
file-backed SQLite. No Railway deployment or physical-iPhone test was performed.

Block 1 files:

- Sender: `features/sharing/shareSavedSplit.ts`, `shareSplit.ts`,
  `splitTransport.ts`, and new `routineShareClient.ts` in that directory.
- Server: `server/src/app.mjs`, `config.mjs`, `server.mjs`, and new
  `routineShareStore.mjs` in that directory; `server/package.json`,
  `server/.env.example`, `server/.gitignore`, `server/README.md`.
- Tests: `tests/splitSharingExperience.test.cjs` and new
  `server/test/routineShares.test.mjs`.
- Documentation: this file. Existing unrelated working-tree edits were preserved.

## Original V1 implementation and verification

Implemented from `0dca599` (`feat: integrate Stack workout system update`). The
portable V1 schema and validation rules are unchanged. This feature adds the
saved-program sharing UI, local transport, preview and transactional importer.

## User experience

Sender: open **Your Splits**, find a saved custom split, tap **Share Split**,
then choose an app or **Copy** in the native system sheet. The message contains
the split name, “Shared from Stack”, and the full link. Sharing reads the saved
graph; an unsaved builder draft is never sent. Both active and inactive saved
splits can be shared.

Recipient: open the link, review the split name, ordered workouts and exercises,
then tap **Add to Stack**. Custom exercises show muscle/equipment and measurement
context. Opening the preview performs no import writes. Success shows the actual
saved name and **View split** / **Done**. View opens the existing editable builder;
Done opens Your Splits. Activation remains the existing, separate **Activate**
action in Your Splits. No workout starts automatically.

A fresh install can preview and save before onboarding. Success offers
**Continue to Stack**; the saved copy remains available after setup. Malformed
links show “Can't open this Stack split.” and the protocol's error context.
Unknown built-ins report that Stack needs updating when Add is attempted.

## Architecture

1. `getCustomSplitDetailAsync` reads the saved structural graph.
2. `portableSplitFromCustomSplit` projects only routine definition fields, using
   names from both bundled seed catalogs for built-in identity.
3. `encodeSharedSplit` validates/serializes the existing V1 format, then applies
   the existing UTF-8/base64url transport. `prepareSplitShare` creates
   `stack://import-split?d=<token>` and enforces a separate direct-link budget.
4. `Share.share` receives the readable message, with its full URL included so
   Copy preserves it. No custom contact UI or third-party network call exists.
5. `/import-split` calls `parseSharedSplit`. Arrays/duplicate query parameters,
   invalid encodings, versions, types and oversized payloads fail closed.
6. `importPortableSplitSync` delegates to `persistPortableSplit`. This boundary
   serializes/parses again to validate and normalize its input, checks bundled
   built-in availability, then uses **one `withTransactionSync` transaction** for
   catalog additions, a new split, ordered workouts and exercise relations.
7. A preview-owned `createSplitImportAction` coalesces immediate repeated calls
   into one Promise. Success stays locked; a failed transaction permits retry.
   A newly opened link gets a fresh action, including the same URL on a warm app.
   Library refresh occurs after commit, so refresh failure cannot cause reimport.

Only `exercises`, `custom_splits`, `custom_split_workouts` and
`custom_split_workout_exercises` are inserted. There are no imported profile,
session, set, target, progression, history, PR, Build or Live Activity values.
Split/workout IDs are allocated locally. Existing catalog IDs can be reused
locally, but are never transported. No schema migration is needed.

Expo Router 57 uses Expo Linking's synchronous iOS initial URL. The simulator
exposed a cold launch where the URL was available only in React Native's launch
options. The root layout now reads `Linking.getInitialURL()` before its normal
redirect, and `splitImportRouteFromUrl` maps only Stack import links to the
internal route. Normal routes retain their existing redirect behavior. The
floating workout bar is hidden on the import screen so it cannot cover Add;
the active session and Live Activity remain intact.

## Resolution and collisions

Built-ins use `exerciseMatchKey` to find the bundled seed, then resolve the
recipient's compatible non-custom catalog row. The canonical seed name wins
over source capitalization. An unknown seed fails safely with “Update Stack”.
If a built-in has been renamed/missing locally, restore its bundled definition
without mutating the old row. If an incompatible custom exercise occupies that
name, restore under a safe name such as `Bench Press (Stack)`. Repeated imports
reuse that restored definition.

Custom equivalence is deliberately conservative: normalized name and primary
muscle, plus exact workout type, equipment, load type and metric. Equivalent
catalog definitions, including a safely equivalent built-in, are reused. A
missing definition is created. An incompatible `Cable Rear Delt` becomes
`Cable Rear Delt (shared)`, then `(shared 2)` if needed; existing definitions
are never changed. Repeated imports reuse equivalent disambiguated definitions.
Other incoming exercise names are reserved so suffixes cannot collapse two
different exercises. Generated names are bounded and preserve surrogate pairs.

Split collisions use normalized comparison and the first available suffix:
`Push Pull Legs`, `Push Pull Legs 2`, `Push Pull Legs 3`. Every import creates
new split and workout rows. Existing programs stay untouched.

Resolving to the recipient's catalog preserves the ordinary global-history
behavior. Launching an imported Bench Press uses their own history, settings
units and normal progression suggestions. No separate history is created.

## Measurement support

All four combinations survive saved split → link → parse → separate DB → launch:

| loadType | metric | Logger behavior |
| --- | --- | --- |
| external_weight | reps | Weight + reps |
| bodyweight | reps | Reps only |
| bodyweight | duration | Time only |
| external_weight | duration | Weight + time |

Timed definitions retain `metric: duration`; timed session sets have zero reps
and their duration lives in the existing duration field. There are no imported
set prescriptions or performed values. New exercises use Stack's normal defaults.

## Automated verification

On October 2, 2026:

- `node --test tests/*.test.cjs`: **401 passed, 0 failed, 0 skipped**.
- **30 new** experience/import tests plus **38 existing** protocol tests passed.
- The full run includes persistence, measurement, previous-weight progression,
  Workout Report, Build, and JavaScript Live Activity regressions.
- `node tests/runLiveActivityNativeTests.cjs`: all **7 reported PASS groups**,
  including the actual JavaScriptCore/Expo callbacks, native serial executor,
  timed controls, burst cases and durable inbox recovery. ActivityKit is mocked
  in this harness; these are not physical-device tests.
- `npm run typecheck`: passed.
- ESLint on the new feature code and touched database/root modules: passed.
  Your Splits retains two pre-existing `react-hooks/refs` errors; the same errors
  were verified using the file at HEAD before the sharing change.
- `git diff --check`: passed. Production iOS Hermes bundle export: passed.

Tests execute production SQL with real Node SQLite and separate sender/recipient
databases. Coverage includes privacy, missing seeds, seed restoration, all custom
metadata collisions, equivalence/reuse, bounded Unicode names, reserved suffixes,
ordering, empty named workouts, independent editable copies, no activation or
active-session mutation, rollback after catalog/workout/relation failures,
rapid taps/retries, first-run saving, the full measurement matrix and recipient
history/unit/progression preload. Native share is mocked only in automated tests.

## Simulator validation actually performed

Used iOS 26.3 simulator builds with a newly exported production Hermes bundle
embedded in the already-built matching Stack native app. No native dependency
was added. Sender: **Stack Integration QA**. Separate fresh recipient:
**Stack Split Sharing QA**, device ID `56895AFC-C234-4BDC-A12B-6118087D2E23`.

1. Saved the synthetic **Sharing QA Matrix** program (two workouts, seven
   exercise entries, four custom measurement combinations) on the sender.
2. Your Splits → Share Split opened the real system share sheet. Copy produced
   the expected readable message and a **1,118-character** URL.
3. Opened that exact copied URL on the fresh recipient. Before Add, SQLite had
   zero splits, sessions, sets and profile rows. Preview names and all four
   measurement contexts were correct. Add succeeded before onboarding.
4. Completed onboarding through the app with Stack's default program. Your
   Splits contained the imported program and still showed Stack's split active.
5. Logged a recipient Bench Press set through the app at 40 kg. For a focused
   history fixture, marked this QA session complete and configured pounds / a
   5 lb step directly in the dedicated recipient SQLite database, then reloaded.
   This fixture provisioning did not copy any sender history.
6. Explicitly activated the imported split through Your Splits, then launched
   Measurement day. Bench Press preloaded **88.2 lb** (the recipient's 40 kg)
   and showed **Last 88.2 / Try 93.2**. Duration-only custom logging showed TIME
   `0:30`, with no reps or weight controls. SQLite confirmed all four session
   measurements and the recipient's `lbs` entry units.
7. Terminated the app and reopened the copied link. The cold preview succeeded
   with the ongoing workout intact. Double-clicking Add created exactly one
   additional split, **Sharing QA Matrix 2**. Active split remained ID 1; there
   were still only four custom catalog definitions and the original two sessions.
8. Reopened the same URL while success was visible: a fresh preview appeared.
   Opened `stack://import-split?d=abc=`: the safe corrupted-link error appeared,
   with no additional data. Final recipient database checks passed.

QA bundle, copied message/link, recipient database verification and history
screenshot are under `/tmp/stack-split-sharing-qa/`. The test simulator remains
available for inspection. Android, physical-device sharing and actual delivery
through WhatsApp/Messages were not exercised. Copy/system-sheet and two-instance
import were exercised; no message was sent to a real person.

## Limits

The portable protocol accepts up to 32 KiB JSON / 43,691 token characters.
Direct sharing has the stricter **8,192-character complete URL** budget; larger
links are rejected before the native share sheet opens. Realistic few-thousand
character links are allowed. Messenger apps vary in whether they recognize or
truncate custom-scheme links; V1 needs Stack installed and has no universal-link
website, install fallback or backend. Encoding, preview and persistence are local
and work without an account or backend once the message arrives.

## Files and working tree

| Status | File | Change |
| --- | --- | --- |
| Modified | `app/_layout.tsx` | Import route, first-run exception, cold-link fallback, unobstructed import actions |
| Modified | `app/your-splits.tsx` | Share action on each saved custom program |
| Modified | `store/workoutDatabase.ts` | Export both seed catalogs / name set; clean import API |
| Modified | `features/sharing/splitTransport.ts` | Update route documentation comment only |
| Modified | `docs/split-sharing-protocol.md` | Link the implemented V1 experience documentation |
| New | `app/import-split.tsx` | Preview, Add, error, success and first-run UI |
| New | `components/SplitShareButton.tsx` | Accessible, locked share action |
| New | `features/sharing/shareSplit.ts` | Pure message/link preparation and transport budget |
| New | `features/sharing/shareSavedSplit.ts` | Fresh saved-graph read and native system sharing |
| New | `features/sharing/splitLinkRouting.ts` | Narrow custom-scheme cold-launch mapping |
| New | `features/sharing/importAction.ts` | Single interaction / repeated-tap protection |
| New | `store/splitImport.ts` | Revalidation, safe catalog resolution and atomic save-only graph creation |
| New | `tests/splitSharingExperience.test.cjs` | 30 experience/import regression tests |
| New | `docs/split-sharing-v1.md` | Architecture, verification, file inventory and limitations |

The original implementation was left uncommitted for integration. Unrelated pre-existing changes to `.claude/launch.json`,
`eslint.config.js`, `tsconfig.json`, and the untracked `film/` directory were
preserved. Concurrent changes observed in Live Activity documentation, the
Expo Widgets patch, native ordering tests and persistence tests were also left
untouched by this implementation. Full-suite results include those concurrent
test additions. This task does not change latency profiling, report architecture,
Build semantics, the measurement model or previous-weight progression rules.


## Stable-baseline integration verification — October 2, 2026

Audited against HEAD `0dca599`; the reported 14-file sharing inventory matched.
Root/database overlaps contain only sharing additions. No feature semantics or
concurrent Live Activity/config/film files were changed during integration.

Re-ran targeted sharing tests (68 passed), full JS tests (401 passed, zero failed
or skipped), typecheck, all seven native PASS groups and production iOS Hermes
export successfully. Focused lint retained exactly the two Your Splits refs
errors; running ESLint on its HEAD source confirmed the same diagnostics.

Installed the newly exported bundle in the existing matching QA simulator app.
Normal startup and Your Splits navigation worked. Share Split opened the native
sheet with Copy visible. The computer-use coordinate action failed with
`noWindowsAvailable`, so Copy was not completed again in this integration run.
Used the previously copied QA URL for the recipient cold-launch smoke: preview,
Add to Stack, Added and View split all succeeded without a crash. SQLite checks
confirmed no preview writes, exactly one new `Sharing QA Matrix 3` graph and
unchanged profile/active program, sessions, session exercises and sets. All four
measurement contexts appeared in preview and the editable split. The exhaustive
fresh-install/onboarding and two-instance Copy QA above was not repeated.

Integration stages only the fourteen sharing files listed above for one local
`feat: add split sharing and import` commit. No push or tag is part of this work.
