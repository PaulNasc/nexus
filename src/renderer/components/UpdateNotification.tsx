import React, { useState, useEffect, useCallback } from 'react';
import { Download, X, RefreshCw, CheckCircle, FileText, ChevronDown, ChevronUp } from 'lucide-react';

interface UpdateStatus {
  state: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  progress?: { percent: number; bytesPerSecond: number; transferred: number; total: number };
  releaseNotes?: string;
  error?: string;
}

interface UpdateNotificationProps {
  isDark: boolean;
}

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Re-check every 1 hour

const UpdateNotification: React.FC<UpdateNotificationProps> = ({ isDark }) => {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' });
  const [dismissed, setDismissed] = useState(false);
  const [autoDownload, setAutoDownload] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  const getElectron = useCallback(() => (window as any).electronAPI, []);

  // Load auto-download preference
  useEffect(() => {
    const electron = getElectron();
    if (!electron?.invoke) return;
    electron.invoke('settings:get', 'autoDownloadUpdates').then((val: unknown) => {
      if (typeof val === 'boolean') setAutoDownload(val);
    }).catch(() => {});
  }, [getElectron]);

  // Save auto-download preference
  const toggleAutoDownload = useCallback(() => {
    const next = !autoDownload;
    setAutoDownload(next);
    const electron = getElectron();
    electron?.invoke?.('settings:set', 'autoDownloadUpdates', next)?.catch(() => {});
  }, [autoDownload, getElectron]);

  // Subscribe to updater events + periodic check
  useEffect(() => {
    const electron = getElectron();
    if (!electron?.updater) return;

    // Get initial status
    electron.updater.getStatus().then((s: UpdateStatus) => {
      setStatus(s);
      if (s.state === 'available' || s.state === 'downloaded') {
        setDismissed(false);
      }
    }).catch(() => {});

    // Trigger initial check (complements the 30s check in main process)
    electron.updater.checkForUpdates().catch(() => {});

    // Subscribe to real-time status updates
    const unsub = electron.updater.onStatus((s: UpdateStatus) => {
      setStatus(s);
      if (s.state === 'available' || s.state === 'downloaded') {
        setDismissed(false);
      }
    });

    // Periodic re-check
    const interval = setInterval(() => {
      electron.updater.checkForUpdates().catch(() => {});
    }, CHECK_INTERVAL_MS);

    return () => {
      unsub?.();
      clearInterval(interval);
    };
  }, [getElectron]);

  // Auto-download when update is available and preference is enabled
  useEffect(() => {
    if (autoDownload && status.state === 'available') {
      const electron = getElectron();
      electron?.updater?.downloadUpdate?.();
    }
  }, [autoDownload, status.state, getElectron]);

  const handleDownload = () => {
    const electron = getElectron();
    electron?.updater?.downloadUpdate?.();
  };

  const handleInstall = () => {
    const electron = getElectron();
    electron?.updater?.quitAndInstall?.();
  };

  // Parse release notes for display
  const changelogLines = (status.releaseNotes || '').split('\n').filter(l => l.trim());

  // Only show for actionable states
  const showable = status.state === 'available' || status.state === 'downloading' || status.state === 'downloaded';
  if (!showable || dismissed) return null;

  const bg = isDark ? '#131313' : '#FFFFFF';
  const border = isDark ? '#222' : '#E5E7EB';
  const textPrimary = isDark ? '#FFFFFF' : '#1F2937';
  const textSecondary = isDark ? '#888' : '#6B7280';
  const textMuted = isDark ? '#555' : '#9CA3AF';

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '380px',
      backgroundColor: bg,
      border: `1px solid ${border}`,
      borderRadius: '8px',
      boxShadow: isDark
        ? '0 8px 32px rgba(0, 0, 0, 0.6)'
        : '0 8px 32px rgba(0, 0, 0, 0.12)',
      zIndex: 10000,
      overflow: 'hidden',
      animation: 'slideInRight 0.3s ease-out',
    }}>
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
            <CheckCircle size={16} color="#00D4AA" />
          ) : status.state === 'downloading' ? (
            <RefreshCw size={16} color="#7B3FF2" className="spin" />
          ) : (
            <Download size={16} color="#00D4AA" />
          )}
          <span style={{ fontSize: '13px', fontWeight: 600, color: textPrimary }}>
            {status.state === 'available' && `Nexus v${status.version} disponível`}
            {status.state === 'downloading' && 'Baixando atualização...'}
            {status.state === 'downloaded' && `v${status.version} pronta para instalar`}
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
            color: textMuted, lineHeight: 0,
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px' }}>
        {/* Changelog toggle */}
        {status.state === 'available' && changelogLines.length > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <button
              onClick={() => setShowChangelog(!showChangelog)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#7B3FF2', fontSize: '12px', fontWeight: 500, padding: 0,
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
                backgroundColor: isDark ? '#1A1A1A' : '#F9FAFB',
                border: `1px solid ${border}`,
                borderRadius: '6px',
                maxHeight: '180px',
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
                        <span style={{ position: 'absolute', left: 0, color: '#00D4AA' }}>•</span>
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
        {status.state === 'downloading' && status.progress && (
          <div style={{ marginBottom: '10px' }}>
            <div style={{
              width: '100%', height: '3px', borderRadius: '2px',
              backgroundColor: isDark ? '#2A2A2A' : '#E5E7EB',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${status.progress.percent}%`, height: '100%',
                background: 'linear-gradient(90deg, #00D4AA, #7B3FF2)',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', marginTop: '4px',
              fontSize: '10px', color: textMuted,
            }}>
              <span>{status.progress.percent}%</span>
              <span>{(status.progress.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s</span>
            </div>
          </div>
        )}

        {/* Auto-download checkbox */}
        {(status.state === 'available' || status.state === 'downloaded') && (
          <label style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '11px', color: textSecondary, cursor: 'pointer',
            marginBottom: '10px', userSelect: 'none',
          }}>
            <input
              type="checkbox"
              checked={autoDownload}
              onChange={toggleAutoDownload}
              style={{ accentColor: '#00D4AA', width: '13px', height: '13px', cursor: 'pointer' }}
            />
            Baixar atualizações automaticamente
          </label>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          {status.state === 'available' && (
            <>
              <button onClick={() => setDismissed(true)} style={{
                padding: '5px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer',
                border: `1px solid ${border}`,
                backgroundColor: 'transparent',
                color: textSecondary,
              }}>
                Depois
              </button>
              <button onClick={handleDownload} style={{
                padding: '5px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer',
                border: 'none', backgroundColor: '#00D4AA', color: '#000', fontWeight: 500,
              }}>
                Baixar agora
              </button>
            </>
          )}
          {status.state === 'downloaded' && (
            <button onClick={handleInstall} style={{
              padding: '5px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer',
              border: 'none', fontWeight: 500, color: '#fff',
              background: 'linear-gradient(135deg, #00D4AA, #7B3FF2)',
            }}>
              Reiniciar e Instalar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;