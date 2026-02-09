/**
 * Auto-Updater Module
 * Wraps electron-updater (autoUpdater) for seamless GitHub Releases integration.
 * Emits IPC events to renderer for toast notifications and Settings UI.
 */

import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';
import { BrowserWindow, ipcMain, app } from 'electron';
import { logger } from '../logging/logger';

export interface UpdateStatus {
  state: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  progress?: {
    percent: number;
    bytesPerSecond: number;
    transferred: number;
    total: number;
  };
  releaseNotes?: string;
  error?: string;
}

export class AppUpdater {
  private static instance: AppUpdater;
  private mainWindow: BrowserWindow | null = null;
  private status: UpdateStatus = { state: 'idle' };

  private constructor() {
    // Configure electron-updater
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowDowngrade = false;

    // In dev mode, allow update checking against latest.yml even without code signing
    if (!app.isPackaged) {
      autoUpdater.forceDevUpdateConfig = true;
    }

    this.setupListeners();
    this.setupIpcHandlers();

    logger.info('AppUpdater initialized', 'updater', {
      version: app.getVersion(),
      isPackaged: app.isPackaged,
    });
  }

  public static getInstance(): AppUpdater {
    if (!AppUpdater.instance) {
      AppUpdater.instance = new AppUpdater();
    }
    return AppUpdater.instance;
  }

  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /** Check for updates (called on startup + manually) */
  public checkForUpdates(): void {
    if (this.status.state === 'checking' || this.status.state === 'downloading') {
      return;
    }
    this.setStatus({ state: 'checking' });
    autoUpdater.checkForUpdates().catch((err) => {
      logger.error('Update check failed', 'updater', {
        error: err instanceof Error ? err.message : String(err),
      });
      this.setStatus({ state: 'error', error: err instanceof Error ? err.message : String(err) });
    });
  }

  /** Download the available update */
  public downloadUpdate(): void {
    if (this.status.state !== 'available') return;
    this.setStatus({ state: 'downloading', version: this.status.version, releaseNotes: this.status.releaseNotes });
    autoUpdater.downloadUpdate().catch((err) => {
      logger.error('Update download failed', 'updater', {
        error: err instanceof Error ? err.message : String(err),
      });
      this.setStatus({ state: 'error', error: err instanceof Error ? err.message : String(err) });
    });
  }

  /** Quit and install the downloaded update */
  public quitAndInstall(): void {
    autoUpdater.quitAndInstall(false, true);
  }

  /** Get current status */
  public getStatus(): UpdateStatus {
    return { ...this.status };
  }

  // ─── electron-updater event listeners ────────────────────────────

  private setupListeners(): void {
    autoUpdater.on('checking-for-update', () => {
      logger.info('Checking for update...', 'updater');
      this.setStatus({ state: 'checking' });
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      logger.info('Update available', 'updater', {
        version: info.version,
        releaseDate: info.releaseDate,
      });
      const notes = typeof info.releaseNotes === 'string'
        ? info.releaseNotes
        : Array.isArray(info.releaseNotes)
          ? info.releaseNotes.map((n) => (typeof n === 'string' ? n : n.note)).join('\n')
          : undefined;
      this.setStatus({ state: 'available', version: info.version, releaseNotes: notes });
    });

    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      logger.info('No update available', 'updater', { version: info.version });
      this.setStatus({ state: 'not-available', version: info.version });
    });

    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
      this.setStatus({
        state: 'downloading',
        version: this.status.version,
        releaseNotes: this.status.releaseNotes,
        progress: {
          percent: Math.round(progress.percent),
          bytesPerSecond: progress.bytesPerSecond,
          transferred: progress.transferred,
          total: progress.total,
        },
      });
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      logger.info('Update downloaded', 'updater', { version: info.version });
      const notes = typeof info.releaseNotes === 'string'
        ? info.releaseNotes
        : Array.isArray(info.releaseNotes)
          ? info.releaseNotes.map((n) => (typeof n === 'string' ? n : n.note)).join('\n')
          : undefined;
      this.setStatus({ state: 'downloaded', version: info.version, releaseNotes: notes });
    });

    autoUpdater.on('error', (err: Error) => {
      logger.error('Auto-updater error', 'updater', { error: err.message });

      // Friendly messages for common errors
      let friendlyMsg = err.message;
      if (err.message.includes('ENOENT') && err.message.includes('dev-app-update.yml')) {
        friendlyMsg = 'Verificação de atualizações não disponível em modo de desenvolvimento.';
      } else if (err.message.includes('HttpError') || err.message.includes('net::')) {
        friendlyMsg = 'Sem conexão com o servidor de atualizações. Verifique sua internet.';
      } else if (err.message.includes('404') || err.message.includes('No published versions')) {
        friendlyMsg = 'Nenhuma release publicada encontrada. A versão atual é a mais recente.';
      }

      this.setStatus({ state: 'error', error: friendlyMsg });
    });
  }

  // ─── IPC handlers ────────────────────────────────────────────────

  private setupIpcHandlers(): void {
    ipcMain.handle('updater:getStatus', () => {
      return this.getStatus();
    });

    ipcMain.handle('updater:checkForUpdates', () => {
      this.checkForUpdates();
      return this.getStatus();
    });

    ipcMain.handle('updater:downloadUpdate', () => {
      this.downloadUpdate();
      return this.getStatus();
    });

    ipcMain.handle('updater:quitAndInstall', () => {
      this.quitAndInstall();
    });

    ipcMain.handle('updater:getVersion', () => {
      return app.getVersion();
    });
  }

  // ─── Internal helpers ────────────────────────────────────────────

  private setStatus(status: UpdateStatus): void {
    this.status = status;
    this.sendToRenderer('updater:status', status);
  }

  private sendToRenderer(channel: string, data: unknown): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }
}

export default AppUpdater;
