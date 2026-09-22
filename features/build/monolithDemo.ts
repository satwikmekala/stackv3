import type { WorkoutSession } from '../../store/workoutStore';
import { getStartOfWeek, toLocalCalendarDate } from '../../store/workoutCalendar';

export const MONOLITH_DEMO_NOW = new Date(2026, 8, 23, 12);
/** Session-shaped examples pass through the real evidence engine. Never persisted. */
export function makeMonolithDemo(weeks: number): WorkoutSession[] {
  if (!Number.isInteger(weeks) || weeks < 0 || weeks > 260) throw new RangeError('Demo supports 0–260 weeks');
  if (!weeks) return [];
  const categories = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'] as const;
  const names = ['Bench Press', 'Barbell Row', 'Squat', 'Shoulder Press', 'Biceps Curl', 'Crunch'];
  const result: WorkoutSession[] = [];
  for (let week = 0; week <= weeks; week++) {
    // Include a quiet gap in longer histories; gaps never create tower geometry.
    if (week > 0 && week < weeks && week % 9 === 0) continue;
    const count = week === weeks ? 2 : 2 + week % 3;
    for (let session = 0; session < count; session++) {
      const category = (week + session) % categories.length;
      const date = getStartOfWeek(MONOLITH_DEMO_NOW);
      date.setDate(date.getDate() - (weeks - week) * 7 + session * 2);
      result.push({
        id: `monolith-demo-${week}-${session}`, date: toLocalCalendarDate(date), completed: true, retroactive: false,
        archetype: null, secondaryArchetype: null, archetypeVariant: null, secondaryArchetypeVariant: null,
        workoutTypes: [categories[category]],
        exercises: [{ name: names[category], loadType: category === 5 ? 'bodyweight' : 'external_weight',
          sets: Array.from({ length: 3 }, () => ({ completed: true, weight: category === 5 ? 0 : 20 + category * 5 + Math.floor(week / 3) * 2.5, reps: 8 + week % 3 })),
        }],
      });
    }
  }
  return result;
}
