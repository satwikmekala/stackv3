/**
 * Stack-owned shorthand for pasted routines. Keys are compared with
 * `looseExerciseKey`, so case, punctuation, plurals and the abbreviations it
 * expands (db, bb, incl, tri…) don't need their own rows: "Lat Raises",
 * "lat raise" and "LAT-RAISE" are one key.
 *
 * Only add an alias when the shorthand means exactly one Stack exercise to
 * nearly every lifter. Anything a reasonable lifter could read two ways
 * belongs in AMBIGUOUS_EXERCISE_NAMES, which never auto-matches. A wrong
 * match is worse than asking.
 *
 * tests/routineImport.test.cjs checks every target exists in the catalog and
 * that no key collides with a catalog name or another entry.
 */

/** [shorthand, Stack exercise name] */
export const ROUTINE_IMPORT_ALIASES: readonly (readonly [string, string])[] = [
  // Chest
  ['bench', 'Bench Press'],
  ['flat bench', 'Bench Press'],
  ['flat bench press', 'Bench Press'],
  ['barbell bench', 'Bench Press'],
  ['flat barbell bench press', 'Bench Press'],
  ['incline db', 'Incline Dumbbell Press'],
  ['db incline', 'Incline Dumbbell Press'],
  ['db incline press', 'Incline Dumbbell Press'],
  ['incline db bench', 'Incline Dumbbell Press'],
  ['incline db bench press', 'Incline Dumbbell Press'],
  ['incline bench', 'Incline Bench Press'],
  ['incline bb', 'Incline Bench Press'],
  ['incline bb bench', 'Incline Bench Press'],
  ['incline bb press', 'Incline Bench Press'],
  ['incline barbell bench press', 'Incline Bench Press'],
  ['db bench', 'Dumbbell Bench Press'],
  ['flat db press', 'Dumbbell Bench Press'],
  ['flat db bench', 'Dumbbell Bench Press'],
  ['decline bench', 'Decline Press'],
  ['decline bench press', 'Decline Press'],
  ['pec dec', 'Pec Deck'],
  ['pec deck fly', 'Pec Deck'],
  ['pec deck machine', 'Pec Deck'],
  ['machine fly', 'Pec Deck'],
  ['cable chest fly', 'Cable Fly'],
  ['press ups', 'Push-ups'],
  ['smith bench', 'Smith Machine Bench Press'],
  ['smith bench press', 'Smith Machine Bench Press'],
  ['smith incline', 'Smith Machine Incline Press'],
  ['smith incline press', 'Smith Machine Incline Press'],
  ['incline smith', 'Smith Machine Incline Press'],
  ['incline smith press', 'Smith Machine Incline Press'],

  // Back
  ['lat pull', 'Lat Pulldown'],
  ['lat pulldown machine', 'Lat Pulldown'],
  ['pulldown', 'Lat Pulldown'],
  ['seated row', 'Seated Cable Row'],
  ['cable row', 'Seated Cable Row'],
  ['bent over row', 'Barbell Rows'],
  ['bent over barbell row', 'Barbell Rows'],
  ['chins', 'Chin-ups'],
  ['conventional deadlift', 'Deadlift'],
  ['hyperextensions', 'Back Extensions'],
  ['hypers', 'Back Extensions'],
  ['straight arm pushdown', 'Straight-Arm Pulldown'],

  // Shoulders
  ['military press', 'Overhead Press'],
  ['standing overhead press', 'Overhead Press'],
  ['barbell overhead press', 'Overhead Press'],
  ['db shoulder press', 'Seated Dumbbell Shoulder Press'],
  ['seated db press', 'Seated Dumbbell Shoulder Press'],
  ['db ohp', 'Seated Dumbbell Shoulder Press'],
  ['lat raise', 'Lateral Raises'],
  ['side raise', 'Lateral Raises'],
  ['side lateral raise', 'Lateral Raises'],
  ['side laterals', 'Lateral Raises'],
  ['db lateral raise', 'Lateral Raises'],
  ['db lat raise', 'Lateral Raises'],
  ['cable lat raise', 'Cable Lateral Raise'],
  ['cable laterals', 'Cable Lateral Raise'],
  ['rope face pull', 'Face Pulls'],
  ['db front raise', 'Front Raises'],
  ['reverse pec dec', 'Reverse Pec Deck'],
  ['rear delt machine', 'Reverse Pec Deck'],

  // Arms
  ['hammers', 'Hammer Curls'],
  ['db hammer curl', 'Hammer Curls'],
  ['preacher', 'Preacher Curls'],
  ['ez curl', 'EZ-Bar Curl'],
  ['incline curl', 'Incline Dumbbell Curl'],
  ['tri push', 'Tricep Pushdown'],
  ['pushdown', 'Tricep Pushdown'],
  ['cable pushdown', 'Tricep Pushdown'],
  ['rope pushdown', 'Rope Triceps Pushdown'],
  ['lying tricep extension', 'Skull Crushers'],
  ['skulls', 'Skull Crushers'],
  ['close grip bench', 'Close-Grip Bench Press'],
  ['bench dips', 'Tricep Dips'],

  // Legs
  ['barbell back squat', 'Back Squat'],
  ['hamstring curl', 'Leg Curl'],
  ['ham curl', 'Leg Curl'],
  ['barbell hip thrust', 'Hip Thrusts'],
  ['bulgarian', 'Bulgarian Split Squat'],
  ['leg press machine', 'Leg Press'],
  ['hack squat machine', 'Hack Squat'],
  ['adductors', 'Adductor Machine'],
  ['hip adduction', 'Adductor Machine'],
  ['abductors', 'Abductor Machine'],
  ['hip abduction', 'Abductor Machine'],
  ['nordic curl', 'Nordic Hamstring Curl'],
  ['nordics', 'Nordic Hamstring Curl'],

  // Core
  ['ab wheel', 'Ab Wheel Rollout'],
  ['ab rollout', 'Ab Wheel Rollout'],
  ['ab roller', 'Ab Wheel Rollout'],
  ['woodchopper', 'Cable Woodchopper'],
  ['wood chops', 'Cable Woodchopper'],
  ['cable woodchop', 'Cable Woodchopper'],
  ['farmers walk', 'Farmer Carry'],
  ['suitcase walk', 'Suitcase Carry'],
];

