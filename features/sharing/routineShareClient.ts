import { buildRoutineShareUrl, ROUTINE_SHARE_ID_PATTERN } from './splitTransport';
import { URL } from 'react-native-url-polyfill';
import { parseSharedSplitJson, SHARED_SPLIT_LIMITS, type PortableSplit } from './splitProtocol';

export const ROUTINE_SHARE_CLIENT_TIMEOUT_MS = 15_000;

// Reuse the existing server configuration; an override permits separate hosting.
export const routineShareBaseUrl = (): string | null =>
  (process.env.EXPO_PUBLIC_ROUTINE_SHARE_API_URL || process.env.EXPO_PUBLIC_ROUTINE_IMPORT_URL)?.replace(/\/+$/, '') ||
  (__DEV__ ? 'http://localhost:8080' : null);

export const routineSharePublicOrigin = (): string =>
  process.env.EXPO_PUBLIC_ROUTINE_SHARE_PUBLIC_ORIGIN || 'https://liftwithstack.com';

/** Upload only canonical protocol JSON; never surface server URLs/errors in UI. */
export async function createRoutineShare(payload: string, options: {
  fetch?: typeof fetch;
  baseUrl?: string | null;
  publicOrigin?: string;
  timeoutMs?: number;
} = {}): Promise<string> {
  const baseUrl = options.baseUrl === undefined ? routineShareBaseUrl() : options.baseUrl;
  if (!baseUrl) throw new Error('Couldn’t create a share link. Try again.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? ROUTINE_SHARE_CLIENT_TIMEOUT_MS);
  try {
    const origin = new URL(options.publicOrigin ?? routineSharePublicOrigin());
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') {
      throw new Error('Invalid public share origin.');
    }
    const response = await (options.fetch ?? fetch)(`${baseUrl}/v1/routine-shares`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.EXPO_PUBLIC_ROUTINE_IMPORT_CLIENT_KEY ? { 'x-stack-client-key': process.env.EXPO_PUBLIC_ROUTINE_IMPORT_CLIENT_KEY } : {}),
      },
      body: payload,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('Share creation failed.');
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || !('id' in body) || !('url' in body) ||
      typeof body.id !== 'string' || typeof body.url !== 'string') throw new Error('Invalid share response.');
    const url = buildRoutineShareUrl(body.id, origin.origin);
    // Fail closed if the backend's public-origin configuration disagrees.
    if (body.url !== url) throw new Error('Invalid public share URL.');
    return url;
  } catch {
    throw new Error(controller.signal.aborted ? 'Creating this link took too long. Try again.' :
      'Couldn’t create a share link. Try again.');
  } finally {
    clearTimeout(timer);
  }
}

export type SharedRoutineLoadReason = 'broken' | 'missing' | 'failed' | 'newer';
export class SharedRoutineLoadFailure extends Error {
  constructor(readonly reason: SharedRoutineLoadReason) {
    super({ broken: 'This routine link is broken.', missing: 'This routine is no longer available.',
      failed: 'Couldn’t load this routine. Try again.', newer: 'This routine needs a newer Stack. Update to open it.' }[reason]);
  }
}

export async function fetchRoutineShare(id: unknown, options: {
  signal?: AbortSignal; fetch?: typeof fetch; baseUrl?: string | null; timeoutMs?: number;
} = {}): Promise<PortableSplit> {
  if (typeof id !== 'string' || !ROUTINE_SHARE_ID_PATTERN.test(id)) throw new SharedRoutineLoadFailure('broken');
  const base = options.baseUrl === undefined ? routineShareBaseUrl() : options.baseUrl;
  if (!base) throw new SharedRoutineLoadFailure('failed');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  options.signal?.addEventListener('abort', cancel);
  if (options.signal?.aborted) cancel();
  const timer = setTimeout(cancel, options.timeoutMs ?? ROUTINE_SHARE_CLIENT_TIMEOUT_MS);
  try {
    if (controller.signal.aborted) throw new SharedRoutineLoadFailure('failed');
    const response = await (options.fetch ?? fetch)(`${base}/v1/routine-shares/${id}`, { signal: controller.signal });
    if (response.status === 404) throw new SharedRoutineLoadFailure('missing');
    if (response.status === 400) throw new SharedRoutineLoadFailure('broken');
    if (!response.ok) throw new SharedRoutineLoadFailure('failed');
    // The parser enforces UTF-8 bytes too; cap declared/decoded size first.
    if (Number(response.headers.get('content-length')) > SHARED_SPLIT_LIMITS.maxPayloadBytes) throw new SharedRoutineLoadFailure('broken');
    const raw = await response.text();
    if (controller.signal.aborted) throw new SharedRoutineLoadFailure('failed');
    const parsed = parseSharedSplitJson(raw);
    if (!parsed.ok) throw new SharedRoutineLoadFailure(parsed.error.code === 'unsupported_version' ? 'newer' : 'broken');
    return parsed.value;
  } catch (error) {
    if (error instanceof SharedRoutineLoadFailure) throw error;
    throw new SharedRoutineLoadFailure('failed');
  } finally {
    clearTimeout(timer); options.signal?.removeEventListener('abort', cancel);
  }
}
