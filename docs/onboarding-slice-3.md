# Onboarding Slice 3: train without a program

Slice 3 is complete. This execution adds the usable no-program Train experience and accurate program controls. The new Welcome remains behind its development preview gate; production onboarding and the later onboarding paths are unchanged. Existing workspace changes were preserved. No commit, push, deployment, publication, app submission, or automation was performed.

## Experience

No-program Train now shows **Ready when you are.** and **Start a workout and add exercises as you go.** Its primary action opens an empty workout through the existing logger. The existing warm textured workout surface, bold Bricolage lettering, orange Stack mark and tactile start control carry Stack's personality. No fake exercise count or example training history is shown.

**Get workouts from Stack** and **Saved routines** open the relevant ordering of Your Splits without activating anything. Until Slice 5, Stack's program configuration uses the existing library/settings controls. Custom building stays inside the app.

Your Splits uses explicit program mode for active badges. Stack is inactive in no-program mode, and saved custom routines remain inactive unless selected. **Train without a program** clears the selected program through the persisted store action while retaining routines. The current no-program state is labelled explicitly.

An existing session takes precedence in every mode and shows **Resume workout**, including while a selected custom routine is loading. The launch callback checks the latest store state, so a stale ready-screen callback resumes a newly existing session. Repeated presses cannot duplicate creation or navigation; rejected creation restores retry. The secondary empty-workout action in other modes shares this behavior.

Display headings scale up to 1.5×; descriptions remain fully scalable and wrap without fixed text heights. At larger font scales, the slide control becomes a wrapping native start button, as it already does for screen readers. The layout is scrollable. Normal and large simulator screenshots are in [the QA directory](qa/onboarding-slice-3/).

Simulator cold starts exposed an existing native-tab race: a selected asynchronous vector fallback could resolve before its default icon, causing the native screen error requiring an icon alongside selectedIcon. Train and Stack now use one vector fallback apiece, retaining their native iOS default/selected SF Symbols. Progress assets, tab labels, routes and native navigation remain intact. Repeated cold starts and browsing all three tabs succeeded after this fix.

## Validation

- **268 tests passed** across workout persistence, ad hoc UI, custom-split UI, home slide behavior, Settings and shared-routine experience.
- **14 new focused cases** cover no-program browsing, launch origin, duplicate taps, rejected-start retry, resume in all three modes, a stale launch callback, descriptive hero content, large-text native start, library ordering/active labels, program removal preserving saved routines, failed persistence preserving selection, and real SQLite launch/reopen/completion without a split.
- `npm run typecheck` passed.
- ESLint passed on the five application/component files and three test files changed in this slice.
- `git diff --check` passed.

The real SQLite test reopens the production initializer/store against a disposable database; it verifies session identity and logged sets survive reopening and that completion leaves no active program or saved split.

### Isolated iOS review

Reviewed the existing iPhone 17 Pro simulator on iOS 26.3, using **only** the isolated `com.liftwithstack.onboardingpreview` app and its separate data container. A completed QA profile was seeded there to exercise Slice 3 without implementing Slice 4 app entry. The user's ordinary app data was untouched.

1. Browsed Train, Progress, Stack and Your Splits. Database counts remained zero for sessions, session exercises, sets and routines: [after-browsing.json](qa/onboarding-slice-3/after-browsing.json).
2. Started an empty workout through the control's exposed accessibility action. The existing logger opened with no exercises and no custom builder.
3. Minimized and resumed the same session from Train: [resume screenshot](qa/onboarding-slice-3/resume-none-normal.png).
4. Added Bench Press, logged three sets of 8 at 40 kg, finished through the existing intensity flow, viewed the earned piece and summary, and returned to the ready hero.
5. Verified one completed ad hoc session, one exercise, three sets, zero routines, and the unchanged no-program profile: [after-completion.json](qa/onboarding-slice-3/after-completion.json), [summary](qa/onboarding-slice-3/completed-empty-workout.png), [Train after completion](qa/onboarding-slice-3/train-after-completion-normal.png).
6. Reviewed Train and Your Splits at normal and accessibility-extra-large text sizes. Restored the simulator's original `large` category afterward. [Large Train](qa/onboarding-slice-3/train-large.png) and [large library](qa/onboarding-slice-3/splits-none-large.png) show the reviewed initial viewport.

### Limits before final cutover

Large text extends below the initial viewport. The screen exposes its actions in the accessibility tree, but native scrolling/drag automation did not move the simulator content; hand scrolling and the lower viewport at large sizes remain unverified. Switching the simulator text category while the app was open produced stale text layout until a cold restart; screenshots were taken after remounting. Manual live-category changes remain to be checked.

Actual VoiceOver operation, narrow phones, maximum Dynamic Type, Reduce Motion, Increase Contrast, reduced transparency, offline operation and physical-device behavior were not verified in this slice. Resume across all program modes, saved-routine retention and failure recovery are covered by focused behavioral tests; the actual simulator walkthrough used no-program mode. The isolated clone also emits an existing missing widget/shared Live Activity file warning, dismissed for screenshots; physical Live Activity behavior was not checked or changed.

## Next execution: Slice 4 only

Connect Welcome → Starting Point → persisted no-program app entry for tracking and exploration. Add persistent onboarding draft navigation, retryable saving and duplicate-completion protection. Keep guided-program entry preview-only until Slice 5, and keep the Welcome release gate until final integration. The full seven-slice plan remains the contract; this checkpoint ends Slice 3 without a routine approval pause.
