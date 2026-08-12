import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Pin, ArrowUpDown, StickyNote, Loader2, X, Tag } from 'lucide-react';
import { useNotes, SortOption } from '../../contexts/NotesContext';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useSettings } from '../../hooks/useSettings';
import { useSystemTags } from '../../contexts/SystemTagsContext';
import type { Note } from '../../../shared/types/note';

interface ZenNotesListProps {
  selectedNoteId: number | null;
  onSelectNote: (note: Note) => void;
  onNewNote: () => void;
}

export const ZenNotesList: React.FC<ZenNotesListProps> = ({
  selectedNoteId,
  onSelectNote,
  onNewNote,
}) => {
  const {
    notes,
    totalNotesCount,
    isLoading,
    hasMore,
    isFetchingMore,
    loadMoreNotes,
    searchTerm,
    setSearchTerm,
    filterPinned,
    setFilterPinned,
    filterSystemTagIds,
    setFilterSystemTagIds,
    sortBy,
    setSortBy,
  } = useNotes();

  const { user } = useAuth();
  const { activeOrg } = useOrganization();
  const { settings, getGreeting } = useSettings();
  const { tags: systemTags } = useSystemTags();

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showTagFilter, setShowTagFilter] = useState(false);

  const greeting = getGreeting();
  const userName = settings.userName || user?.email?.split('@')[0] || 'você';

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingMore) {
          loadMoreNotes();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, loadMoreNotes]);

  const toggleSystemTag = useCallback(
    (tagId: number) => {
      setFilterSystemTagIds((prev) =>
        prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
      );
    },
    [setFilterSystemTagIds]
  );

  const clearSearch = useCallback(() => setSearchTerm(''), [setSearchTerm]);

  const sortLabels: Record<SortOption, string> = {
    date_desc: 'Recentes',
    date_asc: 'Mais antigas',
    alpha_asc: 'A → Z',
    alpha_desc: 'Z → A',
    id_asc: 'ID ↑',
    id_desc: 'ID ↓',
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const getPreviewText = (note: Note): string => {
    if (!note.content) return '';
    const plain = note.content
      .replace(/!\[.*?\]\(.*?\)/g, '[imagem]')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/[#*_`~>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return plain.slice(0, 80);
  };

  return (
    <section className="zen-notes-list">
      {/* Header */}
      <header className="zen-notes-list__header">
        <h1 className="zen-notes-list__title">Notas</h1>
        <p className="zen-notes-list__greeting">{greeting}, {userName}!</p>
        <div className="zen-notes-list__meta">
          {activeOrg && (
            <>
              <span className="zen-notes-list__meta-org">
                🏢 {activeOrg.name}
              </span>
              <span className="zen-notes-list__meta-dot" />
            </>
          )}
          <span>{totalNotesCount} {totalNotesCount === 1 ? 'nota' : 'notas'}</span>
        </div>
      </header>

      {/* Search + Filters */}
      <div className="zen-notes-list__toolbar">
        <div className="zen-notes-list__search">
          <Search size={12} className="zen-notes-list__search-icon" />
          <input
            className="zen-notes-list__search-input"
            placeholder="Pesquisar notas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex' }}
              aria-label="Limpar busca"
            >
              <X size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />
            </button>
          )}
        </div>

        <div className="zen-notes-list__filters">
          {/* Pin filter */}
          <button
            className={`zen-filter-btn ${filterPinned ? 'zen-filter-btn--active' : ''}`}
            onClick={() => setFilterPinned(!filterPinned)}
            aria-label="Filtrar fixadas"
          >
            <Pin size={9} />
            Fixadas
          </button>

          {/* Tag filter toggle */}
          {systemTags.length > 0 && (
            <button
              className={`zen-filter-btn ${filterSystemTagIds.length > 0 || showTagFilter ? 'zen-filter-btn--active' : ''}`}
              onClick={() => setShowTagFilter((v) => !v)}
              aria-label="Filtrar por tag"
            >
              <Tag size={9} />
              Tags {filterSystemTagIds.length > 0 && `(${filterSystemTagIds.length})`}
            </button>
          )}

          {/* Sort */}
          <div style={{ position: 'relative', marginLeft: 'auto' }}>
            <button
              className="zen-filter-btn"
              onClick={() => setShowSortMenu((v) => !v)}
              aria-label="Ordenar"
            >
              <ArrowUpDown size={9} />
              {sortLabels[sortBy]}
            </button>
            {showSortMenu && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: 4,
                  background: 'var(--bg-secondary, #1e1e1e)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  padding: 4,
                  zIndex: 50,
                  minWidth: 100,
                }}
              >
                {(Object.keys(sortLabels) as SortOption[]).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setSortBy(opt); setShowSortMenu(false); }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '5px 9px',
                      background: sortBy === opt ? 'rgba(20,184,166,0.1)' : 'transparent',
                      color: sortBy === opt ? '#14b8a6' : 'rgba(255,255,255,0.7)',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: sortBy === opt ? 600 : 400,
                    }}
                  >
                    {sortLabels[opt]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tag chips */}
        {showTagFilter && systemTags.length > 0 && (
          <div className="zen-notes-list__filters" style={{ paddingTop: 2 }}>
            {systemTags.slice(0, 12).map((tag) => (
              <button
                key={tag.id}
                className={`zen-filter-btn ${filterSystemTagIds.includes(tag.id) ? 'zen-filter-btn--active' : ''}`}
                onClick={() => toggleSystemTag(tag.id)}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notes scroll list */}
      <div className="zen-notes-list__scroll" ref={scrollRef}>
        {isLoading && notes.length === 0 && (
          <div className="zen-notes-list__loading">
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {!isLoading && notes.length === 0 && (
          <div className="zen-notes-list__empty">
            <StickyNote size={28} />
            <span>Nenhuma nota encontrada</span>
            <button
              onClick={onNewNote}
              style={{
                marginTop: 4,
                padding: '6px 14px',
                borderRadius: 7,
                border: '1px solid rgba(20,184,166,0.3)',
                background: 'rgba(20,184,166,0.07)',
                color: '#14b8a6',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Criar nota
            </button>
          </div>
        )}

        {notes.map((note) => (
          <div
            key={note.id}
            className={[
              'zen-note-card',
              selectedNoteId === note.id ? 'zen-note-card--active' : '',
              note.is_pinned ? 'zen-note-card--pinned' : '',
            ].join(' ')}
            onClick={() => onSelectNote(note)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelectNote(note)}
            aria-label={`Nota: ${note.title}`}
          >
            <div className="zen-note-card__title">
              {note.sequential_id && (
                <span style={{ fontWeight: 400, opacity: 0.4, marginRight: 4, fontSize: 10 }}>
                  #{note.sequential_id}
                </span>
              )}
              {note.title || 'Sem título'}
            </div>

            <div className="zen-note-card__preview">
              {getPreviewText(note) || 'Nota vazia'}
            </div>

            {note.tags && note.tags.length > 0 && (
              <div className="zen-note-card__tags">
                {note.tags.slice(0, 3).map((tag, i) => (
                  <span key={i} className="zen-note-card__tag">{tag}</span>
                ))}
                {note.tags.length > 3 && (
                  <span className="zen-note-card__tag">+{note.tags.length - 3}</span>
                )}
              </div>
            )}

            <div className="zen-note-card__footer">
              <span className="zen-note-card__author">
                {note.is_pinned && <Pin size={8} style={{ color: '#f59e0b' }} />}
                {note.creator_display_name || 'Você'}
              </span>
              <span className="zen-note-card__date">
                {formatDate(note.updated_at || note.created_at)}
              </span>
            </div>
          </div>
        ))}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} style={{ height: 1 }} />
        {isFetchingMore && (
          <div className="zen-notes-list__loading">
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}
      </div>
    </section>
  );
};
