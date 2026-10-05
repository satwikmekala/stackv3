/**
 * Turns a validated ParsedRoutine into Stack's RoutineImportResult:
 *
 *   ground  — every exercise name and number must appear in the pasted text;
 *             anything the model added is dropped or flagged, never kept
 *   resolve — exercise names → Stack catalog (exerciseResolver.ts)
 *   draft   — a PortableSplit for `importPortableSplitSync`, only when every
 *             exercise is matched and the split passes protocol validation
 *
 * Nothing here writes anywhere. Pure: no database, store, router or platform
 * imports.
 */
import {
  validatePortableSplit,
  type PortableCustomExercise,
  type PortableExercise,
  type PortableSplit,
} from '@/features/sharing/splitProtocol';
import type { ExerciseResolver } from '@/features/routineImport/exerciseResolver';
import {
  ROUTINE_IMPORT_TYPE,
  ROUTINE_IMPORT_VERSION,
  sanitizeImportText,
  type ParsedExercise,
  type ParsedRoutine,
  type RepTarget,
  type RoutineImportExercise,
  type RoutineImportIssue,
  type RoutineImportResult,
} from '@/features/routineImport/routineImportProtocol';

export const DEFAULT_IMPORTED_ROUTINE_NAME = 'Imported Routine';

// ---------------------------------------------------------------------------
// Grounding
// ---------------------------------------------------------------------------

