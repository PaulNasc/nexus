import React, { useEffect, useState, useCallback } from 'react';
import { useNotifications } from './hooks/useNotifications';
import { useNotes } from './contexts/NotesContext';

import { useTheme } from './hooks/useTheme';
import { useTasks } from './contexts/TasksContext';
import { useI18n } from './hooks/useI18n';
import { useSettings } from './hooks/useSettings';
import { useCategories } from './contexts/CategoriesContext';
import { useProductivityInsights } from './hooks/useProductivityInsights';
const TaskModal = React.lazy(() => import('./components/TaskModal').then(m => ({ default: m.TaskModal })));
const TaskList = React.lazy(() => import('./components/TaskList').then(m => ({ default: m.TaskList })));
const Timer = React.lazy(() => import('./components/Timer').then(m => ({ default: m.Timer })));
const Reports = React.lazy(() => import('./components/Reports').then(m => ({ default: m.Reports })));
const Dashboard = React.lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const Settings = React.lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));
const Notes = React.lazy(() => import('./components/Notes').then(m => ({ default: m.Notes })));
const NoteModal = React.lazy(() => import('./components/NoteModal').then(m => ({ default: m.NoteModal })));
const NotesMetricsPanel = React.lazy(() => import('./components/NotesMetricsPanel').then(m => ({ default: m.NotesMetricsPanel })));
import { useToast } from './contexts/ToastContext';
import { useAppearance } from './hooks/useAppearance';
import { Task, TaskStatus } from '../shared/types/task';
import { Screen } from '../shared/types/navigation';
import { UserSettings } from './hooks/useSettings';
import { Settings as SettingsIcon, LogOut, StickyNote, Sun, Moon, ChevronUp, ChevronDown, Loader2, LayoutDashboard, PanelRight, PanelLeft, PanelTop, PanelBottom, ArrowLeft } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { useOrganization } from './contexts/OrganizationContext';
import UpdateNotification from './components/UpdateNotification';
import { NoOrganizationModal } from './components/NoOrganizationModal';
import { NexusLoadingScreen } from './components/NexusLoadingScreen';
import { desktopAdapter } from './lib/desktopAdapter';

// Import styles
import './styles/reset.css';
import './styles/tokens.css';
import './styles/variables.css';
import './styles/global.css';
import './styles/components.css';
import './styles/animations.css';
import './styles/navigation-title.css';

type AppScreen = Screen | 'timer' | 'reports' | 'notes' | 'metrics';

interface AppNavigationState {
  currentScreen: AppScreen;
  selectedList?: string;
  selectedNoteId?: number;
}

interface AppProps { }

interface FloatingActionToolbarProps {
  position: 'bottom' | 'right' | 'left';
  onTogglePosition: () => void;
  effectiveMode: 'light' | 'dark';
  onToggleTheme: () => void;
  handleOpenSettings: () => void;
  onSignOut: () => void;
  openMetrics: () => void;
  openNotes: () => void;
  handleOpenNoteModal: () => void;
  currentScreen: string;
}

