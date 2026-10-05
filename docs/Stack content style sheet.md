# Stack content style sheet

5 Oct 2026 · @satwik mekala

## Purpose

This sheet is the single source of truth for every word Stack shows: screens, alerts, accessibility labels, Live Activities, share cards and PDF exports. When a string disagrees with this sheet, the string changes.

- Check new copy against the glossary and banned words before it ships.
- Rewrites follow the rollout order at the end, one surface at a time.
- Changing a rule here means updating every string that uses it, not just the next one.

## Voice

Stack sounds like a training partner who respects the work: short, physical, confident, never preachy. It treats effort as something tangible, so it describes training with words that have weight.

| Principle | Do | Don't |
| --- | --- | --- |
| Short and physical | Every workout stacks up. | Track your progress and see your journey. |
| Earned, not hyped | Your best yet. | Amazing! You crushed it! 🔥 |
| Plain over clever in tools | Couldn’t save your note. Try again. | Oops! Something went wrong. |
| Stack speaks, not “we” | Stack’s plan sets the workout order. | This helps us adjust your next workout. |
| One idea per line | One workout. One block of Your Stack. | Log your sets, track your lifts, and watch your training build into your own Stack. |
| Honest about what it does | Rate it. Saved with this workout. | Claims the app adjusts load when it doesn't. |

**Where the voice is loudest:** welcome, casting (workout complete), fusion (week complete), empty states, share cards. Lines from the dev sandbox belong here: "You showed up. It has weight.", "A record, cast in gold.", "Progress has substance.", "Time, made tangible."

**Where the voice steps back:** the logger, settings, errors. Clear first, brand second. Settings footers stay under two sentences.

**Retire:** the MotivationQuote list ("Trust the process", "Every workout counts") and "Strength, stacked daily." (Stack builds weekly).

## Core glossary

The chain is fixed: **set → workout → block → layer → Your Stack**. Each word means one thing everywhere, including accessibility labels, PDFs and share cards.

| Term | Means | Use it like | Never |
| --- | --- | --- | --- |
| set | One performed set within an exercise | Set 1 · Add set | workout |
| workout | One training session or entry in a plan or routine | Workout A · Workout complete | day (as a routine entry) |
| training day | A calendar day with a completed workout; counts once toward the weekly goal | 2 of 4 training days | workout count |
| PR | An earned personal record against earlier completed training | 2 PRs this week | an unearned attempt |
| block | One completed workout represented in Your Stack | Your first block. · 3 blocks this week | piece, stack, slab, layer |
| layer | One completed week; its blocks press together | Last week became a layer. · 12 layers | block, slab, "sealed week" |
| Your Stack | Everything you've built, the 3D object | Your Stack is taking shape. | the Stack, your stack (lowercase), a count ("2 stacks") |
| Stack | The app and brand, when it speaks or acts | Stack’s plan · Shared from Stack | as the name of the object |
| thicker | A block with more exercises improved against prior comparable regular sets | What made it thicker | Claims that total weight moved determines thickness |
| gold seam | The PR mark on a block | Hit a PR and it lands with a line of gold. | gold treatment, gold record treatment |
| colors | Muscle groups trained in a block | Its colors show what you trained. | composition, archetype |
| moved | Total weight × reps | 4,280 kg moved | volume, total volume lifted |
| past weeks | The archive of finished layers | Open past weeks | Case, Your Case |

**Counts:** header metrics read BLOCKS · LAYERS · PRs. A week still in progress is "This week"; a finished one is "complete", never "sealed".

**Moments:** the completion animation and weekly merge have no user-facing names. Skip buttons say "Skip" with labels like "Skip to summary", never "Skip casting" or "Skip weekly fusion".

## Plans, routines and workouts

Three words cover everything a person trains from. Use routine, Stack’s plan and workout. Keep day for actual calendar or training days.

| Term | Means | Examples |
| --- | --- | --- |
| Stack’s plan | The weekly sequence Stack generates | Get Stack’s plan · Edit Stack’s plan · Stack’s plan is active. |
| routine | Any sequence the user builds, saves, imports or shares | Your routines · Save as routine · Share routine · Add to Your routines |
| workout | One entry inside a plan or routine, lettered | Workout A · Push A · Add workout · Delete workout |
| no plan | Training without either | Train without a plan |

