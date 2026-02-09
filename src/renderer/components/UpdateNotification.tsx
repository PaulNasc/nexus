import React, { useState, useEffect } from 'react';
import { Download, X, RefreshCw, CheckCircle } from 'lucide-react';

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

const UpdateNotification: React.FC<UpdateNotificationProps> = ({ isDark }) => {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI?.updater) return;

    // Get initial status
    electronAPI.updater.getStatus().then((s: UpdateStatus) => setStatus(s)).catch(() => {});

    // Subscribe to real-time status updates from electron-updater
    const unsub = electronAPI.updater.onStatus((s: UpdateStatus) => {
      setStatus(s);
      // Auto-show toast when update is available or downloaded
      if (s.state === 'available' || s.state === 'downloaded') {
        setDismissed(false);
      }
    });

    return () => { unsub?.(); };
  }, []);

  const handleDownload = () => {
    const electronAPI = (window as any).electronAPI;
    electronAPI?.updater?.downloadUpdate?.();
  };

  const handleInstall = () => {
    const electronAPI = (window as any).electronAPI;
    electronAPI?.updater?.quitAndInstall?.();
  };

  // Only show for actionable states
  const showable = status.state === 'available' || status.state === 'downloading' || status.state === 'downloaded';
  if (!showable || dismissed) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '360px',
      backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
      border: `1px solid ${isDark ? '#2A2A2A' : '#E5E7EB'}`,
      borderRadius: '12px',
      boxShadow: isDark
        ? '0 8px 32px rgba(0, 0, 0, 0.5)'
        : '0 8px 32px rgba(0, 0, 0, 0.12)',
      zIndex: 10000,
      overflow: 'hidden',
      animation: 'slideInRight 0.3s ease-out',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${isDark ? '#2A2A2A' : '#F3F4F6'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {status.state === 'downloaded' ? (
            <CheckCircle size={18} color="#00D4AA" />
          ) : status.state === 'downloading' ? (
            <RefreshCw size={18} color="#7B3FF2" className="spin" />
          ) : (
            <Download size={18} color="#00D4AA" />
          )}
          <span style={{
            fontSize: '14px',
            fontWeight: 600,
            color: isDark ? '#FFFFFF' : '#1F2937',
          }}>
            {status.state === 'available' && `Nexus v${status.version} disponível`}
            {status.state === 'downloading' && 'Baixando atualização...'}
            {status.state === 'downloaded' && `v${status.version} pronta para instalar`}
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
            color: isDark ? '#666' : '#9CA3AF', lineHeight: 0,
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px' }}>
        {/* Download progress bar */}
        {status.state === 'downloading' && status.progress && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              width: '100%', height: '4px', borderRadius: '2px',
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
              display: 'flex', justifyContent: 'space-between', marginTop: '6px',
              fontSize: '11px', color: isDark ? '#666' : '#9CA3AF',
            }}>
              <span>{status.progress.percent}%</span>
              <span>{(status.progress.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          {status.state === 'available' && (
            <>
              <button onClick={() => setDismissed(true)} style={{
                padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
                border: `1px solid ${isDark ? '#333' : '#D1D5DB'}`,
                backgroundColor: 'transparent',
                color: isDark ? '#A0A0A0' : '#6B7280',
              }}>
                Depois
              </button>
              <button onClick={handleDownload} style={{
                padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
                border: 'none', backgroundColor: '#00D4AA', color: '#000', fontWeight: 500,
              }}>
                Baixar
              </button>
            </>
          )}
          {status.state === 'downloaded' && (
            <button onClick={handleInstall} style={{
              padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
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