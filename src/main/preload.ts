import { contextBridge, ipcRenderer } from 'electron';
import type { OpenDialogReturnValue } from 'electron';
import type { BackupConfig, BackupFile, ImportResult, RestorePreview } from '../shared/types/backup';
import type { CloudRemoteFile, CloudSyncResult, CloudSyncStatus } from '../shared/types/cloud-sync';

export type ImportSourceSelectionResult = {
  canceled: boolean;
  path: string | null;
  kind: 'file' | 'folder' | null;
  name: string | null;
  extension: string | null;
};

export type SelectImportSourceOptions = {
  title?: string;
  buttonLabel?: string;
  allowFiles?: boolean;
  allowFolders?: boolean;
  filters?: Array<{ name: string; extensions: string[] }>;
};

export type SelectImportFileOptions = {
  title?: string;
  buttonLabel?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
};

export type SelectImportFolderOptions = {
  title?: string;
  buttonLabel?: string;
};

// Define the API that will be exposed to the renderer process
export interface ElectronAPI {

  // New Task operations
  tasks: {
    getAll: () => Promise<unknown>;
    getByStatus: (status: string) => Promise<unknown>;
    create: (taskData: unknown) => Promise<unknown>;
    update: (id: number, updates: unknown) => Promise<unknown>;
    delete: (id: number) => Promise<unknown>;
    getStats: () => Promise<unknown>;
    clearAll: () => Promise<unknown>;
  };

  // Database operations (includes tasks and notes)
  database: {
    // Task methods
    getAllTasks: () => Promise<unknown>;
    getTasksByStatus: (status: string) => Promise<unknown>;
    createTask: (taskData: unknown) => Promise<unknown>;
    updateTask: (id: number, updates: unknown) => Promise<unknown>;
    deleteTask: (id: number) => Promise<unknown>;
    getTaskStats: () => Promise<unknown>;

    // Note methods
    getAllNotes: () => Promise<unknown>;
    getNoteById: (id: number) => Promise<unknown>;
    createNote: (noteData: unknown) => Promise<unknown>;
    updateNote: (id: number, updates: unknown) => Promise<unknown>;
    deleteNote: (id: number) => Promise<unknown>;
    getNoteStats: () => Promise<unknown>;
    linkNoteToTask: (noteId: number, taskId: number) => Promise<unknown>;
    unlinkNoteFromTask: (noteId: number) => Promise<unknown>;

    // Novos métodos para vincular task->note
    linkTaskToNote: (taskId: number, noteId: number) => Promise<unknown>;
    unlinkTaskFromNote: (taskId: number) => Promise<unknown>;

    // Legacy methods (for compatibility)
    create: (data: unknown) => Promise<unknown>;
    read: (query: unknown) => Promise<unknown>;
    update: (data: unknown) => Promise<unknown>;
    delete: (id: string) => Promise<unknown>;

    // Backup/export
    exportData: () => Promise<string>;
    importData: (jsonData: string) => Promise<{ success: boolean; error?: string }>;
  };

