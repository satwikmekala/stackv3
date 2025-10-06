# Stack Design System
## Ruthlessly minimal. Zero decisions. Just lift.

---

## Design Philosophy

**The Core Problem Stack Solves**
Decision fatigue kills consistency. Stack removes every choice between "open app" and "start lifting."

**Design Principles**
1. **One Clear Action** — Never present multiple equal-weight CTAs
2. **Prefill Everything** — Show what worked last time, nudge adjustments
3. **Celebrate Small Wins** — Immediate feedback on streaks and progress
4. **Large & Legible** — Sweaty hands, between-set glances, one-hand use
5. **Fast & Offline** — <2s cold start, 60fps interactions, works without network

**Personality**
Calm disciplined coach, not hype fitness influencer. Supportive without being pushy. Think: "Nice work — 2 of 4 done" not "CRUSH YOUR GOALS 💪🔥"

---

## Color System

### Core Palette

**Background (Dark Only for V1)**
- `oklch(0.1822 0 0)` — Deep graphite base
- Usage: App background, between content

**Surface**
- `oklch(0.2046 0 0)` — Elevated cards
- Usage: Workout cards, input containers, modals

**Neon Green (Success & Progress)**
- `oklch(0.8128 0.2495 145.6843)` — #00FF95 equivalent
- Usage: **STATE ONLY** — streak tiles, focus rings, active chips, PR badges, progress fills
- **Never for large surfaces** — keep it special for wins

**Primary CTA**
- Background: `oklch(0.9911 0 0)` — White
- Foreground: `oklch(0 0 0)` — Black text
- Usage: "Start Workout" button (calm, confident, not shouty green)

**Text Hierarchy**
- Primary: `oklch(1.0000 0 0)` — Pure white for titles, active text
- Secondary: `oklch(0.7122 0 0)` — Muted gray for labels, descriptions
- Tertiary: `oklch(0.5452 0 0)` — Very subtle for hints

**Borders & Dividers**
- `oklch(0.2809 0 0)` — Subtle separator
- Usage: Input borders, card outlines, dividers (use sparingly)

**Destructive/Warning**
- `oklch(0.3123 0.0852 29.7877)` — Dark red
- Usage: Delete actions, missed days (use rarely)

### Semantic Color Usage

**Session Difficulty Feedback** (after workout)
- Easy: `oklch(0.7845 0.1325 181.9120)` — Cyan
- Medium: `oklch(0.8369 0.1644 84.4286)` — Yellow  
- Hard: `oklch(0.7090 0.1592 293.5412)` — Magenta
- Usage: Small difficulty badges, next-workout adjustments

**Streak Grid**
- Empty day: `oklch(0.2393 0 0)` — Muted dark
- Completed: Neon green with subtle glow
- Today (pending): Border only, neon green ring

---

## Typography

### Font Stack
**Primary: Inter** (`-apple-system` fallback for native feel)
- Clean, readable, optimized for dark backgrounds
- Available weights: 400 (Regular), 600 (Semibold), 700 (Bold)

### Type Scale

**Display (Big Numbers)**
- Size: 48px / 3rem
- Weight: 700
- Tracking: -0.02em (tight)
- Usage: Week progress "2/4", workout weight displays

**H1 (Screen Titles)**
- Size: 28px / 1.75rem
- Weight: 700
- Tracking: -0.01em
- Usage: "Good morning, [Name]", "Upper Body A"

**H2 (Section Headers)**
- Size: 20px / 1.25rem
- Weight: 600
- Tracking: 0em
- Usage: Exercise names in workout view

**Body (Default Reading)**
- Size: 16px / 1rem
- Weight: 400
- Line height: 1.5
- Usage: Descriptions, secondary info, workout notes

**Label (Small Caps Headers)**
- Size: 12px / 0.75rem
- Weight: 600
- Tracking: 0.08em
- Transform: Uppercase
- Color: Secondary text
- Usage: "THIS WEEK", "LAST SESSION", "STREAK"

**Micro (Tiny Context)**
- Size: 13px / 0.8125rem
- Weight: 400
- Color: Tertiary text
- Usage: Timestamps, set counters, hints

### Typography Rules
- **Maximum line length**: 40 characters on mobile (everything is mobile-first)
- **Never center-align body text**: Left-align for scannability
- **Number formatting**: Use tabular figures for weights/reps to prevent jitter

---

## Spacing & Layout

### Base Unit
`4px` — All spacing is a multiple of 4

### Spacing Scale
- `xs`: 4px — Micro gaps (icon-to-label)
- `sm`: 8px — Tight spacing (chip padding, small gaps)
- `md`: 16px — Default element spacing
- `lg`: 24px — Card padding, section gaps
- `xl`: 32px — Screen margins, major sections
- `2xl`: 48px — Hero spacing (rare)

