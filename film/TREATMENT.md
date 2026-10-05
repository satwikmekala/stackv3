# Stack — launch film treatment

**Master:** 1080 × 1920, 9:16, 33.0 s, 30 fps. Built in Remotion (`film/`; see README.md), and every value on screen traces back to the app.

## 1. Treatment

**Idea: every time you train, something gets added.**

The film uses a single motion rule: *complete → drop → land*. Stack's Build feature already has that physics. Slabs fall on a quadratic curve for 280–300 ms, bounce 0.045 units in 80 ms, and weeks press into one layer. The film applies that physics to the whole product, not only to the 3D scene.

The film opens on the workout screen alone, with no device bezel. It is the screen a Stack user sees between sets: Push day, Bench Press, `80 kg × 8` already prefilled. Tapping **Log it** does what it does in the app: the pip fills, the check pops, and the next set slides in from the right. On top of that, the finished set card squashes into a thin Build slab and drops onto a plinth beneath the UI. Every set adds a layer, and the pile under the phone grows as the workout goes on.

When the workout finishes (slide to finish, as in the app), the whole screen collapses into a bar and presses the pile into **one piece**: a single orange Push slab, thick because you progressed, with a gold seam because 82.5 × 8 is a new record. From there the film is inside Build itself. More pieces drop, a week presses into a layer, weeks rain down, and the camera pulls back until a monolith of real-looking training history stands in frame. The last week drops in on **"Just stack."**

The tone is calm and precise, and mostly quiet. There is one accent per moment, and color appears only where the app uses it: the workout accent, category strata and record gold. The copy sits in the gaps between actions and never over them.

**Copy (only these lines):**

| Line | Source |
|---|---|
| Lift. / Log it. | "Log it" is the real primary button label |
| Every set counts. | film |
| Less thinking. More lifting. | film (positioning: prefilled, progressive) |
| Every workout stacks up. | Build intro page 1 title, verbatim |
| See what showing up looks like. | film |
| Don't slack. / Just stack. | Build intro page 4 title, verbatim |
| stack — Progress, one workout at a time. | splash wordmark + film tagline |

Small real UI strings also appear: `PUSH`, `Set 2`, `+3%`, `UP NEXT`, `CHEST DAY`, `How did it feel?`, `SLIDE TO FINISH`, `NEW RECORD`, `PULL · DONE`, `YOUR STACK`, `N weeks built`, `N STACKS · X T MOVED · N PRs`.

## 2. Storyboard

Times are in seconds. Sound cues are generated from the same timeline (`src/sound/cues.ts` → `out/cues.json`, plus a synthesized temp mix), so they stay in sync.

| # | Time | Visual / UI state | Text | Transition & motion | Sound |
|---|---|---|---|---|---|
| 1 Hook | 0.0–2.2 | Ink `#13110E`. | **Lift.** drops in (0.15), then **Log it.** (0.75). | Build drop curve: 280 ms quadratic fall and an 80 ms bounce. At 1.45 "Lift." lifts away and "Log it." shrinks and travels into the real *Log it* button while the set card assembles around it. Header, title and pips reveal in `WorkoutLaunchSection` order. | two soft low taps on the landings; whoosh-in |
| 2 Log a set | 2.2–7.8 | Tight framing on Bench Press, Set 1, `80 kg / 8 reps`, pips, accent `#FF7A3D`. | **Every set counts.** (3.9–6.2) | Tap → press scale 0.98 → pip fills (240 ms) with check keyframe 0.8→1.04→1 → card squashes to a slab and falls under the UI → lands on the plinth. Camera eases out to reveal the plinth. Set 2 enters from the right (FadeInRight, 220 ms). Set 3: tap **+**, the weight rolls `80 → 82.5` (160 ms, 6 pt travel) and the delta pill reads **+3%**. Log → third layer. Title check pops. | tap · tick · snap · low land per set; number roll |
| 3 Momentum | 7.8–14.4 | Incline DB Press → Seated DB Shoulder Press → Cable Overhead Triceps Ext. Progress segments fill. Then the real finish sheet: `CHEST DAY`, "How did it feel?", slider at JUST RIGHT, `SLIDE TO FINISH`. | **Less thinking. More lifting.** (8.2–10.6) | Exercise swap uses FadeOutLeft 160 ms and FadeInRight 220 ms. Set cadence accelerates (0.6 s → 0.3 s). The pile climbs toward the UI. Finish sheet fades in; the thumb slides and releases. | rhythm of ticks, each landing a little higher in pitch; success chime |
| 4 Transformation | 14.4–19.0 | The whole screen compresses into a bar and falls onto the pile. The 12 set layers press into **one** Push piece (height 1.3×, progressed). The gold seam draws left to right. The camera settles into the Build stage with its warm gradient. Pull (blue), Legs (lime) and Push drop in. | **Every workout stacks up.** (16.0–18.6); kickers `NEW RECORD`, `PULL · DONE`, `LEGS · DONE` | Press → fuse, as in the Build fusion concept. Piece drops use the Build fall curve. | heavy press thud; fuse "clunk"; gold shimmer; three drops |
| 5 Time | 19.0–27.2 | The week lifts and presses into one layer (real `fusionFrame`, time-scaled). Then about 40 weeks drop in faster and faster while the camera pulls back geometrically, as in the Build overview pull-back. The `YOUR STACK` header counts `N weeks built`, then the metrics line. | `5–11 JAN · SEALED`; **See what showing up looks like.** (24.9–27.2) | Accelerating drops (240 → 55 ms stagger). The camera keeps the growing top in frame, then settles; a slow 1.5% drift on the hold. | rising tick per week (accumulating rhythm); swell into the hold |
| 6 Payoff | 27.2–30.2 | The full monolith. | **Don't slack.** (27.4), then **Just stack.** lands with the final week at 28.47 | Text and the final slab fall together (longer, heavier 420 ms fall). The tower squashes 1.5% and springs back, with a small camera kick. | silence beat, then the final low-end impact |
| End | 30.2–33.0 | The tower eases down and dims. The three logo cards stack in (splash choreography: 650 ms, bezier(.22,1,.36,1), 180 ms stagger), then the `stack` wordmark and tagline. | **stack** / Progress, one workout at a time. | Holds on the final frame. | three soft card taps, final tone |

