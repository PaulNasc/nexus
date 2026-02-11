/**
 * Auto-Updater Module
 * Wraps electron-updater (autoUpdater) for seamless GitHub Releases integration.
 * Supports both NSIS-installed and portable modes.
 * - Installed: uses electron-updater's native NSIS flow.
 * - Portable: downloads the portable .exe from GitHub Releases, swaps the binary, and restarts.
 * Emits IPC events to renderer for toast notifications and Settings UI.
 */

import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';
import { BrowserWindow, ipcMain, app } from 'electron';
import { logger } from '../logging/logger';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import { IncomingMessage } from 'http';
import { spawn } from 'child_process';

// GitHub repo info — must match package.json build.publish
const GH_OWNER = 'PaulNasc';
const GH_REPO = 'nexus';

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
  isPortable?: boolean;
}

export class AppUpdater {
  private static instance: AppUpdater;
  private mainWindow: BrowserWindow | null = null;
  private status: UpdateStatus = { state: 'idle' };
  private _isPortable: boolean;
  private portableDownloadPath: string | null = null;

  private constructor() {
    this._isPortable = this.detectPortableMode();

    // Only configure electron-updater for NSIS-installed mode
    // In portable mode, we skip it entirely to prevent installer downloads
    if (!this._isPortable) {
      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = true;
      autoUpdater.allowDowngrade = false;

      // In dev mode, allow update checking against latest.yml even without code signing
      if (!app.isPackaged) {
        autoUpdater.forceDevUpdateConfig = true;
      }

      this.setupListeners();
    }

    this.setupIpcHandlers();

    logger.info('AppUpdater initialized', 'updater', {
      version: app.getVersion(),
      isPackaged: app.isPackaged,
      isPortable: this._isPortable,
      exePath: app.getPath('exe'),
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

  public get isPortable(): boolean {
    return this._isPortable;
  }

  // ─── Portable detection ────────────────────────────────────────

  /**
   * Detect if the app is running in portable mode.
   * NSIS installs place an `app-update.yml` in the resources directory
   * and install to a path like `AppData\Local\Programs\nexus`.
   * Portable mode has none of these.
   */
  private detectPortableMode(): boolean {
    if (!app.isPackaged) return false;

    const exePath = app.getPath('exe');
    const exeDir = path.dirname(exePath);

    // Check 1: NSIS installs have an `app-update.yml` in the resources dir
    const resourcesDir = path.join(exeDir, 'resources');
    const appUpdateYml = path.join(resourcesDir, 'app-update.yml');
    if (fs.existsSync(appUpdateYml)) {
      return false; // NSIS installed
    }

    // Check 2: NSIS installs typically live under AppData\Local\Programs
    const localAppData = process.env.LOCALAPPDATA || '';
    if (localAppData && exePath.toLowerCase().startsWith(localAppData.toLowerCase())) {
      return false; // Likely NSIS installed
    }

    return true; // Portable
  }

  // ─── Check for updates (works for both modes) ──────────────────

  /** Check for updates (called on startup + manually) */
  public checkForUpdates(): void {
    if (this.status.state === 'checking' || this.status.state === 'downloading') {
      return;
    }

    if (this._isPortable) {
      this.checkForUpdatesPortable();
    } else {
      this.setStatus({ state: 'checking' });
      autoUpdater.checkForUpdates().catch((err) => {
        logger.error('Update check failed', 'updater', {
          error: err instanceof Error ? err.message : String(err),
        });
        this.setStatus({ state: 'error', error: err instanceof Error ? err.message : String(err) });
      });
    }
  }

  // ─── Portable: check via GitHub API ────────────────────────────

  private checkForUpdatesPortable(): void {
    this.setStatus({ state: 'checking', isPortable: true });

    const apiUrl = `/repos/${GH_OWNER}/${GH_REPO}/releases/latest`;
    const options = {
      hostname: 'api.github.com',
      path: apiUrl,
      method: 'GET',
      headers: {
        'User-Agent': `Nexus/${app.getVersion()}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    };

    const req = https.request(options, (res: IncomingMessage) => {
      let body = '';
      res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            throw new Error(`GitHub API returned ${res.statusCode}`);
          }
          const release = JSON.parse(body);
          const latestVersion = (release.tag_name || '').replace(/^v/, '');
          const currentVersion = app.getVersion();

          if (this.isNewerVersion(latestVersion, currentVersion)) {
            const notes = release.body || '';
            logger.info('Portable update available', 'updater', { latestVersion, currentVersion });
            this.setStatus({
              state: 'available',
              version: latestVersion,
              releaseNotes: notes,
              isPortable: true,
            });
          } else {
            logger.info('No portable update available', 'updater', { latestVersion, currentVersion });
            this.setStatus({ state: 'not-available', version: latestVersion, isPortable: true });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.error('Portable update check parse error', 'updater', { error: msg });
          this.setStatus({ state: 'error', error: msg, isPortable: true });
        }
      });
    });

    req.on('error', (err) => {
      logger.error('Portable update check network error', 'updater', { error: err.message });
      this.setStatus({
        state: 'error',
        error: 'Sem conexão com o servidor de atualizações. Verifique sua internet.',
        isPortable: true,
      });
    });

    req.end();
  }

  /** Simple semver comparison: returns true if `a` is newer than `b` */
  private isNewerVersion(a: string, b: string): boolean {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = pa[i] || 0;
      const nb = pb[i] || 0;
      if (na > nb) return true;
      if (na < nb) return false;
    }
    return false;
  }

  // ─── Download update ───────────────────────────────────────────

  /** Download the available update */
  public downloadUpdate(): void {
    if (this.status.state !== 'available') return;

    if (this._isPortable) {
      this.downloadPortableUpdate();
    } else {
      this.setStatus({ state: 'downloading', version: this.status.version, releaseNotes: this.status.releaseNotes });
      autoUpdater.downloadUpdate().catch((err) => {
        logger.error('Update download failed', 'updater', {
          error: err instanceof Error ? err.message : String(err),
        });
        this.setStatus({ state: 'error', error: err instanceof Error ? err.message : String(err) });
      });
    }
  }

  // ─── Portable: download the portable .exe ──────────────────────

  private downloadPortableUpdate(): void {
    const version = this.status.version;
    if (!version) return;

    this.setStatus({
      state: 'downloading',
      version,
      releaseNotes: this.status.releaseNotes,
      isPortable: true,
      progress: { percent: 0, bytesPerSecond: 0, transferred: 0, total: 0 },
    });

    // Portable artifact name matches: ${productName}-${version}-x64.exe
    const assetName = `Nexus-${version}-x64.exe`;
    const downloadUrl = `https://github.com/${GH_OWNER}/${GH_REPO}/releases/download/v${version}/${assetName}`;

    // Save next to the current exe
    const exePath = app.getPath('exe');
    const exeDir = path.dirname(exePath);
    const downloadDest = path.join(exeDir, `${assetName}.update`);
    this.portableDownloadPath = downloadDest;

    logger.info('Downloading portable update', 'updater', { downloadUrl, downloadDest });

    this.downloadFileWithProgress(downloadUrl, downloadDest, version);
  }

  /** Download a file following redirects, tracking progress */
  private downloadFileWithProgress(url: string, dest: string, version: string, redirectCount = 0): void {
    if (redirectCount > 5) {
      this.setStatus({ state: 'error', error: 'Muitos redirecionamentos ao baixar atualização.', isPortable: true });
      return;
    }

    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': `Nexus/${app.getVersion()}`,
      },
    };

    const req = https.request(options, (res: IncomingMessage) => {
      // Follow redirects (GitHub releases redirect to S3/CDN)
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return this.downloadFileWithProgress(res.headers.location, dest, version, redirectCount + 1);
      }

      if (res.statusCode !== 200) {
        this.setStatus({
          state: 'error',
          error: `Erro ao baixar: HTTP ${res.statusCode}`,
          isPortable: true,
        });
        return;
      }

      const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      let transferred = 0;
      let lastTime = Date.now();
      let lastTransferred = 0;

      const fileStream = fs.createWriteStream(dest);

      res.on('data', (chunk: Buffer) => {
        transferred += chunk.length;
        const now = Date.now();
        const elapsed = (now - lastTime) / 1000;

        let bytesPerSecond = 0;
        if (elapsed >= 0.5) {
          bytesPerSecond = Math.round((transferred - lastTransferred) / elapsed);
          lastTime = now;
          lastTransferred = transferred;
        }

        const percent = totalBytes > 0 ? Math.round((transferred / totalBytes) * 100) : 0;
        this.setStatus({
          state: 'downloading',
          version,
          releaseNotes: this.status.releaseNotes,
          isPortable: true,
          progress: { percent, bytesPerSecond, transferred, total: totalBytes },
        });
      });

      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        logger.info('Portable update downloaded', 'updater', { dest, size: transferred });
        this.setStatus({
          state: 'downloaded',
          version,
          releaseNotes: this.status.releaseNotes,
          isPortable: true,
        });
      });

      fileStream.on('error', (err) => {
        fs.unlink(dest, () => {});
        logger.error('Portable download write error', 'updater', { error: err.message });
        this.setStatus({ state: 'error', error: `Erro ao salvar: ${err.message}`, isPortable: true });
      });
    });

    req.on('error', (err) => {
      logger.error('Portable download network error', 'updater', { error: err.message });
      this.setStatus({
        state: 'error',
        error: 'Sem conexão com o servidor de atualizações. Verifique sua internet.',
        isPortable: true,
      });
    });

    req.end();
  }

