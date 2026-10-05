import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { uuid } from 'expo-modules-core';
import { parseSharedSplit, ROUTINE_SHARE_ID_PATTERN } from '@/features/sharing/splitTransport';

export const SHARED_ROUTINE_HANDOFF_KEY = 'stack-shared-routine-handoff-v1';
export type SharedRoutineHandoff = ({ token: string; shareId?: never } | { shareId: string; token?: never }) &
  { saved: { splitId: number; name: string } | null; attemptId?: string };
export const useSharedRoutineHandoff = create<{ ready: boolean; pending: SharedRoutineHandoff | null; error: string | null }>(() => ({ ready: false, pending: null, error: null }));
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const next = queue.then(operation).catch(error => { useSharedRoutineHandoff.setState({ error: 'Couldn’t keep your shared routine. Try again.' }); throw error; });
  queue = next.catch(() => {}); return next;
}
export function parseSharedRoutineHandoff(raw: string | null): SharedRoutineHandoff | null {
  if (!raw) return null;
  const value = JSON.parse(raw);
  const p = value?.pending;
  const legacy = p && typeof p.token === 'string' && p.shareId === undefined && parseSharedSplit(p.token).ok;
  const remote = p && typeof p.shareId === 'string' && p.token === undefined && ROUTINE_SHARE_ID_PATTERN.test(p.shareId) && p.saved === null && p.attemptId === undefined;
  if (value?.version !== 1 || !p || (!legacy && !remote) ||
    (p.attemptId !== undefined && (typeof p.attemptId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.attemptId))) ||
    !(p.saved === null || p.saved && Number.isSafeInteger(p.saved.splitId) && p.saved.splitId > 0 && typeof p.saved.name === 'string')) throw Error('Couldn’t read your shared routine. Try again.');
  return remote ? { shareId: p.shareId, saved: null } : { token: p.token, saved: p.saved, ...(p.attemptId ? { attemptId: p.attemptId } : {}) };
}
async function readIfNeeded() {
  if (useSharedRoutineHandoff.getState().ready) return;
  const pending = parseSharedRoutineHandoff(await AsyncStorage.getItem(SHARED_ROUTINE_HANDOFF_KEY));
  useSharedRoutineHandoff.setState({ pending, ready: true, error: null });
}
export const loadSharedRoutineHandoff = () => enqueue(readIfNeeded);
/** ID-only context shares the existing serialized, durable first-run handoff.
 * The edit/save receipt still belongs exclusively to the Block 2 draft slot. */
export const rememberSharedRoutineId = (shareId: string) => enqueue(async () => {
  await readIfNeeded();
  const pending: SharedRoutineHandoff = { shareId, saved: null };
  const raw = JSON.stringify({ version: 1, pending }); parseSharedRoutineHandoff(raw);
  await AsyncStorage.setItem(SHARED_ROUTINE_HANDOFF_KEY, raw);
  useSharedRoutineHandoff.setState({ pending, ready: true, error: null });
});
export const rememberSharedRoutine = (token: string, saved?: SharedRoutineHandoff['saved']) => enqueue(async () => {
  await readIfNeeded();
  const previous = useSharedRoutineHandoff.getState().pending;
  const pending: SharedRoutineHandoff = { token, saved: saved === undefined && previous?.token === token ? previous.saved : saved ?? null,
    ...(previous?.token === token && previous.attemptId ? { attemptId: previous.attemptId } : {}) };
  const raw = JSON.stringify({ version: 1, pending }); parseSharedRoutineHandoff(raw);
  await AsyncStorage.setItem(SHARED_ROUTINE_HANDOFF_KEY, raw);
  useSharedRoutineHandoff.setState({ pending, ready: true, error: null });
});
/** Persist an attempt before importing. The matching SQLite receipt then makes
 * a committed import recoverable even if its saved-ID handoff write never runs.
 * Clearing the handoff makes the next deliberate import a new attempt. */
export const prepareSharedRoutineImport = (token: string): Promise<string> => enqueue(async () => {
  await readIfNeeded();
  const previous = useSharedRoutineHandoff.getState().pending;
  const pending: SharedRoutineHandoff = previous?.token === token
    ? { ...previous, attemptId: previous.attemptId ?? uuid.v4() }
    : { token, saved: null, attemptId: uuid.v4() };
  const raw = JSON.stringify({ version: 1, pending }); parseSharedRoutineHandoff(raw);
  await AsyncStorage.setItem(SHARED_ROUTINE_HANDOFF_KEY, raw);
  useSharedRoutineHandoff.setState({ pending, ready: true, error: null });
  return pending.attemptId!;
});
/** An exit from an older link must never clear a newer incoming routine. */
export const clearSharedRoutineHandoff = (ownedToken?: string) => enqueue(async () => {
  if (ownedToken) await readIfNeeded();
  const pending = useSharedRoutineHandoff.getState().pending;
  if (ownedToken && (pending?.token ?? pending?.shareId) !== ownedToken) return;
  await AsyncStorage.removeItem(SHARED_ROUTINE_HANDOFF_KEY);
  useSharedRoutineHandoff.setState({ pending: null, ready: true, error: null });
});
export const onboardingDestination = () => {
  const pending = useSharedRoutineHandoff.getState().pending;
  return pending?.shareId ? { pathname: '/shared-routine' as const, params: { id: pending.shareId } } :
    pending?.token ? { pathname: '/import-split' as const, params: { d: pending.token } } : '/(tabs)' as const;
};
