import { useSettings } from './useSettings';
import { useAuth } from '../contexts/AuthContext';

export type StorageMode = 'cloud' | 'local' | 'hybrid';

interface StorageModeInfo {
  mode: StorageMode;
  useCloud: boolean;
  useLocal: boolean;
  isAuthenticated: boolean;
}

/**
 * Hook that determines the effective storage mode based on user settings
 * and authentication state.
 *
 * - cloud: read/write only from Supabase (requires auth)
 * - local: read/write only from MemoryDB (no auth needed)
 * - hybrid: write to both, read from Supabase if authenticated, fallback to local
 *
 * If the user chose 'cloud' but is not authenticated, falls back to 'local'.
 */
export const useStorageMode = (): StorageModeInfo => {
  const { settings } = useSettings();
  const { user, isOffline } = useAuth();

  const isAuthenticated = !!user && !isOffline;
  const configured = settings.storageMode || 'cloud';

  // If cloud or hybrid is selected but user is not authenticated, fallback to local
  let effective: StorageMode = configured;
  if ((configured === 'cloud' || configured === 'hybrid') && !isAuthenticated) {
    effective = 'local';
  }

  return {
    mode: effective,
    useCloud: effective === 'cloud' || effective === 'hybrid',
    useLocal: effective === 'local' || effective === 'hybrid',
    isAuthenticated,
  };
};

export default useStorageMode;
