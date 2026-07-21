import { useEffect } from 'react';
import { useSettings } from './useSettings';

export const useAppearance = () => {
  const { settings } = useSettings();

  useEffect(() => {
    const html = document.documentElement;

    const fontSize = settings.fontSizePx ?? (settings.largeFontMode ? 16 : 14);
    html.style.fontSize = `${fontSize}px`;

    html.classList.toggle('high-contrast', settings.highContrastMode ?? false);
    html.classList.toggle('reduce-motion', settings.reduceAnimations ?? false);
    html.setAttribute('data-density', settings.interfaceDensity ?? 'normal');

    const opacity = Math.max(0, Math.min(1, (settings.cardOpacity ?? 95) / 100));
    html.style.setProperty('--card-opacity', String(opacity));

    if (settings.keyboardNavigation !== false) {
      html.setAttribute('data-keyboard-nav', '');
    } else {
      html.removeAttribute('data-keyboard-nav');
    }

    if (settings.focusIndicators !== false) {
      html.setAttribute('data-focus-indicators', '');
    } else {
      html.removeAttribute('data-focus-indicators');
    }
  }, [
    settings.fontSizePx,
    settings.largeFontMode,
    settings.highContrastMode,
    settings.reduceAnimations,
    settings.interfaceDensity,
    settings.cardOpacity,
    settings.keyboardNavigation,
    settings.focusIndicators,
  ]);
};