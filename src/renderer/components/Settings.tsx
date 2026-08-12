import React, { useEffect, useRef, useState, useCallback } from 'react';

import { useSettings } from '../hooks/useSettings';
import { useI18n } from '../hooks/useI18n';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../contexts/ToastContext';
import { useNotifications } from '../hooks/useNotifications';
import { useTasks } from '../contexts/TasksContext';
import { useNotes } from '../contexts/NotesContext';
import { useSystemTags } from '../contexts/SystemTagsContext';
import { useStorageMode } from '../hooks/useStorageMode';
import { isModuleLocked } from '../config/featureFlags';
import { desktopAdapter } from '../lib/desktopAdapter';
import { resolveDroppedFilePaths } from '../lib/tauriDragDrop';
import { generateTauriOrWebPreview, applyTauriOrWebImport } from '../lib/tauriImportHelper';
import { auditLogger, AuditLogEntry } from '../lib/auditLogger';


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
  Clock,
} from 'lucide-react';
import type { ImportResult, RestorePreview } from '../../shared/types/backup';
import type { UserSettings } from '../hooks/useSettings';

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

const renderSafeLogValue = (val: any, fallback: string = ''): string => {
  if (val == null) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    if (val.message && typeof val.message === 'string') return val.message;
    if (val.name && typeof val.name === 'string') return val.name;
    try {
      return JSON.stringify(val);
    } catch {
      return fallback;
    }
  }
  return String(val);
};

