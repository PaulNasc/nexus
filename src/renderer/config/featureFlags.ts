export const NOTES_ONLY_RELEASE = true;

export interface ModuleVisibility {
  showDashboard: boolean;
  showTimer: boolean;
  showReports: boolean;
  showNotes: boolean;
}

export const getEnforcedModuleVisibility = (input: ModuleVisibility): ModuleVisibility => {
  if (!NOTES_ONLY_RELEASE) return input;
  return {
    showDashboard: false,
    showTimer: false,
    showReports: false,
    showNotes: true,
  };
};

export const isModuleLocked = (key: keyof ModuleVisibility): boolean => {
  if (!NOTES_ONLY_RELEASE) return false;
  return key !== 'showNotes';
};
