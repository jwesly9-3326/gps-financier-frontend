// 🧭 PL4TO - PAGE MOT DE PASSE OUBLIÉ
// Permet à l'utilisateur de demander un email de réinitialisation
// 🌍 i18n enabled

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/common/Toast';
import { useToast } from '../../hooks';

const ForgotPassword = () => {
  const { t } = useTranslation();
  const { forgotPassword } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

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
        background: 'linear-gradient(#040449, #100261) padding-box, linear-gradient(180deg, #ffd700, #ff8c00, #ff4500, #ffd700) border-box',
        animation: 'gps-ring-spin 3s linear infinite',
        boxShadow: '0 0 25px rgba(255, 165, 0, 0.5)'
      }} />
    </div>
  );

  const validateEmail = () => {
    if (!email) {
      setError(t('auth.errors.emailRequired'));
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError(t('auth.errors.emailInvalid'));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateEmail()) return;

    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);

    if (result.success) {
      setEmailSent(true);
      showToast(t('auth.forgotPassword.emailSent', 'Email envoyé! 📧'), 'success');
    } else {
      setError(result.error);
    }
  };

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
        {/* Logo PL4TO */}
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
            {t('auth.forgotPassword.subtitle', 'Réinitialise ton mot de passe')}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '20px',
          padding: '35px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(102, 126, 234, 0.15)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {emailSent ? (
            // ✅ Email envoyé - Confirmation
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '4em', 
                marginBottom: '20px',
                animation: 'bounce 1s ease infinite'
              }}>
                📧
              </div>
              <h2 style={{ 
                color: 'white', 
                fontSize: '1.5em', 
                marginBottom: '15px' 
              }}>
                {t('auth.forgotPassword.checkEmail', 'Vérifie ta boîte mail!')}
              </h2>
              <p style={{ 
                color: 'rgba(255,255,255,0.7)', 
                marginBottom: '25px',
                lineHeight: '1.6'
              }}>
                {t('auth.forgotPassword.instructions', 'Si un compte existe avec cet email, tu recevras un lien pour réinitialiser ton mot de passe.')}
              </p>
              <p style={{ 
                color: 'rgba(255,255,255,0.5)', 
                fontSize: '0.9em',
                marginBottom: '25px'
              }}>
                📬 {email}
              </p>
              
              {/* Renvoyer l'email */}
              <button
                onClick={() => {
                  setEmailSent(false);
                }}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  color: 'rgba(255,255,255,0.8)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '20px',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }}
              >
                🔄 {t('auth.forgotPassword.resend', 'Renvoyer l\'email')}
              </button>

              <div style={{ marginTop: '20px' }}>
                <Link 
                  to="/login"
                  style={{
                    color: '#667eea',
                    textDecoration: 'none',
                    fontWeight: '600'
                  }}
                >
                  ← {t('auth.forgotPassword.backToLogin', 'Retour à la connexion')}
                </Link>
              </div>
            </div>
          ) : (
            // 📧 Formulaire de demande
            <>
              <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                <div style={{ fontSize: '3em', marginBottom: '10px' }}>🔑</div>
                <h2 style={{ 
                  color: 'white', 
                  fontSize: '1.4em', 
                  marginBottom: '10px' 
                }}>
                  {t('auth.forgotPassword.title', 'Mot de passe oublié?')}
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95em' }}>
                  {t('auth.forgotPassword.description', 'Entre ton email et nous t\'enverrons un lien pour réinitialiser ton mot de passe.')}
                </p>
              </div>

              {/* Erreur */}
              {error && (
                <div style={{
                  background: 'rgba(248, 113, 113, 0.15)',
                  border: '2px solid rgba(248, 113, 113, 0.5)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                  color: '#f87171',
                  textAlign: 'center',
                  fontSize: '0.95em'
                }}>
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Email */}
                <div style={{ marginBottom: '25px' }}>
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
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    placeholder={t('auth.login.emailPlaceholder')}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: error ? '2px solid #f87171' : '2px solid rgba(255,255,255,0.2)',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'white',
                      fontSize: '1em',
                      transition: 'all 0.3s',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = error ? '#f87171' : 'rgba(255,255,255,0.2)'}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: loading 
                      ? 'rgba(255,255,255,0.2)' 
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
                  {loading ? '🔄 Envoi en cours...' : `📧 ${t('auth.forgotPassword.submit', 'Envoyer le lien')}`}
                </button>
              </form>

              {/* Back to login */}
              <div style={{
                marginTop: '25px',
                textAlign: 'center',
                paddingTop: '20px',
                borderTop: '1px solid rgba(255,255,255,0.1)'
              }}>
                <Link 
                  to="/login"
                  style={{
                    color: '#667eea',
                    fontWeight: '600',
                    textDecoration: 'none'
                  }}
                >
                  ← {t('auth.forgotPassword.backToLogin', 'Retour à la connexion')}
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Back to Home */}
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
          0% {
            transform: rotate(0deg);
            box-shadow: 0 0 20px rgba(255, 165, 0, 0.5);
          }
          50% {
            box-shadow: 0 0 35px rgba(255, 165, 0, 0.8), 0 0 50px rgba(255, 69, 0, 0.4);
          }
          100% {
            transform: rotate(360deg);
            box-shadow: 0 0 20px rgba(255, 165, 0, 0.5);
          }
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
};

export default ForgotPassword;
