import React, { useState } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';

import {
  ClipboardList,
  CalendarDays,
  Zap,
  CheckCircle,
  Timer,
  BarChart2,
  Plus,
  Folder,
  Home,
  BookOpen,
  Briefcase,
  Heart,
  ShoppingCart,
  Target,
  DollarSign,
  Plane,
  Car,
  Music,
  Gamepad2,
  Smartphone,
  Laptop,
  Tv,
  Dumbbell,
  Users,
  Star,
  Flag,
  SettingsIcon,
  GripVertical,
  X,
  Brain,
  LogOut,
  Share2,
  Download,
  Upload,
  Trash2,
  type LucideIcon
} from 'lucide-react';

import { Card, Button, Badge } from './ui';
import { UnifiedCard } from './ui/Card';
import { ImportExportModal } from './ImportExportModal';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';
import { useSettings } from '../hooks/useSettings';

import { useTasks } from '../contexts/TasksContext';
import { useCategories } from '../contexts/CategoriesContext';
import { useNotes } from '../contexts/NotesContext';
import { useProductivityInsights } from '../hooks/useProductivityInsights';
import { useStorageMode } from '../hooks/useStorageMode';
import type { Task } from '../../shared/types/task';
import type { Category } from '../../shared/types/task';
import type { QuickAction } from '../hooks/useSettings';
import type { ImportResult, RestorePreview } from '../../shared/types/backup';
import type { ElectronAPI } from '../../main/preload';

// Mapping de ícones
const iconMap: Record<string, LucideIcon> = {
  ClipboardList,
  CalendarDays,
  Zap,
  CheckCircle,
  Timer,
  BarChart2,
  Folder,
  Home,
  BookOpen,
  Briefcase,
  Heart,
  ShoppingCart,
  Target,
  DollarSign,
  Plane,
  Car,
  Music,
  Gamepad2,
  Smartphone,
  Laptop,
  Tv,
  Dumbbell,
  Users,
  Star,
  Flag
};

// Função para renderizar ícone
const renderIcon = (iconName: string, size: number = 20, color?: string) => {
  const IconComponent = iconMap[iconName] || Folder;
  return <IconComponent size={size} strokeWidth={1.5} color={color} />;
};

type DisplayCard = {
  key: string;
  categoryId: number;
  title: string;
  desc: string;
  count: number;
  icon: string;
  accentColor: string;
  isSystem: boolean;
};

interface QuickActionCard {
  key: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  gradient: string;
  onClick?: () => void;
}

