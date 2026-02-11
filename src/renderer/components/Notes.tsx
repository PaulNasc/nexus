import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNotes } from '../contexts/NotesContext';
import { useTasks } from '../contexts/TasksContext';
import { Note, CreateNoteData } from '../../shared/types/note';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';
import { NoteEditor } from './NoteEditor';
import { LinkedTasksModal } from './LinkedTasksModal';
import { StickyNote, Search, Grid3X3, List, Plus, Pin, Trash2, Link, ChevronLeft, Eye, CheckSquare, Square, Filter, X } from 'lucide-react';
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

  useEffect(() => {
    if (initialNoteId && notes.length > 0) {
      const note = notes.find(n => n.id === initialNoteId);
      if (note) {
        setViewer({ isOpen: true, note });
      }
    }
  }, [initialNoteId, notes]);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; note: Note | null; taskTitles: string[] }>({ isOpen: false, note: null, taskTitles: [] });

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // Color filter state
  const [filterColor, setFilterColor] = useState<string | null>(null);
  const [filterPinned, setFilterPinned] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const colorOptions = [
    { value: 'teal', label: 'Teal' },
    { value: 'blue', label: 'Azul' },
    { value: 'green', label: 'Verde' },
    { value: 'yellow', label: 'Amarelo' },
    { value: 'red', label: 'Vermelho' },
    { value: 'purple', label: 'Roxo' },
    { value: 'orange', label: 'Laranja' },
    { value: 'pink', label: 'Rosa' },
  ];

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Filtered + sorted notes: pinned first, then by date
  const filteredNotes = useMemo(() => {
    let result = notes.filter(note =>
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
    );

    if (filterColor) {
      result = result.filter(n => n.color === filterColor);
    }
    if (filterPinned) {
      result = result.filter(n => n.is_pinned);
    }

    // Sort: pinned first, then by updated_at desc
    result.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    return result;
  }, [notes, searchTerm, filterColor, filterPinned]);

  // Batch selection helpers
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredNotes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotes.map(n => n.id)));
    }
  }, [filteredNotes, selectedIds]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      await deleteNote(id);
    }
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [selectedIds, deleteNote]);

  const handleNoteClick = useCallback((note: Note) => {
    setSelectedNote(note);
    setIsEditing(true);
  }, []);

  const handleNewNote = useCallback(() => {
    setSelectedNote(null);
    setIsEditing(true);
  }, []);

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

  const handleDeleteNote = useCallback(async (note: Note) => {
    try {
      const linkedIds = note.linkedTaskIds || [];
      if (linkedIds.length > 0) {
        const linkedTitles: string[] = allTasks
          .filter(t => linkedIds.includes(t.id))
          .map(t => String(t.title));
        setConfirmDelete({ isOpen: true, note, taskTitles: linkedTitles });
        return;
      }
      setConfirmDelete({ isOpen: true, note, taskTitles: [] });
    } catch (error) {
      console.error('Erro ao preparar exclusão:', error);
    }
  }, [allTasks]);

  const showLinkedTasks = useCallback((note: Note) => {
    setLinkedTasksModal({
      isOpen: true,
      noteId: note.id,
      noteTitle: note.title,
      linkedTaskIds: note.linkedTaskIds || []
    });
  }, []);

  const closeLinkedTasksModal = useCallback(() => {
    setLinkedTasksModal({
      isOpen: false,
      noteId: 0,
      noteTitle: '',
      linkedTaskIds: []
    });
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }, []);

  const getColorClass = useCallback((color?: string) => {
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
  }, []);

  const truncateContent = useCallback((content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  }, []);

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
      <div className="notes-header">
        <div className="notes-title-section">
          {onBack && (
            <button onClick={onBack} title="Voltar ao Dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid var(--color-border-primary)', borderRadius: '8px', width: '36px', height: '36px', color: 'var(--color-text-secondary)', cursor: 'pointer', transition: 'all 0.2s ease', marginRight: 'var(--space-3)' }}>
              <ChevronLeft size={18} strokeWidth={1.7} />
            </button>
          )}
          <div className="notes-title-group">
            <StickyNote size={28} className="notes-icon" />
            <h1 className="notes-title">Notas</h1>
            <Badge variant="secondary" className="notes-count">{filteredNotes.length}</Badge>
          </div>
        </div>
        <div className="notes-actions">
          <div className="search-container">
            <Input type="text" placeholder="Buscar notas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
            <Search size={16} className="search-icon" />
          </div>
          <div className="view-toggle">
            <Button onClick={() => setViewMode('grid')} variant={viewMode === 'grid' ? 'primary' : 'ghost'} size="sm" className="view-button" style={viewMode === 'grid' ? { background: 'linear-gradient(135deg, #00D4AA, #7B3FF2)', border: 'none', color: '#fff' } : {}}>
              <Grid3X3 size={16} />
            </Button>
            <Button onClick={() => setViewMode('list')} variant={viewMode === 'list' ? 'primary' : 'ghost'} size="sm" className="view-button" style={viewMode === 'list' ? { background: 'linear-gradient(135deg, #00D4AA, #7B3FF2)', border: 'none', color: '#fff' } : {}}>
              <List size={16} />
            </Button>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} title="Filtros" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: showFilters ? 'rgba(0, 212, 170, 0.15)' : 'none', border: '1px solid var(--color-border-primary)', borderRadius: '8px', width: '36px', height: '36px', cursor: 'pointer', color: showFilters ? 'var(--color-primary-teal)' : 'var(--color-text-secondary)' }}>
            <Filter size={16} />
          </button>
          {selectionMode ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button onClick={toggleSelectAll} title="Selecionar todas" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid var(--color-border-primary)', borderRadius: '8px', width: '36px', height: '36px', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                {selectedIds.size === filteredNotes.length ? <CheckSquare size={16} /> : <Square size={16} />}
              </button>
              {selectedIds.size > 0 && (
                <button onClick={handleBatchDelete} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: 'var(--color-accent-rose)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>
                  <Trash2 size={14} /> {selectedIds.size}
                </button>
              )}
              <button onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }} title="Sair" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid var(--color-border-primary)', borderRadius: '8px', width: '36px', height: '36px', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <button onClick={() => setSelectionMode(true)} title="Modo seleção" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid var(--color-border-primary)', borderRadius: '8px', width: '36px', height: '36px', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
              <CheckSquare size={16} />
            </button>
          )}
          <Button onClick={handleNewNote} variant="primary" size="sm" style={{ background: 'linear-gradient(135deg, #00D4AA, #7B3FF2)', border: 'none' }}>
            <Plus size={16} /> Nova Nota
          </Button>
        </div>
      </div>

      {showFilters && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderBottom: '1px solid var(--color-border-primary)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginRight: '4px' }}>Cor:</span>
          {colorOptions.map(opt => (
            <button key={opt.value} onClick={() => setFilterColor(filterColor === opt.value ? null : opt.value)} title={opt.label} style={{ width: '20px', height: '20px', borderRadius: '50%', border: filterColor === opt.value ? '2px solid #fff' : '2px solid transparent', background: getColorClass(opt.value), cursor: 'pointer', boxShadow: filterColor === opt.value ? '0 0 0 2px var(--color-primary-teal)' : 'none' }} />
          ))}
          <div style={{ width: '1px', height: '20px', background: 'var(--color-border-primary)', margin: '0 4px' }} />
          <button onClick={() => setFilterPinned(!filterPinned)} title="Apenas fixadas" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: filterPinned ? 'rgba(0, 212, 170, 0.15)' : 'transparent', border: '1px solid var(--color-border-primary)', borderRadius: '6px', color: filterPinned ? 'var(--color-primary-teal)' : 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '12px' }}>
            <Pin size={12} /> Fixadas
          </button>
          {(filterColor || filterPinned) && (
            <button onClick={() => { setFilterColor(null); setFilterPinned(false); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '11px' }}>
              <X size={12} /> Limpar
            </button>
          )}
        </div>
      )}

      <div className="notes-content">
        {isLoading ? (
          <div className="notes-loading"><div className="loading-spinner"></div></div>
        ) : error ? (
          <div className="notes-error">
            <p className="error-message">Erro ao carregar notas: {error}</p>
            <Button onClick={fetchNotes} variant="secondary" size="sm">Tentar novamente</Button>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="notes-empty">
            {searchTerm ? (
              <div>
                <p className="empty-search-message">Nenhuma nota encontrada para &quot;{searchTerm}&quot;</p>
                <Button onClick={() => setSearchTerm('')} variant="secondary" size="sm">Limpar busca</Button>
              </div>
            ) : (
              <div>
                <StickyNote size={48} className="empty-icon" />
                <h3 className="empty-title">Suas notas aparecerão aqui</h3>
                <p className="empty-subtitle">Comece criando sua primeira nota</p>
                <Button onClick={handleNewNote} variant="primary" size="sm"><Plus size={16} /> Criar primeira nota</Button>
              </div>
            )}
          </div>
        ) : (
          <div className="notes-list notes-list-container">
            {viewMode === 'grid' ? (
              <div className="notes-grid">
                {filteredNotes.map((note) => (
                  <div key={note.id} className="note-card" style={{ borderLeft: `3px solid ${getColorClass(note.color)}` }} onClick={() => selectionMode ? toggleSelect(note.id) : handleNoteClick(note)}>
                    {selectionMode && (
                      <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 5 }} onClick={(e) => { e.stopPropagation(); toggleSelect(note.id); }}>
                        {selectedIds.has(note.id) ? <CheckSquare size={16} style={{ color: 'var(--color-primary-teal)' }} /> : <Square size={16} style={{ color: 'var(--color-text-muted)' }} />}
                      </div>
                    )}
                    {note.is_pinned && (<Pin size={14} className="pin-icon-active" style={{ position: 'absolute', top: 8, right: 8, zIndex: 4 }} />)}
                    <div className="note-card-content">
                      <div className="note-header">
                        <h3 className="note-title">
                          {note.sequential_id != null && <span style={{ color: 'var(--color-primary-teal)', fontSize: '12px', marginRight: '6px' }}>#{note.sequential_id}</span>}
                          {note.title}
                        </h3>
                      </div>
                      <p className="note-content">{truncateContent(note.content)}</p>
                      <div className="note-footer">
                        {note.tags && note.tags.length > 0 && (
                          <div className="note-tags">
                            {note.tags.slice(0, 2).map((tag, index) => (<Badge key={index} variant="secondary" className="tag-badge">{tag}</Badge>))}
                            {note.tags.length > 2 && (<Badge variant="secondary" className="tag-badge">+{note.tags.length - 2}</Badge>)}
                          </div>
                        )}
                        <div className="note-meta">
                          {note.creator_display_name && (<span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>por {note.creator_display_name}</span>)}
                          {note.linkedTaskIds && note.linkedTaskIds.length > 0 && (
                            <div onClick={(e) => { e.stopPropagation(); showLinkedTasks(note); }} className="task-link">
                              <Link size={12} className="link-icon" /><span className="link-text">{note.linkedTaskIds.length}</span>
                            </div>
                          )}
                          <div className="note-date">{formatDate(note.updated_at)}</div>
                        </div>
                      </div>
                      <div className="note-actions" style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: '4px' }}>
                        <button className="note-view-button" title="Visualizar" onClick={(e) => { e.stopPropagation(); setViewer({ isOpen: true, note }); }}><Eye size={16} /></button>
                        <button className="note-view-button" title="Excluir" style={{ color: 'var(--color-accent-rose)' }} onClick={(e) => { e.stopPropagation(); handleDeleteNote(note); }}><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="notes-list-view">
                {filteredNotes.map((note) => (
                  <div key={note.id} className="note-list-item" style={{ borderLeft: `3px solid ${getColorClass(note.color)}` }} onClick={() => selectionMode ? toggleSelect(note.id) : handleNoteClick(note)}>
                    <div className="note-list-content">
                      <div className="note-main">
                        {selectionMode && (
                          <div style={{ flexShrink: 0, marginRight: '8px' }} onClick={(e) => { e.stopPropagation(); toggleSelect(note.id); }}>
                            {selectedIds.has(note.id) ? <CheckSquare size={16} style={{ color: 'var(--color-primary-teal)' }} /> : <Square size={16} style={{ color: 'var(--color-text-muted)' }} />}
                          </div>
                        )}
                        {note.is_pinned && (<Pin size={14} className="pin-icon-active" style={{ flexShrink: 0 }} />)}
                        <div className="note-info">
                          <h3 className="note-list-title">
                            {note.sequential_id != null && <span style={{ color: 'var(--color-primary-teal)', fontSize: '12px', marginRight: '6px' }}>#{note.sequential_id}</span>}
                            {note.title}
                          </h3>
                          <p className="note-list-text">{truncateContent(note.content, 80)}</p>
                        </div>
                        <div className="note-meta">
                          {note.creator_display_name && (<span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>por {note.creator_display_name}</span>)}
                          {note.tags && note.tags.length > 0 && (
                            <div className="note-list-tags">
                              {note.tags.slice(0, 2).map((tag, index) => (<Badge key={index} variant="secondary" className="tag-badge">{tag}</Badge>))}
                              {note.tags.length > 2 && (<Badge variant="secondary" className="tag-badge">+{note.tags.length - 2}</Badge>)}
                            </div>
                          )}
                          {note.linkedTaskIds && note.linkedTaskIds.length > 0 && (
                            <div onClick={(e) => { e.stopPropagation(); showLinkedTasks(note); }} className="task-link">
                              <Link size={14} className="link-icon" /><span className="link-text">{note.linkedTaskIds.length} tarefa{note.linkedTaskIds.length > 1 ? 's' : ''}</span>
                            </div>
                          )}
                          <div className="note-date">{formatDate(note.updated_at)}</div>
                          <div className="note-list-actions">
                            <button className="note-view-button" title="Visualizar" onClick={(e) => { e.stopPropagation(); setViewer({ isOpen: true, note }); }}><Eye size={18} /></button>
                            <button className="note-view-button" title="Excluir" style={{ color: 'var(--color-accent-rose)' }} onClick={(e) => { e.stopPropagation(); handleDeleteNote(note); }}><Trash2 size={16} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <LinkedTasksModal isOpen={linkedTasksModal.isOpen} onClose={closeLinkedTasksModal} noteId={linkedTasksModal.noteId} noteTitle={linkedTasksModal.noteTitle} linkedTaskIds={linkedTasksModal.linkedTaskIds} />
      <NoteViewerModal isOpen={viewer.isOpen} note={viewer.note} onClose={() => setViewer({ isOpen: false, note: null })} onTogglePin={async (note: Note) => { await updateNote(note.id, { is_pinned: !note.is_pinned }); setViewer(prev => prev.note?.id === note.id ? { ...prev, note: { ...note, is_pinned: !note.is_pinned } } : prev); }} />
      <ConfirmDeleteNoteModal isOpen={confirmDelete.isOpen} noteTitle={confirmDelete.note?.title || ''} linkedTaskTitles={confirmDelete.taskTitles} onClose={() => setConfirmDelete({ isOpen: false, note: null, taskTitles: [] })} onConfirm={async () => { if (confirmDelete.note) { await deleteNote(confirmDelete.note.id); } setConfirmDelete({ isOpen: false, note: null, taskTitles: [] }); }} />
    </div>
  );
};