const FloatingActionToolbar: React.FC<FloatingActionToolbarProps> = React.memo(({
  position,
  onTogglePosition,
  effectiveMode,
  onToggleTheme,
  handleOpenSettings,
  onSignOut,
  openMetrics,
  openNotes,
  handleOpenNoteModal,
  currentScreen,
}) => {
  const isVertical = position === 'right' || position === 'left';
  const isMetricsScreen = currentScreen === 'metrics';

  const containerStyle: React.CSSProperties = isVertical
    ? {
        position: 'fixed',
        top: '50%',
        transform: 'translateY(-50%)',
        [position]: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'center',
        zIndex: 9999,
        background: 'transparent',
        border: 'none',
        padding: '0',
        userSelect: 'none',
      }
    : {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'row',
        gap: '10px',
        alignItems: 'center',
        zIndex: 9999,
        background: 'transparent',
        border: 'none',
        padding: '0',
        userSelect: 'none',
      };

  const btnStyle = (bg: string, border: string, color: string): React.CSSProperties => ({
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    backgroundColor: bg,
    border: `1px solid ${border}`,
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: color,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    transition: 'all 0.2s ease',
  });

  const baseBg = effectiveMode === 'dark' ? 'rgba(255,255,255,0.06)' : 'var(--color-bg-secondary)';
  const baseBorder = 'var(--color-border-primary)';
  const baseColor = 'var(--color-text-primary)';

  return (
    <div className={`floating-action-toolbar floating-action-toolbar--${position}`} style={containerStyle}>
      {/* Botão Toggle de Posição (Menor, sutil e com mais distância) */}
      <button
        className="header-icon-btn header-position-toggle"
        onClick={onTogglePosition}
        title={
          position === 'bottom'
            ? 'Mover para a Direita'
            : position === 'right'
            ? 'Mover para a Esquerda'
            : 'Mover para o Rodapé'
        }
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          backgroundColor: baseBg,
          border: '1px solid rgba(0, 212, 170, 0.25)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#00D4AA',
          cursor: 'pointer',
          opacity: 0.75,
          marginBottom: isVertical ? '14px' : '0',
          marginRight: !isVertical ? '14px' : '0',
          transition: 'all 0.2s ease',
        }}
      >
        {position === 'bottom' && <PanelRight size={15} />}
        {position === 'right' && <PanelLeft size={15} />}
        {position === 'left' && <PanelBottom size={15} />}
      </button>

      {/* 1: Sticky Note (Nota Rápida) */}
      <button
        className="header-action-btn header-action-btn--note"
        onClick={handleOpenNoteModal}
        title="Nota rápida"
        style={{
          ...btnStyle('rgba(123, 63, 242, 0.15)', 'rgba(123, 63, 242, 0.3)', '#A855F7'),
          boxShadow: '0 4px 12px rgba(123, 63, 242, 0.2)',
        }}
      >
        <StickyNote size={17} />
      </button>

      {/* 2: Dashboard Button com Transição para Ícone de Voltar */}
      <button
        className={`header-action-btn ${isMetricsScreen ? 'active' : ''}`}
        onClick={isMetricsScreen ? openNotes : openMetrics}
        title={isMetricsScreen ? 'Voltar para Notas' : 'Dashboard'}
        style={{
          ...btnStyle('transparent', 'rgba(0, 212, 170, 0.4)', '#00D4AA'),
          background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.25) 0%, rgba(123, 63, 242, 0.25) 50%, rgba(236, 72, 153, 0.25) 100%)',
          boxShadow: '0 4px 12px rgba(0, 212, 170, 0.25)',
        }}
      >
        {isMetricsScreen ? (
          <ArrowLeft size={18} style={{ color: '#00D4AA' }} />
        ) : (
          <LayoutDashboard size={18} style={{ color: '#00D4AA' }} />
        )}
      </button>

      {/* 3: Theme Toggle Button */}
      <button
        className="header-icon-btn"
        onClick={onToggleTheme}
        title={effectiveMode === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
        style={btnStyle(baseBg, baseBorder, baseColor)}
      >
        {effectiveMode === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      {/* 4: Settings Button */}
      <button
        className="header-icon-btn"
        onClick={handleOpenSettings}
        title="Configurações"
        style={btnStyle(baseBg, baseBorder, baseColor)}
      >
        <SettingsIcon size={17} />
      </button>

      {/* 5: SignOut Button */}
      <button
        className="header-icon-btn"
        onClick={onSignOut}
        title="Sair"
        style={btnStyle(baseBg, baseBorder, baseColor)}
      >
        <LogOut size={16} />
      </button>
    </div>
  );
});

