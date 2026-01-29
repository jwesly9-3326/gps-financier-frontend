// 🧭 PL4TO - PAGE LOGIN
// Design avec branding Pl4to
// 🌍 i18n enabled
// 🔐 Support 2FA
// 🔐 Google OAuth

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks';
import Toast from '../../components/common/Toast';
import { trackLogin } from '../../services/analytics.service';

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, loginWithGoogle, validate2FA, cancel2FA, requires2FA, pending2FAEmail } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);
  
  // 🔐 États 2FA
  const [twoFACode, setTwoFACode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [twoFAError, setTwoFAError] = useState(null);
  const [twoFALoading, setTwoFALoading] = useState(false);

  // Composant O animé pour le logo
  const AnimatedO = ({ size = 55 }) => (
    <div style={{
      position: 'relative',
      width: `${size}px`,
      height: `${size}px`,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        position: 'absolute',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        border: `${Math.max(3, size / 12)}px solid transparent`,
        background: 'linear-gradient(#040449, #100261) padding-box, linear-gradient(180deg, #ffd700, #ffb800, #ffa500, #ffd700) border-box',
        animation: 'gps-ring-spin 3s linear infinite',
        boxShadow: '0 0 25px rgba(255, 165, 0, 0.5)'
      }} />
    </div>
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (loginError) {
      setLoginError(null);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = t('auth.errors.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('auth.errors.emailInvalid');
    }
    if (!formData.password) {
      newErrors.password = t('auth.errors.passwordRequired');
    } else if (formData.password.length < 6) {
      newErrors.password = t('auth.errors.passwordMin');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError(null);
    if (!validate()) return;

    setLoading(true);
    const result = await login(formData.email, formData.password);
    setLoading(false);

    if (result.success) {
      trackLogin('email');
      showToast(t('auth.login.success'), 'success');
      setTimeout(() => {
        // 📱 Détecter si mobile PWA pour ouvrir sidebar après redirection
        const isMobilePWA = window.innerWidth < 768 && window.matchMedia('(display-mode: standalone)').matches;
        if (isMobilePWA) {
          // Mobile PWA: Rediriger vers dashboard avec sidebar ouvert
          window.location.href = '/dashboard?openSidebar=true';
        } else {
          window.location.href = '/dashboard';
        }
      }, 1000);
    } else if (result.requires2FA) {
      // 2FA requis - le state est géré par AuthContext
      console.log('🔐 2FA requis, affichage de l\'écran 2FA');
    } else {
      setLoginError(true);
    }
  };

  // 🔐 Gestion du code 2FA
  const handle2FACodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, useBackupCode ? 8 : 6);
    setTwoFACode(value);
    setTwoFAError(null);
  };

  const handleValidate2FA = async (e) => {
    e.preventDefault();
    
    if (!twoFACode || twoFACode.length < (useBackupCode ? 8 : 6)) {
      setTwoFAError(t('auth.twoFA.errorCodeLength'));
      return;
    }

    setTwoFALoading(true);
    setTwoFAError(null);

    const result = await validate2FA(twoFACode, useBackupCode);
    setTwoFALoading(false);

    if (result.success) {
      showToast(t('auth.login.success'), 'success');
      
      // Avertir si un code backup a été utilisé
      if (result.backupCodeUsed && result.backupCodesRemaining !== undefined) {
        setTimeout(() => {
          showToast(
            t('auth.twoFA.backupCodeUsed', { remaining: result.backupCodesRemaining }), 
            'warning'
          );
        }, 1500);
      }
      
      setTimeout(() => {
        // 📱 Détecter si mobile PWA pour ouvrir sidebar après redirection
        const isMobilePWA = window.innerWidth < 768 && window.matchMedia('(display-mode: standalone)').matches;
        if (isMobilePWA) {
          window.location.href = '/dashboard?openSidebar=true';
        } else {
          window.location.href = '/dashboard';
        }
      }, 1000);
    } else {
      setTwoFAError(result.error || t('auth.twoFA.errorInvalidCode'));
    }
  };

  const handleCancel2FA = () => {
    cancel2FA();
    setTwoFACode('');
    setTwoFAError(null);
    setUseBackupCode(false);
  };

  const toggleBackupCode = () => {
    setUseBackupCode(!useBackupCode);
    setTwoFACode('');
    setTwoFAError(null);
  };

  // 🔐 Google Login Handler (reçoit credentialResponse avec id_token)
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      // GoogleLogin retourne { credential: "eyJ..." } qui est l'ID token
      const result = await loginWithGoogle(credentialResponse.credential);
      
      if (result.success) {
        trackLogin('google');
        showToast(t('auth.login.success'), 'success');
        setTimeout(() => {
          // 📱 Détecter si mobile PWA pour ouvrir sidebar après redirection
          const isMobilePWA = window.innerWidth < 768 && window.matchMedia('(display-mode: standalone)').matches;
          if (result.isNewUser) {
            // Nouvel utilisateur: Onboarding
            window.location.href = '/onboarding';
          } else if (isMobilePWA) {
            // Mobile PWA: Dashboard avec sidebar ouvert
            window.location.href = '/dashboard?openSidebar=true';
          } else {
            window.location.href = '/dashboard';
          }
        }, 1000);
      } else {
        showToast(result.error || 'Erreur de connexion Google', 'error');
      }
    } catch (error) {
      console.error('Erreur Google login:', error);
      showToast('Erreur de connexion Google', 'error');
    }
    setLoading(false);
  };

  const handleGoogleError = () => {
    showToast('Erreur de connexion Google', 'error');
  };

  // 🔐 Écran 2FA
  if (requires2FA) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #040449 0%, #100261 50%, #040449 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '6px',
              marginBottom: '15px'
            }}>
              <span style={{ 
                color: 'white', 
                fontSize: '2.8em', 
                fontWeight: 'bold',
                letterSpacing: '2px'
              }}>
                PL4T
              </span>
              <AnimatedO size={55} />
            </div>
          </div>

          {/* Card 2FA */}
          <div style={{
            background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
            borderRadius: '20px',
            padding: '35px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <div style={{ 
                fontSize: '3em', 
                marginBottom: '15px',
                animation: 'pulse 2s infinite'
              }}>
                🔐
              </div>
              <h2 style={{ 
                color: 'white', 
                margin: '0 0 10px',
                fontSize: '1.5em'
              }}>
                {t('auth.twoFA.title')}
              </h2>
              <p style={{ 
                color: 'rgba(255,255,255,0.7)', 
                margin: 0,
                fontSize: '0.95em'
              }}>
                {useBackupCode 
                  ? t('auth.twoFA.enterBackupCode')
                  : t('auth.twoFA.enterCode')
                }
              </p>
              <p style={{ 
                color: 'rgba(255,255,255,0.5)', 
                margin: '8px 0 0',
                fontSize: '0.85em'
              }}>
                {pending2FAEmail}
              </p>
            </div>

            {/* Erreur */}
            {twoFAError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                <p style={{ color: '#ef4444', margin: 0, fontSize: '0.9em' }}>
                  ❌ {twoFAError}
                </p>
              </div>
            )}

            {/* Formulaire */}
            <form onSubmit={handleValidate2FA}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: 'rgba(255,255,255,0.9)'
                }}>
                  {useBackupCode ? '🔑' : '🔢'} {useBackupCode ? t('auth.twoFA.backupCodeLabel') : t('auth.twoFA.codeLabel')}
                </label>
                <input
                  type="text"
                  value={twoFACode}
                  onChange={handle2FACodeChange}
                  placeholder={useBackupCode ? '12345678' : '000000'}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '12px',
                    border: twoFAError ? '2px solid #ef4444' : '2px solid rgba(255,255,255,0.2)',
                    fontSize: '1.5em',
                    textAlign: 'center',
                    letterSpacing: '8px',
                    fontWeight: 'bold',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'white',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = twoFAError ? '#ef4444' : 'rgba(255,255,255,0.2)'}
                />
              </div>

              {/* Toggle backup code */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <button
                  type="button"
                  onClick={toggleBackupCode}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#667eea',
                    cursor: 'pointer',
                    fontSize: '0.9em',
                    textDecoration: 'underline'
                  }}
                >
                  {useBackupCode 
                    ? t('auth.twoFA.useAuthenticator')
                    : t('auth.twoFA.useBackupCode')
                  }
                </button>
              </div>

              {/* Bouton Valider */}
              <button
                type="submit"
                disabled={twoFALoading || twoFACode.length < (useBackupCode ? 8 : 6)}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: twoFALoading || twoFACode.length < (useBackupCode ? 8 : 6)
                    ? 'rgba(102, 126, 234, 0.3)'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1.1em',
                  fontWeight: 'bold',
                  cursor: twoFALoading || twoFACode.length < (useBackupCode ? 8 : 6) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: twoFACode.length >= (useBackupCode ? 8 : 6) ? '0 4px 15px rgba(102, 126, 234, 0.4)' : 'none',
                  marginBottom: '15px'
                }}
              >
                {twoFALoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{
                      width: '18px',
                      height: '18px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      display: 'inline-block'
                    }} />
                    {t('auth.twoFA.verifying')}
                  </span>
                ) : (
                  `✓ ${t('auth.twoFA.verify')}`
                )}
              </button>

              {/* Bouton Annuler */}
              <button
                type="button"
                onClick={handleCancel2FA}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.7)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  fontSize: '1em',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                }}
              >
                ← {t('auth.twoFA.cancel')}
              </button>
            </form>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={hideToast}
          />
        )}

        {/* Animations */}
        <style>{`
          @keyframes gps-ring-spin {
            0% { transform: rotate(0deg); box-shadow: 0 0 20px rgba(255, 165, 0, 0.5); }
            50% { box-shadow: 0 0 35px rgba(255, 165, 0, 0.8), 0 0 50px rgba(255, 69, 0, 0.4); }
            100% { transform: rotate(360deg); box-shadow: 0 0 20px rgba(255, 165, 0, 0.5); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Écran de login normal
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #040449 0%, #100261 50%, #040449 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo PL4TO agrandi */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '6px',
            marginBottom: '15px'
          }}>
            <span style={{ 
              color: 'white', 
              fontSize: '2.8em', 
              fontWeight: 'bold',
              letterSpacing: '2px'
            }}>
              PL4T
            </span>
            <AnimatedO size={55} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.1em' }}>
            {t('auth.login.subtitle')}
          </p>
        </div>

        {/* Card Login - Dark Theme */}
        <div style={{
          background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '20px',
          padding: '35px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {/* Message d'erreur de connexion dans la card */}
          {loginError && (
            <div style={{
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
              border: '2px solid #f87171',
              borderRadius: '12px',
              padding: '15px 20px',
              marginBottom: '20px',
              textAlign: 'center',
              animation: 'shake 0.5s ease-in-out'
            }}>
              <p style={{
                color: '#dc2626',
                fontWeight: '600',
                fontSize: '0.95em',
                margin: '0 0 10px 0'
              }}>
                🚫 {t('auth.login.error')}
              </p>
              <Link 
                to="/forgot-password"
                style={{
                  color: '#667eea',
                  fontSize: '0.9em',
                  textDecoration: 'none',
                  fontWeight: '600'
                }}
              >
                🗝️ {t('auth.login.forgotPassword')}
              </Link>
            </div>
          )}

          {/* Google Login Button - Composant officiel */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="filled_black"
              size="large"
              text="signin_with"
              shape="rectangular"
              width="100%"
            />
          </div>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '25px 0',
            gap: '15px'
          }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.2)' }} />
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9em' }}>{t('common.or')}</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.2)' }} />
          </div>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.9)'
              }}>
                📧 {t('auth.login.email')}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t('auth.login.emailPlaceholder')}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: errors.email || loginError ? '2px solid #f56565' : '2px solid rgba(255,255,255,0.2)',
                  fontSize: '1em',
                  transition: 'all 0.3s',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'white'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = (errors.email || loginError) ? '#f56565' : 'rgba(255,255,255,0.2)'}
              />
              {errors.email && (
                <p style={{ color: '#f56565', fontSize: '0.85em', marginTop: '5px' }}>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.9)'
              }}>
                🔐 {t('auth.login.password')}
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={t('auth.login.passwordPlaceholder')}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: errors.password || loginError ? '2px solid #f56565' : '2px solid rgba(255,255,255,0.2)',
                  fontSize: '1em',
                  transition: 'all 0.3s',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'white'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = (errors.password || loginError) ? '#f56565' : 'rgba(255,255,255,0.2)'}
              />
              {errors.password && (
                <p style={{ color: '#f56565', fontSize: '0.85em', marginTop: '5px' }}>
                  {errors.password}
                </p>
              )}
            </div>

            {/* Forgot Password */}
            {!loginError && (
              <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                <Link 
                  to="/forgot-password"
                  style={{
                    color: '#667eea',
                    fontSize: '0.9em',
                    textDecoration: 'none'
                  }}
                >
                  🗝️ {t('auth.login.forgotPassword')}
                </Link>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                marginTop: loginError ? '25px' : '0',
                background: loading 
                  ? '#a0aec0' 
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1.1em',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
            >
              {loading ? `🔄 ${t('auth.login.submitting')}` : `🧭 ${t('auth.login.submit')}`}
            </button>
          </form>

          {/* Register Link */}
          <div style={{
            marginTop: '25px',
            textAlign: 'center',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>{t('auth.login.noAccount')} </span>
            <Link 
              to="/register"
              style={{
                color: '#667eea',
                fontWeight: '600',
                textDecoration: 'none'
              }}
            >
              {t('auth.login.register')}
            </Link>
          </div>
        </div>

        {/* Back Link */}
        <div style={{ textAlign: 'center', marginTop: '25px' }}>
          <Link 
            to="/"
            style={{
              color: 'rgba(255,255,255,0.8)',
              textDecoration: 'none',
              fontSize: '0.95em'
            }}
          >
            ← {t('auth.login.backToHome')}
          </Link>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}

      {/* Animation CSS */}
      <style>{`
        @keyframes gps-ring-spin {
          0% { transform: rotate(0deg); box-shadow: 0 0 20px rgba(255, 165, 0, 0.5); }
          50% { box-shadow: 0 0 35px rgba(255, 165, 0, 0.8), 0 0 50px rgba(255, 69, 0, 0.4); }
          100% { transform: rotate(360deg); box-shadow: 0 0 20px rgba(255, 165, 0, 0.5); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
};

export default Login;
