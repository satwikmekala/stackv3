import { ARCHETYPE_COMPOSITIONS, getWeeklyArchetypeSequence, type Archetype } from '@/constants/archetypes';
import type { ExerciseCatalogItem } from '@/store/workoutStore';
import type { ThreeDayStructure } from '@/store/programPreferences';

export type ProgramWorkout = { key: string; archetype: Archetype; variant: string; name: string; color: string; exercises: ExerciseCatalogItem[] };
export function validateProgram(frequency: number, structure: ThreeDayStructure) {
  if (!Number.isInteger(frequency) || frequency < 1 || frequency > 6 ||
      !['full-body', 'push-pull-legs'].includes(structure)) throw Error('Choose between 1 and 6 workouts.');
}
export function programArrangement(frequency: number, structure: ThreeDayStructure) {
  validateProgram(frequency, structure);
  return getWeeklyArchetypeSequence(frequency, structure).map(archetype => ({ archetype, ...ARCHETYPE_COMPOSITIONS[archetype] }));
}
/** Read-only projection of existing templates; no rotation, template or workout writes. */
export function buildProgramLineup(frequency: number, structure: ThreeDayStructure, catalog: {
  variants: (archetype: Archetype) => string[];
  nextVariant: (archetype: Archetype) => string;
  exercises: (archetype: Archetype, variant: string) => ExerciseCatalogItem[];
}): ProgramWorkout[] {
  const used = new Map<Archetype, number>();
  return programArrangement(frequency, structure).map((day, index) => {
    const variants = catalog.variants(day.archetype);
    const first = variants.indexOf(catalog.nextVariant(day.archetype));
    if (!variants.length || first < 0) throw Error('Could not load these workouts. Try again.');
    const occurrence = used.get(day.archetype) ?? 0;
    used.set(day.archetype, occurrence + 1);
    const variant = variants[(first + occurrence) % variants.length];
    const exercises = catalog.exercises(day.archetype, variant);
    if (!exercises.length) throw Error('Could not load these exercises. Try again.');
    return { key: `${index}:${day.archetype}:${variant}`, archetype: day.archetype, variant,
      name: `${day.shortLabel} ${variant.toUpperCase()}`, color: day.color, exercises };
  });
}
