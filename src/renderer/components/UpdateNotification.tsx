import React, { useState, useEffect } from 'react';
import { Download, X, RefreshCw, CheckCircle, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { desktopAdapter } from '../lib/desktopAdapter';

interface UpdateStatus {
  state: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  progress?: { percent: number; bytesPerSecond: number; transferred: number; total: number };
  releaseNotes?: string;
  error?: string;
  isPortable?: boolean;
}

interface UpdateNotificationProps {
  isDark: boolean;
}

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Re-check every 1 hour

/** Fallback: strip HTML tags if releaseNotes arrive as raw HTML */
function stripHtml(text: string): string {
  if (!text || !text.includes('<')) return text;
  let clean = text;
  clean = clean.replace(/<li[^>]*>/gi, '- ');
  clean = clean.replace(/<h[1-6][^>]*>/gi, '\n## ');
  clean = clean.replace(/<\/h[1-6]>/gi, '\n');
  clean = clean.replace(/<br\s*\/?>/gi, '\n');
  clean = clean.replace(/<\/p>/gi, '\n');
  clean = clean.replace(/<p[^>]*>/gi, '');
  clean = clean.replace(/<[^>]+>/g, '');
  clean = clean.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
  clean = clean.split('\n').map(l => l.trim()).filter(l => l).join('\n');
  return clean;
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({ isDark }) => {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' });
  const [dismissed, setDismissed] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [tempFilePath, setTempFilePath] = useState<string | null>(null);

  // Subscribe to updater events + periodic check via desktopAdapter
  useEffect(() => {
    // Initial check after 2 seconds
    const initialTimer = setTimeout(() => {
      desktopAdapter.checkForUpdates().then((s) => {
        if (s && s.state === 'available') {
          setStatus(s as UpdateStatus);
          setDismissed(false);
        }
      }).catch(() => {});
    }, 2000);

    // Listener for desktopAdapter status changes
    const unsub = desktopAdapter.onUpdateStatus((s) => {
      setStatus(s as UpdateStatus);
      if (s.state === 'available' || s.state === 'downloaded') {
        setDismissed(false);
      }
    });

    // Periodic check
    const interval = setInterval(() => {
      desktopAdapter.checkForUpdates().catch(() => {});
    }, CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimer);
      unsub?.();
      clearInterval(interval);
    };
  }, []);

  const handleDownload = async () => {
    try {
      const targetVer = status.version || '1.4.2';
      setStatus(prev => ({
        ...prev,
        state: 'downloading',
        progress: { percent: 0, bytesPerSecond: 0, transferred: 0, total: 0 },
      }));

      const tempPath = await desktopAdapter.downloadUpdateWithProgress(
        targetVer,
        (percent, transferredMb, totalMb) => {
          setStatus(prev => ({
            ...prev,
            state: 'downloading',
            progress: {
              percent,
              bytesPerSecond: 1024 * 1024,
              transferred: parseFloat(transferredMb) * 1024 * 1024,
              total: parseFloat(totalMb) * 1024 * 1024,
            },
          }));
        }
      );

      setTempFilePath(tempPath);
      setStatus(prev => ({
        ...prev,
        state: 'downloaded',
      }));
    } catch (err) {
      console.error('Erro ao baixar atualização:', err);
      setStatus(prev => ({
        ...prev,
        state: 'error',
        error: 'Falha ao realizar download.',
      }));
    }
  };

  const handleInstall = async () => {
    try {
      if (tempFilePath) {
        await desktopAdapter.installDownloadedUpdate(tempFilePath);
      } else {
        await desktopAdapter.applyUpdate();
      }
    } catch (err) {
      console.error('Erro ao instalar atualização:', err);
    }
  };

  // Parse release notes for display
  const cleanNotes = stripHtml(status.releaseNotes || '');
  const changelogLines = cleanNotes.split('\n').filter(l => l.trim());

  // Only show for actionable states
  const showable = status.state === 'available' || status.state === 'downloading' || status.state === 'downloaded' || status.state === 'error';
  if (!showable || dismissed) return null;

  const bg = isDark ? '#131318' : '#FFFFFF';
  const border = isDark ? 'rgba(16, 185, 129, 0.3)' : '#E5E7EB';
  const textPrimary = isDark ? '#FFFFFF' : '#1F2937';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const textMuted = isDark ? '#6B7280' : '#9CA3AF';

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '380px',
      maxWidth: 'calc(100vw - 3rem)',
      backgroundColor: bg,
      border: `1px solid ${status.state === 'error' ? 'rgba(239, 68, 68, 0.4)' : border}`,
      borderRadius: '12px',
      boxShadow: isDark
        ? '0 12px 32px rgba(0, 0, 0, 0.8), 0 0 20px rgba(16, 185, 129, 0.15)'
        : '0 8px 32px rgba(0, 0, 0, 0.12)',
      zIndex: 100000,
      overflow: 'hidden',
      animation: 'slideInRight 0.3s ease-out',
    }}>
      {/* Top accent bar */}
      <div style={{
        height: '3px',
        background: status.state === 'error'
          ? '#EF4444'
          : 'linear-gradient(90deg, #10B981 0%, #3B82F6 100%)',
      }} />

      {/* Header */}
      <div style={{
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {status.state === 'downloaded' ? (
            <CheckCircle size={16} color="#10B981" />
          ) : status.state === 'downloading' ? (
            <RefreshCw size={16} color="#3B82F6" className="animate-spin" />
          ) : status.state === 'error' ? (
            <Download size={16} color="#EF4444" />
          ) : (
            <Download size={16} color="#10B981" />
          )}
          <span style={{ fontSize: '13px', fontWeight: 600, color: textPrimary }}>
            {status.state === 'available' && `Nexus v${status.version} disponível`}
            {status.state === 'downloading' && 'Baixando atualização...'}
            {status.state === 'downloaded' && `v${status.version} pronta para atualizar`}
            {status.state === 'error' && 'Erro no download'}
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
            color: textMuted, lineHeight: 0, borderRadius: '4px',
          }}
          title="Fechar"
        >
          <X size={15} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px' }}>
        {status.state === 'error' && (
          <p style={{ fontSize: '12px', color: '#FCA5A5', marginBottom: '10px' }}>
            {status.error || 'Falha ao realizar o download da atualização.'}
          </p>
        )}

        {/* Changelog toggle */}
        {status.state === 'available' && changelogLines.length > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <button
              onClick={() => setShowChangelog(!showChangelog)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#10B981', fontSize: '12px', fontWeight: 500, padding: 0,
              }}
            >
              <FileText size={13} />
              O que há de novo
              {showChangelog ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {showChangelog && (
              <div style={{
                marginTop: '8px',
                padding: '10px 12px',
                backgroundColor: isDark ? '#181920' : '#F9FAFB',
                border: `1px solid ${border}`,
                borderRadius: '8px',
                maxHeight: '160px',
                overflowY: 'auto',
                fontSize: '12px',
                lineHeight: '1.6',
                color: textSecondary,
              }}>
                {changelogLines.map((line, i) => {
                  const trimmed = line.trim();
                  if (trimmed.startsWith('##') || trimmed.startsWith('# ')) {
                    return (
                      <div key={i} style={{ fontWeight: 600, color: textPrimary, marginTop: i > 0 ? '8px' : 0, marginBottom: '4px' }}>
                        {trimmed.replace(/^#+\s*/, '')}
                      </div>
                    );
                  }
                  if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                    return (
                      <div key={i} style={{ paddingLeft: '12px', position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 0, color: '#10B981' }}>•</span>
                        {trimmed.slice(2)}
                      </div>
                    );
                  }
                  return <div key={i}>{trimmed}</div>;
                })}
              </div>
            )}
          </div>
        )}

        {/* Download progress bar */}
        {status.state === 'downloading' && (
          <div style={{ marginBottom: '10px' }}>
            <div style={{
              width: '100%', height: '4px', borderRadius: '2px',
              backgroundColor: isDark ? '#2A2A2A' : '#E5E7EB',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${status.progress?.percent || 0}%`, height: '100%',
                background: 'linear-gradient(90deg, #10B981, #3B82F6)',
                transition: 'width 0.2s ease',
              }} />
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', marginTop: '6px',
              fontSize: '11px', color: textMuted,
            }}>
              <span>Progresso: {status.progress?.percent || 0}%</span>
              <span>
                {status.progress?.transferred ? (status.progress.transferred / 1024 / 1024).toFixed(1) : '0'} MB
                {status.progress?.total ? ` / ${(status.progress.total / 1024 / 1024).toFixed(1)} MB` : ''}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
          {status.state === 'available' && (
            <>
              <button onClick={() => setDismissed(true)} style={{
                padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: textSecondary,
              }}>
                Depois
              </button>
              <button onClick={handleDownload} style={{
                padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer',
                border: 'none', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#000', fontWeight: 600, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}>
                Baixar agora
              </button>
            </>
          )}
          {status.state === 'error' && (
            <button onClick={handleDownload} style={{
              padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer',
              border: 'none', background: '#EF4444', color: '#FFF', fontWeight: 600,
            }}>
              Tentar Novamente
            </button>
          )}
          {status.state === 'downloaded' && (
            <button onClick={handleInstall} style={{
              padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer',
              border: 'none', fontWeight: 600, color: '#000',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            }}>
              Reiniciar e Atualizar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;