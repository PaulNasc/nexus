import React, { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useI18n } from '../hooks/useI18n';
import { useTheme } from '../hooks/useTheme';
import { useNotifications } from '../hooks/useNotifications';
import { CategoryManager } from './CategoryManager';
import { Button } from './ui/Button';
import { ImportExportModal } from './ImportExportModal';
import { OrganizationsPanel } from './OrganizationsPanel';

// Componente para visualizar logs
const LogViewerContent: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [logs, setLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState({ level: '', category: '', search: '' });

  React.useEffect(() => {
    const loadLogs = async () => {
      try {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI?.logging?.getLogs) {
          const logsData = await electronAPI.logging.getLogs({ limit: 100 });
          setLogs(logsData || []);
        }
      } catch (error) {
        console.error('Erro ao carregar logs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesLevel = !filter.level || log.level === filter.level;
    const matchesCategory = !filter.category || log.category === filter.category;
    const matchesSearch = !filter.search || 
      log.message.toLowerCase().includes(filter.search.toLowerCase()) ||
      (log.data && JSON.stringify(log.data).toLowerCase().includes(filter.search.toLowerCase()));
    
    return matchesLevel && matchesCategory && matchesSearch;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return '#EF4444';
      case 'warn': return '#F59E0B';
      case 'info': return '#3B82F6';
      case 'debug': return '#6B7280';
      default: return isDark ? '#A0A0A0' : '#6B7280';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'security': return '#DC2626';
      case 'performance': return '#059669';
      case 'user': return '#7C3AED';
      case 'ai': return '#0891B2';
      case 'database': return '#EA580C';
      default: return isDark ? '#6B7280' : '#9CA3AF';
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: isDark ? '#A0A0A0' : '#6B7280' }}>
        Carregando logs...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Filtros */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '12px',
        padding: '16px',
        backgroundColor: isDark ? '#1A1A1A' : '#F9FAFB',
        borderRadius: '8px',
        border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`
      }}>
        <select
          value={filter.level}
          onChange={(e) => setFilter({ ...filter, level: e.target.value })}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: `1px solid ${isDark ? '#2A2A2A' : '#D1D5DB'}`,
            backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF',
            color: isDark ? '#FFFFFF' : '#1F2937',
            fontSize: '14px'
          }}
        >
          <option value="">Todos os níveis</option>
          <option value="debug">Debug</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
        </select>

        <select
          value={filter.category}
          onChange={(e) => setFilter({ ...filter, category: e.target.value })}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: `1px solid ${isDark ? '#2A2A2A' : '#D1D5DB'}`,
            backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF',
            color: isDark ? '#FFFFFF' : '#1F2937',
            fontSize: '14px'
          }}
        >
          <option value="">Todas as categorias</option>
          <option value="system">Sistema</option>
          <option value="security">Segurança</option>
          <option value="performance">Performance</option>
          <option value="user">Usuário</option>
          <option value="ai">IA</option>
          <option value="database">Database</option>
        </select>

        <input
          type="text"
          placeholder="Buscar nos logs..."
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: `1px solid ${isDark ? '#2A2A2A' : '#D1D5DB'}`,
            backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF',
            color: isDark ? '#FFFFFF' : '#1F2937',
            fontSize: '14px'
          }}
        />
      </div>

      {/* Lista de logs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredLogs.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px', 
            color: isDark ? '#A0A0A0' : '#6B7280',
            backgroundColor: isDark ? '#1A1A1A' : '#F9FAFB',
            borderRadius: '8px',
            border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`
          }}>
            {logs.length === 0 ? 'Nenhum log encontrado' : 'Nenhum log corresponde aos filtros'}
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div
              key={index}
              style={{
                padding: '12px 16px',
                backgroundColor: isDark ? '#1A1A1A' : '#F9FAFB',
                border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                borderRadius: '8px',
                fontSize: '13px',
                fontFamily: 'monospace'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ 
                  color: isDark ? '#A0A0A0' : '#6B7280',
                  fontSize: '12px'
                }}>
                  {new Date(log.timestamp).toLocaleString()}
                </span>
                <span style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: getLevelColor(log.level),
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase'
                }}>
                  {log.level}
                </span>
                <span style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: getCategoryColor(log.category),
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 500
                }}>
                  {log.category}
                </span>
              </div>
              <div style={{ 
                color: isDark ? '#FFFFFF' : '#1F2937',
                marginBottom: log.data ? '8px' : '0'
              }}>
                {log.message}
              </div>
              {log.data && (
                <details style={{ marginTop: '8px' }}>
                  <summary style={{ 
                    cursor: 'pointer', 
                    color: isDark ? '#00D4AA' : '#059669',
                    fontSize: '12px'
                  }}>
                    Dados adicionais
                  </summary>
                  <pre style={{
                    marginTop: '8px',
                    padding: '8px',
                    backgroundColor: isDark ? '#0A0A0A' : '#F3F4F6',
                    borderRadius: '4px',
                    fontSize: '11px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: isDark ? '#D1D5DB' : '#374151'
                  }}>
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Componente para gerenciar atualizações (electron-updater)
const UpdateManagementPanel: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [version, setVersion] = React.useState<string>('');
  const [status, setStatus] = React.useState<{
    state: string;
    version?: string;
    progress?: { percent: number; bytesPerSecond: number; transferred: number; total: number };
    releaseNotes?: string;
    error?: string;
  }>({ state: 'idle' });

  React.useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    // Load current version
    electronAPI?.updater?.getVersion?.().then((v: string) => setVersion(v)).catch(() => {});
    // Load current status
    electronAPI?.updater?.getStatus?.().then((s: any) => setStatus(s)).catch(() => {});
    // Subscribe to status changes
    const unsub = electronAPI?.updater?.onStatus?.((s: any) => setStatus(s));
    return () => { unsub?.(); };
  }, []);

  const handleCheck = async () => {
    const electronAPI = (window as any).electronAPI;
    await electronAPI?.updater?.checkForUpdates?.();
  };

  const handleDownload = async () => {
    const electronAPI = (window as any).electronAPI;
    await electronAPI?.updater?.downloadUpdate?.();
  };

  const handleInstall = () => {
    const electronAPI = (window as any).electronAPI;
    electronAPI?.updater?.quitAndInstall?.();
  };

  const stateLabel: Record<string, string> = {
    idle: 'Pronto',
    checking: 'Verificando...',
    available: 'Atualização disponível',
    'not-available': 'Você está na versão mais recente',
    downloading: 'Baixando...',
    downloaded: 'Pronto para instalar',
    error: 'Erro ao verificar',
  };

  const stateColor: Record<string, string> = {
    idle: isDark ? '#A0A0A0' : '#6B7280',
    checking: '#00D4AA',
    available: '#00D4AA',
    'not-available': isDark ? '#A0A0A0' : '#6B7280',
    downloading: '#7B3FF2',
    downloaded: '#00D4AA',
    error: '#EF4444',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Versão e Status */}
      <div style={{
        padding: '20px',
        backgroundColor: isDark ? '#0A0A0A' : '#F9FAFB',
        border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
        borderRadius: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: 600, color: isDark ? '#FFFFFF' : '#1F2937', margin: 0 }}>
              Nexus v{version || '...'}
            </h4>
            <p style={{ fontSize: '13px', color: stateColor[status.state] || (isDark ? '#A0A0A0' : '#6B7280'), margin: '4px 0 0 0', fontWeight: 500 }}>
              {stateLabel[status.state] || status.state}
              {status.state === 'available' && status.version ? ` — v${status.version}` : ''}
            </p>
          </div>
        </div>

        {/* Barra de progresso do download */}
        {status.state === 'downloading' && status.progress && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              width: '100%', height: '6px', borderRadius: '3px',
              backgroundColor: isDark ? '#1A1A1A' : '#E5E7EB',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${status.progress.percent}%`, height: '100%', borderRadius: '3px',
                background: 'linear-gradient(90deg, #00D4AA, #7B3FF2)',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <span style={{ fontSize: '12px', color: isDark ? '#A0A0A0' : '#6B7280' }}>
                {status.progress.percent}%
              </span>
              <span style={{ fontSize: '12px', color: isDark ? '#A0A0A0' : '#6B7280' }}>
                {(status.progress.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s
              </span>
            </div>
          </div>
        )}

        {/* Release notes */}
        {(status.state === 'available' || status.state === 'downloaded') && status.releaseNotes && (
          <div style={{
            padding: '12px', borderRadius: '8px', marginBottom: '16px',
            backgroundColor: isDark ? '#111' : '#F0FDF4',
            border: `1px solid ${isDark ? '#1A3A2A' : '#BBF7D0'}`,
          }}>
            <div style={{ fontSize: '13px', color: isDark ? '#A0A0A0' : '#374151', whiteSpace: 'pre-wrap', maxHeight: '120px', overflow: 'auto' }}>
              {status.releaseNotes}
            </div>
          </div>
        )}

        {/* Error message */}
        {status.state === 'error' && status.error && (
          <div style={{
            padding: '12px', borderRadius: '8px', marginBottom: '16px',
            backgroundColor: isDark ? '#1A0A0A' : '#FEF2F2',
            border: `1px solid ${isDark ? '#3A1A1A' : '#FECACA'}`,
          }}>
            <div style={{ fontSize: '13px', color: '#EF4444' }}>
              {status.error}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(status.state === 'idle' || status.state === 'not-available' || status.state === 'error') && (
            <Button onClick={handleCheck} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={16} />
              Verificar Atualizações
            </Button>
          )}
          {status.state === 'checking' && (
            <Button disabled style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6 }}>
              <RefreshCw size={16} className="spin" />
              Verificando...
            </Button>
          )}
          {status.state === 'available' && (
            <Button onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={16} />
              Baixar v{status.version}
            </Button>
          )}
          {status.state === 'downloading' && (
            <Button disabled style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6 }}>
              <Download size={16} className="spin" />
              Baixando...
            </Button>
          )}
          {status.state === 'downloaded' && (
            <Button onClick={handleInstall} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #00D4AA, #7B3FF2)', color: '#fff', border: 'none' }}>
              <RotateCcw size={16} />
              Reiniciar e Instalar v{status.version}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

import { 
  Settings as SettingsIcon, 
  Palette, 
  Bell, 
  Eye, 
  Database, 
  Info,
  X,
  Save,
  RotateCcw,
  RefreshCw,
  Download,
  Upload,
  TestTube,
  AlertCircle,
  Layout,
  HardDrive,
  Keyboard,
  MousePointer,
  Volume2,
  Type,
  Copy,
  Users
} from 'lucide-react';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'geral' | 'aparencia' | 'notificacoes' | 'acessibilidade' | 'dados' | 'organizacoes' | 'logs' | 'atualizacoes' | 'sobre';

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const { 
    settings, 
    updateSettings, 
    resetSettings, 
    clearAllData, 
    systemInfo 
  } = useSettings();
  const { t, currentLanguage, changeLanguage, getAvailableLanguages } = useI18n();
  const { theme, effectiveMode } = useTheme();
  const { showNotification } = useNotifications();
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

  const isDark = effectiveMode === 'dark';

  const getElectron = () => (window as unknown as { electronAPI: import('../../main/preload').ElectronAPI }).electronAPI;

  // Sync language with i18n hook
  useEffect(() => {
    if (settings.language !== currentLanguage) {
      changeLanguage(settings.language);
    }
  }, [settings.language, currentLanguage, changeLanguage]);

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

  const handleImportExportPreview = async (intent: ImportIntent): Promise<import('../../shared/types/backup').RestorePreview | null> => {
    try {
      const electron = getElectron();
      if (intent?.kind === 'zip') return await electron.backup.importZipPreview({ source: 'external', filePath: intent.filePath });
      if (intent?.kind === 'zip-backup') return await electron.backup.importZipPreview({ source: 'backupId', backupId: intent.backupId });
      if (intent?.kind === 'json') return await electron.backup.importJsonPreview({ filePath: intent.filePath });
      if (intent?.kind === 'csv') return await electron.backup.importCsvPreview({ filePath: intent.filePath });
      if (intent?.kind === 'enex') return await electron.backup.importEnexPreview({ filePath: intent.filePath });
      if (intent?.kind === 'html-file') return await electron.invoke('import:html-preview', { filePath: intent.filePath }) as import('../../shared/types/backup').RestorePreview;
      if (intent?.kind === 'pdf-file') return await electron.invoke('import:pdf-preview', { filePath: intent.filePath }) as import('../../shared/types/backup').RestorePreview;
      if (intent?.kind === 'folder') return await electron.invoke('import:folder-preview', { folderPath: intent.folderPath }) as import('../../shared/types/backup').RestorePreview;
      return null;
    } catch (err) {
      console.error('Erro ao gerar preview do import:', err);
      return null;
    }
  };

  const handleImportExportApply = async (intent: ImportIntent): Promise<import('../../shared/types/backup').ImportResult | null> => {
    try {
      const electron = getElectron();
      let result: import('../../shared/types/backup').ImportResult | null = null;
      if (intent?.kind === 'zip') result = await electron.backup.importZipApply({ source: 'external', filePath: intent.filePath });
      else if (intent?.kind === 'zip-backup') result = await electron.backup.importZipApply({ source: 'backupId', backupId: intent.backupId });
      else if (intent?.kind === 'json') result = await electron.backup.importJsonApply({ filePath: intent.filePath });
      else if (intent?.kind === 'csv') result = await electron.backup.importCsvApply({ filePath: intent.filePath });
      else if (intent?.kind === 'enex') result = await electron.backup.importEnexApply({ filePath: intent.filePath });
      else if (intent?.kind === 'html-file') result = await electron.invoke('import:html-apply', { filePath: intent.filePath }) as import('../../shared/types/backup').ImportResult;
      else if (intent?.kind === 'pdf-file') result = await electron.invoke('import:pdf-apply', { filePath: intent.filePath }) as import('../../shared/types/backup').ImportResult;
      else if (intent?.kind === 'folder') result = await electron.invoke('import:folder-apply', { folderPath: intent.folderPath }) as import('../../shared/types/backup').ImportResult;
      if (result?.success) {
        window.dispatchEvent(new Event('tasksUpdated'));
        window.dispatchEvent(new Event('categoriesUpdated'));
        window.dispatchEvent(new Event('notesUpdated'));
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

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)',
    }}>
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

                <div>
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
                </div>

                {/* Produtividade & Sugestões Proativas */}
                <div style={{
                  padding: '20px',
                  backgroundColor: theme.mode === 'dark' ? '#0A0A0A' : '#F9FAFB',
                  border: `1px solid ${theme.mode === 'dark' ? '#2A2A2A' : '#E5E7EB'}`,
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
                    <Layout size={18} />
                    Produtividade & Sugestões
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Dicas de Produtividade */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#FFFFFF' : '#1F2937' }}>
                          Dicas de Produtividade
                        </div>
                        <div style={{ fontSize: '13px', color: isDark ? '#A0A0A0' : '#6B7280' }}>
                          Exibir dicas contextuais baseadas no seu progresso
                        </div>
                      </div>
                      <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                        <input
                          type="checkbox"
                          checked={settings.showProductivityTips}
                          onChange={(e) => updateSettings({ showProductivityTips: e.target.checked })}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                          backgroundColor: settings.showProductivityTips ? '#00D4AA' : (isDark ? '#404040' : '#D1D5DB'),
                          borderRadius: '12px', transition: 'background-color 0.2s',
                        }}>
                          <span style={{
                            position: 'absolute', height: '18px', width: '18px', left: settings.showProductivityTips ? '23px' : '3px',
                            bottom: '3px', backgroundColor: '#FFFFFF', borderRadius: '50%', transition: 'left 0.2s',
                          }} />
                        </span>
                      </label>
                    </div>

                    {/* Insights de Progresso */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#FFFFFF' : '#1F2937' }}>
                          Insights de Progresso
                        </div>
                        <div style={{ fontSize: '13px', color: isDark ? '#A0A0A0' : '#6B7280' }}>
                          Mostrar resumos e métricas do seu desempenho
                        </div>
                      </div>
                      <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                        <input
                          type="checkbox"
                          checked={settings.showProgressInsights}
                          onChange={(e) => updateSettings({ showProgressInsights: e.target.checked })}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                          backgroundColor: settings.showProgressInsights ? '#00D4AA' : (isDark ? '#404040' : '#D1D5DB'),
                          borderRadius: '12px', transition: 'background-color 0.2s',
                        }}>
                          <span style={{
                            position: 'absolute', height: '18px', width: '18px', left: settings.showProgressInsights ? '23px' : '3px',
                            bottom: '3px', backgroundColor: '#FFFFFF', borderRadius: '50%', transition: 'left 0.2s',
                          }} />
                        </span>
                      </label>
                    </div>

                    {/* Modo Proativo */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#FFFFFF' : '#1F2937' }}>
                          Sugestões Proativas
                        </div>
                        <div style={{ fontSize: '13px', color: isDark ? '#A0A0A0' : '#6B7280' }}>
                          Gerar sugestões automáticas baseadas nas suas tarefas
                        </div>
                      </div>
                      <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                        <input
                          type="checkbox"
                          checked={settings.aiProactiveMode}
                          onChange={(e) => updateSettings({ aiProactiveMode: e.target.checked })}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                          backgroundColor: settings.aiProactiveMode ? '#00D4AA' : (isDark ? '#404040' : '#D1D5DB'),
                          borderRadius: '12px', transition: 'background-color 0.2s',
                        }}>
                          <span style={{
                            position: 'absolute', height: '18px', width: '18px', left: settings.aiProactiveMode ? '23px' : '3px',
                            bottom: '3px', backgroundColor: '#FFFFFF', borderRadius: '50%', transition: 'left 0.2s',
                          }} />
                        </span>
                      </label>
                    </div>

                    {/* Widget Flutuante (só aparece se proativo está ativo) */}
                    {settings.aiProactiveMode && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#FFFFFF' : '#1F2937' }}>
                              Widget Flutuante
                            </div>
                            <div style={{ fontSize: '13px', color: isDark ? '#A0A0A0' : '#6B7280' }}>
                              Exibir botão flutuante com sugestões na tela
                            </div>
                          </div>
                          <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                            <input
                              type="checkbox"
                              checked={settings.showProactiveSuggestionsWidget}
                              onChange={(e) => updateSettings({ showProactiveSuggestionsWidget: e.target.checked })}
                              style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                              position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                              backgroundColor: settings.showProactiveSuggestionsWidget ? '#00D4AA' : (isDark ? '#404040' : '#D1D5DB'),
                              borderRadius: '12px', transition: 'background-color 0.2s',
                            }}>
                              <span style={{
                                position: 'absolute', height: '18px', width: '18px', left: settings.showProactiveSuggestionsWidget ? '23px' : '3px',
                                bottom: '3px', backgroundColor: '#FFFFFF', borderRadius: '50%', transition: 'left 0.2s',
                              }} />
                            </span>
                          </label>
                        </div>

                        {/* Opacidade do Widget */}
                        {settings.showProactiveSuggestionsWidget && (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <div style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#FFFFFF' : '#1F2937' }}>
                                Opacidade do Widget
                              </div>
                              <span style={{ fontSize: '13px', color: isDark ? '#A0A0A0' : '#6B7280' }}>
                                {settings.widgetButtonOpacity}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="20"
                              max="100"
                              value={settings.widgetButtonOpacity}
                              onChange={(e) => updateSettings({ widgetButtonOpacity: parseInt(e.target.value) })}
                              style={{ width: '100%', accentColor: '#00D4AA' }}
                            />
                          </div>
                        )}

                        {/* Tamanho do Widget */}
                        {settings.showProactiveSuggestionsWidget && (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <div style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#FFFFFF' : '#1F2937' }}>
                                Tamanho do Widget
                              </div>
                              <span style={{ fontSize: '13px', color: isDark ? '#A0A0A0' : '#6B7280' }}>
                                {settings.widgetButtonSize}px
                              </span>
                            </div>
                            <input
                              type="range"
                              min="36"
                              max="80"
                              value={settings.widgetButtonSize}
                              onChange={(e) => updateSettings({ widgetButtonSize: parseInt(e.target.value) })}
                              style={{ width: '100%', accentColor: '#00D4AA' }}
                            />
                          </div>
                        )}
                      </>
                    )}

                    {/* Modo de Resposta */}
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#FFFFFF' : '#1F2937', marginBottom: '8px' }}>
                        Nível de Detalhe das Sugestões
                      </div>
                      <select
                        value={settings.aiResponseMode}
                        onChange={(e) => updateSettings({ aiResponseMode: e.target.value as 'detailed' | 'balanced' | 'concise' })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: `1px solid ${isDark ? '#2A2A2A' : '#D1D5DB'}`,
                          backgroundColor: isDark ? '#141414' : '#FFFFFF',
                          color: isDark ? '#FFFFFF' : '#1F2937',
                          fontSize: '14px',
                        }}
                      >
                        <option value="concise">Conciso — frases curtas e diretas</option>
                        <option value="balanced">Equilibrado — resumo com contexto</option>
                        <option value="detailed">Detalhado — explicações completas</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Gerenciador de Categorias */}
                <div style={{
                  backgroundColor: theme.mode === 'dark' ? '#0A0A0A' : 'var(--color-bg-secondary)',
                  border: `1px solid ${theme.mode === 'dark' ? '#2A2A2A' : 'var(--color-border-primary)'}`,
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}>
                  <CategoryManager onSave={() => {
                    showToast('Categorias atualizadas com sucesso!', 'success');
                  }} />
                </div>
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
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Palette size={18} />
                    Visual e Tema
                  </h3>
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#0A0A0A',
                    border: '1px solid #2A2A2A',
                    borderRadius: '12px',
                    marginBottom: '20px'
                  }}>
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#1A1A1A',
                      borderRadius: '8px',
                      border: '1px solid #3A3A3A',
                      textAlign: 'center'
                    }}>
                      <p style={{
                        margin: 0,
                        fontSize: '14px',
                        color: '#A0A0A0'
                      }}>
                        🌙 <strong style={{ color: '#FFFFFF' }}>Modo Escuro</strong> - Otimizado para produtividade
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
                    color: '#FFFFFF',
                  }}>
                    Tamanho da Fonte
                  </h4>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="12"
                      max="20"
                      step="1"
                      value={settings.largeFontMode ? 16 : 14}
                      onChange={(e) => {
                        const fontSize = parseInt(e.target.value);
                        updateSettings({ largeFontMode: fontSize > 14 });
                      }}
                      style={{
                        flex: 1,
                        accentColor: 'var(--color-primary-teal)',
                      }}
                    />
                    <span style={{
                      fontSize: '14px',
                      color: '#A0A0A0',
                      minWidth: '40px',
                      textAlign: 'right'
                    }}>
                      {settings.largeFontMode ? '16px' : '14px'}
                    </span>
                  </div>
                  <p style={{
                    fontSize: '12px',
                    color: '#666',
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
                    color: '#FFFFFF',
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
                        backgroundColor: '#0A0A0A',
                        border: `1px solid ${(settings as any).interfaceDensity === density.key ? 'var(--color-primary-teal)' : '#2A2A2A'}`,
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
                            color: '#FFFFFF',
                            fontWeight: 500,
                            marginBottom: '4px'
                          }}>
                            {density.label}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#A0A0A0'
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
                    color: '#FFFFFF',
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
                      color: '#A0A0A0',
                      minWidth: '40px',
                      textAlign: 'right'
                    }}>
                      {((settings as any).cardOpacity || 95)}%
                    </span>
                  </div>
                  <p style={{
                    fontSize: '12px',
                    color: '#666',
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
                    color: '#FFFFFF',
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
                      backgroundColor: '#0A0A0A',
                      border: '1px solid #2A2A2A',
                      borderRadius: '8px',
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="checkbox"
                        checked={settings.highContrastMode}
                        onChange={(e) => updateSettings({ highContrastMode: e.target.checked })}
                        style={{
                          accentColor: 'var(--color-primary-teal)',
                          transform: 'scale(1.1)',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          color: '#FFFFFF',
                          fontWeight: 500,
                          marginBottom: '2px'
                        }}>
                          Modo Alto Contraste
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#A0A0A0'
                        }}>
                          Aumenta o contraste para melhor visibilidade
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
                      backgroundColor: '#0A0A0A',
                      border: '1px solid #2A2A2A',
                      borderRadius: '8px',
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="checkbox"
                        checked={!(settings.reduceAnimations)}
                        onChange={(e) => updateSettings({ reduceAnimations: !e.target.checked })}
                        style={{
                          accentColor: 'var(--color-primary-teal)',
                          transform: 'scale(1.1)',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          color: '#FFFFFF',
                          fontWeight: 500,
                          marginBottom: '2px'
                        }}>
                          Animações e Transições
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#A0A0A0'
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
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Layout size={18} />
                    Componentes da Interface
                  </h3>
                  
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {[
                      { key: 'showTimer', label: 'Timer Pomodoro', desc: 'Exibir funcionalidade de timer' },
                      { key: 'showReports', label: 'Relatórios', desc: 'Exibir aba de relatórios e estatísticas' },
                      { key: 'showNotes', label: 'Notas', desc: 'Exibir sistema de notas e anotações' },
                      { key: 'showQuickActions', label: 'Ações Rápidas', desc: 'Exibir botões de acesso rápido' },
                      { key: 'showTaskCounters', label: 'Contadores de Tarefas', desc: 'Exibir números e estatísticas nas tarefas' }
                    ].map((component) => (
                      <label key={component.key} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        backgroundColor: '#0A0A0A',
                        border: '1px solid #2A2A2A',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}>
                        <input
                          type="checkbox"
                          checked={(settings as any)[component.key]}
                          onChange={(e) => updateSettings({ [component.key]: e.target.checked })}
                          style={{
                            accentColor: 'var(--color-primary-teal)',
                            transform: 'scale(1.1)',
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '14px',
                            color: '#FFFFFF',
                            fontWeight: 500,
                            marginBottom: '2px'
                          }}>
                            {component.label}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#A0A0A0'
                          }}>
                            {component.desc}
                          </div>
                        </div>
                      </label>
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
                          <div style={{ fontSize: '12px', color: isDark ? '#888' : '#6B7280', lineHeight: '1.4' }}>
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
                    <Button onClick={() => { setImportExportMode('import'); setImportExportModalOpen(true); }}>
                      <Upload size={16} style={{ marginRight: '6px' }} />
                      Importar
                    </Button>
                    <Button onClick={() => { setImportExportMode('export'); setImportExportModalOpen(true); }} variant="secondary">
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
                        <div style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#FFFFFF' : '#1F2937', marginBottom: '4px' }}>
                          Modo Alto Contraste
                        </div>
                        <div style={{ fontSize: '12px', color: isDark ? '#A0A0A0' : '#6B7280' }}>
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
                        checked={settings.largeFontMode}
                        onChange={(e) => updateSettings({ largeFontMode: e.target.checked })}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary-teal)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#FFFFFF' : '#1F2937', marginBottom: '4px' }}>
                          <Type size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                          Fonte Ampliada
                        </div>
                        <div style={{ fontSize: '12px', color: isDark ? '#A0A0A0' : '#6B7280' }}>
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
                        checked={!(settings.reduceAnimations)}
                        onChange={(e) => updateSettings({ reduceAnimations: !e.target.checked })}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary-teal)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#FFFFFF' : '#1F2937', marginBottom: '4px' }}>
                          Animações e Transições
                        </div>
                        <div style={{ fontSize: '12px', color: isDark ? '#A0A0A0' : '#6B7280' }}>
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
                        <div style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#FFFFFF' : '#1F2937', marginBottom: '4px' }}>
                          Navegação por Teclado
                        </div>
                        <div style={{ fontSize: '12px', color: isDark ? '#A0A0A0' : '#6B7280' }}>
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
                        <div style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#FFFFFF' : '#1F2937', marginBottom: '4px' }}>
                          <MousePointer size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                          Indicadores de Foco Visíveis
                        </div>
                        <div style={{ fontSize: '12px', color: isDark ? '#A0A0A0' : '#6B7280' }}>
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
                        <div style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#FFFFFF' : '#1F2937', marginBottom: '4px' }}>
                          <Volume2 size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                          Feedback Sonoro
                        </div>
                        <div style={{ fontSize: '12px', color: isDark ? '#A0A0A0' : '#6B7280' }}>
                          Reproduz sons ao completar ações (notificações, timer, etc.)
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Atalhos de Teclado */}
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
                        <span style={{ fontSize: '13px', color: isDark ? '#A0A0A0' : '#6B7280' }}>
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
                </div>

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
                onClose={() => setImportExportModalOpen(false)}
                mode={importExportMode}
                onExport={handleImportExportExport}
                onImportPreview={handleImportExportPreview}
                onImportApply={handleImportExportApply}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 