// Tipos para o sistema de backup e sincronização

export interface BackupMetadata {
  version: string;
  timestamp: string;
  type: 'full' | 'incremental';
  checksum: string;
  size: number;
  dataPath: string;
  itemCounts: {
    tasks: number;
    notes: number;
    categories: number;
  };
}

export interface BackupConfig {
  dataFolder: string; // pasta raiz configurável
  autoBackup: boolean;
  backupFrequency: 'hourly' | 'daily' | 'weekly';
  keepBackups: number; // quantos manter
  cloudSync: boolean;
  // Preparação para futuro
  cloudProvider?: 'webdav';
  cloudCredentials?: Record<string, unknown>;
}

export interface BackupFile {
  id: string;
  metadata: BackupMetadata;
  filePath: string;
  createdAt: string;
}

export interface RestorePreview {
  tasks: number;
  notes: number;
  categories: number;
  settings: boolean;
  conflicts: string[];
  warnings: string[];
}

export interface ImportResult {
  success: boolean;
  imported: {
    tasks: number;
    notes: number;
    categories: number;
  };
  warnings: Array<{
    type: 'task' | 'note' | 'category';
    message: string;
    item?: unknown;
  }>;
  errors: Array<{
    type: 'task' | 'note' | 'category';
    message: string;
    item?: unknown;
  }>;
  importedNotes?: Array<{
    title: string;
    content: string;
    format: 'text' | 'markdown';
    tags?: string[];
    attachedImages?: string[];
  }>;
  importedTasks?: Array<{
    title: string;
    description?: string;
    status?: string;
    priority?: string;
  }>;
}

export interface ImportProgress {
  stage: 'validating' | 'parsing' | 'importing' | 'complete' | 'error';
  currentType: 'tasks' | 'notes' | 'categories' | null;
  progress: {
    tasks: { current: number; total: number; status: 'pending' | 'processing' | 'complete' | 'error' };
    notes: { current: number; total: number; status: 'pending' | 'processing' | 'complete' | 'error' };
    categories: { current: number; total: number; status: 'pending' | 'processing' | 'complete' | 'error' };
  };
  result?: ImportResult;
}

export type ImportFormat = 
  | 'json'           // JSON genérico
  | 'csv'            // CSV
  | 'markdown'       // Markdown
  | 'enex'           // Evernote XML
  | 'html'           // HTML (Evernote/outros)
  | 'notion-json'    // Notion export
  | 'todoist-json'   // Todoist export
  | 'todoist-csv'    // Todoist CSV
  | 'trello-json';   // Trello export

export interface ExportOptions {
  format: 'json' | 'csv' | 'markdown' | 'zip';
  includeSettings?: boolean;
  includeCategories?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

// Preparação para autenticação futura
export interface CloudSyncConfig {
  enabled: boolean;
  provider: 'webdav';
  autoSync: boolean;
  syncInterval: number; // minutos
  lastSync?: string;
}

// Preparação para workspaces futuros
export interface WorkspaceInfo {
  id: string;
  name: string;
  ownerId: string;
  members: Array<{
    userId: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
  }>;
  tier: 'free' | 'premium' | 'enterprise';
}