interface DashboardProps {
  onViewTaskList: (status: string) => void;
  onOpenTaskModal: () => void;
  onOpenTimer?: () => void;
  onOpenReports?: () => void;
  showQuickActions?: boolean;
  showTaskCounters?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onViewTaskList,
  onOpenTaskModal,
  onOpenTimer,
  onOpenReports,
  showQuickActions = true,
  showTaskCounters = true,
}) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { settings, getGreeting, getEnabledQuickActions, updateQuickActions } = useSettings();
  const { tasks, stats, getTasksByStatus, updateTask, createTask } = useTasks();
  const { categories } = useCategories();
  const { createNote, fetchNotes } = useNotes();
  const { useCloud } = useStorageMode();
  const { activeOrg } = useOrganization();

  const [statusTasks, setStatusTasks] = useState<Task[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const { tipText, progressText } = useProductivityInsights({
    tasks,
    stats,
    settings: {
      dailyGoal: settings.dailyGoal,
      aiResponseMode: settings.aiResponseMode,
      aiProactiveMode: settings.aiProactiveMode,
      showProductivityTips: settings.showProductivityTips,
      showProgressInsights: settings.showProgressInsights,
    },
  });

  const isDark = theme.mode === 'dark';

  type ImportExportModalProps = React.ComponentProps<typeof ImportExportModal>;
  type ImportIntent = Parameters<ImportExportModalProps['onImportPreview']>[0];
  type ExportFormat = Parameters<ImportExportModalProps['onExport']>[0];

  const [importExportModalOpen, setImportExportModalOpen] = useState(false);
  const [importExportMode, setImportExportMode] = useState<'import' | 'export'>('export');
  const [initialImportIntent, setInitialImportIntent] = useState<ImportIntent | null>(null);

  const displayCards: DisplayCard[] = (categories || [])
    .slice()
    .sort((a: Category, b: Category) => (a.order || 0) - (b.order || 0))
    .map((category: Category) => {
      const statusMap: Record<string, string> = {
        Backlog: 'backlog',
        'Esta Semana': 'esta_semana',
        Hoje: 'hoje',
        Concluído: 'concluido',
      };

      const isSystem = Boolean(category.isSystem);
      const key = isSystem ? (statusMap[category.name] || category.name.toLowerCase()) : `category_${category.id}`;
      const count = isSystem
        ? (stats?.[key as keyof NonNullable<typeof stats>] as unknown as number) || 0
        : (tasks || []).filter((t) => t.category_id === category.id).length;

      return {
        key,
        categoryId: category.id,
        title: category.name,
        desc: `${count} ${count === 1 ? 'tarefa' : 'tarefas'}`,
        count,
        icon: category.icon || 'Folder',
        accentColor: category.color,
        isSystem,
      };
    });

  const loadStatusTasks = async (status: string) => {
    try {
      const nextTasks = await getTasksByStatus(status);
      setStatusTasks(nextTasks);
      setSelectedStatus(status);
    } catch (e) {
      console.error('Error loading status tasks:', e);
    }
  };

  const handleCompleteTask = async (taskId: number) => {
    await updateTask(taskId, { status: 'concluido' });
    if (selectedStatus) {
      await loadStatusTasks(selectedStatus);
    }
  };

  const closeTaskModal = () => {
    setSelectedStatus(null);
    setStatusTasks([]);
  };

  const getGreetingText = () => {
    const greetingKey = getGreeting();
    return t(greetingKey, { name: settings.userName });
  };

  const getTodayTasks = () => {
    if (!stats) return 0;
    return stats.hoje;
  };

  const getCompletionRate = () => {
    if (!stats) return 0;
    const total = stats.total;
    if (total === 0) return 0;
    return Math.round((stats.concluido / total) * 100);
  };

  const getElectron = (): ElectronAPI => {
    return (window as unknown as { electronAPI: ElectronAPI }).electronAPI;
  };

  const handleClearAllData = async () => {
    try {
      const electron = getElectron();
      await electron.tasks.clearAll();
      window.dispatchEvent(new Event('tasksUpdated'));
      window.dispatchEvent(new Event('categoriesUpdated'));
    } catch (err) {
      console.error('Clear failed:', err);
    }
  };

  const openImportExportModal = (mode: 'import' | 'export') => {
    setImportExportMode(mode);
    setInitialImportIntent(null);
    setImportExportModalOpen(true);
  };

  const handleImportExportPreview = async (intent: ImportIntent): Promise<RestorePreview | null> => {
    try {
      const electron = getElectron();
      if (intent?.kind === 'zip') {
        return await electron.backup.importZipPreview({ source: 'external', filePath: intent.filePath });
      }
      if (intent?.kind === 'zip-backup') {
        return await electron.backup.importZipPreview({ source: 'backupId', backupId: intent.backupId });
      }
      if (intent?.kind === 'json') {
        return await electron.backup.importJsonPreview({ filePath: intent.filePath });
      }
      if (intent?.kind === 'csv') {
        return await electron.backup.importCsvPreview({ filePath: intent.filePath });
      }
      if (intent?.kind === 'enex') {
        return await electron.backup.importEnexPreview({ filePath: intent.filePath });
      }
      if (intent?.kind === 'html-file') {
        return await electron.invoke('import:html-preview', { filePath: intent.filePath }) as RestorePreview;
      }
      if (intent?.kind === 'pdf-file') {
        return await electron.invoke('import:pdf-preview', { filePath: intent.filePath }) as RestorePreview;
      }
      if (intent?.kind === 'folder') {
        return await electron.invoke('import:folder-preview', { folderPath: intent.folderPath }) as RestorePreview;
      }
      return null;
    } catch (err) {
      console.error('Erro ao gerar preview do import:', err);
      return null;
    }
  };

  const handleImportExportApply = async (intent: ImportIntent): Promise<ImportResult | null> => {
    try {
      const electron = getElectron();
      let result: ImportResult | null = null;
      if (intent?.kind === 'zip') {
        result = await electron.backup.importZipApply({ source: 'external', filePath: intent.filePath });
      } else if (intent?.kind === 'zip-backup') {
        result = await electron.backup.importZipApply({ source: 'backupId', backupId: intent.backupId });
      } else if (intent?.kind === 'json') {
        result = await electron.backup.importJsonApply({ filePath: intent.filePath });
      } else if (intent?.kind === 'csv') {
        result = await electron.backup.importCsvApply({ filePath: intent.filePath });
      } else if (intent?.kind === 'enex') {
        result = await electron.backup.importEnexApply({ filePath: intent.filePath });
      } else if (intent?.kind === 'html-file') {
        result = await electron.invoke('import:html-apply', { filePath: intent.filePath }) as ImportResult;
      } else if (intent?.kind === 'pdf-file') {
        result = await electron.invoke('import:pdf-apply', { filePath: intent.filePath }) as ImportResult;
      } else if (intent?.kind === 'folder') {
        result = await electron.invoke('import:folder-apply', { folderPath: intent.folderPath }) as ImportResult;
      }

      if (result?.success) {
        // Sync imported data to cloud when storage mode uses cloud
        // IPC import already wrote to local MemoryDB, so only cloud sync is needed
        if (useCloud) {
          if (result.importedNotes && result.importedNotes.length > 0) {
            for (const note of result.importedNotes) {
              try {
                await createNote({
                  title: note.title,
                  content: note.content,
                  format: note.format || 'text',
                  tags: note.tags,
                  attachedImages: note.attachedImages,
                });
              } catch (e) {
                console.error('Failed to sync imported note to cloud:', e);
              }
            }
            await fetchNotes();
          }

          if (result.importedTasks && result.importedTasks.length > 0) {
            for (const task of result.importedTasks) {
              try {
                await createTask({
                  title: task.title,
                  description: task.description,
                  status: (task.status as 'backlog' | 'esta_semana' | 'hoje' | 'concluido') || 'backlog',
                  priority: (task.priority as 'low' | 'medium' | 'high') || 'medium',
                });
              } catch (e) {
                console.error('Failed to sync imported task to cloud:', e);
              }
            }
          }
        }

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
      if (format === 'zip') {
        await electron.backup.exportZip({ source: 'current' });
        return;
      }
      if (format === 'json') {
        await electron.backup.exportJson();
        return;
      }
      if (format === 'csv') {
        await electron.backup.exportCsv();
      }
    } catch (err) {
      console.error('Erro ao exportar:', err);
    }
  };

  const quickActionMap: Record<string, QuickActionCard> = {
    timer: {
      key: 'timer',
      title: 'Timer',
      desc: 'Sessões focadas',
      icon: <Timer size={16} strokeWidth={1.5} />,
      gradient: 'linear-gradient(135deg, #00D4AA 0%, #7B3FF2 100%)',
      onClick: onOpenTimer
    },
    reports: {
      key: 'reports',
      title: 'Relatórios',
      desc: 'Análise',
      icon: <BarChart2 size={16} strokeWidth={1.5} />,
      gradient: 'linear-gradient(135deg, #ffb199 0%, #ff0844 100%)',
      onClick: onOpenReports
    },
    newTask: {
      key: 'newTask',
      title: 'Nova Tarefa',
      desc: 'Criar tarefa',
      icon: <Plus size={16} strokeWidth={1.5} />,
      gradient: 'linear-gradient(135deg, #7B3FF2 0%, #00D4AA 100%)',
      onClick: onOpenTaskModal
    },
    categories: {
      key: 'categories',
      title: 'Categorias',
      desc: 'Gerenciar',
      icon: <Folder size={16} strokeWidth={1.5} />,
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
      onClick: () => window.dispatchEvent(new CustomEvent('openCategoryManager'))
    },
    backup: {
      key: 'backup',
      title: 'Backup',
      desc: 'Exportar dados',
      icon: <Download size={16} strokeWidth={1.5} />,
      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      onClick: () => openImportExportModal('export')
    },
    import: {
      key: 'import',
      title: 'Importar',
      desc: 'Restaurar dados',
      icon: <Upload size={16} strokeWidth={1.5} />,
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      onClick: () => openImportExportModal('import')
    },
    clearData: {
      key: 'clearData',
      title: 'Limpar',
      desc: 'Apagar dados',
      icon: <Trash2 size={16} strokeWidth={1.5} />,
      gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      onClick: handleClearAllData
    },
    profile: {
      key: 'profile',
      title: 'Perfil',
      desc: 'Usuário',
      icon: <Users size={16} strokeWidth={1.5} />,
      gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
      onClick: () => window.dispatchEvent(new CustomEvent('openProfile'))
    },
    share: {
      key: 'share',
      title: 'Compartilhar',
      desc: 'Exportar',
      icon: <Share2 size={16} strokeWidth={1.5} />,
      gradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
      onClick: () => window.dispatchEvent(new CustomEvent('shareData'))
    },
    logout: {
      key: 'logout',
      title: 'Sair',
      desc: 'Desconectar',
      icon: <LogOut size={16} strokeWidth={1.5} />,
      gradient: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
      onClick: () => window.dispatchEvent(new CustomEvent('logout'))
    },
    ...(settings.showNotes && {
      notes: {
        key: 'notes',
        title: 'Notas',
        desc: 'Anotações',
        icon: <BookOpen size={16} strokeWidth={1.5} />,
        gradient: 'linear-gradient(135deg, #F59E0B 0%, #7B3FF2 100%)',
        onClick: () => window.dispatchEvent(new CustomEvent('openNotes'))
      },
      newNote: {
        key: 'newNote',
        title: 'Nova Nota',
        desc: 'Criar nota',
        icon: <Plus size={16} strokeWidth={1.5} />,
        gradient: 'linear-gradient(135deg, #8B5CF6 0%, #F59E0B 100%)',
        onClick: () => window.dispatchEvent(new CustomEvent('openNewNote'))
      }
    }),
    settings: {
      key: 'settings',
      title: 'Config',
      desc: 'Configurações',
      icon: <SettingsIcon size={16} strokeWidth={1.5} />,
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #00D4AA 100%)',
      onClick: () => window.dispatchEvent(new CustomEvent('openSettings'))
    }
  };

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  function handleDragStart(idx: number) {
    setDraggedIdx(idx);
  }
  function handleDragOver(idx: number) {
    setDragOverIdx(idx);
  }
  function handleDrop() {
    if (draggedIdx === null || dragOverIdx === null || draggedIdx === dragOverIdx) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }
    const current = [...settings.quickActions];
    const [removed] = current.splice(draggedIdx, 1);
    current.splice(dragOverIdx, 0, removed);
    // Corrige ordem
    current.forEach((a, i) => a.order = i + 1);
    updateQuickActions(current);
    setDraggedIdx(null);
    setDragOverIdx(null);
  }
  function handleToggleAction(key: string) {
    // Verificar se a funcionalidade correspondente está habilitada nos parâmetros
    const isFeatureEnabled = checkFeatureEnabled(key);

    if (!isFeatureEnabled) {
      // Mostrar toast em vez de alert
      setToastMessage('⚠️ Habilitar parâmetro nas configurações antes de ativar esta funcionalidade');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const updated = settings.quickActions.map(a => a.key === key ? { ...a, enabled: !a.enabled } : a);
    updateQuickActions(updated);
  }

  // Função para verificar se a funcionalidade está habilitada
  function checkFeatureEnabled(key: string): boolean {
    switch (key) {
      case 'timer':
        return settings.showTimer || false;
      case 'reports':
        return settings.showReports || false;
      case 'notes':
      case 'newNote':
        return settings.showNotes || false;
      case 'newTask':
      case 'settings':
      case 'categories':
      case 'backup':
      case 'import':
      case 'clearData':
      case 'profile':
      case 'share':
      case 'logout':
        return true; // Essas são sempre disponíveis
      default:
        return true;
    }
  }

  function handleCloseModal() {
    setShowQuickActionsModal(false);
    setDraggedIdx(null);
    setDragOverIdx(null);
  }

  const enabledQuickActions = getEnabledQuickActions();
  const [showQuickActionsModal, setShowQuickActionsModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  return (
    <div className="dashboard-container" style={{ padding: 'var(--space-4)' }}>
      <ImportExportModal
        mode={importExportMode}
        open={importExportModalOpen}
        onClose={() => setImportExportModalOpen(false)}
        onExport={handleImportExportExport}
        onImportPreview={handleImportExportPreview}
        onImportApply={handleImportExportApply}
        initialImportIntent={initialImportIntent}
      />
      {/* Header Section */}
      <header style={{ marginBottom: 'var(--space-4)' }}>
        <div className="flex flex-between" style={{ alignItems: 'flex-start' }}>
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-1)'
            }}>
              <Home size={28} style={{ color: 'var(--color-primary-teal)' }} />
              <h1 className="gradient-text" style={{
                fontSize: 'var(--font-size-3xl)',
                fontWeight: 'var(--font-weight-bold)',
                margin: 0,
                lineHeight: 'var(--line-height-tight)'
              }}>
                {getGreetingText()}
              </h1>
            </div>
            <p style={{
              fontSize: 'var(--font-size-base)',
              color: isDark ? 'var(--color-text-secondary)' : '#666666',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}>
              {activeOrg && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  backgroundColor: isDark ? '#0A1F1A' : '#F0FDF9',
                  border: '1px solid #00D4AA40',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#00D4AA',
                }}>
                  <Users size={12} /> {activeOrg.name}
                </span>
              )}
              {t('subtitle')} Você tem {getTodayTasks()} {getTodayTasks() === 1 ? t('task') : t('tasks')} para hoje.
            </p>
          </div>

          <div className="flex" style={{ gap: 'var(--space-3)' }}>
            <Card variant="glass" padding="sm">
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 'var(--font-size-xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-primary-teal)',
                  marginBottom: 0
                }}>
                  {getCompletionRate()}%
                </div>
                <div style={{
                  fontSize: '0.7rem',
                  color: isDark ? 'var(--color-text-muted)' : '#888888',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Progresso
                </div>
              </div>
            </Card>
          </div>
        </div>
      </header>

      {/* Quick Actions - Grid Unificado */}
      {showQuickActions && (
        <section style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', margin: 0 }}>
              {t('quickActions')}
            </h2>
            <button onClick={() => setShowQuickActionsModal(true)} style={{ background: 'none', border: 'none', color: 'var(--color-primary-teal)', fontSize: 18, cursor: 'pointer', padding: 2, borderRadius: 6, transition: 'background 0.2s' }} title="Adicionar/Editar Ação Rápida">
              <Plus />
            </button>
          </div>
          {enabledQuickActions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 16, color: 'var(--color-text-secondary)', fontSize: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span>Adicionar ação rápida</span>
              <button onClick={() => setShowQuickActionsModal(true)} style={{ background: 'var(--color-primary-teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 18, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4, cursor: 'pointer' }}>
                <Plus />
              </button>
            </div>
          ) : (
            <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 6, padding: 0 }}>
              {enabledQuickActions.map((action: QuickAction) => {
                const card = quickActionMap[action.key];
                if (!card || !card.icon) return null;
                return (
                  <UnifiedCard
                    key={card.key}
                    icon={card.icon || <Folder size={16} />}
                    title={card.title}
                    accentColor={card.gradient ? undefined : 'var(--color-primary-teal)'}
                    style={card.gradient ? { background: card.gradient } : {}}
                    onCardClick={card.onClick}
                    compact
                  />
                );
              })}
            </div>
          )}
          {showQuickActionsModal && (
            <div
              className="quick-actions-modal"
              style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(2px)'
              }}
              onClick={handleCloseModal}
            >
              <div
                style={{
                  background: isDark ? '#1a1a1d' : '#fff',
                  borderRadius: 16, minWidth: 340, maxWidth: 420, width: '90%',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
                  padding: 28, position: 'relative',
                  display: 'flex', flexDirection: 'column', gap: 16,
                  border: `1px solid ${isDark ? '#2a2a2d' : '#e5e7eb'}`,
                  animation: 'fadeIn 0.2s ease-out',
                  maxHeight: '80vh', // Limite de altura
                  overflowY: 'auto', // Rolagem interna
                }}
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={handleCloseModal}
                  style={{
                    position: 'absolute', top: 16, right: 16,
                    background: 'none', border: 'none',
                    color: 'var(--color-text-secondary)',
                    fontSize: 18, cursor: 'pointer',
                    borderRadius: 6, padding: 4,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--color-bg-hover)';
                    e.currentTarget.style.color = 'var(--color-text-primary)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                  }}
                >
                  <X />
                </button>
                <h3 style={{
                  fontSize: 20, fontWeight: 600, margin: 0,
                  color: 'var(--color-text-primary)'
                }}>
                  Gerenciar Ações Rápidas
                </h3>
                <p style={{
                  fontSize: 14, color: 'var(--color-text-secondary)',
                  margin: '-8px 0 8px 0'
                }}>
                  Arraste para reordenar, marque para ativar
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {settings.quickActions
                    .sort((a, b) => a.order - b.order)
                    .map((action, idx) => {
                      const card = quickActionMap[action.key];
                      if (!card) return null;
                      const isDragging = draggedIdx === idx;
                      const isDragOver = dragOverIdx === idx;
                      return (
                        <div
                          key={action.key}
                          draggable
                          onDragStart={() => handleDragStart(idx)}
                          onDragOver={e => { e.preventDefault(); handleDragOver(idx); }}
                          onDrop={handleDrop}
                          onDragEnd={() => { setDraggedIdx(null); setDragOverIdx(null); }}
                          className={`quick-actions-item ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                            background: isDragging ? 'var(--color-primary-teal)' : isDragOver ? 'rgba(0,212,170,0.1)' : (isDark ? '#252528' : '#f9fafb'),
                            borderRadius: 10, cursor: 'grab',
                            border: `1px solid ${isDragOver ? 'var(--color-primary-teal)' : (isDark ? '#333336' : '#e5e7eb')}`,
                            opacity: isDragging ? 0.8 : (action.enabled ? 1 : 0.6),
                            transform: isDragging ? 'scale(0.98)' : 'scale(1)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{ cursor: 'grab', color: 'var(--color-text-muted)' }}>
                            <GripVertical size={16} />
                          </span>
                          <input
                            type="checkbox"
                            checked={action.enabled}
                            onChange={() => handleToggleAction(action.key)}
                            disabled={!checkFeatureEnabled(action.key)}
                            style={{
                              width: 18, height: 18,
                              cursor: checkFeatureEnabled(action.key) ? 'pointer' : 'not-allowed',
                              accentColor: 'var(--color-primary-teal)',
                              opacity: checkFeatureEnabled(action.key) ? 1 : 0.5
                            }}
                          />
                          <span style={{ fontSize: 20, display: 'flex', alignItems: 'center' }}>
                            {card.icon}
                          </span>
                          <span style={{
                            fontWeight: 500, fontSize: 15, flex: 1,
                            color: 'var(--color-text-primary)'
                          }}>
                            {card.title}
                          </span>
                          {!checkFeatureEnabled(action.key) && (
                            <span
                              style={{
                                fontSize: 12,
                                color: 'var(--color-accent-amber)',
                                fontWeight: 500,
                                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                padding: '2px 6px',
                                borderRadius: 4
                              }}
                              title="Habilitar parâmetro nas configurações antes"
                            >
                              ⚠️ Desabilitado
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
                <button
                  onClick={handleCloseModal}
                  style={{
                    marginTop: 8, background: 'var(--color-primary-teal)',
                    color: '#fff', border: 'none', borderRadius: 10,
                    fontWeight: 600, fontSize: 15, padding: '12px 0',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,212,170,0.3)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  Salvar
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Categorias - Grid Unificado */}
      <section>
        <h2 style={{
          fontSize: 'var(--font-size-base)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-3)',
          margin: '0 0 var(--space-3) 0'
        }}>
          {t('categories')}
        </h2>
        <div className="dashboard-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 10,
          padding: 0
        }}>
          {displayCards.map((card) => (
            <UnifiedCard
              key={card.key}
              icon={renderIcon(card.icon, 20, card.accentColor)}
              title={card.title}
              count={showTaskCounters ? card.count : undefined}
              accentColor={card.accentColor}
              onCardClick={() => {
                onViewTaskList(card.key);
                if (card.isSystem) {
                  void loadStatusTasks(card.key);
                }
              }}
            />
          ))}
        </div>
      </section>

      {/* Seção de Dicas de Produtividade */}
      {(settings.showProductivityTips || settings.showProgressInsights) && (
        <section style={{ marginTop: '32px' }}>
          <h2 style={{
            fontSize: 'var(--font-size-base)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-3)',
            margin: '0 0 var(--space-3) 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Brain size={18} color="var(--color-primary-teal)" />
            Insights de Produtividade
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            maxHeight: '140px',
            overflow: 'auto'
          }}>

            {/* Dicas de Produtividade */}
            {settings.showProductivityTips && (
              <div style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-primary)',
                borderRadius: '12px',
                padding: '16px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '4px',
                  height: '100%',
                  background: 'linear-gradient(135deg, var(--color-primary-teal), var(--color-accent-purple))'
                }} />

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <Target size={16} color="var(--color-primary-teal)" />
                  <h3 style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    margin: 0
                  }}>
                    Dica do Dia
                  </h3>
                </div>

                <p style={{
                  fontSize: '13px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: '1.5',
                  margin: 0
                }}>
                  {tipText}
                </p>
              </div>
            )}

            {/* Insights de Progresso */}
            {settings.showProgressInsights && (
              <div style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-primary)',
                borderRadius: '12px',
                padding: '16px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '4px',
                  height: '100%',
                  background: 'linear-gradient(135deg, var(--color-accent-orange), var(--color-accent-violet))'
                }} />

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <BarChart2 size={16} color="var(--color-accent-orange)" />
                  <h3 style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    margin: 0
                  }}>
                    Seu Progresso
                  </h3>
                </div>

                <p style={{
                  fontSize: '13px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: '1.5',
                  margin: 0
                }}>
                  {progressText}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Modal de Detalhes do Status */}
      {selectedStatus && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={closeTaskModal}>
          <div
            className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">
                  {displayCards.find(c => c.key === selectedStatus)?.title} - Tarefas
                </h2>
                <Button variant="ghost" onClick={closeTaskModal}>
                  ✕
                </Button>
              </div>
            </div>
            <div className="p-6 task-card-container">
              {statusTasks.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  Nenhuma tarefa encontrada para este status.
                </p>
              ) : (
                <div className="space-y-3">
                  {statusTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between hover:bg-gray-700/70 transition-colors"
                    >
                      <div>
                        <h3 className="text-white font-medium">{task.title}</h3>
                        {task.description && (
                          <p className="text-gray-400 text-sm mt-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary">
                            Prioridade {task.priority}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(task.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {selectedStatus !== 'concluido' && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleCompleteTask(task.id)}
                        >
                          Concluir
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast para feedback */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          zIndex: 9999,
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-primary)',
          borderLeft: '4px solid #F59E0B',
          borderRadius: '8px',
          padding: '12px 16px',
          maxWidth: '400px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          color: 'var(--color-text-primary)',
          fontSize: '14px',
          animation: 'slideInRight 0.3s ease-out'
        }}>
          {toastMessage}
        </div>
      )}

    </div>
  );
};