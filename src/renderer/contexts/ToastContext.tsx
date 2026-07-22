import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast, ToastType } from '../components/Toast';
import { useSettings } from '../hooks/useSettings';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onClick?: () => void;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number, onClick?: () => void) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((
    message: string,
    type: ToastType = 'info',
    duration = 3500,
    onClick?: () => void
  ) => {
    // Check if toast notifications parameter is enabled
    if (settings.showToastNotifications === false) {
      return;
    }

    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToasts(prev => [...prev, { id, message, type, duration, onClick }]);
  }, [settings.showToastNotifications]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed',
        top: '72px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 99999,
        pointerEvents: 'none',
      }}>
        {toasts.map(toast => (
          <div key={toast.id} style={{ pointerEvents: 'auto' }}>
            <Toast
              message={toast.message}
              type={toast.type}
              duration={toast.duration}
              onClick={toast.onClick}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (message: string, type: ToastType = 'info') => {
        console.log(`[Toast Fallback] ${type.toUpperCase()}: ${message}`);
      },
    };
  }
  return context;
};
