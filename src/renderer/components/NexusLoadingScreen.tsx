import React from 'react';

interface NexusLoadingScreenProps {
  title?: string;
  subtitle?: string;
}

export const NexusLoadingScreen: React.FC<NexusLoadingScreenProps> = ({
  title = 'Nexus',
  subtitle = 'Carregando ambiente...',
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: '#0A0A0F',
        color: '#FFFFFF',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        {/* Subtle Minimalist Spinner */}
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.08)',
            borderTopColor: '#00D4AA',
            animation: 'spin 0.8s linear infinite',
          }}
        />

        {/* Minimalist Text */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#F3F4F6',
              letterSpacing: '-0.2px',
              marginBottom: '4px',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: '13px',
              color: '#6B7280',
              fontWeight: 400,
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
    </div>
  );
};
