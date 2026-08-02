/**
 * DesktopAdapter - Unified abstraction layer for Desktop System APIs.
 * Decouples the React frontend from Electron and Tauri specifics.
 * Provides runtime detection: Tauri v2 -> Electron -> Web Fallback.
 */

export interface SystemInfo {
  version: string;
  os: string;
  platform: string;
  arch: string;
  isPortable: boolean;
}

export interface UpdateStatus {
  state: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  releaseNotes?: string;
  error?: string;
  isPortable?: boolean;
}

export interface IDesktopAdapter {
  readonly runtime: 'tauri' | 'electron' | 'web';
  isTauri(): boolean;
  isElectron(): boolean;
  getSystemInfo(): Promise<SystemInfo>;
  showNotification(title: string, body?: string): Promise<void>;
  openExternal(url: string): Promise<void>;
  checkForUpdates(): Promise<void>;
  applyUpdate(): Promise<void>;
  getLogs(filter?: { level?: string; category?: string; limit?: number }): Promise<unknown[]>;
  setWindowSize(width: number, height: number, center?: boolean): Promise<void>;
  fetchBlob(url: string, init?: RequestInit): Promise<Blob>;
}

class DesktopAdapter implements IDesktopAdapter {
  public get runtime(): 'tauri' | 'electron' | 'web' {
    if (typeof window !== 'undefined' && Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown; __TAURI__?: unknown }).__TAURI_INTERNALS__ || (window as unknown as { __TAURI__?: unknown }).__TAURI__)) {
      return 'tauri';
    }
    if (typeof window !== 'undefined' && Boolean((window as unknown as { electronAPI?: unknown }).electronAPI)) {
      return 'electron';
    }
    return 'web';
  }

  public isTauri(): boolean {
    return this.runtime === 'tauri';
  }

  public isElectron(): boolean {
    return this.runtime === 'electron';
  }

  public async getSystemInfo(): Promise<SystemInfo> {
    if (this.isElectron()) {
      const electronAPI = (window as unknown as { electronAPI?: { systemInfo?: { getInfo?: () => Promise<SystemInfo> } } }).electronAPI;
      if (electronAPI?.systemInfo?.getInfo) {
        return await electronAPI.systemInfo.getInfo();
      }
    }

    if (this.isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<SystemInfo>('get_system_info');
      } catch {
        return {
          version: '1.4.0',
          os: 'Windows (Tauri)',
          platform: 'win32',
          arch: 'x64',
          isPortable: true,
        };
      }
    }

    return {
      version: '1.4.0',
      os: 'Web Browser',
      platform: 'web',
      arch: 'unknown',
      isPortable: false,
    };
  }

  public async showNotification(title: string, body?: string): Promise<void> {
    if (this.isElectron()) {
      const electronAPI = (window as unknown as { electronAPI?: { notifications?: { show?: (t: string, b?: string) => Promise<void> } } }).electronAPI;
      if (electronAPI?.notifications?.show) {
        await electronAPI.notifications.show(title, body);
        return;
      }
    }

    if (this.isTauri()) {
      try {
        const { sendNotification } = await import('@tauri-apps/plugin-notification');
        sendNotification({ title, body: body || '' });
        return;
      } catch {
        // Fallback to browser Notification if plugin not active
      }
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  }

  public async openExternal(url: string): Promise<void> {
    if (this.isElectron()) {
      const electronAPI = (window as unknown as { electronAPI?: { openExternal?: (u: string) => Promise<void> } }).electronAPI;
      if (electronAPI?.openExternal) {
        await electronAPI.openExternal(url);
        return;
      }
    }

    if (this.isTauri()) {
      try {
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(url);
        return;
      } catch {
        // Fallback
      }
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  }

  public async checkForUpdates(): Promise<void> {
    if (this.isElectron()) {
      const electronAPI = (window as unknown as { electronAPI?: { updater?: { checkForUpdates?: () => Promise<void> } } }).electronAPI;
      if (electronAPI?.updater?.checkForUpdates) {
        await electronAPI.updater.checkForUpdates();
      }
    }

    if (this.isTauri()) {
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        await check();
      } catch {
        // Fallback
      }
    }
  }

  public async applyUpdate(): Promise<void> {
    if (this.isElectron()) {
      const electronAPI = (window as unknown as { electronAPI?: { updater?: { quitAndInstall?: () => Promise<void> } } }).electronAPI;
      if (electronAPI?.updater?.quitAndInstall) {
        await electronAPI.updater.quitAndInstall();
      }
    }
  }

  public async getLogs(filter?: { level?: string; category?: string; limit?: number }): Promise<unknown[]> {
    if (this.isElectron()) {
      const electronAPI = (window as unknown as { electronAPI?: { logging?: { getLogs?: (f?: unknown) => Promise<unknown[]> } } }).electronAPI;
      if (electronAPI?.logging?.getLogs) {
        return await electronAPI.logging.getLogs(filter);
      }
    }

    if (this.isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<unknown[]>('get_logs', { limit: filter?.limit || 100 });
      } catch {
        return [];
      }
    }

    return [];
  }

  public async setWindowSize(width: number, height: number, center = true): Promise<void> {
    if (this.isElectron()) {
      const electronAPI = (window as unknown as { electronAPI?: { setWindowSize?: (w: number, h: number, c?: boolean) => Promise<void> } }).electronAPI;
      if (electronAPI?.setWindowSize) {
        await electronAPI.setWindowSize(width, height, center);
        return;
      }
    }

    if (this.isTauri()) {
      try {
        const { getCurrentWindow, LogicalSize } = await import('@tauri-apps/api/window');
        const appWindow = getCurrentWindow();
        await appWindow.setResizable(true);
        await appWindow.setSize(new LogicalSize(width, height));
        if (center) {
          await appWindow.center();
        }
      } catch (err) {
        console.warn('Tauri setWindowSize failed:', err);
      }
    }
  }

  public async fetchBlob(url: string, init?: RequestInit): Promise<Blob> {
    if (this.isTauri()) {
      try {
        const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
        const res = await tauriFetch(url, {
          method: init?.method || 'GET',
          headers: init?.headers as Record<string, string>,
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const arrayBuffer = await res.arrayBuffer();
        const contentType = res.headers.get('content-type') || 'application/octet-stream';
        return new Blob([arrayBuffer], { type: contentType });
      } catch (err) {
        console.warn('Tauri native fetch failed, falling back to standard fetch', err);
      }
    }

    const downloadResponse = await fetch(url, init);
    if (!downloadResponse.ok) {
      throw new Error(`HTTP ${downloadResponse.status}`);
    }
    return await downloadResponse.blob();
  }
}

export const desktopAdapter = new DesktopAdapter();
