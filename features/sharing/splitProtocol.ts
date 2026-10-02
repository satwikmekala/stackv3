/**
 * Portable, versioned representation of a Stack custom split.
 *
 * Pipeline:
 *
 *   PortableSplit (domain)  ⇄  SharedSplitWireV1 (JSON object)  ⇄  canonical JSON text
 *
 * Transport (base64url tokens, links, QR, clipboard…) lives in
 * `splitTransport.ts` and only ever wraps the canonical JSON text produced here.
 *
 * This module is pure: no database, store, router or platform imports. Every
 * payload handed to the parser is treated as untrusted input — decoding
 * successfully never implies validity.
 *
 * What is shared is routine *structure* only. Custom splits in Stack store
 * split name → ordered workouts → ordered exercises; they hold no set/rep/
 * weight targets, so the protocol carries none. Personal history (sessions,
 * sets, PRs, working weights, units, intensity, Build data) is never part of
 * the model, and the normaliser copies only the known fields below so extra
 * properties on the input cannot leak into a payload.
 *
 * See docs/split-sharing-protocol.md for the full design.
 */
import type { ExerciseLoadType, ExerciseMetric, WorkoutType } from '@/store/workoutStore';

export const SHARED_SPLIT_TYPE = 'stack.split';
export const SHARED_SPLIT_VERSION = 1;
export const SUPPORTED_SHARED_SPLIT_VERSIONS: readonly number[] = [1];

export const PORTABLE_WORKOUT_TYPES = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'core',
] as const satisfies readonly WorkoutType[];

export const PORTABLE_LOAD_TYPES = [
  'external_weight',
  'bodyweight',
] as const satisfies readonly ExerciseLoadType[];

export const PORTABLE_METRICS = ['reps', 'duration'] as const satisfies readonly ExerciseMetric[];

/** The equipment choices offered by the custom exercise sheet. Built-in
 * seeds carry no equipment, so `null` is also valid. */
export const PORTABLE_EQUIPMENT = ['Barbell', 'Dumbbell', 'Cable', 'Machine'] as const;

export type PortableWorkoutType = typeof PORTABLE_WORKOUT_TYPES[number];
export type PortableLoadType = typeof PORTABLE_LOAD_TYPES[number];
export type PortableMetric = typeof PORTABLE_METRICS[number];
export type PortableEquipment = typeof PORTABLE_EQUIPMENT[number];

// Compile-time guard: the protocol enums must stay in lockstep with the app.
type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const workoutTypesMatch: AssertEqual<PortableWorkoutType, WorkoutType> = true;
const loadTypesMatch: AssertEqual<PortableLoadType, ExerciseLoadType> = true;
const metricsMatch: AssertEqual<PortableMetric, ExerciseMetric> = true;
void workoutTypesMatch;
void loadTypesMatch;
void metricsMatch;

/**
 * Explicit robustness limits. Lengths are UTF-16 code units, the same unit
 * React Native's TextInput `maxLength` counts. Each sits above the matching
 * in-app input limit so no split a user can build today is rejected.
 */
export const SHARED_SPLIT_LIMITS = Object.freeze({
  /** Split name input is maxLength 48. */
  splitNameMaxLength: 64,
  /** Workout name input is maxLength 48. Empty is allowed (derived name). */
  workoutNameMaxLength: 64,
  /** Custom exercise and rename inputs are maxLength 80. */
  exerciseNameMaxLength: 80,
  /** Custom exercises use muscle-group labels; seeds use e.g. "Quads, Glutes". */
  primaryMuscleMaxLength: 48,
  /** The builder has no cap; two full weeks of distinct days is generous. */
  maxWorkouts: 14,
  /** A workout cannot repeat an exercise; 30 is far above any real session. */
  maxExercisesPerWorkout: 30,
  maxTotalExercises: 200,
  maxCustomExercises: 100,
  /**
   * Canonical JSON bytes (UTF-8). Realistic splits are ~1–3 KB; a 7×12 split
   * of all-custom exercises with 80-character names is ~21 KB.
   */
  maxPayloadBytes: 32 * 1024,
});

