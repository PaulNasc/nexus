import React, { useState, useCallback, Suspense } from 'react';
import { ZenSidebar } from './ZenSidebar';
import { ZenNotesList } from './ZenNotesList';
import { ZenNotePanel } from './ZenNotePanel';
import { FeedbackButton } from '../FeedbackButton';
import { NexusLoadingScreen } from '../NexusLoadingScreen';
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
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const handleSelectNote = useCallback((note: Note) => {
    setSelectedNote(note);
  }, []);

  const handleNoteDeleted = useCallback(() => {
    setSelectedNote(null);
  }, []);

  const handleNoteUpdated = useCallback((updated: Note) => {
    setSelectedNote(updated);
  }, []);

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
            onNewNote={onOpenNoteModal}
            onNoteDeleted={handleNoteDeleted}
            onNoteUpdated={handleNoteUpdated}
          />
        )}

        {/* Feedback button — bottom right of the panel */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            zIndex: 100,
          }}
        >
          <FeedbackButton onClick={onOpenFeedback} />
        </div>
      </div>
    </div>
  );
};
