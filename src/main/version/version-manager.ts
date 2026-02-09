/**
 * Gerenciador de Versões
 * Responsável por gerenciar informações de versão, verificar atualizações
 * e coordenar o processo de atualização
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { logger } from '../logging/logger';
import { 
  VersionInfo, 
  UpdateCheckResult, 
  UpdateSettings, 
  UpdateManifest,
  ReleaseChannel,
  VersionUtils 
} from '../../shared/types/version';

// Interface para dados de release do GitHub API
interface GitHubReleaseData {
  tag_name: string;
  published_at: string;
  body?: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
}

type HttpResponse = {
  statusCode: number;
  statusMessage: string;
  body: string;
};

export class VersionManager {
  private static instance: VersionManager;
  private currentVersion: VersionInfo;
  private settings: UpdateSettings;
  private settingsPath: string;
  private lastCheckResult?: UpdateCheckResult;
  
  private constructor() {
    // Inicializar versão atual a partir do package.json
    this.currentVersion = this.getCurrentVersionInfo();
    
    // Configurar caminho para settings
    this.settingsPath = path.join(app.getPath('userData'), 'update-settings.json');
    
    // Carregar configurações
    this.settings = this.loadSettings();
    
    logger.info('VersionManager initialized', 'system', {
      currentVersion: this.currentVersion.versionString,
      channel: this.settings.channel,
      autoCheck: this.settings.autoCheck
    });
  }
  
  public static getInstance(): VersionManager {
    if (!VersionManager.instance) {
      VersionManager.instance = new VersionManager();
    }
    return VersionManager.instance;
  }
  
  /**
   * Obtém informações da versão atual
   */
  public getCurrentVersion(): VersionInfo {
    return { ...this.currentVersion };
  }
  
  /**
   * Obtém configurações de atualização
   */
  public getUpdateSettings(): UpdateSettings {
    return { ...this.settings };
  }
  
  /**
   * Atualiza configurações de atualização
   */
  public updateSettings(newSettings: Partial<UpdateSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    
    logger.info('Update settings changed', 'system', {
      changes: newSettings,
      newSettings: this.settings
    });
  }
  
  /**
   * Verifica se há atualizações disponíveis
   */
  public async checkForUpdates(force = false): Promise<UpdateCheckResult> {
    const now = new Date().toISOString();
    
    // Verificar se deve fazer check (a menos que seja forçado)
    if (!force && this.lastCheckResult) {
      const lastCheck = new Date(this.lastCheckResult.lastChecked);
      const timeSinceCheck = Date.now() - lastCheck.getTime();
      const checkIntervalMs = this.settings.checkInterval * 60 * 60 * 1000; // horas para ms
      
      if (timeSinceCheck < checkIntervalMs) {
        logger.debug('Skipping update check - too soon', 'system', {
          timeSinceCheck: Math.round(timeSinceCheck / 1000 / 60),
          checkInterval: this.settings.checkInterval * 60
        });
        return this.lastCheckResult;
      }
    }
    
    logger.info('Checking for updates', 'system', {
      channel: this.settings.channel,
      currentVersion: this.currentVersion.versionString,
      force
    });
    
    try {
      // Buscar manifest de atualizações
      const manifest = await this.fetchUpdateManifest();
      
      // Determinar a última versão do canal atual
      const latestVersion = this.getLatestVersionForChannel(manifest, this.settings.channel);
      
      // Comparar versões
      const hasUpdate = latestVersion && VersionUtils.isNewerVersion(
        this.currentVersion.version,
        latestVersion.version
      );
      
      const result: UpdateCheckResult = {
        hasUpdate: !!hasUpdate,
        currentVersion: this.currentVersion,
        latestVersion,
        updateAvailable: hasUpdate ? latestVersion : undefined,
        isDowngrade: latestVersion ? VersionUtils.compareVersions(
          this.currentVersion.version,
          latestVersion.version
        ) > 0 : false,
        lastChecked: now
      };
      
      this.lastCheckResult = result;
      this.settings.lastCheck = now;
      this.saveSettings();
      
      logger.info('Update check completed', 'system', {
        hasUpdate: result.hasUpdate,
        latestVersion: result.latestVersion?.versionString,
        isDowngrade: result.isDowngrade
      });
      
      return result;
      
    } catch (error) {
      logger.error('Failed to check for updates', 'system', {
        error: error instanceof Error ? error.message : String(error),
        channel: this.settings.channel
      });
      
      // Retornar resultado de erro
      const errorResult: UpdateCheckResult = {
        hasUpdate: false,
        currentVersion: this.currentVersion,
        lastChecked: now
      };
      
      return errorResult;
    }
  }
  
  /**
   * Busca o manifest de atualizações do servidor
   */
  private async fetchUpdateManifest(): Promise<UpdateManifest> {
    // Repositório GitHub oficial do Nexus (mantendo URL atual)
    const updateServerUrl = 'https://api.github.com/repos/PaulNasc/nexus/releases/latest';
    
    try {
      // Em ambiente de desenvolvimento, não verificar atualizações
      if (process.env.NODE_ENV === 'development') {
        throw new Error('Update checks disabled in development mode');
      }

      const { statusCode, statusMessage, body } = await this.httpGet(updateServerUrl, {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Nexus-Updater',
      });

      if (statusCode < 200 || statusCode >= 300) {
        throw new Error(`HTTP ${statusCode}: ${statusMessage}`);
      }

      const releaseData = JSON.parse(body) as GitHubReleaseData;
      
      // Converter dados do GitHub para formato interno
      const manifest: UpdateManifest = {
        latestVersions: {
          stable: {
            version: VersionUtils.parseVersion(releaseData.tag_name.replace('v', '')),
            versionString: releaseData.tag_name.replace('v', ''),
            releaseDate: releaseData.published_at,
            channel: 'stable',
            changelog: releaseData.body || 'Veja as novidades no GitHub',
            downloadUrl: releaseData.assets.find((asset: any) => 
              asset.name.endsWith('.exe') || asset.name.endsWith('.msi') || asset.name.endsWith('.zip') || asset.name.endsWith('.dmg') || asset.name.endsWith('.AppImage')
            )?.browser_download_url,
            size: releaseData.assets[0]?.size || 0
          }
        },
        minimumVersion: '1.0.0',
        deprecatedVersions: [],
        releaseNotes: [],
        updateServer: {
          baseUrl: 'https://api.github.com/repos/seu-usuario/krigzis', // Repositório GitHub oficial do Nexus
          publicKey: ''
        }
      };
      
      return manifest;
      
    } catch (error) {
      // Em caso de erro, retornar manifest vazio indicando que não há atualizações
      logger.warn('Failed to fetch update manifest', 'version', {
        error: error instanceof Error ? error.message : String(error),
        url: updateServerUrl
      });
      
      throw new Error('Unable to check for updates at this time');
    }
  }

  private async httpGet(url: string, headers: Record<string, string>): Promise<HttpResponse> {
    return await new Promise<HttpResponse>((resolve, reject) => {
      const req = https.request(url, { method: 'GET', headers }, (res) => {
        const statusCode = typeof res.statusCode === 'number' ? res.statusCode : 0;
        const statusMessage = res.statusMessage || '';

        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({ statusCode, statusMessage, body });
        });
      });

      req.on('error', reject);
      req.end();
    });
  }
  
  /**
   * Obtém a versão mais recente para um canal específico
   */
  private getLatestVersionForChannel(manifest: UpdateManifest, channel: ReleaseChannel): VersionInfo | undefined {
    return manifest.latestVersions[channel];
  }
  
  /**
   * Carrega informações da versão atual
   */
  private getCurrentVersionInfo(): VersionInfo {
    const packageJson = this.getPackageJson();
    const versionString = packageJson.version || '1.0.0';
    const version = VersionUtils.parseVersion(versionString);
    const channel = VersionUtils.getChannelFromVersion(version);
    
    return {
      version,
      versionString,
      releaseDate: new Date().toISOString(), // Data de build
      channel
    };
  }
  
  /**
   * Carrega package.json
   */
  private getPackageJson(): any {
    try {
      const packagePath = path.join(__dirname, '../../../package.json');
      const packageContent = fs.readFileSync(packagePath, 'utf8');
      return JSON.parse(packageContent);
    } catch (error) {
      logger.warn('Could not load package.json, using defaults', 'system', {
        error: error instanceof Error ? error.message : String(error)
      });
      return { version: '1.0.0' };
    }
  }
  
  /**
   * Carrega configurações de atualização
   */
  private loadSettings(): UpdateSettings {
    const defaultSettings: UpdateSettings = {
      autoCheck: true,
      autoDownload: false,
      autoInstall: false,
      checkInterval: 24, // 24 horas
      channel: 'stable',
      notifyOnUpdate: true
    };
    
    try {
      if (fs.existsSync(this.settingsPath)) {
        const settingsContent = fs.readFileSync(this.settingsPath, 'utf8');
        const loadedSettings = JSON.parse(settingsContent);
        
        // Merge com defaults para garantir que todas as propriedades existam
        return { ...defaultSettings, ...loadedSettings };
      }
    } catch (error) {
      logger.warn('Could not load update settings, using defaults', 'system', {
        error: error instanceof Error ? error.message : String(error),
        settingsPath: this.settingsPath
      });
    }
    
    return defaultSettings;
  }
  
  /**
   * Salva configurações de atualização
   */
  private saveSettings(): void {
    try {
      // Criar diretório se não existir
      const settingsDir = path.dirname(this.settingsPath);
      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true });
      }
      
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
      
      logger.debug('Update settings saved', 'system', {
        settingsPath: this.settingsPath
      });
      
    } catch (error) {
      logger.error('Failed to save update settings', 'system', {
        error: error instanceof Error ? error.message : String(error),
        settingsPath: this.settingsPath
      });
    }
  }
  
  /**
   * Verifica se a versão atual está depreciada
   */
  public async isCurrentVersionDeprecated(): Promise<boolean> {
    try {
      const manifest = await this.fetchUpdateManifest();
      return manifest.deprecatedVersions.includes(this.currentVersion.versionString);
    } catch {
      return false;
    }
  }
  
  /**
   * Verifica se a versão atual atende aos requisitos mínimos
   */
  public async isCurrentVersionSupported(): Promise<boolean> {
    try {
      const manifest = await this.fetchUpdateManifest();
      const minimumVersion = VersionUtils.parseVersion(manifest.minimumVersion);
      return VersionUtils.compareVersions(this.currentVersion.version, minimumVersion) >= 0;
    } catch {
      return true; // Se não conseguir verificar, assumir que é suportada
    }
  }
  
  /**
   * Agenda verificação automática de atualizações
   */
  public startAutoUpdateCheck(): void {
    if (!this.settings.autoCheck) {
      logger.debug('Auto update check disabled', 'system');
      return;
    }
    
    const intervalMs = this.settings.checkInterval * 60 * 60 * 1000; // horas para ms
    
    setInterval(async () => {
      logger.debug('Running scheduled update check', 'system');
      await this.checkForUpdates();
    }, intervalMs);
    
    logger.info('Auto update check scheduled', 'system', {
      interval: this.settings.checkInterval,
      intervalMs
    });
  }
  
  /**
   * Obtém informações resumidas do sistema para debugging
   */
  public getSystemInfo(): object {
    return {
      currentVersion: this.currentVersion,
      settings: this.settings,
      lastCheckResult: this.lastCheckResult,
      platform: process.platform,
      arch: process.arch,
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node
    };
  }
}

export default VersionManager;