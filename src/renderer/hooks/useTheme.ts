import { useEffect, useRef, useState } from 'react';
import { ThemeConfig, ThemeContextType, ThemeColors } from '../types/theme';

const THEME_SYNC_EVENT = 'nexus-theme-sync';

type ThemeSyncPayload = {
  sourceId: string;
  theme: ThemeConfig;
};

const isThemeConfig = (value: unknown): value is ThemeConfig => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as ThemeConfig;
  return candidate.mode !== undefined;
};

const areThemesEqual = (left: ThemeConfig, right: ThemeConfig): boolean => {
  return (
    left.mode === right.mode
    && left.primaryColor === right.primaryColor
    && left.secondaryColor === right.secondaryColor
    && left.accentColor === right.accentColor
    && left.borderRadius === right.borderRadius
    && left.fontSize === right.fontSize
    && left.spacing === right.spacing
  );
};

const normalizeTheme = (theme: ThemeConfig): ThemeConfig => {
  if (theme.mode === 'system') {
    return {
      ...theme,
      mode: getSystemDark() ? 'dark' : 'light',
    };
  }
  return theme;
};

const loadInitialTheme = (storageKey: string): ThemeConfig => {
  try {
    const savedTheme = localStorage.getItem(storageKey) || localStorage.getItem('krigzis-theme');
    if (!savedTheme) return normalizeTheme(defaultTheme);

    const parsed = JSON.parse(savedTheme) as ThemeConfig;
    const normalized = normalizeTheme(parsed);
    localStorage.setItem(storageKey, JSON.stringify(normalized));
    localStorage.removeItem('krigzis-theme');
    return normalized;
  } catch {
    return normalizeTheme(defaultTheme);
  }
};

const getSystemDark = (): boolean => {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return true;
  }
};

// Default theme configuration
const defaultTheme: ThemeConfig = {
  mode: 'dark',
  primaryColor: '#00D4AA',
  secondaryColor: '#7B3FF2',
  accentColor: '#33DCBB',
  borderRadius: 'lg',
  fontSize: 'base',
  spacing: 'normal',
};

