import { useState, useEffect, useCallback, useRef } from 'react';
import { TimerSession, TimerSettings, TimerStats, TimerType, TimerStatus } from '../../shared/types/timer';
import { useNotifications } from './useNotifications';

const DEFAULT_SETTINGS: TimerSettings = {
  workDuration: 25 * 60, // 25 minutos
  shortBreakDuration: 5 * 60, // 5 minutos
  longBreakDuration: 15 * 60, // 15 minutos
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartWork: false,
  soundEnabled: true,
  notificationsEnabled: true,
};

const SETTINGS_STORAGE_KEY = 'nexus-timer-settings';
const STATS_STORAGE_KEY = 'nexus-timer-stats';
const SESSION_STORAGE_KEY = 'nexus-current-session';
const LEGACY_SETTINGS_STORAGE_KEY = 'krigzis-timer-settings';
const LEGACY_STATS_STORAGE_KEY = 'krigzis-timer-stats';
const LEGACY_SESSION_STORAGE_KEY = 'krigzis-current-session';

export const useTimer = () => {
  const [currentSession, setCurrentSession] = useState<TimerSession | null>(null);
  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<TimerStats>({
    totalSessions: 0,
    completedSessions: 0,
    totalFocusTime: 0,
    todayFocusTime: 0,
    weekFocusTime: 0,
    currentStreak: 0,
    bestStreak: 0,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [completedWorkSessions, setCompletedWorkSessions] = useState(0);

  // Hook for notifications
  const { showTimerComplete, requestPermission } = useNotifications();

  // Load data from localStorage
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY) || localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY);

      if (savedSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
        if (localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY)) {
          localStorage.setItem(SETTINGS_STORAGE_KEY, savedSettings);
          localStorage.removeItem(LEGACY_SETTINGS_STORAGE_KEY);
        }
      }

      const savedStats = localStorage.getItem(STATS_STORAGE_KEY) || localStorage.getItem(LEGACY_STATS_STORAGE_KEY);

      if (savedStats) {
        setStats(JSON.parse(savedStats));
        if (localStorage.getItem(LEGACY_STATS_STORAGE_KEY)) {
          localStorage.setItem(STATS_STORAGE_KEY, savedStats);
          localStorage.removeItem(LEGACY_STATS_STORAGE_KEY);
        }
      }

      const savedSession = localStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(LEGACY_SESSION_STORAGE_KEY);

      if (savedSession) {
        const session = JSON.parse(savedSession);
        if (session.status !== 'completed') {
          setCurrentSession(session);
        }
        if (localStorage.getItem(LEGACY_SESSION_STORAGE_KEY)) {
          localStorage.setItem(SESSION_STORAGE_KEY, savedSession);
          localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading timer data:', error);
    }
  }, []);

  // Request notification permission when notifications are enabled
  useEffect(() => {
    if (settings.notificationsEnabled) {
      requestPermission();
    }
  }, [settings.notificationsEnabled, requestPermission]);

  // Save data to localStorage
  useEffect(() => {
    if (currentSession) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentSession));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [currentSession]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  }, [stats]);

  const generateSessionId = useCallback(() => {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const getDurationForType = (type: TimerType): number => {
    switch (type) {
      case 'work': return settings.workDuration;
      case 'short-break': return settings.shortBreakDuration;
      case 'long-break': return settings.longBreakDuration;
      default: return settings.workDuration;
    }
  };

  const startSession = useCallback((type: TimerType, taskId?: string) => {
    const duration = getDurationForType(type);
    
    const newSession: TimerSession = {
      id: generateSessionId(),
      type,
      duration,
      remainingTime: duration,
      status: 'running',
      startedAt: new Date().toISOString(),
      taskId,
    };

    setCurrentSession(newSession);
  }, [settings, generateSessionId]);

  const pauseSession = useCallback(() => {
    setCurrentSession(prev => {
      if (!prev || prev.status !== 'running') return prev;
      
      return {
        ...prev,
        status: 'paused',
        pausedAt: new Date().toISOString(),
      };
    });
  }, []);

  const resumeSession = useCallback(() => {
    setCurrentSession(prev => {
      if (!prev || prev.status !== 'paused') return prev;
      
      return {
        ...prev,
        status: 'running',
        pausedAt: undefined,
      };
    });
  }, []);

  const stopSession = useCallback(() => {
    setCurrentSession(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const formatDuration = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }, []);

  // Timer logic
  useEffect(() => {
    if (currentSession?.status === 'running') {
      intervalRef.current = setInterval(() => {
        setCurrentSession(prev => {
          if (!prev || prev.remainingTime <= 0) {
            return prev;
          }

          const newRemainingTime = prev.remainingTime - 1;
          
          if (newRemainingTime <= 0) {
            // Timer completed - show notification
            if (settings.notificationsEnabled) {
              const duration = formatDuration(prev.duration);
              const notificationType = prev.type === 'work' ? 'work' : 'break';
              showTimerComplete(notificationType, duration);
            }

            // Update stats
            setStats(prevStats => {
              const newStats = { ...prevStats };
              
              if (prev.type === 'work') {
                newStats.completedSessions += 1;
                newStats.totalFocusTime += prev.duration;
                newStats.todayFocusTime += prev.duration;
                newStats.weekFocusTime += prev.duration;
                newStats.currentStreak += 1;
                
                if (newStats.currentStreak > newStats.bestStreak) {
                  newStats.bestStreak = newStats.currentStreak;
                }
              }
              
              newStats.totalSessions += 1;
              return newStats;
            });

            return {
              ...prev,
              remainingTime: 0,
              status: 'completed' as TimerStatus,
              completedAt: new Date().toISOString(),
            };
          }

          return {
            ...prev,
            remainingTime: newRemainingTime,
          };
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentSession?.status, settings.notificationsEnabled, showTimerComplete, formatDuration]);

  const updateSettings = useCallback((newSettings: Partial<TimerSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  return {
    currentSession,
    settings,
    stats,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    updateSettings,
    formatTime,
    formatDuration,
    getDurationForType,
  };
}; 