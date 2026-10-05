import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { ThreeDayStructure } from './programPreferences';

export const ONBOARDING_DRAFT_KEY = 'stack-onboarding-draft-v1';
export type OnboardingStep = 'welcome' | 'name' | 'experience' | 'starting-point' | 'bring-workouts' | 'frequency' | 'split-choice' | 'program-preview';
export type StartingChoice = 'track' | 'explore' | 'stack';
export const NICKNAME_MAX_LENGTH = 40;
export type OnboardingDraft = {
  step: OnboardingStep;
  name: string;
  choice: StartingChoice | null;
  frequency: number | null;
  structure: ThreeDayStructure;
  /** Only the original onboarding uses experience to choose its three-day structure. */
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
};
export const emptyOnboardingDraft = (): OnboardingDraft => ({
  step: 'welcome', name: '', choice: null, frequency: null, structure: 'full-body',
});

export function parseOnboardingDraft(raw: string | null): OnboardingDraft {
  if (!raw) return emptyOnboardingDraft();
  const value = JSON.parse(raw);
  const d = value?.draft;
  // Drafts written before the name step have no name; they resume with an empty one.
  const name = d?.name ?? '';
  if (value?.version !== 1 || !d ||
      !['welcome', 'name', 'experience', 'starting-point', 'bring-workouts', 'frequency', 'split-choice', 'program-preview'].includes(d.step) ||
      typeof name !== 'string' || name.length > NICKNAME_MAX_LENGTH ||
      ![null, 'track', 'explore', 'stack'].includes(d.choice) ||
      !(d.frequency === null || Number.isInteger(d.frequency) && d.frequency >= 1 && d.frequency <= 6) ||
      !['full-body', 'push-pull-legs'].includes(d.structure) ||
      !(d.experienceLevel === undefined || ['beginner', 'intermediate', 'advanced'].includes(d.experienceLevel))) throw Error('Could not read your setup. Try again.');
  return { step: d.step, name, choice: d.choice, frequency: d.frequency, structure: d.structure,
    ...(d.experienceLevel === undefined ? {} : { experienceLevel: d.experienceLevel }) };
}

/** Independent serialized storage per setup context. */
export function createSetupDraftStorage(storageKey: string) {
  const useDraft = create<{ draft: OnboardingDraft; ready: boolean; error: string | null }>(() => ({
    draft: emptyOnboardingDraft(), ready: false, error: null,
  }));

  // Serialize reads, writes and Reset so an earlier pending write cannot revive a cleared draft.
  let pending: Promise<unknown> = Promise.resolve();
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = pending.then(operation);
    pending = next.catch(() => {});
    return next;
  }
  async function readIfNeeded() {
    if (useDraft.getState().ready) return;
    const draft = parseOnboardingDraft(await AsyncStorage.getItem(storageKey));
    useDraft.setState({ draft, ready: true, error: null });
  }
  function report(error: unknown): never {
    const message = error instanceof Error ? error.message : 'Could not save your setup. Try again.';
    useDraft.setState({ error: message });
    throw error;
  }
  function load(): Promise<void> {
    return enqueue(async () => { try { await readIfNeeded(); } catch (error) { report(error); } });
  }
  function save(update: Partial<OnboardingDraft>): Promise<void> {
    return enqueue(async () => {
      try {
        await readIfNeeded();
        const next = { ...useDraft.getState().draft, ...update };
        const raw = JSON.stringify({ version: 1, draft: next });
        parseOnboardingDraft(raw);
        await AsyncStorage.setItem(storageKey, raw);
        useDraft.setState({ draft: next, error: null });
      } catch (error) { report(error); }
    });
  }
  function clear(): Promise<void> {
    return enqueue(async () => {
      try {
        await AsyncStorage.removeItem(storageKey);
        useDraft.setState({ draft: emptyOnboardingDraft(), ready: true, error: null });
      } catch (error) { report(error); }
    });
  }

  return { useDraft, load, save, clear };
}

const onboarding = createSetupDraftStorage(ONBOARDING_DRAFT_KEY);
export const useOnboardingDraft = onboarding.useDraft;
export const loadOnboardingDraft = onboarding.load;
export const saveOnboardingDraft = onboarding.save;
export const clearOnboardingDraft = onboarding.clear;
