/**
 * Projects a saved `CustomSplit` (as read by `getCustomSplitDetailAsync`)
 * onto the portable sharing model. Pure: the caller supplies the bundled
 * built-in catalog names so this module never touches the database.
 *
 * Only structural fields are read. Local row ids (`id`, `exerciseId`,
 * `splitId`), timestamps and positions are dropped — order is carried by
 * array order instead.
 */
import type { CustomSplit, CustomSplitExercise } from '@/store/customSplits';
import {
  PORTABLE_EQUIPMENT,
  type PortableEquipment,
  type PortableExercise,
  type PortableSplit,
} from '@/features/sharing/splitProtocol';

const toPortableEquipment = (equipment: string | null): PortableEquipment | null =>
  (PORTABLE_EQUIPMENT as readonly string[]).includes(equipment ?? '')
    ? (equipment as PortableEquipment)
    : null;

/**
 * An exercise is shared as a built-in reference only when it is a catalog row
 * (`isCustom === false`) whose name is still a bundled seed name. Two real
 * cases fail that test and are shared with full custom metadata instead:
 *  - a built-in the user renamed (renameExercise does not check `is_custom`),
 *    whose new name means nothing on another device;
 *  - a custom exercise that predates a seed of the same name (seed
 *    reconciliation is INSERT OR IGNORE, so the custom row wins).
 */
const toPortableExercise = (
  exercise: CustomSplitExercise,
  builtInExerciseNames: ReadonlySet<string>
): PortableExercise =>
  !exercise.isCustom && builtInExerciseNames.has(exercise.name)
    ? { kind: 'builtin', name: exercise.name }
    : {
        kind: 'custom',
        name: exercise.name,
        workoutType: exercise.workoutType,
        primaryMuscle: exercise.primaryMuscle,
        equipment: toPortableEquipment(exercise.equipment),
        loadType: exercise.loadType,
        metric: exercise.metric ?? 'reps',
      };

/**
 * The result is unvalidated; pass it to `serializeSharedSplit` /
 * `encodeSharedSplit`, which enforce every protocol rule.
 */
export const portableSplitFromCustomSplit = (
  split: CustomSplit,
  builtInExerciseNames: ReadonlySet<string>
): PortableSplit => ({
  name: split.name,
  workouts: [...split.workouts]
    .sort((a, b) => a.position - b.position)
    .map((workout) => ({
      name: workout.name,
      ...(workout.color ? { color: workout.color } : {}),
      exercises: [...workout.exercises]
        .sort((a, b) => a.position - b.position)
        .map((exercise) => toPortableExercise(exercise, builtInExerciseNames)),
    })),
});
