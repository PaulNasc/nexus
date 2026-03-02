import React, { useEffect, useRef, useState, useCallback } from 'react';

import { useSettings } from '../hooks/useSettings';
import { useI18n } from '../hooks/useI18n';
import { useTheme } from '../hooks/useTheme';
import { useNotifications } from '../hooks/useNotifications';
import { useTasks } from '../contexts/TasksContext';
import { useNotes } from '../contexts/NotesContext';
import { useSystemTags } from '../contexts/SystemTagsContext';
import { useStorageMode } from '../hooks/useStorageMode';
import { isModuleLocked } from '../config/featureFlags';

// import { CategoryManager } from './CategoryManager'; // Temporariamente desativado: seção removida de Configurações > Geral

import { Button } from './ui/Button';
import { ImportExportModal } from './ImportExportModal';
import { OrganizationsPanel } from './OrganizationsPanel';

import {
  Settings as SettingsIcon,
  Palette,
  Bell,
  Eye,
  Keyboard,
  MousePointer,
  Volume2,
  HardDrive,
  Users,
  Database,
  RefreshCw,
  Info,
  Copy,
  RotateCcw,
  Save,
  X,
  Layout,
  AlertCircle,
  Upload,
  Download,
  TestTube,
  Type,
} from 'lucide-react';
import type { ImportResult, RestorePreview } from '../../shared/types/backup';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
interface SettingsLogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
}

interface UpdaterStatus {
  state: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  releaseNotes?: string;
  error?: string;
  isPortable?: boolean;
  progress?: { percent: number; bytesPerSecond: number; transferred: number; total: number };
}

const LogViewerContent: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [logs, setLogs] = useState<SettingsLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [search, setSearch] = useState('');

  const getElectron = () => (window as unknown as { electronAPI?: import('../../main/preload').ElectronAPI }).electronAPI;

  const loadLogs = async () => {
    setLoading(true);
    try {
      const result = await getElectron()?.logging?.getLogs?.({ level: level || undefined, category: category || undefined, limit: 300 });
      setLogs(Array.isArray(result) ? (result as SettingsLogEntry[]) : []);
    } catch (error) {
      console.error('Falha ao carregar logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const result = await getElectron()?.logging?.getLogs?.({ level: level || undefined, category: category || undefined, limit: 300 });
        setLogs(Array.isArray(result) ? (result as SettingsLogEntry[]) : []);
      } catch (error) {
        console.error('Falha ao carregar logs:', error);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [level, category]);

  const filtered = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const dataText = log.data ? JSON.stringify(log.data).toLowerCase() : '';
    return log.message.toLowerCase().includes(q) || log.category.toLowerCase().includes(q) || dataText.includes(q);
  });

  const handleClear = async () => {
    try {
      await getElectron()?.logging?.clearLogs?.();
      await loadLogs();
    } catch (error) {
      console.error('Falha ao limpar logs:', error);
    }
  };

  const handleExport = async () => {
    try {
      await getElectron()?.logging?.exportLogs?.({ level: level || undefined, category: category || undefined });
    } catch (error) {
      console.error('Falha ao exportar logs:', error);
    }
  };

  const getLevelColor = (currentLevel: LogLevel) => {
    if (currentLevel === 'error') return '#EF4444';
    if (currentLevel === 'warn') return '#F59E0B';
    if (currentLevel === 'info') return '#3B82F6';
    return '#6B7280';
  };

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px',
        padding: '14px',
        borderRadius: '10px',
        border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
        backgroundColor: isDark ? '#0F0F0F' : '#F9FAFB',
      }}>
        <select value={level} onChange={(e) => setLevel(e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px' }}>
          <option value="">Todos os níveis</option>
          <option value="debug">Debug</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
        </select>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Categoria (ex: system)"
          style={{ padding: '8px 10px', borderRadius: '8px' }}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar nos logs"
          style={{ padding: '8px 10px', borderRadius: '8px' }}
        />
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button onClick={() => { void loadLogs(); }} disabled={loading}>Atualizar</Button>
          <Button onClick={handleExport} variant="secondary">Exportar</Button>
          <Button onClick={handleClear} variant="danger">Limpar</Button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {loading && <div style={{ fontSize: '13px', color: isDark ? '#A0A0A0' : '#6B7280' }}>Carregando logs...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{
            padding: '16px',
            borderRadius: '10px',
            border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
            backgroundColor: isDark ? '#0F0F0F' : '#FFFFFF',
            color: isDark ? '#A0A0A0' : '#6B7280',
            fontSize: '13px',
          }}>
            Nenhum log encontrado.
          </div>
        )}
        {filtered.map((log, index) => (
          <div key={`${log.timestamp}-${index}`} style={{
            padding: '12px 14px',
            borderRadius: '10px',
            border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
            backgroundColor: isDark ? '#0F0F0F' : '#FFFFFF',
          }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: '#FFFFFF', backgroundColor: getLevelColor(log.level), borderRadius: '4px', padding: '2px 6px', textTransform: 'uppercase', fontWeight: 700 }}>{log.level}</span>
              <span style={{ fontSize: '11px', color: isDark ? '#A0A0A0' : '#6B7280' }}>{log.category}</span>
              <span style={{ fontSize: '11px', color: isDark ? '#777' : '#9CA3AF' }}>{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
            </div>
            <div style={{ fontSize: '13px', color: isDark ? '#E5E7EB' : '#1F2937' }}>{log.message}</div>
            {Boolean(log.data) && (
              <details style={{ marginTop: '8px' }}>
                <summary style={{ cursor: 'pointer', fontSize: '12px', color: isDark ? '#00D4AA' : '#059669' }}>Dados adicionais</summary>
                <pre style={{ marginTop: '6px', fontSize: '11px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: isDark ? '#A0A0A0' : '#4B5563' }}>{JSON.stringify(log.data, null, 2)}</pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const UpdateManagementPanel: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [status, setStatus] = useState<UpdaterStatus>({ state: 'idle' });
  const [autoDownload, setAutoDownload] = useState(false);

  const getElectron = () => (window as unknown as { electronAPI?: import('../../main/preload').ElectronAPI }).electronAPI;

  useEffect(() => {
    const electron = getElectron();
    if (!electron?.updater) return;

    electron.updater.getStatus().then((s) => setStatus(s as UpdaterStatus)).catch(() => {});
    electron.settings.get('autoDownloadUpdates').then((value) => {
      if (typeof value === 'boolean') setAutoDownload(value);
    }).catch(() => {});

    const unsubscribe = electron.updater.onStatus((s) => setStatus(s as UpdaterStatus));
    return () => {
      unsubscribe?.();
    };
  }, []);

  const checkUpdates = async () => {
    try {
      const next = await getElectron()?.updater?.checkForUpdates?.();
      if (next) setStatus(next as UpdaterStatus);
    } catch (error) {
      console.error('Falha ao verificar atualizações:', error);
    }
  };

  const downloadUpdate = async () => {
    try {
      await getElectron()?.updater?.downloadUpdate?.();
    } catch (error) {
      console.error('Falha ao baixar atualização:', error);
    }
  };

  const installUpdate = async () => {
    try {
      await getElectron()?.updater?.quitAndInstall?.();
    } catch (error) {
      console.error('Falha ao instalar atualização:', error);
    }
  };

  const toggleAutoDownload = async (checked: boolean) => {
    setAutoDownload(checked);
    try {
      await getElectron()?.settings?.set('autoDownloadUpdates', checked);
    } catch (error) {
      console.error('Falha ao salvar preferência de atualização automática:', error);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{
        padding: '16px',
        borderRadius: '10px',
        border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
        backgroundColor: isDark ? '#0F0F0F' : '#FFFFFF',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '12px', color: isDark ? '#A0A0A0' : '#6B7280' }}>Status</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: isDark ? '#FFFFFF' : '#1F2937' }}>{status.state}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: isDark ? '#A0A0A0' : '#6B7280' }}>Versão disponível</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: isDark ? '#FFFFFF' : '#1F2937' }}>{status.version || '-'}</div>
          </div>
        </div>

        {status.releaseNotes && (
          <details style={{ marginBottom: '12px' }}>
            <summary style={{ cursor: 'pointer', fontSize: '13px', color: isDark ? '#00D4AA' : '#059669' }}>Release notes</summary>
            <pre style={{ marginTop: '8px', whiteSpace: 'pre-wrap', fontSize: '12px', color: isDark ? '#A0A0A0' : '#4B5563' }}>{status.releaseNotes}</pre>
          </details>
        )}

        {status.progress && status.state === 'downloading' && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ width: '100%', height: '6px', borderRadius: '999px', backgroundColor: isDark ? '#2A2A2A' : '#E5E7EB', overflow: 'hidden' }}>
              <div style={{ width: `${status.progress.percent}%`, height: '100%', background: 'linear-gradient(90deg, #00D4AA, #7B3FF2)' }} />
            </div>
            <div style={{ fontSize: '11px', marginTop: '4px', color: isDark ? '#A0A0A0' : '#6B7280' }}>{status.progress.percent}%</div>
          </div>
        )}

        {status.error && (
          <div style={{ marginBottom: '12px', fontSize: '12px', color: '#EF4444' }}>{status.error}</div>
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button onClick={checkUpdates}>
            <RefreshCw size={15} style={{ marginRight: '6px' }} />
            Verificar Atualizações
          </Button>
          {(status.state === 'available' || status.state === 'downloading') && (
            <Button onClick={downloadUpdate} variant="secondary">
              <Download size={15} style={{ marginRight: '6px' }} />
              Baixar
            </Button>
          )}
          {status.state === 'downloaded' && (
            <Button onClick={installUpdate}>
              Instalar e Reiniciar
            </Button>
          )}
        </div>
      </div>

      <div style={{
        padding: '16px',
        borderRadius: '10px',
        border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
        backgroundColor: isDark ? '#0F0F0F' : '#FFFFFF',
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={autoDownload}
            onChange={(e) => { void toggleAutoDownload(e.target.checked); }}
            style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary-teal)' }}
          />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: isDark ? '#FFFFFF' : '#1F2937' }}>Download automático</div>
            <div style={{ fontSize: '12px', color: isDark ? '#A0A0A0' : '#6B7280' }}>Baixar atualização automaticamente quando houver nova versão</div>
          </div>
        </label>
      </div>
    </div>
  );
};

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
};

