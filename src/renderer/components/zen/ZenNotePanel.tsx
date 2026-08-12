import React, { useCallback } from 'react';
import { StickyNote, Plus, Pin, Trash2 } from 'lucide-react';
import { NoteEditor } from '../NoteEditor';
import { useNotes } from '../../contexts/NotesContext';
import { useToast } from '../../contexts/ToastContext';
import type { Note, CreateNoteData, UpdateNoteData } from '../../../shared/types/note';

interface ZenNotePanelProps {
  note: Note | null;
  onNewNote: () => void;
  onNoteDeleted: () => void;
  onNoteUpdated: (note: Note) => void;
}

export const ZenNotePanel: React.FC<ZenNotePanelProps> = ({
  note,
  onNewNote,
  onNoteDeleted,
  onNoteUpdated,
}) => {
  const { updateNote, deleteNote } = useNotes();
  const { showToast } = useToast();

  const handleSave = useCallback(
    async (noteData: CreateNoteData) => {
      if (!note) return;
      try {
        const updated = await updateNote(note.id, noteData);
        if (updated) onNoteUpdated(updated);
      } catch (err) {
        showToast('Erro ao salvar nota', 'error');
      }
    },
    [note, updateNote, onNoteUpdated, showToast]
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
          <StickyNote size={40} className="zen-note-panel__empty-icon" />
          <p className="zen-note-panel__empty-title">Nenhuma nota selecionada</p>
          <p className="zen-note-panel__empty-sub">
            Selecione uma nota da lista ou crie uma nova
          </p>
          <button
            className="zen-note-panel__empty-btn"
            onClick={onNewNote}
          >
            <Plus size={12} style={{ display: 'inline', marginRight: 4 }} />
            Nova nota
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="zen-note-panel">
      {/* Toolbar */}
      <div className="zen-note-panel__toolbar">
        <div className="zen-note-panel__actions">
          {/* Pin */}
          <button
            className={`zen-panel-btn ${note.is_pinned ? 'zen-panel-btn--pinned' : ''}`}
            onClick={handlePin}
            title={note.is_pinned ? 'Desafixar' : 'Fixar'}
            aria-label={note.is_pinned ? 'Desafixar' : 'Fixar'}
          >
            <Pin size={14} />
          </button>

          {/* Delete */}
          <button
            className="zen-panel-btn zen-panel-btn--danger"
            onClick={handleDelete}
            title="Deletar nota"
            aria-label="Deletar nota"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Note meta — right side */}
        <div style={{ fontSize: 10, color: 'var(--text-muted, rgba(255,255,255,0.25))', textAlign: 'right' }}>
          {note.sequential_id && <span>#{note.sequential_id} · </span>}
          {note.creator_display_name || 'Você'}
        </div>
      </div>

      {/* Editor inline — 100% reuses existing NoteEditor */}
      <div className="zen-note-panel__content">
        <NoteEditor
          note={note}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      </div>
    </section>
  );
};
