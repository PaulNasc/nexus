import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { app } from 'electron';
import { SecureLogger } from '../logging/logger';
import { AuditLogger } from '../logging/audit-logger';
import { UpdateCheckResult } from '../../shared/types/version';

export interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  speed: number;
  eta: number;
}

export interface DownloadResult {
  success: boolean;
  filePath?: string;
  error?: string;
  checksum?: string;
  verified?: boolean;
}

export class UpdateDownloader extends EventEmitter {
  private static instance: UpdateDownloader;
  private logger: SecureLogger;
  private auditLogger: AuditLogger;
  private downloadDir: string;
  private currentDownload: any = null;

  private constructor() {
    super();
    this.logger = SecureLogger.getInstance();
    this.auditLogger = AuditLogger.getInstance();
    this.downloadDir = path.join(app.getPath('userData'), 'updates');
    this.ensureDownloadDir();
  }

  public static getInstance(): UpdateDownloader {
    if (!UpdateDownloader.instance) {
      UpdateDownloader.instance = new UpdateDownloader();
    }
    return UpdateDownloader.instance;
  }

  private ensureDownloadDir(): void {
    try {
      if (!fs.existsSync(this.downloadDir)) {
        fs.mkdirSync(this.downloadDir, { recursive: true });
      }
    } catch (error) {
      this.logger.error('Failed to create download directory', 'system', {
        error: error instanceof Error ? error.message : String(error),
        downloadDir: this.downloadDir
      });
    }
  }

  public async downloadUpdate(updateInfo: UpdateCheckResult): Promise<DownloadResult> {
    if (!updateInfo.latestVersion?.downloadUrl) {
      const error = 'No download URL provided';
      this.logger.error(error, 'update-download');
      return { success: false, error };
    }

    try {
      this.logger.info('Starting update download', 'update-download', {
        version: updateInfo.latestVersion?.versionString,
        url: updateInfo.latestVersion?.downloadUrl
      });

      this.auditLogger.logAction({
        action: 'update_download_started',
        resource: 'version',
        userId: 'system',
        success: true,
        details: {
          version: updateInfo.latestVersion?.versionString,
          url: updateInfo.latestVersion?.downloadUrl,
          hasUpdate: updateInfo.hasUpdate
        }
      });

      // Simular download (em produção, usar uma biblioteca como electron-updater ou implementar HTTP)
      const result = await this.simulateDownload(updateInfo);

      if (result.success) {
        this.logger.info('Update download completed', 'update-download', {
          version: updateInfo.latestVersion?.versionString,
          filePath: result.filePath,
          verified: result.verified
        });

        this.auditLogger.logAction({
          action: 'update_download_completed',
          resource: 'version',
          userId: 'system',
          success: true,
          details: {
            version: updateInfo.latestVersion?.versionString,
            filePath: result.filePath,
            checksum: result.checksum,
            verified: result.verified
          }
        });
      } else {
        this.auditLogger.logAction({
          action: 'update_download_failed',
          resource: 'version',
          userId: 'system',
          success: false,
          details: {
            version: updateInfo.latestVersion?.versionString,
            error: result.error
          }
        });
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Update download failed', 'update-download', {
        error: errorMessage,
        version: updateInfo.latestVersion?.versionString
      });

      return { success: false, error: errorMessage };
    }
  }

  private async simulateDownload(updateInfo: UpdateCheckResult): Promise<DownloadResult> {
    return new Promise((resolve) => {
      const fileName = `nexus-${updateInfo.latestVersion?.versionString}.exe`;
      const filePath = path.join(this.downloadDir, fileName);
      
      let progress = 0;
      const totalSize = 50 * 1024 * 1024; // 50MB simulado
      const interval = 100; // ms
      const increment = totalSize / 50; // Completa em ~5 segundos

      const timer = setInterval(() => {
        progress += increment;
        const percent = Math.min((progress / totalSize) * 100, 100);
        
        const progressData: DownloadProgress = {
          percent: Math.round(percent),
          transferred: Math.round(progress),
          total: totalSize,
          speed: increment * (1000 / interval), // bytes/sec
          eta: Math.max(0, Math.round((totalSize - progress) / (increment * (1000 / interval))))
        };

        this.emit('progress', progressData);

        if (percent >= 100) {
          clearInterval(timer);
          
          // Simular criação do arquivo
          try {
            const dummyContent = `Nexus Update v${updateInfo.latestVersion?.versionString}\nDownloaded at: ${new Date().toISOString()}`;
            
            fs.writeFileSync(filePath, dummyContent);
            
            // Simular checksum
            const checksum = crypto.createHash('sha256').update(dummyContent).digest('hex');
            
            resolve({
              success: true,
              filePath,
              checksum,
              verified: true
            });
          } catch (error) {
            resolve({
              success: false,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }, interval);

      // Armazenar referência para cancelamento
      this.currentDownload = timer;
    });
  }

  public cancelDownload(): void {
    if (this.currentDownload) {
      clearInterval(this.currentDownload);
      this.currentDownload = null;
      this.emit('cancelled');
      
      this.logger.info('Update download cancelled', 'update-download');
      
      this.auditLogger.logAction({
        action: 'update_download_cancelled',
        resource: 'version',
        userId: 'system',
        success: true
      });
    }
  }

  public isDownloading(): boolean {
    return this.currentDownload !== null;
  }

  public getDownloadDir(): string {
    return this.downloadDir;
  }

  public cleanupOldDownloads(keepLast: number = 3): void {
    try {
      const files = fs.readdirSync(this.downloadDir)
        .filter(file => file.endsWith('.exe'))
        .map(file => ({
          name: file,
          path: path.join(this.downloadDir, file),
          stat: fs.statSync(path.join(this.downloadDir, file))
        }))
        .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime());

      const filesToDelete = files.slice(keepLast);
      
      for (const file of filesToDelete) {
        fs.unlinkSync(file.path);
        this.logger.info('Cleaned up old update file', 'update-download', {
          fileName: file.name,
          lastModified: file.stat.mtime
        });
      }

      if (filesToDelete.length > 0) {
        this.auditLogger.logAction({
          action: 'update_cleanup',
          resource: 'version',
          userId: 'system',
          success: true,
          details: {
            filesDeleted: filesToDelete.length,
            filesKept: keepLast
          }
        });
      }

    } catch (error) {
      this.logger.error('Failed to cleanup old downloads', 'update-download', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  public verifyChecksum(filePath: string, expectedChecksum: string): boolean {
    try {
      const fileContent = fs.readFileSync(filePath);
      const actualChecksum = crypto.createHash('sha256').update(fileContent).digest('hex');
      
      const verified = actualChecksum === expectedChecksum;
      
      this.logger.info('Checksum verification', 'update-download', {
        filePath,
        expectedChecksum,
        actualChecksum,
        verified
      });

      return verified;
    } catch (error) {
      this.logger.error('Failed to verify checksum', 'update-download', {
        error: error instanceof Error ? error.message : String(error),
        filePath,
        expectedChecksum
      });
      return false;
    }
  }
}

export default UpdateDownloader;