export interface PortableBuiltinExercise {
  kind: 'builtin';
  /** Display name exactly as in the bundled Stack catalog. */
  name: string;
}

export interface PortableCustomExercise {
  kind: 'custom';
  /** The sender's display name, preserved verbatim (trimmed). */
  name: string;
  workoutType: PortableWorkoutType;
  primaryMuscle: string;
  equipment: PortableEquipment | null;
  loadType: PortableLoadType;
  /** What a set measures. Definition only — never any logged values. */
  metric: PortableMetric;
}

export type PortableExercise = PortableBuiltinExercise | PortableCustomExercise;

export interface PortableWorkout {
  /** May be empty: Stack then derives the label from the exercises. */
  name: string;
  exercises: PortableExercise[];
}

export interface PortableSplit {
  name: string;
  workouts: PortableWorkout[];
}

export interface SharedSplitWireCustomExercise {
  name: string;
  workoutType: PortableWorkoutType;
  primaryMuscle: string;
  equipment: PortableEquipment | null;
  loadType: PortableLoadType;
  /**
   * Written only for timed exercises; absent means "reps". Rep-based payloads
   * therefore encode byte-for-byte as before this field existed.
   */
  metric?: 'duration';
}

/**
 * V1 wire object. Workouts reference exercises by display name; a reference
 * whose match key equals a `custom` definition is that custom exercise,
 * otherwise it names a built-in. `custom` is omitted when empty.
 */
export interface SharedSplitWireV1 {
  type: typeof SHARED_SPLIT_TYPE;
  v: 1;
  name: string;
  workouts: { name: string; exercises: string[] }[];
  custom?: SharedSplitWireCustomExercise[];
}

export type SharedSplitErrorCode =
  | 'payload_too_large'
  | 'invalid_encoding'
  | 'invalid_json'
  | 'duplicate_key'
  | 'invalid_structure'
  | 'unsupported_type'
  | 'missing_version'
  | 'invalid_version'
  | 'unsupported_version'
  | 'invalid_string'
  | 'string_too_long'
  | 'empty_name'
  | 'unknown_enum_value'
  | 'no_workouts'
  | 'too_many_workouts'
  | 'too_many_exercises'
  | 'empty_split'
  | 'empty_workout'
  | 'duplicate_exercise'
  | 'ambiguous_exercise_name'
  | 'conflicting_custom_exercise'
  | 'exercise_name_mismatch'
  | 'unreferenced_custom_exercise';

export interface SharedSplitError {
  code: SharedSplitErrorCode;
  message: string;
  /** JSON-path-like location, e.g. `workouts[2].exercises[0]`. */
  path?: string;
}

export type SharedSplitResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: SharedSplitError };

class ProtocolError extends Error {
  constructor(readonly detail: SharedSplitError) {
    super(detail.message);
  }
}

const fail = (code: SharedSplitErrorCode, message: string, path?: string): never => {
  throw new ProtocolError({ code, message, path });
};

const capture = <T>(run: () => T): SharedSplitResult<T> => {
  try {
    return { ok: true, value: run() };
  } catch (error) {
    if (error instanceof ProtocolError) return { ok: false, error: error.detail };
    // Anything unexpected (e.g. a hostile getter) still fails closed.
    return {
      ok: false,
      error: { code: 'invalid_structure', message: 'The shared split could not be read.' },
    };
  }
};

// ---------------------------------------------------------------------------
// Strings & identity
// ---------------------------------------------------------------------------

/** C0/C1 controls, bidi overrides/isolates, zero-width space, BOM. */
const FORBIDDEN_CHARACTERS = /[\u0000-\u001F\u007F-\u009F​‪-‮⁦-⁩﻿]/;

const hasLoneSurrogate = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
};