const searchable = (value: string): string =>
  ` ${sanitizeImportText(value).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;

/** Every number a line could mean, including 1:30 → 90 and minutes → seconds. */
const numbersIn = (lines: readonly string[]): Set<number> => {
  const numbers = new Set<number>();
  for (const line of lines) {
    for (const match of line.matchAll(/(\d+):([0-5]\d)/g)) numbers.add(Number(match[1]) * 60 + Number(match[2]));
    for (const match of line.matchAll(/\d+(?:[.,]\d+)?/g)) numbers.add(Number(match[0].replace(',', '.')));
  }
  return numbers;
};

const durationGrounded = (seconds: number, numbers: Set<number>): boolean =>
  numbers.has(seconds) || numbers.has(seconds / 60) || numbers.has(seconds / 3600);

/**
 * Finds each exercise's line, in order, so its numbers can only come from
 * the text between it and the next exercise.
 */
const locateExercises = (text: string, exercises: readonly ParsedExercise[]): number[] => {
  const lines = text.split(/\r?\n/).map(searchable);
  let cursor = 0;
  return exercises.map((exercise) => {
    const needle = searchable(exercise.rawName);
    if (needle.trim().length === 0) return -1;
    const contains = (line: string) => line.includes(needle) || line.replace(/ /g, '').includes(needle.replace(/ /g, ''));
    for (let index = cursor; index < lines.length; index += 1) {
      if (contains(lines[index])) {
        cursor = index;
        return index;
      }
    }
    // Out of order is odd but not invented; keep the cursor where it was.
    return lines.findIndex(contains);
  });
};

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

const repTarget = (exercise: ParsedExercise): RepTarget | null => {
  if (exercise.repsPerSet && exercise.repsPerSet.length > 0) {
    const [first] = exercise.repsPerSet;
    return exercise.repsPerSet.every((reps) => reps === first)
      ? { type: 'fixed', value: first }
      : { type: 'perSet', values: [...exercise.repsPerSet] };
  }
  if (exercise.repsMin !== null && exercise.repsMax !== null) {
    if (exercise.repsMin === exercise.repsMax) return { type: 'fixed', value: exercise.repsMin };
    if (exercise.repsMin < exercise.repsMax) return { type: 'range', min: exercise.repsMin, max: exercise.repsMax };
    return null;
  }
  return exercise.reps !== null ? { type: 'fixed', value: exercise.reps } : null;
};

export const buildRoutineImportResult = (
  parsed: ParsedRoutine,
  text: string,
  resolver: ExerciseResolver,
  readWarnings: readonly RoutineImportIssue[] = []
): RoutineImportResult => {
  const warnings: RoutineImportIssue[] = [...readWarnings];
  const flat = parsed.workouts.flatMap((workout) => workout.exercises);
  const located = locateExercises(text, flat);
  const lines = text.split(/\r?\n/);
  const sortedLines = [...new Set(located.filter((line) => line >= 0))].sort((a, b) => a - b);
  const regionEnd = (line: number) => sortedLines.find((other) => other > line) ?? lines.length;

  let flatIndex = 0;
  const workouts = parsed.workouts.map((workout, workoutIndex) => {
    const workoutId = `w${workoutIndex + 1}`;
    const exercises = workout.exercises.map((exercise, exerciseIndex): RoutineImportExercise => {
      const id = `${workoutId}e${exerciseIndex + 1}`;
      const line = located[flatIndex];
      flatIndex += 1;
      const region = line >= 0 ? lines.slice(line, regionEnd(line)) : [];
      const numbers = numbersIn(region);
      /** "12 12 12" read as 3 × 12: the sets are the repeats, not a written 3. */
      const repeats = (value: number) => region.join(' ').match(new RegExp(`(?<![\\d.])${value}(?![\\d.])`, 'g'))?.length ?? 0;
      const grounded = <T>(value: T | null, ok: (value: T) => boolean, field: string): T | null => {
        if (value === null || ok(value)) return value;
        warnings.push({ code: 'ungrounded_value', message: `${field} for "${exercise.rawName}" isn't in the pasted text and was ignored.`, path: id });
        return null;
      };

      const repsPerSet = grounded(exercise.repsPerSet, (values) => values.every((reps) => numbers.has(reps)), 'Reps per set');
      const checked: ParsedExercise = {
        ...exercise,
        repsPerSet,
        reps: grounded(exercise.reps, (reps) => numbers.has(reps), 'Reps'),
        repsMin: grounded(exercise.repsMin, (reps) => numbers.has(reps), 'Minimum reps'),
        repsMax: grounded(exercise.repsMax, (reps) => numbers.has(reps), 'Maximum reps'),
        sets: grounded(exercise.sets, (sets) =>
          numbers.has(sets) || repsPerSet?.length === sets || (exercise.reps !== null && sets > 1 && repeats(exercise.reps) === sets), 'Sets'),
        durationSeconds: grounded(exercise.durationSeconds, (seconds) => durationGrounded(seconds, numbers), 'Duration'),
      };
      if ((checked.repsMin === null) !== (checked.repsMax === null) || (checked.repsMin !== null && checked.repsMax !== null && checked.repsMin > checked.repsMax)) {
        warnings.push({ code: 'value_dropped', message: `The rep range for "${exercise.rawName}" was incomplete and was ignored.`, path: id });
        checked.repsMin = null;
        checked.repsMax = null;
      }
      let sets = checked.sets;
      if (checked.repsPerSet) {
        if (sets !== null && sets !== checked.repsPerSet.length) {
          warnings.push({ code: 'inconsistent_sets', message: `"${exercise.rawName}" lists ${checked.repsPerSet.length} sets of reps but says ${sets} sets; the listed reps were kept.`, path: id });
        }
        sets = checked.repsPerSet.length;
      }

      let resolution = resolver.resolve(exercise.rawName);
      if (line < 0) {
        warnings.push({ code: 'ungrounded_exercise', message: `"${exercise.rawName}" doesn't appear in the pasted text. Check it before importing.`, path: id });
        if (resolution.status === 'matched') {
          resolution = { status: 'uncertain', method: 'likely', name: null, suggestedMatch: resolution.name, alternatives: [] };
        }
      }

      const reps = repTarget(checked);
      if (resolution.status === 'matched') {
        const metric = resolver.exercise(resolution.name)?.metric;
        if (metric === 'duration' && reps && checked.durationSeconds === null) {
          warnings.push({ code: 'measurement_mismatch', message: `${resolution.name} is timed in Stack, but reps were given.`, path: id });
        } else if (metric === 'reps' && !reps && checked.durationSeconds !== null) {
          warnings.push({ code: 'measurement_mismatch', message: `${resolution.name} counts reps in Stack, but a duration was given.`, path: id });
        }
      }

      return {
        id,
        rawName: exercise.rawName,
        status: resolution.status,
        matchMethod: resolution.method,
        matchedName: resolution.name,
        suggestedMatch: resolution.suggestedMatch,
        alternatives: resolution.alternatives,
        sets,
        reps,
        durationSeconds: checked.durationSeconds,
        notes: exercise.notes,
        group: exercise.group,
      };
    });
    return { id: workoutId, name: workout.name, notes: workout.notes, exercises };
  });

  const all = workouts.flatMap((workout) => workout.exercises);
  const result: RoutineImportResult = {
    type: ROUTINE_IMPORT_TYPE,
    v: ROUTINE_IMPORT_VERSION,
    routine: { name: parsed.routineName, workouts, notes: parsed.notes, unsupported: parsed.unsupported },
    summary: {
      workouts: workouts.length,
      exercises: all.length,
      matched: all.filter((exercise) => exercise.status === 'matched').length,
      uncertain: all.filter((exercise) => exercise.status === 'uncertain').length,
      unresolved: all.filter((exercise) => exercise.status === 'unresolved').length,
    },
    importDraft: { ready: false, split: null, issues: [] },
    warnings,
  };

  const issues = result.importDraft.issues;
  if (all.length === 0) issues.push({ code: 'empty_routine', message: 'No exercises were found in the pasted text.' });
  for (const exercise of all) {
    if (exercise.status === 'uncertain') {
      issues.push({ code: 'needs_confirmation', message: `Confirm which exercise "${exercise.rawName}" is.`, path: exercise.id });
    } else if (exercise.status === 'unresolved') {
      issues.push({ code: 'needs_exercise', message: `Choose an exercise or create a custom one for "${exercise.rawName}".`, path: exercise.id });
    }
  }
  if (issues.length === 0) {
    const draft = toPortableSplit(result);
    if (draft.ok) result.importDraft = { ready: true, split: draft.value, issues };
    else issues.push(draft.error);
  }
  return result;
};

