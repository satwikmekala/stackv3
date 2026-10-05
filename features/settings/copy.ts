const SAFE_MESSAGES = new Set([
  'Finish or discard your active workout first.', 'File sharing is unavailable on this device.',
  'Wait for your preferences to finish saving.', 'Choose a Stack backup file.', 'Choose a valid Stack backup file.',
  'This file is too large to be a Stack backup.', 'This backup is incomplete.',
  'This backup is not compatible with this version of Stack.', 'This backup contains invalid data.',
  'This backup has an invalid profile.', 'This backup has invalid plan preferences.', 'This backup has an invalid schedule.',
  'This backup is missing its preferences.', 'This backup has invalid preferences.',
  'Finish the active workout before creating a backup.', 'This backup couldn’t be verified. Try another backup.',
]);
export function settingsErrorCopy(action: string, error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (SAFE_MESSAGES.has(message)) return message;
  if (action === 'restore') return 'Couldn’t restore this backup. Try another backup.';
  if (action === 'csv' || action === 'backup') return 'Couldn’t export your data. Try again.';
  if (action === 'delete') return 'Couldn’t delete your data. Try again.';
  return 'Couldn’t save your preference. Try again.';
}
