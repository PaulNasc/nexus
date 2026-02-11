import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle, Loader2, WifiOff } from 'lucide-react';

type AuthTab = 'login' | 'register' | 'forgot';

const AuthScreen: React.FC = () => {
  const { signIn, signUp, signInWithGoogle, resetPassword, setOfflineMode } = useAuth();

  const [tab, setTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleGoogleLogin = async () => {
    clearMessages();
    setLoading(true);
    const { error: authError } = await signInWithGoogle();
    setLoading(false);
    if (authError) {
      setError(authError.message);
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
    const { error: authError } = await signIn(email.trim(), password);
    setLoading(false);

    if (authError) {
      if (authError.message.includes('Invalid login credentials')) {
        setError('Email ou senha incorretos');
      } else if (authError.message.includes('Email not confirmed')) {
        setError('Confirme seu email antes de fazer login. Verifique sua caixa de entrada.');
      } else {
        setError(authError.message);
      }
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
    const { error: authError } = await signUp(email.trim(), password, displayName.trim());
    setLoading(false);

    if (authError) {
      if (authError.message.includes('already registered')) {
        setError('Este email já está cadastrado');
      } else {
        setError(authError.message);
      }
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
      setError(authError.message);
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
      background: '#0A0A0A',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle gradient orbs in background */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        left: '-10%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,212,170,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-20%',
        right: '-10%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(123,63,242,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: '#141414',
        backdropFilter: 'blur(20px)',
        borderRadius: '16px',
        border: '1px solid #2A2A2A',
        padding: '40px 32px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
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
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #0D0D0D, #1A1A2E)',
            border: '1.5px solid rgba(0,212,170,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,212,170,0.1)',
          }}>
            <svg width="32" height="32" viewBox="0 0 512 512">
              <defs>
                <linearGradient id="authNGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#00D4AA', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#7B3FF2', stopOpacity: 1 }} />
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
            background: 'linear-gradient(135deg, #00D4AA 0%, #7B3FF2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
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
            background: '#1A1A1A',
            borderRadius: '10px',
            padding: '4px',
            border: '1px solid #2A2A2A',
          }}>
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: tab === t ? 'rgba(0, 212, 170, 0.12)' : 'transparent',
                  color: tab === t ? '#00D4AA' : '#808080',
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
            borderRadius: '10px',
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
            borderRadius: '10px',
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

            <button
              type="button"
              onClick={() => switchTab('forgot')}
              style={{
                background: 'none',
                border: 'none',
                color: '#00D4AA',
                fontSize: '12px',
                cursor: 'pointer',
                padding: '0',
                marginBottom: '20px',
                display: 'block',
              }}
            >
              Esqueci minha senha
            </button>

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
                color: '#00D4AA',
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
          <div style={{ flex: 1, height: '1px', background: '#2A2A2A' }} />
          <span style={{ fontSize: '12px', color: '#606060' }}>ou</span>
          <div style={{ flex: 1, height: '1px', background: '#2A2A2A' }} />
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #2A2A2A',
            borderRadius: '10px',
            background: '#1A1A1A',
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
            e.currentTarget.style.background = '#222222';
            e.currentTarget.style.borderColor = '#3A3A3A';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#1A1A1A';
            e.currentTarget.style.borderColor = '#2A2A2A';
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

        {/* Offline Mode Button */}
        <button
          type="button"
          onClick={handleOfflineMode}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #2A2A2A',
            borderRadius: '10px',
            background: '#111111',
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
            e.currentTarget.style.background = '#1A1A1A';
            e.currentTarget.style.borderColor = '#3A3A3A';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#111111';
            e.currentTarget.style.borderColor = '#2A2A2A';
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
    background: '#0A0A0A',
    border: '1px solid #2A2A2A',
    borderRadius: '10px',
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
      borderRadius: '10px',
      background: loading
        ? 'rgba(0, 212, 170, 0.2)'
        : 'linear-gradient(135deg, #00D4AA, #7B3FF2)',
      color: '#fff',
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