// ---------------------------------------------------------------------------
// Import-ready split
// ---------------------------------------------------------------------------

/** What the person chose for an exercise during review (future UI). */
export type RoutineImportDecision =
  | { type: 'builtin'; name: string }
  | { type: 'custom'; exercise: Omit<PortableCustomExercise, 'kind'> }
  | { type: 'skip' };

export interface ToPortableSplitOptions {
  /** Overrides the pasted routine name. */
  name?: string;
  /** Keyed by RoutineImportExercise.id. Matched exercises default to their match. */
  decisions?: Readonly<Record<string, RoutineImportDecision>>;
}

export type ToPortableSplitResult =
  | { ok: true; value: PortableSplit }
  | { ok: false; error: RoutineImportIssue };

/**
 * Builds the split `importPortableSplitSync` takes, validated by the sharing
 * protocol. Sets/reps/notes are not part of PortableSplit V1, so they stay in
 * the RoutineImportResult.
 */
export const toPortableSplit = (
  result: Pick<RoutineImportResult, 'routine'>,
  options: ToPortableSplitOptions = {}
): ToPortableSplitResult => {
  const decisions = options.decisions ?? {};
  const workouts: PortableSplit['workouts'] = [];
  for (const workout of result.routine.workouts) {
    const exercises: PortableExercise[] = [];
    for (const exercise of workout.exercises) {
      const decision: RoutineImportDecision | undefined = Object.prototype.hasOwnProperty.call(decisions, exercise.id)
        ? decisions[exercise.id]
        : exercise.status === 'matched' && exercise.matchedName
          ? { type: 'builtin', name: exercise.matchedName }
          : undefined;
      if (!decision) {
        return { ok: false, error: { code: 'needs_review', message: `"${exercise.rawName}" needs to be confirmed before importing.`, path: exercise.id } };
      }
      if (decision.type === 'builtin') exercises.push({ kind: 'builtin', name: decision.name });
      else if (decision.type === 'custom') exercises.push({ ...decision.exercise, kind: 'custom' });
    }
    const name = workout.name ?? '';
    // A workout whose every exercise was skipped and has no name disappears.
    if (exercises.length > 0 || name.length > 0) workouts.push({ name, exercises });
  }
  const validated = validatePortableSplit({
    name: options.name ?? result.routine.name ?? DEFAULT_IMPORTED_ROUTINE_NAME,
    workouts,
  });
  return validated.ok ? validated : { ok: false, error: { ...validated.error } };
};
