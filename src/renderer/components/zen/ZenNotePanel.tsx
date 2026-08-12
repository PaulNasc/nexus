import React, { useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { NoteEditor } from '../NoteEditor';
import { ZenNoteViewer } from './ZenNoteViewer';
import { ZenNoteCreator } from './ZenNoteCreator';
import { useNotes } from '../../contexts/NotesContext';
import { useToast } from '../../contexts/ToastContext';
import type { Note, CreateNoteData } from '../../../shared/types/note';

interface ZenNotePanelProps {
  note: Note | null;
  isEditing: boolean;
  isCreating: boolean;
  onSetEditing: (editing: boolean) => void;
  onNewNote: () => void;
  onNoteDeleted: () => void;
  onNoteUpdated: (note: Note) => void;
  onNoteCreated: (note: Note) => void;
  onOpenPingModal: (note: Note) => void;
}

export const ZenNotePanel: React.FC<ZenNotePanelProps> = ({
  note,
  isEditing,
  isCreating,
  onSetEditing,
  onNewNote,
  onNoteDeleted,
  onNoteUpdated,
  onNoteCreated,
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
          showToast('Nota salva com sucesso', 'success');
        }
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

  // ── CREATE MODE (blank inline NoteEditor Evernote-style) ─────────────────
  if (isCreating) {
    return (
      <section className="zen-note-panel">
        <ZenNoteCreator
          onNoteCreated={onNoteCreated}
          onCancel={() => onSetEditing(false)}
        />
      </section>
    );
  }

  // ── EMPTY STATE ──────────────────────────────────────────────────────────
  if (!note) {
    return (
      <section className="zen-note-panel">
        <ZenNoteCreator
          onNoteCreated={onNoteCreated}
          onCancel={() => {}}
          showEmptyPrompt
        />
      </section>
    );
  }

  // ── EDIT MODE ─────────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <section className="zen-note-panel">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
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
              style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
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
      </section>
    );
  }

  // ── VIEW MODE ─────────────────────────────────────────────────────────────
  return (
    <section className="zen-note-panel">
      <ZenNoteViewer
        note={note}
        onEdit={() => onSetEditing(true)}
        onTogglePin={handlePin}
        onDelete={handleDelete}
        onOpenPingModal={onOpenPingModal}
      />
    </section>
  );
};
