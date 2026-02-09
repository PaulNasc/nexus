// Gerenciador central de backup e restore
import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { LocalStorageAdapter, LocalStorageData } from './adapters/local-storage';
import { BackupConfig, BackupFile, ImportResult, RestorePreview } from '../../shared/types/backup';
import MemoryDatabase from '../../shared/database/memory-db';

export class BackupManager {
  private static instance: BackupManager;
  private adapter: LocalStorageAdapter | null = null;
  private currentDataFolder: string = '';
  private autoBackupTimer: NodeJS.Timeout | null = null;
  private dataChangedTimer: NodeJS.Timeout | null = null;
  private dataSaveInProgress = false;
  private dataSaveQueued = false;

  private constructor() {
    // Inicialização lazy
  }

  private getDefaultDataFolder(): string {
    const userData = app.getPath('userData');
    const legacy = path.join(userData, 'Krigzis');
    const target = path.join(userData, 'Nexus');

    try {
      if (fs.existsSync(legacy) && !fs.existsSync(target)) {
        fs.renameSync(legacy, target);
      }
    } catch {
      // fallback to legacy if migration fails
      if (fs.existsSync(legacy)) return legacy;
    }

    return target;
  }

  public static getInstance(): BackupManager {
    if (!BackupManager.instance) {
      BackupManager.instance = new BackupManager();
    }
    return BackupManager.instance;
  }

  /**
   * Inicializa o BackupManager com a pasta de dados
   */
  async initialize(dataFolder?: string): Promise<void> {
    if (!dataFolder) {
      // Usar pasta padrão
      dataFolder = this.getDefaultDataFolder();
    }

    this.currentDataFolder = dataFolder;
    this.adapter = new LocalStorageAdapter(dataFolder);
    await this.adapter.initialize();

    console.log(`✅ BackupManager initialized with folder: ${dataFolder}`);
  }

  /**
   * Obtém a pasta de dados atual
   */
  getDataFolder(): string {
    return this.currentDataFolder;
  }

  /**
   * Define uma nova pasta de dados
   */
  async setDataFolder(newFolder: string): Promise<void> {
    if (!newFolder || newFolder === this.currentDataFolder) {
      return;
    }

    this.currentDataFolder = newFolder;
    this.adapter = new LocalStorageAdapter(newFolder);
    await this.adapter.initialize();

    console.log(`✅ Data folder changed to: ${newFolder}`);
  }

  /**
   * Migra dados de uma pasta para outra
   */
  async migrateData(fromPath: string, toPath: string): Promise<void> {
    if (!this.adapter) {
      throw new Error('BackupManager not initialized');
    }

    console.log(`Migrating data from ${fromPath} to ${toPath}...`);
    await this.adapter.migrateData(fromPath, toPath);
    
    // Atualizar pasta atual
    await this.setDataFolder(toPath);
    
    console.log('✅ Data migration complete');
  }

  /**
   * Salva dados atuais do MemoryDatabase
   */
  async saveCurrentData(): Promise<void> {
    if (!this.adapter) {
      throw new Error('BackupManager not initialized');
    }

    const db = MemoryDatabase.getInstance();
    const tasks = await db.getAllTasks();
    const notes = await db.getAllNotes();

    const data: LocalStorageData = {
      tasks,
      notes,
      categories: [], // Categorias são gerenciadas via Supabase no renderer
      settings: {},   // Settings são gerenciadas via useSettings no renderer
      metadata: {
        version: app.getVersion(),
        lastUpdate: new Date().toISOString(),
        machineId: '',
      },
    };

    await this.adapter.saveData(data);
  }

  /**
   * Cria um backup manual
   */
  async createBackup(type: 'full' | 'incremental' = 'full'): Promise<BackupFile> {
    if (!this.adapter) {
      throw new Error('BackupManager not initialized');
    }

    // Salvar dados atuais antes de criar backup
    await this.saveCurrentData();

    // Criar backup
    const backup = await this.adapter.createBackup(type);
    console.log(`✅ Backup created: ${backup.id}`);

    return backup;
  }

  /**
   * Lista todos os backups
   */
  async listBackups(): Promise<BackupFile[]> {
    if (!this.adapter) {
      throw new Error('BackupManager not initialized');
    }

    return await this.adapter.listBackups();
  }

