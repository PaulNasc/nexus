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
      return {
        version: '1.3.5',
        os: 'Windows',
        platform: 'win32',
        arch: 'x64',
        isPortable: true,
      };
    }

    return {
      version: '1.3.5',
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

    window.open(url, '_blank', 'noopener,noreferrer');
  }

  public async checkForUpdates(): Promise<void> {
    if (this.isElectron()) {
      const electronAPI = (window as unknown as { electronAPI?: { updater?: { checkForUpdates?: () => Promise<void> } } }).electronAPI;
      if (electronAPI?.updater?.checkForUpdates) {
        await electronAPI.updater.checkForUpdates();
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
    return [];
  }
}

export const desktopAdapter = new DesktopAdapter();
