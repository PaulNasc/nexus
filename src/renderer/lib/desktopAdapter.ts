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

  private cachedSystemInfo: SystemInfo | null = null;
  private lastSizeKey: string = '';

  public isElectron(): boolean {
    return this.runtime === 'electron';
  }

  public async getSystemInfo(): Promise<SystemInfo> {
    if (this.cachedSystemInfo) {
      return this.cachedSystemInfo;
    }

    let info: SystemInfo;
    if (this.isElectron()) {
      const electronAPI = (window as unknown as { electronAPI?: { systemInfo?: { getInfo?: () => Promise<SystemInfo> } } }).electronAPI;
      if (electronAPI?.systemInfo?.getInfo) {
        info = await electronAPI.systemInfo.getInfo();
        this.cachedSystemInfo = info;
        return info;
      }
    }

    if (this.isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        info = await invoke<SystemInfo>('get_system_info');
        this.cachedSystemInfo = info;
        return info;
      } catch {
        info = {
          version: '1.4.1',
          os: 'Windows (Tauri)',
          platform: 'win32',
          arch: 'x64',
          isPortable: true,
        };
        this.cachedSystemInfo = info;
        return info;
      }
    }

    info = {
      version: '1.4.1',
      os: 'Web Browser',
      platform: 'web',
      arch: 'unknown',
      isPortable: false,
    };
    this.cachedSystemInfo = info;
    return info;
  }

  public async showNotification(title: string, body?: string): Promise<void> {
    if (this.isTauri()) {
      try {
        const { sendNotification, isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification');
        let permissionGranted = await isPermissionGranted();
        if (!permissionGranted) {
          const permission = await requestPermission();
          permissionGranted = permission === 'granted';
        }
        if (permissionGranted) {
          sendNotification({
            title: title || 'Nexus',
            body: body || '',
          });
          return;
        }
      } catch (err) {
        console.warn('Tauri notification error:', err);
      }
    }

    if (this.isElectron()) {
      const electronAPI = (window as unknown as { electronAPI?: { notifications?: { show?: (t: string, b?: string) => Promise<void> } } }).electronAPI;
      if (electronAPI?.notifications?.show) {
        await electronAPI.notifications.show(title, body);
        return;
      }
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title || 'Nexus', { body });
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

  private tauriUpdateObj: unknown = null;
  private updateStatusListeners: Array<(status: UpdateStatus) => void> = [];

  public onUpdateStatus(listener: (status: UpdateStatus) => void): () => void {
    this.updateStatusListeners.push(listener);
    return () => {
      this.updateStatusListeners = this.updateStatusListeners.filter((l) => l !== listener);
    };
  }

  private notifyUpdateStatus(status: UpdateStatus): void {
    this.updateStatusListeners.forEach((listener) => {
      try {
        listener(status);
      } catch {
        // Ignore listener errors
      }
    });
  }

  public async checkForUpdates(): Promise<UpdateStatus | void> {
    if (this.isElectron()) {
      const electronAPI = (window as unknown as { electronAPI?: { updater?: { checkForUpdates?: () => Promise<UpdateStatus> } } }).electronAPI;
      if (electronAPI?.updater?.checkForUpdates) {
        return await electronAPI.updater.checkForUpdates();
      }
    }

    if (this.isTauri()) {
      try {
        this.notifyUpdateStatus({ state: 'checking' });
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = await check();
        if (update && update.available) {
          this.tauriUpdateObj = update;
          const status: UpdateStatus = {
            state: 'available',
            version: update.version,
            releaseNotes: update.body || 'Nova versão do Nexus disponível para atualização.',
          };
          this.notifyUpdateStatus(status);
          return status;
        } else {
          this.tauriUpdateObj = null;
          const status: UpdateStatus = { state: 'not-available' };
          this.notifyUpdateStatus(status);
          return status;
        }
      } catch (err) {
        console.warn('Falha na verificação de atualização via Tauri:', err);
        const status: UpdateStatus = {
          state: 'error',
          error: err instanceof Error ? err.message : 'Falha ao verificar atualização.',
        };
        this.notifyUpdateStatus(status);
        return status;
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

    if (this.isTauri() && this.tauriUpdateObj) {
      try {
        this.notifyUpdateStatus({ state: 'downloading' });
        const update = this.tauriUpdateObj as { downloadAndInstall: (cb?: (p: unknown) => void) => Promise<void> };
        await update.downloadAndInstall();
        this.notifyUpdateStatus({ state: 'downloaded' });
        const { relaunch } = await import('@tauri-apps/plugin-process');
        await relaunch();
      } catch (err) {
        console.error('Falha ao instalar atualização via Tauri:', err);
        this.notifyUpdateStatus({
          state: 'error',
          error: err instanceof Error ? err.message : 'Erro ao instalar atualização.',
        });
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
    const key = `${width}x${height}_${center}`;
    if (this.lastSizeKey === key) return;
    this.lastSizeKey = key;

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

  public async clearVideoCache(): Promise<void> {
    if (this.isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('clear_video_cache');
      } catch (err) {
        console.warn('Tauri clear_video_cache error:', err);
      }
    }
    if (this.isElectron()) {
      const electronAPI = (window as unknown as { electronAPI?: { video?: { clearCache?: () => Promise<void> } } }).electronAPI;
      if (electronAPI?.video?.clearCache) {
        await electronAPI.video.clearCache();
      }
    }
  }
}

export const desktopAdapter = new DesktopAdapter();
