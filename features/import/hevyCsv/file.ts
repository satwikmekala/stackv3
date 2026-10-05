import { File } from 'expo-file-system';
import { HevyExportError } from './errors';
import { HEVY_CSV_MAX_BYTES } from './limits';

type PickedFile = { name: string; size: number; text: () => Promise<string> };
type PickResult = { canceled: true; result: null } | { canceled: false; result: PickedFile };
type Picker = (options: { mimeTypes: string[] }) => Promise<PickResult>;

/** No upload, logging, stored file path, or durable copy owned by Stack. */
export async function pickHevyExportFile(pick: Picker = options => File.pickFileAsync(options)): Promise<string | null> {
  try {
    const selected = await pick({ mimeTypes: ['text/csv', 'text/comma-separated-values', 'application/csv'] });
    if (selected.canceled) return null;
    const file = selected.result;
    if (!/\.csv$/i.test(file.name)) throw new HevyExportError('invalid');
    if (!Number.isFinite(file.size) || file.size < 0) throw new HevyExportError('invalid');
    if (file.size > HEVY_CSV_MAX_BYTES) throw new HevyExportError('large');
    if (file.size === 0) throw new HevyExportError('empty');
    return await file.text();
  } catch (error) {
    if (error instanceof HevyExportError) throw error;
    throw new HevyExportError('invalid');
  }
}
