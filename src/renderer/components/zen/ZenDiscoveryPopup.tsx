import React, { useState, useEffect } from 'react';
import { Sparkles, X, Undo2, ArrowRight } from 'lucide-react';
import { useInterfaceMode } from '../../hooks/useInterfaceMode';

export const ZenDiscoveryPopup: React.FC = () => {
  const { isZen, toggleMode } = useInterfaceMode();
  const [isVisible, setIsVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [justActivatedZen, setJustActivatedZen] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Check if dismissed permanently
    try {
      const dismissed = localStorage.getItem('nexus_zen_prompt_dismissed') === 'true';
      if (!dismissed && !isZen) {
        // Show after 3 seconds on launch
        const timer = setTimeout(() => setIsVisible(true), 3000);
        return () => clearTimeout(timer);
      }
    } catch {
      /* ignore */
    }
  }, [isZen]);

  // Countdown timer when Zen Mode is activated from prompt
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (justActivatedZen && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (justActivatedZen && countdown === 0) {
      setIsVisible(false);
      setJustActivatedZen(false);
    }
    return () => clearInterval(interval);
  }, [justActivatedZen, countdown]);

  if (!isVisible) return null;

  const handleDismiss = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('nexus_zen_prompt_dismissed', 'true');
      } catch {
        /* ignore */
      }
    }
    setIsVisible(false);
  };

  const handleAcceptZen = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('nexus_zen_prompt_dismissed', 'true');
      } catch {
        /* ignore */
      }
    }
    void toggleMode(); // Switch to Zen mode
    setJustActivatedZen(true);
    setCountdown(5);
  };

  const handleRevertZen = () => {
    void toggleMode(); // Switch back to Simplified mode
    setJustActivatedZen(false);
    setIsVisible(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9990,
        width: '340px',
        borderRadius: '14px',
        backgroundColor: 'var(--bg-primary, #121216)',
        border: '1px solid var(--border-subtle, rgba(20, 184, 166, 0.3))',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
        padding: '16px',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {justActivatedZen ? (
        // Undo Zen Mode State (5-second auto close timer)
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} style={{ color: '#14b8a6' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary, #fff)' }}>
                Modo Zen ativado!
              </span>
            </div>
            <span style={{ fontSize: 11, color: '#14b8a6', fontWeight: 700, fontFamily: 'monospace' }}>
              {countdown}s
            </span>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-muted, #9ca3af)', margin: 0 }}>
            Deseja manter o Modo Zen ou retornar para o Simplificado?
          </p>

          <button
            onClick={handleRevertZen}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: 4,
            }}
          >
            <Undo2 size={14} /> Voltar para o Modo Simplificado
          </button>
        </div>
      ) : (
        // Initial Discovery Prompt State
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  padding: 6,
                  borderRadius: 8,
                  background: 'rgba(20, 184, 166, 0.15)',
                  border: '1px solid rgba(20, 184, 166, 0.3)',
                  display: 'flex',
                }}
              >
                <Sparkles size={16} style={{ color: '#14b8a6' }} />
              </div>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#14b8a6', letterSpacing: '0.05em' }}>
                  NOVIDADE
                </span>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary, #fff)', margin: 0 }}>
                  Novo Modo Zen disponível!
                </h4>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #9ca3af)',
                cursor: 'pointer',
                padding: 2,
              }}
            >
              <X size={16} />
            </button>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-muted, #9ca3af)', margin: 0, lineHeight: 1.4 }}>
            Experimente a nova interface minimalista sem bordas, com notas fluidas e visual no estilo Evernote. Gostaria de testar agora?
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted, #9ca3af)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                style={{ accentColor: '#14b8a6', cursor: 'pointer' }}
              />
              Não mostrar novamente
            </label>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={handleDismiss}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                  background: 'transparent',
                  color: 'var(--text-muted, #9ca3af)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Não
              </button>
              <button
                onClick={handleAcceptZen}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#14b8a6',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Sim <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