const readName = (
  value: unknown,
  path: string,
  maxLength: number,
  allowEmpty = false
): string => {
  if (typeof value !== 'string') fail('invalid_string', `${path} must be a string.`, path);
  const text = (value as string).trim();
  if (!allowEmpty && text.length === 0) fail('empty_name', `${path} cannot be empty.`, path);
  if (text.length > maxLength) {
    fail('string_too_long', `${path} is longer than ${maxLength} characters.`, path);
  }
  if (FORBIDDEN_CHARACTERS.test(text) || hasLoneSurrogate(text)) {
    fail('invalid_string', `${path} contains characters that are not allowed.`, path);
  }
  return text;
};

const readEnum = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string
): T => {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    fail('unknown_enum_value', `${path} must be one of: ${allowed.join(', ')}.`, path);
  }
  return value as T;
};

/**
 * Deterministic comparison key for exercise names. Display names are never
 * rewritten; this key only decides whether two names mean the same exercise.
 * "Lat Pulldown", "lat  pulldown" and "LAT PULLDOWN" share one key.
 *
 * NFKC folds compatibility forms (full-width letters, ligatures); whitespace
 * runs collapse; `toLowerCase` is locale-independent so every device agrees.
 * Note this is broader than SQLite's ASCII-only `COLLATE NOCASE`.
 */
export const exerciseMatchKey = (name: string): string =>
  name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();

// ---------------------------------------------------------------------------
// Untrusted-object helpers
// ---------------------------------------------------------------------------

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const own = (record: Record<string, unknown>, key: string): unknown =>
  Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;

const readObject = (value: unknown, path: string): Record<string, unknown> => {
  if (!isPlainObject(value)) fail('invalid_structure', `${path} must be an object.`, path);
  return value as Record<string, unknown>;
};

const readArray = (value: unknown, path: string): unknown[] => {
  if (!Array.isArray(value)) fail('invalid_structure', `${path} must be a list.`, path);
  return value as unknown[];
};

// ---------------------------------------------------------------------------
// Domain validation (shared by serializer and parser)
// ---------------------------------------------------------------------------

const normalizeCustomFields = (
  record: Record<string, unknown>,
  path: string
): Omit<PortableCustomExercise, 'kind' | 'name'> => {
  const equipment = own(record, 'equipment');
  return {
    workoutType: readEnum(own(record, 'workoutType'), PORTABLE_WORKOUT_TYPES, `${path}.workoutType`),
    primaryMuscle: readName(
      own(record, 'primaryMuscle'),
      `${path}.primaryMuscle`,
      SHARED_SPLIT_LIMITS.primaryMuscleMaxLength
    ),
    equipment:
      equipment === null || equipment === undefined
        ? null
        : readEnum(equipment, PORTABLE_EQUIPMENT, `${path}.equipment`),
    loadType: readEnum(own(record, 'loadType'), PORTABLE_LOAD_TYPES, `${path}.loadType`),
    metric:
      own(record, 'metric') === undefined
        ? 'reps'
        : readEnum(own(record, 'metric'), PORTABLE_METRICS, `${path}.metric`),
  };
};

const normalizeExercise = (value: unknown, path: string): PortableExercise => {
  const record = readObject(value, path);
  const name = readName(own(record, 'name'), `${path}.name`, SHARED_SPLIT_LIMITS.exerciseNameMaxLength);
  const kind = own(record, 'kind');
  if (kind === 'builtin') return { kind, name };
  if (kind === 'custom') return { kind, name, ...normalizeCustomFields(record, path) };
  return fail('unknown_enum_value', `${path}.kind must be "builtin" or "custom".`, `${path}.kind`);
};

const sameExerciseIdentity = (a: PortableExercise, b: PortableExercise): boolean => {
  if (a.kind !== b.kind || a.name !== b.name) return false;
  if (a.kind === 'builtin' || b.kind === 'builtin') return true;
  return (
    a.workoutType === b.workoutType &&
    a.primaryMuscle === b.primaryMuscle &&
    a.equipment === b.equipment &&
    a.loadType === b.loadType &&
    a.metric === b.metric
  );
};

/**
 * Validates an in-memory split and returns a normalised deep copy holding only
 * protocol fields. Rules:
 *  - 1…maxWorkouts workouts, at least one exercise overall (mirrors
 *    `saveCustomSplitDraftSync`); individual workouts may be empty but an
 *    empty workout must be named.
 *  - No exercise twice in one workout (the builder de-duplicates too).
 *  - One match key ↔ one exercise identity across the whole split, so a
 *    payload can never be ambiguous about which exercise a name means.
 */
