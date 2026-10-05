import type { ImportSnapshot, ImportTemplate } from '../models';
import { HevyImportError } from './errors';
import { parseFolder, parsePage, parseRoutine, parseTemplate, parseUser, parseWorkout, parseWorkoutCount } from './schemas';

export const HEVY_DEVELOPER_URL = 'https://hevy.com/settings?developer';
const BASE = 'https://api.hevyapp.com';
type Options = { fetch?: typeof fetch; sleep?: (ms: number, signal?: AbortSignal) => Promise<void>; signal?: AbortSignal };
export type ScanProgress = { stage: 'routines' | 'workouts' | 'exercises'; read: number; total?: number };
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new HevyImportError('cancelled')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
  });
}

/** Closure only. No persistent key, global connection, URLs containing a secret, or provider errors. */
export function createHevyClient(input: string, options: Options = {}) {
  let key: string | null = input.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) throw new HevyImportError('credentials');
  const request = options.fetch ?? fetch;
  const pause = options.sleep ?? sleep;
  async function get(path: string): Promise<unknown> {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (!key || options.signal?.aborted) throw new HevyImportError('cancelled');
      const controller = new AbortController();
      const cancel = () => controller.abort();
      options.signal?.addEventListener('abort', cancel, { once: true });
      const timeout = setTimeout(cancel, 15_000);
      let retryMs = 500 * 2 ** attempt;
      try {
        const response = await request(BASE + path, { method: 'GET', headers: { 'api-key': key, Accept: 'application/json' },
          signal: controller.signal, redirect: 'error' });
        if (response.status === 401 || response.status === 403) throw new HevyImportError('credentials');
        if (response.status === 429 || response.status >= 500) {
          if (attempt === 2) throw new HevyImportError('network');
          const retryAfter = response.headers.get('Retry-After');
          if (retryAfter) {
            const seconds = Number(retryAfter);
            const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - Date.now();
            if (Number.isFinite(delay)) retryMs = Math.min(30_000, Math.max(retryMs, delay));
          }
        } else {
          if (!response.ok) throw new HevyImportError('reading');
          try { return await response.json(); } catch { throw new HevyImportError('reading'); }
        }
      } catch (error) {
        if (options.signal?.aborted || !key) throw new HevyImportError('cancelled');
        if (error instanceof HevyImportError) throw error;
        if (attempt === 2) throw new HevyImportError('network');
      } finally {
        clearTimeout(timeout); options.signal?.removeEventListener('abort', cancel);
      }
      await pause(retryMs, options.signal);
    }
    throw new HevyImportError('network');
  }
  async function pages<T>(path: string, keyName: string, size: number, parse: (v: unknown) => T,
    progress?: (count: number) => void): Promise<T[]> {
    const result: T[] = []; let expectedPages: number | null = null;
    for (let page = 1; ; page++) {
      const data = parsePage(await get(`${path}?page=${page}&pageSize=${size}`), keyName, page);
      if (expectedPages !== null && expectedPages !== data.pageCount) throw new HevyImportError('reading');
      expectedPages = data.pageCount;
      result.push(...data.items.map(parse)); progress?.(result.length);
      if (page >= data.pageCount) break;
    }
    return result;
  }
  function unique<T extends { id: string | number }>(items: T[]): T[] {
    // Duplicate page entries can mean the account changed while paging: require a new scan.
    if (new Set(items.map(item => item.id)).size !== items.length) throw new HevyImportError('reading');
    return items;
  }
  return {
    dispose: () => { key = null; },
    verify: async () => parseUser(await get('/v1/user/info')),
    scan: async (progress?: (value: ScanProgress) => void): Promise<ImportSnapshot> => {
      try {
        const user = parseUser(await get('/v1/user/info'));
        const expectedWorkouts = parseWorkoutCount(await get('/v1/workouts/count'));
        const folders = unique(await pages('/v1/routine_folders', 'routine_folders', 10, parseFolder));
        const routines = unique(await pages('/v1/routines', 'routines', 10, parseRoutine,
          read => progress?.({ stage: 'routines', read })));
        const readWorkouts = await pages('/v1/workouts', 'workouts', 10, parseWorkout,
          read => progress?.({ stage: 'workouts', read, total: expectedWorkouts }));
        if (readWorkouts.length !== expectedWorkouts) throw new HevyImportError('reading');
        const workouts = unique(readWorkouts.filter(item => item !== null));
        const allTemplates = unique(await pages('/v1/exercise_templates', 'exercise_templates', 100, parseTemplate,
          read => progress?.({ stage: 'exercises', read })));
        const templates = new Map(allTemplates.map(item => [item.id, item]));
        const usedIds = new Set([...routines, ...workouts].flatMap(item => item.exercises.map(exercise => exercise.templateId)));
        for (const id of usedIds) if (!templates.has(id)) {
          const template: ImportTemplate = parseTemplate(await get(`/v1/exercise_templates/${encodeURIComponent(id)}`));
          if (template.id !== id) throw new HevyImportError('reading');
          templates.set(id, template);
        }
        const folderIds = new Set(folders.map(folder => folder.id));
        if (routines.some(routine => routine.folderId !== null && !folderIds.has(routine.folderId))) throw new HevyImportError('reading');
        return { source: 'hevy', ...user, folders: folders.sort((a, b) => a.index - b.index), routines, workouts,
          templates: [...usedIds].map(id => templates.get(id)!), incompleteWorkouts: readWorkouts.length - workouts.length };
      } finally { key = null; }
    },
  };
}
