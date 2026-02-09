import React, { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useI18n } from '../hooks/useI18n';
import { useTheme } from '../hooks/useTheme';
import { useAIConfig } from '../hooks/useAIConfig';
import { useNotifications } from '../hooks/useNotifications';
import { useCategories } from '../contexts/CategoriesContext';
import { CategoryManager } from './CategoryManager';
import { AISettings } from './AISettings';
import { Button } from './ui/Button';

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

// Componente para visualizar crash reports
const CrashReportViewerContent: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [crashReports, setCrashReports] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadCrashReports = async () => {
      try {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI?.logging?.getCrashReports) {
          const reportsData = await electronAPI.logging.getCrashReports({ limit: 50 });
          setCrashReports(reportsData || []);
        }
      } catch (error) {
        console.error('Erro ao carregar crash reports:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCrashReports();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: isDark ? '#A0A0A0' : '#6B7280' }}>
        Carregando crash reports...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {crashReports.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px', 
          color: isDark ? '#A0A0A0' : '#6B7280',
          backgroundColor: isDark ? '#1A1A1A' : '#F9FAFB',
          borderRadius: '8px',
          border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`
        }}>
          ✅ Nenhum crash report encontrado - Sistema estável!
        </div>
      ) : (
        crashReports.map((report, index) => (
          <div
            key={index}
            style={{
              padding: '16px',
              backgroundColor: isDark ? '#1A1A1A' : '#FEF2F2',
              border: `1px solid ${isDark ? '#2A2A2A' : '#FECACA'}`,
              borderRadius: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: '#EF4444',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600
              }}>
                CRASH
              </span>
              <span style={{ 
                color: isDark ? '#A0A0A0' : '#6B7280',
                fontSize: '14px'
              }}>
                {new Date(report.timestamp).toLocaleString()}
              </span>
            </div>
            
            <div style={{ 
              color: isDark ? '#FFFFFF' : '#1F2937',
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '8px'
            }}>
              {report.error?.message || 'Erro desconhecido'}
            </div>

            {report.context && (
              <div style={{ 
                color: isDark ? '#D1D5DB' : '#374151',
                fontSize: '13px',
                marginBottom: '12px'
              }}>
                <div style={{ fontWeight: 600, marginBottom: '6px' }}>Contexto:</div>
                <pre style={{
                  background: isDark ? '#0F172A' : '#F3F4F6',
                  border: `1px solid ${isDark ? '#1F2937' : '#E5E7EB'}`,
                  borderRadius: '8px',
                  padding: '10px',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  margin: 0
                }}>{JSON.stringify(report.context, null, 2)}</pre>
              </div>
            )}

            {report.systemInfo && (
              <details style={{ marginBottom: '12px' }}>
                <summary style={{ 
                  cursor: 'pointer', 
                  color: isDark ? '#00D4AA' : '#059669',
                  fontSize: '13px'
                }}>
                  Informações do Sistema
                </summary>
                <div style={{
                  marginTop: '8px',
                  padding: '12px',
                  backgroundColor: isDark ? '#0A0A0A' : '#F3F4F6',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}>
                  <div><strong>Plataforma:</strong> {report.systemInfo.platform}</div>
                  <div><strong>Versão do OS:</strong> {report.systemInfo.release}</div>
                  <div><strong>Arquitetura:</strong> {report.systemInfo.arch}</div>
                  <div><strong>Memória Total:</strong> {Math.round(report.systemInfo.totalMemory / 1024 / 1024 / 1024)}GB</div>
                </div>
              </details>
            )}

            {report.error?.stack && (
              <details>
                <summary style={{ 
                  cursor: 'pointer', 
                  color: isDark ? '#00D4AA' : '#059669',
                  fontSize: '13px'
                }}>
                  Stack Trace
                </summary>
                <pre style={{
                  marginTop: '8px',
                  padding: '12px',
                  backgroundColor: isDark ? '#0A0A0A' : '#F3F4F6',
                  borderRadius: '6px',
                  fontSize: '11px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: isDark ? '#D1D5DB' : '#374151',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {report.error.stack}
                </pre>
              </details>
            )}
          </div>
        ))
      )}
    </div>
  );
};

// Componente para gerenciar atualizações
const UpdateManagementPanel: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [updateInfo, setUpdateInfo] = React.useState<any>(null);
  const [updateSettings, setUpdateSettings] = React.useState<any>({
    autoCheckForUpdates: true,
    updateChannel: 'stable',
    checkIntervalHours: 24,
    notifyOnNewVersion: true,
    downloadAutomatically: false
  });
  const [isChecking, setIsChecking] = React.useState(false);
  const [lastCheck, setLastCheck] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadUpdateSettings();
    loadCurrentVersion();
    const onDownloaded = (_e: any, payload: any) => {
      console.log('Update downloaded:', payload);
    };
    (window as any).electronAPI?.on?.('update:downloaded', onDownloaded);
    return () => {
      (window as any).electronAPI?.off?.('update:downloaded', onDownloaded);
    };
  }, []);

  const loadUpdateSettings = async () => {
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.version?.getUpdateSettings) {
        const settings = await electronAPI.version.getUpdateSettings();
        setUpdateSettings(settings);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de atualização:', error);
    }
  };

  const loadCurrentVersion = async () => {
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.version?.getCurrentVersion) {
        const version = await electronAPI.version.getCurrentVersion();
        setUpdateInfo(version);
      }
    } catch (error) {
      console.error('Erro ao carregar versão atual:', error);
    }
  };

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.version?.forceCheck) {
        const result = await electronAPI.version.forceCheck();
        setUpdateInfo(result);
        setLastCheck(new Date().toLocaleString());
      }
    } catch (error) {
      console.error('Erro ao verificar atualizações:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleUpdateSettings = async (newSettings: any) => {
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.version?.updateSettings) {
        await electronAPI.version.updateSettings(newSettings);
        setUpdateSettings(newSettings);
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Informações da Versão */}
      <div style={{
        padding: '20px',
        backgroundColor: isDark ? '#0A0A0A' : '#F9FAFB',
        border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
        borderRadius: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h4 style={{
              fontSize: '16px',
              fontWeight: 600,
              color: isDark ? '#FFFFFF' : '#1F2937',
              margin: 0
            }}>
              Versão Atual
            </h4>
            <p style={{
              fontSize: '13px',
              color: isDark ? '#A0A0A0' : '#6B7280',
              margin: '4px 0 0 0'
            }}>
              Informações sobre a versão instalada
            </p>
          </div>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '16px'
        }}>
          <div>
            <span style={{ fontSize: '13px', color: isDark ? '#A0A0A0' : '#6B7280' }}>
              Versão:
            </span>
            <div style={{ fontSize: '15px', fontWeight: 500, color: isDark ? '#FFFFFF' : '#1F2937' }}>
              {updateInfo?.currentVersion?.versionString || '1.0.0'}
            </div>
          </div>
          
          <div>
            <span style={{ fontSize: '13px', color: isDark ? '#A0A0A0' : '#6B7280' }}>
              Canal:
            </span>
            <div style={{ fontSize: '15px', fontWeight: 500, color: isDark ? '#FFFFFF' : '#1F2937' }}>
              {updateSettings.updateChannel || 'stable'}
            </div>
          </div>
          
          <div>
            <span style={{ fontSize: '13px', color: isDark ? '#A0A0A0' : '#6B7280' }}>
              Última Verificação:
            </span>
            <div style={{ fontSize: '15px', fontWeight: 500, color: isDark ? '#FFFFFF' : '#1F2937' }}>
              {lastCheck || 'Nunca'}
            </div>
          </div>
        </div>

        {updateInfo?.hasUpdate && (
          <div style={{
            padding: '12px',
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#155724', marginBottom: '4px' }}>
              Nova versão disponível: {updateInfo.latestVersion?.versionString}
            </div>
            {updateInfo.releaseNotes && (
              <div style={{ fontSize: '13px', color: '#155724' }}>
                {updateInfo.releaseNotes}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <Button onClick={async () => {
                try {
                  const electronAPI = (window as any).electronAPI;
                  const res = await electronAPI?.update?.download?.(updateInfo);
                  if (res?.success) {
                    alert('Atualização baixada. A pasta será aberta para instalação.');
                  } else {
                    alert('Falha no download da atualização.');
                  }
                } catch (e) {
                  console.error('Download update error', e);
                  alert('Erro ao baixar atualização');
                }
              }}>Baixar Atualização</Button>
              <Button onClick={() => {
                const url = updateInfo?.latestVersion?.downloadUrl;
                if (url) {
                  window.open(url, '_blank');
                }
              }}>
                Abrir link do instalador
              </Button>
            </div>
          </div>
        )}

        <Button 
          onClick={handleCheckForUpdates}
          disabled={isChecking}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <RefreshCw size={16} className={isChecking ? 'spin' : ''} />
          {isChecking ? 'Verificando...' : 'Verificar Atualizações'}
        </Button>
      </div>

      {/* Configurações de Atualização */}
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
          margin: '0 0 16px 0'
        }}>
          Configurações de Atualização
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Verificação Automática */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#FFFFFF' : '#1F2937' }}>
                Verificação Automática
              </div>
              <div style={{ fontSize: '13px', color: isDark ? '#A0A0A0' : '#6B7280' }}>
                Verificar automaticamente por novas versões
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={updateSettings.autoCheckForUpdates}
                onChange={(e) => handleUpdateSettings({
                  ...updateSettings,
                  autoCheckForUpdates: e.target.checked
                })}
                style={{ marginRight: '8px' }}
              />
            </label>
          </div>

          {/* Canal de Atualização */}
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#FFFFFF' : '#1F2937', marginBottom: '8px' }}>
              Canal de Atualização
            </div>
            <select
              value={updateSettings.updateChannel}
              onChange={(e) => handleUpdateSettings({
                ...updateSettings,
                updateChannel: e.target.value
              })}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '6px',
                border: `1px solid ${isDark ? '#404040' : '#D1D5DB'}`,
                backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                color: isDark ? '#FFFFFF' : '#1F2937',
                fontSize: '14px'
              }}
            >
              <option value="stable">Estável</option>
              <option value="beta">Beta</option>
              <option value="alpha">Alpha</option>
              <option value="nightly">Nightly</option>
            </select>
          </div>

          {/* Intervalo de Verificação */}
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#FFFFFF' : '#1F2937', marginBottom: '8px' }}>
              Intervalo de Verificação
            </div>
            <select
              value={updateSettings.checkIntervalHours}
              onChange={(e) => handleUpdateSettings({
                ...updateSettings,
                checkIntervalHours: parseInt(e.target.value)
              })}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '6px',
                border: `1px solid ${isDark ? '#404040' : '#D1D5DB'}`,
                backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                color: isDark ? '#FFFFFF' : '#1F2937',
                fontSize: '14px'
              }}
            >
              <option value="1">A cada hora</option>
              <option value="6">A cada 6 horas</option>
              <option value="12">A cada 12 horas</option>
              <option value="24">Diariamente</option>
              <option value="168">Semanalmente</option>
            </select>
          </div>

          {/* Notificações */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#FFFFFF' : '#1F2937' }}>
                Notificar Sobre Novas Versões
              </div>
              <div style={{ fontSize: '13px', color: isDark ? '#A0A0A0' : '#6B7280' }}>
                Mostrar notificação quando uma nova versão estiver disponível
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={updateSettings.notifyOnNewVersion}
                onChange={(e) => handleUpdateSettings({
                  ...updateSettings,
                  notifyOnNewVersion: e.target.checked
                })}
                style={{ marginRight: '8px' }}
              />
            </label>
          </div>

          {/* Download Automático */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#FFFFFF' : '#1F2937' }}>
                Download Automático
              </div>
              <div style={{ fontSize: '13px', color: isDark ? '#A0A0A0' : '#6B7280' }}>
                Baixar automaticamente as atualizações em segundo plano
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={updateSettings.downloadAutomatically}
                onChange={(e) => handleUpdateSettings({
                  ...updateSettings,
                  downloadAutomatically: e.target.checked
                })}
                style={{ marginRight: '8px' }}
              />
            </label>
          </div>
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
  Brain, 
  Database, 
  Info,
  X,
  Save,
  RotateCcw,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  TestTube,
  Target,
  Zap,
  CheckCircle,
  BookOpen,
  AlertCircle,
  Shield,
  Copy,
  Layout,
  HardDrive
} from 'lucide-react';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'geral' | 'aparencia' | 'produtividade' | 'notificacoes' | 'acessibilidade' | 'inteligencia-artificial' | 'backup' | 'armazenamento' | 'logs' | 'atualizacoes' | 'sobre';

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const { 
    settings, 
    updateSettings, 
    exportSettings, 
    importSettings, 
    resetSettings, 
    clearAllData, 
    systemInfo 
  } = useSettings();
  const { t, currentLanguage, changeLanguage, getAvailableLanguages } = useI18n();
  const { theme, setTheme, colors, effectiveMode } = useTheme();
  const { aiConfig, updateConfig: updateAIConfig, isAIReady } = useAIConfig();
  const { showNotification } = useNotifications();
  const { categories, createCategory, updateCategory, deleteCategory } = useCategories();
  const [activeTab, setActiveTab] = useState<TabType>('geral');
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showAdvancedAI, setShowAdvancedAI] = useState(false);
  const [showLogViewer, setShowLogViewer] = useState(false);
  const [showCrashReportViewer, setShowCrashReportViewer] = useState(false);

  const isDark = effectiveMode === 'dark';

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

  const handleExportSettings = () => {
    try {
      const exportData = exportSettings();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `krigzis-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting settings:', error);
    }
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          if (importSettings(content)) {
            showToast(t('settings.saved'), 'success');
          }
        } catch (error) {
          console.error('Error importing settings:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleTestNotification = () => {
    showNotification({
      title: t('settings.notifications.test'),
      body: 'Esta é uma notificação de teste do Krigzis',
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('ID copiado para a área de transferência', 'success');
  };

  const tabs = [
    { id: 'geral', label: t('settings.general'), icon: <SettingsIcon size={16} strokeWidth={1.7} /> },
    { id: 'aparencia', label: t('settings.appearance'), icon: <Palette size={16} strokeWidth={1.7} /> },
    { id: 'produtividade', label: 'Produtividade', icon: <Target size={16} strokeWidth={1.7} /> },
    { id: 'notificacoes', label: t('settings.notifications'), icon: <Bell size={16} strokeWidth={1.7} /> },
    { id: 'acessibilidade', label: t('settings.accessibility'), icon: <Eye size={16} strokeWidth={1.7} /> },
    { id: 'inteligencia-artificial', label: 'Inteligência Artificial', icon: <Brain size={16} strokeWidth={1.7} /> },
    { id: 'backup', label: t('settings.backup'), icon: <Download size={16} strokeWidth={1.7} /> },
    { id: 'armazenamento', label: 'Dados & Armazenamento', icon: <HardDrive size={16} strokeWidth={1.7} /> },
    { id: 'logs', label: 'Logs', icon: <Database size={16} strokeWidth={1.7} /> },
    { id: 'atualizacoes', label: 'Atualizações', icon: <RefreshCw size={16} strokeWidth={1.7} /> },
    { id: 'sobre', label: t('settings.about'), icon: <Info size={16} strokeWidth={1.7} /> },
  ];

  const exportLogData = async () => {
    try {
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI?.logging?.exportLogs) {
        throw new Error('API de logging não disponível');
      }

      const exportedData = await electronAPI.logging.exportLogs();
      const blob = new Blob([exportedData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `krigzis-logs-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      showToast('Logs exportados com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao exportar logs:', error);
      showToast('Erro ao exportar logs', 'error');
    }
  };

  const clearLogData = async () => {
    if (window.confirm('Tem certeza que deseja limpar todos os logs? Esta ação não pode ser desfeita.')) {
      try {
        const electronAPI = (window as any).electronAPI;
        if (!electronAPI?.logging?.clearLogs) {
          throw new Error('API de logging não disponível');
        }

        const clearedCount = await electronAPI.logging.clearLogs();
        showToast(`${clearedCount} logs limpos com sucesso!`, 'success');
      } catch (error) {
        console.error('Erro ao limpar logs:', error);
        showToast('Erro ao limpar logs', 'error');
      }
    }
  };

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
                        checked={!((settings as any).reduceAnimations)}
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

            {activeTab === 'produtividade' && (
              <div style={{ display: 'grid', gap: '24px' }}>
                <div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: isDark ? '#FFFFFF' : '#1F2937',
                    marginBottom: '16px',
                    margin: 0
                  }}>
                    Configurações de Produtividade
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: isDark ? '#A0A0A0' : '#6B7280',
                    marginBottom: '24px',
                    margin: '8px 0 24px 0'
                  }}>
                    Personalize sua experiência e otimize seu fluxo de trabalho.
                  </p>
                </div>

                {/* Configurações de Comportamento da IA */}
                <div style={{
                  padding: '20px',
                  backgroundColor: isDark ? '#141414' : '#F5F5F5',
                  border: `1px solid ${isDark ? '#2A2A2A' : '#E0E0E0'}`,
                  borderRadius: '12px',
                }}>
                  <h4 style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    marginBottom: '16px',
                    margin: '0 0 16px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <Brain size={16} />
                    Comportamento da IA
                  </h4>
                  
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '12px',
                      backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF',
                      border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                      borderRadius: '8px',
                    }}>
                      <input
                        type="checkbox"
                        checked={settings.aiCanCreateTasks}
                        onChange={(e) => updateSettings({ aiCanCreateTasks: e.target.checked })}
                        style={{
                          width: '18px',
                          height: '18px',
                          accentColor: 'var(--color-primary-teal)',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: isDark ? '#FFFFFF' : '#1F2937',
                          marginBottom: '4px',
                        }}>
                          Permitir criação de tarefas
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: isDark ? '#A0A0A0' : '#6B7280',
                        }}>
                          A IA pode criar novas tarefas baseadas em suas solicitações
                        </div>
                      </div>
                    </label>

                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '12px',
                      backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF',
                      border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                      borderRadius: '8px',
                    }}>
                      <input
                        type="checkbox"
                        checked={settings.aiCanEditTasks}
                        onChange={(e) => updateSettings({ aiCanEditTasks: e.target.checked })}
                        style={{
                          width: '18px',
                          height: '18px',
                          accentColor: 'var(--color-primary-teal)',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: isDark ? '#FFFFFF' : '#1F2937',
                          marginBottom: '4px',
                        }}>
                          Permitir edição de tarefas
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: isDark ? '#A0A0A0' : '#6B7280',
                        }}>
                          A IA pode modificar tarefas existentes
                        </div>
                      </div>
                    </label>

                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '12px',
                      backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF',
                      border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                      borderRadius: '8px',
                    }}>
                      <input
                        type="checkbox"
                        checked={settings.aiCanDeleteTasks}
                        onChange={(e) => updateSettings({ aiCanDeleteTasks: e.target.checked })}
                        style={{
                          width: '18px',
                          height: '18px',
                          accentColor: 'var(--color-primary-teal)',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: isDark ? '#FFFFFF' : '#1F2937',
                          marginBottom: '4px',
                        }}>
                          Permitir exclusão de tarefas
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: isDark ? '#A0A0A0' : '#6B7280',
                        }}>
                          A IA pode excluir tarefas quando solicitado
                        </div>
                      </div>
                    </label>

                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '12px',
                      backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF',
                      border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                      borderRadius: '8px',
                    }}>
                      <input
                        type="checkbox"
                        checked={settings.aiCanManageNotes}
                        onChange={(e) => updateSettings({ aiCanManageNotes: e.target.checked })}
                        style={{
                          width: '18px',
                          height: '18px',
                          accentColor: 'var(--color-primary-teal)',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: isDark ? '#FFFFFF' : '#1F2937',
                          marginBottom: '4px',
                        }}>
                          Permitir gerenciamento de notas
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: isDark ? '#A0A0A0' : '#6B7280',
                        }}>
                          A IA pode criar, editar e organizar suas notas
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Configurações de Fluxo de Trabalho */}
                <div style={{
                  padding: '20px',
                  backgroundColor: isDark ? '#141414' : '#F5F5F5',
                  border: `1px solid ${isDark ? '#2A2A2A' : '#E0E0E0'}`,
                  borderRadius: '12px',
                }}>
                  <h4 style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    marginBottom: '16px',
                    margin: '0 0 16px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <Zap size={16} />
                    Fluxo de Trabalho
                  </h4>
                  
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: isDark ? '#FFFFFF' : '#374151',
                        marginBottom: '8px',
                      }}>
                        Modo de resposta da IA
                      </label>
                      <select
                        value={settings.aiResponseMode || 'balanced'}
                        onChange={(e) => updateSettings({ aiResponseMode: e.target.value as 'detailed' | 'balanced' | 'concise' })}
                        style={{
                          width: '100%',
                          padding: '12px',
                          backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF',
                          border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                          borderRadius: '8px',
                          color: isDark ? '#FFFFFF' : '#1F2937',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      >
                        <option value="detailed">Detalhado - Respostas completas e explicativas</option>
                        <option value="balanced">Equilibrado - Respostas úteis e diretas</option>
                        <option value="concise">Conciso - Respostas breves e objetivas</option>
                      </select>
                    </div>

                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '12px',
                      backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF',
                      border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                      borderRadius: '8px',
                    }}>
                      <input
                        type="checkbox"
                        checked={settings.aiProactiveMode}
                        onChange={(e) => updateSettings({ aiProactiveMode: e.target.checked })}
                        style={{
                          width: '18px',
                          height: '18px',
                          accentColor: 'var(--color-primary-teal)',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: isDark ? '#FFFFFF' : '#1F2937',
                          marginBottom: '4px',
                        }}>
                          Modo proativo
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: isDark ? '#A0A0A0' : '#6B7280',
                        }}>
                          A IA oferece sugestões e insights automaticamente
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Configurações de Interface */}
                <div style={{
                  padding: '20px',
                  backgroundColor: isDark ? '#141414' : '#F5F5F5',
                  border: `1px solid ${isDark ? '#2A2A2A' : '#E0E0E0'}`,
                  borderRadius: '12px',
                }}>
                  <h4 style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    marginBottom: '16px',
                    margin: '0 0 16px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <Eye size={16} />
                    Interface
                  </h4>
                  
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '12px',
                      backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF',
                      border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                      borderRadius: '8px',
                    }}>
                      <input
                        type="checkbox"
                        checked={settings.showProductivityTips}
                        onChange={(e) => updateSettings({ showProductivityTips: e.target.checked })}
                        style={{
                          width: '18px',
                          height: '18px',
                          accentColor: 'var(--color-primary-teal)',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: isDark ? '#FFFFFF' : '#1F2937',
                          marginBottom: '4px',
                        }}>
                          Dicas de produtividade
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: isDark ? '#A0A0A0' : '#6B7280',
                        }}>
                          Exibir dicas e sugestões no dashboard
                        </div>
                      </div>
                    </label>

                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '12px',
                      backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF',
                      border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                      borderRadius: '8px',
                    }}>
                      <input
                        type="checkbox"
                        checked={settings.showProgressInsights}
                        onChange={(e) => updateSettings({ showProgressInsights: e.target.checked })}
                        style={{
                          width: '18px',
                          height: '18px',
                          accentColor: 'var(--color-primary-teal)',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: isDark ? '#FFFFFF' : '#1F2937',
                          marginBottom: '4px',
                        }}>
                          Insights de progresso
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: isDark ? '#A0A0A0' : '#6B7280',
                        }}>
                          Mostrar análises automáticas do seu progresso
                        </div>
                      </div>
                    </label>
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

            {activeTab === 'backup' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: isDark ? '#FFFFFF' : '#1F2937',
                    marginBottom: '16px',
                    margin: 0
                  }}>
                    Gerenciamento de Dados
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: isDark ? '#A0A0A0' : '#6B7280',
                    marginBottom: '24px',
                    margin: '8px 0 24px 0'
                  }}>
                    Controle completo sobre seus dados: localização, backup e sincronização.
                  </p>
                </div>

                {/* Storage Type Selection */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: isDark ? '#FFFFFF' : '#374151',
                    marginBottom: '8px'
                  }}>
                    Tipo de Armazenamento
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    <div 
                      onClick={() => updateSettings({ storageType: 'localStorage' })}
                      style={{
                        padding: '16px',
                        backgroundColor: settings.storageType === 'localStorage' 
                          ? (isDark ? '#1F4A3D' : '#D1FAE5') 
                          : (isDark ? '#141414' : '#F9FAFB'),
                        border: `2px solid ${
                          settings.storageType === 'localStorage' 
                            ? 'var(--color-primary-teal)' 
                            : (isDark ? '#2A2A2A' : '#E5E7EB')
                        }`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px'
                      }}>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: settings.storageType === 'localStorage' 
                            ? 'var(--color-primary-teal)' 
                            : (isDark ? '#6B7280' : '#D1D5DB'),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {settings.storageType === 'localStorage' && (
                            <div style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: '#FFFFFF'
                            }} />
                          )}
                        </div>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: isDark ? '#FFFFFF' : '#1F2937'
                        }}>
                          Navegador (LocalStorage)
                        </span>
                      </div>
                      <p style={{
                        fontSize: '12px',
                        color: isDark ? '#A0A0A0' : '#6B7280',
                        margin: 0,
                        lineHeight: '1.4'
                      }}>
                        Dados armazenados no navegador. Rápido e simples, mas limitado ao dispositivo.
                      </p>
                    </div>

                    <div 
                      onClick={() => updateSettings({ storageType: 'database' })}
                      style={{
                        padding: '16px',
                        backgroundColor: settings.storageType === 'database' 
                          ? (isDark ? '#1F4A3D' : '#D1FAE5') 
                          : (isDark ? '#141414' : '#F9FAFB'),
                        border: `2px solid ${
                          settings.storageType === 'database' 
                            ? 'var(--color-primary-teal)' 
                            : (isDark ? '#2A2A2A' : '#E5E7EB')
                        }`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px'
                      }}>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: settings.storageType === 'database' 
                            ? 'var(--color-primary-teal)' 
                            : (isDark ? '#6B7280' : '#D1D5DB'),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {settings.storageType === 'database' && (
                            <div style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: '#FFFFFF'
                            }} />
                          )}
                        </div>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: isDark ? '#FFFFFF' : '#1F2937'
                        }}>
                          Banco de Dados Local
                        </span>
                      </div>
                      <p style={{
                        fontSize: '12px',
                        color: isDark ? '#A0A0A0' : '#6B7280',
                        margin: 0,
                        lineHeight: '1.4'
                      }}>
                        Banco de dados persistente. Melhor para grandes volumes de dados e backup.
                      </p>
                    </div>
                  </div>
                  <p style={{
                    fontSize: '12px',
                    color: isDark ? '#6B7280' : '#9CA3AF',
                    marginBottom: '24px',
                    margin: '0 0 24px 0'
                  }}>
                    Escolha como seus dados serão armazenados. Você pode alterar essa configuração a qualquer momento.
                  </p>
                </div>

                {/* Local Storage Path */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: isDark ? '#FFFFFF' : '#374151',
                    marginBottom: '8px'
                  }}>
                    Localização dos Dados
                  </label>
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center'
                  }}>
                    <input
                      type="text"
                      value={settings.dataPath || 'Padrão do Sistema'}
                      readOnly
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        backgroundColor: isDark ? '#0A0A0A' : '#F9FAFB',
                        border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                        borderRadius: '8px',
                        color: isDark ? '#FFFFFF' : '#1F2937',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  <button
                      onClick={async () => {
                        try {
                          const result = await (window as any).electronAPI?.system?.selectFolder?.();
                          if (result && !result.canceled && result.filePaths?.length > 0) {
                            updateSettings({ dataPath: result.filePaths[0] });
                            showToast('Localização dos dados atualizada', 'success');
                          }
                        } catch (error) {
                          console.error('Erro ao selecionar pasta:', error);
                          showToast('Erro ao selecionar pasta', 'error');
                        }
                      }}
                    style={{
                        padding: '12px 16px',
                        backgroundColor: 'var(--color-primary-teal)',
                        border: 'none',
                      borderRadius: '8px',
                        color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}
                  >
                      Alterar Pasta
                  </button>
                  </div>
                  <p style={{
                    fontSize: '12px',
                    color: isDark ? '#6B7280' : '#9CA3AF',
                    marginTop: '8px',
                    margin: '8px 0 0 0'
                  }}>
                    Escolha onde seus dados serão armazenados localmente.
                  </p>
                </div>

                {/* Export Options */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: isDark ? '#FFFFFF' : '#374151',
                    marginBottom: '12px'
                  }}>
                    Exportação de Dados
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px'
                  }}>
                    <button
                      onClick={async () => {
                        try {
                          const electronAPI: any = (window as any).electronAPI;
                          const data: string | undefined = await electronAPI?.database?.exportData?.();
                          if (!data) {
                            showToast('Erro ao gerar backup', 'error');
                            return;
                          }
                          const blob = new Blob([data], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `krigzis-backup-${new Date().toISOString().split('T')[0]}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                          showToast('Backup exportado com sucesso', 'success');
                        } catch (error) {
                          showToast('Erro ao exportar backup', 'error');
                        }
                      }}
                      style={{
                        padding: '16px',
                        backgroundColor: isDark ? '#141414' : '#F5F5F5',
                        border: `1px solid ${isDark ? '#2A2A2A' : '#E0E0E0'}`,
                        borderRadius: '12px',
                        color: isDark ? '#FFFFFF' : '#1F2937',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                    display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-primary-teal)';
                        e.currentTarget.style.backgroundColor = isDark ? '#0F1419' : '#F0F9FF';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = isDark ? '#2A2A2A' : '#E0E0E0';
                        e.currentTarget.style.backgroundColor = isDark ? '#141414' : '#F5F5F5';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Download size={16} />
                        <span>Backup Completo</span>
                      </div>
                      <span style={{
                        fontSize: '12px',
                        color: isDark ? '#A0A0A0' : '#6B7280'
                      }}>
                        Exporta todas as configurações, tarefas e notas
                      </span>
                    </button>

                    <button
                      onClick={async () => {
                        try {
                          const tasks = await (window as any).electronAPI?.database?.getAllTasks?.() || [];
                          const data = JSON.stringify({ tasks, exportDate: new Date().toISOString() }, null, 2);
                          const blob = new Blob([data], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `krigzis-tasks-${new Date().toISOString().split('T')[0]}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                          showToast('Tarefas exportadas com sucesso', 'success');
                        } catch (error) {
                          showToast('Erro ao exportar tarefas', 'error');
                        }
                      }}
                      style={{
                        padding: '16px',
                        backgroundColor: isDark ? '#141414' : '#F5F5F5',
                        border: `1px solid ${isDark ? '#2A2A2A' : '#E0E0E0'}`,
                        borderRadius: '12px',
                        color: isDark ? '#FFFFFF' : '#1F2937',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                        textAlign: 'left',
                    transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-primary-teal)';
                        e.currentTarget.style.backgroundColor = isDark ? '#0F1419' : '#F0F9FF';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = isDark ? '#2A2A2A' : '#E0E0E0';
                        e.currentTarget.style.backgroundColor = isDark ? '#141414' : '#F5F5F5';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle size={16} />
                        <span>Apenas Tarefas</span>
                      </div>
                      <span style={{
                        fontSize: '12px',
                        color: isDark ? '#A0A0A0' : '#6B7280'
                      }}>
                        Exporta somente as tarefas
                      </span>
                    </button>

                    <button
                      onClick={async () => {
                        try {
                          const notes = await (window as any).electronAPI?.database?.getAllNotes?.() || [];
                          const data = JSON.stringify({ notes, exportDate: new Date().toISOString() }, null, 2);
                          const blob = new Blob([data], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `krigzis-notes-${new Date().toISOString().split('T')[0]}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                          showToast('Notas exportadas com sucesso', 'success');
                        } catch (error) {
                          showToast('Erro ao exportar notas', 'error');
                        }
                      }}
                      style={{
                        padding: '16px',
                        backgroundColor: isDark ? '#141414' : '#F5F5F5',
                        border: `1px solid ${isDark ? '#2A2A2A' : '#E0E0E0'}`,
                        borderRadius: '12px',
                        color: isDark ? '#FFFFFF' : '#1F2937',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-primary-teal)';
                        e.currentTarget.style.backgroundColor = isDark ? '#0F1419' : '#F0F9FF';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = isDark ? '#2A2A2A' : '#E0E0E0';
                        e.currentTarget.style.backgroundColor = isDark ? '#141414' : '#F5F5F5';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BookOpen size={16} />
                        <span>Apenas Notas</span>
                      </div>
                      <span style={{
                        fontSize: '12px',
                        color: isDark ? '#A0A0A0' : '#6B7280'
                      }}>
                        Exporta somente as notas
                      </span>
                    </button>
                  </div>
                </div>

                {/* Import Options */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: isDark ? '#FFFFFF' : '#374151',
                    marginBottom: '12px'
                  }}>
                    Importação de Dados
                  </label>
                  <div style={{
                    padding: '20px',
                    backgroundColor: isDark ? '#141414' : '#F5F5F5',
                    border: `2px dashed ${isDark ? '#2A2A2A' : '#E0E0E0'}`,
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    <input
                      type="file"
                      accept=".json"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const text = await file.text();
                            const electronAPI: any = (window as any).electronAPI;
                            const res = await electronAPI?.database?.importData?.(text);
                            if (res?.success !== false) {
                              showToast('Dados importados com sucesso', 'success');
                              setTimeout(() => window.location.reload(), 800);
                            } else {
                              showToast('Erro: formato de arquivo inválido', 'error');
                            }
                          } catch (error) {
                            showToast('Erro ao importar dados', 'error');
                          }
                        }
                        e.target.value = '';
                      }}
                      style={{ display: 'none' }}
                      id="import-file"
                    />
                    <label
                      htmlFor="import-file"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      <Upload size={32} color={isDark ? '#A0A0A0' : '#6B7280'} />
                      <div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: 500,
                          color: isDark ? '#FFFFFF' : '#1F2937',
                          marginBottom: '4px'
                        }}>
                          Clique para importar
                        </div>
                        <div style={{
                          fontSize: '14px',
                          color: isDark ? '#A0A0A0' : '#6B7280'
                        }}>
                          Arraste um arquivo .json ou clique para selecionar
                        </div>
                      </div>
                  </label>
                  </div>
                  <p style={{
                    fontSize: '12px',
                    color: '#F59E0B',
                    marginTop: '8px',
                    margin: '8px 0 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <AlertCircle size={14} />
                    Importar dados substituirá todas as configurações atuais.
                  </p>
                </div>

                {/* Automatic Backup */}
                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    padding: '16px',
                    backgroundColor: isDark ? '#141414' : '#F5F5F5',
                    border: `1px solid ${isDark ? '#2A2A2A' : '#E0E0E0'}`,
                    borderRadius: '12px',
                    transition: 'all 0.2s ease'
                  }}>
                    <input
                      type="checkbox"
                      checked={settings.autoBackup}
                      onChange={(e) => updateSettings({ autoBackup: e.target.checked })}
                      style={{
                        width: '18px',
                        height: '18px',
                        accentColor: 'var(--color-primary-teal)'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: isDark ? '#FFFFFF' : '#1F2937',
                        marginBottom: '4px'
                      }}>
                        Backup Automático
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: isDark ? '#A0A0A0' : '#6B7280'
                      }}>
                        Cria backups automáticos dos seus dados periodicamente
                      </div>
                    </div>
                  </label>

                  {settings.autoBackup && (
                    <div style={{ marginTop: '12px', marginLeft: '30px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: isDark ? '#FFFFFF' : '#374151',
                        marginBottom: '6px'
                      }}>
                        Frequência do Backup
                      </label>
                      <select
                        value={settings.backupFrequency}
                        onChange={(e) => updateSettings({ backupFrequency: e.target.value as 'daily' | 'weekly' | 'monthly' })}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF',
                          border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                          borderRadius: '6px',
                          color: isDark ? '#FFFFFF' : '#1F2937',
                          fontSize: '13px',
                          outline: 'none'
                        }}
                      >
                        <option value="daily">Diário</option>
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensal</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'armazenamento' && (
              <div style={{ display: 'grid', gap: '24px' }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}>
                    Modo de Armazenamento
                  </h4>
                  <p style={{ fontSize: '12px', color: '#888', margin: '0 0 16px 0' }}>
                    Define onde notas, tarefas e categorias são salvos. Outros usuários com acesso à mesma base Supabase compartilham os dados no modo Cloud.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { value: 'cloud' as const, label: 'Cloud (Supabase)', desc: 'Dados salvos na nuvem. Requer autenticação. Compartilhável entre dispositivos e usuários.' },
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
                          border: `1.5px solid ${(settings.storageMode || 'cloud') === opt.value ? 'var(--color-primary-teal)' : 'rgba(255,255,255,0.08)'}`,
                          backgroundColor: (settings.storageMode || 'cloud') === opt.value ? 'rgba(45,212,191,0.06)' : 'rgba(255,255,255,0.02)',
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
                          <div style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#FFFFFF',
                            marginBottom: '2px'
                          }}>
                            {opt.label}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#888',
                            lineHeight: '1.4'
                          }}>
                            {opt.desc}
                          </div>
                        </div>
                      </label>
                    ))}
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
                    <div style={{ fontSize: '12px', color: '#93C5FD', lineHeight: '1.5' }}>
                      <strong>Validação de dados:</strong> No modo Cloud, dados são validados antes de inserir no Supabase (dedup por título, sanitização).
                      Cada usuário só acessa seus próprios dados via Row Level Security (RLS).
                      <br /><br />
                      <strong>Nota:</strong> Alterar o modo não migra dados automaticamente. Use Importar/Exportar para transferir dados entre modos.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'acessibilidade' && (
              <div style={{ display: 'grid', gap: '24px' }}>
                <div style={{
                  padding: '24px',
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #2A2A2A',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <Eye size={48} style={{ color: 'var(--color-primary-teal)', marginBottom: '16px' }} />
                  <h3 style={{
                    margin: '0 0 8px 0',
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#FFFFFF'
                  }}>
                    Configurações Migradas
                  </h3>
                  <p style={{
                    margin: '0 0 16px 0',
                    fontSize: '14px',
                    color: '#A0A0A0',
                    lineHeight: '1.5'
                  }}>
                    As configurações de acessibilidade foram movidas para a aba <strong style={{ color: '#FFFFFF' }}>Aparência</strong> para melhor organização.
                  </p>
                  <button
                    onClick={() => setActiveTab('aparencia')}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: 'var(--color-primary-teal)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      margin: '0 auto'
                    }}
                  >
                    <Palette size={16} />
                    Ir para Aparência
                  </button>
                </div>

                {/* Seção de Limpeza de Dados */}
                {(
                  <div style={{
                    padding: '20px',
                    backgroundColor: theme.mode === 'dark' ? '#0A0A0A' : 'var(--color-bg-secondary)',
                    border: `1px solid ${theme.mode === 'dark' ? '#2A2A2A' : 'var(--color-border-primary)'}`,
                    borderRadius: '12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <AlertCircle size={20} strokeWidth={1.7} color="#F59E0B" />
                      <h4 style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: 600,
                        color: theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)',
                      }}>
                        {t('accessibility.clearData')}
                      </h4>
                    </div>
                    <p style={{
                      color: theme.mode === 'dark' ? '#A0A0A0' : 'var(--color-text-secondary)',
                      fontSize: '14px',
                      margin: '0 0 16px 0',
                      lineHeight: 1.5,
                    }}>
                      {t('accessibility.clearDataDesc')}
                    </p>
                    
                    {showClearDataConfirm && (
                      <div style={{
                        padding: '16px',
                        backgroundColor: theme.mode === 'dark' ? '#1A1A1A' : '#FEF3C7',
                        border: `1px solid ${theme.mode === 'dark' ? '#3A3A3A' : '#F59E0B'}`,
                        borderRadius: '8px',
                        marginBottom: '16px',
                      }}>
                        <p style={{
                          margin: '0 0 8px 0',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: theme.mode === 'dark' ? '#F59E0B' : '#92400E',
                        }}>
                          {t('accessibility.clearDataConfirm')}
                        </p>
                        <p style={{
                          margin: 0,
                          fontSize: '12px',
                          color: theme.mode === 'dark' ? '#A0A0A0' : '#92400E',
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
                          if (!isClearing) {
                            e.currentTarget.style.backgroundColor = showClearDataConfirm ? '#B91C1C' : '#DC2626';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isClearing) {
                            e.currentTarget.style.backgroundColor = showClearDataConfirm ? '#DC2626' : '#EF4444';
                          }
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
                            color: theme.mode === 'dark' ? '#FFFFFF' : 'var(--color-text-primary)',
                            border: `1px solid ${theme.mode === 'dark' ? '#3A3A3A' : 'var(--color-border-primary)'}`,
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
                )}


                  </div>
                )}

            {activeTab === 'inteligencia-artificial' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: isDark ? '#FFFFFF' : '#1F2937',
                    marginBottom: '16px',
                    margin: 0
                  }}>
                    Inteligência Artificial
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: isDark ? '#A0A0A0' : '#6B7280',
                    marginBottom: '24px',
                    margin: '8px 0 24px 0'
                  }}>
                    Configure sua assistente IA personalizada para otimizar sua produtividade.
                  </p>
                </div>

                {/* AI Status */}
                  <div style={{
                    padding: '16px',
                  backgroundColor: isAIReady() 
                    ? isDark ? '#0F2A1A' : '#ECFDF5'
                    : isDark ? '#2A1A0F' : '#FEF3C7',
                  border: `1px solid ${isAIReady() 
                    ? isDark ? '#10B981' : '#10B981'
                    : isDark ? '#F59E0B' : '#F59E0B'}`,
                  borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}>
                  {isAIReady() ? (
                    <CheckCircle size={20} color="#10B981" />
                  ) : (
                    <AlertCircle size={20} color="#F59E0B" />
                  )}
                  <div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: isAIReady() ? '#10B981' : '#F59E0B',
                      marginBottom: '2px',
                    }}>
                      {isAIReady() ? 'IA Configurada' : 'IA Não Configurada'}
                  </div>
                    <div style={{
                      fontSize: '12px',
                      color: isDark ? '#A0A0A0' : '#6B7280',
                    }}>
                      {isAIReady() 
                        ? 'Sua assistente IA está pronta para uso'
                        : 'Configure sua API key para ativar a assistente IA'
                      }
              </div>
                  </div>
                </div>

                {/* AI Toggle */}
                <div style={{
                  padding: '16px',
                  backgroundColor: isDark ? '#141414' : '#F5F5F5',
                  border: `1px solid ${isDark ? '#2A2A2A' : '#E0E0E0'}`,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: isDark ? '#FFFFFF' : '#1F2937',
                      marginBottom: '4px',
                    }}>
                      Habilitar Assistente IA
                  </div>
                    <div style={{
                      fontSize: '12px',
                      color: isDark ? '#A0A0A0' : '#6B7280',
                    }}>
                      Ative para usar a assistente IA global no sistema
                    </div>
                  </div>
                  <label style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: '44px',
                    height: '24px',
                    cursor: 'pointer',
                  }}>
                    <input
                      type="checkbox"
                      checked={aiConfig.enabled}
                      onChange={(e) => updateAIConfig({ enabled: e.target.checked })}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: aiConfig.enabled ? 'var(--color-primary-teal)' : isDark ? '#2A2A2A' : '#E5E7EB',
                      transition: '0.2s',
                      borderRadius: '24px',
                    }}>
                      <span style={{
                        position: 'absolute',
                        content: '',
                        height: '18px',
                        width: '18px',
                        left: aiConfig.enabled ? '23px' : '3px',
                        bottom: '3px',
                        backgroundColor: '#FFFFFF',
                        transition: '0.2s',
                        borderRadius: '50%',
                      }} />
                    </span>
                  </label>
                </div>

                {/* Quick Setup */}
                <div>
                  <h4 style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    marginBottom: '12px',
                    margin: '0 0 12px 0',
                  }}>
                    Configuração Rápida
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '12px',
                  }}>
                    <button
                      onClick={() => updateAIConfig({ selectedProvider: 'local', enabled: true })}
                      style={{
                        padding: '16px',
                        backgroundColor: isDark ? '#141414' : '#F5F5F5',
                        border: `1px solid ${isDark ? '#2A2A2A' : '#E0E0E0'}`,
                        borderRadius: '12px',
                        color: isDark ? '#FFFFFF' : '#1F2937',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-primary-teal)';
                        e.currentTarget.style.backgroundColor = isDark ? '#0F1419' : '#F0F9FF';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = isDark ? '#2A2A2A' : '#E0E0E0';
                        e.currentTarget.style.backgroundColor = isDark ? '#141414' : '#F5F5F5';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Shield size={16} />
                        <span>IA Local (Recomendado)</span>
                      </div>
                      <span style={{
                        fontSize: '12px',
                        color: isDark ? '#A0A0A0' : '#6B7280',
                      }}>
                        Processamento local, máxima privacidade
                      </span>
                    </button>

                    <button
                      onClick={() => updateAIConfig({ selectedProvider: 'openai', enabled: true })}
                      style={{
                        padding: '16px',
                        backgroundColor: isDark ? '#141414' : '#F5F5F5',
                        border: `1px solid ${isDark ? '#2A2A2A' : '#E0E0E0'}`,
                        borderRadius: '12px',
                        color: isDark ? '#FFFFFF' : '#1F2937',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-primary-teal)';
                        e.currentTarget.style.backgroundColor = isDark ? '#0F1419' : '#F0F9FF';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = isDark ? '#2A2A2A' : '#E0E0E0';
                        e.currentTarget.style.backgroundColor = isDark ? '#141414' : '#F5F5F5';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Zap size={16} />
                        <span>OpenAI GPT</span>
                      </div>
                      <span style={{
                        fontSize: '12px',
                        color: isDark ? '#A0A0A0' : '#6B7280',
                      }}>
                        Recursos avançados (requer API key)
                      </span>
                    </button>
                  </div>
                  </div>
                  
                {/* Advanced Configuration Link */}
                  <div style={{
                  padding: '16px',
                  backgroundColor: isDark ? '#1A1A1A' : '#F3F4F6',
                  borderRadius: '12px',
                  border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                  textAlign: 'center',
                  }}>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    marginBottom: '8px',
                    margin: '0 0 8px 0',
                  }}>
                    Configuração Avançada
                  </h4>
                  <p style={{
                      fontSize: '12px',
                    color: isDark ? '#A0A0A0' : '#6B7280',
                    marginBottom: '12px',
                    margin: '0 0 12px 0',
                    }}>
                    Para configurações detalhadas, provedores personalizados e ajustes de performance.
                  </p>
                  <button
                    onClick={() => {
                      setShowAdvancedAI(true);
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'var(--color-primary-teal)',
                      border: 'none',
                    borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                      gap: '6px',
                      margin: '0 auto',
                    }}
                  >
                    <SettingsIcon size={14} />
                    Configurações Avançadas
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: isDark ? '#FFFFFF' : '#1F2937',
                    marginBottom: '16px',
                    margin: 0
                  }}>
                    Logs e Monitoramento
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: isDark ? '#A0A0A0' : '#6B7280',
                    marginBottom: '24px',
                    margin: '8px 0 24px 0'
                  }}>
                    Sistema de logs estruturados para monitoramento de segurança, performance e auditoria.
                  </p>
                  </div>

                {/* Logs do Sistema */}
                <div style={{
                  padding: '20px',
                  backgroundColor: isDark ? '#0A0A0A' : '#F9FAFB',
                  border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                  borderRadius: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: isDark ? '#FFFFFF' : '#1F2937',
                        margin: 0
                      }}>
                        Visualizar Logs do Sistema
                      </h4>
                      <p style={{
                        fontSize: '13px',
                        color: isDark ? '#A0A0A0' : '#6B7280',
                        margin: '4px 0 0 0'
                      }}>
                        Acesse logs estruturados de segurança, performance e auditoria
                      </p>
                    </div>
                    <Button onClick={() => setShowLogViewer(true)}>
                      Abrir Logs
                    </Button>
                  </div>
                </div>

                {/* Crash Reports */}
                <div style={{
                  padding: '20px',
                  backgroundColor: isDark ? '#0A0A0A' : '#F9FAFB',
                  border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                  borderRadius: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: isDark ? '#FFFFFF' : '#1F2937',
                        margin: 0
                      }}>
                        Crash Reports
                      </h4>
                      <p style={{
                        fontSize: '13px',
                        color: isDark ? '#A0A0A0' : '#6B7280',
                        margin: '4px 0 0 0'
                      }}>
                        Visualize relatórios detalhados de crashes e erros críticos
                      </p>
                    </div>
                    <Button onClick={() => setShowCrashReportViewer(true)}>
                      Ver Crash Reports
                    </Button>
                  </div>
                </div>

                {/* Exportar Dados */}
                <div style={{
                  padding: '20px',
                  backgroundColor: isDark ? '#0A0A0A' : '#F9FAFB',
                  border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                  borderRadius: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: isDark ? '#FFFFFF' : '#1F2937',
                        margin: 0
                      }}>
                        Exportar Dados de Log
                      </h4>
                      <p style={{
                        fontSize: '13px',
                        color: isDark ? '#A0A0A0' : '#6B7280',
                        margin: '4px 0 0 0'
                      }}>
                        Exporte logs e crash reports para análise externa
                      </p>
                    </div>
                    <Button onClick={exportLogData} variant="secondary">
                      Exportar
                    </Button>
                  </div>
                </div>

                {/* Limpar Dados */}
                <div style={{
                  padding: '20px',
                  backgroundColor: isDark ? '#0A0A0A' : '#F9FAFB',
                  border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                  borderRadius: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: isDark ? '#FFFFFF' : '#1F2937',
                        margin: 0
                      }}>
                        Limpar Dados de Log
                      </h4>
                      <p style={{
                        fontSize: '13px',
                        color: isDark ? '#A0A0A0' : '#6B7280',
                        margin: '4px 0 0 0'
                      }}>
                        Remova logs antigos para liberar espaço
                      </p>
                    </div>
                    <Button onClick={clearLogData} variant="danger">
                      Limpar
                    </Button>
                  </div>
                </div>
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
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: 'linear-gradient(135deg, #00D4AA 0%, #7B3FF2 100%)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      fontWeight: 'bold',
                      color: '#FFFFFF',
                    }}>
                      K
                    </div>
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
                        Paulo Ricardo
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
          </div>
        </div>
      </div>
      
      {/* Advanced AI Settings Modal */}
      {showAdvancedAI && (
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
          zIndex: 1001,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            backgroundColor: isDark ? '#141414' : '#FFFFFF',
            border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
            borderRadius: '16px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '85vh',
            overflow: 'hidden',
            boxShadow: isDark ? '0 20px 40px rgba(0, 0, 0, 0.6)' : '0 20px 40px rgba(0, 0, 0, 0.15)',
          }}>
            <div style={{
              padding: '20px',
              borderBottom: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 600,
                color: isDark ? '#FFFFFF' : '#1F2937',
              }}>
                Configurações Avançadas da IA
              </h3>
              <button
                onClick={() => setShowAdvancedAI(false)}
                style={{
                  background: 'none',
                  border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                  borderRadius: '8px',
                  color: isDark ? '#A0A0A0' : '#6B7280',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{
              maxHeight: 'calc(85vh - 120px)',
              overflowY: 'auto',
            }}>
              <AISettings onBack={() => setShowAdvancedAI(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Log Viewers - Renderizados dentro do modal */}
      {showLogViewer && (
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
          zIndex: 1001,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            backgroundColor: isDark ? '#141414' : '#FFFFFF',
            border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
            borderRadius: '16px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '85vh',
            overflow: 'hidden',
            boxShadow: isDark ? '0 20px 40px rgba(0, 0, 0, 0.6)' : '0 20px 40px rgba(0, 0, 0, 0.15)',
          }}>
            <div style={{
              padding: '20px',
              borderBottom: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 600,
                color: isDark ? '#FFFFFF' : '#1F2937',
              }}>
                Visualizador de Logs
              </h3>
              <button
                onClick={() => setShowLogViewer(false)}
                style={{
                  background: 'none',
                  border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                  borderRadius: '8px',
                  color: isDark ? '#A0A0A0' : '#6B7280',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{
              maxHeight: 'calc(85vh - 120px)',
              overflowY: 'auto',
              padding: '20px',
            }}>
              <LogViewerContent isDark={isDark} />
            </div>
          </div>
        </div>
      )}

      {showCrashReportViewer && (
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
          zIndex: 1001,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            backgroundColor: isDark ? '#141414' : '#FFFFFF',
            border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
            borderRadius: '16px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '85vh',
            overflow: 'hidden',
            boxShadow: isDark ? '0 20px 40px rgba(0, 0, 0, 0.6)' : '0 20px 40px rgba(0, 0, 0, 0.15)',
          }}>
            <div style={{
              padding: '20px',
              borderBottom: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 600,
                color: isDark ? '#FFFFFF' : '#1F2937',
              }}>
                Crash Reports
              </h3>
              <button
                onClick={() => setShowCrashReportViewer(false)}
                style={{
                  background: 'none',
                  border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
                  borderRadius: '8px',
                  color: isDark ? '#A0A0A0' : '#6B7280',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{
              maxHeight: 'calc(85vh - 120px)',
              overflowY: 'auto',
              padding: '20px',
            }}>
              <CrashReportViewerContent isDark={isDark} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 