const normalizeSplit = (input: unknown): PortableSplit => {
  const record = readObject(input, 'split');
  const name = readName(own(record, 'name'), 'name', SHARED_SPLIT_LIMITS.splitNameMaxLength);
  const workoutValues = readArray(own(record, 'workouts'), 'workouts');
  if (workoutValues.length === 0) fail('no_workouts', 'A split needs at least one workout.', 'workouts');
  if (workoutValues.length > SHARED_SPLIT_LIMITS.maxWorkouts) {
    fail('too_many_workouts', `A split can share at most ${SHARED_SPLIT_LIMITS.maxWorkouts} workouts.`, 'workouts');
  }

  const identities = new Map<string, PortableExercise>();
  let total = 0;
  const workouts = workoutValues.map((workoutValue, workoutIndex): PortableWorkout => {
    const path = `workouts[${workoutIndex}]`;
    const workout = readObject(workoutValue, path);
    const workoutName = readName(
      own(workout, 'name'),
      `${path}.name`,
      SHARED_SPLIT_LIMITS.workoutNameMaxLength,
      true
    );
    const exerciseValues = readArray(own(workout, 'exercises'), `${path}.exercises`);
    if (exerciseValues.length > SHARED_SPLIT_LIMITS.maxExercisesPerWorkout) {
      fail(
        'too_many_exercises',
        `A workout can share at most ${SHARED_SPLIT_LIMITS.maxExercisesPerWorkout} exercises.`,
        `${path}.exercises`
      );
    }
    if (exerciseValues.length === 0 && workoutName.length === 0) {
      fail('empty_workout', 'An empty workout needs a name.', path);
    }
    total += exerciseValues.length;
    if (total > SHARED_SPLIT_LIMITS.maxTotalExercises) {
      fail(
        'too_many_exercises',
        `A split can share at most ${SHARED_SPLIT_LIMITS.maxTotalExercises} exercises.`,
        `${path}.exercises`
      );
    }

    const seen = new Set<string>();
    const exercises = exerciseValues.map((exerciseValue, exerciseIndex) => {
      const exercisePath = `${path}.exercises[${exerciseIndex}]`;
      const exercise = normalizeExercise(exerciseValue, exercisePath);
      const key = exerciseMatchKey(exercise.name);
      if (seen.has(key)) {
        fail('duplicate_exercise', `"${exercise.name}" appears twice in one workout.`, exercisePath);
      }
      seen.add(key);

      const known = identities.get(key);
      if (!known) {
        identities.set(key, exercise);
      } else if (!sameExerciseIdentity(known, exercise)) {
        fail(
          known.kind === 'custom' && exercise.kind === 'custom' && known.name === exercise.name
            ? 'conflicting_custom_exercise'
            : 'ambiguous_exercise_name',
          `"${exercise.name}" refers to two different exercises in this split.`,
          exercisePath
        );
      }
      return exercise;
    });
    return { name: workoutName, exercises };
  });

  if (total === 0) fail('empty_split', 'A split needs at least one exercise.', 'workouts');
  return { name, workouts };
};

export const validatePortableSplit = (input: unknown): SharedSplitResult<PortableSplit> =>
  capture(() => normalizeSplit(input));

// ---------------------------------------------------------------------------
// Domain → wire → canonical JSON
// ---------------------------------------------------------------------------