type TabType = 'geral' | 'aparencia' | 'notificacoes' | 'acessibilidade' | 'dados' | 'organizacoes' | 'logs' | 'atualizacoes' | 'sobre';

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {

  const {
    settings,
    updateSettings,
    resetSettings,
    clearAllData,
    systemInfo,
  } = useSettings();
  const { t, currentLanguage, changeLanguage, getAvailableLanguages } = useI18n();
  const { theme: rawTheme } = useTheme();
  const { showNotification } = useNotifications();
  const { createTask } = useTasks();
  const { createNote, fetchNotes } = useNotes();
  const { tags: systemTags } = useSystemTags();
  const { useCloud } = useStorageMode();

  const [activeTab, setActiveTab] = useState<TabType>('geral');
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [importExportModalOpen, setImportExportModalOpen] = useState(false);
  const [importExportMode, setImportExportMode] = useState<'import' | 'export'>('export');

  type ImportExportModalPropsType = React.ComponentProps<typeof ImportExportModal>;
  type ImportIntent = Parameters<ImportExportModalPropsType['onImportPreview']>[0];
  type ExportFormat = Parameters<ImportExportModalPropsType['onExport']>[0];
  type ImportApplyProgressHandlers = Parameters<ImportExportModalPropsType['onImportApply']>[2];
  type RetrySyncHandler = NonNullable<ImportExportModalPropsType['onRetryImportSync']>;
  type RetrySyncItems = Parameters<RetrySyncHandler>[0];
  const [initialImportIntent, setInitialImportIntent] = useState<ImportIntent | null>(null);

  const resolvedMode: 'light' | 'dark' =
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const isDark = resolvedMode === 'dark';
  const theme = { ...rawTheme, mode: resolvedMode };

  const getElectron = () => (window as unknown as { electronAPI: import('../../main/preload').ElectronAPI }).electronAPI;

  const dragDepthRef = useRef(0);
  const isSettingsOpenRef = useRef(isOpen);
  const externalDragSessionRef = useRef(false);
  const openedFromExternalImportRef = useRef(false);
  const settingsWasOpenBeforeExternalRef = useRef(false);
  const [isFileDragActive, setIsFileDragActive] = useState(false);

  useEffect(() => {
    isSettingsOpenRef.current = isOpen;
  }, [isOpen]);

  const closeImportExportModal = useCallback(() => {
    setImportExportModalOpen(false);
    setInitialImportIntent(null);
    setIsFileDragActive(false);
    dragDepthRef.current = 0;
    externalDragSessionRef.current = false;

    const shouldCloseSettings =
      openedFromExternalImportRef.current &&
      !settingsWasOpenBeforeExternalRef.current &&
      isSettingsOpenRef.current;

    openedFromExternalImportRef.current = false;
    settingsWasOpenBeforeExternalRef.current = false;

    if (shouldCloseSettings) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    const hasFiles = (event: DragEvent): boolean => {
      const types = event.dataTransfer?.types;
      if (!types) return false;
      return Array.from(types).includes('Files');
    };

    const onDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepthRef.current += 1;

      if (!externalDragSessionRef.current) {
        externalDragSessionRef.current = true;
        openedFromExternalImportRef.current = true;
        settingsWasOpenBeforeExternalRef.current = isSettingsOpenRef.current;
        if (!isSettingsOpenRef.current) {
          window.dispatchEvent(new Event('openSettings'));
        }
        setImportExportMode('import');
        setInitialImportIntent(null);
        setImportExportModalOpen(true);
      }

      setIsFileDragActive(true);
    };

    const onDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
      setIsFileDragActive(true);
    };

    const onDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

      if (dragDepthRef.current === 0 && externalDragSessionRef.current) {
        closeImportExportModal();
      }
    };

    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepthRef.current = 0;
      externalDragSessionRef.current = false;
      setIsFileDragActive(false);

      const droppedPath = event.dataTransfer?.files?.[0]?.path;
      if (!droppedPath) {
        closeImportExportModal();
        return;
      }

      window.dispatchEvent(new CustomEvent('openImportIntent', {
        detail: { filePath: droppedPath, source: 'external-dnd' },
      }));
    };

    const onWindowBlur = () => {
      if (externalDragSessionRef.current) {
        closeImportExportModal();
      }
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    window.addEventListener('blur', onWindowBlur);

    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [closeImportExportModal]);

  useEffect(() => {
    const detectIntentFromPath = (filePath: string): ImportIntent => {
      const lower = filePath.toLowerCase();

      if (lower.endsWith('.zip') || lower.endsWith('.rar')) return { kind: 'zip', filePath };
      if (lower.endsWith('.json')) return { kind: 'json', filePath };
      if (lower.endsWith('.csv')) return { kind: 'csv', filePath };
      if (lower.endsWith('.enex')) return { kind: 'enex', filePath };
      if (lower.endsWith('.html') || lower.endsWith('.htm')) return { kind: 'html-file', filePath };
      if (lower.endsWith('.pdf')) return { kind: 'pdf-file', filePath };
      if (lower.endsWith('.txt')) return { kind: 'txt-file', filePath };
      if (lower.endsWith('.md') || lower.endsWith('.markdown')) return { kind: 'md-file', filePath };
      if (lower.endsWith('.mp4')) return { kind: 'mp4-file', filePath };

      return {
        kind: 'unsupported',
        filePath,
        reason: 'Formato de arquivo não suportado para importação',
      };
    };

    const handleOpenImportIntent = (event: Event) => {
      const detail = (event as CustomEvent<{ intent?: ImportIntent; filePath?: string; source?: string }>).detail;
      const fromExternalDrag = detail?.source === 'external-dnd';
      const intent = detail?.intent ?? (detail?.filePath ? detectIntentFromPath(detail.filePath) : undefined);
      if (!intent) return;

      if (fromExternalDrag) {
        openedFromExternalImportRef.current = true;
        if (!isSettingsOpenRef.current) {
          window.dispatchEvent(new Event('openSettings'));
        }
      } else {
        openedFromExternalImportRef.current = false;
        settingsWasOpenBeforeExternalRef.current = false;
        window.dispatchEvent(new Event('openSettings'));
      }

      externalDragSessionRef.current = false;
      dragDepthRef.current = 0;
      setIsFileDragActive(false);
      setImportExportMode('import');
      setInitialImportIntent(intent);
      setImportExportModalOpen(true);
    };

    window.addEventListener('openImportIntent', handleOpenImportIntent);
    return () => {
      window.removeEventListener('openImportIntent', handleOpenImportIntent);
    };
  }, []);

  if (!isOpen) return null;

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // Implementation for toast notifications
    console.log(`Toast: ${message} (${type})`);
  };

  const handleSave = () => {
    // Settings are auto-saved via useSettings hook
    showToast(t('settings.saved'), 'success');
    onClose();
  };

  const handleReset = async () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      return;
    }

    setIsResetting(true);
    try {
      resetSettings();
      showToast(t('settings.saved'), 'success');
      setShowResetConfirm(false);
    } catch (error) {
      console.error('Error resetting settings:', error);
    } finally {
      setIsResetting(false);
    }
  };

  const handleClearAllData = async () => {
    if (!showClearDataConfirm) {
      setShowClearDataConfirm(true);
      return;
    }

    setIsClearing(true);
    try {
      const success = await clearAllData();
      if (success) {
        showToast(t('accessibility.clearDataSuccess'), 'success');
        setShowClearDataConfirm(false);
        // Reload page to reflect changes
        window.location.reload();
      } else {
        showToast('Erro ao limpar dados', 'error');
      }
    } catch (error) {
      console.error('Error clearing data:', error);
      showToast('Erro ao limpar dados', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  const handleTestNotification = () => {
    showNotification({
      title: t('settings.notifications.test'),
      body: 'Esta é uma notificação de teste do Nexus',
    });
  };

  const handleImportExportPreview = async (intent: ImportIntent): Promise<RestorePreview | null> => {

    try {
      const electron = getElectron();
      if (intent?.kind === 'zip') return await electron.backup.importZipPreview({ source: 'external', filePath: intent.filePath });
      if (intent?.kind === 'zip-backup') return await electron.backup.importZipPreview({ source: 'backupId', backupId: intent.backupId });
      if (intent?.kind === 'json') return await electron.backup.importJsonPreview({ filePath: intent.filePath });
      if (intent?.kind === 'csv') return await electron.backup.importCsvPreview({ filePath: intent.filePath });
      if (intent?.kind === 'enex') return await electron.backup.importEnexPreview({ filePath: intent.filePath });
      if (intent?.kind === 'html-file') return await electron.invoke('import:html-preview', { filePath: intent.filePath }) as RestorePreview;
      if (intent?.kind === 'pdf-file') return await electron.invoke('import:pdf-preview', { filePath: intent.filePath }) as RestorePreview;
      if (intent?.kind === 'txt-file') return await electron.invoke('import:txt-preview', { filePath: intent.filePath }) as RestorePreview;
      if (intent?.kind === 'md-file') return await electron.invoke('import:md-preview', { filePath: intent.filePath }) as RestorePreview;
      if (intent?.kind === 'folder') return await electron.invoke('import:folder-preview', { folderPath: intent.folderPath }) as RestorePreview;
      return null;

    } catch (err) {
      console.error('Erro ao gerar preview do import:', err);
      return null;
    }
  };

  const handleImportExportApply = async (
    intent: ImportIntent,
    options?: { color?: string; systemTagId?: number },
    progressHandlers?: ImportApplyProgressHandlers,
  ): Promise<ImportResult | null> => {
    try {
      const electron = getElectron();
      let result: ImportResult | null = null;
      const selectedSystemTag =
        options?.systemTagId !== undefined
          ? systemTags.find((tag) => tag.id === options.systemTagId && tag.is_active)
          : undefined;
      const mergeSystemTag = (tags: string[] | undefined, systemTagName?: string): string[] => {
        const safe = Array.isArray(tags) ? tags : [];
        if (!systemTagName) return safe;
        const deduped = safe.filter((tag) => tag.toLowerCase() !== systemTagName.toLowerCase());
        return [systemTagName, ...deduped];
      };

      if (intent?.kind === 'zip') result = await electron.backup.importZipApply({ source: 'external', filePath: intent.filePath });
      else if (intent?.kind === 'zip-backup') result = await electron.backup.importZipApply({ source: 'backupId', backupId: intent.backupId });
      else if (intent?.kind === 'json') result = await electron.backup.importJsonApply({ filePath: intent.filePath });
      else if (intent?.kind === 'csv') result = await electron.backup.importCsvApply({ filePath: intent.filePath });
      else if (intent?.kind === 'enex') result = await electron.backup.importEnexApply({ filePath: intent.filePath });
      else if (intent?.kind === 'html-file') result = await electron.invoke('import:html-apply', { filePath: intent.filePath, systemTagId: selectedSystemTag?.id, systemTagName: selectedSystemTag?.name }) as ImportResult;
      else if (intent?.kind === 'pdf-file') result = await electron.invoke('import:pdf-apply', { filePath: intent.filePath }) as ImportResult;
      else if (intent?.kind === 'txt-file') result = await electron.invoke('import:txt-apply', { filePath: intent.filePath, systemTagId: selectedSystemTag?.id, systemTagName: selectedSystemTag?.name }) as ImportResult;
      else if (intent?.kind === 'md-file') result = await electron.invoke('import:md-apply', { filePath: intent.filePath, systemTagId: selectedSystemTag?.id, systemTagName: selectedSystemTag?.name }) as ImportResult;
      else if (intent?.kind === 'mp4-file') result = await electron.invoke('import:mp4-apply', { filePath: intent.filePath, systemTagId: selectedSystemTag?.id, systemTagName: selectedSystemTag?.name }) as ImportResult;
      else if (intent?.kind === 'folder') result = await electron.invoke('import:folder-apply', { folderPath: intent.folderPath }) as ImportResult;

      if (result?.importedNotes) {
        result.importedNotes = result.importedNotes.map(n => ({
          ...n,
          title: n.title ? n.title.charAt(0).toUpperCase() + n.title.slice(1) : n.title,
          systemTagId: selectedSystemTag?.id ?? n.systemTagId,
          systemTagName: selectedSystemTag?.name ?? n.systemTagName,
          tags: mergeSystemTag(n.tags, selectedSystemTag?.name ?? n.systemTagName),
        }));
      }

      if (result?.success) {
        if (useCloud) {
          let syncedNotes = 0;
          let syncedTasks = 0;
          const noteSyncResults: NonNullable<ImportResult['syncResults']>['notes'] = [];
          const taskSyncResults: NonNullable<ImportResult['syncResults']>['tasks'] = [];

          const initialSyncItems: RetrySyncItems = [
            ...(result.importedNotes || []).map((note, index) => ({
              id: `note-${index}`,
              type: 'note' as const,
              title: note.title,
              status: 'pending' as const,
              retryPayload: { type: 'note' as const, note },
            })),
            ...(result.importedTasks || []).map((task, index) => ({
              id: `task-${index}`,
              type: 'task' as const,
              title: task.title,
              status: 'pending' as const,
              retryPayload: { type: 'task' as const, task },
            })),
          ];
          progressHandlers?.onSyncStart?.(initialSyncItems);

          if (result.importedNotes && result.importedNotes.length > 0) {
            for (const [index, note] of result.importedNotes.entries()) {
              const itemId = `note-${index}`;
              progressHandlers?.onSyncUpdate?.({
                id: itemId,
                type: 'note',
                title: note.title,
                status: 'processing',
                message: 'Enviando...',
                retryPayload: { type: 'note', note },
              });

              try {
                const created = await createNote({
                  title: note.title,

                  content: note.content,
                  format: note.format || 'text',
                  tags: mergeSystemTag(note.tags, note.systemTagName),
                  attachedImages: note.attachedImages,
                  attachedVideos: note.attachedVideos,
                  linkedTaskIds: note.linkedTaskIds,
                  color: options?.color || note.color,
                  system_tag_id: note.systemTagId,
                });

                if (created) {
                  syncedNotes += 1;
                  noteSyncResults.push({ title: note.title, status: 'success' });
                  progressHandlers?.onSyncUpdate?.({
                    id: itemId,
                    type: 'note',
                    title: note.title,
                    status: 'success',
                    retryPayload: { type: 'note', note },
                  });
                } else {
                  noteSyncResults.push({
                    title: note.title,
                    status: 'skipped',
                    message: 'Nota duplicada (já existente).',
                  });
                  progressHandlers?.onSyncUpdate?.({
                    id: itemId,
                    type: 'note',
                    title: note.title,
                    status: 'skipped',
                    message: 'Nota duplicada (já existente).',
                    retryPayload: { type: 'note', note },
                  });
                }
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Falha ao sincronizar nota';
                noteSyncResults.push({ title: note.title, status: 'error', message });
                result.errors.push({ type: 'note', message, item: { title: note.title } });
                progressHandlers?.onSyncUpdate?.({
                  id: itemId,
                  type: 'note',
                  title: note.title,
                  status: 'error',
                  message,
                  retryPayload: { type: 'note', note },
                });
              }
            }
          }

          if (result.importedTasks && result.importedTasks.length > 0) {
            for (const [index, task] of result.importedTasks.entries()) {
              const itemId = `task-${index}`;
              progressHandlers?.onSyncUpdate?.({
                id: itemId,
                type: 'task',
                title: task.title,
                status: 'processing',
                message: 'Enviando...',
                retryPayload: { type: 'task', task },
              });

              try {
                const createdTask = await createTask({
                  title: task.title,

                  description: task.description,
                  status: (task.status as 'backlog' | 'esta_semana' | 'hoje' | 'concluido') || 'backlog',
                  priority: (task.priority as 'low' | 'medium' | 'high') || 'medium',
                });

                if (createdTask) {
                  syncedTasks += 1;
                  taskSyncResults.push({ title: task.title, status: 'success' });
                  progressHandlers?.onSyncUpdate?.({
                    id: itemId,
                    type: 'task',
                    title: task.title,
                    status: 'success',
                    retryPayload: { type: 'task', task },
                  });
                } else {
                  taskSyncResults.push({
                    title: task.title,
                    status: 'skipped',
                    message: 'Tarefa duplicada (já existente).',
                  });
                  progressHandlers?.onSyncUpdate?.({
                    id: itemId,
                    type: 'task',
                    title: task.title,
                    status: 'skipped',
                    message: 'Tarefa duplicada (já existente).',
                    retryPayload: { type: 'task', task },
                  });
                }
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Falha ao sincronizar tarefa';
                taskSyncResults.push({ title: task.title, status: 'error', message });
                result.errors.push({ type: 'task', message, item: { title: task.title } });
                progressHandlers?.onSyncUpdate?.({
                  id: itemId,
                  type: 'task',
                  title: task.title,
                  status: 'error',
                  message,
                  retryPayload: { type: 'task', task },
                });
              }
            }
          }

          result.syncResults = {
            notes: noteSyncResults,
            tasks: taskSyncResults,
          };

          if (result.imported.notes > syncedNotes) {
            result.warnings.push({
              type: 'note',
              message: `Algumas notas não foram sincronizadas na nuvem (${syncedNotes}/${result.imported.notes}).`,
            });
          }

          if (result.imported.tasks > syncedTasks) {
            result.warnings.push({
              type: 'task',
              message: `Algumas tarefas não foram sincronizadas na nuvem (${syncedTasks}/${result.imported.tasks}).`,
            });
          }

          result.imported.notes = syncedNotes;
          result.imported.tasks = syncedTasks;
          progressHandlers?.onSyncComplete?.();
        }
      }
      return result;
    } catch (err) {

      console.error('Erro ao aplicar import:', err);
      return null;
    }
  };

  const handleImportExportExport = async (format: ExportFormat) => {
    try {
      const electron = getElectron();
      if (format === 'zip') { await electron.backup.exportZip({ source: 'current' }); return; }
      if (format === 'json') { await electron.backup.exportJson(); return; }
      if (format === 'csv') { await electron.backup.exportCsv(); }
    } catch (err) {
      console.error('Erro ao exportar:', err);
    }
  };

  const handleOpenImportExportModal = (mode: 'import' | 'export') => {
    openedFromExternalImportRef.current = false;
    settingsWasOpenBeforeExternalRef.current = false;
    externalDragSessionRef.current = false;
    dragDepthRef.current = 0;
    setIsFileDragActive(false);
    setImportExportMode(mode);
    setInitialImportIntent(null);
    setImportExportModalOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('ID copiado para a área de transferência', 'success');
  };

  const tabs = [
    { id: 'geral', label: t('settings.general'), icon: <SettingsIcon size={16} strokeWidth={1.7} /> },
    { id: 'aparencia', label: t('settings.appearance'), icon: <Palette size={16} strokeWidth={1.7} /> },
    { id: 'notificacoes', label: t('settings.notifications'), icon: <Bell size={16} strokeWidth={1.7} /> },
    { id: 'acessibilidade', label: t('settings.accessibility'), icon: <Eye size={16} strokeWidth={1.7} /> },
    { id: 'dados', label: 'Dados & Armazenamento', icon: <HardDrive size={16} strokeWidth={1.7} /> },
    { id: 'organizacoes', label: 'Organizações', icon: <Users size={16} strokeWidth={1.7} /> },
    { id: 'logs', label: 'Logs', icon: <Database size={16} strokeWidth={1.7} /> },
    { id: 'atualizacoes', label: 'Atualizações', icon: <RefreshCw size={16} strokeWidth={1.7} /> },
    { id: 'sobre', label: t('settings.about'), icon: <Info size={16} strokeWidth={1.7} /> },
  ];

  const handleRetryImportSync: RetrySyncHandler = async (items) => {
    const updatedItems: RetrySyncItems = [];

    for (const item of items) {
      if (!item.retryPayload) {
        updatedItems.push({ ...item, status: 'error', message: 'Dados de reenvio não disponíveis.' });
        continue;
      }

      if (item.retryPayload.type === 'note') {
        const note = item.retryPayload.note;
        try {
          const created = await createNote({
            title: note.title,
            content: note.content,
            format: note.format || 'text',
            tags: note.tags,
            attachedImages: note.attachedImages,
            attachedVideos: note.attachedVideos,
            linkedTaskIds: note.linkedTaskIds,
            color: note.color,
            system_tag_id: note.systemTagId,
          });

          updatedItems.push({
            ...item,
            status: created ? 'success' : 'skipped',
            message: created ? undefined : 'Nota duplicada (já existente).',
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Falha ao reenviar nota';
          updatedItems.push({ ...item, status: 'error', message });
        }
        continue;
      }

      const task = item.retryPayload.task;
      try {
        const createdTask = await createTask({
          title: task.title,
          description: task.description,
          status: (task.status as 'backlog' | 'esta_semana' | 'hoje' | 'concluido') || 'backlog',
          priority: (task.priority as 'low' | 'medium' | 'high') || 'medium',
        });

        updatedItems.push({
          ...item,
          status: createdTask ? 'success' : 'skipped',
          message: createdTask ? undefined : 'Tarefa duplicada (já existente).',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha ao reenviar tarefa';
        updatedItems.push({ ...item, status: 'error', message });
      }
    }

    await fetchNotes();
    return updatedItems;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: isFileDragActive ? 'rgba(3, 8, 12, 0.86)' : 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: isFileDragActive ? 'blur(6px)' : 'blur(4px)',
    }}>
      {isFileDragActive && (
        <div
          style={{
            position: 'fixed',
            top: '22px',
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            padding: '10px 16px',
            borderRadius: '999px',
            border: '1px dashed rgba(0, 212, 170, 0.6)',
            background: 'rgba(10, 18, 24, 0.88)',
            color: '#E6FBF5',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.2px',
          }}
        >
          Solte o arquivo para importar
        </div>
      )}
      <div style={{
        backgroundColor: theme.mode === 'dark' ? '#141414' : 'var(--color-bg-card)',
        border: `1px solid ${theme.mode === 'dark' ? '#2A2A2A' : 'var(--color-border-primary)'}`,
        borderRadius: '16px',
        width: '90%',
        maxWidth: '900px',
        maxHeight: '85vh',
        display: 'flex',
        overflow: 'hidden',
        boxShadow: theme.mode === 'dark' ? '0 20px 40px rgba(0, 0, 0, 0.6)' : 'var(--shadow-2xl)',
        transition: 'all var(--transition-theme)',
      }}>
        {/* Sidebar com abas */}
        <div style={{
          width: '220px',
          backgroundColor: theme.mode === 'dark' ? '#0A0A0A' : 'var(--color-bg-secondary)',
          borderRight: `1px solid ${theme.mode === 'dark' ? '#2A2A2A' : 'var(--color-border-primary)'}`,
          padding: '24px 0',
        }}>
          <div style={{
            padding: '0 24px',
            marginBottom: '24px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)'
            }}>
              <SettingsIcon size={28} style={{ color: 'var(--color-primary-teal)' }} />
              <h2 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 600,
                color: theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)',
                background: 'linear-gradient(135deg, #00D4AA 0%, #7B3FF2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Configurações
              </h2>
            </div>
          </div>
          
          <nav>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  backgroundColor: activeTab === tab.id 
                    ? (theme.mode === 'dark' ? '#2A2A2A' : 'var(--color-bg-tertiary)') 
                    : 'transparent',
                  border: 'none',
                  borderLeft: activeTab === tab.id ? '3px solid #00D4AA' : '3px solid transparent',
                  color: activeTab === tab.id 
                    ? (theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)') 
                    : (theme.mode === 'dark' ? '#A0A0A0' : 'var(--color-text-secondary)'),
                  fontSize: '14px',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.backgroundColor = theme.mode === 'dark' ? '#1A1A1A' : 'var(--color-bg-tertiary)';
                    e.currentTarget.style.color = theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = theme.mode === 'dark' ? '#A0A0A0' : 'var(--color-text-secondary)';
                  }
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Conteúdo principal */}
        <div style={{
          flex: 1,
          padding: '32px',
          overflowY: 'auto',
          backgroundColor: theme.mode === 'dark' ? '#141414' : 'var(--color-bg-card)',
        }}>
          {/* Header com botão fechar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 600,
              color: theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              {tabs.find(t => t.id === activeTab)?.icon}
              {tabs.find(t => t.id === activeTab)?.label}
            </h3>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: `1px solid ${theme.mode === 'dark' ? '#2A2A2A' : 'var(--color-border-primary)'}`,
                borderRadius: '8px',
                color: theme.mode === 'dark' ? '#A0A0A0' : 'var(--color-text-secondary)',
                padding: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#FF4444';
                e.currentTarget.style.color = '#FF4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = theme.mode === 'dark' ? '#2A2A2A' : 'var(--color-border-primary)';
                e.currentTarget.style.color = theme.mode === 'dark' ? '#A0A0A0' : 'var(--color-text-secondary)';
              }}
            >
              <X size={16} strokeWidth={1.7} />
            </button>
          </div>

          {/* Conteúdo das abas */}
          <div style={{ minHeight: '400px' }}>
            {activeTab === 'geral' && (
              <div style={{ display: 'grid', gap: '24px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)',
                  }}>
                    {t('settings.userName')}
                  </label>
                  <input
                    type="text"
                    value={settings.userName}
                    onChange={(e) => updateSettings({ userName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: theme.mode === 'dark' ? '#0A0A0A' : 'var(--color-bg-card)',
                      border: `1px solid ${theme.mode === 'dark' ? '#2A2A2A' : 'var(--color-border-primary)'}`,
                      borderRadius: '8px',
                      color: theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)',
                      fontSize: '14px',
                    }}
                    placeholder="Digite seu nome..."
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)',
                  }}>
                    {t('settings.language')}
                  </label>
                  <select
                    value={settings.language}
                    onChange={(e) => updateSettings({ language: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: theme.mode === 'dark' ? '#0A0A0A' : 'var(--color-bg-card)',
                      border: `1px solid ${theme.mode === 'dark' ? '#2A2A2A' : 'var(--color-border-primary)'}`,
                      borderRadius: '8px',
                      color: theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)',
                      fontSize: '14px',
                    }}
                  >
                    {getAvailableLanguages().map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Removido por solicitação: seção "Meta Diária" */}
                {/* <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)',
                  }}>
                    {t('settings.dailyGoal')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={settings.dailyGoal}
                    onChange={(e) => updateSettings({ dailyGoal: parseInt(e.target.value) || 5 })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: theme.mode === 'dark' ? '#0A0A0A' : 'var(--color-bg-card)',
                      border: `1px solid ${theme.mode === 'dark' ? '#2A2A2A' : 'var(--color-border-primary)'}`,
                      borderRadius: '8px',
                      color: theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)',
                      fontSize: '14px',
                    }}
                  />
                </div> */}

                {/* Removido por solicitação: seção "Produtividade & Sugestões" */}
                {/* 
                  // Safe JSX comment
                */}

                {/* Removido por solicitação: seção "Produtividade & Sugestões" */}
                {/* 
                  // Safe JSX comment
                */}

              </div>
            )}

            {activeTab === 'aparencia' && (
              <div style={{ display: 'grid', gap: '24px' }}>
                {/* Tema e Visual Geral */}
                <div>
                  <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Palette size={18} />
                    Visual e Tema
                  </h3>
                  <div style={{
                    padding: '16px',
                    backgroundColor: isDark ? '#0A0A0A' : 'var(--color-bg-secondary)',
                    border: `1px solid ${isDark ? '#2A2A2A' : 'var(--color-border-primary)'}`,
                    borderRadius: '12px',
                    marginBottom: '20px'
                  }}>
                    <div style={{
                      padding: '12px',
                      backgroundColor: isDark ? '#1A1A1A' : 'var(--color-bg-card)',
                      borderRadius: '8px',
                      border: `1px solid ${isDark ? '#3A3A3A' : 'var(--color-border-primary)'}`,
                      textAlign: 'center'
                    }}>
                      <p style={{
                        margin: 0,
                        fontSize: '14px',
                        color: 'var(--color-text-secondary)'
                      }}>
                        <strong style={{ color: 'var(--color-text-primary)' }}>{isDark ? 'Modo Escuro' : 'Modo Claro'}</strong> - Otimizado para produtividade
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fonte e Tamanho */}
                <div>
                  <h4 style={{
                    margin: '0 0 12px 0',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                  }}>
                    Tamanho da Fonte
                  </h4>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="12"
                      max="20"
                      step="1"
                      value={settings.fontSizePx ?? (settings.largeFontMode ? 16 : 14)}
                      onChange={(e) => {
                        const fontSize = parseInt(e.target.value, 10);
                        updateSettings({
                          fontSizePx: fontSize,
                          largeFontMode: fontSize > 14,
                        });
                      }}
                      style={{
                        flex: 1,
                        accentColor: 'var(--color-primary-teal)',
                      }}
                    />
                    <span style={{
                      fontSize: '14px',
                      color: 'var(--color-text-secondary)',
                      minWidth: '40px',
                      textAlign: 'right'
                    }}>
                      {(settings.fontSizePx ?? (settings.largeFontMode ? 16 : 14))}px
                    </span>
                  </div>
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                    marginTop: '4px',
                    marginBottom: 0
                  }}>
                    Ajuste o tamanho da fonte para melhor legibilidade
                  </p>
                </div>

                {/* Densidade da Interface */}
                <div>
                  <h4 style={{
                    margin: '0 0 12px 0',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                  }}>
                    Densidade da Interface
                  </h4>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {[
                      { key: 'compact', label: 'Compacta', desc: 'Mais informações em menos espaço' },
                      { key: 'normal', label: 'Normal', desc: 'Balanço ideal entre espaço e informação' },
                      { key: 'comfortable', label: 'Confortável', desc: 'Mais espaçamento para facilitar a leitura' }
                    ].map((density) => (
                      <label key={density.key} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '12px',
                        backgroundColor: isDark ? '#0A0A0A' : 'var(--color-bg-secondary)',
                        border: `1px solid ${(settings as any).interfaceDensity === density.key ? 'var(--color-primary-teal)' : (isDark ? '#2A2A2A' : 'var(--color-border-primary)')}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}>
                        <input
                          type="radio"
                          name="density"
                          value={density.key}
                          checked={(settings as any).interfaceDensity === density.key || (!((settings as any).interfaceDensity) && density.key === 'normal')}
                          onChange={() => updateSettings({ interfaceDensity: density.key as 'compact' | 'normal' | 'comfortable' })}
                          style={{
                            accentColor: 'var(--color-primary-teal)',
                            marginTop: '2px'
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '14px',
                            color: 'var(--color-text-primary)',
                            fontWeight: 500,
                            marginBottom: '4px'
                          }}>
                            {density.label}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--color-text-secondary)'
                          }}>
                            {density.desc}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Transparência dos Cards */}
                <div>
                  <h4 style={{
                    margin: '0 0 8px 0',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                  }}>
                    Transparência dos Cards
                  </h4>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="80"
                      max="100"
                      step="5"
                      value={((settings as any).cardOpacity || 95)}
                      onChange={(e) => {
                        const opacity = parseInt(e.target.value);
                        updateSettings({ cardOpacity: opacity });
                      }}
                      style={{
                        flex: 1,
                        accentColor: 'var(--color-primary-teal)',
                      }}
                    />
                    <span style={{
                      fontSize: '14px',
                      color: 'var(--color-text-secondary)',
                      minWidth: '40px',
                      textAlign: 'right'
                    }}>
                      {((settings as any).cardOpacity || 95)}%
                    </span>
                  </div>
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                    marginTop: '4px',
                    marginBottom: 0
                  }}>
                    Ajuste a transparência dos cards para personalizar a aparência
                  </p>
                </div>

                {/* Acessibilidade */}
                <div>
                  <h3 style={{
                    margin: '20px 0 16px 0',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Eye size={18} />
                    Acessibilidade
                  </h3>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {/* Alto Contraste */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '12px',
                      backgroundColor: isDark ? '#141414' : '#FFFFFF',
                      border: `1px solid ${isDark ? '#2A2A2A' : 'var(--color-border-primary)'}`,
                      borderRadius: '8px',
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="checkbox"
                        checked={settings.highContrastMode}
                        onChange={(e) => updateSettings({ highContrastMode: e.target.checked })}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary-teal)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          color: 'var(--color-text-primary)',
                          fontWeight: 500,
                          marginBottom: '4px'
                        }}>
                          Modo Alto Contraste
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)'
                        }}>
                          Aumenta o contraste entre texto e fundo para melhor visibilidade
                        </div>
                      </div>
                    </label>

                    {/* Reduzir Animações */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '12px',
                      backgroundColor: isDark ? '#141414' : '#FFFFFF',
                      border: `1px solid ${isDark ? '#2A2A2A' : 'var(--color-border-primary)'}`,
                      borderRadius: '8px',
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="checkbox"
                        checked={(settings as any).reduceAnimations}
                        onChange={(e) => updateSettings({ reduceAnimations: e.target.checked })}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary-teal)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          color: 'var(--color-text-primary)',
                          fontWeight: 500,
                          marginBottom: '2px'
                        }}>
                          Animações e Transições
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)'
                        }}>
                          Desabilite para melhorar performance em computadores mais lentos
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Componentes Visíveis */}
                <div>
                  <h3 style={{
                    margin: '20px 0 16px 0',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Layout size={18} />
                    Componentes da Interface
                  </h3>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {[
                      { key: 'showDashboard', label: 'Dashboard', desc: 'Exibir aba do dashboard e funcionalidades de tarefas' },
                      { key: 'showTimer', label: 'Timer Pomodoro', desc: 'Exibir funcionalidade de timer' },
                      { key: 'showReports', label: 'Relatórios', desc: 'Exibir aba de relatórios e estatísticas' },
                      { key: 'showNotes', label: 'Notas', desc: 'Exibir sistema de notas e anotações' },
                      { key: 'showQuickActions', label: 'Ações Rápidas', desc: 'Exibir botões de acesso rápido' },
                      { key: 'showTaskCounters', label: 'Contadores de Tarefas', desc: 'Exibir números e estatísticas nas tarefas' }
                    ].map((component) => (
                      (() => {
                        const isLocked = isModuleLocked(component.key as 'showDashboard' | 'showTimer' | 'showReports');
                        return (
                          <label key={component.key} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px',
                            backgroundColor: isDark ? '#0A0A0A' : 'var(--color-bg-secondary)',
                            border: `1px solid ${isDark ? '#2A2A2A' : 'var(--color-border-primary)'}`,
                            borderRadius: '8px',
                            cursor: isLocked ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            opacity: isLocked ? 0.6 : 1,
                          }}>
                            <input
                              type="checkbox"
                              checked={(settings as any)[component.key]}
                              disabled={isLocked}
                              onChange={(e) => updateSettings({ [component.key]: e.target.checked })}
                              style={{
                                accentColor: 'var(--color-primary-teal)',
                                transform: 'scale(1.1)',
                              }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{
                                fontSize: '14px',
                                color: 'var(--color-text-primary)',
                                fontWeight: 500,
                                marginBottom: '2px'
                              }}>
                                {component.label}
                              </div>
                              <div style={{
                                fontSize: '12px',
                                color: 'var(--color-text-secondary)'
                              }}>
                                {component.desc}{isLocked ? ' (bloqueado no modo notes-only)' : ''}
                              </div>
                            </div>
                          </label>
                        );
                      })()
                    ))}
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'notificacoes' && (
              <div style={{ display: 'grid', gap: '24px' }}>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    padding: '12px',
                    backgroundColor: theme.mode === 'dark' ? '#0A0A0A' : 'var(--color-bg-secondary)',
                    border: `1px solid ${theme.mode === 'dark' ? '#2A2A2A' : 'var(--color-border-primary)'}`,
                    borderRadius: '8px',
                    transition: 'all var(--transition-theme)',
                  }}>
                    <input
                      type="checkbox"
                      checked={settings.showNotifications}
                      onChange={(e) => updateSettings({ showNotifications: e.target.checked })}
                      style={{
                        width: '18px',
                        height: '18px',
                        accentColor: '#00D4AA',
                      }}
                    />
                    <Bell size={16} strokeWidth={1.7} />
                    <span style={{ fontSize: '14px', color: theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)' }}>
                      {t('settings.notifications.desktop')}
                    </span>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    padding: '12px',
                    backgroundColor: theme.mode === 'dark' ? '#0A0A0A' : 'var(--color-bg-secondary)',
                    border: `1px solid ${theme.mode === 'dark' ? '#2A2A2A' : 'var(--color-border-primary)'}`,
                    borderRadius: '8px',
                    transition: 'all var(--transition-theme)',
                  }}>
                    <input
                      type="checkbox"
                      checked={settings.playSound}
                      onChange={(e) => updateSettings({ playSound: e.target.checked })}
                      style={{
                        width: '18px',
                        height: '18px',
                        accentColor: '#00D4AA',
                      }}
                    />
                    <span style={{ fontSize: '14px', color: theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)' }}>
                      {t('settings.notifications.sound')}
                    </span>
                  </label>
                </div>

                <div>
                  <button
                    onClick={handleTestNotification}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 20px',
                      backgroundColor: '#00D4AA',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#00B894';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#00D4AA';
                    }}
                  >
                    <TestTube size={16} strokeWidth={1.7} />
                    {t('settings.notifications.test')}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'dados' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: isDark ? '#FFFFFF' : '#1F2937',
                    margin: 0
                  }}>
                    Dados & Armazenamento
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: isDark ? '#A0A0A0' : '#6B7280',
                    margin: '8px 0 24px 0'
                  }}>
                    Gerencie o modo de armazenamento, importe e exporte seus dados.
                  </p>
                </div>

                {/* Modo de Armazenamento */}
                <div style={{
                  padding: '20px',
                  backgroundColor: isDark ? '#0A0A0A' : '#F9FAFB',
                  border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                  borderRadius: '12px',
                }}>
                  <h4 style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: isDark ? '#FFFFFF' : '#1F2937',
                    margin: '0 0 8px 0',
                  }}>
                    Modo de Armazenamento
                  </h4>
                  <p style={{ fontSize: '12px', color: isDark ? '#888' : '#6B7280', margin: '0 0 16px 0' }}>
                    Define onde notas, tarefas e categorias são salvos.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { value: 'cloud' as const, label: 'Cloud (Supabase)', desc: 'Dados salvos na nuvem. Requer autenticação. Compartilhável entre dispositivos.' },
                      { value: 'local' as const, label: 'Local (Offline)', desc: 'Dados salvos apenas no dispositivo. Não requer internet nem login.' },
                      { value: 'hybrid' as const, label: 'Híbrido', desc: 'Salva em ambos. Lê da nuvem quando autenticado, fallback local quando offline.' },
                    ].map(opt => (
                      <label
                        key={opt.value}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '14px 16px',
                          borderRadius: '10px',
                          border: `1.5px solid ${(settings.storageMode || 'cloud') === opt.value ? 'var(--color-primary-teal)' : (isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB')}`,
                          backgroundColor: (settings.storageMode || 'cloud') === opt.value ? 'rgba(45,212,191,0.06)' : (isDark ? 'rgba(255,255,255,0.02)' : '#FFFFFF'),
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="radio"
                          name="storageMode"
                          value={opt.value}
                          checked={(settings.storageMode || 'cloud') === opt.value}
                          onChange={() => updateSettings({ storageMode: opt.value })}
                          style={{ marginTop: '3px', accentColor: 'var(--color-primary-teal)' }}
                        />
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#FFFFFF' : '#1F2937', marginBottom: '2px' }}>
                            {opt.label}
                          </div>
                          <div style={{ fontSize: '12px', color: isDark ? '#888' : '#6B7280', lineHeight: 1.4 }}>
                            {opt.desc}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Importar / Exportar */}
                <div style={{
                  padding: '20px',
                  backgroundColor: isDark ? '#0A0A0A' : '#F9FAFB',
                  border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                  borderRadius: '12px',
                }}>
                  <h4 style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: isDark ? '#FFFFFF' : '#1F2937',
                    margin: '0 0 8px 0',
                  }}>
                    Importar / Exportar Dados
                  </h4>
                  <p style={{ fontSize: '12px', color: isDark ? '#888' : '#6B7280', margin: '0 0 16px 0' }}>
                    Use o sistema avançado de importação e exportação multi-formato.
                  </p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <Button onClick={() => { handleOpenImportExportModal('import'); }}>
                      <Upload size={16} style={{ marginRight: '6px' }} />
                      Importar
                    </Button>
                    <Button onClick={() => { handleOpenImportExportModal('export'); }} variant="secondary">
                      <Download size={16} style={{ marginRight: '6px' }} />
                      Exportar
                    </Button>

                  </div>
                </div>

                {/* Info box */}
                <div style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.2)',
                }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <AlertCircle size={16} style={{ color: '#3B82F6', marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ fontSize: '12px', color: isDark ? '#93C5FD' : '#3B82F6', lineHeight: '1.5' }}>
                      <strong>Nota:</strong> Alterar o modo de armazenamento não migra dados automaticamente. Use Importar/Exportar para transferir dados entre modos.
                    </div>
                  </div>
                </div>
              </div>
            )}



            {activeTab === 'acessibilidade' && (
              <div style={{ display: 'grid', gap: '24px' }}>
                {/* Visão e Leitura */}
                <div style={{
                  padding: '20px',
                  backgroundColor: isDark ? '#0A0A0A' : '#F9FAFB',
                  border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                  borderRadius: '12px',
                }}>
                  <h4 style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: isDark ? '#FFFFFF' : '#1F2937',
                    margin: '0 0 16px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <Eye size={16} />
                    Visão e Leitura
                  </h4>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '12px',
                      backgroundColor: isDark ? '#141414' : '#FFFFFF',
                      border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                      borderRadius: '8px',
                    }}>
                      <input
                        type="checkbox"
                        checked={settings.highContrastMode}
                        onChange={(e) => updateSettings({ highContrastMode: e.target.checked })}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary-teal)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          color: 'var(--color-text-primary)',
                          fontWeight: 500,
                          marginBottom: '4px'
                        }}>
                          Modo Alto Contraste
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)'
                        }}>
                          Aumenta o contraste entre texto e fundo para melhor visibilidade
                        </div>
                      </div>
                    </label>

                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '12px',
                      backgroundColor: isDark ? '#141414' : '#FFFFFF',
                      border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                      borderRadius: '8px',
                    }}>
                      <input
                        type="checkbox"
                        checked={(settings.fontSizePx ?? (settings.largeFontMode ? 16 : 14)) > 14}
                        onChange={(e) => {
                          const nextFontSize = e.target.checked ? 16 : 14;
                          updateSettings({
                            largeFontMode: e.target.checked,
                            fontSizePx: nextFontSize,
                          });
                        }}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary-teal)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          color: 'var(--color-text-primary)',
                          fontWeight: 500,
                          marginBottom: '4px'
                        }}>
                          <Type size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                          Fonte Ampliada
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)'
                        }}>
                          Aumenta o tamanho da fonte em toda a interface para facilitar a leitura
                        </div>
                      </div>
                    </label>

                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '12px',
                      backgroundColor: isDark ? '#141414' : '#FFFFFF',
                      border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                      borderRadius: '8px',
                    }}>
                      <input
                        type="checkbox"
                        checked={(settings as any).reduceAnimations}
                        onChange={(e) => updateSettings({ reduceAnimations: e.target.checked })}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary-teal)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          color: 'var(--color-text-primary)',
                          fontWeight: 500,
                          marginBottom: '4px'
                        }}>
                          Animações e Transições
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)'
                        }}>
                          Desabilite para reduzir movimento na tela (recomendado para sensibilidade a movimento)
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Navegação e Interação */}
                <div style={{
                  padding: '20px',
                  backgroundColor: isDark ? '#0A0A0A' : '#F9FAFB',
                  border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                  borderRadius: '12px',
                }}>
                  <h4 style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: isDark ? '#FFFFFF' : '#1F2937',
                    margin: '0 0 16px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <Keyboard size={16} />
                    Navegação e Interação
                  </h4>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '12px',
                      backgroundColor: isDark ? '#141414' : '#FFFFFF',
                      border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                      borderRadius: '8px',
                    }}>
                      <input
                        type="checkbox"
                        checked={settings.keyboardNavigation !== false}
                        onChange={(e) => updateSettings({ keyboardNavigation: e.target.checked })}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary-teal)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          color: 'var(--color-text-primary)',
                          fontWeight: 500,
                          marginBottom: '4px'
                        }}>
                          Navegação por Teclado
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)'
                        }}>
                          Permite navegar pela interface usando Tab, Enter e teclas de seta
                        </div>
                      </div>
                    </label>

                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '12px',
                      backgroundColor: isDark ? '#141414' : '#FFFFFF',
                      border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                      borderRadius: '8px',
                    }}>
                      <input
                        type="checkbox"
                        checked={settings.focusIndicators !== false}
                        onChange={(e) => updateSettings({ focusIndicators: e.target.checked })}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary-teal)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          color: 'var(--color-text-primary)',
                          fontWeight: 500,
                          marginBottom: '4px'
                        }}>
                          <MousePointer size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                          Indicadores de Foco Visíveis
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)'
                        }}>
                          Destaca visualmente o elemento focado ao navegar por teclado
                        </div>
                      </div>
                    </label>

                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '12px',
                      backgroundColor: isDark ? '#141414' : '#FFFFFF',
                      border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                      borderRadius: '8px',
                    }}>
                      <input
                        type="checkbox"
                        checked={settings.playSound}
                        onChange={(e) => updateSettings({ playSound: e.target.checked })}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary-teal)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          color: 'var(--color-text-primary)',
                          fontWeight: 500,
                          marginBottom: '4px'
                        }}>
                          <Volume2 size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                          Feedback Sonoro
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)'
                        }}>
                          Reproduz sons ao completar ações (notificações, timer, etc.)
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Removido por solicitação: seção "Atalhos de Teclado" */}
                {/* <div style={{
                  padding: '20px',
                  backgroundColor: isDark ? '#0A0A0A' : '#F9FAFB',
                  border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                  borderRadius: '12px',
                }}>
                  <h4 style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: isDark ? '#FFFFFF' : '#1F2937',
                    margin: '0 0 16px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <Keyboard size={16} />
                    Atalhos de Teclado
                  </h4>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {[
                      { keys: 'Ctrl + N', desc: 'Nova tarefa' },
                      { keys: 'Ctrl + Shift + N', desc: 'Nova nota' },
                      { keys: 'Ctrl + ,', desc: 'Abrir configurações' },
                      { keys: 'Ctrl + F', desc: 'Buscar' },
                      { keys: 'Ctrl + B', desc: 'Abrir/fechar barra lateral' },
                      { keys: 'Esc', desc: 'Fechar modal/diálogo' },
                    ].map((shortcut) => (
                      <div key={shortcut.keys} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        backgroundColor: isDark ? '#141414' : '#FFFFFF',
                        border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                        borderRadius: '8px',
                      }}>
                        <span style={{
                          fontSize: '13px',
                          color: isDark ? '#A0A0A0' : '#6B7280',
                        }}>
                          {shortcut.desc}
                        </span>
                        <code style={{
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          color: isDark ? '#00D4AA' : '#059669',
                          backgroundColor: isDark ? '#1A1A1A' : '#ECFDF5',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: `1px solid ${isDark ? '#2A2A2A' : '#D1FAE5'}`,
                        }}>
                          {shortcut.keys}
                        </code>
                      </div>
                    ))}
                  </div>
                </div> */}

                {/* Seção de Limpeza de Dados */}
                <div style={{
                  padding: '20px',
                  backgroundColor: isDark ? '#0A0A0A' : '#F9FAFB',
                  border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                  borderRadius: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <AlertCircle size={20} strokeWidth={1.7} color="#F59E0B" />
                    <h4 style={{
                      margin: 0,
                      fontSize: '16px',
                      fontWeight: 600,
                      color: isDark ? '#FFFFFF' : '#1F2937',
                    }}>
                      {t('accessibility.clearData')}
                    </h4>
                  </div>
                  <p style={{
                    color: isDark ? '#A0A0A0' : '#6B7280',
                    fontSize: '14px',
                    margin: '0 0 16px 0',
                    lineHeight: 1.5,
                  }}>
                    {t('accessibility.clearDataDesc')}
                  </p>
                  
                  {showClearDataConfirm && (
                    <div style={{
                      padding: '16px',
                      backgroundColor: isDark ? '#1A1A1A' : '#FEF3C7',
                      border: `1px solid ${isDark ? '#3A3A3A' : '#F59E0B'}`,
                      borderRadius: '8px',
                      marginBottom: '16px',
                    }}>
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: isDark ? '#F59E0B' : '#92400E',
                      }}>
                        {t('accessibility.clearDataConfirm')}
                      </p>
                      <p style={{
                        margin: 0,
                        fontSize: '12px',
                        color: isDark ? '#A0A0A0' : '#92400E',
                      }}>
                        {t('accessibility.clearDataWarning')}
                      </p>
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={handleClearAllData}
                      disabled={isClearing}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 20px',
                        backgroundColor: showClearDataConfirm ? '#DC2626' : '#EF4444',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: isClearing ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        opacity: isClearing ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!isClearing) e.currentTarget.style.backgroundColor = showClearDataConfirm ? '#B91C1C' : '#DC2626';
                      }}
                      onMouseLeave={(e) => {
                        if (!isClearing) e.currentTarget.style.backgroundColor = showClearDataConfirm ? '#DC2626' : '#EF4444';
                      }}
                    >
                      <AlertCircle size={16} strokeWidth={1.7} />
                      {isClearing ? 'Limpando...' : (showClearDataConfirm ? 'Confirmar Limpeza' : t('accessibility.clearData'))}
                    </button>
                    
                    {showClearDataConfirm && (
                      <button
                        onClick={() => setShowClearDataConfirm(false)}
                        style={{
                          padding: '12px 20px',
                          backgroundColor: 'transparent',
                          color: isDark ? '#FFFFFF' : '#1F2937',
                          border: `1px solid ${isDark ? '#3A3A3A' : '#E5E7EB'}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'organizacoes' && (
              <OrganizationsPanel isDark={isDark} />
            )}

            {activeTab === 'logs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <LogViewerContent isDark={isDark} />
              </div>
            )}

            {activeTab === 'atualizacoes' && (
              <UpdateManagementPanel isDark={isDark} />
            )}

            {activeTab === 'sobre' && (
              <div style={{ display: 'grid', gap: '24px' }}>
                <div style={{
                  padding: '24px',
                  backgroundColor: theme.mode === 'dark' ? '#0A0A0A' : 'var(--color-bg-secondary)',
                  border: `1px solid ${theme.mode === 'dark' ? '#2A2A2A' : 'var(--color-border-primary)'}`,
                  borderRadius: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                    <svg width="48" height="48" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="nexusAboutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" style={{ stopColor: '#00D4AA', stopOpacity: 1 }} />
                          <stop offset="50%" style={{ stopColor: '#00B4D8', stopOpacity: 1 }} />
                          <stop offset="100%" style={{ stopColor: '#7B3FF2', stopOpacity: 1 }} />
                        </linearGradient>
                        <linearGradient id="nexusAboutBg" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" style={{ stopColor: '#0D0D0D', stopOpacity: 1 }} />
                          <stop offset="100%" style={{ stopColor: '#1A1A2E', stopOpacity: 1 }} />
                        </linearGradient>
                      </defs>
                      <rect x="16" y="16" width="480" height="480" rx="96" ry="96" fill="url(#nexusAboutBg)" />
                      <rect x="16" y="16" width="480" height="480" rx="96" ry="96" fill="none" stroke="url(#nexusAboutGrad)" strokeWidth="3" opacity="0.4" />
                      <g transform="translate(256,256)">
                        <rect x="-110" y="-130" width="38" height="260" rx="6" fill="url(#nexusAboutGrad)" />
                        <rect x="72" y="-130" width="38" height="260" rx="6" fill="url(#nexusAboutGrad)" />
                        <polygon points="-72,-130 110,130 72,130 -110,-130" fill="url(#nexusAboutGrad)" />
                      </g>
                    </svg>
                    <div>
                      <h3 style={{
                        margin: 0,
                        fontSize: '24px',
                        fontWeight: 700,
                        color: theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)',
                      }}>
                        {t('about.title')}
                      </h3>
                      <p style={{
                        margin: '4px 0 0 0',
                        fontSize: '14px',
                        color: theme.mode === 'dark' ? '#A0A0A0' : 'var(--color-text-secondary)',
                      }}>
                        {t('about.version', { version: systemInfo?.version || '1.0.0' })}
                      </p>
                    </div>
                  </div>

                  <p style={{
                    fontSize: '14px',
                    color: theme.mode === 'dark' ? '#A0A0A0' : 'var(--color-text-secondary)',
                    lineHeight: 1.6,
                    marginBottom: '24px',
                  }}>
                    {t('about.description')}
                  </p>

                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      backgroundColor: theme.mode === 'dark' ? '#1A1A1A' : '#F9FAFB',
                      borderRadius: '8px',
                    }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)',
                      }}>
                        {t('about.machineId')}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code style={{
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          color: theme.mode === 'dark' ? '#00D4AA' : '#059669',
                          backgroundColor: theme.mode === 'dark' ? '#0A0A0A' : '#ECFDF5',
                          padding: '4px 8px',
                          borderRadius: '4px',
                        }}>
                          {systemInfo?.machineId || 'Carregando...'}
                        </code>
                        <button
                          onClick={() => copyToClipboard(systemInfo?.machineId || '')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: theme.mode === 'dark' ? '#A0A0A0' : 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            transition: 'all 0.2s ease',
                          }}
                          title="Copiar ID"
                        >
                          <Copy size={14} strokeWidth={1.7} />
                        </button>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      backgroundColor: theme.mode === 'dark' ? '#1A1A1A' : '#F9FAFB',
                      borderRadius: '8px',
                    }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)',
                      }}>
                        {t('about.installDate')}
                      </span>
                      <span style={{
                        fontSize: '14px',
                        color: theme.mode === 'dark' ? '#A0A0A0' : 'var(--color-text-secondary)',
                      }}>
                        {systemInfo?.installDate ? new Date(systemInfo.installDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      backgroundColor: theme.mode === 'dark' ? '#1A1A1A' : '#F9FAFB',
                      borderRadius: '8px',
                    }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)',
                      }}>
                        {t('about.developer')}
                      </span>
                      <span style={{
                        fontSize: '14px',
                        color: theme.mode === 'dark' ? '#A0A0A0' : 'var(--color-text-secondary)',
                      }}>
                        Paulo Riccardo Nascimento dos Santos
                      </span>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      backgroundColor: theme.mode === 'dark' ? '#1A1A1A' : '#F9FAFB',
                      borderRadius: '8px',
                    }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)',
                      }}>
                        {t('about.license')}
                      </span>
                      <span style={{
                        fontSize: '14px',
                        color: theme.mode === 'dark' ? '#A0A0A0' : 'var(--color-text-secondary)',
                      }}>
                        MIT
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer com botões */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: `1px solid ${theme.mode === 'dark' ? '#2A2A2A' : 'var(--color-border-primary)'}`,
          }}>
            <button
              onClick={() => setShowResetConfirm(false)}
              onDoubleClick={handleReset}
              disabled={isResetting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                backgroundColor: showResetConfirm ? '#FF4444' : 'transparent',
                color: showResetConfirm ? '#FFFFFF' : (theme.mode === 'dark' ? '#FF6B6B' : '#DC2626'),
                border: `1px solid ${showResetConfirm ? '#FF4444' : (theme.mode === 'dark' ? '#FF6B6B' : '#DC2626')}`,
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: isResetting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: isResetting ? 0.6 : 1,
              }}
            >
              <RotateCcw size={16} strokeWidth={1.7} />
              {showResetConfirm ? 'Confirmar Reset' : t('settings.reset')}
            </button>

            <button
              onClick={handleSave}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: '#00D4AA',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#00B894';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#00D4AA';
              }}
            >
              <Save size={16} strokeWidth={1.7} />
              {t('settings.save')}
            </button>

            {/* ImportExportModal */}
            {importExportModalOpen && (
              <ImportExportModal
                open={importExportModalOpen}
                onClose={closeImportExportModal}
                mode={importExportMode}
                onExport={handleImportExportExport}
                onImportPreview={handleImportExportPreview}
                onImportApply={handleImportExportApply}
                onRetryImportSync={handleRetryImportSync}
                initialImportIntent={initialImportIntent}
                systemTagOptions={systemTags}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 