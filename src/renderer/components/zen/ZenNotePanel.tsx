import React, { useCallback } from 'react';
import { StickyNote, Plus, ArrowLeft } from 'lucide-react';
import { NoteEditor } from '../NoteEditor';
import { NoteViewerModal } from '../NoteViewerModal';
import { useNotes } from '../../contexts/NotesContext';
import { useToast } from '../../contexts/ToastContext';
import type { Note, CreateNoteData } from '../../../shared/types/note';

interface ZenNotePanelProps {
  note: Note | null;
  isEditing: boolean;
  onSetEditing: (editing: boolean) => void;
  onNewNote: () => void;
  onNoteDeleted: () => void;
  onNoteUpdated: (note: Note) => void;
  onOpenPingModal: (note: Note) => void;
}

export const ZenNotePanel: React.FC<ZenNotePanelProps> = ({
  note,
  isEditing,
  onSetEditing,
  onNewNote,
  onNoteDeleted,
  onNoteUpdated,
  onOpenPingModal,
}) => {
  const { updateNote, deleteNote } = useNotes();
  const { showToast } = useToast();

  const handleSave = useCallback(
    async (noteData: CreateNoteData) => {
      if (!note) return;
      try {
        const updated = await updateNote(note.id, noteData);
        if (updated) {
          onNoteUpdated(updated);
          onSetEditing(false);
          showToast('Nota salva com sucesso', 'success');
        }
      } catch (err) {
        showToast('Erro ao salvar nota', 'error');
      }
    },
    [note, updateNote, onNoteUpdated, onSetEditing, showToast]
  );

  const handleDelete = useCallback(async () => {
    if (!note) return;
    const confirmed = window.confirm(`Deletar a nota "${note.title}"?`);
    if (!confirmed) return;
    try {
      await deleteNote(note.id);
      onNoteDeleted();
      showToast('Nota deletada', 'success');
    } catch (err) {
      showToast('Erro ao deletar nota', 'error');
    }
  }, [note, deleteNote, onNoteDeleted, showToast]);

  const handlePin = useCallback(async () => {
    if (!note) return;
    try {
      const updated = await updateNote(note.id, { is_pinned: !note.is_pinned });
      if (updated) onNoteUpdated(updated);
      showToast(note.is_pinned ? 'Nota desafixada' : 'Nota fixada', 'success');
    } catch {
      showToast('Erro ao fixar nota', 'error');
    }
  }, [note, updateNote, onNoteUpdated, showToast]);

  // Empty state
  if (!note) {
    return (
      <section className="zen-note-panel">
        <div className="zen-note-panel__empty">
          <StickyNote size={44} className="zen-note-panel__empty-icon" />
          <p className="zen-note-panel__empty-title">Nenhuma nota selecionada</p>
          <p className="zen-note-panel__empty-sub">
            Selecione uma nota na lista ao lado para visualizar ou clique abaixo para criar
          </p>
          <button className="zen-note-panel__empty-btn" onClick={onNewNote}>
            <Plus size={14} style={{ display: 'inline', marginRight: 4 }} />
            Nova nota
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="zen-note-panel">
      {isEditing ? (
        /* EDIT MODE: Evernote-style NoteEditor Inline */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {/* Editor Top Bar with Return to View */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 16px',
              background: 'var(--bg-secondary, #141414)',
              borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
              flexShrink: 0,
            }}
          >
            <button
              className="zen-panel-btn"
              onClick={() => onSetEditing(false)}
              title="Voltar para Visualização"
              style={{ fontSize: 12 }}
            >
              <ArrowLeft size={13} />
              Visualizar Nota
            </button>
            <span style={{ fontSize: 11, color: 'var(--text-muted, rgba(255,255,255,0.4))' }}>
              Editando: <strong style={{ color: 'var(--text-primary)' }}>{note.title}</strong>
            </span>
          </div>

          <div style={{ flex: 1, overflow: 'hidden' }}>
            <NoteEditor
              note={note}
              onSave={handleSave}
              onDelete={handleDelete}
              onClose={() => onSetEditing(false)}
            />
          </div>
        </div>
      ) : (
        /* READ-ONLY VIEW MODE: Complete R2 Media / PDF / Video / Image / MD Viewer */
        <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
          <NoteViewerModal
            isOpen={true}
            note={note}
            isEmbedded={true}
            onClose={() => {}}
            onEditNote={() => onSetEditing(true)}
            onTogglePin={handlePin}
            onDeleteNote={handleDelete}
            onOpenPingModal={onOpenPingModal}
          />
        </div>
      )}
    </section>
  );
};
