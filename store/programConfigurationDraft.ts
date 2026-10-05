import { createSetupDraftStorage } from './onboardingDraft';

export const PROGRAM_CONFIGURATION_DRAFT_KEY = 'stack-program-configuration-v1';
const configuration = createSetupDraftStorage(PROGRAM_CONFIGURATION_DRAFT_KEY);
export const useProgramConfigurationDraft = configuration.useDraft;
export const loadProgramConfigurationDraft = configuration.load;
export const saveProgramConfigurationDraft = configuration.save;
export const clearProgramConfigurationDraft = configuration.clear;
