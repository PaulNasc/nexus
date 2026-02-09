import React, { useEffect, useState } from 'react';
import { useNotifications } from './hooks/useNotifications';
import { useTheme } from './hooks/useTheme';
import { useTasks } from './contexts/TasksContext';
import { useI18n } from './hooks/useI18n';
import { useSettings } from './hooks/useSettings';
import { useCategories } from './contexts/CategoriesContext';
import { useProductivityInsights } from './hooks/useProductivityInsights';
import { TaskModal } from './components/TaskModal';
import { TaskList } from './components/TaskList';
import { Timer } from './components/Timer';
import { Reports } from './components/Reports';
import { Dashboard } from './components/Dashboard';
import { Settings } from './components/Settings';
import { Notes } from './components/Notes';
import { NoteModal } from './components/NoteModal';
import { useToast } from './components/Toast';
import { useAppearance } from './hooks/useAppearance';
import { Task, TaskStatus } from '../shared/types/task';
import { Screen } from '../shared/types/navigation';
import { ThemeConfig } from './types/theme';
import { UserSettings } from './hooks/useSettings';
import { Settings as SettingsIcon, Plus, LogOut } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import ProactiveSuggestionsWidget from './components/ProactiveSuggestionsWidget';
import UpdateNotification from './components/UpdateNotification';

// Import styles
import './styles/reset.css';
import './styles/tokens.css';
import './styles/variables.css';
import './styles/global.css';
import './styles/components.css';
import './styles/animations.css';

type AppScreen = Screen | 'timer' | 'reports' | 'notes';

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
  settingsVersion: number;
  navigation: AppNavigationState;
  theme: ThemeConfig;
  systemInfo: { platform: string; version: string; };
  goToDashboard: () => void;
  openTimer: () => void;
  openReports: () => void;
  openNotes: () => void;
  handleOpenSettings: () => void;
  handleOpenTaskModal: () => void;
  onSignOut: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  settings,
  settingsVersion,
  navigation,
  theme,
  systemInfo,
  goToDashboard,
  openTimer,
  openReports,
  openNotes,
  handleOpenSettings,
  handleOpenTaskModal,
  onSignOut
}) => {
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [dragOverTab, setDragOverTab] = useState<string | null>(null);
  const { updateTabOrder } = useSettings();

  const safeVersion = typeof systemInfo?.version === 'string'
    ? systemInfo.version
    : (systemInfo?.version ? String(systemInfo.version) : '');

  // Definir abas disponíveis com base nas configurações
  const availableTabs = [
    { key: 'dashboard', label: 'Dashboard', onClick: goToDashboard },
    ...(settings.showTimer ? [{ key: 'timer', label: 'Timer', onClick: openTimer }] : []),
    ...(settings.showNotes ? [{ key: 'notes', label: 'Notas', onClick: openNotes }] : []),
    ...(settings.showReports ? [{ key: 'reports', label: 'Relatórios', onClick: openReports }] : [])
  ];

  // Ordenar abas baseado na configuração
  const orderedTabs = settings.tabOrder
    ? settings.tabOrder
      .map((key: string) => availableTabs.find((tab: TabItem) => tab.key === key))
      .filter((tab): tab is TabItem => Boolean(tab))
      .concat(availableTabs.filter((tab: TabItem) => !settings.tabOrder.includes(tab.key)))
    : availableTabs;

  const handleDragStart = (e: React.DragEvent, tabKey: string) => {
    setDraggedTab(tabKey);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, tabKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTab(tabKey);
  };

  const handleDragEnd = () => {
    setDraggedTab(null);
    setDragOverTab(null);
  };

  const handleDrop = (e: React.DragEvent, targetTabKey: string) => {
    e.preventDefault();

    if (!draggedTab || draggedTab === targetTabKey) {
      setDraggedTab(null);
      setDragOverTab(null);
      return;
    }

    const currentOrder = orderedTabs.map((tab: TabItem) => tab.key);
    const draggedIndex = currentOrder.indexOf(draggedTab);
    const targetIndex = currentOrder.indexOf(targetTabKey);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const newOrder = [...currentOrder];
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedTab);

      updateTabOrder(newOrder);
    }

    setDraggedTab(null);
    setDragOverTab(null);
  };

  return (
    <header className="app-header" key={settingsVersion}>
      <div className="header-content">
        <div className="header-left">
          <h1 className="app-title">Nexus</h1>
          <span className="app-version">v{safeVersion || '1.0.0'}</span>
        </div>
        <div className="header-center">
          <nav className="navigation">
            {orderedTabs.map((tab: TabItem, index: number) => (
              <button
                key={tab.key}
                className={`nav-button ${navigation.currentScreen === tab.key ? 'active' : ''}`}
                onClick={tab.onClick}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, tab.key)}
                onDragOver={(e) => handleDragOver(e, tab.key)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, tab.key)}
                onDragLeave={(e) => e.preventDefault()}
                style={{
                  marginLeft: index > 0 ? 8 : 0,
                  background: 'none',
                  border: 'none',
                  cursor: 'grab',
                  color: theme.mode === 'dark' ? '#fff' : '#222',
                  fontSize: 20
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="header-right">
          {/* Theme toggle removed - only dark theme supported */}
          <button
            className="hover-button"
            onClick={handleOpenSettings}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: theme.mode === 'dark' ? '1px solid #2A2A2A' : '1px solid var(--color-border-primary)',
              borderRadius: 8,
              width: 36,
              height: 36,
              marginRight: 4,
              color: theme.mode === 'dark' ? '#FFFFFF' : '#1F2937'
            }}
            title="Configurações"
          >
            <SettingsIcon size={20} />
          </button>
          <button
            className="hover-button"
            onClick={onSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: theme.mode === 'dark' ? '1px solid #2A2A2A' : '1px solid var(--color-border-primary)',
              borderRadius: 8,
              width: 36,
              height: 36,
              marginRight: 8,
              color: theme.mode === 'dark' ? '#FFFFFF' : '#1F2937'
            }}
            title="Sair"
          >
            <LogOut size={18} />
          </button>
          <button
            className="add-task-button hover-button"
            onClick={handleOpenTaskModal}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={18} /> Nova Tarefa
          </button>
        </div>
      </div>
    </header>
  );
};