**Replacements on current screens**

| Current | New |
| --- | --- |
| Your Splits / Your splits | Your routines |
| Stack's split · Stack’s plan · Automatic program · BY STACK | Stack’s plan |
| SHARED SPLIT · Share Split | SHARED ROUTINE · Share routine |
| Get workouts from Stack | Get Stack’s plan |
| Your starting lineup. | Your starting plan. |
| Decide later · Explore without a program | Skip for now |
| Day 1 · Add day · Delete day · Day name | Workout A · Add workout · Delete workout · Workout name |
| Train without a program | Train without a plan |
| Edit program · 3 workouts per week | Edit Stack’s plan · 3 workouts a week |

**Weekly goal vs plan size:** the goal counts **training days**; the plan counts **workouts**. Every goal string says days ("2 of 4 training days"); every plan string says workouts. Keep this distinction in progress and accessibility labels.

## Records and PRs

**PR** with the gold mark means a record was earned, and nothing else. An attempt says PR attempt and never receives earned-record gold.

| Situation | Copy | Never |
| --- | --- | --- |
| Earned record, badge or tag | PR (gold) | NEW BEST, NEW RECORD, ★ PR |
| Earned record, celebration moment | Your best yet. | New best, NEW RECORDS |
| Count | 2 PRs this week · 1 PR | 1 new best this session |
| Bonus set type | PR attempt | PR, PR ATTEMPT chip shortened to PR |
| Other bonus set types | Drop set · Extra set | DROP, EXTRA as standalone chips without "set" in reports |
| Records screen | Personal records · Best set | Personal Records, CURRENT BEST |
| Near miss hint | Best is 80 kg × 6. 7 reps beats it. | — |

Accessibility reads "personal record" in full; visible text uses PR.

Keep attempt labels explicit in the logger, summary, weekly report and completion moment.

## Units, numbers and dates

One format per value type, in every surface including PDFs and Live Activities.

| Value | Format | Examples | Never |
| --- | --- | --- | --- |
| Kilograms | kg, lowercase, space before | 80 kg · 2.5 kg step | KG, kgs |
| Pounds | lb, lowercase, no plural | 180 lb · 2.5 lb step | lbs, LB, 1 lbs |
| Unit picker | Kilograms (kg) · Pounds (lb) | — | Pounds · lbs |
| Weighted set | weight × reps | 80 kg × 8 | 80kg x 8 |
| Bodyweight set | Bodyweight × reps; BW only where space is tight (Live Activity, poster) | Bodyweight × 12 | BW kg × 12, "12 reps" alone |
| Timed set | m:ss | 1:30 | 90s |
| Set scheme | sets × reps | 3 × 8 | 3x8 |
| Moved | grouped thousands, unit | 4,280 kg moved · 4.3 t moved (week totals) | 4280 KG MOVED in sentence case surfaces |
| Short date | day month | 5 Oct | Oct 5, 4 OCT |
| Long date | weekday, day month | Monday, 5 Oct | MONDAY · OCT 5 |
| Range | 5–11 Oct | — | 5 Oct – 11 Oct |
| Duration | 52 min · 1h 05m | — | — |

**Plurals:** every count uses the plural helper, including "1 exercise", "1 day", "1 workout", "1 set". Counts describe the actual saved data; do not hardcode a plan size.

**Numbers in prose:** numerals, except "One workout. One block." style brand lines where a word reads better.

## Casing and punctuation

- **Sentence case everywhere:** titles, buttons, alerts, tabs. "Personal records", "Workout history", "Add exercise", "Delete exercise?", "Up next".
- **Proper nouns:** Stack, Your Stack (always capital Y when it names the object), Stack’s plan. "Your routines" is a screen title in sentence case.
- **ALL CAPS** only for small eyebrows and labels rendered in the mono style (EXAMPLE · PUSH DAY, UP NEXT, THIS WEEK). Never in sentences, alerts or accessibility labels.
- **Exercise names** are title case in every surface: Bench Press, not "Bench press" (finalized onboarding is preserved).
- **Apostrophes and quotes:** use curly forms (’ “ ”) in authored display copy. Source syntax, identifiers and user-entered text are exempt.
- **Dashes:** en dash for ranges (5–11 Oct), em dash only in long-form help, middle dot · as the separator in metadata.
- **Ellipsis:** the single character … for progress states (Saving…, Loading…).
- **Full stops:** headlines and brand lines end with one ("Your best yet."); buttons, labels and chips never do.
- **Exclamation marks:** none.

