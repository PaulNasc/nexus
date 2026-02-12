import React, { useState, useEffect, useContext, createContext, useRef } from 'react';
import { Language } from './useI18n';
import { supabase } from '../lib/supabase';

export interface TaskStatusCard {
  id: string;
  key: string;
  title: string;
  description: string;
  accentColor: string;
  icon: string;
  enabled: boolean;
  order: number;
}

export interface QuickAction {
  key: string;
  enabled: boolean;
  order: number;
}

export interface UserSettings {
  // Personal
  userName: string;
  language: Language;

  // Appearance
  theme: 'dark' | 'light' | 'system';

  // System
  startWithOS: boolean;
  minimizeToTray: boolean;

  // Notifications
  showNotifications: boolean;
  playSound: boolean;
  notifyTaskReminders: boolean;
  notifyTodayTasks: boolean;
  notifyOverdueTasks: boolean;
  notifyProductivityInsights: boolean;

  // Productivity
  dailyGoal: number;
  autoSave: boolean;
  autoBackup: boolean;
  backupFrequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  backupFolder?: string;
  keepBackups: number;
  cloudSync: boolean;

  // Accessibility  
  showTimer: boolean;
  showReports: boolean;
  showNotes: boolean;
  showQuickActions: boolean;
  highContrastMode: boolean;
  largeFontMode: boolean;
  showTaskCounters: boolean;
  keyboardNavigation?: boolean;
  focusIndicators?: boolean;

  // Appearance
  fontSizePx?: number;
  interfaceDensity?: 'compact' | 'normal' | 'comfortable';
  reduceAnimations?: boolean;
  cardOpacity?: number;

  // Data Management
  dataPath?: string;
  storageType: 'localStorage' | 'database';
  databaseLocation?: string;
  storageMode: 'cloud' | 'local' | 'hybrid';

  // Productivity Settings
  showProductivityTips: boolean;
  showProgressInsights: boolean;
  showProactiveSuggestionsWidget: boolean;
  widgetButtonOpacity: number;
  widgetButtonSize: number;

  // AI workflow
  aiResponseMode: 'detailed' | 'balanced' | 'concise';
  aiProactiveMode: boolean;
  aiCanCreateTasks: boolean;
  aiCanEditTasks: boolean;
  aiCanDeleteTasks: boolean;
  aiCanManageNotes: boolean;

  // Task Cards
  taskCards: TaskStatusCard[];

  // Quick Actions
  quickActions: QuickAction[];

  // Tab ordering
  tabOrder: string[];
}

export interface SystemInfo {
  machineId: string;
  installDate: string;
  version: string;
  lastUpdate: string;
}

export interface SessionInfo {
  isHost: boolean;
  isConnected: boolean;
  sessionId?: string;
  hostId?: string;
}

const DEFAULT_TASK_CARDS: TaskStatusCard[] = [
  {
    id: 'backlog',
    key: 'backlog',
    title: 'Backlog',
    description: 'Tarefas planejadas',
    accentColor: '#6B7280',
    icon: 'ClipboardList',
    enabled: true,
    order: 1
  },
  {
    id: 'esta_semana',
    key: 'esta_semana',
    title: 'Esta Semana',
    description: 'Foco da semana',
    accentColor: '#3B82F6',
    icon: 'CalendarDays',
    enabled: true,
    order: 2
  },
  {
    id: 'hoje',
    key: 'hoje',
    title: 'Hoje',
    description: 'Prioridade máxima',
    accentColor: '#F59E0B',
    icon: 'Zap',
    enabled: true,
    order: 3
  },
  {
    id: 'concluido',
    key: 'concluido',
    title: 'Concluído',
    description: 'Tarefas finalizadas',
    accentColor: '#10B981',
    icon: 'CheckCircle',
    enabled: true,
    order: 4
  }
];

const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  { key: 'timer', enabled: true, order: 1 },
  { key: 'reports', enabled: true, order: 2 },
  { key: 'newTask', enabled: true, order: 3 },
  { key: 'categories', enabled: false, order: 4 },
  { key: 'backup', enabled: false, order: 5 },
  { key: 'import', enabled: false, order: 6 },
  { key: 'clearData', enabled: false, order: 7 },
  { key: 'profile', enabled: false, order: 8 },
  { key: 'share', enabled: false, order: 9 },
  { key: 'logout', enabled: false, order: 10 },
  { key: 'notes', enabled: true, order: 11 },
  { key: 'newNote', enabled: false, order: 12 },
  { key: 'settings', enabled: false, order: 13 },
];

