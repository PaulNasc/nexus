import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Pin,
  ArrowUpDown,
  StickyNote,
  Loader2,
  X,
  Tag,
  BellRing,
  Pencil,
  Trash2,
  LayoutGrid,
  List as ListIcon,
  Folder,
  Filter,
  CheckSquare,
  Square,
  Plus,
} from 'lucide-react';
import { useNotes, SortOption } from '../../contexts/NotesContext';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useSettings } from '../../hooks/useSettings';
import { useSystemTags } from '../../contexts/SystemTagsContext';
import { useCategories } from '../../contexts/CategoriesContext';
import { useI18n } from '../../hooks/useI18n';
import type { Note } from '../../../shared/types/note';

const APP_VERSION = '1.4.0';

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
    selectedCategoryId,
    setSelectedCategoryId,
  } = useNotes();

  const { user } = useAuth();
  const { activeOrg } = useOrganization();
  const { settings, getGreeting } = useSettings();
  const { tags: systemTags } = useSystemTags();
  const { categories } = useCategories();
  const { t } = useI18n();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);

  const systemTagById = useMemo(() => {
    return new Map((systemTags || []).map((t) => [t.id, t]));
  }, [systemTags]);

  const systemTagByName = useMemo(() => {
    return new Map((systemTags || []).map((t) => [t.name.toLowerCase(), t]));
  }, [systemTags]);

  // Greeting translated cleanly ("Boa noite, Paulo!")
  const greetingKey = getGreeting();
  const userName = settings.userName?.trim() || user?.email?.split('@')[0] || 'você';
  const greetingTranslated = t(greetingKey, { name: userName });

  // Infinite scroll observer
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

  const toggleSelectCard = useCallback((noteId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
  }, []);

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

      return '#14b8a6';
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
        <p className="zen-notes-list__greeting">{greetingTranslated}</p>
        <div className="zen-notes-list__meta">
          {activeOrg && (
            <>
              <span className="zen-notes-list__meta-org">🏢 {activeOrg.name}</span>
              <span className="zen-notes-list__meta-dot" />
            </>
          )}
          <span>{totalNotesCount} {totalNotesCount === 1 ? 'nota' : 'notas'}</span>
        </div>
      </header>

      {/* Toolbar Matching Screenshot 3 */}
      <div className="zen-notes-list__toolbar" style={{ gap: 8 }}>
        {/* Search input */}
        <div className="zen-notes-list__search">
          <Search size={13} className="zen-notes-list__search-icon" />
          <input
            className="zen-notes-list__search-input"
            placeholder="Buscar por #ID, nome, data, autor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              aria-label="Limpar busca"
            >
              <X size={11} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </button>
          )}
        </div>

        {/* Action icons bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%', flexWrap: 'wrap' }}>
          {/* View mode toggle (Grid vs List) */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              className={`zen-filter-btn ${viewMode === 'grid' ? 'zen-filter-btn--active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Visualização em Grid"
              style={{ padding: '4px 6px' }}
            >
              <LayoutGrid size={12} />
            </button>
            <button
              className={`zen-filter-btn ${viewMode === 'list' ? 'zen-filter-btn--active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Visualização em Lista"
              style={{ padding: '4px 6px' }}
            >
              <ListIcon size={12} />
            </button>
          </div>

          {/* Folder / Category dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className={`zen-filter-btn ${selectedCategoryId ? 'zen-filter-btn--active' : ''}`}
              onClick={() => setShowCategoryMenu((v) => !v)}
              title="Filtrar por Categoria"
            >
              <Folder size={12} />
            </button>
            {showCategoryMenu && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '100%',
                  marginTop: 4,
                  background: 'var(--bg-secondary, #1e1e1e)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: 4,
                  zIndex: 50,
                  minWidth: 150,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                }}
              >
                <button
                  onClick={() => { setSelectedCategoryId(null); setShowCategoryMenu(false); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px',
                    background: !selectedCategoryId ? 'rgba(20,184,166,0.12)' : 'transparent',
                    color: !selectedCategoryId ? '#14b8a6' : 'rgba(255,255,255,0.8)',
                    border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11,
                  }}
                >
                  Todas as categorias
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedCategoryId(c.id); setShowCategoryMenu(false); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px',
                      background: selectedCategoryId === c.id ? 'rgba(20,184,166,0.12)' : 'transparent',
                      color: selectedCategoryId === c.id ? '#14b8a6' : 'rgba(255,255,255,0.8)',
                      border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11,
                    }}
                  >
                    📁 {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filters menu */}
          <div style={{ position: 'relative' }}>
            <button
              className={`zen-filter-btn ${filterPinned || filterSystemTagIds.length > 0 ? 'zen-filter-btn--active' : ''}`}
              onClick={() => setShowFilterMenu((v) => !v)}
              title="Filtros"
            >
              <Filter size={12} />
            </button>
            {showFilterMenu && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '100%',
                  marginTop: 4,
                  background: 'var(--bg-secondary, #1e1e1e)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: 8,
                  zIndex: 50,
                  minWidth: 160,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <button
                  className={`zen-filter-btn ${filterPinned ? 'zen-filter-btn--active' : ''}`}
                  onClick={() => setFilterPinned(!filterPinned)}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  <Pin size={10} /> Fixadas
                </button>
                {systemTags.length > 0 && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Tags de Sistema:</div>
                )}
                {systemTags.slice(0, 8).map((tag) => (
                  <button
                    key={tag.id}
                    className={`zen-filter-btn ${filterSystemTagIds.includes(tag.id) ? 'zen-filter-btn--active' : ''}`}
                    onClick={() => toggleSystemTag(tag.id)}
                    style={{ width: '100%', justifyContent: 'flex-start', color: tag.color }}
                  >
                    <Tag size={10} /> {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort */}
          <div style={{ position: 'relative' }}>
            <button
              className="zen-filter-btn"
              onClick={() => setShowSortMenu((v) => !v)}
              title="Ordenar"
            >
              <ArrowUpDown size={12} />
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
                  minWidth: 130,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                }}
              >
                {(Object.keys(sortLabels) as SortOption[]).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setSortBy(opt); setShowSortMenu(false); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px',
                      background: sortBy === opt ? 'rgba(20,184,166,0.12)' : 'transparent',
                      color: sortBy === opt ? '#14b8a6' : 'rgba(255,255,255,0.8)',
                      border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11,
                    }}
                  >
                    {sortLabels[opt]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Batch selection mode toggle */}
          <button
            className={`zen-filter-btn ${selectionMode ? 'zen-filter-btn--active' : ''}`}
            onClick={() => setSelectionMode((v) => !v)}
            title="Seleção Múltipla"
          >
            <CheckSquare size={12} />
          </button>

          {/* Plus button for new note */}
          <button
            className="zen-filter-btn"
            onClick={onNewNote}
            title="Nova Nota"
            style={{
              marginLeft: 'auto',
              background: '#14b8a6',
              color: '#fff',
              borderRadius: 6,
              padding: '4px 8px',
              fontWeight: 600,
            }}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Notes scroll list */}
      <div className="zen-notes-list__scroll">
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

        <div style={viewMode === 'grid' ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 } : undefined}>
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
                onClick={() => {
                  if (selectionMode) toggleSelectCard(note.id);
                  else onSelectNote(note, false);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSelectNote(note, false)}
                aria-label={`Nota: ${note.title}`}
              >
                {/* Accent Bar */}
                <div
                  className="zen-note-card__accent-bar"
                  style={{ backgroundColor: accentColor }}
                />

                {/* Hover Quick Actions */}
                <div className="zen-note-card__hover-actions">
                  <button
                    className="zen-card-action-btn"
                    title="Enviar Ping / Notificar"
                    onClick={(e) => { e.stopPropagation(); onOpenPingModal(note); }}
                  >
                    <BellRing size={12} />
                  </button>

                  <button
                    className="zen-card-action-btn"
                    title="Editar Nota"
                    onClick={(e) => { e.stopPropagation(); onSelectNote(note, true); }}
                  >
                    <Pencil size={12} />
                  </button>

                  <button
                    className={`zen-card-action-btn ${note.is_pinned ? 'zen-card-action-btn--pinned' : ''}`}
                    title={note.is_pinned ? 'Desafixar' : 'Fixar'}
                    onClick={(e) => { e.stopPropagation(); onTogglePinNote(note); }}
                  >
                    <Pin size={12} />
                  </button>

                  <button
                    className="zen-card-action-btn zen-card-action-btn--danger"
                    title="Deletar Nota"
                    onClick={(e) => { e.stopPropagation(); onDeleteNote(note); }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* Card Title */}
                <div className="zen-note-card__title">
                  {selectionMode && (
                    <span style={{ marginRight: 4, display: 'inline-flex' }}>
                      {selectedIds.has(note.id) ? (
                        <CheckSquare size={13} style={{ color: '#14b8a6' }} />
                      ) : (
                        <Square size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
                      )}
                    </span>
                  )}
                  {note.sequential_id != null && (
                    <span style={{ color: accentColor, fontWeight: 600, marginRight: 4, fontSize: 11 }}>
                      #{note.sequential_id}
                    </span>
                  )}
                  {note.title || 'Sem título'}
                </div>

                {/* Preview text */}
                <div className="zen-note-card__preview">
                  {getCleanPreviewText(note)}
                </div>

                {/* Tags */}
                {note.tags && note.tags.length > 0 && (
                  <div className="zen-note-card__tags">
                    {note.tags.slice(0, 2).map((tag, i) => {
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
                  </div>
                )}

                {/* Footer */}
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
        </div>

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} style={{ height: 1 }} />
        {isFetchingMore && (
          <div className="zen-notes-list__loading">
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}
      </div>

      {/* Centered Footer at bottom of Notes Column */}
      <footer
        style={{
          padding: '8px 12px',
          borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
          textAlign: 'center',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.05em',
          color: 'var(--text-muted, rgba(255,255,255,0.35))',
          background: 'var(--bg-secondary, #141414)',
          flexShrink: 0,
          textTransform: 'uppercase',
        }}
      >
        Nexus <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.25)' }}>v{APP_VERSION}</span>
      </footer>
    </section>
  );
};
