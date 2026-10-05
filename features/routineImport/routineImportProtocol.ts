/**
 * Formats for "Paste my routine".
 *
 *   pasted text ──AI──▶ ParsedRoutine (what the person wrote, validated here)
 *               ──routineImportResult.ts──▶ RoutineImportResult (Stack-owned)
 *               ──toPortableSplit──▶ PortableSplit ──importPortableSplitSync──▶ SQLite
 *
 * The model's JSON is untrusted. `readParsedRoutine` accepts only the exact
 * shape below, sanitizes every string the way the split protocol would, and
 * drops (with a warning) any number outside a plausible range, so nothing
 * malformed reaches resolution. It never throws.
 *
 * Pure: no database, store, router or platform imports.
 */
import { SHARED_SPLIT_LIMITS, type PortableSplit } from '@/features/sharing/splitProtocol';

export const ROUTINE_IMPORT_TYPE = 'stack.routineImport';
export const ROUTINE_IMPORT_VERSION = 1;

export const ROUTINE_IMPORT_LIMITS = Object.freeze({
  /** Pasted text, in UTF-16 units. A dense 7-day routine is ~2,500. */
  maxTextLength: 10_000,
  /** Sanity caps on model output; the split protocol's tighter caps apply at import. */
  maxWorkouts: 30,
  maxExercisesPerWorkout: 60,
  maxTotalExercises: 300,
  maxNotesPerItem: 10,
  maxNoteLength: 200,
  maxUnsupported: 50,
  maxSets: 20,
  maxReps: 100,
  maxDurationSeconds: 2 * 60 * 60,
  routineNameMaxLength: SHARED_SPLIT_LIMITS.splitNameMaxLength,
  workoutNameMaxLength: SHARED_SPLIT_LIMITS.workoutNameMaxLength,
  exerciseNameMaxLength: SHARED_SPLIT_LIMITS.exerciseNameMaxLength,
  groupMaxLength: 32,
});

// ---------------------------------------------------------------------------
// Model output (what the AI understood, nothing more)
// ---------------------------------------------------------------------------

export interface ParsedExercise {
  /** The exercise exactly as written ("incl db"). Never a Stack name. */
  rawName: string;
  sets: number | null;
  reps: number | null;
  repsPerSet: number[] | null;
  repsMin: number | null;
  repsMax: number | null;
  durationSeconds: number | null;
  notes: string[];
  /** Shared label for exercises done together (superset, circuit, giant set). */
  group: string | null;
}

export interface ParsedWorkout {
  name: string | null;
  notes: string[];
  exercises: ParsedExercise[];
}

export interface UnsupportedItem {
  text: string;
  reason: string;
}

export interface ParsedRoutine {
  routineName: string | null;
  workouts: ParsedWorkout[];
  notes: string[];
  unsupported: UnsupportedItem[];
}

// ---------------------------------------------------------------------------
// Stack result
// ---------------------------------------------------------------------------

export type RepTarget =
  | { type: 'fixed'; value: number }
  | { type: 'perSet'; values: number[] }
  | { type: 'range'; min: number; max: number };

export type ExerciseImportStatus = 'matched' | 'uncertain' | 'unresolved';

export interface RoutineImportExercise {
  /** Stable within one result, e.g. "w1e3"; future review decisions use it. */
  id: string;
  rawName: string;
  status: ExerciseImportStatus;
  /** exact | alias | normalized | typo (matched); ambiguous | likely (uncertain). */
  matchMethod: 'exact' | 'alias' | 'normalized' | 'typo' | 'ambiguous' | 'likely' | null;
  /** The Stack catalog name, only when `status` is `matched`. */
  matchedName: string | null;
  /** Best guess for an `uncertain` exercise; the person must confirm it. */
  suggestedMatch: string | null;
  alternatives: string[];
  sets: number | null;
  reps: RepTarget | null;
  durationSeconds: number | null;
  notes: string[];
  group: string | null;
}

export interface RoutineImportWorkout {
  id: string;
  name: string | null;
  notes: string[];
  exercises: RoutineImportExercise[];
}

export interface RoutineImportIssue {
  code: string;
  message: string;
  path?: string;
}

