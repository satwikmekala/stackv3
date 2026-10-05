# Exercise change sheet refinement

The exercise editor previously occupied a fixed area above the catalog's scroll view. Expanding suggestions and opening the keyboard could exhaust the sheet's height and clip the editor. Measurement shared a wrapping row with two different selection groups and had no spacing above its heading.

The sheet now presents either the exercise catalog or the editor. A keyboard-avoiding container surrounds the sheet; the editor body scrolls and its actions remain in a separate footer. Name suggestions appear immediately after the field, search across muscle groups, and show five matches with a refinement hint. Choosing a muscle alone does not insert suggestions or move the form. Exact names reuse catalog entries. Failed additions keep the editor and name available for retry.

Muscle options use neutral resting states and a tint plus checkmark for selection. Load and Track are separate groups with selected checkmarks. Controls have at least 44 pt targets, exercise names and sections can wrap, and the sheet's text scales. Stack's existing display, UI, mono, warm surface, and workout accent tokens are retained. Drag dismissal belongs to the header, retargets after interruptions, commits on release, and returns to rest on cancellation. Reduce Motion uses a modal fade and immediate dismissal/snap-back.

## Validation

- TypeScript and ESLint for the changed component and UI test file pass.
- Five targeted UI tests pass: add-only selection, custom measurement creation, catalog-wide name search/exact reuse, failed-add retry, and validation/cancel/reopen state.
- Thirty relevant existing persistence tests pass, including catalog, append/swap, custom creation, duplicate rejection, rollback, and mixed measurements.
- An isolated React Native Web preview used the production sheet with mocked workout data and real fonts. Inspection at 390 × 740 and 320 × 480 covered form grouping, wrapped chips, suggestions, scroll access to the name, and footer visibility. This does not validate an iOS software keyboard.
- The broader UI suite hit two unrelated exercise-timer mock failures while loading the active set component. Targeted sheet checks pass; this work does not claim that broader suite is green.
- The temporary simulator and browser fixture were removed. The isolated simulator encountered a disk-space limit. Actual iOS keyboard avoidance, physical-device drag/press feel, VoiceOver, and accessibility settings still require device review.
