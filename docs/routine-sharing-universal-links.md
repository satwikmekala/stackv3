# Routine sharing: deployment and Universal Links

Status on 2026-10-06 (Asia/Kolkata): Railway sharing is deployed with persistent storage; the website changes are deployed on Vercel; a signed Release development build passed signature, entitlement and profile verification. Public DNS still serves GoDaddy parking HTML and Vercel redirects the apex to www. **The public branded link and physical-device Universal Link flow are not complete until those domain issues are resolved.**

## Architecture and changed files

The sender still creates an immutable V1 snapshot and shares `https://liftwithstack.com/r/<shareId>`. The existing Node backend serves both the public page and API from the same persistent store. The fallback is server-rendered HTML; no JavaScript, SPA, AI call, login, analytics, or second importer is required.

| Files | Responsibility |
| --- | --- |
| `app.json`, `ios/Stack/Stack.entitlements` | Associated Domains in Expo source and tracked native target |
| `app/+native-intent.tsx`, `features/sharing/splitLinkRouting.ts` | Cold/warm URL mapping to existing entry; legacy payload links retained |
| `app/_layout.tsx` | Native launch-options fallback; warm intent supersedes late cold lookup; setup completion uses durable AppEntry |
| `app/shared-routine.tsx`, `features/sharing/sharedRoutineEntry.ts` | Existing Block 2 entry, first-run gate, durable draft before handoff cleanup, cancellation through asynchronous navigation |
| `store/sharedRoutineHandoff.ts` | Extend serialized V1 context with exclusive ID-only variant; retain legacy token recovery |
| `server/src/app.mjs`, `server/src/routineShareWeb.mjs` | SSR, AASA, preview asset, validation/errors, safe logs |
| `server/src/config.mjs`, `server/.env.example`, `server/README.md` | Verified app identity, optional App Store listing and server setup |
| `server/public/stack-routine-v1.png` | One generic 1200 × 630 branded preview PNG |
| `server/deploy/routine-sharing.nginx.conf` | Path-only reverse-proxy example preserving the website |
| `scripts/verify-routine-universal-links.mjs` | Inspect actual signed app and embedded provisioning profile |
| `server/test/routineShareWeb.test.mjs`, `tests/routineUniversalLinks.test.cjs` | SSR/OG/AASA/image/routing/native configuration coverage |
| `tests/onboardingDiscovery.test.cjs`, `tests/customSplitUI.test.cjs`, `tests/sharedRoutineDraft.test.cjs` | Durable handoff, focused entry, stale navigation and existing Block 2 coverage |
| `server/test/routineShares.test.mjs` | Existing request helper accepts HTML on the new public route |
| `docs/split-sharing-v1.md`, this guide | Implementation and release documentation |

## Verified identity and AASA

Bundle: `com.liftwithstack.stack`. Scheme: `stack`. Expo config and tracked `ios/Stack/Stack.entitlements` contain `applinks:liftwithstack.com`. Debug and Release both reference that entitlement file. `AppDelegate.swift` already forwards Universal Links through `RCTLinkingManager`; no duplicate native handler was added.

On 2026-10-05, the locally decoded **Stack app provisioning profile** showed `TeamIdentifier` and `ApplicationIdentifierPrefix` both `4JMBGPRDZG`, and `Entitlements.application-identifier` exactly `4JMBGPRDZG.com.liftwithstack.stack`. Expiry: 2027-09-23. This is verified development-profile evidence, **not proof of the production archive identity**. On 2026-10-06, Xcode automatic provisioning refreshed the profile. The actual signed Release development build and embedded profile now authorize Associated Domains; see the current verification record below. Do not infer the prefix from the certificate's display name.

`STACK_IOS_APP_ID` defaults to that verified identifier. If the production archive differs, supply its exact signed application identifier. The backend serves the following at `/.well-known/apple-app-site-association`, without a redirect or `.json` extension, MIME `application/json`:

```json
{"applinks":{"apps":[],"details":[{"appID":"4JMBGPRDZG.com.liftwithstack.stack","paths":["/r/*"]}]}}
```

