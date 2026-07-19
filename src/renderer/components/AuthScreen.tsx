import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle, Loader2, WifiOff } from 'lucide-react';

type AuthTab = 'login' | 'register' | 'forgot';

type AuthErrorLike = {
  message?: string;
  status?: number;
};

const mapAuthErrorMessage = (authError: AuthErrorLike | null | undefined): string => {
  const message = authError?.message ?? 'Erro de autenticação. Tente novamente.';
  const lower = message.toLowerCase();
  const status = authError?.status;

  if (lower.includes('invalid login credentials')) {
    return 'Email ou senha incorretos';
  }

  if (lower.includes('email not confirmed')) {
    return 'Confirme seu email antes de fazer login. Verifique sua caixa de entrada.';
  }

  if (lower.includes('already registered')) {
    return 'Este email já está cadastrado';
  }

  if (status === 429 || lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Limite de tentativas atingido. Aguarde alguns minutos e tente novamente.';
  }

  if (lower.includes('invalid refresh token') || lower.includes('refresh token not found')) {
    return 'Sessão antiga detectada. Tente novamente.';
  }

  return message;
};

const AuthScreen: React.FC = () => {
  const { signIn, signUp, signInWithGoogle, signInWithDiscord, resetPassword, setOfflineMode } = useAuth();

  const [tab, setTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('nexus-remember-me') !== 'false';
  });

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleGoogleLogin = async () => {
    clearMessages();
    setLoading(true);
    localStorage.setItem('nexus-remember-me', rememberMe ? 'true' : 'false');
    const { error: authError } = await signInWithGoogle();
    setLoading(false);
    if (authError) {
      setError(mapAuthErrorMessage(authError));
    }
  };

  const handleDiscordLogin = async () => {
    clearMessages();
    setLoading(true);
    localStorage.setItem('nexus-remember-me', rememberMe ? 'true' : 'false');
    const { error: authError } = await signInWithDiscord();
    setLoading(false);
    if (authError) {
      setError(mapAuthErrorMessage(authError));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim() || !password.trim()) {
      setError('Preencha todos os campos');
      return;
    }

    setLoading(true);
    localStorage.setItem('nexus-remember-me', rememberMe ? 'true' : 'false');
    const { error: authError } = await signIn(email.trim(), password);
    setLoading(false);

    if (authError) {
      setError(mapAuthErrorMessage(authError));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim() || !password.trim() || !displayName.trim()) {
      setError('Preencha todos os campos');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    localStorage.setItem('nexus-remember-me', rememberMe ? 'true' : 'false');
    const { error: authError } = await signUp(email.trim(), password, displayName.trim());
    setLoading(false);

    if (authError) {
      setError(mapAuthErrorMessage(authError));
    } else {
      setSuccess('Conta criada! Verifique seu email para confirmar o cadastro.');
      setTab('login');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim()) {
      setError('Digite seu email');
      return;
    }

    setLoading(true);
    const { error: authError } = await resetPassword(email.trim());
    setLoading(false);

    if (authError) {
      setError(mapAuthErrorMessage(authError));
    } else {
      setSuccess('Email de recuperação enviado! Verifique sua caixa de entrada.');
    }
  };

  const handleOfflineMode = () => {
    setOfflineMode(true);
  };

  const switchTab = (newTab: AuthTab) => {
    setTab(newTab);
    clearMessages();
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--color-bg-primary)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle ambient light */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,194,157,0.02) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'var(--color-bg-secondary)',
        backdropFilter: 'blur(20px)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border-primary)',
        padding: '40px 32px',
        boxShadow: 'var(--shadow-2xl)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo / Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          {/* Inline Nexus Icon */}
          <div style={{
            width: '56px',
            height: '56px',
            margin: '0 auto 16px auto',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-primary)',
            border: '1.5px solid var(--color-border-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="32" height="32" viewBox="0 0 512 512">
              <defs>
                <linearGradient id="authNGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: 'var(--color-primary-teal)', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: 'var(--color-primary-purple)', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              <g transform="translate(256,256)">
                <rect x="-110" y="-130" width="38" height="260" rx="6" fill="url(#authNGrad)"/>
                <rect x="72" y="-130" width="38" height="260" rx="6" fill="url(#authNGrad)"/>
                <polygon points="-72,-130 110,130 72,130 -110,-130" fill="url(#authNGrad)"/>
              </g>
            </svg>
          </div>
          <h1 style={{
            fontSize: '26px',
            fontWeight: 700,
            margin: '0 0 6px 0',
            letterSpacing: '-0.5px',
            color: 'var(--color-text-primary)',
          }}>
            Nexus
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#808080',
            margin: 0,
          }}>
            {tab === 'login' && 'Entre na sua conta'}
            {tab === 'register' && 'Crie sua conta'}
            {tab === 'forgot' && 'Recuperar senha'}
          </p>
        </div>

        {/* Tab Switcher (login/register only) */}
        {tab !== 'forgot' && (
          <div style={{
            display: 'flex',
            gap: '4px',
            marginBottom: '24px',
            background: 'var(--color-bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            padding: '4px',
            border: '1px solid var(--color-border-primary)',
          }}>
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: tab === t ? 'var(--color-bg-secondary)' : 'transparent',
                  color: tab === t ? 'var(--color-primary-teal)' : 'var(--color-text-secondary)',
                }}
              >
                {t === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px',
            marginBottom: '16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            fontSize: '13px',
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px',
            marginBottom: '16px',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            borderRadius: 'var(--radius-md)',
            color: '#86efac',
            fontSize: '13px',
          }}>
            <CheckCircle size={16} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {/* Login Form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin}>
            <InputField
              icon={<Mail size={18} />}
              type="email"
              placeholder="Email"
              value={email}
              onChange={setEmail}
              autoFocus
            />
            <InputField
              icon={<Lock size={18} />}
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha"
              value={password}
              onChange={setPassword}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#606060',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                userSelect: 'none',
              }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    accentColor: 'var(--color-primary-teal)',
                    cursor: 'pointer',
                  }}
                />
                Lembrar login
              </label>

              <button
                type="button"
                onClick={() => switchTab('forgot')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary-teal)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '0',
                }}
              >
                Esqueci minha senha
              </button>
            </div>

            <SubmitButton loading={loading} text="Entrar" />
          </form>
        )}

        {/* Register Form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister}>
            <InputField
              icon={<User size={18} />}
              type="text"
              placeholder="Nome"
              value={displayName}
              onChange={setDisplayName}
              autoFocus
            />
            <InputField
              icon={<Mail size={18} />}
              type="email"
              placeholder="Email"
              value={email}
              onChange={setEmail}
            />
            <InputField
              icon={<Lock size={18} />}
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha (mín. 6 caracteres)"
              value={password}
              onChange={setPassword}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#606060',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <SubmitButton loading={loading} text="Criar conta" />
          </form>
        )}

        {/* Forgot Password Form */}
        {tab === 'forgot' && (
          <form onSubmit={handleForgotPassword}>
            <InputField
              icon={<Mail size={18} />}
              type="email"
              placeholder="Email"
              value={email}
              onChange={setEmail}
              autoFocus
            />

            <SubmitButton loading={loading} text="Enviar email de recuperação" />

            <button
              type="button"
              onClick={() => switchTab('login')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary-teal)',
                fontSize: '13px',
                cursor: 'pointer',
                padding: '8px 0 0 0',
                display: 'block',
                width: '100%',
                textAlign: 'center',
              }}
            >
              Voltar ao login
            </button>
          </form>
        )}

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          margin: '24px 0',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-border-primary)' }} />
          <span style={{ fontSize: '12px', color: '#606060' }}>ou</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-border-primary)' }} />
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-tertiary)',
            color: '#E0E0E0',
            fontSize: '13px',
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'all 0.2s',
            marginBottom: '10px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-bg-hover)';
            e.currentTarget.style.borderColor = 'var(--color-border-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-bg-tertiary)';
            e.currentTarget.style.borderColor = 'var(--color-border-primary)';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Entrar com Google
        </button>

        {/* Discord OAuth Button */}
        <button
          type="button"
          onClick={handleDiscordLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-tertiary)',
            color: '#E0E0E0',
            fontSize: '13px',
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'all 0.2s',
            marginBottom: '10px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-bg-hover)';
            e.currentTarget.style.borderColor = 'var(--color-border-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-bg-tertiary)';
            e.currentTarget.style.borderColor = 'var(--color-border-primary)';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 127.14 96.36" fill="currentColor">
            <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,52.88,6.83,77.19,77.19,0,0,0,49.58,0,105.15,105.15,0,0,0,19.14,8.07C3,33.79-1.5,58.87,1,83.47a105.65,105.65,0,0,0,32,16.29,80.4,80.4,0,0,0,6.79-11.11,68.6,68.6,0,0,1-10.7-5.12c.9-.66,1.8-1.34,2.66-2a75.58,75.58,0,0,0,94.94,0c.86.69,1.76,1.37,2.66,2a68.6,68.6,0,0,1-10.7,5.12,80.4,80.4,0,0,0,6.79,11.11,105.65,105.65,0,0,0,32-16.29C129.64,50.37,124.7,25.43,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
          </svg>
          Entrar com Discord
        </button>

        {/* Offline Mode Button */}
        <button
          type="button"
          onClick={handleOfflineMode}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-tertiary)',
            color: '#808080',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-bg-hover)';
            e.currentTarget.style.borderColor = 'var(--color-border-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-bg-tertiary)';
            e.currentTarget.style.borderColor = 'var(--color-border-primary)';
          }}
        >
          <WifiOff size={16} />
          Usar modo offline
        </button>
      </div>
    </div>
  );
};

