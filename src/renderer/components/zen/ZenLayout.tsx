import React, { useState, useCallback, Suspense } from 'react';
import { ZenSidebar } from './ZenSidebar';
import { ZenNotesList } from './ZenNotesList';
import { ZenNotePanel } from './ZenNotePanel';
import { FeedbackButton } from '../FeedbackButton';
import { NexusLoadingScreen } from '../NexusLoadingScreen';
import { PingUserModal, PingUser } from '../PingUserModal';
import { UtilitiesModal } from '../UtilitiesModal';
import { NotesMetricsPanel } from '../NotesMetricsPanel';
import { useNotes } from '../../contexts/NotesContext';
import { useToast } from '../../contexts/ToastContext';
import { auditLogger } from '../../lib/auditLogger';
import { useAuth } from '../../contexts/AuthContext';
import type { Note } from '../../../shared/types/note';

const Dashboard = React.lazy(() =>
  import('../Dashboard').then((m) => ({ default: m.Dashboard }))
);

interface ZenLayoutProps {
  showDashboard?: boolean;
  onOpenNoteModal?: (() => void) | undefined;
  onOpenSettings: () => void;
  onOpenFeedback: () => void;
  onNavigateDashboard: () => void;
  onNavigateNotes: () => void;
  onViewTaskList?: (status: string) => void;
  onOpenTimer?: () => void;
  onOpenReports?: () => void;
  showQuickActions?: boolean;
  showTaskCounters?: boolean;
}

