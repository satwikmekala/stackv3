# Stack Design System

> Live implementation reference, verified against constants/theme.ts, app/_layout.tsx, and current app/component usage on 2026-07-19.

## Documentation status

This file existed before this update. Its product intent is retained: “Ruthlessly minimal. Zero decisions. Just lift.” The decision-fatigue framing, one clear next action, prefilled context, calm disciplined-coach voice, and offline-first product constraint are still useful and supported by the existing design and fully offline SQLite implementation; the app has no backend, and Supabase has been fully removed.

The former implementation specifications were not retained as current rules where they conflict with live code. In particular, the former OKLCH/neon-green palette, Inter typography, fixed 4 px spacing scale, white-CTA rule, no-tabs information architecture, and most prescriptive component, motion, accessibility, and future-feature specifications are stale or aspirational. There is no root README.md or docs/ directory; the remaining project documentation corroborates the offline-first SQLite context but does not add brand language.

Two comments in constants/theme.ts also need an interpretation note:

- The comment describing redesign tokens as a one-screen-at-a-time migration conflicts with the confirmed product decision below. Both systems are intentional, active systems; neither is legacy, dead, or a temporary replacement for the other.
- The comment that limits the plain cobalt accent to a suggested-workout signal, active tab, and set confirmation is stale. Current direct references are documented in the Color systems section.

## Brand and product identity

Stack is a gym-tracking app built to remove the decisions between opening the app and lifting: it should feel ruthlessly minimal, fast, legible between sets, and like a calm, disciplined coach rather than a hype fitness influencer. Its conceptual north star is Dropset by Fortyfour AB’s fine Scandinavian minimalism, interpreted through Stack’s own dark, tactile surfaces, compact workout context, and restrained feedback rather than visually copied. The existing brief’s priorities remain: make the next action clear, prefill useful context, recognize small wins, and support an offline-first lifting flow.

## Two named, coexisting design systems

Stack deliberately operates two live token systems side by side in constants/theme.ts.

| System | Tokens | Type roles | Where it is used |
|---|---|---|---|
| **Redesign system (primary)** | **redesignColors** and **redesignFonts** | Bricolage Grotesque display, Hanken Grotesk UI, JetBrains Mono numerals/labels | Most screens and components, including onboarding, home, workout, records, and profile. |
| **Plain system (specialized live surface)** | **colors** and **fonts** | Switzer text, Space Mono numerals | Button, Input, MotivationQuote, SetInput, VolumeChart, and app/settings.tsx. |

The systems are both intentional. A screen can also compose a component from the other system; for example, app/workout.tsx directly uses the redesign tokens and includes the plain Button in its feedback modal. That is normal component composition, not a signal that either system is old or being replaced.

All app/component font-family declarations resolve through one of these two token objects; no literal font-family strings were found in those directories. app/_layout.tsx registers both systems before the app is shown. tailwind.config.js mirrors the plain colors and fonts only; it does not define a third visual system.

## Color systems

All base-token values below are hexadecimal strings declared in constants/theme.ts; neither base object contains an RGBA value. The supporting workout palettes are contextual category/action maps, not a third base design system.

### Redesign system: redesignColors

| Purpose | Token | Value | Implemented role |
|---|---|---:|---|
| Background | **ink** | **#13110E** | Base screen background. |
| Surface | **surface** | **#1D1915** | Standard cards and sheets. |
| Raised surface | **raised** | **#2A231C** | Nested and raised controls. |
| High-emphasis surface | **hi** | **#3D3228** | Selected or higher-emphasis surface. |
| Primary text/foreground | **bone** | **#F5F0E8** | Light primary text and foreground. |
| Secondary text | **ash** | **#A99F91** | Secondary text. |
| Tertiary/de-emphasized text | **ashDim** | **#6F6558** | Tertiary, disabled, or lower-emphasis text. |
| Borders/dividers | **border** | **#3A322A** | Card, control, and divider borders. |

The orange **redesignColors.accent** token, **#FF7A3D**, is used for the completed/goal-met hero card state. There is no named error, success, or warning token in this base object; other redesign interfaces receive workout-specific color through the supporting category maps below.

### Plain system: colors

| Purpose | Token | Value | Implemented role |
|---|---|---:|---|
| Background | **ink** | **#100E0C** | Base screen background. |
| Surface | **surface** | **#1C1815** | Card and container surface. |
| Raised surface | **surfaceRaised** | **#262019** | Nested, pressed, or active surface. |
| Primary text/foreground | **bone** | **#F3EDE4** | Light primary text and foreground. |
| Secondary text | **ash** | **#A39C8F** | Secondary/muted text. |
| Tertiary/de-emphasized text | **ashDim** | **#6B6459** | Disabled or lower-emphasis context. |
| Named global accent | **accent** | **#4C6FFF** | Cool cobalt blue; Stack’s current named accent. |

