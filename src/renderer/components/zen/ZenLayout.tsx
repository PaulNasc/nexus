import React, { useState, useCallback, Suspense } from 'react';
import { ZenSidebar } from './ZenSidebar';
import { ZenNotesList } from './ZenNotesList';
import { ZenNotePanel } from './ZenNotePanel';
import { FeedbackButton } from '../FeedbackButton';
import { NexusLoadingScreen } from '../NexusLoadingScreen';
import { PingUserModal, PingUser } from '../PingUserModal';
import { useNotes } from '../../contexts/NotesContext';
import { useToast } from '../../contexts/ToastContext';
import { auditLogger } from '../../lib/auditLogger';
import { useAuth } from '../../contexts/AuthContext';
import type { Note } from '../../../shared/types/note';

const Dashboard = React.lazy(() =>
  import('../Dashboard').then((m) => ({ default: m.Dashboard }))
);

interface ZenLayoutProps {
  /** Whether the dashboard is currently shown (full-area) */
  showDashboard?: boolean;
  /** Callback to open a new quick note modal */
  onOpenNoteModal: () => void;
  /** Callback to open Settings */
  onOpenSettings: () => void;
  /** Callback to open feedback modal */
  onOpenFeedback: () => void;
  /** Navigate to dashboard */
  onNavigateDashboard: () => void;
  /** Navigate to notes */
  onNavigateNotes: () => void;
  /** Pass-through for Dashboard */
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
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [pingModal, setPingModal] = useState<{ isOpen: boolean; note: Note | null }>({
    isOpen: false,
    note: null,
  });

  const handleSelectNote = useCallback((note: Note, editMode = false) => {
    setSelectedNote(note);
    setIsEditing(editMode);
  }, []);

  const handleNoteDeleted = useCallback(() => {
    setSelectedNote(null);
    setIsEditing(false);
  }, []);

  const handleNoteUpdated = useCallback((updated: Note) => {
    setSelectedNote(updated);
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

  const handleDeleteNote = useCallback(
    async (note: Note) => {
      const confirmed = window.confirm(`Deletar a nota "${note.title}"?`);
      if (!confirmed) return;
      try {
        await deleteNote(note.id);
        if (selectedNote?.id === note.id) {
          setSelectedNote(null);
          setIsEditing(false);
        }
        showToast('Nota deletada', 'success');
      } catch {
        showToast('Erro ao deletar nota', 'error');
      }
    },
    [deleteNote, selectedNote?.id, showToast]
  );

  const handleOpenPingModal = useCallback((note: Note) => {
    setPingModal({ isOpen: true, note });
  }, []);

  const handleSendPings = useCallback(
    (targetUsers: PingUser[]) => {
      if (!pingModal.note || targetUsers.length === 0) return;
      const note = pingModal.note;
      const userNames = targetUsers.map((u) => u.name).join(', ');

      // Audit log registration
      auditLogger.log({
        level: 'info',
        category: 'notes',
        message: `Notificação/Ping enviado para ${userNames} referente à nota #${note.id} "${note.title}"`,
        user_name: user?.email?.split('@')[0] || 'Paulo',
        details: {
          noteId: note.id,
          noteTitle: note.title,
          targetUsers: targetUsers.map((u) => ({ id: u.id, name: u.name, email: u.email })),
        },
      });

      showToast(`Notificação enviada com sucesso para: ${userNames}`, 'success');
      setPingModal({ isOpen: false, note: null });
    },
    [pingModal.note, user, showToast]
  );

  const currentScreen = showDashboard ? 'dashboard' : 'notes';

  return (
    <div className={`zen-layout ${showDashboard ? 'zen-layout--dashboard' : ''}`}>
      {/* Col 1: Sidebar */}
      <ZenSidebar
        currentScreen={currentScreen}
        onNewNote={onOpenNoteModal}
        onNavigateDashboard={onNavigateDashboard}
        onNavigateNotes={onNavigateNotes}
        onOpenSettings={onOpenSettings}
      />

      {/* Col 2: Notes list (hidden in dashboard mode) */}
      {!showDashboard && (
        <ZenNotesList
          selectedNoteId={selectedNote?.id ?? null}
          onSelectNote={handleSelectNote}
          onNewNote={onOpenNoteModal}
          onOpenPingModal={handleOpenPingModal}
          onDeleteNote={handleDeleteNote}
          onTogglePinNote={handleTogglePin}
        />
      )}

      {/* Col 3 (or 2 in dashboard mode): Main panel */}
      <div
        className={`zen-note-panel ${showDashboard ? 'zen-note-panel--dashboard' : ''}`}
        style={{ position: 'relative' }}
      >
        {showDashboard ? (
          <Suspense fallback={<NexusLoadingScreen title="Nexus" subtitle="Carregando dashboard..." />}>
            <div style={{ flex: 1, overflow: 'auto', height: '100%' }}>
              <Dashboard
                onViewTaskList={onViewTaskList}
                onOpenTimer={onOpenTimer}
                onOpenReports={onOpenReports}
                showQuickActions={showQuickActions}
                showTaskCounters={showTaskCounters}
              />
            </div>
          </Suspense>
        ) : (
          <ZenNotePanel
            note={selectedNote}
            isEditing={isEditing}
            onSetEditing={setIsEditing}
            onNewNote={onOpenNoteModal}
            onNoteDeleted={handleNoteDeleted}
            onNoteUpdated={handleNoteUpdated}
            onOpenPingModal={handleOpenPingModal}
          />
        )}

        {/* Feedback button — fixed at bottom right of entire app window */}
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 9999,
          }}
        >
          <FeedbackButton onClick={onOpenFeedback} />
        </div>
      </div>

      {/* Ping User Modal */}
      {pingModal.isOpen && (
        <PingUserModal
          isOpen={pingModal.isOpen}
          onClose={() => setPingModal({ isOpen: false, note: null })}
          note={pingModal.note}
          onSendPings={handleSendPings}
        />
      )}
    </div>
  );
};
