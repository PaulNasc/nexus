import React, { useState, useCallback, useMemo } from 'react';
import {
  StickyNote,
  Plus,
  Pin,
  Trash2,
  Pencil,
  BellRing,
  Copy,
  Check,
  FileText,
  Download,
  ExternalLink,
  ArrowLeft,
  Link2,
} from 'lucide-react';
import { NoteEditor } from '../NoteEditor';
import { useNotes } from '../../contexts/NotesContext';
import { useToast } from '../../contexts/ToastContext';
import { useSystemTags } from '../../contexts/SystemTagsContext';
import { resolveImageUrl } from '../../utils/image';
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

/** Converts raw markdown text to clean rendered HTML for the View Mode */
function renderMarkdownToHtml(md: string, attachedImages: string[] = []): string {
  if (!md) return '';
  let html = md;

  // Clean out PDF & Video raw source blocks from inline text
  html = html.replace(/\[PDF_SOURCE\][\s\S]*?\[\/PDF_SOURCE\]/gi, '');
  html = html.replace(/\[VIDEO_SOURCE\][\s\S]*?\[\/VIDEO_SOURCE\]/gi, '');

  // Code blocks
  html = html.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    (_m, lang, code) =>
      `<pre class="note-code-block" data-lang="${lang || ''}"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim()}</code></pre>`
  );
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="note-inline-code">$1</code>');

  // Short image tags: ![imagem-1]
  html = html.replace(/!\[imagem-(\d+)\]/g, (_match, numStr) => {
    const idx = parseInt(numStr, 10) - 1;
    const imgPayload = attachedImages[idx];
    if (imgPayload) {
      const resolved = resolveImageUrl(imgPayload);
      return `<div style="margin: 12px 0; border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);"><img src="${resolved}" alt="Imagem ${numStr}" style="max-width: 100%; max-height: 400px; display: block; object-fit: contain; margin: 0 auto;" /></div>`;
    }
    return '';
  });

  // Standard images: ![alt](src)
  html = html.replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, (_match, alt, src) => {
    const resolved = resolveImageUrl(src);
    return `<div style="margin: 12px 0; border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);"><img src="${resolved}" alt="${alt || 'imagem'}" style="max-width: 100%; max-height: 400px; display: block; object-fit: contain; margin: 0 auto;" /></div>`;
  });

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #14b8a6; text-decoration: underline;">$1</a>');
  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3 style="font-size: 16px; font-weight: 600; margin: 16px 0 8px; color: var(--text-primary);">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="font-size: 18px; font-weight: 700; margin: 18px 0 8px; color: var(--text-primary);">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 style="font-size: 22px; font-weight: 700; margin: 20px 0 10px; color: var(--text-primary);">$1</h1>');
  // Bold / Italic / Strikethrough
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
  // Blockquotes
  html = html.replace(/^> (.*$)/gim, '<blockquote style="border-left: 3px solid #14b8a6; padding-left: 12px; margin: 12px 0; color: rgba(255,255,255,0.6); font-style: italic;">$1</blockquote>');
  // Line breaks
  html = html.replace(/\n/g, '<br/>');

  return html;
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
  const { tags: systemTags } = useSystemTags();
  const [copied, setCopied] = useState(false);

  const systemTagById = useMemo(() => {
    return new Map((systemTags || []).map((t) => [t.id, t]));
  }, [systemTags]);

  const systemTagByName = useMemo(() => {
    return new Map((systemTags || []).map((t) => [t.name.toLowerCase(), t]));
  }, [systemTags]);

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

  const handleCopyContent = useCallback(async () => {
    if (!note?.content) return;
    try {
      await navigator.clipboard.writeText(note.content);
      setCopied(true);
      showToast('Conteúdo copiado para a área de transferência', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Erro ao copiar conteúdo', 'error');
    }
  }, [note?.content, showToast]);

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

  // Resolve system tag
  const systemTag = note.system_tag_id
    ? systemTagById.get(note.system_tag_id)
    : note.tags?.[0]
    ? systemTagByName.get(note.tags[0].toLowerCase())
    : undefined;

  const hasPdfSource = note.content?.includes('[PDF_SOURCE]');
  const hasVideoSource = note.content?.includes('[VIDEO_SOURCE]');

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <section className="zen-note-panel">
      {/* Top Toolbar */}
      <div className="zen-note-panel__toolbar">
        <div className="zen-note-panel__actions">
          {!isEditing ? (
            <button
              className="zen-panel-btn zen-panel-btn--primary"
              onClick={() => onSetEditing(true)}
              title="Editar Nota"
            >
              <Pencil size={13} />
              Editar
            </button>
          ) : (
            <button
              className="zen-panel-btn"
              onClick={() => onSetEditing(false)}
              title="Voltar para Visualização"
            >
              <ArrowLeft size={13} />
              Visualizar
            </button>
          )}

          <button
            className={`zen-panel-btn ${note.is_pinned ? 'zen-panel-btn--pinned' : ''}`}
            onClick={handlePin}
            title={note.is_pinned ? 'Desafixar' : 'Fixar'}
          >
            <Pin size={13} />
            {note.is_pinned ? 'Fixada' : 'Fixar'}
          </button>

          <button
            className="zen-panel-btn"
            onClick={() => onOpenPingModal(note)}
            title="Enviar Ping / Notificar"
          >
            <BellRing size={13} />
            Notificar
          </button>

          <button
            className="zen-panel-btn"
            onClick={handleCopyContent}
            title="Copiar Conteúdo"
          >
            {copied ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>

          <button
            className="zen-panel-btn zen-panel-btn--danger"
            onClick={handleDelete}
            title="Deletar Nota"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Note ID & Author Info */}
        <div style={{ fontSize: 11, color: 'var(--text-muted, rgba(255,255,255,0.4))', display: 'flex', alignItems: 'center', gap: 8 }}>
          {note.sequential_id != null && (
            <span style={{ color: '#14b8a6', fontWeight: 600 }}>
              #{note.sequential_id}
            </span>
          )}
          <span>{note.creator_display_name ? `por ${note.creator_display_name}` : 'Você'}</span>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="zen-note-panel__content">
        {isEditing ? (
          /* EDIT MODE: NoteEditor Inline */
          <NoteEditor
            note={note}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={() => onSetEditing(false)}
          />
        ) : (
          /* READ-ONLY VIEW MODE: Formatted Markdown & Media Cards */
          <div className="zen-viewer">
            <header className="zen-viewer__header">
              <h1 className="zen-viewer__title">{note.title || 'Sem título'}</h1>

              <div className="zen-viewer__meta">
                {systemTag && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: 'rgba(255,255,255,0.08)',
                      color: systemTag.color || '#14b8a6',
                      border: `1px solid ${systemTag.color || '#14b8a6'}`,
                      textTransform: 'uppercase',
                    }}
                  >
                    {systemTag.name}
                  </span>
                )}

                {note.tags && note.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {note.tags.map((t, i) => (
                      <span key={i} className="zen-note-card__tag">{t}</span>
                    ))}
                  </div>
                )}

                <span>Atualizado em: {formatDate(note.updated_at || note.created_at)}</span>
              </div>
            </header>

            {/* PDF Attachment Notice Card */}
            {hasPdfSource && (
              <div className="zen-viewer__pdf-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileText size={24} style={{ color: '#14b8a6' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      Documento PDF em Anexo
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Este documento possui uma versão em PDF armazenada na nuvem.
                    </div>
                  </div>
                </div>
                <button
                  className="zen-panel-btn zen-panel-btn--primary"
                  onClick={() => onSetEditing(true)}
                  style={{ fontSize: 11 }}
                >
                  <ExternalLink size={12} />
                  Abrir no Editor
                </button>
              </div>
            )}

            {/* Formatted Markdown HTML Content */}
            <div
              className="zen-viewer__body"
              dangerouslySetInnerHTML={{
                __html: renderMarkdownToHtml(note.content || '', note.attachedImages || []),
              }}
            />

            {/* Attached Images Gallery if any */}
            {note.attachedImages && note.attachedImages.length > 0 && (
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Imagens Anexadas ({note.attachedImages.length})
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                  {note.attachedImages.map((img, idx) => (
                    <div key={idx} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <img src={resolveImageUrl(img)} alt={`Anexo ${idx + 1}`} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
