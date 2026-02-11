import { app, BrowserWindow, Menu, ipcMain, globalShortcut, dialog, nativeImage, shell, Notification } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import DatabaseManager from './database-manager';
import { SecureLogger, logger, logInfo, logError } from './logging/logger';
import { crashReporterManager } from './logging/crash-reporter';
import { auditLogger } from './logging/audit-logger';
import { AppUpdater } from './updater/auto-updater';
import { BackupManager } from './backup/backup-manager';
import * as cheerio from 'cheerio';
import type { BackupConfig, ImportResult, RestorePreview } from '../shared/types/backup';
import MemoryDatabase, { type Task as DbTask } from '../shared/database/memory-db';
import { parseEnexToNotes } from './backup/enex-importer';
import type { Note } from '../shared/types/note';
import { CloudSyncManager } from './cloud/cloud-sync-manager';

class MainApplication {
  private mainWindow: BrowserWindow | null = null;
  private isDev = !app.isPackaged || process.env.NODE_ENV === 'development';
  private database: DatabaseManager;
  private logger: SecureLogger;
  private appUpdater: AppUpdater;
  private backupManager: BackupManager;
  private cloudSyncManager: CloudSyncManager;

  constructor() {
    this.database = DatabaseManager.getInstance();
    this.logger = SecureLogger.getInstance();
    this.appUpdater = AppUpdater.getInstance();
    this.backupManager = BackupManager.getInstance();
    this.cloudSyncManager = CloudSyncManager.getInstance();

    // Configurar nome da aplicação para notificações
    app.setName('Nexus');

    // Garantir que o app use o nome correto
    if (process.platform === 'win32' || process.platform === 'linux') {
      // No Windows e Linux, definir o app user model ID
      app.setAppUserModelId('com.krigzis.taskmanager');
    }

    // Inicializar crash reporter
    crashReporterManager.initialize();

    // Registrar protocolo custom para OAuth deep link callback
    const PROTOCOL = 'krigzis';
    if (process.defaultApp) {
      if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1]!)]);
      }
    } else {
      app.setAsDefaultProtocolClient(PROTOCOL);
    }

    // Windows/Linux: segunda instância envia deep link para a instância principal
    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
      app.quit();
    } else {
      app.on('second-instance', (_event, commandLine) => {
        // A URL do deep link vem no último argumento no Windows
        const deepLinkUrl = commandLine.find(arg => arg.startsWith(`${PROTOCOL}://`));
        if (deepLinkUrl) {
          this.handleOAuthDeepLink(deepLinkUrl);
        }
        // Focar na janela principal
        if (this.mainWindow) {
          if (this.mainWindow.isMinimized()) this.mainWindow.restore();
          this.mainWindow.focus();
        }
      });
    }

    // macOS: open-url event para deep links
    app.on('open-url', (event, url) => {
      event.preventDefault();
      this.handleOAuthDeepLink(url);
    });

    this.setupAppEvents();
    this.setupIpcHandlers();
    this.setupVersionHandlers();

    logInfo('Main application initialized', 'system', {
      isDev: this.isDev,
      platform: process.platform,
      version: app.getVersion()
    });
  }

  private setupAppEvents(): void {
    app.whenReady().then(async () => {
      try {
        logInfo('Application starting up', 'system');

        // Inicializar banco de dados antes de criar a janela
        await this.database.initialize();
        logInfo(`Database (${this.database.getDatabaseType()}) initialized successfully`, 'database');

        await this.backupManager.initialize();
        logInfo('BackupManager initialized successfully', 'system', { component: 'backup' });

        this.createMainWindow();

        // Configurar menu com atalhos
        this.setupMenu();

        // Registrar atalhos globais apenas em desenvolvimento
        if (this.isDev) {
          this.setupGlobalShortcuts();
        }

        app.on('activate', () => {
          if (BrowserWindow.getAllWindows().length === 0) {
            this.createMainWindow();
          }
        });

        logInfo('Application startup completed successfully', 'system');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logError('Failed to initialize database', 'database', { error: errorMessage });
        console.error('❌ Failed to initialize database:', error);
        app.quit();
      }
    });

    app.on('window-all-closed', async () => {
      logInfo('All windows closed, cleaning up', 'system');

      // Limpar atalhos globais
      globalShortcut.unregisterAll();

      // Fechar conexão com banco antes de sair
      await this.database.close();

      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('before-quit', async () => {
      logInfo('Application quitting, performing cleanup', 'system');

      // Limpar atalhos globais
      globalShortcut.unregisterAll();

      // Garantir que o banco seja fechado adequadamente
      await this.database.close();
    });
  }

  private createMainWindow(): void {
    try {
      const resolveIconPath = (): string => {
        const candidates: string[] = [];
        if (process.platform === 'win32') {
          candidates.push(
            // Priorizar icon.ico (multi-size) e depois nexus.ico
            path.join(__dirname, '../assets/icon.ico'),
            path.join(__dirname, 'assets/icon.ico'),
            path.resolve(process.resourcesPath || '', 'assets/icon.ico'),
            path.resolve(process.cwd(), 'assets/icon.ico'),
            path.resolve(__dirname, '../../assets/icon.ico'),
            path.join(__dirname, '../assets/nexus.ico'),
            path.join(__dirname, 'assets/nexus.ico'),
            path.resolve(process.resourcesPath || '', 'assets/nexus.ico'),
            path.resolve(process.cwd(), 'assets/nexus.ico'),
            path.resolve(__dirname, '../../assets/nexus.ico'),
            // PNG fallbacks
            path.join(__dirname, '../assets/icon.png'),
            path.join(__dirname, 'assets/icon.png'),
            path.resolve(process.resourcesPath || '', 'assets/icon.png'),
            path.resolve(process.cwd(), 'assets/icon.png'),
            path.resolve(__dirname, '../../assets/icon.png')
          );
        } else if (process.platform === 'darwin') {
          candidates.push(
            path.join(__dirname, '../assets/icon.icns'),
            path.join(__dirname, 'assets/icon.icns'),
            path.resolve(process.resourcesPath || '', 'assets/icon.icns'),
            path.resolve(process.cwd(), 'assets/icon.icns'),
            path.resolve(__dirname, '../../assets/icon.icns')
          );
        } else {
          candidates.push(
            path.join(__dirname, '../assets/icon.png'),
            path.join(__dirname, 'assets/icon.png'),
            path.resolve(process.resourcesPath || '', 'assets/icon.png'),
            path.resolve(process.cwd(), 'assets/icon.png'),
            path.resolve(__dirname, '../../assets/icon.png')
          );
        }
        const fs = require('fs');
        const found = candidates.find(p => {
          try { return fs.existsSync(p); } catch { return false; }
        });
        if (!found) {
          console.warn('[Icon] No icon found. Candidates checked:', candidates);
          return candidates[0]!;
        }
        console.log('[Icon] Using icon at:', found);
        return found;
      };

      const iconPath = resolveIconPath();

      this.mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        title: 'Nexus',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'preload.js'),
          webSecurity: this.isDev ? false : true, // Only disable in development
          allowRunningInsecureContent: this.isDev ? true : false,
          // Desabilitar DevTools em produção
          devTools: this.isDev
        },
        titleBarStyle: 'default',
        show: false, // Don't show until ready
        backgroundColor: '#0A0A0A', // Dark theme background
        icon: iconPath // Ícone da aplicação por plataforma
      });

      // Refrescar ícone explicitamente (Windows/Linux)
      try {
        const tryPaths = [iconPath,
          // Prefer PNG for runtime setIcon if ICO fails
          path.join(__dirname, '../assets/icon.png'),
          path.join(__dirname, 'assets/icon.png'),
          path.resolve(process.resourcesPath || '', 'assets/icon.png'),
          path.resolve(process.cwd(), 'assets/icon.png'),
          path.resolve(__dirname, '../../assets/icon.png')
        ];
        const fs = require('fs');
        const { nativeImage } = require('electron');
        for (const p of tryPaths) {
          if (!p) continue;
          if (!fs.existsSync(p)) continue;
          const img = nativeImage.createFromPath(p);
          if (!img.isEmpty()) {
            this.mainWindow.setIcon(img);
            console.log('[Icon] setIcon applied from:', p);
            break;
          }
        }
      } catch (e) {
        console.warn('[Icon] setIcon failed:', e);
      }

      // Load the app
      if (this.isDev) {
        // In development, load from webpack-dev-server
        this.mainWindow.loadURL('http://localhost:3000');
        // Abrir DevTools apenas em desenvolvimento
        this.mainWindow.webContents.openDevTools();
      } else {
        // In production, load from file
        this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
      }

      // Show window when ready to prevent visual flash
      this.mainWindow.once('ready-to-show', () => {
        this.mainWindow?.show();

        // Não abrir DevTools em produção
        if (this.isDev) {
          this.mainWindow?.webContents.openDevTools();
        }

        // Configurar auto-updater com a janela principal
        this.appUpdater.setMainWindow(this.mainWindow!);

        // Verificar atualizações após 30s (apenas em produção)
        if (!this.isDev) {
          setTimeout(() => this.appUpdater.checkForUpdates(), 30000);
        }

        logInfo('Main window ready and shown', 'system');
      });

      this.mainWindow.on('closed', () => {
        logInfo('Main window closed', 'system');
        this.mainWindow = null;
      });

      logInfo('Main window created successfully', 'system');

      // Adicionar alguns logs de exemplo para demonstrar o sistema
      setTimeout(() => {
        logger.info('Sistema de logging funcionando', 'system', { version: '1.0.0', startup: true });
        logger.warn('Exemplo de aviso do sistema', 'security', { component: 'auth', message: 'Token expirando em breve' });
        logger.debug('Log de debug para desenvolvimento', 'performance', { memoryUsage: '128MB', cpuUsage: '15%' });
        logger.error('Exemplo de erro recuperável', 'database', { query: 'SELECT * FROM tasks', retries: 2 });
        auditLogger.logSettingsChange('demo-user', 'theme', 'light', 'dark');
        auditLogger.logTaskCreation('demo-user', 1, 'Tarefa de exemplo criada pelo sistema');
        auditLogger.logAction({ action: 'ai_action', resource: 'ai', userId: 'demo-user', success: true, details: { action: 'generate_task', provider: 'local', prompt: 'criar tarefa de reunião' } });
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logError('Failed to create main window', 'system', { error: errorMessage });
      throw error;
    }
  }

  private handleOAuthDeepLink(url: string): void {
    logInfo('OAuth deep link received', 'system', { url });
    // O deep link vem no formato: krigzis://auth/callback#access_token=...&refresh_token=...
    // Enviar a URL completa para o renderer processar
    if (this.mainWindow) {
      this.mainWindow.webContents.send('auth:oauth-callback', url);
      if (this.mainWindow.isMinimized()) this.mainWindow.restore();
      this.mainWindow.focus();
    }
  }

  private setupMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Arquivo',
        submenu: [
          {
            label: 'Nova Tarefa',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              this.mainWindow?.webContents.send('menu-new-task');
            }
          },
          { type: 'separator' },
          {
            label: 'Sair',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              app.quit();
            }
          }
        ]
      },
      {
        label: 'Editar',
        submenu: [
          { role: 'undo', label: 'Desfazer' },
          { role: 'redo', label: 'Refazer' },
          { type: 'separator' },
          { role: 'cut', label: 'Recortar' },
          { role: 'copy', label: 'Copiar' },
          { role: 'paste', label: 'Colar' },
          { role: 'selectAll', label: 'Selecionar Tudo' }
        ]
      },
      {
        label: 'Visualizar',
        submenu: [
          { 
            role: 'reload', 
            label: 'Recarregar',
            accelerator: 'CmdOrCtrl+R'
          },
          { 
            role: 'forceReload', 
            label: 'Forçar Recarregamento',
            accelerator: 'CmdOrCtrl+Shift+R'
          },
          // Exibir DevTools apenas no modo desenvolvimento
          ...(this.isDev ? [{ 
            role: 'toggleDevTools', 
            label: 'Ferramentas do Desenvolvedor',
            accelerator: process.platform === 'darwin' ? 'Cmd+Alt+I' : 'Ctrl+Shift+I'
          } as Electron.MenuItemConstructorOptions] : []),
          { type: 'separator' },
          { role: 'resetZoom', label: 'Zoom Normal' },
          { role: 'zoomIn', label: 'Aumentar Zoom' },
          { role: 'zoomOut', label: 'Diminuir Zoom' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: 'Tela Cheia' }
        ]
      },
      {
        label: 'Janela',
        submenu: [
          { role: 'minimize', label: 'Minimizar' },
          { role: 'close', label: 'Fechar' }
        ]
      }
    ];

    // Adicionar menu específico para macOS
    if (process.platform === 'darwin') {
      template.unshift({
        label: app.getName(),
        submenu: [
          { role: 'about', label: 'Sobre' },
          { type: 'separator' },
          { role: 'services', label: 'Serviços' },
          { type: 'separator' },
          { role: 'hide', label: 'Ocultar' },
          { role: 'hideOthers', label: 'Ocultar Outros' },
          { role: 'unhide', label: 'Mostrar Tudo' },
          { type: 'separator' },
          { role: 'quit', label: 'Sair' }
        ]
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupIpcHandlers(): void {
    // Auth: abrir URL no navegador externo (para OAuth)
    ipcMain.handle('auth:openExternal', async (_event, url: string) => {
      try {
        await shell.openExternal(url);
        return { success: true };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logError('Failed to open external URL', 'system', { error: msg });
        return { success: false, error: msg };
      }
    });

    // Task operations
    ipcMain.handle('tasks:getAll', async () => {
      try {
        return await this.database.getAllTasks();
      } catch (error) {
        console.error('Error getting all tasks:', error);
        throw error;
      }
    });

    ipcMain.handle('tasks:getByStatus', async (event, status) => {
      try {
        return await this.database.getTasksByStatus(status);
      } catch (error) {
        console.error('Error getting tasks by status:', error);
        throw error;
      }
    });

    ipcMain.handle('tasks:create', async (event, taskData) => {
      try {
        return await this.database.createTask(taskData);
      } catch (error) {
        console.error('Error creating task:', error);
        throw error;
      }
    });

    ipcMain.handle('tasks:update', async (event, id, updates) => {
      try {
        return await this.database.updateTask(id, updates);
      } catch (error) {
        console.error('Error updating task:', error);
        throw error;
      }
    });

    ipcMain.handle('tasks:delete', async (event, id) => {
      try {
        return await this.database.deleteTask(id);
      } catch (error) {
        console.error('Error deleting task:', error);
        throw error;
      }
    });

    ipcMain.handle('tasks:getStats', async () => {
      try {
        return await this.database.getTaskStats();
      } catch (error) {
        console.error('Error getting task stats:', error);
        throw error;
      }
    });

    ipcMain.handle('tasks:clearAll', async () => {
      try {
        return await this.database.clearAllTasks();
      } catch (error) {
        console.error('Error clearing all tasks:', error);
        throw error;
      }
    });

    // Database handlers (unified for tasks and notes)
    ipcMain.handle('database:getAllTasks', async () => {
      try {
        return await this.database.getAllTasks();
      } catch (error) {
        console.error('Error getting all tasks:', error);
        throw error;
      }
    });

    ipcMain.handle('database:getTasksByStatus', async (event, status) => {
      try {
        return await this.database.getTasksByStatus(status);
      } catch (error) {
        console.error('Error getting tasks by status:', error);
        throw error;
      }
    });

    ipcMain.handle('database:createTask', async (event, taskData) => {
      try {
        return await this.database.createTask(taskData);
      } catch (error) {
        console.error('Error creating task:', error);
        throw error;
      }
    });

    ipcMain.handle('database:updateTask', async (event, id, updates) => {
      try {
        return await this.database.updateTask(id, updates);
      } catch (error) {
        console.error('Error updating task:', error);
        throw error;
      }
    });

    ipcMain.handle('database:deleteTask', async (event, id) => {
      try {
        return await this.database.deleteTask(id);
      } catch (error) {
        console.error('Error deleting task:', error);
        throw error;
      }
    });

    ipcMain.handle('database:getTaskStats', async () => {
      try {
        return await this.database.getTaskStats();
      } catch (error) {
        console.error('Error getting task stats:', error);
        throw error;
      }
    });

    // Note handlers
    ipcMain.handle('database:getAllNotes', async () => {
      try {
        return await this.database.getAllNotes();
      } catch (error) {
        console.error('Error getting all notes:', error);
        throw error;
      }
    });

    ipcMain.handle('database:getNoteById', async (event, id) => {
      try {
        return await this.database.getNoteById(id);
      } catch (error) {
        console.error('Error getting note by id:', error);
        throw error;
      }
    });

    ipcMain.handle('database:createNote', async (event, noteData) => {
      try {
        return await this.database.createNote(noteData);
      } catch (error) {
        console.error('Error creating note:', error);
        throw error;
      }
    });

    ipcMain.handle('database:updateNote', async (event, id, updates) => {
      try {
        return await this.database.updateNote(id, updates);
      } catch (error) {
        console.error('Error updating note:', error);
        throw error;
      }
    });

    ipcMain.handle('database:deleteNote', async (event, id) => {
      try {
        return await this.database.deleteNote(id);
      } catch (error) {
        console.error('Error deleting note:', error);
        throw error;
      }
    });

    ipcMain.handle('database:getNoteStats', async () => {
      try {
        return await this.database.getNoteStats();
      } catch (error) {
        console.error('Error getting note stats:', error);
        throw error;
      }
    });

    // Backup/export handlers
    ipcMain.handle('database:exportData', async () => {
      try {
        return await this.database.exportData();
      } catch (error) {
        console.error('Error exporting data:', error);
        throw error;
      }
    });

    ipcMain.handle('database:importData', async (event, jsonData: string) => {
      try {
        await this.database.importData(jsonData);
        return { success: true };
      } catch (error) {
        console.error('Error importing data:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('database:linkNoteToTask', async (event, noteId, taskId) => {
      try {
        return await this.database.linkNoteToTask(noteId, taskId);
      } catch (error) {
        console.error('Error linking note to task:', error);
        throw error;
      }
    });

    ipcMain.handle('database:unlinkNoteFromTask', async (event, noteId) => {
      try {
        return await this.database.unlinkNoteFromTask(noteId);
      } catch (error) {
        console.error('Error unlinking note from task:', error);
        throw error;
      }
    });

    // Novos handlers para controle de vínculos task->note
    ipcMain.handle('database:linkTaskToNote', async (event, taskId, noteId) => {
      try {
        return await this.database.linkTaskToNote(taskId, noteId);
      } catch (error) {
        console.error('Error linking task to note:', error);
        throw error;
      }
    });

    ipcMain.handle('database:unlinkTaskFromNote', async (event, taskId) => {
      try {
        return await this.database.unlinkTaskFromNote(taskId);
      } catch (error) {
        console.error('Error unlinking task from note:', error);
        throw error;
      }
    });

    // System handlers
    ipcMain.on('app:getVersion', (event) => {
      event.returnValue = app.getVersion();
    });

    // Machine ID handler — deterministic, hardware-based
    ipcMain.handle('system:getMachineId', async () => {
      try {
        const { createHash } = await import('crypto');
        const os = await import('os');
        // Combine stable hardware identifiers
        const hostname = os.hostname();
        const cpus = os.cpus();
        const cpuModel = cpus.length > 0 ? cpus[0].model : 'unknown';
        const cpuCount = cpus.length.toString();
        const totalMem = os.totalmem().toString();
        const platform = os.platform();
        const arch = os.arch();
        const homedir = os.homedir();
        const raw = `${hostname}|${cpuModel}|${cpuCount}|${totalMem}|${platform}|${arch}|${homedir}`;
        const hash = createHash('sha256').update(raw).digest('hex').substring(0, 12).toUpperCase();
        return `NXS-${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}`;
      } catch {
        return 'NXS-0000-0000-0000';
      }
    });

    // File system handlers
    ipcMain.handle('system:selectFolder', async () => {
      try {
        const result = await dialog.showOpenDialog(this.mainWindow!, {
          title: 'Selecionar Pasta para Dados',
          properties: ['openDirectory', 'createDirectory'],
          buttonLabel: 'Selecionar Pasta'
        });

        logInfo('Folder selection dialog completed', 'system', {
          canceled: result.canceled,
          pathsCount: result.filePaths?.length || 0
        });

        return result;
      } catch (error) {
        logError('Failed to show folder selection dialog', 'system', {
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    });

    ipcMain.handle('system:selectZipFile', async () => {
      return dialog.showOpenDialog(this.mainWindow!, {
        title: 'Selecionar arquivo ZIP/RAR',
        buttonLabel: 'Selecionar',
        properties: ['openFile'],
        filters: [{ name: 'Arquivos ZIP/RAR', extensions: ['zip', 'rar'] }],
      });
    });

    type ImportSourceSelectionResult = {
      canceled: boolean;
      path: string | null;
      kind: 'file' | 'folder' | null;
      name: string | null;
      extension: string | null;
    };

    const defaultImportFilters = [
      { name: 'Todos os Suportados', extensions: ['zip', 'rar', 'json', 'csv', 'enex', 'html', 'htm', 'pdf'] },
      { name: 'Arquivos Compactados', extensions: ['zip', 'rar'] },
      { name: 'Documentos', extensions: ['html', 'htm', 'pdf'] },
      { name: 'Dados', extensions: ['json', 'csv', 'enex'] },
      { name: 'Todos os Arquivos', extensions: ['*'] },
    ];

    const mapDialogResultToImportSource = (result: Electron.OpenDialogReturnValue): ImportSourceSelectionResult => {
      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { canceled: true, path: null, kind: null, name: null, extension: null };
      }

      const selectedPath = result.filePaths[0];
      let kind: 'file' | 'folder' | null = null;
      try {
        const stat = fs.statSync(selectedPath);
        kind = stat.isDirectory() ? 'folder' : 'file';
      } catch {
        kind = null;
      }

      const name = path.basename(selectedPath);
      const extension = kind === 'file' ? path.extname(selectedPath).toLowerCase() : null;

      return { canceled: false, path: selectedPath, kind, name, extension };
    };

    ipcMain.handle('system:selectImportSource', async (event, options?: {
      title?: string;
      buttonLabel?: string;
      allowFiles?: boolean;
      allowFolders?: boolean;
      filters?: Array<{ name: string; extensions: string[] }>;
    }): Promise<ImportSourceSelectionResult> => {
      const allowFiles = options?.allowFiles !== false;
      const allowFolders = options?.allowFolders === true;

      const dialogTitle = options?.title ?? 'Selecionar arquivo ou pasta';
      const dialogButtonLabel = options?.buttonLabel ?? 'Selecionar';
      const filters = options?.filters || defaultImportFilters;

      if (allowFiles && allowFolders) {
        const choice = await dialog.showMessageBox(this.mainWindow!, {
          type: 'question',
          title: 'Escolher tipo de importação',
          message: 'Você quer selecionar um arquivo ou uma pasta?',
          buttons: ['Arquivo', 'Pasta', 'Cancelar'],
          defaultId: 0,
          cancelId: 2,
        });

        if (choice.response === 2) {
          return { canceled: true, path: null, kind: null, name: null, extension: null };
        }

        if (choice.response === 1) {
          const result = await dialog.showOpenDialog(this.mainWindow!, {
            title: dialogTitle,
            buttonLabel: dialogButtonLabel,
            properties: ['openDirectory'],
          });
          return mapDialogResultToImportSource(result);
        }

        const result = await dialog.showOpenDialog(this.mainWindow!, {
          title: dialogTitle,
          buttonLabel: dialogButtonLabel,
          properties: ['openFile'],
          filters,
        });
        return mapDialogResultToImportSource(result);
      }

      if (allowFolders) {
        const result = await dialog.showOpenDialog(this.mainWindow!, {
          title: dialogTitle,
          buttonLabel: dialogButtonLabel,
          properties: ['openDirectory'],
        });
        return mapDialogResultToImportSource(result);
      }

      const result = await dialog.showOpenDialog(this.mainWindow!, {
        title: dialogTitle,
        buttonLabel: dialogButtonLabel,
        properties: ['openFile'],
        filters,
      });
      return mapDialogResultToImportSource(result);
    });

    ipcMain.handle('system:selectImportFile', async (event, options?: {
      title?: string;
      buttonLabel?: string;
      filters?: Array<{ name: string; extensions: string[] }>;
    }): Promise<ImportSourceSelectionResult> => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        title: options?.title ?? 'Selecionar arquivo para importar',
        buttonLabel: options?.buttonLabel ?? 'Selecionar',
        properties: ['openFile'],
        ...(options?.filters ? { filters: options.filters } : {}),
      });

      const mapped = mapDialogResultToImportSource(result);
      if (mapped.canceled) return mapped;
      return {
        ...mapped,
        kind: 'file',
        extension: mapped.path ? path.extname(mapped.path).toLowerCase() : null,
      };
    });

    ipcMain.handle('system:selectImportFolder', async (event, options?: {
      title?: string;
      buttonLabel?: string;
    }): Promise<ImportSourceSelectionResult> => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        title: options?.title ?? 'Selecionar pasta para importar',
        buttonLabel: options?.buttonLabel ?? 'Selecionar',
        properties: ['openDirectory'],
      });

      const mapped = mapDialogResultToImportSource(result);
      if (mapped.canceled) return mapped;
      return {
        ...mapped,
        kind: 'folder',
        extension: null,
      };
    });

    ipcMain.handle('settings:get', async (event, key: string) => {
      const settingsPath = path.join(app.getPath('userData'), 'settings.json');
      try {
        const raw = fs.existsSync(settingsPath) ? fs.readFileSync(settingsPath, 'utf8') : '{}';
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        return parsed[key];
      } catch {
        return undefined;
      }
    });

    ipcMain.handle('settings:set', async (event, key: string, value: unknown) => {
      const settingsPath = path.join(app.getPath('userData'), 'settings.json');
      try {
        const raw = fs.existsSync(settingsPath) ? fs.readFileSync(settingsPath, 'utf8') : '{}';
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        parsed[key] = value;
        fs.writeFileSync(settingsPath, JSON.stringify(parsed, null, 2), 'utf8');
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('notifications:showNative', async (event, options: { title: string; body?: string; icon?: string }) => {
      try {
        const icon = options.icon ? nativeImage.createFromPath(options.icon) : undefined;
        const notification = new Notification({ title: options.title, body: options.body, icon });
        notification.show();
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    const buildRestorePreview = async (incoming: { tasks: DbTask[]; notes: Note[] }): Promise<RestorePreview> => {
      const db = MemoryDatabase.getInstance();
      const currentTasks = await db.getAllTasks();
      const currentNotes = await db.getAllNotes();

      const taskIds = new Set(currentTasks.map((t) => t.id));
      const noteIds = new Set(currentNotes.map((n) => n.id));
      const conflicts: string[] = [];
      const warnings: string[] = [];

      for (const t of incoming.tasks || []) {
        if (taskIds.has(t.id)) conflicts.push(`Tarefa ID ${t.id} já existe`);
      }
      for (const n of incoming.notes || []) {
        if (noteIds.has(n.id)) conflicts.push(`Nota ID ${n.id} já existe`);
      }
      if (currentTasks.length > 0 || currentNotes.length > 0) {
        warnings.push('Dados existentes serão mantidos (modo mesclar)');
      }

      return {
        tasks: (incoming.tasks || []).length,
        notes: (incoming.notes || []).length,
        categories: 0,
        settings: false,
        conflicts,
        warnings,
      };
    };

    const readUtf8 = (filePath: string): string => fs.readFileSync(filePath, 'utf8');
    const parseJsonImport = (raw: string): { tasks: DbTask[]; notes: Note[] } => {
      const parsed: unknown = JSON.parse(raw || '{}');
      if (!parsed || typeof parsed !== 'object') return { tasks: [], notes: [] };
      const rec = parsed as Record<string, unknown>;
      const tasks = Array.isArray(rec.tasks) ? (rec.tasks as unknown as DbTask[]) : [];
      const notes = Array.isArray(rec.notes) ? (rec.notes as unknown as Note[]) : [];
      return { tasks, notes };
    };

    const readHtmlImport = (filePath: string): { filePath: string; html: string } => {
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('filePath inválido');
      }
      if (!fs.existsSync(filePath)) {
        throw new Error('Arquivo não encontrado');
      }
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.html' && ext !== '.htm') {
        throw new Error('Arquivo HTML inválido');
      }
      const html = fs.readFileSync(filePath, 'utf8');
      return { filePath, html };
    };

    const mimeFromExt = (ext: string): string => {
      const e = (ext || '').toLowerCase();
      if (e === '.png') return 'image/png';
      if (e === '.jpg' || e === '.jpeg') return 'image/jpeg';
      if (e === '.gif') return 'image/gif';
      if (e === '.webp') return 'image/webp';
      if (e === '.bmp') return 'image/bmp';
      if (e === '.svg') return 'image/svg+xml';
      return 'application/octet-stream';
    };

    const htmlToTextPreserveLines = async (html: string): Promise<string> => {
      const $ = cheerio.load(html || '', { xmlMode: false });

      $('script').remove();
      $('style').remove();
      $('noscript').remove();
      $('head').remove();

      $('br').replaceWith('\n');
      $('div').each((_, el) => {
        const node = $(el);
        node.prepend('\n');
        node.append('\n');
      });
      $('p').each((_, el) => {
        const node = $(el);
        node.prepend('\n');
        node.append('\n');
      });

      const root = $('en-note').first();
      const text = (root && root.length > 0 ? root.text() : $('body').text()) || $.root().text();
      return text.replace(/\n{3,}/g, '\n\n').trim();
    };

    const deriveHtmlTitle = async (html: string, filePath: string): Promise<string> => {
      try {
        const $ = cheerio.load(html || '', { xmlMode: false });
        const title = String($('title').first().text() || '').trim();
        if (title) return title;
      } catch {
        // ignore
      }
      const base = path.basename(filePath);
      return base.replace(/\.(html|htm)$/i, '');
    };

    const extractHtmlImagesAsDataUrls = (html: string, htmlFilePath: string): string[] => {
      try {
        const $ = cheerio.load(html || '', { xmlMode: false });
        const srcs = new Set<string>();
        $('img').each((_, el) => {
          const src = String($(el).attr('src') || '').trim();
          if (!src) return;
          srcs.add(src);
        });

        const baseDir = path.dirname(htmlFilePath);
        const out: string[] = [];
        for (const src of srcs) {
          if (/^data:/i.test(src)) {
            out.push(src);
            continue;
          }
          if (/^(https?:)?\/\//i.test(src)) {
            continue;
          }

          const decoded = (() => {
            try {
              return decodeURIComponent(src);
            } catch {
              return src;
            }
          })();

          const absPath = path.resolve(baseDir, decoded);
          if (!fs.existsSync(absPath)) continue;
          const buf = fs.readFileSync(absPath);
          const mime = mimeFromExt(path.extname(absPath));
          out.push(`data:${mime};base64,${buf.toString('base64')}`);
        }
        return out;
      } catch {
        return [];
      }
    };

    ipcMain.handle('import:html-preview', async (event, input: { filePath: string }): Promise<RestorePreview> => {
      readHtmlImport(input?.filePath);
      return { tasks: 0, notes: 1, categories: 0, settings: false, conflicts: [], warnings: [] };
    });

    ipcMain.handle('import:html-apply', async (event, input: { filePath: string }): Promise<ImportResult> => {
      const { filePath, html } = readHtmlImport(input?.filePath);
      const title = await deriveHtmlTitle(html, filePath);
      const content = await htmlToTextPreserveLines(html);
      const attachedImages = extractHtmlImagesAsDataUrls(html, filePath);
      await this.database.createNote({ title, content, format: 'text', attachedImages });
      return { success: true, imported: { tasks: 0, notes: 1, categories: 0 }, warnings: [], errors: [] };
    });

    ipcMain.handle('import:pdf-preview', async (): Promise<RestorePreview> => {
      return { tasks: 0, notes: 0, categories: 0, settings: false, conflicts: [], warnings: ['Importação PDF ainda não implementada'] };
    });

    ipcMain.handle('import:pdf-apply', async (): Promise<ImportResult> => {
      return { success: false, imported: { tasks: 0, notes: 0, categories: 0 }, warnings: [], errors: [{ type: 'note', message: 'Importação PDF ainda não implementada' }] };
    });

    ipcMain.handle('import:folder-preview', async (event, input: { folderPath: string }): Promise<RestorePreview> => {
      if (!input?.folderPath || typeof input.folderPath !== 'string') {
        throw new Error('folderPath inválido');
      }
      return this.backupManager.getImportFolderPreview(input.folderPath);
    });

    ipcMain.handle('import:folder-apply', async (event, input: { folderPath: string }): Promise<ImportResult> => {
      if (!input?.folderPath || typeof input.folderPath !== 'string') {
        throw new Error('folderPath inválido');
      }
      return this.backupManager.importFolderMerge(input.folderPath);
    });

    ipcMain.handle('backup:get-data-folder', async () => this.backupManager.getDataFolder());
    ipcMain.handle('backup:set-data-folder', async (event, folderPath: string) => {
      await this.backupManager.setDataFolder(folderPath);
      return { success: true };
    });
    ipcMain.handle('backup:migrate-data', async (event, fromPath: string, toPath: string) => {
      await this.backupManager.migrateData(fromPath, toPath);
      return { success: true };
    });
    ipcMain.handle('backup:open-folder', async () => {
      await this.backupManager.openDataFolder();
      return { success: true };
    });

    ipcMain.handle('backup:create', async (event, type: 'full' | 'incremental') => this.backupManager.createBackup(type));
    ipcMain.handle('backup:list', async () => this.backupManager.listBackups());
    ipcMain.handle('backup:delete', async (event, backupId: string) => {
      await this.backupManager.deleteBackup(backupId);
      return { success: true };
    });
    ipcMain.handle('backup:restore-preview', async (event, backupId: string) => this.backupManager.getRestorePreview(backupId));
    ipcMain.handle('backup:restore', async (event, backupId: string) => {
      await this.backupManager.restoreBackup(backupId);
      return { success: true };
    });
    ipcMain.handle('backup:set-auto-config', async (event, config: BackupConfig) => {
      if (config && config.autoBackup) {
        await this.backupManager.enableAutoBackup(config);
      } else {
        this.backupManager.disableAutoBackup();
      }
      return { success: true };
    });
    ipcMain.handle('backup:import-zip-preview', async (event, source: { source: 'external'; filePath: string } | { source: 'backupId'; backupId: string }) => {
      return this.backupManager.getImportZipPreview(source);
    });
    ipcMain.handle('backup:import-zip-apply', async (event, source: { source: 'external'; filePath: string } | { source: 'backupId'; backupId: string }) => {
      return this.backupManager.importZipMerge(source);
    });
    ipcMain.handle('backup:export-zip', async (event, source: { source: 'current' } | { source: 'backupId'; backupId: string }) => {
      const save = await dialog.showSaveDialog(this.mainWindow!, {
        title: 'Exportar backup ZIP',
        buttonLabel: 'Salvar',
        defaultPath: 'nexus-backup.zip',
        filters: [{ name: 'ZIP', extensions: ['zip'] }],
      });
      if (save.canceled || !save.filePath) return { success: false };
      await this.backupManager.exportZipToPath(source, save.filePath);
      return { success: true, savedPath: save.filePath };
    });
    ipcMain.handle('backup:export-json', async () => {
      const save = await dialog.showSaveDialog(this.mainWindow!, {
        title: 'Exportar JSON',
        buttonLabel: 'Salvar',
        defaultPath: 'nexus-export.json',
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (save.canceled || !save.filePath) return { success: false };
      const json = await this.database.exportData();
      fs.writeFileSync(save.filePath, json, 'utf8');
      return { success: true, savedPath: save.filePath };
    });
    ipcMain.handle('backup:export-csv', async () => {
      const save = await dialog.showSaveDialog(this.mainWindow!, {
        title: 'Exportar CSV',
        buttonLabel: 'Salvar',
        defaultPath: 'nexus-export.csv',
        filters: [{ name: 'CSV', extensions: ['csv'] }],
      });
      if (save.canceled || !save.filePath) return { success: false };
      const db = MemoryDatabase.getInstance();
      const tasks = await db.getAllTasks();
      const header = ['id', 'title', 'status', 'priority', 'created_at', 'updated_at'].join(',');
      const rows = tasks.map((t) => [t.id, JSON.stringify(t.title ?? ''), t.status, t.priority, t.created_at, t.updated_at].join(','));
      fs.writeFileSync(save.filePath, [header, ...rows].join('\n'), 'utf8');
      return { success: true, savedPath: save.filePath };
    });
    ipcMain.handle('backup:import-json-preview', async (event, input: { filePath: string } | { json: string }) => {
      const raw = 'filePath' in input ? readUtf8(input.filePath) : input.json;
      const { tasks, notes } = parseJsonImport(raw);
      return buildRestorePreview({ tasks, notes });
    });
    ipcMain.handle('backup:import-json-apply', async (event, input: { filePath: string } | { json: string }): Promise<ImportResult> => {
      const raw = 'filePath' in input ? readUtf8(input.filePath) : input.json;
      const { tasks, notes } = parseJsonImport(raw);
      const db = MemoryDatabase.getInstance();
      return db.mergeData({ tasks, notes });
    });
    ipcMain.handle('backup:import-csv-preview', async (): Promise<RestorePreview> => {
      return { tasks: 0, notes: 0, categories: 0, settings: false, conflicts: [], warnings: ['Importação CSV ainda não implementada'] };
    });
    ipcMain.handle('backup:import-csv-apply', async (): Promise<ImportResult> => {
      return { success: false, imported: { tasks: 0, notes: 0, categories: 0 }, warnings: [], errors: [{ type: 'task', message: 'Importação CSV ainda não implementada' }] };
    });
    ipcMain.handle('backup:import-enex-preview', async (event, input: { filePath: string } | { enex: string }) => {
      const raw = 'filePath' in input ? readUtf8(input.filePath) : input.enex;
      const parsed = parseEnexToNotes(raw || '');
      return buildRestorePreview({ tasks: [], notes: parsed.notes });
    });
    ipcMain.handle('backup:import-enex-apply', async (event, input: { filePath: string } | { enex: string }): Promise<ImportResult> => {
      const raw = 'filePath' in input ? readUtf8(input.filePath) : input.enex;
      const parsed = parseEnexToNotes(raw || '');
      const db = MemoryDatabase.getInstance();
      return db.mergeData({ tasks: [], notes: parsed.notes });
    });

    ipcMain.handle('cloud:connect', async () => {
      try {
        await this.cloudSyncManager.connect();
        return { success: true };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : String(e) };
      }
    });

    ipcMain.handle('cloud:disconnect', async () => {
      this.cloudSyncManager.disconnect();
      return { success: true };
    });

    ipcMain.handle('cloud:status', async () => {
      return this.cloudSyncManager.getStatus();
    });

    ipcMain.handle('cloud:sync-now', async () => {
      return this.cloudSyncManager.syncNow();
    });

    ipcMain.handle('cloud:list-remote-backups', async () => {
      return this.cloudSyncManager.listRemoteBackups();
    });

    ipcMain.handle('cloud:download-remote-backup', async (event, input: { fileId: string; name?: string }) => {
      try {
        const filePath = await this.cloudSyncManager.downloadRemoteBackup(input.fileId, input.name);
        return { success: true, filePath };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : String(e) };
      }
    });

    ipcMain.handle('cloud:download-live-state', async () => {
      try {
        const filePath = await this.cloudSyncManager.downloadLiveState();
        return { success: true, filePath };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : String(e) };
      }
    });

    ipcMain.handle('cloud:save-credentials', async (event, input: { url: string; username: string; password: string }) => {
      try {
        await this.cloudSyncManager.saveCredentials(input.url, input.username, input.password);
        return { success: true };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : String(e) };
      }
    });

    ipcMain.handle('cloud:test-connection', async (event, input: { url: string; username: string; password: string }) => {
      try {
        const ok = await this.cloudSyncManager.testConnection(input.url, input.username, input.password);
        return { success: ok, error: ok ? undefined : 'Falha ao conectar. Verifique URL, usuário e senha.' };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : String(e) };
      }
    });

    // Settings operations will be implemented when needed

    // Logging handlers
    ipcMain.handle('logging:logAction', async (event, data) => {
      try {
        auditLogger.logAction(data);
        return { success: true };
      } catch (error) {
        console.error('Error logging action:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('logging:logTaskCreation', async (event, userId, taskId, taskTitle) => {
      try {
        auditLogger.logTaskCreation(userId, taskId, taskTitle);
        return { success: true };
      } catch (error) {
        console.error('Error logging task creation:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('logging:logTaskUpdate', async (event, userId, taskId, changes) => {
      try {
        auditLogger.logTaskUpdate(userId, taskId, changes);
        return { success: true };
      } catch (error) {
        console.error('Error logging task update:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('logging:logTaskDeletion', async (event, userId, taskId, taskTitle) => {
      try {
        auditLogger.logTaskDeletion(userId, taskId, taskTitle);
        return { success: true };
      } catch (error) {
        console.error('Error logging task deletion:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('logging:logCategoryCreation', async (event, userId, categoryId, categoryName) => {
      try {
        auditLogger.logCategoryCreation(userId, categoryId, categoryName);
        return { success: true };
      } catch (error) {
        console.error('Error logging category creation:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('logging:logCategoryUpdate', async (event, userId, categoryId, changes) => {
      try {
        auditLogger.logCategoryUpdate(userId, categoryId, changes);
        return { success: true };
      } catch (error) {
        console.error('Error logging category update:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('logging:logCategoryDeletion', async (event, userId, categoryId, categoryName) => {
      try {
        auditLogger.logCategoryDeletion(userId, categoryId, categoryName);
        return { success: true };
      } catch (error) {
        console.error('Error logging category deletion:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('logging:logAIAction', async (event, userId, action, provider, success, details) => {
      try {
        auditLogger.logAction({ action: 'ai_action', resource: 'ai', userId, success: Boolean(success), details: { action, provider, details } });
        return { success: true };
      } catch (error) {
        console.error('Error logging AI action:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('logging:logSettingsChange', async (event, userId, setting, oldValue, newValue) => {
      try {
        auditLogger.logSettingsChange(userId, setting, oldValue, newValue);
        return { success: true };
      } catch (error) {
        console.error('Error logging settings change:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('logging:logError', async (event, userId, errorMessage, errorStack, context) => {
      try {
        const error = new Error(errorMessage);
        error.stack = errorStack;
        auditLogger.logError(userId, error, context);
        return { success: true };
      } catch (error) {
        console.error('Error logging error:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Novos handlers para recuperar logs
    ipcMain.handle('logging:getLogs', async (event, options) => {
      try {
        return logger.getLogs(options);
      } catch (error) {
        console.error('Error getting logs:', error);
        return [];
      }
    });

    ipcMain.handle('logging:getCrashReports', async (event, options) => {
      try {
        return crashReporterManager.getCrashReports(options);
      } catch (error) {
        console.error('Error getting crash reports:', error);
        return [];
      }
    });

    ipcMain.handle('logging:getLogStats', async () => {
      try {
        return logger.getLogStats();
      } catch (error) {
        console.error('Error getting log stats:', error);
        return { total: 0, byLevel: {}, byCategory: {} };
      }
    });

    ipcMain.handle('logging:clearLogs', async (event, olderThan) => {
      try {
        const date = olderThan ? new Date(olderThan) : undefined;
        return logger.clearLogs(date);
      } catch (error) {
        console.error('Error clearing logs:', error);
        return 0;
      }
    });

    ipcMain.handle('logging:exportLogs', async (event, options) => {
      try {
        const processedOptions = {
          ...options,
          startDate: options?.startDate ? new Date(options.startDate) : undefined,
          endDate: options?.endDate ? new Date(options.endDate) : undefined
        };
        return logger.exportLogs(processedOptions);
      } catch (error) {
        console.error('Error exporting logs:', error);
        return JSON.stringify({ error: 'Failed to export logs' });
      }
    });
  }

  private setupVersionHandlers(): void {
    // IPC handlers for updater are registered inside AppUpdater.setupIpcHandlers()
    // This method is kept for backward compatibility with the constructor call
    logger.info('Version handlers configured (electron-updater)', 'system');
  }

  private setupGlobalShortcuts(): void {
    // Registrar atalhos globais para DevTools
    const devToolsShortcut = process.platform === 'darwin' ? 'Cmd+Alt+I' : 'Ctrl+Shift+I';
    
    globalShortcut.register(devToolsShortcut, () => {
      if (this.mainWindow) {
        this.mainWindow.webContents.toggleDevTools();
      }
    });

    // Registrar F12 como alternativa
    globalShortcut.register('F12', () => {
      if (this.mainWindow) {
        this.mainWindow.webContents.toggleDevTools();
      }
    });

    // Registrar Ctrl+R para reload
    const reloadShortcut = process.platform === 'darwin' ? 'Cmd+R' : 'Ctrl+R';
    globalShortcut.register(reloadShortcut, () => {
      if (this.mainWindow) {
        this.mainWindow.webContents.reload();
      }
    });

    // Registrar Ctrl+Shift+R para force reload
    const forceReloadShortcut = process.platform === 'darwin' ? 'Cmd+Shift+R' : 'Ctrl+Shift+R';
    globalShortcut.register(forceReloadShortcut, () => {
      if (this.mainWindow) {
        this.mainWindow.webContents.reloadIgnoringCache();
      }
    });
  }
}

// Initialize the application
new MainApplication(); 