import { useEffect } from 'react';
import { useSettings } from './useSettings';

/**
 * Hook para aplicar configurações de aparência em tempo real
 */
export const useAppearance = () => {
  const { settings } = useSettings();

  useEffect(() => {
    const html = document.documentElement;
    
    // Aplicar tamanho da fonte
    const fontSize = settings.fontSizePx ?? (settings.largeFontMode ? 16 : 14);
    html.style.fontSize = `${fontSize}px`;
    
    // Aplicar modo alto contraste
    html.classList.toggle('high-contrast', settings.highContrastMode);
    
    // Aplicar redução de animações
    html.classList.toggle('reduce-motion', settings.reduceAnimations || false);
    
    // Aplicar densidade da interface
    html.setAttribute('data-density', settings.interfaceDensity || 'normal');
    
    // Aplicar transparência dos cards
    const cardOpacity = settings.cardOpacity || 95;
    const cardOpacityFloat = Math.max(0.8, Math.min(1, cardOpacity / 100));
    html.style.setProperty('--card-opacity', String(cardOpacityFloat));
    
    // Log para debug
    console.log('Configurações de aparência aplicadas:', {
      fontSize,
      highContrast: settings.highContrastMode,
      reduceAnimations: settings.reduceAnimations,
      density: settings.interfaceDensity,
      opacity: cardOpacity
    });
    
  }, [
    settings.fontSizePx,
    settings.largeFontMode,
    settings.highContrastMode,
    settings.reduceAnimations,
    settings.interfaceDensity,
    settings.cardOpacity
  ]);

  // Aplicar configurações iniciais assim que o hook é montado
  useEffect(() => {
    const html = document.documentElement;
    
    // Garantir que as classes CSS necessárias estejam disponíveis
    if (!html.style.getPropertyValue('--card-opacity')) {
      html.style.setProperty('--card-opacity', '0.95');
    }
    
    // Aplicar densidade padrão se não definida
    if (!html.getAttribute('data-density')) {
      html.setAttribute('data-density', 'normal');
    }
  }, []);

  return {
    // Funções utilitárias se necessário
    applySettings: () => {
      // Força reaplicação das configurações
      const html = document.documentElement;
      const fontSize = settings.fontSizePx ?? (settings.largeFontMode ? 16 : 14);
      html.style.fontSize = `${fontSize}px`;
      html.classList.toggle('high-contrast', settings.highContrastMode);
      html.classList.toggle('reduce-motion', settings.reduceAnimations || false);
      html.setAttribute('data-density', settings.interfaceDensity || 'normal');
      const cardOpacity = settings.cardOpacity || 95;
      const cardOpacityFloat = Math.max(0.8, Math.min(1, cardOpacity / 100));
      html.style.setProperty('--card-opacity', String(cardOpacityFloat));
    }
  };
};