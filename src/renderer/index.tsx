import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { SettingsProvider } from './hooks/useSettings';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TasksProvider } from './contexts/TasksContext';
import { NotesProvider } from './contexts/NotesContext';
import { CategoriesProvider } from './contexts/CategoriesContext';
import AuthScreen from './components/AuthScreen';

console.log('index.tsx loaded');

// Tratamento de erro global
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

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
      <SettingsProvider>
        <TasksProvider>
          <NotesProvider>
            <CategoriesProvider>
              <App />
            </CategoriesProvider>
          </NotesProvider>
        </TasksProvider>
      </SettingsProvider>
    );
  }

  // Otherwise show auth screen
  return <AuthScreen />;
};

const container = document.getElementById('root');
console.log('Container element:', container);

if (container) {
  console.log('Creating React 18 root...');
  try {
    const root = createRoot(container);
    root.render(
      <AuthProvider>
        <RootApp />
      </AuthProvider>
    );
    console.log('App rendered successfully with React 18');
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