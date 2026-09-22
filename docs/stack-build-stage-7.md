# Stage 7 — Home and introduction

Implemented in the isolated `codex/stack-build-prototype` worktree. Stage 8 is not started.

## Behavior

- Home has a quiet **Your Build** card below the existing workout and split controls. It shows logged-workout/closed-week totals and a small vector preview of up to five recent slabs. Empty history shows an empty plinth and an invitation to finish a workout.
- The workout hero, start/resume action, workout picker, and split card remain unchanged. Build-enabled Home scrolls so the additional card clears the floating tab bar; the existing padding provides room below it.
- The preview derives from the same evidence and slab models. Home loads no Three.js renderer or GL context. It refreshes when sessions change, on focus/foreground, and at local week boundaries.
- First entry to Build (including direct Case entry) shows three screens: a workout becomes a piece; a week becomes a block; the Case preserves the sessions. All screens offer Skip and Close, later screens offer Back, and the last screen offers See my Build.
- Skip and completion use the same local `stack.build.introduction.v1` marker. Close does not mark it seen. Storage failures never block entry; dismissal is remembered for the running app session even if writing fails.
- The Monolith/Case does not mount while the introduction is visible, so fusion reconciliation cannot consume an event behind the introduction. Casting continues directly to its existing summary flow and does not trigger the introduction.
- No animated GL visuals or automatic page advancement are used in the introduction. Its content scrolls independently of the fixed navigation controls.
- Build remains behind the existing explicit iOS development flag. Existing account onboarding, Android/web, ordinary production Home, and workout persistence are unchanged.

## Validation

- 64 tests pass, including introduction first-entry, interruption-before-dismissal, persisted dismissal, and storage-failure handling, plus the existing Build/persistence/record regressions.
- Type checking passes. New feature files and Build routes pass ESLint. Home retains the same 16 pre-existing lint errors as HEAD (verified before/after); no new Home lint errors were introduced.
- iPhone 17 Pro simulator: visually inspected all three screens; completed the introduction into saved-history Monolith; cold-restarted and verified it did not repeat; inspected Home with the workout action still primary; scrolled the Build card clear of the tabs and used it to reopen Build.
- No saved workouts or account onboarding values were changed during validation.

Physical-device, VoiceOver, and large-text acceptance remain part of the release-hardening checkpoint.
