# Identity and security

Status: proposed architecture; repository discovery and official documentation reviewed 8 October 2026. Nothing in this document is an implemented control. Recommended deployment: managed Supabase Auth and PostgreSQL, with a separate Stack Cloud API on Railway. Local guest use makes no authentication request.

## Repository evidence and native readiness

| Evidence | Finding and consequence |
|---|---|
| `package.json` | Expo 57 / React Native 0.86; `@supabase/supabase-js` is already listed, but repository search found no application usage. A dependency is not an existing account system. AppleAuthentication, SecureStore and native Google Sign-In are absent. |
| `app.json` | Bundle ID `com.liftwithstack.stack`, `stack` scheme, and `applinks:liftwithstack.com`; `expo-web-browser` plugin already exists. There is no Apple sign-in capability declaration. |
| `ios/Stack/Stack.entitlements` | Associated domains and app group are present; Sign in with Apple entitlement is absent. Native files are checked in, so config and generated native settings must be verified together in a future implementation. |
| `ios/Stack/PrivacyInfo.xcprivacy` | Required-reason declarations exist; collected-data array is empty and tracking is false. Reassess declarations and App Store privacy answers when cloud collection ships; these are distinct artifacts. |
| `features/settings/useSettings.ts` | Current public copy promises device-only data and no cloud sync. Must update at cloud launch. No account screen exists. |

Use native Apple authentication on iOS and the system-provided Apple button. Configure the App ID capability, provisioning, plugin and built native entitlement; verify release builds on physical devices. Expo documents nonce/state support, nullable consent fields and native credential-state checks. Do not infer release readiness from Expo Go. [Expo AppleAuthentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/).

