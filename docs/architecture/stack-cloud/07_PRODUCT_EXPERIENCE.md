# Product experience

Status: proposed, grounded in the repository as reviewed 8 October 2026. Public cloud release includes Apple sign-in, explicit snapshot backup and verified restore. Continuous backup begins only after Stage 4; active workout continuation across devices remains out of scope.

## Existing product language and placement

The iOS Settings screen is an `@expo/ui/swift-ui` native `Form` with `Section`, native buttons, system body text and native navigation (`features/settings/SettingsScreen.ios.tsx`). Its React Native counterpart uses grouped surfaces, 44-point header targets, wrapping at larger text scales, and concise section footers (`SettingsScreen.tsx`). Reuse this structure and `redesignColors` from `constants/theme.ts`: ink background, neutral surfaces, bone text and ash secondary text. Account status does not introduce a new celebratory color system.

Current Settings has Personal, Workout, Reminders, Manage data and Help and about (`useSettings.ts`). Add **Account** as a visible Settings row with one concise status value. Account opens a native page containing identity, backup status, backup action, login methods, privacy/export and lifecycle actions. Preserve **Manage data** for local file export/import; rename its Backup section to **Backup file** so it cannot be mistaken for cloud protection. Keep destructive actions in separate groups with native destructive styling.

Existing Help and about says all workout data stays on device and no cloud sync exists. Replace at launch with: “Workouts are saved on this iPhone. If you enable cloud backup, Stack stores a copy in your account. You choose when to share exports and routines.” At the snapshot-only stage say “You choose when to back up” on the backup page; never say updates are automatic.

The current iOS implementation already uses native forms. Preserve that baseline rather than introducing a custom account dashboard. Apple's account guidance is relevant, but its full rendered body was not retrievable in this research session; treat the design specifics here as Stack proposals, not claimed verbatim HIG requirements. [Apple managing accounts](https://developer.apple.com/design/human-interface-guidelines/managing-accounts). Apple native authentication integration supports the platform button. [Expo AppleAuthentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/).

## Introduction without a login wall

Keep current local onboarding and workout startup. Add a secondary **Restore from cloud** action on the initial welcome screen for reinstalling users; it must be reachable before completing a new training profile. It opens identity selection and recovery, never resets local state merely by opening it. A newly created onboarding draft does not count as user workout history, but confirm discarding it when restore succeeds.

After the first completed workout is durably saved, show one small dismissible row beneath the completion result: “Saved on this iPhone” / “Protect your history with cloud backup.” Actions: **Set up backup**, **Not now**. Do not interrupt set logging, show a modal before the user sees the completed workout, or ask again on every completion. Persist dismissal locally; Account remains available. Existing users see the same one-time optional row after their next completed workout, with no migration login gate. Do not trigger a first-workout nudge when viewing imported/restored history.

The nudge is a proposal awaiting founder approval. Settings-only discovery is an acceptable quieter launch variant. Do not add fear-based notifications, account prompts to routine sharing, or a mandatory email capture screen.

## State model and exact copy

Authentication, ownership and backup state are independent. A signed-in user can have no backup; a signed-out user can have a verified older backup; an offline user can have newly saved local changes. Store the status facts explicitly rather than deriving safety from “signed in”.

