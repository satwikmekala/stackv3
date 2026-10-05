export type HevyErrorCode = 'credentials' | 'network' | 'reading' | 'cancelled' | 'persistence';
const COPY: Record<HevyErrorCode, string> = {
  credentials: 'Couldn’t connect to Hevy. Check your API key and try again.',
  network: 'Couldn’t reach Hevy. Try again.',
  reading: 'Couldn’t finish reading your Hevy data. Nothing was imported. Try again.',
  cancelled: 'Import cancelled. Nothing was imported.',
  persistence: 'Couldn’t finish the import. Your existing Stack data is safe. Try again.',
};
/** Never attach a response body, request, credential, cause, or provider error. */
export class HevyImportError extends Error {
  constructor(public readonly code: HevyErrorCode) { super(COPY[code]); this.name = 'HevyImportError'; }
}
export function hevyErrorCopy(error: unknown, fallback: HevyErrorCode = 'reading'): string {
  return error instanceof HevyImportError ? COPY[error.code] : COPY[fallback];
}
