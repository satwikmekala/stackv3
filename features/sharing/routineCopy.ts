import type { SharedSplitError } from './splitProtocol';

/** Protocol details stay in diagnostics; screens receive these four messages. */
export function routineLinkErrorCopy(error: Pick<SharedSplitError, 'code'>): string {
  if (['payload_too_large', 'too_many_workouts', 'too_many_exercises'].includes(error.code))
    return 'This routine is too big to share as a link.';
  if (error.code === 'unsupported_version') return 'This routine needs a newer Stack. Update to open it.';
  return 'This link is broken. Ask for a new one.';
}

export function routineImportFailureCopy(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message === 'This routine needs a newer Stack. Update to open it.') return message;
  if (message === 'This routine is too big to share as a link.') return message;
  return 'Couldn’t add this routine. Try again.';
}