Google is supported by the architecture but **deferred from the first public cloud release**. Expo recommends a native Google sign-in library requiring a development build. Before enabling it, prove compatible package versions, iOS client/bundle configuration, callback handling and the explicit-linking gate below. [Expo Google authentication](https://docs.expo.dev/guides/google-authentication/).

## Stable ownership

Generate an immutable random `app_user_id` in Stack's database. All workout ownership refers to it; never to email, Apple subject, Google subject, device ID or a local numeric profile ID. A separate broker binding maps the verified Supabase issuer/subject to it. Provider enrollment records map `(issuer, provider_subject, audience_scope)` to the application account, with a unique constraint and an explicit enrollment audit. Provider subjects are scoped correctly for the configured app/team/client; app/team transfers require their own tested migration.

For the Apple-only release, reject other providers and disabled login methods at both broker configuration and Stack authorization boundaries. Bootstrap the binding transactionally, under uniqueness constraints, after a verified Apple session. A retry must return the same `app_user_id`. Account creation must not upload or relabel local data.

A local database has a persistent ownership namespace: `unclaimed` or one specific `app_user_id`. On first adoption, show local/cloud summaries before binding. Bind only after explicit confirmation and a durable local recovery checkpoint; this is not a claim that a cloud backup already exists. Once bound, sign-out does not erase ownership. Unsent records cannot be uploaded to another account. A user may continue logging offline into that same namespace after signing out; those records remain for that owner. Separate guest usage after sign-out requires a new isolated namespace, never silently relabeling the existing database.

## Linking without merging histories

Supabase documents automatic linking for OAuth identities with matching verified email and manual linking, including native ID-token flows. Manual linking is documented as beta. This review did **not** verify a supported switch that disables automatic email linking. A UI confirmation alone cannot override broker behavior. [Supabase identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking).

Therefore Google must remain disabled until the following design is proven, or an auth broker with enforceable explicit linking is selected:

1. Maintain Stack's approved provider registry independently of broker identities. Email and the broker's list of associated identities grant no application access by themselves.
2. At session bootstrap require fresh, server-validated proof from an **approved provider subject**, bound to a server challenge and the authenticated broker session. Reject or quarantine a new automatically associated identity; do not return backup metadata merely because `auth.uid()` already belongs to an account.
3. Issue an opaque, random Stack authorization grant stored hashed server-side and bound to `app_user_id`, approved identity, Supabase `session_id`, installation and account authorization epoch. Cloud requests require both the valid broker JWT and grant. Renewal preserves the same binding; a new broker session requires provider proof. Account/identity revocation invalidates grants immediately. This grant is an application access gate, not an alternative password or identity provider.
4. Explicit linking starts from the existing approved account, requires recent proof of its existing provider, then proves the new provider against a separate one-use challenge. Reserve uniqueness and write the enrollment atomically. Accept only when the new provider has no other Stack owner.
5. If two app accounts already exist, return `ACCOUNT_LINK_CONFLICT`. Do not rewrite owners or merge histories. Provide exports and a separate future, reviewed migration process. A support agent must not bypass proof of both accounts.

This extra gate is deliberately **not required to build Google support for launch**: avoid its complexity by shipping Apple only. Before a second provider launches, test automatic linking, token refresh, stale grants, broker unlinking, provider revocation and direct API bypass. If the provider flow cannot supply freshness/session binding robustly, this design fails its launch gate; reconsider the broker, rather than weakening ownership rules.

Apple relay email, hidden email, changed email, absent name and different emails between Apple/Google do not affect account lookup. Display the local chosen name and a provider label; do not ask users to disclose a real email to restore. Apple full name can be absent after initial consent. Native-only Apple login does not have the same six-month OAuth client-secret rotation requirement as web OAuth; adding web login changes that operational obligation. [Supabase Apple integration](https://supabase.com/docs/guides/auth/social-login/auth-apple).

## Authentication and session contract

- Use maintained OIDC/JWT validation, never decode-only authorization. Verify algorithm allowlist, signature with trusted issuer JWKS, exact issuer, expected audience, expiry and subject. Handle signing-key rotation with bounded caching and one refresh on unknown key; fail cloud operations closed if validation remains impossible.
- Generate cryptographic one-use nonce and state per attempt; keep attempt expiry, expected provider, callback and initiating install/session. Validate callback state and reject reuse, cancellation races and unsolicited callbacks. Native Apple nonce hashing/raw-nonce handoff must match the selected Expo/Supabase APIs and be verified in a physical-device test. No universal assumption that every SDK hashes for the caller.
- Browser-based flows use authorization code + PKCE, strict callback allowlists and system browser sessions. Never put access/refresh tokens in analytics or deep-link logs. Prefer verified universal-link callbacks where supported; custom schemes require state and PKCE protection.
- Google token verification checks signature, audience, issuer and expiry; identify the provider account with `sub`, not mutable email. [Google verification guidance](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
- Use broker access tokens only for their configured resource; provider ID tokens are exchanged for broker sessions, not accepted as routine cloud API bearer tokens. Provider authorization codes needed for Apple revocation are handled by a server workflow and immediately exchanged; do not retain raw codes.
- Broker sessions use access/refresh token pairs and refresh-token rotation with reuse protections. Serialize refresh within the app; persist the new pair before scheduling dependent requests. On transient failure, keep local logging available and retry with jitter. On terminal invalidation, pause cloud work and show reauthentication. [Supabase sessions](https://supabase.com/docs/guides/auth/sessions).

Tokens belong in a tested SecureStore adapter, never AsyncStorage, SQLite backups, exported JSON or widget app-group defaults. Handle native storage-size/write failures before reporting signed in. Choose a device-only Keychain accessibility class appropriate to foreground backup; do not require biometrics for every automatic refresh. On cold launch with no installation marker but surviving credentials, request explicit account confirmation before restore or binding. SecureStore may survive iOS uninstall, but this is not guaranteed and is not a backup mechanism. [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).

Use an account authorization epoch and session/device revocation registry checked on every cloud request. JWT expiry alone is insufficient for immediate deletion/sign-out enforcement: Supabase notes that an issued access token remains valid until expiry after sign-out. [Supabase sign-out](https://supabase.com/docs/guides/auth/signout). A request already committed before revocation remains committed to its original owner; return its operation status when safely queried later. A late response must never update another account's local status.

## Lifecycle and ownership matrix

| Event | Required behavior |
|---|---|
| Guest starts app | SQLite only; no broker anonymous account, network prerequisite or hidden upload. |
| Account created on populated phone | Sign-in establishes identity only; inspect cloud state and ask to protect these local records. |
| Account found with cloud data | Show last verified backup and count. On nonempty local history, offer keep local/export or restore replacement with checkpoint; no automatic upload, overwrite or merge. |
| Same account returns | Resume its queue only after account, namespace, device fence and schema checks. |
| Different account selected | Pause previous queue and ignore in-flight callbacks using generation tokens. Preserve previous namespace. Require explicit isolated switch; never assign its records to the new owner. |
| Sign-out | Stop scheduler; clear credentials and local active auth; retain bound history by default. Attempt remote session revocation when online; do not claim remote revocation succeeded offline. Pending operations remain bound. |
| Provider authorization revoked | Mark cloud auth unavailable on detection; require fresh sign-in or an already linked provider. Never delete workout data solely because a provider revoked authorization. |
| Remove provider | Require recent approved proof and another usable enrolled provider. Never remove the final login method without account deletion. |
| Lost all providers | No recovery through email similarity or support assertion. Preserve local records/export; recovery requires a separately designed, verified proof process. |
| Account deletion | In-app recent reauthentication and explicit confirmation, then server-side durable deletion job described below. |

## Server authorization and isolation

All private workout reads, writes, manifests, exports and restore download authorization go through the separate Cloud API. Derive the owner from verified authentication; ignore body-supplied ownership. Every parent lookup and child insertion scopes by owner. Use composite owner/ID foreign keys so cross-account references fail even if an API check regresses. Public share identifiers are not private cloud authorization credentials.

Private schemas have no `anon`/`authenticated` direct table access. Where exposed tables exist, enable deny-by-default RLS and explicit policies. API runtime uses a restricted database role and transaction-local owner context; migrations/admin roles stay separate. Verify RLS with the actual runtime role, because owner and service roles can bypass it. An API service key is not an authorization policy. [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

Bounded request/record sizes, per-install/account/IP rate limits, upload byte quotas, restore/export concurrency limits and retry-after responses protect resource consumption. Return the same generic error for absent versus unauthorized private IDs. Do not expose account-existence or email-search endpoints. Verify provider webhooks cryptographically and deduplicate their event IDs before revoking sessions.

## Deletion, retention and privacy

Proposed policy, requiring founder/legal approval: immediately disable cloud reads/writes and invalidate sessions when a deletion request is accepted; purge live personal data and account bindings within 7 days; expire inaccessible operator backups within 30 days. These are product targets, not verified provider guarantees: procurement must prove all database, object, log and replica retention paths can comply before publishing these numbers.

The deletion job is idempotent, checkpointed and retryable: mark account deleting and bump epoch → revoke sessions → revoke Apple authorization through the appropriate server token endpoint → remove objects/manifests/records/exports/identity bindings → delete broker account → mark completed in a minimized deletion ledger. Retain only necessary non-content deletion/audit evidence with separately approved retention. Do not cascade away job progress before revocation finishes. Apple token acquisition/exchange and revocation must be demonstrated end-to-end; deleting a Supabase user alone is insufficient.

Offer local-history retention as an explicit user choice; default deletion action explains whether this phone is also erased. A retained local copy becomes a separately confirmed local-only dataset after cloud deletion, without the old upload queue; recreating an account must not silently resurrect the deleted cloud backup. Offline other devices retain local data until reached; server denial prevents further upload immediately. Operator restore procedures must reapply the deletion ledger before enabling restored services.

Apple requires in-app initiation of account deletion and revocation of Sign in with Apple tokens; account deactivation alone is insufficient. Appropriate reauthentication is allowed but routine email/support barriers are not. [Apple account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/).

Proposed security baseline: TLS for all network traffic, encrypted provider disks/backups, encrypted exports in temporary server storage, and device file-protection verification for SQLite/WAL/checkpoints. Encryption at rest does not mean end-to-end encryption: authorized operators and service processes can read data. E2EE is deferred because recovery/key management would require a different product contract. Managed hosting leaves application access and data handling responsibilities with Stack. [Supabase shared responsibility](https://supabase.com/docs/guides/deployment/shared-responsibility-model).

Collect provider subjects, account ID, optional display/contact details, required workout/profile content and minimal operational timestamps. No advertising identifier or tracking SDK. Redact bearer tokens, provider responses, email, notes, body measurements, full workout payloads and export URLs from logs. Use pseudonymous IDs, event codes and aggregates. Secrets stay in separate environment secret stores with least-privilege access, rotation and no client embedding. Require staff MFA, named accounts, time-limited production access and audited break-glass approval; support access must not expose full workout content by default.

App Store release work includes a public privacy policy, account deletion instructions, collection/use/retention disclosure, and truthful privacy labels for the actual data flow and third-party SDKs. Health/fitness data, identifiers, contact data and diagnostics must be assessed separately. [Apple privacy details](https://developer.apple.com/app-store/app-privacy-details/). Guideline 4.8 defines privacy-preserving equivalent login requirements when offering third-party login; Apple Sign-In is the planned qualifying option. Optional guest use and accurate account/data disclosures remain part of review readiness. [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).

Jurisdictions/target ages are an open decision, not a declaration of compliance. Where applicable, privacy law may require lawful basis, access, correction, erasure, restriction, portability and objection workflows; the ICO summarizes these UK GDPR rights. [ICO individual rights](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/). Determine whether particular workout/body information constitutes legally protected health data, regional transfer requirements, processor agreements, breach deadlines and minors' rules with counsel before launch. Do not claim HIPAA/GDPR compliance merely because a vendor offers relevant contracts. Existing CSV exports are useful but a full machine-readable account export must cover all authoritative entities and preferences.

## Threat model and release evidence

| Threat | Control | Required evidence |
|---|---|---|
| Forged/expired/wrong-audience token | Verified issuer/JWKS/claims and closed cloud failure | Negative token matrix and signing-key rotation test |
| Login replay or callback interception | One-use challenge, nonce/state, PKCE where applicable | Replayed token/callback rejected; cancelled attempts cannot bind |
| Email collision / provider takeover | Apple-only launch; provider enrollment gate before Google | Same email/different subject cannot access or merge history |
| Cross-account object reference | Server-derived owner, restricted role, composite FKs, RLS | User A cannot read/write/delete/download any B entity |
| Sign-out/account-switch race | Bound namespaces, generation checks, server epoch | Delayed A response cannot mutate B UI, DB or queue |
| Malicious oversized upload | Schema/size quotas, timeouts and rate limits | Bounded memory/CPU; 413/429 recoverability |
| Stolen device/token | Keychain, revocation registry, recent proof for deletion/linking | Revoked session denied before JWT expiry |
| Insider/log exposure | Content redaction, scoped staff roles, audit | Log scanning and operational access review |
| Deletion resurrection | Durable ledger, restore reapplication, disabled epochs | Restored operator backup cannot expose deleted account |
| Provider/Cloud API outage | Cloud pauses; SQLite stays usable | Offline full workout round trip |
| Corrupt restore | Signed-in owner binding plus manifest and semantic validation | Wrong-owner/incomplete data never replaces live DB |

Security audit events: session enrollment/revocation, provider link attempt/result, ownership bind/switch, device transfer, export, deletion lifecycle, operator access and authorization denial. Include request correlation, pseudonymous owner/device and server time; exclude payloads. Security incident runbooks must support disabling cloud mutation without disabling workouts, revoking affected sessions, investigating scoped logs and restoring verified service data.