const DEFAULT_SETTINGS: UserSettings = {
  userName: '',
  language: 'pt-BR',
  theme: 'dark',
  startWithOS: false,
  minimizeToTray: true,
  showNotifications: true,
  playSound: true,
  notifyTaskReminders: true,
  notifyTodayTasks: true,
  notifyOverdueTasks: true,
  notifyProductivityInsights: true,
  dailyGoal: 5,
  autoSave: true,
  autoBackup: true,
  backupFrequency: 'daily',
  backupFolder: undefined,
  keepBackups: 10,
  cloudSync: false,
  showTimer: true,
  showReports: true,
  showNotes: true,
  showQuickActions: true,
  highContrastMode: false,
  largeFontMode: false,
  showTaskCounters: true,

  // Data Management
  storageType: 'localStorage',
  storageMode: 'cloud' as const,

  // Appearance Settings
  fontSizePx: 14,
  interfaceDensity: 'normal',
  reduceAnimations: false,
  cardOpacity: 95,

  // Productivity Settings
  showProductivityTips: true,
  showProgressInsights: true,
  showProactiveSuggestionsWidget: true,
  widgetButtonOpacity: 100,
  widgetButtonSize: 56,

  // AI workflow
  aiResponseMode: 'balanced',
  aiProactiveMode: true,
  aiCanCreateTasks: true,
  aiCanEditTasks: true,
  aiCanDeleteTasks: false,
  aiCanManageNotes: true,

  taskCards: DEFAULT_TASK_CARDS,
  quickActions: DEFAULT_QUICK_ACTIONS,
  tabOrder: ['dashboard', 'notes', 'reports'], // Ordem padrão das abas
};

const SETTINGS_STORAGE_KEY = 'nexus-user-settings';
const SYSTEM_INFO_STORAGE_KEY = 'nexus-system-info';
const SESSION_INFO_STORAGE_KEY = 'nexus-session-info';
const LEGACY_SETTINGS_STORAGE_KEY = 'krigzis-user-settings';
const LEGACY_SYSTEM_INFO_STORAGE_KEY = 'krigzis-system-info';
const LEGACY_SESSION_INFO_STORAGE_KEY = 'krigzis-session-info';

// Generate unique machine ID
const generateMachineId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const navigatorInfo = navigator.userAgent.replace(/\s+/g, '').substring(0, 10);
  const screenInfo = `${screen.width}x${screen.height}`;

  const combined = `${timestamp}-${randomPart}-${navigatorInfo}-${screenInfo}`;

  // Create a simple hash
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return `KRG-${Math.abs(hash).toString(36).toUpperCase().padStart(8, '0')}`;
};

interface SettingsContextType {
  settings: UserSettings;
  settingsVersion: number;
  systemInfo: SystemInfo | null;
  sessionInfo: SessionInfo;
  isLoading: boolean;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  resetSettings: () => void;
  clearAllData: () => Promise<boolean>;
  prepareForDistribution: () => boolean;
  updateSessionInfo: (newSessionInfo: Partial<SessionInfo>) => void;
  exportSettings: () => string;
  importSettings: (jsonData: string) => boolean;
  getGreeting: () => string;
  updateTaskCard: (cardId: string, updates: Partial<TaskStatusCard>) => void;
  addTaskCard: (newCard: Omit<TaskStatusCard, 'id' | 'order'>) => void;
  removeTaskCard: (cardId: string) => void;
  reorderTaskCards: (cardIds: string[]) => void;
  resetTaskCards: () => void;
  getEnabledTaskCards: () => TaskStatusCard[];
  getEnabledQuickActions: () => QuickAction[];
  updateQuickActions: (actions: QuickAction[]) => void;
  enableQuickAction: (key: string) => void;
  disableQuickAction: (key: string) => void;
  reorderQuickActions: (orderedKeys: string[]) => void;
  updateTabOrder: (newOrder: string[]) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [settingsVersion, setSettingsVersion] = useState(0);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({
    isHost: true,
    isConnected: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync settings to Supabase (debounced)
  const syncSettingsToSupabase = (settingsToSync: UserSettings) => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // not logged in, skip sync
        await supabase.from('user_settings').upsert({
          user_id: user.id,
          settings: settingsToSync,
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Failed to sync settings to Supabase:', err);
      }
    }, 1500);
  };

