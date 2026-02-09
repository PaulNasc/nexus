import React, { useState, useEffect, useCallback } from 'react';
import { useNotes } from '../contexts/NotesContext';
import { useTasks } from '../contexts/TasksContext';
import { Note, CreateNoteData } from '../../shared/types/note';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';
import { NoteEditor } from './NoteEditor';
import { LinkedTasksModal } from './LinkedTasksModal';
import { StickyNote, Search, Grid3X3, List, Plus, Pin, Trash2, Link, ChevronLeft, Eye } from 'lucide-react';
import { NoteViewerModal } from './NoteViewerModal';
import { ConfirmDeleteNoteModal } from './ConfirmDeleteNoteModal';

interface NotesProps {
  onBack?: () => void;
  initialNoteId?: number;
}

export const Notes: React.FC<NotesProps> = ({ onBack, initialNoteId }) => {
  const { notes, isLoading, error, fetchNotes, deleteNote, createNote, updateNote } = useNotes();
  const { tasks: allTasks } = useTasks();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [linkedTasksModal, setLinkedTasksModal] = useState<{
    isOpen: boolean;
    noteId: number;
    noteTitle: string;
    linkedTaskIds: number[];
  }>({
    isOpen: false,
    noteId: 0,
    noteTitle: '',
    linkedTaskIds: []
  });

  const [viewer, setViewer] = useState<{ isOpen: boolean; note: Note | null }>({ isOpen: false, note: null });

  // Auto-abrir nota quando vindo de TaskList com initialNoteId
  useEffect(() => {
    if (initialNoteId && notes.length > 0) {
      const note = notes.find(n => n.id === initialNoteId);
      if (note) {
        setViewer({ isOpen: true, note });
      }
    }
  }, [initialNoteId, notes]);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; note: Note | null; taskTitles: string[] }>({ isOpen: false, note: null, taskTitles: [] });

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
    setIsEditing(true);
  };

  const handleNewNote = () => {
    setSelectedNote(null);
    setIsEditing(true);
  };

  const handleCloseEditor = useCallback(() => {
    setIsEditing(false);
    setSelectedNote(null);
    fetchNotes();
  }, [fetchNotes]);

  const handleSaveNote = useCallback(async (noteData: CreateNoteData) => {
    try {
      if (selectedNote) {
        await updateNote(selectedNote.id, noteData);
      } else {
        await createNote(noteData);
      }
      handleCloseEditor();
    } catch (error) {
      console.error('Error saving note:', error);
    }
  }, [selectedNote, createNote, updateNote, handleCloseEditor]);

  const handleDeleteNote = async (note: Note) => {
    try {
      const linkedIds = note.linkedTaskIds || [];
      if (linkedIds.length > 0) {
        const linkedTitles: string[] = allTasks
          .filter(t => linkedIds.includes(t.id))
          .map(t => String(t.title));
        setConfirmDelete({ isOpen: true, note, taskTitles: linkedTitles });
        return;
      }
      // Sem vínculos: excluir direto com modal simples
      setConfirmDelete({ isOpen: true, note, taskTitles: [] });
    } catch (error) {
      console.error('Erro ao preparar exclusão:', error);
    }
  };

  const showLinkedTasks = (note: Note) => {
    setLinkedTasksModal({
      isOpen: true,
      noteId: note.id,
      noteTitle: note.title,
      linkedTaskIds: note.linkedTaskIds || []
    });
  };

  const closeLinkedTasksModal = () => {
    setLinkedTasksModal({
      isOpen: false,
      noteId: 0,
      noteTitle: '',
      linkedTaskIds: []
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getColorClass = (color?: string) => {
    switch (color) {
      case 'teal': return 'var(--color-accent-teal)';
      case 'blue': return 'var(--color-accent-blue)';
      case 'green': return 'var(--color-accent-emerald)';
      case 'yellow': return 'var(--color-accent-amber)';
      case 'red': return 'var(--color-accent-rose)';
      case 'purple': return 'var(--color-accent-purple)';
      case 'violet': return 'var(--color-accent-violet)';
      case 'orange': return 'var(--color-accent-orange)';
      case 'pink': return 'var(--color-accent-rose)';
      default: return 'var(--color-text-muted)';
    }
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  if (isEditing) {
    return (
      <NoteEditor
        note={selectedNote}
        onClose={handleCloseEditor}
        onSave={handleSaveNote}
      />
    );
  }

  return (
    <div className="notes-container">
      {/* Header */}
      <div className="notes-header">
        <div className="notes-title-section">
          {/* Back button */}
          {onBack && (
            <button
              onClick={onBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: '1px solid var(--color-border-primary)',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginRight: 'var(--space-3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary-teal)';
                e.currentTarget.style.color = 'var(--color-primary-teal)';
                e.currentTarget.style.backgroundColor = 'rgba(0, 212, 170, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-primary)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Voltar ao Dashboard"
            >
              <ChevronLeft size={18} strokeWidth={1.7} />
            </button>
          )}
          
          <div className="notes-title-group">
            <StickyNote size={28} className="notes-icon" /> {/* Increased size to match other tabs */}
            <h1 className="notes-title">Notas</h1>
            <Badge variant="secondary" className="notes-count">
              {filteredNotes.length}
            </Badge>
          </div>
        </div>

        <div className="notes-actions">
          {/* Search */}
          <div className="search-container">
            <Input
              type="text"
              placeholder="Buscar notas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <Search size={16} className="search-icon" />
          </div>

          {/* View Toggle */}
          <div className="view-toggle">
            <Button
              onClick={() => setViewMode('grid')}
              variant={viewMode === 'grid' ? 'primary' : 'ghost'}
              size="sm"
              className="view-button"
            >
              <Grid3X3 size={16} />
            </Button>
            <Button
              onClick={() => setViewMode('list')}
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              size="sm"
              className="view-button"
            >
              <List size={16} />
            </Button>
          </div>

          {/* New Note Button */}
          <Button onClick={handleNewNote} variant="primary" size="sm">
            <Plus size={16} />
            Nova Nota
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="notes-content">
        {isLoading ? (
          <div className="notes-loading">
            <div className="loading-spinner"></div>
          </div>
        ) : error ? (
          <div className="notes-error">
            <p className="error-message">Erro ao carregar notas: {error}</p>
            <Button onClick={fetchNotes} variant="secondary" size="sm">
              Tentar novamente
            </Button>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="notes-empty">
            {searchTerm ? (
              <div>
                <p className="empty-search-message">Nenhuma nota encontrada para "{searchTerm}"</p>
                <Button onClick={() => setSearchTerm('')} variant="secondary" size="sm">
                  Limpar busca
                </Button>
              </div>
            ) : (
              <div>
                <StickyNote size={48} className="empty-icon" />
                <h3 className="empty-title">Suas notas aparecerão aqui</h3>
                <p className="empty-subtitle">Comece criando sua primeira nota</p>
                <Button onClick={handleNewNote} variant="primary" size="sm">
                  <Plus size={16} />
                  Criar primeira nota
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="notes-list notes-list-container">
            {viewMode === 'grid' ? (
              <div className="notes-grid">
                {filteredNotes.map((note) => (
                  <Card
                    key={note.id}
                    className="note-card"
                    style={{ 
                      borderLeft: `3px solid ${getColorClass(note.color)}`
                    }}
                    onClick={() => handleNoteClick(note)}
                  >
                    <div className="note-card-content">
                      <div className="note-header">
                        <h3 className="note-title">
                          {note.title}
                        </h3>
                        
                        <div className="note-actions">
                          <button
                            className="note-view-button"
                            title="Visualizar"
                            onClick={(e) => { e.stopPropagation(); setViewer({ isOpen: true, note }); }}
                          >
                            <Eye size={22} />
                          </button>
                          {note.is_pinned && (
                            <Pin size={12} className="pin-icon" />
                          )}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNote(note);
                            }}
                            variant="ghost"
                            size="sm"
                            className="delete-button"
                          >
                            <Trash2 size={18} />
                          </Button>
                        </div>
                      </div>

                      <p className="note-content">
                        {truncateContent(note.content)}
                      </p>

                      <div className="note-footer">
                        {/* Tags */}
                        {note.tags && note.tags.length > 0 && (
                          <div className="note-tags">
                            {note.tags.slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="tag-badge">
                                {tag}
                              </Badge>
                            ))}
                            {note.tags.length > 2 && (
                              <Badge variant="secondary" className="tag-badge">
                                +{note.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="note-meta">
                          {/* Task Link */}
                          {note.linkedTaskIds && note.linkedTaskIds.length > 0 && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                showLinkedTasks(note);
                              }}
                              className="task-link"
                            >
                              <Link size={12} className="link-icon" />
                              <span className="link-text">
                                {note.linkedTaskIds.length}
                              </span>
                            </div>
                          )}

                          <div className="note-date">
                            {formatDate(note.updated_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="notes-list-view">
                {filteredNotes.map((note) => (
                  <Card
                    key={note.id}
                    className="note-list-item"
                    style={{ 
                      borderLeft: `3px solid ${getColorClass(note.color)}`
                    }}
                    onClick={() => handleNoteClick(note)}
                  >
                    <div className="note-list-content">
                      <div className="note-main">
                        <div className="note-info">
                          <h3 className="note-list-title">{note.title}</h3>
                          <p className="note-list-text">
                            {truncateContent(note.content, 80)}
                          </p>
                        </div>
                        
                        <div className="note-meta">
                          {/* Tags */}
                          {note.tags && note.tags.length > 0 && (
                            <div className="note-list-tags">
                              {note.tags.slice(0, 2).map((tag, index) => (
                                <Badge key={index} variant="secondary" className="tag-badge">
                                  {tag}
                                </Badge>
                              ))}
                              {note.tags.length > 2 && (
                                <Badge variant="secondary" className="tag-badge">
                                  +{note.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Task Link */}
                          {note.linkedTaskIds && note.linkedTaskIds.length > 0 && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                showLinkedTasks(note);
                              }}
                              className="task-link"
                            >
                              <Link size={14} className="link-icon" />
                              <span className="link-text">
                                {note.linkedTaskIds.length} tarefa{note.linkedTaskIds.length > 1 ? 's' : ''}
                              </span>
                            </div>
                          )}

                          <div className="note-date">
                            {formatDate(note.updated_at)}
                          </div>

                          <div className="note-list-actions">
                            <button
                              className="note-view-button"
                              title="Visualizar"
                              onClick={(e) => { e.stopPropagation(); setViewer({ isOpen: true, note }); }}
                            >
                              <Eye size={22} />
                            </button>
                            {note.is_pinned && (
                              <Pin size={14} className="pin-icon" />
                            )}
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNote(note);
                              }}
                              variant="ghost"
                              size="sm"
                              className="delete-button"
                            >
                              <Trash2 size={18} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Linked Tasks Modal */}
      <LinkedTasksModal
        isOpen={linkedTasksModal.isOpen}
        onClose={closeLinkedTasksModal}
        noteId={linkedTasksModal.noteId}
        noteTitle={linkedTasksModal.noteTitle}
        linkedTaskIds={linkedTasksModal.linkedTaskIds}
      />

      {/* Note Viewer Modal */}
      <NoteViewerModal
        isOpen={viewer.isOpen}
        note={viewer.note}
        onClose={() => setViewer({ isOpen: false, note: null })}
      />

      <ConfirmDeleteNoteModal
        isOpen={confirmDelete.isOpen}
        noteTitle={confirmDelete.note?.title || ''}
        linkedTaskTitles={confirmDelete.taskTitles}
        onClose={() => setConfirmDelete({ isOpen: false, note: null, taskTitles: [] })}
        onConfirm={async () => {
          if (confirmDelete.note) {
            await deleteNote(confirmDelete.note.id);
          }
          setConfirmDelete({ isOpen: false, note: null, taskTitles: [] });
        }}
      />
    </div>
  );
}; 