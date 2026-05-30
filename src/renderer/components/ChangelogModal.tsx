import React, { useEffect, useRef } from 'react';
import { X, Zap, Shield, Wrench, Star, TrendingUp } from 'lucide-react';
import { CHANGELOG, ChangelogCategory } from '../config/changelog';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'nexus:lastSeenVersion';

/** Returns true if the current version's changelog has not been shown yet. */
export function shouldShowChangelog(currentVersion: string): boolean {
  try {
    const lastSeen = localStorage.getItem(STORAGE_KEY);
    return lastSeen !== currentVersion;
  } catch {
    return false;
  }
}

/** Marks the current version as seen so the modal won't show again. */
export function markChangelogAsSeen(version: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, version);
  } catch {
    // localStorage unavailable — safe to ignore
  }
}

const CATEGORY_META: Record<ChangelogCategory, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  performance: {
    label: 'Performance',
    icon: <TrendingUp size={13} />,
    color: '#00D4AA',
    bg: 'rgba(0, 212, 170, 0.12)',
  },
  fix: {
    label: 'Correção',
    icon: <Wrench size={13} />,
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.12)',
  },
  feature: {
    label: 'Nova feature',
    icon: <Star size={13} />,
    color: '#A78BFA',
    bg: 'rgba(167, 139, 250, 0.12)',
  },
  security: {
    label: 'Segurança',
    icon: <Shield size={13} />,
    color: '#34D399',
    bg: 'rgba(52, 211, 153, 0.12)',
  },
  improvement: {
    label: 'Melhoria',
    icon: <Zap size={13} />,
    color: '#60A5FA',
    bg: 'rgba(96, 165, 250, 0.12)',
  },
};

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const latest = CHANGELOG[0];

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !latest) return null;

  return (
    <div
      className="changelog-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Novidades da versão ${latest.version}`}
    >
      <div className="changelog-modal" ref={dialogRef}>
        {/* Header */}
        <div className="changelog-header">
          <div className="changelog-header-left">
            <div className="changelog-version-badge">
              <span className="changelog-version-label">v{latest.version}</span>
            </div>
            <div>
              <h2 className="changelog-title">Novidades do Nexus</h2>
              <p className="changelog-date">
                {new Date(latest.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <button
            className="changelog-close"
            onClick={onClose}
            aria-label="Fechar novidades"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <div className="changelog-body">
          <ul className="changelog-list">
            {latest.highlights.map((item, i) => {
              const meta = CATEGORY_META[item.category];
              return (
                <li key={i} className="changelog-item" style={{ '--item-delay': `${i * 60}ms` } as React.CSSProperties}>
                  <span
                    className="changelog-badge"
                    style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.color}33` }}
                  >
                    {meta.icon}
                    {meta.label}
                  </span>
                  <span className="changelog-item-text">{item.text}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer */}
        <div className="changelog-footer">
          <p className="changelog-footer-hint">Pressione <kbd>Esc</kbd> ou clique fora para fechar</p>
          <button className="changelog-cta" onClick={onClose} id="changelog-close-btn">
            Entendido! 🚀
          </button>
        </div>
      </div>
    </div>
  );
};
