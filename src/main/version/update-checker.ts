/**
 * Verificador de Atualizações
 * Responsável por verificar periodicamente por atualizações e notificar o usuário
 */

import { BrowserWindow, Notification } from 'electron';
import { EventEmitter } from 'events';
import VersionManager from './version-manager';
import { UpdateCheckResult, UpdateSettings } from '../../shared/types/version';
import { logger } from '../logging/logger';

export interface UpdateCheckEvents {
  'update-available': [UpdateCheckResult];
  'update-not-available': [UpdateCheckResult];
  'update-error': [Error];
  'checking-for-update': [];
  'update-check-complete': [UpdateCheckResult];
}

export class UpdateChecker extends EventEmitter {
  private static instance: UpdateChecker;
  private versionManager: VersionManager;
  private checkTimer?: NodeJS.Timeout;
  private isChecking = false;
  private mainWindow?: BrowserWindow;
  
  private constructor() {
    super();
    this.versionManager = VersionManager.getInstance();
    
    logger.info('UpdateChecker initialized', 'system');
  }
  
  public static getInstance(): UpdateChecker {
    if (!UpdateChecker.instance) {
      UpdateChecker.instance = new UpdateChecker();
    }
    return UpdateChecker.instance;
  }
  
  /**
   * Define a janela principal para comunicação com o renderer
   */
  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
    logger.debug('Main window set for UpdateChecker', 'system');
  }
  
  /**
   * Inicia o sistema de verificação automática
   */
  public start(): void {
    const settings = this.versionManager.getUpdateSettings();
    
    if (!settings.autoCheck) {
      logger.info('Auto update check disabled', 'system');
      return;
    }
    
    this.scheduleNextCheck(settings);
    
    // Verificar imediatamente na inicialização (após 30 segundos)
    setTimeout(() => {
      this.checkForUpdates();
    }, 30000);
    
    logger.info('UpdateChecker started', 'system', {
      autoCheck: settings.autoCheck,
      checkInterval: settings.checkInterval
    });
  }
  
  /**
   * Para o sistema de verificação automática
   */
  public stop(): void {
    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
      this.checkTimer = undefined;
    }
    
    logger.info('UpdateChecker stopped', 'system');
  }
  
  /**
   * Verifica manualmente por atualizações
   */
  public async checkForUpdates(force = false): Promise<UpdateCheckResult> {
    if (this.isChecking && !force) {
      logger.debug('Update check already in progress', 'system');
      throw new Error('Update check already in progress');
    }
    
    this.isChecking = true;
    this.emit('checking-for-update');
    
    // Notificar renderer
    this.sendToRenderer('update-checking');
    
    try {
      logger.info('Starting update check', 'system', { force });
      
      const result = await this.versionManager.checkForUpdates(force);
      
      this.emit('update-check-complete', result);
      
      if (result.hasUpdate && result.updateAvailable) {
        logger.info('Update available', 'system', {
          currentVersion: result.currentVersion.versionString,
          newVersion: result.updateAvailable.versionString,
          channel: result.updateAvailable.channel
        });
        
        this.emit('update-available', result);
        this.handleUpdateAvailable(result, force);
        
      } else {
        logger.debug('No update available', 'system', {
          currentVersion: result.currentVersion.versionString,
          latestVersion: result.latestVersion?.versionString
        });
        
        this.emit('update-not-available', result);
        this.sendToRenderer('update-not-available', result);
      }
      
      return result;
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      logger.error('Update check failed', 'system', {
        error: err.message,
        stack: err.stack
      });
      
      this.emit('update-error', err);
      this.sendToRenderer('update-error', { message: err.message });
      
      throw err;
      
    } finally {
      this.isChecking = false;
      
      // Reagendar próxima verificação
      const settings = this.versionManager.getUpdateSettings();
      if (settings.autoCheck) {
        this.scheduleNextCheck(settings);
      }
    }
  }
  
  /**
   * Agenda a próxima verificação automática
   */
  private scheduleNextCheck(settings: UpdateSettings): void {
    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
    }
    
    const intervalMs = settings.checkInterval * 60 * 60 * 1000; // horas para ms
    
    this.checkTimer = setTimeout(() => {
      this.checkForUpdates().catch(error => {
        logger.error('Scheduled update check failed', 'system', {
          error: error instanceof Error ? error.message : String(error)
        });
      });
    }, intervalMs);
    
    logger.debug('Next update check scheduled', 'system', {
      intervalMs,
      nextCheck: new Date(Date.now() + intervalMs).toISOString()
    });
  }
  
  /**
   * Manipula quando uma atualização está disponível
   */
  private handleUpdateAvailable(result: UpdateCheckResult, force: boolean): void {
    const settings = this.versionManager.getUpdateSettings();
    const updateInfo = result.updateAvailable!;
    
    // Enviar para renderer
    this.sendToRenderer('update-available', result);
    
    // Mostrar notificação do sistema apenas quando o check for manual/forçado
    if (settings.notifyOnUpdate && force) {
      this.showUpdateNotification(updateInfo.versionString, updateInfo.changelog);
    }
    
    // Log da atualização disponível
    logger.info('Update notification sent', 'system', {
      version: updateInfo.versionString,
      channel: updateInfo.channel,
      notificationShown: settings.notifyOnUpdate && force
    });
  }
  
  /**
   * Mostra notificação do sistema sobre atualização disponível
   */
  private showUpdateNotification(version: string, changelog?: string): void {
    try {
      const notification = new Notification({
        title: 'Nexus - Atualização Disponível',
        body: `Nova versão ${version} disponível para download.\n${changelog || 'Veja as novidades!'}`,
        icon: this.getAppIcon(),
        urgency: 'normal',
        timeoutType: 'default'
      });
      
      notification.on('click', () => {
        // Focar na janela principal e abrir configurações
        if (this.mainWindow) {
          if (this.mainWindow.isMinimized()) {
            this.mainWindow.restore();
          }
          this.mainWindow.focus();
          
          // Enviar evento para abrir a aba de atualizações
          this.sendToRenderer('open-update-settings');
        }
      });
      
      notification.show();
      
      logger.debug('Update notification shown', 'system', { version });
      
    } catch (error) {
      logger.error('Failed to show update notification', 'system', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Obtém o ícone da aplicação para notificações
   */
  private getAppIcon(): string | undefined {
    // Retornar caminho para o ícone da aplicação
    // Em produção, isso seria o ícone real da app
    return undefined;
  }
  
  /**
   * Envia mensagem para o processo renderer
   */
  private sendToRenderer(channel: string, data?: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
      logger.debug('Message sent to renderer', 'system', { channel });
    }
  }
  
  /**
   * Força uma verificação imediata
   */
  public async forceCheck(): Promise<UpdateCheckResult> {
    logger.info('Forcing update check', 'system');
    return this.checkForUpdates(true);
  }
  
  /**
   * Verifica se está em processo de verificação
   */
  public isCheckingForUpdates(): boolean {
    return this.isChecking;
  }
  
  /**
   * Atualiza configurações de atualização e reajusta o timer
   */
  public updateSettings(newSettings: Partial<UpdateSettings>): void {
    this.versionManager.updateSettings(newSettings);
    
    // Parar timer atual
    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
      this.checkTimer = undefined;
    }
    
    // Reiniciar se auto check ainda estiver habilitado
    const updatedSettings = this.versionManager.getUpdateSettings();
    if (updatedSettings.autoCheck) {
      this.scheduleNextCheck(updatedSettings);
    }
    
    logger.info('UpdateChecker settings updated', 'system', {
      newSettings,
      autoCheck: updatedSettings.autoCheck
    });
  }
  
  /**
   * Obtém informações de status do verificador
   */
  public getStatus(): object {
    return {
      isChecking: this.isChecking,
      hasTimer: !!this.checkTimer,
      settings: this.versionManager.getUpdateSettings(),
      lastCheck: this.versionManager.getUpdateSettings().lastCheck
    };
  }
  
  /**
   * Verifica se a versão atual está depreciada ou não suportada
   */
  public async checkVersionSupport(): Promise<{
    isSupported: boolean;
    isDeprecated: boolean;
    shouldForceUpdate: boolean;
  }> {
    try {
      const [isSupported, isDeprecated] = await Promise.all([
        this.versionManager.isCurrentVersionSupported(),
        this.versionManager.isCurrentVersionDeprecated()
      ]);
      
      const shouldForceUpdate = !isSupported || isDeprecated;
      
      if (shouldForceUpdate) {
        logger.warn('Current version requires update', 'security', {
          isSupported,
          isDeprecated,
          currentVersion: this.versionManager.getCurrentVersion().versionString
        });
        
        // Notificar sobre atualização obrigatória
        this.sendToRenderer('update-required', {
          isSupported,
          isDeprecated,
          message: isDeprecated 
            ? 'Esta versão foi descontinuada. Atualize para continuar usando o Nexus.'
            : 'Esta versão não é mais suportada. Atualize para a versão mais recente.'
        });
      }
      
      return { isSupported, isDeprecated, shouldForceUpdate };
      
    } catch (error) {
      logger.error('Failed to check version support', 'system', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Em caso de erro, assumir que está suportada
      return { isSupported: true, isDeprecated: false, shouldForceUpdate: false };
    }
  }
}

export default UpdateChecker;