export const useTheme = (storageKey = 'nexus-theme'): ThemeContextType => {
  const [theme, setThemeState] = useState<ThemeConfig>(() => loadInitialTheme(storageKey));
  const [isSystemDark, setIsSystemDark] = useState<boolean>(getSystemDark());
  const instanceIdRef = useRef(`theme-${Math.random().toString(36).slice(2)}`);
  const skipBroadcastRef = useRef(false);

  const broadcastTheme = (nextTheme: ThemeConfig) => {
    try {
      const payload: ThemeSyncPayload = {
        sourceId: instanceIdRef.current,
        theme: nextTheme,
      };
      window.dispatchEvent(new CustomEvent<ThemeSyncPayload>(THEME_SYNC_EVENT, { detail: payload }));
    } catch {
      // no-op
    }
  };

  // Keep localStorage in sync with current theme state
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(theme));
    } catch (error) {
      console.error('Failed to save theme to localStorage:', error);
    }
  }, [theme, storageKey]);

  // Broadcast theme changes after commit, never during render/state reducer phase
  useEffect(() => {
    if (skipBroadcastRef.current) {
      skipBroadcastRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      broadcastTheme(theme);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [theme]);

  // Sync all useTheme hook instances in the same renderer process
  useEffect(() => {
    const onThemeSync = (event: Event) => {
      const customEvent = event as CustomEvent<ThemeConfig | ThemeSyncPayload>;
      const detail = customEvent.detail;
      const payload = isThemeConfig(detail)
        ? { theme: detail, sourceId: '' }
        : detail;

      if (!payload || payload.sourceId === instanceIdRef.current) {
        return;
      }

      const nextTheme = normalizeTheme(payload.theme);
      if (isThemeConfig(nextTheme)) {
        skipBroadcastRef.current = true;
        setThemeState((prev) => (areThemesEqual(prev, nextTheme) ? prev : nextTheme));
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) return;
      try {
        const parsed = normalizeTheme(JSON.parse(event.newValue) as ThemeConfig);
        if (isThemeConfig(parsed)) {
          skipBroadcastRef.current = true;
          setThemeState((prev) => (areThemesEqual(prev, parsed) ? prev : parsed));
        }
      } catch {
        // ignore malformed payload
      }
    };

    window.addEventListener(THEME_SYNC_EVENT, onThemeSync as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(THEME_SYNC_EVENT, onThemeSync as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, [storageKey]);

  const effectiveMode: 'light' | 'dark' = theme.mode === 'dark' ? 'dark' : 'light';

  // Track system theme changes
  useEffect(() => {
    let mediaQuery: MediaQueryList | null = null;
    const onChange = (event: MediaQueryListEvent) => setIsSystemDark(event.matches);

    try {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setIsSystemDark(mediaQuery.matches);
      mediaQuery.addEventListener('change', onChange);
    } catch {
      // Ignore browser incompatibility and keep fallback value
    }

    return () => {
      mediaQuery?.removeEventListener('change', onChange);
    };
  }, []);

  // Apply effective theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', effectiveMode);
    root.style.colorScheme = effectiveMode;
  }, [effectiveMode]);

  // Get current colors based on effective mode
  const getColors = (): ThemeColors => {
    if (effectiveMode === 'light') {
      return {
        bgPrimary: '#FFFFFF',
        bgSecondary: '#F9FAFB',
        bgTertiary: '#EEF2F7',
        surfacePrimary: '#FFFFFF',
        surfaceSecondary: '#F4F6FA',
        surfaceTertiary: '#E9EDF4',
        surfaceHover: '#E5EAF3',
        surfaceActive: '#D7DFEC',
        primary50: '#ECFDF5',
        primary100: '#D1FAE5',
        primary200: '#A7F3D0',
        primary300: '#6EE7B7',
        primary400: '#33DCBB',
        primary500: theme.primaryColor,
        primary600: '#00B895',
        primary700: '#009B7F',
        primary800: '#007D69',
        primary900: '#006654',
        secondary50: '#FAF5FF',
        secondary100: '#F3E8FF',
        secondary200: '#E9D5FF',
        secondary300: '#D8B4FE',
        secondary400: '#9563F5',
        secondary500: theme.secondaryColor,
        secondary600: '#6A35D9',
        secondary700: '#5B2BC0',
        secondary800: '#4C1D95',
        secondary900: '#3B1A7A',
        textPrimary: '#0F172A',
        textSecondary: '#334155',
        textTertiary: '#64748B',
        textPlaceholder: '#94A3B8',
        textDisabled: '#CBD5E1',
        textInverse: '#FFFFFF',
        borderPrimary: '#D7DEE9',
        borderSecondary: '#C5CFDE',
        borderTertiary: '#94A3B8',
        borderFocus: theme.primaryColor,
        borderError: '#EF4444',
        borderSuccess: '#10B981',
        success500: '#10B981',
        success600: '#059669',
        warning500: '#F59E0B',
        warning600: '#D97706',
        error500: '#EF4444',
        error600: '#DC2626',
        info500: '#3B82F6',
        info600: '#2563EB',
      };
    }

    return {
      bgPrimary: '#0A0A0A',
      bgSecondary: '#1A1A1A',
      bgTertiary: '#2A2A2A',
      surfacePrimary: '#1E1E1E',
      surfaceSecondary: '#2E2E2E',
      surfaceTertiary: '#3E3E3E',
      surfaceHover: '#4E4E4E',
      surfaceActive: '#5E5E5E',
      primary50: '#ECFDF5',
      primary100: '#D1FAE5',
      primary200: '#A7F3D0',
      primary300: '#6EE7B7',
      primary400: '#33DCBB',
      primary500: theme.primaryColor,
      primary600: '#00B895',
      primary700: '#009B7F',
      primary800: '#007D69',
      primary900: '#006654',
      secondary50: '#FAF5FF',
      secondary100: '#F3E8FF',
      secondary200: '#E9D5FF',
      secondary300: '#D8B4FE',
      secondary400: '#9563F5',
      secondary500: theme.secondaryColor,
      secondary600: '#6A35D9',
      secondary700: '#5B2BC0',
      secondary800: '#4C1D95',
      secondary900: '#3B1A7A',
      textPrimary: '#FFFFFF',
      textSecondary: '#D1D5DB',
      textTertiary: '#9CA3AF',
      textPlaceholder: '#6B7280',
      textDisabled: '#4B5563',
      textInverse: '#111827',
      borderPrimary: '#374151',
      borderSecondary: '#4B5563',
      borderTertiary: '#6B7280',
      borderFocus: theme.primaryColor,
      borderError: '#EF4444',
      borderSuccess: '#10B981',
      success500: '#10B981',
      success600: '#059669',
      warning500: '#F59E0B',
      warning600: '#D97706',
      error500: '#EF4444',
      error600: '#DC2626',
      info500: '#3B82F6',
      info600: '#2563EB',
    };
  };

  const setTheme = (newTheme: Partial<ThemeConfig>) => {
    setThemeState(prev => {
      return normalizeTheme({ ...prev, ...newTheme });
    });
  };

  const toggleMode = () => {
    setThemeState((prev) => {
      const nextMode: ThemeConfig['mode'] = prev.mode === 'dark' ? 'light' : 'dark';
      return { ...prev, mode: nextMode };
    });
  };

  const resetTheme = () => {
    const normalizedDefaultTheme = normalizeTheme(defaultTheme);
    setThemeState(normalizedDefaultTheme);
  };

  return {
    theme,
    colors: getColors(),
    setTheme,
    toggleMode,
    resetTheme,
    isSystemDark,
    effectiveMode,
  };
};
