# Settings redesign

Settings and its editors are full-screen pushed pages in the app's native navigation stack, with a system back button and swipe-back navigation. SwiftUI supplies the grouped forms, toggles, checkmarks and text entry; the name editor uses a native Done button. Stack's existing warm background and surface colors remain. Android and web use compact grouped rows with the same shared behavior. Editors sit behind rows instead of filling the main screen with controls.

## Preferences and behavior

- Personal: name, optional weekly training-day goal, and preferred training days.
- Workout: default weight unit, independent adjustment steps for kg and lbs, Live Activities, and haptic feedback.
- Experience: Reduce effects when Build is available; the system's accessibility preferences still apply.
- Manage data: completed-workout CSV, backup export and restore, and confirmed device-data deletion.
- Help & About: version, logging behavior, weekly goal meaning and local-data information.

The weekly goal counts distinct local days with a completed workout. Two sessions on one day count once. A zero goal disables the target without hiding actual training. An empty schedule means flexible training.

The automatic program has its own frequency. Schema 21 adds `program_weekly_goal` and preserves each existing user's old frequency once. Goal and schedule edits subsequently leave the program, current workout and history intact. The program editor is also reachable from Your Splits.

The global automatic-increase switch has been removed. Automatic sets repeat the logged values; previous-session and edited targets remain protected. Explicit Try suggestions still work, and manual adjustment preferences do not change their suggested increases.

Preferences publish after successful persistence. A delayed read cannot replace a newer saved choice. Unread preferences cannot authorize haptic feedback or Live Activities. Turning Live Activities off ends their visibility and retains the active workout.

## Data

Backups contain all workout database tables, saved routines, exercise notes, profile preferences, muscle colors, watched lifts and Reduce effects. Unsaved routine drafts are excluded and cleared when data is restored or deleted. Backup and restore require an idle workout. Imported table and column names never become executable SQL. Schema, cell shapes and profile values are checked before replacement; references and integrity are checked in the SQLite transaction. A failed restore rolls back database changes. AsyncStorage failures trigger restoration of the prior database and preferences.

CSV separates canonical kg weights, reps and duration seconds, retains logged/skipped flags and notes, and escapes spreadsheet formulas and quoted or multiline text. Export uses Apple's share sheet; restore uses the system file picker. No cloud sync is implied.

## Verification

- TypeScript, scoped ESLint and whitespace checks passed.
- Native iOS simulator build passed, including the Live Activity authorization query and picker haptic preference props.
- 229 focused tests passed: SQLite migration, program independence, set propagation, explicit progression, backups and rollback, CSV, persisted preferences, Live Activity visibility and draft deletion.
- Simulator review confirmed native grouping, weekly-goal choices, the name editor, Manage data, Help & About, native navigation and JSON export through the share sheet. The later full-screen revision replaces sheet dismissal with ordinary back navigation.
- Full suite: 494 passed, four failures remain in existing report-share expectations, Build feature gating and the personal-records dependency harness. Those unrelated behaviors were not changed by this work.

The full-screen navigation update passed TypeScript, scoped lint and seven Settings tests, including editor routing and saving a name before returning to the preceding page. Simulator review confirmed the full-screen native header and system back button. The sheet frame and dismissal button are no longer part of Settings.

Full physical-device, VoiceOver and enlarged Dynamic Type audits remain to be performed. Native code additions require the rebuilt iOS app; JavaScript refresh alone does not load them.
