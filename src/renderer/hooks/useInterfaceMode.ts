import { useCallback } from 'react';
import { useSettings } from './useSettings';

export type InterfaceMode = 'simplified' | 'zen';

export interface UseInterfaceModeReturn {
  mode: InterfaceMode;
  isZen: boolean;
  isSimplified: boolean;
  setMode: (mode: InterfaceMode) => Promise<void>;
  toggleMode: () => Promise<void>;
}

/**
 * Controls the global interface mode (simplified or zen).
 * Persists via useSettings → Supabase, applies immediately on change.
 */
export function useInterfaceMode(): UseInterfaceModeReturn {
  const { settings, updateSettings } = useSettings();
  const mode: InterfaceMode = settings.interfaceMode ?? 'simplified';

  const setMode = useCallback(
    async (newMode: InterfaceMode) => {
      await updateSettings({ interfaceMode: newMode });
    },
    [updateSettings]
  );

  const toggleMode = useCallback(async () => {
    await setMode(mode === 'zen' ? 'simplified' : 'zen');
  }, [mode, setMode]);

  return {
    mode,
    isZen: mode === 'zen',
    isSimplified: mode === 'simplified',
    setMode,
    toggleMode,
  };
}
