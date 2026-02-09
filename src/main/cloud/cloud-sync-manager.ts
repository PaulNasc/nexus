import { app } from 'electron';
import fs from 'fs';
import os from 'os';
import path from 'path';
import BackupManager from '../backup/backup-manager';
import { EncryptedJsonStore } from './token-store';
import { WebDAVProvider, type WebDAVAuth } from './webdav-provider';
import type { CloudRemoteFile, CloudSyncResult, CloudSyncStatus } from '../../shared/types/cloud-sync';

const LIVE_STATE_FILENAME = 'nexus-live-state.zip';

export class CloudSyncManager {
  private static instance: CloudSyncManager;

  private readonly backupManager: BackupManager;
  private provider: WebDAVProvider | null = null;

  private status: CloudSyncStatus = {
    provider: 'webdav',
    authStatus: 'disconnected',
    stage: 'idle',
  };

  private syncInProgress = false;

  private constructor() {
    this.backupManager = BackupManager.getInstance();
  }

  static getInstance(): CloudSyncManager {
    if (!CloudSyncManager.instance) {
      CloudSyncManager.instance = new CloudSyncManager();
    }
    return CloudSyncManager.instance;
  }

  private ensureProvider(): WebDAVProvider {
    if (this.provider) return this.provider;

    const store = new EncryptedJsonStore<WebDAVAuth>('webdav-auth.bin');
    this.provider = new WebDAVProvider(store);
    return this.provider;
  }

  getStatus(): CloudSyncStatus {
    return { ...this.status };
  }

  async saveCredentials(url: string, username: string, password: string): Promise<void> {
    const store = new EncryptedJsonStore<WebDAVAuth>('webdav-auth.bin');
    store.write({ url, username, password, connected: false });
    this.provider = null; // Force re-creation with new credentials
  }

  async testConnection(url: string, username: string, password: string): Promise<boolean> {
    const provider = this.ensureProvider();
    return provider.testConnection(url, username, password);
  }

  async connect(): Promise<void> {
    this.provider = null;
    this.status = { ...this.status, authStatus: 'connecting', stage: 'connecting', error: undefined };
    try {
      const provider = this.ensureProvider();
      await provider.connect();
      await provider.ensureAppStructure();
      this.status = { ...this.status, authStatus: 'connected', stage: 'idle', error: undefined };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.status = { ...this.status, authStatus: 'error', stage: 'error', error: msg };
      throw e;
    }
  }

  disconnect(): void {
    const provider = this.ensureProvider();
    provider.disconnect();
    this.status = { provider: 'webdav', authStatus: 'disconnected', stage: 'idle' };
  }

  private getLocalDataLastUpdateIso(dataFolder: string): string | null {
    try {
      const metadataPath = path.join(dataFolder, 'data', 'metadata.json');
      if (!fs.existsSync(metadataPath)) return null;
      const raw = fs.readFileSync(metadataPath, 'utf8');
      const parsed = JSON.parse(raw) as { lastUpdate?: string };
      return typeof parsed.lastUpdate === 'string' ? parsed.lastUpdate : null;
    } catch {
      return null;
    }
  }

  async listRemoteBackups(): Promise<CloudRemoteFile[]> {
    const provider = this.ensureProvider();
    if (!provider.isConnected()) {
      throw new Error('WebDAV não conectado');
    }

    const { backupsPath } = await provider.ensureAppStructure();
    const files = await provider.listFiles(backupsPath);
    return files.filter((f) => String(f.name || '').toLowerCase().endsWith('.zip'));
  }

  async downloadRemoteBackup(fileId: string, nameHint?: string): Promise<string> {
    const provider = this.ensureProvider();
    if (!provider.isConnected()) {
      throw new Error('WebDAV não conectado');
    }

    const baseDir = path.join(app.getPath('temp'), 'nexus-cloud-downloads');
    fs.mkdirSync(baseDir, { recursive: true });
    const safeName = (nameHint && nameHint.endsWith('.zip')) ? nameHint : `backup-${Date.now()}.zip`;
    const outPath = path.join(baseDir, safeName);
    await provider.downloadFile(fileId, outPath);
    return outPath;
  }

  async downloadLiveState(): Promise<string> {
    const provider = this.ensureProvider();
    if (!provider.isConnected()) {
      throw new Error('WebDAV não conectado');
    }

    const { livePath } = await provider.ensureAppStructure();
    const live = await provider.findFileByName(livePath, LIVE_STATE_FILENAME);
    if (!live?.id) {
      throw new Error('Estado vivo não encontrado no servidor WebDAV');
    }

    const baseDir = path.join(app.getPath('temp'), 'nexus-cloud-downloads');
    fs.mkdirSync(baseDir, { recursive: true });
    const outPath = path.join(baseDir, LIVE_STATE_FILENAME);
    await provider.downloadFile(live.id, outPath);
    return outPath;
  }