  /**
   * Deleta um backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    if (!this.adapter) {
      throw new Error('BackupManager not initialized');
    }

    await this.adapter.deleteBackup(backupId);
    console.log(`✅ Backup deleted: ${backupId}`);
  }

  /**
   * Gera preview de um restore
   */
  async getRestorePreview(backupId: string): Promise<RestorePreview> {
    if (!this.adapter) {
      throw new Error('BackupManager not initialized');
    }

    const data = await this.adapter.restoreBackup(backupId);

    // Comparar com dados atuais
    const db = MemoryDatabase.getInstance();
    const currentTasks = await db.getAllTasks();
    const currentNotes = await db.getAllNotes();

    const conflicts: string[] = [];
    const warnings: string[] = [];

    // Verificar conflitos de IDs
    const taskIds = new Set(currentTasks.map(t => t.id));
    const noteIds = new Set(currentNotes.map(n => n.id));

    data.tasks.forEach(task => {
      if (taskIds.has(task.id)) {
        conflicts.push(`Tarefa ID ${task.id} já existe`);
      }
    });

    data.notes.forEach(note => {
      if (noteIds.has(note.id)) {
        conflicts.push(`Nota ID ${note.id} já existe`);
      }
    });

    if (currentTasks.length > 0 || currentNotes.length > 0) {
      warnings.push('Dados existentes serão sobrescritos');
    }

    return {
      tasks: data.tasks.length,
      notes: data.notes.length,
      categories: data.categories.length,
      settings: Object.keys(data.settings).length > 0,
      conflicts,
      warnings,
    };
  }

  /**
   * Restaura um backup
   */
  async restoreBackup(backupId: string): Promise<void> {
    if (!this.adapter) {
      throw new Error('BackupManager not initialized');
    }

    const data = await this.adapter.restoreBackup(backupId);

    // Restaurar no MemoryDatabase
    const db = MemoryDatabase.getInstance();
    
    // Limpar dados atuais
    await db.clearAll();

    // Inserir dados do backup
    for (const task of data.tasks) {
      await db.createTask(task);
    }

    for (const note of data.notes) {
      await db.createNote(note);
    }

    // Salvar
    await this.saveCurrentData();

    console.log(`✅ Backup restored: ${backupId}`);
  }

  private async resolveZipPath(source: { source: 'external'; filePath: string } | { source: 'backupId'; backupId: string }): Promise<string> {
    if (!this.adapter) {
      throw new Error('BackupManager not initialized');
    }

    if (source.source === 'external') {
      return source.filePath;
    }

    const backups = await this.adapter.listBackups();
    const backup = backups.find((b) => b.id === source.backupId);
    if (!backup) {
      throw new Error(`Backup ${source.backupId} not found`);
    }
    return backup.filePath;
  }

  async getImportZipPreview(source: { source: 'external'; filePath: string } | { source: 'backupId'; backupId: string }): Promise<RestorePreview> {
    if (!this.adapter) {
      throw new Error('BackupManager not initialized');
    }

    const zipPath = await this.resolveZipPath(source);
    const data = await this.adapter.readDataFromZip(zipPath);

    const db = MemoryDatabase.getInstance();
    const currentTasks = await db.getAllTasks();
    const currentNotes = await db.getAllNotes();

    const conflicts: string[] = [];
    const warnings: string[] = [];

    const taskIds = new Set(currentTasks.map((t) => t.id));
    const noteIds = new Set(currentNotes.map((n) => n.id));

    data.tasks.forEach((task) => {
      if (taskIds.has(task.id)) conflicts.push(`Tarefa ID ${task.id} já existe`);
    });

    data.notes.forEach((note) => {
      if (noteIds.has(note.id)) conflicts.push(`Nota ID ${note.id} já existe`);
    });

    if (currentTasks.length > 0 || currentNotes.length > 0) {
      warnings.push('Dados existentes serão mantidos (modo mesclar)');
    }

    return {
      tasks: data.tasks.length,
      notes: data.notes.length,
      categories: data.categories.length,
      settings: Object.keys(data.settings).length > 0,
      conflicts,
      warnings,
    };
  }

  async importZipMerge(source: { source: 'external'; filePath: string } | { source: 'backupId'; backupId: string }): Promise<ImportResult> {
    if (!this.adapter) {
      throw new Error('BackupManager not initialized');
    }

    const zipPath = await this.resolveZipPath(source);
    const data = await this.adapter.readDataFromZip(zipPath);

    const db = MemoryDatabase.getInstance();
    const result = await db.mergeData({ tasks: data.tasks, notes: data.notes });

    await this.saveCurrentData();
    return result;
  }