| State / trigger | Title and body | Actions / recovery |
|---|---|---|
| Guest, Settings Account | **Saved on this iPhone** — “Create an optional account to back up your completed workouts, routines and preferences.” | **Set up backup**; **Sign in to restore**; back |
| Sign-in sheet | **Protect your history** — “Keep using Stack offline. An account lets you back up and restore your saved data.” | Native **Sign in with Apple**; **Not now**; Privacy policy. Google absent until approved. |
| Provider in progress | **Signing in…** | Allow system cancellation; no workout data transfer |
| Provider cancelled | Return to previous screen; no error alert | Retry at user discretion |
| Sign-in failed | **Couldn’t sign in** — “Your workouts are still saved on this iPhone. Try again when you’re connected.” | **Try again**; **Continue without an account** |
| Signed in, no backup yet | **Backup not set up** — “Your data is saved on this iPhone. Nothing has been backed up to this account yet.” | **Back up now**; account details |
| Ownership preparation | **Back up this iPhone?** — “[N] completed workouts and your saved routines will be backed up to [account label].” | **Back up now**; **Cancel**; view included data |
| Active workout at snapshot capture | **Finish your workout first** — “Your active workout is saved on this iPhone. Finish or discard it before making a backup.” | **Return to workout**; **Not now** |
| Capturing snapshot | **Preparing backup…** — “Creating a consistent copy of your saved data.” | Bounded snapshot boundary; pause capture if a workout starts; persist checkpoint before upload; safe cancellation |
| Uploading | **Backing up…** — “[acknowledged] of [total] records uploaded.” Footer: “Keep Stack open to finish sooner. You can keep using Stack.” | **Pause backup**; leave page; retry automatically on foreground while enabled |
| Upload done, validation pending | **Checking backup…** — “Confirming all records are present and ready to restore.” | Leave page. Never show a completed checkmark here. |
| First backup committed | **Backed up securely** — “Backup from [date, time]. Includes [N] completed workouts.” | **View backup details**; **Back up now** when changed |
| New local edits after snapshot | **Changes not backed up** — “Last complete backup: [date, time]. Your latest changes are saved on this iPhone.” | **Back up now** |
| Offline, no completed backup | **Waiting for connection** — “Saved on this iPhone. Your first backup hasn’t finished.” | **Try again**; keep logging |
| Offline with earlier backup | **Backup paused** — “Last complete backup: [date, time]. New changes are saved on this iPhone.” | Retry on foreground/network return; **Try again** |
| Manual pause | **Backup paused** — “Your latest changes are saved on this iPhone.” | **Resume backup** |
| Retry exhausted / service failure | **Couldn’t finish backup** — “Your data is still saved on this iPhone. We’ll keep the last complete backup.” | **Try again**; **Export backup file**; error reference |
| Auth expired/revoked | **Sign in to continue backup** — “Your workouts are still saved on this iPhone.” | **Sign in again**; **Not now** |
| Unsupported app/schema | **Update Stack to continue** — “Your data is still saved on this iPhone. This backup needs a newer version of Stack.” | **Update Stack**; local logging remains available |
| Restorable cloud backup found | **Your backup is ready** — “[N] completed workouts · [date, time].” | **Restore on this iPhone**; **Not now** |
| Restore download | **Restoring your data…** — “[downloaded] of [total] records downloaded.” | **Cancel restore**; resumes from checkpoint later |
| Restore validation | **Checking restored data…** — “Checking workouts and saved routines before opening them.” | No “ready” state until validation and atomic switch finish |
| Restore success | **Your history is back** — “[N] completed workouts restored from [date, time].” | **Open Stack**; local reminders need fresh permission/configuration |
| Restore failure/corruption | **Couldn’t restore this backup** — “Your existing data hasn’t changed.” | **Try again**; **Choose an earlier backup** if available; support reference |
| No complete cloud backup | **No completed backup found** — “There isn’t a completed backup to restore for this account.” | **Use Stack on this iPhone**; **Try another account**; do not claim history never existed |
| Server state unknown/offline during sign-in | **Couldn’t check your backup** — “Connect to check this account before backing up or restoring.” | **Try again**; keep local use. Do not assume empty cloud account. |

Use server-confirmed backup time, rendered in the user's current local timezone; expose full date/time in details and accessibility text. Percentages use acknowledged work against an immutable manifest denominator, not queued request counts. A spinner is preferable when the denominator is unknown. Screen-reader progress announcements should be throttled; do not announce every record or reorder focused controls.

## Backup details and truthful scope

Details show account/provider label, last complete backup time, completed workout count, routines/custom definitions/profile inclusion, validation result, and pending local changes. Use a short stable account suffix if relay email is absent or ambiguous. Avoid presenting provider email as the account's immutable identifier.

“Backed up securely” is permissible only after a durable server commit and manifest validation for the displayed snapshot. It does not claim end-to-end encryption. Do not display it as an unqualified current status when newer required local changes exist. Details must say: “This backup includes completed workouts, saved routines and supported preferences. Active workouts, unsaved drafts, device permissions and temporary previews aren’t included.” The final supported-preferences list comes from the authoritative inventory.

A completed workout saved after capture is outside that snapshot; local status immediately becomes “Changes not backed up” even if the older upload finishes successfully. First release uses explicit **Back up now**, a last backup date and no “always protected” promise. Stage 4 may introduce **Automatic backup** with the footer “Updates when Stack is open and connected. Background updates aren’t guaranteed.” The status continues to show pending changes and last verified checkpoint receipt.

## Ownership choices and restore safety