const App: React.FC<AppProps> = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [navigation, setNavigation] = useState<AppNavigationState>({
    currentScreen: 'dashboard'
  });
  const [systemInfo, setSystemInfo] = useState<{
    platform: string;
    version: string;
  }>({ platform: '', version: '' });
  const [dailyGoalReached, setDailyGoalReached] = useState(false);

  // Theme hook
  const { theme } = useTheme();
  useI18n();
  const { settings, settingsVersion } = useSettings();

  // Aplicar configurações de aparência
  useAppearance();

  // Hooks centralizados via Context (instância única)
  const { signOut } = useAuth();
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

  // Debug settings - only in development
  if (process.env.NODE_ENV === 'development') {
    console.log('App - settings:', settings);
  }

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

  // Force re-render when settings change for hot reload - optimized
  useEffect(() => {
    // Only log in development and avoid unnecessary re-renders
    if (process.env.NODE_ENV === 'development') {
      console.log('Settings changed, forcing re-render');
    }
  }, [settings, settingsVersion]); // Add settingsVersion to dependencies

  useEffect(() => {
    const loadApp = async () => {
      try {
        // Request notification permission
        await requestPermission();

        // Get system information
        if (window.electronAPI) {
          setSystemInfo({
            platform: window.electronAPI.system.platform,
            version: window.electronAPI.system.version
          });
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error loading app:', error);
        setIsLoading(false);
      }
    };

    loadApp();
  }, [requestPermission]);

  // Check for daily goal achievement
  useEffect(() => {
    if (stats && stats.concluido >= DAILY_GOAL && !dailyGoalReached) {
      setDailyGoalReached(true);
      showDailyGoal(stats.concluido, DAILY_GOAL);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats?.concluido, dailyGoalReached, showDailyGoal, DAILY_GOAL]);

  // Navegação
  const navigateTo = (screen: AppScreen, selectedList?: string) => {
    setNavigation({ currentScreen: screen, selectedList });
  };

  const goToDashboard = () => {
    navigateTo('dashboard');
  };

  const viewTaskList = (status: string) => {
    navigateTo('task-list', status);
  };

  const openTimer = () => {
    navigateTo('timer');
  };

  const openReports = () => {
    navigateTo('reports');
  };

  const openNotes = () => {
    setNavigation({ currentScreen: 'notes' });
  };

  const openNoteById = (noteId: number) => {
    setNavigation({ currentScreen: 'notes', selectedNoteId: noteId });
  };

  // Modal functions
  const handleOpenTaskModal = () => {
    setEditingTask(undefined);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setEditingTask(undefined);
  };

  // Settings functions
  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  // Task operations — TaskModal already handles create/update internally,
  // so this callback only shows the toast feedback.
  const handleSaveTask = async (_savedTask: Task) => {
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

    await updateTask(taskId, { status: toTaskStatus(newStatus) });

    const statusNames = {
      backlog: 'Backlog',
      esta_semana: 'Esta Semana',
      hoje: 'Hoje',
      concluido: 'Concluído'
    };

    showToast(`Tarefa movida para ${statusNames[newStatus as keyof typeof statusNames]}!`, 'info');

    if (newStatus === 'concluido' && task) {
      showTaskComplete(task.title);
    }
  };

  // Habilitar DevTools automaticamente em dev
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && window.electronAPI?.openDevTools) {
      window.electronAPI.openDevTools();
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') {
        if (window.electronAPI?.toggleDevTools) {
          window.electronAPI.toggleDevTools();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  if (isLoading || tasksLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-spinner" />
          <h2 className="loading-title">Carregando Nexus...</h2>
          <p className="loading-subtitle">Preparando seu ambiente de produtividade</p>
        </div>
      </div>
    );
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
      tasksList = tasks.filter((task: Task) => task.status === navigation.selectedList);
    }

    return (
      <div className="app-container" data-theme={theme.mode}>
        <AppHeader
          key={settingsVersion}
          settings={settings}
          settingsVersion={settingsVersion}
          navigation={navigation}
          theme={theme}
          systemInfo={systemInfo}
          goToDashboard={goToDashboard}
          openTimer={openTimer}
          openReports={openReports}
          openNotes={openNotes}
          handleOpenSettings={handleOpenSettings}
          handleOpenTaskModal={handleOpenTaskModal}
          onSignOut={signOut}
        />

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
    );
  }

  // Dashboard principal com abas para Timer e Reports
  return (
    <div className="app-container" data-theme={theme.mode}>
      <AppHeader
        key={settingsVersion}
        settings={settings}
        settingsVersion={settingsVersion}
        navigation={navigation}
        theme={theme}
        systemInfo={systemInfo}
        goToDashboard={goToDashboard}
        openTimer={openTimer}
        openReports={openReports}
        openNotes={openNotes}
        handleOpenSettings={handleOpenSettings}
        handleOpenTaskModal={handleOpenTaskModal}
        onSignOut={signOut}
      />

      <main className="app-main">
        {navigation.currentScreen === 'dashboard' && (
          <Dashboard
            key={settingsVersion}
            onViewTaskList={viewTaskList}
            onOpenTaskModal={handleOpenTaskModal}
            onOpenTimer={settings.showTimer ? openTimer : undefined}
            onOpenReports={settings.showReports ? openReports : undefined}
            showQuickActions={settings.showQuickActions}
            showTaskCounters={settings.showTaskCounters}
          />
        )}
        {navigation.currentScreen === 'timer' && settings.showTimer && (
          <div style={{ padding: '24px' }}>
            <Timer onBack={goToDashboard} />
          </div>
        )}
        {navigation.currentScreen === 'reports' && settings.showReports && (
          <div style={{ padding: '24px' }}>
            <Reports onClose={goToDashboard} onBack={goToDashboard} />
          </div>
        )}
        {navigation.currentScreen === 'notes' && (
          <Notes onBack={goToDashboard} initialNoteId={navigation.selectedNoteId} />
        )}

        <NoteModal
          isOpen={isNoteModalOpen}
          onClose={() => setIsNoteModalOpen(false)}
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
  );
};

export default App;