const SystemWatermark: React.FC<{ version: string; mode: 'light' | 'dark' }> = React.memo(({ version, mode }) => {
  return (
    <div
      className="system-watermark"
      style={{
        position: 'fixed',
        bottom: '12px',
        right: '16px',
        fontSize: '12px',
        color: mode === 'dark' ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.35)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontWeight: 500,
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 9000,
        letterSpacing: '0.2px',
      }}
    >
      Nexus <span style={{ opacity: 0.7, fontSize: '11px', marginLeft: '2px' }}>v{version || '1.4.0'}</span>
    </div>
  );
});

const App: React.FC<AppProps> = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [navigation, setNavigation] = useState<AppNavigationState>({
    currentScreen: 'notes'
  });
  const [systemInfo, setSystemInfo] = useState<{
    platform: string;
    version: string;
  }>({ platform: '', version: '' });
  const [dailyGoalReached, setDailyGoalReached] = useState(false);

  const electronAPI = (window as Window & {
    electronAPI?: {
      updater?: { getVersion?: () => Promise<string> };
      system?: { version?: string; platform?: string };
      openDevTools?: () => void;
      toggleDevTools?: () => void;
    };
  }).electronAPI;

  // Theme hook
  const { theme, effectiveMode, toggleMode } = useTheme();
  useI18n();
  const { settings, updateSettings } = useSettings();

  // Aplicar configurações de aparência
  useAppearance();

  // Hooks centralizados via Context (instância única)
  const { user, signOut, isOffline } = useAuth();
  const { myRole, organizations, loading: orgsLoading } = useOrganization();

  const { isLoading: notesLoading } = useNotes();
  const canViewMetrics = myRole === 'admin' || myRole === 'owner';
  const {
    tasks,
    stats,
    loading: tasksLoading,
    updateTask,
    deleteTask
  } = useTasks();

  const { categories } = useCategories();

  // Hook para notificações
  const { showToast } = useToast();
  const { showTaskComplete, showDailyGoal, requestPermission } = useNotifications();

  // Use daily goal from settings
  const DAILY_GOAL = settings.dailyGoal;

  // Purge disk cache on application startup
  useEffect(() => {
    desktopAdapter.clearVideoCache().catch((err) => console.warn('Cache cleanup error:', err));
  }, []);

  // Listen for openSettings event from quick actions
  useEffect(() => {
    const handleOpenSettings = () => {
      setIsSettingsOpen(true);
    };
    window.addEventListener('openSettings', handleOpenSettings);
    return () => {
      window.removeEventListener('openSettings', handleOpenSettings);
    };
  }, []);

  // Listen for openNotes event from quick actions
  useEffect(() => {
    const handleOpenNotes = () => {
      openNotes();
    };
    window.addEventListener('openNotes', handleOpenNotes);
    return () => {
      window.removeEventListener('openNotes', handleOpenNotes);
    };
  }, []);

  // Listen for navigateToNote custom event and IPC from notification or toast click
  useEffect(() => {
    const handleNavigateToNote = (e: Event) => {
      const customEvt = e as CustomEvent<{ noteId: number }>;
      if (customEvt.detail?.noteId) {
        setNavigation({ currentScreen: 'notes', selectedNoteId: customEvt.detail.noteId });
      }
    };

    window.addEventListener('navigateToNote', handleNavigateToNote);

    const electronAPI = (window as unknown as { electronAPI?: { on?: (channel: string, listener: (data: { noteId: number }) => void) => () => void } }).electronAPI;
    let cleanupIpc: (() => void) | undefined;
    if (electronAPI?.on) {
      cleanupIpc = electronAPI.on('notification:navigateToNote', (data) => {
        if (data?.noteId) {
          setNavigation({ currentScreen: 'notes', selectedNoteId: data.noteId });
        }
      });
    }

    return () => {
      window.removeEventListener('navigateToNote', handleNavigateToNote);
      if (cleanupIpc) cleanupIpc();
    };
  }, []);

  // Listen for openNewNote event from quick actions
  useEffect(() => {
    const handleOpenNewNote = () => {
      setIsNoteModalOpen(true);
    };
    window.addEventListener('openNewNote', handleOpenNewNote);
    return () => {
      window.removeEventListener('openNewNote', handleOpenNewNote);
    };
  }, []);

  // Listen for navigateToNote event from quick actions
  useEffect(() => {
    const handleNavigateToNote = (event: Event) => {
      const noteId = (event as CustomEvent).detail?.noteId;
      if (noteId) openNoteById(noteId);
    };
    window.addEventListener('navigateToNote', handleNavigateToNote);
    return () => {
      window.removeEventListener('navigateToNote', handleNavigateToNote);
    };
  }, []);

  useEffect(() => {
    const loadApp = async () => {
      try {
        // Request notification permission
        await requestPermission();

        // Get system information via unified desktopAdapter
        try {
          const sysInfo = await desktopAdapter.getSystemInfo();
          setSystemInfo({
            platform: sysInfo.platform || 'win32',
            version: sysInfo.version || '1.4.0'
          });
        } catch {
          if (electronAPI) {
            const ver = await electronAPI.updater?.getVersion?.() || electronAPI.system?.version || '1.4.0';
            setSystemInfo({
              platform: electronAPI.system?.platform || 'win32',
              version: typeof ver === 'string' ? ver : String(ver)
            });
          } else {
            setSystemInfo({ platform: 'win32', version: '1.4.0' });
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error loading app:', error);
        setIsLoading(false);
      }
    };

    loadApp();
  }, [requestPermission, electronAPI]);

  // Check for daily goal achievement
  useEffect(() => {
    if (stats && stats.concluido >= DAILY_GOAL && !dailyGoalReached) {
      setDailyGoalReached(true);
      showDailyGoal(stats.concluido, DAILY_GOAL);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats?.concluido, dailyGoalReached, showDailyGoal, DAILY_GOAL]);

  // Navegação
  const navigateTo = useCallback((screen: AppScreen, selectedList?: string) => {
    setNavigation({ currentScreen: screen, selectedList });
  }, []);

  const openNotes = useCallback(() => {
    setNavigation({ currentScreen: 'notes' });
  }, []);

  const openNoteById = useCallback((noteId: number) => {
    setNavigation({ currentScreen: 'notes', selectedNoteId: noteId });
  }, []);

  const goToDashboard = useCallback(() => {
    if (!settings.showDashboard) {
      openNotes();
      return;
    }
    navigateTo('dashboard');
  }, [settings.showDashboard, openNotes, navigateTo]);

  const viewTaskList = useCallback((status: string) => {
    navigateTo('task-list', status);
  }, [navigateTo]);

  const openTimer = useCallback(() => {
    navigateTo('timer');
  }, [navigateTo]);

  const openReports = useCallback(() => {
    navigateTo('reports');
  }, [navigateTo]);

  const openMetrics = useCallback(() => {
    navigateTo('metrics');
  }, [navigateTo]);

  useEffect(() => {
    if (navigation.currentScreen === 'dashboard' && !settings.showDashboard) {
      openNotes();
    }
  }, [navigation.currentScreen, settings.showDashboard]);

  // Modal functions
  // Hotfix: abertura direta de "Nova Tarefa" desativada por solicitação do usuário.

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  }, []);

  const handleCloseTaskModal = useCallback(() => {
    setIsTaskModalOpen(false);
    setEditingTask(undefined);
  }, []);

  // Settings functions
  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const toggleHeaderVisibility = () => {
    updateSettings({ showAppHeader: !settings.showAppHeader });
  };

  // Task operations — TaskModal already handles create/update internally,
  // so this callback only shows the toast feedback.
  const handleSaveTask = async () => {
    if (editingTask) {
      showToast('Tarefa atualizada com sucesso!', 'success');
    } else {
      showToast('Tarefa criada com sucesso!', 'success');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    await deleteTask(taskId);
    showToast('Tarefa excluída com sucesso!', 'success');
  };

  // Função utilitária para garantir TaskStatus
  const toTaskStatus = (status: string): TaskStatus => {
    if (["backlog", "esta_semana", "hoje", "concluido"].includes(status)) {
      return status as TaskStatus;
    }
    return "backlog";
  };

  const handleMoveTask = async (taskId: number, newStatus: string) => {
    const task = tasks.find(t => t.id === taskId);

    const statusNames: Record<string, string> = {
      backlog: 'Backlog',
      esta_semana: 'Esta Semana',
      hoje: 'Hoje',
      concluido: 'Concluído'
    };

    const targetLabel = statusNames[newStatus] || newStatus;

    await updateTask(taskId, {
      status: toTaskStatus(newStatus),
      progress_status: targetLabel,
    });

    showToast(`Tarefa movida para ${targetLabel}!`, 'info');

    if (newStatus === 'concluido' && task) {
      showTaskComplete(task.title);
    }
  };

  // Habilitar DevTools automaticamente em dev
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && electronAPI?.openDevTools) {
      electronAPI.openDevTools();
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') {
        if (electronAPI?.toggleDevTools) {
          electronAPI.toggleDevTools();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [electronAPI]);

  const [toolbarPosition, setToolbarPosition] = useState<'bottom' | 'right' | 'left'>(() => {
    try {
      const saved = localStorage.getItem('nexus_toolbar_position');
      if (saved === 'right' || saved === 'left' || saved === 'bottom') return saved;
    } catch {}
    return 'bottom';
  });

  const handleToggleMenuPosition = useCallback(() => {
    setToolbarPosition((prev) => {
      let nextPos: 'bottom' | 'right' | 'left' = 'right';
      if (prev === 'bottom') nextPos = 'right';
      else if (prev === 'right') nextPos = 'left';
      else nextPos = 'bottom';

      try {
        localStorage.setItem('nexus_toolbar_position', nextPos);
      } catch {}
      updateSettings({ actionMenuPosition: nextPos as any });
      return nextPos;
    });
  }, [updateSettings]);

  if (isLoading || tasksLoading || notesLoading || orgsLoading) {
    return <NexusLoadingScreen title="Nexus" subtitle="Carregando ambiente de trabalho..." />;
  }

  // Se o usuário estiver online mas não possuir nenhuma organização
  if (!isOffline && organizations.length === 0) {
    return <NoOrganizationModal />;
  }

  // Obter título da lista baseado no status
  const getListTitle = (status: string) => {
    if (status.startsWith('category_')) {
      const categoryId = parseInt(status.replace('category_', ''));
      const category = categories.find(cat => cat.id === categoryId);
      return category?.name || 'Categoria';
    }

    const listNames = {
      backlog: 'Backlog',
      esta_semana: 'Esta Semana',
      hoje: 'Hoje',
      concluido: 'Concluído'
    };
    return listNames[status as keyof typeof listNames] || status;
  };

  // Renderização condicional baseada na navegação - apenas para task-list
  if (navigation.currentScreen === 'task-list' && navigation.selectedList) {
    let tasksList: Task[] = [];

    if (navigation.selectedList.startsWith('category_')) {
      const categoryId = parseInt(navigation.selectedList.replace('category_', ''));
      tasksList = tasks.filter((task: Task) => {
        const taskWithCategory = task as Task & { category_id?: number };
        return taskWithCategory.category_id === categoryId;
      });
    } else {
      tasksList = tasks.filter((task: Task) => {
        if (task.status !== navigation.selectedList) return false;
        // Hide tasks that belong to a shared category from personal status lists
        if (task.category_id) {
          const cat = categories.find(c => c.id === task.category_id);
          if (cat?.is_shared) return false;
        }
        return true;
      });
    }

    return (
      <React.Suspense fallback={<NexusLoadingScreen title="Nexus" subtitle="Carregando lista de tarefas..." />}>
        <div className="app-container" data-theme={theme.mode}>
          <FloatingActionToolbar
            position={toolbarPosition}
            onTogglePosition={handleToggleMenuPosition}
            effectiveMode={effectiveMode}
            onToggleTheme={toggleMode}
            handleOpenSettings={handleOpenSettings}
            onSignOut={signOut}
            openMetrics={openMetrics}
            openNotes={openNotes}
            handleOpenNoteModal={() => setIsNoteModalOpen(true)}
            currentScreen={navigation.currentScreen}
          />
          <SystemWatermark version={systemInfo?.version || '1.4.0'} mode={effectiveMode} />
          <main className="app-main">
            <TaskList
              title={getListTitle(navigation.selectedList)}
              tasks={tasksList}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onToggleStatus={handleMoveTask}
              onBack={goToDashboard}
            />
          </main>

          {isTaskModalOpen && (
            <TaskModal
              editingTask={editingTask}
              isOpen={isTaskModalOpen}
              onClose={handleCloseTaskModal}
              onSave={handleSaveTask}
            />
          )}

          <Settings
            isOpen={isSettingsOpen}
            onClose={handleCloseSettings}
          />
        </div>
      </React.Suspense>
    );
  }

  // Dashboard principal com abas para Timer e Reports
  return (
    <React.Suspense fallback={<NexusLoadingScreen title="Nexus" subtitle="Carregando aplicativo..." />}>
      <div className="app-container" data-theme={theme.mode}>
        <FloatingActionToolbar
          position={toolbarPosition}
          onTogglePosition={handleToggleMenuPosition}
          effectiveMode={effectiveMode}
          onToggleTheme={toggleMode}
          handleOpenSettings={handleOpenSettings}
          onSignOut={signOut}
          openMetrics={openMetrics}
          openNotes={openNotes}
          handleOpenNoteModal={() => setIsNoteModalOpen(true)}
          currentScreen={navigation.currentScreen}
        />
        <SystemWatermark version={systemInfo?.version || '1.4.0'} mode={effectiveMode} />
        <main className="app-main">
          {navigation.currentScreen === 'dashboard' && (
            <div className="animate-screen">
              <Dashboard
                onViewTaskList={viewTaskList}
                onOpenTimer={settings.showTimer ? openTimer : undefined}
                onOpenReports={settings.showReports ? openReports : undefined}
                showQuickActions={settings.showQuickActions}
                showTaskCounters={settings.showTaskCounters}
              />
            </div>
          )}
          {navigation.currentScreen === 'timer' && settings.showTimer && (
            <div className="animate-screen" style={{ padding: '24px' }}>
              <Timer onBack={goToDashboard} />
            </div>
          )}
          {navigation.currentScreen === 'reports' && settings.showReports && (
            <div className="animate-screen" style={{ padding: '24px' }}>
              <Reports onClose={goToDashboard} onBack={goToDashboard} />
            </div>
          )}
          {navigation.currentScreen === 'notes' && (
            <div className="animate-screen" style={{ height: '100%' }}>
              <Notes initialNoteId={navigation.selectedNoteId} />
            </div>
          )}
          {navigation.currentScreen === 'metrics' && (
            <div className="animate-screen" style={{ padding: '24px' }}>
              <NotesMetricsPanel />
            </div>
          )}

          <NoteModal
            isOpen={isNoteModalOpen}
            onClose={() => setIsNoteModalOpen(false)}
            modalTitle="Nota rápida"
          />
        </main>

        {isTaskModalOpen && (
          <TaskModal
            editingTask={editingTask}
            isOpen={isTaskModalOpen}
            onClose={handleCloseTaskModal}
            onSave={handleSaveTask}
          />
        )}

        <Settings
          isOpen={isSettingsOpen}
          onClose={handleCloseSettings}
        />



        <UpdateNotification isDark={true} />
      </div>
    </React.Suspense>
  );
};

export default App;