## Errors and system messages

An error says what happened, what's safe, and what to do, in that order and in under 20 words. Developer strings never reach the screen.

**Pattern:** Couldn’t \[action\]. \[What's safe, if relevant.\] Try again.

- Contractions: Couldn’t, not Could not.
- No "Please", no "Oops", no "Something went wrong" unless nothing more specific is known.
- Reassure only when true: "Your sets are saved." "Your draft is still here."
- Destructive confirms name the thing and the consequence: "Delete Push A? Your workout history stays."

**Shared routine import:** map every protocol error to one of four messages. Never render `parsed.error.message`.

| Cause | Message |
| --- | --- |
| Malformed, corrupted, invalid JSON, field errors | This link is broken. Ask for a new one. |
| Newer version, unknown built-in exercise | This routine needs a newer Stack. Update to open it. |
| Too large (bytes, workouts, exercises) | This routine is too big to share as a link. |
| Anything else | Couldn’t open this routine. Try again. |

**Examples of internal errors that must be mapped before display:** "Workout creation failed.", "A profile is required to start a workout", "Unknown exercise: {name}", "Custom split workout {id} has no exercises", "Exercise {id} no longer exists.", "A workout session must have one or two workout types", "Invalid exercise entry unit".

**Not-found screen:** “Nothing here.” with a “Back to Train” action.

## Accessibility copy

Spoken labels follow the same glossary and describe meaning, never rendering.

| Rule | Instead of | Say |
| --- | --- | --- |
| No geometry or render terms | Push block, 1.42 times baseline thickness. 0 records. | Push block, thicker than last time. |
| Say what it is, then its state | Static preview of recent layers. | Your Stack, 12 layers. |
| Expand abbreviations | BW × 12 · PR | Bodyweight, 12 reps · personal record |
| Match the visible counts' meaning | 2 of 4 workouts completed this week | 2 of 4 training days this week |
| One period, no stacked fragments | since 3 March.. | since 3 March. |
| Hints describe the result | Opens exercise illustration, muscles, and description | Shows how to do this exercise. |

Every new component's labels get checked against this table and the glossary before review.

## Exercise catalog

One exercise, one name, the same in the logger, info sheet, records, reports and Live Activity (where the compact name may shorten it).

- **Singular, title case:** Lateral Raise, Hammer Curl, Barbell Row, Back Squat. Not Lateral Raises, Hammer Curls, Squats.
- **Equipment first when it distinguishes:** Barbell Curl, Dumbbell Curl, Cable Curl.
- **Biceps and Triceps** always with the s: Biceps Curl, Triceps Pushdown.
- **Info sheet title = displayed exercise name.** Apply the same display alias across every surface.
- Muscle descriptions should be accurate; correcting stored muscle classification is a separate data task.
- **Descriptions:** two sentences, setup then movement, second person, no cues longer than the movement. Target coverage is every built-in exercise; today it is about 28 of roughly 160.

**Display aliases** (presentation only; preserve identity and history)

| Display | Historical alias |
| --- | --- |
| Back Squat | Squats |
| Barbell Row | Barbell Rows |
| Barbell Curl | Bicep Curls, Biceps Curl |
| Standing Calf Raise | Calf Raises, Calf Raise |
| Triceps Pushdown | Tricep Pushdown |
| Overhead Triceps Extension | Tricep Extensions |
| Chest Dip | Chest Dips, Dips |
| Hip Thrust | Hip Thrusts |
| Walking Lunge | Lunges, Walking Dumbbell Lunge (if same movement) |
| Lying Leg Curl | Leg Curl |

## Banned words

Search the codebase for these before every release. Internal names can stay in code identifiers; they never reach a string.

| Banned in UI | Use |
| --- | --- |
| split, program, lineup | Stack’s plan · routine |
| day (as a plan entry) | workout |
| stack / stacks (as a count) | block / blocks |
| piece, pieces, slab | block or layer |
| sealed | complete |
| Case, Your Case, Open the Case | Past weeks |
| unpack | open |
| casting, fusion | (no name; describe the moment) |
| volume, total volume lifted | moved |
| NEW BEST, NEW RECORD | PR · Your best yet. |
| lbs | lb |
| BW (outside tight layouts) | Bodyweight |
| archetype, composition | workout type |
| baseline thickness | thicker / same as last time |
| us, we | Stack |
| Oops, Please, Something went wrong | specific error pattern |
| session (visible) | workout |

## Copy hierarchy

| Role | Job | Length and format |
| --- | --- | --- |
| Headline | One idea | Usually 3–7 words; do not explain a feature |
| Body | Explain meaning or consequence | One short sentence, at most two |
| Button | Clear action | Usually 1–3 words: Continue, Save routine, Add exercise |
| Card title | Short noun or action | No punctuation; established onboarding choices are exceptions to length |
| Eyebrow | Context | Small mono labels may use capitals; essential information belongs elsewhere too |
| Help/footer | Behavior, consequence or safety | Under two sentences; no marketing |

## Loading, success and empty states

Loading describes the action: Saving…, Loading your workouts…, Starting workout…, Opening Your Stack…. Use one ellipsis character.

Success is short and factual: Routine saved, Workout saved, Note saved, Added to Your routines.

Empty states say what is empty and what makes it useful: “No workouts yet.” / “Your first completed workout will show here.” Or “Nothing built yet.” / “Your first workout adds the first block.” Delete generic encouragement.

## Explicit exceptions

- **Onboarding is already finalized.** Preserve its screens and copy. The training choice remains “How do you want to train?”, “I have my own workouts” / “Track what you already do.”, “Give me workouts” / “Start with workouts from Stack.”, and “Explore first”. Introduce Stack’s plan only after that choice.
- Preserve the finalized onboarding question “What should we call you?” as an explicit exception to the no-we rule.
- **Stack as a verb is allowed:** stack, stacked, stacks up. “Every workout stacks up.” and “Stacked.” are valid. Noun counts such as “3 stacks” are not.
- **First-use education:** PR · Personal record is allowed. Later badges use PR. Accessibility always expands it to personal record.
- **BW** is allowed only where space requires it, such as Live Activity, Dynamic Island and compact posters. Other surfaces use Bodyweight.
- **Bulgarian Split Squat**, cable stacks and weight stack are ordinary exercise terminology, not routine or object naming violations.
- User-entered workout names and notes, protocol values, storage units (`lbs`) and internal identifiers keep their original meaning. Display pounds as lb.

## Verified product language

Honesty beats metaphor. Verify every claim about adjusting, recommending, learning or personalizing against the implementation.

Block thickness uses the number of distinct exercises improved against their last usable regular-set workout, for the same exercise name and load type. A comparable performed set improves with more weight at no fewer reps, or the same weight at more reps. Bodyweight comparisons use reps. Zero, one, two, or three-or-more improved exercises select heights 1, 1.15, 1.3, or 1.45. Bonus and timed sets do not increase this count. Weight moved does not determine block thickness. A block with improvements need not be thicker than the preceding block.

Weekly layer thickness is the sum of block heights times the compression factor, clamped to weekly bounds. Explain that blocks combine into a layer without exposing geometry.

“How did it feel?” records the workout rating. It does not adapt the next workout. Say “Saved with this workout.”

Gold represents a record earned against an earlier completed workout. A first performance establishes a baseline. A PR attempt is a set type, not proof of a record.

## Rollout and preservation

1. Finalize this source of truth.
2. Leave finalized onboarding unchanged; audit it without rewriting it.
3. Train and logger.
4. Workout completion, summary and reports.
5. Your Stack, Past weeks, discovery and help.
6. Progress, records and history.
7. Your routines, builder, import and sharing.
8. Settings and errors.
9. Live Activities, cards and exports.

Keep workout data, evidence logic, routine schema, progression, sharing protocol and persistence intact. Do not merge exercise identities or rewrite historical names in a content refactor. Match info-sheet titles to the displayed exercise name; catalog identity migrations require a separate scoped task.

After each surface, run the existing tests and inspect the UI where available. Report any unverified native surfaces honestly. Final QA distinguishes internal identifiers, test fixtures, development-only text, user-authored text and release-visible content.
