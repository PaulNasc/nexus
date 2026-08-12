import React, { useState, useCallback, useRef } from 'react';
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
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Heading1,
  Heading2,
  Trash2,
  HelpCircle,
  Move,
  ChevronDown,
} from 'lucide-react';
import { useNotes } from '../../contexts/NotesContext';
import { useSystemTags } from '../../contexts/SystemTagsContext';
import { useToast } from '../../contexts/ToastContext';
import type { Note, CreateNoteData } from '../../../shared/types/note';

interface ZenImageItem {
  id: string;
  src: string;
  width: number;
  align: 'left' | 'center' | 'right';
}

interface ZenNoteCreatorProps {
  onNoteCreated: (note: Note) => void;
  onCancel: () => void;
  showEmptyPrompt?: boolean;
}

// ── Interactive WYSIWYG Drag-to-Resize Image Component ──────────────────────
const ResizableImageItem: React.FC<{
  item: ZenImageItem;
  onUpdateWidth: (width: number) => void;
  onUpdateAlign: (align: 'left' | 'center' | 'right') => void;
  onRemove: () => void;
}> = ({ item, onUpdateWidth, onUpdateAlign, onRemove }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = item.width;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(140, Math.min(1000, startWidth + deltaX));
      onUpdateWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const marginStyle =
    item.align === 'left'
      ? '12px auto 12px 0'
      : item.align === 'right'
      ? '12px 0 12px auto'
      : '12px auto';

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => !isResizing && setIsHovered(false)}
      style={{
        position: 'relative',
        width: `${item.width}px`,
        maxWidth: '100%',
        margin: marginStyle,
        transition: isResizing ? 'none' : 'width 0.1s ease',
        userSelect: 'none',
      }}
    >
      {/* Visual Image */}
      <img
        src={item.src}
        alt="Imagem anexada"
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          borderRadius: 8,
          border: isHovered || isResizing ? '2px solid #14b8a6' : '1px solid rgba(255,255,255,0.1)',
          boxShadow: isHovered ? '0 6px 20px rgba(0,0,0,0.5)' : 'none',
        }}
      />

      {/* Top Floating Controls Bar */}
      {(isHovered || isResizing) && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(18, 18, 20, 0.92)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 6,
            padding: '4px 8px',
            zIndex: 20,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          {/* Alignment controls */}
          <button
            onClick={() => onUpdateAlign('left')}
            title="Alinhar à Esquerda"
            style={{
              padding: '3px 6px', border: 'none', borderRadius: 4,
              background: item.align === 'left' ? 'rgba(20,184,166,0.3)' : 'transparent',
              color: item.align === 'left' ? '#14b8a6' : '#9ca3af', cursor: 'pointer',
            }}
          >
            <AlignLeft size={13} />
          </button>
          <button
            onClick={() => onUpdateAlign('center')}
            title="Centralizar"
            style={{
              padding: '3px 6px', border: 'none', borderRadius: 4,
              background: item.align === 'center' ? 'rgba(20,184,166,0.3)' : 'transparent',
              color: item.align === 'center' ? '#14b8a6' : '#9ca3af', cursor: 'pointer',
            }}
          >
            <AlignCenter size={13} />
          </button>
          <button
            onClick={() => onUpdateAlign('right')}
            title="Alinhar à Direita"
            style={{
              padding: '3px 6px', border: 'none', borderRadius: 4,
              background: item.align === 'right' ? 'rgba(20,184,166,0.3)' : 'transparent',
              color: item.align === 'right' ? '#14b8a6' : '#9ca3af', cursor: 'pointer',
            }}
          >
            <AlignRight size={13} />
          </button>

          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

          {/* Preset widths */}
          <button
            onClick={() => onUpdateWidth(220)}
            style={{ padding: '2px 5px', fontSize: 10, border: 'none', background: 'transparent', color: '#d1d5db', cursor: 'pointer' }}
          >
            25%
          </button>
          <button
            onClick={() => onUpdateWidth(440)}
            style={{ padding: '2px 5px', fontSize: 10, border: 'none', background: 'transparent', color: '#d1d5db', cursor: 'pointer' }}
          >
            50%
          </button>
          <button
            onClick={() => onUpdateWidth(660)}
            style={{ padding: '2px 5px', fontSize: 10, border: 'none', background: 'transparent', color: '#d1d5db', cursor: 'pointer' }}
          >
            75%
          </button>

          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

          <span style={{ fontSize: 11, color: '#14b8a6', fontWeight: 600, paddingRight: 4 }}>
            {item.width}px
          </span>

          <button
            onClick={onRemove}
            title="Remover Imagem"
            style={{ padding: '3px 6px', border: 'none', borderRadius: 4, background: 'rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}

      {/* Mouse Drag Corner Handle (Bottom-Right) */}
      {(isHovered || isResizing) && (
        <div
          onMouseDown={handleMouseDown}
          title="Clique e arraste com o mouse para redimensionar"
          style={{
            position: 'absolute',
            bottom: -6,
            right: -6,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#14b8a6',
            border: '2px solid #fff',
            cursor: 'nwse-resize',
            zIndex: 30,
            boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
          }}
        />
      )}
    </div>
  );
};

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
  // Default format: 'text' (TXT) as requested
  const [format, setFormat] = useState<'markdown' | 'text'>('text');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [systemTagId, setSystemTagId] = useState<number | ''>('');
  const [showSystemTagDropdown, setShowSystemTagDropdown] = useState(false);
  const [attachedImageObjects, setAttachedImageObjects] = useState<ZenImageItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [showNoSystemTagConfirm, setShowNoSystemTagConfirm] = useState(false);

  const selectedSystemTag = systemTags.find((t) => t.id === systemTagId);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleStartCreating = () => setIsComposing(true);

  // Add visual image object without inserting raw base64 text code into textarea
  const addVisualImage = useCallback((base64Src: string) => {
    const newImage: ZenImageItem = {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      src: base64Src,
      width: 440,
      align: 'center',
    };
    setAttachedImageObjects((prev) => [...prev, newImage]);
  }, []);

  // Handle Ctrl+V image pasting (renders image visually, keeps text area clean)
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            if (base64) {
              addVisualImage(base64);
              showToast('Imagem colada com sucesso!', 'success');
            }
          };
          reader.readAsDataURL(file);
        }
      }
    },
    [addVisualImage, showToast]
  );

  // File Upload handler for images
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          addVisualImage(base64);
          showToast(`Imagem "${file.name}" anexada`, 'success');
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // Execute Save Note logic
  const executeSaveNote = useCallback(async () => {
    if (!title.trim() && !content.trim() && attachedImageObjects.length === 0) {
      showToast('Adicione um título, conteúdo ou imagem para salvar', 'info');
      return;
    }
    setIsSaving(true);
    try {
      const attachedImagesBase64 = attachedImageObjects.map((img) => img.src);

      // Build clean content formatted with embedded image dimensions for viewer
      let finalContent = content.trim();
      if (attachedImageObjects.length > 0) {
        const imageMarkup = attachedImageObjects
          .map(
            (img) =>
              `<img src="${img.src}" width="${img.width}" align="${img.align}" style="max-width:100%; border-radius:8px; margin:12px auto; display:block;" />`
          )
          .join('\n');
        finalContent = finalContent ? `${finalContent}\n\n${imageMarkup}` : imageMarkup;
      }

      const noteData: CreateNoteData = {
        title: title.trim() || 'Nota sem título',
        content: finalContent,
        format,
        tags,
        system_tag_id: systemTagId !== '' ? systemTagId : undefined,
        attachedImages: attachedImagesBase64.length > 0 ? attachedImagesBase64 : undefined,
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
      setShowNoSystemTagConfirm(false);
    }
  }, [title, content, format, tags, systemTagId, attachedImageObjects, createNote, onNoteCreated, showToast]);

  // Handle Save Note button click with System Tag confirmation check
  const handleSaveClick = () => {
    if (systemTagId === '') {
      setShowNoSystemTagConfirm(true);
    } else {
      void executeSaveNote();
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (tag && !tags.includes(tag)) setTags((prev) => [...prev, tag]);
    setTagInput('');
  };

  const handleRemoveTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + `${prefix}${suffix}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = `${prefix}${selectedText || 'texto'}${suffix}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText.length || 5));
    }, 0);
  };

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
            { icon: <FileText size={16} />, label: 'Nota em Texto (Padrão)', hint: 'Simples e direto' },
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
                border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                background: 'var(--bg-secondary, #141414)',
                color: 'var(--text-primary, #0f172a)',
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
                e.currentTarget.style.borderColor = 'var(--border-subtle, rgba(255,255,255,0.08))';
              }}
            >
              <span style={{ color: '#14b8a6' }}>{opt.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>{opt.label}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted, #64748b)' }}>{opt.hint}</span>
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
        position: 'relative',
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
          {/* Format toggle (TXT default) */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-secondary, rgba(0,0,0,0.05))',
              borderRadius: 6,
              padding: 2,
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
            }}
          >
            <button
              onClick={() => setFormat('markdown')}
              title="Markdown"
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                background: format === 'markdown' ? 'rgba(20,184,166,0.2)' : 'transparent',
                color: format === 'markdown' ? '#14b8a6' : 'var(--text-secondary, #475569)',
              }}
            >
              <FileCode2 size={12} style={{ marginRight: 4, display: 'inline' }} />MD
            </button>
            <button
              onClick={() => setFormat('text')}
              title="Texto simples (Padrão)"
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                background: format === 'text' ? 'rgba(20,184,166,0.2)' : 'transparent',
                color: format === 'text' ? '#14b8a6' : 'var(--text-secondary, #475569)',
              }}
            >
              <AlignLeft size={12} style={{ marginRight: 4, display: 'inline' }} />TXT
            </button>
          </div>

          {/* Custom System Tag Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowSystemTagDropdown((prev) => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 11px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 6,
                border: selectedSystemTag
                  ? `1px solid ${selectedSystemTag.color}66`
                  : '1px solid var(--border-subtle, rgba(20,184,166,0.3))',
                background: selectedSystemTag
                  ? `${selectedSystemTag.color}1e`
                  : 'var(--bg-secondary, rgba(255,255,255,0.06))',
                color: selectedSystemTag ? selectedSystemTag.color : 'var(--text-secondary, #475569)',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.12s ease',
              }}
            >
              <Tag size={12} style={{ color: selectedSystemTag ? selectedSystemTag.color : '#14b8a6' }} />
              <span>{selectedSystemTag ? selectedSystemTag.name : 'Tag sistema...'}</span>
              <ChevronDown size={11} style={{ opacity: 0.7 }} />
            </button>

            {showSystemTagDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  width: 180,
                  maxHeight: 240,
                  overflowY: 'auto',
                  background: 'var(--bg-card, #18181c)',
                  border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
                  borderRadius: 8,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
                  padding: 4,
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSystemTagId('');
                    setShowSystemTagDropdown(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    borderRadius: 4,
                    border: 'none',
                    background: systemTagId === '' ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: 'var(--text-muted, #9ca3af)',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Tag size={11} style={{ opacity: 0.4 }} />
                  <span>Nenhuma (Sem Tag)</span>
                </button>

                {systemTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      setSystemTagId(tag.id);
                      setShowSystemTagDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      borderRadius: 4,
                      border: 'none',
                      background: systemTagId === tag.id ? `${tag.color}22` : 'transparent',
                      color: tag.color || '#14b8a6',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Tag size={11} style={{ color: tag.color }} />
                    <span>{tag.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

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
            onClick={handleSaveClick}
            disabled={isSaving}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px',
              borderRadius: 8, border: 'none', background: '#14b8a6', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.7 : 1,
              boxShadow: '0 2px 10px rgba(20,184,166,0.3)',
            }}
          >
            <Save size={13} />
            {isSaving ? 'Salvando...' : 'Salvar Nota'}
          </button>
        </div>
      </div>

      {/* Evernote Toolbar — Formatação + Upload de Imagem */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 18px',
          background: 'rgba(255,255,255,0.02)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          flexShrink: 0,
          overflowX: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {[
            { icon: <Heading1 size={13} />, label: 'Título 1', action: () => insertFormatting('# ') },
            { icon: <Heading2 size={13} />, label: 'Título 2', action: () => insertFormatting('## ') },
            { icon: <Bold size={13} />, label: 'Negrito', action: () => insertFormatting('**', '**') },
            { icon: <Italic size={13} />, label: 'Itálico', action: () => insertFormatting('*', '*') },
            { icon: <List size={13} />, label: 'Lista com marcadores', action: () => insertFormatting('- ') },
            { icon: <ListOrdered size={13} />, label: 'Lista numerada', action: () => insertFormatting('1. ') },
            { icon: <CheckSquare size={13} />, label: 'Lista de tarefas', action: () => insertFormatting('- [ ] ') },
            { icon: <Quote size={13} />, label: 'Citação', action: () => insertFormatting('> ') },
            { icon: <Code size={13} />, label: 'Bloco de código', action: () => insertFormatting('```\n', '\n```') },
          ].map((btn, i) => (
            <button
              key={i}
              onClick={btn.action}
              title={btn.label}
              style={{
                padding: '4px 7px',
                borderRadius: 4,
                border: 'none',
                background: 'transparent',
                color: 'var(--text-secondary, #475569)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.12s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(20, 184, 166, 0.12)';
                e.currentTarget.style.color = '#14b8a6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary, #475569)';
              }}
            >
              {btn.icon}
            </button>
          ))}
        </div>

        {/* Image Attachment Button */}
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 6,
            background: 'var(--bg-tertiary, rgba(20,184,166,0.1))',
            border: '1px solid var(--border-subtle, rgba(20,184,166,0.25))',
            color: 'var(--text-secondary, #334155)',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.12s ease',
          }}
          title="Anexar Imagem ou Colar com Ctrl+V"
        >
          <ImageIcon size={13} style={{ color: '#14b8a6' }} />
          <span>Anexar Imagem (Ctrl+V)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageFileUpload}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* Main Workspace Body */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '0 0 24px' }}>
        {/* Title input (Evernote style) */}
        <div style={{ padding: '16px 24px 0', flexShrink: 0 }}>
          <input
            autoFocus
            type="text"
            placeholder="Título da nota..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: '100%', fontSize: 24, fontWeight: 700,
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-primary, rgba(255,255,255,0.92))',
              fontFamily: 'inherit',
              padding: 0,
              letterSpacing: '-0.02em',
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

        {/* Text Area — Clean text only, no raw Base64 strings */}
        <div style={{ minHeight: 180, display: 'flex', flexDirection: 'column', padding: '14px 24px 8px' }}>
          <textarea
            ref={textareaRef}
            placeholder="Escreva sua nota aqui... (Cole imagens com Ctrl+V)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            style={{
              width: '100%', minHeight: 160, resize: 'none',
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-primary, rgba(255,255,255,0.88))',
              fontSize: 14, lineHeight: 1.75,
              fontFamily: format === 'markdown' ? 'ui-monospace, "Cascadia Code", Consolas, monospace' : 'inherit',
            }}
          />
        </div>

        {/* Render Interactive Visual Resizable Images (No raw code!) */}
        {attachedImageObjects.length > 0 && (
          <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#14b8a6', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 6 }}>
              <ImageIcon size={14} /> Imagens no Documento ({attachedImageObjects.length}) — Passe o mouse para redimensionar com o mouse ou alinhar:
            </div>

            {attachedImageObjects.map((img) => (
              <ResizableImageItem
                key={img.id}
                item={img}
                onUpdateWidth={(newWidth) =>
                  setAttachedImageObjects((prev) =>
                    prev.map((x) => (x.id === img.id ? { ...x, width: newWidth } : x))
                  )
                }
                onUpdateAlign={(newAlign) =>
                  setAttachedImageObjects((prev) =>
                    prev.map((x) => (x.id === img.id ? { ...x, align: newAlign } : x))
                  )
                }
                onRemove={() =>
                  setAttachedImageObjects((prev) => prev.filter((x) => x.id !== img.id))
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* System Tag Confirmation Modal */}
      {showNoSystemTagConfirm && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowNoSystemTagConfirm(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '380px',
              backgroundColor: '#1e1e24',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <HelpCircle size={20} style={{ color: '#f59e0b' }} />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#fff' }}>
                Salvar sem tag de sistema?
              </h3>
            </div>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#9ca3af', lineHeight: 1.5 }}>
              Deseja mesmo salvar a nota sem tag de sistema?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowNoSystemTagConfirm(false)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'transparent',
                  color: '#9ca3af',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Não
              </button>
              <button
                onClick={() => {
                  setShowNoSystemTagConfirm(false);
                  void executeSaveNote();
                }}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#14b8a6',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(20, 184, 166, 0.3)',
                }}
              >
                Sim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
