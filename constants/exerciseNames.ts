/** Display aliases only. Exercise IDs, matching, records and historical names stay intact. */
const DISPLAY_NAMES: Record<string, string> = {
  'Bicep Curls': 'Barbell Curl', 'Biceps Curl': 'Barbell Curl', 'Barbell Bicep Curl': 'Barbell Curl',
  'Tricep Pushdown': 'Triceps Pushdown', 'Tricep Extensions': 'Overhead Triceps Extension',
  'Tricep Dips': 'Bench Dip', 'Bench-Supported Tricep Dip': 'Bench Dip',
  'Barbell Rows': 'Barbell Row', 'Back Extensions': 'Back Extension',
  'Lateral Raises': 'Lateral Raise', 'Front Raises': 'Front Raise', 'Face Pulls': 'Face Pull',
  'Upright Rows': 'Upright Row', 'Shrugs': 'Shrug', 'Hammer Curls': 'Hammer Curl',
  'Squats': 'Back Squat', 'Calf Raises': 'Standing Calf Raise', 'Calf Raise': 'Standing Calf Raise',
  'Chest Dips': 'Chest Dip', 'Dips': 'Chest Dip', 'Hip Thrusts': 'Hip Thrust',
  'Lunges': 'Walking Lunge', 'Leg Curl': 'Lying Leg Curl',
  'Push-ups': 'Push-Up', 'Pull-ups': 'Pull-Up', 'Chin-ups': 'Chin-Up',
  'Pec Deck': 'Pec Deck Fly', 'Cable Fly': 'Cable Chest Fly', 'Decline Press': 'Decline Bench Press',
};
export function displayExerciseName(name: string): string {
  return DISPLAY_NAMES[name] ?? name;
}
