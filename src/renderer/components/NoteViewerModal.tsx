import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from './ui/Button';
import { X, Image as ImageIcon, FileText, FileCode2, Pin, Video, Download, Copy, Play, ExternalLink } from 'lucide-react';
import type { ElectronAPI } from '../../main/preload';
import { Note, NoteAttachment } from '../../shared/types/note';
import { supabase } from '../lib/supabase';
import { parseVideoRef } from '../utils/videoAttachment';
import { parsePdfRef } from '../utils/pdfAttachment';
import { downloadVideoBlobFromR2Signed } from '../lib/r2Videos';

interface NoteViewerModalProps {
  isOpen: boolean;
  note: Note | null;
  onClose: () => void;
  onTogglePin?: (note: Note) => void;
}

function stripMarkdown(markdown: string): string {
  if (!markdown) return '';
  let output = markdown;
  output = output.replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, ''));
  output = output.replace(/`([^`]+)`/g, '$1');
  output = output.replace(/!\[[^\]]*\]\([^\)]*\)/g, '');
  output = output.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '$1');
  output = output.replace(/\*\*([^*]+)\*\*/g, '$1');
  output = output.replace(/\*([^*]+)\*/g, '$1');
  output = output.replace(/__([^_]+)__/g, '$1');
  output = output.replace(/_([^_]+)_/g, '$1');
  output = output.replace(/~~([^~]+)~~/g, '$1');
  output = output.replace(/^#{1,6}\s*/gm, '');
  output = output.replace(/^>\s?/gm, '');
  output = output.replace(/^\s*[-*+]\s+/gm, '');
  output = output.replace(/^\s*\d+\.\s+/gm, '');
  output = output.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '');
  output = output.replace(/\s+$/gm, '');
  return output.trim();
}

function renderMarkdownToHtml(md: string): string {
  if (!md) return '';
  let html = md;
  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, lang, code) =>
    `<pre class="note-code-block" data-lang="${lang || ''}"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim()}</code></pre>`);
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="note-inline-code">$1</code>');
  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, '<img src="$2" alt="$1" class="note-md-img" />');
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" class="note-md-link">$1</a>');
  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3 class="note-md-h3">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="note-md-h2">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="note-md-h1">$1</h1>');
  // Bold / Italic / Strikethrough
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
  // Blockquotes
  html = html.replace(/^> (.*$)/gim, '<blockquote class="note-md-blockquote">$1</blockquote>');
  // Horizontal rules
  html = html.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '<hr class="note-md-hr" />');
  // Checkboxes
  html = html.replace(/^- \[x\] (.*$)/gim, '<div class="note-md-checkbox checked"><span class="cb">✓</span> $1</div>');
  html = html.replace(/^- \[ \] (.*$)/gim, '<div class="note-md-checkbox"><span class="cb">☐</span> $1</div>');
  // Ordered lists
  html = html.replace(/^\d+\. (.*$)/gim, '<li class="note-md-oli">$1</li>');
  // Unordered lists
  html = html.replace(/^\s*[-*+] (.*$)/gim, '<li class="note-md-uli">$1</li>');
  // Wrap consecutive <li> in <ul>/<ol>
  html = html.replace(/((?:<li class="note-md-uli">.*<\/li>\s*)+)/g, '<ul class="note-md-ul">$1</ul>');
  html = html.replace(/((?:<li class="note-md-oli">.*<\/li>\s*)+)/g, '<ol class="note-md-ol">$1</ol>');
  // Line breaks (but not inside block elements)
  html = html.replace(/\n/g, '<br/>');
  // Clean up double <br/> after block elements
  html = html.replace(/(<\/h[1-3]>)<br\/>/g, '$1');
  html = html.replace(/(<\/pre>)<br\/>/g, '$1');
  html = html.replace(/(<\/blockquote>)<br\/>/g, '$1');
  html = html.replace(/(<\/ul>)<br\/>/g, '$1');
  html = html.replace(/(<\/ol>)<br\/>/g, '$1');
  html = html.replace(/(<hr[^>]*\/>)<br\/>/g, '$1');
  html = html.replace(/(<\/div>)<br\/>/g, '$1');
  return html;
}

const getElectron = (): ElectronAPI | null => {
  return (window as unknown as { electronAPI?: ElectronAPI }).electronAPI || null;
};

export const NoteViewerModal: React.FC<NoteViewerModalProps> = ({ isOpen, note, onClose, onTogglePin }) => {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [videoLightbox, setVideoLightbox] = useState<string | null>(null);
  const [pdfLightboxSrc, setPdfLightboxSrc] = useState<string | null>(null);
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
  const [videoPaths, setVideoPaths] = useState<Record<string, string>>({});
  const [videoMissing, setVideoMissing] = useState<Record<string, boolean>>({});
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [pdfCandidateUrls, setPdfCandidateUrls] = useState<string[]>([]);
  const [pdfCandidateIndex, setPdfCandidateIndex] = useState(0);
  const [pdfLoadError, setPdfLoadError] = useState(false);
  const tempVideoObjectUrlsRef = useRef<Set<string>>(new Set());
  const tempPdfObjectUrlsRef = useRef<Set<string>>(new Set());

  const toPdfViewerUrl = (rawUrl: string): string => {
    const value = String(rawUrl || '').trim();
    if (!value) return '';
    if (/^(data:|https?:\/\/|file:\/\/)/i.test(value)) return value;
    const normalized = value.replace(/\\/g, '/');
    if (/^[a-zA-Z]:\//.test(normalized)) return `file:///${normalized}`;
    if (normalized.startsWith('/')) return `file://${normalized}`;
    return value;
  };

  const contentPdfSource = useMemo(() => {
    const content = String(note?.content || '');
    const match = content.match(/\[PDF_SOURCE\]([\s\S]*?)\[\/PDF_SOURCE\]/i);
    return (match?.[1] || '').trim();
  }, [note?.content]);

  const sanitizedNoteContent = useMemo(() => {
    return String(note?.content || '')
      .replace(/\n?\s*\[PDF_SOURCE\][\s\S]*?\[\/PDF_SOURCE\]\s*\n?/gi, '\n')
      .replace(/\[PDF importado\]\s*\n?\s*Não foi possível extrair texto automaticamente de .*?\.pdf\.?/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }, [note?.content]);

  const pdfAttachments = useMemo(() => {
    return (note?.attachments || []).filter((a) => {
      if (a.type !== 'file') return false;
      const mime = String(a.mimeType || '').toLowerCase();
      const name = String(a.name || '').toLowerCase();
      const url = String(a.url || '').toLowerCase();
      return mime === 'application/pdf' || name.endsWith('.pdf') || url.endsWith('.pdf');
    });
  }, [note]);

  const primaryPdf = pdfAttachments[0] || null;
  const primaryPdfSource = primaryPdf?.url || contentPdfSource || '';
  const primaryPdfUrl = pdfCandidateUrls[pdfCandidateIndex] || '';
  const hasPdfAttachment = Boolean(primaryPdfUrl);

  const hasVideos = useMemo(() => {
    return note?.attachedVideos && note.attachedVideos.length > 0;
  }, [note]);

  const clearTempVideoObjectUrls = () => {
    for (const objectUrl of tempVideoObjectUrlsRef.current) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // ignore cleanup errors
      }
    }
    tempVideoObjectUrlsRef.current.clear();
  };

  const clearTempPdfObjectUrls = () => {
    for (const objectUrl of tempPdfObjectUrlsRef.current) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // ignore cleanup errors
      }
    }
    tempPdfObjectUrlsRef.current.clear();
  };

  const decodeFileLikePath = (value: string): string => {
    const normalized = String(value || '').trim();
    if (!normalized) return '';
    if (!/^file:\/\//i.test(normalized)) return normalized;
    const withoutScheme = normalized.replace(/^file:\/+/i, '');
    const decoded = decodeURIComponent(withoutScheme);
    return decoded.replace(/^\/+([a-zA-Z]:\/)/, '$1');
  };

  useEffect(() => {
    let canceled = false;
    const nextPdfObjectUrls = new Set<string>();

    const resolvePdfCandidates = async () => {
      if (!isOpen || !primaryPdfSource) {
        if (!canceled) {
          clearTempPdfObjectUrls();
          setPdfCandidateUrls([]);
          setPdfCandidateIndex(0);
          setPdfLoadError(false);
        }
        return;
      }

      const candidates: string[] = [];
      const parsedPdf = parsePdfRef(primaryPdfSource);

      if (parsedPdf.storagePath) {
        try {
          const blob = await downloadVideoBlobFromR2Signed(parsedPdf.storagePath);
          const blobUrl = URL.createObjectURL(blob);
          nextPdfObjectUrls.add(blobUrl);
          candidates.push(blobUrl);
        } catch (err) {
          console.warn('NoteViewerModal PDF cloud download failed:', {
            source: primaryPdfSource,
            storagePath: parsedPdf.storagePath,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      const baseUrl = toPdfViewerUrl(primaryPdfSource);
      if (baseUrl && !candidates.includes(baseUrl)) candidates.push(baseUrl);

      const electron = getElectron();
      const rawPath = decodeFileLikePath(primaryPdfSource).replace(/\\/g, '/');
      const fileName = rawPath.split('/').filter(Boolean).pop() || '';

      if (electron?.video && fileName && rawPath.toLowerCase().includes('/imported-pdfs/')) {
        try {
          const videosDir = await electron.video.getVideosDir();
          const normalizedVideosDir = String(videosDir || '').replace(/\\/g, '/');
          const userDataDir = normalizedVideosDir.replace(/\/nexus-videos$/i, '');
          if (userDataDir && userDataDir !== normalizedVideosDir) {
            const remappedPath = `${userDataDir}/imported-pdfs/${fileName}`;
            const remappedUrl = toPdfViewerUrl(remappedPath);
            if (remappedUrl && !candidates.includes(remappedUrl)) {
              candidates.unshift(remappedUrl);
            }
          }
        } catch {
          // ignore remap errors
        }
      }

      if (canceled) return;
      clearTempPdfObjectUrls();
      tempPdfObjectUrlsRef.current = nextPdfObjectUrls;
      setPdfCandidateUrls(candidates);
      setPdfCandidateIndex(0);
      setPdfLoadError(false);
    };

    resolvePdfCandidates();

    return () => {
      canceled = true;
      for (const objectUrl of nextPdfObjectUrls) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // ignore cleanup errors
        }
      }
      clearTempPdfObjectUrls();
    };
  }, [isOpen, primaryPdfSource]);

  const handlePdfIframeError = () => {
    setPdfCandidateIndex((current) => {
      if (current < pdfCandidateUrls.length - 1) {
        setPdfLoadError(false);
        return current + 1;
      }
      setPdfLoadError(true);
      return current;
    });
  };

  const handlePdfIframeLoad = () => {
    setPdfLoadError(false);
  };

  useEffect(() => {
    if (!isOpen || !note?.attachedVideos || note.attachedVideos.length === 0) {
      clearTempVideoObjectUrls();
      setVideoUrls({});
      setVideoPaths({});
      setVideoMissing({});
      return;
    }
    const electron = getElectron();
    if (!electron?.video) return;

    let canceled = false;
    const nextTempObjectUrls = new Set<string>();

    const resolve = async () => {
      const { data: noteScopeData } = await supabase
        .from('notes')
        .select('user_id, organization_id')
        .eq('id', note.id)
        .maybeSingle();

      const noteScope = noteScopeData as { user_id?: string | null; organization_id?: string | null } | null;
      const noteOwnerId = noteScope?.user_id || null;
      const noteOrgId = noteScope?.organization_id || null;

      const urls: Record<string, string> = {};
      const paths: Record<string, string> = {};
      const missing: Record<string, boolean> = {};
      for (const videoRef of note.attachedVideos!) {
        const parsed = parseVideoRef(videoRef);
        const localVideoName = parsed.localFileName || videoRef;

        const check = await electron.video.checkLocal(localVideoName);
        if (check.exists && check.localPath) {
          paths[videoRef] = check.localPath;
          urls[videoRef] = `file://${check.localPath.replace(/\\/g, '/')}`;
        } else {
          let downloaded = false;
          let lastDownloadError: string | null = null;

          const candidateStoragePaths = new Set<string>();
          if (parsed.storagePath) {
            candidateStoragePaths.add(parsed.storagePath);
          } else {
            if (noteOrgId) {
              candidateStoragePaths.add(`org/${noteOrgId}/${encodeURIComponent(localVideoName)}`);
              candidateStoragePaths.add(`org/${noteOrgId}/${localVideoName}`);
            }
            if (noteOwnerId) {
              candidateStoragePaths.add(`user/${noteOwnerId}/${encodeURIComponent(localVideoName)}`);
              candidateStoragePaths.add(`user/${noteOwnerId}/${localVideoName}`);
            }
          }

          if (candidateStoragePaths.size > 0) {
            try {
              for (const objectKey of candidateStoragePaths) {
                let downloadedBlob: Blob;
                try {
                  downloadedBlob = await downloadVideoBlobFromR2Signed(objectKey);
                } catch (r2Err) {
                  lastDownloadError = r2Err instanceof Error
                    ? r2Err.message
                    : String(r2Err);
                  continue;
                }

                const objectUrl = URL.createObjectURL(downloadedBlob);
                urls[videoRef] = objectUrl;
                paths[videoRef] = '[temporario em memoria]';
                nextTempObjectUrls.add(objectUrl);
                downloaded = true;
                break;
              }
            } catch (downloadError) {
              lastDownloadError = downloadError instanceof Error ? downloadError.message : String(downloadError);
            }

            if (!downloaded && lastDownloadError) {
              console.warn('NoteViewerModal cloud video download failed:', {
                videoRef,
                localVideoName,
                candidateStoragePaths: Array.from(candidateStoragePaths),
                error: lastDownloadError,
              });
            }
          }

          if (!downloaded) {
            missing[videoRef] = true;
            const expectedPath = await electron.video.getLocalPath(localVideoName);
            paths[videoRef] = expectedPath;
          }
        }
      }
      if (canceled) return;
      clearTempVideoObjectUrls();
      tempVideoObjectUrlsRef.current = nextTempObjectUrls;
      setVideoUrls(urls);
      setVideoPaths(paths);
      setVideoMissing(missing);
    };
    resolve();

    return () => {
      canceled = true;
      for (const objectUrl of nextTempObjectUrls) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // ignore cleanup errors
        }
      }
      clearTempVideoObjectUrls();
    };
  }, [isOpen, note?.attachedVideos, note?.id]);

  const hasImages = useMemo(() => {
    if (!note) return false;
    const byArray = (note.attachedImages && note.attachedImages.length > 0);
    const byAttachments = (note.attachments || []).some(
      (a: NoteAttachment) => a.type === 'image' && Boolean(a.url)
    );
    return byArray || byAttachments;
  }, [note]);

  const hasAttachments = hasVideos || hasImages;
  const showAttachmentSidebar = hasVideos || (hasImages && !hasPdfAttachment);

  if (!isOpen || !note) return null;

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(note.content || '');
    } catch (err) {
      console.error('Erro ao copiar markdown:', err);
    }
  };

  const handleCopyText = async () => {
    try {
      const text = note.format === 'markdown' ? stripMarkdown(note.content || '') : (note.content || '');
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Erro ao copiar texto:', err);
    }
  };

  const handleCopyVideoPath = async (videoRef: string) => {
    const p = videoPaths[videoRef];
    if (!p) return;
    try {
      await navigator.clipboard.writeText(p);
      setCopiedPath(videoRef);
      setTimeout(() => setCopiedPath(null), 2000);
    } catch (err) {
      console.error('Erro ao copiar caminho:', err);
    }
  };

  const handleOpenVideoExternal = async (videoRef: string) => {
    const electron = getElectron();
    if (!electron?.video) return;
    const existingUrl = videoUrls[videoRef] || '';
    if (existingUrl.startsWith('blob:')) {
      window.open(existingUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    const localVideoName = parseVideoRef(videoRef).localFileName || videoRef;
    await electron.video.openExternal(localVideoName);
  };

  const handleSaveVideoAs = async (videoRef: string) => {
    const electron = getElectron();
    if (!electron?.video) return;
    const existingUrl = videoUrls[videoRef] || '';
    if (existingUrl.startsWith('blob:')) {
      const localVideoName = parseVideoRef(videoRef).localFileName || videoRef;
      const link = document.createElement('a');
      link.href = existingUrl;
      link.download = localVideoName.replace(/^\d+-/, '') || 'video.mp4';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
      return;
    }
    const localVideoName = parseVideoRef(videoRef).localFileName || videoRef;
    await electron.video.saveAs(localVideoName);
  };

  const handleOpenPdfExternal = (pdfUrl: string) => {
    if (!pdfUrl) return;
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadPdf = (pdfUrl: string, fileName?: string) => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = fileName || 'documento.pdf';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  const handleRelinkVideo = async (videoRef: string) => {
    const electron = getElectron();
    if (!electron?.video) return;
    const localVideoName = parseVideoRef(videoRef).localFileName || videoRef;
    const result = await electron.video.selectVideoFile();
    if (result.canceled || !result.filePath) return;
    const copy = await electron.video.copyToLocal(result.filePath, localVideoName);
    if (!copy.success) {
      console.error('Erro ao relinkar video:', copy.error);
      return;
    }
    const localPath = copy.localPath || await electron.video.getLocalPath(localVideoName);
    setVideoUrls(prev => ({ ...prev, [videoRef]: `file://${localPath.replace(/\\/g, '/')}` }));
    setVideoPaths(prev => ({ ...prev, [videoRef]: localPath }));
    setVideoMissing(prev => ({ ...prev, [videoRef]: false }));
  };

  return (
    <div className="note-viewer-modal-backdrop" onClick={onClose}>
      <div className="note-viewer-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: hasAttachments ? 1100 : 900 }}>
        {/* Header */}
        <div className="note-viewer-header">
          <div className="note-viewer-title-group">
            <h2 className="note-viewer-title">{note.title}</h2>
            <span className="note-viewer-format-badge">{note.format === 'markdown' ? 'MD' : 'TXT'}</span>
          </div>
          <div className="note-viewer-actions">
            {onTogglePin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTogglePin(note)}
                title={note.is_pinned ? 'Desafixar nota' : 'Fixar nota'}
                style={{ color: note.is_pinned ? 'var(--color-accent-amber)' : undefined }}
              >
                <Pin size={16} fill={note.is_pinned ? 'currentColor' : 'none'} />
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={handleCopyMarkdown} title="Copiar como Markdown">
              <FileCode2 size={16} />
              Copiar MD
            </Button>
            <Button variant="secondary" size="sm" onClick={handleCopyText} title="Copiar como Texto">
              <FileText size={16} />
              Copiar Texto
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fechar">
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* Content: text left, attachments right */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {/* Text area — expanded */}
          <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-5) var(--space-6)', minWidth: 0 }}>
            {hasPdfAttachment && (
              <div style={{
                border: '1px solid var(--color-border-primary)',
                borderRadius: 10,
                background: 'var(--color-bg-secondary)',
                overflow: 'hidden',
                marginBottom: 14,
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderBottom: '1px solid var(--color-border-primary)',
                }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {primaryPdf?.name || 'PDF anexado'}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setPdfLightboxSrc(primaryPdfUrl)}
                      disabled={!primaryPdfUrl}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 11, border: '1px solid var(--color-border-primary)', borderRadius: 6, background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                    >
                      <ExternalLink size={12} /> Expandir
                    </button>
                    <button
                      onClick={() => handleOpenPdfExternal(primaryPdfUrl)}
                      disabled={!primaryPdfUrl}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 11, border: '1px solid var(--color-border-primary)', borderRadius: 6, background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                    >
                      <Play size={12} /> Abrir
                    </button>
                    <button
                      onClick={() => handleDownloadPdf(primaryPdfUrl, primaryPdf?.name)}
                      disabled={!primaryPdfUrl}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 11, border: '1px solid var(--color-border-primary)', borderRadius: 6, background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                    >
                      <Download size={12} /> Baixar
                    </button>
                  </div>
                </div>
                <div style={{ width: '100%', height: '52vh', background: '#0b0b0b' }}>
                  {pdfLoadError && (
                    <div style={{ padding: 10, fontSize: 12, color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border-primary)' }}>
                      PDF não encontrado neste dispositivo. Caminhos locais de outra máquina podem não existir aqui.
                    </div>
                  )}
                  <iframe
                    src={primaryPdfUrl}
                    title={primaryPdf?.name || 'PDF'}
                    style={{ width: '100%', height: '100%', border: 0 }}
                    onLoad={handlePdfIframeLoad}
                    onError={handlePdfIframeError}
                  />
                </div>
              </div>
            )}
            {note.format === 'markdown' ? (
              <div
                className="note-viewer-markdown"
                dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(sanitizedNoteContent) }}
              />
            ) : (
              <div className="note-viewer-plaintext">
                {sanitizedNoteContent}
              </div>
            )}
          </div>

          {/* Right sidebar — attachments */}
          {showAttachmentSidebar && (
            <div style={{
              width: 320, minWidth: 320, borderLeft: '1px solid var(--color-border-primary)',
              overflow: 'auto', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 16,
              backgroundColor: 'var(--color-bg-secondary)',
            }}>
              {/* Videos */}
              {hasVideos && (
                <div>
                  <div className="note-viewer-section-title">
                    <Video size={16} />
                    Vídeos ({note.attachedVideos!.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {note.attachedVideos!.map((videoRef, idx) => {
                      const localVideoName = parseVideoRef(videoRef).localFileName || videoRef;
                      const displayVideoName = localVideoName.replace(/^\d+-/, '');
                      return (
                      <div key={`video-${idx}`} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border-primary)', backgroundColor: 'var(--color-bg-primary)' }}>
                        {/* Thumbnail / mini player */}
                        <div
                          style={{ position: 'relative', cursor: videoMissing[videoRef] ? 'default' : 'pointer', backgroundColor: '#000' }}
                          onClick={() => !videoMissing[videoRef] && setVideoLightbox(videoRef)}
                          title={videoMissing[videoRef] ? 'Arquivo nao encontrado' : 'Clique para expandir'}
                        >
                          <video
                            preload="metadata"
                            style={{ width: '100%', maxHeight: 160, display: 'block' }}
                            src={videoUrls[videoRef] || ''}
                          />
                          <div style={{
                            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(0,0,0,0.3)', transition: 'background 0.2s',
                          }}>
                            {videoMissing[videoRef] ? (
                              <span style={{ color: '#fff', fontSize: 12, background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: 6 }}>Arquivo nao encontrado</span>
                            ) : (
                              <Play size={32} color="#fff" fill="#fff" style={{ opacity: 0.9 }} />
                            )}
                          </div>
                        </div>
                        {/* Info + actions */}
                        <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', wordBreak: 'break-all' }}>
                            {displayVideoName}
                          </div>
                          {videoPaths[videoRef] && (
                            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', wordBreak: 'break-all', fontFamily: 'monospace', background: 'var(--color-bg-hover)', padding: '4px 6px', borderRadius: 4 }}>
                              {videoPaths[videoRef]}
                            </div>
                          )}
                          {videoMissing[videoRef] && (
                            <div style={{ fontSize: 10, color: 'var(--color-warning, #f59e0b)' }}>
                              Video nao localizado nesta maquina. Clique para relinkar.
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 4 }}>
                            {videoMissing[videoRef] && (
                              <button
                                onClick={() => handleRelinkVideo(videoRef)}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: 10, border: '1px solid var(--color-border-primary)', borderRadius: 4, background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                                title="Selecionar arquivo para este video"
                              >
                                <Download size={10} /> Localizar
                              </button>
                            )}
                            <button
                              onClick={() => handleCopyVideoPath(videoRef)}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: 10, border: '1px solid var(--color-border-primary)', borderRadius: 4, background: copiedPath === videoRef ? 'var(--color-primary-teal)' : 'var(--color-bg-hover)', color: copiedPath === videoRef ? '#fff' : 'var(--color-text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}
                              title="Copiar caminho"
                            >
                              <Copy size={10} /> {copiedPath === videoRef ? 'Copiado!' : 'Caminho'}
                            </button>
                            <button
                              onClick={() => handleOpenVideoExternal(videoRef)}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: 10, border: '1px solid var(--color-border-primary)', borderRadius: 4, background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                              title="Abrir no player do sistema"
                            >
                              <ExternalLink size={10} /> Abrir
                            </button>
                            <button
                              onClick={() => handleSaveVideoAs(videoRef)}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: 10, border: '1px solid var(--color-border-primary)', borderRadius: 4, background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                              title="Salvar como..."
                            >
                              <Download size={10} /> Salvar
                            </button>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Images */}
              {hasImages && (
                <div>
                  <div className="note-viewer-section-title">
                    <ImageIcon size={16} />
                    Anexos ({(note.attachedImages || []).length + (note.attachments || []).filter(a => a.type === 'image').length})
                  </div>
                  <div className="note-images-grid">
                    {(note.attachedImages || []).map((src, idx) => (
                      <button
                        key={`img-array-${idx}`}
                        className="note-image-button"
                        onClick={() => setLightboxSrc(src)}
                        title="Ampliar imagem"
                      >
                        <img src={src} className="note-image" alt={`Anexo ${idx + 1}`} />
                      </button>
                    ))}
                    {(note.attachments || [])
                      .filter((a) => a.type === 'image' && a.url)
                      .map((a, idx) => (
                        <button
                          key={`img-attach-${idx}`}
                          className="note-image-button"
                          onClick={() => setLightboxSrc(a.url)}
                          title={a.name || 'Ampliar imagem'}
                        >
                          <img src={a.url} className="note-image" alt={a.name || `Anexo ${idx + 1}`} />
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Image lightbox */}
        {lightboxSrc && (
          <div className="note-image-lightbox" onClick={() => setLightboxSrc(null)}>
            <button className="note-image-lightbox-close" onClick={() => setLightboxSrc(null)} aria-label="Fechar">
              <X size={18} />
            </button>
            <img src={lightboxSrc} className="note-image-lightbox-img" alt="Imagem ampliada" />
          </div>
        )}

        {pdfLightboxSrc && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, animation: 'fade-in 0.15s ease-out' }}
            onClick={() => setPdfLightboxSrc(null)}
          >
            <button
              onClick={() => setPdfLightboxSrc(null)}
              aria-label="Fechar"
              style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 1101 }}
            >
              <X size={18} />
            </button>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '92vw', height: '88vh', borderRadius: 8, overflow: 'hidden', background: '#111' }}>
              <iframe src={pdfLightboxSrc} title="PDF expandido" style={{ width: '100%', height: '100%', border: 0 }} />
            </div>
          </div>
        )}

        {/* Video lightbox — expanded playback */}
        {videoLightbox && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, animation: 'fade-in 0.15s ease-out' }}
            onClick={() => setVideoLightbox(null)}
          >
            <button
              onClick={() => setVideoLightbox(null)}
              aria-label="Fechar"
              style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 1101 }}
            >
              <X size={18} />
            </button>
            <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <video
                controls
                autoPlay
                preload="auto"
                style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 8, backgroundColor: '#000', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                src={videoUrls[videoLightbox] || ''}
              >
                Seu navegador não suporta reprodução de vídeo.
              </video>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{(parseVideoRef(videoLightbox).localFileName || videoLightbox).replace(/^\d+-/, '')}</span>
                <button
                  onClick={() => handleCopyVideoPath(videoLightbox)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 11, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, background: copiedPath === videoLightbox ? 'var(--color-primary-teal)' : 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer' }}
                >
                  <Copy size={12} /> {copiedPath === videoLightbox ? 'Copiado!' : 'Copiar caminho'}
                </button>
                <button
                  onClick={() => handleOpenVideoExternal(videoLightbox)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 11, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer' }}
                >
                  <ExternalLink size={12} /> Player do sistema
                </button>
                <button
                  onClick={() => handleSaveVideoAs(videoLightbox)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 11, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer' }}
                >
                  <Download size={12} /> Salvar como...
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