The plain system defines no border/divider token and no named error, success, or warning token. Component-level borders either use a surface/text token or a local literal where necessary.

**Verified cobalt use.** The current global accent is cobalt blue **#4C6FFF**. Two representative direct uses are the completed-set check background in components/SetInput.tsx and the current-week bar plus “This week” label in components/VolumeChart.tsx. It is also used for focused input borders in components/Input.tsx and app/settings.tsx. A fresh source search found no direct plain-accent use for an active tab or suggested-workout signal.

### Supporting workout-category palettes

constants/workouts.ts maps **splitColors** to the six workout types. The active workout logging screen selects **workoutLoggingColors** by the current workout type. These values identify workout categories and contextual actions; they do not make every surface or status colorful.

| Map | Token | Value |
|---|---|---:|
| **splitColors** | **chest** | **#FF7A3D** |
| **splitColors** | **back** | **#4F8BFF** |
| **splitColors** | **shoulders** | **#A76FF2** |
| **splitColors** | **arms** | **#28C8BD** |
| **splitColors** | **legs** | **#B5E53F** |
| **splitColors** | **core** | **#FF5682** |
| **workoutLoggingColors** | **chest** | **#FF7A3D** (splitColors.chest) |
| **workoutLoggingColors** | **back** | **#4F8BFF** (splitColors.back) |
| **workoutLoggingColors** | **shoulders** | **#F05C66** |
| **workoutLoggingColors** | **arms** | **#28C8BD** (splitColors.arms) |
| **workoutLoggingColors** | **legs** | **#B5E53F** (splitColors.legs) |
| **workoutLoggingColors** | **core** | **#55C96B** |

Some feature files also define local contextual colors, such as BonusSet metadata and gradients. They are not exported global design tokens and are therefore not substitutes for the two named base systems above.

## Typography systems

app/_layout.tsx loads every family listed here. The four Switzer faces are bundled locally; all other faces are provided through the named Expo Google Fonts packages.

### Plain system: fonts

| Token | Loaded family | Actual source | Verified direct consumer(s) |
|---|---|---|---|
| **heading** | Switzer-Semibold | assets/fonts/Switzer-Semibold.otf | components/Button.tsx |
| **headingBold** | Switzer-Bold | assets/fonts/Switzer-Bold.otf | app/settings.tsx |
| **body** | Switzer-Regular | assets/fonts/Switzer-Regular.otf | app/settings.tsx; Input; MotivationQuote; SetInput; VolumeChart |
| **bodyMedium** | Switzer-Medium | assets/fonts/Switzer-Medium.otf | app/settings.tsx; Button; Input; SetInput; VolumeChart |
| **bodySemiBold** | Switzer-Semibold | assets/fonts/Switzer-Semibold.otf | app/settings.tsx; Button |
| **mono** | SpaceMono_400Regular | @expo-google-fonts/space-mono | Defined and loaded; no direct current consumer. |
| **monoBold** | SpaceMono_700Bold | @expo-google-fonts/space-mono | components/SetInput.tsx |

The specialized plain-system file set is exactly components/Button.tsx, components/Input.tsx, components/MotivationQuote.tsx, components/SetInput.tsx, components/VolumeChart.tsx, and app/settings.tsx. The unused **fonts.mono** token is still an intentionally available part of this live system; this inventory only records that no source currently references it directly.

### Redesign system: redesignFonts

