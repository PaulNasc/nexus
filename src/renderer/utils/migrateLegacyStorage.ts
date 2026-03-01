const STORAGE_KEY_MAPPINGS: Array<[legacy: string, current: string]> = [
  ['krigzis-user-settings', 'nexus-user-settings'],
  ['krigzis-system-info', 'nexus-system-info'],
  ['krigzis-session-info', 'nexus-session-info'],
  ['krigzis-timer-settings', 'nexus-timer-settings'],
  ['krigzis-timer-stats', 'nexus-timer-stats'],
  ['krigzis-current-session', 'nexus-current-session'],
  ['krigzis-language', 'nexus-language'],
  ['krigzis-theme', 'nexus-theme'],
];

export const migrateLegacyStorageKeys = (): void => {
  try {
    for (const [legacyKey, currentKey] of STORAGE_KEY_MAPPINGS) {
      const legacyValue = localStorage.getItem(legacyKey);
      if (legacyValue === null) continue;

      if (localStorage.getItem(currentKey) === null) {
        localStorage.setItem(currentKey, legacyValue);
      }

      localStorage.removeItem(legacyKey);
    }

    const staleLegacyKeys = Object.keys(localStorage).filter((key) => key.startsWith('krigzis-'));
    staleLegacyKeys.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Failed to migrate legacy storage keys:', error);
  }
};
