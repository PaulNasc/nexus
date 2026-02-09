import { useEffect, useState } from 'react';
import { ThemeConfig, ThemeContextType, ThemeColors } from '../types/theme';

// Default theme configuration - only dark mode
const defaultTheme: ThemeConfig = {
  mode: 'dark',
  primaryColor: '#00D4AA',
  secondaryColor: '#7B3FF2',
  accentColor: '#33DCBB',
  borderRadius: 'lg',
  fontSize: 'base',
  spacing: 'normal',
};

// Simplified hook - only dark theme
export const useTheme = (storageKey = 'nexus-theme'): ThemeContextType => {
  const [theme, setThemeState] = useState<ThemeConfig>(defaultTheme);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem(storageKey) || localStorage.getItem('krigzis-theme');
    if (savedTheme) {
      try {
        const parsed = JSON.parse(savedTheme) as ThemeConfig;
        setThemeState(parsed);
        localStorage.setItem(storageKey, savedTheme);
        localStorage.removeItem('krigzis-theme');
      } catch {
        // ignore
      }
    }
  }, [storageKey]);

  // Save theme to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(theme));
    } catch (error) {
      console.error('Failed to save theme to localStorage:', error);
    }
  }, [theme, storageKey]);

  // Always dark mode
  const effectiveMode = 'dark' as const;

  // Apply dark theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'dark');
    // Set color-scheme for better browser integration
    root.style.colorScheme = 'dark';
  }, []);

  // Get current colors - always dark theme
  const getColors = (): ThemeColors => {
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

  // Simplified theme functions
  const setTheme = (newTheme: Partial<ThemeConfig>) => {
    // Force dark mode
    setThemeState(prev => ({ ...prev, ...newTheme, mode: 'dark' }));
  };

  // Removed toggleMode - no longer needed
  const resetTheme = () => {
    setThemeState(defaultTheme);
  };

  return {
    theme,
    colors: getColors(),
    setTheme,
    toggleMode: () => {}, // No-op function for compatibility
    resetTheme,
    isSystemDark: true, // Always true since we only support dark
    effectiveMode,
  };
};