| Token | Loaded family | Actual source | Verified direct consumer(s) |
|---|---|---|---|
| **display** | BricolageGrotesque_700Bold | @expo-google-fonts/bricolage-grotesque | app/index.tsx; app/workout.tsx; all four onboarding screens; tabs/index, profile, records; ActiveSetCard; BonusSet; RestTimer; SwapExerciseSheet; home/WorkoutHeroCard, WorkoutIntensityPicker, WorkoutPicker |
| **ui** | HankenGrotesk_400Regular | @expo-google-fonts/hanken-grotesk | onboarding/experience and welcome; tabs/records; app/workout.tsx; BonusSet; ExerciseFinisher; SwapExerciseSheet |
| **uiMedium** | HankenGrotesk_500Medium | @expo-google-fonts/hanken-grotesk | tabs/profile; home/ScheduleRow |
| **uiSemiBold** | HankenGrotesk_600SemiBold | @expo-google-fonts/hanken-grotesk | onboarding/current-week and whatsurname; tabs/index and profile; app/workout.tsx; ActiveSetCard; ExerciseFinisher; RestTimer; SwapExerciseSheet; home/ScheduleRow and WorkoutPicker |
| **uiBold** | HankenGrotesk_700Bold | @expo-google-fonts/hanken-grotesk | onboarding/current-week, experience, and welcome; tabs/profile and records; ActiveSetCard; ExerciseFinisher; SwapExerciseSheet |
| **uiItalic** | HankenGrotesk_400Regular_Italic | @expo-google-fonts/hanken-grotesk | tabs/index |
| **mono** | JetBrainsMono_400Regular | @expo-google-fonts/jetbrains-mono | tabs/profile; ExerciseFinisher; home/WeeklyProgressPill and WorkoutHeroCard |
| **monoBold** | JetBrainsMono_700Bold | @expo-google-fonts/jetbrains-mono | tabs/index, profile, and records; app/workout.tsx; ActiveSetCard; BonusSet; ExerciseFinisher; RestTimer; StatusPill; SwapExerciseSheet; WorkoutDayLabel; home/ScheduleRow, WorkoutHeroCard, WorkoutIntensityPicker, WorkoutPicker |

For compactness, “all four onboarding screens” means app/(onboarding)/welcome.tsx, current-week.tsx, whatsurname.tsx, and experience.tsx. “tabs/index, profile, records” means the matching files in app/(tabs)/. Every redesign-font token has at least one direct live reference.

## Spacing, layout, radius, and sizing

There is no formal spacing, radius, or sizing scale in constants/theme.ts or the other constants files. tailwind.config.js adds the plain colors and font families but no custom spacing, radius, or sizing extension.

Spacing and layout are therefore currently component-local, expressed through inline style objects and StyleSheet declarations. The live code uses varied literal values, including fractional radii such as 3.5 and 6.5 as well as pill radii of 999; it does not implement the former document’s claimed 4 px scale. Do not infer a global spacing or corner-radius token from recurring values such as 16, 20, or 24. New layout values should be chosen in the context of the component being extended until a formal scale is introduced in code.

## Component inventory

| Component name | Purpose | System used | File path |
|---|---|---|---|
| **ActiveSetCard** | Editable active-set card for reps and weight, with log and skip actions. | Redesign | components/ActiveSetCard.tsx |
| **BonusSet** and **BonusSetAcknowledgement** | Reuses the active-set flow for extra, drop, and PR sets, then confirms completion. | Redesign | components/BonusSet.tsx |
| **Button** | Variant-aware, loading-capable pressable button. | Plain | components/Button.tsx |
| **ExerciseFinisher** | Shows a completed-set summary and options for extra, drop, PR, or advancing. | Redesign | components/ExerciseFinisher.tsx |
| **Input** | Labeled text or numeric input with a focus state. | Plain | components/Input.tsx |
| **MotivationQuote** | Displays one intentionally quiet, randomized motivational quote. | Plain | components/MotivationQuote.tsx |
| **OnboardingProgress**, **OnboardingBackButton**, and **OnboardingNextButton** | Shared four-step onboarding progress and navigation controls. | Redesign colors plus splitColors; no redesign-font token in this file | components/OnboardingControls.tsx |
| **RestTimer** | Ninety-second rest overlay with adjustment, skip, and completion controls. | Redesign | components/RestTimer.tsx |
| **SetInput** | Compact reps/weight row with completed and skipped set states. | Plain | components/SetInput.tsx |
| **StatusPill** | Uppercase status badge with an optional semantic color prop. | Redesign | components/StatusPill.tsx |
| **SwapExerciseSheet** | Bottom sheet for navigating and replacing an exercise with confirmation. | Redesign | components/SwapExerciseSheet.tsx |
| **VolumeChart** | SVG weekly-volume bar chart with an empty state. | Plain | components/VolumeChart.tsx |
| **WorkoutDayLabel** | Colored dot plus uppercase workout-day label. | Redesign | components/WorkoutDayLabel.tsx |
| **ScheduleRow** | Row for a scheduled, rest, or completed day in the home schedule. | Redesign | components/home/ScheduleRow.tsx |
| **WeeklyProgressPill** | Compact completed-versus-goal count with progress bars. | Redesign | components/home/WeeklyProgressPill.tsx |
| **WorkoutHeroCard** | Animated “today’s workout” launch card. | Redesign | components/home/WorkoutHeroCard.tsx |
| **WorkoutIntensityPicker** | Modal slider and discrete choice control for workout intensity. | Redesign | components/home/WorkoutIntensityPicker.tsx |
| **WorkoutPicker** | Animated bottom sheet for choosing a workout split. | Redesign | components/home/WorkoutPicker.tsx |