export interface RoutineImportResult {
  type: typeof ROUTINE_IMPORT_TYPE;
  v: typeof ROUTINE_IMPORT_VERSION;
  routine: {
    name: string | null;
    workouts: RoutineImportWorkout[];
    notes: string[];
    unsupported: UnsupportedItem[];
  };
  summary: {
    workouts: number;
    exercises: number;
    matched: number;
    uncertain: number;
    unresolved: number;
  };
  /**
   * `split` is present only when every exercise matched and the split passes
   * the sharing protocol's validation, so it can go straight to
   * `importPortableSplitSync`. Otherwise `issues` says what needs review.
   */
  importDraft: {
    ready: boolean;
    split: PortableSplit | null;
    issues: RoutineImportIssue[];
  };
  warnings: RoutineImportIssue[];
}

// ---------------------------------------------------------------------------
// Validation of untrusted model output
// ---------------------------------------------------------------------------

export type RoutineImportReadResult =
  | { ok: true; value: ParsedRoutine; warnings: RoutineImportIssue[] }
  | { ok: false; error: RoutineImportIssue };

class InvalidModelOutput extends Error {
  readonly path: string;
  constructor(message: string, path: string) {
    super(message);
    this.path = path;
  }
}

const invalid = (message: string, path: string): never => {
  throw new InvalidModelOutput(message, path);
};

/** The split protocol's forbidden set: C0/C1 controls, bidi overrides/isolates, ZWSP, BOM. */
const FORBIDDEN_CHARACTERS = /[\u0000-\u001F\u007F-\u009F​‪-‮⁦-⁩﻿]/g;
const LONE_SURROGATES = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

/** Same character rules as split names, so a sanitized name always validates. */
export const sanitizeImportText = (value: string): string =>
  value.replace(FORBIDDEN_CHARACTERS, ' ').replace(LONE_SURROGATES, '').replace(/\s+/g, ' ').trim();

