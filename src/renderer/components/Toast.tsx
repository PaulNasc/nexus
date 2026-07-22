import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  onClick?: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  type, 
  onClose, 
  onClick,
  duration = 3500 
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getToastStyles = () => {
    const baseStyles: React.CSSProperties = {
      position: 'relative',
      padding: '14px 18px',
      borderRadius: '10px',
      color: '#FFFFFF',
      fontSize: '14px',
      fontWeight: 500,
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
      zIndex: 99999,
      maxWidth: '420px',
      minWidth: '260px',
      border: '1px solid',
      backdropFilter: 'blur(12px)',
      animation: 'toast-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    };

    switch (type) {
      case 'success':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%)',
          borderColor: '#10B981',
        };
      case 'error':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(220, 38, 38, 0.95) 100%)',
          borderColor: '#EF4444',
        };
      case 'info':
      default:
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.95) 0%, rgba(2, 132, 199, 0.95) 100%)',
          borderColor: '#0EA5E9',
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle size={18} strokeWidth={2} style={{ flexShrink: 0 }} />;
      case 'error': return <XCircle size={18} strokeWidth={2} style={{ flexShrink: 0 }} />;
      case 'info': default: return <Info size={18} strokeWidth={2} style={{ flexShrink: 0 }} />;
    }
  };

  return (
    <div
      style={{ ...getToastStyles(), cursor: onClick ? 'pointer' : 'default' }}
      onClick={() => {
        if (onClick) {
          onClick();
          onClose();
        }
      }}
    >
      {getIcon()}
      <span style={{ flex: 1, lineHeight: '1.4' }}>
        {message}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          background: 'none',
          border: 'none',
          color: '#FFFFFF',
          cursor: 'pointer',
          padding: '2px',
          marginLeft: '8px',
          opacity: 0.8,
          transition: 'opacity 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
      >
        <X size={16} strokeWidth={2} />
      </button>
    </div>
  );
};