  async getImportFolderPreview(folderPath: string): Promise<RestorePreview> {
    if (!this.adapter) {
      throw new Error('BackupManager not initialized');
    }

    const data = await this.adapter.readDataFromFolder(folderPath);

    const db = MemoryDatabase.getInstance();
    const currentTasks = await db.getAllTasks();
    const currentNotes = await db.getAllNotes();

    const conflicts: string[] = [];
    const warnings: string[] = [];

    const taskIds = new Set(currentTasks.map((t) => t.id));
    const noteIds = new Set(currentNotes.map((n) => n.id));

    data.tasks.forEach((task) => {
      if (taskIds.has(task.id)) conflicts.push(`Tarefa ID ${task.id} já existe`);
    });

    data.notes.forEach((note) => {
      if (noteIds.has(note.id)) conflicts.push(`Nota ID ${note.id} já existe`);
    });

    if (currentTasks.length > 0 || currentNotes.length > 0) {
      warnings.push('Dados existentes serão mantidos (modo mesclar)');
    }

    return {
      tasks: data.tasks.length,
      notes: data.notes.length,
      categories: data.categories.length,
      settings: Object.keys(data.settings).length > 0,
      conflicts,
      warnings,
    };
  }

  async importFolderMerge(folderPath: string): Promise<ImportResult> {
    if (!this.adapter) {
      throw new Error('BackupManager not initialized');
    }

    const data = await this.adapter.readDataFromFolder(folderPath);
    const db = MemoryDatabase.getInstance();
    const result = await db.mergeData({ tasks: data.tasks, notes: data.notes });
    await this.saveCurrentData();
    return result;
  }

  async exportZipToPath(source: { source: 'current' } | { source: 'backupId'; backupId: string }, outputPath: string): Promise<void> {
    if (!this.adapter) {
      throw new Error('BackupManager not initialized');
    }

    if (!outputPath || typeof outputPath !== 'string') {
      throw new Error('Invalid outputPath');
    }

    if (source.source === 'current') {
      await this.saveCurrentData();
      await this.adapter.createZipToPath(outputPath);
      return;
    }

    const backups = await this.adapter.listBackups();
    const backup = backups.find((b) => b.id === source.backupId);
    if (!backup) {
      throw new Error(`Backup ${source.backupId} not found`);
    }

    const fs = require('fs');
    fs.copyFileSync(backup.filePath, outputPath);
  }

  /**
   * Habilita backup automático
   */
  async enableAutoBackup(config: BackupConfig): Promise<void> {
    // Desabilitar timer anterior se existir
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
    }

    // Calcular intervalo em ms
    const intervals = {
      hourly: 60 * 60 * 1000,
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
    };

    const interval = intervals[config.backupFrequency];

    // Criar timer
    this.autoBackupTimer = setInterval(async () => {
      try {
        console.log('Running automatic backup...');
        await this.createBackup('incremental');
        
        // Limpar backups antigos
        await this.cleanOldBackups(config.keepBackups);
      } catch (error) {
        console.error('Auto backup failed:', error);
      }
    }, interval);

    console.log(`✅ Auto backup enabled (${config.backupFrequency})`);
  }

  /**
   * Desabilita backup automático
   */
  disableAutoBackup(): void {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
      this.autoBackupTimer = null;
      console.log('✅ Auto backup disabled');
    }
  }

  /**
   * Limpa backups antigos mantendo apenas os N mais recentes
   */
  private async cleanOldBackups(keepCount: number): Promise<void> {
    if (!this.adapter) return;

    const backups = await this.adapter.listBackups();
    
    if (backups.length <= keepCount) {
      return;
    }

    // Deletar backups mais antigos
    const toDelete = backups.slice(keepCount);
    for (const backup of toDelete) {
      await this.adapter.deleteBackup(backup.id);
      console.log(`Deleted old backup: ${backup.id}`);
    }
  }

  /**
   * Hook chamado quando dados são alterados (para auto-save)
   */
  async onDataChanged(): Promise<void> {
    if (!this.adapter) {
      return;
    }

    if (this.dataChangedTimer) {
      clearTimeout(this.dataChangedTimer);
    }

    this.dataChangedTimer = setTimeout(() => {
      void this.flushDataChanged();
    }, 500);
  }

  private async flushDataChanged(): Promise<void> {
    this.dataChangedTimer = null;

    if (!this.adapter) {
      return;
    }

    if (this.dataSaveInProgress) {
      this.dataSaveQueued = true;
      return;
    }

    this.dataSaveInProgress = true;
    try {
      await this.saveCurrentData();
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      this.dataSaveInProgress = false;
      if (this.dataSaveQueued) {
        this.dataSaveQueued = false;
        void this.flushDataChanged();
      }
    }
  }

  /**
   * Abre a pasta de dados no explorador
   */
  async openDataFolder(): Promise<void> {
    const { shell } = require('electron');
    await shell.openPath(this.currentDataFolder);
  }
}

export default BackupManager;