export const ZenLayout: React.FC<ZenLayoutProps> = ({
  showDashboard = false,
  onOpenNoteModal,
  onOpenSettings,
  onOpenFeedback,
  onNavigateDashboard,
  onNavigateNotes,
  onViewTaskList,
  onOpenTimer,
  onOpenReports,
  showQuickActions,
  showTaskCounters,
}) => {
  const { notes, updateNote, deleteNote } = useNotes();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // 'viewing' = shows selectedNote, 'editing' = inline edit, 'creating' = brand new blank editor, null = empty state
  const [panelMode, setPanelMode] = useState<'viewing' | 'editing' | 'creating' | null>(null);

  // Ping Modal state
  const [pingModal, setPingModal] = useState<{ isOpen: boolean; note: Note | null }>({
    isOpen: false,
    note: null,
  });

  // Utilities R2 Cloud Modal state
  const [isUtilitiesOpen, setIsUtilitiesOpen] = useState(false);

  // Custom Delete Confirmation Modal state
  const [deleteConfirmNote, setDeleteConfirmNote] = useState<Note | null>(null);

  // Select a note from the list → view mode
  const handleSelectNote = useCallback((note: Note) => {
    setSelectedNote(note);
    setPanelMode('viewing');
  }, []);

  // New note from sidebar or empty-state button → blank inline editor
  const handleNewNote = useCallback(() => {
    if (showDashboard) {
      onNavigateNotes();
    }
    setSelectedNote(null);
    setPanelMode('creating');
  }, [showDashboard, onNavigateNotes]);

  const handleNavigateNotes = useCallback(() => {
    setSelectedNote(null);
    setPanelMode(null);
    onNavigateNotes();
  }, [onNavigateNotes]);

  const handleNoteDeleted = useCallback(() => {
    setSelectedNote(null);
    setPanelMode(null);
  }, []);

  const handleNoteUpdated = useCallback((updated: Note) => {
    setSelectedNote(updated);
    setPanelMode('viewing');
  }, []);

  const handleNoteCreated = useCallback((created: Note) => {
    setSelectedNote(created);
    setPanelMode('viewing');
  }, []);

  const handleTogglePin = useCallback(
    async (note: Note) => {
      try {
        const updated = await updateNote(note.id, { is_pinned: !note.is_pinned });
        if (updated && selectedNote?.id === note.id) {
          setSelectedNote(updated);
        }
        showToast(note.is_pinned ? 'Nota desafixada' : 'Nota fixada', 'success');
      } catch {
        showToast('Erro ao alterar fixação da nota', 'error');
      }
    },
    [updateNote, selectedNote?.id, showToast]
  );

  const handleDeleteNote = useCallback((note: Note) => {
    setDeleteConfirmNote(note);
  }, []);

  const handleOpenPingModal = useCallback((note: Note) => {
    setPingModal({ isOpen: true, note });
  }, []);

  const handleSendPings = useCallback(
    (targetUsers: PingUser[]) => {
      if (!pingModal.note || targetUsers.length === 0) return;
      const note = pingModal.note;
      const userNames = targetUsers.map((u) => u.name).join(', ');

      auditLogger.log(
        'info',
        'notes',
        `Notificação/Ping enviado para ${userNames} referente à nota #${note.id} "${note.title}"`
      );

      showToast(`Ping enviado para ${userNames}`, 'success');
      setPingModal({ isOpen: false, note: null });
    },
    [pingModal.note, user, showToast]
  );

  const currentScreen = showDashboard ? 'dashboard' : 'notes';

  const isEditing = panelMode === 'editing';
  const isCreating = panelMode === 'creating';

  return (
    <div
      className={`zen-layout ${showDashboard ? 'zen-layout--dashboard' : ''}`}
      style={{ position: 'absolute', inset: 0 }}
    >
      {/* Col 1: Sidebar */}
      <ZenSidebar
        currentScreen={currentScreen}
        onNewNote={handleNewNote}
        onOpenNoteModal={onOpenNoteModal || (() => {})}
        onNavigateDashboard={onNavigateDashboard}
        onNavigateNotes={handleNavigateNotes}
        onOpenSettings={onOpenSettings}
        onOpenFeedback={onOpenFeedback}
      />

      {/* Col 2: Notes list (hidden in dashboard mode) */}
      {!showDashboard && (
        <ZenNotesList
          selectedNoteId={selectedNote?.id ?? null}
          onSelectNote={handleSelectNote}
          onNewNote={handleNewNote}
          onOpenPingModal={handleOpenPingModal}
          onDeleteNote={handleDeleteNote}
          onTogglePinNote={handleTogglePin}
          onOpenUtilities={() => setIsUtilitiesOpen(true)}
        />
      )}

      {/* Col 3 (or 2 in dashboard): Main panel */}
      <div
        className={`zen-note-panel ${showDashboard ? 'zen-note-panel--dashboard' : ''}`}
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        {showDashboard ? (
          <div style={{ flex: 1, overflow: 'auto', height: '100%', padding: '16px' }}>
            <NotesMetricsPanel />
          </div>
        ) : (
          <ZenNotePanel
            note={selectedNote}
            isEditing={isEditing}
            isCreating={isCreating}
            onSetEditing={(v) => setPanelMode(v ? 'editing' : 'viewing')}
            onNewNote={handleNewNote}
            onNoteDeleted={handleNoteDeleted}
            onNoteUpdated={handleNoteUpdated}
            onNoteCreated={handleNoteCreated}
            onOpenPingModal={handleOpenPingModal}
          />
        )}
      </div>

      {/* Ping Modal */}
      {pingModal.isOpen && (
        <PingUserModal
          isOpen={pingModal.isOpen}
          onClose={() => setPingModal({ isOpen: false, note: null })}
          note={pingModal.note}
          onSendPings={handleSendPings}
        />
      )}

      {/* Utilities R2 Cloud Modal */}
      <UtilitiesModal
        isOpen={isUtilitiesOpen}
        onClose={() => setIsUtilitiesOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmNote && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setDeleteConfirmNote(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '380px',
              backgroundColor: '#1e1e24',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600, color: '#fff' }}>
              Excluir Nota
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#9ca3af', lineHeight: 1.5 }}>
              Tem certeza de que deseja excluir a nota &quot;{deleteConfirmNote.title}&quot;? Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setDeleteConfirmNote(null)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'transparent',
                  color: '#9ca3af',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const target = deleteConfirmNote;
                  setDeleteConfirmNote(null);
                  try {
                    await deleteNote(target.id);
                    if (selectedNote?.id === target.id) {
                      setSelectedNote(null);
                      setPanelMode(null);
                    }
                    showToast('Nota deletada com sucesso', 'success');
                  } catch {
                    showToast('Erro ao deletar nota', 'error');
                  }
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Excluir Nota
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
