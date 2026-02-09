import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  type, 
  onClose, 
  duration = 3000 
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getToastStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      top: '72px',
      right: '24px',
      padding: '16px 20px',
      borderRadius: '8px',
      color: '#FFFFFF',
      fontSize: '14px',
      fontWeight: 500,
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
      zIndex: 9999,
      maxWidth: '400px',
      minWidth: '200px',
      border: '1px solid',
      backdropFilter: 'blur(10px)',
      animation: 'toast-slide-in 0.3s ease-out',
    };

    switch (type) {
      case 'success':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.9) 0%, rgba(56, 142, 60, 0.9) 100%)',
          borderColor: '#4CAF50',
        };
      case 'error':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.9) 0%, rgba(211, 47, 47, 0.9) 100%)',
          borderColor: '#F44336',
        };
      case 'info':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.9) 0%, rgba(0, 163, 131, 0.9) 100%)',
          borderColor: '#00D4AA',
        };
      default:
        return baseStyles;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle size={16} strokeWidth={1.7} />;
      case 'error': return <XCircle size={16} strokeWidth={1.7} />;
      case 'info': return <Info size={16} strokeWidth={1.7} />;
      default: return null;
    }
  };

  return (
    <div style={getToastStyles()}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{ fontSize: '16px', display: 'flex', alignItems: 'center' }}>
          {getIcon()}
        </span>
        <span>
          {message}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#FFFFFF',
            cursor: 'pointer',
            padding: '0',
            marginLeft: 'auto',
            fontSize: '16px',
            opacity: 0.7,
            transition: 'opacity 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
        >
          <X size={16} strokeWidth={1.7} />
        </button>
      </div>
    </div>
  );
};

// Hook para gerenciar toasts
export const useToast = () => {
  const [toasts, setToasts] = React.useState<Array<{
    id: string;
    message: string;
    type: ToastType;
  }>>([]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const ToastContainer = () => (
    <>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  );

  return {
    showToast,
    ToastContainer,
  };
}; 