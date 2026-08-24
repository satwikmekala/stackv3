import type { ExperienceLevel, WorkoutType } from '@/store/workoutStore';
import { workoutMeta } from '@/constants/workouts';
import { redesignColors } from '@/constants/theme';

/**
 * A higher-level training-day category used as groundwork for the future
 * weekly adherence and planning engine. Archetypes compose existing muscle
 * group workout types; they do not replace them.
 */
export type Archetype = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full_body';

/**
 * Describes the existing workout groups and optional arms specialization that
 * make up an archetype for the future weekly adherence and planning engine.
 */
export interface ArchetypeComposition {
  /** Existing workout groups from which this archetype pulls exercises. */
  workoutTypes: WorkoutType[];
  /** Restricts arms exercises by primary-muscle substring when applicable. */
  armsFilter?: 'Biceps' | 'Triceps';
  /** Honest, user-facing summary of the muscle groups trained. */
  label: string;
  /** Compact name used when two archetypes are merged into one session. */
  shortLabel: string;
  /** Existing split color belonging to this archetype's first workout type. */
  color: string;
}

/**
 * Composition rules for each archetype, kept self-contained as groundwork for
 * the not-yet-built weekly adherence and planning engine.
 */
export const ARCHETYPE_COMPOSITIONS: Record<Archetype, ArchetypeComposition> = {
  push: {
    workoutTypes: ['chest', 'shoulders', 'arms'],
    armsFilter: 'Triceps',
    label: 'Push (Chest, Shoulders, Triceps)',
    shortLabel: 'Push',
    color: workoutMeta.chest.color,
  },
  pull: {
    workoutTypes: ['back', 'arms'],
    armsFilter: 'Biceps',
    label: 'Pull (Back, Biceps)',
    shortLabel: 'Pull',
    color: workoutMeta.back.color,
  },
  legs: {
    workoutTypes: ['legs'],
    label: 'Legs',
    shortLabel: 'Legs',
    color: workoutMeta.legs.color,
  },
  upper: {
    workoutTypes: ['chest', 'back', 'shoulders', 'arms'],
    label: 'Upper Body',
    shortLabel: 'Upper',
    color: workoutMeta.chest.color,
  },
  lower: {
    workoutTypes: ['legs'],
    label: 'Lower Body',
    shortLabel: 'Lower',
    color: workoutMeta.legs.color,
  },
  full_body: {
    workoutTypes: ['chest', 'back', 'shoulders', 'arms', 'legs', 'core'],
    label: 'Full Body',
    shortLabel: 'Full Body',
    color: workoutMeta.chest.color,
  },
};

export type SessionWorkoutClassification = {
  archetype: Archetype | null;
  secondaryArchetype: Archetype | null;
  workoutTypes: readonly WorkoutType[];
};

/**
 * Resolves the user-facing identity of either an archetype-based session or a
 * legacy workout-type session. Keeping this fallback here ensures every
 * session surface presents old and new history consistently.
 */
export function getSessionWorkoutDisplay(
  session: SessionWorkoutClassification
): { label: string; color: string; isMerged: boolean } {
  if (session.archetype) {
    const primary = ARCHETYPE_COMPOSITIONS[session.archetype];
    const secondary = session.secondaryArchetype
      ? ARCHETYPE_COMPOSITIONS[session.secondaryArchetype]
      : null;

    return {
      label: secondary
        ? `${primary.shortLabel} + ${secondary.shortLabel}`
        : primary.label,
      color: primary.color,
      isMerged: Boolean(secondary),
    };
  }

  const legacyMeta = session.workoutTypes[0]
    ? workoutMeta[session.workoutTypes[0]]
    : null;
  return {
    label: legacyMeta?.label ?? 'Workout',
    color: legacyMeta?.color ?? redesignColors.ash,
    isMerged: false,
  };
}

/**
 * Re-exported experience level for consumers of this future weekly adherence
 * and planning groundwork, sourced from the existing workout-store model.
 */
export type { ExperienceLevel };

/**
 * Returns the ordered weekly archetype queue for a selected training frequency.
 * This is groundwork for the not-yet-built weekly adherence and planning engine.
 */
export function getWeeklyArchetypeSequence(
  weeklyGoal: number,
  experienceLevel: ExperienceLevel
): Archetype[] {
  switch (weeklyGoal) {
    case 1:
      return ['full_body'];
    case 2:
      return ['full_body', 'full_body'];
    case 3:
      return experienceLevel === 'beginner'
        ? ['full_body', 'full_body', 'full_body']
        : ['push', 'pull', 'legs'];
    case 4:
      return ['upper', 'lower', 'upper', 'lower'];
    case 5:
      return ['push', 'pull', 'legs', 'upper', 'lower'];
    case 6:
      return ['push', 'pull', 'legs', 'push', 'pull', 'legs'];
    default:
      // weeklyGoal should be constrained to 1-6 by onboarding and settings,
      // but fall back safely for unexpected values.
      return ['full_body'];
  }
}