export interface AmbiguousExerciseName {
  /** Shorthand compared with `looseExerciseKey`. */
  name: string;
  /** Shown as the suggestion only when one reading clearly dominates. */
  suggested: string | null;
  alternatives: readonly string[];
}

/**
 * Shorthand that names a movement family, not one Stack exercise. These are
 * always returned as `uncertain` for the user to confirm.
 */
export const AMBIGUOUS_EXERCISE_NAMES: readonly AmbiguousExerciseName[] = [
  { name: 'shoulder press', suggested: null, alternatives: ['Seated Dumbbell Shoulder Press', 'Overhead Press', 'Machine Shoulder Press'] },
  { name: 'press', suggested: null, alternatives: ['Overhead Press', 'Bench Press'] },
  { name: 'incline press', suggested: null, alternatives: ['Incline Dumbbell Press', 'Incline Bench Press', 'Incline Machine Chest Press'] },
  { name: 'incline', suggested: null, alternatives: ['Incline Dumbbell Press', 'Incline Bench Press'] },
  { name: 'db press', suggested: null, alternatives: ['Dumbbell Bench Press', 'Seated Dumbbell Shoulder Press'] },
  { name: 'chest press', suggested: 'Machine Chest Press', alternatives: ['Machine Chest Press', 'Dumbbell Bench Press', 'Bench Press'] },
  { name: 'fly', suggested: null, alternatives: ['Cable Fly', 'Dumbbell Fly', 'Pec Deck'] },
  { name: 'chest fly', suggested: null, alternatives: ['Cable Fly', 'Dumbbell Fly', 'Pec Deck'] },
  { name: 'dips', suggested: null, alternatives: ['Chest Dips', 'Tricep Dips'] },
  { name: 'row', suggested: null, alternatives: ['Barbell Rows', 'Seated Cable Row', 'Single-Arm Dumbbell Row'] },
  { name: 'db row', suggested: 'Single-Arm Dumbbell Row', alternatives: ['Single-Arm Dumbbell Row', 'Chest-Supported Row'] },
  { name: 'dumbbell row', suggested: 'Single-Arm Dumbbell Row', alternatives: ['Single-Arm Dumbbell Row', 'Chest-Supported Row'] },
  { name: 'curls', suggested: null, alternatives: ['Bicep Curls', 'Dumbbell Curl', 'Barbell Curl'] },
  { name: 'extensions', suggested: null, alternatives: ['Tricep Extensions', 'Leg Extension', 'Back Extensions'] },
  { name: 'kickbacks', suggested: null, alternatives: ['Triceps Kickback', 'Cable Triceps Kickback'] },
  { name: 'reverse fly', suggested: null, alternatives: ['Rear Delt Fly', 'Reverse Pec Deck', 'Cable Rear Delt Fly'] },
  { name: 'rear delts', suggested: null, alternatives: ['Rear Delt Fly', 'Reverse Pec Deck', 'Face Pulls'] },
  { name: 'calves', suggested: 'Calf Raises', alternatives: ['Calf Raises', 'Seated Calf Raise', 'Standing Calf Raise'] },
  { name: 'abs', suggested: null, alternatives: ['Crunches', 'Cable Crunch', 'Hanging Leg Raise'] },
  { name: 'split squat', suggested: null, alternatives: ['Bulgarian Split Squat', 'Lunges'] },
  { name: 'pullover', suggested: null, alternatives: ['Dumbbell Pullover', 'Cable Pullover'] },
  { name: 'carry', suggested: null, alternatives: ['Farmer Carry', 'Suitcase Carry'] },
];
