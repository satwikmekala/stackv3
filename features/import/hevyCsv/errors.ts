export type HevyExportErrorCode = 'invalid' | 'unsupported' | 'empty' | 'large';
const COPY: Record<HevyExportErrorCode, string> = {
  invalid: 'Couldn’t read this Hevy export. Choose a valid file and try again.',
  unsupported: 'This Hevy export format isn’t supported yet.',
  empty: 'This Hevy export has no completed workouts to import.',
  large: 'This Hevy export is too large. Choose a CSV under 10 MB with up to 50,000 sets and 5,000 workouts.',
};
export class HevyExportError extends Error {
  constructor(public readonly code: HevyExportErrorCode) { super(COPY[code]); this.name = 'HevyExportError'; }
}
export const hevyExportErrorCopy = (error: unknown) => error instanceof HevyExportError ? COPY[error.code] : COPY.invalid;