Only routine paths are claimed; homepage/privacy/other website routes, `www`, and Railway are not claimed. The branded endpoint requires valid HTTPS. See [Apple Associated Domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains) and [Expo Universal Links](https://docs.expo.dev/linking/ios-universal-links/).

## Browser fallback, metadata, privacy and errors

`GET /r/:shareId` (also HEAD) validates the canonical 22-character bearer ID, reads the same snapshot as `/v1/routine-shares/:shareId`, and uses the existing V1 parser. The dark mobile page shows Stack, routine name, workouts, total exercise occurrences, and “Shared from Stack”. Named empty days count; an exercise on two days counts twice. The explicitly shared workout names and exercise names appear in a compact list; no snapshot JSON or custom exercise definitions are embedded. The page uses the website’s warm ink/bone/orange tokens, Stack mark and three existing local fonts.

“Open in Stack” is an explicit ordinary link, `stack://shared-routine?id=<shareId>`, carrying no payload and invoking the existing recipient entry. No automatic app-launch redirect is used.

Initial HTML contains `og:title` (routine name), `og:description` (`<N> workouts · <M> exercises · Shared from Stack`), `og:site_name=Stack`, `og:type=website`, branded `og:url`/canonical, and `og:image` at `https://liftwithstack.com/routine-share-assets/stack-routine-v1.png`. Image dimensions/alt and Twitter large-image card/title/description/image are included. All text and attributes are escaped. URLs come from configuration, never request Host headers or Railway redirects. The generic public PNG is cached for a year under a versioned path; change its filename version before modifying it after release.

Until a listing exists, “Request beta access” uses the same verified Instagram destination as the website. “Get Stack” is hidden until `STACK_APP_STORE_URL` contains the **verified production** `https://apps.apple.com/.../id...` listing. No listing was found in repo/config, so no guessed ID was added. Server validation checks shape/host; release operators must verify it is Stack's actual production listing. Do not use the test fixture ID.

| Situation | HTTP | Visible copy |
| --- | --- | --- |
| Malformed ID/path | 400 | This routine link is broken. |
| Missing snapshot | 404 | This routine is no longer available. |
| Storage/read failure or corrupt stored snapshot | 503 | Couldn’t load this routine. Try again. |
| Unsupported stored protocol | 422 | This routine needs a newer Stack. Update to open it. |

Errors are branded HTML without JSON, stack traces, SQL, bearer IDs, or an import CTA. Public bearer reads remain unauthenticated. No identity/history/notes/analytics/tracking appears. Server logs redact routine paths and omit queries/payloads. Proxy/CDN/WAF telemetry must omit bearer IDs too; the proxy example disables access/error logging for these paths. Headers include no-referrer, nosniff and restrictive CSP. HTML is `no-store`, though social platforms can cache OG separately. Verify initial HTML and fresh Messages/WhatsApp URLs; browser refresh does not invalidate social caches.

## Cold, warm, first-run and stale routing

Expo Router invokes `+native-intent` for cold and warm URL events. The pure mapper owns only the exact branded HTTPS host with `/r/...`, or explicit `stack://shared-routine?id=...`, mapping to `/shared-routine?id=...`. Unrelated URLs retain ordinary routing. Owned malformed links reach broken-link UI with an empty ID and never fetch/stage. Legacy `stack://import-split?d=...` keeps its strict existing importer.

The root's existing React Native launch-options fallback uses the same mapper because a cold iOS URL may exist there before Expo supplies it. New warm events invalidate a late initial lookup. Arrival must match route and parameter.

After profile hydration, incomplete first-run users durably store only `{shareId,saved:null}` in the existing `stack-shared-routine-handoff-v1` context before normal setup. Back, termination and onboarding draft cleanup preserve it. Existing setup completion uses `onboardingDestination`, now resuming the remote entry. AppEntry does the same after relaunch. Root completion redirects pass through AppEntry so they cannot bypass the pending routine.

Setup does not save/activate the received routine. The existing Block 2 entry fetches, validates, stages and opens the editor after setup, flushing the isolated draft before clearing its owned pending ID. Save remains the existing transaction/receipt importer, with dormant-library and retry rules unchanged. New links replace old durable context; stale token/ID exits clear only their own context. Focus and AbortSignal checks span fetching, staging and asynchronous editor navigation.

## Current deployment record — 2026-10-06

### Railway

Existing project `peaceful-delight` (`5fcd7997-fb62-4f16-a5f7-b396159a7f88`), production service `motivated-caring` (`fa4234c3-d95c-4aba-a57a-ea85d6d22700`). Existing API origin remains `https://motivated-caring-production-04ef.up.railway.app`.

- Attached volume `945d32f9-6837-49a4-9dbb-d0a58bdfac68` at `/data`.
- Set `ROUTINE_SHARES_DB_PATH=/data/routine-shares.sqlite`, `ROUTINE_SHARE_PUBLIC_ORIGIN=https://liftwithstack.com`, `STACK_IOS_APP_ID=4JMBGPRDZG.com.liftwithstack.stack`.
- Deployed the current server using a minimal archive containing only `server/`. Deployment `f1435ffd-4969-4ca3-b8ad-27370069568d` succeeded.
- Redeployed the exact image as `2ef0e5b1-bbe5-4f45-a7c1-2c61c68e31ea`; the sample snapshot remained byte-identical and health returned 200.
- SQLite uses WAL and FULL durability, insert-only snapshots and 128-bit random IDs. Keep one service replica; volume snapshots/backups are still an operational responsibility. No new database service or AI calls are required for sharing.
- Existing parsing credentials and model configuration were preserved.

### Vercel and website

The domain-owning project is **`liftwithstack-app`**, ID `prj_atacpvWQscit67h0fh00YyytvcYz`. It is connected to `satwikmekala/liftwithstack`, not the Stack app repository.

- Committed and pushed only sharing changes in website commit `6a74e8fe254b0926d77a1a6625f161061d21ec30`.
- Git integration deployed production `dpl_5u4kVpUiBhdC2VoeuhGgFP7mK9Pw`, `liftwithstack-n63c302uj-satwikmekalas-projects.vercel.app`, status READY as verified through Vercel MCP.
- `vercel.json` internally proxies `/r` and `/r/:path*` to Railway. Homepage and all unrelated routes remain the existing website.
- AASA, the branded 1200×630 preview PNG and existing website fonts are static public files on Vercel; they do not depend on Railway availability.
- Headers ensure AASA is JSON and share HTML is no-store/no-referrer. Disabled external rewrite caching on `liftwithstack-app` **through Vercel MCP**.
- Vercel MCP inspected all four similarly named projects, the owning project’s domains, deployment and readiness. The connector rejects explicit team scope arguments, but default-scope project calls work.
- Direct edge checks using the registered www Host (routing around stale DNS, without bypassing authentication or TLS) returned 200 for the real routine page and AASA JSON. Initial HTML contains the exact routine title/counts, canonical branded URL, Open Graph image dimensions/alt, and Twitter metadata.

### Remaining domain blockers

Both apex and www currently resolve to GoDaddy parking (`3.33.130.190`, `15.197.148.33`; www is a CNAME to apex). Ordinary public requests return 114-byte parking HTML. The registered Vercel apex also has a 308 redirect to www, which redirects AASA and prevents the required apex association response.

GoDaddy DNS records must be set to the **actual values shown by the Vercel project domain configuration**, preserving other records. The apex must connect directly to production rather than redirect to www. No registrar/DNS login is available in the connected tools. The Vercel connector has domain inspection/addition but no existing-domain update tool; the dashboard login has been opened for the user to authenticate. No unverified DNS targets were substituted.

Once credentials are available, finish those two settings, verify normal public HTTPS (no DNS override) returns 200 JSON at the apex AASA, then reinstall the signed app so Apple can associate the corrected domain.

### Signed native build

Xcode built `/tmp/stack-routine-sharing-device/Build/Products/Release-iphoneos/Stack.app` successfully with automatic provisioning. The user approved macOS certificate access. `scripts/verify-routine-universal-links.mjs` passed:

- strict code signature verification;
- bundle ID `com.liftwithstack.stack`;
- signed and profile application ID `4JMBGPRDZG.com.liftwithstack.stack`;
- signed `applinks:liftwithstack.com` entitlement;
- profile permission for Associated Domains.

This is a signed **development-distribution Release build**, not an App Store release. The signed build was installed successfully on Satwik’s connected iPhone 14 Pro after it was unlocked. A cold launch carrying the ID-only fallback URL succeeded. The user confirmed that the iPhone editor displays the sample routine name and its two workouts, with Bench Press and Shared cable press in Push. The sample intentionally contains Push plus an empty Rest workout despite its “Push / Pull / Legs” fixture name. Physical editing/Save and Messages/WhatsApp Universal Link taps remain unverified.

### Tests and evidence

- Full Stack suite: **852 passed**, zero failures/skips.
- Backend suite: **28 passed**, zero failures/skips; protocol synchronization passed.
- Website tests: **6 passed**; production Next build and website typecheck passed.
- App typecheck passed after excluding the independent website from the Expo compilation scope.
- New `tests/routineSharingE2E.test.cjs` passed against both local real HTTP/SQLite and the live Railway API. It executes the actual native share producer (native sheet bridge replaced), cold/warm URL mapper, fetch validator, isolated editor draft, edits/reopening, coalesced transactional Save, and independent recipient database.
- End-to-end assertions cover custom exercises, malformed/missing IDs, metadata, snapshot immutability after sender edits, no auto-save/activation, and unchanged existing active routine/profile.
- Sample live API snapshot: `6JBDxo_pZQFclua_IZIlpA`. The intended public URL is `https://liftwithstack.com/r/6JBDxo_pZQFclua_IZIlpA`; it remains blocked by public DNS.
- Desktop and 390×844 browser previews were visually checked with live Railway content and the website’s static assets. Fonts loaded, and document width was exactly 390 pixels on mobile.
- Existing tests cover unsupported versions, cancellation, duplicate opens, custom conflicts, crash/retry receipts, first-run handoff and legacy imports. Automated cold/warm mapping is not a substitute for OS Universal Link taps.

### Files changed in this finishing pass

`server/src/routineShareWeb.mjs`, `server/test/routineShareWeb.test.mjs`, `tests/routineSharingE2E.test.cjs`, `scripts/verify-routine-universal-links.mjs`, `tsconfig.json`, and this guide. Website repository: `vercel.json`, `public/.well-known/apple-app-site-association`, `public/routine-share-assets/` (preview PNG and three existing fonts), `tests/routine-sharing-config.test.mjs`.

The existing sender, portable protocol, exercise resolver, durable shared editor draft, transactional import/save, first-run handoff and cold/warm routing were preserved.

## Required signed physical iPhone checklist

Use a newly signed/installed build, deployed branded paths, and a real fresh immutable share. Record device, iOS, build, app ID and AASA response.

1. Tap from WhatsApp with Stack installed: editor for the exact routine.
2. Tap from Messages: same editor; check title/counts/generic preview.
3. Tap from Notes and Mail: same edit-first entry.
4. Force-quit then tap: cold launch reaches the editor once.
5. Foreground Stack on another screen then tap: warm entry; existing draft intact.
6. Background Stack then tap: correct routine after foregrounding.
7. Fresh install/incomplete setup: tap, proceed/back/relaunch through onboarding; finish any supported setup path. Original ID opens an unsaved edit draft. No automatic saving/activation of the received routine.
8. Receive B while A loads; leave during fetch/handoff: A cannot change newer navigation/draft. Only explicit Save creates the final routine.
9. Without Stack installed: branded browser page. Configured Get Stack reaches the verified production listing, never a test listing.
10. From Safari fallback with Stack installed, press Open in Stack: ID-only link reaches the same editor/save rules.
11. Paste a URL in Safari's address bar: browser fallback can be expected. Verify the useful page and explicit CTA; this is not the external-tap test.
12. From another `liftwithstack.com` page in Safari, tap a routine URL: staying in Safari can be expected same-domain behavior. Verify explicit CTA. See [Apple TN3155](https://developer.apple.com/documentation/technotes/tn3155-debugging-universal-links).
13. Malformed and missing IDs in app/browser: concise errors, no saved routine or activation; retry temporary failures.
14. Fresh WhatsApp/Messages previews: distinguish social caching from HTML defects; confirm no exercise/history/private data.
15. Existing legacy payload link cold/warm: existing preview/import works.
16. Homepage and unrelated website paths remain browser routes, unclaimed by Stack.

Blockers: GoDaddy DNS and apex redirect configuration; physical installation/tap checklist; App Store distribution and a verified listing if direct public installation is required. **Universal Links cannot be considered complete until tested in a signed physical-device build.**