const truncate = (text: string, limit: number): string => {
  if (text.length <= limit) return text;
  let cut = text.slice(0, limit).trimEnd();
  if (/[\uD800-\uDBFF]$/.test(cut)) cut = cut.slice(0, -1);
  return cut;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const own = (record: Record<string, unknown>, key: string): unknown =>
  Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;

export const readParsedRoutine = (value: unknown): RoutineImportReadResult => {
  const warnings: RoutineImportIssue[] = [];
  const warn = (code: string, message: string, path: string) => warnings.push({ code, message, path });

  const text = (input: unknown, path: string, limit: number, required: boolean): string | null => {
    if (input === undefined || input === null) {
      return required ? invalid(`${path} is required.`, path) : null;
    }
    if (typeof input !== 'string') return invalid(`${path} must be a string.`, path);
    const clean = sanitizeImportText(input);
    if (clean.length === 0) return required ? invalid(`${path} cannot be empty.`, path) : null;
    if (clean.length > limit) warn('text_truncated', `${path} was shortened to ${limit} characters.`, path);
    return truncate(clean, limit);
  };

  const list = (input: unknown, path: string): unknown[] => {
    if (input === undefined || input === null) return [];
    if (!Array.isArray(input)) return invalid(`${path} must be a list.`, path);
    return input;
  };

  const notes = (input: unknown, path: string): string[] => {
    const values = list(input, path);
    const out: string[] = [];
    values.forEach((note, index) => {
      const clean = text(note, `${path}[${index}]`, ROUTINE_IMPORT_LIMITS.maxNoteLength, false);
      if (clean) out.push(clean);
    });
    if (out.length > ROUTINE_IMPORT_LIMITS.maxNotesPerItem) {
      warn('notes_truncated', `Only the first ${ROUTINE_IMPORT_LIMITS.maxNotesPerItem} notes were kept.`, path);
    }
    return out.slice(0, ROUTINE_IMPORT_LIMITS.maxNotesPerItem);
  };

  /** A wrong type is malformed output; an implausible value is dropped. */
  const count = (input: unknown, path: string, max: number): number | null => {
    if (input === undefined || input === null) return null;
    if (typeof input !== 'number' || !Number.isFinite(input)) return invalid(`${path} must be a number.`, path);
    if (!Number.isInteger(input) || input < 1 || input > max) {
      warn('value_dropped', `${path} (${input}) is not a whole number from 1 to ${max} and was ignored.`, path);
      return null;
    }
    return input;
  };

  const exercise = (input: unknown, path: string): ParsedExercise => {
    if (!isRecord(input)) return invalid(`${path} must be an object.`, path);
    const rawName = text(own(input, 'rawName'), `${path}.rawName`, ROUTINE_IMPORT_LIMITS.exerciseNameMaxLength, true) as string;
    const perSetValues = list(own(input, 'repsPerSet'), `${path}.repsPerSet`);
    const perSet = perSetValues.map((reps, index) =>
      count(reps, `${path}.repsPerSet[${index}]`, ROUTINE_IMPORT_LIMITS.maxReps));
    let repsPerSet: number[] | null = null;
    if (perSet.length > ROUTINE_IMPORT_LIMITS.maxSets || perSet.some((reps) => reps === null)) {
      warn('value_dropped', `${path}.repsPerSet was not usable and was ignored.`, `${path}.repsPerSet`);
    } else if (perSet.length > 0) {
      repsPerSet = perSet as number[];
    }
    return {
      rawName,
      sets: count(own(input, 'sets'), `${path}.sets`, ROUTINE_IMPORT_LIMITS.maxSets),
      reps: count(own(input, 'reps'), `${path}.reps`, ROUTINE_IMPORT_LIMITS.maxReps),
      repsPerSet,
      repsMin: count(own(input, 'repsMin'), `${path}.repsMin`, ROUTINE_IMPORT_LIMITS.maxReps),
      repsMax: count(own(input, 'repsMax'), `${path}.repsMax`, ROUTINE_IMPORT_LIMITS.maxReps),
      durationSeconds: count(own(input, 'durationSeconds'), `${path}.durationSeconds`, ROUTINE_IMPORT_LIMITS.maxDurationSeconds),
      notes: notes(own(input, 'notes'), `${path}.notes`),
      group: text(own(input, 'group'), `${path}.group`, ROUTINE_IMPORT_LIMITS.groupMaxLength, false),
    };
  };

  try {
    if (!isRecord(value)) invalid('The model response must be a JSON object.', 'root');
    const root = value as Record<string, unknown>;
    if (!Array.isArray(own(root, 'workouts'))) invalid('workouts must be a list.', 'workouts');
    const workoutValues = own(root, 'workouts') as unknown[];
    if (workoutValues.length > ROUTINE_IMPORT_LIMITS.maxWorkouts) {
      invalid(`At most ${ROUTINE_IMPORT_LIMITS.maxWorkouts} workouts are supported.`, 'workouts');
    }

    let total = 0;
    const workouts = workoutValues.map((workoutValue, workoutIndex): ParsedWorkout => {
      const path = `workouts[${workoutIndex}]`;
      if (!isRecord(workoutValue)) return invalid(`${path} must be an object.`, path);
      const exerciseValues = list(own(workoutValue, 'exercises'), `${path}.exercises`);
      total += exerciseValues.length;
      if (exerciseValues.length > ROUTINE_IMPORT_LIMITS.maxExercisesPerWorkout || total > ROUTINE_IMPORT_LIMITS.maxTotalExercises) {
        invalid('The routine has more exercises than Stack can import.', `${path}.exercises`);
      }
      return {
        name: text(own(workoutValue, 'name'), `${path}.name`, ROUTINE_IMPORT_LIMITS.workoutNameMaxLength, false),
        notes: notes(own(workoutValue, 'notes'), `${path}.notes`),
        exercises: exerciseValues.map((item, index) => exercise(item, `${path}.exercises[${index}]`)),
      };
    });

    const unsupportedValues = list(own(root, 'unsupported'), 'unsupported').slice(0, ROUTINE_IMPORT_LIMITS.maxUnsupported);
    const unsupported: UnsupportedItem[] = [];
    unsupportedValues.forEach((item, index) => {
      const path = `unsupported[${index}]`;
      if (!isRecord(item)) invalid(`${path} must be an object.`, path);
      const record = item as Record<string, unknown>;
      const itemText = text(own(record, 'text'), `${path}.text`, ROUTINE_IMPORT_LIMITS.maxNoteLength, false);
      if (!itemText) return;
      unsupported.push({
        text: itemText,
        reason: text(own(record, 'reason'), `${path}.reason`, ROUTINE_IMPORT_LIMITS.maxNoteLength, false) ?? 'Not supported by Stack yet.',
      });
    });

    return {
      ok: true,
      value: {
        routineName: text(own(root, 'routineName'), 'routineName', ROUTINE_IMPORT_LIMITS.routineNameMaxLength, false),
        workouts,
        notes: notes(own(root, 'notes'), 'notes'),
        unsupported,
      },
      warnings,
    };
  } catch (error) {
    if (error instanceof InvalidModelOutput) {
      return { ok: false, error: { code: 'invalid_model_output', message: error.message, path: error.path } };
    }
    // Hostile getters or anything unexpected still fail closed.
    return { ok: false, error: { code: 'invalid_model_output', message: 'The model response could not be read.' } };
  }
};
