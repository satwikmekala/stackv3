# Your Splits redesign

The builder starts with one day and makes adding exercises the first action. Muscle filters live in the multi-select picker. Creating a personal exercise saves its definition to the catalog and selects it in the picker; the day changes only after Add exercises. Stack templates are previews until applied. Day names, accents, exercise order, and day order remain editable.

## Persistence and compatibility

- The additive SQLite migration adds nullable `custom_split_workouts.color`. Existing workouts resolve Automatic from their first exercise, retaining their previous appearance.
- Palette identifiers are `orange`, `blue`, `purple`, `teal`, `lime`, and `pink`. V1 sharing optionally carries `workouts[].color`; Automatic omits it. Unknown cosmetic values fall back to Automatic. Older clients ignore the field.
- `SaveCustomSplitDraftOptions.activate` defaults to true for compatibility. Save for later explicitly passes false; onboarding always activates and completes setup in the same transaction.
- The editor requires exercises in every day. Legacy saved/imported empty days remain readable and retain the existing launch guard.
- `stack-split-drafts` is a versioned AsyncStorage record, with `new` and `edit:<splitId>` entries. Writes are serialized. Failed or unsupported hydration never overwrites stored data. Pending picker selections are transient; committed day edits are persisted.
- Edit drafts retain their source snapshot and persistent workout IDs. Conflicting/deleted sources can recover as a new split; an existing new draft must be finished or discarded first. Discarding one draft does not discard others.
- Names and day accents apply to the editor, review, split library, and upcoming Today card. Muscle colors and logger measurement/progression behavior stay semantic.

## Automated checks

Passed:

- TypeScript passed earlier in the implementation. The final whole-repository check reports an unrelated TS2367 comparison in `app/(tabs)/profile.tsx:175`; no split-flow type errors were reported.
- ESLint on all changed split screens, components, stores, protocol adapters, and the new tests.
- Persistence/sharing/draft tests pass, including additive migration and preservation of active split state.
- Production screen render/handler checks: 6 tests passed, covering empty-day discovery, picker selection order, custom no-equipment timed exercise creation, template preview, incomplete-day validation, save failure, and stale-edit recovery.
- All 7 draft tests pass: restart, independent edit/new drafts, duplicate IDs, Undo ordering, ordered writes, storage failure, and version/corruption recovery in `tests/customSplitDraft.test.cjs`.

Repository-wide lint also reports errors in unrelated screens. Concurrent profile and other feature changes were preserved.

## Device review still required

Native visual QA was attempted on an isolated simulator. Installation failed with “No space left on device.” The temporary simulator was removed. A browser fallback was also attempted; the existing web setup stopped on the NativeWind color-scheme error and unresolved Expo SQLite WASM. No native visual, VoiceOver, or human usability pass is claimed.

Once the simulator can run:

1. Create two days without selecting a muscle first. Add catalog and custom exercises, choose colors, rename a day, reorder exercises and days, remove/Undo, and save for later. Confirm Today still shows the original active split.
2. Resume an unfinished new split and an unfinished edit after restarting the app. Confirm saved routines remain unchanged until Save. Change/delete an edit source and check recovery as a new split.
3. Preview and apply a Stack workout; cancel both template and picker flows without changing the day. Confirm custom definitions survive picker cancellation while pending additions do not.
4. Check long names, 12+ exercises, many days, narrow phones, keyboard avoidance, large Dynamic Type, VoiceOver move actions, Increase Contrast, and Reduce Motion. Exercise dragging must follow the finger, auto-scroll at the edges, and stop scrolling when released or interrupted.
5. Ask first-time users to create a two-day split without coaching. They should find Add exercises immediately and distinguish selecting an exercise from creating one.

## UI polish and simulator review — October 3, 2026

The attached Stack Design Rules informed this pass: one clear primary action, quieter navigation, content accents, 44-point-or-larger targets, progressive disclosure, and native action menus.

