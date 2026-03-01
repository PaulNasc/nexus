import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNotes } from '../contexts/NotesContext';
import { useSettings } from '../hooks/useSettings';
import { useSystemTags } from '../contexts/SystemTagsContext';

import { Note, CreateNoteData } from '../../shared/types/note';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';
import { NoteEditor } from './NoteEditor';
import { LinkedTasksModal } from './LinkedTasksModal';
import { StickyNote, Search, Grid3X3, List, Plus, Pin, Trash2, Link, ChevronLeft, Pencil, CheckSquare, Square, Filter, X, ArrowUpDown } from 'lucide-react';

import { NoteViewerModal } from './NoteViewerModal';

interface NotesProps {
  onBack?: () => void;
  initialNoteId?: number;
}

export const Notes: React.FC<NotesProps> = ({ onBack, initialNoteId }) => {
  const { notes, isLoading, error, fetchNotes, deleteNote, createNote, updateNote } = useNotes();
  const { settings } = useSettings();
  const { tags: systemTags } = useSystemTags();

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
    linkedTaskIds: [],
  });

  const [viewer, setViewer] = useState<{ isOpen: boolean; note: Note | null }>({ isOpen: false, note: null });

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // Color filter state
  const [filterColor, setFilterColor] = useState<string | null>(null);
  const [filterPinned, setFilterPinned] = useState(false);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterSystemTagIds, setFilterSystemTagIds] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Sort state
  type SortOption = 'date_desc' | 'date_asc' | 'alpha_asc' | 'alpha_desc' | 'id_asc' | 'id_desc';
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [showSortMenu, setShowSortMenu] = useState(false);

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

  const activeSystemTags = useMemo(
    () => systemTags.filter((tag) => tag.is_active).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [systemTags],
  );

  const systemTagById = useMemo(() => {
    return new Map(activeSystemTags.map((tag) => [tag.id, tag]));
  }, [activeSystemTags]);

  const systemTagByName = useMemo(() => {
    return new Map(activeSystemTags.map((tag) => [tag.name.toLowerCase(), tag]));
  }, [activeSystemTags]);

  useEffect(() => {
    if (initialNoteId && notes.length > 0) {
      const note = notes.find((n) => n.id === initialNoteId);
      if (note) {
        setViewer({ isOpen: true, note });
      }
    }
  }, [initialNoteId, notes]);

  useEffect(() => {
    if (!showSortMenu) return;
    const handler = () => setShowSortMenu(false);
    const timer = setTimeout(() => document.addEventListener('click', handler), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handler);
    };
  }, [showSortMenu]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredNotes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotes.map((n) => n.id)));
    }
  };

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      await deleteNote(id);
    }
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [selectedIds, deleteNote]);

  const handleNoteClick = useCallback((note: Note) => {
    setViewer({ isOpen: true, note });
  }, []);

  const handleNewNote = useCallback(() => {
    setSelectedNote(null);
    setIsEditing(true);
  }, []);

  const handleCloseEditor = useCallback(() => {
    setIsEditing(false);
    setSelectedNote(null);
  }, []);

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

  const showLinkedTasks = useCallback((note: Note) => {
    setLinkedTasksModal({
      isOpen: true,
      noteId: note.id,
      noteTitle: note.title,
      linkedTaskIds: note.linkedTaskIds || [],
    });
  }, []);

  const closeLinkedTasksModal = useCallback(() => {
    setLinkedTasksModal({
      isOpen: false,
      noteId: 0,
      noteTitle: '',
      linkedTaskIds: [],
    });
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
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

  const filteredNotes = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    let result = notes.filter((note) => {
      if (!term) return true;
      if (note.title.toLowerCase().includes(term)) return true;
      if (note.content.toLowerCase().includes(term)) return true;
      if (note.tags && note.tags.some((tag) => tag.toLowerCase().includes(term))) return true;
      if (note.sequential_id != null) {
        const idStr = String(note.sequential_id);
        if (idStr === term || `#${idStr}` === term) return true;
      }
      if (note.creator_display_name && note.creator_display_name.toLowerCase().includes(term)) return true;
      const dateStr = new Date(note.updated_at).toLocaleDateString('pt-BR');
      if (dateStr.includes(term)) return true;
      return false;
    });

    if (filterColor) {
      result = result.filter((n) => n.color === filterColor);
    }
    if (filterPinned) {
      result = result.filter((n) => n.is_pinned);
    }
    if (filterTags.length > 0) {
      result = result.filter((n) =>
        Array.isArray(n.tags) && n.tags.some((tag) => filterTags.includes(tag))
      );
    }
    if (filterSystemTagIds.length > 0) {
      result = result.filter((note) => {
        const noteTagNames = new Set((note.tags || []).map((tag) => tag.toLowerCase()));
        return filterSystemTagIds.some((id) => {
          if (note.system_tag_id === id) return true;
          const systemTag = systemTagById.get(id);
          if (!systemTag) return false;
          return noteTagNames.has(systemTag.name.toLowerCase());
        });
      });
    }

    result.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      switch (sortBy) {
        case 'alpha_asc': return a.title.localeCompare(b.title, 'pt-BR');
        case 'alpha_desc': return b.title.localeCompare(a.title, 'pt-BR');
        case 'id_asc': return (a.sequential_id ?? 0) - (b.sequential_id ?? 0);
        case 'id_desc': return (b.sequential_id ?? 0) - (a.sequential_id ?? 0);
        case 'date_asc': return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        case 'date_desc':
        default: return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

    return result;
  }, [notes, searchTerm, filterColor, filterPinned, filterTags, filterSystemTagIds, sortBy, systemTagById]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const note of notes) {
      if (note.tags) {
        for (const tag of note.tags) {
          if (!systemTagByName.has(tag.toLowerCase())) {
            set.add(tag);
          }
        }
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [notes, systemTagByName]);

  const sortLabels: Record<SortOption, string> = {
    date_desc: 'Data ↓ (recente)',
    date_asc: 'Data ↑ (antigo)',
    alpha_asc: 'A → Z',
    alpha_desc: 'Z → A',
    id_asc: 'ID ↑ (crescente)',
    id_desc: 'ID ↓ (decrescente)',
  };

  const getSystemTagForNote = useCallback((note: Note) => {
    if (note.system_tag_id !== undefined) {
      const byId = systemTagById.get(note.system_tag_id);
      if (byId) return byId;
    }

    if (note.tags && note.tags.length > 0) {
      for (const noteTag of note.tags) {
        const byName = systemTagByName.get(noteTag.toLowerCase());
        if (byName) return byName;
      }
    }

    return undefined;
  }, [systemTagById, systemTagByName]);

  const getNoteAccentColor = useCallback((note: Note) => {
    const systemTag = getSystemTagForNote(note);
    if (systemTag?.color) return systemTag.color;
    return getColorClass(note.color);
  }, [getColorClass, getSystemTagForNote]);

  const renderTagBadges = useCallback((note: Note) => {
    if (!note.tags || note.tags.length === 0) return null;

    const visibleTags = note.tags.slice(0, 3);
    const hiddenTags = note.tags.slice(3);

    return (
      <>
        {visibleTags.map((tag) => {
          const systemTag = systemTagByName.get(tag.toLowerCase());
          const style = systemTag
            ? {
              backgroundColor: `${systemTag.color}1F`,
              borderColor: `${systemTag.color}99`,
              color: systemTag.color,
            }
            : undefined;

          return (
            <Badge key={`${note.id}-${tag}`} variant="secondary" className="tag-badge" style={style}>
              {tag}
            </Badge>
          );
        })}
        {hiddenTags.length > 0 && (
          <Badge
            variant="secondary"
            className="tag-badge"
            title={hiddenTags.join(', ')}
          >
            +{hiddenTags.length}
          </Badge>
        )}
      </>
    );
  }, [systemTagByName]);

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
        {settings.showNotesMenu && (
          <div className="notes-actions">
            <div className="search-container">

              <Input type="text" placeholder="Buscar por #ID, nome, data, autor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
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
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowSortMenu(!showSortMenu)} title="Ordenar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: showSortMenu ? 'rgba(0, 212, 170, 0.15)' : 'none', border: '1px solid var(--color-border-primary)', borderRadius: '8px', width: '36px', height: '36px', cursor: 'pointer', color: showSortMenu ? 'var(--color-primary-teal)' : 'var(--color-text-secondary)' }}>
                <ArrowUpDown size={16} />
              </button>
              {showSortMenu && (
                <div style={{ position: 'absolute', top: '40px', right: 0, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)', borderRadius: '8px', padding: '4px', zIndex: 50, minWidth: '170px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                  {(Object.keys(sortLabels) as SortOption[]).map(key => (
                    <button key={key} onClick={() => { setSortBy(key); setShowSortMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', background: sortBy === key ? 'rgba(0, 212, 170, 0.15)' : 'transparent', border: 'none', borderRadius: '6px', color: sortBy === key ? 'var(--color-primary-teal)' : 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: sortBy === key ? 600 : 400, textAlign: 'left' }}>
                      {sortLabels[key]}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
        )}
      </div>

      {settings.showNotesMenu && showFilters && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderBottom: '1px solid var(--color-border-primary)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginRight: '4px' }}>Cor:</span>

          {colorOptions.map(opt => (
            <button key={opt.value} onClick={() => setFilterColor(filterColor === opt.value ? null : opt.value)} title={opt.label} style={{ width: '20px', height: '20px', borderRadius: '50%', border: filterColor === opt.value ? '2px solid #fff' : '2px solid transparent', background: getColorClass(opt.value), cursor: 'pointer', boxShadow: filterColor === opt.value ? '0 0 0 2px var(--color-primary-teal)' : 'none' }} />
          ))}
          <div style={{ width: '1px', height: '20px', background: 'var(--color-border-primary)', margin: '0 4px' }} />
          <button onClick={() => setFilterPinned(!filterPinned)} title="Apenas fixadas" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: filterPinned ? 'rgba(0, 212, 170, 0.15)' : 'transparent', border: '1px solid var(--color-border-primary)', borderRadius: '6px', color: filterPinned ? 'var(--color-primary-teal)' : 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '12px' }}>
            <Pin size={12} /> Fixadas
          </button>
          {availableTags.length > 0 && (
            <>
              <div style={{ width: '1px', height: '20px', background: 'var(--color-border-primary)', margin: '0 4px' }} />
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginRight: '2px' }}>Tags:</span>
              <details style={{ position: 'relative' }}>
                <summary style={{ listStyle: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--color-text-secondary)', padding: '4px 8px', border: '1px solid var(--color-border-primary)', borderRadius: '6px' }}>
                  {filterTags.length > 0 ? `${filterTags.length} selecionada(s)` : 'Selecionar tags'}
                </summary>
                <div style={{ position: 'absolute', top: '110%', left: 0, minWidth: '220px', maxHeight: '240px', overflowY: 'auto', padding: '8px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)', borderRadius: '8px', zIndex: 40, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
                  {availableTags.map((tag) => {
                    const active = filterTags.includes(tag);
                    return (
                      <label key={tag} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-text-secondary)', padding: '4px 2px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => setFilterTags((prev) => (active ? prev.filter((t) => t !== tag) : [...prev, tag]))}
                        />
                        <span>{tag}</span>
                      </label>
                    );
                  })}
                </div>
              </details>
            </>
          )}
          {activeSystemTags.length > 0 && (
            <>
              <div style={{ width: '1px', height: '20px', background: 'var(--color-border-primary)', margin: '0 4px' }} />
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginRight: '2px' }}>Sistema:</span>
              <details style={{ position: 'relative' }}>
                <summary style={{ listStyle: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--color-text-secondary)', padding: '4px 8px', border: '1px solid var(--color-border-primary)', borderRadius: '6px' }}>
                  {filterSystemTagIds.length > 0 ? `${filterSystemTagIds.length} selecionada(s)` : 'Selecionar sistema'}
                </summary>
                <div style={{ position: 'absolute', top: '110%', left: 0, minWidth: '220px', maxHeight: '240px', overflowY: 'auto', padding: '8px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)', borderRadius: '8px', zIndex: 40, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
                  {activeSystemTags.map((tag) => {
                    const active = filterSystemTagIds.includes(tag.id);
                    return (
                      <label key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-text-secondary)', padding: '4px 2px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => setFilterSystemTagIds((prev) => (active ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]))}
                        />
                        <span style={{ width: 8, height: 8, borderRadius: '999px', backgroundColor: tag.color, display: 'inline-block', flexShrink: 0 }} />
                        <span>{tag.name}</span>
                      </label>
                    );
                  })}
                </div>
              </details>
            </>
          )}
          <div style={{ width: '1px', height: '20px', background: 'var(--color-border-primary)', margin: '0 4px' }} />
          {(filterColor || filterPinned || filterTags.length > 0 || filterSystemTagIds.length > 0) && (
            <button onClick={() => { setFilterColor(null); setFilterPinned(false); setFilterTags([]); setFilterSystemTagIds([]); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '11px' }}>
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
                  <div key={note.id} className="note-card" style={{ borderLeft: `3px solid ${getNoteAccentColor(note)}` }} onClick={() => selectionMode ? toggleSelect(note.id) : handleNoteClick(note)}>
                    {note.is_pinned && (
                      <div className="note-actions" style={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: '2px', zIndex: 5 }}>
                        <Pin size={13} className="pin-icon-active" />
                      </div>
                    )}
                    <div className="note-card-content">
                      <div className="note-header">
                        <h3 className="note-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {selectionMode && (
                            <span style={{ flexShrink: 0, display: 'inline-flex' }} onClick={(e) => { e.stopPropagation(); toggleSelect(note.id); }}>
                              {selectedIds.has(note.id) ? <CheckSquare size={15} style={{ color: 'var(--color-primary-teal)' }} /> : <Square size={15} style={{ color: 'var(--color-text-muted)' }} />}
                            </span>
                          )}
                          {note.sequential_id != null && <span style={{ color: 'var(--color-primary-teal)', fontSize: '12px', flexShrink: 0 }}>#{note.sequential_id}</span>}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.title}</span>
                        </h3>
                        <button
                          className="note-edit-button"
                          title="Editar"
                          onClick={(e) => { e.stopPropagation(); setSelectedNote(note); setIsEditing(true); }}
                        >
                          <Pencil size={14} />
                        </button>
                      </div>

                      <p className="note-content">{truncateContent(note.content)}</p>
                      <div className="note-footer">
                        {note.tags && note.tags.length > 0 && (
                          <div className="note-tags">
                            {renderTagBadges(note)}
                          </div>
                        )}
                        <div className="note-meta">
                          {note.creator_display_name && (<span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>por {note.creator_display_name}</span>)}
                          <div className="note-date">{formatDate(note.updated_at)}</div>
                          {settings.showDashboard && note.linkedTaskIds && note.linkedTaskIds.length > 0 && (
                            <div onClick={(e) => { e.stopPropagation(); showLinkedTasks(note); }} className="task-link">
                              <Link size={12} className="link-icon" /><span className="link-text">{note.linkedTaskIds.length}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="notes-list-view">
                {filteredNotes.map((note) => (
                  <div key={note.id} className="note-list-item" style={{ borderLeft: `3px solid ${getNoteAccentColor(note)}` }} onClick={() => selectionMode ? toggleSelect(note.id) : handleNoteClick(note)}>
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
                          <p className="note-list-text">{truncateContent(note.content, 90)}</p>
                          <div className="note-list-footer">
                            {note.tags && note.tags.length > 0 && (
                              <div className="note-list-tags">
                                {renderTagBadges(note)}
                              </div>
                            )}
                            <div className="note-meta note-meta--right">
                              {note.creator_display_name && (<span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>por {note.creator_display_name}</span>)}
                              <div className="note-date">{formatDate(note.updated_at)}</div>
                              {settings.showDashboard && note.linkedTaskIds && note.linkedTaskIds.length > 0 && (
                                <div onClick={(e) => { e.stopPropagation(); showLinkedTasks(note); }} className="task-link">
                                  <Link size={14} className="link-icon" /><span className="link-text">{note.linkedTaskIds.length}</span>
                                </div>
                              )}
                              <div className="note-list-actions">
                                <button
                                  className="note-edit-button"
                                  title="Editar"
                                  onClick={(e) => { e.stopPropagation(); setSelectedNote(note); setIsEditing(true); }}
                                >
                                  <Pencil size={16} />
                                </button>
                              </div>
                            </div>
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

      {settings.showDashboard && (
        <LinkedTasksModal isOpen={linkedTasksModal.isOpen} onClose={closeLinkedTasksModal} noteId={linkedTasksModal.noteId} noteTitle={linkedTasksModal.noteTitle} linkedTaskIds={linkedTasksModal.linkedTaskIds} />
      )}

      <NoteViewerModal isOpen={viewer.isOpen} note={viewer.note} onClose={() => setViewer({ isOpen: false, note: null })} onTogglePin={async (note: Note) => { await updateNote(note.id, { is_pinned: !note.is_pinned }); setViewer(prev => prev.note?.id === note.id ? { ...prev, note: { ...note, is_pinned: !note.is_pinned } } : prev); }} />
    </div>
  );
};