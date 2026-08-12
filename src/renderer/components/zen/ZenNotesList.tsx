import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Pin, ArrowUpDown, StickyNote, Loader2, X, Tag, BellRing, Pencil, Trash2 } from 'lucide-react';
import { useNotes, SortOption } from '../../contexts/NotesContext';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useSettings } from '../../hooks/useSettings';
import { useSystemTags } from '../../contexts/SystemTagsContext';
import { useI18n } from '../../hooks/useI18n';
import type { Note } from '../../../shared/types/note';

interface ZenNotesListProps {
  selectedNoteId: number | null;
  onSelectNote: (note: Note, editMode?: boolean) => void;
  onNewNote: () => void;
  onOpenPingModal: (note: Note) => void;
  onDeleteNote: (note: Note) => void;
  onTogglePinNote: (note: Note) => void;
}

export const ZenNotesList: React.FC<ZenNotesListProps> = ({
  selectedNoteId,
  onSelectNote,
  onNewNote,
  onOpenPingModal,
  onDeleteNote,
  onTogglePinNote,
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
  const { tags: systemTags, systemTagById, systemTagByName } = useSystemTags();
  const { t } = useI18n();

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showTagFilter, setShowTagFilter] = useState(false);

  // Greeting translated cleanly ("Boa noite, Paulo!")
  const greetingKey = getGreeting();
  const greetingTranslated = t(greetingKey);
  const userName = settings.userName?.trim() || user?.email?.split('@')[0] || 'você';

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
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  /** Calculate note color / accent bar */
  const getNoteAccentColor = useCallback(
    (note: Note): string => {
      if (note.system_tag_id !== undefined) {
        const sysTag = systemTagById.get(note.system_tag_id);
        if (sysTag?.color) return sysTag.color;
      }

      if (note.tags && note.tags.length > 0) {
        for (const tag of note.tags) {
          const sysTag = systemTagByName.get(tag.toLowerCase());
          if (sysTag?.color) return sysTag.color;
        }
      }

      if (note.color) {
        return note.color;
      }

      return '#14b8a6'; // default accent
    },
    [systemTagById, systemTagByName]
  );

  /** Clean up raw markdown and PDF/Video tags for card preview text */
  const getCleanPreviewText = (note: Note): string => {
    if (!note.content) return 'Nota vazia';
    const raw = note.content.trim();

    if (raw.startsWith('[PDF_SOURCE]') || raw.includes('[PDF_SOURCE]')) {
      return '📄 Documento PDF importado. Abra a nota para ver os detalhes.';
    }
    if (raw.startsWith('[VIDEO_SOURCE]') || raw.includes('[VIDEO_SOURCE]')) {
      return '🎥 Vídeo em anexo. Abra a nota para ver os detalhes.';
    }

    const plain = raw
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/[#*_`~>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return plain.slice(0, 90) || 'Nota sem texto';
  };

  return (
    <section className="zen-notes-list">
      {/* Header */}
      <header className="zen-notes-list__header">
        <h1 className="zen-notes-list__title">Notas</h1>
        <p className="zen-notes-list__greeting">{greetingTranslated}, {userName}!</p>
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
            placeholder="Pesquisar por #ID, título, conteúdo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex' }}
              aria-label="Limpar busca"
            >
              <X size={11} style={{ color: 'rgba(255,255,255,0.4)' }} />
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
            <Pin size={10} />
            Fixadas
          </button>

          {/* Tag filter toggle */}
          {systemTags.length > 0 && (
            <button
              className={`zen-filter-btn ${filterSystemTagIds.length > 0 || showTagFilter ? 'zen-filter-btn--active' : ''}`}
              onClick={() => setShowTagFilter((v) => !v)}
              aria-label="Filtrar por tag"
            >
              <Tag size={10} />
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
              <ArrowUpDown size={10} />
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
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: 4,
                  zIndex: 50,
                  minWidth: 120,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
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
                      padding: '6px 10px',
                      background: sortBy === opt ? 'rgba(20,184,166,0.12)' : 'transparent',
                      color: sortBy === opt ? '#14b8a6' : 'rgba(255,255,255,0.8)',
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
                style={{
                  borderColor: filterSystemTagIds.includes(tag.id) ? tag.color : undefined,
                  color: filterSystemTagIds.includes(tag.id) ? tag.color : undefined,
                }}
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
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {!isLoading && notes.length === 0 && (
          <div className="zen-notes-list__empty">
            <StickyNote size={32} />
            <span>Nenhuma nota encontrada</span>
            <button
              onClick={onNewNote}
              style={{
                marginTop: 6,
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid rgba(20,184,166,0.35)',
                background: 'rgba(20,184,166,0.1)',
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

        {notes.map((note) => {
          const accentColor = getNoteAccentColor(note);
          const isSelected = selectedNoteId === note.id;

          return (
            <div
              key={note.id}
              className={[
                'zen-note-card',
                isSelected ? 'zen-note-card--active' : '',
              ].join(' ')}
              onClick={() => onSelectNote(note, false)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelectNote(note, false)}
              aria-label={`Nota: ${note.title}`}
            >
              {/* Color Accent Bar */}
              <div
                className="zen-note-card__accent-bar"
                style={{ backgroundColor: accentColor }}
              />

              {/* Hover Quick Actions Bar */}
              <div className="zen-note-card__hover-actions">
                <button
                  className="zen-card-action-btn"
                  title="Enviar Ping / Notificar"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPingModal(note);
                  }}
                >
                  <BellRing size={12} />
                </button>

                <button
                  className="zen-card-action-btn"
                  title="Editar Nota"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectNote(note, true);
                  }}
                >
                  <Pencil size={12} />
                </button>

                <button
                  className={`zen-card-action-btn ${note.is_pinned ? 'zen-card-action-btn--pinned' : ''}`}
                  title={note.is_pinned ? 'Desafixar' : 'Fixar'}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePinNote(note);
                  }}
                >
                  <Pin size={12} />
                </button>

                <button
                  className="zen-card-action-btn zen-card-action-btn--danger"
                  title="Deletar Nota"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNote(note);
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Title */}
              <div className="zen-note-card__title">
                {note.sequential_id != null && (
                  <span style={{ color: accentColor, fontWeight: 600, marginRight: 4, fontSize: 11 }}>
                    #{note.sequential_id}
                  </span>
                )}
                {note.title || 'Sem título'}
              </div>

              {/* Clean Preview */}
              <div className="zen-note-card__preview">
                {getCleanPreviewText(note)}
              </div>

              {/* Tag badges */}
              {note.tags && note.tags.length > 0 && (
                <div className="zen-note-card__tags">
                  {note.tags.slice(0, 3).map((tag, i) => {
                    const sysTag = systemTagByName.get(tag.toLowerCase());
                    return (
                      <span
                        key={i}
                        className="zen-note-card__tag"
                        style={sysTag?.color ? { color: sysTag.color, borderColor: sysTag.color } : undefined}
                      >
                        {tag}
                      </span>
                    );
                  })}
                  {note.tags.length > 3 && (
                    <span className="zen-note-card__tag">+{note.tags.length - 3}</span>
                  )}
                </div>
              )}

              {/* Footer (Author & Date) */}
              <div className="zen-note-card__footer">
                <span className="zen-note-card__author">
                  {note.is_pinned && <Pin size={9} style={{ color: '#f59e0b', marginRight: 2 }} />}
                  {note.creator_display_name ? `por ${note.creator_display_name}` : 'Você'}
                </span>
                <span className="zen-note-card__date">
                  {formatDate(note.updated_at || note.created_at)}
                </span>
              </div>
            </div>
          );
        })}

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