- The library exposes a full-width Edit split action and distinguishes the current split with a textual In use badge. Sharing stays secondary; deletion moves into a native menu with confirmation. Changing the active split refreshes its day preview.
- The builder has a stable toolbar, a checked day selector, grouped Day settings, and a persistent Add exercises action. Empty days have a restrained three-bar Stack illustration and a template shortcut.
- The picker distinguishes selection from creation, keeps pending choices across filters, offers a selected-exercise preview and Clear, and returns to browsing when the last choice is removed. Searching from the selected preview resumes catalog search.
- Review lists individual exercises in workout order. Day editing has a full-width action; ordering/removal lives in a native menu. Settings groups day colors into one surface. Custom-exercise creation uses quieter muscle chips and keeps its submit action outside the scrolling form.
- A scoped SplitPressable resolves callback styles and flattens conditional style arrays before passing them to the native button. Simulator review exposed the runtime dropping those styles: icons and labels became disconnected, backgrounds disappeared, and footer buttons lost their size. The normalization fixes that layout failure and retains press/hover feedback.

Validation: whole-project TypeScript and targeted ESLint pass. The split UI, draft, sharing, and pressable regressions pass (86 tests). Native visual review covered the library, populated and empty editor, picker, pending-selection preview, custom-exercise creation, day settings, review, native day menu, and template preview on the existing iOS 26.3 simulator. Picker cancellation retained the five original exercises; template cancellation left its temporary day empty. The temporary empty day used for visual QA was removed without saving changes to the split.

This pass does not claim a physical-device usability study or a full VoiceOver, maximum Dynamic Type, Increase Contrast, or Reduce Motion audit. Those settings and long-list drag/autoscroll still need a dedicated device pass; the existing accessible reorder actions and Reduce Motion behavior are preserved.

## Native editor navigation and shared muscle colors — October 3, 2026

- The editor uses the parent native navigation header, which supplies Apple's back button even though the editor is the first screen in its nested stack. Review split is a separate pill on the right. Review hides the parent header while it owns navigation; sheets retain the editor header behind them. Returning through the native back button closes the current draft while preserving its stored snapshot.
- Day settings is now Settings. The exercise hint reads “Hold the grip to reorder.”
- Settings exposes colors for each workout muscle category present in the day. Choices save immediately to the device-wide `stack-muscle-colors-v1` preferences and update cards, muscle indicators, exercise information, records, lift progress, workout summaries, and Build. Arms retains the shared Biceps/Triceps category. Logger controls and the resume bar follow an explicitly customized current exercise muscle, including mixed-muscle and adhoc sessions.
- Palette values remain immutable. Legacy day-only accents remain readable; an explicit global muscle preference takes priority, including an explicit Default choice. Preferences are separate from split drafts and sharing. Failed reads block preference writes; failed saves retain the previous appearance and expose recovery in Settings. Reset all data clears these preferences.
- Build's shared history cache invalidates on color changes without needing a new workout. Measurements, progression, and completed workout data are unchanged.

Validation: TypeScript, scoped lint, and 184 regression tests passed, including native-header configuration, restart recovery, failed writes, corrupt hydration, Build cache invalidation, and purple Chest logger controls in a mixed-muscle workout. Simulator visual review confirmed the native back button, separated review pill, Settings title, palette layout, and shortened reorder hint. Full physical-device and accessibility audits remain outside this pass.

## Review navigation follow-up — October 3, 2026

Editor and review now own native headers in the nested stack. They no longer toggle the parent header during navigation. Both headers and the dark content background are configured before the screens open; review excludes the top safe-area inset already handled by its native header. The editor's first-screen back control is a native toolbar button, and review uses the native stack back button. Review split uses one native button capsule on iOS, removing the custom pill inside Apple's shared background.

Validation: TypeScript, scoped lint, and 10 split UI/pressable checks pass. Regression coverage exercises the native Review split callback, stable header/inset configuration, and Edit day returning to the editor. The simulator confirmed the single pill and an opened review with the draft intact. A reliable visual check of the first seconds of the transition remains incomplete because the shared simulator switched windows and loaded another workspace's bundle during QA.

Review now uses the same native SF Symbol chevron toolbar button as the editor, with the automatic back item hidden to avoid duplicates. A native ellipsis menu makes Discard draft available at the top; saved splits also expose Delete split. Both require confirmation. Saved-split deletion removes its unfinished changes only after verifying the split was deleted, since the existing store action can swallow write errors. Failed deletion leaves the draft and navigation available. Back, gestures, editing, recovery, and the action menu are disabled during an in-flight save or delete. The bottom Discard draft action was removed.

Validation: TypeScript, scoped lint, and 13 split UI/pressable checks passed, including confirmation, successful deletion, rejected and swallowed deletion failures, and native back/menu options. Simulator verification of this follow-up was blocked by the locked Mac; no real split was deleted during QA.
