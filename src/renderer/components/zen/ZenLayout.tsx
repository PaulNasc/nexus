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

  // 'viewing' = show ZenNoteViewer, 'editing' = show NoteEditor, 'creating' = blank NoteEditor, null = empty state
  type PanelMode = 'viewing' | 'editing' | 'creating';

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode | null>(null);
  const [pingModal, setPingModal] = useState<{ isOpen: boolean; note: Note | null }>({
    isOpen: false,
    note: null,
  });

  // Click a note card → view it inline in column 3
  const handleSelectNote = useCallback((note: Note, editMode = false) => {
    setSelectedNote(note);
    setPanelMode(editMode ? 'editing' : 'viewing');
  }, []);

  // New note from sidebar or empty-state button → blank inline editor
  const handleNewNote = useCallback(() => {
    setSelectedNote(null);
    setPanelMode('creating');
  }, []);

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

  const handleDeleteNote = useCallback(
    async (note: Note) => {
      const confirmed = window.confirm(`Deletar a nota "${note.title}"?`);
      if (!confirmed) return;
      try {
        await deleteNote(note.id);
        if (selectedNote?.id === note.id) {
          setSelectedNote(null);
          setPanelMode(null);
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
        onNavigateDashboard={onNavigateDashboard}
        onNavigateNotes={onNavigateNotes}
        onOpenSettings={onOpenSettings}
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
        />
      )}

      {/* Col 3 (or 2 in dashboard): Main panel */}
      <div
        className={`zen-note-panel ${showDashboard ? 'zen-note-panel--dashboard' : ''}`}
        style={{ position: 'relative', overflow: 'hidden' }}
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
            isCreating={isCreating}
            onSetEditing={(v) => setPanelMode(v ? 'editing' : 'viewing')}
            onNewNote={handleNewNote}
            onNoteDeleted={handleNoteDeleted}
            onNoteUpdated={handleNoteUpdated}
            onNoteCreated={handleNoteCreated}
            onOpenPingModal={handleOpenPingModal}
          />
        )}

        {/* Feedback / Sugestões: fixed at bottom right */}
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

      {/* Ping Modal */}
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