### Layout Grid
**Mobile-first (320px → 428px)**
- Side margins: `lg` (24px)
- Between sections: `xl` (32px)
- Card padding: `lg` (24px)
- List item padding: `md` vertical, `lg` horizontal

### Touch Targets
**Minimum 44pt × 44pt** (iOS standard, critical for gym use)
- Primary buttons: 56px height
- Steppers (±2.5kg): 48px × 48px minimum
- Chip toggles: 40px height
- Streak grid cells: 32px × 32px (tight grid, but tappable)

### Safe Areas
- iOS notch/home indicator: Use `SafeAreaView` everywhere
- Bottom padding: 16px + safe area inset (for gesture navigation)

---

## Components

### Primary CTA (Start Workout Button)

**Visual Specs**
- Background: White
- Text: Black, 17px, weight 600, tracking 0.02em
- Height: 56px
- Radius: 16px (xl)
- Shadow: Subtle (2px blur, 10% opacity)
- Icon: Optional 20px icon, 8px gap to text

**States**
- Default: White background
- Pressed: Scale 0.98, opacity 0.9
- Disabled: 40% opacity, no press effect

**Usage Rules**
- One per screen maximum
- Always full-width or prominent
- Reserved for "Start Workout", "Finish Workout", "Save"

### Secondary Button

**Visual Specs**
- Background: Surface color (elevated dark)
- Text: White, 16px, weight 600
- Height: 48px
- Radius: 12px (lg)
- Border: 1px solid border color

**States**
- Pressed: Slight scale down
- Active: Neon green text + border

**Usage**
- "Switch to Upper B", nav actions, less critical choices

### Chip Toggle (Workout Type Selector)

**Visual Specs**
- Height: 40px
- Padding: 12px horizontal
- Radius: 12px
- Background: Surface color
- Border: 1.5px solid border color
- Text: 15px, weight 600

**States**
- Inactive: Gray border, white text
- Active: Neon green border + ring (2px offset), neon green text
- Transition: 150ms ease

**Layout**
- Horizontal scroll group
- Gap: 8px between chips
- Never wrap to multiple lines

### Set Input Row (Critical Component)

**Layout**
- 3-column grid: Exercise name | Weight stepper | Reps stepper
- Height: 64px (generous tap area)
- Padding: 12px vertical

**Weight Stepper**
```
[−] [110 kg] [+]
```
- Buttons: 40px × 40px, subtle background
- Value display: 20px bold, tabular nums
- Step: ±2.5 kg (or lb)
- Haptic: Light tap on press

**Reps Stepper**
```
[−] [8] [+]
```
- Same sizing as weight
- Step: ±1 rep
- Visual hierarchy: Slightly smaller than weight

**States**
- Default: Prefilled from last session
- Modified: Subtle green glow on save
- Error (0 reps): Red border, disable save

### Streak Grid

**Visual Design**
- 7 columns (Mon-Sun) × 4-6 rows (weeks)
- Cell size: 32px × 32px
- Gap: 4px
- Radius: 6px per cell

**Cell States**
- Future: Invisible or very subtle outline
- Empty past: Muted dark background
- Completed: Neon green fill with subtle inner glow
- Today (pending): Neon green ring, empty inside
- Long-press: Show date tooltip

**Animation**
- On completion: Scale up 1.1 → 1.0, fade in glow (200ms)
- Haptic: Medium bump

### Progress Ring/Bar

**Week Goal Meter**
```
2 / 4 sessions
[████████░░░░░░░░]
```
- Bar height: 8px
- Radius: Full (pill)
- Fill: Neon green
- Background: Muted dark
- Label: Display number above (48px bold)

**Behavior**
- Smooth animation on increment (300ms ease-out)
- Celebration: Subtle glow pulse when goal hit

### Card Component

**Standard Card**
- Background: Surface color
- Radius: 16px
- Padding: 20px
- Border: None (elevation via subtle shadow)
- Shadow: 1px blur, 5% opacity

**Last Session Preview Card**
```
┌─────────────────────────┐
│ LAST SESSION            │
│ Upper Body A            │
│ 3 days ago • Medium     │
│ [Bench: 80kg × 8]       │
│ [Squat: 100kg × 6]      │
└─────────────────────────┘
```
- Compact: 2-3 exercise previews max
- Difficulty badge: Small colored chip
- Tap: Navigate to full history (later)

### Empty States

**No Workouts Yet**
- Centered content
- Icon: Simple outline dumbbell (48px)
- Title: "Ready to start?"
- Subtitle: "Your first workout is waiting"
- Action: Primary CTA button

