import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface FeedbackButtonProps {
  onClick: () => void;
  hasUnreadMasterCount?: number;
}

export const FeedbackButton: React.FC<FeedbackButtonProps> = ({ onClick, hasUnreadMasterCount = 0 }) => {
  return (
    <button
      onClick={onClick}
      className="feedback-trigger-btn"
      title="Sugestões e Bugs"
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        zIndex: 9998,
        width: '38px',
        height: '38px',
        borderRadius: '10px',
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        border: '1px solid rgba(245, 158, 11, 0.4)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#F59E0B',
        cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        userSelect: 'none',
      }}
    >
      <AlertTriangle size={18} color="#F59E0B" />
      {hasUnreadMasterCount > 0 && (
        <span style={{
          position: 'absolute',
          top: '-4px',
          right: '-4px',
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          backgroundColor: '#EF4444',
          color: '#FFF',
          fontSize: '9px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {hasUnreadMasterCount}
        </span>
      )}
    </button>
  );
};
