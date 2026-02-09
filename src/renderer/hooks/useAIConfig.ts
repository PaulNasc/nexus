import { useState, useCallback } from 'react';

export interface AIConfig {
  enabled: boolean;
  selectedProvider: 'local' | 'openai' | 'anthropic' | 'custom';
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

const DEFAULT_AI_CONFIG: AIConfig = {
  enabled: false,
  selectedProvider: 'local',
};

const STORAGE_KEY = 'krigzis-ai-config';

const loadConfig = (): AIConfig => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_AI_CONFIG, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_AI_CONFIG;
};

export const useAIConfig = () => {
  const [aiConfig, setAIConfig] = useState<AIConfig>(loadConfig);

  const updateConfig = useCallback((updates: Partial<AIConfig>) => {
    setAIConfig(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const isAIReady = useCallback((): boolean => {
    if (!aiConfig.enabled) return false;
    if (aiConfig.selectedProvider === 'local') return true;
    return !!aiConfig.apiKey;
  }, [aiConfig]);

  return { aiConfig, updateConfig, isAIReady };
};

export default useAIConfig;