const toWire = (split: PortableSplit): SharedSplitWireV1 => {
  const custom: SharedSplitWireCustomExercise[] = [];
  const hoisted = new Set<string>();
  const workouts = split.workouts.map((workout) => ({
    name: workout.name,
    exercises: workout.exercises.map((exercise) => {
      if (exercise.kind === 'custom' && !hoisted.has(exercise.name)) {
        hoisted.add(exercise.name);
        // Explicit field order keeps the encoding canonical.
        custom.push({
          name: exercise.name,
          workoutType: exercise.workoutType,
          primaryMuscle: exercise.primaryMuscle,
          equipment: exercise.equipment,
          loadType: exercise.loadType,
          ...(exercise.metric === 'duration' ? { metric: 'duration' as const } : {}),
        });
      }
      return exercise.name;
    }),
  }));

  const wire: SharedSplitWireV1 = {
    type: SHARED_SPLIT_TYPE,
    v: SHARED_SPLIT_VERSION,
    name: split.name,
    workouts,
  };
  if (custom.length > 0) wire.custom = custom;
  return wire;
};

export const utf8ByteLength = (text: string): number => {
  let bytes = 0;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      index += 1;
    } else bytes += 3;
  }
  return bytes;
};

const assertPayloadSize = (json: string): void => {
  // UTF-8 bytes ≥ UTF-16 units, so the cheap length check is a safe pre-filter.
  if (
    json.length > SHARED_SPLIT_LIMITS.maxPayloadBytes ||
    utf8ByteLength(json) > SHARED_SPLIT_LIMITS.maxPayloadBytes
  ) {
    fail('payload_too_large', `Shared splits are limited to ${SHARED_SPLIT_LIMITS.maxPayloadBytes} bytes.`);
  }
};

/**
 * Validates a portable split and returns its canonical V1 JSON text. Equal
 * normalised input always yields byte-identical output.
 */
export const serializeSharedSplit = (split: PortableSplit): SharedSplitResult<string> =>
  capture(() => {
    const json = JSON.stringify(toWire(normalizeSplit(split)));
    assertPayloadSize(json);
    return json;
  });

/** The wire object for a split, e.g. for inspection or alternative encodings. */
export const toSharedSplitWire = (split: PortableSplit): SharedSplitResult<SharedSplitWireV1> =>
  capture(() => toWire(normalizeSplit(split)));

// ---------------------------------------------------------------------------
// Canonical JSON → wire → domain
// ---------------------------------------------------------------------------

/**
 * JSON.parse silently keeps the last of duplicate keys, which would let two
 * readers of one payload disagree. Runs only on text JSON.parse accepted.
 */
const findDuplicateKey = (text: string): string | null => {
  const stack: (Set<string> | null)[] = [];
  let expectKey = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      let end = index + 1;
      while (text[end] !== '"') end += text[end] === '\\' ? 2 : 1;
      if (expectKey) {
        const keys = stack[stack.length - 1] as Set<string>;
        const key = JSON.parse(text.slice(index, end + 1)) as string;
        if (keys.has(key)) return key;
        keys.add(key);
        expectKey = false;
      }
      index = end;
    } else if (char === '{') {
      stack.push(new Set());
      expectKey = true;
    } else if (char === '[') {
      stack.push(null);
      expectKey = false;
    } else if (char === '}' || char === ']') {
      stack.pop();
      expectKey = false;
    } else if (char === ',') {
      expectKey = stack[stack.length - 1] instanceof Set;
    }
  }
  return null;
};

const readVersion = (root: Record<string, unknown>): number => {
  const type = own(root, 'type');
  if (type !== SHARED_SPLIT_TYPE) {
    fail(
      'unsupported_type',
      typeof type === 'string'
        ? `"${type.slice(0, 40)}" is not a shared split this version of Stack understands.`
        : 'This is not a shared Stack split.',
      'type'
    );
  }
  const version = own(root, 'v');
  if (version === undefined) fail('missing_version', 'The shared split has no version.', 'v');
  if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 1) {
    fail('invalid_version', 'The shared split version is invalid.', 'v');
  }
  if (!SUPPORTED_SHARED_SPLIT_VERSIONS.includes(version as number)) {
    fail(
      'unsupported_version',
      (version as number) > SHARED_SPLIT_VERSION
        ? 'This split was shared from a newer version of Stack. Update Stack to open it.'
        : 'This shared split version is no longer supported.',
      'v'
    );
  }
  return version as number;
};