**Design Rule**: Empty states should feel encouraging, not sad

### Success States

**Workout Complete**
- Full-screen moment
- Large checkmark or streak count
- Text: "Nice work — 2 of 4 done"
- Haptic: Strong bump
- Auto-dismiss: 2s → back to home

---

## Iconography

### Style
**Outline icons only** — 2px stroke, rounded caps
- Consistent weight across all icons
- 24px default size (scale to 20px or 32px as needed)

### Core Icon Set
- **Dumbbell**: App icon, workout start
- **Calendar with checkmarks**: Streak, weekly goal
- **Trending up**: Progress, PRs
- **Settings gear**: Settings (obvious)
- **Clock**: Rest timer (later feature)
- **Plus/Minus**: Steppers
- **Checkmark**: Completion, success
- **Arrow right**: Navigation, continue

**Design Rule**: Use icons sparingly — text is faster to read

---

## Interactions & Motion

### Animation Principles
- **Subtle, not showy**: No bounce or elastic easing
- **Fast**: 150-250ms for most transitions
- **GPU-accelerated**: Opacity and scale only (no width/height)
- **Purpose-driven**: Every animation communicates state change

### Key Animations

**Button Press**
```
Scale: 1.0 → 0.98 (100ms) → 1.0 (100ms)
Opacity: 1.0 → 0.9 → 1.0
```

**Streak Cell Complete**
```
Scale: 0 → 1.1 (150ms) → 1.0 (100ms)
Opacity: 0 → 1
Glow: Fade in (200ms)
```

**Sheet Modal (workout flow)**
```
Slide up from bottom: 300ms ease-out
Backdrop fade: 200ms
```

**Set Save Feedback**
```
Green flash on row: 200ms opacity pulse
Haptic: Light success tap
```

### Haptic Feedback

**Light Tap**
- Stepper press (+/−)
- Chip toggle
- Minor interactions

**Medium Bump**
- Set completed
- Streak cell filled

**Strong Bump**
- Workout finished
- Weekly goal reached

**Design Rule**: Haptics must feel responsive, not laggy (trigger before animation completes)

---

## Navigation & Information Architecture

### V1 Screen Flow

```
Onboarding (First Launch)
  ↓
Home (Primary Hub)
  ├→ Start Workout → Active Workout → Session Complete → Home
  └→ Settings (Later)
```

### Navigation Pattern
**Stack-based navigation** (no tabs in MVP)
- Home is always the root
- Workout is a modal sheet
- Back gestures work everywhere
- No hamburger menus

### Home Screen Layout Priority
1. **Greeting** (Top): "Good morning, Alex"
2. **Week Progress** (Hero): "2 / 4 sessions" + progress bar
3. **Primary CTA**: "Start Workout" (huge button)
4. **Workout Type Selector**: Chip group (Upper A, Upper B, Lower A, Lower B)
5. **Streak Grid**: Visual progress calendar
6. **Last Session**: Collapsible preview card

**Design Rule**: Everything above the fold on iPhone SE (smallest supported device)

---

## Workout Flow UX

### Pre-Workout
1. User taps "Start Workout"
2. Sheet slides up showing selected routine (Upper Body A)
3. All weights/reps **prefilled from last session**
4. Single primary action: "Begin"

### During Workout
1. Exercise list, one visible at a time (or compact list)
2. Set-by-set row with steppers
3. Tap checkmark to complete set → row locks, moves to next
4. "Finish Workout" button always visible at bottom

### Post-Workout
1. "How did that feel?" → Easy / Medium / Hard chips
2. Tap selection → auto-adjusts next session weights
3. Success screen → animate streak grid
4. Return to home

**Design Rule**: Zero text input during workout (only steppers)

---

## Content & Messaging

### Voice & Tone

**Greeting Messages** (Time-based)
- 5am-11am: "Good morning, [Name]"
- 11am-5pm: "Hey, [Name]"
- 5pm-12am: "Evening, [Name]"

**Progress Encouragement**
- After workout: "Nice work — X of Y done"
- Goal reached: "You hit your goal this week 💪"
- Streak milestone: "7 day streak — you're on a roll"

**Instructional Copy**
- Short, direct: "Set your weekly goal" not "How many times per week would you like to train?"
- Action-first: "Start Workout" not "Begin Your Training Session"

**Error States**
- Supportive: "Let's add at least 1 rep" not "Invalid input"
- Rare: Most errors are prevented by prefilling/constraints

### Microcopy Rules
- No exclamation marks (except goal celebrations)
- No fitness jargon ("hypertrophy", "periodization")
- Use "session" or "workout" not "training"
- Avoid negative framing ("Don't skip") → positive ("Keep the streak going")