  // Load settings from Supabase on mount (merge with local)
  const loadSettingsFromSupabase = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Always sync display_name from Supabase auth profile into userName
      const profileName = user.user_metadata?.display_name
        || user.user_metadata?.full_name
        || user.user_metadata?.name
        || '';

      const { data } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single();
      if (data?.settings && typeof data.settings === 'object') {
        const remoteSettings = data.settings as Partial<UserSettings>;
        // Merge: remote wins for non-empty values
        setSettings(prev => {
          const merged = { ...prev, ...remoteSettings };
          // If userName is empty, use the display_name from auth profile
          if (!merged.userName && profileName) {
            merged.userName = profileName;
          }
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
          return merged;
        });
      } else if (profileName) {
        // No remote settings yet — at least set userName from auth profile
        setSettings(prev => {
          if (!prev.userName) {
            const updated = { ...prev, userName: profileName };
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
            return updated;
          }
          return prev;
        });
      }
    } catch (err) {
      console.warn('Failed to load settings from Supabase:', err);
    }
  };

  // Load settings and system info on mount
  useEffect(() => {
    loadSettings();
    loadSystemInfo();
    loadSessionInfo();
    // After local load, try to merge from Supabase
    loadSettingsFromSupabase();
  }, []);

  const loadSettings = () => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY) || localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);

        // Migração: Adicionar novas ações rápidas se não existirem
        const migratedQuickActions = migrateQuickActions(parsedSettings.quickActions || []);

        const updatedSettings = {
          ...DEFAULT_SETTINGS,
          ...parsedSettings,
          quickActions: migratedQuickActions
        };

        if (updatedSettings.backupFrequency === 'monthly') {
          updatedSettings.backupFrequency = 'weekly';
        }

        setSettings(updatedSettings);

        // Salvar as configurações migradas
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings));
        localStorage.removeItem(LEGACY_SETTINGS_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para migrar ações rápidas
  const migrateQuickActions = (existingActions: QuickAction[]): QuickAction[] => {
    const allNewActions = DEFAULT_QUICK_ACTIONS;
    const existingKeys = existingActions.map(action => action.key);

    // Manter ações existentes
    const migratedActions = [...existingActions];

    // Adicionar novas ações que não existem
    allNewActions.forEach(newAction => {
      if (!existingKeys.includes(newAction.key)) {
        migratedActions.push(newAction);
      }
    });

    // Reordenar para manter consistência
    return migratedActions.sort((a, b) => a.order - b.order);
  };

  const loadSystemInfo = async () => {
    // Fetch real version from electron-updater (app.getVersion())
    let appVersion = '1.0.0';
    let hwMachineId = '';
    try {
      if (window.electronAPI?.updater?.getVersion) {
        appVersion = await window.electronAPI.updater.getVersion() || appVersion;
      }
      if (window.electronAPI?.system?.getMachineId) {
        hwMachineId = await window.electronAPI.system.getMachineId();
      }
    } catch { /* fallback */ }

    try {
      const storedSystemInfo = localStorage.getItem(SYSTEM_INFO_STORAGE_KEY) || localStorage.getItem(LEGACY_SYSTEM_INFO_STORAGE_KEY);

      if (!storedSystemInfo) {
        // First time setup - generate system info
        const newSystemInfo: SystemInfo = {
          machineId: hwMachineId || generateMachineId(),
          installDate: new Date().toISOString(),
          version: appVersion,
          lastUpdate: new Date().toISOString(),
        };

        localStorage.setItem(SYSTEM_INFO_STORAGE_KEY, JSON.stringify(newSystemInfo));
        setSystemInfo(newSystemInfo);
      } else {
        const parsedSystemInfo = JSON.parse(storedSystemInfo);
        // Always update version and machineId (upgrade from random to hardware-based)
        parsedSystemInfo.version = appVersion;
        if (hwMachineId) {
          parsedSystemInfo.machineId = hwMachineId;
        }
        parsedSystemInfo.lastUpdate = new Date().toISOString();
        localStorage.setItem(SYSTEM_INFO_STORAGE_KEY, JSON.stringify(parsedSystemInfo));
        localStorage.removeItem(LEGACY_SYSTEM_INFO_STORAGE_KEY);

        setSystemInfo(parsedSystemInfo);
      }
    } catch (error) {
      console.error('Error loading system info:', error);
      // Fallback system info
      const fallbackSystemInfo: SystemInfo = {
        machineId: hwMachineId || generateMachineId(),
        installDate: new Date().toISOString(),
        version: appVersion,
        lastUpdate: new Date().toISOString(),
      };
      setSystemInfo(fallbackSystemInfo);
    }
  };

  const loadSessionInfo = () => {
    try {
      const stored = localStorage.getItem(SESSION_INFO_STORAGE_KEY) || localStorage.getItem(LEGACY_SESSION_INFO_STORAGE_KEY);

      if (stored) {
        const parsedSessionInfo = JSON.parse(stored);
        setSessionInfo(parsedSessionInfo);
        localStorage.setItem(SESSION_INFO_STORAGE_KEY, JSON.stringify(parsedSessionInfo));
        localStorage.removeItem(LEGACY_SESSION_INFO_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error loading session info:', error);
    }
  };

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    setSettingsVersion(v => v + 1);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
    // Sync to Supabase in background
    syncSettingsToSupabase(updatedSettings);

    // If userName changed, also update profiles.display_name so notes/tasks/logs reflect it
    if (newSettings.userName !== undefined && newSettings.userName !== settings.userName) {
      (async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          await supabase.from('profiles').upsert({
            id: user.id,
            display_name: newSettings.userName,
            updated_at: new Date().toISOString(),
          });
        } catch (err) {
          console.warn('Failed to sync display_name to profiles:', err);
        }
      })();
    }
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch (error) {
      console.error('Error resetting settings:', error);
    }
  };

  const clearAllData = async (): Promise<boolean> => {
    try {
      // Clear localStorage data
      const keysToKeep = [SYSTEM_INFO_STORAGE_KEY]; // Keep system info (machine ID)
      const allKeys = Object.keys(localStorage);

      allKeys.forEach(key => {
        if ((key.startsWith('krigzis-') || key.startsWith('nexus-')) && !keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });

      // Reset to default settings
      setSettings(DEFAULT_SETTINGS);
      setSessionInfo({ isHost: true, isConnected: false });

      // Clear Supabase data for current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('note_task_links').delete().eq('user_id', user.id);
        await supabase.from('tasks').delete().eq('user_id', user.id);
        await supabase.from('notes').delete().eq('user_id', user.id);
        await supabase.from('categories').delete().eq('user_id', user.id).eq('is_system', false);
        await supabase.from('timer_stats').delete().eq('user_id', user.id);
      }

      // Save default settings
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));

      return true;
    } catch (error) {
      console.error('Error clearing all data:', error);
      return false;
    }
  };

  // Função para preparar distribuição (zerar dados do usuário)
  const prepareForDistribution = (): boolean => {
    try {
      // Lista de chaves que devem ser mantidas na distribuição
      const systemKeys = [SYSTEM_INFO_STORAGE_KEY, LEGACY_SYSTEM_INFO_STORAGE_KEY];

      // Limpar todos os dados do usuário, mantendo apenas configurações do sistema
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if ((key.startsWith('krigzis-') || key.startsWith('nexus-')) && !systemKeys.includes(key)) {
          localStorage.removeItem(key);
        }
      });

      // Resetar configurações para padrão
      const cleanSettings: UserSettings = {
        ...DEFAULT_SETTINGS,
        userName: '', // Usuário define seu nome
        storageType: 'localStorage' as const, // Padrão para novos usuários
        dataPath: undefined, // Usuário escolhe local
        databaseLocation: undefined
      };

      setSettings(cleanSettings);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(cleanSettings));

      return true;
    } catch (error) {
      console.error('Error preparing for distribution:', error);
      return false;
    }
  };

  const updateSessionInfo = (newSessionInfo: Partial<SessionInfo>) => {
    const updatedSessionInfo = { ...sessionInfo, ...newSessionInfo };
    setSessionInfo(updatedSessionInfo);

    try {
      localStorage.setItem(SESSION_INFO_STORAGE_KEY, JSON.stringify(updatedSessionInfo));
    } catch (error) {
      console.error('Error saving session info:', error);
    }
  };

  const exportSettings = (): string => {
    const exportData = {
      settings,
      systemInfo,
      sessionInfo,
      exportDate: new Date().toISOString(),
    };
    return JSON.stringify(exportData, null, 2);
  };

  const importSettings = (jsonData: string): boolean => {
    try {
      const importData = JSON.parse(jsonData);
      if (importData.settings) {
        updateSettings(importData.settings);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error importing settings:', error);
      return false;
    }
  };

  // Dynamic greeting based on time and language
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    let greetingKey = 'greeting.morning';

    if (hour >= 12 && hour < 18) {
      greetingKey = 'greeting.afternoon';
    } else if (hour >= 18) {
      greetingKey = 'greeting.evening';
    }

    return greetingKey;
  };

  // Task Cards Management
  const updateTaskCard = (cardId: string, updates: Partial<TaskStatusCard>) => {
    const updatedCards = settings.taskCards.map(card =>
      card.id === cardId ? { ...card, ...updates } : card
    );
    updateSettings({ taskCards: updatedCards });
  };

  const addTaskCard = (newCard: Omit<TaskStatusCard, 'id' | 'order'>) => {
    const maxOrder = Math.max(...settings.taskCards.map(c => c.order), 0);
    const cardWithId: TaskStatusCard = {
      ...newCard,
      id: `custom-${Date.now()}`,
      order: maxOrder + 1
    };
    updateSettings({ taskCards: [...settings.taskCards, cardWithId] });
  };

  const removeTaskCard = (cardId: string) => {
    const updatedCards = settings.taskCards.filter(card => card.id !== cardId);
    updateSettings({ taskCards: updatedCards });
  };

  const reorderTaskCards = (cardIds: string[]) => {
    const reorderedCards = cardIds.map((id, index) => {
      const card = settings.taskCards.find(c => c.id === id);
      return card ? { ...card, order: index + 1 } : null;
    }).filter(Boolean) as TaskStatusCard[];

    updateSettings({ taskCards: reorderedCards });
  };

  const resetTaskCards = () => {
    updateSettings({ taskCards: DEFAULT_TASK_CARDS });
  };

  const getEnabledTaskCards = () => {
    return settings.taskCards
      .filter(card => card.enabled)
      .sort((a, b) => a.order - b.order);
  };

  // Quick Actions Management
  const getEnabledQuickActions = () => {
    return settings.quickActions
      .filter(a => a.enabled)
      .sort((a, b) => a.order - b.order);
  };

  const updateQuickActions = (actions: QuickAction[]) => {
    updateSettings({ quickActions: actions });
  };

  const enableQuickAction = (key: string) => {
    const updated = settings.quickActions.map(a =>
      a.key === key ? { ...a, enabled: true } : a
    );
    updateQuickActions(updated);
  };

  const disableQuickAction = (key: string) => {
    const updated = settings.quickActions.map(a =>
      a.key === key ? { ...a, enabled: false } : a
    );
    updateQuickActions(updated);
  };

  const reorderQuickActions = (orderedKeys: string[]) => {
    const updated = [...settings.quickActions];
    orderedKeys.forEach((key, idx) => {
      const action = updated.find(a => a.key === key);
      if (action) action.order = idx + 1;
    });
    updateQuickActions(updated);
  };

  const updateTabOrder = (newOrder: string[]) => {
    updateSettings({ tabOrder: newOrder });
  };

  const contextValue: SettingsContextType = {
    settings,
    settingsVersion,
    systemInfo,
    sessionInfo,
    isLoading,
    updateSettings,
    resetSettings,
    clearAllData,
    prepareForDistribution,
    updateSessionInfo,
    exportSettings,
    importSettings,
    getGreeting,
    updateTaskCard,
    addTaskCard,
    removeTaskCard,
    reorderTaskCards,
    resetTaskCards,
    getEnabledTaskCards,
    getEnabledQuickActions,
    updateQuickActions,
    enableQuickAction,
    disableQuickAction,
    reorderQuickActions,
    updateTabOrder,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}; 