/** V1 wire → domain. Unknown fields are ignored so additive changes stay V1. */
const fromWireV1 = (root: Record<string, unknown>): PortableSplit => {
  const customValue = own(root, 'custom');
  const customValues = customValue === undefined ? [] : readArray(customValue, 'custom');
  if (customValues.length > SHARED_SPLIT_LIMITS.maxCustomExercises) {
    fail(
      'too_many_exercises',
      `A split can share at most ${SHARED_SPLIT_LIMITS.maxCustomExercises} custom exercises.`,
      'custom'
    );
  }

  const definitions = new Map<string, PortableCustomExercise>();
  customValues.forEach((value, index) => {
    const path = `custom[${index}]`;
    const record = readObject(value, path);
    const name = readName(own(record, 'name'), `${path}.name`, SHARED_SPLIT_LIMITS.exerciseNameMaxLength);
    if (own(record, 'equipment') === undefined) {
      fail('invalid_structure', `${path}.equipment is required (use null for none).`, `${path}.equipment`);
    }
    const key = exerciseMatchKey(name);
    if (definitions.has(key)) {
      fail('conflicting_custom_exercise', `"${name}" is defined more than once.`, path);
    }
    definitions.set(key, { kind: 'custom', name, ...normalizeCustomFields(record, path) });
  });

  const referenced = new Set<string>();
  const workoutValues = readArray(own(root, 'workouts'), 'workouts');
  // Bound work before mapping; normalizeSplit repeats the exact checks.
  if (workoutValues.length > SHARED_SPLIT_LIMITS.maxWorkouts) {
    fail('too_many_workouts', `A split can share at most ${SHARED_SPLIT_LIMITS.maxWorkouts} workouts.`, 'workouts');
  }
  const workouts = workoutValues.map((workoutValue, workoutIndex) => {
    const path = `workouts[${workoutIndex}]`;
    const workout = readObject(workoutValue, path);
    const exerciseValues = readArray(own(workout, 'exercises'), `${path}.exercises`);
    if (exerciseValues.length > SHARED_SPLIT_LIMITS.maxExercisesPerWorkout) {
      fail(
        'too_many_exercises',
        `A workout can share at most ${SHARED_SPLIT_LIMITS.maxExercisesPerWorkout} exercises.`,
        `${path}.exercises`
      );
    }
    return {
      name: own(workout, 'name'),
      exercises: exerciseValues.map((value, exerciseIndex): PortableExercise => {
        const exercisePath = `${path}.exercises[${exerciseIndex}]`;
        const name = readName(value, exercisePath, SHARED_SPLIT_LIMITS.exerciseNameMaxLength);
        const key = exerciseMatchKey(name);
        const definition = definitions.get(key);
        if (!definition) return { kind: 'builtin', name };
        if (definition.name !== name) {
          fail(
            'exercise_name_mismatch',
            `"${name}" does not exactly match its custom definition "${definition.name}".`,
            exercisePath
          );
        }
        referenced.add(key);
        return { ...definition };
      }),
    };
  });

  const split = normalizeSplit({ name: own(root, 'name'), workouts });
  for (const [key, definition] of definitions) {
    if (!referenced.has(key)) {
      fail('unreferenced_custom_exercise', `"${definition.name}" is defined but never used.`, 'custom');
    }
  }
  return split;
};

/**
 * Parses canonical (or any equivalent) JSON text into a validated, normalised
 * portable split. Never throws.
 */
export const parseSharedSplitJson = (json: unknown): SharedSplitResult<PortableSplit> =>
  capture(() => {
    if (typeof json !== 'string') fail('invalid_json', 'The shared split must be JSON text.');
    assertPayloadSize(json as string);
    let root: unknown;
    try {
      root = JSON.parse(json as string);
    } catch {
      fail('invalid_json', 'The shared split is not valid JSON.');
    }
    const duplicate = findDuplicateKey(json as string);
    if (duplicate !== null) {
      fail('duplicate_key', `The field "${duplicate.slice(0, 40)}" appears more than once.`);
    }
    const record = readObject(root, 'payload');
    readVersion(record);
    // Only V1 exists today; future versions dispatch here.
    return fromWireV1(record);
  });
