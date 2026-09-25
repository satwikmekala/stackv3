const COMPACT_NAMES: Record<string, string> = {
  'barbell squat': 'Squat',
  'squat': 'Squat',
  'bench press': 'Bench',
  'barbell bench press': 'Bench',
  'barbell bicep curl': 'Curl',
  'barbell curl': 'Curl',
  'barbell hip thrust': 'Hip Thrust',
  'incline dumbbell press': 'Incline',
  'lat pulldown': 'Pulldown',
  'leg extension': 'Leg Ext.',
  'leg press': 'Leg Press',
  'lying leg curl': 'Leg Curl',
  'pull-ups': 'Pull-Ups',
  'seated dumbbell shoulder press': 'Shoulder Press',
  'cable chest fly': 'Chest Fly',
  'cable overhead triceps extension': 'Tri Ext.',
  'standing calf raise': 'Calf Raise',
  'chest dips': 'Dips',
  'deadlift': 'Deadlift',
  'dumbbell lateral raise': 'Lateral Raise',
  'single-arm dumbbell lateral raise': 'Lateral Raise',
};

export function compactExerciseName(name: string): string {
  const normalized = name.trim().replace(/\s+/g, ' ');
  const mapped = COMPACT_NAMES[normalized.toLowerCase()];
  if (mapped) return mapped;
  const fallback = normalized.replace(/^(?:(?:barbell|dumbbell|cable|machine)\s+)+/i, '') || 'Exercise';
  const characters = Array.from(fallback);
  return characters.length <= 14 ? fallback : `${characters.slice(0, 13).join('').trimEnd()}…`;
}