  // Settings operations
  settings: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<unknown>;
  };

  // Notifications operations
  notifications: {
    showNative: (options: { title: string; body?: string; icon?: string }) => Promise<{ success: boolean; error?: string }>;
  };

  // Logging operations
  logging: {
    logAction: (data: unknown) => Promise<unknown>;
    logTaskCreation: (userId: string, taskId: number, taskTitle: string) => Promise<unknown>;
    logTaskUpdate: (userId: string, taskId: number, changes: unknown) => Promise<unknown>;
    logTaskDeletion: (userId: string, taskId: number, taskTitle: string) => Promise<unknown>;
    logCategoryCreation: (userId: string, categoryId: number, categoryName: string) => Promise<unknown>;
    logCategoryUpdate: (userId: string, categoryId: number, changes: unknown) => Promise<unknown>;
    logCategoryDeletion: (userId: string, categoryId: number, categoryName: string) => Promise<unknown>;

    logSettingsChange: (userId: string, setting: string, oldValue: unknown, newValue: unknown) => Promise<unknown>;

    // Métodos para recuperar logs
    getLogs: (options?: { level?: string; category?: string; limit?: number; offset?: number }) => Promise<unknown[]>;
    getLogStats: () => Promise<unknown>;
    clearLogs: (olderThan?: Date) => Promise<number>;
    exportLogs: (options?: { level?: string; category?: string; startDate?: Date; endDate?: Date }) => Promise<string>;
    logError: (userId: string, error: Error, context: string) => Promise<unknown>;
  };

  // Updater (electron-updater)
  updater: {
    getStatus: () => Promise<unknown>;
    checkForUpdates: () => Promise<unknown>;
    downloadUpdate: () => Promise<unknown>;
    quitAndInstall: () => Promise<void>;
    getVersion: () => Promise<string>;
    onStatus: (callback: (status: unknown) => void) => () => void;
  };

  // Backup operations
  backup: {
    getDataFolder: () => Promise<string>;
    setDataFolder: (path: string) => Promise<{ success: boolean }>;
    migrateData: (fromPath: string, toPath: string) => Promise<{ success: boolean }>;
    openFolder: () => Promise<{ success: boolean }>;
    create: (type: 'full' | 'incremental') => Promise<BackupFile>;
    list: () => Promise<BackupFile[]>;
    delete: (backupId: string) => Promise<{ success: boolean }>;
    restorePreview: (backupId: string) => Promise<RestorePreview>;
    restore: (backupId: string) => Promise<{ success: boolean }>;
    setAutoConfig: (config: BackupConfig) => Promise<{ success: boolean }>;
    importZipPreview: (
      source: { source: 'external'; filePath: string } | { source: 'backupId'; backupId: string }
    ) => Promise<RestorePreview>;
    importZipApply: (
      source: { source: 'external'; filePath: string } | { source: 'backupId'; backupId: string }
    ) => Promise<ImportResult>;
    exportZip: (
      source: { source: 'current' } | { source: 'backupId'; backupId: string }
    ) => Promise<{ success: boolean; savedPath?: string }>;

    exportJson: () => Promise<{ success: boolean; savedPath?: string }>;
    exportCsv: () => Promise<{ success: boolean; savedPath?: string }>;

    importJsonPreview: (input: { filePath: string } | { json: string }) => Promise<RestorePreview>;
    importJsonApply: (input: { filePath: string } | { json: string }) => Promise<ImportResult>;

    importCsvPreview: (input: { filePath: string } | { csv: string }) => Promise<RestorePreview>;
    importCsvApply: (input: { filePath: string } | { csv: string }) => Promise<ImportResult>;

    importEnexPreview: (input: { filePath: string } | { enex: string }) => Promise<RestorePreview>;
    importEnexApply: (input: { filePath: string } | { enex: string }) => Promise<ImportResult>;

    cloudConnect: () => Promise<{ success: boolean; error?: string }>;
    cloudDisconnect: () => Promise<{ success: boolean }>;
    cloudStatus: () => Promise<CloudSyncStatus>;
    cloudSyncNow: () => Promise<CloudSyncResult>;
    cloudListRemoteBackups: () => Promise<CloudRemoteFile[]>;
    cloudDownloadRemoteBackup: (input: { fileId: string; name?: string }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    cloudDownloadLiveState: () => Promise<{ success: boolean; filePath?: string; error?: string }>;
    cloudSaveCredentials: (input: { url: string; username: string; password: string }) => Promise<{ success: boolean; error?: string }>;
    cloudTestConnection: (input: { url: string; username: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  };

  // Auth operations (OAuth)
  auth: {
    openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
  };

  // System operations
  system: {
    platform: string;
    version: string;
    getMachineId: () => Promise<string>;
    selectImportSource: (options?: SelectImportSourceOptions) => Promise<ImportSourceSelectionResult>;
    selectImportFile: (options?: SelectImportFileOptions) => Promise<ImportSourceSelectionResult>;
    selectImportFolder: (options?: SelectImportFolderOptions) => Promise<ImportSourceSelectionResult>;
    selectFolder: () => Promise<OpenDialogReturnValue>;
    selectZipFile: () => Promise<OpenDialogReturnValue>;
  };

  // Generic invoke method for flexibility
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;

  // Event listeners
  on: (channel: string, callback: (...args: unknown[]) => void) => void;
  off: (channel: string, callback: (...args: unknown[]) => void) => void;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {

  // New Task operations
  tasks: {
    getAll: () => ipcRenderer.invoke('tasks:getAll'),
    getByStatus: (status: string) => ipcRenderer.invoke('tasks:getByStatus', status),
    create: (taskData: unknown) => ipcRenderer.invoke('tasks:create', taskData),
    update: (id: number, updates: unknown) => ipcRenderer.invoke('tasks:update', id, updates),
    delete: (id: number) => ipcRenderer.invoke('tasks:delete', id),
    getStats: () => ipcRenderer.invoke('tasks:getStats'),
    clearAll: () => ipcRenderer.invoke('tasks:clearAll'),
  },

  // Database operations (includes tasks and notes)
  database: {
    // Task methods
    getAllTasks: () => ipcRenderer.invoke('database:getAllTasks'),
    getTasksByStatus: (status: string) => ipcRenderer.invoke('database:getTasksByStatus', status),
    createTask: (taskData: unknown) => ipcRenderer.invoke('database:createTask', taskData),
    updateTask: (id: number, updates: unknown) => ipcRenderer.invoke('database:updateTask', id, updates),
    deleteTask: (id: number) => ipcRenderer.invoke('database:deleteTask', id),
    getTaskStats: () => ipcRenderer.invoke('database:getTaskStats'),

    // Note methods
    getAllNotes: () => ipcRenderer.invoke('database:getAllNotes'),
    getNoteById: (id: number) => ipcRenderer.invoke('database:getNoteById', id),
    createNote: (noteData: unknown) => ipcRenderer.invoke('database:createNote', noteData),
    updateNote: (id: number, updates: unknown) => ipcRenderer.invoke('database:updateNote', id, updates),
    deleteNote: (id: number) => ipcRenderer.invoke('database:deleteNote', id),
    getNoteStats: () => ipcRenderer.invoke('database:getNoteStats'),
    linkNoteToTask: (noteId: number, taskId: number) => ipcRenderer.invoke('database:linkNoteToTask', noteId, taskId),
    unlinkNoteFromTask: (noteId: number) => ipcRenderer.invoke('database:unlinkNoteFromTask', noteId),

    // Novos métodos para vincular task->note
    linkTaskToNote: (taskId: number, noteId: number) => ipcRenderer.invoke('database:linkTaskToNote', taskId, noteId),
    unlinkTaskFromNote: (taskId: number) => ipcRenderer.invoke('database:unlinkTaskFromNote', taskId),

    // Legacy methods (for compatibility)
    create: (data: unknown) => ipcRenderer.invoke('database:create', data),
    read: (query: unknown) => ipcRenderer.invoke('database:read', query),
    update: (data: unknown) => ipcRenderer.invoke('database:update', data),
    delete: (id: string) => ipcRenderer.invoke('database:delete', id),

    // Backup/export
    exportData: () => ipcRenderer.invoke('database:exportData'),
    importData: (jsonData: string) => ipcRenderer.invoke('database:importData', jsonData),
  },

  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),
  },

  notifications: {
    showNative: (options: { title: string; body?: string; icon?: string }) => ipcRenderer.invoke('notifications:showNative', options),
  },

  logging: {
    logAction: (data: unknown) => ipcRenderer.invoke('logging:logAction', data),
    logTaskCreation: (userId: string, taskId: number, taskTitle: string) => ipcRenderer.invoke('logging:logTaskCreation', userId, taskId, taskTitle),
    logTaskUpdate: (userId: string, taskId: number, changes: unknown) => ipcRenderer.invoke('logging:logTaskUpdate', userId, taskId, changes),
    logTaskDeletion: (userId: string, taskId: number, taskTitle: string) => ipcRenderer.invoke('logging:logTaskDeletion', userId, taskId, taskTitle),
    logCategoryCreation: (userId: string, categoryId: number, categoryName: string) => ipcRenderer.invoke('logging:logCategoryCreation', userId, categoryId, categoryName),
    logCategoryUpdate: (userId: string, categoryId: number, changes: unknown) => ipcRenderer.invoke('logging:logCategoryUpdate', userId, categoryId, changes),
    logCategoryDeletion: (userId: string, categoryId: number, categoryName: string) => ipcRenderer.invoke('logging:logCategoryDeletion', userId, categoryId, categoryName),

    logSettingsChange: (userId: string, setting: string, oldValue: unknown, newValue: unknown) => ipcRenderer.invoke('logging:logSettingsChange', userId, setting, oldValue, newValue),

    // Métodos para recuperar logs
    getLogs: (options?: { level?: string; category?: string; limit?: number; offset?: number }) => ipcRenderer.invoke('logging:getLogs', options),
    getLogStats: () => ipcRenderer.invoke('logging:getLogStats'),
    clearLogs: (olderThan?: Date) => ipcRenderer.invoke('logging:clearLogs', olderThan),
    exportLogs: (options?: { level?: string; category?: string; startDate?: Date; endDate?: Date }) => ipcRenderer.invoke('logging:exportLogs', options),
    logError: (userId: string, error: Error, context: string) => ipcRenderer.invoke('logging:logError', userId, error.message, error.stack, context),
  },

  // Updater (electron-updater)
  updater: {
    getStatus: () => ipcRenderer.invoke('updater:getStatus'),
    checkForUpdates: () => ipcRenderer.invoke('updater:checkForUpdates'),
    downloadUpdate: () => ipcRenderer.invoke('updater:downloadUpdate'),
    quitAndInstall: () => ipcRenderer.invoke('updater:quitAndInstall'),
    getVersion: () => ipcRenderer.invoke('updater:getVersion'),
    onStatus: (callback: (status: unknown) => void) => {
      const handler = (_event: unknown, status: unknown) => callback(status);
      ipcRenderer.on('updater:status', handler);
      return () => { ipcRenderer.removeListener('updater:status', handler); };
    },
  },

  // Backup operations
  backup: {
    getDataFolder: () => ipcRenderer.invoke('backup:get-data-folder'),
    setDataFolder: (path: string) => ipcRenderer.invoke('backup:set-data-folder', path),
    migrateData: (fromPath: string, toPath: string) => ipcRenderer.invoke('backup:migrate-data', fromPath, toPath),

    openFolder: () => ipcRenderer.invoke('backup:open-folder'),
    create: (type: 'full' | 'incremental') => ipcRenderer.invoke('backup:create', type),
    list: () => ipcRenderer.invoke('backup:list'),
    delete: (backupId: string) => ipcRenderer.invoke('backup:delete', backupId),
    restorePreview: (backupId: string) => ipcRenderer.invoke('backup:restore-preview', backupId),
    restore: (backupId: string) => ipcRenderer.invoke('backup:restore', backupId),
    setAutoConfig: (config: BackupConfig) => ipcRenderer.invoke('backup:set-auto-config', config),
    importZipPreview: (source) => ipcRenderer.invoke('backup:import-zip-preview', source),
    importZipApply: (source) => ipcRenderer.invoke('backup:import-zip-apply', source),
    exportZip: (source) => ipcRenderer.invoke('backup:export-zip', source),

    exportJson: () => ipcRenderer.invoke('backup:export-json'),
    exportCsv: () => ipcRenderer.invoke('backup:export-csv'),

    importJsonPreview: (input: { filePath: string } | { json: string }) => ipcRenderer.invoke('backup:import-json-preview', input),
    importJsonApply: (input: { filePath: string } | { json: string }) => ipcRenderer.invoke('backup:import-json-apply', input),

    importCsvPreview: (input: { filePath: string } | { csv: string }) => ipcRenderer.invoke('backup:import-csv-preview', input),
    importCsvApply: (input: { filePath: string } | { csv: string }) => ipcRenderer.invoke('backup:import-csv-apply', input),

    importEnexPreview: (input: { filePath: string } | { enex: string }) => ipcRenderer.invoke('backup:import-enex-preview', input),
    importEnexApply: (input: { filePath: string } | { enex: string }) => ipcRenderer.invoke('backup:import-enex-apply', input),

    cloudConnect: () => ipcRenderer.invoke('cloud:connect'),
    cloudDisconnect: () => ipcRenderer.invoke('cloud:disconnect'),
    cloudStatus: () => ipcRenderer.invoke('cloud:status'),
    cloudSyncNow: () => ipcRenderer.invoke('cloud:sync-now'),
    cloudListRemoteBackups: () => ipcRenderer.invoke('cloud:list-remote-backups'),
    cloudDownloadRemoteBackup: (input: { fileId: string; name?: string }) => ipcRenderer.invoke('cloud:download-remote-backup', input),
    cloudDownloadLiveState: () => ipcRenderer.invoke('cloud:download-live-state'),
    cloudSaveCredentials: (input: { url: string; username: string; password: string }) => ipcRenderer.invoke('cloud:save-credentials', input),
    cloudTestConnection: (input: { url: string; username: string; password: string }) => ipcRenderer.invoke('cloud:test-connection', input),
  },

  // Auth operations (OAuth)
  auth: {
    openExternal: (url: string) => ipcRenderer.invoke('auth:openExternal', url),
  },

  // System operations
  system: {
    platform: process.platform,
    version: ipcRenderer.sendSync('app:getVersion'),
    getMachineId: () => ipcRenderer.invoke('system:getMachineId'),
    selectImportSource: (options?: SelectImportSourceOptions) => ipcRenderer.invoke('system:selectImportSource', options),
    selectImportFile: (options?: SelectImportFileOptions) => ipcRenderer.invoke('system:selectImportFile', options),
    selectImportFolder: (options?: SelectImportFolderOptions) => ipcRenderer.invoke('system:selectImportFolder', options),
    selectFolder: () => ipcRenderer.invoke('system:selectFolder'),
    selectZipFile: () => ipcRenderer.invoke('system:selectZipFile'),
  },

  // Generic invoke method
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),

  on: (channel: string, callback: (...args: unknown[]) => void) => {
    // Whitelist channels for security
    const validChannels = [
      'menu-new-task',
      'task-created',
      'task-updated',
      'task-deleted',
      'timer-tick',
      'notification-show',
      'updater:status',
      'auth:oauth-callback'
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },

  off: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  }
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts file)
  window.electronAPI = electronAPI;
} 