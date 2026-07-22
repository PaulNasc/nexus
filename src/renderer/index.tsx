import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ToastProvider } from './contexts/ToastContext';
import { SettingsProvider } from './hooks/useSettings';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TasksProvider } from './contexts/TasksContext';
import { NotesProvider } from './contexts/NotesContext';
import { CategoriesProvider } from './contexts/CategoriesContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { SystemTagsProvider } from './contexts/SystemTagsContext';
import AuthScreen from './components/AuthScreen';
import { migrateLegacyStorageKeys } from './utils/migrateLegacyStorage';

migrateLegacyStorageKeys();

// Tratamento de erro global
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  try {
    const err = event.error || new Error(event.message || 'Erro global desconhecido');
    (window as any).electronAPI?.logging?.logError?.('anonymous', err, 'renderer-global');
  } catch (e) {
    console.error('Falha ao gravar log de erro global:', e);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  try {
    const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason || 'Unhandled Promise Rejection'));
    (window as any).electronAPI?.logging?.logError?.('anonymous', reason, 'renderer-unhandled-rejection');
  } catch (e) {
    console.error('Falha ao gravar log de rejeição de promessa:', e);
  }
});

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary capturou erro:', error, errorInfo);
    try {
      (window as any).electronAPI?.logging?.logError?.(
        'anonymous', 
        error, 
        `ErrorBoundary ComponentStack: ${errorInfo.componentStack}`
      );
    } catch (e) {
      console.error('Falha ao enviar log de erro do ErrorBoundary:', e);
    }
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: '#0a0a0f',
          color: '#ffffff',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '40px',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '28px', color: '#ff4444', marginBottom: '16px', fontWeight: 600 }}>
            Ocorreu um erro na interface
          </h1>
          <p style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '24px', maxWidth: '500px' }}>
            Desculpe o inconveniente. O erro foi registrado e você pode tentar recarregar a tela do programa.
          </p>
          <pre style={{
            backgroundColor: '#161622',
            padding: '16px',
            borderRadius: '8px',
            color: '#fda4af',
            maxWidth: '90%',
            overflowX: 'auto',
            fontSize: '12px',
            fontFamily: 'monospace',
            marginBottom: '24px',
            textAlign: 'left',
            border: '1px solid rgba(244, 63, 94, 0.2)'
          }}>
            {this.state.error?.toString() || 'Erro desconhecido'}
          </pre>
          <button
            onClick={this.handleReload}
            style={{
              background: 'linear-gradient(135deg, #00D4AA 0%, #00876C 100%)',
              color: '#fff',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 212, 170, 0.3)',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
          >
            Recarregar Nexus
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Root component that handles auth routing
const RootApp: React.FC = () => {
  const { user, loading, isOffline } = useAuth();

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0a0a0f',
        color: '#9ca3af',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '14px',
      }}>
        Carregando Nexus...
      </div>
    );
  }

  // If offline mode is active OR user is authenticated, show the app
  if (isOffline || user) {
    return (
      <ToastProvider>
        <SettingsProvider>
          <OrganizationProvider>
            <SystemTagsProvider>
              <TasksProvider>
                <NotesProvider>
                  <CategoriesProvider>
                    <App />
                  </CategoriesProvider>
                </NotesProvider>
              </TasksProvider>
            </SystemTagsProvider>
          </OrganizationProvider>
        </SettingsProvider>
      </ToastProvider>
    );
  }

  // Otherwise show auth screen
  return <AuthScreen />;
};

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <ErrorBoundary>
        <AuthProvider>
          <RootApp />
        </AuthProvider>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('Error rendering app:', error);
    container.innerHTML = `
      <div style="background-color: #1a1a1a; color: #ffffff; min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column; font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="font-size: 48px; margin-bottom: 20px; color: #ff4444;">Erro ao carregar aplicação</h1>
        <p style="font-size: 18px; color: #ffaaaa; margin-bottom: 20px;">Ocorreu um erro ao inicializar o Nexus.</p>
        <pre style="background-color: #2a2a2a; padding: 20px; border-radius: 8px; color: #ffcccc; max-width: 600px; overflow-x: auto;">${error}</pre>
        <p style="margin-top: 20px; color: #aaaaaa;">Verifique o console para mais detalhes.</p>
      </div>
    `;
  }
} else {
  console.error('Root element not found');
  document.body.innerHTML = `
    <div style="background-color: #1a1a1a; color: #ffffff; min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: Arial, sans-serif;">
      <h1 style="color: #ff4444;">Erro: Elemento root não encontrado</h1>
    </div>
  `;
}