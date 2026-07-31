import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'secondary';
}

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  onClick?: () => void;
  actions?: ToastAction[];
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  type, 
  onClose, 
  onClick,
  actions,
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
      maxWidth: '460px',
      minWidth: '280px',
      border: '1px solid',
      backdropFilter: 'blur(12px)',
      animation: 'toast-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      flexWrap: actions && actions.length > 0 ? 'wrap' : 'nowrap',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
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

      {actions && actions.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '8px',
          width: '100%',
          marginTop: '6px',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        }}>
          {actions.map((act, idx) => {
            const isDanger = act.variant === 'danger';
            const isPrimary = act.variant === 'primary' || !act.variant;
            return (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  act.onClick();
                  onClose();
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isDanger ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.3)',
                  background: isDanger
                    ? 'rgba(239, 68, 68, 0.25)'
                    : isPrimary
                    ? 'rgba(255, 255, 255, 0.25)'
                    : 'transparent',
                  color: '#FFFFFF',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDanger
                    ? 'rgba(239, 68, 68, 0.45)'
                    : isPrimary
                    ? 'rgba(255, 255, 255, 0.4)'
                    : 'rgba(255, 255, 255, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDanger
                    ? 'rgba(239, 68, 68, 0.25)'
                    : isPrimary
                    ? 'rgba(255, 255, 255, 0.25)'
                    : 'transparent';
                }}
              >
                {act.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};