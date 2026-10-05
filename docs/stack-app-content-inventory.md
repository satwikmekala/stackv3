# Stack app — content inventory

**Snapshot:** 5 October 2026. This inventories the wording in the current workspace, including the onboarding redesign through Slice 7. It is a copy reference; no app wording was changed to create it.

The new onboarding remains behind the development preview flag. Legacy onboarding, retained Stack explanations, platform variants, development previews and fixture-only examples are included and labelled rather than silently omitted.

## How to read this document

- Fixed text retains its wording, capitalization and punctuation. `<br>` represents an intentional text line break.
- `{...}` marks a name, count, date, unit, exercise, workout, calculation or supplied value that changes at runtime. User-entered names and notes are not fixed app copy.
- Empty, populated, loading, error, selection, success and confirmation branches are included. State expressions identify the source branch; they are documentation, not words displayed in the app.
- Visible text and accessibility/spoken copy are listed separately. Shared controls are documented once and linked from the screen map.
- Copy assembled from supplied values references the relevant catalogs and formatting helpers below. The document does not invent example user history to represent a populated screen.
- Native OS wording in Files pickers, keyboards, share destinations and permission dialogs is supplied by iOS/Android, not written by Stack; it is outside this app-authored copy inventory.

## Contents

- [Every screen and its copy sources](#every-screen-and-its-copy-sources)
- [New onboarding and optional program setup](#new-onboarding-and-optional-program-setup)
- [Train, workout logging, set controls and workout sheets](#train-workout-logging-set-controls-and-workout-sheets)
- [Progress, lift progress, personal records and workout history](#progress-lift-progress-personal-records-and-workout-history)
- [Stack, earned history, empty states, examples and explanation](#stack-earned-history-empty-states-examples-and-explanation)
- [Routine library, split builder, custom exercises and shared routines](#routine-library-split-builder-custom-exercises-and-shared-routines)
- [Settings, preferences, data management and help](#settings-preferences-data-management-and-help)
- [Workout recap, reports, PDF exports and sharing](#workout-recap-reports-pdf-exports-and-sharing)
- [Lock Screen and Dynamic Island workout display](#lock-screen-and-dynamic-island-workout-display)
- [Legacy onboarding and retained general controls](#legacy-onboarding-and-retained-general-controls)
- [Startup, navigation, missing screens, validation and persistence messages](#startup-navigation-missing-screens-validation-and-persistence-messages)
- [Workout names, exercise catalog and exercise guidance](#workout-names-exercise-catalog-and-exercise-guidance)
- [Development, sandbox and sample-fixture copy](#development-sandbox-and-sample-fixture-copy)
- [App name and native permission explanations](#app-name-and-native-permission-explanations)
- [Exercise catalog entries and descriptions](#exercise-catalog-entries-and-descriptions)
- [Generated choice labels and dynamic values](#generated-choice-labels-and-dynamic-values)
- [Source coverage](#source-coverage)

## Every screen and its copy sources

Screen wrappers can contain little or no text themselves. Their principal shared copy is linked below. Common persistence/validation messages, formatting helpers and catalogs have their own sections later in the document. Native layout files are also listed so navigation labels are accounted for.

| Screen / route | Availability | Its own copy | Shared copy sources |
| --- | --- | --- |
| _layout<br>`app/(onboarding)/_layout.tsx` | Legacy / flag-off | [app/(onboarding)/_layout.tsx](#source-app-onboarding-layout-tsx) | [store/workoutStore.ts](#source-store-workoutstore-ts); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| Legacy onboarding — Weekdays<br>`app/(onboarding)/current-week.tsx` | Legacy / flag-off | [app/(onboarding)/current-week.tsx](#source-app-onboarding-current-week-tsx) | [components/OnboardingControls.tsx](#source-components-onboardingcontrols-tsx); [store/workoutDatabase.ts](#source-store-workoutdatabase-ts); [store/workoutStore.ts](#source-store-workoutstore-ts); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| Legacy onboarding — Experience<br>`app/(onboarding)/experience.tsx` | Legacy / flag-off | [app/(onboarding)/experience.tsx](#source-app-onboarding-experience-tsx) | [components/OnboardingControls.tsx](#source-components-onboardingcontrols-tsx); [store/workoutStore.ts](#source-store-workoutstore-ts); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| Legacy onboarding — Split choice<br>`app/(onboarding)/split-choice.tsx` | Legacy / flag-off | [app/(onboarding)/split-choice.tsx](#source-app-onboarding-split-choice-tsx) | [store/trainingPreferences.ts](#source-store-trainingpreferences-ts); [components/OnboardingControls.tsx](#source-components-onboardingcontrols-tsx); [constants/archetypes.ts](#source-constants-archetypes-ts); [store/workoutStore.ts](#source-store-workoutstore-ts); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| Legacy onboarding — Welcome<br>`app/(onboarding)/welcome.tsx` | Legacy / flag-off | [app/(onboarding)/welcome.tsx](#source-app-onboarding-welcome-tsx) | [components/OnboardingControls.tsx](#source-components-onboardingcontrols-tsx) |
| Legacy onboarding — Name<br>`app/(onboarding)/whatsurname.tsx` | Legacy / flag-off | [app/(onboarding)/whatsurname.tsx](#source-app-onboarding-whatsurname-tsx) | [components/OnboardingControls.tsx](#source-components-onboardingcontrols-tsx) |
| _layout<br>`app/(tabs)/_layout.tsx` | Navigation | [app/(tabs)/_layout.tsx](#source-app-tabs-layout-tsx) | — |
| Train<br>`app/(tabs)/index.tsx` | App screen / state | [app/(tabs)/index.tsx](#source-app-tabs-index-tsx) | [store/trainingPreferences.ts](#source-store-trainingpreferences-ts); [store/muscleColors.ts](#source-store-musclecolors-ts); [components/home/WorkoutHeroCard.tsx](#source-components-home-workoutherocard-tsx); [components/home/YourSplitCard.tsx](#source-components-home-yoursplitcard-tsx); [store/customSplits.ts](#source-store-customsplits-ts); [components/home/WorkoutPicker.tsx](#source-components-home-workoutpicker-tsx); [constants/archetypes.ts](#source-constants-archetypes-ts); [store/workoutDatabase.ts](#source-store-workoutdatabase-ts); [store/customSplitDraft.ts](#source-store-customsplitdraft-ts); [store/workoutStore.ts](#source-store-workoutstore-ts); [store/workoutLaunch.ts](#source-store-workoutlaunch-ts); [features/workout-launch/coordinator.ts](#source-features-workout-launch-coordinator-ts); [features/program/lineup.ts](#source-features-program-lineup-ts); [components/StatusPill.tsx](#source-components-statuspill-tsx); [components/home/SlideToStart.tsx](#source-components-home-slidetostart-tsx) |
| Progress<br>`app/(tabs)/profile.tsx` | App screen / state | [app/(tabs)/profile.tsx](#source-app-tabs-profile-tsx) | [store/workoutStore.ts](#source-store-workoutstore-ts); [store/workoutDatabase.ts](#source-store-workoutdatabase-ts); [store/personalRecords.ts](#source-store-personalrecords-ts); [store/liftProgress.ts](#source-store-liftprogress-ts); [store/liftProgressPreferences.ts](#source-store-liftprogresspreferences-ts); [components/LiftProgressCard.tsx](#source-components-liftprogresscard-tsx); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| Stack<br>`app/(tabs)/stack.tsx` | App screen / state | [app/(tabs)/stack.tsx](#source-app-tabs-stack-tsx) | [features/build/BuildEntry.tsx](#source-features-build-buildentry-tsx); [features/build/StackDiscovery.tsx](#source-features-build-stackdiscovery-tsx); [features/build/Monolith.tsx](#source-features-build-monolith-tsx); [features/program/lineup.ts](#source-features-program-lineup-ts); [features/build/introCopy.ts](#source-features-build-introcopy-ts); [features/build/BuildPreview.tsx](#source-features-build-buildpreview-tsx); [features/build/BuildScene.tsx](#source-features-build-buildscene-tsx); [features/build/BuildScene.native.tsx](#source-features-build-buildscene-native-tsx); [features/build/FusionPresentation.tsx](#source-features-build-fusionpresentation-tsx); [features/build/fusionCopy.ts](#source-features-build-fusioncopy-ts); [features/build/buildFormat.ts](#source-features-build-buildformat-ts); [features/build/MetricTiles.tsx](#source-features-build-metrictiles-tsx); [features/build/caseCopy.ts](#source-features-build-casecopy-ts) |
| Missing screen<br>`app/+not-found.tsx` | App screen / state | [app/+not-found.tsx](#source-app-not-found-tsx) | — |
| Root navigation and initialization<br>`app/_layout.tsx` | Navigation | [app/_layout.tsx](#source-app-layout-tsx) | [store/muscleColors.ts](#source-store-musclecolors-ts); [store/appPreferences.ts](#source-store-apppreferences-ts); [store/workoutStore.ts](#source-store-workoutstore-ts); [store/onboardingDraft.ts](#source-store-onboardingdraft-ts); [features/program/lineup.ts](#source-features-program-lineup-ts); [components/ActiveWorkoutCard.tsx](#source-components-activeworkoutcard-tsx); [components/live-activity/WorkoutLiveActivityLayout.tsx](#source-components-live-activity-workoutliveactivitylayout-tsx) |
| Stack archive — selected week<br>`app/build-case/[week].tsx` | App screen / state | [app/build-case/[week].tsx](#source-app-build-case-week-tsx) | [features/build/UnpackedWeek.tsx](#source-features-build-unpackedweek-tsx); [features/build/BuildEntry.tsx](#source-features-build-buildentry-tsx); [features/program/lineup.ts](#source-features-program-lineup-ts); [features/build/caseCopy.ts](#source-features-build-casecopy-ts); [features/build/buildFormat.ts](#source-features-build-buildformat-ts); [features/build/BuildScene.tsx](#source-features-build-buildscene-tsx); [features/build/BuildScene.native.tsx](#source-features-build-buildscene-native-tsx); [features/build/BuildPreview.tsx](#source-features-build-buildpreview-tsx); [features/build/MetricTiles.tsx](#source-features-build-metrictiles-tsx); [features/build/introCopy.ts](#source-features-build-introcopy-ts) |
| Stack archive / case<br>`app/build-case/index.tsx` | App screen / state | [app/build-case/index.tsx](#source-app-build-case-index-tsx) | [features/build/Case.tsx](#source-features-build-case-tsx); [features/build/BuildEntry.tsx](#source-features-build-buildentry-tsx); [features/program/lineup.ts](#source-features-program-lineup-ts); [features/build/caseCopy.ts](#source-features-build-casecopy-ts); [features/build/buildFormat.ts](#source-features-build-buildformat-ts); [features/build/introCopy.ts](#source-features-build-introcopy-ts); [features/build/BuildPreview.tsx](#source-features-build-buildpreview-tsx); [features/build/BuildScene.tsx](#source-features-build-buildscene-tsx); [features/build/BuildScene.native.tsx](#source-features-build-buildscene-native-tsx) |
| Stack casting / completion handoff<br>`app/build-casting.tsx` | App screen / state | [app/build-casting.tsx](#source-app-build-casting-tsx) | [features/build/CastingScreen.tsx](#source-features-build-castingscreen-tsx); [features/program/lineup.ts](#source-features-program-lineup-ts); [features/build/castingCopy.ts](#source-features-build-castingcopy-ts); [features/build/buildFormat.ts](#source-features-build-buildformat-ts); [features/build/BuildScene.tsx](#source-features-build-buildscene-tsx); [features/build/BuildScene.native.tsx](#source-features-build-buildscene-native-tsx); [features/build/BuildPreview.tsx](#source-features-build-buildpreview-tsx) |
| build sandbox<br>`app/build-sandbox.tsx` | Development / sandbox | [app/build-sandbox.tsx](#source-app-build-sandbox-tsx) | [features/build/BuildSandbox.tsx](#source-features-build-buildsandbox-tsx); [features/build/BuildScene.tsx](#source-features-build-buildscene-tsx); [features/program/lineup.ts](#source-features-program-lineup-ts); [features/build/BuildScene.native.tsx](#source-features-build-buildscene-native-tsx); [features/build/FusionPresentation.tsx](#source-features-build-fusionpresentation-tsx); [features/build/fusionCopy.ts](#source-features-build-fusioncopy-ts); [features/build/buildFormat.ts](#source-features-build-buildformat-ts); [features/build/BuildPreview.tsx](#source-features-build-buildpreview-tsx); [features/build/EvidenceInspector.tsx](#source-features-build-evidenceinspector-tsx) |
| Retained Stack / Build entry<br>`app/build.tsx` | App screen / state | [app/build.tsx](#source-app-build-tsx) | — |
| _layout<br>`app/custom-split/_layout.tsx` | Navigation | [app/custom-split/_layout.tsx](#source-app-custom-split-layout-tsx) | — |
| Add exercises to a split<br>`app/custom-split/exercises.tsx` | App screen / state | [app/custom-split/exercises.tsx](#source-app-custom-split-exercises-tsx) | [components/ExerciseSearchInput.tsx](#source-components-exercisesearchinput-tsx); [components/custom-split/ui.tsx](#source-components-custom-split-ui-tsx); [store/customSplitDraft.ts](#source-store-customsplitdraft-ts); [store/workoutDatabase.ts](#source-store-workoutdatabase-ts); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| Create / edit a split<br>`app/custom-split/index.tsx` | App screen / state | [app/custom-split/index.tsx](#source-app-custom-split-index-tsx) | [components/custom-split/showActions.ts](#source-components-custom-split-showactions-ts); [components/custom-split/SelectedExerciseList.tsx](#source-components-custom-split-selectedexerciselist-tsx); [components/custom-split/ui.tsx](#source-components-custom-split-ui-tsx); [store/muscleColors.ts](#source-store-musclecolors-ts); [store/customSplitDraft.ts](#source-store-customsplitdraft-ts); [store/workoutDatabase.ts](#source-store-workoutdatabase-ts); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| Create a custom exercise<br>`app/custom-split/new-exercise.tsx` | App screen / state | [app/custom-split/new-exercise.tsx](#source-app-custom-split-new-exercise-tsx) | [store/muscleColors.ts](#source-store-musclecolors-ts); [constants/muscleColors.ts](#source-constants-musclecolors-ts); [components/custom-split/ui.tsx](#source-components-custom-split-ui-tsx); [store/customSplitDraft.ts](#source-store-customsplitdraft-ts); [store/workoutDatabase.ts](#source-store-workoutdatabase-ts); [store/workoutStore.ts](#source-store-workoutstore-ts); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| Split day settings / personalization<br>`app/custom-split/personalize.tsx` | App screen / state | [app/custom-split/personalize.tsx](#source-app-custom-split-personalize-tsx) | [components/custom-split/ui.tsx](#source-components-custom-split-ui-tsx); [constants/muscleColors.ts](#source-constants-musclecolors-ts); [constants/workouts.ts](#source-constants-workouts-ts); [store/muscleColors.ts](#source-store-musclecolors-ts); [store/customSplitDraft.ts](#source-store-customsplitdraft-ts); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| Review / save a split<br>`app/custom-split/review.tsx` | App screen / state | [app/custom-split/review.tsx](#source-app-custom-split-review-tsx) | [store/muscleColors.ts](#source-store-musclecolors-ts); [components/custom-split/showActions.ts](#source-components-custom-split-showactions-ts); [components/custom-split/ui.tsx](#source-components-custom-split-ui-tsx); [store/customSplitDraft.ts](#source-store-customsplitdraft-ts); [store/workoutDatabase.ts](#source-store-workoutdatabase-ts); [store/workoutStore.ts](#source-store-workoutstore-ts); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| Use a Stack workout template<br>`app/custom-split/template.tsx` | App screen / state | [app/custom-split/template.tsx](#source-app-custom-split-template-tsx) | [store/trainingPreferences.ts](#source-store-trainingpreferences-ts); [components/custom-split/ui.tsx](#source-components-custom-split-ui-tsx); [constants/archetypes.ts](#source-constants-archetypes-ts); [store/customSplitDraft.ts](#source-store-customsplitdraft-ts); [store/workoutStore.ts](#source-store-workoutstore-ts); [store/workoutDatabase.ts](#source-store-workoutdatabase-ts); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| dev report<br>`app/dev-report.tsx` | Development / sandbox | [app/dev-report.tsx](#source-app-dev-report-tsx) | [features/report/reportFixtures.ts](#source-features-report-reportfixtures-ts); [features/report/workoutReport.ts](#source-features-report-workoutreport-ts); [features/report/WorkoutReportView.tsx](#source-features-report-workoutreportview-tsx); [store/weightUnits.ts](#source-store-weightunits-ts); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| dev share cards<br>`app/dev-share-cards.tsx` | Development / sandbox | [app/dev-share-cards.tsx](#source-app-dev-share-cards-tsx) | [components/LiftLogCard.tsx](#source-components-liftlogcard-tsx); [components/StatStripCard.tsx](#source-components-statstripcard-tsx); [components/StackPosterCard.tsx](#source-components-stackpostercard-tsx); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| History — selected week<br>`app/history-week.tsx` | App screen / state | [app/history-week.tsx](#source-app-history-week-tsx) | [components/HistoryWorkoutRow.tsx](#source-components-historyworkoutrow-tsx); [store/workoutDatabase.ts](#source-store-workoutdatabase-ts); [store/workoutSummary.ts](#source-store-workoutsummary-ts); [store/workoutStore.ts](#source-store-workoutstore-ts); [store/weightUnits.ts](#source-store-weightunits-ts); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| Workout History<br>`app/history.tsx` | App screen / state | [app/history.tsx](#source-app-history-tsx) | [components/HistoryWorkoutRow.tsx](#source-components-historyworkoutrow-tsx); [store/workoutSummary.ts](#source-store-workoutsummary-ts); [store/workoutStore.ts](#source-store-workoutstore-ts); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| Shared routine import<br>`app/import-split.tsx` | App screen / state | [app/import-split.tsx](#source-app-import-split-tsx) | [features/sharing/splitTransport.ts](#source-features-sharing-splittransport-ts); [store/workoutDatabase.ts](#source-store-workoutdatabase-ts); [store/splitImport.ts](#source-store-splitimport-ts); [store/workoutStore.ts](#source-store-workoutstore-ts); [store/customSplitDraft.ts](#source-store-customsplitdraft-ts); [store/sharedRoutineHandoff.ts](#source-store-sharedroutinehandoff-ts); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| Startup / loading / recovery<br>`app/index.tsx` | App screen / state | [app/index.tsx](#source-app-index-tsx) | [features/onboarding/SetupLoading.tsx](#source-features-onboarding-setuploading-tsx); [store/sharedRoutineHandoff.ts](#source-store-sharedroutinehandoff-ts); [store/workoutStore.ts](#source-store-workoutstore-ts); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| Individual lift progress<br>`app/lift-detail.tsx` | App screen / state | [app/lift-detail.tsx](#source-app-lift-detail-tsx) | [store/muscleColors.ts](#source-store-musclecolors-ts); [constants/muscleColors.ts](#source-constants-musclecolors-ts); [store/workoutStore.ts](#source-store-workoutstore-ts); [store/workoutDatabase.ts](#source-store-workoutdatabase-ts); [store/liftProgress.ts](#source-store-liftprogress-ts); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| All lift progress / featured exercise selection<br>`app/lift-progress.tsx` | App screen / state | [app/lift-progress.tsx](#source-app-lift-progress-tsx) | [constants/muscleColors.ts](#source-constants-musclecolors-ts); [store/muscleColors.ts](#source-store-musclecolors-ts); [store/workoutStore.ts](#source-store-workoutstore-ts); [store/workoutDatabase.ts](#source-store-workoutdatabase-ts); [store/liftProgress.ts](#source-store-liftprogress-ts); [store/liftProgressPreferences.ts](#source-store-liftprogresspreferences-ts); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| _layout<br>`app/onboarding-preview/_layout.tsx` | New onboarding / preview | [app/onboarding-preview/_layout.tsx](#source-app-onboarding-preview-layout-tsx) | — |
| New onboarding — entry / draft restore<br>`app/onboarding-preview/index.tsx` | New onboarding / preview | [app/onboarding-preview/index.tsx](#source-app-onboarding-preview-index-tsx) | [store/workoutStore.ts](#source-store-workoutstore-ts); [store/onboardingDraft.ts](#source-store-onboardingdraft-ts); [features/onboarding/SetupLoading.tsx](#source-features-onboarding-setuploading-tsx); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| New onboarding — Starting Point<br>`app/onboarding-preview/starting-point.tsx` | New onboarding / preview | [app/onboarding-preview/starting-point.tsx](#source-app-onboarding-preview-starting-point-tsx) | [features/onboarding/StartingPointScreen.tsx](#source-features-onboarding-startingpointscreen-tsx); [features/onboarding/useCoreOnboarding.ts](#source-features-onboarding-usecoreonboarding-ts); [features/onboarding/SetupLoading.tsx](#source-features-onboarding-setuploading-tsx); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| New onboarding — Welcome<br>`app/onboarding-preview/welcome.tsx` | New onboarding / preview | [app/onboarding-preview/welcome.tsx](#source-app-onboarding-preview-welcome-tsx) | [features/onboarding/SetupLoading.tsx](#source-features-onboarding-setuploading-tsx); [features/onboarding/useCoreOnboarding.ts](#source-features-onboarding-usecoreonboarding-ts); [features/onboarding/WelcomePreview.tsx](#source-features-onboarding-welcomepreview-tsx); [features/program/lineup.ts](#source-features-program-lineup-ts); [features/onboarding/WelcomeScreen.tsx](#source-features-onboarding-welcomescreen-tsx); [features/build/BuildScene.tsx](#source-features-build-buildscene-tsx); [features/build/BuildScene.native.tsx](#source-features-build-buildscene-native-tsx); [features/build/BuildPreview.tsx](#source-features-build-buildpreview-tsx); [features/onboarding/welcomeExample.ts](#source-features-onboarding-welcomeexample-ts) |
| _layout<br>`app/program-setup/_layout.tsx` | New onboarding / preview | [app/program-setup/_layout.tsx](#source-app-program-setup-layout-tsx) | — |
| Program frequency<br>`app/program-setup/index.tsx` | New onboarding / preview | [app/program-setup/index.tsx](#source-app-program-setup-index-tsx) | [features/onboarding/SetupLoading.tsx](#source-features-onboarding-setuploading-tsx); [features/program/ProgramScreenFrame.tsx](#source-features-program-programscreenframe-tsx); [features/program/ProgramFrequencyScreen.tsx](#source-features-program-programfrequencyscreen-tsx); [features/program/useProgramSetup.ts](#source-features-program-useprogramsetup-ts); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| Program preview<br>`app/program-setup/preview.tsx` | New onboarding / preview | [app/program-setup/preview.tsx](#source-app-program-setup-preview-tsx) | [features/onboarding/SetupLoading.tsx](#source-features-onboarding-setuploading-tsx); [features/program/ProgramScreenFrame.tsx](#source-features-program-programscreenframe-tsx); [features/program/ProgramPreviewScreen.tsx](#source-features-program-programpreviewscreen-tsx); [features/program/useProgramSetup.ts](#source-features-program-useprogramsetup-ts); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| Individual record history<br>`app/record-detail.tsx` | App screen / state | [app/record-detail.tsx](#source-app-record-detail-tsx) | [store/workoutStore.ts](#source-store-workoutstore-ts); [store/workoutDatabase.ts](#source-store-workoutdatabase-ts); [store/personalRecords.ts](#source-store-personalrecords-ts); [store/weightUnits.ts](#source-store-weightunits-ts); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| Personal Records<br>`app/records.tsx` | App screen / state | [app/records.tsx](#source-app-records-tsx) | [store/muscleColors.ts](#source-store-musclecolors-ts); [store/workoutStore.ts](#source-store-workoutstore-ts); [store/workoutDatabase.ts](#source-store-workoutdatabase-ts); [store/weightUnits.ts](#source-store-weightunits-ts); [store/personalRecords.ts](#source-store-personalrecords-ts); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| Settings and all settings pages<br>`app/settings.tsx` | App screen / state | [app/settings.tsx](#source-app-settings-tsx) | [features/settings/SettingsScreen.tsx](#source-features-settings-settingsscreen-tsx); [features/settings/SettingsScreen.ios.tsx](#source-features-settings-settingsscreen-ios-tsx); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| Read-only example Stack<br>`app/stack-example.tsx` | New onboarding / preview | [app/stack-example.tsx](#source-app-stack-example-tsx) | [features/build/BuildPreview.tsx](#source-features-build-buildpreview-tsx); [features/onboarding/welcomeExample.ts](#source-features-onboarding-welcomeexample-ts) |
| Optional Stack explanation<br>`app/stack-help.tsx` | New onboarding / preview | [app/stack-help.tsx](#source-app-stack-help-tsx) | [features/build/BuildEntry.tsx](#source-features-build-buildentry-tsx); [features/program/lineup.ts](#source-features-program-lineup-ts); [features/build/introCopy.ts](#source-features-build-introcopy-ts); [features/build/BuildPreview.tsx](#source-features-build-buildpreview-tsx); [features/build/BuildScene.tsx](#source-features-build-buildscene-tsx); [features/build/BuildScene.native.tsx](#source-features-build-buildscene-native-tsx) |
| Workout completion / saved recap<br>`app/workout-summary.tsx` | App screen / state | [app/workout-summary.tsx](#source-app-workout-summary-tsx) | [store/muscleColors.ts](#source-store-musclecolors-ts); [constants/muscleColors.ts](#source-constants-musclecolors-ts); [store/liftProgress.ts](#source-store-liftprogress-ts); [components/SaveAdhocRoutine.tsx](#source-components-saveadhocroutine-tsx); [features/report/workoutReport.ts](#source-features-report-workoutreport-ts); [components/ShareSheet.tsx](#source-components-sharesheet-tsx); [components/StackPosterCard.tsx](#source-components-stackpostercard-tsx); [store/liftLog.ts](#source-store-liftlog-ts); [features/report/shareWorkoutReport.ts](#source-features-report-shareworkoutreport-ts); [store/workoutDatabase.ts](#source-store-workoutdatabase-ts); [store/workoutSummary.ts](#source-store-workoutsummary-ts); [store/weightUnits.ts](#source-store-weightunits-ts); [store/customSplitDraft.ts](#source-store-customsplitdraft-ts); [store/workoutStore.ts](#source-store-workoutstore-ts); [features/build/monolithDemo.ts](#source-features-build-monolithdemo-ts) |
| First-workout weight units<br>`app/workout-unit.tsx` | New onboarding / preview | [app/workout-unit.tsx](#source-app-workout-unit-tsx) | [store/workoutLaunch.ts](#source-store-workoutlaunch-ts); [features/program/lineup.ts](#source-features-program-lineup-ts) |
| Workout logger / active workout<br>`app/workout.tsx` | App screen / state | [app/workout.tsx](#source-app-workout-tsx) | [constants/muscleColors.ts](#source-constants-musclecolors-ts); [store/muscleColors.ts](#source-store-musclecolors-ts); [components/WorkoutSetRail.tsx](#source-components-workoutsetrail-tsx); [components/WorkoutHeaderActions.tsx](#source-components-workoutheaderactions-tsx); [components/WorkoutLaunchSurface.tsx](#source-components-workoutlaunchsurface-tsx); [components/ActiveSetCard.tsx](#source-components-activesetcard-tsx); [components/ExerciseNotes.tsx](#source-components-exercisenotes-tsx); [components/ExerciseInfo.tsx](#source-components-exerciseinfo-tsx); [components/BonusSet.tsx](#source-components-bonusset-tsx); [components/ExerciseFinisher.tsx](#source-components-exercisefinisher-tsx); [components/SwapExerciseSheet.tsx](#source-components-swapexercisesheet-tsx); [components/UpNextSheet.tsx](#source-components-upnextsheet-tsx); [components/WorkoutDayLabel.tsx](#source-components-workoutdaylabel-tsx); [components/home/WorkoutIntensityPicker.tsx](#source-components-home-workoutintensitypicker-tsx); [constants/archetypes.ts](#source-constants-archetypes-ts) |
| Your Splits / routine library<br>`app/your-splits.tsx` | App screen / state | [app/your-splits.tsx](#source-app-your-splits-tsx) | [store/muscleColors.ts](#source-store-musclecolors-ts); [components/custom-split/ui.tsx](#source-components-custom-split-ui-tsx); [components/custom-split/SplitActivationPill.tsx](#source-components-custom-split-splitactivationpill-tsx); [components/custom-split/showActions.ts](#source-components-custom-split-showactions-ts); [components/SplitShareButton.tsx](#source-components-splitsharebutton-tsx); [store/customSplitDraft.ts](#source-store-customsplitdraft-ts); [store/workoutStore.ts](#source-store-workoutstore-ts); [store/trainingPreferences.ts](#source-store-trainingpreferences-ts); [features/program/lineup.ts](#source-features-program-lineup-ts) |

## New onboarding and optional program setup

Welcome and Starting Point serve tracking/exploration. Frequency and Preview appear only on the optional Stack-program branch. The first-workout unit sheet follows app entry.

<a id="source-app-onboarding-preview-layout-tsx"></a>

### _layout

Source: [app/onboarding-preview/_layout.tsx](/Users/satwikmekala/stackv3/app/onboarding-preview/_layout.tsx).

This route delegates its wording to the shared sources linked in the screen map; it defines no additional literal copy.

<a id="source-app-onboarding-preview-index-tsx"></a>

### New onboarding — entry / draft restore

Source: [app/onboarding-preview/index.tsx](/Users/satwikmekala/stackv3/app/onboarding-preview/index.tsx).

This route delegates its wording to the shared sources linked in the screen map; it defines no additional literal copy.

<a id="source-app-onboarding-preview-starting-point-tsx"></a>

### New onboarding — Starting Point

Source: [app/onboarding-preview/starting-point.tsx](/Users/satwikmekala/stackv3/app/onboarding-preview/starting-point.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Accessibility / spoken copy | Back to Welcome | [L19](/Users/satwikmekala/stackv3/app/onboarding-preview/starting-point.tsx:19) |

<a id="source-app-onboarding-preview-welcome-tsx"></a>

### New onboarding — Welcome

Source: [app/onboarding-preview/welcome.tsx](/Users/satwikmekala/stackv3/app/onboarding-preview/welcome.tsx).

This route delegates its wording to the shared sources linked in the screen map; it defines no additional literal copy.

<a id="source-app-program-setup-layout-tsx"></a>

### _layout

Source: [app/program-setup/_layout.tsx](/Users/satwikmekala/stackv3/app/program-setup/_layout.tsx).

This route delegates its wording to the shared sources linked in the screen map; it defines no additional literal copy.

<a id="source-app-program-setup-index-tsx"></a>

### Program frequency

Source: [app/program-setup/index.tsx](/Users/satwikmekala/stackv3/app/program-setup/index.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | How many workouts should Stack plan each week? | [L9](/Users/satwikmekala/stackv3/app/program-setup/index.tsx:9) |
| Label / supplied copy | See my workouts | [L11](/Users/satwikmekala/stackv3/app/program-setup/index.tsx:11) |
| Label / supplied copy | Decide later | [L12](/Users/satwikmekala/stackv3/app/program-setup/index.tsx:12) |

<a id="source-app-program-setup-preview-tsx"></a>

### Program preview

Source: [app/program-setup/preview.tsx](/Users/satwikmekala/stackv3/app/program-setup/preview.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Your starting lineup. | [L9](/Users/satwikmekala/stackv3/app/program-setup/preview.tsx:9) |
| Label / supplied copy | Use these workouts | [L10](/Users/satwikmekala/stackv3/app/program-setup/preview.tsx:10) |
| Label / supplied copy | Explore without a program | [L11](/Users/satwikmekala/stackv3/app/program-setup/preview.tsx:11) |

<a id="source-app-workout-unit-tsx"></a>

### First-workout weight units

Source: [app/workout-unit.tsx](/Users/satwikmekala/stackv3/app/workout-unit.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Visible text | Which weight unit do you use? | [L47](/Users/satwikmekala/stackv3/app/workout-unit.tsx:47) |
| Accessibility / spoken copy | Cancel workout start | [L48](/Users/satwikmekala/stackv3/app/workout-unit.tsx:48) |
| Visible text | Choose the default for your workouts and progress. | [L50](/Users/satwikmekala/stackv3/app/workout-unit.tsx:50) |
| Label / supplied copy | kg | [L52](/Users/satwikmekala/stackv3/app/workout-unit.tsx:52) |
| Label / supplied copy | Kilograms · kg | [L52](/Users/satwikmekala/stackv3/app/workout-unit.tsx:52) |
| Label / supplied copy | lbs | [L52](/Users/satwikmekala/stackv3/app/workout-unit.tsx:52) |
| Label / supplied copy | Pounds · lb | [L52](/Users/satwikmekala/stackv3/app/workout-unit.tsx:52) |
| Dynamic copy / value | {option.label} | [L55](/Users/satwikmekala/stackv3/app/workout-unit.tsx:55) |
| Dynamic copy / value | {state.error} | `state.error` · [L58](/Users/satwikmekala/stackv3/app/workout-unit.tsx:58) |
| Visible text | Starting… | [L60](/Users/satwikmekala/stackv3/app/workout-unit.tsx:60) |
| Visible text | Try again | [L60](/Users/satwikmekala/stackv3/app/workout-unit.tsx:60) |
| Visible text | Start workout | [L60](/Users/satwikmekala/stackv3/app/workout-unit.tsx:60) |

<a id="source-features-onboarding-setuploading-tsx"></a>

### Setup Loading

Source: [features/onboarding/SetupLoading.tsx](/Users/satwikmekala/stackv3/features/onboarding/SetupLoading.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {error} | [L9](/Users/satwikmekala/stackv3/features/onboarding/SetupLoading.tsx:9) |
| Visible text | Saving your setup… | [L9](/Users/satwikmekala/stackv3/features/onboarding/SetupLoading.tsx:9) |
| Visible text | Try again | `error` · [L12](/Users/satwikmekala/stackv3/features/onboarding/SetupLoading.tsx:12) |
| Accessibility / spoken copy | Loading your setup | `!error` · [L17](/Users/satwikmekala/stackv3/features/onboarding/SetupLoading.tsx:17) |

<a id="source-features-onboarding-startingpointscreen-tsx"></a>

### Starting Point Screen

Source: [features/onboarding/StartingPointScreen.tsx](/Users/satwikmekala/stackv3/features/onboarding/StartingPointScreen.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Accessibility / spoken copy | {title} | [L15](/Users/satwikmekala/stackv3/features/onboarding/StartingPointScreen.tsx:15) |
| Accessibility / spoken copy | {description} | [L15](/Users/satwikmekala/stackv3/features/onboarding/StartingPointScreen.tsx:15) |
| Dynamic copy / value | {title} | [L20](/Users/satwikmekala/stackv3/features/onboarding/StartingPointScreen.tsx:20) |
| Dynamic copy / value | {description} | [L21](/Users/satwikmekala/stackv3/features/onboarding/StartingPointScreen.tsx:21) |
| Visible text | How would you like to start? | [L33](/Users/satwikmekala/stackv3/features/onboarding/StartingPointScreen.tsx:33) |
| Label / supplied copy | Track my workouts | [L35](/Users/satwikmekala/stackv3/features/onboarding/StartingPointScreen.tsx:35) |
| Label / supplied copy | Start an empty workout and add your own exercises as you go. | [L35](/Users/satwikmekala/stackv3/features/onboarding/StartingPointScreen.tsx:35) |
| Visible text | Bench press | [L37](/Users/satwikmekala/stackv3/features/onboarding/StartingPointScreen.tsx:37) |
| Visible text | 40 kg × 8 | [L38](/Users/satwikmekala/stackv3/features/onboarding/StartingPointScreen.tsx:38) |
| Visible text | YOUR LIFTS. YOUR WAY. | [L39](/Users/satwikmekala/stackv3/features/onboarding/StartingPointScreen.tsx:39) |
| Label / supplied copy | Get workouts from Stack | [L41](/Users/satwikmekala/stackv3/features/onboarding/StartingPointScreen.tsx:41) |
| Label / supplied copy | Choose how often you train and preview a starting lineup from Stack. | [L41](/Users/satwikmekala/stackv3/features/onboarding/StartingPointScreen.tsx:41) |
| Label / supplied copy | Full body A | [L43](/Users/satwikmekala/stackv3/features/onboarding/StartingPointScreen.tsx:43) |
| Label / supplied copy | Full body B | [L43](/Users/satwikmekala/stackv3/features/onboarding/StartingPointScreen.tsx:43) |
| Label / supplied copy | Full body C | [L43](/Users/satwikmekala/stackv3/features/onboarding/StartingPointScreen.tsx:43) |
| Dynamic copy / value | {day.name} | [L44](/Users/satwikmekala/stackv3/features/onboarding/StartingPointScreen.tsx:44) |
| Visible text | EXAMPLE · A WEEK WITH STACK | [L45](/Users/satwikmekala/stackv3/features/onboarding/StartingPointScreen.tsx:45) |
| Visible text | Explore first | [L50](/Users/satwikmekala/stackv3/features/onboarding/StartingPointScreen.tsx:50) |

<a id="source-features-onboarding-welcomepreview-tsx"></a>

### Welcome Preview

Source: [features/onboarding/WelcomePreview.tsx](/Users/satwikmekala/stackv3/features/onboarding/WelcomePreview.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Cancel | [L16](/Users/satwikmekala/stackv3/features/onboarding/WelcomePreview.tsx:16) |
| Label / supplied copy | Object composition | [L16](/Users/satwikmekala/stackv3/features/onboarding/WelcomePreview.tsx:16) |
| Label / supplied copy | Workout composition | [L16](/Users/satwikmekala/stackv3/features/onboarding/WelcomePreview.tsx:16) |
| Label / supplied copy | Animated scene | `staticPreview` · [L16](/Users/satwikmekala/stackv3/features/onboarding/WelcomePreview.tsx:16) |
| Label / supplied copy | Static fallback | `otherwise: staticPreview` · [L16](/Users/satwikmekala/stackv3/features/onboarding/WelcomePreview.tsx:16) |
| Label / supplied copy | Replay this visit | [L16](/Users/satwikmekala/stackv3/features/onboarding/WelcomePreview.tsx:16) |
| Label / supplied copy | Scroll to example | [L16](/Users/satwikmekala/stackv3/features/onboarding/WelcomePreview.tsx:16) |
| Label / supplied copy | Welcome · development preview | `Platform.OS === 'ios'` · [L26](/Users/satwikmekala/stackv3/features/onboarding/WelcomePreview.tsx:26) |
| Alert / confirmation | Welcome · development preview | `Platform.OS === 'ios'` · [L27](/Users/satwikmekala/stackv3/features/onboarding/WelcomePreview.tsx:27) |
| Accessibility / spoken copy | Welcome preview controls | [L32](/Users/satwikmekala/stackv3/features/onboarding/WelcomePreview.tsx:32) |
| Visible text | Preview | [L33](/Users/satwikmekala/stackv3/features/onboarding/WelcomePreview.tsx:33) |

<a id="source-features-onboarding-welcomescreen-tsx"></a>

### Welcome Screen

Source: [features/onboarding/WelcomeScreen.tsx](/Users/satwikmekala/stackv3/features/onboarding/WelcomeScreen.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {label} | [L27](/Users/satwikmekala/stackv3/features/onboarding/WelcomeScreen.tsx:27) |
| Visible text | EXAMPLE · PUSH DAY | [L44](/Users/satwikmekala/stackv3/features/onboarding/WelcomeScreen.tsx:44) |
| Visible text | Sets logged | [L47](/Users/satwikmekala/stackv3/features/onboarding/WelcomeScreen.tsx:47) |
| Visible text | 3 exercises | [L47](/Users/satwikmekala/stackv3/features/onboarding/WelcomeScreen.tsx:47) |
| Dynamic copy / value | {exercise.name} | [L54](/Users/satwikmekala/stackv3/features/onboarding/WelcomeScreen.tsx:54) |
| Dynamic copy / value | {exercise.muscle} | `expanded` · [L55](/Users/satwikmekala/stackv3/features/onboarding/WelcomeScreen.tsx:55) |
| Dynamic copy / value | {exercise.sets} | `largeText; !largeText` · [L56](/Users/satwikmekala/stackv3/features/onboarding/WelcomeScreen.tsx:56) |
| Accessibility / spoken copy | Example only. A push workout with bench press, shoulder press, and triceps pushdown adds a colored piece to a Stack. Your Stack grows from the workouts you complete. | [L128](/Users/satwikmekala/stackv3/features/onboarding/WelcomeScreen.tsx:128) |
| Visible text | One workout. One piece of your Stack. | [L145](/Users/satwikmekala/stackv3/features/onboarding/WelcomeScreen.tsx:145) |
| Accessibility / spoken copy | Stack | [L176](/Users/satwikmekala/stackv3/features/onboarding/WelcomeScreen.tsx:176) |
| Visible text | stack | [L178](/Users/satwikmekala/stackv3/features/onboarding/WelcomeScreen.tsx:178) |
| Visible text | Every workout<br>stacks up. | [L184](/Users/satwikmekala/stackv3/features/onboarding/WelcomeScreen.tsx:184) |
| Visible text | Log your sets, track your lifts, and watch your training build into your own Stack. | [L185](/Users/satwikmekala/stackv3/features/onboarding/WelcomeScreen.tsx:185) |
| Label / supplied copy | Get started | [L191](/Users/satwikmekala/stackv3/features/onboarding/WelcomeScreen.tsx:191) |
| Label / supplied copy | Explore first | [L192](/Users/satwikmekala/stackv3/features/onboarding/WelcomeScreen.tsx:192) |

<a id="source-features-onboarding-entry-ts"></a>

### entry

Source: [features/onboarding/entry.ts](/Users/satwikmekala/stackv3/features/onboarding/entry.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Validation / error | Could not save your profile. Try again. | `!profile.onboardingCompleted` · [L20](/Users/satwikmekala/stackv3/features/onboarding/entry.ts:20) |

<a id="source-features-onboarding-usecoreonboarding-ts"></a>

### use Core Onboarding

Source: [features/onboarding/useCoreOnboarding.ts](/Users/satwikmekala/stackv3/features/onboarding/useCoreOnboarding.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Status / announcement | Could not save your setup. Your choices are still here. Try again. | `mounted.current` · [L33](/Users/satwikmekala/stackv3/features/onboarding/useCoreOnboarding.ts:33) |

<a id="source-features-onboarding-welcomeexample-ts"></a>

### welcome Example

Source: [features/onboarding/welcomeExample.ts](/Users/satwikmekala/stackv3/features/onboarding/welcomeExample.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Bench press | [L5](/Users/satwikmekala/stackv3/features/onboarding/welcomeExample.ts:5) |
| Label / supplied copy | Chest | [L5](/Users/satwikmekala/stackv3/features/onboarding/welcomeExample.ts:5) |
| Label / supplied copy | Shoulder press | [L6](/Users/satwikmekala/stackv3/features/onboarding/welcomeExample.ts:6) |
| Label / supplied copy | Shoulders | [L6](/Users/satwikmekala/stackv3/features/onboarding/welcomeExample.ts:6) |
| Label / supplied copy | Triceps pushdown | [L7](/Users/satwikmekala/stackv3/features/onboarding/welcomeExample.ts:7) |
| Label / supplied copy | Arms | [L7](/Users/satwikmekala/stackv3/features/onboarding/welcomeExample.ts:7) |

<a id="source-features-program-programfrequencyscreen-tsx"></a>

### Program Frequency Screen

Source: [features/program/ProgramFrequencyScreen.tsx](/Users/satwikmekala/stackv3/features/program/ProgramFrequencyScreen.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Accessibility / spoken copy | {value} workout per week | [L15](/Users/satwikmekala/stackv3/features/program/ProgramFrequencyScreen.tsx:15) |
| Accessibility / spoken copy | {value} workouts per week | [L15](/Users/satwikmekala/stackv3/features/program/ProgramFrequencyScreen.tsx:15) |
| Accessibility / spoken copy | workout | `value === 1` · [L15](/Users/satwikmekala/stackv3/features/program/ProgramFrequencyScreen.tsx:15) |
| Accessibility / spoken copy | workouts | `otherwise: value === 1` · [L15](/Users/satwikmekala/stackv3/features/program/ProgramFrequencyScreen.tsx:15) |
| Dynamic copy / value | {value} | [L17](/Users/satwikmekala/stackv3/features/program/ProgramFrequencyScreen.tsx:17) |
| Visible text | WORKOUT ORDER | [L21](/Users/satwikmekala/stackv3/features/program/ProgramFrequencyScreen.tsx:21) |
| Visible text | Choose a number to see how your workouts fit together. | `frequency === null` · [L22](/Users/satwikmekala/stackv3/features/program/ProgramFrequencyScreen.tsx:22) |
| Dynamic copy / value | {frequency} workout in your starting lineup. | `otherwise: frequency === null` · [L23](/Users/satwikmekala/stackv3/features/program/ProgramFrequencyScreen.tsx:23) |
| Dynamic copy / value | {frequency} workouts in your starting lineup. | `otherwise: frequency === null` · [L23](/Users/satwikmekala/stackv3/features/program/ProgramFrequencyScreen.tsx:23) |
| Dynamic copy / value | {index + 1} · {day.shortLabel} | `otherwise: frequency === null` · [L25](/Users/satwikmekala/stackv3/features/program/ProgramFrequencyScreen.tsx:25) |
| Visible text | Train on the days that work for you. | `otherwise: frequency === null` · [L27](/Users/satwikmekala/stackv3/features/program/ProgramFrequencyScreen.tsx:27) |

<a id="source-features-program-programpreviewscreen-tsx"></a>

### Program Preview Screen

Source: [features/program/ProgramPreviewScreen.tsx](/Users/satwikmekala/stackv3/features/program/ProgramPreviewScreen.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Accessibility / spoken copy | {day.name}, {day.exercises.length} exercises | [L16](/Users/satwikmekala/stackv3/features/program/ProgramPreviewScreen.tsx:16) |
| Accessibility / spoken copy | Collapse exercise list | `expanded` · [L17](/Users/satwikmekala/stackv3/features/program/ProgramPreviewScreen.tsx:17) |
| Accessibility / spoken copy | Expand exercise list | `otherwise: expanded` · [L17](/Users/satwikmekala/stackv3/features/program/ProgramPreviewScreen.tsx:17) |
| Dynamic copy / value | {day.name} | [L19](/Users/satwikmekala/stackv3/features/program/ProgramPreviewScreen.tsx:19) |
| Dynamic copy / value | {day.exercises.length} exercises | [L20](/Users/satwikmekala/stackv3/features/program/ProgramPreviewScreen.tsx:20) |
| Dynamic copy / value | {exercise.name} | `expanded` · [L25](/Users/satwikmekala/stackv3/features/program/ProgramPreviewScreen.tsx:25) |
| Dynamic copy / value | {exercise.primaryMuscle} | `expanded` · [L25](/Users/satwikmekala/stackv3/features/program/ProgramPreviewScreen.tsx:25) |
| Visible text | Choose how the three workouts fit together. | `frequency === 3` · [L36](/Users/satwikmekala/stackv3/features/program/ProgramPreviewScreen.tsx:36) |
| Label / supplied copy | Full body | `frequency === 3` · [L37](/Users/satwikmekala/stackv3/features/program/ProgramPreviewScreen.tsx:37) |
| Label / supplied copy | Train your whole body in each workout. | `frequency === 3` · [L37](/Users/satwikmekala/stackv3/features/program/ProgramPreviewScreen.tsx:37) |
| Label / supplied copy | Push / Pull / Legs | `frequency === 3` · [L38](/Users/satwikmekala/stackv3/features/program/ProgramPreviewScreen.tsx:38) |
| Label / supplied copy | Separate pushing lifts, pulling lifts, and legs into their own workouts. | `frequency === 3` · [L38](/Users/satwikmekala/stackv3/features/program/ProgramPreviewScreen.tsx:38) |
| Accessibility / spoken copy | {option.name} | `frequency === 3` · [L39](/Users/satwikmekala/stackv3/features/program/ProgramPreviewScreen.tsx:39) |
| Accessibility / spoken copy | {option.copy} | `frequency === 3` · [L39](/Users/satwikmekala/stackv3/features/program/ProgramPreviewScreen.tsx:39) |
| Dynamic copy / value | {option.name} | `frequency === 3` · [L42](/Users/satwikmekala/stackv3/features/program/ProgramPreviewScreen.tsx:42) |
| Dynamic copy / value | {option.copy} | `frequency === 3` · [L43](/Users/satwikmekala/stackv3/features/program/ProgramPreviewScreen.tsx:43) |
| Visible text | Open a workout to see its exercises. You can change these later. | [L46](/Users/satwikmekala/stackv3/features/program/ProgramPreviewScreen.tsx:46) |
| Accessibility / spoken copy | Loading your workouts | `loading` · [L47](/Users/satwikmekala/stackv3/features/program/ProgramPreviewScreen.tsx:47) |
| Dynamic copy / value | {error} | `error` · [L48](/Users/satwikmekala/stackv3/features/program/ProgramPreviewScreen.tsx:48) |
| Visible text | Try loading again | `error` · [L48](/Users/satwikmekala/stackv3/features/program/ProgramPreviewScreen.tsx:48) |

<a id="source-features-program-programscreenframe-tsx"></a>

### Program Screen Frame

Source: [features/program/ProgramScreenFrame.tsx](/Users/satwikmekala/stackv3/features/program/ProgramScreenFrame.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {primary} | [L23](/Users/satwikmekala/stackv3/features/program/ProgramScreenFrame.tsx:23) |
| Dynamic copy / value | {secondary} | [L25](/Users/satwikmekala/stackv3/features/program/ProgramScreenFrame.tsx:25) |
| Accessibility / spoken copy | Back | [L30](/Users/satwikmekala/stackv3/features/program/ProgramScreenFrame.tsx:30) |
| Dynamic copy / value | {number} of 2 | [L33](/Users/satwikmekala/stackv3/features/program/ProgramScreenFrame.tsx:33) |
| Dynamic copy / value | {title} | [L34](/Users/satwikmekala/stackv3/features/program/ProgramScreenFrame.tsx:34) |

<a id="source-features-program-acceptance-ts"></a>

### acceptance

Source: [features/program/acceptance.ts](/Users/satwikmekala/stackv3/features/program/acceptance.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Validation / error | Could not save your program. Try again. | `!profile.onboardingCompleted` · [L19](/Users/satwikmekala/stackv3/features/program/acceptance.ts:19) |

<a id="source-features-program-lineup-ts"></a>

### lineup

Source: [features/program/lineup.ts](/Users/satwikmekala/stackv3/features/program/lineup.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Validation / error | Choose between 1 and 6 workouts. | `!Number.isInteger(frequency) \|\| frequency < 1 \|\| frequency > 6 \|\| !['full-body', 'push-pull-legs'].includes(structure)` · [L8](/Users/satwikmekala/stackv3/features/program/lineup.ts:8) |
| Validation / error | Could not load these workouts. Try again. | `!variants.length \|\| first < 0` · [L24](/Users/satwikmekala/stackv3/features/program/lineup.ts:24) |
| Validation / error | Could not load these exercises. Try again. | `!exercises.length` · [L29](/Users/satwikmekala/stackv3/features/program/lineup.ts:29) |
| Dynamic copy / value | {day.shortLabel} {variant.toUpperCase()} | [L31](/Users/satwikmekala/stackv3/features/program/lineup.ts:31) |

<a id="source-features-program-useprogramsetup-ts"></a>

### use Program Setup

Source: [features/program/useProgramSetup.ts](/Users/satwikmekala/stackv3/features/program/useProgramSetup.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Status / announcement | Could not save your choices. Try again. | `mounted.current` · [L55](/Users/satwikmekala/stackv3/features/program/useProgramSetup.ts:55) |
| Validation / error | Could not load your workouts. Try again. | `current` · [L81](/Users/satwikmekala/stackv3/features/program/useProgramSetup.ts:81) |

## Train, workout logging, set controls and workout sheets

<a id="source-app-tabs-index-tsx"></a>

### Train

Source: [app/(tabs)/index.tsx](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | JAN | [L57](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:57) |
| Label / supplied copy | FEB | [L58](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:58) |
| Label / supplied copy | MAR | [L59](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:59) |
| Label / supplied copy | APR | [L60](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:60) |
| Label / supplied copy | MAY | [L61](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:61) |
| Label / supplied copy | JUN | [L62](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:62) |
| Label / supplied copy | JUL | [L63](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:63) |
| Label / supplied copy | AUG | [L64](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:64) |
| Label / supplied copy | SEP | [L65](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:65) |
| Label / supplied copy | OCT | [L66](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:66) |
| Label / supplied copy | NOV | [L67](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:67) |
| Label / supplied copy | DEC | [L68](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:68) |
| Label / supplied copy | MONDAY | [L72](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:72) |
| Label / supplied copy | TUESDAY | [L73](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:73) |
| Label / supplied copy | WEDNESDAY | [L74](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:74) |
| Label / supplied copy | THURSDAY | [L75](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:75) |
| Label / supplied copy | FRIDAY | [L76](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:76) |
| Label / supplied copy | SATURDAY | [L77](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:77) |
| Label / supplied copy | SUNDAY | [L78](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:78) |
| Dynamic copy / value | Workout {getWorkoutLetter(index)} | [L118](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:118) |
| Dynamic copy / value | {day} · {MONTH_LABELS[today.getMonth()]} {today.getDate()} | [L131](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:131) |
| Label / supplied copy | TODAY | `queueState.nextUpDate === toLocalCalendarDate(now)` · [L185](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:185) |
| Label / supplied copy | NEXT UP | `otherwise: queueState.nextUpDate === toLocalCalendarDate(now); otherwise: isNoProgramMode → isCustomMode` · [L185](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:185) |
| Label / supplied copy | Your split | [L360](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:360) |
| Label / supplied copy | Stack's split | `otherwise: isCustomMode` · [L362](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:362) |
| Dynamic copy / value | Custom · {customWorkouts.length} {plural(customWorkouts.length, 'workout')} | `isCustomMode → customSplit` · [L365](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:365) |
| Dynamic copy / value | Custom · {activeSplitSummary.workoutCount} {plural(activeSplitSummary.workoutCount, 'workout')} | `otherwise: customSplit → activeSplitSummary` · [L367](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:367) |
| Label / supplied copy | Custom | `otherwise: customSplit → otherwise: activeSplitSummary` · [L368](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:368) |
| Dynamic copy / value | Auto-generated · {getProgramFrequency(profile)} {plural(getProgramFrequency(profile), 'workout')} | `otherwise: isCustomMode` · [L369](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:369) |
| Dynamic copy / value | Open Your Splits. Active split: {splitCardName}. | `isCustomMode` · [L371](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:371) |
| Label / supplied copy | Open Your Splits. Stack's split is active. | `otherwise: isCustomMode` · [L372](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:372) |
| Label / supplied copy | Morning | `hour < 12` · [L376](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:376) |
| Label / supplied copy | Afternoon | `otherwise: hour < 12 → hour < 18` · [L376](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:376) |
| Label / supplied copy | Evening | `otherwise: hour < 12 → otherwise: hour < 18` · [L376](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:376) |
| Dynamic copy / value | {todayLabel(now)} | [L406](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:406) |
| Dynamic copy / value | {greeting}, {firstName} | [L409](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:409) |
| Dynamic copy / value | Good {greeting.toLowerCase()} | [L409](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:409) |
| Dynamic copy / value | {getSessionWorkoutDisplay(currentSession).label} | `currentSession` · [L423](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:423) |
| Label / supplied copy | Workout | `currentSession; currentSession → currentSession.origin === 'adhoc'` · [L423](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:423) |
| Label / supplied copy | In progress | `currentSession; currentSession → otherwise: currentSession.origin === 'adhoc'` · [L423](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:423) |
| Label / supplied copy | IN PROGRESS | `currentSession` · [L425](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:425) |
| Label / supplied copy | Resume workout | `currentSession` · [L425](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:425) |
| Label / supplied copy | Ready when you are. | `otherwise: currentSession → isNoProgramMode` · [L427](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:427) |
| Label / supplied copy | Start a workout and add exercises as you go. | `otherwise: currentSession → isNoProgramMode` · [L428](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:428) |
| Label / supplied copy | YOUR TRAINING | `otherwise: currentSession → isNoProgramMode` · [L429](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:429) |
| Label / supplied copy | empty workout | `otherwise: currentSession → isNoProgramMode` · [L430](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:430) |
| Label / supplied copy | Edit your split | `otherwise: isNoProgramMode → isCustomMode; isCustomMode → customSplitBroken` · [L438](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:438) |
| Label / supplied copy | Nothing to train yet | `otherwise: isNoProgramMode → isCustomMode; isCustomMode → customSplitBroken` · [L439](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:439) |
| Dynamic copy / value | {customWorkoutTitle(selectedCustomWorkout, selectedCustomIndex)} | `otherwise: isNoProgramMode → isCustomMode` · [L439](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:439) |
| Dynamic copy / value | {customSplitName} | `otherwise: isNoProgramMode → isCustomMode` · [L439](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:439) |
| Label / supplied copy | Add exercises | `otherwise: isNoProgramMode → isCustomMode; isCustomMode → customSplitBroken` · [L446](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:446) |
| Dynamic copy / value | Workout {getWorkoutLetter(selectedCustomIndex)} | `otherwise: isNoProgramMode → isCustomMode; otherwise: customSplitBroken → selectedCustomWorkout` · [L446](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:446) |
| Dynamic copy / value | {heroEyebrow} | `otherwise: isNoProgramMode → otherwise: isCustomMode` · [L471](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:471) |
| Dynamic copy / value | {EMPTY_CUSTOM_WORKOUT_MESSAGE} | `isCustomMode && selectedCustomWorkout && !customWorkoutReady` · [L478](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:478) |
| Dynamic copy / value | {launchError} | `launchError` · [L482](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:482) |
| Accessibility / spoken copy | Start Empty Workout | `!currentSession && !isNoProgramMode` · [L489](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:489) |
| Accessibility / spoken copy | Build as you go. Add exercises after starting. | `!currentSession && !isNoProgramMode` · [L490](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:490) |
| Visible text | Start empty workout | `!currentSession && !isNoProgramMode` · [L494](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:494) |
| Visible text | Build as you go | `!currentSession && !isNoProgramMode` · [L495](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:495) |
| Accessibility / spoken copy | Get workouts from Stack | `isNoProgramMode` · [L500](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:500) |
| Accessibility / spoken copy | Preview Stack’s workouts. Browsing does not activate a program. | `isNoProgramMode` · [L501](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:501) |
| Visible text | Get workouts from Stack | `isNoProgramMode` · [L505](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:505) |
| Visible text | Find a starting lineup for your week | `isNoProgramMode` · [L506](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:506) |
| Accessibility / spoken copy | Saved routines | `isNoProgramMode` · [L509](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:509) |
| Accessibility / spoken copy | Open your routine library. Your program choice stays the same. | `isNoProgramMode` · [L510](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:510) |
| Visible text | Saved routines | `isNoProgramMode` · [L512](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:512) |
| Visible text | Keep your favorites ready for later | `isNoProgramMode` · [L513](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:513) |
| Accessibility / spoken copy | {splitCardLabel} | `otherwise: isNoProgramMode` · [L517](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx:517) |

<a id="source-app-workout-tsx"></a>

### Workout logger / active workout

Source: [app/workout.tsx](/Users/satwikmekala/stackv3/app/workout.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | TOO EASY | [L88](/Users/satwikmekala/stackv3/app/workout.tsx:88) |
| Label / supplied copy | JUST RIGHT | [L89](/Users/satwikmekala/stackv3/app/workout.tsx:89) |
| Label / supplied copy | TOO HARD | [L90](/Users/satwikmekala/stackv3/app/workout.tsx:90) |
| Accessibility / spoken copy | Exercise info | [L123](/Users/satwikmekala/stackv3/app/workout.tsx:123) |
| Accessibility / spoken copy | Opens exercise illustration, muscles, and description | [L124](/Users/satwikmekala/stackv3/app/workout.tsx:124) |
| Label / supplied copy | NOW | [L222](/Users/satwikmekala/stackv3/app/workout.tsx:222) |
| Dynamic copy / value | {formatWeight(weight, weightUnit)} · {formatDuration(durationS)} | `metric === 'duration' → otherwise: loadType === 'bodyweight'` · [L245](/Users/satwikmekala/stackv3/app/workout.tsx:245) |
| Dynamic copy / value | {reps} reps | `otherwise: metric === 'duration' → loadType === 'bodyweight'; otherwise: metric === 'duration'` · [L247](/Users/satwikmekala/stackv3/app/workout.tsx:247) |
| Dynamic copy / value | {formatWeight(weight, weightUnit)} × {reps} | `otherwise: metric === 'duration' → otherwise: loadType === 'bodyweight'` · [L248](/Users/satwikmekala/stackv3/app/workout.tsx:248) |
| Dynamic copy / value | {formatWeight(weight, weightUnit)} {weightUnit}, | `otherwise: loadType === 'bodyweight'` · [L250](/Users/satwikmekala/stackv3/app/workout.tsx:250) |
| Dynamic copy / value | current, {currentLabel} | `otherwise: currentLabel === 'NOW'` · [L251](/Users/satwikmekala/stackv3/app/workout.tsx:251) |
| Dynamic copy / value | Edit completed set {setNumber}, {loggedLoad}{loggedMeasurement} | `state === 'completed'` · [L253](/Users/satwikmekala/stackv3/app/workout.tsx:253) |
| Dynamic copy / value | Completed set {setNumber}, {loggedLoad}{loggedMeasurement} | `state === 'completed'` · [L253](/Users/satwikmekala/stackv3/app/workout.tsx:253) |
| Label / supplied copy | Edit completed | `state === 'completed' → onEdit` · [L253](/Users/satwikmekala/stackv3/app/workout.tsx:253) |
| Label / supplied copy | Completed | `state === 'completed' → otherwise: onEdit` · [L253](/Users/satwikmekala/stackv3/app/workout.tsx:253) |
| Dynamic copy / value | Set {setNumber}, {currentDescription} | `otherwise: state === 'completed'` · [L254](/Users/satwikmekala/stackv3/app/workout.tsx:254) |
| Dynamic copy / value | Set {setNumber}, upcoming | `otherwise: state === 'completed'` · [L254](/Users/satwikmekala/stackv3/app/workout.tsx:254) |
| Dynamic copy / value | {valueLabel} | `state !== 'upcoming'` · [L275](/Users/satwikmekala/stackv3/app/workout.tsx:275) |
| Visible text | Now | `state !== 'upcoming'` · [L275](/Users/satwikmekala/stackv3/app/workout.tsx:275) |
| Dynamic copy / value | {currentLabel} | `state !== 'upcoming'` · [L275](/Users/satwikmekala/stackv3/app/workout.tsx:275) |
| Accessibility / spoken copy | {accessibilityLabel} | `onPress; otherwise: onPress` · [L288](/Users/satwikmekala/stackv3/app/workout.tsx:288) |
| Accessibility / spoken copy | Shows logged values without changing workout progress | `onPress; onPress → state === 'completed'` · [L290](/Users/satwikmekala/stackv3/app/workout.tsx:290) |
| Accessibility / spoken copy | Returns to the current unfinished set | `onPress; onPress → otherwise: state === 'completed'` · [L290](/Users/satwikmekala/stackv3/app/workout.tsx:290) |
| Alert / confirmation | Discard workout? | [L440](/Users/satwikmekala/stackv3/app/workout.tsx:440) |
| Alert / confirmation | Leaving now will discard this workout. Sets you've logged won't be saved. | [L441](/Users/satwikmekala/stackv3/app/workout.tsx:441) |
| Label / supplied copy | Cancel | [L443](/Users/satwikmekala/stackv3/app/workout.tsx:443) |
| Label / supplied copy | Discard | [L445](/Users/satwikmekala/stackv3/app/workout.tsx:445) |
| Label / supplied copy | Workout | `currentSession.exercises.length === 0; currentSession.origin === 'adhoc'` · [L519](/Users/satwikmekala/stackv3/app/workout.tsx:519) |
| Visible text | Empty workout | `currentSession.exercises.length === 0` · [L524](/Users/satwikmekala/stackv3/app/workout.tsx:524) |
| Visible text | Add your first exercise | `currentSession.exercises.length === 0` · [L525](/Users/satwikmekala/stackv3/app/workout.tsx:525) |
| Visible text | Add Exercise | `currentSession.exercises.length === 0` · [L527](/Users/satwikmekala/stackv3/app/workout.tsx:527) |
| Dynamic copy / value | {archetypeComposition.shortLabel} + {ARCHETYPE_COMPOSITIONS[secondaryArchetype].shortLabel} | `archetypeComposition → secondaryArchetype` · [L546](/Users/satwikmekala/stackv3/app/workout.tsx:546) |
| Label / supplied copy | + | `percentage >= 0` · [L703](/Users/satwikmekala/stackv3/app/workout.tsx:703) |
| Dynamic copy / value | Last {formatWeight(progressionSuggestion.baselineKg, weightUnit)} · Try {formatWeight(progressionSuggestion.suggestedKg, weightUnit)} | `progressionSuggestion` · [L716](/Users/satwikmekala/stackv3/app/workout.tsx:716) |
| Dynamic copy / value | Last time {formatWeight(progressionSuggestion.baselineKg, weightUnit)} {weightUnit}. Use suggested {formatWeight(progressionSuggestion.suggestedKg, weightUnit)} {weightUnit} | `progressionSuggestion` · [L717](/Users/satwikmekala/stackv3/app/workout.tsx:717) |
| Dynamic copy / value | {dayLabel} | [L780](/Users/satwikmekala/stackv3/app/workout.tsx:780) |
| Dynamic copy / value | {exercise.name} | [L825](/Users/satwikmekala/stackv3/app/workout.tsx:825) |
| Accessibility / spoken copy | Exercise complete | `exerciseComplete && !bonusSelection` · [L848](/Users/satwikmekala/stackv3/app/workout.tsx:848) |
| Visible text | DONE | `exerciseComplete && !bonusSelection` · [L852](/Users/satwikmekala/stackv3/app/workout.tsx:852) |
| Label / supplied copy | Done editing | `otherwise: bonusSelection → otherwise: exerciseComplete && !inspectingSet; otherwise: exerciseComplete && !inspectingSet → inspectingSet` · [L1000](/Users/satwikmekala/stackv3/app/workout.tsx:1000) |
| Label / supplied copy | Log | `otherwise: bonusSelection → otherwise: exerciseComplete && !inspectingSet; otherwise: exerciseComplete && !inspectingSet → otherwise: inspectingSet` · [L1000](/Users/satwikmekala/stackv3/app/workout.tsx:1000) |
| Label / supplied copy | Back | `otherwise: bonusSelection → otherwise: exerciseComplete && !inspectingSet; otherwise: exerciseComplete && !inspectingSet → inspectingSet` · [L1001](/Users/satwikmekala/stackv3/app/workout.tsx:1001) |
| Label / supplied copy | Skip | `otherwise: bonusSelection → otherwise: exerciseComplete && !inspectingSet; otherwise: exerciseComplete && !inspectingSet → otherwise: inspectingSet` · [L1001](/Users/satwikmekala/stackv3/app/workout.tsx:1001) |
| Accessibility / spoken copy | Up next, {remainingExercises.length} exercise remaining | `nextExercise && !exerciseComplete && !bonusSelection` · [L1039](/Users/satwikmekala/stackv3/app/workout.tsx:1039) |
| Accessibility / spoken copy | Up next, {remainingExercises.length} exercises remaining | `nextExercise && !exerciseComplete && !bonusSelection` · [L1039](/Users/satwikmekala/stackv3/app/workout.tsx:1039) |
| Accessibility / spoken copy | exercise | `nextExercise && !exerciseComplete && !bonusSelection → remainingExercises.length === 1` · [L1040](/Users/satwikmekala/stackv3/app/workout.tsx:1040) |
| Accessibility / spoken copy | exercises | `nextExercise && !exerciseComplete && !bonusSelection → otherwise: remainingExercises.length === 1` · [L1040](/Users/satwikmekala/stackv3/app/workout.tsx:1040) |
| Accessibility / spoken copy | Shows the remaining exercise queue | `nextExercise && !exerciseComplete && !bonusSelection` · [L1042](/Users/satwikmekala/stackv3/app/workout.tsx:1042) |
| Visible text | UP NEXT | `nextExercise && !exerciseComplete && !bonusSelection` · [L1062](/Users/satwikmekala/stackv3/app/workout.tsx:1062) |
| Dynamic copy / value | {nextExercise.name} | `nextExercise && !exerciseComplete && !bonusSelection` · [L1084](/Users/satwikmekala/stackv3/app/workout.tsx:1084) |
| Dynamic copy / value | {nextExercise.sets.length} SETS | `nextExercise && !exerciseComplete && !bonusSelection` · [L1100](/Users/satwikmekala/stackv3/app/workout.tsx:1100) |
| Label / supplied copy | How did it feel? | [L1159](/Users/satwikmekala/stackv3/app/workout.tsx:1159) |
| Label / supplied copy | This helps us adjust your next workout to keep you progressing | [L1160](/Users/satwikmekala/stackv3/app/workout.tsx:1160) |
| Label / supplied copy | SLIDE TO FINISH | [L1161](/Users/satwikmekala/stackv3/app/workout.tsx:1161) |

<a id="source-components-activesetcard-tsx"></a>

### Active Set Card

Source: [components/ActiveSetCard.tsx](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Accessibility / spoken copy | Edit {inputLabel} | `isEditing` · [L171](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:171) |
| Label / supplied copy | Done | `isEditing; otherwise: primaryLabel === 'Log it' → primaryLabel === 'Done editing'` · [L184](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:184) |
| Accessibility / spoken copy | Edit {inputLabel}, current value {valueLabel} | `otherwise: isEditing` · [L190](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:190) |
| Dynamic copy / value | {valueLabel} | `otherwise: isEditing` · [L194](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:194) |
| Accessibility / spoken copy | Decrease {unit} | [L239](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:239) |
| Dynamic copy / value | {displayValue} | [L256](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:256) |
| Accessibility / spoken copy | Increase {unit} | [L266](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:266) |
| Dynamic copy / value | {unit} | [L280](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:280) |
| Label / supplied copy | Log | `primaryLabel === 'Log it'` · [L339](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:339) |
| Label / supplied copy | Skip | [L340](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:340) |
| Label / supplied copy | reps | [L344](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:344) |
| Label / supplied copy | kg | `onWeightUnitChange` · [L350](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:350) |
| Dynamic copy / value | set {setNumber} | [L393](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:393) |
| Label / supplied copy | set | [L393](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:393) |
| Accessibility / spoken copy | Weight unit | `onWeightUnitChange` · [L408](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:408) |
| Label / supplied copy | lbs | `onWeightUnitChange` · [L410](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:410) |
| Accessibility / spoken copy | Use kilograms | `onWeightUnitChange` · [L412](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:412) |
| Accessibility / spoken copy | Use pounds | `onWeightUnitChange` · [L412](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:412) |
| Accessibility / spoken copy | kilograms | `onWeightUnitChange → unit === 'kg'` · [L412](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:412) |
| Accessibility / spoken copy | pounds | `onWeightUnitChange → otherwise: unit === 'kg'` · [L412](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:412) |
| Dynamic copy / value | {unit.toUpperCase()} | `onWeightUnitChange` · [L416](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:416) |
| Dynamic copy / value | {weightUnit.toUpperCase()} | `otherwise: onWeightUnitChange` · [L420](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:420) |
| Visible text | Weight | [L423](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:423) |
| Dynamic copy / value | {weightDeltaLabel} | `weightDeltaLabel` · [L424](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:424) |
| Visible text | Reps | [L429](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:429) |
| Dynamic copy / value | {repsDeltaLabel} | `repsDeltaLabel` · [L430](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:430) |
| Dynamic copy / value | {heading} | `heading` · [L452](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:452) |
| Dynamic copy / value | {badgeLabel} | `heading → badgeLabel` · [L453](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:453) |
| Accessibility / spoken copy | {suggestion.accessibilityLabel} | `showsWeight → suggestion` · [L480](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:480) |
| Dynamic copy / value | {suggestion.label} | `showsWeight → suggestion` · [L482](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:482) |
| Visible text | Time | `metric === 'duration'` · [L490](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:490) |
| Dynamic copy / value | {formatDuration(elapsedS)} | `metric === 'duration' → running` · [L493](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:493) |
| Accessibility / spoken copy | {formatDuration(elapsedS)} elapsed | `metric === 'duration' → running` · [L493](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:493) |
| Visible text | elapsed | `metric === 'duration' → running` · [L495](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:495) |
| Dynamic copy / value | Target {formatDuration(timer.originalDurationS)} | `metric === 'duration' → timerTarget` · [L510](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:510) |
| Visible text | Or time this set | `metric === 'duration' → timerTarget` · [L510](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:510) |
| Accessibility / spoken copy | Stop timer for {contextLabel} | `metric === 'duration' → timerTarget` · [L515](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:515) |
| Accessibility / spoken copy | Resume timer for {contextLabel} | `metric === 'duration' → timerTarget` · [L515](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:515) |
| Accessibility / spoken copy | Start timer for {contextLabel} | `metric === 'duration' → timerTarget` · [L515](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:515) |
| Accessibility / spoken copy | Stop | `timerTarget → running` · [L515](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:515) |
| Accessibility / spoken copy | Resume | `otherwise: running → timer` · [L515](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:515) |
| Accessibility / spoken copy | Start | `otherwise: running → otherwise: timer` · [L515](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:515) |
| Accessibility / spoken copy | Uses elapsed time as the set duration | `metric === 'duration' → timerTarget; timerTarget → running` · [L516](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:516) |
| Accessibility / spoken copy | Continues from the stopped time | `metric === 'duration' → timerTarget; otherwise: running → timer` · [L516](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:516) |
| Accessibility / spoken copy | Measures this set from zero | `metric === 'duration' → timerTarget; otherwise: running → otherwise: timer` · [L516](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:516) |
| Visible text | Stop timer | `metric === 'duration' → timerTarget` · [L521](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:521) |
| Visible text | Resume | `metric === 'duration' → timerTarget` · [L521](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:521) |
| Visible text | Start timer | `metric === 'duration' → timerTarget` · [L521](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:521) |
| Accessibility / spoken copy | Reset timer for {contextLabel} | `timerTarget → timer` · [L525](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:525) |
| Accessibility / spoken copy | Clears elapsed time and restores the original set duration | `timerTarget → timer` · [L526](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:526) |
| Accessibility / spoken copy | {secondaryLabel} {contextLabel} | [L543](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:543) |
| Dynamic copy / value | {secondaryLabel} | [L546](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:546) |
| Dynamic copy / value | {actionLabel} | [L551](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:551) |
| Accessibility / spoken copy | {primaryLabel} {contextLabel} | [L552](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx:552) |

<a id="source-components-activeworkoutcard-tsx"></a>

### Active Workout Card

Source: [components/ActiveWorkoutCard.tsx](/Users/satwikmekala/stackv3/components/ActiveWorkoutCard.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | Set {nextSetIndex + 1} of {exercise.sets.length} | `nextSetIndex >= 0` · [L24](/Users/satwikmekala/stackv3/components/ActiveWorkoutCard.tsx:24) |
| Label / supplied copy | Add your first exercise | `otherwise: nextSetIndex >= 0 → session.exercises.length === 0` · [L25](/Users/satwikmekala/stackv3/components/ActiveWorkoutCard.tsx:25) |
| Label / supplied copy | Ready to finish | `otherwise: nextSetIndex >= 0 → otherwise: session.exercises.length === 0` · [L25](/Users/satwikmekala/stackv3/components/ActiveWorkoutCard.tsx:25) |
| Accessibility / spoken copy | Resume workout, {exercise?.name}, {progress} | [L36](/Users/satwikmekala/stackv3/components/ActiveWorkoutCard.tsx:36) |
| Accessibility / spoken copy | Resume workout, Workout, {progress} | [L36](/Users/satwikmekala/stackv3/components/ActiveWorkoutCard.tsx:36) |
| Accessibility / spoken copy | Workout | [L36](/Users/satwikmekala/stackv3/components/ActiveWorkoutCard.tsx:36) |
| Dynamic copy / value | {exercise?.name} | [L44](/Users/satwikmekala/stackv3/components/ActiveWorkoutCard.tsx:44) |
| Visible text | Workout | [L44](/Users/satwikmekala/stackv3/components/ActiveWorkoutCard.tsx:44) |
| Dynamic copy / value | {progress} | [L45](/Users/satwikmekala/stackv3/components/ActiveWorkoutCard.tsx:45) |
| Visible text | Resume | [L47](/Users/satwikmekala/stackv3/components/ActiveWorkoutCard.tsx:47) |

<a id="source-components-bonusset-tsx"></a>

### Bonus Set

Source: [components/BonusSet.tsx](/Users/satwikmekala/stackv3/components/BonusSet.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Extra Set | [L22](/Users/satwikmekala/stackv3/components/BonusSet.tsx:22) |
| Label / supplied copy | EXTRA | [L22](/Users/satwikmekala/stackv3/components/BonusSet.tsx:22) |
| Label / supplied copy | Drop Set | [L23](/Users/satwikmekala/stackv3/components/BonusSet.tsx:23) |
| Label / supplied copy | DROP | [L23](/Users/satwikmekala/stackv3/components/BonusSet.tsx:23) |
| Label / supplied copy | PR Attempt | [L24](/Users/satwikmekala/stackv3/components/BonusSet.tsx:24) |
| Label / supplied copy | PR | [L24](/Users/satwikmekala/stackv3/components/BonusSet.tsx:24) |
| Accessibility / spoken copy | Drop set | [L36](/Users/satwikmekala/stackv3/components/BonusSet.tsx:36) |
| Accessibility / spoken copy | Starts this set about 20 percent lighter | [L38](/Users/satwikmekala/stackv3/components/BonusSet.tsx:38) |
| Visible text | Drop set | [L53](/Users/satwikmekala/stackv3/components/BonusSet.tsx:53) |
| Dynamic copy / value | Set {setNumber} | [L106](/Users/satwikmekala/stackv3/components/BonusSet.tsx:106) |
| Label / supplied copy | Log | [L116](/Users/satwikmekala/stackv3/components/BonusSet.tsx:116) |
| Label / supplied copy | Cancel | [L117](/Users/satwikmekala/stackv3/components/BonusSet.tsx:117) |

<a id="source-components-exercisefinisher-tsx"></a>

### Exercise Finisher

Source: [components/ExerciseFinisher.tsx](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {formatWeight(set.weight, unit)} {unitLabel(unit)} | [L39](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:39) |
| Dynamic copy / value | {load} · {formatDuration(set.durationS)} | `metric === 'duration' → otherwise: loadType === 'bodyweight'` · [L41](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:41) |
| Dynamic copy / value | {set.reps} reps | `loadType === 'bodyweight'` · [L43](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:43) |
| Dynamic copy / value | {load} × {set.reps} | `otherwise: loadType === 'bodyweight'` · [L43](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:43) |
| Dynamic copy / value | {regular.length} set | [L50](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:50) |
| Dynamic copy / value | {regular.length} sets | [L50](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:50) |
| Dynamic copy / value | {count} · {describeSet(first, exercise.loadType, getExerciseMetric(exercise), exercise.entryUnit)} | [L52](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:52) |
| Dynamic copy / value | {groupThousands(formatWeight(value, unit))} {unitLabel(unit)} | `comparison.measure === 'volume'` · [L57](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:57) |
| Dynamic copy / value | {value} reps | `otherwise: comparison.measure === 'volume' → comparison.measure === 'reps'` · [L58](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:58) |
| Dynamic copy / value | {format(comparison.current)} total | [L59](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:59) |
| Label / supplied copy | first time | `comparison.previous === null` · [L60](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:60) |
| Label / supplied copy | same as last time | `Math.abs(diff) < 0.05` · [L62](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:62) |
| Dynamic copy / value | +{format(Math.abs(diff))} vs last time | [L63](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:63) |
| Dynamic copy / value | −{format(Math.abs(diff))} vs last time | [L63](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:63) |
| Label / supplied copy | + | `diff > 0` · [L63](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:63) |
| Label / supplied copy | − | `otherwise: diff > 0` · [L63](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:63) |
| Dynamic copy / value | RESTING {elapsed} | [L74](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:74) |
| Accessibility / spoken copy | Resting {elapsed} | [L74](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:74) |
| Accessibility / spoken copy | Set {index + 1}, skipped, drop set, personal record | [L94](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:94) |
| Accessibility / spoken copy | Set {index + 1}, skipped, drop set | [L94](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:94) |
| Accessibility / spoken copy | Set {index + 1}, skipped, personal record | [L94](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:94) |
| Accessibility / spoken copy | Set {index + 1}, skipped | [L94](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:94) |
| Accessibility / spoken copy | Set {index + 1}, {label}, drop set, personal record | [L94](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:94) |
| Accessibility / spoken copy | Set {index + 1}, {label}, drop set | [L94](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:94) |
| Accessibility / spoken copy | Set {index + 1}, {label}, personal record | [L94](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:94) |
| Accessibility / spoken copy | Set {index + 1}, {label} | [L94](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:94) |
| Accessibility / spoken copy | skipped | `set.skipped` · [L94](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:94) |
| Accessibility / spoken copy | , drop set | `isDrop` · [L94](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:94) |
| Accessibility / spoken copy | , personal record | `isRecord` · [L94](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:94) |
| Accessibility / spoken copy | Opens this set to edit it | [L95](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:95) |
| Dynamic copy / value | {index + 1} | [L100](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:100) |
| Visible text | Skipped | [L101](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:101) |
| Dynamic copy / value | {label} | [L101](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:101) |
| Visible text | DROP | `isDrop` · [L111](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:111) |
| Visible text | PR | `isRecord` · [L116](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:116) |
| Label / supplied copy | kg | [L139](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:139) |
| Dynamic copy / value | {lift.reps} reps | `loadType === 'bodyweight'` · [L175](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:175) |
| Dynamic copy / value | {formatWeight(lift.weight, weightUnit)} × {lift.reps} | `otherwise: loadType === 'bodyweight'` · [L175](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:175) |
| Dynamic copy / value | Best is {shortLoad(recordHint.best)}. {recordHint.beatReps} reps beats it. | `recordHint && recordSet.size === 0 → recordHint.beatReps !== null` · [L178](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:178) |
| Dynamic copy / value | Best is {shortLoad(recordHint.best)}. Within reach. | `recordHint && recordSet.size === 0 → otherwise: recordHint.beatReps !== null` · [L179](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:179) |
| Dynamic copy / value | {describe(set)} | [L193](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:193) |
| Accessibility / spoken copy | Add set, starting at {describe(base)} | [L203](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:203) |
| Accessibility / spoken copy | {hint} | [L204](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:204) |
| Visible text | Add set | [L216](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:216) |
| Dynamic copy / value | {describe(base)} | [L217](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:217) |
| Dynamic copy / value | {hint} | `hint` · [L220](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:220) |
| Dynamic copy / value | {summary.total} · {summary.delta} | `summary` · [L226](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:226) |
| Visible text | Add another exercise | `onAddAnother` · [L237](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:237) |
| Visible text | Log at least one non-skipped set to finish. | `finishDisabled` · [L241](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:241) |
| Accessibility / spoken copy | Start {nextExercise.name}, {nextTarget} | `nextExercise` · [L246](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:246) |
| Accessibility / spoken copy | Finish workout | `otherwise: nextExercise` · [L246](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:246) |
| Visible text | UP NEXT | `nextExercise` · [L262](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:262) |
| Dynamic copy / value | {nextExercise.name} | `nextExercise` · [L263](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:263) |
| Dynamic copy / value | {nextTarget} | `nextExercise` · [L267](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:267) |
| Visible text | Finish workout | `otherwise: nextExercise` · [L270](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx:270) |

<a id="source-components-exerciseinfo-tsx"></a>

### Exercise Info

Source: [components/ExerciseInfo.tsx](/Users/satwikmekala/stackv3/components/ExerciseInfo.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {label} | [L27](/Users/satwikmekala/stackv3/components/ExerciseInfo.tsx:27) |
| Accessibility / spoken copy | Close exercise info | [L107](/Users/satwikmekala/stackv3/components/ExerciseInfo.tsx:107) |
| Dynamic copy / value | {info.category.toUpperCase()} | [L167](/Users/satwikmekala/stackv3/components/ExerciseInfo.tsx:167) |
| Accessibility / spoken copy | {info.title} exercise illustration | [L193](/Users/satwikmekala/stackv3/components/ExerciseInfo.tsx:193) |
| Dynamic copy / value | {info.title} | [L199](/Users/satwikmekala/stackv3/components/ExerciseInfo.tsx:199) |
| Dynamic copy / value | {muscle} | [L210](/Users/satwikmekala/stackv3/components/ExerciseInfo.tsx:210) |
| Dynamic copy / value | {info.description} | [L213](/Users/satwikmekala/stackv3/components/ExerciseInfo.tsx:213) |

<a id="source-components-exercisenotes-tsx"></a>

### Exercise Notes

Source: [components/ExerciseNotes.tsx](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | This workout | `note.workoutId === workoutId` · [L47](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:47) |
| Alert / confirmation | Discard this draft? | [L68](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:68) |
| Alert / confirmation | Your saved notes will stay here. | [L68](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:68) |
| Label / supplied copy | Keep writing | [L69](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:69) |
| Label / supplied copy | Discard draft | [L70](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:70) |
| Status / announcement | Note saved | [L87](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:87) |
| Status / announcement | Couldn’t save your note. Try again. | `otherwise: cause instanceof Error` · [L89](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:89) |
| Alert / confirmation | Delete this note? | [L101](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:101) |
| Alert / confirmation | It will also be removed from its workout report. | [L101](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:101) |
| Label / supplied copy | Cancel | [L102](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:102) |
| Label / supplied copy | Delete note | [L103](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:103) |
| Status / announcement | Couldn’t delete this note. Try again. | [L105](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:105) |
| Accessibility / spoken copy | {exerciseName} notes, {notes.length} saved | [L126](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:126) |
| Accessibility / spoken copy | {exerciseName} notes | [L126](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:126) |
| Accessibility / spoken copy | , {notes.length} saved | `notes.length` · [L126](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:126) |
| Accessibility / spoken copy | Read previous notes or write a note for this exercise | [L127](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:127) |
| Visible text | Exercise notes | [L154](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:154) |
| Dynamic copy / value | {exerciseName} | [L155](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:155) |
| Accessibility / spoken copy | Close exercise notes | [L158](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:158) |
| Dynamic copy / value | {error} | `error` · [L173](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:173) |
| Accessibility / spoken copy | New note for {exerciseName} | [L176](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:176) |
| Label / supplied copy | Write a note… | [L177](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:177) |
| Dynamic copy / value | {draft.length} / {EXERCISE_NOTE_MAX_LENGTH} | [L191](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:191) |
| Visible text | Note saved | [L191](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:191) |
| Visible text | Done saves your note | [L191](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:191) |
| Visible text | Couldn’t load your notes | `readError` · [L201](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:201) |
| Visible text | Try again | `readError` · [L203](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:203) |
| Visible text | Your notes will stay with this exercise for next time and appear in its workout report. | `otherwise: readError → notes.length === 0` · [L208](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:208) |
| Dynamic copy / value | {label} | `otherwise: readError → otherwise: notes.length === 0` · [L212](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:212) |
| Visible text | • | `otherwise: readError → otherwise: notes.length === 0` · [L215](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:215) |
| Dynamic copy / value | {note.text} | `otherwise: readError → otherwise: notes.length === 0` · [L216](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:216) |
| Accessibility / spoken copy | Delete note: {note.text} | `otherwise: readError → otherwise: notes.length === 0` · [L219](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx:219) |

<a id="source-components-exercisenotesdone-tsx"></a>

### Exercise Notes Done

Source: [components/ExerciseNotesDone.tsx](/Users/satwikmekala/stackv3/components/ExerciseNotesDone.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Done | [L4](/Users/satwikmekala/stackv3/components/ExerciseNotesDone.tsx:4) |

<a id="source-components-exercisesearchinput-tsx"></a>

### Exercise Search Input

Source: [components/ExerciseSearchInput.tsx](/Users/satwikmekala/stackv3/components/ExerciseSearchInput.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Accessibility / spoken copy | Search exercises | [L17](/Users/satwikmekala/stackv3/components/ExerciseSearchInput.tsx:17) |
| Label / supplied copy | Search exercises | [L21](/Users/satwikmekala/stackv3/components/ExerciseSearchInput.tsx:21) |
| Accessibility / spoken copy | Clear exercise search | `value.length > 0` · [L29](/Users/satwikmekala/stackv3/components/ExerciseSearchInput.tsx:29) |

<a id="source-components-resttimer-tsx"></a>

### Rest Timer

Source: [components/RestTimer.tsx](/Users/satwikmekala/stackv3/components/RestTimer.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {minutes}:{seconds.toString().padStart(2, '0')} | [L30](/Users/satwikmekala/stackv3/components/RestTimer.tsx:30) |
| Visible text | Rest | [L117](/Users/satwikmekala/stackv3/components/RestTimer.tsx:117) |
| Dynamic copy / value | {formatTime(remaining)} | [L129](/Users/satwikmekala/stackv3/components/RestTimer.tsx:129) |
| Accessibility / spoken copy | Remove 15 seconds from rest | [L172](/Users/satwikmekala/stackv3/components/RestTimer.tsx:172) |
| Visible text | −15 | [L187](/Users/satwikmekala/stackv3/components/RestTimer.tsx:187) |
| Accessibility / spoken copy | Skip rest | [L197](/Users/satwikmekala/stackv3/components/RestTimer.tsx:197) |
| Visible text | Skip rest | [L202](/Users/satwikmekala/stackv3/components/RestTimer.tsx:202) |
| Accessibility / spoken copy | Add 15 seconds to rest | [L212](/Users/satwikmekala/stackv3/components/RestTimer.tsx:212) |
| Visible text | +15 | [L227](/Users/satwikmekala/stackv3/components/RestTimer.tsx:227) |

<a id="source-components-setinput-tsx"></a>

### Set Input

Source: [components/SetInput.tsx](/Users/satwikmekala/stackv3/components/SetInput.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {displayValue} | [L68](/Users/satwikmekala/stackv3/components/SetInput.tsx:68) |
| Dynamic copy / value | {value} | [L68](/Users/satwikmekala/stackv3/components/SetInput.tsx:68) |
| Label / supplied copy | kg | [L100](/Users/satwikmekala/stackv3/components/SetInput.tsx:100) |
| Dynamic copy / value | SET {setNumber} | [L164](/Users/satwikmekala/stackv3/components/SetInput.tsx:164) |
| Visible text | Skipped | `(!completed \|\| skipped)` · [L187](/Users/satwikmekala/stackv3/components/SetInput.tsx:187) |
| Visible text | Skip | `(!completed \|\| skipped)` · [L187](/Users/satwikmekala/stackv3/components/SetInput.tsx:187) |
| Visible text | Reps | [L224](/Users/satwikmekala/stackv3/components/SetInput.tsx:224) |
| Dynamic copy / value | Weight ({unitLabel(weightUnit)}) | [L230](/Users/satwikmekala/stackv3/components/SetInput.tsx:230) |

<a id="source-components-swapexercisesheet-tsx"></a>

### Swap Exercise Sheet

Source: [components/SwapExerciseSheet.tsx](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Something went wrong. Please try again. | `otherwise: error instanceof Error` · [L106](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:106) |
| Accessibility / spoken copy | Add {name}, already added | `action === 'add'` · [L152](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:152) |
| Accessibility / spoken copy | Add {name} | `action === 'add'` · [L152](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:152) |
| Accessibility / spoken copy | Replace current exercise with {name} | `otherwise: action === 'add' → action === 'replace'; action === 'replace'` · [L152](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:152) |
| Accessibility / spoken copy | {name}, completed, current exercise | `otherwise: action === 'add' → otherwise: action === 'replace'` · [L152](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:152) |
| Accessibility / spoken copy | {name}, completed | `otherwise: action === 'add' → otherwise: action === 'replace'` · [L152](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:152) |
| Accessibility / spoken copy | {name}, current exercise | `otherwise: action === 'add' → otherwise: action === 'replace'` · [L152](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:152) |
| Accessibility / spoken copy | {name} | `otherwise: action === 'add' → otherwise: action === 'replace'` · [L152](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:152) |
| Accessibility / spoken copy | , already added | `action === 'add' → isAdded` · [L154](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:154) |
| Accessibility / spoken copy | , completed | `otherwise: action === 'replace' → isCompleted` · [L157](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:157) |
| Accessibility / spoken copy | , current exercise | `otherwise: action === 'replace' → isCurrent` · [L158](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:158) |
| Accessibility / spoken copy | Swipe left to reveal Rename, or use the Rename accessibility action. | `onEdit` · [L162](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:162) |
| Accessibility / spoken copy | Swipe left to reveal Delete, or use the Delete accessibility action. | `otherwise: onEdit → onDelete` · [L162](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:162) |
| Label / supplied copy | rename | `onEdit` · [L171](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:171) |
| Dynamic copy / value | Rename {name} | `onEdit` · [L171](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:171) |
| Label / supplied copy | delete | `otherwise: onEdit → onDelete` · [L173](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:173) |
| Dynamic copy / value | Delete {name} | `otherwise: onEdit → onDelete` · [L173](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:173) |
| Dynamic copy / value | {name} · Already added | [L187](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:187) |
| Dynamic copy / value | {name} | [L187](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:187) |
| Label / supplied copy | Current | `isCurrent` · [L196](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:196) |
| Accessibility / spoken copy | {name} is already in today's workout | `action === 'replace'; action === 'replace' → isAdded` · [L213](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:213) |
| Accessibility / spoken copy | Add {name} to today's workout | `action === 'replace'; action === 'replace' → otherwise: isAdded` · [L213](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:213) |
| Accessibility / spoken copy | Rename {rowProps.name} | [L303](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:303) |
| Accessibility / spoken copy | Delete {rowProps.name} | [L303](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:303) |
| Accessibility / spoken copy | Rename | `isRename` · [L303](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:303) |
| Accessibility / spoken copy | Delete | `otherwise: isRename` · [L303](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:303) |
| Accessibility / spoken copy | Opens the exercise name editor | `isRename` · [L304](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:304) |
| Accessibility / spoken copy | Deletes this exercise permanently | `otherwise: isRename` · [L304](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:304) |
| Visible text | Rename | [L321](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:321) |
| Visible text | Delete | [L321](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:321) |
| Label / supplied copy | reps | `editor → editor.kind === 'add' && !existingNameMatch` · [L413](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:413) |
| Validation / error | Couldn’t add exercise. Try again. | `mode === 'add' && !addExerciseToSession(name)` · [L631](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:631) |
| Validation / error | Exercise name cannot be empty. | `!name` · [L646](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:646) |
| Validation / error | Choose a muscle group. | `!addMuscleGroup` · [L672](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:672) |
| Label / supplied copy | Other | [L682](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:682) |
| Validation / error | Could not create exercise. Please try again. | `id === undefined` · [L687](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:687) |
| Alert / confirmation | Already added | `scheduledNames.has(name)` · [L725](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:725) |
| Alert / confirmation | This exercise is already in your workout. | `scheduledNames.has(name)` · [L725](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:725) |
| Alert / confirmation | Can’t Delete Exercise | `hasExerciseHistory(exercise.id); message.includes('logged history')` · [L779](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:779) |
| Alert / confirmation | {exercise.name} can’t be deleted because it has logged history. | `hasExerciseHistory(exercise.id); message.includes('logged history')` · [L780](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:780) |
| Alert / confirmation | Delete Exercise? | [L786](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:786) |
| Alert / confirmation | Delete {exercise.name}? This can’t be undone. | [L787](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:787) |
| Label / supplied copy | Cancel | [L789](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:789) |
| Label / supplied copy | Delete | [L791](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:791) |
| Label / supplied copy | logged history | `message.includes('logged history')` · [L800](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:800) |
| Alert / confirmation | Couldn’t Delete Exercise | `message.includes('logged history')` · [L806](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:806) |
| Accessibility / spoken copy | Close exercises | [L826](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:826) |
| Accessibility / spoken copy | Back to exercises | `editor` · [L852](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:852) |
| Visible text | Rename exercise | [L866](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:866) |
| Visible text | Add exercise | `otherwise: editor; otherwise: editor → !otherMatches.length` · [L866](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:866) |
| Visible text | Exercises | [L866](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:866) |
| Dynamic copy / value | {dayLabel} | `!editor` · [L890](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:890) |
| Visible text | EXERCISE NAME | `editor` · [L912](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:912) |
| Accessibility / spoken copy | Exercise name | `editor` · [L914](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:914) |
| Label / supplied copy | Exercise name | `editor` · [L929](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:929) |
| Dynamic copy / value | {formError} | `editor → formError` · [L939](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:939) |
| Visible text | Use an existing exercise | `editor → editor.kind === 'add' && exerciseName.trim()` · [L950](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:950) |
| Visible text | This exercise is already in your workout. | `editor → editor.kind === 'add' && exerciseName.trim()` · [L950](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:950) |
| Visible text | New exercise · choose how to track it below. | `editor → editor.kind === 'add' && exerciseName.trim()` · [L950](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:950) |
| Accessibility / spoken copy | Use {exercise.name} | `editor → editor.kind === 'add' && exerciseName.trim()` · [L961](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:961) |
| Dynamic copy / value | {exercise.name} | `editor → editor.kind === 'add' && exerciseName.trim()` · [L967](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:967) |
| Dynamic copy / value | {getMuscleGroupForExercise(exercise)} | `editor → editor.kind === 'add' && exerciseName.trim()` · [L970](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:970) |
| Dynamic copy / value | {addMatches.length - 5} more matches. Keep typing to narrow the list. | `editor.kind === 'add' && exerciseName.trim() → addMatches.length > 5` · [L982](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:982) |
| Visible text | This also renames it in your past workouts and other splits. | `editor → editor.kind === 'rename'` · [L991](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:991) |
| Visible text | MUSCLE GROUP | `editor → editor.kind === 'add' && !existingNameMatch` · [L1000](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1000) |
| Visible text | Choose one | `editor → editor.kind === 'add' && !existingNameMatch` · [L1003](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1003) |
| Accessibility / spoken copy | {group} | `editor → editor.kind === 'add' && !existingNameMatch` · [L1012](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1012) |
| Dynamic copy / value | {group} | `editor → editor.kind === 'add' && !existingNameMatch; otherwise: editor` · [L1035](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1035) |
| Visible text | MEASUREMENT | `editor → editor.kind === 'add' && !existingNameMatch` · [L1049](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1049) |
| Visible text | How should this exercise be logged? | `editor → editor.kind === 'add' && !existingNameMatch` · [L1050](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1050) |
| Visible text | Load | `editor → editor.kind === 'add' && !existingNameMatch` · [L1053](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1053) |
| Label / supplied copy | Bodyweight | `editor.kind === 'add' && !existingNameMatch → value === 'bodyweight'` · [L1060](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1060) |
| Label / supplied copy | External weight | `editor.kind === 'add' && !existingNameMatch → otherwise: value === 'bodyweight'` · [L1061](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1061) |
| Accessibility / spoken copy | {label} | `editor → editor.kind === 'add' && !existingNameMatch` · [L1066](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1066) |
| Dynamic copy / value | {label} | `editor → editor.kind === 'add' && !existingNameMatch` · [L1078](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1078) |
| Visible text | Track | `editor → editor.kind === 'add' && !existingNameMatch` · [L1098](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1098) |
| Label / supplied copy | Reps | `editor.kind === 'add' && !existingNameMatch → value === 'reps'` · [L1102](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1102) |
| Label / supplied copy | Time | `editor.kind === 'add' && !existingNameMatch → otherwise: value === 'reps'` · [L1102](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1102) |
| Dynamic copy / value | Replacing {currentExerciseName} will discard {completedSetCount} logged set. | `otherwise: editor → pendingExerciseName` · [L1145](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1145) |
| Dynamic copy / value | Replacing {currentExerciseName} will discard {completedSetCount} logged sets. | `otherwise: editor → pendingExerciseName` · [L1145](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1145) |
| Visible text | Cancel | `otherwise: editor → pendingExerciseName; editor` · [L1159](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1159) |
| Accessibility / spoken copy | Confirm exercise replacement | `otherwise: editor → pendingExerciseName` · [L1163](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1163) |
| Visible text | Continue | `otherwise: editor → pendingExerciseName` · [L1173](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1173) |
| Visible text | TODAY'S WORKOUT | `otherwise: editor` · [L1180](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1180) |
| Visible text | OTHER EXERCISES | `otherwise: editor` · [L1234](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1234) |
| Accessibility / spoken copy | Add exercise | `otherwise: editor` · [L1237](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1237) |
| Accessibility / spoken copy | Search other exercises | `otherwise: editor` · [L1257](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1257) |
| Label / supplied copy | Search exercises | `otherwise: editor` · [L1258](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1258) |
| Accessibility / spoken copy | Clear exercise search | `otherwise: editor → otherQuery.length > 0` · [L1270](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1270) |
| Visible text | All | `otherwise: editor` · [L1307](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1307) |
| Alert / confirmation | Couldn’t Add Exercise | `otherwise: editor → otherwise: mode === 'add'` · [L1347](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1347) |
| Visible text | No exercises found | `otherwise: editor → !otherMatches.length` · [L1363](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1363) |
| Visible text | Try another name or muscle group, or add your own exercise. | `otherwise: editor → !otherMatches.length` · [L1364](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1364) |
| Accessibility / spoken copy | Create an exercise from search | `otherwise: editor → !otherMatches.length` · [L1370](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1370) |
| Accessibility / spoken copy | Save exercise name | `editor; editor → editor.kind === 'rename'` · [L1400](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1400) |
| Accessibility / spoken copy | Use existing exercise | `editor; otherwise: editor.kind === 'rename' → existingNameMatch` · [L1400](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1400) |
| Accessibility / spoken copy | Create new exercise | `editor; otherwise: editor.kind === 'rename' → otherwise: existingNameMatch` · [L1400](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1400) |
| Visible text | Save name | `editor` · [L1426](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1426) |
| Visible text | Use exercise | `editor` · [L1426](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1426) |
| Visible text | Create exercise | `editor` · [L1426](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx:1426) |

<a id="source-components-upnextsheet-tsx"></a>

### Up Next Sheet

Source: [components/UpNextSheet.tsx](/Users/satwikmekala/stackv3/components/UpNextSheet.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Accessibility / spoken copy | Close up next | [L116](/Users/satwikmekala/stackv3/components/UpNextSheet.tsx:116) |
| Visible text | Up Next | [L136](/Users/satwikmekala/stackv3/components/UpNextSheet.tsx:136) |
| Dynamic copy / value | {exercises.length} exercise remaining | [L139](/Users/satwikmekala/stackv3/components/UpNextSheet.tsx:139) |
| Dynamic copy / value | {exercises.length} exercises remaining | [L139](/Users/satwikmekala/stackv3/components/UpNextSheet.tsx:139) |
| Accessibility / spoken copy | {exercise.name}, {exercise.sets.length} set | [L177](/Users/satwikmekala/stackv3/components/UpNextSheet.tsx:177) |
| Accessibility / spoken copy | {exercise.name}, {exercise.sets.length} sets | [L177](/Users/satwikmekala/stackv3/components/UpNextSheet.tsx:177) |
| Accessibility / spoken copy | set | `exercise.sets.length === 1` · [L178](/Users/satwikmekala/stackv3/components/UpNextSheet.tsx:178) |
| Accessibility / spoken copy | sets | `otherwise: exercise.sets.length === 1` · [L178](/Users/satwikmekala/stackv3/components/UpNextSheet.tsx:178) |
| Accessibility / spoken copy | Jump to this exercise | [L180](/Users/satwikmekala/stackv3/components/UpNextSheet.tsx:180) |
| Dynamic copy / value | {exercise.name} | [L186](/Users/satwikmekala/stackv3/components/UpNextSheet.tsx:186) |
| Dynamic copy / value | {exercise.sets.length} SET | [L189](/Users/satwikmekala/stackv3/components/UpNextSheet.tsx:189) |
| Dynamic copy / value | {exercise.sets.length} SETS | [L189](/Users/satwikmekala/stackv3/components/UpNextSheet.tsx:189) |

<a id="source-components-workoutdaylabel-tsx"></a>

### Workout Day Label

Source: [components/WorkoutDayLabel.tsx](/Users/satwikmekala/stackv3/components/WorkoutDayLabel.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {label.toUpperCase()} | [L26](/Users/satwikmekala/stackv3/components/WorkoutDayLabel.tsx:26) |

<a id="source-components-workoutheaderactions-tsx"></a>

### Workout Header Actions

Source: [components/WorkoutHeaderActions.tsx](/Users/satwikmekala/stackv3/components/WorkoutHeaderActions.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Accessibility / spoken copy | Add exercise or navigate | `addMode` · [L10](/Users/satwikmekala/stackv3/components/WorkoutHeaderActions.tsx:10) |
| Accessibility / spoken copy | Change exercise | `otherwise: addMode` · [L10](/Users/satwikmekala/stackv3/components/WorkoutHeaderActions.tsx:10) |
| Visible text | Add | [L13](/Users/satwikmekala/stackv3/components/WorkoutHeaderActions.tsx:13) |
| Visible text | Change | [L13](/Users/satwikmekala/stackv3/components/WorkoutHeaderActions.tsx:13) |
| Accessibility / spoken copy | Minimize workout | [L15](/Users/satwikmekala/stackv3/components/WorkoutHeaderActions.tsx:15) |
| Accessibility / spoken copy | Keep your workout active and return to the previous screen | [L16](/Users/satwikmekala/stackv3/components/WorkoutHeaderActions.tsx:16) |
| Accessibility / spoken copy | Exit workout | [L19](/Users/satwikmekala/stackv3/components/WorkoutHeaderActions.tsx:19) |

<a id="source-components-workoutlaunchsurface-tsx"></a>

### Workout Launch Surface

Source: [components/WorkoutLaunchSurface.tsx](/Users/satwikmekala/stackv3/components/WorkoutLaunchSurface.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | launch-glow-{useId().replace(/[^a-zA-Z0-9_-]/g, '')} | [L38](/Users/satwikmekala/stackv3/components/WorkoutLaunchSurface.tsx:38) |

<a id="source-components-workoutlogaction-tsx"></a>

### Workout Log Action

Source: [components/WorkoutLogAction.tsx](/Users/satwikmekala/stackv3/components/WorkoutLogAction.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Accessibility / spoken copy | {accessibilityLabel} | [L57](/Users/satwikmekala/stackv3/components/WorkoutLogAction.tsx:57) |
| Dynamic copy / value | {label} | [L63](/Users/satwikmekala/stackv3/components/WorkoutLogAction.tsx:63) |

<a id="source-components-workoutnumberwheel-tsx"></a>

### Workout Number Wheel

Source: [components/WorkoutNumberWheel.tsx](/Users/satwikmekala/stackv3/components/WorkoutNumberWheel.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {interpolate(distance, [-2, 0, 2], [52, 0, -52], Extrapolation.CLAMP)}deg | `otherwise: reducedMotion → otherwise: horizontal` · [L20](/Users/satwikmekala/stackv3/components/WorkoutNumberWheel.tsx:20) |
| Dynamic copy / value | {number} | [L24](/Users/satwikmekala/stackv3/components/WorkoutNumberWheel.tsx:24) |
| Accessibility / spoken copy | {label} | [L65](/Users/satwikmekala/stackv3/components/WorkoutNumberWheel.tsx:65) |
| Accessibility / spoken copy | Swipe left or right to choose a number | `horizontal` · [L66](/Users/satwikmekala/stackv3/components/WorkoutNumberWheel.tsx:66) |
| Accessibility / spoken copy | Swipe up or down to choose a number | `otherwise: horizontal` · [L66](/Users/satwikmekala/stackv3/components/WorkoutNumberWheel.tsx:66) |
| Dynamic copy / value | {value} reps | `horizontal` · [L67](/Users/satwikmekala/stackv3/components/WorkoutNumberWheel.tsx:67) |
| Label / supplied copy | increment | [L68](/Users/satwikmekala/stackv3/components/WorkoutNumberWheel.tsx:68) |
| Label / supplied copy | decrement | [L68](/Users/satwikmekala/stackv3/components/WorkoutNumberWheel.tsx:68) |

<a id="source-components-workoutrepspicker-tsx"></a>

### Workout Reps Picker

Source: [components/WorkoutRepsPicker.tsx](/Users/satwikmekala/stackv3/components/WorkoutRepsPicker.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Repetitions | [L11](/Users/satwikmekala/stackv3/components/WorkoutRepsPicker.tsx:11) |

<a id="source-components-workoutsetrail-tsx"></a>

### Workout Set Rail

Source: [components/WorkoutSetRail.tsx](/Users/satwikmekala/stackv3/components/WorkoutSetRail.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {setNumber} | [L134](/Users/satwikmekala/stackv3/components/WorkoutSetRail.tsx:134) |

<a id="source-components-workoutweightpicker-tsx"></a>

### Workout Weight Picker

Source: [components/WorkoutWeightPicker.tsx](/Users/satwikmekala/stackv3/components/WorkoutWeightPicker.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | Weight in {unit}, whole number | [L14](/Users/satwikmekala/stackv3/components/WorkoutWeightPicker.tsx:14) |
| Visible text | . | [L15](/Users/satwikmekala/stackv3/components/WorkoutWeightPicker.tsx:15) |
| Dynamic copy / value | Weight in {unit}, decimal digit | [L16](/Users/satwikmekala/stackv3/components/WorkoutWeightPicker.tsx:16) |
| Dynamic copy / value | {unit} | `!compact` · [L17](/Users/satwikmekala/stackv3/components/WorkoutWeightPicker.tsx:17) |

<a id="source-components-home-slidetostart-tsx"></a>

### Slide To Start

Source: [components/home/SlideToStart.tsx](/Users/satwikmekala/stackv3/components/home/SlideToStart.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Accessibility / spoken copy | Start workout, {workoutName} | `screenReader \|\| fontScale > 1.5 \|\| Platform.OS === 'web'` · [L171](/Users/satwikmekala/stackv3/components/home/SlideToStart.tsx:171) |
| Visible text | Start workout | `screenReader \|\| fontScale > 1.5 \|\| Platform.OS === 'web'` · [L173](/Users/satwikmekala/stackv3/components/home/SlideToStart.tsx:173) |
| Accessibility / spoken copy | Slide the handle to the end and release, or activate to start. | [L177](/Users/satwikmekala/stackv3/components/home/SlideToStart.tsx:177) |
| Label / supplied copy | activate | [L179](/Users/satwikmekala/stackv3/components/home/SlideToStart.tsx:179) |
| Label / supplied copy | Start workout | [L179](/Users/satwikmekala/stackv3/components/home/SlideToStart.tsx:179) |
| Visible text | Slide to start | [L186](/Users/satwikmekala/stackv3/components/home/SlideToStart.tsx:186) |
| Visible text | Time to stack up | [L189](/Users/satwikmekala/stackv3/components/home/SlideToStart.tsx:189) |

<a id="source-components-home-weeklyprogresspill-tsx"></a>

### Weekly Progress Pill

Source: [components/home/WeeklyProgressPill.tsx](/Users/satwikmekala/stackv3/components/home/WeeklyProgressPill.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Accessibility / spoken copy | {completed} of {goal} workouts completed this week | [L14](/Users/satwikmekala/stackv3/components/home/WeeklyProgressPill.tsx:14) |
| Dynamic copy / value | {completed} | [L16](/Users/satwikmekala/stackv3/components/home/WeeklyProgressPill.tsx:16) |
| Dynamic copy / value | /{goal} | [L17](/Users/satwikmekala/stackv3/components/home/WeeklyProgressPill.tsx:17) |

<a id="source-components-home-workoutherocard-tsx"></a>

### Workout Hero Card

Source: [components/home/WorkoutHeroCard.tsx](/Users/satwikmekala/stackv3/components/home/WorkoutHeroCard.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | NEXT UP | [L27](/Users/satwikmekala/stackv3/components/home/WorkoutHeroCard.tsx:27) |
| Label / supplied copy | Nice work this week | `completed` · [L38](/Users/satwikmekala/stackv3/components/home/WorkoutHeroCard.tsx:38) |
| Label / supplied copy | Merged day | `display.isMerged` · [L39](/Users/satwikmekala/stackv3/components/home/WorkoutHeroCard.tsx:39) |
| Label / supplied copy | Training | `otherwise: primary → otherwise: type` · [L40](/Users/satwikmekala/stackv3/components/home/WorkoutHeroCard.tsx:40) |
| Label / supplied copy | GOAL MET | `completed` · [L44](/Users/satwikmekala/stackv3/components/home/WorkoutHeroCard.tsx:44) |
| Dynamic copy / value | {whenLabel} | [L44](/Users/satwikmekala/stackv3/components/home/WorkoutHeroCard.tsx:44) |
| Accessibility / spoken copy | Change workout | `onChangeWorkout` · [L46](/Users/satwikmekala/stackv3/components/home/WorkoutHeroCard.tsx:46) |
| Visible text | Change workout | `onChangeWorkout` · [L48](/Users/satwikmekala/stackv3/components/home/WorkoutHeroCard.tsx:48) |
| Dynamic copy / value | {label} | [L52](/Users/satwikmekala/stackv3/components/home/WorkoutHeroCard.tsx:52) |
| Dynamic copy / value | {description} | [L53](/Users/satwikmekala/stackv3/components/home/WorkoutHeroCard.tsx:53) |
| Visible text | Your weekly target is complete | [L53](/Users/satwikmekala/stackv3/components/home/WorkoutHeroCard.tsx:53) |
| Visible text | Loading your workout… | [L53](/Users/satwikmekala/stackv3/components/home/WorkoutHeroCard.tsx:53) |
| Dynamic copy / value | {group} · {exerciseCount} exercise | [L53](/Users/satwikmekala/stackv3/components/home/WorkoutHeroCard.tsx:53) |
| Dynamic copy / value | {group} · {exerciseCount} exercises | [L53](/Users/satwikmekala/stackv3/components/home/WorkoutHeroCard.tsx:53) |
| Dynamic copy / value | {actionLabel} | `onPress → actionLabel \|\| completed` · [L58](/Users/satwikmekala/stackv3/components/home/WorkoutHeroCard.tsx:58) |
| Visible text | Choose another workout | `onPress → actionLabel \|\| completed` · [L58](/Users/satwikmekala/stackv3/components/home/WorkoutHeroCard.tsx:58) |

<a id="source-components-home-workoutintensitypicker-tsx"></a>

### Workout Intensity Picker

Source: [components/home/WorkoutIntensityPicker.tsx](/Users/satwikmekala/stackv3/components/home/WorkoutIntensityPicker.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | CHILL | [L31](/Users/satwikmekala/stackv3/components/home/WorkoutIntensityPicker.tsx:31) |
| Label / supplied copy | BALANCED | [L32](/Users/satwikmekala/stackv3/components/home/WorkoutIntensityPicker.tsx:32) |
| Label / supplied copy | ALL OUT | [L33](/Users/satwikmekala/stackv3/components/home/WorkoutIntensityPicker.tsx:33) |
| Label / supplied copy | How hard do you want to go? | [L49](/Users/satwikmekala/stackv3/components/home/WorkoutIntensityPicker.tsx:49) |
| Label / supplied copy | SLIDE TO START | [L51](/Users/satwikmekala/stackv3/components/home/WorkoutIntensityPicker.tsx:51) |
| Accessibility / spoken copy | Close workout intensity picker | [L127](/Users/satwikmekala/stackv3/components/home/WorkoutIntensityPicker.tsx:127) |
| Dynamic copy / value | {workoutLabel.toUpperCase()} | [L133](/Users/satwikmekala/stackv3/components/home/WorkoutIntensityPicker.tsx:133) |
| Dynamic copy / value | {prompt} | [L134](/Users/satwikmekala/stackv3/components/home/WorkoutIntensityPicker.tsx:134) |
| Dynamic copy / value | {subtext} | `subtext` · [L135](/Users/satwikmekala/stackv3/components/home/WorkoutIntensityPicker.tsx:135) |
| Accessibility / spoken copy | Workout intensity | [L140](/Users/satwikmekala/stackv3/components/home/WorkoutIntensityPicker.tsx:140) |
| Accessibility / spoken copy | Choose {level.label.toLowerCase()} intensity | [L190](/Users/satwikmekala/stackv3/components/home/WorkoutIntensityPicker.tsx:190) |
| Dynamic copy / value | {level.label} | [L194](/Users/satwikmekala/stackv3/components/home/WorkoutIntensityPicker.tsx:194) |
| Dynamic copy / value | {footerText} | [L209](/Users/satwikmekala/stackv3/components/home/WorkoutIntensityPicker.tsx:209) |

<a id="source-components-home-workoutpicker-tsx"></a>

### Workout Picker

Source: [components/home/WorkoutPicker.tsx](/Users/satwikmekala/stackv3/components/home/WorkoutPicker.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Accessibility / spoken copy | {composition.label}, select workout | [L75](/Users/satwikmekala/stackv3/components/home/WorkoutPicker.tsx:75) |
| Dynamic copy / value | {composition.label} | [L91](/Users/satwikmekala/stackv3/components/home/WorkoutPicker.tsx:91) |
| Accessibility / spoken copy | Workout {option.letter}, {option.name}, select workout | [L116](/Users/satwikmekala/stackv3/components/home/WorkoutPicker.tsx:116) |
| Dynamic copy / value | {option.letter} | [L131](/Users/satwikmekala/stackv3/components/home/WorkoutPicker.tsx:131) |
| Dynamic copy / value | {option.name} | [L136](/Users/satwikmekala/stackv3/components/home/WorkoutPicker.tsx:136) |
| Dynamic copy / value | {option.exerciseCount} EXERCISE | [L139](/Users/satwikmekala/stackv3/components/home/WorkoutPicker.tsx:139) |
| Dynamic copy / value | {option.exerciseCount} EXERCISES | [L139](/Users/satwikmekala/stackv3/components/home/WorkoutPicker.tsx:139) |
| Label / supplied copy | CHOOSE A SPLIT | [L151](/Users/satwikmekala/stackv3/components/home/WorkoutPicker.tsx:151) |
| Label / supplied copy | Change workout | `isCustomMode; otherwise: isBonusPool → otherwise: isWeekComplete` · [L211](/Users/satwikmekala/stackv3/components/home/WorkoutPicker.tsx:211) |
| Label / supplied copy | What would you like to work out? | `otherwise: isCustomMode → isBonusPool` · [L213](/Users/satwikmekala/stackv3/components/home/WorkoutPicker.tsx:213) |
| Label / supplied copy | Week complete | `otherwise: isBonusPool → isWeekComplete` · [L215](/Users/satwikmekala/stackv3/components/home/WorkoutPicker.tsx:215) |
| Accessibility / spoken copy | Close workout picker | [L225](/Users/satwikmekala/stackv3/components/home/WorkoutPicker.tsx:225) |
| Dynamic copy / value | {eyebrow} | [L232](/Users/satwikmekala/stackv3/components/home/WorkoutPicker.tsx:232) |
| Dynamic copy / value | {pickerTitle} | [L233](/Users/satwikmekala/stackv3/components/home/WorkoutPicker.tsx:233) |
| Visible text | YOU'RE DONE FOR THIS WEEK | `!isCustomMode && isWeekComplete && !isBonusPool` · [L236](/Users/satwikmekala/stackv3/components/home/WorkoutPicker.tsx:236) |
| Visible text | THIS SPLIT HAS NO WORKOUTS YET | `isCustomMode → otherwise: customOptions.length > 0` · [L254](/Users/satwikmekala/stackv3/components/home/WorkoutPicker.tsx:254) |

<a id="source-components-home-yoursplitcard-tsx"></a>

### Your Split Card

Source: [components/home/YourSplitCard.tsx](/Users/satwikmekala/stackv3/components/home/YourSplitCard.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Accessibility / spoken copy | Choose which split Stack runs with you | [L54](/Users/satwikmekala/stackv3/components/home/YourSplitCard.tsx:54) |
| Accessibility / spoken copy | {accessibilityLabel} | [L55](/Users/satwikmekala/stackv3/components/home/YourSplitCard.tsx:55) |
| Visible text | Your split | [L70](/Users/satwikmekala/stackv3/components/home/YourSplitCard.tsx:70) |
| Dynamic copy / value | {name} | [L72](/Users/satwikmekala/stackv3/components/home/YourSplitCard.tsx:72) |

<a id="source-features-workout-launch-coordinator-ts"></a>

### coordinator

Source: [features/workout-launch/coordinator.ts](/Users/satwikmekala/stackv3/features/workout-launch/coordinator.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | kg | `!state.intent \|\| state.busy \|\| !['kg', 'lbs'].includes(unit)` · [L22](/Users/satwikmekala/stackv3/features/workout-launch/coordinator.ts:22) |
| Validation / error | Workout creation failed. | `!dependencies.current().currentSession` · [L32](/Users/satwikmekala/stackv3/features/workout-launch/coordinator.ts:32) |
| Label / supplied copy | Could not load your profile. Try again. | `!profile` · [L43](/Users/satwikmekala/stackv3/features/workout-launch/coordinator.ts:43) |
| Label / supplied copy | Could not start your workout. Try again. | [L54](/Users/satwikmekala/stackv3/features/workout-launch/coordinator.ts:54) |
| Label / supplied copy | lbs | `!state.intent \|\| state.busy \|\| !['kg', 'lbs'].includes(unit)` · [L57](/Users/satwikmekala/stackv3/features/workout-launch/coordinator.ts:57) |
| Label / supplied copy | Could not save your weight unit. Try again. | [L70](/Users/satwikmekala/stackv3/features/workout-launch/coordinator.ts:70) |

## Progress, lift progress, personal records and workout history

This includes zero-history states, populated lift cards, watched-exercise choices, goal/no-goal summaries, record history, search/no-results states and loading/retry copy.

<a id="source-app-tabs-profile-tsx"></a>

### Progress

Source: [app/(tabs)/profile.tsx](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | M | [L22](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:22) |
| Label / supplied copy | T | [L22](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:22) |
| Label / supplied copy | W | [L22](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:22) |
| Label / supplied copy | F | [L22](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:22) |
| Label / supplied copy | S | [L22](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:22) |
| Label / supplied copy | Monday | [L23](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:23) |
| Label / supplied copy | Tuesday | [L23](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:23) |
| Label / supplied copy | Wednesday | [L23](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:23) |
| Label / supplied copy | Thursday | [L23](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:23) |
| Label / supplied copy | Friday | [L23](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:23) |
| Label / supplied copy | Saturday | [L23](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:23) |
| Label / supplied copy | Sunday | [L23](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:23) |
| Dynamic copy / value | {completed} day trained | `goal <= 0` · [L33](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:33) |
| Dynamic copy / value | {completed} days trained | `goal <= 0` · [L33](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:33) |
| Dynamic copy / value | {remaining} to go | `otherwise: goal <= 0 → remaining > 0` · [L34](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:34) |
| Dynamic copy / value | Goal met +{completed - goal} | `otherwise: remaining > 0 → completed > goal` · [L35](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:35) |
| Label / supplied copy | Goal met | `otherwise: remaining > 0 → otherwise: completed > goal` · [L35](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:35) |
| Accessibility / spoken copy | This week. {completed} of {goal} training days. {caption}. Edit weekly goal. | `goal > 0` · [L40](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:40) |
| Accessibility / spoken copy | This week. {caption}. Set a weekly goal. | `otherwise: goal > 0` · [L40](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:40) |
| Visible text | This week | [L44](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:44) |
| Dynamic copy / value | {caption} | [L45](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:45) |
| Dynamic copy / value | {completed}/{goal} | [L47](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:47) |
| Dynamic copy / value | /{goal} | `goal > 0` · [L47](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:47) |
| Accessibility / spoken copy | {WEEKDAY_NAMES[index]}, today. {workouts} session completed. | [L56](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:56) |
| Accessibility / spoken copy | {WEEKDAY_NAMES[index]}, today. {workouts} sessions completed. | [L56](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:56) |
| Accessibility / spoken copy | {WEEKDAY_NAMES[index]}, today. Planned session. | [L56](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:56) |
| Accessibility / spoken copy | {WEEKDAY_NAMES[index]}, today. No sessions logged. | [L56](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:56) |
| Accessibility / spoken copy | {WEEKDAY_NAMES[index]}. {workouts} session completed. | [L56](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:56) |
| Accessibility / spoken copy | {WEEKDAY_NAMES[index]}. {workouts} sessions completed. | [L56](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:56) |
| Accessibility / spoken copy | {WEEKDAY_NAMES[index]}. Planned session. | [L56](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:56) |
| Accessibility / spoken copy | {WEEKDAY_NAMES[index]}. No sessions logged. | [L56](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:56) |
| Accessibility / spoken copy | , today | `index === today` · [L56](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:56) |
| Accessibility / spoken copy | {workouts} session completed | `trained` · [L57](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:57) |
| Accessibility / spoken copy | {workouts} sessions completed | `trained` · [L57](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:57) |
| Accessibility / spoken copy | session | `trained → workouts === 1` · [L57](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:57) |
| Accessibility / spoken copy | sessions | `trained → otherwise: workouts === 1` · [L57](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:57) |
| Accessibility / spoken copy | Planned session | `otherwise: trained → upcoming` · [L58](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:58) |
| Accessibility / spoken copy | No sessions logged | `otherwise: trained → otherwise: upcoming` · [L58](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:58) |
| Dynamic copy / value | {letter} | [L61](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:61) |
| Dynamic copy / value | {workouts} | `trained → workouts > 1` · [L66](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:66) |
| Visible text | ○ | `otherwise: trained` · [L68](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:68) |
| Visible text | – | `otherwise: trained` · [L68](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:68) |
| Accessibility / spoken copy | Open settings | [L96](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:96) |
| Visible text | Progress | [L153](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:153) |
| Visible text | Lift progress | [L162](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:162) |
| Accessibility / spoken copy | Change featured exercises | `lifts.length > 0` · [L163](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:163) |
| Visible text | Change | `lifts.length > 0` · [L166](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:166) |
| Visible text | Couldn’t load your exercise choices. | `preferences.error` · [L170](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:170) |
| Visible text | Couldn’t save your exercise choices. | `preferences.error` · [L170](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:170) |
| Visible text | Retry | `preferences.error` · [L173](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:173) |
| Visible text | Retry to restore your featured exercises. Your full lift history is available below. | `preferences.error === 'load'` · [L177](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:177) |
| Visible text | Loading your lift progress… | `otherwise: preferences.error === 'load' → !preferences.hydrated` · [L179](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:179) |
| Accessibility / spoken copy | Your logged sets build your lift history. | `otherwise: watched.length > 0 → lifts.length === 0` · [L185](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:185) |
| Visible text | SET BY SET | `otherwise: watched.length > 0 → lifts.length === 0` · [L185](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:185) |
| Visible text | Follow the lifts you care about | `otherwise: !preferences.hydrated → otherwise: watched.length > 0` · [L186](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:186) |
| Visible text | Make your next workout count. | `otherwise: !preferences.hydrated → otherwise: watched.length > 0` · [L186](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:186) |
| Visible text | Choose up to two exercises to compare here. | `otherwise: !preferences.hydrated → otherwise: watched.length > 0` · [L187](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:187) |
| Visible text | Log your sets to see how your lifts change, celebrate personal records, and look back at your training. | `otherwise: !preferences.hydrated → otherwise: watched.length > 0` · [L187](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:187) |
| Visible text | Choose exercises | `otherwise: !preferences.hydrated → otherwise: watched.length > 0` · [L193](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:193) |
| Visible text | Go to Train | `otherwise: !preferences.hydrated → otherwise: watched.length > 0` · [L193](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:193) |
| Accessibility / spoken copy | View all lift progress | `lifts.length > 0` · [L197](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:197) |
| Visible text | View all lift progress | `lifts.length > 0` · [L199](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:199) |
| Accessibility / spoken copy | Personal Records. {records.length} exercise tracked | [L204](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:204) |
| Accessibility / spoken copy | Personal Records. {records.length} exercises tracked | [L204](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:204) |
| Accessibility / spoken copy | exercise | `records.length === 1` · [L204](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:204) |
| Accessibility / spoken copy | exercises | `otherwise: records.length === 1` · [L204](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:204) |
| Visible text | Personal Records | [L208](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:208) |
| Dynamic copy / value | {records.length} exercise tracked | [L209](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:209) |
| Dynamic copy / value | {records.length} exercises tracked | [L209](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:209) |
| Accessibility / spoken copy | History. {completed} workout logged | [L213](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:213) |
| Accessibility / spoken copy | History. {completed} workouts logged | [L213](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:213) |
| Accessibility / spoken copy | workout | `completed === 1` · [L213](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:213) |
| Accessibility / spoken copy | workouts | `otherwise: completed === 1` · [L213](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:213) |
| Visible text | History | [L217](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:217) |
| Dynamic copy / value | {completed} workout logged | [L218](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:218) |
| Dynamic copy / value | {completed} workouts logged | [L218](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx:218) |

<a id="source-app-history-week-tsx"></a>

### History — selected week

Source: [app/history-week.tsx](/Users/satwikmekala/stackv3/app/history-week.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {formatWeekDate(weekStart)} – {formatWeekDate(weekEnd)} | [L35](/Users/satwikmekala/stackv3/app/history-week.tsx:35) |
| Label / supplied copy | History | `otherwise: week → otherwise: fallbackWeekStart && fallbackWeekEnd` · [L75](/Users/satwikmekala/stackv3/app/history-week.tsx:75) |
| Dynamic copy / value | {title} | [L112](/Users/satwikmekala/stackv3/app/history-week.tsx:112) |
| Dynamic copy / value | {workoutCount} workout · {totalVolume} {unitLabel(weightUnit)} volume | [L113](/Users/satwikmekala/stackv3/app/history-week.tsx:113) |
| Dynamic copy / value | {workoutCount} workout | [L113](/Users/satwikmekala/stackv3/app/history-week.tsx:113) |
| Dynamic copy / value | {workoutCount} workouts · {totalVolume} {unitLabel(weightUnit)} volume | [L113](/Users/satwikmekala/stackv3/app/history-week.tsx:113) |
| Dynamic copy / value | {workoutCount} workouts | [L113](/Users/satwikmekala/stackv3/app/history-week.tsx:113) |
| Visible text | No workouts from this week. | `!week` · [L120](/Users/satwikmekala/stackv3/app/history-week.tsx:120) |
| Visible text | Return to History to browse your completed workouts. | `!week` · [L121](/Users/satwikmekala/stackv3/app/history-week.tsx:121) |
| Visible text | Back to History | `!week` · [L127](/Users/satwikmekala/stackv3/app/history-week.tsx:127) |

<a id="source-app-history-tsx"></a>

### Workout History

Source: [app/history.tsx](/Users/satwikmekala/stackv3/app/history.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {formatWeekDate(weekStart)} – {formatWeekDate(weekEnd)} | [L31](/Users/satwikmekala/stackv3/app/history.tsx:31) |
| Dynamic copy / value | {label} | [L37](/Users/satwikmekala/stackv3/app/history.tsx:37) |
| Dynamic copy / value | {count} | `count !== undefined` · [L39](/Users/satwikmekala/stackv3/app/history.tsx:39) |
| Accessibility / spoken copy | Opens workouts from this week | [L57](/Users/satwikmekala/stackv3/app/history.tsx:57) |
| Accessibility / spoken copy | {formatWeekRange(group.weekStart, group.weekEnd)}, {workoutCount} workout | [L58](/Users/satwikmekala/stackv3/app/history.tsx:58) |
| Accessibility / spoken copy | {formatWeekRange(group.weekStart, group.weekEnd)}, {workoutCount} workouts | [L58](/Users/satwikmekala/stackv3/app/history.tsx:58) |
| Accessibility / spoken copy | workout | `workoutCount === 1` · [L58](/Users/satwikmekala/stackv3/app/history.tsx:58) |
| Accessibility / spoken copy | workouts | `otherwise: workoutCount === 1` · [L58](/Users/satwikmekala/stackv3/app/history.tsx:58) |
| Dynamic copy / value | {formatWeekRange(group.weekStart, group.weekEnd)} | [L64](/Users/satwikmekala/stackv3/app/history.tsx:64) |
| Dynamic copy / value | {workoutCount} workout | [L67](/Users/satwikmekala/stackv3/app/history.tsx:67) |
| Dynamic copy / value | {workoutCount} workouts | [L67](/Users/satwikmekala/stackv3/app/history.tsx:67) |
| Visible text | No workouts logged yet | [L122](/Users/satwikmekala/stackv3/app/history.tsx:122) |
| Dynamic copy / value | {totalWorkouts} workout logged | [L122](/Users/satwikmekala/stackv3/app/history.tsx:122) |
| Dynamic copy / value | {totalWorkouts} workouts logged | [L122](/Users/satwikmekala/stackv3/app/history.tsx:122) |
| Visible text | Your log starts with the first set. | `totalWorkouts === 0` · [L130](/Users/satwikmekala/stackv3/app/history.tsx:130) |
| Visible text | Every workout you finish lands here — volume, sets, and the full recap, ready to reopen or share any time after. | `totalWorkouts === 0` · [L131](/Users/satwikmekala/stackv3/app/history.tsx:131) |
| Visible text | View today's workout | `totalWorkouts === 0` · [L140](/Users/satwikmekala/stackv3/app/history.tsx:140) |
| Label / supplied copy | This week | `otherwise: totalWorkouts === 0 → hasThisWeek` · [L147](/Users/satwikmekala/stackv3/app/history.tsx:147) |
| Label / supplied copy | Earlier | `otherwise: totalWorkouts === 0 → hasPastWeeks` · [L162](/Users/satwikmekala/stackv3/app/history.tsx:162) |

<a id="source-app-lift-detail-tsx"></a>

### Individual lift progress

Source: [app/lift-detail.tsx](/Users/satwikmekala/stackv3/app/lift-detail.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | All time | `range === null` · [L17](/Users/satwikmekala/stackv3/app/lift-detail.tsx:17) |
| Dynamic copy / value | Last {range} weeks | `otherwise: range === null` · [L17](/Users/satwikmekala/stackv3/app/lift-detail.tsx:17) |
| Label / supplied copy | Cancel | `Platform.OS === 'ios'` · [L37](/Users/satwikmekala/stackv3/app/lift-detail.tsx:37) |
| Label / supplied copy | Session history | `Platform.OS === 'ios'` · [L38](/Users/satwikmekala/stackv3/app/lift-detail.tsx:38) |
| Label / supplied copy | Lift history | [L45](/Users/satwikmekala/stackv3/app/lift-detail.tsx:45) |
| Label / supplied copy | Back | [L47](/Users/satwikmekala/stackv3/app/lift-detail.tsx:47) |
| Dynamic copy / value | {name} | [L49](/Users/satwikmekala/stackv3/app/lift-detail.tsx:49) |
| Visible text | Lift history | [L49](/Users/satwikmekala/stackv3/app/lift-detail.tsx:49) |
| Visible text | Most reps in a completed set, by session. | `lift` · [L51](/Users/satwikmekala/stackv3/app/lift-detail.tsx:51) |
| Visible text | Your heaviest completed set from each session. | `lift` · [L51](/Users/satwikmekala/stackv3/app/lift-detail.tsx:51) |
| Dynamic copy / value | Latest session · {formatLiftDate(lift.latest.date)} | `lift` · [L56](/Users/satwikmekala/stackv3/app/lift-detail.tsx:56) |
| Dynamic copy / value | {formatLiftPerformance(lift.latest, unit)} | `lift` · [L57](/Users/satwikmekala/stackv3/app/lift-detail.tsx:57) |
| Dynamic copy / value | {liftComparisonCopy(lift, unit)} | `lift → lift.previous` · [L58](/Users/satwikmekala/stackv3/app/lift-detail.tsx:58) |
| Visible text | Session history | `lift` · [L61](/Users/satwikmekala/stackv3/app/lift-detail.tsx:61) |
| Accessibility / spoken copy | History range, {rangeLabel(range)}. Change range | `lift` · [L62](/Users/satwikmekala/stackv3/app/lift-detail.tsx:62) |
| Dynamic copy / value | {rangeLabel(range)} | `lift` · [L64](/Users/satwikmekala/stackv3/app/lift-detail.tsx:64) |
| Accessibility / spoken copy | {formatLiftDate(entry.date)}. Top set, {formatLiftPerformance(entry, unit).replace('BW', 'bodyweight')}. | `lift` · [L69](/Users/satwikmekala/stackv3/app/lift-detail.tsx:69) |
| Accessibility / spoken copy | BW | `lift` · [L69](/Users/satwikmekala/stackv3/app/lift-detail.tsx:69) |
| Accessibility / spoken copy | bodyweight | `lift` · [L69](/Users/satwikmekala/stackv3/app/lift-detail.tsx:69) |
| Dynamic copy / value | {formatLiftDate(entry.date)} | `lift` · [L71](/Users/satwikmekala/stackv3/app/lift-detail.tsx:71) |
| Dynamic copy / value | {formatLiftPerformance(entry, unit)} | `lift` · [L72](/Users/satwikmekala/stackv3/app/lift-detail.tsx:72) |
| Visible text | No sessions logged in this range. | `lift → history.length === 0` · [L75](/Users/satwikmekala/stackv3/app/lift-detail.tsx:75) |
| Visible text | Show all time | `lift → history.length === 0` · [L77](/Users/satwikmekala/stackv3/app/lift-detail.tsx:77) |
| Visible text | No performed weight or rep sets are available for this exercise yet. | `otherwise: lift` · [L81](/Users/satwikmekala/stackv3/app/lift-detail.tsx:81) |
| Accessibility / spoken copy | Dismiss range choices | [L86](/Users/satwikmekala/stackv3/app/lift-detail.tsx:86) |
| Dynamic copy / value | {rangeLabel(option)} | [L91](/Users/satwikmekala/stackv3/app/lift-detail.tsx:91) |
| Visible text | Cancel | [L94](/Users/satwikmekala/stackv3/app/lift-detail.tsx:94) |

<a id="source-app-lift-progress-tsx"></a>

### All lift progress / featured exercise selection

Source: [app/lift-progress.tsx](/Users/satwikmekala/stackv3/app/lift-progress.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Choose exercises | `choosing` · [L42](/Users/satwikmekala/stackv3/app/lift-progress.tsx:42) |
| Label / supplied copy | Lift progress | `otherwise: choosing` · [L42](/Users/satwikmekala/stackv3/app/lift-progress.tsx:42) |
| Label / supplied copy | Back | [L44](/Users/satwikmekala/stackv3/app/lift-progress.tsx:44) |
| Accessibility / spoken copy | Save featured exercises | `choosing` · [L45](/Users/satwikmekala/stackv3/app/lift-progress.tsx:45) |
| Visible text | Saving… | `choosing` · [L48](/Users/satwikmekala/stackv3/app/lift-progress.tsx:48) |
| Visible text | Done | `choosing` · [L48](/Users/satwikmekala/stackv3/app/lift-progress.tsx:48) |
| Label / supplied copy | Done | `choosing → otherwise: preferences.saving` · [L48](/Users/satwikmekala/stackv3/app/lift-progress.tsx:48) |
| Visible text | Two exercises selected. Deselect one to choose another. | [L54](/Users/satwikmekala/stackv3/app/lift-progress.tsx:54) |
| Visible text | Choose up to two exercises to follow on Progress. | [L54](/Users/satwikmekala/stackv3/app/lift-progress.tsx:54) |
| Visible text | Your latest top sets. | [L54](/Users/satwikmekala/stackv3/app/lift-progress.tsx:54) |
| Visible text | Couldn’t load your choices. Retry before changing them. | `choosing && preferences.error` · [L58](/Users/satwikmekala/stackv3/app/lift-progress.tsx:58) |
| Visible text | Your choices weren’t saved. Tap Done to try again. | `choosing && preferences.error` · [L58](/Users/satwikmekala/stackv3/app/lift-progress.tsx:58) |
| Visible text | Retry | `choosing && preferences.error → preferences.error === 'load'` · [L61](/Users/satwikmekala/stackv3/app/lift-progress.tsx:61) |
| Accessibility / spoken copy | Search lift progress | [L66](/Users/satwikmekala/stackv3/app/lift-progress.tsx:66) |
| Label / supplied copy | Search exercises | [L67](/Users/satwikmekala/stackv3/app/lift-progress.tsx:67) |
| Accessibility / spoken copy | Clear search | `query.length > 0` · [L69](/Users/satwikmekala/stackv3/app/lift-progress.tsx:69) |
| Visible text | Clear | `query.length > 0` · [L70](/Users/satwikmekala/stackv3/app/lift-progress.tsx:70) |
| Accessibility / spoken copy | {item.name} | [L81](/Users/satwikmekala/stackv3/app/lift-progress.tsx:81) |
| Accessibility / spoken copy | {item.name}. Latest {formatLiftPerformance(item.latest, unit)}. {liftComparisonCopy(item, unit)} | `otherwise: choosing` · [L81](/Users/satwikmekala/stackv3/app/lift-progress.tsx:81) |
| Accessibility / spoken copy | Choose whether to feature this exercise on Progress | `choosing` · [L82](/Users/satwikmekala/stackv3/app/lift-progress.tsx:82) |
| Accessibility / spoken copy | Opens this exercise’s session history | `otherwise: choosing` · [L82](/Users/satwikmekala/stackv3/app/lift-progress.tsx:82) |
| Dynamic copy / value | {item.name} | [L89](/Users/satwikmekala/stackv3/app/lift-progress.tsx:89) |
| Dynamic copy / value | {formatLiftPerformance(item.latest, unit)} · {formatLiftDate(item.latest.date)} | [L90](/Users/satwikmekala/stackv3/app/lift-progress.tsx:90) |
| Dynamic copy / value | {liftComparisonCopy(item, unit)} | `item.previous` · [L91](/Users/satwikmekala/stackv3/app/lift-progress.tsx:91) |
| Visible text | No matching exercises | [L99](/Users/satwikmekala/stackv3/app/lift-progress.tsx:99) |
| Visible text | No lift sessions yet | [L99](/Users/satwikmekala/stackv3/app/lift-progress.tsx:99) |
| Visible text | Try another exercise name. | [L100](/Users/satwikmekala/stackv3/app/lift-progress.tsx:100) |
| Visible text | Completed weight and rep sets will appear here after a workout. | [L100](/Users/satwikmekala/stackv3/app/lift-progress.tsx:100) |
| Visible text | Clear search | `query.trim()` · [L101](/Users/satwikmekala/stackv3/app/lift-progress.tsx:101) |
| Visible text | Go to Train | `otherwise: query.trim()` · [L102](/Users/satwikmekala/stackv3/app/lift-progress.tsx:102) |

<a id="source-app-record-detail-tsx"></a>

### Individual record history

Source: [app/record-detail.tsx](/Users/satwikmekala/stackv3/app/record-detail.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Accessibility / spoken copy | Back to personal records | [L51](/Users/satwikmekala/stackv3/app/record-detail.tsx:51) |
| Dynamic copy / value | {exerciseName} | [L55](/Users/satwikmekala/stackv3/app/record-detail.tsx:55) |
| Visible text | Exercise records | [L55](/Users/satwikmekala/stackv3/app/record-detail.tsx:55) |
| Dynamic copy / value | {sets.length} SETS LOGGED | [L56](/Users/satwikmekala/stackv3/app/record-detail.tsx:56) |
| Visible text | CURRENT BEST | `best` · [L62](/Users/satwikmekala/stackv3/app/record-detail.tsx:62) |
| Dynamic copy / value | BW × {best.reps} | `best` · [L63](/Users/satwikmekala/stackv3/app/record-detail.tsx:63) |
| Dynamic copy / value | BW {unitLabel(weightUnit)} × {best.reps} | `best` · [L63](/Users/satwikmekala/stackv3/app/record-detail.tsx:63) |
| Dynamic copy / value | {formatWeight(best.weight, weightUnit)} × {best.reps} | `best` · [L63](/Users/satwikmekala/stackv3/app/record-detail.tsx:63) |
| Dynamic copy / value | {formatWeight(best.weight, weightUnit)} {unitLabel(weightUnit)} × {best.reps} | `best` · [L63](/Users/satwikmekala/stackv3/app/record-detail.tsx:63) |
| Visible text | SET ON | `best` · [L69](/Users/satwikmekala/stackv3/app/record-detail.tsx:69) |
| Dynamic copy / value | {formatRecordDate(best.date)} | `best` · [L70](/Users/satwikmekala/stackv3/app/record-detail.tsx:70) |
| Visible text | RECENT LIFTS | [L75](/Users/satwikmekala/stackv3/app/record-detail.tsx:75) |
| Dynamic copy / value | {formatRecordDate(section.date, true)} | [L82](/Users/satwikmekala/stackv3/app/record-detail.tsx:82) |
| Visible text | PR | `section.hasPR` · [L83](/Users/satwikmekala/stackv3/app/record-detail.tsx:83) |
| Accessibility / spoken copy | Personal record set on this date | `section.hasPR` · [L83](/Users/satwikmekala/stackv3/app/record-detail.tsx:83) |
| Accessibility / spoken copy | Set {item.setIndex + 1}, bodyweight, {item.reps} reps, personal record | [L89](/Users/satwikmekala/stackv3/app/record-detail.tsx:89) |
| Accessibility / spoken copy | Set {item.setIndex + 1}, bodyweight, {item.reps} reps | [L89](/Users/satwikmekala/stackv3/app/record-detail.tsx:89) |
| Accessibility / spoken copy | Set {item.setIndex + 1}, {formatWeight(item.weight, weightUnit)} {unitLabel(weightUnit)}, {item.reps} reps, personal record | [L89](/Users/satwikmekala/stackv3/app/record-detail.tsx:89) |
| Accessibility / spoken copy | Set {item.setIndex + 1}, {formatWeight(item.weight, weightUnit)} {unitLabel(weightUnit)}, {item.reps} reps | [L89](/Users/satwikmekala/stackv3/app/record-detail.tsx:89) |
| Accessibility / spoken copy | bodyweight | `item.weight === 0` · [L89](/Users/satwikmekala/stackv3/app/record-detail.tsx:89) |
| Accessibility / spoken copy | {formatWeight(item.weight, weightUnit)} {unitLabel(weightUnit)} | `otherwise: item.weight === 0` · [L89](/Users/satwikmekala/stackv3/app/record-detail.tsx:89) |
| Accessibility / spoken copy | , personal record | `item.isPR` · [L89](/Users/satwikmekala/stackv3/app/record-detail.tsx:89) |
| Dynamic copy / value | SET {item.setIndex + 1} | [L91](/Users/satwikmekala/stackv3/app/record-detail.tsx:91) |
| Dynamic copy / value | BW {unitLabel(weightUnit)} | [L92](/Users/satwikmekala/stackv3/app/record-detail.tsx:92) |
| Visible text | BW | [L92](/Users/satwikmekala/stackv3/app/record-detail.tsx:92) |
| Dynamic copy / value | {formatWeight(item.weight, weightUnit)} {unitLabel(weightUnit)} | [L92](/Users/satwikmekala/stackv3/app/record-detail.tsx:92) |
| Dynamic copy / value | {formatWeight(item.weight, weightUnit)} | [L92](/Users/satwikmekala/stackv3/app/record-detail.tsx:92) |
| Dynamic copy / value | {unitLabel(weightUnit)} | `item.weight !== 0` · [L94](/Users/satwikmekala/stackv3/app/record-detail.tsx:94) |
| Dynamic copy / value | × {item.reps} | [L96](/Users/satwikmekala/stackv3/app/record-detail.tsx:96) |
| Visible text | No sets logged yet | [L102](/Users/satwikmekala/stackv3/app/record-detail.tsx:102) |
| Visible text | Completed sets for this exercise will appear here after a workout. | [L103](/Users/satwikmekala/stackv3/app/record-detail.tsx:103) |

<a id="source-app-records-tsx"></a>

### Personal Records

Source: [app/records.tsx](/Users/satwikmekala/stackv3/app/records.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Accessibility / spoken copy | Show {label.toLowerCase()} records | [L32](/Users/satwikmekala/stackv3/app/records.tsx:32) |
| Dynamic copy / value | {label} | [L44](/Users/satwikmekala/stackv3/app/records.tsx:44) |
| Accessibility / spoken copy | Back to progress | [L91](/Users/satwikmekala/stackv3/app/records.tsx:91) |
| Visible text | Personal Records | [L97](/Users/satwikmekala/stackv3/app/records.tsx:97) |
| Dynamic copy / value | {visibleRecords.length} OF {records.length} SHOWING | [L98](/Users/satwikmekala/stackv3/app/records.tsx:98) |
| Dynamic copy / value | {records.length} EXERCISES TRACKED | [L98](/Users/satwikmekala/stackv3/app/records.tsx:98) |
| Accessibility / spoken copy | Search exercises | [L105](/Users/satwikmekala/stackv3/app/records.tsx:105) |
| Label / supplied copy | Search exercises | [L105](/Users/satwikmekala/stackv3/app/records.tsx:105) |
| Accessibility / spoken copy | Clear exercise search | `query.length > 0` · [L111](/Users/satwikmekala/stackv3/app/records.tsx:111) |
| Label / supplied copy | All | [L119](/Users/satwikmekala/stackv3/app/records.tsx:119) |
| Dynamic copy / value | {MUSCLE_GROUPS[muscle].label} | [L121](/Users/satwikmekala/stackv3/app/records.tsx:121) |
| Visible text | EXERCISE | [L127](/Users/satwikmekala/stackv3/app/records.tsx:127) |
| Visible text | BEST SET | [L129](/Users/satwikmekala/stackv3/app/records.tsx:129) |
| Accessibility / spoken copy | View {item.name} recent lifts | [L134](/Users/satwikmekala/stackv3/app/records.tsx:134) |
| Dynamic copy / value | {part.text} | [L140](/Users/satwikmekala/stackv3/app/records.tsx:140) |
| Dynamic copy / value | BW × {item.best.reps} | [L145](/Users/satwikmekala/stackv3/app/records.tsx:145) |
| Dynamic copy / value | BW {unitLabel(weightUnit)} × {item.best.reps} | [L145](/Users/satwikmekala/stackv3/app/records.tsx:145) |
| Dynamic copy / value | {formatWeight(item.best.weight, weightUnit)} × {item.best.reps} | [L145](/Users/satwikmekala/stackv3/app/records.tsx:145) |
| Dynamic copy / value | {formatWeight(item.best.weight, weightUnit)} {unitLabel(weightUnit)} × {item.best.reps} | [L145](/Users/satwikmekala/stackv3/app/records.tsx:145) |
| Visible text | No exercises logged yet | [L154](/Users/satwikmekala/stackv3/app/records.tsx:154) |
| Visible text | No exercises found | [L154](/Users/satwikmekala/stackv3/app/records.tsx:154) |
| Visible text | Complete a workout to start tracking your personal records. | [L155](/Users/satwikmekala/stackv3/app/records.tsx:155) |
| Dynamic copy / value | No matches for “{query.trim()}”. Try another name or clear your filters. | [L155](/Users/satwikmekala/stackv3/app/records.tsx:155) |
| Visible text | Try another muscle group or clear your filters. | [L155](/Users/satwikmekala/stackv3/app/records.tsx:155) |
| Visible text | Clear search and filters | `filtering && records.length > 0` · [L161](/Users/satwikmekala/stackv3/app/records.tsx:161) |

<a id="source-components-historyworkoutrow-tsx"></a>

### History Workout Row

Source: [components/HistoryWorkoutRow.tsx](/Users/satwikmekala/stackv3/components/HistoryWorkoutRow.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Accessibility / spoken copy | Opens the full workout recap | [L43](/Users/satwikmekala/stackv3/components/HistoryWorkoutRow.tsx:43) |
| Accessibility / spoken copy | {summary.title}, {shortSummaryDate(summary.date)}, {volume} {unitLabel(weightUnit)} total volume | [L44](/Users/satwikmekala/stackv3/components/HistoryWorkoutRow.tsx:44) |
| Dynamic copy / value | {summary.title} | [L51](/Users/satwikmekala/stackv3/components/HistoryWorkoutRow.tsx:51) |
| Dynamic copy / value | {shortSummaryDate(summary.date)} | [L52](/Users/satwikmekala/stackv3/components/HistoryWorkoutRow.tsx:52) |
| Dynamic copy / value | {volume} | [L56](/Users/satwikmekala/stackv3/components/HistoryWorkoutRow.tsx:56) |
| Dynamic copy / value | {unitLabel(weightUnit)} · volume | [L57](/Users/satwikmekala/stackv3/components/HistoryWorkoutRow.tsx:57) |

<a id="source-components-liftlogcard-tsx"></a>

### Lift Log Card

Source: [components/LiftLogCard.tsx](/Users/satwikmekala/stackv3/components/LiftLogCard.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {title} | [L40](/Users/satwikmekala/stackv3/components/LiftLogCard.tsx:40) |
| Dynamic copy / value | {date} | [L41](/Users/satwikmekala/stackv3/components/LiftLogCard.tsx:41) |
| Dynamic copy / value | {line.value} | [L50](/Users/satwikmekala/stackv3/components/LiftLogCard.tsx:50) |
| Dynamic copy / value | {line.unit} | [L51](/Users/satwikmekala/stackv3/components/LiftLogCard.tsx:51) |
| Visible text | PR | `line.record` · [L54](/Users/satwikmekala/stackv3/components/LiftLogCard.tsx:54) |
| Dynamic copy / value | {line.name} · {line.scheme} | [L58](/Users/satwikmekala/stackv3/components/LiftLogCard.tsx:58) |
| Dynamic copy / value | +{more} MORE LIFT | `more > 0` · [L64](/Users/satwikmekala/stackv3/components/LiftLogCard.tsx:64) |
| Dynamic copy / value | +{more} MORE LIFTS | `more > 0` · [L64](/Users/satwikmekala/stackv3/components/LiftLogCard.tsx:64) |
| Visible text | STACK | [L74](/Users/satwikmekala/stackv3/components/LiftLogCard.tsx:74) |
| Dynamic copy / value | {volumeValue} {volumeUnit.toUpperCase()} MOVED | `volumeValue !== '0'` · [L77](/Users/satwikmekala/stackv3/components/LiftLogCard.tsx:77) |
| Label / supplied copy | LiftLogCard | [L87](/Users/satwikmekala/stackv3/components/LiftLogCard.tsx:87) |

<a id="source-components-liftprogresscard-tsx"></a>

### Lift Progress Card

Source: [components/LiftProgressCard.tsx](/Users/satwikmekala/stackv3/components/LiftProgressCard.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Accessibility / spoken copy | {lift.name}. Latest top set, {formatLiftPerformance(latest, unit).replace('BW', 'bodyweight')}, {formatLiftDate(latest.date)}. Previous top set, {formatLiftPerformance(previous, unit).replace('BW', 'bodyweight')}, {formatLiftDate(previous.date)}. | [L20](/Users/satwikmekala/stackv3/components/LiftProgressCard.tsx:20) |
| Accessibility / spoken copy | {lift.name}. Latest top set, {formatLiftPerformance(latest, unit).replace('BW', 'bodyweight')}, {formatLiftDate(latest.date)}. | [L20](/Users/satwikmekala/stackv3/components/LiftProgressCard.tsx:20) |
| Accessibility / spoken copy | BW | `previous` · [L20](/Users/satwikmekala/stackv3/components/LiftProgressCard.tsx:20) |
| Accessibility / spoken copy | bodyweight | `previous` · [L20](/Users/satwikmekala/stackv3/components/LiftProgressCard.tsx:20) |
| Accessibility / spoken copy | Previous top set, {formatLiftPerformance(previous, unit).replace('BW', 'bodyweight')}, {formatLiftDate(previous.date)}. | `previous` · [L21](/Users/satwikmekala/stackv3/components/LiftProgressCard.tsx:21) |
| Accessibility / spoken copy | Opens this exercise’s session history | [L22](/Users/satwikmekala/stackv3/components/LiftProgressCard.tsx:22) |
| Dynamic copy / value | {lift.name} | [L29](/Users/satwikmekala/stackv3/components/LiftProgressCard.tsx:29) |
| Dynamic copy / value | {formatLiftDate(latest.date)} | [L33](/Users/satwikmekala/stackv3/components/LiftProgressCard.tsx:33) |
| Visible text | BW | [L36](/Users/satwikmekala/stackv3/components/LiftProgressCard.tsx:36) |
| Dynamic copy / value | {formatWeight(latest.weight, unit)} | [L36](/Users/satwikmekala/stackv3/components/LiftProgressCard.tsx:36) |
| Dynamic copy / value | {unitLabel(unit)} | `!latest.bodyweight` · [L37](/Users/satwikmekala/stackv3/components/LiftProgressCard.tsx:37) |
| Dynamic copy / value | × {latest.reps} | [L39](/Users/satwikmekala/stackv3/components/LiftProgressCard.tsx:39) |
| Dynamic copy / value | Prev {formatLiftPerformance(previous, unit)} | `previous` · [L42](/Users/satwikmekala/stackv3/components/LiftProgressCard.tsx:42) |

<a id="source-components-statstripcard-tsx"></a>

### Stat Strip Card

Source: [components/StatStripCard.tsx](/Users/satwikmekala/stackv3/components/StatStripCard.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | TOTAL VOLUME | `moved` · [L74](/Users/satwikmekala/stackv3/components/StatStripCard.tsx:74) |
| Label / supplied copy | TOTAL REPS | `otherwise: moved` · [L75](/Users/satwikmekala/stackv3/components/StatStripCard.tsx:75) |
| Label / supplied copy | SET | `setCount === 1` · [L77](/Users/satwikmekala/stackv3/components/StatStripCard.tsx:77) |
| Label / supplied copy | SETS | `otherwise: setCount === 1` · [L77](/Users/satwikmekala/stackv3/components/StatStripCard.tsx:77) |
| Label / supplied copy | REPS | `moved` · [L78](/Users/satwikmekala/stackv3/components/StatStripCard.tsx:78) |
| Label / supplied copy | EXERCISE | `exerciseCount → exerciseCount === 1` · [L79](/Users/satwikmekala/stackv3/components/StatStripCard.tsx:79) |
| Label / supplied copy | EXERCISES | `exerciseCount → otherwise: exerciseCount === 1` · [L79](/Users/satwikmekala/stackv3/components/StatStripCard.tsx:79) |
| Label / supplied copy | TIME | `durationLabel` · [L80](/Users/satwikmekala/stackv3/components/StatStripCard.tsx:80) |
| Dynamic copy / value | {date} | [L88](/Users/satwikmekala/stackv3/components/StatStripCard.tsx:88) |
| Visible text | STACK | [L91](/Users/satwikmekala/stackv3/components/StatStripCard.tsx:91) |
| Dynamic copy / value | {title} | [L95](/Users/satwikmekala/stackv3/components/StatStripCard.tsx:95) |
| Dynamic copy / value | ★ {recordCount} NEW BEST | `recordCount > 0` · [L101](/Users/satwikmekala/stackv3/components/StatStripCard.tsx:101) |
| Dynamic copy / value | ★ {recordCount} NEW BESTS | `recordCount > 0` · [L101](/Users/satwikmekala/stackv3/components/StatStripCard.tsx:101) |
| Dynamic copy / value | {specialSetLabel} | `specialSetLabel` · [L108](/Users/satwikmekala/stackv3/components/StatStripCard.tsx:108) |
| Dynamic copy / value | {hero.value} | [L114](/Users/satwikmekala/stackv3/components/StatStripCard.tsx:114) |
| Dynamic copy / value | {hero.unit} | `hero.unit` · [L118](/Users/satwikmekala/stackv3/components/StatStripCard.tsx:118) |
| Dynamic copy / value | {hero.label} | [L120](/Users/satwikmekala/stackv3/components/StatStripCard.tsx:120) |
| Dynamic copy / value | {stat.value} | [L127](/Users/satwikmekala/stackv3/components/StatStripCard.tsx:127) |
| Dynamic copy / value | {stat.label} | [L128](/Users/satwikmekala/stackv3/components/StatStripCard.tsx:128) |
| Label / supplied copy | StatStripCard | [L137](/Users/satwikmekala/stackv3/components/StatStripCard.tsx:137) |

<a id="source-components-volumechart-tsx"></a>

### Volume Chart

Source: [components/VolumeChart.tsx](/Users/satwikmekala/stackv3/components/VolumeChart.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Jan | [L8](/Users/satwikmekala/stackv3/components/VolumeChart.tsx:8) |
| Label / supplied copy | Feb | [L8](/Users/satwikmekala/stackv3/components/VolumeChart.tsx:8) |
| Label / supplied copy | Mar | [L8](/Users/satwikmekala/stackv3/components/VolumeChart.tsx:8) |
| Label / supplied copy | Apr | [L8](/Users/satwikmekala/stackv3/components/VolumeChart.tsx:8) |
| Label / supplied copy | May | [L8](/Users/satwikmekala/stackv3/components/VolumeChart.tsx:8) |
| Label / supplied copy | Jun | [L8](/Users/satwikmekala/stackv3/components/VolumeChart.tsx:8) |
| Label / supplied copy | Jul | [L8](/Users/satwikmekala/stackv3/components/VolumeChart.tsx:8) |
| Label / supplied copy | Aug | [L8](/Users/satwikmekala/stackv3/components/VolumeChart.tsx:8) |
| Label / supplied copy | Sep | [L8](/Users/satwikmekala/stackv3/components/VolumeChart.tsx:8) |
| Label / supplied copy | Oct | [L8](/Users/satwikmekala/stackv3/components/VolumeChart.tsx:8) |
| Label / supplied copy | Nov | [L8](/Users/satwikmekala/stackv3/components/VolumeChart.tsx:8) |
| Label / supplied copy | Dec | [L8](/Users/satwikmekala/stackv3/components/VolumeChart.tsx:8) |
| Dynamic copy / value | {d.getDate()} {MONTHS[d.getMonth()]} | [L13](/Users/satwikmekala/stackv3/components/VolumeChart.tsx:13) |
| Visible text | Complete workouts to see your<br>volume build week over week | `!hasHistory` · [L73](/Users/satwikmekala/stackv3/components/VolumeChart.tsx:73) |
| Dynamic copy / value | {formatWeekStart(data[0].weekStart)} | `data.length > 0` · [L88](/Users/satwikmekala/stackv3/components/VolumeChart.tsx:88) |
| Visible text | This week | `data.length > 0` · [L91](/Users/satwikmekala/stackv3/components/VolumeChart.tsx:91) |

## Stack, earned history, empty states, examples and explanation

<a id="source-app-tabs-stack-tsx"></a>

### Stack

Source: [app/(tabs)/stack.tsx](/Users/satwikmekala/stackv3/app/(tabs)/stack.tsx).

This route delegates its wording to the shared sources linked in the screen map; it defines no additional literal copy.

<a id="source-app-build-case-week-tsx"></a>

### Stack archive — selected week

Source: [app/build-case/[week].tsx](/Users/satwikmekala/stackv3/app/build-case/[week].tsx).

This route delegates its wording to the shared sources linked in the screen map; it defines no additional literal copy.

<a id="source-app-build-case-index-tsx"></a>

### Stack archive / case

Source: [app/build-case/index.tsx](/Users/satwikmekala/stackv3/app/build-case/index.tsx).

This route delegates its wording to the shared sources linked in the screen map; it defines no additional literal copy.

<a id="source-app-build-casting-tsx"></a>

### Stack casting / completion handoff

Source: [app/build-casting.tsx](/Users/satwikmekala/stackv3/app/build-casting.tsx).

This route delegates its wording to the shared sources linked in the screen map; it defines no additional literal copy.

<a id="source-app-build-tsx"></a>

### Retained Stack / Build entry

Source: [app/build.tsx](/Users/satwikmekala/stackv3/app/build.tsx).

This route delegates its wording to the shared sources linked in the screen map; it defines no additional literal copy.

<a id="source-app-stack-example-tsx"></a>

### Read-only example Stack

Source: [app/stack-example.tsx](/Users/satwikmekala/stackv3/app/stack-example.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Example Stack | [L16](/Users/satwikmekala/stackv3/app/stack-example.tsx:16) |
| Visible text | EXAMPLE ONLY | [L18](/Users/satwikmekala/stackv3/app/stack-example.tsx:18) |
| Visible text | Training, taking shape. | [L19](/Users/satwikmekala/stackv3/app/stack-example.tsx:19) |
| Accessibility / spoken copy | Example only: two compressed weeks, then a back workout, a legs workout, and a push workout. Colored layers represent the muscles trained. No pieces have been added to your real Stack. | [L20](/Users/satwikmekala/stackv3/app/stack-example.tsx:20) |
| Visible text | One completed workout becomes one piece. Its colors reflect the muscles you trained. | [L21](/Users/satwikmekala/stackv3/app/stack-example.tsx:21) |
| Visible text | When a week ends, its pieces combine into one block. Your weeks build into a view of your training over time. | [L22](/Users/satwikmekala/stackv3/app/stack-example.tsx:22) |
| Visible text | This example is an illustration. It adds nothing to your workouts, records, or Stack. | [L23](/Users/satwikmekala/stackv3/app/stack-example.tsx:23) |
| Visible text | Go to Train | [L24](/Users/satwikmekala/stackv3/app/stack-example.tsx:24) |

<a id="source-app-stack-help-tsx"></a>

### Optional Stack explanation

Source: [app/stack-help.tsx](/Users/satwikmekala/stackv3/app/stack-help.tsx).

This route delegates its wording to the shared sources linked in the screen map; it defines no additional literal copy.

<a id="source-components-stackpostercard-tsx"></a>

### Stack Poster Card

Source: [components/StackPosterCard.tsx](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | +{layers.length - MAX_LAYERS + 1} more | `layers.length > MAX_LAYERS` · [L71](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx:71) |
| Label / supplied copy | MORE EXERCISES | `layers.length > MAX_LAYERS` · [L71](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx:71) |
| Label / supplied copy | SET | `setCount === 1` · [L147](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx:147) |
| Label / supplied copy | SETS | `otherwise: setCount === 1` · [L147](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx:147) |
| Label / supplied copy | REPS | `moved; otherwise: moved` · [L148](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx:148) |
| Label / supplied copy | TIME | `durationLabel` · [L149](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx:149) |
| Label / supplied copy | EXERCISE | `otherwise: durationLabel → layers.length === 1` · [L149](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx:149) |
| Label / supplied copy | EXERCISES | `otherwise: durationLabel → otherwise: layers.length === 1` · [L149](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx:149) |
| Label / supplied copy | MOVED | `moved` · [L151](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx:151) |
| Visible text | STACK | [L178](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx:178) |
| Dynamic copy / value | {date} | [L180](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx:180) |
| Dynamic copy / value | {slabs.length} LAYER STACKED | [L184](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx:184) |
| Dynamic copy / value | {slabs.length} LAYERS STACKED | [L184](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx:184) |
| Dynamic copy / value | {title} | [L187](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx:187) |
| Dynamic copy / value | {anchor.slab.layer.name} | [L216](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx:216) |
| Dynamic copy / value | {anchor.slab.layer.detail} ★ PR | [L217](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx:217) |
| Dynamic copy / value | {anchor.slab.layer.detail} | [L217](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx:217) |
| Visible text | ★ PR | `anchor.slab.layer.record` · [L219](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx:219) |
| Dynamic copy / value | {hero.value} | [L227](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx:227) |
| Dynamic copy / value | {hero.unit} | `hero.unit` · [L229](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx:229) |
| Dynamic copy / value | {hero.label} | [L230](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx:230) |
| Dynamic copy / value | {stat.value} | [L236](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx:236) |
| Dynamic copy / value | {stat.label} | [L237](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx:237) |
| Visible text | BUILT ONE SET AT A TIME | [L241](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx:241) |
| Label / supplied copy | StackPosterCard | [L247](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx:247) |

<a id="source-features-build-buildentry-tsx"></a>

### Build Entry

Source: [features/build/BuildEntry.tsx](/Users/satwikmekala/stackv3/features/build/BuildEntry.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | intro:overview-week-{week + 1} | [L46](/Users/satwikmekala/stackv3/features/build/BuildEntry.tsx:46) |
| Accessibility / spoken copy | Opening your Stack | `show === null` · [L195](/Users/satwikmekala/stackv3/features/build/BuildEntry.tsx:195) |
| Visible text | YOUR STACK | [L204](/Users/satwikmekala/stackv3/features/build/BuildEntry.tsx:204) |
| Accessibility / spoken copy | Skip the introduction | `showsSkip(page)` · [L205](/Users/satwikmekala/stackv3/features/build/BuildEntry.tsx:205) |
| Visible text | Skip | `showsSkip(page)` · [L205](/Users/satwikmekala/stackv3/features/build/BuildEntry.tsx:205) |
| Dynamic copy / value | {introPosition(index)} | [L223](/Users/satwikmekala/stackv3/features/build/BuildEntry.tsx:223) |
| Dynamic copy / value | {copy.title} | [L224](/Users/satwikmekala/stackv3/features/build/BuildEntry.tsx:224) |
| Dynamic copy / value | {copy.body} | [L225](/Users/satwikmekala/stackv3/features/build/BuildEntry.tsx:225) |
| Accessibility / spoken copy | Introduction page | `showsNext(page)` · [L231](/Users/satwikmekala/stackv3/features/build/BuildEntry.tsx:231) |
| Dynamic copy / value | {page + 1} of {INTRO_PAGE_COUNT} | `showsNext(page)` · [L231](/Users/satwikmekala/stackv3/features/build/BuildEntry.tsx:231) |
| Label / supplied copy | increment | `showsNext(page)` · [L232](/Users/satwikmekala/stackv3/features/build/BuildEntry.tsx:232) |
| Label / supplied copy | decrement | `showsNext(page)` · [L232](/Users/satwikmekala/stackv3/features/build/BuildEntry.tsx:232) |
| Accessibility / spoken copy | {introNextLabel(page)} | `showsNext(page)` · [L236](/Users/satwikmekala/stackv3/features/build/BuildEntry.tsx:236) |
| Dynamic copy / value | {introCta(workoutHydrated, hasHistory)} | `otherwise: showsNext(page)` · [L238](/Users/satwikmekala/stackv3/features/build/BuildEntry.tsx:238) |

<a id="source-features-build-buildhome-tsx"></a>

### Build Home

Source: [features/build/BuildHome.tsx](/Users/satwikmekala/stackv3/features/build/BuildHome.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Accessibility / spoken copy | {copy.a11y} | [L73](/Users/satwikmekala/stackv3/features/build/BuildHome.tsx:73) |
| Dynamic copy / value | {copy.kicker} | [L75](/Users/satwikmekala/stackv3/features/build/BuildHome.tsx:75) |
| Dynamic copy / value | {copy.title} | [L75](/Users/satwikmekala/stackv3/features/build/BuildHome.tsx:75) |
| Dynamic copy / value | {copy.detail} | `copy.detail` · [L75](/Users/satwikmekala/stackv3/features/build/BuildHome.tsx:75) |

<a id="source-features-build-buildpreview-tsx"></a>

### Build Preview

Source: [features/build/BuildPreview.tsx](/Users/satwikmekala/stackv3/features/build/BuildPreview.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | 20,{y - 20} 67,{y} 76,{y} 120,{y - 20} 120,{end - 20} 76,{end} 67,{end} 20,{end - 20} | [L20](/Users/satwikmekala/stackv3/features/build/BuildPreview.tsx:20) |

<a id="source-features-build-buildscene-native-tsx"></a>

### Build Scene

Source: [features/build/BuildScene.native.tsx](/Users/satwikmekala/stackv3/features/build/BuildScene.native.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Visible text | The 3D preview could not open. Your training is saved. Close Your Stack and open it again to retry. | `otherwise: this.state.failed && this.props.onError → this.state.failed` · [L47](/Users/satwikmekala/stackv3/features/build/BuildScene.native.tsx:47) |

<a id="source-features-build-buildscene-tsx"></a>

### Build Scene

Source: [features/build/BuildScene.tsx](/Users/satwikmekala/stackv3/features/build/BuildScene.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Visible text | Your Stack is available in the iPhone development sandbox. | [L5](/Users/satwikmekala/stackv3/features/build/BuildScene.tsx:5) |

<a id="source-features-build-case-tsx"></a>

### Case

Source: [features/build/Case.tsx](/Users/satwikmekala/stackv3/features/build/Case.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | kg | [L20](/Users/satwikmekala/stackv3/features/build/Case.tsx:20) |
| Accessibility / spoken copy | Back to Your Stack | [L25](/Users/satwikmekala/stackv3/features/build/Case.tsx:25) |
| Dynamic copy / value | {header.title} | [L27](/Users/satwikmekala/stackv3/features/build/Case.tsx:27) |
| Dynamic copy / value | {header.count} | `header.count` · [L27](/Users/satwikmekala/stackv3/features/build/Case.tsx:27) |
| Dynamic copy / value | {header.note} | `header.note` · [L27](/Users/satwikmekala/stackv3/features/build/Case.tsx:27) |
| Accessibility / spoken copy | {copy.a11y} | [L31](/Users/satwikmekala/stackv3/features/build/Case.tsx:31) |
| Accessibility / spoken copy | Unpacks the week | `item.kind === 'week'` · [L31](/Users/satwikmekala/stackv3/features/build/Case.tsx:31) |
| Dynamic copy / value | {copy.title} | [L33](/Users/satwikmekala/stackv3/features/build/Case.tsx:33) |
| Dynamic copy / value | {copy.detail} | [L33](/Users/satwikmekala/stackv3/features/build/Case.tsx:33) |

<a id="source-features-build-castingscreen-tsx"></a>

### Casting Screen

Source: [features/build/CastingScreen.tsx](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Validation / error | Development-only casting fallback check | [L22](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:22) |
| Label / supplied copy | kg | [L34](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:34) |
| Visible text | YOUR STACK · PREVIEW | [L130](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:130) |
| Visible text | YOUR STACK | [L130](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:130) |
| Accessibility / spoken copy | Skip casting preview | `shown !== 'static'; shown !== 'static' → demo` · [L130](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:130) |
| Accessibility / spoken copy | Skip casting and view workout summary | `shown !== 'static'; shown !== 'static' → otherwise: demo` · [L130](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:130) |
| Visible text | Skip | `shown !== 'static'` · [L130](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:130) |
| Accessibility / spoken copy | Done, return to sandbox | `demo` · [L131](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:131) |
| Accessibility / spoken copy | Done, view workout summary | `otherwise: demo` · [L131](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:131) |
| Visible text | Done | [L131](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:131) |
| Dynamic copy / value | {metric.value} | [L133](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:133) |
| Dynamic copy / value | {metric.label} | [L134](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:134) |
| Dynamic copy / value | {record.heading} | `shown === 'static' && copy → record` · [L144](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:144) |
| Dynamic copy / value | {line} | `shown === 'static' && copy → record; otherwise: beat === 2 → beat === 3` · [L145](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:145) |
| Dynamic copy / value | {record.closing} | `shown === 'static' && copy → record` · [L146](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:146) |
| Dynamic copy / value | {landing.title} | `shown === 'static' && copy` · [L148](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:148) |
| Dynamic copy / value | {landing.subtitle} | `shown === 'static' && copy` · [L149](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:149) |
| Dynamic copy / value | {landing.baseline} | `shown === 'static' && copy → landing.baseline` · [L151](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:151) |
| Dynamic copy / value | {copy.pieceLabel} | `otherwise: !copy → beat === 1` · [L160](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:160) |
| Dynamic copy / value | {copy.progress.title} | `otherwise: beat === 1 → beat === 2` · [L162](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:162) |
| Dynamic copy / value | {copy.progress.heading} | `otherwise: beat === 1 → beat === 2` · [L163](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:163) |
| Dynamic copy / value | {row.delta} | `otherwise: beat === 1 → beat === 2` · [L165](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:165) |
| Dynamic copy / value | {row.exercise} | `otherwise: beat === 1 → beat === 2` · [L166](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:166) |
| Dynamic copy / value | {row.change} | `otherwise: beat === 1 → beat === 2` · [L167](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:167) |
| Dynamic copy / value | {copy.progress.more} | `beat === 2 → copy.progress.more` · [L169](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:169) |
| Dynamic copy / value | {copy.record.heading} | `otherwise: beat === 2 → beat === 3` · [L172](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:172) |
| Dynamic copy / value | {copy.record.closing} | `otherwise: beat === 2 → beat === 3` · [L174](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:174) |
| Dynamic copy / value | {copy.landing.title} | `otherwise: beat === 2 → otherwise: beat === 3` · [L177](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:177) |
| Dynamic copy / value | {copy.landing.subtitle} | `otherwise: beat === 2 → otherwise: beat === 3` · [L178](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:178) |
| Accessibility / spoken copy | {phase}. {piece?.label} piece, {piece?.height.toFixed(2)} times baseline thickness. {piece?.records.length} records. | `playing` · [L181](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:181) |
| Accessibility / spoken copy | {phase}. {piece?.label} piece, {piece?.height.toFixed(2)} times baseline thickness. 0 records. | `playing` · [L181](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:181) |
| Accessibility / spoken copy | {phase}. {piece?.label} piece, 1.00 times baseline thickness. {piece?.records.length} records. | `playing` · [L181](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:181) |
| Accessibility / spoken copy | {phase}. {piece?.label} piece, 1.00 times baseline thickness. 0 records. | `playing` · [L181](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:181) |
| Accessibility / spoken copy | {phase}. Workout piece, {piece?.height.toFixed(2)} times baseline thickness. {piece?.records.length} records. | `playing` · [L181](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:181) |
| Accessibility / spoken copy | {phase}. Workout piece, {piece?.height.toFixed(2)} times baseline thickness. 0 records. | `playing` · [L181](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:181) |
| Accessibility / spoken copy | {phase}. Workout piece, 1.00 times baseline thickness. {piece?.records.length} records. | `playing` · [L181](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:181) |
| Accessibility / spoken copy | {phase}. Workout piece, 1.00 times baseline thickness. 0 records. | `playing` · [L181](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:181) |
| Accessibility / spoken copy | Preparing saved workout presentation | `otherwise: playing` · [L181](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:181) |
| Accessibility / spoken copy | Workout | `playing` · [L181](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:181) |
| Dynamic copy / value | {copy.landing.baseline} | `copy?.landing.baseline` · [L189](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx:189) |

<a id="source-features-build-fusionpresentation-tsx"></a>

### Fusion Presentation

Source: [features/build/FusionPresentation.tsx](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Visible text | YOUR STACK · PREVIEW | [L134](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx:134) |
| Visible text | YOUR STACK | [L134](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx:134) |
| Accessibility / spoken copy | Skip weekly fusion | `mode !== 'static'` · [L134](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx:134) |
| Visible text | Skip | `mode !== 'static'` · [L134](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx:134) |
| Dynamic copy / value | {copy.sealed.kicker} | `copy` · [L136](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx:136) |
| Dynamic copy / value | {copy.sealed.title} | `copy` · [L137](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx:137) |
| Dynamic copy / value | {copy.sealed.summary} | `copy` · [L138](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx:138) |
| Dynamic copy / value | {copy.sealed.thickest} | `copy → copy.sealed.thickest` · [L139](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx:139) |
| Accessibility / spoken copy | Your Stack, {weeksBuilt(copy.stack.after)} | `copy` · [L141](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx:141) |
| Dynamic copy / value | {copy?.stack.label} | [L142](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx:142) |
| Dynamic copy / value | {weeksBuilt(built)} | [L143](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx:143) |
| Accessibility / spoken copy | Done, return to sandbox | `snapshot.example` · [L145](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx:145) |
| Accessibility / spoken copy | Done, back to your Stack | `otherwise: snapshot.example` · [L145](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx:145) |
| Visible text | Done | [L145](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx:145) |
| Dynamic copy / value | {copy.week.range} | `otherwise: !copy → !sealed` · [L158](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx:158) |
| Dynamic copy / value | {copy.week.title} | `otherwise: !copy → !sealed` · [L159](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx:159) |
| Dynamic copy / value | {row.title} | `otherwise: !copy → !sealed` · [L162](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx:162) |
| Dynamic copy / value | {row.detail} | `otherwise: !copy → !sealed` · [L163](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx:163) |
| Accessibility / spoken copy | {phase}. {week?.pieces.length} workout pieces becoming one weekly block. {week?.metrics.records} records preserved. | `otherwise: mode === 'static'` · [L168](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx:168) |
| Accessibility / spoken copy | {phase}. {week?.pieces.length} workout pieces becoming one weekly block. 0 records preserved. | `otherwise: mode === 'static'` · [L168](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx:168) |
| Accessibility / spoken copy | {phase}. 0 workout pieces becoming one weekly block. {week?.metrics.records} records preserved. | `otherwise: mode === 'static'` · [L168](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx:168) |
| Accessibility / spoken copy | {phase}. 0 workout pieces becoming one weekly block. 0 records preserved. | `otherwise: mode === 'static'` · [L168](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx:168) |
| Dynamic copy / value | Fusion: {stats.fps.toFixed(1)} fps · p95 {stats.p95Ms.toFixed(1)} ms · {stats.calls} draws | `otherwise: mode === 'static' → snapshot.example` · [L174](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx:174) |
| Visible text | Measuring fusion… | `otherwise: mode === 'static' → snapshot.example` · [L174](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx:174) |

<a id="source-features-build-metrictiles-tsx"></a>

### Metric Tiles

Source: [features/build/MetricTiles.tsx](/Users/satwikmekala/stackv3/features/build/MetricTiles.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Accessibility / spoken copy | {tile.value} {tile.label.toLowerCase()} | [L8](/Users/satwikmekala/stackv3/features/build/MetricTiles.tsx:8) |
| Dynamic copy / value | {tile.value} | [L9](/Users/satwikmekala/stackv3/features/build/MetricTiles.tsx:9) |
| Dynamic copy / value | {tile.label} | [L10](/Users/satwikmekala/stackv3/features/build/MetricTiles.tsx:10) |

<a id="source-features-build-monolith-tsx"></a>

### Monolith

Source: [features/build/Monolith.tsx](/Users/satwikmekala/stackv3/features/build/Monolith.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {amount.toLowerCase()} moved | `amount` · [L41](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:41) |
| Label / supplied copy | Your workouts | [L46](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:46) |
| Label / supplied copy | Verified, completed training history | [L46](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:46) |
| Label / supplied copy | Demo · three months | [L47](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:47) |
| Label / supplied copy | Mixed workouts, records and a quiet week | [L47](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:47) |
| Label / supplied copy | Demo · two years | [L48](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:48) |
| Label / supplied copy | 104 calendar weeks with training gaps | [L48](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:48) |
| Label / supplied copy | Demo · five years | [L49](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:49) |
| Label / supplied copy | 260 calendar weeks with training gaps | [L49](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:49) |
| Label / supplied copy | Demo · nothing built | [L50](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:50) |
| Label / supplied copy | No stacks yet | [L50](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:50) |
| Label / supplied copy | kg | [L62](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:62) |
| Dynamic copy / value | This week, open, {countLabel(current.pieces.length, 'stack', 'stacks')}, {recordLabel(current.metrics.records)} | `otherwise: week.sealed` · [L133](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:133) |
| Dynamic copy / value | This week, open, {countLabel(current.pieces.length, 'stack', 'stacks')} | `otherwise: week.sealed` · [L133](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:133) |
| Dynamic copy / value | This week, open, nothing yet, {recordLabel(current.metrics.records)} | `otherwise: week.sealed` · [L133](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:133) |
| Label / supplied copy | This week, open, nothing yet | `otherwise: week.sealed` · [L133](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:133) |
| Label / supplied copy | nothing yet | `otherwise: week.sealed → otherwise: current.pieces.length` · [L133](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:133) |
| Dynamic copy / value | , {recordLabel(current.metrics.records)} | `otherwise: week.sealed → current.metrics.records` · [L133](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:133) |
| Accessibility / spoken copy | Back to Your Stack | `otherwise: isTab` · [L154](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:154) |
| Visible text | YOUR STACK | [L155](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:155) |
| Accessibility / spoken copy | How your Stack grows | `ONBOARDING_PREVIEW_ENABLED` · [L156](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:156) |
| Visible text | Nothing built yet. | `!overview` · [L161](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:161) |
| Dynamic copy / value | {countLabel(weeksBuilt, 'week built', 'weeks built')} | `!overview` · [L161](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:161) |
| Visible text | Your Stack is taking shape. | `!overview` · [L161](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:161) |
| Visible text | Your first session lays your first stack. | `!overview → empty` · [L162](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:162) |
| Dynamic copy / value | {headerMetrics} | `otherwise: empty → Boolean(headerMetrics)` · [L162](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:162) |
| Accessibility / spoken copy | Your Stack. Nothing built yet. Your first session lays your first stack. | `active && focused && accessibility.ready && !fusionSnapshot; active && focused && accessibility.ready && !fusionSnapshot → empty` · [L166](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:166) |
| Accessibility / spoken copy | Static preview of recent layers. Your Stack overview, since {fullDateLabel(firstPieceDate!)}.. | `active && focused && accessibility.ready && !fusionSnapshot; active && focused && accessibility.ready && !fusionSnapshot → otherwise: empty` · [L166](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:166) |
| Accessibility / spoken copy | Static preview of recent layers. {selectedWeekA11y}. | `active && focused && accessibility.ready && !fusionSnapshot; active && focused && accessibility.ready && !fusionSnapshot → otherwise: empty` · [L166](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:166) |
| Accessibility / spoken copy | Your Stack overview, since {fullDateLabel(firstPieceDate!)}.. | `active && focused && accessibility.ready && !fusionSnapshot; active && focused && accessibility.ready && !fusionSnapshot → otherwise: empty` · [L166](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:166) |
| Accessibility / spoken copy | {selectedWeekA11y}. | `active && focused && accessibility.ready && !fusionSnapshot; active && focused && accessibility.ready && !fusionSnapshot → otherwise: empty` · [L166](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:166) |
| Accessibility / spoken copy | Static preview of recent layers. | `otherwise: empty → accessibility.reduceEffects` · [L166](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:166) |
| Accessibility / spoken copy | Your Stack overview, since {fullDateLabel(firstPieceDate!)}. | `otherwise: empty → overview` · [L166](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:166) |
| Accessibility / spoken copy | {weekAccessibilityLabel(entry.week)} | `!overview && !sheet && !accessibility.reduceEffects → entry` · [L177](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:177) |
| Accessibility / spoken copy | {selectedWeekA11y} | `!overview && !sheet && !accessibility.reduceEffects → entry` · [L177](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:177) |
| Dynamic copy / value | {weekRangeLabel(entry.week.weekStart, entry.week.weekEnd)} | `!overview && !sheet && !accessibility.reduceEffects → entry` · [L177](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:177) |
| Visible text | THIS WEEK | `!overview && !sheet && !accessibility.reduceEffects → entry; otherwise: overview` · [L177](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:177) |
| Accessibility / spoken copy | Show Focus | `overview` · [L181](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:181) |
| Accessibility / spoken copy | Show Overview | `otherwise: overview` · [L181](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:181) |
| Visible text | OVERVIEW | [L182](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:182) |
| Visible text | FOCUS | [L182](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:182) |
| Label / supplied copy | STACK | `history.state.metrics.workouts > 0 → history.state.metrics.workouts === 1` · [L189](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:189) |
| Label / supplied copy | STACKS | `history.state.metrics.workouts > 0 → otherwise: history.state.metrics.workouts === 1` · [L189](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:189) |
| Label / supplied copy | WEEK BUILT | `weeksBuilt > 0 → weeksBuilt === 1` · [L190](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:190) |
| Label / supplied copy | WEEKS BUILT | `weeksBuilt > 0 → otherwise: weeksBuilt === 1` · [L190](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:190) |
| Label / supplied copy | PR | `history.state.metrics.records > 0 → history.state.metrics.records === 1` · [L191](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:191) |
| Label / supplied copy | PRS | `history.state.metrics.records > 0 → otherwise: history.state.metrics.records === 1` · [L191](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:191) |
| Accessibility / spoken copy | Unpack {selectedWeekA11y} | `otherwise: overview; otherwise: overview → week.sealed` · [L195](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:195) |
| Accessibility / spoken copy | Open this week, {selectedWeekA11y} | `otherwise: overview; otherwise: overview → otherwise: week.sealed` · [L195](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:195) |
| Dynamic copy / value | {weekRangeLabel(week.weekStart, week.weekEnd)} | `otherwise: overview` · [L196](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:196) |
| Dynamic copy / value | {countLabel(week.pieces.length, 'stack', 'stacks')} · {recordLabel(week.metrics.records)} | `otherwise: overview` · [L197](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:197) |
| Dynamic copy / value | {countLabel(week.pieces.length, 'stack', 'stacks')} | `otherwise: overview` · [L197](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:197) |
| Visible text | Nothing yet. | `otherwise: overview; otherwise: sheet === 'source' → otherwise: sheet === 'weeks'` · [L197](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:197) |
| Dynamic copy / value | {movedSegment(week.metrics.volumeKg, unit)} | `otherwise: overview → week.pieces.length > 0 && Boolean(movedSegment(week.metrics.volumeKg, unit))` · [L201](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:201) |
| Accessibility / spoken copy | Start a workout | `empty` · [L205](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:205) |
| Accessibility / spoken copy | Open the Case | `otherwise: empty` · [L205](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:205) |
| Visible text | Start a workout | [L207](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:207) |
| Visible text | Open the Case | [L207](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:207) |
| Accessibility / spoken copy | Previous active week | [L211](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:211) |
| Visible text | Choose a week | [L212](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:212) |
| Accessibility / spoken copy | Next active week | [L213](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:213) |
| Visible text | Your Stack options | [L220](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:220) |
| Visible text | Your weeks | [L220](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:220) |
| Visible text | This week | [L220](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:220) |
| Accessibility / spoken copy | Close Your Stack sheet | [L220](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:220) |
| Visible text | Reduce effects | `sheet === 'source'` · [L221](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:221) |
| Accessibility / spoken copy | Reduce Your Stack effects | `sheet === 'source'` · [L221](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:221) |
| Alert / confirmation | Couldn’t save preference | `sheet === 'source'` · [L221](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:221) |
| Alert / confirmation | Please try again. | `sheet === 'source'` · [L221](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:221) |
| Visible text | Use static previews and skip reward animations. All workouts and records stay available. | `sheet === 'source'` · [L221](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:221) |
| Visible text | Demo sessions are illustrative and never saved to your workout history. | `sheet === 'source'` · [L221](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:221) |
| Dynamic copy / value | {item.title} | `sheet === 'source'` · [L221](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:221) |
| Dynamic copy / value | {item.detail} | `sheet === 'source'` · [L221](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:221) |
| Accessibility / spoken copy | {label} | `otherwise: sheet === 'source' → sheet === 'weeks'` · [L231](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:231) |
| Dynamic copy / value | {weekRangeLabel(item.week.weekStart, item.week.weekEnd)} | `otherwise: sheet === 'source' → sheet === 'weeks'` · [L231](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:231) |
| Visible text | THIS WEEK · OPEN | `otherwise: sheet === 'source' → sheet === 'weeks'` · [L231](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:231) |
| Dynamic copy / value | {rowMetrics} | `otherwise: sheet === 'source' → sheet === 'weeks'` · [L231](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:231) |
| Dynamic copy / value | {countLabel(current.pieces.length, 'stack', 'stacks').toUpperCase()} | `otherwise: sheet === 'weeks' → current.pieces.length > 0` · [L233](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:233) |
| Visible text | Your next session starts it. | `otherwise: sheet === 'source' → otherwise: sheet === 'weeks'` · [L233](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:233) |
| Accessibility / spoken copy | {copy.a11y} | `otherwise: sheet === 'source' → otherwise: sheet === 'weeks'` · [L236](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:236) |
| Dynamic copy / value | {copy.title} | `otherwise: sheet === 'source' → otherwise: sheet === 'weeks'` · [L238](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:238) |
| Dynamic copy / value | {copy.detail} | `otherwise: sheet === 'weeks' → copy.detail.length > 0` · [L238](/Users/satwikmekala/stackv3/features/build/Monolith.tsx:238) |

<a id="source-features-build-stackdiscovery-tsx"></a>

### Stack Discovery

Source: [features/build/StackDiscovery.tsx](/Users/satwikmekala/stackv3/features/build/StackDiscovery.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Visible text | YOUR STACK | [L23](/Users/satwikmekala/stackv3/features/build/StackDiscovery.tsx:23) |
| Accessibility / spoken copy | How your Stack grows | [L24](/Users/satwikmekala/stackv3/features/build/StackDiscovery.tsx:24) |
| Visible text | Your Stack starts here | [L25](/Users/satwikmekala/stackv3/features/build/StackDiscovery.tsx:25) |
| Visible text | Every workout you finish adds a piece. Together, they become a Stack that tells your training story. | [L26](/Users/satwikmekala/stackv3/features/build/StackDiscovery.tsx:26) |
| Accessibility / spoken copy | An empty Stack base. No workouts have been earned yet. | [L27](/Users/satwikmekala/stackv3/features/build/StackDiscovery.tsx:27) |
| Visible text | A PLACE FOR YOUR FIRST WORKOUT | [L29](/Users/satwikmekala/stackv3/features/build/StackDiscovery.tsx:29) |
| Visible text | Built by you. | [L33](/Users/satwikmekala/stackv3/features/build/StackDiscovery.tsx:33) |
| Visible text | Your logged sets shape each piece. Muscle colors show what you trained. Personal records add a gold seam. | [L34](/Users/satwikmekala/stackv3/features/build/StackDiscovery.tsx:34) |
| Visible text | You can explore now. Your first piece arrives when you finish a workout. | [L35](/Users/satwikmekala/stackv3/features/build/StackDiscovery.tsx:35) |
| Visible text | Go to Train | [L37](/Users/satwikmekala/stackv3/features/build/StackDiscovery.tsx:37) |
| Visible text | See an example | [L38](/Users/satwikmekala/stackv3/features/build/StackDiscovery.tsx:38) |

<a id="source-features-build-unpackedweek-tsx"></a>

### Unpacked Week

Source: [features/build/UnpackedWeek.tsx](/Users/satwikmekala/stackv3/features/build/UnpackedWeek.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | kg | [L28](/Users/satwikmekala/stackv3/features/build/UnpackedWeek.tsx:28) |
| Alert / confirmation | Couldn’t share this week | [L46](/Users/satwikmekala/stackv3/features/build/UnpackedWeek.tsx:46) |
| Alert / confirmation | The report could not be created. Try again. | [L46](/Users/satwikmekala/stackv3/features/build/UnpackedWeek.tsx:46) |
| Dynamic copy / value | {unpacked?.title} | [L53](/Users/satwikmekala/stackv3/features/build/UnpackedWeek.tsx:53) |
| Accessibility / spoken copy | Share week as PDF | `week` · [L53](/Users/satwikmekala/stackv3/features/build/UnpackedWeek.tsx:53) |
| Accessibility / spoken copy | Close week | [L53](/Users/satwikmekala/stackv3/features/build/UnpackedWeek.tsx:53) |
| Accessibility / spoken copy | {week.pieces.length} unpacked workout pieces, in chronological order from bottom to top. | `week` · [L55](/Users/satwikmekala/stackv3/features/build/UnpackedWeek.tsx:55) |
| Visible text | The 3D preview is unavailable. All sessions are listed below. | `week → failed` · [L55](/Users/satwikmekala/stackv3/features/build/UnpackedWeek.tsx:55) |
| Accessibility / spoken copy | {copy.a11y} | `week` · [L59](/Users/satwikmekala/stackv3/features/build/UnpackedWeek.tsx:59) |
| Dynamic copy / value | {copy.title} | `week` · [L61](/Users/satwikmekala/stackv3/features/build/UnpackedWeek.tsx:61) |
| Dynamic copy / value | {copy.detail} | `week → copy.detail.length > 0` · [L61](/Users/satwikmekala/stackv3/features/build/UnpackedWeek.tsx:61) |

<a id="source-features-build-buildformat-ts"></a>

### build Format

Source: [features/build/buildFormat.ts](/Users/satwikmekala/stackv3/features/build/buildFormat.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | JAN | [L9](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:9) |
| Label / supplied copy | FEB | [L9](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:9) |
| Label / supplied copy | MAR | [L9](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:9) |
| Label / supplied copy | APR | [L9](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:9) |
| Label / supplied copy | MAY | [L9](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:9) |
| Label / supplied copy | JUN | [L9](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:9) |
| Label / supplied copy | JUL | [L9](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:9) |
| Label / supplied copy | AUG | [L9](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:9) |
| Label / supplied copy | SEP | [L9](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:9) |
| Label / supplied copy | OCT | [L9](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:9) |
| Label / supplied copy | NOV | [L9](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:9) |
| Label / supplied copy | DEC | [L9](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:9) |
| Label / supplied copy | January | [L10](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:10) |
| Label / supplied copy | February | [L10](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:10) |
| Label / supplied copy | March | [L10](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:10) |
| Label / supplied copy | April | [L10](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:10) |
| Label / supplied copy | May | [L10](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:10) |
| Label / supplied copy | June | [L10](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:10) |
| Label / supplied copy | July | [L10](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:10) |
| Label / supplied copy | August | [L10](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:10) |
| Label / supplied copy | September | [L10](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:10) |
| Label / supplied copy | October | [L10](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:10) |
| Label / supplied copy | November | [L10](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:10) |
| Label / supplied copy | December | [L10](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:10) |
| Label / supplied copy | Sun | [L11](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:11) |
| Label / supplied copy | Mon | [L11](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:11) |
| Label / supplied copy | Tue | [L11](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:11) |
| Label / supplied copy | Wed | [L11](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:11) |
| Label / supplied copy | Thu | [L11](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:11) |
| Label / supplied copy | Fri | [L11](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:11) |
| Label / supplied copy | Sat | [L11](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:11) |
| Dynamic copy / value | {value.getDate()} {MONTHS[value.getMonth()]} | [L18](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:18) |
| Dynamic copy / value | {value.getDate()} {FULL_MONTHS[value.getMonth()]} | [L24](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:24) |
| Dynamic copy / value | {first.getDate()}–{last.getDate()} {lastMonth} | `firstMonth === lastMonth` · [L32](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:32) |
| Dynamic copy / value | {first.getDate()} {firstMonth}–{last.getDate()} {lastMonth} | `otherwise: firstMonth === lastMonth` · [L32](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:32) |
| Dynamic copy / value | {formatDayA11y(start)} to {formatDayA11y(end)} | [L44](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:44) |
| Dynamic copy / value | {TENS[Math.floor(value / 10)]}-{ONES[value % 10]} | `otherwise: value < 20` · [L52](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:52) |
| Dynamic copy / value | {TENS[Math.floor(value / 10)]} | `otherwise: value < 20` · [L52](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:52) |
| Dynamic copy / value | -{ONES[value % 10]} | `otherwise: value < 20 → value % 10` · [L52](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:52) |
| Dynamic copy / value | {count} {singular} | [L62](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:62) |
| Dynamic copy / value | {count} {plural} | [L62](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:62) |
| Label / supplied copy | PR | [L64](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:64) |
| Label / supplied copy | PRs | [L64](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:64) |
| Dynamic copy / value | , {recordLabel(week.metrics.records)} | `week.metrics.records` · [L69](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:69) |
| Dynamic copy / value | Week of {formatDayA11y(week.weekStart)} ({formatDateRange(week.weekStart, week.weekEnd)}), {pieces}{records} | [L70](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:70) |
| Label / supplied copy | lbs | `unit === 'lbs'` · [L80](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:80) |
| Dynamic copy / value | {rounded.toLocaleString('en-US')} LB | `unit === 'lbs' → rounded > 0` · [L81](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:81) |
| Dynamic copy / value | {(kg / 1000).toFixed(1)} T | `scope === 'aggregate' && kg >= 1000` · [L83](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:83) |
| Dynamic copy / value | {rounded.toLocaleString('en-US')} KG | `rounded > 0` · [L85](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:85) |
| Dynamic copy / value | {formatWeight(weightKg, unit)} {unitLabel(unit)} × {reps} | [L92](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:92) |
| Dynamic copy / value | Bodyweight × {reps} | [L92](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:92) |
| Dynamic copy / value | {formatWeight(weightKg, unit)} {unitLabel(unit)} | `weightKg > 0` · [L92](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:92) |
| Label / supplied copy | Bodyweight | `otherwise: weightKg > 0` · [L92](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:92) |
| Dynamic copy / value | {primary} + {ARCHETYPE_COMPOSITIONS[session.secondaryArchetype].shortLabel} | `session?.archetype → session.secondaryArchetype` · [L102](/Users/satwikmekala/stackv3/features/build/buildFormat.ts:102) |

<a id="source-features-build-buildnavigation-ts"></a>

### build Navigation

Source: [features/build/buildNavigation.ts](/Users/satwikmekala/stackv3/features/build/buildNavigation.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | / | [L28](/Users/satwikmekala/stackv3/features/build/buildNavigation.ts:28) |

<a id="source-features-build-casecopy-ts"></a>

### case Copy

Source: [features/build/caseCopy.ts](/Users/satwikmekala/stackv3/features/build/caseCopy.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Your Case | [L19](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:19) |
| Dynamic copy / value | {shelved} WEEK | `otherwise: shelved === 0` · [L20](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:20) |
| Dynamic copy / value | {shelved} WEEKS | `otherwise: shelved === 0` · [L20](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:20) |
| Label / supplied copy | WEEK | `otherwise: shelved === 0 → shelved === 1` · [L20](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:20) |
| Label / supplied copy | WEEKS | `otherwise: shelved === 0 → otherwise: shelved === 1` · [L20](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:20) |
| Label / supplied copy | Every finished week is kept here. | `shelved === 0` · [L21](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:21) |
| Label / supplied copy | NO SESSIONS | `card.kind === 'empty' → card.weeks === 1; card.kind === 'empty' → otherwise: card.weeks === 1` · [L28](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:28) |
| Dynamic copy / value | Week of {formatDayA11y(card.start)}, no sessions | `card.kind === 'empty' → card.weeks === 1` · [L28](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:28) |
| Dynamic copy / value | {formatDateRangeA11y(card.start, card.end)}, no sessions | `card.kind === 'empty' → otherwise: card.weeks === 1` · [L29](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:29) |
| Dynamic copy / value | Week of {formatDayA11y(week.weekStart)}, {stacks} | `week.sealed` · [L34](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:34) |
| Label / supplied copy | THIS WEEK | `otherwise: week.sealed` · [L35](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:35) |
| Dynamic copy / value | {stacks} · OPEN | `otherwise: week.sealed` · [L35](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:35) |
| Dynamic copy / value | This week, open, {stacks} | `otherwise: week.sealed` · [L35](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:35) |
| Label / supplied copy | This week | `otherwise: week.sealed` · [L45](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:45) |
| Dynamic copy / value | {moved.slice(split + 1)} MOVED | `moved` · [L47](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:47) |
| Label / supplied copy | STACK | `count === 1` · [L48](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:48) |
| Label / supplied copy | STACKS | `otherwise: count === 1` · [L48](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:48) |
| Label / supplied copy | PR | `records > 0 → records === 1; records.length → records.length === 1` · [L49](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:49) |
| Label / supplied copy | PRS | `records > 0 → otherwise: records === 1` · [L49](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:49) |
| Dynamic copy / value | {record.exerciseName} · {formatLoadReps(record.current.weight, record.current.reps, unit)} | [L57](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:57) |
| Dynamic copy / value | {name} · {formatWeekday(piece.date)} | [L59](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:59) |
| Dynamic copy / value | {moved.toLowerCase()} moved | `moved` · [L61](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:61) |
| Label / supplied copy | Bodyweight | `otherwise: moved` · [L61](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:61) |
| Dynamic copy / value | PR: {records.join(', ')} | `records.length` · [L62](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:62) |
| Dynamic copy / value | PRs: {records.join(', ')} | `records.length` · [L62](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:62) |
| Label / supplied copy | PRs | `records.length → otherwise: records.length === 1` · [L62](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:62) |
| Dynamic copy / value | View {name} summary, {formatDayA11y(piece.date)} | [L64](/Users/satwikmekala/stackv3/features/build/caseCopy.ts:64) |

<a id="source-features-build-castingcopy-ts"></a>

### casting Copy

Source: [features/build/castingCopy.ts](/Users/satwikmekala/stackv3/features/build/castingCopy.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | First | [L22](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:22) |
| Label / supplied copy | Second | [L22](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:22) |
| Label / supplied copy | Third | [L22](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:22) |
| Label / supplied copy | Fourth | [L22](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:22) |
| Label / supplied copy | Fifth | [L22](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:22) |
| Label / supplied copy | Sixth | [L22](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:22) |
| Label / supplied copy | Seventh | [L22](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:22) |
| Dynamic copy / value | +{trim(delta)} {units} | `set.current.weightKg > set.previous.weightKg` · [L50](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:50) |
| Dynamic copy / value | {before} → {after} {units} | `set.current.weightKg > set.previous.weightKg` · [L50](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:50) |
| Dynamic copy / value | +{countLabel(reps, 'rep')} | [L53](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:53) |
| Dynamic copy / value | {set.previous.reps} → {set.current.reps} | [L53](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:53) |
| Dynamic copy / value | {record.exerciseName} · {formatLoadReps(record.current.weight, record.current.reps, unit)} | [L57](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:57) |
| Label / supplied copy | MOVED | `moved` · [L72](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:72) |
| Label / supplied copy | LIFTS UP | `piece.metrics.liftsUp > 0` · [L73](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:73) |
| Label / supplied copy | PRS | `piece.metrics.records > 0 → piece.metrics.records >= 2` · [L74](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:74) |
| Label / supplied copy | PR | `piece.metrics.records > 0 → otherwise: piece.metrics.records >= 2` · [L74](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:74) |
| Dynamic copy / value | {category.toUpperCase()} · DONE | [L78](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:78) |
| Label / supplied copy | Better than<br>last time. | [L79](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:79) |
| Label / supplied copy | WHAT MADE IT THICKER | [L79](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:79) |
| Dynamic copy / value | +{hidden} more | `hidden > 0` · [L79](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:79) |
| Label / supplied copy | NEW RECORDS | `piece.records.length > 1` · [L81](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:81) |
| Label / supplied copy | NEW RECORD | `otherwise: piece.records.length > 1` · [L81](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:81) |
| Label / supplied copy | Your best yet. | [L83](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:83) |
| Label / supplied copy | Stacked. | [L86](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:86) |
| Label / supplied copy | Your first piece. | `firstEver` · [L87](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:87) |
| Dynamic copy / value | {pieceOrdinal(weekPosition)} piece this week. | `otherwise: firstEver` · [L87](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:87) |
| Label / supplied copy | Every lift today sets your baseline. | `firstEver` · [L89](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:89) |
| Dynamic copy / value | {metric.value} {metric.label} | [L141](/Users/satwikmekala/stackv3/features/build/castingCopy.ts:141) |

<a id="source-features-build-evidence-ts"></a>

### evidence

Source: [features/build/evidence.ts](/Users/satwikmekala/stackv3/features/build/evidence.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Validation / error | Build rules require four positive ordered heights and valid compression bounds | `rules.heights.length !== 4 \|\| rules.heights.some((height, index) => !Number.isFinite(height) \|\| height <= 0 \|\| (index > 0 && height < rules.heights[index - 1])) \|\| !Number.isFinite(rules.compressionFactor) \|\| rules.compressionFactor <= 0 \|\| !Number.isFinite(rules.minWeekHeight) \|\| rules.minWeekHeight <= 0 \|\| !Number.isFinite(rules.maxWeekHeight) \|\| rules.maxWeekHeight < rules.minWeekHeight` · [L79](/Users/satwikmekala/stackv3/features/build/evidence.ts:79) |
| Validation / error | Build requires a valid current date | `!Number.isFinite(now.getTime())` · [L85](/Users/satwikmekala/stackv3/features/build/evidence.ts:85) |

<a id="source-features-build-fusioncopy-ts"></a>

### fusion Copy

Source: [features/build/fusionCopy.ts](/Users/satwikmekala/stackv3/features/build/fusionCopy.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {countLabel(count, 'week')} built | [L18](/Users/satwikmekala/stackv3/features/build/fusionCopy.ts:18) |
| Dynamic copy / value | {category} · {formatWeekday(piece.date)} | [L27](/Users/satwikmekala/stackv3/features/build/fusionCopy.ts:27) |
| Dynamic copy / value | {countLabel(lifts, 'lift')} up | `lifts > 0` · [L30](/Users/satwikmekala/stackv3/features/build/fusionCopy.ts:30) |
| Label / supplied copy | PRs | `piece.records.length > 1` · [L31](/Users/satwikmekala/stackv3/features/build/fusionCopy.ts:31) |
| Label / supplied copy | PR | `otherwise: piece.records.length > 1 → piece.records.length === 1; records > 0 → otherwise: records >= 2` · [L31](/Users/satwikmekala/stackv3/features/build/fusionCopy.ts:31) |
| Label / supplied copy | One piece. | `count === 1` · [L51](/Users/satwikmekala/stackv3/features/build/fusionCopy.ts:51) |
| Dynamic copy / value | {spelledCount(count)} pieces. | `otherwise: count === 1` · [L51](/Users/satwikmekala/stackv3/features/build/fusionCopy.ts:51) |
| Dynamic copy / value | {range} · SEALED | [L53](/Users/satwikmekala/stackv3/features/build/fusionCopy.ts:53) |
| Label / supplied copy | One week.<br>One layer. | [L54](/Users/satwikmekala/stackv3/features/build/fusionCopy.ts:54) |
| Dynamic copy / value | {count} PIECE | [L56](/Users/satwikmekala/stackv3/features/build/fusionCopy.ts:56) |
| Dynamic copy / value | {count} PIECES | [L56](/Users/satwikmekala/stackv3/features/build/fusionCopy.ts:56) |
| Label / supplied copy | PIECE | `count === 1` · [L56](/Users/satwikmekala/stackv3/features/build/fusionCopy.ts:56) |
| Label / supplied copy | PIECES | `otherwise: count === 1` · [L56](/Users/satwikmekala/stackv3/features/build/fusionCopy.ts:56) |
| Dynamic copy / value | {moved} MOVED | `moved` · [L57](/Users/satwikmekala/stackv3/features/build/fusionCopy.ts:57) |
| Dynamic copy / value | {records} PRS | `records > 0` · [L58](/Users/satwikmekala/stackv3/features/build/fusionCopy.ts:58) |
| Dynamic copy / value | {records} PR | `records > 0` · [L58](/Users/satwikmekala/stackv3/features/build/fusionCopy.ts:58) |
| Label / supplied copy | PRS | `records > 0 → records >= 2` · [L58](/Users/satwikmekala/stackv3/features/build/fusionCopy.ts:58) |
| Label / supplied copy | Your thickest layer yet. | `thickest` · [L60](/Users/satwikmekala/stackv3/features/build/fusionCopy.ts:60) |
| Label / supplied copy | YOUR STACK | [L62](/Users/satwikmekala/stackv3/features/build/fusionCopy.ts:62) |

<a id="source-features-build-homemodulecopy-ts"></a>

### home Module Copy

Source: [features/build/homeModuleCopy.ts](/Users/satwikmekala/stackv3/features/build/homeModuleCopy.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | YOUR STACK | [L11](/Users/satwikmekala/stackv3/features/build/homeModuleCopy.ts:11) |
| Dynamic copy / value | {countLabel(piecesThisWeek, 'piece')} this week | [L12](/Users/satwikmekala/stackv3/features/build/homeModuleCopy.ts:12) |
| Label / supplied copy | Starts with your next workout. | `weeksBuilt === 0 && piecesThisWeek === 0` · [L15](/Users/satwikmekala/stackv3/features/build/homeModuleCopy.ts:15) |
| Label / supplied copy | Last week became a layer. | `seen && pendingClose → pendingClose.previousWeek` · [L17](/Users/satwikmekala/stackv3/features/build/homeModuleCopy.ts:17) |
| Label / supplied copy | Your latest week became a layer. | `seen && pendingClose → otherwise: pendingClose.previousWeek` · [L17](/Users/satwikmekala/stackv3/features/build/homeModuleCopy.ts:17) |
| Dynamic copy / value | {countLabel(pendingClose.builtBefore, 'week')} built | `seen && pendingClose → pendingClose.builtBefore > 0` · [L18](/Users/satwikmekala/stackv3/features/build/homeModuleCopy.ts:18) |
| Dynamic copy / value | {countLabel(weeksBuilt, 'week')} built | `seen → weeksBuilt === 0` · [L22](/Users/satwikmekala/stackv3/features/build/homeModuleCopy.ts:22) |
| Label / supplied copy | This week is open | `weeksBuilt === 0 → otherwise: piecesThisWeek > 0` · [L22](/Users/satwikmekala/stackv3/features/build/homeModuleCopy.ts:22) |
| Dynamic copy / value | You've already built {numberWord(1)} week. | `seen → weeksBuilt > 0` · [L25](/Users/satwikmekala/stackv3/features/build/homeModuleCopy.ts:25) |
| Dynamic copy / value | You've already built {weeksBuilt} weeks. | `seen → weeksBuilt > 0` · [L25](/Users/satwikmekala/stackv3/features/build/homeModuleCopy.ts:25) |
| Dynamic copy / value | {numberWord(1)} week | `weeksBuilt > 0 → weeksBuilt === 1` · [L25](/Users/satwikmekala/stackv3/features/build/homeModuleCopy.ts:25) |
| Dynamic copy / value | {weeksBuilt} weeks | `weeksBuilt > 0 → otherwise: weeksBuilt === 1` · [L25](/Users/satwikmekala/stackv3/features/build/homeModuleCopy.ts:25) |
| Label / supplied copy | Your first piece is in. | `otherwise: weeksBuilt > 0 → piecesThisWeek === 1` · [L26](/Users/satwikmekala/stackv3/features/build/homeModuleCopy.ts:26) |
| Label / supplied copy | Your first pieces are in. | `otherwise: weeksBuilt > 0 → otherwise: piecesThisWeek === 1` · [L26](/Users/satwikmekala/stackv3/features/build/homeModuleCopy.ts:26) |
| Label / supplied copy | See it | `seen && pendingClose → seen` · [L27](/Users/satwikmekala/stackv3/features/build/homeModuleCopy.ts:27) |
| Dynamic copy / value | Your Stack. {spoken}. | [L30](/Users/satwikmekala/stackv3/features/build/homeModuleCopy.ts:30) |

<a id="source-features-build-introcopy-ts"></a>

### intro Copy

Source: [features/build/introCopy.ts](/Users/satwikmekala/stackv3/features/build/introCopy.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Every workout<br>stacks up. | [L3](/Users/satwikmekala/stackv3/features/build/introCopy.ts:3) |
| Label / supplied copy | Finish a session and it becomes a piece of your Stack. Stay consistent and it keeps building. | [L3](/Users/satwikmekala/stackv3/features/build/introCopy.ts:3) |
| Label / supplied copy | Progress<br>shows. | [L4](/Users/satwikmekala/stackv3/features/build/introCopy.ts:4) |
| Label / supplied copy | Beat your last numbers and the piece grows thicker. Hit a PR and it lands with a line of gold. | [L4](/Users/satwikmekala/stackv3/features/build/introCopy.ts:4) |
| Label / supplied copy | Every week<br>becomes a layer. | [L5](/Users/satwikmekala/stackv3/features/build/introCopy.ts:5) |
| Label / supplied copy | When the week ends, its pieces press into one block. Look back and see exactly where you pushed, and where you eased off. | [L5](/Users/satwikmekala/stackv3/features/build/introCopy.ts:5) |
| Label / supplied copy | Don't slack.<br>Just stack. | [L6](/Users/satwikmekala/stackv3/features/build/introCopy.ts:6) |
| Label / supplied copy | Get to the gym as often as you can. Every session you finish goes up. | [L6](/Users/satwikmekala/stackv3/features/build/introCopy.ts:6) |
| Dynamic copy / value | {page + 1} / {INTRO_PAGE_COUNT} | [L11](/Users/satwikmekala/stackv3/features/build/introCopy.ts:11) |
| Dynamic copy / value | Introduction {page + 1} of {INTRO_PAGE_COUNT}. {INTRO_PAGES[page].title.replace(/\n/g, ' ')} | [L13](/Users/satwikmekala/stackv3/features/build/introCopy.ts:13) |
| Dynamic copy / value | Continue to introduction {page + 2} of {INTRO_PAGE_COUNT} | [L14](/Users/satwikmekala/stackv3/features/build/introCopy.ts:14) |
| Label / supplied copy | Loading your Stack… | `!hydrated` · [L16](/Users/satwikmekala/stackv3/features/build/introCopy.ts:16) |
| Label / supplied copy | See your Stack | `otherwise: !hydrated → hasHistory` · [L16](/Users/satwikmekala/stackv3/features/build/introCopy.ts:16) |
| Label / supplied copy | Start building | `otherwise: !hydrated → otherwise: hasHistory` · [L16](/Users/satwikmekala/stackv3/features/build/introCopy.ts:16) |

<a id="source-features-build-model-ts"></a>

### model

Source: [features/build/model.ts](/Users/satwikmekala/stackv3/features/build/model.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Validation / error | Fixture requires 0–260 weeks | `!Number.isInteger(weeks) \|\| weeks < 0 \|\| weeks > 260` · [L27](/Users/satwikmekala/stackv3/features/build/model.ts:27) |
| Dynamic copy / value | week-{week + 1} | [L35](/Users/satwikmekala/stackv3/features/build/model.ts:35) |
| Dynamic copy / value | current-{index + 1} | [L38](/Users/satwikmekala/stackv3/features/build/model.ts:38) |

## Routine library, split builder, custom exercises and shared routines

<a id="source-app-custom-split-layout-tsx"></a>

### _layout

Source: [app/custom-split/_layout.tsx](/Users/satwikmekala/stackv3/app/custom-split/_layout.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Edit split | [L10](/Users/satwikmekala/stackv3/app/custom-split/_layout.tsx:10) |
| Label / supplied copy | Review split | [L11](/Users/satwikmekala/stackv3/app/custom-split/_layout.tsx:11) |

<a id="source-app-custom-split-exercises-tsx"></a>

### Add exercises to a split

Source: [app/custom-split/exercises.tsx](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Visible text | Add exercises | [L25](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:25) |
| Label / supplied copy | Close | [L31](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:31) |
| Label / supplied copy | Close add exercises | [L31](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:31) |
| Label / supplied copy | xmark | [L32](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:32) |
| Accessibility / spoken copy | Close add exercises | `otherwise: nativeHeader` · [L36](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:36) |
| Visible text | Open a workout day to add exercises. | `!picker \|\| !day` · [L44](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:44) |
| Dynamic copy / value | Choose lifts for {getWorkoutDisplayName(day)} | [L55](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:55) |
| Dynamic copy / value | Choose lifts for Day {state.draft!.workouts.indexOf(day) + 1} | [L55](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:55) |
| Dynamic copy / value | {group} | [L60](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:60) |
| Visible text | All muscles | [L60](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:60) |
| Visible text | Selected exercises | [L64](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:64) |
| Dynamic copy / value | {results.length} exercises | [L64](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:64) |
| Label / supplied copy | Create exercise | [L65](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:65) |
| Visible text | No matching exercises | [L67](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:67) |
| Visible text | Try another name or muscle group, or create your own exercise. | [L67](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:67) |
| Label / supplied copy | Show all muscles | `picker.group` · [L68](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:68) |
| Accessibility / spoken copy | {item.name}, already added | [L72](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:72) |
| Accessibility / spoken copy | {item.name} | [L72](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:72) |
| Accessibility / spoken copy | , already added | `added` · [L72](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:72) |
| Dynamic copy / value | {item.name} | [L75](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:75) |
| Visible text | Already added | [L75](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:75) |
| Dynamic copy / value | {getMuscleGroupForExercise(item)} · {item.equipment} | [L75](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:75) |
| Dynamic copy / value | {getMuscleGroupForExercise(item)} | [L75](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:75) |
| Label / supplied copy | Browse all exercises | `picker.selected.length; picker.selected.length → selectedOnly` · [L83](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:83) |
| Dynamic copy / value | View selected ({picker.selected.length}) | `picker.selected.length; picker.selected.length → otherwise: selectedOnly` · [L83](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:83) |
| Label / supplied copy | Clear | `picker.selected.length` · [L84](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:84) |
| Dynamic copy / value | Add {picker.selected.length} exercise | `picker.selected.length` · [L86](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:86) |
| Dynamic copy / value | Add {picker.selected.length} exercises | `picker.selected.length` · [L86](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:86) |
| Label / supplied copy | Select exercises to add | `otherwise: picker.selected.length` · [L86](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:86) |
| Label / supplied copy | exercise | `picker.selected.length → picker.selected.length === 1` · [L86](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:86) |
| Label / supplied copy | exercises | `picker.selected.length → otherwise: picker.selected.length === 1` · [L86](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx:86) |

<a id="source-app-custom-split-index-tsx"></a>

### Create / edit a split

Source: [app/custom-split/index.tsx](/Users/satwikmekala/stackv3/app/custom-split/index.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Validation / error | This split link is invalid. | `target !== null && (!Number.isSafeInteger(target) \|\| target <= 0)` · [L48](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:48) |
| Validation / error | This split is no longer saved on this device. | `saved → target !== null` · [L63](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:63) |
| Status / announcement | Could not open this split. | `!cancelled → otherwise: e instanceof Error` · [L69](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:69) |
| Label / supplied copy | Review split | `Platform.OS === 'ios'` · [L83](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:83) |
| Label / supplied copy | Edit split | `state.editingSplitId !== null` · [L84](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:84) |
| Label / supplied copy | New split | `otherwise: state.editingSplitId !== null` · [L84](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:84) |
| Label / supplied copy | Back | `otherwise: Platform.OS === 'ios'; Platform.OS === 'ios'` · [L86](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:86) |
| Label / supplied copy | Back to your splits | `Platform.OS === 'ios'` · [L89](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:89) |
| Dynamic copy / value | {error} | `loading \|\| !state.hydrated \|\| !workout \|\| !state.draft \|\| error → error \|\| state.storageError` · [L101](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:101) |
| Dynamic copy / value | {state.storageError} | `loading \|\| !state.hydrated \|\| !workout \|\| !state.draft \|\| error → error \|\| state.storageError; state.storageError` · [L101](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:101) |
| Label / supplied copy | Try again | `loading \|\| !state.hydrated \|\| !workout \|\| !state.draft \|\| error → error \|\| state.storageError` · [L101](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:101) |
| Accessibility / spoken copy | Loading your split | `loading \|\| !state.hydrated \|\| !workout \|\| !state.draft \|\| error → otherwise: error \|\| state.storageError` · [L101](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:101) |
| Dynamic copy / value | Day {index + 1} | [L105](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:105) |
| Alert / confirmation | Delete {title}? | `!workout.exercises.length` · [L111](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:111) |
| Alert / confirmation | This removes the day from your draft. Saved workout history stays intact. | `!workout.exercises.length` · [L111](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:111) |
| Label / supplied copy | Cancel | `!workout.exercises.length` · [L111](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:111) |
| Label / supplied copy | Delete day | `!workout.exercises.length; state.draft!.workouts.length > 1` · [L111](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:111) |
| Alert / confirmation | Finish your other draft first | `state.drafts.new` · [L115](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:115) |
| Alert / confirmation | Your new split draft is also saved. Finish or discard it in Your Splits before recovering this edit as a new split. | `state.drafts.new` · [L115](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:115) |
| Accessibility / spoken copy | Day {dayIndex + 1}, {getWorkoutDisplayName(day)} | [L125](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:125) |
| Accessibility / spoken copy | Day {dayIndex + 1}, No exercises yet | [L125](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:125) |
| Accessibility / spoken copy | No exercises yet | [L125](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:125) |
| Dynamic copy / value | Day {dayIndex + 1} | [L129](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:129) |
| Label / supplied copy | Add day | [L131](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:131) |
| Label / supplied copy | Retry saving draft | `state.storageError` · [L138](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:138) |
| Visible text | Your saved split changed | `conflict` · [L139](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:139) |
| Visible text | This draft is safe. Save it as a new split to keep both versions. | `conflict` · [L139](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:139) |
| Label / supplied copy | Recover as new split | `conflict` · [L139](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:139) |
| Label / supplied copy | Discard this draft | `conflict` · [L139](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:139) |
| Alert / confirmation | Discard this draft? | `conflict` · [L139](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:139) |
| Alert / confirmation | Your saved split and workout history stay intact. | `conflict` · [L139](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:139) |
| Label / supplied copy | Keep draft | `conflict` · [L140](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:140) |
| Label / supplied copy | Discard | `conflict` · [L140](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:140) |
| Dynamic copy / value | {state.draft.name} · Day {index + 1} of {state.draft.workouts.length} | [L143](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:143) |
| Dynamic copy / value | {title} | [L144](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:144) |
| Label / supplied copy | Settings | [L146](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:146) |
| Accessibility / spoken copy | More actions for {title} | [L148](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:148) |
| Label / supplied copy | Duplicate day | [L151](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:151) |
| Visible text | Your day. Your lifts. | `otherwise: workout.exercises.length` · [L164](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:164) |
| Visible text | Add the exercises you want to train, in the order you want to do them. | `otherwise: workout.exercises.length` · [L165](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:165) |
| Label / supplied copy | Use a Stack workout | `otherwise: workout.exercises.length` · [L166](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:166) |
| Dynamic copy / value | {undo.exercise.name} removed | `undo && undo.dayId === workout.id` · [L168](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:168) |
| Label / supplied copy | Undo | `undo && undo.dayId === workout.id` · [L169](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:169) |
| Label / supplied copy | Add exercises | [L172](/Users/satwikmekala/stackv3/app/custom-split/index.tsx:172) |

<a id="source-app-custom-split-new-exercise-tsx"></a>

### Create a custom exercise

Source: [app/custom-split/new-exercise.tsx](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Barbell | [L43](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:43) |
| Label / supplied copy | Dumbbell | [L44](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:44) |
| Label / supplied copy | Cable | [L45](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:45) |
| Label / supplied copy | Machine | [L46](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:46) |
| Label / supplied copy | No equipment | [L47](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:47) |
| Label / supplied copy | None | [L47](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:47) |
| Label / supplied copy | External weight | [L54](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:54) |
| Label / supplied copy | Bodyweight | [L55](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:55) |
| Label / supplied copy | Reps | [L58](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:58) |
| Label / supplied copy | reps | [L58](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:58) |
| Label / supplied copy | Time | [L59](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:59) |
| Dynamic copy / value | {label} | [L71](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:71) |
| Accessibility / spoken copy | {item.label} | [L77](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:77) |
| Dynamic copy / value | ✓ {item.label} | [L87](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:87) |
| Dynamic copy / value | {item.label} | [L87](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:87) |
| Status / announcement | That draft workout is no longer available. | `!targetWorkoutExists \|\| !workoutId` · [L128](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:128) |
| Status / announcement | An exercise with this name already exists. | `existing; message.toLowerCase().includes('unique constraint')` · [L139](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:139) |
| Status / announcement | Couldn’t add this exercise. Please try again. | `exerciseId === undefined; otherwise: message.toLowerCase().includes('unique constraint')` · [L153](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:153) |
| Validation / error | The new exercise could not be loaded. | `!createdExercise` · [L159](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:159) |
| Label / supplied copy | Create exercise | [L181](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:181) |
| Label / supplied copy | Cancel | [L181](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:181) |
| Visible text | Create your lift. | [L194](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:194) |
| Visible text | Saved to your library for every split. | [L194](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:194) |
| Visible text | NAME | [L196](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:196) |
| Accessibility / spoken copy | Exercise name | [L198](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:198) |
| Label / supplied copy | Exercise name | [L209](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:209) |
| Visible text | PRIMARY MUSCLE | [L216](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:216) |
| Accessibility / spoken copy | {group} | [L223](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:223) |
| Dynamic copy / value | ✓ {group} | [L235](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:235) |
| Dynamic copy / value | {group} | [L235](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:235) |
| Visible text | EQUIPMENT | [L243](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:243) |
| Label / supplied copy | LOAD | [L273](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:273) |
| Label / supplied copy | MEASURE | [L279](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:279) |
| Visible text | These choices set how Stack logs this exercise. | [L285](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:285) |
| Dynamic copy / value | {error} | `error` · [L288](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:288) |
| Accessibility / spoken copy | Create exercise | [L294](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:294) |
| Visible text | Creating… | [L301](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:301) |
| Visible text | Create exercise | [L301](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx:301) |

<a id="source-app-custom-split-personalize-tsx"></a>

### Split day settings / personalization

Source: [app/custom-split/personalize.tsx](/Users/satwikmekala/stackv3/app/custom-split/personalize.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Settings | [L21](/Users/satwikmekala/stackv3/app/custom-split/personalize.tsx:21) |
| Label / supplied copy | Done | [L21](/Users/satwikmekala/stackv3/app/custom-split/personalize.tsx:21) |
| Visible text | Day name | `day` · [L26](/Users/satwikmekala/stackv3/app/custom-split/personalize.tsx:26) |
| Accessibility / spoken copy | Workout name | `day` · [L27](/Users/satwikmekala/stackv3/app/custom-split/personalize.tsx:27) |
| Dynamic copy / value | {getWorkoutDisplayName(day)} | `day` · [L28](/Users/satwikmekala/stackv3/app/custom-split/personalize.tsx:28) |
| Label / supplied copy | Day name | `day` · [L28](/Users/satwikmekala/stackv3/app/custom-split/personalize.tsx:28) |
| Visible text | Leave blank to use the muscles you’re training. | `day` · [L30](/Users/satwikmekala/stackv3/app/custom-split/personalize.tsx:30) |
| Visible text | Muscle colors | `day` · [L34](/Users/satwikmekala/stackv3/app/custom-split/personalize.tsx:34) |
| Visible text | Each muscle’s color applies across the app, including workout cards and the workout logger. Changes save immediately. | `day` · [L35](/Users/satwikmekala/stackv3/app/custom-split/personalize.tsx:35) |
| Visible text | Add exercises to choose their muscle colors. | `day → !muscles.length` · [L36](/Users/satwikmekala/stackv3/app/custom-split/personalize.tsx:36) |
| Visible text | Could not load your colors. | `day → colors.error` · [L38](/Users/satwikmekala/stackv3/app/custom-split/personalize.tsx:38) |
| Visible text | Could not save that color. Your previous choice is still applied. | `day → colors.error` · [L38](/Users/satwikmekala/stackv3/app/custom-split/personalize.tsx:38) |
| Label / supplied copy | Retry colors | `colors.error → colors.error === 'load'` · [L39](/Users/satwikmekala/stackv3/app/custom-split/personalize.tsx:39) |
| Dynamic copy / value | {workoutMeta[type].shortLabel} | `day` · [L43](/Users/satwikmekala/stackv3/app/custom-split/personalize.tsx:43) |
| Accessibility / spoken copy | {workoutMeta[type].shortLabel} color | `day` · [L44](/Users/satwikmekala/stackv3/app/custom-split/personalize.tsx:44) |
| Accessibility / spoken copy | {workoutMeta[type].shortLabel}: {MUSCLE_COLOR_PALETTE[color].name} | `day` · [L48](/Users/satwikmekala/stackv3/app/custom-split/personalize.tsx:48) |
| Accessibility / spoken copy | {workoutMeta[type].shortLabel}: Default | `day` · [L48](/Users/satwikmekala/stackv3/app/custom-split/personalize.tsx:48) |
| Accessibility / spoken copy | Default | `day → otherwise: color` · [L48](/Users/satwikmekala/stackv3/app/custom-split/personalize.tsx:48) |
| Dynamic copy / value | {MUSCLE_COLOR_PALETTE[color].name} | `day` · [L54](/Users/satwikmekala/stackv3/app/custom-split/personalize.tsx:54) |
| Visible text | Default | `day` · [L54](/Users/satwikmekala/stackv3/app/custom-split/personalize.tsx:54) |
| Visible text | This day is no longer available. | `otherwise: day` · [L61](/Users/satwikmekala/stackv3/app/custom-split/personalize.tsx:61) |
| Label / supplied copy | Back to split | `otherwise: day` · [L61](/Users/satwikmekala/stackv3/app/custom-split/personalize.tsx:61) |

<a id="source-app-custom-split-review-tsx"></a>

### Review / save a split

Source: [app/custom-split/review.tsx](/Users/satwikmekala/stackv3/app/custom-split/review.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Alert / confirmation | Discard this draft? | [L37](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:37) |
| Alert / confirmation | This removes your unfinished changes. Your saved split and workout history stay intact. | [L37](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:37) |
| Label / supplied copy | Keep building | [L38](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:38) |
| Label / supplied copy | Discard draft | `Platform.OS === 'ios'; otherwise: Platform.OS === 'ios'` · [L38](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:38) |
| Alert / confirmation | Delete “{draft.name}”? | [L47](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:47) |
| Alert / confirmation | This deletes the saved split and its unfinished changes. Your completed workout history stays intact. | [L47](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:47) |
| Label / supplied copy | Cancel | `draft.workouts.length > 1 → !day.exercises.length` · [L48](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:48) |
| Label / supplied copy | Delete split | `Platform.OS === 'ios' → editing; otherwise: Platform.OS === 'ios' → editing` · [L48](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:48) |
| Validation / error | Could not delete this split. Your draft is still here. Try again. | `await getCustomSplitDetailAsync(splitId)` · [L55](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:55) |
| Status / announcement | Could not delete this split. Try again. | `otherwise: e instanceof Error` · [L58](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:58) |
| Label / supplied copy | Review split | [L65](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:65) |
| Label / supplied copy | Back | `Platform.OS === 'ios'` · [L68](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:68) |
| Label / supplied copy | Back to edit split | `Platform.OS === 'ios'` · [L68](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:68) |
| Label / supplied copy | Split actions | `Platform.OS === 'ios'` · [L71](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:71) |
| Label / supplied copy | ellipsis | `Platform.OS === 'ios'` · [L72](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:72) |
| Label / supplied copy | trash | `Platform.OS === 'ios' → editing` · [L76](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:76) |
| Accessibility / spoken copy | Split actions | `otherwise: Platform.OS === 'ios'` · [L80](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:80) |
| Label / supplied copy | Give your split a name. | `!draft?.name.trim()` · [L86](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:86) |
| Label / supplied copy | Add exercises to every day, or remove the days you don’t need. | `otherwise: !draft?.name.trim() → draft.workouts.some(day => !day.exercises.length)` · [L86](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:86) |
| Validation / error | The saved split changed while you were editing. Recover this draft as a new split to keep your work. | `state.editingSplitId !== null → !saved \|\| splitRevision(saved) !== state.sourceRevision` · [L94](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:94) |
| Dynamic copy / value | Day {index + 1} | `draft` · [L98](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:98) |
| Validation / error | Could not save your split. Your draft is still here. Try again. | `!success` · [L104](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:104) |
| Status / announcement | Could not save your split. Try again. | `otherwise: e instanceof Error` · [L109](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:109) |
| Visible text | Ready to update? | `draft` · [L117](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:117) |
| Visible text | Ready to stack? | `draft` · [L117](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:117) |
| Visible text | Check your days in workout order, then save your split. | `draft` · [L118](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:118) |
| Visible text | Split name | `draft` · [L121](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:121) |
| Accessibility / spoken copy | Split name | `draft` · [L122](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:122) |
| Label / supplied copy | Name your split | `draft` · [L123](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:123) |
| Dynamic copy / value | {draft.workouts.length} day · {draft.workouts.reduce((total, day) =&gt; total + day.exercises.length, 0)} exercises | `draft` · [L124](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:124) |
| Dynamic copy / value | {draft.workouts.length} days · {draft.workouts.reduce((total, day) =&gt; total + day.exercises.length, 0)} exercises | `draft` · [L124](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:124) |
| Dynamic copy / value | DAY {index + 1} | `draft` · [L129](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:129) |
| Dynamic copy / value | {getWorkoutDisplayName(day)} | `draft` · [L130](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:130) |
| Accessibility / spoken copy | Reorder or remove day {index + 1} | `draft → draft.workouts.length > 1` · [L132](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:132) |
| Label / supplied copy | Move up | `draft.workouts.length > 1 → index > 0` · [L135](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:135) |
| Label / supplied copy | Move down | `draft.workouts.length > 1 → index < draft.workouts.length - 1` · [L136](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:136) |
| Label / supplied copy | Remove day | `draft.workouts.length > 1 → draft.workouts.length > 1; draft.workouts.length > 1 → !day.exercises.length` · [L137](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:137) |
| Alert / confirmation | Remove day {index + 1}? | `draft.workouts.length > 1 → !day.exercises.length` · [L139](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:139) |
| Alert / confirmation | This removes the day and its exercises from your draft. | `draft.workouts.length > 1 → !day.exercises.length` · [L139](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:139) |
| Dynamic copy / value | {String(position + 1).padStart(2, '0')} | `draft → day.exercises.length` · [L146](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:146) |
| Dynamic copy / value | {exercise.name} | `draft → day.exercises.length` · [L147](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:147) |
| Visible text | This day needs exercises before you can save. | `draft → otherwise: day.exercises.length` · [L148](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:148) |
| Label / supplied copy | Edit day | `draft; draft → day.exercises.length` · [L149](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:149) |
| Label / supplied copy | Add exercises | `draft; draft → otherwise: day.exercises.length` · [L149](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:149) |
| Dynamic copy / value | Edit day {index + 1} | `draft` · [L149](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:149) |
| Visible text | Your draft stays on this device until you save or discard it. | `draft` · [L152](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:152) |
| Dynamic copy / value | {error} | `draft → error \|\| invalid \|\| state.storageError` · [L155](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:155) |
| Dynamic copy / value | {invalid} | `draft → error \|\| invalid \|\| state.storageError` · [L155](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:155) |
| Dynamic copy / value | {state.storageError} | `draft → error \|\| invalid \|\| state.storageError` · [L155](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:155) |
| Label / supplied copy | Recover as new split | `draft → conflict` · [L156](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:156) |
| Status / announcement | Finish or discard your other new split draft in Your Splits first. Both drafts are safe. | `conflict → state.drafts.new` · [L158](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:158) |
| Label / supplied copy | Deleting… | `draft; draft → deleting` · [L161](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:161) |
| Label / supplied copy | Saving… | `draft; otherwise: deleting → saving` · [L161](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:161) |
| Label / supplied copy | Save changes | `draft; otherwise: saving → editing` · [L161](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:161) |
| Label / supplied copy | Save & use split | `draft; otherwise: saving → otherwise: editing` · [L161](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:161) |
| Label / supplied copy | Save for later | `draft → !editing && state.source !== 'onboarding'` · [L162](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:162) |
| Visible text | Your split has been saved or closed. | `otherwise: draft` · [L164](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:164) |
| Label / supplied copy | Your splits | `otherwise: draft` · [L164](/Users/satwikmekala/stackv3/app/custom-split/review.tsx:164) |

<a id="source-app-custom-split-template-tsx"></a>

### Use a Stack workout template

Source: [app/custom-split/template.tsx](/Users/satwikmekala/stackv3/app/custom-split/template.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Stack workouts | [L28](/Users/satwikmekala/stackv3/app/custom-split/template.tsx:28) |
| Label / supplied copy | Cancel | [L28](/Users/satwikmekala/stackv3/app/custom-split/template.tsx:28) |
| Visible text | A starting point. | [L30](/Users/satwikmekala/stackv3/app/custom-split/template.tsx:30) |
| Visible text | Pick a workout. Add it to your day, then make it yours. | [L30](/Users/satwikmekala/stackv3/app/custom-split/template.tsx:30) |
| Accessibility / spoken copy | {ARCHETYPE_COMPOSITIONS[type].shortLabel} | [L32](/Users/satwikmekala/stackv3/app/custom-split/template.tsx:32) |
| Dynamic copy / value | {ARCHETYPE_COMPOSITIONS[type].shortLabel} | [L34](/Users/satwikmekala/stackv3/app/custom-split/template.tsx:34) |
| Dynamic copy / value | {ARCHETYPE_COMPOSITIONS[archetype].shortLabel} | [L37](/Users/satwikmekala/stackv3/app/custom-split/template.tsx:37) |
| Dynamic copy / value | {exercises.length} exercises · Preview | [L38](/Users/satwikmekala/stackv3/app/custom-split/template.tsx:38) |
| Dynamic copy / value | {String(position + 1).padStart(2, '0')} | [L40](/Users/satwikmekala/stackv3/app/custom-split/template.tsx:40) |
| Dynamic copy / value | {exercise.name} | [L40](/Users/satwikmekala/stackv3/app/custom-split/template.tsx:40) |
| Visible text | This template is unavailable. Choose another workout or add your own exercises. | `!exercises.length` · [L42](/Users/satwikmekala/stackv3/app/custom-split/template.tsx:42) |
| Visible text | This day already has exercises. Start with an empty day to use a Stack workout. | `day?.exercises.length` · [L44](/Users/satwikmekala/stackv3/app/custom-split/template.tsx:44) |
| Label / supplied copy | Use this workout | [L46](/Users/satwikmekala/stackv3/app/custom-split/template.tsx:46) |

<a id="source-app-import-split-tsx"></a>

### Shared routine import

Source: [app/import-split.tsx](/Users/satwikmekala/stackv3/app/import-split.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Status / announcement | Could not keep your shared routine. Try again. | `focused.current` · [L54](/Users/satwikmekala/stackv3/app/import-split.tsx:54) |
| Status / announcement | Could not save your choice. Try again. | `focused.current` · [L75](/Users/satwikmekala/stackv3/app/import-split.tsx:75) |
| Status / announcement | Couldn't add this split. Please try again. | `focused.current → otherwise: failure instanceof SplitImportError` · [L93](/Users/satwikmekala/stackv3/app/import-split.tsx:93) |
| Status / announcement | Could not open your routine. Try again. | `focused.current` · [L107](/Users/satwikmekala/stackv3/app/import-split.tsx:107) |
| Accessibility / spoken copy | Back | [L114](/Users/satwikmekala/stackv3/app/import-split.tsx:114) |
| Visible text | SHARED SPLIT | [L118](/Users/satwikmekala/stackv3/app/import-split.tsx:118) |
| Visible text | Can't open this Stack split. | `!parsed.ok` · [L123](/Users/satwikmekala/stackv3/app/import-split.tsx:123) |
| Dynamic copy / value | {parsed.error.message} | `!parsed.ok` · [L124](/Users/satwikmekala/stackv3/app/import-split.tsx:124) |
| Label / supplied copy | Back to Stack | `!parsed.ok` · [L125](/Users/satwikmekala/stackv3/app/import-split.tsx:125) |
| Visible text | Added to Stack | `otherwise: !parsed.ok → saved` · [L130](/Users/satwikmekala/stackv3/app/import-split.tsx:130) |
| Dynamic copy / value | {saved.name} | `otherwise: !parsed.ok → saved` · [L131](/Users/satwikmekala/stackv3/app/import-split.tsx:131) |
| Visible text | Your own editable copy is in Your Splits. Choose when to train with it. | `otherwise: !parsed.ok → saved` · [L132](/Users/satwikmekala/stackv3/app/import-split.tsx:132) |
| Visible text | Your own editable copy is saved. Finish setting up Stack to find it in Your Splits. | `otherwise: !parsed.ok → saved` · [L132](/Users/satwikmekala/stackv3/app/import-split.tsx:132) |
| Dynamic copy / value | {error} | `saved → error; otherwise: saved → error` · [L135](/Users/satwikmekala/stackv3/app/import-split.tsx:135) |
| Label / supplied copy | Use this routine | `saved → ONBOARDING_PREVIEW_ENABLED && profile?.onboardingCompleted` · [L136](/Users/satwikmekala/stackv3/app/import-split.tsx:136) |
| Label / supplied copy | View split | `saved → profile?.onboardingCompleted` · [L137](/Users/satwikmekala/stackv3/app/import-split.tsx:137) |
| Dynamic copy / value | {ONBOARDING_PREVIEW_ENABLED} | `saved → profile?.onboardingCompleted` · [L137](/Users/satwikmekala/stackv3/app/import-split.tsx:137) |
| Label / supplied copy | Save for later | `otherwise: !parsed.ok → saved; profile?.onboardingCompleted → ONBOARDING_PREVIEW_ENABLED` · [L138](/Users/satwikmekala/stackv3/app/import-split.tsx:138) |
| Label / supplied copy | Done | `otherwise: !parsed.ok → saved; profile?.onboardingCompleted → otherwise: ONBOARDING_PREVIEW_ENABLED` · [L138](/Users/satwikmekala/stackv3/app/import-split.tsx:138) |
| Label / supplied copy | Continue to Stack | `otherwise: !parsed.ok → saved; saved → otherwise: profile?.onboardingCompleted` · [L138](/Users/satwikmekala/stackv3/app/import-split.tsx:138) |
| Dynamic copy / value | {Boolean(profile?.onboardingCompleted)} | `otherwise: !parsed.ok → saved` · [L139](/Users/satwikmekala/stackv3/app/import-split.tsx:139) |
| Dynamic copy / value | {parsed.value.name} | `otherwise: !parsed.ok → otherwise: saved` · [L144](/Users/satwikmekala/stackv3/app/import-split.tsx:144) |
| Dynamic copy / value | {parsed.value.workouts.length} workout · {parsed.value.workouts.reduce((total, workout) =&gt; total + workout.exercises.length, 0)} exercises | `otherwise: !parsed.ok → otherwise: saved` · [L145](/Users/satwikmekala/stackv3/app/import-split.tsx:145) |
| Dynamic copy / value | {parsed.value.workouts.length} workouts · {parsed.value.workouts.reduce((total, workout) =&gt; total + workout.exercises.length, 0)} exercises | `otherwise: !parsed.ok → otherwise: saved` · [L145](/Users/satwikmekala/stackv3/app/import-split.tsx:145) |
| Visible text | Add your own copy, then edit it to suit you. You'll use your own weights, history and settings. | `otherwise: !parsed.ok → otherwise: saved` · [L146](/Users/satwikmekala/stackv3/app/import-split.tsx:146) |
| Dynamic copy / value | {String(index + 1).padStart(2, '0')} | `otherwise: !parsed.ok → otherwise: saved` · [L150](/Users/satwikmekala/stackv3/app/import-split.tsx:150) |
| Dynamic copy / value | {workout.name} | `otherwise: !parsed.ok → otherwise: saved` · [L151](/Users/satwikmekala/stackv3/app/import-split.tsx:151) |
| Dynamic copy / value | Workout {String.fromCharCode(65 + index)} | `otherwise: !parsed.ok → otherwise: saved` · [L151](/Users/satwikmekala/stackv3/app/import-split.tsx:151) |
| Visible text | No exercises yet | `otherwise: saved → workout.exercises.length === 0` · [L153](/Users/satwikmekala/stackv3/app/import-split.tsx:153) |
| Dynamic copy / value | {exercise.name} | `otherwise: !parsed.ok → otherwise: saved` · [L156](/Users/satwikmekala/stackv3/app/import-split.tsx:156) |
| Dynamic copy / value | {['Custom', exercise.primaryMuscle, exercise.equipment, exercise.loadType === 'external_weight' ? 'Weight' : null, exercise.metric === 'duration' ? 'Duration' : 'Reps'].filter(Boolean).join(' · ')} | `otherwise: saved → exercise.kind === 'custom'` · [L157](/Users/satwikmekala/stackv3/app/import-split.tsx:157) |
| Label / supplied copy | Adding… | `otherwise: !parsed.ok → otherwise: saved; otherwise: saved → saving` · [L169](/Users/satwikmekala/stackv3/app/import-split.tsx:169) |
| Label / supplied copy | Add to Stack | `otherwise: !parsed.ok → otherwise: saved; otherwise: saved → otherwise: saving` · [L169](/Users/satwikmekala/stackv3/app/import-split.tsx:169) |
| Visible text | Saves to Your Splits. Your active program stays the same. | `otherwise: !parsed.ok → otherwise: saved` · [L170](/Users/satwikmekala/stackv3/app/import-split.tsx:170) |
| Label / supplied copy | Cancel | `otherwise: !parsed.ok → otherwise: saved` · [L171](/Users/satwikmekala/stackv3/app/import-split.tsx:171) |
| Dynamic copy / value | {label} | [L185](/Users/satwikmekala/stackv3/app/import-split.tsx:185) |

<a id="source-app-your-splits-tsx"></a>

### Your Splits / routine library

Source: [app/your-splits.tsx](/Users/satwikmekala/stackv3/app/your-splits.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Status / announcement | Could not load your splits. Try again. | `mounted; error` · [L34](/Users/satwikmekala/stackv3/app/your-splits.tsx:34) |
| Visible text | BY STACK | [L52](/Users/satwikmekala/stackv3/app/your-splits.tsx:52) |
| Label / supplied copy | Stack’s plan | [L53](/Users/satwikmekala/stackv3/app/your-splits.tsx:53) |
| Visible text | Stack’s plan | [L56](/Users/satwikmekala/stackv3/app/your-splits.tsx:56) |
| Visible text | A workout sequence that follows your training preferences. | [L57](/Users/satwikmekala/stackv3/app/your-splits.tsx:57) |
| Dynamic copy / value | Edit program · {getProgramFrequency(state.profile)} workouts per week | [L58](/Users/satwikmekala/stackv3/app/your-splits.tsx:58) |
| Label / supplied copy | Edit program · 3 workouts per week | [L58](/Users/satwikmekala/stackv3/app/your-splits.tsx:58) |
| Alert / confirmation | Delete “{name}”? | [L63](/Users/satwikmekala/stackv3/app/your-splits.tsx:63) |
| Alert / confirmation | Your completed workout history will remain. Any unfinished edit can be recovered as a new split. | [L63](/Users/satwikmekala/stackv3/app/your-splits.tsx:63) |
| Label / supplied copy | Cancel | [L64](/Users/satwikmekala/stackv3/app/your-splits.tsx:64) |
| Label / supplied copy | Delete split | [L64](/Users/satwikmekala/stackv3/app/your-splits.tsx:64) |
| Status / announcement | Could not delete this split. Try again. | [L65](/Users/satwikmekala/stackv3/app/your-splits.tsx:65) |
| Label / supplied copy | Your splits | [L69](/Users/satwikmekala/stackv3/app/your-splits.tsx:69) |
| Label / supplied copy | Back | [L71](/Users/satwikmekala/stackv3/app/your-splits.tsx:71) |
| Visible text | Make it your own. | [L73](/Users/satwikmekala/stackv3/app/your-splits.tsx:73) |
| Visible text | Use Stack’s workouts, choose a saved routine, or train as you go. | [L73](/Users/satwikmekala/stackv3/app/your-splits.tsx:73) |
| Accessibility / spoken copy | Loading your splits | `loading \|\| !draftStore.hydrated` · [L74](/Users/satwikmekala/stackv3/app/your-splits.tsx:74) |
| Dynamic copy / value | {error} | `error` · [L75](/Users/satwikmekala/stackv3/app/your-splits.tsx:75) |
| Label / supplied copy | Try again | `error` · [L75](/Users/satwikmekala/stackv3/app/your-splits.tsx:75) |
| Dynamic copy / value | {draftStore.storageError} | `draftStore.storageError` · [L76](/Users/satwikmekala/stackv3/app/your-splits.tsx:76) |
| Label / supplied copy | Retry drafts | `draftStore.storageError` · [L76](/Users/satwikmekala/stackv3/app/your-splits.tsx:76) |
| Visible text | PICK UP WHERE YOU LEFT OFF | `draftStore.drafts.new` · [L78](/Users/satwikmekala/stackv3/app/your-splits.tsx:78) |
| Dynamic copy / value | {draftStore.drafts.new.draft.name} | `draftStore.drafts.new` · [L78](/Users/satwikmekala/stackv3/app/your-splits.tsx:78) |
| Visible text | Your draft is saved on this device. | `draftStore.drafts.new` · [L79](/Users/satwikmekala/stackv3/app/your-splits.tsx:79) |
| Label / supplied copy | Continue building | `draftStore.drafts.new` · [L79](/Users/satwikmekala/stackv3/app/your-splits.tsx:79) |
| Dynamic copy / value | YOUR LIBRARY · {summaries.length} | `summaries.length` · [L82](/Users/satwikmekala/stackv3/app/your-splits.tsx:82) |
| Visible text | CURRENT SPLIT | [L89](/Users/satwikmekala/stackv3/app/your-splits.tsx:89) |
| Visible text | SAVED SPLIT | [L89](/Users/satwikmekala/stackv3/app/your-splits.tsx:89) |
| Dynamic copy / value | {split.name} | [L92](/Users/satwikmekala/stackv3/app/your-splits.tsx:92) |
| Dynamic copy / value | {split.workoutCount} day · {split.exerciseCount} exercises | [L93](/Users/satwikmekala/stackv3/app/your-splits.tsx:93) |
| Dynamic copy / value | {split.workoutCount} days · {split.exerciseCount} exercises | [L93](/Users/satwikmekala/stackv3/app/your-splits.tsx:93) |
| Dynamic copy / value | Day {index + 1} · {day.name} | `detail?.workouts.length` · [L95](/Users/satwikmekala/stackv3/app/your-splits.tsx:95) |
| Dynamic copy / value | Day {index + 1} · Needs exercises | `detail?.workouts.length` · [L95](/Users/satwikmekala/stackv3/app/your-splits.tsx:95) |
| Visible text | Unfinished changes · not applied yet | `draft` · [L97](/Users/satwikmekala/stackv3/app/your-splits.tsx:97) |
| Label / supplied copy | Continue editing | `draft` · [L100](/Users/satwikmekala/stackv3/app/your-splits.tsx:100) |
| Label / supplied copy | Edit split | `otherwise: draft` · [L100](/Users/satwikmekala/stackv3/app/your-splits.tsx:100) |
| Dynamic copy / value | Edit {split.name} | [L101](/Users/satwikmekala/stackv3/app/your-splits.tsx:101) |
| Accessibility / spoken copy | More actions for {split.name} | [L102](/Users/satwikmekala/stackv3/app/your-splits.tsx:102) |
| Visible text | CURRENT · NO PROGRAM | `programMode === 'none'` · [L112](/Users/satwikmekala/stackv3/app/your-splits.tsx:112) |
| Visible text | Start workouts as you go. Your saved routines stay in your library. | [L113](/Users/satwikmekala/stackv3/app/your-splits.tsx:113) |
| Label / supplied copy | Train without a program | [L114](/Users/satwikmekala/stackv3/app/your-splits.tsx:114) |
| Dynamic copy / value | {draft.draft.name} | [L117](/Users/satwikmekala/stackv3/app/your-splits.tsx:117) |
| Visible text | The original split is unavailable. Your unfinished draft is safe. | [L117](/Users/satwikmekala/stackv3/app/your-splits.tsx:117) |
| Label / supplied copy | Recover draft | [L117](/Users/satwikmekala/stackv3/app/your-splits.tsx:117) |
| Visible text | Build a split that fits. | `!loading && !summaries.length && !draftStore.drafts.new` · [L118](/Users/satwikmekala/stackv3/app/your-splits.tsx:118) |
| Visible text | Arrange your favorite lifts into days. Stack takes care of what’s next. | `!loading && !summaries.length && !draftStore.drafts.new` · [L118](/Users/satwikmekala/stackv3/app/your-splits.tsx:118) |
| Label / supplied copy | Create split | `otherwise: draftStore.drafts.new` · [L120](/Users/satwikmekala/stackv3/app/your-splits.tsx:120) |

<a id="source-components-saveadhocroutine-tsx"></a>

### Save Adhoc Routine

Source: [components/SaveAdhocRoutine.tsx](/Users/satwikmekala/stackv3/components/SaveAdhocRoutine.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Visible text | Routine saved | [L23](/Users/satwikmekala/stackv3/components/SaveAdhocRoutine.tsx:23) |
| Visible text | Save as routine | [L23](/Users/satwikmekala/stackv3/components/SaveAdhocRoutine.tsx:23) |
| Accessibility / spoken copy | Close save routine | [L27](/Users/satwikmekala/stackv3/components/SaveAdhocRoutine.tsx:27) |
| Visible text | Save these exercises in order. Your current routine stays active. | [L30](/Users/satwikmekala/stackv3/components/SaveAdhocRoutine.tsx:30) |
| Accessibility / spoken copy | Routine name | [L31](/Users/satwikmekala/stackv3/components/SaveAdhocRoutine.tsx:31) |
| Label / supplied copy | Workout | [L32](/Users/satwikmekala/stackv3/components/SaveAdhocRoutine.tsx:32) |
| Dynamic copy / value | {error} | `error` · [L34](/Users/satwikmekala/stackv3/components/SaveAdhocRoutine.tsx:34) |
| Status / announcement | Enter a routine name. | `!name.trim()` · [L36](/Users/satwikmekala/stackv3/components/SaveAdhocRoutine.tsx:36) |
| Status / announcement | Could not save. Please try again. | `save(session.id, name) !== undefined` · [L38](/Users/satwikmekala/stackv3/components/SaveAdhocRoutine.tsx:38) |
| Visible text | Save routine | [L40](/Users/satwikmekala/stackv3/components/SaveAdhocRoutine.tsx:40) |
| Visible text | Cancel | [L42](/Users/satwikmekala/stackv3/components/SaveAdhocRoutine.tsx:42) |

<a id="source-components-splitsharebutton-tsx"></a>

### Split Share Button

Source: [components/SplitShareButton.tsx](/Users/satwikmekala/stackv3/components/SplitShareButton.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Alert / confirmation | Can't share this split | [L18](/Users/satwikmekala/stackv3/components/SplitShareButton.tsx:18) |
| Alert / confirmation | Please try again. | `otherwise: error instanceof Error` · [L18](/Users/satwikmekala/stackv3/components/SplitShareButton.tsx:18) |
| Accessibility / spoken copy | Share Split: {name} | [L25](/Users/satwikmekala/stackv3/components/SplitShareButton.tsx:25) |
| Visible text | Sharing… | [L30](/Users/satwikmekala/stackv3/components/SplitShareButton.tsx:30) |
| Visible text | Share | [L30](/Users/satwikmekala/stackv3/components/SplitShareButton.tsx:30) |
| Visible text | Share Split | [L30](/Users/satwikmekala/stackv3/components/SplitShareButton.tsx:30) |

<a id="source-components-custom-split-selectedexerciselist-tsx"></a>

### Selected Exercise List

Source: [components/custom-split/SelectedExerciseList.tsx](/Users/satwikmekala/stackv3/components/custom-split/SelectedExerciseList.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | EXERCISES · {exercises.length} | [L101](/Users/satwikmekala/stackv3/components/custom-split/SelectedExerciseList.tsx:101) |
| Visible text | Hold the grip to reorder. | [L101](/Users/satwikmekala/stackv3/components/custom-split/SelectedExerciseList.tsx:101) |
| Status / announcement | {exercise.name}, position {next + 1} of {count} | [L148](/Users/satwikmekala/stackv3/components/custom-split/SelectedExerciseList.tsx:148) |
| Accessibility / spoken copy | Reorder {exercise.name}, position {index + 1} of {count} | [L152](/Users/satwikmekala/stackv3/components/custom-split/SelectedExerciseList.tsx:152) |
| Accessibility / spoken copy | Drag to reorder, or use Move up and Move down | [L153](/Users/satwikmekala/stackv3/components/custom-split/SelectedExerciseList.tsx:153) |
| Label / supplied copy | decrement | `index > 0` · [L154](/Users/satwikmekala/stackv3/components/custom-split/SelectedExerciseList.tsx:154) |
| Label / supplied copy | Move up | `index > 0` · [L154](/Users/satwikmekala/stackv3/components/custom-split/SelectedExerciseList.tsx:154) |
| Label / supplied copy | increment | `index < count - 1` · [L155](/Users/satwikmekala/stackv3/components/custom-split/SelectedExerciseList.tsx:155) |
| Label / supplied copy | Move down | `index < count - 1` · [L155](/Users/satwikmekala/stackv3/components/custom-split/SelectedExerciseList.tsx:155) |
| Dynamic copy / value | {exercise.name} | [L158](/Users/satwikmekala/stackv3/components/custom-split/SelectedExerciseList.tsx:158) |
| Dynamic copy / value | {getMuscleGroupForExercise(exercise)} | [L159](/Users/satwikmekala/stackv3/components/custom-split/SelectedExerciseList.tsx:159) |
| Accessibility / spoken copy | Actions for {exercise.name} | [L161](/Users/satwikmekala/stackv3/components/custom-split/SelectedExerciseList.tsx:161) |
| Label / supplied copy | Remove exercise | [L165](/Users/satwikmekala/stackv3/components/custom-split/SelectedExerciseList.tsx:165) |

<a id="source-components-custom-split-splitactivationpill-tsx"></a>

### Split Activation Pill

Source: [components/custom-split/SplitActivationPill.tsx](/Users/satwikmekala/stackv3/components/custom-split/SplitActivationPill.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Visible text | In use | [L11](/Users/satwikmekala/stackv3/components/custom-split/SplitActivationPill.tsx:11) |
| Visible text | Activate | [L11](/Users/satwikmekala/stackv3/components/custom-split/SplitActivationPill.tsx:11) |
| Accessibility / spoken copy | {name} is in use | `active` · [L13](/Users/satwikmekala/stackv3/components/custom-split/SplitActivationPill.tsx:13) |
| Accessibility / spoken copy | Activate {name} | [L14](/Users/satwikmekala/stackv3/components/custom-split/SplitActivationPill.tsx:14) |
| Accessibility / spoken copy | Use this split for your upcoming workouts | [L15](/Users/satwikmekala/stackv3/components/custom-split/SplitActivationPill.tsx:15) |

<a id="source-components-custom-split-showactions-ts"></a>

### show Actions

Source: [components/custom-split/showActions.ts](/Users/satwikmekala/stackv3/components/custom-split/showActions.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Cancel | `Platform.OS === 'ios'` · [L12](/Users/satwikmekala/stackv3/components/custom-split/showActions.ts:12) |

<a id="source-components-custom-split-ui-tsx"></a>

### ui

Source: [components/custom-split/ui.tsx](/Users/satwikmekala/stackv3/components/custom-split/ui.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Accessibility / spoken copy | {label} | [L10](/Users/satwikmekala/stackv3/components/custom-split/ui.tsx:10) |
| Accessibility / spoken copy | {title} | [L10](/Users/satwikmekala/stackv3/components/custom-split/ui.tsx:10) |
| Dynamic copy / value | {title} | `!expanded; expanded` · [L15](/Users/satwikmekala/stackv3/components/custom-split/ui.tsx:15) |

<a id="source-features-sharing-customsplitadapter-ts"></a>

### custom Split Adapter

Source: [features/sharing/customSplitAdapter.ts](/Users/satwikmekala/stackv3/features/sharing/customSplitAdapter.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | reps | `otherwise: !exercise.isCustom && builtInExerciseNames.has(exercise.name)` · [L45](/Users/satwikmekala/stackv3/features/sharing/customSplitAdapter.ts:45) |

<a id="source-features-sharing-sharesavedsplit-ts"></a>

### share Saved Split

Source: [features/sharing/shareSavedSplit.ts](/Users/satwikmekala/stackv3/features/sharing/shareSavedSplit.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Validation / error | This split is no longer saved on this device. | `!split` · [L7](/Users/satwikmekala/stackv3/features/sharing/shareSavedSplit.ts:7) |

<a id="source-features-sharing-sharesplit-ts"></a>

### share Split

Source: [features/sharing/shareSplit.ts](/Users/satwikmekala/stackv3/features/sharing/shareSplit.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | This split is too large to share as a link. Try sharing a smaller split with fewer workouts or exercises. | `url.length > MAX_SPLIT_SHARE_URL_LENGTH` · [L27](/Users/satwikmekala/stackv3/features/sharing/shareSplit.ts:27) |
| Dynamic copy / value | {portable.name.trim()}<br><br>Shared from Stack<br><br>{url} | [L32](/Users/satwikmekala/stackv3/features/sharing/shareSplit.ts:32) |

<a id="source-features-sharing-splitprotocol-ts"></a>

### split Protocol

Source: [features/sharing/splitProtocol.ts](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | reps | `own(record, 'metric') === undefined` · [L45](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:45) |
| Label / supplied copy | Barbell | [L49](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:49) |
| Label / supplied copy | Dumbbell | [L49](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:49) |
| Label / supplied copy | Cable | [L49](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:49) |
| Label / supplied copy | Machine | [L49](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:49) |
| Label / supplied copy | The shared split could not be read. | [L204](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:204) |
| Dynamic copy / value | {path} must be a string. | `typeof value !== 'string'` · [L236](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:236) |
| Dynamic copy / value | {path} cannot be empty. | `!allowEmpty && text.length === 0` · [L238](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:238) |
| Dynamic copy / value | {path} is longer than {maxLength} characters. | `text.length > maxLength` · [L240](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:240) |
| Dynamic copy / value | {path} contains characters that are not allowed. | `FORBIDDEN_CHARACTERS.test(text) \|\| hasLoneSurrogate(text)` · [L243](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:243) |
| Dynamic copy / value | {path} must be one of: {allowed.join(', ')}. | `typeof value !== 'string' \|\| !(allowed as readonly string[]).includes(value)` · [L254](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:254) |
| Dynamic copy / value | {path} must be an object. | `!isPlainObject(value)` · [L282](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:282) |
| Dynamic copy / value | {path} must be a list. | `!Array.isArray(value)` · [L287](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:287) |
| Dynamic copy / value | {path}.kind must be "builtin" or "custom". | [L325](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:325) |
| Label / supplied copy | A split needs at least one workout. | `workoutValues.length === 0` · [L354](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:354) |
| Dynamic copy / value | A split can share at most {SHARED_SPLIT_LIMITS.maxWorkouts} workouts. | `workoutValues.length > SHARED_SPLIT_LIMITS.maxWorkouts` · [L356](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:356) |
| Dynamic copy / value | A workout can share at most {SHARED_SPLIT_LIMITS.maxExercisesPerWorkout} exercises. | `exerciseValues.length > SHARED_SPLIT_LIMITS.maxExercisesPerWorkout` · [L374](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:374) |
| Label / supplied copy | An empty workout needs a name. | `exerciseValues.length === 0 && workoutName.length === 0` · [L379](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:379) |
| Dynamic copy / value | A split can share at most {SHARED_SPLIT_LIMITS.maxTotalExercises} exercises. | `total > SHARED_SPLIT_LIMITS.maxTotalExercises` · [L385](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:385) |
| Dynamic copy / value | "{exercise.name}" appears twice in one workout. | `seen.has(key)` · [L396](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:396) |
| Dynamic copy / value | "{exercise.name}" refers to two different exercises in this split. | `!known → !sameExerciseIdentity(known, exercise)` · [L408](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:408) |
| Label / supplied copy | A split needs at least one exercise. | `total === 0` · [L417](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:417) |
| Dynamic copy / value | Shared splits are limited to {SHARED_SPLIT_LIMITS.maxPayloadBytes} bytes. | `json.length > SHARED_SPLIT_LIMITS.maxPayloadBytes \|\| utf8ByteLength(json) > SHARED_SPLIT_LIMITS.maxPayloadBytes` · [L481](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:481) |
| Dynamic copy / value | "{type.slice(0, 40)}" is not a shared split this version of Stack understands. | `type !== SHARED_SPLIT_TYPE → typeof type === 'string'` · [L546](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:546) |
| Label / supplied copy | This is not a shared Stack split. | `type !== SHARED_SPLIT_TYPE → otherwise: typeof type === 'string'` · [L547](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:547) |
| Label / supplied copy | The shared split has no version. | `version === undefined` · [L552](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:552) |
| Label / supplied copy | The shared split version is invalid. | `typeof version !== 'number' \|\| !Number.isSafeInteger(version) \|\| version < 1` · [L554](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:554) |
| Label / supplied copy | This split was shared from a newer version of Stack. Update Stack to open it. | `!SUPPORTED_SHARED_SPLIT_VERSIONS.includes(version as number) → (version as number) > SHARED_SPLIT_VERSION` · [L560](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:560) |
| Label / supplied copy | This shared split version is no longer supported. | `!SUPPORTED_SHARED_SPLIT_VERSIONS.includes(version as number) → otherwise: (version as number) > SHARED_SPLIT_VERSION` · [L561](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:561) |
| Dynamic copy / value | A split can share at most {SHARED_SPLIT_LIMITS.maxCustomExercises} custom exercises. | `customValues.length > SHARED_SPLIT_LIMITS.maxCustomExercises` · [L575](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:575) |
| Dynamic copy / value | {path}.equipment is required (use null for none). | `own(record, 'equipment') === undefined` · [L586](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:586) |
| Dynamic copy / value | "{name}" is defined more than once. | `definitions.has(key)` · [L590](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:590) |
| Label / supplied copy | name | [L613](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:613) |
| Dynamic copy / value | "{name}" does not exactly match its custom definition "{definition.name}". | `definition.name !== name` · [L624](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:624) |
| Dynamic copy / value | "{definition.name}" is defined but never used. | `!referenced.has(key)` · [L637](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:637) |
| Label / supplied copy | The shared split must be JSON text. | `typeof json !== 'string'` · [L649](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:649) |
| Label / supplied copy | The shared split is not valid JSON. | [L655](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:655) |
| Dynamic copy / value | The field "{duplicate.slice(0, 40)}" appears more than once. | `duplicate !== null` · [L659](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts:659) |

<a id="source-features-sharing-splittransport-ts"></a>

### split Transport

Source: [features/sharing/splitTransport.ts](/Users/satwikmekala/stackv3/features/sharing/splitTransport.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | The shared split link is empty or malformed. | `typeof token !== 'string' \|\| token.length === 0` · [L142](/Users/satwikmekala/stackv3/features/sharing/splitTransport.ts:142) |
| Label / supplied copy | The shared split is too large. | `token.length > MAX_SHARED_SPLIT_TOKEN_LENGTH` · [L145](/Users/satwikmekala/stackv3/features/sharing/splitTransport.ts:145) |
| Label / supplied copy | The shared split link is corrupted. | `!bytes; json === null` · [L149](/Users/satwikmekala/stackv3/features/sharing/splitTransport.ts:149) |

## Settings, preferences, data management and help

Settings includes its root list plus Name, Weekly goal, Training schedule, Automatic program, Weight unit, Weight adjustments, Manage data and Help & About. The exact data-deletion action is **Delete all data**.

<a id="source-app-settings-tsx"></a>

### Settings and all settings pages

Source: [app/settings.tsx](/Users/satwikmekala/stackv3/app/settings.tsx).

This route delegates its wording to the shared sources linked in the screen map; it defines no additional literal copy.

<a id="source-features-settings-settingsscreen-ios-tsx"></a>

### Settings Screen

Source: [features/settings/SettingsScreen.ios.tsx](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.ios.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {text} | [L20](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.ios.tsx:20) |
| Dynamic copy / value | {row.label} | `row.kind === 'toggle'; row.kind === 'link'; row.kind === 'info'; row.kind === 'choice'` · [L20](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.ios.tsx:20) |
| Accessibility / spoken copy | {row.label}, {row.value} | `row.kind === 'link'` · [L29](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.ios.tsx:29) |
| Accessibility / spoken copy | {row.label} | `row.kind === 'link'; row.kind === 'choice'` · [L29](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.ios.tsx:29) |
| Accessibility / spoken copy | , {row.value} | `row.kind === 'link' → row.value` · [L29](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.ios.tsx:29) |
| Dynamic copy / value | {row.value} | `row.kind === 'link' → row.value; row.kind === 'info' → row.value` · [L34](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.ios.tsx:34) |
| Accessibility / spoken copy | {row.label}, selected | `row.kind === 'choice'` · [L42](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.ios.tsx:42) |
| Accessibility / spoken copy | , selected | `row.kind === 'choice' → row.selected` · [L42](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.ios.tsx:42) |
| Dynamic copy / value | {section.title} | [L55](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.ios.tsx:55) |
| Dynamic copy / value | {section.footer} | `section.footer` · [L56](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.ios.tsx:56) |
| Label / supplied copy | Settings | `otherwise: model.page` · [L69](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.ios.tsx:69) |
| Label / supplied copy | Back | [L70](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.ios.tsx:70) |
| Label / supplied copy | Done | `model.page === 'name'` · [L76](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.ios.tsx:76) |
| Label / supplied copy | Save name | `model.page === 'name'` · [L76](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.ios.tsx:76) |

<a id="source-features-settings-settingsscreen-tsx"></a>

### Settings Screen

Source: [features/settings/SettingsScreen.tsx](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {row.label} | `row.kind === 'input'` · [L16](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.tsx:16) |
| Accessibility / spoken copy | {row.label} | `row.kind === 'toggle'; row.kind === 'input'` · [L17](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.tsx:17) |
| Dynamic copy / value | {row.value} | `(row.kind === 'link' \|\| row.kind === 'info') && row.value` · [L18](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.tsx:18) |
| Accessibility / spoken copy | {row.label}, {row.value} | [L29](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.tsx:29) |
| Accessibility / spoken copy | , {row.value} | `row.kind === 'link' && row.value` · [L29](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.tsx:29) |
| Accessibility / spoken copy | Back | [L37](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.tsx:37) |
| Dynamic copy / value | {SETTINGS_TITLES[model.page]} | [L38](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.tsx:38) |
| Visible text | Settings | [L38](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.tsx:38) |
| Accessibility / spoken copy | Save name | `model.page === 'name'` · [L39](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.tsx:39) |
| Visible text | Done | `model.page === 'name'` · [L42](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.tsx:42) |
| Dynamic copy / value | {section.title} | `section.title` · [L47](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.tsx:47) |
| Dynamic copy / value | {section.footer} | `section.footer` · [L49](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.tsx:49) |

<a id="source-features-settings-data-ts"></a>

### data

Source: [features/settings/data.ts](/Users/satwikmekala/stackv3/features/settings/data.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Validation / error | Finish or discard your active workout first. | `useWorkoutStore.getState().currentSession` · [L25](/Users/satwikmekala/stackv3/features/settings/data.ts:25) |
| Validation / error | This backup is missing its preferences. | `!value \|\| typeof value !== 'object' \|\| Array.isArray(value)` · [L35](/Users/satwikmekala/stackv3/features/settings/data.ts:35) |
| Validation / error | This backup has invalid preferences. | `!Object.hasOwn(prefs, key) \|\| (prefs[key] !== null && typeof prefs[key] !== 'string')` · [L38](/Users/satwikmekala/stackv3/features/settings/data.ts:38) |
| Validation / error | File sharing is unavailable on this device. | `!(await Sharing.isAvailableAsync())` · [L71](/Users/satwikmekala/stackv3/features/settings/data.ts:71) |
| Label / supplied copy | Save your Stack data | [L75](/Users/satwikmekala/stackv3/features/settings/data.ts:75) |
| Validation / error | Wait for your preferences to finish saving. | `useMuscleColors.getState().saving \|\| useLiftProgressPreferences.getState().saving` · [L85](/Users/satwikmekala/stackv3/features/settings/data.ts:85) |
| Validation / error | This file is too large to be a Stack backup. | `file.result.size > 50 * 1024 * 1024` · [L97](/Users/satwikmekala/stackv3/features/settings/data.ts:97) |
| Validation / error | Choose a valid Stack backup file. | [L99](/Users/satwikmekala/stackv3/features/settings/data.ts:99) |
| Validation / error | Your data could not be deleted. Try again. | `useWorkoutStore.getState().profile` · [L131](/Users/satwikmekala/stackv3/features/settings/data.ts:131) |

<a id="source-features-settings-usesettings-ts"></a>

### use Settings

Source: [features/settings/useSettings.ts](/Users/satwikmekala/stackv3/features/settings/useSettings.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Name | `!page` · [L16](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:16) |
| Label / supplied copy | Weekly goal | `!page` · [L16](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:16) |
| Label / supplied copy | Training schedule | `!page` · [L16](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:16) |
| Label / supplied copy | Automatic program | `page === 'schedule'` · [L16](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:16) |
| Label / supplied copy | Weight unit | `!page` · [L17](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:17) |
| Label / supplied copy | Weight adjustments | `!page` · [L17](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:17) |
| Label / supplied copy | Manage data | `!page` · [L17](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:17) |
| Label / supplied copy | Help & About | `!page` · [L17](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:17) |
| Alert / confirmation | Couldn’t complete that | [L63](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:63) |
| Alert / confirmation | Please try again. | `otherwise: error instanceof Error` · [L63](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:63) |
| Validation / error | Your preference couldn’t be saved. Please try again. | `!(await saveAppPreference(key, value))` · [L68](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:68) |
| Alert / confirmation | Restore this backup? | [L81](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:81) |
| Alert / confirmation | This replaces your workouts, routines, notes and preferences with the backup. Export a backup of your current data first if you want to keep it. | [L82](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:82) |
| Label / supplied copy | Cancel | [L83](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:83) |
| Label / supplied copy | Restore | [L83](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:83) |
| Alert / confirmation | Backup restored | [L84](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:84) |
| Alert / confirmation | Your Stack data is ready. | [L84](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:84) |
| Alert / confirmation | Delete all data? | [L88](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:88) |
| Alert / confirmation | All workouts, routines, notes, records and preferences will be removed from this device. This cannot be undone. Export a backup first if you want to keep them. | [L89](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:89) |
| Label / supplied copy | Delete all data | `page === 'data'` · [L90](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:90) |
| Label / supplied copy | Please wait… | `busy === id` · [L97](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:97) |
| Label / supplied copy | Personal | `!page` · [L106](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:106) |
| Label / supplied copy | Add name | `!page` · [L107](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:107) |
| Dynamic copy / value | {profile.weeklyGoal} day | `!page → profile.weeklyGoal > 0` · [L108](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:108) |
| Dynamic copy / value | {profile.weeklyGoal} days | `!page → profile.weeklyGoal > 0` · [L108](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:108) |
| Label / supplied copy | None | `!page → otherwise: profile.weeklyGoal > 0` · [L108](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:108) |
| Dynamic copy / value | {profile.trainingDays.length} planned days | `!page → profile.trainingDays.length` · [L109](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:109) |
| Label / supplied copy | Flexible | `!page → otherwise: profile.trainingDays.length` · [L109](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:109) |
| Label / supplied copy | Workout | `!page` · [L111](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:111) |
| Dynamic copy / value | {profile.weightIncrement} {profile.weightUnit} | `!page` · [L113](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:113) |
| Dynamic copy / value | {profile.weightIncrementLbs} {profile.weightUnit} | `!page` · [L113](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:113) |
| Label / supplied copy | Live Activities | `!page` · [L114](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:114) |
| Label / supplied copy | Haptic feedback | `!page` · [L117](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:117) |
| Label / supplied copy | Open iPhone Settings | `!page → availability === 'denied'` · [L119](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:119) |
| Label / supplied copy | Live Activities show your active workout on the Lock Screen and Dynamic Island. | `!page → availability === 'available'` · [L120](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:120) |
| Label / supplied copy | Live Activities are disabled in iPhone Settings. | `otherwise: availability === 'available' → availability === 'denied'` · [L121](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:121) |
| Label / supplied copy | Live Activities are available on supported iPhones. | `otherwise: availability === 'denied' → availability === 'unsupported'` · [L122](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:122) |
| Label / supplied copy | Live Activities are unavailable in this app build. | `otherwise: availability === 'denied' → otherwise: availability === 'unsupported'` · [L122](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:122) |
| Label / supplied copy | Experience | `!page → BUILD_SANDBOX_ENABLED` · [L123](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:123) |
| Label / supplied copy | Reduce effects | `!page → BUILD_SANDBOX_ENABLED` · [L124](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:124) |
| Label / supplied copy | Use simpler Stack previews and skip celebrations. System Reduce Motion is always respected. | `!page → BUILD_SANDBOX_ENABLED` · [L126](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:126) |
| Label / supplied copy | Your workout preferences couldn’t be read. Retry before making changes. | `!page → preferences.error` · [L128](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:128) |
| Label / supplied copy | Retry loading preferences | `!page → preferences.error` · [L129](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:129) |
| Label / supplied copy | The name used in your Stack greeting. | `page === 'name'` · [L131](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:131) |
| Label / supplied copy | Your name | `page === 'name'` · [L132](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:132) |
| Label / supplied copy | Each day with a completed workout counts once, even if you train twice. Changing your goal keeps your program and planned days as they are. | `page === 'goal'` · [L134](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:134) |
| Label / supplied copy | No weekly goal | `page === 'goal'` · [L135](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:135) |
| Dynamic copy / value | {value} day per week | `page === 'goal'` · [L136](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:136) |
| Dynamic copy / value | {value} days per week | `page === 'goal'` · [L136](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:136) |
| Label / supplied copy | Planned days | `page === 'schedule'` · [L139](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:139) |
| Label / supplied copy | Choose days to see them marked in Progress and date your next automatic workout. Leave every day off for a flexible schedule. You can train on any day. | `page === 'schedule'` · [L139](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:139) |
| Label / supplied copy | Your weekly goal is separate from your workout program. | `page === 'schedule'` · [L146](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:146) |
| Dynamic copy / value | {getProgramFrequency(profile)} workouts | `page === 'schedule'` · [L146](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:146) |
| Label / supplied copy | Workouts per week | `page === 'program'` · [L149](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:149) |
| Label / supplied copy | Changes update the upcoming automatic workout queue. Your active workout and history are preserved. | `page === 'program' → profile.programMode === 'stack'` · [L150](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:150) |
| Label / supplied copy | These preferences apply when you use Stack’s automatic program. Your current program choice stays as it is. | `page === 'program' → otherwise: profile.programMode === 'stack'` · [L151](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:151) |
| Dynamic copy / value | {value} workout | `page === 'program'` · [L152](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:152) |
| Dynamic copy / value | {value} workouts | `page === 'program'` · [L152](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:152) |
| Label / supplied copy | Three day program | `page === 'program'` · [L153](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:153) |
| Label / supplied copy | This choice applies when Stack plans three workouts per week. | `page === 'program'` · [L153](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:153) |
| Label / supplied copy | Full body | `page === 'program'` · [L154](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:154) |
| Label / supplied copy | Push / Pull / Legs | `page === 'program'` · [L155](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:155) |
| Label / supplied copy | The default for new workouts, Progress, records and reports. You can choose a different unit for an exercise while logging. Recorded weights are preserved. | `page === 'unit'` · [L158](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:158) |
| Label / supplied copy | kg | `page === 'unit'; page === 'adjustments'` · [L159](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:159) |
| Label / supplied copy | Kilograms · kg | `page === 'unit'` · [L159](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:159) |
| Label / supplied copy | lbs | `page === 'unit'; page === 'adjustments'` · [L160](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:160) |
| Label / supplied copy | Pounds · lbs | `page === 'unit'` · [L160](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:160) |
| Label / supplied copy | Kilograms | `page === 'adjustments' → unit === 'kg'` · [L163](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:163) |
| Label / supplied copy | Pounds | `page === 'adjustments' → otherwise: unit === 'kg'` · [L163](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:163) |
| Dynamic copy / value | {value} {unit} | `page === 'adjustments'` · [L164](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:164) |
| Label / supplied copy | The + and − buttons use the step for the exercise’s unit, including in Live Activities. These steps do not change progression suggestions or completed sets. | `page === 'adjustments' → unit === 'lbs'` · [L167](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:167) |
| Label / supplied copy | Export | `page === 'data'` · [L171](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:171) |
| Label / supplied copy | Export workout history | `page === 'data'` · [L172](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:172) |
| Label / supplied copy | A CSV of completed workouts and set values for spreadsheets. Timed sets keep their duration in seconds; weights are in kilograms. | `page === 'data'` · [L173](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:173) |
| Label / supplied copy | Backup | `page === 'data'` · [L174](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:174) |
| Label / supplied copy | Export backup | `page === 'data'` · [L175](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:175) |
| Label / supplied copy | Restore backup | `page === 'data'` · [L176](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:176) |
| Label / supplied copy | Finish or discard your active workout before backing up, restoring or deleting data. | `page === 'data' → activeWorkout` · [L177](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:177) |
| Label / supplied copy | Backups include your workouts, saved routines, exercise notes and preferences. Unsaved routine drafts are excluded. Save the file in Files or your preferred storage. Restoring replaces the data on this device and clears drafts. | `page === 'data' → otherwise: activeWorkout` · [L178](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:178) |
| Label / supplied copy | Removes all Stack data from this device and returns to setup. | `page === 'data'` · [L180](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:180) |
| Label / supplied copy | Stack | [L183](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:183) |
| Dynamic copy / value | {version} ({build}) | `build` · [L183](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:183) |
| Label / supplied copy | How your Stack grows | `ONBOARDING_PREVIEW_ENABLED` · [L184](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:184) |
| Label / supplied copy | Logging workouts | [L185](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:185) |
| Label / supplied copy | Stack restores previous set values when available. New automatic sets repeat what you just logged. Saved and edited targets are preserved. Tap a “Try” suggestion to choose an increase; completed sets never increase the next load automatically. | [L185](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:185) |
| Label / supplied copy | Your week | [L186](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:186) |
| Dynamic copy / value | Your goal measures training days. Your schedule marks preferred days ({trainingDaysLabel(profile.trainingDays)}). Your automatic program chooses what to train. Each can be changed independently. | [L186](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:186) |
| Label / supplied copy | Your data | [L187](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:187) |
| Label / supplied copy | Workout data is stored on this device. Stack does not currently sync it to a cloud account. Exports and backups are shared only when you choose to share them. Live Activities can show workout information on your Lock Screen. | [L187](/Users/satwikmekala/stackv3/features/settings/useSettings.ts:187) |

## Workout recap, reports, PDF exports and sharing

<a id="source-app-workout-summary-tsx"></a>

### Workout completion / saved recap

Source: [app/workout-summary.tsx](/Users/satwikmekala/stackv3/app/workout-summary.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Accessibility / spoken copy | {completed} of {goal} weekly training days completed | [L83](/Users/satwikmekala/stackv3/app/workout-summary.tsx:83) |
| Dynamic copy / value | {completed} / {goal} | [L100](/Users/satwikmekala/stackv3/app/workout-summary.tsx:100) |
| Visible text | How it felt | [L123](/Users/satwikmekala/stackv3/app/workout-summary.tsx:123) |
| Dynamic copy / value | {intensitySummaryLabel(summary.intensity)} | [L124](/Users/satwikmekala/stackv3/app/workout-summary.tsx:124) |
| Visible text | Bonus sets | `specialLabel` · [L131](/Users/satwikmekala/stackv3/app/workout-summary.tsx:131) |
| Accessibility / spoken copy | {specialLabel.toLowerCase()} | `specialLabel` · [L132](/Users/satwikmekala/stackv3/app/workout-summary.tsx:132) |
| Dynamic copy / value | {specialLabel} | `specialLabel` · [L133](/Users/satwikmekala/stackv3/app/workout-summary.tsx:133) |
| Visible text | This week | `showWeeklyGoal && weeklyGoal > 0` · [L144](/Users/satwikmekala/stackv3/app/workout-summary.tsx:144) |
| Accessibility / spoken copy | {exercise.name}. {performance.value}. {performance.context}. New best. Previous top set: {previousText}. | [L174](/Users/satwikmekala/stackv3/app/workout-summary.tsx:174) |
| Accessibility / spoken copy | {exercise.name}. {performance.value}. {performance.context}. New best. | [L174](/Users/satwikmekala/stackv3/app/workout-summary.tsx:174) |
| Accessibility / spoken copy | {exercise.name}. {performance.value}. {performance.context}. Previous top set: {previousText}. | [L174](/Users/satwikmekala/stackv3/app/workout-summary.tsx:174) |
| Accessibility / spoken copy | {exercise.name}. {performance.value}. {performance.context}. | [L174](/Users/satwikmekala/stackv3/app/workout-summary.tsx:174) |
| Accessibility / spoken copy | New best. | `detail?.hasRecord` · [L174](/Users/satwikmekala/stackv3/app/workout-summary.tsx:174) |
| Accessibility / spoken copy | Previous top set: {previousText}. | `previousText` · [L174](/Users/satwikmekala/stackv3/app/workout-summary.tsx:174) |
| Accessibility / spoken copy | Hide set details | `expanded` · [L175](/Users/satwikmekala/stackv3/app/workout-summary.tsx:175) |
| Accessibility / spoken copy | Show every logged set | `otherwise: expanded` · [L175](/Users/satwikmekala/stackv3/app/workout-summary.tsx:175) |
| Dynamic copy / value | {exercise.name} | [L184](/Users/satwikmekala/stackv3/app/workout-summary.tsx:184) |
| Dynamic copy / value | {performance.value} | [L189](/Users/satwikmekala/stackv3/app/workout-summary.tsx:189) |
| Dynamic copy / value | {performance.context} | [L191](/Users/satwikmekala/stackv3/app/workout-summary.tsx:191) |
| Visible text | New best | `detail?.hasRecord` · [L194](/Users/satwikmekala/stackv3/app/workout-summary.tsx:194) |
| Dynamic copy / value | Prev {previousText} | `previousText` · [L197](/Users/satwikmekala/stackv3/app/workout-summary.tsx:197) |
| Dynamic copy / value | Set {set.ordinal} | `expanded` · [L204](/Users/satwikmekala/stackv3/app/workout-summary.tsx:204) |
| Dynamic copy / value | Set {set.ordinal} · PR | `expanded` · [L204](/Users/satwikmekala/stackv3/app/workout-summary.tsx:204) |
| Dynamic copy / value | Set {set.ordinal} · Drop | `expanded` · [L204](/Users/satwikmekala/stackv3/app/workout-summary.tsx:204) |
| Dynamic copy / value | Set {set.ordinal} · Extra | `expanded` · [L204](/Users/satwikmekala/stackv3/app/workout-summary.tsx:204) |
| Dynamic copy / value | {set.text} | `expanded` · [L205](/Users/satwikmekala/stackv3/app/workout-summary.tsx:205) |
| Visible text | EXERCISES COMPLETED | [L222](/Users/satwikmekala/stackv3/app/workout-summary.tsx:222) |
| Visible text | No exercise sets were logged for this workout. | `summary.exercises.length === 0` · [L223](/Users/satwikmekala/stackv3/app/workout-summary.tsx:223) |
| Accessibility / spoken copy | Close workout summary | `Platform.OS === 'ios'; otherwise: Platform.OS === 'ios' → otherwise: openedFromHistory` · [L248](/Users/satwikmekala/stackv3/app/workout-summary.tsx:248) |
| Accessibility / spoken copy | Return to Train | `Platform.OS === 'ios'; otherwise: openedFromHistory` · [L249](/Users/satwikmekala/stackv3/app/workout-summary.tsx:249) |
| Visible text | Summary unavailable | [L278](/Users/satwikmekala/stackv3/app/workout-summary.tsx:278) |
| Visible text | This completed workout could not be found, but your other workout history is safe. | [L279](/Users/satwikmekala/stackv3/app/workout-summary.tsx:279) |
| Visible text | Back to home | [L287](/Users/satwikmekala/stackv3/app/workout-summary.tsx:287) |
| Dynamic copy / value | Workout {getWorkoutLetter(label.position)} | [L337](/Users/satwikmekala/stackv3/app/workout-summary.tsx:337) |
| Dynamic copy / value | {exercise.setCount} SET | [L382](/Users/satwikmekala/stackv3/app/workout-summary.tsx:382) |
| Dynamic copy / value | {exercise.setCount} SETS | [L382](/Users/satwikmekala/stackv3/app/workout-summary.tsx:382) |
| Label / supplied copy | SET | `exercise.setCount === 1` · [L382](/Users/satwikmekala/stackv3/app/workout-summary.tsx:382) |
| Label / supplied copy | SETS | `otherwise: exercise.setCount === 1` · [L382](/Users/satwikmekala/stackv3/app/workout-summary.tsx:382) |
| Dynamic copy / value | {formatSummaryNumber(Math.round(displayVolume(exercise.volumeKg, weightUnit)))} {unitLabel(weightUnit).toUpperCase()} | `exercise.volumeKg > 0` · [L384](/Users/satwikmekala/stackv3/app/workout-summary.tsx:384) |
| Dynamic copy / value | {exercise.repCount} REPS | `otherwise: exercise.volumeKg > 0 → exercise.repCount > 0` · [L385](/Users/satwikmekala/stackv3/app/workout-summary.tsx:385) |
| Dynamic copy / value | {sets} · {amount} | `amount` · [L390](/Users/satwikmekala/stackv3/app/workout-summary.tsx:390) |
| Alert / confirmation | Couldn’t share workout | `Platform.OS === 'web'` · [L424](/Users/satwikmekala/stackv3/app/workout-summary.tsx:424) |
| Alert / confirmation | Open Stack on your phone to share your workout as a PDF. | `Platform.OS === 'web'` · [L424](/Users/satwikmekala/stackv3/app/workout-summary.tsx:424) |
| Visible text | WORKOUT SAVED | [L464](/Users/satwikmekala/stackv3/app/workout-summary.tsx:464) |
| Visible text | WORKOUT COMPLETE | [L464](/Users/satwikmekala/stackv3/app/workout-summary.tsx:464) |
| Dynamic copy / value | {summary.title} | [L468](/Users/satwikmekala/stackv3/app/workout-summary.tsx:468) |
| Dynamic copy / value | {formatSummaryDate(summary.date)} | [L469](/Users/satwikmekala/stackv3/app/workout-summary.tsx:469) |
| Dynamic copy / value | {summary.exerciseCount} exercise · {summary.setCount} set · {report.durationLabel} | [L470](/Users/satwikmekala/stackv3/app/workout-summary.tsx:470) |
| Dynamic copy / value | {summary.exerciseCount} exercise · {summary.setCount} set | [L470](/Users/satwikmekala/stackv3/app/workout-summary.tsx:470) |
| Dynamic copy / value | {summary.exerciseCount} exercise · {summary.setCount} sets · {report.durationLabel} | [L470](/Users/satwikmekala/stackv3/app/workout-summary.tsx:470) |
| Dynamic copy / value | {summary.exerciseCount} exercise · {summary.setCount} sets | [L470](/Users/satwikmekala/stackv3/app/workout-summary.tsx:470) |
| Dynamic copy / value | {summary.exerciseCount} exercises · {summary.setCount} set · {report.durationLabel} | [L470](/Users/satwikmekala/stackv3/app/workout-summary.tsx:470) |
| Dynamic copy / value | {summary.exerciseCount} exercises · {summary.setCount} set | [L470](/Users/satwikmekala/stackv3/app/workout-summary.tsx:470) |
| Dynamic copy / value | {summary.exerciseCount} exercises · {summary.setCount} sets · {report.durationLabel} | [L470](/Users/satwikmekala/stackv3/app/workout-summary.tsx:470) |
| Dynamic copy / value | {summary.exerciseCount} exercises · {summary.setCount} sets | [L470](/Users/satwikmekala/stackv3/app/workout-summary.tsx:470) |
| Dynamic copy / value | {report.exercises.filter(exercise =&gt; exercise.hasRecord).length} new best this session | `report?.exercises.some(exercise => exercise.hasRecord)` · [L476](/Users/satwikmekala/stackv3/app/workout-summary.tsx:476) |
| Dynamic copy / value | {report.exercises.filter(exercise =&gt; exercise.hasRecord).length} new bests this session | `report?.exercises.some(exercise => exercise.hasRecord)` · [L476](/Users/satwikmekala/stackv3/app/workout-summary.tsx:476) |
| Visible text | TOTAL VOLUME LIFTED | `summary.volumeKg > 0` · [L486](/Users/satwikmekala/stackv3/app/workout-summary.tsx:486) |
| Dynamic copy / value | {formatSummaryNumber(displayedVolume)} {unitLabel(weightUnit)} | `summary.volumeKg > 0` · [L487](/Users/satwikmekala/stackv3/app/workout-summary.tsx:487) |
| Visible text | Weight × reps across logged sets | `summary.volumeKg > 0` · [L490](/Users/satwikmekala/stackv3/app/workout-summary.tsx:490) |
| Visible text | View progress | `!openedFromHistory` · [L509](/Users/satwikmekala/stackv3/app/workout-summary.tsx:509) |
| Accessibility / spoken copy | Share workout | [L540](/Users/satwikmekala/stackv3/app/workout-summary.tsx:540) |
| Accessibility / spoken copy | Copy a share card, or send the full workout as a PDF | [L541](/Users/satwikmekala/stackv3/app/workout-summary.tsx:541) |
| Visible text | Share | [L551](/Users/satwikmekala/stackv3/app/workout-summary.tsx:551) |
| Accessibility / spoken copy | Done | [L553](/Users/satwikmekala/stackv3/app/workout-summary.tsx:553) |
| Accessibility / spoken copy | Return to workout history | `openedFromHistory` · [L554](/Users/satwikmekala/stackv3/app/workout-summary.tsx:554) |
| Visible text | Done | [L558](/Users/satwikmekala/stackv3/app/workout-summary.tsx:558) |
| Dynamic copy / value | {shareDate} | [L569](/Users/satwikmekala/stackv3/app/workout-summary.tsx:569) |

<a id="source-components-sharesheet-tsx"></a>

### Share Sheet

Source: [components/ShareSheet.tsx](/Users/satwikmekala/stackv3/components/ShareSheet.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Stat Strip | [L59](/Users/satwikmekala/stackv3/components/ShareSheet.tsx:59) |
| Label / supplied copy | Lift Log | [L59](/Users/satwikmekala/stackv3/components/ShareSheet.tsx:59) |
| Label / supplied copy | The Stack | [L59](/Users/satwikmekala/stackv3/components/ShareSheet.tsx:59) |
| Validation / error | The share card is not ready to capture. | `!target` · [L165](/Users/satwikmekala/stackv3/components/ShareSheet.tsx:165) |
| Validation / error | The clipboard did not accept the image. | `Platform.OS !== 'web' && !(await Clipboard.hasImageAsync()) → !(await Clipboard.hasImageAsync())` · [L205](/Users/satwikmekala/stackv3/components/ShareSheet.tsx:205) |
| Label / supplied copy | Copied | `otherwise: isCopying → feedback === 'copied'` · [L250](/Users/satwikmekala/stackv3/components/ShareSheet.tsx:250) |
| Label / supplied copy | Try again | `otherwise: feedback === 'copied' → feedback === 'copyError'` · [L252](/Users/satwikmekala/stackv3/components/ShareSheet.tsx:252) |
| Label / supplied copy | Copy | `otherwise: feedback === 'copied' → otherwise: feedback === 'copyError'` · [L253](/Users/satwikmekala/stackv3/components/ShareSheet.tsx:253) |
| Accessibility / spoken copy | Close share sheet | [L264](/Users/satwikmekala/stackv3/components/ShareSheet.tsx:264) |
| Visible text | SHARE WORKOUT | [L278](/Users/satwikmekala/stackv3/components/ShareSheet.tsx:278) |
| Accessibility / spoken copy | Stat Strip design | [L297](/Users/satwikmekala/stackv3/components/ShareSheet.tsx:297) |
| Dynamic copy / value | {title} | `designs.includes('liftLog') && liftLog; designs.includes('poster') && posterLayers` · [L308](/Users/satwikmekala/stackv3/components/ShareSheet.tsx:308) |
| Dynamic copy / value | {date} | `designs.includes('liftLog') && liftLog; designs.includes('poster') && posterLayers` · [L309](/Users/satwikmekala/stackv3/components/ShareSheet.tsx:309) |
| Accessibility / spoken copy | Lift Log design | `designs.includes('liftLog') && liftLog` · [L325](/Users/satwikmekala/stackv3/components/ShareSheet.tsx:325) |
| Accessibility / spoken copy | The Stack design | `designs.includes('poster') && posterLayers` · [L350](/Users/satwikmekala/stackv3/components/ShareSheet.tsx:350) |
| Accessibility / spoken copy | {designName} design, {page + 1} of {designCount}. Swipe to change. | `designCount > 1` · [L380](/Users/satwikmekala/stackv3/components/ShareSheet.tsx:380) |
| Accessibility / spoken copy | {designName} copied to clipboard | `feedback === 'copied'` · [L400](/Users/satwikmekala/stackv3/components/ShareSheet.tsx:400) |
| Accessibility / spoken copy | Copy {designName} image to clipboard | `otherwise: feedback === 'copied'` · [L400](/Users/satwikmekala/stackv3/components/ShareSheet.tsx:400) |
| Dynamic copy / value | {copyLabel} | [L423](/Users/satwikmekala/stackv3/components/ShareSheet.tsx:423) |
| Accessibility / spoken copy | Share full workout report as PDF | `onSharePdf` · [L438](/Users/satwikmekala/stackv3/components/ShareSheet.tsx:438) |
| Accessibility / spoken copy | Opens the share sheet with every set as a PDF document | `onSharePdf` · [L439](/Users/satwikmekala/stackv3/components/ShareSheet.tsx:439) |
| Visible text | Preparing… | `onSharePdf` · [L455](/Users/satwikmekala/stackv3/components/ShareSheet.tsx:455) |
| Visible text | Try again | `onSharePdf` · [L455](/Users/satwikmekala/stackv3/components/ShareSheet.tsx:455) |
| Visible text | Share PDF | `onSharePdf` · [L455](/Users/satwikmekala/stackv3/components/ShareSheet.tsx:455) |

<a id="source-features-report-workoutreportsheet-tsx"></a>

### Workout Report Sheet

Source: [features/report/WorkoutReportSheet.tsx](/Users/satwikmekala/stackv3/features/report/WorkoutReportSheet.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Status / announcement | sharing | [L46](/Users/satwikmekala/stackv3/features/report/WorkoutReportSheet.tsx:46) |
| Status / announcement | idle | [L50](/Users/satwikmekala/stackv3/features/report/WorkoutReportSheet.tsx:50) |
| Status / announcement | error | [L55](/Users/satwikmekala/stackv3/features/report/WorkoutReportSheet.tsx:55) |
| Visible text | WORKOUT REPORT | [L70](/Users/satwikmekala/stackv3/features/report/WorkoutReportSheet.tsx:70) |
| Accessibility / spoken copy | Close workout report | [L73](/Users/satwikmekala/stackv3/features/report/WorkoutReportSheet.tsx:73) |
| Visible text | Couldn’t share the report. Try again. | `status === 'error'` · [L99](/Users/satwikmekala/stackv3/features/report/WorkoutReportSheet.tsx:99) |
| Accessibility / spoken copy | Share workout report | [L104](/Users/satwikmekala/stackv3/features/report/WorkoutReportSheet.tsx:104) |
| Visible text | Share PDF | `otherwise: status === 'sharing'` · [L112](/Users/satwikmekala/stackv3/features/report/WorkoutReportSheet.tsx:112) |

<a id="source-features-report-workoutreportview-tsx"></a>

### Workout Report View

Source: [features/report/WorkoutReportView.tsx](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {REPORT_SET_TAGS[set.kind]} | `set.kind !== 'working'; otherwise: set.record → set.kind !== 'working' && !set.skipped` · [L46](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:46) |
| Visible text | NEW BEST | `set.record` · [L52](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:52) |
| Dynamic copy / value | {part} | [L65](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:65) |
| Visible text | – | [L81](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:81) |
| Dynamic copy / value | {String(exercise.position).padStart(2, '0')} | [L81](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:81) |
| Dynamic copy / value | {exercise.name} | [L85](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:85) |
| Dynamic copy / value | {exercise.unitHint} | `showHint && !exercise.skipped` · [L89](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:89) |
| Visible text | Not logged | `exercise.skipped` · [L93](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:93) |
| Visible text | Skipped | `exercise.skipped; set.skipped` · [L93](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:93) |
| Dynamic copy / value | {exercise.volume} | `otherwise: exercise.skipped → exercise.volume` · [L95](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:95) |
| Dynamic copy / value | {set.ordinal} | [L106](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:106) |
| Dynamic copy / value | {set.text} | `otherwise: set.skipped` · [L110](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:110) |
| Dynamic copy / value | {set.compactText} | `otherwise: set.skipped` · [L127](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:127) |
| Accessibility / spoken copy | {workoutReportText(report)} | [L165](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:165) |
| Visible text | WORKOUT REPORT | [L171](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:171) |
| Dynamic copy / value | {report.title} | [L172](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:172) |
| Dynamic copy / value | {meta} | [L173](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:173) |
| Dynamic copy / value | {stat.value} {stat.unit} | `report.stats.length > 0` · [L180](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:180) |
| Dynamic copy / value | {stat.value} | `report.stats.length > 0` · [L180](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:180) |
| Dynamic copy / value | {stat.unit} | `report.stats.length > 0 → stat.unit` · [L182](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:182) |
| Dynamic copy / value | {stat.label.toUpperCase()} | `report.stats.length > 0` · [L184](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:184) |
| Dynamic copy / value | {inline content}{notes.map((note) =&gt; note!.replace(/ /g, '\u00A0')).join(' · ')} | `notes.length > 0` · [L191](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:191) |
| Visible text | NOTES | `exercise.notes.length > 0` · [L208](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:208) |
| Dynamic copy / value | {note} | `exercise.notes.length > 0` · [L210](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:210) |
| Visible text | stack | [L219](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:219) |
| Visible text | Weights in lbs | `weighed` · [L221](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:221) |
| Visible text | Weights in kg | `weighed` · [L221](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx:221) |

<a id="source-features-report-shareweekreport-ts"></a>

### share Week Report

Source: [features/report/shareWeekReport.ts](/Users/satwikmekala/stackv3/features/report/shareWeekReport.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Validation / error | PDF file sharing requires the mobile app. | `Platform.OS === 'web'` · [L45](/Users/satwikmekala/stackv3/features/report/shareWeekReport.ts:45) |
| Validation / error | Sharing is not available on this device. | `!(await Sharing.isAvailableAsync())` · [L46](/Users/satwikmekala/stackv3/features/report/shareWeekReport.ts:46) |
| Dynamic copy / value | Week of {report.title} | [L62](/Users/satwikmekala/stackv3/features/report/shareWeekReport.ts:62) |

<a id="source-features-report-shareworkoutreport-ts"></a>

### share Workout Report

Source: [features/report/shareWorkoutReport.ts](/Users/satwikmekala/stackv3/features/report/shareWorkoutReport.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Validation / error | PDF file sharing requires the mobile app. | `Platform.OS === 'web'` · [L10](/Users/satwikmekala/stackv3/features/report/shareWorkoutReport.ts:10) |
| Validation / error | Sharing is not available on this device. | `!(await Sharing.isAvailableAsync())` · [L13](/Users/satwikmekala/stackv3/features/report/shareWorkoutReport.ts:13) |
| Dynamic copy / value | {report.title} - workout report | [L32](/Users/satwikmekala/stackv3/features/report/shareWorkoutReport.ts:32) |

<a id="source-features-report-weekreport-ts"></a>

### week Report

Source: [features/report/weekReport.ts](/Users/satwikmekala/stackv3/features/report/weekReport.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Jan | [L46](/Users/satwikmekala/stackv3/features/report/weekReport.ts:46) |
| Label / supplied copy | Feb | [L46](/Users/satwikmekala/stackv3/features/report/weekReport.ts:46) |
| Label / supplied copy | Mar | [L46](/Users/satwikmekala/stackv3/features/report/weekReport.ts:46) |
| Label / supplied copy | Apr | [L46](/Users/satwikmekala/stackv3/features/report/weekReport.ts:46) |
| Label / supplied copy | May | [L46](/Users/satwikmekala/stackv3/features/report/weekReport.ts:46) |
| Label / supplied copy | Jun | [L46](/Users/satwikmekala/stackv3/features/report/weekReport.ts:46) |
| Label / supplied copy | Jul | [L46](/Users/satwikmekala/stackv3/features/report/weekReport.ts:46) |
| Label / supplied copy | Aug | [L46](/Users/satwikmekala/stackv3/features/report/weekReport.ts:46) |
| Label / supplied copy | Sep | [L46](/Users/satwikmekala/stackv3/features/report/weekReport.ts:46) |
| Label / supplied copy | Oct | [L46](/Users/satwikmekala/stackv3/features/report/weekReport.ts:46) |
| Label / supplied copy | Nov | [L46](/Users/satwikmekala/stackv3/features/report/weekReport.ts:46) |
| Label / supplied copy | Dec | [L46](/Users/satwikmekala/stackv3/features/report/weekReport.ts:46) |
| Label / supplied copy | Sunday | [L47](/Users/satwikmekala/stackv3/features/report/weekReport.ts:47) |
| Label / supplied copy | Monday | [L47](/Users/satwikmekala/stackv3/features/report/weekReport.ts:47) |
| Label / supplied copy | Tuesday | [L47](/Users/satwikmekala/stackv3/features/report/weekReport.ts:47) |
| Label / supplied copy | Wednesday | [L47](/Users/satwikmekala/stackv3/features/report/weekReport.ts:47) |
| Label / supplied copy | Thursday | [L47](/Users/satwikmekala/stackv3/features/report/weekReport.ts:47) |
| Label / supplied copy | Friday | [L47](/Users/satwikmekala/stackv3/features/report/weekReport.ts:47) |
| Label / supplied copy | Saturday | [L47](/Users/satwikmekala/stackv3/features/report/weekReport.ts:47) |
| Dynamic copy / value | {date.getDate()} {MONTHS[date.getMonth()]} | [L49](/Users/satwikmekala/stackv3/features/report/weekReport.ts:49) |
| Dynamic copy / value | {formatSummaryNumber(Math.round(displayVolume(kg, unit)))} {unitLabel(unit)} | `kg > 0` · [L60](/Users/satwikmekala/stackv3/features/report/weekReport.ts:60) |
| Label / supplied copy | Bodyweight | `otherwise: kg > 0` · [L60](/Users/satwikmekala/stackv3/features/report/weekReport.ts:60) |
| Dynamic copy / value | {WEEKDAYS[date.getDay()].slice(0, 3).toUpperCase()} · {moved(piece.metrics.volumeKg, unit)} | [L85](/Users/satwikmekala/stackv3/features/report/weekReport.ts:85) |
| Dynamic copy / value | {WEEKDAYS[date.getDay()].toUpperCase()} · {day(date).toUpperCase()} | [L87](/Users/satwikmekala/stackv3/features/report/weekReport.ts:87) |
| Label / supplied copy | Moved | `volumeKg > 0` · [L104](/Users/satwikmekala/stackv3/features/report/weekReport.ts:104) |
| Label / supplied copy | Session | `workouts.length === 1` · [L105](/Users/satwikmekala/stackv3/features/report/weekReport.ts:105) |
| Label / supplied copy | Sessions | `otherwise: workouts.length === 1` · [L105](/Users/satwikmekala/stackv3/features/report/weekReport.ts:105) |
| Label / supplied copy | Sets | `sets > 0` · [L106](/Users/satwikmekala/stackv3/features/report/weekReport.ts:106) |
| Label / supplied copy | Trained | `durationMs > 0` · [L107](/Users/satwikmekala/stackv3/features/report/weekReport.ts:107) |
| Label / supplied copy | Exercises | `durationMs > 0 → exerciseNames.size > 0` · [L108](/Users/satwikmekala/stackv3/features/report/weekReport.ts:108) |
| Label / supplied copy | PR | `week.metrics.records > 0 → week.metrics.records === 1` · [L109](/Users/satwikmekala/stackv3/features/report/weekReport.ts:109) |
| Label / supplied copy | PRs | `week.metrics.records > 0 → otherwise: week.metrics.records === 1` · [L109](/Users/satwikmekala/stackv3/features/report/weekReport.ts:109) |
| Dynamic copy / value | {workout.report.title} · {workout.slab.detail.split(' · ')[0]} | [L119](/Users/satwikmekala/stackv3/features/report/weekReport.ts:119) |
| Dynamic copy / value | {start.getDate()} – {day(end)} | [L127](/Users/satwikmekala/stackv3/features/report/weekReport.ts:127) |
| Dynamic copy / value | {day(start)} – {day(end)} | [L127](/Users/satwikmekala/stackv3/features/report/weekReport.ts:127) |
| Dynamic copy / value | WEEK {number} · {year} | [L128](/Users/satwikmekala/stackv3/features/report/weekReport.ts:128) |
| Dynamic copy / value | WEEK {number} · {year} · IN PROGRESS | [L128](/Users/satwikmekala/stackv3/features/report/weekReport.ts:128) |
| Label / supplied copy | · IN PROGRESS | `otherwise: week.sealed` · [L128](/Users/satwikmekala/stackv3/features/report/weekReport.ts:128) |
| Dynamic copy / value | {day(start)} – {day(end)} {end.getFullYear()} | [L129](/Users/satwikmekala/stackv3/features/report/weekReport.ts:129) |
| Dynamic copy / value | {day(now)} {now.getFullYear()} | [L137](/Users/satwikmekala/stackv3/features/report/weekReport.ts:137) |

<a id="source-features-report-weekreporthtml-ts"></a>

### week Report Html

Source: [features/report/weekReportHtml.ts](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Exported report | {escapeHtml(truncate(anchor.slab.label, 22))} | [L130](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:130) |
| Exported report | {escapeHtml(anchor.slab.detail)}{anchor.slab.record ? ' · PR ' : ''} | [L131](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:131) |
| Label / supplied copy | &lt;tspan fill="#FFE84A"&gt;· PR&lt;/tspan&gt; | `anchor.slab.record` · [L131](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:131) |
| Dynamic copy / value | {value.slice(0, max - 1).trimEnd()}… | `value.length > max` · [L161](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:161) |
| Exported report | {logo ? ` ` : ` ${LOGO_FALLBACK} `} STACK | [L172](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:172) |
| Exported report | {LOGO_FALLBACK} | `otherwise: logo` · [L172](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:172) |
| Exported report | {escapeHtml(stat.value)}{stat.unit ? ` ${escapeHtml(stat.unit)} ` : ''} {escapeHtml(stat.label.toUpperCase())} | [L176](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:176) |
| Exported report | {escapeHtml(stat.unit)} | `stat.unit` · [L176](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:176) |
| Exported report | {escapeHtml(item.weekday.toUpperCase())} {escapeHtml(item.date)} {item.slabs.length ? miniStackSvg(item.slabs, 58, 54, 11) : emptyDaySvg(58, 54, 11)} {item.slabs.length ? (item.slabs.length === 1 ? escapeHtml(truncate(item.slabs[0].label, 12)) : `${item.slabs.length} sessions`) : 'Rest'} | [L177](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:177) |
| Label / supplied copy | active | `item.slabs.length` · [L177](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:177) |
| Dynamic copy / value | {item.slabs.length} sessions | `item.slabs.length → otherwise: item.slabs.length === 1` · [L181](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:181) |
| Label / supplied copy | Rest | `otherwise: item.slabs.length` · [L181](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:181) |
| Exported report | WHERE THE WEIGHT WENT {report.split.map((part) =&gt; ` `).join('')} {report.split.map((part) =&gt; ` ${escapeHtml(truncate(part.label, 22))} ${Math.round(part.share * 100)}% `).join('')} | `report.split.length > 0` · [L183](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:183) |
| Exported report | {escapeHtml(truncate(part.label, 22))} {Math.round(part.share * 100)}% | `report.split.length > 0` · [L185](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:185) |
| Exported report | NEW BESTS{more &gt; 0 ? ` +${more} MORE INSIDE ` : ''} {shown.map((record) =&gt; ` ★ ${escapeHtml(truncate(record.exercise, 26))} ${escapeHtml(record.value)} ${escapeHtml(truncate(record.workout.toUpperCase(), 26))} `).join('')} | `shown.length` · [L188](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:188) |
| Exported report | +{more} MORE INSIDE | `shown.length → more > 0` · [L188](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:188) |
| Exported report | ★ {escapeHtml(truncate(record.exercise, 26))} {escapeHtml(record.value)} {escapeHtml(truncate(record.workout.toUpperCase(), 26))} | `shown.length` · [L189](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:189) |
| Exported report | {brand} WEEKLY REPORT {escapeHtml(report.eyebrow)} {escapeHtml(report.title)} {hero.svg} {slabs.length} {slabs.length === 1 ? 'LAYER' : 'LAYERS'} · OLDEST AT THE BASE {stats} THE WEEK {days} {split} {records} Generated with Stack · {escapeHtml(report.generatedLabel)} | [L192](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:192) |
| Label / supplied copy | LAYER | `slabs.length === 1` · [L198](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:198) |
| Label / supplied copy | LAYERS | `otherwise: slabs.length === 1` · [L198](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:198) |
| Label / supplied copy | PR | `set.kind !== 'working' → set.kind === 'pr'` · [L210](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:210) |
| Label / supplied copy | DROP | `otherwise: set.kind === 'pr' → set.kind === 'dropset'` · [L210](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:210) |
| Label / supplied copy | EXTRA | `otherwise: set.kind === 'pr' → otherwise: set.kind === 'dropset'` · [L210](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:210) |
| Exported report | {set.ordinal} {set.record ? '★ ' : ''}{escapeHtml(text)}{tag} | [L213](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:213) |
| Label / supplied copy | — | `exercise.position === null` · [L220](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:220) |
| Exported report | {escapeHtml(note)} | [L225](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:225) |
| Exported report | {exercise.notLogged ? 'Not logged' : 'Skipped'} | `exercise.skipped` · [L228](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:228) |
| Label / supplied copy | Not logged | `exercise.skipped → exercise.notLogged` · [L228](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:228) |
| Label / supplied copy | Skipped | `exercise.skipped → otherwise: exercise.notLogged` · [L228](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:228) |
| Exported report | {index} {escapeHtml(exercise.name)}{continued} {meta ? ` ${meta} ` : ''} {body} {chunk === chunks.length - 1 && notes ? ` ${notes} ` : ''} | [L231](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:231) |
| Label / supplied copy | is-skipped | `exercise.skipped` · [L231](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:231) |
| Exported report | {meta} | `meta` · [L232](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:232) |
| Exported report | {notes} | `chunk === chunks.length - 1 && notes` · [L234](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:234) |
| Exported report | {/best/.test(item) ? '★ ' : ''}{escapeHtml(item)} | [L243](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:243) |
| Exported report | {miniStackSvg([slab], 64, 58, 17)} {String(index + 1).padStart(2, '0')} · {escapeHtml(workout.eyebrow)} {escapeHtml(report.title)} {meta.length ? ` ${meta.map(escapeHtml).join(' · ')} ` : ''} {stats ? ` ${stats} ` : ''} {highlights ? ` ${highlights} ` : ''} | [L244](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:244) |
| Exported report | {meta.map(escapeHtml).join(' · ')} | `meta.length` · [L249](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:249) |
| Exported report | {stats} | `stats` · [L251](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:251) |
| Exported report | {highlights} | `highlights` · [L253](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:253) |
| Exported report | {header} No logged exercises. | `exercises.length === 0` · [L256](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:256) |
| Exported report | {header}{first} | [L259](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:259) |
| Dynamic copy / value | @font-face { font-family: '{family}'; font-weight: {weight}; font-style: {style}; src: url(data:font/ttf;base64,{data}) format('truetype'); } | `data` · [L264](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:264) |
| Label / supplied copy | Bricolage | [L267](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:267) |
| Label / supplied copy | Hanken | [L268](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:268) |
| Label / supplied copy | JBMono | [L272](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:272) |
| Dynamic copy / value | (function () {<br>function run() {<br>var source = document.getElementById('source');<br>var pages = document.getElementById('pages');<br>var template = document.getElementById('page-template');<br>if (!source \|\| !pages \|\| !template) return;<br>// The cover is fixed; everything after it is rebuilt.<br>while (pages.children.length &gt; 1) pages.removeChild(pages.lastChild);<br>var blocks = Array.prototype.slice.call(source.children);<br>var body = null;<br>function open() {<br>var page = template.content ? template.content.firstElementChild.cloneNode(true) : template.firstElementChild.cloneNode(true);<br>pages.appendChild(page);<br>body = page.querySelector('.page-body');<br>}<br>open();<br>blocks.forEach(function (block) {<br>var clone = block.cloneNode(true);<br>body.appendChild(clone);<br>if (body.scrollHeight &gt; body.clientHeight + 0.5 && body.children.length &gt; 1) {<br>body.removeChild(clone);<br>open();<br>body.appendChild(clone);<br>}<br>});<br>var all = document.querySelectorAll('.page-number');<br>for (var i = 0; i &lt; all.length; i++) all[i].textContent = String(i + 1).padStart(2, '0') + ' / ' + String(all.length).padStart(2, '0');<br>}<br>try { run(); } catch (error) { document.getElementById('source').removeAttribute('id'); }<br>if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { try { run(); } catch (error) {} });<br>})(); | [L392](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:392) |
| Exported report | {miniStackSvg(report.workouts.slice(-4).map((workout) =&gt; workout.slab), 40, 40, 10)}END OF {escapeHtml(report.eyebrow.split(' · ')[0])} | [L427](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:427) |
| Exported report | Stack · {escapeHtml(report.title)} {cover(report, brand)} {brand} {escapeHtml(report.rangeLabel)} Weekly report {blocks.join('')} {PAGINATE} | [L428](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:428) |
| Label / supplied copy | Jan | [L442](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:442) |
| Label / supplied copy | Feb | [L442](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:442) |
| Label / supplied copy | Mar | [L442](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:442) |
| Label / supplied copy | Apr | [L442](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:442) |
| Label / supplied copy | May | [L442](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:442) |
| Label / supplied copy | Jun | [L442](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:442) |
| Label / supplied copy | Jul | [L442](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:442) |
| Label / supplied copy | Aug | [L442](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:442) |
| Label / supplied copy | Sep | [L442](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:442) |
| Label / supplied copy | Oct | [L442](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:442) |
| Label / supplied copy | Nov | [L442](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:442) |
| Label / supplied copy | Dec | [L442](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:442) |
| Dynamic copy / value | {date} {months[month - 1]} {year} | `year && month && date` · [L443](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:443) |
| Label / supplied copy | this week | `otherwise: year && month && date` · [L443](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:443) |
| Dynamic copy / value | Stack - Week of {label}.pdf | [L444](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts:444) |

<a id="source-features-report-workoutreport-ts"></a>

### workout Report

Source: [features/report/workoutReport.ts](/Users/satwikmekala/stackv3/features/report/workoutReport.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {unitLabel(unit)} × reps | [L97](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:97) |
| Label / supplied copy | reps | `otherwise: loaded; otherwise: weight → otherwise: set.reps === 1` · [L98](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:98) |
| Dynamic copy / value | {unitLabel(unit)} · time | [L100](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:100) |
| Dynamic copy / value | {weight} {unitLabel(unit)} · {time} | `timed → weight` · [L143](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:143) |
| Dynamic copy / value | {weight} · {time} | `timed → weight` · [L143](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:143) |
| Dynamic copy / value | {weight} {unitLabel(unit)} × {set.reps} | `weight` · [L147](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:147) |
| Dynamic copy / value | {weight} × {set.reps} | `weight` · [L147](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:147) |
| Dynamic copy / value | {set.reps} rep | `otherwise: weight` · [L148](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:148) |
| Dynamic copy / value | {set.reps} reps | `otherwise: weight` · [L148](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:148) |
| Label / supplied copy | rep | `otherwise: weight → set.reps === 1` · [L148](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:148) |
| Label / supplied copy | T | `!session.completedAt \|\| !session.date.includes('T')` · [L153](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:153) |
| Dynamic copy / value | {minutes} min | `minutes < 60` · [L164](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:164) |
| Dynamic copy / value | {Math.floor(minutes / 60)}h {String(minutes % 60).padStart(2, '0')}m | [L165](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:165) |
| Label / supplied copy | Felt easy | [L175](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:175) |
| Label / supplied copy | Felt just right | [L176](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:176) |
| Label / supplied copy | Felt hard | [L177](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:177) |
| Dynamic copy / value | {count} {one} | [L180](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:180) |
| Dynamic copy / value | {count} {many} | [L180](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:180) |
| Label / supplied copy | Skipped | `set.skipped; exercise.skipped → otherwise: exercise.notLogged` · [L210](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:210) |
| Label / supplied copy | Exercise | [L220](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:220) |
| Dynamic copy / value | {formatSummaryNumber(displayVolume(volumeKg, unit))} {unitLabel(unit)} | `volumeKg > 0` · [L226](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:226) |
| Label / supplied copy | Duration | `durationLabel` · [L239](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:239) |
| Label / supplied copy | Exercises | `summary.exerciseCount > 0` · [L240](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:240) |
| Label / supplied copy | Sets | `summary.setCount > 0` · [L241](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:241) |
| Label / supplied copy | Volume | `summary.volumeKg > 0` · [L243](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:243) |
| Label / supplied copy | new best | `records > 0` · [L248](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:248) |
| Label / supplied copy | PR attempt | `summary.specialSets.pr > 0` · [L249](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:249) |
| Label / supplied copy | drop set | `summary.specialSets.dropset > 0` · [L250](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:250) |
| Label / supplied copy | extra set | `summary.specialSets.extra > 0` · [L251](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:251) |
| Dynamic copy / value | {plural(skippedSets, 'set')} skipped | `skippedSets > 0` · [L253](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:253) |
| Dynamic copy / value | {stat.value} {stat.unit} {stat.label.toLowerCase()} | [L280](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:280) |
| Dynamic copy / value | {stat.value} {stat.label.toLowerCase()} | [L280](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:280) |
| Dynamic copy / value | {stat.unit} | `stat.unit` · [L280](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:280) |
| Dynamic copy / value | {exercise.position}. {exercise.name} — {exercise.volume} | [L283](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:283) |
| Dynamic copy / value | {exercise.position}. {exercise.name} | [L283](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:283) |
| Dynamic copy / value | –. {exercise.name} — {exercise.volume} | [L283](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:283) |
| Dynamic copy / value | –. {exercise.name} | [L283](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:283) |
| Label / supplied copy | – | [L283](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:283) |
| Dynamic copy / value | — {exercise.volume} | `exercise.volume` · [L283](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:283) |
| Label / supplied copy | Not logged | `exercise.skipped → exercise.notLogged` · [L284](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:284) |
| Label / supplied copy | NEW BEST | `!exercise.skipped → set.record` · [L287](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:287) |
| Dynamic copy / value | {set.ordinal} {set.text} ({tags.join(', ')}) | `!exercise.skipped` · [L288](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:288) |
| Dynamic copy / value | {set.ordinal} {set.text} | `!exercise.skipped` · [L288](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:288) |
| Dynamic copy / value | ({tags.join(', ')}) | `!exercise.skipped → tags.length` · [L288](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:288) |
| Dynamic copy / value | Note: {note} | [L291](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:291) |
| Label / supplied copy | EXTRA | [L297](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:297) |
| Label / supplied copy | DROP | [L298](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:298) |
| Label / supplied copy | PR ATTEMPT | [L299](/Users/satwikmekala/stackv3/features/report/workoutReport.ts:299) |

<a id="source-features-report-workoutreporthtml-ts"></a>

### workout Report Html

Source: [features/report/workoutReportHtml.ts](/Users/satwikmekala/stackv3/features/report/workoutReportHtml.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Exported report | {escapeHtml(stat.value)}{stat.unit ? ` ${escapeHtml(stat.unit)} ` : ''} {escapeHtml(stat.label)} | [L12](/Users/satwikmekala/stackv3/features/report/workoutReportHtml.ts:12) |
| Dynamic copy / value | &lt;small&gt;{escapeHtml(stat.unit)}&lt;/small&gt; | `stat.unit` · [L12](/Users/satwikmekala/stackv3/features/report/workoutReportHtml.ts:12) |
| Label / supplied copy | NEW BEST | `set.record` · [L15](/Users/satwikmekala/stackv3/features/report/workoutReportHtml.ts:15) |
| Exported report | {set.ordinal} {escapeHtml(set.text)} {escapeHtml(tags.join(' · '))} | [L16](/Users/satwikmekala/stackv3/features/report/workoutReportHtml.ts:16) |
| Exported report | Set Result Details {rows} | `rows` · [L18](/Users/satwikmekala/stackv3/features/report/workoutReportHtml.ts:18) |
| Exported report | Not logged | `otherwise: rows` · [L18](/Users/satwikmekala/stackv3/features/report/workoutReportHtml.ts:18) |
| Exported report | Note {escapeHtml(note)} | [L19](/Users/satwikmekala/stackv3/features/report/workoutReportHtml.ts:19) |
| Exported report | {exercise.position}. {escapeHtml(exercise.name)} Volume: {escapeHtml(exercise.volume)} {sets}{notes} | [L21](/Users/satwikmekala/stackv3/features/report/workoutReportHtml.ts:21) |
| Exported report | {exercise.position}. {escapeHtml(exercise.name)} {sets}{notes} | [L21](/Users/satwikmekala/stackv3/features/report/workoutReportHtml.ts:21) |
| Exported report | {escapeHtml(exercise.name)} Volume: {escapeHtml(exercise.volume)} {sets}{notes} | [L21](/Users/satwikmekala/stackv3/features/report/workoutReportHtml.ts:21) |
| Exported report | {escapeHtml(exercise.name)} {sets}{notes} | [L21](/Users/satwikmekala/stackv3/features/report/workoutReportHtml.ts:21) |
| Label / supplied copy | long-exercise | `needsPageFlow` · [L21](/Users/satwikmekala/stackv3/features/report/workoutReportHtml.ts:21) |
| Dynamic copy / value | {exercise.position}. | `exercise.position !== null` · [L21](/Users/satwikmekala/stackv3/features/report/workoutReportHtml.ts:21) |
| Exported report | Volume: {escapeHtml(exercise.volume)} | `exercise.volume` · [L21](/Users/satwikmekala/stackv3/features/report/workoutReportHtml.ts:21) |
| Exported report | {escapeHtml(report.title)} - Workout report STACK / WORKOUT REPORT {escapeHtml(report.title)} {escapeHtml(report.dateLabel)} {details.length ? ` ${details.map(escapeHtml).join(' · ')} ` : ''} {stats ? ` ${stats} ` : ''} {report.highlights.length ? ` ${report.highlights.map(escapeHtml).join(' · ')} ` : ''} {exercises \|\| ' No logged exercises. '} | [L24](/Users/satwikmekala/stackv3/features/report/workoutReportHtml.ts:24) |
| Exported report | {details.map(escapeHtml).join(' · ')} | `details.length` · [L58](/Users/satwikmekala/stackv3/features/report/workoutReportHtml.ts:58) |
| Exported report | {report.highlights.map(escapeHtml).join(' · ')} | `report.highlights.length` · [L60](/Users/satwikmekala/stackv3/features/report/workoutReportHtml.ts:60) |
| Exported report | No logged exercises. | [L61](/Users/satwikmekala/stackv3/features/report/workoutReportHtml.ts:61) |
| Label / supplied copy | Workout | [L67](/Users/satwikmekala/stackv3/features/report/workoutReportHtml.ts:67) |
| Dynamic copy / value | {title} - {id} - Workout report.pdf | [L69](/Users/satwikmekala/stackv3/features/report/workoutReportHtml.ts:69) |

## Lock Screen and Dynamic Island workout display

<a id="source-components-live-activity-workoutliveactivitylayout-tsx"></a>

### Workout Live Activity Layout

Source: [components/live-activity/WorkoutLiveActivityLayout.tsx](/Users/satwikmekala/stackv3/components/live-activity/WorkoutLiveActivityLayout.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | — | `next?.interaction → otherwise: next.unit; otherwise: state.unit` · [L116](/Users/satwikmekala/stackv3/components/live-activity/WorkoutLiveActivityLayout.tsx:116) |
| Label / supplied copy | Decrease weight | `kind === 'weight'` · [L152](/Users/satwikmekala/stackv3/components/live-activity/WorkoutLiveActivityLayout.tsx:152) |
| Label / supplied copy | Decrease time | `otherwise: kind === 'weight' → kind === 'duration'` · [L152](/Users/satwikmekala/stackv3/components/live-activity/WorkoutLiveActivityLayout.tsx:152) |
| Label / supplied copy | Decrease reps | `otherwise: kind === 'weight' → otherwise: kind === 'duration'` · [L152](/Users/satwikmekala/stackv3/components/live-activity/WorkoutLiveActivityLayout.tsx:152) |
| Visible text | − | [L153](/Users/satwikmekala/stackv3/components/live-activity/WorkoutLiveActivityLayout.tsx:153) |
| Dynamic copy / value | {value} | [L160](/Users/satwikmekala/stackv3/components/live-activity/WorkoutLiveActivityLayout.tsx:160) |
| Visible text | — | [L160](/Users/satwikmekala/stackv3/components/live-activity/WorkoutLiveActivityLayout.tsx:160) |
| Dynamic copy / value | {unit} | [L163](/Users/satwikmekala/stackv3/components/live-activity/WorkoutLiveActivityLayout.tsx:163) |
| Label / supplied copy | Increase weight | `kind === 'weight'` · [L169](/Users/satwikmekala/stackv3/components/live-activity/WorkoutLiveActivityLayout.tsx:169) |
| Label / supplied copy | Increase time | `otherwise: kind === 'weight' → kind === 'duration'` · [L169](/Users/satwikmekala/stackv3/components/live-activity/WorkoutLiveActivityLayout.tsx:169) |
| Label / supplied copy | Increase reps | `otherwise: kind === 'weight' → otherwise: kind === 'duration'` · [L169](/Users/satwikmekala/stackv3/components/live-activity/WorkoutLiveActivityLayout.tsx:169) |
| Visible text | + | [L170](/Users/satwikmekala/stackv3/components/live-activity/WorkoutLiveActivityLayout.tsx:170) |
| Dynamic copy / value | {state.exerciseName} | [L221](/Users/satwikmekala/stackv3/components/live-activity/WorkoutLiveActivityLayout.tsx:221) |
| Visible text | SET | [L227](/Users/satwikmekala/stackv3/components/live-activity/WorkoutLiveActivityLayout.tsx:227) |
| Dynamic copy / value | {state.setNumber} | [L230](/Users/satwikmekala/stackv3/components/live-activity/WorkoutLiveActivityLayout.tsx:230) |
| Dynamic copy / value | / {state.totalSets} | [L233](/Users/satwikmekala/stackv3/components/live-activity/WorkoutLiveActivityLayout.tsx:233) |
| Label / supplied copy | reps | `otherwise: state.metric === 'duration'` · [L259](/Users/satwikmekala/stackv3/components/live-activity/WorkoutLiveActivityLayout.tsx:259) |
| Label / supplied copy | Complete set | [L261](/Users/satwikmekala/stackv3/components/live-activity/WorkoutLiveActivityLayout.tsx:261) |
| Dynamic copy / value | {state.compactName} | [L276](/Users/satwikmekala/stackv3/components/live-activity/WorkoutLiveActivityLayout.tsx:276) |
| Dynamic copy / value | /{state.totalSets} | [L285](/Users/satwikmekala/stackv3/components/live-activity/WorkoutLiveActivityLayout.tsx:285) |
| Visible text | S | [L290](/Users/satwikmekala/stackv3/components/live-activity/WorkoutLiveActivityLayout.tsx:290) |

<a id="source-modules-stack-workout-controls-ios-stackworkoutcontrolsmodule-swift"></a>

### Stack Workout Controls Module

Source: [modules/stack-workout-controls/ios/StackWorkoutControlsModule.swift](/Users/satwikmekala/stackv3/modules/stack-workout-controls/ios/StackWorkoutControlsModule.swift).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Accessibility / spoken copy | Done | [L108](/Users/satwikmekala/stackv3/modules/stack-workout-controls/ios/StackWorkoutControlsModule.swift:108) |
| Accessibility / spoken copy | Save your note and dismiss the keyboard | [L109](/Users/satwikmekala/stackv3/modules/stack-workout-controls/ios/StackWorkoutControlsModule.swift:109) |
| Accessibility / spoken copy | . | [L227](/Users/satwikmekala/stackv3/modules/stack-workout-controls/ios/StackWorkoutControlsModule.swift:227) |
| Accessibility / spoken copy | Weight in {unit}, whole number | [L253](/Users/satwikmekala/stackv3/modules/stack-workout-controls/ios/StackWorkoutControlsModule.swift:253) |
| Accessibility / spoken copy | Decimal point | [L253](/Users/satwikmekala/stackv3/modules/stack-workout-controls/ios/StackWorkoutControlsModule.swift:253) |
| Accessibility / spoken copy | Weight in {unit}, decimal digit | [L253](/Users/satwikmekala/stackv3/modules/stack-workout-controls/ios/StackWorkoutControlsModule.swift:253) |
| Accessibility / spoken copy | Swipe up or down to adjust | [L257](/Users/satwikmekala/stackv3/modules/stack-workout-controls/ios/StackWorkoutControlsModule.swift:257) |
| Accessibility / spoken copy | Repetitions | [L276](/Users/satwikmekala/stackv3/modules/stack-workout-controls/ios/StackWorkoutControlsModule.swift:276) |
| Accessibility / spoken copy | Add | [L376](/Users/satwikmekala/stackv3/modules/stack-workout-controls/ios/StackWorkoutControlsModule.swift:376) |
| Accessibility / spoken copy | Change | [L376](/Users/satwikmekala/stackv3/modules/stack-workout-controls/ios/StackWorkoutControlsModule.swift:376) |
| Accessibility / spoken copy | Add exercise or navigate | [L377](/Users/satwikmekala/stackv3/modules/stack-workout-controls/ios/StackWorkoutControlsModule.swift:377) |
| Accessibility / spoken copy | Change exercise | [L377](/Users/satwikmekala/stackv3/modules/stack-workout-controls/ios/StackWorkoutControlsModule.swift:377) |
| Accessibility / spoken copy | Minimize workout | [L381](/Users/satwikmekala/stackv3/modules/stack-workout-controls/ios/StackWorkoutControlsModule.swift:381) |
| Accessibility / spoken copy | Keep your workout active and return to the previous screen | [L382](/Users/satwikmekala/stackv3/modules/stack-workout-controls/ios/StackWorkoutControlsModule.swift:382) |
| Accessibility / spoken copy | Exit workout | [L384](/Users/satwikmekala/stackv3/modules/stack-workout-controls/ios/StackWorkoutControlsModule.swift:384) |
| Accessibility / spoken copy | Ask to discard this workout | [L385](/Users/satwikmekala/stackv3/modules/stack-workout-controls/ios/StackWorkoutControlsModule.swift:385) |

<a id="source-services-liveactivity-actions-ts"></a>

### actions

Source: [services/liveActivity/actions.ts](/Users/satwikmekala/stackv3/services/liveActivity/actions.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | reps | [L14](/Users/satwikmekala/stackv3/services/liveActivity/actions.ts:14) |

<a id="source-services-liveactivity-compactexercisename-ts"></a>

### compact Exercise Name

Source: [services/liveActivity/compactExerciseName.ts](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | barbell squat | [L2](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:2) |
| Label / supplied copy | Squat | [L2](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:2) |
| Label / supplied copy | bench press | [L4](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:4) |
| Label / supplied copy | Bench | [L4](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:4) |
| Label / supplied copy | barbell bench press | [L5](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:5) |
| Label / supplied copy | barbell bicep curl | [L6](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:6) |
| Label / supplied copy | Curl | [L6](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:6) |
| Label / supplied copy | barbell curl | [L7](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:7) |
| Label / supplied copy | barbell hip thrust | [L8](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:8) |
| Label / supplied copy | Hip Thrust | [L8](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:8) |
| Label / supplied copy | incline dumbbell press | [L9](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:9) |
| Label / supplied copy | Incline | [L9](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:9) |
| Label / supplied copy | lat pulldown | [L10](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:10) |
| Label / supplied copy | Pulldown | [L10](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:10) |
| Label / supplied copy | leg extension | [L11](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:11) |
| Label / supplied copy | Leg Ext. | [L11](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:11) |
| Label / supplied copy | leg press | [L12](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:12) |
| Label / supplied copy | Leg Press | [L12](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:12) |
| Label / supplied copy | lying leg curl | [L13](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:13) |
| Label / supplied copy | Leg Curl | [L13](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:13) |
| Label / supplied copy | seated dumbbell shoulder press | [L15](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:15) |
| Label / supplied copy | Shoulder Press | [L15](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:15) |
| Label / supplied copy | cable chest fly | [L16](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:16) |
| Label / supplied copy | Chest Fly | [L16](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:16) |
| Label / supplied copy | cable overhead triceps extension | [L17](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:17) |
| Label / supplied copy | Tri Ext. | [L17](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:17) |
| Label / supplied copy | standing calf raise | [L18](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:18) |
| Label / supplied copy | Calf Raise | [L18](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:18) |
| Label / supplied copy | chest dips | [L19](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:19) |
| Label / supplied copy | Dips | [L19](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:19) |
| Label / supplied copy | Deadlift | [L20](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:20) |
| Label / supplied copy | dumbbell lateral raise | [L21](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:21) |
| Label / supplied copy | Lateral Raise | [L21](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:21) |
| Label / supplied copy | single-arm dumbbell lateral raise | [L22](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:22) |
| Label / supplied copy | Exercise | [L29](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:29) |
| Dynamic copy / value | {characters.slice(0, 13).join('').trimEnd()}… | `otherwise: characters.length <= 14` · [L31](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts:31) |

<a id="source-services-liveactivity-state-ts"></a>

### state

Source: [services/liveActivity/state.ts](/Users/satwikmekala/stackv3/services/liveActivity/state.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | — | `bodyweight \|\| !Number.isFinite(set.weight); otherwise: metric === 'duration' → otherwise: Number.isFinite(set.reps)` · [L74](/Users/satwikmekala/stackv3/services/liveActivity/state.ts:74) |

## Legacy onboarding and retained general controls

The five legacy onboarding screens remain the flag-off path. Their wording differs from the redesigned development preview above. Retained general components are included even when normal current navigation does not use them.

<a id="source-app-onboarding-layout-tsx"></a>

### _layout

Source: [app/(onboarding)/_layout.tsx](/Users/satwikmekala/stackv3/app/(onboarding)/_layout.tsx).

This route delegates its wording to the shared sources linked in the screen map; it defines no additional literal copy.

<a id="source-app-onboarding-current-week-tsx"></a>

### Legacy onboarding — Weekdays

Source: [app/(onboarding)/current-week.tsx](/Users/satwikmekala/stackv3/app/(onboarding)/current-week.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Monday | [L29](/Users/satwikmekala/stackv3/app/(onboarding)/current-week.tsx:29) |
| Label / supplied copy | Tuesday | [L30](/Users/satwikmekala/stackv3/app/(onboarding)/current-week.tsx:30) |
| Label / supplied copy | Wednesday | [L31](/Users/satwikmekala/stackv3/app/(onboarding)/current-week.tsx:31) |
| Label / supplied copy | Thursday | [L32](/Users/satwikmekala/stackv3/app/(onboarding)/current-week.tsx:32) |
| Label / supplied copy | Friday | [L33](/Users/satwikmekala/stackv3/app/(onboarding)/current-week.tsx:33) |
| Label / supplied copy | Saturday | [L34](/Users/satwikmekala/stackv3/app/(onboarding)/current-week.tsx:34) |
| Label / supplied copy | Sunday | [L35](/Users/satwikmekala/stackv3/app/(onboarding)/current-week.tsx:35) |
| Accessibility / spoken copy | At least one rest day is required | `disabled` · [L98](/Users/satwikmekala/stackv3/app/(onboarding)/current-week.tsx:98) |
| Dynamic copy / value | {weekday.label} | [L111](/Users/satwikmekala/stackv3/app/(onboarding)/current-week.tsx:111) |
| Visible text | Which days do you train? | [L173](/Users/satwikmekala/stackv3/app/(onboarding)/current-week.tsx:173) |
| Dynamic copy / value | Weekly goal {selectedDays.length} days/week | [L190](/Users/satwikmekala/stackv3/app/(onboarding)/current-week.tsx:190) |
| Accessibility / spoken copy | Continue to split choice | [L198](/Users/satwikmekala/stackv3/app/(onboarding)/current-week.tsx:198) |

<a id="source-app-onboarding-experience-tsx"></a>

### Legacy onboarding — Experience

Source: [app/(onboarding)/experience.tsx](/Users/satwikmekala/stackv3/app/(onboarding)/experience.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Beginner | [L31](/Users/satwikmekala/stackv3/app/(onboarding)/experience.tsx:31) |
| Label / supplied copy | New to lifting, or just back. | [L32](/Users/satwikmekala/stackv3/app/(onboarding)/experience.tsx:32) |
| Label / supplied copy | Intermediate | [L37](/Users/satwikmekala/stackv3/app/(onboarding)/experience.tsx:37) |
| Label / supplied copy | Training steadily for 6+ months. | [L38](/Users/satwikmekala/stackv3/app/(onboarding)/experience.tsx:38) |
| Label / supplied copy | Advanced | [L43](/Users/satwikmekala/stackv3/app/(onboarding)/experience.tsx:43) |
| Label / supplied copy | Years in, chasing numbers. | [L44](/Users/satwikmekala/stackv3/app/(onboarding)/experience.tsx:44) |
| Dynamic copy / value | {option.title} | [L128](/Users/satwikmekala/stackv3/app/(onboarding)/experience.tsx:128) |
| Dynamic copy / value | {option.description} | [L129](/Users/satwikmekala/stackv3/app/(onboarding)/experience.tsx:129) |
| Visible text | How long have you been training? | [L169](/Users/satwikmekala/stackv3/app/(onboarding)/experience.tsx:169) |

<a id="source-app-onboarding-split-choice-tsx"></a>

### Legacy onboarding — Split choice

Source: [app/(onboarding)/split-choice.tsx](/Users/satwikmekala/stackv3/app/(onboarding)/split-choice.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {baseLabel} {String.fromCharCode(64 + occurrence)} | `totals[archetype] && totals[archetype]! > 1` · [L58](/Users/satwikmekala/stackv3/app/(onboarding)/split-choice.tsx:58) |
| Accessibility / spoken copy | {accessibilityLabel} | [L85](/Users/satwikmekala/stackv3/app/(onboarding)/split-choice.tsx:85) |
| Visible text | Your split is set. But it's yours. | [L154](/Users/satwikmekala/stackv3/app/(onboarding)/split-choice.tsx:154) |
| Visible text | We've customized a split from your training goals — but you can choose. | [L155](/Users/satwikmekala/stackv3/app/(onboarding)/split-choice.tsx:155) |
| Accessibility / spoken copy | Continue with Stack's split | `selectedChoice === 'stack'` · [L161](/Users/satwikmekala/stackv3/app/(onboarding)/split-choice.tsx:161) |
| Visible text | STACK'S PICK | [L165](/Users/satwikmekala/stackv3/app/(onboarding)/split-choice.tsx:165) |
| Visible text | Continue with Stack's split | [L166](/Users/satwikmekala/stackv3/app/(onboarding)/split-choice.tsx:166) |
| Dynamic copy / value | {profile?.weeklyGoal} workouts a week | [L167](/Users/satwikmekala/stackv3/app/(onboarding)/split-choice.tsx:167) |
| Visible text | 0 workouts a week | [L167](/Users/satwikmekala/stackv3/app/(onboarding)/split-choice.tsx:167) |
| Dynamic copy / value | {String.fromCharCode(65 + index)} | [L183](/Users/satwikmekala/stackv3/app/(onboarding)/split-choice.tsx:183) |
| Dynamic copy / value | {label} | [L187](/Users/satwikmekala/stackv3/app/(onboarding)/split-choice.tsx:187) |
| Visible text | Exercises are customizable inside the split. | [L194](/Users/satwikmekala/stackv3/app/(onboarding)/split-choice.tsx:194) |
| Accessibility / spoken copy | Customize your own split | [L199](/Users/satwikmekala/stackv3/app/(onboarding)/split-choice.tsx:199) |
| Visible text | Customize your own split | [L203](/Users/satwikmekala/stackv3/app/(onboarding)/split-choice.tsx:203) |
| Visible text | Full agency — build your own workouts and exercises. | [L204](/Users/satwikmekala/stackv3/app/(onboarding)/split-choice.tsx:204) |
| Visible text | You can change your split anytime. | [L211](/Users/satwikmekala/stackv3/app/(onboarding)/split-choice.tsx:211) |
| Accessibility / spoken copy | Continue to custom split builder | `otherwise: selectedChoice === 'stack'` · [L213](/Users/satwikmekala/stackv3/app/(onboarding)/split-choice.tsx:213) |

<a id="source-app-onboarding-welcome-tsx"></a>

### Legacy onboarding — Welcome

Source: [app/(onboarding)/welcome.tsx](/Users/satwikmekala/stackv3/app/(onboarding)/welcome.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Track your progress | [L17](/Users/satwikmekala/stackv3/app/(onboarding)/welcome.tsx:17) |
| Label / supplied copy | Every lift, PR and streak in one place. | [L18](/Users/satwikmekala/stackv3/app/(onboarding)/welcome.tsx:18) |
| Label / supplied copy | Set weekly gym goals | [L23](/Users/satwikmekala/stackv3/app/(onboarding)/welcome.tsx:23) |
| Label / supplied copy | Pick your days and hit them each week. | [L24](/Users/satwikmekala/stackv3/app/(onboarding)/welcome.tsx:24) |
| Label / supplied copy | See your journey | [L29](/Users/satwikmekala/stackv3/app/(onboarding)/welcome.tsx:29) |
| Label / supplied copy | Watch strength climb week over week. | [L30](/Users/satwikmekala/stackv3/app/(onboarding)/welcome.tsx:30) |
| Accessibility / spoken copy | Stack logo | [L46](/Users/satwikmekala/stackv3/app/(onboarding)/welcome.tsx:46) |
| Visible text | Stack | [L50](/Users/satwikmekala/stackv3/app/(onboarding)/welcome.tsx:50) |
| Visible text | Strength,<br>stacked daily. | [L54](/Users/satwikmekala/stackv3/app/(onboarding)/welcome.tsx:54) |
| Visible text | Small sessions, stacked up over weeks. Let's set up your training. | [L55](/Users/satwikmekala/stackv3/app/(onboarding)/welcome.tsx:55) |
| Dynamic copy / value | {title} | [L67](/Users/satwikmekala/stackv3/app/(onboarding)/welcome.tsx:67) |
| Dynamic copy / value | {description} | [L68](/Users/satwikmekala/stackv3/app/(onboarding)/welcome.tsx:68) |

<a id="source-app-onboarding-whatsurname-tsx"></a>

### Legacy onboarding — Name

Source: [app/(onboarding)/whatsurname.tsx](/Users/satwikmekala/stackv3/app/(onboarding)/whatsurname.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Visible text | What should we call you? | [L52](/Users/satwikmekala/stackv3/app/(onboarding)/whatsurname.tsx:52) |
| Label / supplied copy | Your name | [L70](/Users/satwikmekala/stackv3/app/(onboarding)/whatsurname.tsx:70) |

<a id="source-components-button-tsx"></a>

### Button

Source: [components/Button.tsx](/Users/satwikmekala/stackv3/components/Button.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {title} | `otherwise: loading` · [L65](/Users/satwikmekala/stackv3/components/Button.tsx:65) |

<a id="source-components-input-tsx"></a>

### Input

Source: [components/Input.tsx](/Users/satwikmekala/stackv3/components/Input.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {label} | [L18](/Users/satwikmekala/stackv3/components/Input.tsx:18) |
| Dynamic copy / value | {placeholder} | [L31](/Users/satwikmekala/stackv3/components/Input.tsx:31) |

<a id="source-components-motivationquote-tsx"></a>

### Motivation Quote

Source: [components/MotivationQuote.tsx](/Users/satwikmekala/stackv3/components/MotivationQuote.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Consistency beats intensity | [L6](/Users/satwikmekala/stackv3/components/MotivationQuote.tsx:6) |
| Label / supplied copy | Progress, not perfection | [L7](/Users/satwikmekala/stackv3/components/MotivationQuote.tsx:7) |
| Label / supplied copy | Show up, even on hard days | [L8](/Users/satwikmekala/stackv3/components/MotivationQuote.tsx:8) |
| Label / supplied copy | Every workout counts | [L9](/Users/satwikmekala/stackv3/components/MotivationQuote.tsx:9) |
| Label / supplied copy | Small steps, big results | [L10](/Users/satwikmekala/stackv3/components/MotivationQuote.tsx:10) |
| Label / supplied copy | Trust the process | [L11](/Users/satwikmekala/stackv3/components/MotivationQuote.tsx:11) |
| Label / supplied copy | You're stronger than yesterday | [L12](/Users/satwikmekala/stackv3/components/MotivationQuote.tsx:12) |
| Label / supplied copy | One day at a time | [L13](/Users/satwikmekala/stackv3/components/MotivationQuote.tsx:13) |
| Dynamic copy / value | "{quote}" | [L27](/Users/satwikmekala/stackv3/components/MotivationQuote.tsx:27) |

<a id="source-components-onboardingcontrols-tsx"></a>

### Onboarding Controls

Source: [components/OnboardingControls.tsx](/Users/satwikmekala/stackv3/components/OnboardingControls.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Accessibility / spoken copy | Go back | [L39](/Users/satwikmekala/stackv3/components/OnboardingControls.tsx:39) |
| Label / supplied copy | Continue | [L59](/Users/satwikmekala/stackv3/components/OnboardingControls.tsx:59) |
| Accessibility / spoken copy | {accessibilityLabel} | [L82](/Users/satwikmekala/stackv3/components/OnboardingControls.tsx:82) |

<a id="source-components-statuspill-tsx"></a>

### Status Pill

Source: [components/StatusPill.tsx](/Users/satwikmekala/stackv3/components/StatusPill.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {label.toUpperCase()} | [L22](/Users/satwikmekala/stackv3/components/StatusPill.tsx:22) |

## Startup, navigation, missing screens, validation and persistence messages

<a id="source-app-tabs-layout-tsx"></a>

### _layout

Source: [app/(tabs)/_layout.tsx](/Users/satwikmekala/stackv3/app/(tabs)/_layout.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Visible text | Train | [L15](/Users/satwikmekala/stackv3/app/(tabs)/_layout.tsx:15) |
| Visible text | Progress | [L24](/Users/satwikmekala/stackv3/app/(tabs)/_layout.tsx:24) |
| Visible text | Stack | [L34](/Users/satwikmekala/stackv3/app/(tabs)/_layout.tsx:34) |

<a id="source-app-not-found-tsx"></a>

### Missing screen

Source: [app/+not-found.tsx](/Users/satwikmekala/stackv3/app/+not-found.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Oops! | [L7](/Users/satwikmekala/stackv3/app/+not-found.tsx:7) |
| Visible text | This screen doesn't exist. | [L9](/Users/satwikmekala/stackv3/app/+not-found.tsx:9) |
| Visible text | Go to home screen! | [L11](/Users/satwikmekala/stackv3/app/+not-found.tsx:11) |

<a id="source-app-layout-tsx"></a>

### Root navigation and initialization

Source: [app/_layout.tsx](/Users/satwikmekala/stackv3/app/_layout.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | / | `hydrationError && !onSplash` · [L159](/Users/satwikmekala/stackv3/app/_layout.tsx:159) |
| Label / supplied copy | Workout summary | [L219](/Users/satwikmekala/stackv3/app/_layout.tsx:219) |
| Label / supplied copy | History | [L251](/Users/satwikmekala/stackv3/app/_layout.tsx:251) |
| Label / supplied copy | Progress | [L252](/Users/satwikmekala/stackv3/app/_layout.tsx:252) |
| Label / supplied copy | Weekly history | [L266](/Users/satwikmekala/stackv3/app/_layout.tsx:266) |

<a id="source-app-index-tsx"></a>

### Startup / loading / recovery

Source: [app/index.tsx](/Users/satwikmekala/stackv3/app/index.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Accessibility / spoken copy | Stack | [L168](/Users/satwikmekala/stackv3/app/index.tsx:168) |
| Visible text | stack | [L229](/Users/satwikmekala/stackv3/app/index.tsx:229) |
| Visible text | We couldn't open your workout data. | `hydrationError` · [L234](/Users/satwikmekala/stackv3/app/index.tsx:234) |
| Visible text | Your data hasn't been reset. Try again in case the problem is temporary. | `hydrationError` · [L235](/Users/satwikmekala/stackv3/app/index.tsx:235) |
| Visible text | Trying again… | `hydrationError` · [L247](/Users/satwikmekala/stackv3/app/index.tsx:247) |
| Visible text | Try again | `hydrationError` · [L247](/Users/satwikmekala/stackv3/app/index.tsx:247) |

<a id="source-store-adhocworkout-ts"></a>

### adhoc Workout

Source: [store/adhocWorkout.ts](/Users/satwikmekala/stackv3/store/adhocWorkout.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Workout | [L12](/Users/satwikmekala/stackv3/store/adhocWorkout.ts:12) |

<a id="source-store-apppreferences-ts"></a>

### app Preferences

Source: [store/appPreferences.ts](/Users/satwikmekala/stackv3/store/appPreferences.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Validation / error | Invalid preferences | `typeof value?.haptics !== 'boolean' \|\| typeof value?.liveActivities !== 'boolean'` · [L17](/Users/satwikmekala/stackv3/store/appPreferences.ts:17) |

<a id="source-store-customsplitdraft-ts"></a>

### custom Split Draft

Source: [store/customSplitDraft.ts](/Users/satwikmekala/stackv3/store/customSplitDraft.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Chest | [L12](/Users/satwikmekala/stackv3/store/customSplitDraft.ts:12) |
| Label / supplied copy | Back | [L13](/Users/satwikmekala/stackv3/store/customSplitDraft.ts:13) |
| Label / supplied copy | Shoulders | [L14](/Users/satwikmekala/stackv3/store/customSplitDraft.ts:14) |
| Label / supplied copy | Biceps | `exercise.workoutType === 'arms' → otherwise: /tricep/i.test(exercise.primaryMuscle)` · [L15](/Users/satwikmekala/stackv3/store/customSplitDraft.ts:15) |
| Label / supplied copy | Triceps | `exercise.workoutType === 'arms' → /tricep/i.test(exercise.primaryMuscle)` · [L16](/Users/satwikmekala/stackv3/store/customSplitDraft.ts:16) |
| Label / supplied copy | Core | [L17](/Users/satwikmekala/stackv3/store/customSplitDraft.ts:17) |
| Label / supplied copy | Legs | [L18](/Users/satwikmekala/stackv3/store/customSplitDraft.ts:18) |
| Label / supplied copy | Draft could not be saved on this device. Keep this screen open and try again. | `!useCustomSplitDraftStore.getState().storageError` · [L590](/Users/satwikmekala/stackv3/store/customSplitDraft.ts:590) |
| Validation / error | Unsupported draft version | [L598](/Users/satwikmekala/stackv3/store/customSplitDraft.ts:598) |
| Validation / error | Invalid saved drafts | `!saved \|\| !saved.drafts \|\| typeof saved.drafts !== 'object' \|\| Array.isArray(saved.drafts)` · [L602](/Users/satwikmekala/stackv3/store/customSplitDraft.ts:602) |
| Validation / error | Invalid saved draft | `!snapshot \|\| key !== splitDraftKey(snapshot.editingSplitId) \|\| !snapshot.draft \|\| typeof snapshot.draft.name !== 'string' \|\| !Array.isArray(snapshot.draft.workouts) \|\| !snapshot.draft.workouts.length \|\| snapshot.draft.workouts.some(day => !day \|\| typeof day.id !== 'string' \|\| typeof day.customName !== 'string' \|\| !Array.isArray(day.exercises))` · [L608](/Users/satwikmekala/stackv3/store/customSplitDraft.ts:608) |
| Label / supplied copy | Could not load your drafts. Try again before editing. | `error` · [L617](/Users/satwikmekala/stackv3/store/customSplitDraft.ts:617) |

<a id="source-store-customsplits-ts"></a>

### custom Splits

Source: [store/customSplits.ts](/Users/satwikmekala/stackv3/store/customSplits.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | This workout doesn't have any exercises yet — add some first. | [L5](/Users/satwikmekala/stackv3/store/customSplits.ts:5) |
| Dynamic copy / value | Custom split workout {workoutId} has no exercises | [L9](/Users/satwikmekala/stackv3/store/customSplits.ts:9) |

<a id="source-store-exercisemeasurement-ts"></a>

### exercise Measurement

Source: [store/exerciseMeasurement.ts](/Users/satwikmekala/stackv3/store/exerciseMeasurement.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | reps | [L7](/Users/satwikmekala/stackv3/store/exerciseMeasurement.ts:7) |
| Label / supplied copy | — | `typeof seconds !== 'number' \|\| !Number.isFinite(seconds) \|\| seconds < 0` · [L33](/Users/satwikmekala/stackv3/store/exerciseMeasurement.ts:33) |
| Dynamic copy / value | {Math.floor(whole / 60)}:{String(whole % 60).padStart(2, '0')} | [L35](/Users/satwikmekala/stackv3/store/exerciseMeasurement.ts:35) |
| Label / supplied copy | 0 sets | `durations.length === 0` · [L54](/Users/satwikmekala/stackv3/store/exerciseMeasurement.ts:54) |
| Dynamic copy / value | {durations.length} × {formatDuration(low)} | `low === high` · [L56](/Users/satwikmekala/stackv3/store/exerciseMeasurement.ts:56) |
| Dynamic copy / value | {durations.length} × {formatDuration(low)}–{formatDuration(high)} | `varied === 'range'` · [L58](/Users/satwikmekala/stackv3/store/exerciseMeasurement.ts:58) |

<a id="source-store-exercisenotes-ts"></a>

### exercise Notes

Source: [store/exerciseNotes.ts](/Users/satwikmekala/stackv3/store/exerciseNotes.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Validation / error | Write a note before saving. | `!text` · [L13](/Users/satwikmekala/stackv3/store/exerciseNotes.ts:13) |
| Validation / error | Keep your note under {EXERCISE_NOTE_MAX_LENGTH.toLocaleString()} characters. | `text.length > EXERCISE_NOTE_MAX_LENGTH` · [L15](/Users/satwikmekala/stackv3/store/exerciseNotes.ts:15) |

<a id="source-store-exercisewrapup-ts"></a>

### exercise Wrap Up

Source: [store/exerciseWrapUp.ts](/Users/satwikmekala/stackv3/store/exerciseWrapUp.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | reps | `otherwise: getExerciseMetric(exercise) === 'duration' → exercise.loadType === 'bodyweight'` · [L82](/Users/satwikmekala/stackv3/store/exerciseWrapUp.ts:82) |

<a id="source-store-liftlog-ts"></a>

### lift Log

Source: [store/liftLog.ts](/Users/satwikmekala/stackv3/store/liftLog.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | 0 sets | `reps.length === 0` · [L35](/Users/satwikmekala/stackv3/store/liftLog.ts:35) |
| Dynamic copy / value | {reps.length} × {low} | `low === high` · [L37](/Users/satwikmekala/stackv3/store/liftLog.ts:37) |
| Dynamic copy / value | {reps.length} × {low}–{high} | `varied === 'range'` · [L38](/Users/satwikmekala/stackv3/store/liftLog.ts:38) |
| Dynamic copy / value | {reps.join(' · ')} reps | `otherwise: varied === 'range'` · [L38](/Users/satwikmekala/stackv3/store/liftLog.ts:38) |
| Label / supplied copy | lbs | `weighted → unit === 'lbs'; otherwise: bodyweight → unit === 'lbs'` · [L71](/Users/satwikmekala/stackv3/store/liftLog.ts:71) |
| Label / supplied copy | kg | `weighted → otherwise: unit === 'lbs'; otherwise: bodyweight → otherwise: unit === 'lbs'` · [L71](/Users/satwikmekala/stackv3/store/liftLog.ts:71) |
| Label / supplied copy | reps | `bodyweight` · [L84](/Users/satwikmekala/stackv3/store/liftLog.ts:84) |

<a id="source-store-liftprogress-ts"></a>

### lift Progress

Source: [store/liftProgress.ts](/Users/satwikmekala/stackv3/store/liftProgress.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | BW × {set.reps} | `set.bodyweight` · [L82](/Users/satwikmekala/stackv3/store/liftProgress.ts:82) |
| Dynamic copy / value | {formatWeight(set.weight, unit)} {unitLabel(unit)} × {set.reps} | `otherwise: set.bodyweight` · [L82](/Users/satwikmekala/stackv3/store/liftProgress.ts:82) |
| Dynamic copy / value | Previous: {formatLiftPerformance(lift.previous, unit)} | `lift.previous` · [L91](/Users/satwikmekala/stackv3/store/liftProgress.ts:91) |

<a id="source-store-liftprogresspreferences-ts"></a>

### lift Progress Preferences

Source: [store/liftProgressPreferences.ts](/Users/satwikmekala/stackv3/store/liftProgressPreferences.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Validation / error | Invalid lift preferences | `value && (!Array.isArray(value.names) \|\| !value.names.every((name: unknown) => typeof name === 'string') \|\| typeof value.automatic !== 'boolean')` · [L27](/Users/satwikmekala/stackv3/store/liftProgressPreferences.ts:27) |

<a id="source-store-musclecolors-ts"></a>

### muscle Colors

Source: [store/muscleColors.ts](/Users/satwikmekala/stackv3/store/muscleColors.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Validation / error | Invalid muscle colors | `!stored \|\| typeof stored !== 'object' \|\| Array.isArray(stored)` · [L27](/Users/satwikmekala/stackv3/store/muscleColors.ts:27) |
| Validation / error | Invalid muscle color | `stored[type] !== null && !isMuscleColor(stored[type])` · [L31](/Users/satwikmekala/stackv3/store/muscleColors.ts:31) |

<a id="source-store-onboardingdraft-ts"></a>

### onboarding Draft

Source: [store/onboardingDraft.ts](/Users/satwikmekala/stackv3/store/onboardingDraft.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Validation / error | Could not read your setup. Try again. | `value?.version !== 1 \|\| !d \|\| !['welcome', 'starting-point', 'frequency', 'program-preview'].includes(d.step) \|\| ![null, 'track', 'explore', 'stack'].includes(d.choice) \|\| !(d.frequency === null \|\| Number.isInteger(d.frequency) && d.frequency >= 1 && d.frequency <= 6) \|\| !['full-body', 'push-pull-legs'].includes(d.structure)` · [L26](/Users/satwikmekala/stackv3/store/onboardingDraft.ts:26) |
| Label / supplied copy | Could not save your setup. Try again. | `otherwise: error instanceof Error` · [L49](/Users/satwikmekala/stackv3/store/onboardingDraft.ts:49) |

<a id="source-store-personalrecords-ts"></a>

### personal Records

Source: [store/personalRecords.ts](/Users/satwikmekala/stackv3/store/personalRecords.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Chest | [L26](/Users/satwikmekala/stackv3/store/personalRecords.ts:26) |
| Label / supplied copy | Back | [L27](/Users/satwikmekala/stackv3/store/personalRecords.ts:27) |
| Label / supplied copy | Shoulders | [L28](/Users/satwikmekala/stackv3/store/personalRecords.ts:28) |
| Label / supplied copy | Biceps | [L29](/Users/satwikmekala/stackv3/store/personalRecords.ts:29) |
| Label / supplied copy | Triceps | [L30](/Users/satwikmekala/stackv3/store/personalRecords.ts:30) |
| Label / supplied copy | Arms | [L31](/Users/satwikmekala/stackv3/store/personalRecords.ts:31) |
| Label / supplied copy | Legs | [L32](/Users/satwikmekala/stackv3/store/personalRecords.ts:32) |
| Label / supplied copy | Core | [L33](/Users/satwikmekala/stackv3/store/personalRecords.ts:33) |
| Label / supplied copy | Other | [L34](/Users/satwikmekala/stackv3/store/personalRecords.ts:34) |

<a id="source-store-programpreferences-ts"></a>

### program Preferences

Source: [store/programPreferences.ts](/Users/satwikmekala/stackv3/store/programPreferences.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Validation / error | Invalid program preferences. | `!['none', 'stack', 'custom'].includes(programMode) \|\| !['full-body', 'push-pull-legs'].includes(threeDayStructure) \|\| typeof weightUnitConfirmed !== 'boolean' \|\| (programMode === 'custom' ? !Number.isInteger(profile.activeSplitId) \|\| (profile.activeSplitId ?? 0) <= 0 : profile.activeSplitId !== null)` · [L26](/Users/satwikmekala/stackv3/store/programPreferences.ts:26) |

<a id="source-store-sharedroutinehandoff-ts"></a>

### shared Routine Handoff

Source: [store/sharedRoutineHandoff.ts](/Users/satwikmekala/stackv3/store/sharedRoutineHandoff.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Could not keep your shared routine. Try again. | [L11](/Users/satwikmekala/stackv3/store/sharedRoutineHandoff.ts:11) |
| Validation / error | Could not read your shared routine. Try again. | `value?.version !== 1 \|\| !p \|\| typeof p.token !== 'string' \|\| !parseSharedSplit(p.token).ok \|\| (p.attemptId !== undefined && (typeof p.attemptId !== 'string' \|\| !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.attemptId))) \|\| !(p.saved === null \|\| p.saved && Number.isSafeInteger(p.saved.splitId) && p.saved.splitId > 0 && typeof p.saved.name === 'string')` · [L20](/Users/satwikmekala/stackv3/store/sharedRoutineHandoff.ts:20) |

<a id="source-store-splitimport-ts"></a>

### split Import

Source: [store/splitImport.ts](/Users/satwikmekala/stackv3/store/splitImport.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Validation / error | Could not recover this import. Please open the shared routine again. | `attemptId !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attemptId)` · [L52](/Users/satwikmekala/stackv3/store/splitImport.ts:52) |
| Validation / error | This split uses exercises from a newer version of Stack. Update Stack to import it. | `exercise.kind === 'builtin' && !seedByKey.has(exerciseMatchKey(exercise.name))` · [L59](/Users/satwikmekala/stackv3/store/splitImport.ts:59) |
| Validation / error | This import belongs to a different routine. | `receipt → receipt.payload !== serialized.value` · [L69](/Users/satwikmekala/stackv3/store/splitImport.ts:69) |
| Validation / error | This saved routine could not be recovered. | `receipt → !existing` · [L71](/Users/satwikmekala/stackv3/store/splitImport.ts:71) |

<a id="source-store-trainingpreferences-ts"></a>

### training Preferences

Source: [store/trainingPreferences.ts](/Users/satwikmekala/stackv3/store/trainingPreferences.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Monday | [L20](/Users/satwikmekala/stackv3/store/trainingPreferences.ts:20) |
| Label / supplied copy | Tuesday | [L20](/Users/satwikmekala/stackv3/store/trainingPreferences.ts:20) |
| Label / supplied copy | Wednesday | [L20](/Users/satwikmekala/stackv3/store/trainingPreferences.ts:20) |
| Label / supplied copy | Thursday | [L20](/Users/satwikmekala/stackv3/store/trainingPreferences.ts:20) |
| Label / supplied copy | Friday | [L20](/Users/satwikmekala/stackv3/store/trainingPreferences.ts:20) |
| Label / supplied copy | Saturday | [L20](/Users/satwikmekala/stackv3/store/trainingPreferences.ts:20) |
| Label / supplied copy | Sunday | [L20](/Users/satwikmekala/stackv3/store/trainingPreferences.ts:20) |
| Label / supplied copy | Flexible | `otherwise: days.length` · [L22](/Users/satwikmekala/stackv3/store/trainingPreferences.ts:22) |

<a id="source-store-weightunits-ts"></a>

### weight Units

Source: [store/weightUnits.ts](/Users/satwikmekala/stackv3/store/weightUnits.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | lbs | `unit === 'lbs'` · [L37](/Users/satwikmekala/stackv3/store/weightUnits.ts:37) |
| Label / supplied copy | kg | `otherwise: unit === 'lbs'` · [L37](/Users/satwikmekala/stackv3/store/weightUnits.ts:37) |

<a id="source-store-workoutbackup-ts"></a>

### workout Backup

Source: [store/workoutBackup.ts](/Users/satwikmekala/stackv3/store/workoutBackup.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Validation / error | Choose a Stack backup file. | `!value \|\| typeof value !== 'object'` · [L31](/Users/satwikmekala/stackv3/store/workoutBackup.ts:31) |
| Validation / error | This backup is not compatible with this version of Stack. | `backup.format !== 'stack-backup' \|\| backup.version !== 1 \|\| (backup.schemaVersion !== schemaVersion && !legacy)` · [L35](/Users/satwikmekala/stackv3/store/workoutBackup.ts:35) |
| Validation / error | This backup is incomplete. | `!backup.tables \|\| typeof backup.tables !== 'object'; !Array.isArray(rows)` · [L36](/Users/satwikmekala/stackv3/store/workoutBackup.ts:36) |
| Validation / error | This backup contains invalid data. | `!row \|\| typeof row !== 'object' \|\| Array.isArray(row) \|\| Object.keys(row).length !== columns.length \|\| columns.some(column => !Object.hasOwn(row, column)) \|\| Object.values(row).some(cell => cell !== null && typeof cell !== 'string' && !(typeof cell === 'number' && Number.isFinite(cell)))` · [L46](/Users/satwikmekala/stackv3/store/workoutBackup.ts:46) |
| Label / supplied copy | kg | `profile.length !== 1 \|\| profile[0].id !== 1 \|\| typeof profile[0].name !== 'string' \|\| typeof profile[0].weekly_goal !== 'number' \|\| !Number.isInteger(profile[0].weekly_goal) \|\| profile[0].weekly_goal < 0 \|\| profile[0].weekly_goal > 7 \|\| typeof profile[0].program_weekly_goal !== 'number' \|\| !Number.isInteger(profile[0].program_weekly_goal) \|\| profile[0].program_weekly_goal < 1 \|\| profile[0].program_weekly_goal > 6 \|\| !['kg', 'lbs'].includes(String(profile[0].weight_unit)) \|\| !['beginner', 'intermediate', 'advanced'].includes(String(profile[0].experience_level))` · [L55](/Users/satwikmekala/stackv3/store/workoutBackup.ts:55) |
| Label / supplied copy | lbs | `profile.length !== 1 \|\| profile[0].id !== 1 \|\| typeof profile[0].name !== 'string' \|\| typeof profile[0].weekly_goal !== 'number' \|\| !Number.isInteger(profile[0].weekly_goal) \|\| profile[0].weekly_goal < 0 \|\| profile[0].weekly_goal > 7 \|\| typeof profile[0].program_weekly_goal !== 'number' \|\| !Number.isInteger(profile[0].program_weekly_goal) \|\| profile[0].program_weekly_goal < 1 \|\| profile[0].program_weekly_goal > 6 \|\| !['kg', 'lbs'].includes(String(profile[0].weight_unit)) \|\| !['beginner', 'intermediate', 'advanced'].includes(String(profile[0].experience_level))` · [L55](/Users/satwikmekala/stackv3/store/workoutBackup.ts:55) |
| Validation / error | This backup has an invalid profile. | `profile.length !== 1 \|\| profile[0].id !== 1 \|\| typeof profile[0].name !== 'string' \|\| typeof profile[0].weekly_goal !== 'number' \|\| !Number.isInteger(profile[0].weekly_goal) \|\| profile[0].weekly_goal < 0 \|\| profile[0].weekly_goal > 7 \|\| typeof profile[0].program_weekly_goal !== 'number' \|\| !Number.isInteger(profile[0].program_weekly_goal) \|\| profile[0].program_weekly_goal < 1 \|\| profile[0].program_weekly_goal > 6 \|\| !['kg', 'lbs'].includes(String(profile[0].weight_unit)) \|\| !['beginner', 'intermediate', 'advanced'].includes(String(profile[0].experience_level)); (selected.active_split_id !== null && (typeof selected.active_split_id !== 'number' \|\| !Number.isInteger(selected.active_split_id) \|\| selected.active_split_id <= 0)) \|\| ![0, 1].includes(Number(selected.onboarding_completed)) \|\| typeof selected.onboarding_completed !== 'number' \|\| ![0, 1].includes(Number(selected.auto_increase_weight)) \|\| typeof selected.auto_increase_weight !== 'number'` · [L57](/Users/satwikmekala/stackv3/store/workoutBackup.ts:57) |
| Validation / error | This backup has invalid program preferences. | `!legacy && (!['none', 'stack', 'custom'].includes(String(selected.program_mode)) \|\| !['full-body', 'push-pull-legs'].includes(String(selected.three_day_structure)) \|\| typeof selected.weight_unit_confirmed !== 'number' \|\| ![0, 1].includes(selected.weight_unit_confirmed) \|\| (selected.program_mode === 'custom' ? selected.active_split_id === null : selected.active_split_id !== null))` · [L68](/Users/satwikmekala/stackv3/store/workoutBackup.ts:68) |
| Validation / error | This backup has an invalid schedule. | `!Array.isArray(days) \|\| days.some(day => !Number.isInteger(day) \|\| day < 0 \|\| day > 6) \|\| new Set(days).size !== days.length` · [L70](/Users/satwikmekala/stackv3/store/workoutBackup.ts:70) |
| Validation / error | Finish the active workout before creating a backup. | `backup.tables.sessions.some(session => session.completed !== 1)` · [L74](/Users/satwikmekala/stackv3/store/workoutBackup.ts:74) |
| Validation / error | This backup contains invalid identifiers. | `backup.tables.sqlite_sequence.some(row => !BACKUP_TABLES.includes(row.name as Table) \|\| typeof row.seq !== 'number' \|\| !Number.isInteger(row.seq) \|\| row.seq < 0)` · [L77](/Users/satwikmekala/stackv3/store/workoutBackup.ts:77) |
| Validation / error | This backup has broken exercise or workout references. | `db.getAllSync('PRAGMA foreign_key_check').length` · [L105](/Users/satwikmekala/stackv3/store/workoutBackup.ts:105) |
| Validation / error | This backup could not be verified. | `db.getFirstSync<{ integrity_check: string }>('PRAGMA integrity_check')?.integrity_check !== 'ok'` · [L107](/Users/satwikmekala/stackv3/store/workoutBackup.ts:107) |
| Dynamic copy / value | "{text.replaceAll('"', '""')}" | [L115](/Users/satwikmekala/stackv3/store/workoutBackup.ts:115) |
| Label / supplied copy | Workout ID | [L120](/Users/satwikmekala/stackv3/store/workoutBackup.ts:120) |
| Label / supplied copy | Started at | [L120](/Users/satwikmekala/stackv3/store/workoutBackup.ts:120) |
| Label / supplied copy | Finished at | [L120](/Users/satwikmekala/stackv3/store/workoutBackup.ts:120) |
| Label / supplied copy | Origin | [L120](/Users/satwikmekala/stackv3/store/workoutBackup.ts:120) |
| Label / supplied copy | Exercise | [L120](/Users/satwikmekala/stackv3/store/workoutBackup.ts:120) |
| Label / supplied copy | Load type | [L120](/Users/satwikmekala/stackv3/store/workoutBackup.ts:120) |
| Label / supplied copy | Metric | [L120](/Users/satwikmekala/stackv3/store/workoutBackup.ts:120) |
| Label / supplied copy | Set | [L121](/Users/satwikmekala/stackv3/store/workoutBackup.ts:121) |
| Label / supplied copy | Weight (kg) | [L121](/Users/satwikmekala/stackv3/store/workoutBackup.ts:121) |
| Label / supplied copy | Reps | [L121](/Users/satwikmekala/stackv3/store/workoutBackup.ts:121) |
| Label / supplied copy | Duration (seconds) | [L121](/Users/satwikmekala/stackv3/store/workoutBackup.ts:121) |
| Label / supplied copy | Logged | [L121](/Users/satwikmekala/stackv3/store/workoutBackup.ts:121) |
| Label / supplied copy | Skipped | [L121](/Users/satwikmekala/stackv3/store/workoutBackup.ts:121) |
| Label / supplied copy | Set type | [L121](/Users/satwikmekala/stackv3/store/workoutBackup.ts:121) |
| Label / supplied copy | Notes | [L121](/Users/satwikmekala/stackv3/store/workoutBackup.ts:121) |

<a id="source-store-workoutdatabase-ts"></a>

### workout Database

Source: [store/workoutDatabase.ts](/Users/satwikmekala/stackv3/store/workoutDatabase.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | kg | [L53](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:53) |
| Label / supplied copy | reps | `!exercise` · [L79](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:79) |
| Label / supplied copy | Plank | [L98](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:98) |
| Label / supplied copy | Bench Press | [L121](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:121) |
| Label / supplied copy | Chest | [L121](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:121) |
| Label / supplied copy | Triceps, Front Delts | [L121](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:121) |
| Label / supplied copy | Incline Dumbbell Press | [L122](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:122) |
| Label / supplied copy | Upper Chest | [L122](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:122) |
| Label / supplied copy | Front Delts, Triceps | [L122](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:122) |
| Label / supplied copy | Chest Dips | [L123](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:123) |
| Label / supplied copy | Lower Chest, Triceps | [L123](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:123) |
| Label / supplied copy | Front Delts | [L123](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:123) |
| Label / supplied copy | Cable Fly | [L124](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:124) |
| Label / supplied copy | Incline Bench Press | [L125](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:125) |
| Label / supplied copy | Triceps, Front Delts, Core | [L126](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:126) |
| Label / supplied copy | Pec Deck | [L127](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:127) |
| Label / supplied copy | Decline Press | [L128](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:128) |
| Label / supplied copy | Lower Chest | [L128](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:128) |
| Label / supplied copy | Triceps | [L128](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:128) |
| Label / supplied copy | Machine Chest Press | [L129](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:129) |
| Label / supplied copy | Incline Cable Fly | [L130](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:130) |
| Label / supplied copy | Dumbbell Bench Press | [L131](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:131) |
| Label / supplied copy | Dumbbell Fly | [L132](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:132) |
| Label / supplied copy | Cable Crossover | [L133](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:133) |
| Label / supplied copy | Low-to-High Cable Fly | [L134](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:134) |
| Label / supplied copy | High-to-Low Cable Fly | [L135](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:135) |
| Label / supplied copy | Single-Arm Cable Fly | [L136](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:136) |
| Label / supplied copy | Smith Machine Bench Press | [L137](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:137) |
| Label / supplied copy | Smith Machine Incline Press | [L138](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:138) |
| Label / supplied copy | Decline Dumbbell Press | [L139](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:139) |
| Label / supplied copy | Decline Dumbbell Fly | [L140](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:140) |
| Label / supplied copy | Incline Machine Chest Press | [L141](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:141) |
| Label / supplied copy | Flat Machine Chest Press | [L142](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:142) |
| Label / supplied copy | Svend Press | [L143](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:143) |
| Label / supplied copy | Deadlift | [L145](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:145) |
| Label / supplied copy | Back, Hamstrings, Glutes | [L145](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:145) |
| Label / supplied copy | Traps, Forearms | [L145](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:145) |
| Label / supplied copy | Lats | [L146](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:146) |
| Label / supplied copy | Biceps | [L146](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:146) |
| Label / supplied copy | Barbell Rows | [L147](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:147) |
| Label / supplied copy | Lats, Mid-back | [L147](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:147) |
| Label / supplied copy | Biceps, Rear Delts | [L147](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:147) |
| Label / supplied copy | Lat Pulldown | [L148](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:148) |
| Label / supplied copy | Seated Cable Row | [L149](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:149) |
| Label / supplied copy | Mid-back, Lats | [L149](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:149) |
| Label / supplied copy | T-Bar Row | [L150](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:150) |
| Label / supplied copy | Single-Arm Dumbbell Row | [L151](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:151) |
| Label / supplied copy | Back Extensions | [L152](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:152) |
| Label / supplied copy | Lower Back | [L152](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:152) |
| Label / supplied copy | Glutes, Hamstrings | [L152](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:152) |
| Label / supplied copy | Chest-Supported Row | [L153](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:153) |
| Label / supplied copy | Rear Delts, Biceps | [L153](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:153) |
| Label / supplied copy | Straight-Arm Pulldown | [L154](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:154) |
| Label / supplied copy | Back | [L155](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:155) |
| Label / supplied copy | Wide-Grip Lat Pulldown | [L156](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:156) |
| Label / supplied copy | Close-Grip Lat Pulldown | [L157](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:157) |
| Label / supplied copy | Neutral-Grip Lat Pulldown | [L158](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:158) |
| Label / supplied copy | Single-Arm Lat Pulldown | [L159](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:159) |
| Label / supplied copy | Pendlay Row | [L160](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:160) |
| Label / supplied copy | Meadows Row | [L161](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:161) |
| Label / supplied copy | Machine Row | [L162](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:162) |
| Label / supplied copy | High Row Machine | [L163](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:163) |
| Label / supplied copy | Dumbbell Pullover | [L164](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:164) |
| Label / supplied copy | Chest, Triceps | [L164](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:164) |
| Label / supplied copy | Cable Pullover | [L165](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:165) |
| Label / supplied copy | Seal Row | [L166](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:166) |
| Label / supplied copy | Rack Pull | [L167](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:167) |
| Label / supplied copy | Glutes, Hamstrings, Traps | [L167](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:167) |
| Label / supplied copy | Inverted Row | [L168](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:168) |
| Label / supplied copy | Overhead Press | [L170](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:170) |
| Label / supplied copy | Front/Side Delts | [L170](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:170) |
| Label / supplied copy | Lateral Raises | [L171](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:171) |
| Label / supplied copy | Side Delts | [L171](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:171) |
| Label / supplied copy | Face Pulls | [L172](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:172) |
| Label / supplied copy | Rear Delts | [L172](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:172) |
| Label / supplied copy | Traps | [L172](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:172) |
| Label / supplied copy | Front Raises | [L173](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:173) |
| Label / supplied copy | Arnold Press | [L174](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:174) |
| Label / supplied copy | Rear Delt Fly | [L175](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:175) |
| Label / supplied copy | Upright Rows | [L176](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:176) |
| Label / supplied copy | Side Delts, Traps | [L176](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:176) |
| Label / supplied copy | Shrugs | [L177](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:177) |
| Label / supplied copy | Cable Lateral Raise | [L178](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:178) |
| Label / supplied copy | Landmine Press | [L179](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:179) |
| Label / supplied copy | Front Delts, Chest | [L179](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:179) |
| Label / supplied copy | Seated Dumbbell Shoulder Press | [L180](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:180) |
| Label / supplied copy | Shoulders | [L180](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:180) |
| Label / supplied copy | Machine Shoulder Press | [L181](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:181) |
| Label / supplied copy | Smith Machine Shoulder Press | [L182](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:182) |
| Label / supplied copy | Single-Arm Cable Lateral Raise | [L183](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:183) |
| Label / supplied copy | Lean-Away Cable Lateral Raise | [L184](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:184) |
| Label / supplied copy | Cable Rear Delt Fly | [L185](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:185) |
| Label / supplied copy | Reverse Pec Deck | [L186](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:186) |
| Label / supplied copy | Dumbbell Rear Delt Fly | [L187](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:187) |
| Label / supplied copy | Y Raise | [L188](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:188) |
| Label / supplied copy | Plate Front Raise | [L189](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:189) |
| Label / supplied copy | Cable Front Raise | [L190](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:190) |
| Label / supplied copy | Bradford Press | [L191](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:191) |
| Label / supplied copy | Bicep Curls | [L193](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:193) |
| Label / supplied copy | Dumbbell Curl | [L194](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:194) |
| Label / supplied copy | Hammer Curls | [L195](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:195) |
| Label / supplied copy | Forearms | [L195](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:195) |
| Label / supplied copy | Preacher Curls | [L196](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:196) |
| Label / supplied copy | Cable Curls | [L197](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:197) |
| Label / supplied copy | Tricep Extensions | [L198](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:198) |
| Label / supplied copy | Tricep Dips | [L199](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:199) |
| Label / supplied copy | Chest, Front Delts | [L199](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:199) |
| Label / supplied copy | Tricep Pushdown | [L200](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:200) |
| Label / supplied copy | Skull Crushers | [L201](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:201) |
| Label / supplied copy | Close-Grip Bench Press | [L202](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:202) |
| Label / supplied copy | EZ-Bar Curl | [L203](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:203) |
| Label / supplied copy | Incline Dumbbell Curl | [L204](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:204) |
| Label / supplied copy | Concentration Curl | [L205](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:205) |
| Label / supplied copy | Bayesian Cable Curl | [L206](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:206) |
| Label / supplied copy | Spider Curl | [L207](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:207) |
| Label / supplied copy | Reverse Curl | [L208](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:208) |
| Label / supplied copy | Rope Hammer Curl | [L209](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:209) |
| Label / supplied copy | Cross-Body Hammer Curl | [L210](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:210) |
| Label / supplied copy | Machine Bicep Curl | [L211](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:211) |
| Label / supplied copy | Single-Arm Cable Curl | [L212](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:212) |
| Label / supplied copy | Drag Curl | [L213](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:213) |
| Label / supplied copy | Zottman Curl | [L214](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:214) |
| Label / supplied copy | Rope Triceps Pushdown | [L215](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:215) |
| Label / supplied copy | Overhead Cable Triceps Extension | [L216](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:216) |
| Label / supplied copy | Single-Arm Cable Triceps Pushdown | [L217](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:217) |
| Label / supplied copy | Single-Arm Overhead Cable Extension | [L218](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:218) |
| Label / supplied copy | Dumbbell Overhead Triceps Extension | [L219](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:219) |
| Label / supplied copy | Triceps Kickback | [L220](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:220) |
| Label / supplied copy | Cable Triceps Kickback | [L221](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:221) |
| Label / supplied copy | JM Press | [L222](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:222) |
| Label / supplied copy | Reverse-Grip Triceps Pushdown | [L223](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:223) |
| Label / supplied copy | Assisted Dip | [L224](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:224) |
| Label / supplied copy | Machine Dip | [L225](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:225) |
| Label / supplied copy | Squats | [L227](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:227) |
| Label / supplied copy | Quads | [L227](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:227) |
| Label / supplied copy | Glutes | [L227](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:227) |
| Label / supplied copy | Leg Press | [L228](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:228) |
| Label / supplied copy | Romanian Deadlift | [L229](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:229) |
| Label / supplied copy | Hamstrings | [L229](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:229) |
| Label / supplied copy | Glutes, Lower Back | [L229](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:229) |
| Label / supplied copy | Lunges | [L230](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:230) |
| Label / supplied copy | Quads, Glutes | [L230](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:230) |
| Label / supplied copy | Leg Curl | [L231](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:231) |
| Label / supplied copy | Leg Extension | [L232](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:232) |
| Label / supplied copy | Calf Raises | [L233](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:233) |
| Label / supplied copy | Calves | [L233](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:233) |
| Label / supplied copy | Hip Thrusts | [L234](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:234) |
| Label / supplied copy | Front Squat | [L235](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:235) |
| Label / supplied copy | Core | [L235](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:235) |
| Label / supplied copy | Bulgarian Split Squat | [L236](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:236) |
| Label / supplied copy | Hack Squat | [L237](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:237) |
| Label / supplied copy | Legs | [L237](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:237) |
| Label / supplied copy | Goblet Squat | [L238](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:238) |
| Label / supplied copy | Smith Machine Squat | [L239](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:239) |
| Label / supplied copy | Sumo Deadlift | [L240](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:240) |
| Label / supplied copy | Glutes, Hamstrings, Back | [L240](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:240) |
| Label / supplied copy | Good Morning | [L241](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:241) |
| Label / supplied copy | Reverse Lunge | [L243](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:243) |
| Label / supplied copy | Walking Dumbbell Lunge | [L244](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:244) |
| Label / supplied copy | Seated Leg Curl | [L245](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:245) |
| Label / supplied copy | Lying Leg Curl | [L246](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:246) |
| Label / supplied copy | Nordic Hamstring Curl | [L247](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:247) |
| Label / supplied copy | Single-Leg Curl | [L248](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:248) |
| Label / supplied copy | Adductor Machine | [L249](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:249) |
| Label / supplied copy | Abductor Machine | [L250](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:250) |
| Label / supplied copy | Seated Calf Raise | [L251](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:251) |
| Label / supplied copy | Standing Calf Raise | [L252](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:252) |
| Label / supplied copy | Donkey Calf Raise | [L253](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:253) |
| Label / supplied copy | Glute Bridge | [L254](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:254) |
| Label / supplied copy | Cable Pull-Through | [L255](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:255) |
| Label / supplied copy | Belt Squat | [L256](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:256) |
| Label / supplied copy | Pendulum Squat | [L257](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:257) |
| Label / supplied copy | Single-Leg Press | [L258](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:258) |
| Label / supplied copy | Abs / Core Stability | [L260](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:260) |
| Label / supplied copy | Crunches | [L261](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:261) |
| Label / supplied copy | Abs | [L261](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:261) |
| Label / supplied copy | Cable Crunch | [L262](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:262) |
| Label / supplied copy | Hanging Leg Raise | [L263](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:263) |
| Label / supplied copy | Hip Flexors | [L263](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:263) |
| Label / supplied copy | Leg Raises | [L264](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:264) |
| Label / supplied copy | Lower Abs | [L264](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:264) |
| Label / supplied copy | Russian Twists | [L265](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:265) |
| Label / supplied copy | Obliques | [L265](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:265) |
| Label / supplied copy | Ab Wheel Rollout | [L266](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:266) |
| Label / supplied copy | Lower Back, Shoulders | [L266](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:266) |
| Label / supplied copy | Mountain Climbers | [L267](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:267) |
| Label / supplied copy | Side Plank | [L268](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:268) |
| Label / supplied copy | Cable Woodchopper | [L269](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:269) |
| Label / supplied copy | Core Rotation | [L269](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:269) |
| Label / supplied copy | Hanging Knee Raise | [L270](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:270) |
| Label / supplied copy | Reverse Crunch | [L271](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:271) |
| Label / supplied copy | Bicycle Crunch | [L272](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:272) |
| Label / supplied copy | Dead Bug | [L273](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:273) |
| Label / supplied copy | Pallof Press | [L274](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:274) |
| Label / supplied copy | Hollow Body Hold | [L276](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:276) |
| Label / supplied copy | Decline Crunch | [L277](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:277) |
| Label / supplied copy | Ab Crunch Machine | [L278](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:278) |
| Label / supplied copy | Toe Touches | [L279](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:279) |
| Label / supplied copy | Kneeling Cable Crunch | [L280](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:280) |
| Label / supplied copy | Weighted Sit-Up | [L281](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:281) |
| Label / supplied copy | Bird Dog | [L282](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:282) |
| Label / supplied copy | Suitcase Carry | [L284](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:284) |
| Label / supplied copy | Farmer Carry | [L285](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:285) |
| Label / supplied copy | Forearms, Traps | [L285](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:285) |
| Label / supplied copy | Squat | [L316](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:316) |
| Label / supplied copy | Barbell Bench Press | [L321](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:321) |
| Label / supplied copy | Dips | [L324](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:324) |
| Label / supplied copy | Lateral Raise | [L325](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:325) |
| Label / supplied copy | Barbell Row | [L328](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:328) |
| Label / supplied copy | Face Pull | [L329](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:329) |
| Label / supplied copy | Barbell Curl | [L330](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:330) |
| Label / supplied copy | Back Squat | [L331](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:331) |
| Label / supplied copy | Calf Raise | [L335](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:335) |
| Label / supplied copy | Biceps Curl | [L340](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:340) |
| Label / supplied copy | Hip Thrust | [L349](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:349) |
| Label / supplied copy | Walking Lunge | [L350](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:350) |
| Label / supplied copy | Triceps Pushdown | [L362](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:362) |
| Label / supplied copy | Incline Barbell Press | [L364](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:364) |
| Label / supplied copy | Overhead Triceps Extension | [L368](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:368) |
| Label / supplied copy | Hammer Curl | [L373](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:373) |
| Validation / error | Missing seeded exercise: {seed.name} | `!exercise` · [L977](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:977) |
| Validation / error | Missing archetype exercise: {seed.exerciseName} | `!exercise` · [L1108](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:1108) |
| Validation / error | Workout database seed did not produce {EXERCISE_SEEDS.length + ARCHETYPE_EXERCISE_SEEDS.length} exercises, {SPLIT_TEMPLATE_SEEDS.length} split templates, and {ARCHETYPE_TEMPLATE_SEEDS.length} archetype templates | `exerciseCount?.count !== EXERCISE_SEEDS.length + ARCHETYPE_EXERCISE_SEEDS.length \|\| templateCount?.count !== SPLIT_TEMPLATE_SEEDS.length \|\| archetypeTemplateCount?.count !== ARCHETYPE_TEMPLATE_SEEDS.length` · [L1185](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:1185) |
| Validation / error | Session workout type migration left sessions without a workout type | `(missingWorkoutTypes?.count ?? 0) > 0` · [L1471](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:1471) |
| Validation / error | Archetype template seed did not produce 72 templates | `archetypeTemplateCount?.count !== ARCHETYPE_TEMPLATE_SEEDS.length` · [L1497](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:1497) |
| Validation / error | Workout database rebuild failed its foreign key check | `foreignKeyErrors.length > 0` · [L1599](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:1599) |
| Validation / error | Workout database used before initialization | `!database` · [L1824](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:1824) |
| Validation / error | No archetype variants found for {archetype} | `variants.length === 0` · [L1899](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:1899) |
| Label / supplied copy | WHERE s.completed = 1 | [L1982](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:1982) |
| Label / supplied copy | WHERE s.id = ? | [L2068](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:2068) |
| Validation / error | Custom split not found. | `!split; !db.getFirstSync<ExerciseIdRow>( 'SELECT id FROM custom_splits WHERE id = ?', splitId )` · [L2128](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:2128) |
| Validation / error | Custom split workout not found. | `!workout; !source` · [L2163](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:2163) |
| Validation / error | Custom split name cannot be empty. | `!normalizedName` · [L2169](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:2169) |
| Dynamic copy / value | Split {highestNumber + 1} | [L2350](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:2350) |
| Validation / error | Custom split workout exercise not found. | `!relationship` · [L2527](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:2527) |
| Validation / error | Exercise name cannot be empty. | `!normalizedName; !name` · [L2562](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:2562) |
| Validation / error | Invalid load type. | `loadType !== 'external_weight' && loadType !== 'bodyweight'` · [L2563](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:2563) |
| Validation / error | Invalid exercise metric. | `metric !== 'reps' && metric !== 'duration'` · [L2564](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:2564) |
| Validation / error | Routine name cannot be empty. | `!normalizedName` · [L2599](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:2599) |
| Validation / error | Only completed ad-hoc workouts can be saved as routines. | `!source` · [L2604](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:2604) |
| Validation / error | Log at least one non-skipped set before saving a routine. | `!exercises.length` · [L2608](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:2608) |
| Validation / error | A custom split needs at least one workout. | `workouts.length === 0` · [L2633](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:2633) |
| Validation / error | A custom split needs at least one exercise. | `workouts.every((workout) => workout.exerciseIds.length === 0)` · [L2636](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:2636) |
| Validation / error | Exercise {exerciseId} no longer exists. | `!db.getFirstSync<ExerciseIdRow>( 'SELECT id FROM exercises WHERE id = ?', exerciseId )` · [L2668](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:2668) |
| Validation / error | A profile is required to select a program. | `options.activate !== false \|\| options.completeOnboarding → result.changes !== 1; result.changes !== 1` · [L2690](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:2690) |
| Validation / error | A workout session must have one or two workout types | `workoutTypes.length < 1 \|\| workoutTypes.length > 2` · [L2848](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:2848) |
| Validation / error | A workout session cannot contain the same workout type twice | `new Set(workoutTypes).size !== workoutTypes.length` · [L2851](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:2851) |
| Validation / error | Unknown exercise: {name} | `!exercise` · [L2860](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:2860) |
| Validation / error | Unknown exercise: {exercise.name} | `!row` · [L2874](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:2874) |
| Validation / error | A profile is required to start a workout | `!readProfileSync(); !profile` · [L2982](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:2982) |
| Validation / error | Unknown custom split workout: {workoutId} | `!workoutRow` · [L3044](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:3044) |
| Validation / error | Custom split workout {workoutId} does not belong to split {splitId} | `workoutRow.split_id !== splitId` · [L3048](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:3048) |
| Validation / error | An archetype workout must have one or two archetypes | `archetypes.length < 1 \|\| archetypes.length > 2` · [L3128](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:3128) |
| Validation / error | Could not load the selected workout variant. | `variants && (variants.length !== archetypes.length \|\| variants.some((variant, index) => !readArchetypeVariantsSync(archetypes[index]).includes(variant)))` · [L3136](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:3136) |
| Validation / error | A retroactive archetype workout must have one or two archetypes | `archetypes.length < 1 \|\| archetypes.length > 2` · [L3203](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:3203) |
| Validation / error | The current set no longer exists | `id === null` · [L3290](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:3290) |
| Validation / error | The current exercise no longer exists | `!row` · [L3341](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:3341) |
| Validation / error | The exercise no longer exists | `!actual \|\| !sameSetTarget(actual, target)` · [L3348](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:3348) |
| Validation / error | Invalid exercise entry unit | `unit !== 'kg' && unit !== 'lbs'` · [L3349](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:3349) |
| Validation / error | The exercise unit could not be saved | `result.changes !== 1` · [L3354](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:3354) |
| Validation / error | This workout is no longer active. | `!session \|\| (expectedSessionId && String(session.id) !== expectedSessionId)` · [L3452](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:3452) |
| Validation / error | This exercise is already in your workout. | `db.getFirstSync(ˋSELECT se.id FROM session_exercises se JOIN exercises e ON e.id = se.exercise_id WHERE se.session_id = ? AND e.name = ?ˋ, session.id, exercise.name)` · [L3456](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:3456) |
| Validation / error | Log at least one non-skipped set before finishing your workout. | `result.changes !== 1` · [L3506](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:3506) |
| Validation / error | Exercise not found. | `!exercise` · [L3619](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:3619) |
| Validation / error | This exercise has logged history and cannot be renamed. | `hasExerciseHistoryInDatabase(db, id)` · [L3622](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:3622) |
| Validation / error | An exercise named "{name}" already exists. | `conflict; error instanceof Error && error.message.toLowerCase().includes('unique constraint')` · [L3631](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:3631) |
| Label / supplied copy | unique constraint | `error instanceof Error && error.message.toLowerCase().includes('unique constraint') → error instanceof Error` · [L3639](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:3639) |
| Validation / error | This exercise has logged history and cannot be deleted. | `hasExerciseHistoryInDatabase(db, exerciseId)` · [L3670](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:3670) |
| Label / supplied copy | WITH workout_types(workout_type, rotation_order) AS (<br>VALUES<br>('chest', 0),<br>('back', 1),<br>('shoulders', 2),<br>('arms', 3),<br>('legs', 4),<br>('core', 5)<br>)<br>SELECT<br>wt.workout_type,<br>(<br>SELECT s.date<br>FROM sessions s<br>JOIN session_workout_types swt ON swt.session_id = s.id<br>WHERE s.completed = 1<br>AND swt.workout_type = wt.workout_type<br>ORDER BY s.date DESC, s.id ASC<br>LIMIT 1<br>) AS last_completed_date<br>FROM workout_types wt<br>ORDER BY<br>last_completed_date IS NOT NULL ASC,<br>last_completed_date ASC,<br>wt.rotation_order ASC | [L3760](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:3760) |
| Label / supplied copy | WITH archetypes(archetype, rotation_order) AS (<br>VALUES<br>('push', 0),<br>('pull', 1),<br>('legs', 2),<br>('upper', 3),<br>('lower', 4),<br>('full_body', 5)<br>)<br>SELECT<br>a.archetype,<br>(<br>SELECT s.date<br>FROM sessions s<br>WHERE s.completed = 1<br>AND (s.archetype = a.archetype OR s.secondary_archetype = a.archetype)<br>ORDER BY s.date DESC, s.id ASC<br>LIMIT 1<br>) AS last_completed_date<br>FROM archetypes a<br>ORDER BY<br>last_completed_date IS NOT NULL ASC,<br>last_completed_date ASC,<br>a.rotation_order ASC | [L3795](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:3795) |
| Validation / error | This exercise is no longer in the active workout. | `!target` · [L3967](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:3967) |

<a id="source-store-workoutlaunch-ts"></a>

### workout Launch

Source: [store/workoutLaunch.ts](/Users/satwikmekala/stackv3/store/workoutLaunch.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | kg | [L6](/Users/satwikmekala/stackv3/store/workoutLaunch.ts:6) |

<a id="source-store-workoutprogression-ts"></a>

### workout Progression

Source: [store/workoutProgression.ts](/Users/satwikmekala/stackv3/store/workoutProgression.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | reps | [L29](/Users/satwikmekala/stackv3/store/workoutProgression.ts:29) |
| Label / supplied copy | kg | [L226](/Users/satwikmekala/stackv3/store/workoutProgression.ts:226) |

<a id="source-store-workoutsetactions-ts"></a>

### workout Set Actions

Source: [store/workoutSetActions.ts](/Users/satwikmekala/stackv3/store/workoutSetActions.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Weight | `action.endsWith('Weight')` · [L14](/Users/satwikmekala/stackv3/store/workoutSetActions.ts:14) |
| Label / supplied copy | Reps | `action.endsWith('Reps')` · [L15](/Users/satwikmekala/stackv3/store/workoutSetActions.ts:15) |
| Label / supplied copy | Duration | `action.endsWith('Duration')` · [L16](/Users/satwikmekala/stackv3/store/workoutSetActions.ts:16) |

<a id="source-store-workoutstore-ts"></a>

### workout Store

Source: [store/workoutStore.ts](/Users/satwikmekala/stackv3/store/workoutStore.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | kg | [L197](/Users/satwikmekala/stackv3/store/workoutStore.ts:197) |
| Label / supplied copy | reps | [L347](/Users/satwikmekala/stackv3/store/workoutStore.ts:347) |
| Alert / confirmation | Couldn't save | [L399](/Users/satwikmekala/stackv3/store/workoutStore.ts:399) |
| Alert / confirmation | Something went wrong. Please try again. | [L399](/Users/satwikmekala/stackv3/store/workoutStore.ts:399) |
| Validation / error | This workout is no longer active. | `get().currentSession?.id !== workoutId` · [L437](/Users/satwikmekala/stackv3/store/workoutStore.ts:437) |
| Validation / error | Choose kilograms or pounds. | `unit !== 'kg' && unit !== 'lbs'` · [L631](/Users/satwikmekala/stackv3/store/workoutStore.ts:631) |
| Validation / error | A profile is required to confirm units. | `!existing` · [L633](/Users/satwikmekala/stackv3/store/workoutStore.ts:633) |
| Validation / error | Finish setup before configuring a program. | `context === 'configuration' && !existing?.onboardingCompleted` · [L645](/Users/satwikmekala/stackv3/store/workoutStore.ts:645) |
| Alert / confirmation | Couldn't load your routines | [L698](/Users/satwikmekala/stackv3/store/workoutStore.ts:698) |
| Alert / confirmation | Your selected program is preserved. Try loading them again. | [L698](/Users/satwikmekala/stackv3/store/workoutStore.ts:698) |
| Label / supplied copy | Cancel | [L699](/Users/satwikmekala/stackv3/store/workoutStore.ts:699) |
| Label / supplied copy | Retry | [L700](/Users/satwikmekala/stackv3/store/workoutStore.ts:700) |
| Alert / confirmation | Couldn't load this routine | [L721](/Users/satwikmekala/stackv3/store/workoutStore.ts:721) |
| Alert / confirmation | Your selected program is preserved. Try loading it again. | [L721](/Users/satwikmekala/stackv3/store/workoutStore.ts:721) |
| Validation / error | Finish setup before using this routine. | `!existing?.onboardingCompleted` · [L819](/Users/satwikmekala/stackv3/store/workoutStore.ts:819) |
| Validation / error | This routine is no longer available. | `!Number.isSafeInteger(splitId) \|\| splitId <= 0` · [L820](/Users/satwikmekala/stackv3/store/workoutStore.ts:820) |
| Validation / error | A workout session must have one or two distinct workout types | `!type \|\| workoutTypes.length > 2 \|\| new Set(workoutTypes).size !== workoutTypes.length` · [L869](/Users/satwikmekala/stackv3/store/workoutStore.ts:869) |
| Validation / error | A profile is required to start a workout | `!profile` · [L873](/Users/satwikmekala/stackv3/store/workoutStore.ts:873) |
| Validation / error | A profile is required to swap an exercise | `!profile` · [L1022](/Users/satwikmekala/stackv3/store/workoutStore.ts:1022) |
| Alert / confirmation | Already added | `session.exercises.some((exercise) => exercise.name === name)` · [L1038](/Users/satwikmekala/stackv3/store/workoutStore.ts:1038) |
| Alert / confirmation | This exercise is already in your workout. | `session.exercises.some((exercise) => exercise.name === name)` · [L1038](/Users/satwikmekala/stackv3/store/workoutStore.ts:1038) |
| Validation / error | A profile is required to append an exercise | `!profile` · [L1049](/Users/satwikmekala/stackv3/store/workoutStore.ts:1049) |
| Alert / confirmation | Log a set first | `!session.exercises.some((exercise) => exercise.sets.some((set) => set.completed === true && set.skipped !== true))` · [L1075](/Users/satwikmekala/stackv3/store/workoutStore.ts:1075) |
| Alert / confirmation | Log at least one non-skipped set before finishing your workout. | `!session.exercises.some((exercise) => exercise.sets.some((set) => set.completed === true && set.skipped !== true))` · [L1075](/Users/satwikmekala/stackv3/store/workoutStore.ts:1075) |
| Validation / error | Workout seed data must contain 159 exercises and 24 templates | `__DEV__ → uniqueSeedNames.size !== 159 \|\| SPLIT_TEMPLATE_SEEDS.length !== 24` · [L1279](/Users/satwikmekala/stackv3/store/workoutStore.ts:1279) |

<a id="source-store-workoutsummary-ts"></a>

### workout Summary

Source: [store/workoutSummary.ts](/Users/satwikmekala/stackv3/store/workoutSummary.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {primaryArchetype.shortLabel} + {secondaryArchetype.shortLabel} | `primaryArchetype → secondaryArchetype` · [L116](/Users/satwikmekala/stackv3/store/workoutSummary.ts:116) |
| Label / supplied copy | Workout | `otherwise: session.origin === 'adhoc' → otherwise: primaryArchetype` · [L118](/Users/satwikmekala/stackv3/store/workoutSummary.ts:118) |
| Label / supplied copy | Felt easy | `intensity === 'easy'` · [L153](/Users/satwikmekala/stackv3/store/workoutSummary.ts:153) |
| Label / supplied copy | Felt hard | `intensity === 'hard'` · [L154](/Users/satwikmekala/stackv3/store/workoutSummary.ts:154) |
| Label / supplied copy | Felt just right | [L155](/Users/satwikmekala/stackv3/store/workoutSummary.ts:155) |
| Label / supplied copy | PR | `entries.length === 1 → type === 'pr'` · [L170](/Users/satwikmekala/stackv3/store/workoutSummary.ts:170) |
| Label / supplied copy | DROP | `otherwise: type === 'pr' → type === 'dropset'` · [L170](/Users/satwikmekala/stackv3/store/workoutSummary.ts:170) |
| Label / supplied copy | EXTRA | `otherwise: type === 'pr' → otherwise: type === 'dropset'` · [L170](/Users/satwikmekala/stackv3/store/workoutSummary.ts:170) |
| Dynamic copy / value | {count} {name} SET LOGGED | `entries.length === 1` · [L171](/Users/satwikmekala/stackv3/store/workoutSummary.ts:171) |
| Dynamic copy / value | {count} {name} SETS LOGGED | `entries.length === 1` · [L171](/Users/satwikmekala/stackv3/store/workoutSummary.ts:171) |
| Label / supplied copy | S | `entries.length === 1 → otherwise: count === 1; otherwise: total === 1` · [L171](/Users/satwikmekala/stackv3/store/workoutSummary.ts:171) |
| Dynamic copy / value | {total} SPECIAL SET LOGGED | [L174](/Users/satwikmekala/stackv3/store/workoutSummary.ts:174) |
| Dynamic copy / value | {total} SPECIAL SETS LOGGED | [L174](/Users/satwikmekala/stackv3/store/workoutSummary.ts:174) |
| Dynamic copy / value | {formatWeight(low, unit)}–{formatWeight(high, unit)} | `otherwise: low === high` · [L182](/Users/satwikmekala/stackv3/store/workoutSummary.ts:182) |
| Dynamic copy / value | {range} {unitLabel(unit)} | [L183](/Users/satwikmekala/stackv3/store/workoutSummary.ts:183) |
| Label / supplied copy | No sets logged | `amounts.length === 0` · [L195](/Users/satwikmekala/stackv3/store/workoutSummary.ts:195) |
| Dynamic copy / value | {formatWeight(weightAt(top), unit)} {unitLabel(unit)} | `weightAt(top) > 0` · [L204](/Users/satwikmekala/stackv3/store/workoutSummary.ts:204) |
| Dynamic copy / value | {amounts.length} × {amount} at {load} | `uniform` · [L207](/Users/satwikmekala/stackv3/store/workoutSummary.ts:207) |
| Dynamic copy / value | {amounts.length} × {amount} | `uniform` · [L207](/Users/satwikmekala/stackv3/store/workoutSummary.ts:207) |
| Dynamic copy / value | at {load} | `uniform → load` · [L207](/Users/satwikmekala/stackv3/store/workoutSummary.ts:207) |
| Label / supplied copy | Time per set | `uniform → timed` · [L208](/Users/satwikmekala/stackv3/store/workoutSummary.ts:208) |
| Label / supplied copy | Sets × reps | `otherwise: timed → loaded` · [L208](/Users/satwikmekala/stackv3/store/workoutSummary.ts:208) |
| Label / supplied copy | Bodyweight · sets × reps | `otherwise: timed → otherwise: loaded` · [L208](/Users/satwikmekala/stackv3/store/workoutSummary.ts:208) |
| Dynamic copy / value | {load} · {amount} | `load` · [L212](/Users/satwikmekala/stackv3/store/workoutSummary.ts:212) |
| Dynamic copy / value | {load} × {amount} | `load` · [L212](/Users/satwikmekala/stackv3/store/workoutSummary.ts:212) |
| Label / supplied copy | × | `load → otherwise: timed` · [L212](/Users/satwikmekala/stackv3/store/workoutSummary.ts:212) |
| Dynamic copy / value | BW × {amount} | `otherwise: load → otherwise: timed` · [L212](/Users/satwikmekala/stackv3/store/workoutSummary.ts:212) |
| Dynamic copy / value | Longest hold · {exercise.setCount} set | [L213](/Users/satwikmekala/stackv3/store/workoutSummary.ts:213) |
| Dynamic copy / value | Longest hold · {exercise.setCount} sets | [L213](/Users/satwikmekala/stackv3/store/workoutSummary.ts:213) |
| Dynamic copy / value | Top set · {exercise.setCount} set | [L213](/Users/satwikmekala/stackv3/store/workoutSummary.ts:213) |
| Dynamic copy / value | Top set · {exercise.setCount} sets | [L213](/Users/satwikmekala/stackv3/store/workoutSummary.ts:213) |
| Label / supplied copy | Longest hold | `timed && !loaded` · [L213](/Users/satwikmekala/stackv3/store/workoutSummary.ts:213) |
| Label / supplied copy | Top set | `otherwise: timed && !loaded` · [L213](/Users/satwikmekala/stackv3/store/workoutSummary.ts:213) |
| Dynamic copy / value | {formatSummaryNumber(displayVolume(exercise.volumeKg, unit))} {unitLabel(unit)} | [L236](/Users/satwikmekala/stackv3/store/workoutSummary.ts:236) |
| Dynamic copy / value | {exercise.setCount} sets, {exercise.durationsBySet.map(formatDuration).join(', ')}, {load} | `exercise.metric === 'duration'` · [L244](/Users/satwikmekala/stackv3/store/workoutSummary.ts:244) |
| Dynamic copy / value | {exercise.setCount} sets, {exercise.durationsBySet.map(formatDuration).join(', ')} | `exercise.metric === 'duration'` · [L244](/Users/satwikmekala/stackv3/store/workoutSummary.ts:244) |
| Dynamic copy / value | , {load} | `exercise.metric === 'duration' → load` · [L244](/Users/satwikmekala/stackv3/store/workoutSummary.ts:244) |
| Dynamic copy / value | {exercise.setCount} sets, {exercise.repCount} reps, {formatSummaryNumber(displayVolume(exercise.volumeKg, unit))} {unitLabel(unit)} volume | [L246](/Users/satwikmekala/stackv3/store/workoutSummary.ts:246) |

## Workout names, exercise catalog and exercise guidance

<a id="source-constants-archetypes-ts"></a>

### archetypes

Source: [constants/archetypes.ts](/Users/satwikmekala/stackv3/constants/archetypes.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Triceps | [L37](/Users/satwikmekala/stackv3/constants/archetypes.ts:37) |
| Label / supplied copy | Push (Chest, Shoulders, Triceps) | [L38](/Users/satwikmekala/stackv3/constants/archetypes.ts:38) |
| Label / supplied copy | Push | [L39](/Users/satwikmekala/stackv3/constants/archetypes.ts:39) |
| Label / supplied copy | Biceps | [L44](/Users/satwikmekala/stackv3/constants/archetypes.ts:44) |
| Label / supplied copy | Pull (Back, Biceps) | [L45](/Users/satwikmekala/stackv3/constants/archetypes.ts:45) |
| Label / supplied copy | Pull | [L46](/Users/satwikmekala/stackv3/constants/archetypes.ts:46) |
| Label / supplied copy | Legs | [L51](/Users/satwikmekala/stackv3/constants/archetypes.ts:51) |
| Label / supplied copy | Upper Body | [L57](/Users/satwikmekala/stackv3/constants/archetypes.ts:57) |
| Label / supplied copy | Upper | [L58](/Users/satwikmekala/stackv3/constants/archetypes.ts:58) |
| Label / supplied copy | Lower Body | [L63](/Users/satwikmekala/stackv3/constants/archetypes.ts:63) |
| Label / supplied copy | Lower | [L64](/Users/satwikmekala/stackv3/constants/archetypes.ts:64) |
| Label / supplied copy | Full Body | [L69](/Users/satwikmekala/stackv3/constants/archetypes.ts:69) |
| Dynamic copy / value | Workout · {groups.join(' / ')} | `session.origin === 'adhoc' → session.completed && groups.length` · [L93](/Users/satwikmekala/stackv3/constants/archetypes.ts:93) |
| Label / supplied copy | / | `session.origin === 'adhoc' → session.completed && groups.length` · [L93](/Users/satwikmekala/stackv3/constants/archetypes.ts:93) |
| Label / supplied copy | Workout | `session.origin === 'adhoc' → otherwise: session.completed && groups.length` · [L93](/Users/satwikmekala/stackv3/constants/archetypes.ts:93) |
| Dynamic copy / value | {primary.shortLabel} + {secondary.shortLabel} | `session.archetype → secondary` · [L104](/Users/satwikmekala/stackv3/constants/archetypes.ts:104) |

<a id="source-constants-exerciseinfo-ts"></a>

### exercise Info

Source: [constants/exerciseInfo.ts](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Barbell Bicep Curl | [L27](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:27) |
| Label / supplied copy | Arms | [L27](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:27) |
| Label / supplied copy | Bicep Curls | [L27](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:27) |
| Label / supplied copy | Biceps | [L29](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:29) |
| Label / supplied copy | Forearms | [L29](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:29) |
| Label / supplied copy | Grip the bar shoulder-width with your elbows pinned to your sides. Curl to shoulder height and squeeze, then lower slowly without swinging. | [L30](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:30) |
| Label / supplied copy | Barbell Hip Thrust | [L33](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:33) |
| Label / supplied copy | Legs | [L33](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:33) |
| Label / supplied copy | Hip Thrusts | [L33](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:33) |
| Label / supplied copy | Glutes | [L35](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:35) |
| Label / supplied copy | Hamstrings | [L35](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:35) |
| Label / supplied copy | Core | [L35](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:35) |
| Label / supplied copy | Rest your upper back on the bench with the bar over your hips. Drive through your heels until your hips are level with your knees, pause, then lower with control. | [L36](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:36) |
| Label / supplied copy | Barbell Squat | [L39](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:39) |
| Label / supplied copy | Squats | [L39](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:39) |
| Label / supplied copy | Quads | [L41](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:41) |
| Label / supplied copy | Lower back | [L41](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:41) |
| Label / supplied copy | Set the bar across your upper back and keep your feet around shoulder-width. Sit your hips back and down, keep your chest tall, then drive up through your mid-foot. | [L42](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:42) |
| Label / supplied copy | Bench Press | [L45](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:45) |
| Label / supplied copy | Chest | [L45](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:45) |
| Label / supplied copy | Triceps | [L47](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:47) |
| Label / supplied copy | Shoulders | [L47](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:47) |
| Label / supplied copy | Lower the bar toward your mid-chest with your feet planted, then press it back up with control. | [L48](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:48) |
| Label / supplied copy | Bench-Supported Tricep Dip | [L51](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:51) |
| Label / supplied copy | Tricep Dips | [L51](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:51) |
| Label / supplied copy | Support yourself on the bench and lower your body by bending your elbows. Press back up through your triceps while keeping your movement controlled. | [L54](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:54) |
| Label / supplied copy | Cable Chest Fly | [L57](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:57) |
| Label / supplied copy | Cable Fly | [L57](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:57) |
| Label / supplied copy | Keep a slight bend in your elbows and bring the handles together in front of your chest. Squeeze, then return slowly under control. | [L60](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:60) |
| Label / supplied copy | Cable Crossover | [L63](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:63) |
| Label / supplied copy | Front delts | [L65](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:65) |
| Label / supplied copy | Stand between the cable stacks and pull the handles down and across your body. Squeeze your chest, then return with control. | [L66](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:66) |
| Label / supplied copy | Cable Overhead Triceps Extension | [L69](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:69) |
| Label / supplied copy | Overhead Cable Triceps Extension | [L69](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:69) |
| Label / supplied copy | Keep your elbows pointed forward while extending your arms overhead. Squeeze your triceps at full extension, then return slowly. | [L72](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:72) |
| Label / supplied copy | Standing Calf Raise | [L75](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:75) |
| Label / supplied copy | Calf Raises | [L75](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:75) |
| Label / supplied copy | Calves | [L77](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:77) |
| Label / supplied copy | Soleus | [L77](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:77) |
| Label / supplied copy | Rise onto the balls of your feet as high as you can. Squeeze your calves at the top, then lower slowly through the full range. | [L78](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:78) |
| Label / supplied copy | Chest Dips | [L81](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:81) |
| Label / supplied copy | Lean slightly forward as you lower yourself between the bars, then press back up through your chest and triceps. | [L84](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:84) |
| Label / supplied copy | Deadlift | [L87](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:87) |
| Label / supplied copy | Back | [L87](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:87) |
| Label / supplied copy | Brace your core and drive through the floor, extending your hips and knees until you are standing tall with the bar. Lower it with control. | [L90](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:90) |
| Label / supplied copy | Decline Bench Press | [L93](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:93) |
| Label / supplied copy | Decline Press | [L93](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:93) |
| Label / supplied copy | Lower chest | [L95](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:95) |
| Label / supplied copy | Secure your legs on the decline bench and lower the bar toward your lower chest. Press it back up with control. | [L96](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:96) |
| Label / supplied copy | Decline Dumbbell Fly | [L99](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:99) |
| Label / supplied copy | Secure your legs on the decline bench and open the dumbbells wide with a slight bend in your elbows. Bring them together above your chest, then lower slowly. | [L102](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:102) |
| Label / supplied copy | Decline Dumbbell Press | [L105](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:105) |
| Label / supplied copy | Secure your legs on the decline bench and press the dumbbells up from your lower chest. Lower them slowly with your elbows under control. | [L108](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:108) |
| Label / supplied copy | Dumbbell Lateral Raise | [L111](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:111) |
| Label / supplied copy | Lateral Raises | [L111](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:111) |
| Label / supplied copy | Side delts | [L113](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:113) |
| Label / supplied copy | Upper traps | [L113](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:113) |
| Label / supplied copy | Raise the dumbbells out to your sides until around shoulder height, then lower them slowly while keeping your torso still. | [L114](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:114) |
| Label / supplied copy | Incline Bench Press | [L117](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:117) |
| Label / supplied copy | Upper chest | [L119](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:119) |
| Label / supplied copy | Lower the bar toward your upper chest on an incline bench. Keep your feet planted and press the bar up with control. | [L120](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:120) |
| Label / supplied copy | Incline Dumbbell Press | [L123](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:123) |
| Label / supplied copy | Press the dumbbells upward from your upper chest until your arms are extended, then lower them under control. | [L126](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:126) |
| Label / supplied copy | Lat Pulldown | [L129](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:129) |
| Label / supplied copy | Lats | [L131](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:131) |
| Label / supplied copy | Upper back | [L131](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:131) |
| Label / supplied copy | Pull the bar toward your upper chest while driving your elbows down. Control the weight as your arms extend overhead again. | [L132](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:132) |
| Label / supplied copy | Leg Extension | [L135](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:135) |
| Label / supplied copy | Extend your knees until your legs are nearly straight. Squeeze your quads at the top, then lower the weight slowly. | [L138](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:138) |
| Label / supplied copy | Leg Press | [L141](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:141) |
| Label / supplied copy | Lower the platform by bending your knees, then drive through your feet to press it away while keeping the movement controlled. | [L144](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:144) |
| Label / supplied copy | Lying Leg Curl | [L147](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:147) |
| Label / supplied copy | Leg Curl | [L147](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:147) |
| Label / supplied copy | Curl your heels toward your glutes by bending your knees. Squeeze your hamstrings, then lower the weight slowly. | [L150](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:150) |
| Label / supplied copy | Machine Chest Press | [L153](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:153) |
| Label / supplied copy | Flat Machine Chest Press | [L153](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:153) |
| Label / supplied copy | Set the handles around chest height and press them forward until your arms are nearly straight. Return slowly without letting the weight stack slam. | [L156](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:156) |
| Label / supplied copy | Pec Deck Fly | [L159](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:159) |
| Label / supplied copy | Pec Deck | [L159](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:159) |
| Label / supplied copy | Sit with your back against the pad and bring the handles together in front of your chest. Squeeze, then open your arms slowly. | [L162](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:162) |
| Label / supplied copy | Pull your body upward until your chin reaches the bar, then lower yourself under control into a full hang. | [L168](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:168) |
| Label / supplied copy | Keep your body in a straight line as you lower your chest toward the floor. Press back up without letting your hips sag. | [L174](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:174) |
| Label / supplied copy | Seated Cable Row | [L177](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:177) |
| Label / supplied copy | Sit tall and pull the handle toward your torso while driving your elbows back. Extend your arms slowly without rounding your back. | [L180](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:180) |
| Label / supplied copy | Seated Dumbbell Shoulder Press | [L183](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:183) |
| Label / supplied copy | Press the dumbbells overhead until your arms are extended, then lower them back to shoulder level with control. | [L186](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:186) |
| Label / supplied copy | Single-Arm Dumbbell Lateral Raise | [L189](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:189) |
| Label / supplied copy | Raise one dumbbell out to your side until around shoulder height while keeping your torso steady, then lower it slowly. | [L192](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:192) |

<a id="source-constants-musclecolors-ts"></a>

### muscle Colors

Source: [constants/muscleColors.ts](/Users/satwikmekala/stackv3/constants/muscleColors.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Orange | [L5](/Users/satwikmekala/stackv3/constants/muscleColors.ts:5) |
| Label / supplied copy | Blue | [L6](/Users/satwikmekala/stackv3/constants/muscleColors.ts:6) |
| Label / supplied copy | Purple | [L7](/Users/satwikmekala/stackv3/constants/muscleColors.ts:7) |
| Label / supplied copy | Teal | [L8](/Users/satwikmekala/stackv3/constants/muscleColors.ts:8) |
| Label / supplied copy | Lime | [L9](/Users/satwikmekala/stackv3/constants/muscleColors.ts:9) |
| Label / supplied copy | Pink | [L10](/Users/satwikmekala/stackv3/constants/muscleColors.ts:10) |

<a id="source-constants-workouts-ts"></a>

### workouts

Source: [constants/workouts.ts](/Users/satwikmekala/stackv3/constants/workouts.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Chest Day | [L18](/Users/satwikmekala/stackv3/constants/workouts.ts:18) |
| Label / supplied copy | Chest | [L19](/Users/satwikmekala/stackv3/constants/workouts.ts:19) |
| Label / supplied copy | Push | [L20](/Users/satwikmekala/stackv3/constants/workouts.ts:20) |
| Label / supplied copy | Back Day | [L24](/Users/satwikmekala/stackv3/constants/workouts.ts:24) |
| Label / supplied copy | Back | [L25](/Users/satwikmekala/stackv3/constants/workouts.ts:25) |
| Label / supplied copy | Pull | [L26](/Users/satwikmekala/stackv3/constants/workouts.ts:26) |
| Label / supplied copy | Shoulders Day | [L30](/Users/satwikmekala/stackv3/constants/workouts.ts:30) |
| Label / supplied copy | Shoulders | [L31](/Users/satwikmekala/stackv3/constants/workouts.ts:31) |
| Label / supplied copy | Arms Day | [L36](/Users/satwikmekala/stackv3/constants/workouts.ts:36) |
| Label / supplied copy | Arms | [L37](/Users/satwikmekala/stackv3/constants/workouts.ts:37) |
| Label / supplied copy | Upper | [L38](/Users/satwikmekala/stackv3/constants/workouts.ts:38) |
| Label / supplied copy | Legs Day | [L42](/Users/satwikmekala/stackv3/constants/workouts.ts:42) |
| Label / supplied copy | Legs | [L43](/Users/satwikmekala/stackv3/constants/workouts.ts:43) |
| Label / supplied copy | Lower | [L44](/Users/satwikmekala/stackv3/constants/workouts.ts:44) |
| Label / supplied copy | Core Day | [L48](/Users/satwikmekala/stackv3/constants/workouts.ts:48) |
| Label / supplied copy | Core | [L49](/Users/satwikmekala/stackv3/constants/workouts.ts:49) |

## Development, sandbox and sample-fixture copy

These strings belong to development/sandbox screens or presentation fixtures. They are included for completeness; they do not establish real workout history or imply that every fixture is reachable through ordinary app navigation.

<a id="source-app-build-sandbox-tsx"></a>

### build sandbox

Source: [app/build-sandbox.tsx](/Users/satwikmekala/stackv3/app/build-sandbox.tsx).

This route delegates its wording to the shared sources linked in the screen map; it defines no additional literal copy.

<a id="source-app-dev-report-tsx"></a>

### dev report

Source: [app/dev-report.tsx](/Users/satwikmekala/stackv3/app/dev-report.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | kg | [L14](/Users/satwikmekala/stackv3/app/dev-report.tsx:14) |
| Dynamic copy / value | {item.label} | [L28](/Users/satwikmekala/stackv3/app/dev-report.tsx:28) |
| Label / supplied copy | lbs | [L31](/Users/satwikmekala/stackv3/app/dev-report.tsx:31) |
| Dynamic copy / value | {value} | [L33](/Users/satwikmekala/stackv3/app/dev-report.tsx:33) |

<a id="source-app-dev-share-cards-tsx"></a>

### dev share cards

Source: [app/dev-share-cards.tsx](/Users/satwikmekala/stackv3/app/dev-share-cards.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Deadlift | [L12](/Users/satwikmekala/stackv3/app/dev-share-cards.tsx:12) |
| Label / supplied copy | 3 SETS · 1,098 KG | [L12](/Users/satwikmekala/stackv3/app/dev-share-cards.tsx:12) |
| Label / supplied copy | 3 SETS · 24 REPS | [L13](/Users/satwikmekala/stackv3/app/dev-share-cards.tsx:13) |
| Label / supplied copy | Barbell Rows | [L14](/Users/satwikmekala/stackv3/app/dev-share-cards.tsx:14) |
| Label / supplied copy | 3 SETS · 984 KG | [L14](/Users/satwikmekala/stackv3/app/dev-share-cards.tsx:14) |
| Label / supplied copy | Face Pulls | [L15](/Users/satwikmekala/stackv3/app/dev-share-cards.tsx:15) |
| Label / supplied copy | 3 SETS · 594 KG | [L15](/Users/satwikmekala/stackv3/app/dev-share-cards.tsx:15) |
| Label / supplied copy | Barbell Curl | [L16](/Users/satwikmekala/stackv3/app/dev-share-cards.tsx:16) |
| Label / supplied copy | 3 SETS · 708 KG | [L16](/Users/satwikmekala/stackv3/app/dev-share-cards.tsx:16) |
| Label / supplied copy | Pull | [L22](/Users/satwikmekala/stackv3/app/dev-share-cards.tsx:22) |
| Label / supplied copy | Oct 4 | [L22](/Users/satwikmekala/stackv3/app/dev-share-cards.tsx:22) |
| Label / supplied copy | kg | [L22](/Users/satwikmekala/stackv3/app/dev-share-cards.tsx:22) |
| Dynamic copy / value | {label} | [L25](/Users/satwikmekala/stackv3/app/dev-share-cards.tsx:25) |
| Label / supplied copy | Stat Strip | [L34](/Users/satwikmekala/stackv3/app/dev-share-cards.tsx:34) |
| Label / supplied copy | Lift Log | [L35](/Users/satwikmekala/stackv3/app/dev-share-cards.tsx:35) |
| Label / supplied copy | reps | [L36](/Users/satwikmekala/stackv3/app/dev-share-cards.tsx:36) |
| Label / supplied copy | The Stack | [L37](/Users/satwikmekala/stackv3/app/dev-share-cards.tsx:37) |

<a id="source-components-dev-testliveactivitycontrolsnative-ios-tsx"></a>

### Test Live Activity Controls Native

Source: [components/dev/TestLiveActivityControlsNative.ios.tsx](/Users/satwikmekala/stackv3/components/dev/TestLiveActivityControlsNative.ios.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Alert / confirmation | Test Live Activity | [L37](/Users/satwikmekala/stackv3/components/dev/TestLiveActivityControlsNative.ios.tsx:37) |
| Label / supplied copy | Bench Press | [L51](/Users/satwikmekala/stackv3/components/dev/TestLiveActivityControlsNative.ios.tsx:51) |
| Label / supplied copy | Bench | [L52](/Users/satwikmekala/stackv3/components/dev/TestLiveActivityControlsNative.ios.tsx:52) |
| Label / supplied copy | reps | [L55](/Users/satwikmekala/stackv3/components/dev/TestLiveActivityControlsNative.ios.tsx:55) |
| Label / supplied copy | kg | [L57](/Users/satwikmekala/stackv3/components/dev/TestLiveActivityControlsNative.ios.tsx:57) |
| Visible text | Development: TEST Live Activity | [L69](/Users/satwikmekala/stackv3/components/dev/TestLiveActivityControlsNative.ios.tsx:69) |
| Visible text | Test starts are disabled while a real workout is active. | `currentSession \|\| hasRealActivity` · [L73](/Users/satwikmekala/stackv3/components/dev/TestLiveActivityControlsNative.ios.tsx:73) |
| Label / supplied copy | Start Test Live Activity | [L78](/Users/satwikmekala/stackv3/components/dev/TestLiveActivityControlsNative.ios.tsx:78) |
| Label / supplied copy | End Test Live Activity | [L79](/Users/satwikmekala/stackv3/components/dev/TestLiveActivityControlsNative.ios.tsx:79) |

<a id="source-features-build-buildsandbox-tsx"></a>

### Build Sandbox

Source: [features/build/BuildSandbox.tsx](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {text} | [L21](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:21) |
| Label / supplied copy | kg | [L35](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:35) |
| Label / supplied copy | Your work,<br>accounted for. | `mode === 'evidence' → history.state.pieces.length` · [L78](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:78) |
| Label / supplied copy | Nothing built yet. | `mode === 'evidence' → otherwise: history.state.pieces.length; mode === 'history' → weeks === 0` · [L78](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:78) |
| Label / supplied copy | Time,<br>made tangible. | `mode === 'history' → otherwise: weeks === 0` · [L78](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:78) |
| Label / supplied copy | One week.<br>Every colour kept. | `otherwise: mode === 'history' → sealed` · [L78](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:78) |
| Label / supplied copy | A record,<br>cast in gold. | `otherwise: sealed → record` · [L78](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:78) |
| Label / supplied copy | Progress has<br>substance. | `otherwise: record → bucket` · [L78](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:78) |
| Label / supplied copy | You showed up.<br>It has weight. | `otherwise: record → otherwise: bucket` · [L78](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:78) |
| Dynamic copy / value | {history.state.sealedWeeks.length} week built | `history.state.sealedWeeks.length` · [L80](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:80) |
| Dynamic copy / value | {history.state.sealedWeeks.length} weeks built | `history.state.sealedWeeks.length` · [L80](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:80) |
| Dynamic copy / value | {history.state.currentWeek.pieces.length} current piece | `history.state.currentWeek.pieces.length` · [L81](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:81) |
| Dynamic copy / value | {history.state.currentWeek.pieces.length} current pieces | `history.state.currentWeek.pieces.length` · [L81](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:81) |
| Label / supplied copy | and | [L82](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:82) |
| Label / supplied copy | No pieces on the tower | [L82](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:82) |
| Accessibility / spoken copy | Close Your Stack sandbox | [L86](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:86) |
| Visible text | YOUR STACK | [L87](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:87) |
| Accessibility / spoken copy | Open object tuning | [L88](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:88) |
| Visible text | TRAINING EVIDENCE · 02 | [L91](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:91) |
| Visible text | OBJECT STUDY · 01 | [L91](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:91) |
| Dynamic copy / value | {title} | [L92](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:92) |
| Visible text | Development sandbox · saved history | [L93](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:93) |
| Visible text | Development sandbox · illustrative history | [L93](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:93) |
| Accessibility / spoken copy | {evidenceSceneLabel}. Gold record treatment. | `slabs.length` · [L95](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:95) |
| Accessibility / spoken copy | {evidenceSceneLabel}. | `slabs.length` · [L95](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:95) |
| Accessibility / spoken copy | {weeks} sealed {'week'} and two current pieces. Gold record treatment. | [L95](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:95) |
| Accessibility / spoken copy | {weeks} sealed {'week'} and two current pieces. | [L95](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:95) |
| Accessibility / spoken copy | {weeks} sealed {'weeks'} and two current pieces. Gold record treatment. | [L95](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:95) |
| Accessibility / spoken copy | {weeks} sealed {'weeks'} and two current pieces. | [L95](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:95) |
| Accessibility / spoken copy | Two current pieces. Gold record treatment. | `slabs.length` · [L95](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:95) |
| Accessibility / spoken copy | Two current pieces. | `slabs.length` · [L95](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:95) |
| Accessibility / spoken copy | One keyed slab. Gold record treatment. | `slabs.length` · [L95](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:95) |
| Accessibility / spoken copy | One keyed slab. | `slabs.length` · [L95](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:95) |
| Accessibility / spoken copy | Nothing built yet. No pieces on the tower. | `otherwise: slabs.length` · [L95](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:95) |
| Accessibility / spoken copy | {weeks} sealed week and two current pieces. Gold record treatment. | `slabs.length` · [L95](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:95) |
| Accessibility / spoken copy | {weeks} sealed week and two current pieces. | `slabs.length` · [L95](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:95) |
| Accessibility / spoken copy | {weeks} sealed weeks and two current pieces. Gold record treatment. | `slabs.length` · [L95](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:95) |
| Accessibility / spoken copy | {weeks} sealed weeks and two current pieces. | `slabs.length` · [L95](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:95) |
| Accessibility / spoken copy | {weeks} sealed week and two current pieces | `mode === 'history' → weeks > 0` · [L95](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:95) |
| Accessibility / spoken copy | {weeks} sealed weeks and two current pieces | `mode === 'history' → weeks > 0` · [L95](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:95) |
| Accessibility / spoken copy | week | `weeks > 0 → weeks === 1` · [L95](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:95) |
| Accessibility / spoken copy | weeks | `weeks > 0 → otherwise: weeks === 1` · [L95](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:95) |
| Accessibility / spoken copy | Two current pieces | `mode === 'history' → otherwise: weeks > 0` · [L95](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:95) |
| Accessibility / spoken copy | One keyed slab | `otherwise: mode === 'evidence' → otherwise: mode === 'history'` · [L95](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:95) |
| Accessibility / spoken copy | Gold record treatment. | `slabs.length → slabs.some((slab) => slab.layers.some((layer) => layer.record))` · [L95](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:95) |
| Accessibility / spoken copy | Show Focus view | `overview` · [L99](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:99) |
| Accessibility / spoken copy | Show Overview view | `otherwise: overview` · [L99](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:99) |
| Visible text | ALL OF IT | [L102](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:102) |
| Visible text | FOCUS | [L102](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:102) |
| Label / supplied copy | Fusion preview ↗ | [L107](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:107) |
| Label / supplied copy | Casting preview ↗ | [L108](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:108) |
| Label / supplied copy | The object | [L109](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:109) |
| Label / supplied copy | Monolith screen ↗ | [L110](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:110) |
| Label / supplied copy | Tower fixtures | [L111](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:111) |
| Label / supplied copy | Evidence | [L112](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:112) |
| Label / supplied copy | Saved workouts | `mode === 'evidence'` · [L116](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:116) |
| Label / supplied copy | Example history | `mode === 'evidence'` · [L117](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:117) |
| Dynamic copy / value | {height.toFixed(2)}× | `otherwise: mode === 'evidence' → mode === 'object'` · [L119](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:119) |
| Dynamic copy / value | {count} wk | `otherwise: mode === 'evidence' → otherwise: mode === 'object'` · [L120](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:120) |
| Dynamic copy / value | Inspect evidence · {history.state.metrics.workouts} piece → | `mode === 'evidence'` · [L122](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:122) |
| Dynamic copy / value | Inspect evidence · {history.state.metrics.workouts} pieces → | `mode === 'evidence'` · [L122](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:122) |
| Visible text | Inspect evidence → | `mode === 'evidence'` · [L122](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:122) |
| Visible text | Record | `otherwise: mode === 'evidence' → mode === 'object'` · [L123](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:123) |
| Accessibility / spoken copy | Gold record treatment | `otherwise: mode === 'evidence' → mode === 'object'` · [L123](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:123) |
| Visible text | Sealed week | `otherwise: mode === 'evidence' → mode === 'object'` · [L124](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:124) |
| Accessibility / spoken copy | Weekly composite | `otherwise: mode === 'evidence' → mode === 'object'` · [L124](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:124) |
| Dynamic copy / value | {weeks} sealed blocks · 2 loose pieces · no hidden session meshes | `otherwise: mode === 'evidence' → otherwise: mode === 'object'` · [L125](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:125) |
| Visible text | Your first session lays the first piece. | `otherwise: mode === 'evidence' → otherwise: mode === 'object'` · [L125](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:125) |
| Visible text | Measuring 10 seconds after warmup… | [L127](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:127) |
| Dynamic copy / value | {stats.fps.toFixed(1)} fps · p95 {stats.p95Ms.toFixed(1)} ms<br>{stats.calls} draws · {stats.triangles.toLocaleString()} triangles · {stats.geometries} geometries | [L127](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:127) |
| Visible text | Still scenes render on demand. | [L127](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:127) |
| Visible text | Running | [L129](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:129) |
| Visible text | Measure | [L129](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:129) |
| Visible text | Object tuning | [L137](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:137) |
| Accessibility / spoken copy | Close tuning | [L137](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:137) |
| Visible text | WEEKLY LAMINATION | [L139](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:139) |
| Label / supplied copy | Strata + top inlay | [L140](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:140) |
| Label / supplied copy | Full strata | [L140](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:140) |
| Label / supplied copy | Compressed edge grain | [L140](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:140) |
| Dynamic copy / value | {label} | [L140](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:140) |
| Visible text | KEY CORNER | [L141](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:141) |
| Dynamic copy / value | {value.toFixed(2)} | [L141](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:141) |
| Visible text | GOLD SEAM | [L142](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:142) |
| Dynamic copy / value | {['Fine', 'Classic', 'Bold'][index]} | [L142](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:142) |
| Label / supplied copy | Fine | [L142](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:142) |
| Label / supplied copy | Classic | [L142](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:142) |
| Label / supplied copy | Bold | [L142](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:142) |
| Visible text | WEEK COMPRESSION | [L143](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:143) |
| Visible text | Tuning changes rendered geometry only. No workouts are created or changed. Camera motion respects Reduce Motion. | [L144](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:144) |
| Label / supplied copy | Reset tuning | [L145](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx:145) |

<a id="source-features-build-evidenceinspector-tsx"></a>

### Evidence Inspector

Source: [features/build/EvidenceInspector.tsx](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Dynamic copy / value | {rounded.toLocaleString('en-US')} LB | `unit === 'lbs' → rounded > 0` · [L13](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:13) |
| Dynamic copy / value | {(kg / 1000).toFixed(1)} T | `kg >= 1000` · [L15](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:15) |
| Dynamic copy / value | {rounded.toLocaleString('en-US')} KG | `rounded > 0` · [L17](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:17) |
| Dynamic copy / value | {count} {singular} | [L19](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:19) |
| Dynamic copy / value | {count} {plural} | [L19](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:19) |
| Dynamic copy / value | {formatWeight(set.weightKg, unit)} {unit} × {set.reps} | [L24](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:24) |
| Dynamic copy / value | {volumeLabel(state.metrics.volumeKg, unit)} moved | `volumeLabel(state.metrics.volumeKg, unit)` · [L27](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:27) |
| Label / supplied copy | PR | `state.metrics.records` · [L28](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:28) |
| Label / supplied copy | PRs | `state.metrics.records` · [L28](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:28) |
| Visible text | What earned it | [L32](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:32) |
| Accessibility / spoken copy | Close evidence | [L32](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:32) |
| Dynamic copy / value | Example sessions · fixed at 23 Sep 2026<br>{summary}<br>{state.issues.length} dated entries excluded; see diagnostics below. | [L35](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:35) |
| Dynamic copy / value | Example sessions · fixed at 23 Sep 2026<br>{summary} | [L35](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:35) |
| Dynamic copy / value | Example sessions · fixed at 23 Sep 2026<br>{state.issues.length} dated entries excluded; see diagnostics below. | [L35](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:35) |
| Visible text | Example sessions · fixed at 23 Sep 2026 | [L35](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:35) |
| Dynamic copy / value | Saved workout history · read only<br>{summary}<br>{state.issues.length} dated entries excluded; see diagnostics below. | [L35](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:35) |
| Dynamic copy / value | Saved workout history · read only<br>{summary} | [L35](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:35) |
| Dynamic copy / value | Saved workout history · read only<br>{state.issues.length} dated entries excluded; see diagnostics below. | [L35](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:35) |
| Visible text | Saved workout history · read only | [L35](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:35) |
| Visible text | No pieces yet. Only completed pieces appear here. | [L36](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:36) |
| Dynamic copy / value | Session {issue.sessionId}: {issue.reason} | [L37](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:37) |
| Dynamic copy / value | {piece.label} · {getSessionLocalDate(piece.date)} | [L39](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:39) |
| Dynamic copy / value | {[`${piece.height.toFixed(2)}×`, piece.metrics.liftsUp ? `${countLabel(piece.metrics.liftsUp, 'lift', 'lifts')} up` : null, piece.metrics.records ? countLabel(piece.metrics.records, 'PR', 'PRs') : null].filter(Boolean).join(' · ')} | [L40](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:40) |
| Dynamic copy / value | Session {piece.sessionId} · week of {piece.weekStart}<br>{piece.eligibleExercises} comparable exercises · {volumeLabel(piece.metrics.volumeKg, unit)} moved | [L41](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:41) |
| Dynamic copy / value | Session {piece.sessionId} · week of {piece.weekStart}<br>{piece.eligibleExercises} comparable exercises · | [L41](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:41) |
| Dynamic copy / value | Session {piece.sessionId} · week of {piece.weekStart}<br>{volumeLabel(piece.metrics.volumeKg, unit)} moved | [L41](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:41) |
| Dynamic copy / value | Session {piece.sessionId} · week of {piece.weekStart} | [L41](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:41) |
| Dynamic copy / value | {comparison.exerciseName} | [L43](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:43) |
| Dynamic copy / value | Compared with session {comparison.previousSessionId} · {comparison.comparableSets} matched sets | [L44](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:44) |
| Visible text | No earlier comparable session: baseline thickness | [L44](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:44) |
| Dynamic copy / value | Set {set.regularSetIndex + 1}: {setText(set.previous)} → {setText(set.current)} | [L45](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:45) |
| Visible text | No validated progression. | `comparison.previousSessionId && !comparison.improvedSets.length` · [L46](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:46) |
| Dynamic copy / value | {record.exerciseName} · new personal best | [L49](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:49) |
| Dynamic copy / value | {setText({ weightKg: record.previous.weight, reps: record.previous.reps })} → {setText({ weightKg: record.current.weight, reps: record.current.reps })}<br>Previous best: session {record.previous.sessionId} | [L50](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx:50) |

<a id="source-features-build-evidencedemo-ts"></a>

### evidence Demo

Source: [features/build/evidenceDemo.ts](/Users/satwikmekala/stackv3/features/build/evidenceDemo.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | Bench Press | [L7](/Users/satwikmekala/stackv3/features/build/evidenceDemo.ts:7) |
| Label / supplied copy | Incline Dumbbell Press | [L7](/Users/satwikmekala/stackv3/features/build/evidenceDemo.ts:7) |
| Label / supplied copy | Cable Fly | [L7](/Users/satwikmekala/stackv3/features/build/evidenceDemo.ts:7) |
| Label / supplied copy | kg | [L8](/Users/satwikmekala/stackv3/features/build/evidenceDemo.ts:8) |
| Label / supplied copy | reps | [L8](/Users/satwikmekala/stackv3/features/build/evidenceDemo.ts:8) |

<a id="source-features-build-monolithdemo-ts"></a>

### monolith Demo

Source: [features/build/monolithDemo.ts](/Users/satwikmekala/stackv3/features/build/monolithDemo.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Validation / error | Demo supports 0–260 weeks | `!Number.isInteger(weeks) \|\| weeks < 0 \|\| weeks > 260` · [L7](/Users/satwikmekala/stackv3/features/build/monolithDemo.ts:7) |
| Label / supplied copy | Bench Press | [L10](/Users/satwikmekala/stackv3/features/build/monolithDemo.ts:10) |
| Label / supplied copy | Barbell Row | [L10](/Users/satwikmekala/stackv3/features/build/monolithDemo.ts:10) |
| Label / supplied copy | Squat | [L10](/Users/satwikmekala/stackv3/features/build/monolithDemo.ts:10) |
| Label / supplied copy | Shoulder Press | [L10](/Users/satwikmekala/stackv3/features/build/monolithDemo.ts:10) |
| Label / supplied copy | Biceps Curl | [L10](/Users/satwikmekala/stackv3/features/build/monolithDemo.ts:10) |
| Label / supplied copy | Crunch | [L10](/Users/satwikmekala/stackv3/features/build/monolithDemo.ts:10) |
| Label / supplied copy | kg | [L24](/Users/satwikmekala/stackv3/features/build/monolithDemo.ts:24) |
| Label / supplied copy | reps | [L24](/Users/satwikmekala/stackv3/features/build/monolithDemo.ts:24) |

<a id="source-features-report-reportfixtures-ts"></a>

### report Fixtures

Source: [features/report/reportFixtures.ts](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts).

| Type / use | Copy as written, or dynamic display template | State / location |
| --- | --- | --- |
| Label / supplied copy | kg | [L23](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:23) |
| Label / supplied copy | reps | [L24](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:24) |
| Label / supplied copy | Standard Push | [L62](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:62) |
| Label / supplied copy | Bench Press | [L64](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:64) |
| Label / supplied copy | Incline Dumbbell Press | [L65](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:65) |
| Label / supplied copy | Seated Shoulder Press | [L66](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:66) |
| Label / supplied copy | Cable Lateral Raise | [L67](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:67) |
| Label / supplied copy | Triceps Rope Pushdown | [L68](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:68) |
| Label / supplied copy | Mixed reps + timed | [L73](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:73) |
| Label / supplied copy | Goblet Squat | [L75](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:75) |
| Label / supplied copy | Walking Lunge | [L76](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:76) |
| Label / supplied copy | Plank | [L77](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:77) |
| Label / supplied copy | Farmer Carry | [L78](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:78) |
| Label / supplied copy | Hanging Leg Raise | [L79](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:79) |
| Label / supplied copy | Long 10-exercise | [L84](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:84) |
| Label / supplied copy | Barbell Back Squat | [L86](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:86) |
| Label / supplied copy | Romanian Deadlift | [L87](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:87) |
| Label / supplied copy | Bulgarian Split Squat (Dumbbells, Rear Foot Elevated) | [L88](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:88) |
| Label / supplied copy | Leg Press | [L89](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:89) |
| Label / supplied copy | Leg Extension | [L90](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:90) |
| Label / supplied copy | Lying Leg Curl | [L91](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:91) |
| Label / supplied copy | lbs | [L91](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:91) |
| Label / supplied copy | Hip Thrust | [L92](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:92) |
| Label / supplied copy | Standing Calf Raise | [L93](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:93) |
| Label / supplied copy | Seated Calf Raise | [L94](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:94) |
| Label / supplied copy | Wall Sit | [L95](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:95) |
| Label / supplied copy | Bodyweight only | [L100](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:100) |
| Label / supplied copy | Dip | [L104](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:104) |
| Label / supplied copy | Hollow Hold | [L105](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:105) |
| Label / supplied copy | PR + bonus sets | [L110](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:110) |
| Label / supplied copy | Overhead Press | [L113](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:113) |
| Label / supplied copy | Weighted Dip | [L114](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:114) |
| Label / supplied copy | Skull Crusher | [L115](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts:115) |

## App name and native permission explanations

These are configured in the app bundle. Permission explanations appear only if that permission is requested; their inclusion does not mean onboarding asks for camera or microphone access.

| Surface | Configured copy | Runtime form / source |
| --- | --- | --- |
| App display name | Stack | [app.json:3](/Users/satwikmekala/stackv3/app.json:3); [ios/Stack/Info.plist:9](/Users/satwikmekala/stackv3/ios/Stack/Info.plist:9) |
| Camera permission explanation | Allow $(PRODUCT_NAME) to access your camera | Allow {app_name} to access your camera. [ios/Stack/Info.plist:58](/Users/satwikmekala/stackv3/ios/Stack/Info.plist:58) |
| Microphone permission explanation | Allow $(PRODUCT_NAME) to access your microphone | Allow {app_name} to access your microphone. [ios/Stack/Info.plist:60](/Users/satwikmekala/stackv3/ios/Stack/Info.plist:60) |

## Exercise catalog entries and descriptions

### Built-in exercise names and muscle metadata

Names and muscle descriptions below are linked to their exercise rather than listed as unrelated words. Repeated seed entries are consolidated; user-created exercises supply additional runtime names.

| Exercise name | Training group | Primary muscles | Secondary muscles | Source |
| --- | --- | --- | --- | --- |
| Bench Press | chest | Chest | Triceps, Front Delts | [store/workoutDatabase.ts:121](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:121) |
| Incline Dumbbell Press | chest | Upper Chest | Front Delts, Triceps | [store/workoutDatabase.ts:122](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:122) |
| Chest Dips | chest | Lower Chest, Triceps | Front Delts | [store/workoutDatabase.ts:123](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:123) |
| Cable Fly | chest | Chest | Front Delts | [store/workoutDatabase.ts:124](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:124) |
| Incline Bench Press | chest | Upper Chest | Front Delts, Triceps | [store/workoutDatabase.ts:125](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:125) |
| Push-ups | chest | Chest | Triceps, Front Delts, Core | [store/workoutDatabase.ts:126](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:126) |
| Pec Deck | chest | Chest | — | [store/workoutDatabase.ts:127](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:127) |
| Decline Press | chest | Lower Chest | Triceps | [store/workoutDatabase.ts:128](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:128) |
| Machine Chest Press | chest | Chest | Triceps | [store/workoutDatabase.ts:129](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:129) |
| Incline Cable Fly | chest | Upper Chest | Front Delts | [store/workoutDatabase.ts:130](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:130) |
| Dumbbell Bench Press | chest | Chest | Triceps, Front Delts | [store/workoutDatabase.ts:131](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:131) |
| Dumbbell Fly | chest | Chest | Front Delts | [store/workoutDatabase.ts:132](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:132) |
| Cable Crossover | chest | Chest | Front Delts | [store/workoutDatabase.ts:133](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:133) |
| Low-to-High Cable Fly | chest | Chest | Front Delts | [store/workoutDatabase.ts:134](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:134) |
| High-to-Low Cable Fly | chest | Chest | Front Delts | [store/workoutDatabase.ts:135](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:135) |
| Single-Arm Cable Fly | chest | Chest | Front Delts | [store/workoutDatabase.ts:136](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:136) |
| Smith Machine Bench Press | chest | Chest | Triceps, Front Delts | [store/workoutDatabase.ts:137](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:137) |
| Smith Machine Incline Press | chest | Chest | Triceps, Front Delts | [store/workoutDatabase.ts:138](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:138) |
| Decline Dumbbell Press | chest | Chest | Triceps, Front Delts | [store/workoutDatabase.ts:139](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:139) |
| Decline Dumbbell Fly | chest | Lower Chest | Front Delts | [store/workoutDatabase.ts:140](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:140) |
| Incline Machine Chest Press | chest | Chest | Triceps, Front Delts | [store/workoutDatabase.ts:141](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:141) |
| Flat Machine Chest Press | chest | Chest | Triceps | [store/workoutDatabase.ts:142](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:142) |
| Svend Press | chest | Chest | Front Delts, Triceps | [store/workoutDatabase.ts:143](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:143) |
| Deadlift | back | Back, Hamstrings, Glutes | Traps, Forearms | [store/workoutDatabase.ts:145](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:145) |
| Pull-ups | back | Lats | Biceps | [store/workoutDatabase.ts:146](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:146) |
| Barbell Rows | back | Lats, Mid-back | Biceps, Rear Delts | [store/workoutDatabase.ts:147](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:147) |
| Lat Pulldown | back | Lats | Biceps | [store/workoutDatabase.ts:148](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:148) |
| Seated Cable Row | back | Mid-back, Lats | Biceps | [store/workoutDatabase.ts:149](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:149) |
| T-Bar Row | back | Mid-back | Biceps, Rear Delts | [store/workoutDatabase.ts:150](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:150) |
| Single-Arm Dumbbell Row | back | Lats | Biceps | [store/workoutDatabase.ts:151](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:151) |
| Back Extensions | back | Lower Back | Glutes, Hamstrings | [store/workoutDatabase.ts:152](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:152) |
| Chest-Supported Row | back | Mid-back | Rear Delts, Biceps | [store/workoutDatabase.ts:153](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:153) |
| Straight-Arm Pulldown | back | Lats | — | [store/workoutDatabase.ts:154](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:154) |
| Chin-ups | back | Back | Biceps | [store/workoutDatabase.ts:155](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:155) |
| Wide-Grip Lat Pulldown | back | Back | Biceps | [store/workoutDatabase.ts:156](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:156) |
| Close-Grip Lat Pulldown | back | Back | Biceps | [store/workoutDatabase.ts:157](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:157) |
| Neutral-Grip Lat Pulldown | back | Back | Biceps | [store/workoutDatabase.ts:158](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:158) |
| Single-Arm Lat Pulldown | back | Back | Biceps | [store/workoutDatabase.ts:159](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:159) |
| Pendlay Row | back | Back | Biceps, Rear Delts | [store/workoutDatabase.ts:160](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:160) |
| Meadows Row | back | Back | Biceps | [store/workoutDatabase.ts:161](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:161) |
| Machine Row | back | Back | Biceps | [store/workoutDatabase.ts:162](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:162) |
| High Row Machine | back | Back | Biceps | [store/workoutDatabase.ts:163](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:163) |
| Dumbbell Pullover | back | Back | Chest, Triceps | [store/workoutDatabase.ts:164](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:164) |
| Cable Pullover | back | Back | — | [store/workoutDatabase.ts:165](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:165) |
| Seal Row | back | Back | Biceps, Rear Delts | [store/workoutDatabase.ts:166](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:166) |
| Rack Pull | back | Back | Glutes, Hamstrings, Traps | [store/workoutDatabase.ts:167](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:167) |
| Inverted Row | back | Back | Biceps, Rear Delts | [store/workoutDatabase.ts:168](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:168) |
| Overhead Press | shoulders | Front/Side Delts | Triceps | [store/workoutDatabase.ts:170](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:170) |
| Lateral Raises | shoulders | Side Delts | — | [store/workoutDatabase.ts:171](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:171) |
| Face Pulls | shoulders | Rear Delts | Traps | [store/workoutDatabase.ts:172](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:172) |
| Front Raises | shoulders | Front Delts | — | [store/workoutDatabase.ts:173](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:173) |
| Arnold Press | shoulders | Front/Side Delts | Triceps | [store/workoutDatabase.ts:174](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:174) |
| Rear Delt Fly | shoulders | Rear Delts | — | [store/workoutDatabase.ts:175](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:175) |
| Upright Rows | shoulders | Side Delts, Traps | Biceps | [store/workoutDatabase.ts:176](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:176) |
| Shrugs | shoulders | Traps | — | [store/workoutDatabase.ts:177](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:177) |
| Cable Lateral Raise | shoulders | Side Delts | — | [store/workoutDatabase.ts:178](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:178) |
| Landmine Press | shoulders | Front Delts, Chest | Triceps | [store/workoutDatabase.ts:179](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:179) |
| Seated Dumbbell Shoulder Press | shoulders | Shoulders | Triceps | [store/workoutDatabase.ts:180](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:180) |
| Machine Shoulder Press | shoulders | Shoulders | Triceps | [store/workoutDatabase.ts:181](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:181) |
| Smith Machine Shoulder Press | shoulders | Shoulders | Triceps | [store/workoutDatabase.ts:182](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:182) |
| Single-Arm Cable Lateral Raise | shoulders | Shoulders | — | [store/workoutDatabase.ts:183](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:183) |
| Lean-Away Cable Lateral Raise | shoulders | Shoulders | — | [store/workoutDatabase.ts:184](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:184) |
| Cable Rear Delt Fly | shoulders | Shoulders | — | [store/workoutDatabase.ts:185](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:185) |
| Reverse Pec Deck | shoulders | Shoulders | — | [store/workoutDatabase.ts:186](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:186) |
| Dumbbell Rear Delt Fly | shoulders | Shoulders | — | [store/workoutDatabase.ts:187](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:187) |
| Y Raise | shoulders | Shoulders | Traps | [store/workoutDatabase.ts:188](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:188) |
| Plate Front Raise | shoulders | Shoulders | — | [store/workoutDatabase.ts:189](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:189) |
| Cable Front Raise | shoulders | Shoulders | — | [store/workoutDatabase.ts:190](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:190) |
| Bradford Press | shoulders | Shoulders | Triceps | [store/workoutDatabase.ts:191](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:191) |
| Bicep Curls | arms | Biceps | — | [store/workoutDatabase.ts:193](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:193) |
| Dumbbell Curl | arms | Biceps | — | [store/workoutDatabase.ts:194](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:194) |
| Hammer Curls | arms | Biceps | Forearms | [store/workoutDatabase.ts:195](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:195) |
| Preacher Curls | arms | Biceps | — | [store/workoutDatabase.ts:196](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:196) |
| Cable Curls | arms | Biceps | — | [store/workoutDatabase.ts:197](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:197) |
| Tricep Extensions | arms | Triceps | — | [store/workoutDatabase.ts:198](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:198) |
| Tricep Dips | arms | Triceps | Chest, Front Delts | [store/workoutDatabase.ts:199](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:199) |
| Tricep Pushdown | arms | Triceps | — | [store/workoutDatabase.ts:200](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:200) |
| Skull Crushers | arms | Triceps | — | [store/workoutDatabase.ts:201](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:201) |
| Close-Grip Bench Press | arms | Triceps | Chest | [store/workoutDatabase.ts:202](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:202) |
| EZ-Bar Curl | arms | Biceps | Forearms | [store/workoutDatabase.ts:203](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:203) |
| Incline Dumbbell Curl | arms | Biceps | — | [store/workoutDatabase.ts:204](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:204) |
| Concentration Curl | arms | Biceps | — | [store/workoutDatabase.ts:205](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:205) |
| Bayesian Cable Curl | arms | Biceps | — | [store/workoutDatabase.ts:206](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:206) |
| Spider Curl | arms | Biceps | — | [store/workoutDatabase.ts:207](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:207) |
| Reverse Curl | arms | Biceps | Forearms | [store/workoutDatabase.ts:208](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:208) |
| Rope Hammer Curl | arms | Biceps | Forearms | [store/workoutDatabase.ts:209](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:209) |
| Cross-Body Hammer Curl | arms | Biceps | Forearms | [store/workoutDatabase.ts:210](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:210) |
| Machine Bicep Curl | arms | Biceps | — | [store/workoutDatabase.ts:211](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:211) |
| Single-Arm Cable Curl | arms | Biceps | — | [store/workoutDatabase.ts:212](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:212) |
| Drag Curl | arms | Biceps | — | [store/workoutDatabase.ts:213](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:213) |
| Zottman Curl | arms | Biceps | Forearms | [store/workoutDatabase.ts:214](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:214) |
| Rope Triceps Pushdown | arms | Triceps | — | [store/workoutDatabase.ts:215](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:215) |
| Overhead Cable Triceps Extension | arms | Triceps | — | [store/workoutDatabase.ts:216](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:216) |
| Single-Arm Cable Triceps Pushdown | arms | Triceps | — | [store/workoutDatabase.ts:217](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:217) |
| Single-Arm Overhead Cable Extension | arms | Triceps | — | [store/workoutDatabase.ts:218](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:218) |
| Dumbbell Overhead Triceps Extension | arms | Triceps | — | [store/workoutDatabase.ts:219](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:219) |
| Triceps Kickback | arms | Triceps | — | [store/workoutDatabase.ts:220](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:220) |
| Cable Triceps Kickback | arms | Triceps | — | [store/workoutDatabase.ts:221](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:221) |
| JM Press | arms | Triceps | Chest, Front Delts | [store/workoutDatabase.ts:222](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:222) |
| Reverse-Grip Triceps Pushdown | arms | Triceps | — | [store/workoutDatabase.ts:223](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:223) |
| Assisted Dip | arms | Triceps | Chest, Front Delts | [store/workoutDatabase.ts:224](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:224) |
| Machine Dip | arms | Triceps | Chest, Front Delts | [store/workoutDatabase.ts:225](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:225) |
| Squats | legs | Quads | Glutes | [store/workoutDatabase.ts:227](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:227) |
| Leg Press | legs | Quads | Glutes | [store/workoutDatabase.ts:228](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:228) |
| Romanian Deadlift | legs | Hamstrings | Glutes, Lower Back | [store/workoutDatabase.ts:229](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:229) |
| Lunges | legs | Quads, Glutes | Hamstrings | [store/workoutDatabase.ts:230](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:230) |
| Leg Curl | legs | Hamstrings | — | [store/workoutDatabase.ts:231](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:231) |
| Leg Extension | legs | Quads | — | [store/workoutDatabase.ts:232](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:232) |
| Calf Raises | legs | Calves | — | [store/workoutDatabase.ts:233](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:233) |
| Hip Thrusts | legs | Glutes | Hamstrings | [store/workoutDatabase.ts:234](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:234) |
| Front Squat | legs | Quads | Core | [store/workoutDatabase.ts:235](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:235) |
| Bulgarian Split Squat | legs | Quads, Glutes | Hamstrings | [store/workoutDatabase.ts:236](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:236) |
| Hack Squat | legs | Legs | Glutes | [store/workoutDatabase.ts:237](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:237) |
| Goblet Squat | legs | Legs | Glutes | [store/workoutDatabase.ts:238](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:238) |
| Smith Machine Squat | legs | Legs | Glutes | [store/workoutDatabase.ts:239](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:239) |
| Sumo Deadlift | legs | Legs | Glutes, Hamstrings, Back | [store/workoutDatabase.ts:240](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:240) |
| Good Morning | legs | Legs | Glutes, Lower Back | [store/workoutDatabase.ts:241](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:241) |
| Step-Up | legs | Legs | Glutes | [store/workoutDatabase.ts:242](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:242) |
| Reverse Lunge | legs | Legs | Glutes | [store/workoutDatabase.ts:243](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:243) |
| Walking Dumbbell Lunge | legs | Legs | Glutes | [store/workoutDatabase.ts:244](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:244) |
| Seated Leg Curl | legs | Legs | — | [store/workoutDatabase.ts:245](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:245) |
| Lying Leg Curl | legs | Legs | — | [store/workoutDatabase.ts:246](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:246) |
| Nordic Hamstring Curl | legs | Legs | — | [store/workoutDatabase.ts:247](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:247) |
| Single-Leg Curl | legs | Legs | — | [store/workoutDatabase.ts:248](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:248) |
| Adductor Machine | legs | Legs | — | [store/workoutDatabase.ts:249](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:249) |
| Abductor Machine | legs | Legs | — | [store/workoutDatabase.ts:250](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:250) |
| Seated Calf Raise | legs | Legs | — | [store/workoutDatabase.ts:251](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:251) |
| Standing Calf Raise | legs | Legs | — | [store/workoutDatabase.ts:252](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:252) |
| Donkey Calf Raise | legs | Legs | — | [store/workoutDatabase.ts:253](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:253) |
| Glute Bridge | legs | Legs | Hamstrings | [store/workoutDatabase.ts:254](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:254) |
| Cable Pull-Through | legs | Legs | Hamstrings | [store/workoutDatabase.ts:255](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:255) |
| Belt Squat | legs | Legs | Glutes | [store/workoutDatabase.ts:256](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:256) |
| Pendulum Squat | legs | Legs | Glutes | [store/workoutDatabase.ts:257](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:257) |
| Single-Leg Press | legs | Legs | Glutes | [store/workoutDatabase.ts:258](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:258) |
| Plank | core | Abs / Core Stability | — | [store/workoutDatabase.ts:260](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:260) |
| Crunches | core | Abs | — | [store/workoutDatabase.ts:261](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:261) |
| Cable Crunch | core | Abs | — | [store/workoutDatabase.ts:262](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:262) |
| Hanging Leg Raise | core | Abs | Hip Flexors | [store/workoutDatabase.ts:263](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:263) |
| Leg Raises | core | Lower Abs | Hip Flexors | [store/workoutDatabase.ts:264](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:264) |
| Russian Twists | core | Obliques | — | [store/workoutDatabase.ts:265](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:265) |
| Ab Wheel Rollout | core | Abs | Lower Back, Shoulders | [store/workoutDatabase.ts:266](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:266) |
| Mountain Climbers | core | Abs | Hip Flexors | [store/workoutDatabase.ts:267](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:267) |
| Side Plank | core | Obliques | — | [store/workoutDatabase.ts:268](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:268) |
| Cable Woodchopper | core | Obliques | Core Rotation | [store/workoutDatabase.ts:269](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:269) |
| Hanging Knee Raise | core | Core | Hip Flexors | [store/workoutDatabase.ts:270](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:270) |
| Reverse Crunch | core | Core | — | [store/workoutDatabase.ts:271](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:271) |
| Bicycle Crunch | core | Core | Hip Flexors | [store/workoutDatabase.ts:272](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:272) |
| Dead Bug | core | Core | — | [store/workoutDatabase.ts:273](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:273) |
| Pallof Press | core | Core | Shoulders | [store/workoutDatabase.ts:274](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:274) |
| V-Ups | core | Core | Hip Flexors | [store/workoutDatabase.ts:275](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:275) |
| Hollow Body Hold | core | Core | — | [store/workoutDatabase.ts:276](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:276) |
| Decline Crunch | core | Core | — | [store/workoutDatabase.ts:277](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:277) |
| Ab Crunch Machine | core | Core | — | [store/workoutDatabase.ts:278](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:278) |
| Toe Touches | core | Core | — | [store/workoutDatabase.ts:279](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:279) |
| Kneeling Cable Crunch | core | Core | — | [store/workoutDatabase.ts:280](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:280) |
| Weighted Sit-Up | core | Core | — | [store/workoutDatabase.ts:281](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:281) |
| Bird Dog | core | Core | Glutes | [store/workoutDatabase.ts:282](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:282) |
| Suitcase Carry | core | Core | Forearms | [store/workoutDatabase.ts:284](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:284) |
| Farmer Carry | core | Core | Forearms, Traps | [store/workoutDatabase.ts:285](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:285) |
| Back Squat | legs | Quads, Glutes | Core | [store/workoutDatabase.ts:392](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:392) |
| Barbell Curl | arms | Biceps | Forearms | [store/workoutDatabase.ts:393](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:393) |
| Walking Lunge | legs | Quads, Glutes | Hamstrings | [store/workoutDatabase.ts:394](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:394) |
| Overhead Triceps Extension | arms | Triceps | — | [store/workoutDatabase.ts:395](/Users/satwikmekala/stackv3/store/workoutDatabase.ts:395) |

### Exercise information cards — full instructional copy

#### Barbell Bicep Curl

Source: [constants/exerciseInfo.ts:26](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:26).

- Category: Arms
- Primary muscles: Biceps
- Secondary muscles: Forearms
- Catalog aliases: Bicep Curls

Grip the bar shoulder-width with your elbows pinned to your sides. Curl to shoulder height and squeeze, then lower slowly without swinging.

#### Barbell Hip Thrust

Source: [constants/exerciseInfo.ts:32](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:32).

- Category: Legs
- Primary muscles: Glutes, Hamstrings
- Secondary muscles: Core
- Catalog aliases: Hip Thrusts

Rest your upper back on the bench with the bar over your hips. Drive through your heels until your hips are level with your knees, pause, then lower with control.

#### Barbell Squat

Source: [constants/exerciseInfo.ts:38](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:38).

- Category: Legs
- Primary muscles: Quads, Glutes
- Secondary muscles: Core, Lower back
- Catalog aliases: Squats

Set the bar across your upper back and keep your feet around shoulder-width. Sit your hips back and down, keep your chest tall, then drive up through your mid-foot.

#### Bench Press

Source: [constants/exerciseInfo.ts:44](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:44).

- Category: Chest
- Primary muscles: Chest, Triceps
- Secondary muscles: Shoulders

Lower the bar toward your mid-chest with your feet planted, then press it back up with control.

#### Bench-Supported Tricep Dip

Source: [constants/exerciseInfo.ts:50](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:50).

- Category: Arms
- Primary muscles: Triceps
- Secondary muscles: Chest, Shoulders
- Catalog aliases: Tricep Dips

Support yourself on the bench and lower your body by bending your elbows. Press back up through your triceps while keeping your movement controlled.

#### Cable Chest Fly

Source: [constants/exerciseInfo.ts:56](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:56).

- Category: Chest
- Primary muscles: Chest
- Secondary muscles: Shoulders
- Catalog aliases: Cable Fly

Keep a slight bend in your elbows and bring the handles together in front of your chest. Squeeze, then return slowly under control.

#### Cable Crossover

Source: [constants/exerciseInfo.ts:62](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:62).

- Category: Chest
- Primary muscles: Chest
- Secondary muscles: Front delts

Stand between the cable stacks and pull the handles down and across your body. Squeeze your chest, then return with control.

#### Cable Overhead Triceps Extension

Source: [constants/exerciseInfo.ts:68](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:68).

- Category: Arms
- Primary muscles: Triceps
- Secondary muscles: Shoulders
- Catalog aliases: Overhead Cable Triceps Extension

Keep your elbows pointed forward while extending your arms overhead. Squeeze your triceps at full extension, then return slowly.

#### Standing Calf Raise

Source: [constants/exerciseInfo.ts:74](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:74).

- Category: Legs
- Primary muscles: Calves
- Secondary muscles: Soleus
- Catalog aliases: Calf Raises

Rise onto the balls of your feet as high as you can. Squeeze your calves at the top, then lower slowly through the full range.

#### Chest Dips

Source: [constants/exerciseInfo.ts:80](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:80).

- Category: Chest
- Primary muscles: Chest, Triceps
- Secondary muscles: Shoulders

Lean slightly forward as you lower yourself between the bars, then press back up through your chest and triceps.

#### Deadlift

Source: [constants/exerciseInfo.ts:86](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:86).

- Category: Back
- Primary muscles: Hamstrings, Glutes, Back
- Secondary muscles: Core, Forearms

Brace your core and drive through the floor, extending your hips and knees until you are standing tall with the bar. Lower it with control.

#### Decline Bench Press

Source: [constants/exerciseInfo.ts:92](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:92).

- Category: Chest
- Primary muscles: Lower chest, Triceps
- Secondary muscles: Front delts
- Catalog aliases: Decline Press

Secure your legs on the decline bench and lower the bar toward your lower chest. Press it back up with control.

#### Decline Dumbbell Fly

Source: [constants/exerciseInfo.ts:98](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:98).

- Category: Chest
- Primary muscles: Lower chest
- Secondary muscles: Front delts

Secure your legs on the decline bench and open the dumbbells wide with a slight bend in your elbows. Bring them together above your chest, then lower slowly.

#### Decline Dumbbell Press

Source: [constants/exerciseInfo.ts:104](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:104).

- Category: Chest
- Primary muscles: Lower chest, Triceps
- Secondary muscles: Front delts

Secure your legs on the decline bench and press the dumbbells up from your lower chest. Lower them slowly with your elbows under control.

#### Dumbbell Lateral Raise

Source: [constants/exerciseInfo.ts:110](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:110).

- Category: Shoulders
- Primary muscles: Side delts
- Secondary muscles: Upper traps
- Catalog aliases: Lateral Raises

Raise the dumbbells out to your sides until around shoulder height, then lower them slowly while keeping your torso still.

#### Incline Bench Press

Source: [constants/exerciseInfo.ts:116](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:116).

- Category: Chest
- Primary muscles: Upper chest, Triceps
- Secondary muscles: Front delts

Lower the bar toward your upper chest on an incline bench. Keep your feet planted and press the bar up with control.

#### Incline Dumbbell Press

Source: [constants/exerciseInfo.ts:122](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:122).

- Category: Chest
- Primary muscles: Upper chest, Triceps
- Secondary muscles: Shoulders

Press the dumbbells upward from your upper chest until your arms are extended, then lower them under control.

#### Lat Pulldown

Source: [constants/exerciseInfo.ts:128](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:128).

- Category: Back
- Primary muscles: Lats
- Secondary muscles: Biceps, Upper back

Pull the bar toward your upper chest while driving your elbows down. Control the weight as your arms extend overhead again.

#### Leg Extension

Source: [constants/exerciseInfo.ts:134](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:134).

- Category: Legs
- Primary muscles: Quads
- Secondary muscles: —

Extend your knees until your legs are nearly straight. Squeeze your quads at the top, then lower the weight slowly.

#### Leg Press

Source: [constants/exerciseInfo.ts:140](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:140).

- Category: Legs
- Primary muscles: Quads, Glutes
- Secondary muscles: Hamstrings

Lower the platform by bending your knees, then drive through your feet to press it away while keeping the movement controlled.

#### Lying Leg Curl

Source: [constants/exerciseInfo.ts:146](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:146).

- Category: Legs
- Primary muscles: Hamstrings
- Secondary muscles: Calves
- Catalog aliases: Leg Curl

Curl your heels toward your glutes by bending your knees. Squeeze your hamstrings, then lower the weight slowly.

#### Machine Chest Press

Source: [constants/exerciseInfo.ts:152](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:152).

- Category: Chest
- Primary muscles: Chest, Triceps
- Secondary muscles: Front delts
- Catalog aliases: Flat Machine Chest Press

Set the handles around chest height and press them forward until your arms are nearly straight. Return slowly without letting the weight stack slam.

#### Pec Deck Fly

Source: [constants/exerciseInfo.ts:158](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:158).

- Category: Chest
- Primary muscles: Chest
- Secondary muscles: Front delts
- Catalog aliases: Pec Deck

Sit with your back against the pad and bring the handles together in front of your chest. Squeeze, then open your arms slowly.

#### Pull-ups

Source: [constants/exerciseInfo.ts:164](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:164).

- Category: Back
- Primary muscles: Lats, Upper back
- Secondary muscles: Biceps, Forearms

Pull your body upward until your chin reaches the bar, then lower yourself under control into a full hang.

#### Push-ups

Source: [constants/exerciseInfo.ts:170](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:170).

- Category: Chest
- Primary muscles: Chest, Triceps
- Secondary muscles: Front delts, Core

Keep your body in a straight line as you lower your chest toward the floor. Press back up without letting your hips sag.

#### Seated Cable Row

Source: [constants/exerciseInfo.ts:176](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:176).

- Category: Back
- Primary muscles: Mid-back, Lats
- Secondary muscles: Biceps

Sit tall and pull the handle toward your torso while driving your elbows back. Extend your arms slowly without rounding your back.

#### Seated Dumbbell Shoulder Press

Source: [constants/exerciseInfo.ts:182](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:182).

- Category: Shoulders
- Primary muscles: Shoulders, Triceps
- Secondary muscles: Upper chest

Press the dumbbells overhead until your arms are extended, then lower them back to shoulder level with control.

#### Single-Arm Dumbbell Lateral Raise

Source: [constants/exerciseInfo.ts:188](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts:188).

- Category: Shoulders
- Primary muscles: Side delts
- Secondary muscles: Upper traps

Raise one dumbbell out to your side until around shoulder height while keeping your torso steady, then lower it slowly.

## Generated choice labels and dynamic values

| Surface | Complete generated options / format |
| --- | --- |
| Program frequency | 1, 2, 3, 4, 5, 6. Spoken labels: “1 workout per week”, “2 workouts per week”, … “6 workouts per week”. |
| Optional program progress | “1 of 2”; “2 of 2”. |
| Weekly habit goal | “No weekly goal”; “1 day per week”; “2 days per week”; “3 days per week”; “4 days per week”; “5 days per week”; “6 days per week”; “7 days per week”. |
| Automatic program settings | “1 workout”; “2 workouts”; “3 workouts”; “4 workouts”; “5 workouts”; “6 workouts”. |
| Three-day structure | “Full body”; “Push / Pull / Legs”. |
| First-workout units | “Kilograms · kg”; “Pounds · lb”. Settings uses “Pounds · lbs”. The wording difference is retained. |
| Kilogram adjustment choices | “0.5 kg”; “1 kg”; “1.25 kg”; “1.5 kg”; “2.5 kg”; “5 kg”. |
| Pound adjustment choices | “1 lbs”; “2.5 lbs”; “5 lbs”; “10 lbs”. |
| Weekdays | Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday. Progress initials: M, T, W, T, F, S, S. |
| Named Train greeting | “Morning, {firstName}”; “Afternoon, {firstName}”; “Evening, {firstName}”. |
| Unnamed Train greeting | “Good morning”; “Good afternoon”; “Good evening”. |
| Workout / exercise / split names | Built-in labels are catalogued above. Saved/shared/custom names replace the relevant placeholders. Workout letters/variants can be A, B, C, … according to the saved or generated lineup. |
| Search fields and notes | Placeholders are catalogued above; entered search terms, custom exercise names, routine names, user names and exercise notes are user-authored values. |
| Counts and achievements | Counts, plural variants, records, percentages, volumes, set values, timestamps and durations derive from actual saved or active data. Their templates and helper wording are catalogued above. |

## Source coverage

Reviewed 263 TypeScript/TSX/Swift source files across app routes, components, features, constants, stores, services, utilities and native modules. 171 sources contributed extracted copy/display templates. The app’s configured name is **Stack** ([app.json:3](/Users/satwikmekala/stackv3/app.json:3)).

The index below accounts for source files that define no independent wording as well as those that do. It is not a claim that every development route is active in production. Renderer code, SQL, asset paths, identifiers, style values, telemetry/console diagnostics and TypeScript type strings are excluded from customer copy. Runtime validation/error wording is retained in the message sections where it can be handed to an app error surface.

| Source | Coverage |
| --- | --- |
| [app/(onboarding)/_layout.tsx](/Users/satwikmekala/stackv3/app/(onboarding)/_layout.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [app/(onboarding)/current-week.tsx](/Users/satwikmekala/stackv3/app/(onboarding)/current-week.tsx) | [app/(onboarding)/current-week.tsx](#source-app-onboarding-current-week-tsx) |
| [app/(onboarding)/experience.tsx](/Users/satwikmekala/stackv3/app/(onboarding)/experience.tsx) | [app/(onboarding)/experience.tsx](#source-app-onboarding-experience-tsx) |
| [app/(onboarding)/split-choice.tsx](/Users/satwikmekala/stackv3/app/(onboarding)/split-choice.tsx) | [app/(onboarding)/split-choice.tsx](#source-app-onboarding-split-choice-tsx) |
| [app/(onboarding)/welcome.tsx](/Users/satwikmekala/stackv3/app/(onboarding)/welcome.tsx) | [app/(onboarding)/welcome.tsx](#source-app-onboarding-welcome-tsx) |
| [app/(onboarding)/whatsurname.tsx](/Users/satwikmekala/stackv3/app/(onboarding)/whatsurname.tsx) | [app/(onboarding)/whatsurname.tsx](#source-app-onboarding-whatsurname-tsx) |
| [app/(tabs)/_layout.tsx](/Users/satwikmekala/stackv3/app/(tabs)/_layout.tsx) | [app/(tabs)/_layout.tsx](#source-app-tabs-layout-tsx) |
| [app/(tabs)/index.tsx](/Users/satwikmekala/stackv3/app/(tabs)/index.tsx) | [app/(tabs)/index.tsx](#source-app-tabs-index-tsx) |
| [app/(tabs)/profile.tsx](/Users/satwikmekala/stackv3/app/(tabs)/profile.tsx) | [app/(tabs)/profile.tsx](#source-app-tabs-profile-tsx) |
| [app/(tabs)/stack.tsx](/Users/satwikmekala/stackv3/app/(tabs)/stack.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [app/+not-found.tsx](/Users/satwikmekala/stackv3/app/+not-found.tsx) | [app/+not-found.tsx](#source-app-not-found-tsx) |
| [app/_layout.tsx](/Users/satwikmekala/stackv3/app/_layout.tsx) | [app/_layout.tsx](#source-app-layout-tsx) |
| [app/build-case/[week].tsx](/Users/satwikmekala/stackv3/app/build-case/[week].tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [app/build-case/index.tsx](/Users/satwikmekala/stackv3/app/build-case/index.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [app/build-casting.tsx](/Users/satwikmekala/stackv3/app/build-casting.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [app/build-sandbox.tsx](/Users/satwikmekala/stackv3/app/build-sandbox.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [app/build.tsx](/Users/satwikmekala/stackv3/app/build.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [app/custom-split/_layout.tsx](/Users/satwikmekala/stackv3/app/custom-split/_layout.tsx) | [app/custom-split/_layout.tsx](#source-app-custom-split-layout-tsx) |
| [app/custom-split/exercises.tsx](/Users/satwikmekala/stackv3/app/custom-split/exercises.tsx) | [app/custom-split/exercises.tsx](#source-app-custom-split-exercises-tsx) |
| [app/custom-split/index.tsx](/Users/satwikmekala/stackv3/app/custom-split/index.tsx) | [app/custom-split/index.tsx](#source-app-custom-split-index-tsx) |
| [app/custom-split/new-exercise.tsx](/Users/satwikmekala/stackv3/app/custom-split/new-exercise.tsx) | [app/custom-split/new-exercise.tsx](#source-app-custom-split-new-exercise-tsx) |
| [app/custom-split/personalize.tsx](/Users/satwikmekala/stackv3/app/custom-split/personalize.tsx) | [app/custom-split/personalize.tsx](#source-app-custom-split-personalize-tsx) |
| [app/custom-split/review.tsx](/Users/satwikmekala/stackv3/app/custom-split/review.tsx) | [app/custom-split/review.tsx](#source-app-custom-split-review-tsx) |
| [app/custom-split/template.tsx](/Users/satwikmekala/stackv3/app/custom-split/template.tsx) | [app/custom-split/template.tsx](#source-app-custom-split-template-tsx) |
| [app/dev-report.tsx](/Users/satwikmekala/stackv3/app/dev-report.tsx) | [app/dev-report.tsx](#source-app-dev-report-tsx) |
| [app/dev-share-cards.tsx](/Users/satwikmekala/stackv3/app/dev-share-cards.tsx) | [app/dev-share-cards.tsx](#source-app-dev-share-cards-tsx) |
| [app/history-week.tsx](/Users/satwikmekala/stackv3/app/history-week.tsx) | [app/history-week.tsx](#source-app-history-week-tsx) |
| [app/history.tsx](/Users/satwikmekala/stackv3/app/history.tsx) | [app/history.tsx](#source-app-history-tsx) |
| [app/import-split.tsx](/Users/satwikmekala/stackv3/app/import-split.tsx) | [app/import-split.tsx](#source-app-import-split-tsx) |
| [app/index.tsx](/Users/satwikmekala/stackv3/app/index.tsx) | [app/index.tsx](#source-app-index-tsx) |
| [app/lift-detail.tsx](/Users/satwikmekala/stackv3/app/lift-detail.tsx) | [app/lift-detail.tsx](#source-app-lift-detail-tsx) |
| [app/lift-progress.tsx](/Users/satwikmekala/stackv3/app/lift-progress.tsx) | [app/lift-progress.tsx](#source-app-lift-progress-tsx) |
| [app/onboarding-preview/_layout.tsx](/Users/satwikmekala/stackv3/app/onboarding-preview/_layout.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [app/onboarding-preview/index.tsx](/Users/satwikmekala/stackv3/app/onboarding-preview/index.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [app/onboarding-preview/starting-point.tsx](/Users/satwikmekala/stackv3/app/onboarding-preview/starting-point.tsx) | [app/onboarding-preview/starting-point.tsx](#source-app-onboarding-preview-starting-point-tsx) |
| [app/onboarding-preview/welcome.tsx](/Users/satwikmekala/stackv3/app/onboarding-preview/welcome.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [app/program-setup/_layout.tsx](/Users/satwikmekala/stackv3/app/program-setup/_layout.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [app/program-setup/index.tsx](/Users/satwikmekala/stackv3/app/program-setup/index.tsx) | [app/program-setup/index.tsx](#source-app-program-setup-index-tsx) |
| [app/program-setup/preview.tsx](/Users/satwikmekala/stackv3/app/program-setup/preview.tsx) | [app/program-setup/preview.tsx](#source-app-program-setup-preview-tsx) |
| [app/record-detail.tsx](/Users/satwikmekala/stackv3/app/record-detail.tsx) | [app/record-detail.tsx](#source-app-record-detail-tsx) |
| [app/records.tsx](/Users/satwikmekala/stackv3/app/records.tsx) | [app/records.tsx](#source-app-records-tsx) |
| [app/settings.tsx](/Users/satwikmekala/stackv3/app/settings.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [app/stack-example.tsx](/Users/satwikmekala/stackv3/app/stack-example.tsx) | [app/stack-example.tsx](#source-app-stack-example-tsx) |
| [app/stack-help.tsx](/Users/satwikmekala/stackv3/app/stack-help.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [app/workout-summary.tsx](/Users/satwikmekala/stackv3/app/workout-summary.tsx) | [app/workout-summary.tsx](#source-app-workout-summary-tsx) |
| [app/workout-unit.tsx](/Users/satwikmekala/stackv3/app/workout-unit.tsx) | [app/workout-unit.tsx](#source-app-workout-unit-tsx) |
| [app/workout.tsx](/Users/satwikmekala/stackv3/app/workout.tsx) | [app/workout.tsx](#source-app-workout-tsx) |
| [app/your-splits.tsx](/Users/satwikmekala/stackv3/app/your-splits.tsx) | [app/your-splits.tsx](#source-app-your-splits-tsx) |
| [components/ActiveSetCard.tsx](/Users/satwikmekala/stackv3/components/ActiveSetCard.tsx) | [components/ActiveSetCard.tsx](#source-components-activesetcard-tsx) |
| [components/ActiveWorkoutBar.tsx](/Users/satwikmekala/stackv3/components/ActiveWorkoutBar.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [components/ActiveWorkoutCard.tsx](/Users/satwikmekala/stackv3/components/ActiveWorkoutCard.tsx) | [components/ActiveWorkoutCard.tsx](#source-components-activeworkoutcard-tsx) |
| [components/BonusSet.tsx](/Users/satwikmekala/stackv3/components/BonusSet.tsx) | [components/BonusSet.tsx](#source-components-bonusset-tsx) |
| [components/Button.tsx](/Users/satwikmekala/stackv3/components/Button.tsx) | [components/Button.tsx](#source-components-button-tsx) |
| [components/ExerciseFinisher.tsx](/Users/satwikmekala/stackv3/components/ExerciseFinisher.tsx) | [components/ExerciseFinisher.tsx](#source-components-exercisefinisher-tsx) |
| [components/ExerciseInfo.tsx](/Users/satwikmekala/stackv3/components/ExerciseInfo.tsx) | [components/ExerciseInfo.tsx](#source-components-exerciseinfo-tsx) |
| [components/ExerciseNotes.tsx](/Users/satwikmekala/stackv3/components/ExerciseNotes.tsx) | [components/ExerciseNotes.tsx](#source-components-exercisenotes-tsx) |
| [components/ExerciseNotesDone.ios.tsx](/Users/satwikmekala/stackv3/components/ExerciseNotesDone.ios.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [components/ExerciseNotesDone.tsx](/Users/satwikmekala/stackv3/components/ExerciseNotesDone.tsx) | [components/ExerciseNotesDone.tsx](#source-components-exercisenotesdone-tsx) |
| [components/ExerciseSearchInput.tsx](/Users/satwikmekala/stackv3/components/ExerciseSearchInput.tsx) | [components/ExerciseSearchInput.tsx](#source-components-exercisesearchinput-tsx) |
| [components/HistoryWorkoutRow.tsx](/Users/satwikmekala/stackv3/components/HistoryWorkoutRow.tsx) | [components/HistoryWorkoutRow.tsx](#source-components-historyworkoutrow-tsx) |
| [components/Input.tsx](/Users/satwikmekala/stackv3/components/Input.tsx) | [components/Input.tsx](#source-components-input-tsx) |
| [components/LiftLogCard.tsx](/Users/satwikmekala/stackv3/components/LiftLogCard.tsx) | [components/LiftLogCard.tsx](#source-components-liftlogcard-tsx) |
| [components/LiftProgressCard.tsx](/Users/satwikmekala/stackv3/components/LiftProgressCard.tsx) | [components/LiftProgressCard.tsx](#source-components-liftprogresscard-tsx) |
| [components/MotivationQuote.tsx](/Users/satwikmekala/stackv3/components/MotivationQuote.tsx) | [components/MotivationQuote.tsx](#source-components-motivationquote-tsx) |
| [components/OnboardingControls.tsx](/Users/satwikmekala/stackv3/components/OnboardingControls.tsx) | [components/OnboardingControls.tsx](#source-components-onboardingcontrols-tsx) |
| [components/RestTimer.tsx](/Users/satwikmekala/stackv3/components/RestTimer.tsx) | [components/RestTimer.tsx](#source-components-resttimer-tsx) |
| [components/SaveAdhocRoutine.tsx](/Users/satwikmekala/stackv3/components/SaveAdhocRoutine.tsx) | [components/SaveAdhocRoutine.tsx](#source-components-saveadhocroutine-tsx) |
| [components/SetInput.tsx](/Users/satwikmekala/stackv3/components/SetInput.tsx) | [components/SetInput.tsx](#source-components-setinput-tsx) |
| [components/ShareSheet.tsx](/Users/satwikmekala/stackv3/components/ShareSheet.tsx) | [components/ShareSheet.tsx](#source-components-sharesheet-tsx) |
| [components/SplitShareButton.tsx](/Users/satwikmekala/stackv3/components/SplitShareButton.tsx) | [components/SplitShareButton.tsx](#source-components-splitsharebutton-tsx) |
| [components/StackLogo.tsx](/Users/satwikmekala/stackv3/components/StackLogo.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [components/StackPosterCard.tsx](/Users/satwikmekala/stackv3/components/StackPosterCard.tsx) | [components/StackPosterCard.tsx](#source-components-stackpostercard-tsx) |
| [components/StatStripCard.tsx](/Users/satwikmekala/stackv3/components/StatStripCard.tsx) | [components/StatStripCard.tsx](#source-components-statstripcard-tsx) |
| [components/StatusPill.tsx](/Users/satwikmekala/stackv3/components/StatusPill.tsx) | [components/StatusPill.tsx](#source-components-statuspill-tsx) |
| [components/SwapExerciseSheet.tsx](/Users/satwikmekala/stackv3/components/SwapExerciseSheet.tsx) | [components/SwapExerciseSheet.tsx](#source-components-swapexercisesheet-tsx) |
| [components/UpNextSheet.tsx](/Users/satwikmekala/stackv3/components/UpNextSheet.tsx) | [components/UpNextSheet.tsx](#source-components-upnextsheet-tsx) |
| [components/VolumeChart.tsx](/Users/satwikmekala/stackv3/components/VolumeChart.tsx) | [components/VolumeChart.tsx](#source-components-volumechart-tsx) |
| [components/WorkoutBolt.tsx](/Users/satwikmekala/stackv3/components/WorkoutBolt.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [components/WorkoutDayLabel.tsx](/Users/satwikmekala/stackv3/components/WorkoutDayLabel.tsx) | [components/WorkoutDayLabel.tsx](#source-components-workoutdaylabel-tsx) |
| [components/WorkoutHeaderActions.ios.tsx](/Users/satwikmekala/stackv3/components/WorkoutHeaderActions.ios.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [components/WorkoutHeaderActions.tsx](/Users/satwikmekala/stackv3/components/WorkoutHeaderActions.tsx) | [components/WorkoutHeaderActions.tsx](#source-components-workoutheaderactions-tsx) |
| [components/WorkoutHeaderActions.types.ts](/Users/satwikmekala/stackv3/components/WorkoutHeaderActions.types.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [components/WorkoutLaunchSurface.tsx](/Users/satwikmekala/stackv3/components/WorkoutLaunchSurface.tsx) | [components/WorkoutLaunchSurface.tsx](#source-components-workoutlaunchsurface-tsx) |
| [components/WorkoutLogAction.tsx](/Users/satwikmekala/stackv3/components/WorkoutLogAction.tsx) | [components/WorkoutLogAction.tsx](#source-components-workoutlogaction-tsx) |
| [components/WorkoutMinimizeSurface.tsx](/Users/satwikmekala/stackv3/components/WorkoutMinimizeSurface.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [components/WorkoutNumberWheel.tsx](/Users/satwikmekala/stackv3/components/WorkoutNumberWheel.tsx) | [components/WorkoutNumberWheel.tsx](#source-components-workoutnumberwheel-tsx) |
| [components/WorkoutRepsPicker.ios.tsx](/Users/satwikmekala/stackv3/components/WorkoutRepsPicker.ios.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [components/WorkoutRepsPicker.tsx](/Users/satwikmekala/stackv3/components/WorkoutRepsPicker.tsx) | [components/WorkoutRepsPicker.tsx](#source-components-workoutrepspicker-tsx) |
| [components/WorkoutRepsPicker.types.ts](/Users/satwikmekala/stackv3/components/WorkoutRepsPicker.types.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [components/WorkoutSetRail.tsx](/Users/satwikmekala/stackv3/components/WorkoutSetRail.tsx) | [components/WorkoutSetRail.tsx](#source-components-workoutsetrail-tsx) |
| [components/WorkoutTouchable.tsx](/Users/satwikmekala/stackv3/components/WorkoutTouchable.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [components/WorkoutWeightPicker.ios.tsx](/Users/satwikmekala/stackv3/components/WorkoutWeightPicker.ios.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [components/WorkoutWeightPicker.tsx](/Users/satwikmekala/stackv3/components/WorkoutWeightPicker.tsx) | [components/WorkoutWeightPicker.tsx](#source-components-workoutweightpicker-tsx) |
| [components/WorkoutWeightPicker.types.ts](/Users/satwikmekala/stackv3/components/WorkoutWeightPicker.types.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [components/custom-split/SelectedExerciseList.tsx](/Users/satwikmekala/stackv3/components/custom-split/SelectedExerciseList.tsx) | [components/custom-split/SelectedExerciseList.tsx](#source-components-custom-split-selectedexerciselist-tsx) |
| [components/custom-split/SplitActivationPill.tsx](/Users/satwikmekala/stackv3/components/custom-split/SplitActivationPill.tsx) | [components/custom-split/SplitActivationPill.tsx](#source-components-custom-split-splitactivationpill-tsx) |
| [components/custom-split/SplitPressable.tsx](/Users/satwikmekala/stackv3/components/custom-split/SplitPressable.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [components/custom-split/showActions.ts](/Users/satwikmekala/stackv3/components/custom-split/showActions.ts) | [components/custom-split/showActions.ts](#source-components-custom-split-showactions-ts) |
| [components/custom-split/ui.tsx](/Users/satwikmekala/stackv3/components/custom-split/ui.tsx) | [components/custom-split/ui.tsx](#source-components-custom-split-ui-tsx) |
| [components/dev/StackTestLiveActivity.tsx](/Users/satwikmekala/stackv3/components/dev/StackTestLiveActivity.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [components/dev/TestLiveActivityControls.ios.tsx](/Users/satwikmekala/stackv3/components/dev/TestLiveActivityControls.ios.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [components/dev/TestLiveActivityControls.tsx](/Users/satwikmekala/stackv3/components/dev/TestLiveActivityControls.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [components/dev/TestLiveActivityControlsNative.ios.tsx](/Users/satwikmekala/stackv3/components/dev/TestLiveActivityControlsNative.ios.tsx) | [components/dev/TestLiveActivityControlsNative.ios.tsx](#source-components-dev-testliveactivitycontrolsnative-ios-tsx) |
| [components/home/HomeDeparture.tsx](/Users/satwikmekala/stackv3/components/home/HomeDeparture.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [components/home/HomeTabBarDeparture.ios.tsx](/Users/satwikmekala/stackv3/components/home/HomeTabBarDeparture.ios.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [components/home/HomeTabBarDeparture.tsx](/Users/satwikmekala/stackv3/components/home/HomeTabBarDeparture.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [components/home/SlideToStart.tsx](/Users/satwikmekala/stackv3/components/home/SlideToStart.tsx) | [components/home/SlideToStart.tsx](#source-components-home-slidetostart-tsx) |
| [components/home/WeeklyProgressPill.tsx](/Users/satwikmekala/stackv3/components/home/WeeklyProgressPill.tsx) | [components/home/WeeklyProgressPill.tsx](#source-components-home-weeklyprogresspill-tsx) |
| [components/home/WorkoutCardSurface.tsx](/Users/satwikmekala/stackv3/components/home/WorkoutCardSurface.tsx) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [components/home/WorkoutHeroCard.tsx](/Users/satwikmekala/stackv3/components/home/WorkoutHeroCard.tsx) | [components/home/WorkoutHeroCard.tsx](#source-components-home-workoutherocard-tsx) |
| [components/home/WorkoutIntensityPicker.tsx](/Users/satwikmekala/stackv3/components/home/WorkoutIntensityPicker.tsx) | [components/home/WorkoutIntensityPicker.tsx](#source-components-home-workoutintensitypicker-tsx) |
| [components/home/WorkoutPicker.tsx](/Users/satwikmekala/stackv3/components/home/WorkoutPicker.tsx) | [components/home/WorkoutPicker.tsx](#source-components-home-workoutpicker-tsx) |
| [components/home/YourSplitCard.tsx](/Users/satwikmekala/stackv3/components/home/YourSplitCard.tsx) | [components/home/YourSplitCard.tsx](#source-components-home-yoursplitcard-tsx) |
| [components/live-activity/WorkoutLiveActivityLayout.tsx](/Users/satwikmekala/stackv3/components/live-activity/WorkoutLiveActivityLayout.tsx) | [components/live-activity/WorkoutLiveActivityLayout.tsx](#source-components-live-activity-workoutliveactivitylayout-tsx) |
| [constants/archetypes.ts](/Users/satwikmekala/stackv3/constants/archetypes.ts) | [constants/archetypes.ts](#source-constants-archetypes-ts) |
| [constants/exerciseInfo.ts](/Users/satwikmekala/stackv3/constants/exerciseInfo.ts) | [constants/exerciseInfo.ts](#source-constants-exerciseinfo-ts) |
| [constants/motion.ts](/Users/satwikmekala/stackv3/constants/motion.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [constants/muscleColors.ts](/Users/satwikmekala/stackv3/constants/muscleColors.ts) | [constants/muscleColors.ts](#source-constants-musclecolors-ts) |
| [constants/theme.ts](/Users/satwikmekala/stackv3/constants/theme.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [constants/workoutLayoutTransitions.ts](/Users/satwikmekala/stackv3/constants/workoutLayoutTransitions.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [constants/workoutMotion.ts](/Users/satwikmekala/stackv3/constants/workoutMotion.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [constants/workoutPicker.ts](/Users/satwikmekala/stackv3/constants/workoutPicker.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [constants/workouts.ts](/Users/satwikmekala/stackv3/constants/workouts.ts) | [constants/workouts.ts](#source-constants-workouts-ts) |
| [features/build/BuildEntry.tsx](/Users/satwikmekala/stackv3/features/build/BuildEntry.tsx) | [features/build/BuildEntry.tsx](#source-features-build-buildentry-tsx) |
| [features/build/BuildHome.tsx](/Users/satwikmekala/stackv3/features/build/BuildHome.tsx) | [features/build/BuildHome.tsx](#source-features-build-buildhome-tsx) |
| [features/build/BuildPreview.tsx](/Users/satwikmekala/stackv3/features/build/BuildPreview.tsx) | [features/build/BuildPreview.tsx](#source-features-build-buildpreview-tsx) |
| [features/build/BuildSandbox.tsx](/Users/satwikmekala/stackv3/features/build/BuildSandbox.tsx) | [features/build/BuildSandbox.tsx](#source-features-build-buildsandbox-tsx) |
| [features/build/BuildScene.native.tsx](/Users/satwikmekala/stackv3/features/build/BuildScene.native.tsx) | [features/build/BuildScene.native.tsx](#source-features-build-buildscene-native-tsx) |
| [features/build/BuildScene.tsx](/Users/satwikmekala/stackv3/features/build/BuildScene.tsx) | [features/build/BuildScene.tsx](#source-features-build-buildscene-tsx) |
| [features/build/Case.tsx](/Users/satwikmekala/stackv3/features/build/Case.tsx) | [features/build/Case.tsx](#source-features-build-case-tsx) |
| [features/build/CastingScreen.tsx](/Users/satwikmekala/stackv3/features/build/CastingScreen.tsx) | [features/build/CastingScreen.tsx](#source-features-build-castingscreen-tsx) |
| [features/build/EvidenceInspector.tsx](/Users/satwikmekala/stackv3/features/build/EvidenceInspector.tsx) | [features/build/EvidenceInspector.tsx](#source-features-build-evidenceinspector-tsx) |
| [features/build/FusionPresentation.tsx](/Users/satwikmekala/stackv3/features/build/FusionPresentation.tsx) | [features/build/FusionPresentation.tsx](#source-features-build-fusionpresentation-tsx) |
| [features/build/MetricTiles.tsx](/Users/satwikmekala/stackv3/features/build/MetricTiles.tsx) | [features/build/MetricTiles.tsx](#source-features-build-metrictiles-tsx) |
| [features/build/Monolith.tsx](/Users/satwikmekala/stackv3/features/build/Monolith.tsx) | [features/build/Monolith.tsx](#source-features-build-monolith-tsx) |
| [features/build/StackDiscovery.tsx](/Users/satwikmekala/stackv3/features/build/StackDiscovery.tsx) | [features/build/StackDiscovery.tsx](#source-features-build-stackdiscovery-tsx) |
| [features/build/UnpackedWeek.tsx](/Users/satwikmekala/stackv3/features/build/UnpackedWeek.tsx) | [features/build/UnpackedWeek.tsx](#source-features-build-unpackedweek-tsx) |
| [features/build/adapter.ts](/Users/satwikmekala/stackv3/features/build/adapter.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/build/buildCounts.ts](/Users/satwikmekala/stackv3/features/build/buildCounts.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/build/buildFormat.ts](/Users/satwikmekala/stackv3/features/build/buildFormat.ts) | [features/build/buildFormat.ts](#source-features-build-buildformat-ts) |
| [features/build/buildHistoryCache.ts](/Users/satwikmekala/stackv3/features/build/buildHistoryCache.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/build/buildNavigation.ts](/Users/satwikmekala/stackv3/features/build/buildNavigation.ts) | [features/build/buildNavigation.ts](#source-features-build-buildnavigation-ts) |
| [features/build/caseCopy.ts](/Users/satwikmekala/stackv3/features/build/caseCopy.ts) | [features/build/caseCopy.ts](#source-features-build-casecopy-ts) |
| [features/build/caseModel.ts](/Users/satwikmekala/stackv3/features/build/caseModel.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/build/casting.ts](/Users/satwikmekala/stackv3/features/build/casting.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/build/castingCopy.ts](/Users/satwikmekala/stackv3/features/build/castingCopy.ts) | [features/build/castingCopy.ts](#source-features-build-castingcopy-ts) |
| [features/build/config.ts](/Users/satwikmekala/stackv3/features/build/config.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/build/evidence.ts](/Users/satwikmekala/stackv3/features/build/evidence.ts) | [features/build/evidence.ts](#source-features-build-evidence-ts) |
| [features/build/evidenceDemo.ts](/Users/satwikmekala/stackv3/features/build/evidenceDemo.ts) | [features/build/evidenceDemo.ts](#source-features-build-evidencedemo-ts) |
| [features/build/fusion.ts](/Users/satwikmekala/stackv3/features/build/fusion.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/build/fusionCoordinator.ts](/Users/satwikmekala/stackv3/features/build/fusionCoordinator.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/build/fusionCopy.ts](/Users/satwikmekala/stackv3/features/build/fusionCopy.ts) | [features/build/fusionCopy.ts](#source-features-build-fusioncopy-ts) |
| [features/build/fusionDemo.ts](/Users/satwikmekala/stackv3/features/build/fusionDemo.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/build/geometry.ts](/Users/satwikmekala/stackv3/features/build/geometry.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/build/homeModuleCopy.ts](/Users/satwikmekala/stackv3/features/build/homeModuleCopy.ts) | [features/build/homeModuleCopy.ts](#source-features-build-homemodulecopy-ts) |
| [features/build/introCopy.ts](/Users/satwikmekala/stackv3/features/build/introCopy.ts) | [features/build/introCopy.ts](#source-features-build-introcopy-ts) |
| [features/build/introOverview.ts](/Users/satwikmekala/stackv3/features/build/introOverview.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/build/introPages.ts](/Users/satwikmekala/stackv3/features/build/introPages.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/build/introduction.ts](/Users/satwikmekala/stackv3/features/build/introduction.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/build/introductionStore.ts](/Users/satwikmekala/stackv3/features/build/introductionStore.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/build/model.ts](/Users/satwikmekala/stackv3/features/build/model.ts) | [features/build/model.ts](#source-features-build-model-ts) |
| [features/build/monolithDemo.ts](/Users/satwikmekala/stackv3/features/build/monolithDemo.ts) | [features/build/monolithDemo.ts](#source-features-build-monolithdemo-ts) |
| [features/build/monolithModel.ts](/Users/satwikmekala/stackv3/features/build/monolithModel.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/build/preferences.ts](/Users/satwikmekala/stackv3/features/build/preferences.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/build/presentation.ts](/Users/satwikmekala/stackv3/features/build/presentation.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/build/sceneTypes.ts](/Users/satwikmekala/stackv3/features/build/sceneTypes.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/build/useArchiveHistory.ts](/Users/satwikmekala/stackv3/features/build/useArchiveHistory.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/build/useBuildAccessibility.ts](/Users/satwikmekala/stackv3/features/build/useBuildAccessibility.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/build/useBuildHistory.ts](/Users/satwikmekala/stackv3/features/build/useBuildHistory.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/build/welcomeMotion.ts](/Users/satwikmekala/stackv3/features/build/welcomeMotion.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/custom-split/colors.ts](/Users/satwikmekala/stackv3/features/custom-split/colors.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/home/slideCommit.ts](/Users/satwikmekala/stackv3/features/home/slideCommit.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/onboarding/SetupLoading.tsx](/Users/satwikmekala/stackv3/features/onboarding/SetupLoading.tsx) | [features/onboarding/SetupLoading.tsx](#source-features-onboarding-setuploading-tsx) |
| [features/onboarding/StartingPointScreen.tsx](/Users/satwikmekala/stackv3/features/onboarding/StartingPointScreen.tsx) | [features/onboarding/StartingPointScreen.tsx](#source-features-onboarding-startingpointscreen-tsx) |
| [features/onboarding/WelcomePreview.tsx](/Users/satwikmekala/stackv3/features/onboarding/WelcomePreview.tsx) | [features/onboarding/WelcomePreview.tsx](#source-features-onboarding-welcomepreview-tsx) |
| [features/onboarding/WelcomeScreen.tsx](/Users/satwikmekala/stackv3/features/onboarding/WelcomeScreen.tsx) | [features/onboarding/WelcomeScreen.tsx](#source-features-onboarding-welcomescreen-tsx) |
| [features/onboarding/config.ts](/Users/satwikmekala/stackv3/features/onboarding/config.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/onboarding/entry.ts](/Users/satwikmekala/stackv3/features/onboarding/entry.ts) | [features/onboarding/entry.ts](#source-features-onboarding-entry-ts) |
| [features/onboarding/useCoreOnboarding.ts](/Users/satwikmekala/stackv3/features/onboarding/useCoreOnboarding.ts) | [features/onboarding/useCoreOnboarding.ts](#source-features-onboarding-usecoreonboarding-ts) |
| [features/onboarding/welcomeExample.ts](/Users/satwikmekala/stackv3/features/onboarding/welcomeExample.ts) | [features/onboarding/welcomeExample.ts](#source-features-onboarding-welcomeexample-ts) |
| [features/program/ProgramFrequencyScreen.tsx](/Users/satwikmekala/stackv3/features/program/ProgramFrequencyScreen.tsx) | [features/program/ProgramFrequencyScreen.tsx](#source-features-program-programfrequencyscreen-tsx) |
| [features/program/ProgramPreviewScreen.tsx](/Users/satwikmekala/stackv3/features/program/ProgramPreviewScreen.tsx) | [features/program/ProgramPreviewScreen.tsx](#source-features-program-programpreviewscreen-tsx) |
| [features/program/ProgramScreenFrame.tsx](/Users/satwikmekala/stackv3/features/program/ProgramScreenFrame.tsx) | [features/program/ProgramScreenFrame.tsx](#source-features-program-programscreenframe-tsx) |
| [features/program/acceptance.ts](/Users/satwikmekala/stackv3/features/program/acceptance.ts) | [features/program/acceptance.ts](#source-features-program-acceptance-ts) |
| [features/program/lineup.ts](/Users/satwikmekala/stackv3/features/program/lineup.ts) | [features/program/lineup.ts](#source-features-program-lineup-ts) |
| [features/program/useProgramSetup.ts](/Users/satwikmekala/stackv3/features/program/useProgramSetup.ts) | [features/program/useProgramSetup.ts](#source-features-program-useprogramsetup-ts) |
| [features/report/WorkoutReportSheet.tsx](/Users/satwikmekala/stackv3/features/report/WorkoutReportSheet.tsx) | [features/report/WorkoutReportSheet.tsx](#source-features-report-workoutreportsheet-tsx) |
| [features/report/WorkoutReportView.tsx](/Users/satwikmekala/stackv3/features/report/WorkoutReportView.tsx) | [features/report/WorkoutReportView.tsx](#source-features-report-workoutreportview-tsx) |
| [features/report/reportFixtures.ts](/Users/satwikmekala/stackv3/features/report/reportFixtures.ts) | [features/report/reportFixtures.ts](#source-features-report-reportfixtures-ts) |
| [features/report/shareWeekReport.ts](/Users/satwikmekala/stackv3/features/report/shareWeekReport.ts) | [features/report/shareWeekReport.ts](#source-features-report-shareweekreport-ts) |
| [features/report/shareWorkoutReport.ts](/Users/satwikmekala/stackv3/features/report/shareWorkoutReport.ts) | [features/report/shareWorkoutReport.ts](#source-features-report-shareworkoutreport-ts) |
| [features/report/weekReport.ts](/Users/satwikmekala/stackv3/features/report/weekReport.ts) | [features/report/weekReport.ts](#source-features-report-weekreport-ts) |
| [features/report/weekReportHtml.ts](/Users/satwikmekala/stackv3/features/report/weekReportHtml.ts) | [features/report/weekReportHtml.ts](#source-features-report-weekreporthtml-ts) |
| [features/report/workoutReport.ts](/Users/satwikmekala/stackv3/features/report/workoutReport.ts) | [features/report/workoutReport.ts](#source-features-report-workoutreport-ts) |
| [features/report/workoutReportHtml.ts](/Users/satwikmekala/stackv3/features/report/workoutReportHtml.ts) | [features/report/workoutReportHtml.ts](#source-features-report-workoutreporthtml-ts) |
| [features/settings/SettingsScreen.ios.tsx](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.ios.tsx) | [features/settings/SettingsScreen.ios.tsx](#source-features-settings-settingsscreen-ios-tsx) |
| [features/settings/SettingsScreen.tsx](/Users/satwikmekala/stackv3/features/settings/SettingsScreen.tsx) | [features/settings/SettingsScreen.tsx](#source-features-settings-settingsscreen-tsx) |
| [features/settings/data.ts](/Users/satwikmekala/stackv3/features/settings/data.ts) | [features/settings/data.ts](#source-features-settings-data-ts) |
| [features/settings/types.ts](/Users/satwikmekala/stackv3/features/settings/types.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/settings/useSettings.ts](/Users/satwikmekala/stackv3/features/settings/useSettings.ts) | [features/settings/useSettings.ts](#source-features-settings-usesettings-ts) |
| [features/sharing/customSplitAdapter.ts](/Users/satwikmekala/stackv3/features/sharing/customSplitAdapter.ts) | [features/sharing/customSplitAdapter.ts](#source-features-sharing-customsplitadapter-ts) |
| [features/sharing/importAction.ts](/Users/satwikmekala/stackv3/features/sharing/importAction.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/sharing/shareSavedSplit.ts](/Users/satwikmekala/stackv3/features/sharing/shareSavedSplit.ts) | [features/sharing/shareSavedSplit.ts](#source-features-sharing-sharesavedsplit-ts) |
| [features/sharing/shareSplit.ts](/Users/satwikmekala/stackv3/features/sharing/shareSplit.ts) | [features/sharing/shareSplit.ts](#source-features-sharing-sharesplit-ts) |
| [features/sharing/splitLinkRouting.ts](/Users/satwikmekala/stackv3/features/sharing/splitLinkRouting.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [features/sharing/splitProtocol.ts](/Users/satwikmekala/stackv3/features/sharing/splitProtocol.ts) | [features/sharing/splitProtocol.ts](#source-features-sharing-splitprotocol-ts) |
| [features/sharing/splitTransport.ts](/Users/satwikmekala/stackv3/features/sharing/splitTransport.ts) | [features/sharing/splitTransport.ts](#source-features-sharing-splittransport-ts) |
| [features/workout-launch/coordinator.ts](/Users/satwikmekala/stackv3/features/workout-launch/coordinator.ts) | [features/workout-launch/coordinator.ts](#source-features-workout-launch-coordinator-ts) |
| [features/workout-launch/navigation.ts](/Users/satwikmekala/stackv3/features/workout-launch/navigation.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [hooks/useExerciseTimer.ts](/Users/satwikmekala/stackv3/hooks/useExerciseTimer.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [hooks/useFrameworkReady.ts](/Users/satwikmekala/stackv3/hooks/useFrameworkReady.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [hooks/usePressScale.ts](/Users/satwikmekala/stackv3/hooks/usePressScale.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [hooks/useWatchedLifts.ts](/Users/satwikmekala/stackv3/hooks/useWatchedLifts.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [ios/ExpoWidgetsTarget/index.swift](/Users/satwikmekala/stackv3/ios/ExpoWidgetsTarget/index.swift) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [ios/Stack/AppDelegate.swift](/Users/satwikmekala/stackv3/ios/Stack/AppDelegate.swift) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [modules/stack-workout-controls/ios/StackWorkoutControlsModule.swift](/Users/satwikmekala/stackv3/modules/stack-workout-controls/ios/StackWorkoutControlsModule.swift) | [modules/stack-workout-controls/ios/StackWorkoutControlsModule.swift](#source-modules-stack-workout-controls-ios-stackworkoutcontrolsmodule-swift) |
| [services/haptics.ts](/Users/satwikmekala/stackv3/services/haptics.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [services/liveActivity/actions.ts](/Users/satwikmekala/stackv3/services/liveActivity/actions.ts) | [services/liveActivity/actions.ts](#source-services-liveactivity-actions-ts) |
| [services/liveActivity/compactExerciseName.ts](/Users/satwikmekala/stackv3/services/liveActivity/compactExerciseName.ts) | [services/liveActivity/compactExerciseName.ts](#source-services-liveactivity-compactexercisename-ts) |
| [services/liveActivity/coordinator.ts](/Users/satwikmekala/stackv3/services/liveActivity/coordinator.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [services/liveActivity/factories.ios.ts](/Users/satwikmekala/stackv3/services/liveActivity/factories.ios.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [services/liveActivity/interaction.ios.ts](/Users/satwikmekala/stackv3/services/liveActivity/interaction.ios.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [services/liveActivity/interaction.ts](/Users/satwikmekala/stackv3/services/liveActivity/interaction.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [services/liveActivity/latency.ios.ts](/Users/satwikmekala/stackv3/services/liveActivity/latency.ios.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [services/liveActivity/presentation.ts](/Users/satwikmekala/stackv3/services/liveActivity/presentation.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [services/liveActivity/state.ts](/Users/satwikmekala/stackv3/services/liveActivity/state.ts) | [services/liveActivity/state.ts](#source-services-liveactivity-state-ts) |
| [services/liveActivity/sync.ios.ts](/Users/satwikmekala/stackv3/services/liveActivity/sync.ios.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [services/liveActivity/sync.ts](/Users/satwikmekala/stackv3/services/liveActivity/sync.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [store/adhocWorkout.ts](/Users/satwikmekala/stackv3/store/adhocWorkout.ts) | [store/adhocWorkout.ts](#source-store-adhocworkout-ts) |
| [store/appPreferences.ts](/Users/satwikmekala/stackv3/store/appPreferences.ts) | [store/appPreferences.ts](#source-store-apppreferences-ts) |
| [store/customSplitDraft.ts](/Users/satwikmekala/stackv3/store/customSplitDraft.ts) | [store/customSplitDraft.ts](#source-store-customsplitdraft-ts) |
| [store/customSplitRotation.ts](/Users/satwikmekala/stackv3/store/customSplitRotation.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [store/customSplits.ts](/Users/satwikmekala/stackv3/store/customSplits.ts) | [store/customSplits.ts](#source-store-customsplits-ts) |
| [store/exerciseMeasurement.ts](/Users/satwikmekala/stackv3/store/exerciseMeasurement.ts) | [store/exerciseMeasurement.ts](#source-store-exercisemeasurement-ts) |
| [store/exerciseNotes.ts](/Users/satwikmekala/stackv3/store/exerciseNotes.ts) | [store/exerciseNotes.ts](#source-store-exercisenotes-ts) |
| [store/exerciseTimer.ts](/Users/satwikmekala/stackv3/store/exerciseTimer.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [store/exerciseWrapUp.ts](/Users/satwikmekala/stackv3/store/exerciseWrapUp.ts) | [store/exerciseWrapUp.ts](#source-store-exercisewrapup-ts) |
| [store/liftLog.ts](/Users/satwikmekala/stackv3/store/liftLog.ts) | [store/liftLog.ts](#source-store-liftlog-ts) |
| [store/liftProgress.ts](/Users/satwikmekala/stackv3/store/liftProgress.ts) | [store/liftProgress.ts](#source-store-liftprogress-ts) |
| [store/liftProgressPreferences.ts](/Users/satwikmekala/stackv3/store/liftProgressPreferences.ts) | [store/liftProgressPreferences.ts](#source-store-liftprogresspreferences-ts) |
| [store/muscleColors.ts](/Users/satwikmekala/stackv3/store/muscleColors.ts) | [store/muscleColors.ts](#source-store-musclecolors-ts) |
| [store/onboardingDraft.ts](/Users/satwikmekala/stackv3/store/onboardingDraft.ts) | [store/onboardingDraft.ts](#source-store-onboardingdraft-ts) |
| [store/personalRecords.ts](/Users/satwikmekala/stackv3/store/personalRecords.ts) | [store/personalRecords.ts](#source-store-personalrecords-ts) |
| [store/programConfigurationDraft.ts](/Users/satwikmekala/stackv3/store/programConfigurationDraft.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [store/programPreferences.ts](/Users/satwikmekala/stackv3/store/programPreferences.ts) | [store/programPreferences.ts](#source-store-programpreferences-ts) |
| [store/sharedRoutineHandoff.ts](/Users/satwikmekala/stackv3/store/sharedRoutineHandoff.ts) | [store/sharedRoutineHandoff.ts](#source-store-sharedroutinehandoff-ts) |
| [store/splitImport.ts](/Users/satwikmekala/stackv3/store/splitImport.ts) | [store/splitImport.ts](#source-store-splitimport-ts) |
| [store/trainingPreferences.ts](/Users/satwikmekala/stackv3/store/trainingPreferences.ts) | [store/trainingPreferences.ts](#source-store-trainingpreferences-ts) |
| [store/verifiedSessions.ts](/Users/satwikmekala/stackv3/store/verifiedSessions.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [store/weeklyQueueEngine.ts](/Users/satwikmekala/stackv3/store/weeklyQueueEngine.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [store/weightUnits.ts](/Users/satwikmekala/stackv3/store/weightUnits.ts) | [store/weightUnits.ts](#source-store-weightunits-ts) |
| [store/workoutBackup.ts](/Users/satwikmekala/stackv3/store/workoutBackup.ts) | [store/workoutBackup.ts](#source-store-workoutbackup-ts) |
| [store/workoutCalendar.ts](/Users/satwikmekala/stackv3/store/workoutCalendar.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [store/workoutDatabase.ts](/Users/satwikmekala/stackv3/store/workoutDatabase.ts) | [store/workoutDatabase.ts](#source-store-workoutdatabase-ts) |
| [store/workoutHistory.ts](/Users/satwikmekala/stackv3/store/workoutHistory.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [store/workoutLaunch.ts](/Users/satwikmekala/stackv3/store/workoutLaunch.ts) | [store/workoutLaunch.ts](#source-store-workoutlaunch-ts) |
| [store/workoutMinimizeTarget.ts](/Users/satwikmekala/stackv3/store/workoutMinimizeTarget.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [store/workoutProgression.ts](/Users/satwikmekala/stackv3/store/workoutProgression.ts) | [store/workoutProgression.ts](#source-store-workoutprogression-ts) |
| [store/workoutSetActions.ts](/Users/satwikmekala/stackv3/store/workoutSetActions.ts) | [store/workoutSetActions.ts](#source-store-workoutsetactions-ts) |
| [store/workoutStore.ts](/Users/satwikmekala/stackv3/store/workoutStore.ts) | [store/workoutStore.ts](#source-store-workoutstore-ts) |
| [store/workoutSummary.ts](/Users/satwikmekala/stackv3/store/workoutSummary.ts) | [store/workoutSummary.ts](#source-store-workoutsummary-ts) |
| [utils/workoutLaunch.ts](/Users/satwikmekala/stackv3/utils/workoutLaunch.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
| [utils/workoutResume.ts](/Users/satwikmekala/stackv3/utils/workoutResume.ts) | No independent app-authored copy; values/delegation/rendering/native infrastructure. |
