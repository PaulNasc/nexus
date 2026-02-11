import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useTasks } from '../contexts/TasksContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { 
  ArrowLeft, Save, Trash2, Tag, Link2, 
  Image, Bold, Italic, List, 
  Hash, Eye, Edit, Copy, Columns,
  ChevronDown, ChevronUp, Upload, X, Video,
  PanelBottomOpen, PanelBottomClose
} from 'lucide-react';
import type { ElectronAPI } from '../../main/preload';
import { Note, CreateNoteData } from '../../shared/types/note';

interface NoteEditorProps {
  note?: Note | null;
  onSave?: (noteData: CreateNoteData) => void;
  onDelete?: () => void;
  onBack?: () => void;
  onClose?: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ 
  note, 
  onSave, 
  onDelete, 
  onBack,
  onClose 
}) => {
  const { theme } = useTheme();
  const { tasks } = useTasks();
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [tags, setTags] = useState<string[]>(note?.tags || []);
  const [linkedTaskIds, setLinkedTaskIds] = useState<number[]>(note?.linkedTaskIds || []);
  const [color, setColor] = useState(note?.color || '');
  const [format, setFormat] = useState<'markdown' | 'text'>(note?.format || 'text');
  const [previewMode, setPreviewMode] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);
  const [isLinkedTasksExpanded, setIsLinkedTasksExpanded] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>(note?.attachedImages || []);
  const [attachedVideos, setAttachedVideos] = useState<string[]>(note?.attachedVideos || []);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const [splitView, setSplitView] = useState(false);
  const [bottomPanelOpen, setBottomPanelOpen] = useState(false);

  const getElectron = (): ElectronAPI | null => {
    return (window as unknown as { electronAPI?: ElectronAPI }).electronAPI || null;
  };
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDark = theme.mode === 'dark';

  // Função para converter arquivo para base64
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }, []);

  // Função para lidar com upload de imagens
  const handleImageUpload = useCallback(async (files: FileList) => {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    for (const file of imageFiles) {
      try {
        const base64 = await fileToBase64(file);
        setAttachedImages(prev => [...prev, base64]);
        
        // Se estiver no modo markdown, adicionar a sintaxe da imagem
        if (format === 'markdown') {
          const imageMarkdown = `![${file.name}](${base64})\n`;
          setContent(prev => prev + imageMarkdown);
        }
      } catch (error) {
        console.error('Erro ao processar imagem:', error);
      }
    }
  }, [format, fileToBase64]);

  const handleAddVideo = useCallback(async () => {
    const electron = getElectron();
    if (!electron?.video) return;

    try {
      const result = await electron.video.selectVideoFile();
      if (result.canceled || !result.filePath || !result.fileName) return;

      setVideoUploading(true);
      setVideoProgress(10);

      // Gerar nome único para o vídeo
      const uniqueName = `${Date.now()}-${result.fileName}`;

      // Copiar para pasta local
      setVideoProgress(30);
      await electron.video.copyToLocal(result.filePath, uniqueName);

      setVideoProgress(70);

      // Adicionar ao array de vídeos anexados
      setAttachedVideos(prev => [...prev, uniqueName]);
      setVideoProgress(100);

      setTimeout(() => {
        setVideoUploading(false);
        setVideoProgress(0);
      }, 500);
    } catch (error) {
      console.error('Erro ao anexar vídeo:', error);
      setVideoUploading(false);
      setVideoProgress(0);
    }
  }, []);

  const removeVideo = useCallback((index: number) => {
    setAttachedVideos(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Drag and Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageUpload(files);
    }
  }, [handleImageUpload]);

  // Ctrl+V handler para colar imagens
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const fileList = new DataTransfer();
          fileList.items.add(file);
          handleImageUpload(fileList.files);
        }
      }
    }
  }, [handleImageUpload]);

  // Função para remover imagem
  const removeImage = useCallback((index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  }, []);


  // Carregar imagens anexadas quando a nota for carregada
  useEffect(() => {
    if (note?.attachedImages) {
      setAttachedImages(note.attachedImages);
    }
  }, [note]);

  const handleSave = () => {
    if (!title.trim()) return;
    
    const noteData: CreateNoteData = {
      title: title.trim(),
      content,
      format,
      tags,
      linkedTaskIds,
      color: color || undefined,
      attachedImages,
      attachedVideos,
    };

    if (onSave) {
      onSave(noteData);
    } else if (onClose) {
      onClose();
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const insertMarkdown = (before: string, after: string = '') => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    const newContent = 
      content.substring(0, start) + 
      before + selectedText + after + 
      content.substring(end);
    
    setContent(newContent);
    
    // Reposicionar cursor
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const renderPreview = () => {
    if (format === 'text') {
      return (
        <div style={{
          whiteSpace: 'pre-wrap',
          lineHeight: 1.6,
          color: isDark ? 'var(--color-text-primary)' : '#1F2937'
        }}>
          {content}
        </div>
      );
    }

    // Renderização simples de markdown
    const html = content
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/\n/gim, '<br>');

    return (
      <div 
        style={{
          lineHeight: 1.6,
          color: isDark ? 'var(--color-text-primary)' : '#1F2937'
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  const noteColors = [
    { name: 'teal', hex: '#00D4AA' },
    { name: 'purple', hex: '#7B3FF2' },
    { name: 'blue', hex: '#3B82F6' },
    { name: 'yellow', hex: '#F59E0B' },
    { name: 'red', hex: '#EF4444' },
    { name: 'green', hex: '#10B981' },
    { name: 'violet', hex: '#8B5CF6' },
    { name: 'orange', hex: '#F97316' }
  ];

  const attachCount = attachedImages.length + attachedVideos.length + tags.length + linkedTaskIds.length;

  const toolbarBtnStyle: React.CSSProperties = {
    background: 'none',
    border: `1px solid ${isDark ? 'var(--color-border-primary)' : '#E5E7EB'}`,
    color: isDark ? 'var(--color-text-primary)' : '#374151',
    cursor: 'pointer',
    padding: 5,
    borderRadius: 4,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const editorArea = (
    <div
      style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0 }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onPaste={handlePaste}
        placeholder="Escreva sua nota aqui... (Ctrl+V para colar imagens)"
        style={{
          width: '100%', height: '100%', padding: 16,
          backgroundColor: isDark ? 'var(--color-bg-secondary)' : '#FFFFFF',
          border: `1px ${isDragOver ? 'dashed' : 'solid'} ${isDragOver ? 'var(--color-primary-teal)' : (isDark ? 'var(--color-border-primary)' : '#E5E7EB')}`,
          borderRadius: 8, color: isDark ? 'var(--color-text-primary)' : '#1F2937',
          fontSize: 14, lineHeight: 1.6, resize: 'none', outline: 'none',
          fontFamily: format === 'markdown' ? "'Fira Code', 'Cascadia Code', monospace" : 'inherit',
          transition: 'border-color 0.2s ease', boxSizing: 'border-box' as const,
        }}
      />
      {isDragOver && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 212, 170, 0.1)', border: '2px dashed var(--color-primary-teal)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
          <Upload size={28} color="var(--color-primary-teal)" />
          <span style={{ color: 'var(--color-primary-teal)', fontSize: 14, fontWeight: 600 }}>Solte as imagens aqui</span>
        </div>
      )}
    </div>
  );

  const previewArea = (
    <div style={{ height: '100%', padding: 16, backgroundColor: isDark ? 'var(--color-bg-secondary)' : '#FFFFFF', border: `1px solid ${isDark ? 'var(--color-border-primary)' : '#E5E7EB'}`, borderRadius: 8, overflow: 'auto', boxSizing: 'border-box' as const }}>
      {renderPreview()}
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: isDark ? 'var(--color-bg-primary)' : '#FAFAFA' }}>
      {/* Compact Header */}
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${isDark ? 'var(--color-border-primary)' : '#E5E7EB'}`, backgroundColor: isDark ? 'var(--color-bg-secondary)' : '#FFFFFF', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onBack || onClose} style={{ ...toolbarBtnStyle, border: 'none', padding: 6 }} title="Voltar">
          <ArrowLeft size={18} />
        </button>
        <input type="text" placeholder="Título da nota..." value={title} onChange={(e) => setTitle(e.target.value)} style={{ flex: 1, fontSize: 15, fontWeight: 600, margin: 0, background: 'transparent', border: 'none', outline: 'none', color: isDark ? 'var(--color-text-primary)' : '#1F2937', padding: '6px 8px' }} />
        {onDelete && (
          <button onClick={onDelete} style={{ ...toolbarBtnStyle, border: 'none', color: 'var(--color-error)' }} title="Excluir">
            <Trash2 size={16} />
          </button>
        )}
        <Button variant="primary" size="sm" onClick={handleSave} disabled={!title.trim()} style={{ padding: '6px 14px' }}>
          <Save size={14} /> Salvar
        </Button>
      </div>

      {/* Compact Toolbar */}
      <div style={{ padding: '6px 16px', borderBottom: `1px solid ${isDark ? 'var(--color-border-primary)' : '#E5E7EB'}`, backgroundColor: isDark ? 'rgba(20,20,20,0.6)' : '#F9FAFB', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <select value={format} onChange={(e) => setFormat(e.target.value as 'markdown' | 'text')} style={{ background: isDark ? 'var(--color-bg-tertiary)' : '#fff', border: `1px solid ${isDark ? 'var(--color-border-primary)' : '#E5E7EB'}`, color: isDark ? 'var(--color-text-primary)' : '#374151', padding: '4px 8px', borderRadius: 4, fontSize: 12 }}>
          <option value="text">Texto</option>
          <option value="markdown">Markdown</option>
        </select>

        <div style={{ width: 1, height: 18, backgroundColor: isDark ? 'var(--color-border-primary)' : '#E5E7EB' }} />

        {format === 'markdown' && !previewMode && !splitView && (
          <>
            <button onClick={() => insertMarkdown('**', '**')} style={toolbarBtnStyle} title="Negrito"><Bold size={13} /></button>
            <button onClick={() => insertMarkdown('*', '*')} style={toolbarBtnStyle} title="Itálico"><Italic size={13} /></button>
            <button onClick={() => insertMarkdown('# ')} style={toolbarBtnStyle} title="Título"><Hash size={13} /></button>
            <button onClick={() => insertMarkdown('- ')} style={toolbarBtnStyle} title="Lista"><List size={13} /></button>
            <div style={{ width: 1, height: 18, backgroundColor: isDark ? 'var(--color-border-primary)' : '#E5E7EB' }} />
          </>
        )}

        <button onClick={() => fileInputRef.current?.click()} style={toolbarBtnStyle} title="Imagem"><Image size={13} /></button>
        <button onClick={handleAddVideo} disabled={videoUploading} style={{ ...toolbarBtnStyle, opacity: videoUploading ? 0.5 : 1 }} title="Vídeo"><Video size={13} /></button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => { if (e.target.files) handleImageUpload(e.target.files); }} />

        {videoUploading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 80 }}>
            <div style={{ flex: 1, height: 3, backgroundColor: isDark ? 'var(--color-bg-tertiary)' : '#E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${videoProgress}%`, height: '100%', backgroundColor: 'var(--color-primary-teal)', borderRadius: 2, transition: 'width 0.3s ease' }} />
            </div>
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{Math.round(videoProgress)}%</span>
          </div>
        )}

        <div style={{ width: 1, height: 18, backgroundColor: isDark ? 'var(--color-border-primary)' : '#E5E7EB' }} />

        <button
          onClick={() => { setPreviewMode(!previewMode); if (splitView) setSplitView(false); }}
          style={{ ...toolbarBtnStyle, background: previewMode && !splitView ? 'var(--color-primary-teal)' : 'none', borderColor: previewMode && !splitView ? 'var(--color-primary-teal)' : (isDark ? 'var(--color-border-primary)' : '#E5E7EB'), color: previewMode && !splitView ? '#fff' : (isDark ? 'var(--color-text-primary)' : '#374151') }}
          title={previewMode ? 'Editar' : 'Preview'}
        >
          {previewMode && !splitView ? <Edit size={13} /> : <Eye size={13} />}
        </button>
        <button
          onClick={() => { setSplitView(!splitView); if (!splitView) setPreviewMode(false); }}
          style={{ ...toolbarBtnStyle, background: splitView ? 'var(--color-primary-teal)' : 'none', borderColor: splitView ? 'var(--color-primary-teal)' : (isDark ? 'var(--color-border-primary)' : '#E5E7EB'), color: splitView ? '#fff' : (isDark ? 'var(--color-text-primary)' : '#374151') }}
          title="Split View"
        >
          <Columns size={13} />
        </button>

        <button
          onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          style={{ ...toolbarBtnStyle, borderColor: copied ? 'var(--color-primary-teal)' : (isDark ? 'var(--color-border-primary)' : '#E5E7EB'), color: copied ? 'var(--color-primary-teal)' : (isDark ? 'var(--color-text-primary)' : '#374151') }}
          title="Copiar"
        >
          <Copy size={13} />
        </button>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', gap: 3 }}>
          {noteColors.map(nc => (
            <button
              key={nc.name}
              onClick={() => setColor(color === nc.name ? '' : nc.name)}
              style={{ width: 16, height: 16, backgroundColor: nc.hex, border: color === nc.name ? '2px solid #fff' : '1px solid transparent', borderRadius: '50%', cursor: 'pointer', boxShadow: color === nc.name ? '0 0 0 1px rgba(0,0,0,0.3)' : 'none' }}
            />
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flex: 1, padding: 12, overflow: 'hidden', display: 'flex', gap: 12, minHeight: 0 }}>
          {splitView ? (
            <>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>{editorArea}</div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>{previewArea}</div>
            </>
          ) : previewMode ? (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>{previewArea}</div>
          ) : (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>{editorArea}</div>
          )}
        </div>

        {/* Bottom Panel Toggle */}
        <div style={{ borderTop: `1px solid ${isDark ? 'var(--color-border-primary)' : '#E5E7EB'}`, backgroundColor: isDark ? 'var(--color-bg-secondary)' : '#FFFFFF' }}>
          <button
            onClick={() => setBottomPanelOpen(!bottomPanelOpen)}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, fontWeight: 500, color: isDark ? 'var(--color-text-secondary)' : '#6B7280', transition: 'color 0.2s ease' }}
          >
            {bottomPanelOpen ? <PanelBottomClose size={14} /> : <PanelBottomOpen size={14} />}
            {bottomPanelOpen ? 'Recolher painel' : `Anexos & Detalhes${attachCount > 0 ? ` (${attachCount})` : ''}`}
          </button>

          {bottomPanelOpen && (
            <div style={{ padding: '12px 16px 16px', maxHeight: 280, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
              {/* Imagens Anexadas */}
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 600, color: isDark ? 'var(--color-text-primary)' : '#1F2937', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Image size={14} /> Imagens ({attachedImages.length})
                </h4>
                {attachedImages.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
                    {attachedImages.map((image, index) => (
                      <div key={index} style={{ position: 'relative', borderRadius: 4, overflow: 'hidden', aspectRatio: '1', border: `1px solid ${isDark ? 'var(--color-border-primary)' : '#E5E7EB'}` }}>
                        <img src={image} alt={`Anexo ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button onClick={() => removeImage(index)} style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Remover">
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>Nenhuma imagem</p>
                )}
              </div>

              {/* Vídeos Anexados */}
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 600, color: isDark ? 'var(--color-text-primary)' : '#1F2937', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Video size={14} /> Vídeos ({attachedVideos.length})
                </h4>
                {attachedVideos.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {attachedVideos.map((videoName, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', backgroundColor: isDark ? '#2A2A2A' : '#F3F4F6', borderRadius: 4, fontSize: 11 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isDark ? 'var(--color-text-secondary)' : '#6B7280' }}>
                          {videoName.replace(/^\d+-/, '')}
                        </span>
                        <button onClick={() => removeVideo(index)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', flexShrink: 0 }} title="Remover">
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>Nenhum vídeo</p>
                )}
              </div>

              {/* Tags */}
              <div>
                <button onClick={() => setIsTagsExpanded(!isTagsExpanded)} style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: isDark ? 'var(--color-text-primary)' : '#1F2937' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Tag size={14} /> Tags ({tags.length})</span>
                  {isTagsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {isTagsExpanded && (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                      {tags.map(tag => (
                        <span key={tag} style={{ fontSize: 11, padding: '2px 6px', backgroundColor: isDark ? '#2A2A2A' : '#F3F4F6', color: isDark ? 'var(--color-text-secondary)' : '#6B7280', borderRadius: 10, cursor: 'pointer' }} onClick={() => handleRemoveTag(tag)}>
                          {tag} ×
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Input type="text" placeholder="Nova tag..." value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddTag()} style={{ flex: 1, fontSize: 11, padding: '4px 8px' }} />
                      <Button variant="ghost" size="sm" onClick={handleAddTag} disabled={!newTag.trim()} style={{ padding: '4px 8px', fontSize: 11 }}>+</Button>
                    </div>
                  </>
                )}
              </div>

              {/* Vincular Tarefa */}
              <div>
                <button onClick={() => setIsLinkedTasksExpanded(!isLinkedTasksExpanded)} style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: isDark ? 'var(--color-text-primary)' : '#1F2937' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Link2 size={14} /> Tarefas ({linkedTaskIds.length})</span>
                  {isLinkedTasksExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {isLinkedTasksExpanded && (
                  <div>
                    <select value="" onChange={(e) => { if (e.target.value) { const id = Number(e.target.value); if (!linkedTaskIds.includes(id)) setLinkedTaskIds([...linkedTaskIds, id]); } }}
                      style={{ width: '100%', background: isDark ? 'var(--color-bg-tertiary)' : '#F9FAFB', border: `1px solid ${isDark ? 'var(--color-border-primary)' : '#E5E7EB'}`, color: isDark ? 'var(--color-text-primary)' : '#374151', padding: '4px 8px', borderRadius: 4, fontSize: 11 }}>
                      <option value="">Adicionar tarefa...</option>
                      {tasks.filter(t => !linkedTaskIds.includes(t.id)).map(t => (<option key={t.id} value={t.id}>{t.title}</option>))}
                    </select>
                    {linkedTaskIds.length > 0 && (
                      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {linkedTaskIds.map(taskId => {
                          const task = tasks.find(t => t.id === taskId);
                          return task ? (
                            <div key={taskId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 6px', backgroundColor: isDark ? '#2A2A2A' : '#F3F4F6', borderRadius: 3, fontSize: 11 }}>
                              <span>{task.title}</span>
                              <button onClick={() => setLinkedTaskIds(linkedTaskIds.filter(id => id !== taskId))} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 12 }}>×</button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
