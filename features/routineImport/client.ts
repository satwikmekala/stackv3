/**
 * Calls the routine-import backend (server/). The app never parses pasted
 * text itself and never holds the AI key: it sends the text and receives
 * Stack's RoutineImportResult.
 */
import {
  ROUTINE_IMPORT_LIMITS,
  ROUTINE_IMPORT_TYPE,
  ROUTINE_IMPORT_VERSION,
  type RoutineImportResult,
} from '@/features/routineImport/routineImportProtocol';

/** Set EXPO_PUBLIC_ROUTINE_IMPORT_URL to the Railway service. Development builds fall back to a local server. */
export const routineImportBaseUrl = (): string | null =>
  process.env.EXPO_PUBLIC_ROUTINE_IMPORT_URL?.replace(/\/+$/, '') || (__DEV__ ? 'http://localhost:8080' : null);

/** Longer than the server's own 90 s deadline, so the server's answer normally arrives first. */
export const ROUTINE_IMPORT_CLIENT_TIMEOUT_MS = 100_000;

export type PasteParseError = 'empty' | 'too_long' | 'timeout' | 'failed';

export const PASTE_PARSE_MESSAGES: Record<PasteParseError, string> = {
  empty: 'Paste your routine first.',
  too_long: `Routines can be up to ${ROUTINE_IMPORT_LIMITS.maxTextLength.toLocaleString('en-US')} characters.`,
  timeout: 'This is taking longer than expected. Try again.',
  failed: 'Couldn’t read this routine. Try again.',
};

export class PasteParseFailure extends Error {
  constructor(readonly reason: PasteParseError) {
    super(PASTE_PARSE_MESSAGES[reason]);
    this.name = 'PasteParseFailure';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Accepts only the shape the editor relies on; anything else is a failed parse. */
export const isRoutineImportResult = (value: unknown): value is RoutineImportResult => {
  if (!isRecord(value) || value.type !== ROUTINE_IMPORT_TYPE || value.v !== ROUTINE_IMPORT_VERSION) return false;
  const routine = value.routine;
  if (!isRecord(routine) || !Array.isArray(routine.workouts)) return false;
  if (routine.name !== null && typeof routine.name !== 'string') return false;
  return routine.workouts.every((workout) => isRecord(workout) && typeof workout.id === 'string' &&
    (workout.name === null || typeof workout.name === 'string') && Array.isArray(workout.exercises) &&
    workout.exercises.every((exercise) => isRecord(exercise) && typeof exercise.id === 'string' &&
      typeof exercise.rawName === 'string' && ['matched', 'uncertain', 'unresolved'].includes(exercise.status as string) &&
      (exercise.matchedName === null || typeof exercise.matchedName === 'string') &&
      (exercise.suggestedMatch === null || typeof exercise.suggestedMatch === 'string') &&
      Array.isArray(exercise.alternatives) && exercise.alternatives.every((name) => typeof name === 'string')));
};

/** Client-side checks that need no network: the same messages the server would return. */
export const checkPastedText = (text: string): PasteParseError | null => {
  if (!text.trim()) return 'empty';
  if (text.length > ROUTINE_IMPORT_LIMITS.maxTextLength) return 'too_long';
  return null;
};

export async function parsePastedRoutine(text: string, options: {
  signal?: AbortSignal;
  fetch?: typeof fetch;
  baseUrl?: string | null;
  timeoutMs?: number;
} = {}): Promise<RoutineImportResult> {
  const invalid = checkPastedText(text);
  if (invalid) throw new PasteParseFailure(invalid);
  const baseUrl = options.baseUrl === undefined ? routineImportBaseUrl() : options.baseUrl;
  if (!baseUrl) throw new PasteParseFailure('failed');

  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), options.timeoutMs ?? ROUTINE_IMPORT_CLIENT_TIMEOUT_MS);
  const cancel = () => timeout.abort();
  options.signal?.addEventListener('abort', cancel);
  try {
    let response: Response;
    try {
      response = await (options.fetch ?? fetch)(`${baseUrl}/v1/routine-import/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.EXPO_PUBLIC_ROUTINE_IMPORT_CLIENT_KEY ? { 'x-stack-client-key': process.env.EXPO_PUBLIC_ROUTINE_IMPORT_CLIENT_KEY } : {}),
        },
        body: JSON.stringify({ text }),
        signal: timeout.signal,
      });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      throw new PasteParseFailure(timeout.signal.aborted ? 'timeout' : 'failed');
    }
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // Handled below.
    }
    if (!response.ok) {
      const code = isRecord(body) && isRecord(body.error) ? body.error.code : null;
      if (code === 'empty_text') throw new PasteParseFailure('empty');
      if (code === 'text_too_long') throw new PasteParseFailure('too_long');
      if (code === 'ai_timeout' || response.status === 504) throw new PasteParseFailure('timeout');
      throw new PasteParseFailure('failed');
    }
    if (!isRoutineImportResult(body)) throw new PasteParseFailure('failed');
    return body;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
  }
}
