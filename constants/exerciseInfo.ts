import { splitColors } from '@/constants/theme';

export type ExerciseInfoCategory = 'Arms' | 'Legs' | 'Chest' | 'Back' | 'Shoulders';

export interface ExerciseInfoData {
  title: string;
  category: ExerciseInfoCategory;
  image: number;
  primaryMuscles: readonly string[];
  secondaryMuscles: readonly string[];
  description: string;
  /** Existing catalog names that describe the same movement. */
  aliases?: readonly string[];
}

export const exerciseInfoAccents: Record<ExerciseInfoCategory, string> = {
  Arms: splitColors.arms,
  Legs: splitColors.legs,
  Chest: splitColors.chest,
  Back: splitColors.back,
  Shoulders: splitColors.shoulders,
};

// Static requires allow Metro to bundle the original transparent PNGs directly.
export const exerciseInfo: readonly ExerciseInfoData[] = [
  {
    title: 'Barbell Bicep Curl', category: 'Arms', aliases: ['Bicep Curls'],
    image: require('@/assets/images/exercises/barbell-bicep-curl.png'),
    primaryMuscles: ['Biceps'], secondaryMuscles: ['Forearms'],
    description: 'Grip the bar shoulder-width with your elbows pinned to your sides. Curl to shoulder height and squeeze, then lower slowly without swinging.',
  },
  {
    title: 'Barbell Hip Thrust', category: 'Legs', aliases: ['Hip Thrusts'],
    image: require('@/assets/images/exercises/barbell-hip-thrust.png'),
    primaryMuscles: ['Glutes', 'Hamstrings'], secondaryMuscles: ['Core'],
    description: 'Rest your upper back on the bench with the bar over your hips. Drive through your heels until your hips are level with your knees, pause, then lower with control.',
  },
  {
    title: 'Barbell Squat', category: 'Legs', aliases: ['Squats'],
    image: require('@/assets/images/exercises/barbell-squat.png'),
    primaryMuscles: ['Quads', 'Glutes'], secondaryMuscles: ['Core', 'Lower back'],
    description: 'Set the bar across your upper back and keep your feet around shoulder-width. Sit your hips back and down, keep your chest tall, then drive up through your mid-foot.',
  },
  {
    title: 'Bench Press', category: 'Chest',
    image: require('@/assets/images/exercises/bench-press.png'),
    primaryMuscles: ['Chest', 'Triceps'], secondaryMuscles: ['Shoulders'],
    description: 'Lower the bar toward your mid-chest with your feet planted, then press it back up with control.',
  },
  {
    title: 'Bench-Supported Tricep Dip', category: 'Arms', aliases: ['Tricep Dips'],
    image: require('@/assets/images/exercises/bench-supported-triceps-kickback.png'),
    primaryMuscles: ['Triceps'], secondaryMuscles: ['Chest', 'Shoulders'],
    description: 'Support yourself on the bench and lower your body by bending your elbows. Press back up through your triceps while keeping your movement controlled.',
  },
  {
    title: 'Cable Chest Fly', category: 'Chest', aliases: ['Cable Fly'],
    image: require('@/assets/images/exercises/cable-chest-fly.png'),
    primaryMuscles: ['Chest'], secondaryMuscles: ['Shoulders'],
    description: 'Keep a slight bend in your elbows and bring the handles together in front of your chest. Squeeze, then return slowly under control.',
  },
  {
    title: 'Cable Crossover', category: 'Chest',
    image: require('@/assets/images/exercises/cable-crossover.png'),
    primaryMuscles: ['Chest'], secondaryMuscles: ['Front delts'],
    description: 'Stand between the cable stacks and pull the handles down and across your body. Squeeze your chest, then return with control.',
  },
  {
    title: 'Cable Overhead Triceps Extension', category: 'Arms', aliases: ['Overhead Cable Triceps Extension'],
    image: require('@/assets/images/exercises/cable-overhead-triceps-extension.png'),
    primaryMuscles: ['Triceps'], secondaryMuscles: ['Shoulders'],
    description: 'Keep your elbows pointed forward while extending your arms overhead. Squeeze your triceps at full extension, then return slowly.',
  },
  {
    title: 'Standing Calf Raise', category: 'Legs', aliases: ['Calf Raises'],
    image: require('@/assets/images/exercises/calf-raises.png'),
    primaryMuscles: ['Calves'], secondaryMuscles: ['Soleus'],
    description: 'Rise onto the balls of your feet as high as you can. Squeeze your calves at the top, then lower slowly through the full range.',
  },
  {
    title: 'Chest Dips', category: 'Chest',
    image: require('@/assets/images/exercises/chest-dips.png'),
    primaryMuscles: ['Chest', 'Triceps'], secondaryMuscles: ['Shoulders'],
    description: 'Lean slightly forward as you lower yourself between the bars, then press back up through your chest and triceps.',
  },
  {
    title: 'Deadlift', category: 'Back',
    image: require('@/assets/images/exercises/deadlift.png'),
    primaryMuscles: ['Hamstrings', 'Glutes', 'Back'], secondaryMuscles: ['Core', 'Forearms'],
    description: 'Brace your core and drive through the floor, extending your hips and knees until you are standing tall with the bar. Lower it with control.',
  },
  {
    title: 'Decline Bench Press', category: 'Chest', aliases: ['Decline Press'],
    image: require('@/assets/images/exercises/decline-bench-press.png'),
    primaryMuscles: ['Lower chest', 'Triceps'], secondaryMuscles: ['Front delts'],
    description: 'Secure your legs on the decline bench and lower the bar toward your lower chest. Press it back up with control.',
  },
  {
    title: 'Decline Dumbbell Fly', category: 'Chest',
    image: require('@/assets/images/exercises/decline-dumbbell-fly.png'),
    primaryMuscles: ['Lower chest'], secondaryMuscles: ['Front delts'],
    description: 'Secure your legs on the decline bench and open the dumbbells wide with a slight bend in your elbows. Bring them together above your chest, then lower slowly.',
  },
  {
    title: 'Decline Dumbbell Press', category: 'Chest',
    image: require('@/assets/images/exercises/decline-dumbbell-press.png'),
    primaryMuscles: ['Lower chest', 'Triceps'], secondaryMuscles: ['Front delts'],
    description: 'Secure your legs on the decline bench and press the dumbbells up from your lower chest. Lower them slowly with your elbows under control.',
  },
  {
    title: 'Dumbbell Lateral Raise', category: 'Shoulders', aliases: ['Lateral Raises'],
    image: require('@/assets/images/exercises/dumbbell-lateral-raise.png'),
    primaryMuscles: ['Side delts'], secondaryMuscles: ['Upper traps'],
    description: 'Raise the dumbbells out to your sides until around shoulder height, then lower them slowly while keeping your torso still.',
  },
  {
    title: 'Incline Bench Press', category: 'Chest',
    image: require('@/assets/images/exercises/incline-bench-press.png'),
    primaryMuscles: ['Upper chest', 'Triceps'], secondaryMuscles: ['Front delts'],
    description: 'Lower the bar toward your upper chest on an incline bench. Keep your feet planted and press the bar up with control.',
  },
  {
    title: 'Incline Dumbbell Press', category: 'Chest',
    image: require('@/assets/images/exercises/incline-dumbell-press.png'),
    primaryMuscles: ['Upper chest', 'Triceps'], secondaryMuscles: ['Shoulders'],
    description: 'Press the dumbbells upward from your upper chest until your arms are extended, then lower them under control.',
  },
  {
    title: 'Lat Pulldown', category: 'Back',
    image: require('@/assets/images/exercises/lat-pulldown.png'),
    primaryMuscles: ['Lats'], secondaryMuscles: ['Biceps', 'Upper back'],
    description: 'Pull the bar toward your upper chest while driving your elbows down. Control the weight as your arms extend overhead again.',
  },
  {
    title: 'Leg Extension', category: 'Legs',
    image: require('@/assets/images/exercises/leg-extension.png'),
    primaryMuscles: ['Quads'], secondaryMuscles: [],
    description: 'Extend your knees until your legs are nearly straight. Squeeze your quads at the top, then lower the weight slowly.',
  },
  {
    title: 'Leg Press', category: 'Legs',
    image: require('@/assets/images/exercises/leg-press.png'),
    primaryMuscles: ['Quads', 'Glutes'], secondaryMuscles: ['Hamstrings'],
    description: 'Lower the platform by bending your knees, then drive through your feet to press it away while keeping the movement controlled.',
  },
  {
    title: 'Lying Leg Curl', category: 'Legs', aliases: ['Leg Curl'],
    image: require('@/assets/images/exercises/lying-leg-curl.png'),
    primaryMuscles: ['Hamstrings'], secondaryMuscles: ['Calves'],
    description: 'Curl your heels toward your glutes by bending your knees. Squeeze your hamstrings, then lower the weight slowly.',
  },
  {
    title: 'Machine Chest Press', category: 'Chest', aliases: ['Flat Machine Chest Press'],
    image: require('@/assets/images/exercises/machine-chest-press.png'),
    primaryMuscles: ['Chest', 'Triceps'], secondaryMuscles: ['Front delts'],
    description: 'Set the handles around chest height and press them forward until your arms are nearly straight. Return slowly without letting the weight stack slam.',
  },
  {
    title: 'Pec Deck Fly', category: 'Chest', aliases: ['Pec Deck'],
    image: require('@/assets/images/exercises/pec-deck-fly.png'),
    primaryMuscles: ['Chest'], secondaryMuscles: ['Front delts'],
    description: 'Sit with your back against the pad and bring the handles together in front of your chest. Squeeze, then open your arms slowly.',
  },
  {
    title: 'Pull-ups', category: 'Back',
    image: require('@/assets/images/exercises/pull-ups.png'),
    primaryMuscles: ['Lats', 'Upper back'], secondaryMuscles: ['Biceps', 'Forearms'],
    description: 'Pull your body upward until your chin reaches the bar, then lower yourself under control into a full hang.',
  },
  {
    title: 'Push-ups', category: 'Chest',
    image: require('@/assets/images/exercises/push-ups.png'),
    primaryMuscles: ['Chest', 'Triceps'], secondaryMuscles: ['Front delts', 'Core'],
    description: 'Keep your body in a straight line as you lower your chest toward the floor. Press back up without letting your hips sag.',
  },
  {
    title: 'Seated Cable Row', category: 'Back',
    image: require('@/assets/images/exercises/seated-cable-row.png'),
    primaryMuscles: ['Mid-back', 'Lats'], secondaryMuscles: ['Biceps'],
    description: 'Sit tall and pull the handle toward your torso while driving your elbows back. Extend your arms slowly without rounding your back.',
  },
  {
    title: 'Seated Dumbbell Shoulder Press', category: 'Shoulders',
    image: require('@/assets/images/exercises/seated-dumbbell-shoulder-press.png'),
    primaryMuscles: ['Shoulders', 'Triceps'], secondaryMuscles: ['Upper chest'],
    description: 'Press the dumbbells overhead until your arms are extended, then lower them back to shoulder level with control.',
  },
  {
    title: 'Single-Arm Dumbbell Lateral Raise', category: 'Shoulders',
    image: require('@/assets/images/exercises/single-arm-dumbbell-lateral-raise.png'),
    primaryMuscles: ['Side delts'], secondaryMuscles: ['Upper traps'],
    description: 'Raise one dumbbell out to your side until around shoulder height while keeping your torso steady, then lower it slowly.',
  },
];

const normalizeExerciseName = (name: string) => name.trim().toLowerCase().replace(/[\s-]+/g, ' ');
const exerciseInfoByName = new Map<string, ExerciseInfoData>();
for (const info of exerciseInfo) {
  for (const name of [info.title, ...(info.aliases ?? [])]) {
    exerciseInfoByName.set(normalizeExerciseName(name), info);
  }
}

export function getExerciseInfo(name: string): ExerciseInfoData | undefined {
  return exerciseInfoByName.get(normalizeExerciseName(name));
}

export function hasExerciseInfo(name: string): boolean {
  return getExerciseInfo(name) !== undefined;
}
