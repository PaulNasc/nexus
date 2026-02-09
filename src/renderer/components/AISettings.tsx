import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { useAIConfig } from '../hooks/useAIConfig';
import { Button } from './ui/Button';

interface AISettingsProps {
  onBack: () => void;
}

export const AISettings: React.FC<AISettingsProps> = ({ onBack }) => {
  const { theme } = useTheme();
  const { aiConfig, updateConfig } = useAIConfig();
  const isDark = theme.mode === 'dark';

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Button onClick={onBack} style={{ padding: '8px 16px' }}>
          ← Voltar
        </Button>
        <h3 style={{
          fontSize: '18px',
          fontWeight: 600,
          color: isDark ? '#FFFFFF' : '#1F2937',
          margin: 0,
        }}>
          Configurações Avançadas de IA
        </h3>
      </div>

      {/* Provider Selection */}
      <div style={{
        padding: '20px',
        backgroundColor: isDark ? '#141414' : '#F5F5F5',
        border: `1px solid ${isDark ? '#2A2A2A' : '#E0E0E0'}`,
        borderRadius: '12px',
      }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: 500,
          margin: '0 0 16px 0',
          color: isDark ? '#FFFFFF' : '#1F2937',
        }}>
          Provedor de IA
        </h4>

        <select
          value={aiConfig.selectedProvider}
          onChange={(e) => updateConfig({ selectedProvider: e.target.value as 'local' | 'openai' | 'anthropic' | 'custom' })}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF',
            border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
            borderRadius: '8px',
            color: isDark ? '#FFFFFF' : '#1F2937',
            fontSize: '14px',
          }}
        >
          <option value="local">IA Local (Privacidade máxima)</option>
          <option value="openai">OpenAI GPT</option>
          <option value="anthropic">Anthropic Claude</option>
          <option value="custom">Personalizado</option>
        </select>
      </div>

      {/* API Key */}
      {aiConfig.selectedProvider !== 'local' && (
        <div style={{
          padding: '20px',
          backgroundColor: isDark ? '#141414' : '#F5F5F5',
          border: `1px solid ${isDark ? '#2A2A2A' : '#E0E0E0'}`,
          borderRadius: '12px',
        }}>
          <h4 style={{
            fontSize: '16px',
            fontWeight: 500,
            margin: '0 0 16px 0',
            color: isDark ? '#FFFFFF' : '#1F2937',
          }}>
            API Key
          </h4>
          <input
            type="password"
            value={aiConfig.apiKey || ''}
            onChange={(e) => updateConfig({ apiKey: e.target.value })}
            placeholder="Insira sua API key..."
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF',
              border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
              borderRadius: '8px',
              color: isDark ? '#FFFFFF' : '#1F2937',
              fontSize: '14px',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default AISettings;