  async syncNow(): Promise<CloudSyncResult> {
    if (this.syncInProgress) {
      throw new Error('Sincronização já em andamento');
    }

    this.syncInProgress = true;
    this.status = { ...this.status, stage: 'checking', error: undefined };

    const result: CloudSyncResult = {
      success: false,
      stage: 'checking',
      uploaded: { liveState: false, backupFiles: 0 },
      remoteHasNewerLiveState: false,
      remoteHasNewerBackup: false,
      warnings: [],
      errors: [],
    };

    try {
      const provider = this.ensureProvider();
      if (!provider.isConnected()) {
        throw new Error('WebDAV não conectado');
      }

      const { livePath, backupsPath } = await provider.ensureAppStructure();
      const dataFolder = this.backupManager.getDataFolder();

      const localLastUpdateIso = this.getLocalDataLastUpdateIso(dataFolder);
      const remoteLive = await provider.findFileByName(livePath, LIVE_STATE_FILENAME);

      if (remoteLive?.modifiedTime && localLastUpdateIso) {
        const remoteMs = Date.parse(remoteLive.modifiedTime);
        const localMs = Date.parse(localLastUpdateIso);
        if (Number.isFinite(remoteMs) && Number.isFinite(localMs) && remoteMs > localMs) {
          result.remoteHasNewerLiveState = true;
          result.warnings.push('Existe um estado vivo mais recente na nuvem. Nenhum upload do estado vivo foi feito.');
        }
      }

      if (!result.remoteHasNewerLiveState) {
        this.status = { ...this.status, stage: 'uploading_live_state' };
        result.stage = 'uploading_live_state';

        await this.backupManager.saveCurrentData();

        const tempZip = path.join(os.tmpdir(), `nexus-live-${Date.now()}.zip`);
        await this.backupManager.exportZipToPath({ source: 'current' }, tempZip);

        await provider.uploadFile({
          parentPath: livePath,
          name: LIVE_STATE_FILENAME,
          mimeType: 'application/zip',
          filePath: tempZip,
          stableKey: 'live-state',
        });

        try {
          fs.unlinkSync(tempZip);
        } catch {
          // ignore
        }

        result.uploaded.liveState = true;
      }

      this.status = { ...this.status, stage: 'uploading_backups' };
      result.stage = 'uploading_backups';

      const remoteBackups = await provider.listFiles(backupsPath);
      const remoteNames = new Set(remoteBackups.map((f) => String(f.name || '')));

      const localBackups = await this.backupManager.listBackups();
      const newestLocalMs = localBackups.length > 0 ? Date.parse(localBackups[0]?.createdAt || '') : NaN;
      const newestRemote = remoteBackups
        .filter((f) => String(f.name || '').toLowerCase().endsWith('.zip'))
        .sort((a, b) => Date.parse(String(b.modifiedTime || '')) - Date.parse(String(a.modifiedTime || '')))[0];
      const newestRemoteMs = newestRemote?.modifiedTime ? Date.parse(newestRemote.modifiedTime) : NaN;
      if (Number.isFinite(newestLocalMs) && Number.isFinite(newestRemoteMs) && newestRemoteMs > newestLocalMs) {
        result.remoteHasNewerBackup = true;
      }

      for (const b of localBackups) {
        const filename = path.basename(b.filePath);
        if (remoteNames.has(filename)) continue;
        if (!fs.existsSync(b.filePath)) continue;

        await provider.uploadFile({
          parentPath: backupsPath,
          name: filename,
          mimeType: 'application/zip',
          filePath: b.filePath,
          stableKey: `backup:${filename}`,
        });

        result.uploaded.backupFiles++;
      }

      result.stage = 'complete';
      result.success = true;
      this.status = {
        ...this.status,
        stage: 'complete',
        lastSyncAt: new Date().toISOString(),
        remoteHasNewerLiveState: result.remoteHasNewerLiveState,
        remoteHasNewerBackup: result.remoteHasNewerBackup,
      };

      this.status = { ...this.status, stage: 'idle' };
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.stage = 'error';
      result.success = false;
      result.errors.push(msg);
      this.status = { ...this.status, stage: 'error', error: msg };
      throw e;
    } finally {
      this.syncInProgress = false;
    }
  }
}
