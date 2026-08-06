import { desktopAdapter } from './desktopAdapter';

let lastTauriDroppedPaths: string[] = [];

/**
 * Gets the most recent absolute file paths captured by Tauri's native OS drag-and-drop handler.
 */
export const getTauriDroppedPaths = (): string[] => {
  return lastTauriDroppedPaths;
};

/**
 * Clears the stored Tauri dropped paths cache.
 */
export const clearTauriDroppedPaths = (): void => {
  lastTauriDroppedPaths = [];
};

/**
 * Resolves absolute file paths from an HTML5 DragEvent or HTML5 File list.
 * Fallbacks to Tauri's native drag-and-drop listener when file.path is undefined (WebView2 behavior).
 */
export const resolveDroppedFilePaths = (files: File[]): string[] => {
  const tauriPaths = getTauriDroppedPaths();
  
  const resolved = files.map((file, idx) => {
    // Electron or standard file path
    if (file.path) return file.path;
    // Tauri native path fallback
    if (tauriPaths[idx]) return tauriPaths[idx];
    if (files.length === 1 && tauriPaths.length > 0) return tauriPaths[0];
    return null;
  }).filter(Boolean) as string[];

  return resolved.length > 0 ? resolved : tauriPaths;
};

// Initialize listener if running inside Tauri
if (typeof window !== 'undefined') {
  const initTauriDragDrop = async () => {
    if (!desktopAdapter.isTauri()) return;
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      await appWindow.onDragDropEvent((event) => {
        const payload = event.payload;
        if (payload.type === 'drop') {
          if (payload.paths && payload.paths.length > 0) {
            lastTauriDroppedPaths = payload.paths;
            (window as unknown as { __TAURI_DROPPED_PATHS__?: string[] }).__TAURI_DROPPED_PATHS__ = payload.paths;
            window.dispatchEvent(new CustomEvent('tauriNativeFileDrop', { detail: { paths: payload.paths } }));
          }
        } else if (payload.type === 'enter') {
          if (payload.paths && payload.paths.length > 0) {
            lastTauriDroppedPaths = payload.paths;
            (window as unknown as { __TAURI_DROPPED_PATHS__?: string[] }).__TAURI_DROPPED_PATHS__ = payload.paths;
          }
        } else if (payload.type === 'leave') {
          setTimeout(() => {
            lastTauriDroppedPaths = [];
          }, 1000);
        }
      });
    } catch (err) {
      console.warn('[tauriDragDrop] Failed to initialize Tauri drag-drop listener:', err);
    }
  };

  void initTauriDragDrop();
}
