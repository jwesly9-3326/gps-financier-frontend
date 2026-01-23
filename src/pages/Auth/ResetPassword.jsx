// 🧭 PL4TO - PAGE RÉINITIALISATION MOT DE PASSE
// Permet à l'utilisateur de définir un nouveau mot de passe via le token reçu par email
// 🌍 i18n enabled

import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/common/Toast';
import { useToast } from '../../hooks';

const ResetPassword = () => {
  const { t } = useTranslation();
  const { resetPassword } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  // Récupérer le token depuis l'URL
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setTokenError(true);
    }
  }, [token]);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.password) {
      newErrors.password = t('auth.errors.passwordRequired');
    } else if (formData.password.length < 6) {
      newErrors.password = t('auth.errors.passwordMin');
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.resetPassword.confirmRequired', 'Confirme ton mot de passe');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.resetPassword.passwordMismatch', 'Les mots de passe ne correspondent pas');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    setLoading(true);
    const result = await resetPassword(token, formData.password);
    setLoading(false);

    if (result.success) {
      setResetSuccess(true);
      showToast(t('auth.resetPassword.success', 'Mot de passe réinitialisé! 🎉'), 'success');
    } else {
      if (result.tokenExpired) {
        setTokenError(true);
      } else {
        setErrors({ general: result.error });
      }
    }
  };

  // Token invalide ou expiré
  if (tokenError) {
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
          </div>

          {/* Card Erreur */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            borderRadius: '20px',
            padding: '35px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '4em', marginBottom: '20px' }}>⏰</div>
            <h2 style={{ color: 'white', fontSize: '1.4em', marginBottom: '15px' }}>
              {t('auth.resetPassword.linkExpired', 'Lien expiré ou invalide')}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '25px', lineHeight: '1.6' }}>
              {t('auth.resetPassword.linkExpiredDesc', 'Ce lien de réinitialisation a expiré ou est invalide. Demande un nouveau lien.')}
            </p>
            
            <Link 
              to="/forgot-password"
              style={{
                display: 'inline-block',
                padding: '14px 28px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: 'bold',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
            >
              🔑 {t('auth.resetPassword.requestNew', 'Demander un nouveau lien')}
            </Link>

            <div style={{ marginTop: '25px' }}>
              <Link 
                to="/login"
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  textDecoration: 'none'
                }}
              >
                ← {t('auth.forgotPassword.backToLogin', 'Retour à la connexion')}
              </Link>
            </div>
          </div>

          {/* Animation CSS */}
          <style>{`
            @keyframes gps-ring-spin {
              0% { transform: rotate(0deg); box-shadow: 0 0 20px rgba(255, 165, 0, 0.5); }
              50% { box-shadow: 0 0 35px rgba(255, 165, 0, 0.8), 0 0 50px rgba(255, 69, 0, 0.4); }
              100% { transform: rotate(360deg); box-shadow: 0 0 20px rgba(255, 165, 0, 0.5); }
            }
          `}</style>
        </div>
      </div>
    );
  }

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
            {t('auth.resetPassword.subtitle', 'Crée ton nouveau mot de passe')}
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
          {resetSuccess ? (
            // ✅ Réinitialisation réussie
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '4em', 
                marginBottom: '20px',
                animation: 'bounce 1s ease infinite'
              }}>
                🎉
              </div>
              <h2 style={{ 
                color: 'white', 
                fontSize: '1.5em', 
                marginBottom: '15px' 
              }}>
                {t('auth.resetPassword.successTitle', 'Mot de passe réinitialisé!')}
              </h2>
              <p style={{ 
                color: 'rgba(255,255,255,0.7)', 
                marginBottom: '25px',
                lineHeight: '1.6'
              }}>
                {t('auth.resetPassword.successDesc', 'Tu peux maintenant te connecter avec ton nouveau mot de passe.')}
              </p>
              
              <Link 
                to="/login"
                style={{
                  display: 'inline-block',
                  padding: '14px 28px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                }}
              >
                🧭 {t('auth.resetPassword.goToLogin', 'Se connecter')}
              </Link>
            </div>
          ) : (
            // 🔐 Formulaire de nouveau mot de passe
            <>
              <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                <div style={{ fontSize: '3em', marginBottom: '10px' }}>🔐</div>
                <h2 style={{ 
                  color: 'white', 
                  fontSize: '1.4em', 
                  marginBottom: '10px' 
                }}>
                  {t('auth.resetPassword.title', 'Nouveau mot de passe')}
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95em' }}>
                  {t('auth.resetPassword.description', 'Entre ton nouveau mot de passe (minimum 6 caractères).')}
                </p>
              </div>

              {/* Erreur générale */}
              {errors.general && (
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
                  ⚠️ {errors.general}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Nouveau mot de passe */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: 'rgba(255,255,255,0.9)'
                  }}>
                    🔐 {t('auth.resetPassword.newPassword', 'Nouveau mot de passe')}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: errors.password ? '2px solid #f87171' : '2px solid rgba(255,255,255,0.2)',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'white',
                      fontSize: '1em',
                      transition: 'all 0.3s',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = errors.password ? '#f87171' : 'rgba(255,255,255,0.2)'}
                  />
                  {errors.password && (
                    <p style={{ color: '#f87171', fontSize: '0.85em', marginTop: '5px' }}>
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Confirmer mot de passe */}
                <div style={{ marginBottom: '25px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: 'rgba(255,255,255,0.9)'
                  }}>
                    🔒 {t('auth.resetPassword.confirmPassword', 'Confirme le mot de passe')}
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: errors.confirmPassword ? '2px solid #f87171' : '2px solid rgba(255,255,255,0.2)',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'white',
                      fontSize: '1em',
                      transition: 'all 0.3s',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = errors.confirmPassword ? '#f87171' : 'rgba(255,255,255,0.2)'}
                  />
                  {errors.confirmPassword && (
                    <p style={{ color: '#f87171', fontSize: '0.85em', marginTop: '5px' }}>
                      {errors.confirmPassword}
                    </p>
                  )}
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
                  {loading ? '🔄 Réinitialisation...' : `✅ ${t('auth.resetPassword.submit', 'Réinitialiser')}`}
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

export default ResetPassword;
