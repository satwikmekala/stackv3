# Exercise notes

The workout logger has a 48 pt icon floating at bottom right, without a footer
strip or text label. Supported iOS devices use native Liquid Glass and the
bubble.left SF Symbol; other platforms retain an opaque circular fallback.
The scroll content has enough bottom padding to move past the floating control.

The native page sheet puts the editor directly beneath the exercise title, with
24 pt side margins and dated bullet points below it. There is no bottom-pinned
composer or vertically centered empty state. The history scroll view adjusts its
keyboard insets on iOS, so long content remains reachable.

On iOS, an InputAccessoryView hosts a real UIKit UIToolbar with a system Done
item above the software keyboard. Done explicitly saves a nonempty draft, clears
the editor, dismisses the keyboard and confirms “Note saved” visually and through
an accessibility announcement. It leaves the sheet open so the saved bullet can
be reviewed. With an empty draft it only dismisses the keyboard; a failed save
keeps the draft and keyboard available for retry. The same system control appears
beside the editor when a nonempty draft has lost keyboard focus. The accessory
is mounted only while the sheet is visible, so reopening creates a fresh link
to the current editor. Cancel/dismiss and interactive
keyboard dismissal do not save implicitly. Other platforms have a Done fallback.

The NotesDone native view is registered in StackWorkoutControls, so this change
requires rebuilding the iOS app rather than only refreshing JavaScript. The
sheet uses Stack type/color tokens, opaque content surfaces, scalable text and
reduced-motion behavior. Buttons use static TouchableOpacity styles; earlier
style callbacks were not rendering correctly in the app's styling pipeline.

Notes live in SQLite schema v20, keyed by catalog exercise ID and the workout
where they were written. Renames preserve identity. New workout occurrences
show past notes in the sheet without copying them into their own reports.
Discarding a workout retains explicitly saved notes, detached from the session.
Deleting a note removes it from future renders/exports of its original report.
Resetting all data clears notes too.

Report notes appear beneath their exercise in both report densities, the share
image, and accessible plain text. A note on an unlogged exercise remains visible
with “Not logged”; it does not invent sets or change workout totals.

Automated coverage includes persistence/reopen, migration, renaming before
logged history, session isolation, deletion, discard/reset, invalid/stale
targets, swaps/additions, multiline notes, report density and skipped/unlogged
exercise notes. Run:

```sh
node --test tests/workoutPersistence.test.cjs tests/workoutReport.test.cjs tests/workoutSummary.test.cjs tests/adhocWorkoutUI.test.cjs
```

iOS Simulator verification (iOS 26.3, iPhone 17 Pro) covered the compact layout,
software keyboard visible with typed text, a legible system Done control above
the keyboard, explicit Done save, editor clearing, keyboard dismissal, the new
bullet point under “This workout”, and its delete action. The saved content was
also checked in the disposable QA database. Native arm64 builds, TypeScript and
targeted ESLint pass; 184 report, persistence and workout UI regression tests pass.

The check caught a retained InputAccessoryView association after modal dismissal;
the accessory now unmounts while the sheet is hidden. Repeated reopen, long notes,
compact screens, VoiceOver, larger text, Reduce Motion and report legibility
still benefit from on-device review. Temporary LogBox suppression used to remove
a development overlay during QA has been removed from the source.
