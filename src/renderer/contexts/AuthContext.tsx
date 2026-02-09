import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isOffline: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  setOfflineMode: (offline: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(() => {
    try {
      // Use sessionStorage so offline mode resets when app is closed
      return sessionStorage.getItem('nexus-offline-mode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Get initial session
    const initSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (err) {
        console.error('Error getting session:', err);
        // If we can't reach Supabase, check if we have a cached session
        const cachedUser = localStorage.getItem('nexus-cached-user');
        if (cachedUser) {
          try {
            setUser(JSON.parse(cachedUser));
          } catch {
            // ignore parse errors
          }
        }
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        // Cache user data for offline access
        if (newSession?.user) {
          localStorage.setItem('nexus-cached-user', JSON.stringify(newSession.user));
        } else {
          localStorage.removeItem('nexus-cached-user');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Escutar deep link callback do OAuth (krigzis://auth/callback#access_token=...&refresh_token=...)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).electronAPI;
    if (!api?.on) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleOAuthCallback = async (_event: any, url: string) => {
      try {
        // Extrair fragment da URL: krigzis://auth/callback#access_token=...&refresh_token=...
        const hashIndex = url.indexOf('#');
        if (hashIndex === -1) return;

        const fragment = url.substring(hashIndex + 1);
        const params = new URLSearchParams(fragment);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            console.error('OAuth callback setSession error:', error);
          }
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
      }
    };

    api.on('auth:oauth-callback', handleOAuthCallback);

    return () => {
      if (api?.off) {
        api.off('auth:oauth-callback', handleOAuthCallback);
      }
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });
    return { error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('nexus-cached-user');
    sessionStorage.removeItem('nexus-offline-mode');
    setIsOffline(false);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      // Para Electron: gerar URL OAuth sem redirecionar automaticamente
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'krigzis://auth/callback',
          skipBrowserRedirect: true,
        },
      });

      if (error) return { error };

      // Abrir a URL no navegador externo do sistema via Electron IPC
      if (data?.url) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api = (window as any).electronAPI;
        if (api?.auth?.openExternal) {
          await api.auth.openExternal(data.url);
        } else {
          // Fallback: tentar abrir diretamente (web)
          window.open(data.url, '_blank');
        }
      }

      return { error: null };
    } catch (err) {
      return { error: { message: err instanceof Error ? err.message : 'Erro ao iniciar login com Google' } as AuthError };
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  }, []);

  const setOfflineMode = useCallback((offline: boolean) => {
    setIsOffline(offline);
    sessionStorage.setItem('nexus-offline-mode', String(offline));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isOffline,
        signUp,
        signIn,
        signOut,
        signInWithGoogle,
        resetPassword,
        setOfflineMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
