import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Pencil,
  Pin,
  BellRing,
  Trash2,
  FileCode2,
  FileText,
  Check,
  ExternalLink,
  Download,
  Play,
  File,
  Video,
  Image as ImageIcon,
  Copy,
  X,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { resolveImageUrl } from '../../utils/image';
import { desktopAdapter } from '../../lib/desktopAdapter';
import type { Note } from '../../../shared/types/note';

interface ZenNoteViewerProps {
  note: Note;
  onEdit: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onOpenPingModal: (note: Note) => void;
}

export const ZenNoteViewer: React.FC<ZenNoteViewerProps> = ({
  note,
  onEdit,
  onTogglePin,
  onDelete,
  onOpenPingModal,
}) => {
  const { showToast } = useToast();
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [lightboxVideo, setLightboxVideo] = useState<string | null>(null);

  // Video state
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});

  // Extract attachments
  const hasImages = Boolean(note.attachedImages && note.attachedImages.length > 0);
  const hasVideos = Boolean(note.attachedVideos && note.attachedVideos.length > 0);
  const hasPdfs = Boolean(note.attachedPdfs && note.attachedPdfs.length > 0);

  // Auto-resolve video URLs for local / cloud preview
  useEffect(() => {
    if (!note.attachedVideos || note.attachedVideos.length === 0) return;
    const resolved: Record<string, string> = {};
    note.attachedVideos.forEach((v) => {
      if (v.startsWith('http') || v.startsWith('file://')) {
        resolved[v] = v;
      } else {
        // Try local file path or cloud ref
        resolved[v] = `file://${v.replace(/\\/g, '/')}`;
      }
    });
    setVideoUrls(resolved);
  }, [note.attachedVideos]);

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(note.content || '');
    setCopiedMarkdown(true);
    showToast('Conteúdo copiado como Markdown!', 'success');
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  const handleCopyText = () => {
    const plain = (note.content || '').replace(/[#*_`~>]/g, '');
    navigator.clipboard.writeText(plain);
    setCopiedText(true);
    showToast('Conteúdo copiado como texto simples!', 'success');
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        background: 'var(--bg-primary, #0f0f0f)',
        overflow: 'hidden',
      }}
    >
      {/* Top Bar / Actions Header */}
      <header
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
          {note.sequential_id != null && (
            <span style={{ fontSize: 13, fontWeight: 700, color: '#14b8a6' }}>
              #{note.sequential_id}
            </span>
          )}
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text-primary, #fff)',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {note.title || 'Sem título'}
          </h2>
          <span
            style={{
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 4,
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.6)',
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
          >
            {note.format === 'markdown' ? 'MD' : 'TXT'}
          </span>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <Button
            variant="primary"
            size="sm"
            onClick={onEdit}
            title="Editar Nota"
            style={{ background: '#14b8a6', borderColor: '#14b8a6', color: '#fff', fontWeight: 600 }}
          >
            <Pencil size={13} style={{ marginRight: 4 }} /> Editar
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onTogglePin}
            title={note.is_pinned ? 'Desafixar nota' : 'Fixar nota'}
            style={{ color: note.is_pinned ? '#f59e0b' : undefined }}
          >
            <Pin size={15} fill={note.is_pinned ? 'currentColor' : 'none'} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenPingModal(note)}
            title="Enviar Ping / Notificar Usuário"
          >
            <BellRing size={15} />
          </Button>

          <Button variant="secondary" size="sm" onClick={handleCopyMarkdown} title="Copiar MD">
            {copiedMarkdown ? <Check size={14} /> : <FileCode2 size={14} />}
            <span style={{ fontSize: 11, marginLeft: 4 }}>MD</span>
          </Button>

          <Button variant="secondary" size="sm" onClick={handleCopyText} title="Copiar Texto">
            {copiedText ? <Check size={14} /> : <FileText size={14} />}
            <span style={{ fontSize: 11, marginLeft: 4 }}>Texto</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            title="Deletar Nota"
            style={{ color: '#ef4444' }}
          >
            <Trash2 size={15} />
          </Button>
        </div>
      </header>

      {/* Main Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Note Tags & Metadata */}
        {note.tags && note.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {note.tags.map((tag, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'rgba(20,184,166,0.12)',
                  color: '#14b8a6',
                  border: '1px solid rgba(20,184,166,0.25)',
                  fontWeight: 500,
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* PDF Embedded Section */}
        {hasPdfs && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 10,
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
              background: 'var(--bg-secondary, #141414)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                <File size={14} style={{ color: '#ef4444' }} />
                Documento PDF Anexado
              </div>
            </div>
            <div style={{ width: '100%', height: 420, background: '#0b0b0b' }}>
              <iframe
                src={note.attachedPdfs![0].url || note.attachedPdfs![0].path}
                title="Visualizador de PDF"
                style={{ width: '100%', height: '100%', border: 0 }}
              />
            </div>
          </div>
        )}

        {/* Video Player Section */}
        {hasVideos && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Video size={15} style={{ color: '#14b8a6' }} />
              Vídeos Anexados ({note.attachedVideos!.length})
            </div>
            {note.attachedVideos!.map((vRef, idx) => (
              <div
                key={idx}
                style={{
                  borderRadius: 10,
                  border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                  background: '#000',
                  overflow: 'hidden',
                }}
              >
                <video
                  controls
                  preload="metadata"
                  style={{ width: '100%', maxHeight: 380, display: 'block' }}
                  src={videoUrls[vRef] || vRef}
                >
                  Seu navegador não suporta reprodução de vídeo.
                </video>
              </div>
            ))}
          </div>
        )}

        {/* Attached Images Gallery */}
        {hasImages && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ImageIcon size={15} style={{ color: '#3b82f6' }} />
              Imagens Anexadas ({note.attachedImages!.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
              {note.attachedImages!.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setLightboxImg(img.url || img.path)}
                  style={{
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                    cursor: 'pointer',
                    maxHeight: 140,
                    background: '#000',
                  }}
                >
                  <img
                    src={resolveImageUrl(img.url || img.path)}
                    alt={img.name || 'Imagem'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Text / Markdown Content */}
        <article
          style={{
            fontSize: 14,
            lineHeight: 1.7,
            color: 'var(--text-primary, #e4e4e7)',
            whiteSpace: 'pre-wrap',
            fontFamily: note.format === 'markdown' ? 'ui-monospace, monospace' : 'inherit',
          }}
        >
          {note.content || 'Nota sem conteúdo.'}
        </article>
      </div>

      {/* Image Lightbox Modal */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.9)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <button
            onClick={() => setLightboxImg(null)}
            style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            <X size={24} />
          </button>
          <img
            src={resolveImageUrl(lightboxImg)}
            alt="Imagem ampliada"
            style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 8, objectFit: 'contain' }}
          />
        </div>
      )}
    </div>
  );
};