## Icon system

At the application-source level, **lucide-react-native** is the only icon library in use. Source imports appear in app screens, onboarding, tabs, and the relevant components listed above. package.json also declares @expo/vector-icons, @lucide/lab, and expo-symbols, but a fresh search found no application-source imports or references to any of them. react-native-svg is used by VolumeChart to draw chart bars, not as an icon system.

There is no shared icon-size token. Literal Lucide sizes range from 13 to 31 px; the common action/navigation range is 14 to 23 px, and the floating tab bar explicitly supplies 23 px. Feature icons are commonly 25–28 px, while the BonusSet acknowledgement check is 31 px. Stroke widths are usually 2–2.6, with completion checks intentionally heavier at 3–3.5. Use the existing Lucide outline vocabulary and match the local icon’s size and stroke rather than adding another icon package.

## Motion

**Implementation correction:** react-native-reanimated is the primary and only third-party animation package directly used, but it is not literally the only animation system in the app.

- **Reanimated** is declared in package.json and configured in babel.config.js. It drives press feedback, selection states, progress, rolling values, bottom sheets, tab indication, and entering/exiting transitions across the workout, onboarding, tab/profile, and redesign component surfaces.
- **React Native Animated** is also live. app/index.tsx uses it for the splash-card stagger/sequence, wordmark reveal, and screen fade. components/SwapExerciseSheet.tsx uses it with PanResponder for drag position, Animated.timing for dismissal, and Animated.spring for snap-back. Both use the native driver where configured.
- **Native/framework transitions** are also present: WorkoutIntensityPicker uses Modal fade; SwapExerciseSheet uses Modal slide; the workout feedback modal uses fade; and app/_layout.tsx configures the workout route with slide_from_right and pop-on-replace. WorkoutPicker and profile detail sheets use Modal animationType none because Reanimated supplies their transitions.
- No source imports or declared dependencies were found for Moti, Lottie, React Native Animatable, Rive, Skia, or another animation library.

There is no shared motion hook, timing-token object, or central animation module. Motion configurations are local to each component or screen. Reusable patterns in practice are:

- Short press-scale feedback repeated locally in Button, OnboardingControls, ActiveSetCard, ExerciseFinisher, and WorkoutHeroCard.
- Selection/toggle interpolation in onboarding/current-week and onboarding/experience, implemented similarly but separately.
- app/workout.tsx’s file-local cluster of directional transitions, layout transition, check spring, and feedback-sheet entrance; it explicitly uses ReduceMotion.System where applicable.
- BonusSet’s local reduced-motion-aware acknowledgement-check spring and RestTimer’s reduced-motion-aware slide transitions.
- ActiveSetCard’s rolling numeric value transition and app/index.tsx’s local splash reveal helpers.

When changing motion, preserve reduced-motion handling where the local pattern already uses it and avoid implying that a central timing scale exists when it does not.

## Durable design rules for future work

1. **Keep Stack restrained and gym-functional.** Favor the calm, legible, decision-reducing experience already articulated in the original brief: one clear next action, useful prefills, compact feedback, and encouragement without hype.
2. **Do not fall into generic “AI-app” defaults.** Avoid the warm-cream-plus-terracotta-serif treatment, near-black-plus-acid-green treatment, and broadsheet-serif treatment. Dropset is a conceptual reference for Scandinavian restraint, never a template to clone.
3. **Use color by role, not decoration.** Keep the named cobalt accent, **#4C6FFF**, to its verified/designated plain-system state and focus roles. Keep split/workout-logging colors tied to workout identity or a contextual primary action; do not spread them across neutral surfaces or invent additional global semantic accents without adding verified tokens.
4. **Respect the two-system boundary.** Use the active system appropriate to the component or screen. Do not rename either as old, legacy, or a migration. If a new shared component must choose, make the choice explicit and document its token usage.
5. **Keep typography constrained within each system.** Use the established display/UI/mono families and vary their existing weights rather than introducing competing display faces. Plain-system text remains Switzer-led with Space Mono for numeric treatment; redesign text remains Bricolage/Hanken/JetBrains-led according to the tokens above.
6. **Do not invent global scales or promises.** Spacing, radius, accessibility, performance, and motion claims belong here only after a matching token, utility, or implementation exists in code.

## Maintenance source of truth

For visual token changes, update constants/theme.ts first and then this document. Keep tailwind.config.js synchronized with the plain colors/fonts it mirrors. Before documenting an implementation claim, verify the current source rather than inheriting it from an earlier specification.
