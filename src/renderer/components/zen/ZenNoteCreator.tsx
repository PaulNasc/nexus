import React, { useState, useCallback } from 'react';
import {
  StickyNote,
  Plus,
  FileText,
  FileCode2,
  Save,
  X,
  Image as ImageIcon,
  Tag,
  Hash,
  AlignLeft,
  Type,
} from 'lucide-react';
import { useNotes } from '../../contexts/NotesContext';
import { useSystemTags } from '../../contexts/SystemTagsContext';
import { useToast } from '../../contexts/ToastContext';
import type { Note, CreateNoteData } from '../../../shared/types/note';

interface ZenNoteCreatorProps {
  onNoteCreated: (note: Note) => void;
  onCancel: () => void;
  showEmptyPrompt?: boolean;
}

export const ZenNoteCreator: React.FC<ZenNoteCreatorProps> = ({
  onNoteCreated,
  onCancel,
  showEmptyPrompt = false,
}) => {
  const { createNote } = useNotes();
  const { tags: systemTags } = useSystemTags();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [format, setFormat] = useState<'markdown' | 'text'>('markdown');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [systemTagId, setSystemTagId] = useState<number | ''>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isComposing, setIsComposing] = useState(false); // true when user started typing

  const handleStartCreating = () => setIsComposing(true);

  const handleSave = useCallback(async () => {
    if (!title.trim() && !content.trim()) {
      showToast('Adicione um título ou conteúdo para salvar', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      const noteData: CreateNoteData = {
        title: title.trim() || 'Nota sem título',
        content: content.trim(),
        format,
        tags,
        is_pinned: false,
        system_tag_id: systemTagId !== '' ? systemTagId : undefined,
      };
      const created = await createNote(noteData);
      if (created) {
        showToast('Nota criada com sucesso!', 'success');
        onNoteCreated(created);
      }
    } catch {
      showToast('Erro ao criar nota', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [title, content, format, tags, systemTagId, createNote, onNoteCreated, showToast]);

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (tag && !tags.includes(tag)) setTags((prev) => [...prev, tag]);
    setTagInput('');
  };

  const handleRemoveTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newVal = content.substring(0, start) + '  ' + content.substring(end);
      setContent(newVal);
      setTimeout(() => target.setSelectionRange(start + 2, start + 2), 0);
    }
  };

  // ── Empty / prompt state (before user clicks) ──────────────────────────
  if (showEmptyPrompt && !isComposing) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          padding: 40,
          height: '100%',
          background: 'var(--bg-primary, #0f0f0f)',
        }}
      >
        <StickyNote
          size={52}
          style={{ color: 'rgba(255,255,255,0.12)', flexShrink: 0 }}
        />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary, rgba(255,255,255,0.9))', margin: '0 0 8px' }}>
            Nenhuma nota selecionada
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted, rgba(255,255,255,0.45))', margin: '0 0 24px', lineHeight: 1.5 }}>
            Selecione uma nota na lista ao lado para visualizá-la,<br />
            ou crie uma nova nota diretamente aqui.
          </p>
        </div>
        <button
          onClick={handleStartCreating}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 28px',
            borderRadius: 10,
            border: 'none',
            background: '#14b8a6',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(20,184,166,0.35)',
            transition: 'transform 0.12s ease, opacity 0.12s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Plus size={16} />
          + Nova Nota
        </button>

        {/* Quick options grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            width: '100%',
            maxWidth: 380,
            marginTop: 8,
          }}
        >
          {[
            { icon: <FileText size={16} />, label: 'Nota em Texto', hint: 'Simples e direto' },
            { icon: <FileCode2 size={16} />, label: 'Nota Markdown', hint: 'Formatação rica' },
            { icon: <ImageIcon size={16} />, label: 'Com Imagem', hint: 'Imagem + texto' },
            { icon: <Hash size={16} />, label: 'Com Tags', hint: 'Organizado por tags' },
          ].map((opt, idx) => (
            <button
              key={idx}
              onClick={handleStartCreating}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 4,
                padding: '12px 14px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'var(--bg-secondary, #141414)',
                color: 'var(--text-primary, rgba(255,255,255,0.85))',
                cursor: 'pointer',
                transition: 'background 0.15s ease, border-color 0.15s ease',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(20,184,166,0.08)';
                e.currentTarget.style.borderColor = 'rgba(20,184,166,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-secondary, #141414)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              }}
            >
              <span style={{ color: '#14b8a6' }}>{opt.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{opt.label}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{opt.hint}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── EDITOR (Evernote-style inline note creator) ─────────────────────────
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-primary, #0f0f0f)',
        overflow: 'hidden',
      }}
    >
      {/* Top Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 18px',
          background: 'var(--bg-secondary, #141414)',
          borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
          flexShrink: 0,
          gap: 12,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, rgba(255,255,255,0.85))' }}>
          Nova Nota
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Format toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setFormat('markdown')}
              title="Markdown"
              style={{
                padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 4, border: 'none', cursor: 'pointer',
                background: format === 'markdown' ? 'rgba(20,184,166,0.2)' : 'transparent',
                color: format === 'markdown' ? '#14b8a6' : 'rgba(255,255,255,0.5)',
              }}
            >
              <FileCode2 size={12} style={{ marginRight: 4, display: 'inline' }} />MD
            </button>
            <button
              onClick={() => setFormat('text')}
              title="Texto simples"
              style={{
                padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 4, border: 'none', cursor: 'pointer',
                background: format === 'text' ? 'rgba(20,184,166,0.2)' : 'transparent',
                color: format === 'text' ? '#14b8a6' : 'rgba(255,255,255,0.5)',
              }}
            >
              <AlignLeft size={12} style={{ marginRight: 4, display: 'inline' }} />TXT
            </button>
          </div>

          {/* System tag select */}
          {systemTags.length > 0 && (
            <select
              value={systemTagId}
              onChange={(e) => setSystemTagId(e.target.value === '' ? '' : Number(e.target.value))}
              style={{
                padding: '4px 8px', fontSize: 11, borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="">Tag sistema...</option>
              {systemTags.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}

          {showEmptyPrompt && (
            <button
              onClick={onCancel}
              title="Cancelar"
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
            >
              <X size={14} />
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px',
              borderRadius: 8, border: 'none', background: '#14b8a6', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            <Save size={13} />
            {isSaving ? 'Salvando...' : 'Salvar Nota'}
          </button>
        </div>
      </div>

      {/* Title input */}
      <div style={{ padding: '16px 24px 0', flexShrink: 0 }}>
        <input
          autoFocus
          type="text"
          placeholder="Título da nota..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            width: '100%', fontSize: 22, fontWeight: 700,
            background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text-primary, rgba(255,255,255,0.92))',
            fontFamily: 'inherit',
            padding: 0,
          }}
        />
      </div>

      {/* Tags row */}
      <div style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, flexShrink: 0 }}>
        {tags.map((tag) => (
          <span
            key={tag}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 6,
              background: 'rgba(20,184,166,0.1)', color: '#14b8a6',
              border: '1px solid rgba(20,184,166,0.2)', fontSize: 11, fontWeight: 500,
            }}
          >
            #{tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#14b8a6', padding: 0, display: 'flex' }}
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Tag size={11} style={{ color: 'rgba(255,255,255,0.4)' }} />
          <input
            type="text"
            placeholder="adicionar tag..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ',') && (e.preventDefault(), handleAddTag())}
            style={{
              fontSize: 11, background: 'transparent', border: 'none', outline: 'none',
              color: 'rgba(255,255,255,0.6)', width: 110,
            }}
          />
        </div>
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 24px', flexShrink: 0 }} />

      {/* Content textarea */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <textarea
          placeholder={format === 'markdown'
            ? '# Título\n\nEscreva sua nota em **Markdown**...\n\n- Item 1\n- Item 2\n\n```\ncódigo aqui\n```'
            : 'Escreva sua nota aqui...'}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1, resize: 'none',
            background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text-primary, rgba(255,255,255,0.88))',
            fontSize: 14, lineHeight: 1.75,
            fontFamily: format === 'markdown' ? 'ui-monospace, "Cascadia Code", Consolas, monospace' : 'inherit',
            padding: '14px 24px 24px',
            width: '100%', height: '100%',
          }}
        />
      </div>
    </div>
  );
};
