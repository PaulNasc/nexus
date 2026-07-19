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
import { useToast } from './components/Toast';
import { useAppearance } from './hooks/useAppearance';
import { Task, TaskStatus } from '../shared/types/task';
import { Screen } from '../shared/types/navigation';
import { UserSettings } from './hooks/useSettings';
import { Settings as SettingsIcon, LogOut, StickyNote, Sun, Moon, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { useOrganization } from './contexts/OrganizationContext';
import ProactiveSuggestionsWidget from './components/ProactiveSuggestionsWidget';
import UpdateNotification from './components/UpdateNotification';
import { NoOrganizationModal } from './components/NoOrganizationModal';

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

interface TabItem {
  key: string;
  label: string;
  onClick: () => void;
}

interface AppHeaderProps {
  settings: UserSettings;
  navigation: AppNavigationState;
  systemInfo: { platform: string; version: string; };
  goToDashboard: () => void;
  openTimer: () => void;
  openReports: () => void;
  openNotes: () => void;
  openMetrics: () => void;
  canViewMetrics: boolean;
  effectiveMode: 'light' | 'dark';
  onToggleTheme: () => void;
  handleOpenSettings: () => void;
  handleOpenNoteModal: () => void;
  onSignOut: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = React.memo(({
  settings,
  navigation,
  systemInfo,
  goToDashboard,
  openTimer,
  openReports,
  openNotes,
  openMetrics,
  canViewMetrics,
  effectiveMode,
  onToggleTheme,
  handleOpenSettings,
  handleOpenNoteModal,
  onSignOut
}) => {
  const safeVersion = typeof systemInfo?.version === 'string'
    ? systemInfo.version
    : (systemInfo?.version ? String(systemInfo.version) : '');

  const tabs = [
    { key: 'notes', label: 'Notas', onClick: openNotes },
    { key: 'metrics', label: 'Dashboard', onClick: openMetrics },
    ...(settings.showDashboard ? [{ key: 'dashboard', label: 'Tarefas', onClick: goToDashboard }] : []),
    ...(settings.showTimer ? [{ key: 'timer', label: 'Timer', onClick: openTimer }] : []),
    ...(settings.showReports ? [{ key: 'reports', label: 'Relatórios', onClick: openReports }] : [])
  ];

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="app-title">Nexus</h1>
          <span className="app-version">v{safeVersion || '1.0.0'}</span>
        </div>
        <div className="header-center">
          <nav className="navigation">
            {tabs.map((tab: TabItem) => (
              <button
                key={tab.key}
                className={`nav-button ${navigation.currentScreen === tab.key ? 'active' : ''}`}
                onClick={tab.onClick}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="header-right">
          <div className="header-icon-group">
            <button
              className="header-icon-btn"
              onClick={onToggleTheme}
              title={effectiveMode === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              {effectiveMode === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span className="header-tooltip">
                {effectiveMode === 'dark' ? 'Modo claro' : 'Modo escuro'}
              </span>
            </button>
            <button
              className="header-icon-btn"
              onClick={handleOpenSettings}
              title="Configurações"
            >
              <SettingsIcon size={17} />
              <span className="header-tooltip">Configurações</span>
            </button>
            <button
              className="header-icon-btn"
              onClick={onSignOut}
              title="Sair"
            >
              <LogOut size={16} />
              <span className="header-tooltip">Sair</span>
            </button>
          </div>
          <div className="header-action-group">
            <button
              className="header-action-btn header-action-btn--note"
              onClick={handleOpenNoteModal}
              title="Nota rápida"
            >
              <StickyNote size={16} />
              <span className="header-tooltip">Nota rápida</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.effectiveMode === nextProps.effectiveMode &&
    prevProps.canViewMetrics === nextProps.canViewMetrics &&
    prevProps.navigation.currentScreen === nextProps.navigation.currentScreen &&
    prevProps.navigation.selectedList === nextProps.navigation.selectedList &&
    prevProps.navigation.selectedNoteId === nextProps.navigation.selectedNoteId &&
    prevProps.systemInfo.platform === nextProps.systemInfo.platform &&
    prevProps.systemInfo.version === nextProps.systemInfo.version &&
    prevProps.settings.showDashboard === nextProps.settings.showDashboard &&
    prevProps.settings.showTimer === nextProps.settings.showTimer &&
    prevProps.settings.showReports === nextProps.settings.showReports
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
  const { signOut, isOffline } = useAuth();
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
  const { proactiveSuggestions } = useProductivityInsights({ 
    tasks, 
    stats, 
    settings: {
      dailyGoal: settings.dailyGoal,
      aiResponseMode: settings.aiResponseMode,
      aiProactiveMode: settings.aiProactiveMode,
      showProductivityTips: settings.showProductivityTips,
      showProgressInsights: settings.showProgressInsights
    }
  });

  // Hook para notificações
  const { showToast, ToastContainer } = useToast();
  const { showTaskComplete, showDailyGoal, requestPermission } = useNotifications();

  // Use daily goal from settings
  const DAILY_GOAL = settings.dailyGoal;

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

        // Get system information
        if (electronAPI) {
          const ver = await electronAPI.updater?.getVersion?.() || electronAPI.system?.version || '';
          setSystemInfo({
            platform: electronAPI.system?.platform || '',
            version: typeof ver === 'string' ? ver : String(ver)
          });
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

  const headerToggleButtonStyle: React.CSSProperties = settings.showAppHeader
    ? {
      position: 'fixed',
      top: 56,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1200,
      minWidth: 28,
      height: 22,
      borderRadius: 999,
      padding: '0 8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(6px)',
      backgroundColor: effectiveMode === 'dark' ? 'rgba(20,20,20,0.92)' : 'rgba(255,255,255,0.92)',
      border: effectiveMode === 'dark' ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(15,23,42,0.12)',
      color: effectiveMode === 'dark' ? '#A0A0A0' : '#475569',
    }
    : {
      position: 'fixed',
      top: 10,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1200,
      minWidth: 28,
      height: 22,
      borderRadius: 999,
      padding: '0 8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(6px)',
      backgroundColor: effectiveMode === 'dark' ? 'rgba(20,20,20,0.92)' : 'rgba(255,255,255,0.92)',
      border: effectiveMode === 'dark' ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(15,23,42,0.12)',
      color: effectiveMode === 'dark' ? '#A0A0A0' : '#475569',
    };

  const renderAppHeader = () => {
    if (!settings.showAppHeader) return null;

    return (
      <AppHeader
        settings={settings}
        navigation={navigation}
        systemInfo={systemInfo}
        goToDashboard={goToDashboard}
        openTimer={openTimer}
        openReports={openReports}
        openNotes={openNotes}
        openMetrics={openMetrics}
        canViewMetrics={canViewMetrics}
        effectiveMode={effectiveMode}
        onToggleTheme={toggleMode}
        handleOpenSettings={handleOpenSettings}
        handleOpenNoteModal={() => setIsNoteModalOpen(true)}
        onSignOut={signOut}
      />
    );
  };

  const renderHeaderVisibilityToggle = () => (
    <button
      className="header-icon-btn"
      onClick={toggleHeaderVisibility}
      title={settings.showAppHeader ? 'Ocultar menu superior' : 'Mostrar menu superior'}
      style={headerToggleButtonStyle}
    >
      {settings.showAppHeader ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      <span className="header-tooltip">
        {settings.showAppHeader ? 'Ocultar menu superior' : 'Mostrar menu superior'}
      </span>
    </button>
  );

  if (isLoading || tasksLoading || notesLoading || orgsLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <Loader2 className="notes-loading-spinner" />
          <h2 className="loading-title">Carregando Nexus...</h2>
          <p className="loading-subtitle">Preparando seu ambiente de produtividade</p>
        </div>
      </div>
    );
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
      <React.Suspense fallback={
        <div className="loading-screen">
          <div className="loading-content">
            <Loader2 className="notes-loading-spinner" />
            <h2 className="loading-title">Carregando...</h2>
          </div>
        </div>
      }>
        <div className="app-container" data-theme={theme.mode}>
          {renderAppHeader()}
          {renderHeaderVisibilityToggle()}
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

          <ToastContainer />
        </div>
      </React.Suspense>
    );
  }

  // Dashboard principal com abas para Timer e Reports
  return (
    <React.Suspense fallback={
      <div className="loading-screen">
        <div className="loading-content">
          <Loader2 className="notes-loading-spinner" />
          <h2 className="loading-title">Carregando...</h2>
        </div>
      </div>
    }>
      <div className="app-container" data-theme={theme.mode}>
        {renderAppHeader()}
        {renderHeaderVisibilityToggle()}
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

        {settings.aiProactiveMode && settings.showProactiveSuggestionsWidget && (
          <ProactiveSuggestionsWidget 
            suggestions={proactiveSuggestions}
            settings={{
              fontSizePx: settings.fontSizePx || 14,
              cardOpacity: settings.cardOpacity || 95,
              reduceAnimations: settings.reduceAnimations || false,
              interfaceDensity: settings.interfaceDensity || 'normal',
              widgetButtonOpacity: settings.widgetButtonOpacity || 100,
              widgetButtonSize: settings.widgetButtonSize || 56
            }}
          />
        )}

        <ToastContainer />

        <UpdateNotification isDark={true} />
      </div>
    </React.Suspense>
  );
};

export default App;