const LogViewerContent: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [search, setSearch] = useState('');

  const getElectron = () => (window as unknown as { electronAPI?: import('../../main/preload').ElectronAPI }).electronAPI;

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      let result: AuditLogEntry[] = auditLogger.getLogs({ level, category, search });
      const electronLogs = await getElectron()?.logging?.getLogs?.({ level: level || undefined, category: category || undefined, limit: 150 });
      if (Array.isArray(electronLogs) && electronLogs.length > 0) {
        const converted: AuditLogEntry[] = electronLogs.map((el: any, i: number) => ({
          id: `electron-${i}`,
          timestamp: el.timestamp || new Date().toISOString(),
          level: (el.level || 'info') as AuditLogEntry['level'],
          category: (el.category || 'system') as AuditLogEntry['category'],
          message: el.message || '',
          details: el.data,
        }));
        result = [...result, ...converted].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
      setLogs(result);
    } catch (error) {
      console.error('Falha ao carregar logs:', error);
      setLogs(auditLogger.getLogs({ level, category, search }));
    } finally {
      setLoading(false);
    }
  }, [level, category, search]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const handleClear = async () => {
    try {
      auditLogger.clearLogs();
      await getElectron()?.logging?.clearLogs?.();
      await loadLogs();
    } catch (error) {
      console.error('Falha ao limpar logs:', error);
    }
  };

  const handleExport = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `nexus-logs-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (error) {
      console.error('Falha ao exportar logs:', error);
    }
  };

  const getLevelBadge = (lvl: string) => {
    switch (lvl) {
      case 'error':
        return { bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' };
      case 'warn':
        return { bg: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' };
      case 'debug':
        return { bg: 'rgba(168, 85, 247, 0.15)', color: '#A855F7', border: 'rgba(168, 85, 247, 0.3)' };
      case 'info':
      default:
        return { bg: 'rgba(0, 212, 170, 0.15)', color: '#00D4AA', border: 'rgba(0, 212, 170, 0.3)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Search & Filter Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '10px',
        padding: '14px',
        borderRadius: '12px',
        border: `1px solid ${isDark ? 'var(--color-border-primary)' : '#E5E7EB'}`,
        backgroundColor: isDark ? 'var(--color-bg-secondary)' : '#F9FAFB',
      }}>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#D1D5DB'}`,
            backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#FFF',
            color: isDark ? '#FFF' : '#111',
            fontSize: '13px',
          }}
        >
          <option value="">Todos os Níveis</option>
          <option value="info">Info</option>
          <option value="warn">Aviso (Warn)</option>
          <option value="error">Erro (Error)</option>
          <option value="debug">Debug</option>
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#D1D5DB'}`,
            backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#FFF',
            color: isDark ? '#FFF' : '#111',
            fontSize: '13px',
          }}
        >
          <option value="">Todas as Categorias</option>
          <option value="notes">Notas</option>
          <option value="tasks">Tarefas</option>
          <option value="org">Organizações</option>
          <option value="settings">Configurações</option>
          <option value="auth">Autenticação</option>
          <option value="system">Sistema</option>
        </select>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar no histórico de logs..."
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#D1D5DB'}`,
            backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#FFF',
            color: isDark ? '#FFF' : '#111',
            fontSize: '13px',
          }}
        />

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Button onClick={() => { void loadLogs(); }} disabled={loading} size="sm">Atualizar</Button>
          <Button onClick={handleExport} variant="secondary" size="sm">Exportar</Button>
          <Button onClick={handleClear} variant="danger" size="sm">Limpar</Button>
        </div>
      </div>

      {/* Logs Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {loading && <div style={{ fontSize: '13px', color: isDark ? '#A0A0A0' : '#6B7280', padding: '12px' }}>Carregando logs de operações...</div>}
        {!loading && logs.length === 0 && (
          <div style={{
            padding: '24px',
            borderRadius: '12px',
            border: `1px solid ${isDark ? 'var(--color-border-primary)' : '#E5E7EB'}`,
            backgroundColor: isDark ? 'var(--color-bg-secondary)' : '#FFFFFF',
            color: isDark ? 'var(--color-text-muted)' : '#6B7280',
            fontSize: '13px',
            textAlign: 'center',
          }}>
            Nenhum registro de log encontrado para os filtros selecionados.
          </div>
        )}
        {logs.map((log, index) => {
          const badge = getLevelBadge(renderSafeLogValue(log.level, 'info'));
          return (
            <div key={`${log.id}-${index}`} style={{
              padding: '12px 16px',
              borderRadius: '10px',
              border: `1px solid ${isDark ? 'var(--color-border-primary)' : '#E5E7EB'}`,
              backgroundColor: isDark ? 'var(--color-bg-secondary)' : '#FFFFFF',
              transition: 'background-color 0.2s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '11px',
                    color: badge.color,
                    backgroundColor: badge.bg,
                    border: `1px solid ${badge.border}`,
                    borderRadius: '6px',
                    padding: '2px 8px',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    letterSpacing: '0.3px',
                  }}>
                    {renderSafeLogValue(log.level, 'info')}
                  </span>
                  <span style={{ fontSize: '11px', color: '#00D4AA', background: 'rgba(0,212,170,0.1)', padding: '2px 8px', borderRadius: '6px', fontWeight: 500 }}>
                    {renderSafeLogValue(log.category, 'sistema')}
                  </span>
                  <span style={{ fontSize: '11px', color: '#A855F7', background: 'rgba(168,85,247,0.1)', padding: '2px 8px', borderRadius: '6px', fontWeight: 500 }}>
                    👤 {renderSafeLogValue(log.user_name, 'Paulo')}
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: isDark ? 'rgba(255,255,255,0.4)' : '#9CA3AF', fontFamily: 'monospace' }}>
                  {new Date(log.timestamp).toLocaleString('pt-BR')}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: isDark ? 'var(--color-text-primary)' : '#1F2937', fontWeight: 500 }}>
                {renderSafeLogValue(log.message, 'Operação realizada')}
              </div>
              {Boolean(log.details) && typeof log.details === 'object' && Object.keys(log.details!).length > 0 && (
                <details style={{ marginTop: '8px' }}>
                  <summary style={{ cursor: 'pointer', fontSize: '12px', color: '#00D4AA', userSelect: 'none' }}>
                    Detalhes da Operação
                  </summary>
                  <pre style={{
                    marginTop: '6px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: isDark ? '#0A0A0A' : '#F3F4F6',
                    color: isDark ? '#A0A0A0' : '#4B5563',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#E5E7EB'}`,
                  }}>
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
const UpdateManagementPanel: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [status, setStatus] = useState<UpdaterStatus>({ state: 'idle' });
  const [autoDownload, setAutoDownload] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('1.4.2');
  const [platformInfo, setPlatformInfo] = useState('Windows (Tauri)');
  const [isChecking, setIsChecking] = useState(false);

  const getElectron = () => (window as unknown as { electronAPI?: import('../../main/preload').ElectronAPI }).electronAPI;

  useEffect(() => {
    // Load system version & platform via desktopAdapter
    desktopAdapter.getSystemInfo().then((info) => {
      if (info.version) setCurrentVersion(info.version);
      if (info.os) setPlatformInfo(info.os);
    }).catch(() => {});

    if (desktopAdapter.isTauri()) {
      const unsubscribe = (desktopAdapter as unknown as { onUpdateStatus?: (cb: (s: UpdaterStatus) => void) => () => void }).onUpdateStatus?.((s) => {
        setStatus(s);
      });
      return () => unsubscribe?.();
    }

    const electron = getElectron();
    if (electron?.updater) {
      electron.updater.getStatus().then((s) => setStatus(s as UpdaterStatus)).catch(() => {});
      electron.settings.get('autoDownloadUpdates').then((value) => {
        if (typeof value === 'boolean') setAutoDownload(value);
      }).catch(() => {});

      const unsubscribe = electron.updater.onStatus((s) => setStatus(s as UpdaterStatus));
      return () => {
        unsubscribe?.();
      };
    }
  }, []);

  const checkUpdates = async () => {
    setIsChecking(true);
    try {
      if (desktopAdapter.isTauri()) {
        const next = await desktopAdapter.checkForUpdates();
        if (next) setStatus(next as UpdaterStatus);
      } else {
        const next = await getElectron()?.updater?.checkForUpdates?.();
        if (next) setStatus(next as UpdaterStatus);
      }
    } catch (error) {
      console.error('Falha ao verificar atualizações:', error);
      setStatus({ state: 'error', error: 'Não foi possível verificar atualizações no momento.' });
    } finally {
      setIsChecking(false);
    }
  };

  const downloadUpdate = async () => {
    try {
      if (desktopAdapter.isTauri()) {
        await desktopAdapter.applyUpdate();
      } else {
        await getElectron()?.updater?.downloadUpdate?.();
      }
    } catch (error) {
      console.error('Falha ao baixar atualização:', error);
    }
  };

  const installUpdate = async () => {
    try {
      if (desktopAdapter.isTauri()) {
        await desktopAdapter.applyUpdate();
      } else {
        await getElectron()?.updater?.quitAndInstall?.();
      }
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

  const getStatusBadge = () => {
    if (isChecking || status.state === 'checking') {
      return { label: 'Verificando...', bg: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: 'rgba(59,130,246,0.25)' };
    }
    switch (status.state) {
      case 'available':
        return { label: 'Atualização disponível', bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: 'rgba(245,158,11,0.25)' };
      case 'downloading':
        return { label: 'Baixando...', bg: 'rgba(59,130,246,0.12)', color: '#3B82F6', border: 'rgba(59,130,246,0.25)' };
      case 'downloaded':
        return { label: 'Pronto para instalar', bg: 'rgba(16,185,129,0.12)', color: '#10B981', border: 'rgba(16,185,129,0.25)' };
      case 'error':
        return { label: 'Erro ao verificar', bg: 'rgba(239,68,68,0.12)', color: '#EF4444', border: 'rgba(239,68,68,0.25)' };
      default:
        return { label: 'Você está usando a versão mais recente', bg: 'rgba(45,212,191,0.12)', color: 'var(--color-primary-teal)', border: 'rgba(45,212,191,0.25)' };
    }
  };

  const badge = getStatusBadge();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Info Card */}
      <div style={{
        padding: '20px',
        borderRadius: '12px',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB'}`,
        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: 600, color: isDark ? '#FFFFFF' : '#1F2937', margin: '0 0 4px 0' }}>
              Atualizações do Nexus
            </h4>
            <p style={{ fontSize: '12px', color: isDark ? '#888' : '#6B7280', margin: 0 }}>
              Gerencie a versão do aplicativo e atualizações automáticas do sistema.
            </p>
          </div>
          <span style={{
            fontSize: '12px',
            fontWeight: 500,
            padding: '4px 10px',
            borderRadius: '999px',
            backgroundColor: badge.bg,
            color: badge.color,
            border: `1px solid ${badge.border}`,
          }}>
            {badge.label}
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          padding: '14px 16px',
          borderRadius: '10px',
          backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : '#F9FAFB',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6'}`,
        }}>
          <div>
            <div style={{ fontSize: '11px', color: isDark ? '#888' : '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Versão Instalação</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: isDark ? '#FFFFFF' : '#1F2937', marginTop: '2px' }}>
              v{currentVersion}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: isDark ? '#888' : '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Plataforma</div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: isDark ? '#CCC' : '#374151', marginTop: '4px' }}>
              {platformInfo}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: isDark ? '#888' : '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nova Versão</div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: status.version ? 'var(--color-primary-teal)' : (isDark ? '#888' : '#9CA3AF'), marginTop: '4px' }}>
              {status.version ? `v${status.version}` : 'Nenhuma'}
            </div>
          </div>
        </div>

        {status.releaseNotes && (
          <details style={{ marginTop: '4px' }}>
            <summary style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: 'var(--color-primary-teal)' }}>Notas da versão</summary>
            <pre style={{ marginTop: '8px', padding: '10px 12px', borderRadius: '8px', background: isDark ? '#080808' : '#F3F4F6', whiteSpace: 'pre-wrap', fontSize: '12px', color: isDark ? '#A0A0A0' : '#4B5563', maxHeight: 180, overflowY: 'auto' }}>{status.releaseNotes}</pre>
          </details>
        )}

        {status.progress && status.state === 'downloading' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: isDark ? '#CCC' : '#374151', marginBottom: '6px' }}>
              <span>Progresso do download</span>
              <span>{status.progress.percent}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', borderRadius: '999px', backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB', overflow: 'hidden' }}>
              <div style={{ width: `${status.progress.percent}%`, height: '100%', background: 'var(--color-primary-teal)', transition: 'width 0.2s ease' }} />
            </div>
          </div>
        )}

        {status.error && (
          <div style={{ fontSize: '12px', color: '#EF4444', backgroundColor: 'rgba(239,68,68,0.08)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
            {status.error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
          <Button onClick={checkUpdates} disabled={isChecking}>
            <RefreshCw size={15} className={isChecking ? 'notes-utilities-spin' : ''} style={{ marginRight: '6px' }} />
            {isChecking ? 'Verificando...' : 'Verificar Atualizações'}
          </Button>
          {(status.state === 'available' || status.state === 'downloading') && (
            <Button onClick={downloadUpdate} variant="secondary">
              <Download size={15} style={{ marginRight: '6px' }} />
              Baixar Atualização
            </Button>
          )}
          {status.state === 'downloaded' && (
            <Button onClick={installUpdate}>
              Instalar e Reiniciar
            </Button>
          )}
        </div>
      </div>

      {/* Auto download preference card */}
      <div style={{
        padding: '16px 20px',
        borderRadius: '12px',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB'}`,
        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#FFFFFF',
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={autoDownload}
            onChange={(e) => { void toggleAutoDownload(e.target.checked); }}
            style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary-teal)', borderRadius: '4px' }}
          />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#FFFFFF' : '#1F2937' }}>Download automático de atualizações</div>
            <div style={{ fontSize: '12px', color: isDark ? '#888' : '#6B7280', marginTop: '2px' }}>Baixar automaticamente quando houver nova versão estável disponível</div>
          </div>
        </label>
      </div>
    </div>
  );
};

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}
type TabType = 'geral' | 'aparencia' | 'dados' | 'organizacoes' | 'logs' | 'atualizacoes' | 'sobre';

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {

  const {
    settings,
    updateSettings,
    updateUserName,
    resetSettings,
    clearAllData,
    prepareForDistribution,
    getGreeting,
    systemInfo,
  } = useSettings();
  const { t, getAvailableLanguages } = useI18n();
  const { theme: rawTheme } = useTheme();
  const { showToast } = useToast();
  const { showNotification, playNotificationSound } = useNotifications();
  const { createTask } = useTasks();
  const { createNote, fetchNotes, syncLegacyPdfNotesToCloud } = useNotes();
  const { tags: systemTags } = useSystemTags();
  const { useCloud } = useStorageMode();

  const [userNameInput, setUserNameInput] = useState(settings.userName || '');
  const [userNameError, setUserNameError] = useState<string | null>(null);
  const [userNameSuccess, setUserNameSuccess] = useState<boolean>(false);

  useEffect(() => {
    setUserNameInput(settings.userName || '');
  }, [settings.userName]);

  const COOLDOWN_MS = 72 * 60 * 60 * 1000;
  const lastChanged = settings.nameLastChangedAt ? new Date(settings.nameLastChangedAt).getTime() : 0;
  const timePassed = Date.now() - lastChanged;
  const isCooldownActive = lastChanged > 0 && timePassed < COOLDOWN_MS;

  const remainingMs = isCooldownActive ? COOLDOWN_MS - timePassed : 0;
  const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
  const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const nextDateFormatted = isCooldownActive && lastChanged > 0
    ? new Date(lastChanged + COOLDOWN_MS).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : '';

  const handleSaveUserName = async () => {
    setUserNameError(null);
    setUserNameSuccess(false);
    const res = await updateUserName(userNameInput);
    if (!res.success) {
      setUserNameError(res.message || 'Erro ao alterar o nome de usuário.');
      showToast(res.message || 'Erro ao alterar o nome de usuário.', 'error');
    } else {
      setUserNameSuccess(true);
      showToast('Nome de usuário salvo com sucesso!', 'success');
      setTimeout(() => setUserNameSuccess(false), 3000);
    }
  };

  const [activeTab, setActiveTab] = useState<TabType>('geral');
  const [animatingTab, setAnimatingTab] = useState<TabType>('geral');
  const [isAnimating, setIsAnimating] = useState(false);

  const startTabTransition = useCallback((nextTab: TabType) => {
    if (activeTab === nextTab) return;
    const reduceMotion = settings.reduceAnimations ?? false;
    if (reduceMotion) {
      setActiveTab(nextTab);
      setAnimatingTab(nextTab);
      return;
    }
    setIsAnimating(true);
    setTimeout(() => {
      setActiveTab(nextTab);
      setAnimatingTab(nextTab);
      setIsAnimating(false);
    }, 150);
  }, [activeTab, settings.reduceAnimations]);

  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isLegacySyncing, setIsLegacySyncing] = useState(false);
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
  const interfaceDensity = settings.interfaceDensity ?? 'normal';
  const cardOpacity = settings.cardOpacity ?? 95;
  const reduceAnimations = settings.reduceAnimations ?? false;



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

      const files = Array.from(event.dataTransfer?.files || []);
      const droppedPaths = resolveDroppedFilePaths(files);
      if (droppedPaths.length === 0) {
        closeImportExportModal();
        return;
      }

      const droppedExts = files
        .map((file) => file.name.toLowerCase().match(/\.[^.]+$/)?.[0] || '')
        .filter(Boolean);
      const onlyPdfs = droppedExts.length > 0 && droppedExts.every((ext) => ext === '.pdf');

      if (droppedPaths.length > 1 && onlyPdfs) {
        window.dispatchEvent(new CustomEvent('openImportIntent', {
          detail: { intent: { kind: 'pdf-files', filePaths: droppedPaths }, source: 'external-dnd' },
        }));
        return;
      }

      window.dispatchEvent(new CustomEvent('openImportIntent', {
        detail: { filePath: droppedPaths[0], source: 'external-dnd' },
      }));
    };

    const onWindowBlur = () => {
      if (externalDragSessionRef.current) {
        closeImportExportModal();
      }
    };

    const onTauriNativeDrop = (event: Event) => {
      const customEv = event as CustomEvent<{ paths: string[] }>;
      const paths = customEv.detail?.paths;
      if (!paths || paths.length === 0) return;

      dragDepthRef.current = 0;
      externalDragSessionRef.current = false;
      setIsFileDragActive(false);

      const onlyPdfs = paths.every((p) => p.toLowerCase().endsWith('.pdf'));

      if (paths.length > 1 && onlyPdfs) {
        window.dispatchEvent(new CustomEvent('openImportIntent', {
          detail: { intent: { kind: 'pdf-files', filePaths: paths }, source: 'external-dnd' },
        }));
        return;
      }

      window.dispatchEvent(new CustomEvent('openImportIntent', {
        detail: { filePath: paths[0], source: 'external-dnd' },
      }));
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    window.addEventListener('tauriNativeFileDrop', onTauriNativeDrop);
    window.addEventListener('blur', onWindowBlur);

    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('tauriNativeFileDrop', onTauriNativeDrop);
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



  const handleSave = () => {
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

  const handleTestNotification = () => {
    showNotification({
      title: t('settings.notifications.test'),
      body: 'Esta é uma notificação de teste do Nexus',
    });
  };


  const handleHiddenLegacySync = async () => {
    if (isLegacySyncing) return;

    setIsLegacySyncing(true);
    try {
      const summary = await syncLegacyPdfNotesToCloud();
      if (summary.total === 0) {
        showToast('Nenhuma nota com PDF local pendente de sincronização.', 'info');
        return;
      }

      if (summary.failed === 0) {
        showToast(`Sincronização concluída: ${summary.synced}/${summary.total} notas.`, 'success');
      } else {
        showToast(`Sincronização parcial: ${summary.synced}/${summary.total} notas, ${summary.failed} falhas.`, 'error');
      }

      await fetchNotes();
    } catch (error) {
      console.error('Erro ao sincronizar notas legadas com PDF:', error);
      showToast('Falha ao sincronizar PDFs legados para a nuvem.', 'error');
    } finally {
      setIsLegacySyncing(false);
    }
  };

  const handleImportExportPreview = async (intent: ImportIntent): Promise<RestorePreview | null> => {
    try {
      const electron = getElectron();
      if (!electron || !electron.backup) {
        return await generateTauriOrWebPreview(intent);
      }
      if (intent?.kind === 'zip') return await electron.backup.importZipPreview({ source: 'external', filePath: intent.filePath });
      if (intent?.kind === 'zip-backup') return await electron.backup.importZipPreview({ source: 'backupId', backupId: intent.backupId });
      if (intent?.kind === 'json') return await electron.backup.importJsonPreview({ filePath: intent.filePath });
      if (intent?.kind === 'csv') return await electron.backup.importCsvPreview({ filePath: intent.filePath });
      if (intent?.kind === 'enex') return await electron.backup.importEnexPreview({ filePath: intent.filePath });
      if (intent?.kind === 'html-file') return await electron.invoke('import:html-preview', { filePath: intent.filePath }) as RestorePreview;
      if (intent?.kind === 'pdf-file') return await electron.invoke('import:pdf-preview', { filePath: intent.filePath }) as RestorePreview;
      if (intent?.kind === 'pdf-files') return await electron.invoke('import:pdf-preview', { filePaths: intent.filePaths }) as RestorePreview;
      if (intent?.kind === 'txt-file') return await electron.invoke('import:txt-preview', { filePath: intent.filePath }) as RestorePreview;
      if (intent?.kind === 'md-file') return await electron.invoke('import:md-preview', { filePath: intent.filePath }) as RestorePreview;
      if (intent?.kind === 'folder') return await electron.invoke('import:folder-preview', { folderPath: intent.folderPath }) as RestorePreview;
      return await generateTauriOrWebPreview(intent);
    } catch (err) {
      console.warn('Erro ao gerar preview do import com Electron, usando fallback:', err);
      return await generateTauriOrWebPreview(intent);
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

      const yieldToBrowser = async (): Promise<void> => {
        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => resolve());
        });
      };

      if (!electron || !electron.backup) {
        result = await applyTauriOrWebImport(intent, {
          color: options?.color,
          systemTagId: selectedSystemTag?.id,
          systemTagName: selectedSystemTag?.name,
        });
      } else {
        if (intent?.kind === 'zip') result = await electron.backup.importZipApply({ source: 'external', filePath: intent.filePath });
        else if (intent?.kind === 'zip-backup') result = await electron.backup.importZipApply({ source: 'backupId', backupId: intent.backupId });
        else if (intent?.kind === 'json') result = await electron.backup.importJsonApply({ filePath: intent.filePath });
        else if (intent?.kind === 'csv') result = await electron.backup.importCsvApply({ filePath: intent.filePath });
        else if (intent?.kind === 'enex') result = await electron.backup.importEnexApply({ filePath: intent.filePath });
        else if (intent?.kind === 'html-file') result = await electron.invoke('import:html-apply', { filePath: intent.filePath, systemTagId: selectedSystemTag?.id, systemTagName: selectedSystemTag?.name }) as ImportResult;
        else if (intent?.kind === 'pdf-file') result = await electron.invoke('import:pdf-apply', { filePath: intent.filePath }) as ImportResult;
        else if (intent?.kind === 'pdf-files') result = await electron.invoke('import:pdf-apply', { filePaths: intent.filePaths, systemTagId: selectedSystemTag?.id, systemTagName: selectedSystemTag?.name }) as ImportResult;
        else if (intent?.kind === 'txt-file') result = await electron.invoke('import:txt-apply', { filePath: intent.filePath, systemTagId: selectedSystemTag?.id, systemTagName: selectedSystemTag?.name }) as ImportResult;
        else if (intent?.kind === 'md-file') result = await electron.invoke('import:md-apply', { filePath: intent.filePath, systemTagId: selectedSystemTag?.id, systemTagName: selectedSystemTag?.name }) as ImportResult;
        else if (intent?.kind === 'mp4-file') result = await electron.invoke('import:mp4-apply', { filePath: intent.filePath, systemTagId: selectedSystemTag?.id, systemTagName: selectedSystemTag?.name }) as ImportResult;
        else if (intent?.kind === 'folder') result = await electron.invoke('import:folder-apply', { folderPath: intent.folderPath }) as ImportResult;
        else {
          result = await applyTauriOrWebImport(intent, {
            color: options?.color,
            systemTagId: selectedSystemTag?.id,
            systemTagName: selectedSystemTag?.name,
          });
        }
      }

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
              if (index > 0 && index % 5 === 0) {
                await yieldToBrowser();
              }

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
              if (index > 0 && index % 5 === 0) {
                await yieldToBrowser();
              }

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
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{
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
      }}
    >
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
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: theme.mode === 'dark' ? '#141414' : 'var(--color-bg-card)',
          border: `1px solid ${theme.mode === 'dark' ? '#2A2A2A' : 'var(--color-border-primary)'}`,
          borderRadius: '16px',
          width: '940px',
          maxWidth: '92vw',
          height: '680px',
          maxHeight: '88vh',
          display: 'flex',
          overflow: 'hidden',
          boxShadow: theme.mode === 'dark' ? '0 20px 40px rgba(0, 0, 0, 0.6)' : 'var(--shadow-2xl)',
          transition: 'all var(--transition-theme)',
        }}
      >
        {/* Sidebar com abas */}
        <div style={{
          width: '220px',
          backgroundColor: theme.mode === 'dark' ? '#0A0A0A' : 'var(--color-bg-secondary)',
          borderRight: `1px solid ${theme.mode === 'dark' ? '#2A2A2A' : 'var(--color-border-primary)'}`,
          padding: '24px 0',
          flexShrink: 0,
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
              }}>
                Configurações
              </h2>
            </div>
          </div>
          
          <nav style={{ padding: '8px 0' }}>
            {tabs.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => startTabTransition(tab.id as TabType)}
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    backgroundColor: isSelected ? 'var(--color-bg-tertiary)' : 'transparent',
                    border: 'none',
                    borderLeft: isSelected ? '3px solid var(--color-primary-teal)' : '3px solid transparent',
                    color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    fontSize: '14px',
                    fontWeight: isSelected ? 600 : 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                      e.currentTarget.style.color = 'var(--color-text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--color-text-secondary)';
                    }
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Conteúdo principal */}
        <div
          className="invisible-scrollbar"
          style={{
            flex: 1,
            padding: '32px',
            overflowY: 'auto',
            overflowX: 'hidden',
            position: 'relative',
            backgroundColor: 'var(--color-bg-primary)',
            scrollbarWidth: 'none',
          }}
        >
          {/* Header com botão fechar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              letterSpacing: '-0.01em',
            }}>
              {tabs.find(t => t.id === activeTab)?.icon}
              {tabs.find(t => t.id === activeTab)?.label}
            </h3>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: '1px solid var(--color-border-primary)',
                borderRadius: '8px',
                color: 'var(--color-text-secondary)',
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
                e.currentTarget.style.borderColor = 'var(--color-border-primary)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              <X size={16} strokeWidth={1.7} />
            </button>
          </div>

          {/* Conteúdo das abas com animação CSS controlada */}
          <div
            key={animatingTab}
            className={`settings-tab-content${isAnimating ? ' settings-tab-exit' : ' settings-tab-enter'}`}
            style={{
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
          >
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
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={userNameInput}
                      disabled={isCooldownActive}
                      onChange={(e) => setUserNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isCooldownActive) {
                          e.preventDefault();
                          void handleSaveUserName();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: isCooldownActive
                          ? (theme.mode === 'dark' ? '#18181B' : '#F3F4F6')
                          : (theme.mode === 'dark' ? '#0A0A0A' : 'var(--color-bg-card)'),
                        border: `1px solid ${theme.mode === 'dark' ? '#2A2A2A' : 'var(--color-border-primary)'}`,
                        borderRadius: '8px',
                        color: isCooldownActive
                          ? 'var(--color-text-muted)'
                          : (theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)'),
                        fontSize: '14px',
                        cursor: isCooldownActive ? 'not-allowed' : 'text',
                      }}
                      placeholder="Digite seu nome..."
                    />
                    {!isCooldownActive && (
                      <button
                        type="button"
                        onClick={() => void handleSaveUserName()}
                        disabled={!userNameInput.trim() || userNameInput.trim() === settings.userName}
                        style={{
                          padding: '12px 16px',
                          backgroundColor: 'var(--color-primary-teal)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: (!userNameInput.trim() || userNameInput.trim() === settings.userName) ? 'not-allowed' : 'pointer',
                          opacity: (!userNameInput.trim() || userNameInput.trim() === settings.userName) ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        Salvar Nome
                      </button>
                    )}
                  </div>

                  {isCooldownActive ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '8px',
                      fontSize: '12px',
                      color: '#F59E0B',
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                    }}>
                      <Clock size={14} style={{ flexShrink: 0 }} />
                      <span>
                        O nome de usuário só pode ser alterado a cada 72 horas. Próxima alteração disponível em:{' '}
                        <strong>{nextDateFormatted}</strong> (restam ~{remainingHours}h {remainingMinutes}m).
                      </span>
                    </div>
                  ) : (
                    <div style={{
                      marginTop: '6px',
                      fontSize: '12px',
                      color: 'var(--color-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      <Info size={13} style={{ flexShrink: 0 }} />
                      <span>O nome de usuário pode ser alterado a cada 72 horas e é vinculado ao seu ID de usuário.</span>
                    </div>
                  )}

                  {userNameError && (
                    <div style={{ fontSize: '12px', color: 'var(--color-error, #ef4444)', marginTop: '6px' }}>
                      {userNameError}
                    </div>
                  )}

                  {userNameSuccess && (
                    <div style={{ fontSize: '12px', color: 'var(--color-primary-teal)', marginTop: '6px' }}>
                      ✓ Nome de usuário atualizado com sucesso!
                    </div>
                  )}
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
                    onChange={(e) => updateSettings({ language: e.target.value as UserSettings['language'] })}
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
                  <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <Bell size={18} />
                    Notificações
                  </h3>
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
                    }}>
                      <input
                        type="checkbox"
                        checked={settings.showDesktopNotifications !== false && settings.showNotifications !== false}
                        onChange={(e) => updateSettings({ showNotifications: e.target.checked, showDesktopNotifications: e.target.checked })}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary-teal)' }}
                      />
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
                    }}>
                      <input
                        type="checkbox"
                        checked={settings.showToastNotifications !== false}
                        onChange={(e) => updateSettings({ showToastNotifications: e.target.checked })}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary-teal)' }}
                      />
                      <span style={{ fontSize: '14px', color: theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)' }}>
                        Exibir avisos pop-up (Toasts no sistema)
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
                    }}>
                      <input
                        type="checkbox"
                        checked={settings.playSound}
                        onChange={(e) => updateSettings({ playSound: e.target.checked })}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary-teal)' }}
                      />
                      <span style={{ fontSize: '14px', color: theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)' }}>
                        {t('settings.notifications.sound')}
                      </span>
                    </label>

                    {[
                      { key: 'notifyProductivityInsights' as const, label: 'Insights de produtividade' },
                      { key: 'notifyPing' as const, label: 'Notificações de Ping' },
                      { key: 'notifyNoteCreated' as const, label: 'Avisar quando notas forem criadas por outros usuários' },
                      { key: 'notifyNoteUpdated' as const, label: 'Avisar quando notas forem alteradas' },
                      { key: 'notifyNoteImported' as const, label: 'Avisar quando notas forem importadas' },
                    ].map((item) => (
                      <label key={item.key} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        padding: '12px',
                        backgroundColor: theme.mode === 'dark' ? '#0A0A0A' : 'var(--color-bg-secondary)',
                        border: `1px solid ${theme.mode === 'dark' ? '#2A2A2A' : 'var(--color-border-primary)'}`,
                        borderRadius: '8px',
                      }}>
                        <input
                          type="checkbox"
                          checked={settings[item.key] !== false}
                          onChange={(e) => updateSettings({ [item.key]: e.target.checked })}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary-teal)' }}
                        />
                        <span style={{ fontSize: '14px', color: theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)' }}>
                          {item.label}
                        </span>
                      </label>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        showToast('Teste de notificação enviado com sucesso!', 'info');
                        showNotification({
                          title: 'Teste de Notificação',
                          body: 'As notificações do Nexus estão funcionando perfeitamente!',
                          force: true,
                        });
                        if (settings.playSound) {
                          playNotificationSound();
                        }
                      }}
                      style={{
                        marginTop: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        backgroundColor: 'var(--color-primary-teal)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <TestTube size={16} />
                      Testar notificação
                    </button>


                  </div>
                </div>

              </div>
            )}

            {activeTab === 'aparencia' && (
              <div style={{ display: 'grid', gap: '24px' }}>
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

                {/* Interface Mode */}
                <div>
                  <h4 style={{
                    margin: '0 0 12px 0',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                  }}>
                    Modo de Interface
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {(['simplified', 'zen'] as const).map((m) => {
                      const isActive = (settings.interfaceMode ?? 'simplified') === m;
                      const label = m === 'simplified' ? 'Simplificado' : 'Zen';
                      const desc = m === 'simplified'
                        ? 'Toolbar flutuante, grid de notas e modais de edição'
                        : 'Layout 3 colunas, lista lateral e editor inline';
                      return (
                        <button
                          key={m}
                          onClick={() => updateSettings({ interfaceMode: m })}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '10px',
                            border: `1.5px solid ${isActive ? 'rgba(20,184,166,0.6)' : (isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB')}`,
                            background: isActive
                              ? (isDark ? 'rgba(20,184,166,0.1)' : 'rgba(20,184,166,0.06)')
                              : (isDark ? 'rgba(255,255,255,0.02)' : '#FAFAFA'),
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: isActive ? '#14b8a6' : 'var(--color-text-primary)',
                            marginBottom: 4,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}>
                            {isActive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#14b8a6', display: 'inline-block' }} />}
                            {label}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                            {desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: 8 }}>
                    Aplica imediatamente. Salvo por usuário no Supabase.
                  </p>
                </div>

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
                        border: `1px solid ${interfaceDensity === density.key ? 'var(--color-primary-teal)' : (isDark ? '#2A2A2A' : 'var(--color-border-primary)')}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}>
                        <input
                          type="radio"
                          name="density"
                          value={density.key}
                          checked={interfaceDensity === density.key}
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
                      min="40"
                      max="100"
                      step="5"
                      value={cardOpacity}
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
                      {cardOpacity}%
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

                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      cursor: 'pointer',
                      padding: '14px 16px',
                      backgroundColor: isDark ? '#141414' : '#FFFFFF',
                      border: `1px solid ${!(settings.reduceAnimations ?? false) ? 'var(--color-primary-teal)' : (isDark ? '#2A2A2A' : 'var(--color-border-primary)')}`,
                      borderRadius: '10px',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: !(settings.reduceAnimations ?? false) ? '0 0 12px rgba(20, 184, 166, 0.15)' : 'none',
                    }}>
                      <input
                        type="checkbox"
                        checked={!(settings.reduceAnimations ?? false)}
                        onChange={(e) => updateSettings({ reduceAnimations: !e.target.checked })}
                        style={{ width: '20px', height: '20px', accentColor: 'var(--color-primary-teal)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          color: 'var(--color-text-primary)',
                          fontWeight: 600,
                          marginBottom: '3px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}>
                          <span>Animações e Transições Fluídas (Tauri v2)</span>
                          {!(settings.reduceAnimations ?? false) && (
                            <span style={{
                              fontSize: '10px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              backgroundColor: 'rgba(20, 184, 166, 0.15)',
                              color: 'var(--color-primary-teal)',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>60 / 120 FPS Active</span>
                          )}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)',
                          lineHeight: '1.4'
                        }}>
                          Ativa efeitos visuais nativos, acelerados via GPU DirectComposition, hover dinâmico e transições suavizadas de modais e navegação.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 style={{
                    margin: '20px 0 16px 0',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <Keyboard size={18} />
                    Navegação e Interação
                  </h3>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '12px',
                      backgroundColor: isDark ? '#0A0A0A' : 'var(--color-bg-secondary)',
                      border: `1px solid ${isDark ? '#2A2A2A' : 'var(--color-border-primary)'}`,
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
                          marginBottom: '4px',
                        }}>
                          Navegação por Teclado
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                          Permite navegar com Tab, Enter e setas do teclado
                        </div>
                      </div>
                    </label>

                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '12px',
                      backgroundColor: isDark ? '#0A0A0A' : 'var(--color-bg-secondary)',
                      border: `1px solid ${isDark ? '#2A2A2A' : 'var(--color-border-primary)'}`,
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
                          marginBottom: '4px',
                        }}>
                          <MousePointer size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                          Indicadores de Foco
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                          Realça o elemento focado durante navegação por teclado.
                        </div>
                      </div>
                    </label>
                  </div>
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
                          <stop offset="0%" style={{ stopColor: 'var(--color-primary-teal)', stopOpacity: 1 }} />
                          <stop offset="50%" style={{ stopColor: '#00B4D8', stopOpacity: 1 }} />
                          <stop offset="100%" style={{ stopColor: 'var(--color-primary-purple)', stopOpacity: 1 }} />
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
                      <button
                        onClick={handleHiddenLegacySync}
                        disabled={isLegacySyncing || !useCloud}
                        title="Sincronizar notas legadas com PDF local para nuvem"
                        style={{
                          marginTop: '6px',
                          fontSize: '11px',
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          color: theme.mode === 'dark' ? '#7A7A7A' : '#9CA3AF',
                          cursor: isLegacySyncing || !useCloud ? 'not-allowed' : 'pointer',
                          opacity: isLegacySyncing || !useCloud ? 0.45 : 0.18,
                          transition: 'opacity 0.2s ease',
                          letterSpacing: '0.02em',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = isLegacySyncing || !useCloud ? '0.45' : '0.55'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = isLegacySyncing || !useCloud ? '0.45' : '0.18'; }}
                      >
                        {isLegacySyncing ? 'Sincronizando legados...' : 'sincronizar anexos legados'}
                      </button>
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

                  <div style={{ display: 'grid', gap: '12px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 18px',
                      backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                      border: `1px solid ${theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
                      borderRadius: '10px',
                    }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)',
                      }}>
                        {t('about.machineId')}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code style={{
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: '#14b8a6',
                          backgroundColor: theme.mode === 'dark' ? 'rgba(20,184,166,0.15)' : 'rgba(20,184,166,0.1)',
                          border: '1px solid rgba(20,184,166,0.3)',
                          padding: '3px 10px',
                          borderRadius: '6px',
                        }}>
                          {systemInfo?.machineId || 'Carregando...'}
                        </code>
                        <button
                          onClick={() => copyToClipboard(systemInfo?.machineId || '')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: theme.mode === 'dark' ? '#A0A0A0' : 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            padding: '5px',
                            borderRadius: '6px',
                            transition: 'all 0.15s ease',
                          }}
                          title="Copiar ID"
                        >
                          <Copy size={15} strokeWidth={1.8} />
                        </button>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 18px',
                      backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                      border: `1px solid ${theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
                      borderRadius: '10px',
                    }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)',
                      }}>
                        {t('about.installDate')}
                      </span>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: theme.mode === 'dark' ? '#A0A0A0' : 'var(--color-text-secondary)',
                      }}>
                        {systemInfo?.installDate ? new Date(systemInfo.installDate).toLocaleDateString('pt-BR') : '12/08/2026'}
                      </span>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 18px',
                      backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                      border: `1px solid ${theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
                      borderRadius: '10px',
                    }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)',
                      }}>
                        {t('about.developer')}
                      </span>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: theme.mode === 'dark' ? '#A0A0A0' : 'var(--color-text-secondary)',
                      }}>
                        Paulo Riccardo Nascimento dos Santos
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
                backgroundColor: 'var(--color-primary-teal)',
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
                e.currentTarget.style.backgroundColor = 'var(--primary-600)';
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

