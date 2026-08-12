import React from 'react';
import {
  StickyNote,
  LayoutDashboard,
  Sun,
  Moon,
  Settings,
  LogOut,
  FilePlus,
  AlertTriangle,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../contexts/AuthContext';

interface ZenSidebarProps {
  currentScreen: string;
  onNewNote: () => void;
  onOpenNoteModal: () => void;
  onNavigateDashboard: () => void;
  onNavigateNotes: () => void;
  onOpenSettings: () => void;
  onOpenFeedback: () => void;
}

export const ZenSidebar: React.FC<ZenSidebarProps> = ({
  currentScreen,
  onNewNote,
  onOpenNoteModal,
  onNavigateDashboard,
  onNavigateNotes,
  onOpenSettings,
  onOpenFeedback,
}) => {
  const { effectiveMode, toggleMode } = useTheme();
  const { signOut } = useAuth();
  const isDark = effectiveMode === 'dark';
  const isDashboard = currentScreen === 'dashboard';

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out failed', err);
    }
  };

  return (
    <aside className="zen-sidebar">
      <nav className="zen-sidebar__nav">
        {/* Nova nota rápida (Ícone de documento com mais — Criar nota inline) */}
        <button
          className="zen-sidebar__btn zen-sidebar__btn--new"
          onClick={onNewNote}
          data-tooltip="Nova Nota"
          aria-label="Nova Nota"
        >
          <FilePlus size={18} />
        </button>

        <div className="zen-sidebar__divider" />

        {/* Nota Rápida (Modal Popup de Nota Rápida) */}
        <button
          className="zen-sidebar__btn"
          onClick={onOpenNoteModal}
          data-tooltip="Nota Rápida (Modal)"
          aria-label="Nota Rápida"
        >
          <StickyNote size={18} />
        </button>

        {/* Dashboard */}
        <button
          className={`zen-sidebar__btn ${isDashboard ? 'zen-sidebar__btn--active' : ''}`}
          onClick={onNavigateDashboard}
          data-tooltip="Dashboard"
          aria-label="Dashboard"
        >
          <LayoutDashboard size={18} />
        </button>

        {/* Alternar Tema */}
        <button
          className="zen-sidebar__btn"
          onClick={toggleMode}
          data-tooltip={isDark ? 'Tema Claro' : 'Tema Escuro'}
          aria-label="Alternar Tema"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Configurações */}
        <button
          className="zen-sidebar__btn"
          onClick={onOpenSettings}
          data-tooltip="Configurações"
          aria-label="Configurações"
        >
          <Settings size={18} />
        </button>

        <div className="zen-sidebar__divider" style={{ marginTop: 'auto' }} />

        {/* Sugestão / Bug — Alinhado perfeitamente no rodapé da coluna lateral */}
        <button
          className="zen-sidebar__btn zen-sidebar__btn--warning"
          onClick={onOpenFeedback}
          data-tooltip="Sugestão / Bug"
          aria-label="Sugestão / Bug"
          style={{
            borderColor: 'rgba(245, 158, 11, 0.4)',
            color: '#f59e0b',
            background: 'rgba(245, 158, 11, 0.08)',
          }}
        >
          <AlertTriangle size={18} />
        </button>

        {/* Sair */}
        <button
          className="zen-sidebar__btn zen-sidebar__btn--danger"
          onClick={handleSignOut}
          data-tooltip="Sair"
          aria-label="Sair"
          style={{ marginTop: 4 }}
        >
          <LogOut size={17} />
        </button>
      </nav>
    </aside>
  );
};