  // ─── Quit and install ──────────────────────────────────────────

  /** Quit and install the downloaded update */
  public quitAndInstall(): void {
    if (this._isPortable) {
      this.quitAndInstallPortable();
    } else {
      autoUpdater.quitAndInstall(false, true);
    }
  }

  /**
   * Portable install: use a batch script to:
   * 1. Wait for the current process to exit
   * 2. Replace the old exe with the new one
   * 3. Restart the new exe
   */
  private quitAndInstallPortable(): void {
    if (!this.portableDownloadPath || !fs.existsSync(this.portableDownloadPath)) {
      logger.error('Portable update file not found', 'updater');
      this.setStatus({ state: 'error', error: 'Arquivo de atualização não encontrado.', isPortable: true });
      return;
    }

    const exePath = app.getPath('exe');
    const updatePath = this.portableDownloadPath;
    const batchPath = path.join(path.dirname(exePath), '_nexus_update.bat');

    // Create a batch script that waits, swaps, and restarts
    const batchContent = `@echo off
title Nexus - Atualizando...
echo Aguardando o Nexus fechar...
timeout /t 2 /nobreak >nul
:waitloop
tasklist /FI "PID eq ${process.pid}" 2>NUL | find /I "${process.pid}" >NUL
if not errorlevel 1 (
  timeout /t 1 /nobreak >nul
  goto waitloop
)
echo Aplicando atualizacao...
del "${exePath}"
move "${updatePath}" "${exePath}"
echo Reiniciando Nexus...
start "" "${exePath}"
del "%~f0"
exit
`;

    try {
      fs.writeFileSync(batchPath, batchContent, { encoding: 'utf-8' });
      logger.info('Portable update batch created, restarting...', 'updater', { batchPath });

      // Launch the batch script detached
      const child = spawn('cmd.exe', ['/c', batchPath], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.unref();

      // Quit the app
      app.quit();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('Failed to create portable update batch', 'updater', { error: msg });
      this.setStatus({ state: 'error', error: `Erro ao aplicar atualização: ${msg}`, isPortable: true });
    }
  }

  /** Get current status */
  public getStatus(): UpdateStatus {
    return { ...this.status, isPortable: this._isPortable };
  }

  // ─── electron-updater event listeners (NSIS mode only) ─────────

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
      // In portable mode, ignore electron-updater errors since we use our own flow
      if (this._isPortable) return;

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

    ipcMain.handle('updater:isPortable', () => {
      return this._isPortable;
    });
  }

  // ─── Internal helpers ────────────────────────────────────────────

  private setStatus(status: UpdateStatus): void {
    this.status = { ...status, isPortable: this._isPortable };
    this.sendToRenderer('updater:status', this.status);
  }

  private sendToRenderer(channel: string, data: unknown): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }
}

export default AppUpdater;
