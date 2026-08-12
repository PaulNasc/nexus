import React from 'react';
import { StickyNote, LayoutDashboard, Sun, Moon, Settings, LogOut, FilePlus } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../contexts/AuthContext';

const APP_VERSION = '1.4.0';

interface ZenSidebarProps {
  currentScreen: string;
  onNewNote: () => void;
  onNavigateDashboard: () => void;
  onNavigateNotes: () => void;
  onOpenSettings: () => void;
}

export const ZenSidebar: React.FC<ZenSidebarProps> = ({
  currentScreen,
  onNewNote,
  onNavigateDashboard,
  onNavigateNotes,
  onOpenSettings,
}) => {
  const { effectiveMode, toggleTheme } = useTheme();
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
        {/* Nova nota rápida (Ícone de documento com mais) */}
        <button
          className="zen-sidebar__btn zen-sidebar__btn--new"
          onClick={onNewNote}
          data-tooltip="Nova Nota"
          aria-label="Nova Nota"
        >
          <FilePlus size={18} />
        </button>

        <div className="zen-sidebar__divider" />

        {/* Notas */}
        <button
          className={`zen-sidebar__btn ${!isDashboard ? 'zen-sidebar__btn--active' : ''}`}
          onClick={onNavigateNotes}
          data-tooltip="Notas"
          aria-label="Notas"
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

        {/* Tema */}
        <button
          className="zen-sidebar__btn"
          onClick={toggleTheme}
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

        <div className="zen-sidebar__divider" />

        {/* Sair */}
        <button
          className="zen-sidebar__btn zen-sidebar__btn--danger"
          onClick={handleSignOut}
          data-tooltip="Sair"
          aria-label="Sair"
        >
          <LogOut size={17} />
        </button>
      </nav>

      <footer className="zen-sidebar__footer">
        <span className="zen-sidebar__footer-name">NEXUS</span>
        <span className="zen-sidebar__footer-version">v{APP_VERSION}</span>
      </footer>
    </aside>
  );
};
