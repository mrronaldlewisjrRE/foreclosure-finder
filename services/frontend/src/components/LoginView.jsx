import { useState } from 'react';
import { Lock, Mail, ShieldAlert, Sparkles, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function LoginView({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [googlePassword, setGooglePassword] = useState('');
  const [googleVerificationCode, setGoogleVerificationCode] = useState('');

  async function handleGoogleLogin(googleEmail, name) {
    if (!googlePassword || !googleVerificationCode || googleVerificationCode.length !== 6) {
      setError('Password and 6-digit verification code are required.');
      return;
    }
    setLoading(true);
    setError(null);
    setShowGoogleChooser(false);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/google`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ 
          email: googleEmail, 
          name: name || 'Google User',
          password: googlePassword,
          verificationCode: googleVerificationCode
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Google authentication failed.');
      }

      localStorage.setItem('ff_auth_token', data.token);
      localStorage.setItem('ff_auth_user', JSON.stringify(data.user));
      onLoginSuccess(data.user, data.token);
    } catch (err) {
      console.error('[Google Login] Error:', err);
      setError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
      setGooglePassword('');
      setGoogleVerificationCode('');
    }
  }

  function openGoogleChooser() {
    setCustomGoogleEmail('');
    setGooglePassword('');
    setGoogleVerificationCode('');
    setError(null);
    setShowGoogleChooser(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and access key.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      // Persist to local storage and trigger parent success callback
      localStorage.setItem('ff_auth_token', data.token);
      localStorage.setItem('ff_auth_user', JSON.stringify(data.user));
      onLoginSuccess(data.user, data.token);
    } catch (err) {
      console.error('[Login] Error:', err);
      setError(err.message || 'Invalid email or access key.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      backgroundImage: `
        radial-gradient(at 0% 0%, rgba(6, 182, 212, 0.08) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.08) 0px, transparent 50%)
      `,
      fontFamily: 'var(--font-sans)',
      color: 'var(--text-primary)'
    }}>
      <div style={{
        width: '420px',
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '40px',
        boxShadow: 'var(--shadow-premium)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Top glowing cyan line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '3px',
          background: 'linear-gradient(90deg, var(--cyan), var(--purple))'
        }} />

        {/* Brand Logo header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 800,
            fontSize: '1.25rem',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)',
            marginBottom: '16px'
          }}>
            FF
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '4px' }}>
            ForeclosureFinder <span style={{ color: 'var(--cyan)' }}>AI</span>
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Stabilized Ingestion Portal
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Error message */}
          {error && (
            <div style={{
              background: 'var(--rose-glow)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: 'var(--rose)',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ShieldAlert size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Email input group */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Portal Username / Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="email"
                placeholder="admin@foreclosurefinder.ai"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(8, 11, 17, 0.6)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  padding: '10px 12px 10px 38px',
                  fontSize: '0.85rem',
                  outline: 'none',
                  transition: 'var(--transition-fast)'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--cyan)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
              />
            </div>
          </div>

          {/* Password input group */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Security Access Key
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(8, 11, 17, 0.6)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  padding: '10px 12px 10px 38px',
                  fontSize: '0.85rem',
                  outline: 'none',
                  transition: 'var(--transition-fast)'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--cyan)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '10px',
              transition: 'var(--transition-fast)',
              boxShadow: '0 4px 15px rgba(6, 182, 212, 0.2)'
            }}
            onMouseOver={e => !loading && (e.currentTarget.style.transform = 'translateY(-1px)', e.currentTarget.style.boxShadow = '0 6px 20px rgba(6, 182, 212, 0.35)')}
            onMouseOut={e => (e.currentTarget.style.transform = 'none', e.currentTarget.style.boxShadow = '0 4px 15px rgba(6, 182, 212, 0.2)')}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Verify Credentials</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          margin: '20px 0',
          color: 'var(--text-muted)',
          fontSize: '0.72rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          <div style={{ flexGrow: 1, height: '1px', background: 'var(--border-color)' }} />
          <span>OR</span>
          <div style={{ flexGrow: 1, height: '1px', background: 'var(--border-color)' }} />
        </div>

        {/* Google Authentication Button */}
        <button
          type="button"
          onClick={openGoogleChooser}
          disabled={loading}
          style={{
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'var(--transition-fast)'
          }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: '2px' }}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span>Continue with Google</span>
        </button>


      </div>

      {/* Google Account Chooser Modal */}
      {showGoogleChooser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(5, 7, 12, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-sans)',
          color: 'var(--text-primary)'
        }}>
          <div style={{
            width: '400px',
            background: 'var(--glass-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '30px',
            boxShadow: 'var(--shadow-premium)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <button
              onClick={() => setShowGoogleChooser(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>

            <div style={{ textAlign: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" style={{ margin: '0 auto 8px auto', display: 'block' }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <h4 style={{ fontWeight: 800, fontSize: '1.1rem' }}>Sign in with Google</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                to continue to ForeclosureFinder AI
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Google Email Address
                </label>
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  className="form-input"
                  value={customGoogleEmail}
                  onChange={e => setCustomGoogleEmail(e.target.value)}
                  style={{
                    fontSize: '0.85rem',
                    padding: '12px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Google Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="form-input"
                  value={googlePassword}
                  onChange={e => setGooglePassword(e.target.value)}
                  style={{
                    fontSize: '0.85rem',
                    padding: '12px',
                    width: '100%',
                    boxSizing: 'border-box',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  2FA Verification Code
                </label>
                <input
                  type="text"
                  placeholder="6-digit code (e.g. 123456)"
                  maxLength={6}
                  className="form-input"
                  value={googleVerificationCode}
                  onChange={e => setGoogleVerificationCode(e.target.value.replace(/\D/g, ''))}
                  style={{
                    fontSize: '0.85rem',
                    padding: '12px',
                    width: '100%',
                    boxSizing: 'border-box',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    letterSpacing: '2px',
                    textAlign: 'center'
                  }}
                />
              </div>

              <button
                onClick={() => handleGoogleLogin(customGoogleEmail, customGoogleEmail.split('@')[0])}
                disabled={!customGoogleEmail || !customGoogleEmail.includes('@') || !googlePassword || !googleVerificationCode || googleVerificationCode.length !== 6}
                className="btn"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