// Reusable Input Field Component
interface InputFieldProps {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: React.ReactNode;
  autoFocus?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
  icon,
  type,
  placeholder,
  value,
  onChange,
  suffix,
  autoFocus,
}) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '0 14px',
    marginBottom: '12px',
    background: 'var(--color-bg-primary)',
    border: '1px solid var(--color-border-primary)',
    borderRadius: 'var(--radius-md)',
    transition: 'border-color 0.2s',
  }}>
    <span style={{ color: '#606060', display: 'flex', flexShrink: 0 }}>{icon}</span>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoFocus={autoFocus}
      style={{
        flex: 1,
        padding: '13px 0',
        border: 'none',
        background: 'transparent',
        color: '#FFFFFF',
        fontSize: '14px',
        outline: 'none',
      }}
    />
    {suffix}
  </div>
);

// Reusable Submit Button
interface SubmitButtonProps {
  loading: boolean;
  text: string;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({ loading, text }) => (
  <button
    type="submit"
    disabled={loading}
    style={{
      width: '100%',
      padding: '13px',
      border: 'none',
      borderRadius: 'var(--radius-md)',
      background: loading
        ? 'rgba(var(--color-primary-teal-rgb), 0.2)'
        : 'var(--color-primary-teal)',
      color: '#09090b',
      fontSize: '14px',
      fontWeight: 600,
      cursor: loading ? 'not-allowed' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      transition: 'all 0.2s',
      opacity: loading ? 0.7 : 1,
    }}
  >
    {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
    {text}
  </button>
);

export default AuthScreen;