---

## Responsive Behavior

### Device Support (iOS Primary)
- **iPhone SE (375×667)**: Minimum supported, test everything here first
- **iPhone 14/15 Pro (393×852)**: Primary design target
- **iPhone 14/15 Pro Max (430×932)**: Larger, but same layout

### Scaling Strategy
- Use relative spacing (%, safe area insets)
- Large devices: More breathing room, not more content
- Keep single-column layout (no tablet multi-column in V1)

### Landscape Mode
- Discouraged during workout (awkward in gym)
- If implemented: Same layout, just wider margins

---

## Accessibility

### Color Contrast
- White on deep graphite: 17:1 (exceeds WCAG AAA)
- Neon green on dark: 9.5:1 (safe for state indicators)
- Muted gray on dark: 4.8:1 (meets AA for large text)

### Touch Targets
- All interactive elements: ≥44pt (iOS guideline)
- Steppers in workout: 48pt (extra critical)

### Dynamic Type
- Support iOS Dynamic Type (accessibility text sizes)
- Test at largest size: ensure buttons don't clip
- Display numbers: Cap at 1.3× scale to prevent overflow

### VoiceOver
- All buttons: Clear labels ("Increase weight by 2.5 kilograms")
- Streak grid: Date + status ("Monday January 15, completed")
- Progress: "2 of 4 sessions completed this week"

### Reduced Motion
- Respect `prefers-reduced-motion`
- Replace animations with instant state changes
- Keep haptics (they're not motion)

---

## Technical Implementation

### Component Architecture

**Primitives** (Build these first)
- `<Button>` — Primary, Secondary, Ghost variants
- `<Card>` — Elevated surface container
- `<Chip>` — Toggle chips for workout types
- `<Stepper>` — +/- number input
- `<StreakGrid>` — Calendar visualization
- `<ProgressBar>` — Week goal meter

**Composite Components** (Built from primitives)
- `<SetInputRow>` — Exercise + weight/reps steppers
- `<SessionPreviewCard>` — Last workout summary
- `<WorkoutHeader>` — Routine name + session count

### State Management (Zustand)
```typescript
interface AppState {
  user: { name: string; weeklyGoal: number };
  workouts: Workout[];
  currentWeek: { completed: number; goal: number };
  streak: number;
}
```

### Persistence (AsyncStorage)
- Save after every workout
- Autosave user preferences
- No network calls in V1 (offline-first)

### Performance Targets
- **Cold start**: <2s to interactive home screen
- **Workout start**: <500ms from tap to sheet open
- **Save workout**: <200ms, feel instant
- **Animations**: 60fps minimum (use Reanimated)

---

## Future Considerations (Post-V1)

### Features Not in Design System Yet
- **History/Stats screen**: Needs chart specs, filter UI
- **HealthKit integration**: Permission flows, data sync
- **Cloud sync**: Login, conflict resolution UI
- **Rest timer**: Timer component, notifications
- **Custom exercises**: Form inputs, management UI
- **Apple Watch**: Minimal complication design

### Design Debt to Address
- Light mode (if user demand exists)
- Tablet layout (if making iPad version)
- Landscape workout mode
- Accessibility: More comprehensive VoiceOver labels
- Localization: Number formats, date formats

---

## Design System Governance

### When to Update
- New feature requires unsupported pattern → document it first
- User feedback reveals confusion → revise messaging/layout
- Performance issues → simplify animations

### What's Flexible
- Exact spacing values (adjust for rhythm)
- Microcopy (A/B test encouragement messages)
- Animation timing (tune for feel)

### What's Fixed
- Color palette (brand identity)
- Touch target minimums (accessibility)
- Neon green for success states only
- One primary CTA per screen
- Dark-only in V1

---

## Quick Reference

### Component Checklist
- [ ] 44pt minimum touch target?
- [ ] Works with sweaty hands (large, clear)?
- [ ] Prefills intelligent defaults?
- [ ] Haptic feedback on interaction?
- [ ] Animates at 60fps?
- [ ] Labels clear without context?
- [ ] One primary action obvious?

### Color Usage Checklist
- [ ] Green used for state, not decoration?
- [ ] Primary CTA is white, not green?
- [ ] Text contrast ≥4.5:1?
- [ ] Dark background consistent?

### Content Checklist
- [ ] Short, direct copy (no jargon)?
- [ ] Positive framing?
- [ ] Encouraging without hype?
- [ ] No unnecessary exclamation marks?

---

**This design system is a living document.** It will evolve as Stack grows, but the core philosophy stays: ruthlessly reduce decisions, celebrate small wins, just lift.