## 3. What is reused from the app

| Film element | App source | How |
|---|---|---|
| All colors | `constants/theme.ts` (`redesignColors`, `splitColors`, `workoutLoggingColors`) | imported at build time |
| Slab geometry (chamfer, strata, face lighting, gold seams) | `features/build/geometry.ts`, `model.ts` | **imported directly** (`createSlabGeometry`, `createRecordSeamGeometry`, `weeklyHeight`, `layoutSlabs`, `HEIGHTS`, `BASE_HEIGHT`, `SLAB_GAP`, `GOLD`) |
| Week fusion motion | `features/build/fusion.ts` `fusionFrame` | **imported directly**, time-scaled |
| Drop / bounce physics, pull-back camera | `BuildScene.native.tsx`, `introOverview.ts` | same constants: 280/300 ms fall, 80 ms bounce, 0.045 bounce, geometric zoom |
| Camera direction, plinth | `BuildScene.native.tsx` | same orthographic (8, 6, 10) view, `#51483A` / `#29231B` plinth, `MeshBasicMaterial` vertex colors |
| Stage gradient | `CastingScreen.tsx` | `#13110E → #2C1D12 → #13110E` |
| Workout screen, ActiveSetCard, SetProgress pips, progress segments, Exercise Finisher, Up Next, finish sheet | `app/workout.tsx`, `components/ActiveSetCard.tsx`, `ExerciseFinisher.tsx`, `WorkoutDayLabel.tsx`, `WorkoutIntensityPicker.tsx` | Mirrored as React DOM (`src/ui/`) with identical pt metrics, radii, fonts and labels. The originals are React Native + Reanimated + store-driven and can't be set frame by frame in Remotion. |
| Motion timings | `constants/motion.ts`, `workoutMotion.ts`, `workoutLayoutTransitions.ts` | press 0.98, check keyframe, 160 ms roll with 6 pt travel, 220 ms FadeInRight, 160 ms FadeOutLeft |
| Fonts | Bricolage Grotesque 700, Hanken Grotesk 400–700, JetBrains Mono 400/700 | the app's own `@expo-google-fonts` files |
| Icons | lucide `Check, Minus, Plus, Info, Repeat2, ChevronDown, X, ChevronRight` | same path data |
| Logo | `assets/images/logo light/medium/hard.png`, splash choreography from `app/index.tsx` | direct |
| Build copy | `introCopy.ts`, `castingCopy.ts`, `fusionCopy.ts`, `homeModuleCopy.ts`, `Monolith.tsx` header metrics | verbatim strings |

**Simplified for film, with product behavior unchanged:** the set-to-slab lay-down and the screen press are film devices laid over the real interaction. They are not product features. The Exercise Finisher appears after each exercise and is tapped through ("Move on to …", "Finish workout"), as in the app. The Build casting and fusion text beats are condensed to their kickers. The time-lapse weeks appear just below the Your Stack header, as Build's intro drops appear mid-air.

## 4. Adapting to 16:9

All positions come from `src/formats.ts`. The timeline, UI and 3D code never use raw pixel numbers. Each format defines the stage size, safe insets, the UI anchor, the plinth anchor per shot and the copy slots. The `StackLaunchLandscape` composition already renders with the UI on the left and the stack on the right; tuning its framing only means editing that one table.