| Situation | Required sheet / options | Guardrail |
|---|---|---|
| Local data, empty cloud account | **Back up this iPhone?** with local count and account label | Explicit ownership adoption, no implicit upload during sign-in |
| Empty phone, cloud data | Backup summary → **Restore on this iPhone** | No new profile setup required first |
| Both local and cloud history | **History found in two places** — “This iPhone has [L] workouts. This account has [C] in its last backup. Stack won’t combine them automatically.” | **Keep this iPhone’s data**, **Restore account backup**, **Cancel**. Keeping local leaves adoption unresolved and cloud upload paused. |
| Restore replacing local history | **Replace this iPhone’s data?** — “Restoring will replace the data currently shown on this iPhone. Save a backup file first if you want to keep it.” | **Export backup file**, **Restore and replace**, **Cancel**. Require a verified internal rollback checkpoint as well; export alone is not a rollback implementation. |
| Local namespace owned by A, sign-in B | **This history belongs to another Stack account** — “Sign back in to that account to continue its backup. Switching accounts won’t move these workouts.” | **Sign in to original account**, **Switch to this account**, **Cancel**. Switching requires isolated dataset activation and explicit restore choice. |
| Second writer device | **This account backs up from another iPhone** — “Move backup to this iPhone to protect changes made here.” | **Move backup to this iPhone**, **Not now**. Transfer requires server fence and clear warning that unbacked changes on the other phone do not transfer. |
| Same globally mapped workout in local and cloud snapshot | No duplicate-import prompt | Protocol handles known IDs/revisions; never deduplicate by matching date/name |

No restore replaces a database while an active workout is in progress. Explain why and return to the workout. Initial restore can be cancelled before activation; on an empty phone the user may choose **Start without restoring**, which creates local data and makes subsequent restore a replacement choice. Do not allow a partial recovery dataset to become the logging database. During final validated activation, show a short blocking state only for the local swap; the network download is not allowed to lock a populated phone's workout logger.

If sign-in finds an older backup, display its exact date and count. Never interpret “older” as permission to overwrite either side. Advanced merge/import previews are deferred.

## Sign-out, deletion and linking

**Sign out?** “Your history will stay on this iPhone. Backup will pause. [N] changes haven’t been backed up.” Actions: **Back up first** if available, **Sign out**, **Cancel**. When no pending changes, omit that sentence. Sign-out remains possible offline. Add: “Remote session sign-out couldn’t be confirmed while offline” when applicable; local credentials must still clear. Retained data keeps its existing owner, so a later different sign-in cannot upload it.

Do not overload the current **Delete all data** action. Separate:

- **Remove data from this iPhone**: clears the local dataset after checkpoint/export choice and pauses/detaches backup; does not enqueue mass cloud deletion. Explain that the cloud copy remains.
- **Delete cloud backup**: explicitly removes stored cloud generations after reauthentication; at Stage 4 it also clears normalized current workout state and change payloads using a dataset epoch/fence reset. Local data/account remain, cloud uploads turn off so deletion is not immediately undone. Existing retention policy applies; later backup needs fresh opt-in.
- **Delete account**: removes the account and its cloud data, with the retention statement from the security policy. Offer **Keep a local copy on this iPhone** as an explicit choice, never assume it silently. Export remains available before confirmation.

Deletion screen: **Delete your Stack account?** “This deletes your account and cloud backups. You won’t be able to restore them after deletion. [Approved retention explanation].” Actions: **Export my data**, **Continue**, **Cancel**. Continue performs recent provider reauthentication, then one destructive **Delete account** confirmation. Result: **Account deletion requested** / “Cloud access is disabled. We’ll finish deleting your data within [approved period].” Do not show “Account deleted” before the durable job completes. Retryable failure offers **Try again**; deletion status remains accessible without requiring access to deleted workout data.

When Google eventually ships, Account → **Sign-in methods** → **Add Google** uses the approved linking flow from `03_IDENTITY_AND_SECURITY.md`. Copy: “Use Google to sign in to this same Stack account.” If another history exists: **These are separate accounts** / “Stack can’t combine these histories automatically.” Preserve both accounts and offer cancellation and export guidance. Do not instruct users to use matching emails as a linking method.

## Acceptance checks for product review

1. Cold install can log a workout without network, account or privacy consent for optional cloud collection.
2. Restoring users find recovery before onboarding; returning guest users retain their current flow.
3. No UI says a backup succeeded until its complete server receipt is available; latest local changes are clearly distinguished.
4. Killing the app in every backup/restore state returns to a truthful resumable status.
5. Account switches, cancellation and sign-out cannot cause a different owner's history to appear or upload.
6. VoiceOver, large Dynamic Type, Reduce Motion, long names, missing/relay email and translated copy remain usable; destructive choices have explicit labels.
7. The first-release copy never promises live multi-device sync or active workout recovery.
8. Errors include a safe support reference, not payloads/tokens; a cloud error never blocks workout completion.
9. Cloud/local/file-backup deletion scopes are visually and behaviorally distinct, including tests of the current Manage data actions.
