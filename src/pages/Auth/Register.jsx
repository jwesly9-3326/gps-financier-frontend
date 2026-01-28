// 🧭 PL4TO - PAGE REGISTER
// Design avec branding Pl4to
// 🌍 i18n enabled
// ✨ Améliorations post-test Marie-Claude
// 🔄 Intégré comme Step 1 de l'onboarding (Profile)
// 🔐 Google OAuth

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { useUserData } from '../../context/UserDataContext';
import { useToast } from '../../hooks';
import Toast from '../../components/common/Toast';
import { trackSignUp } from '../../services/analytics.service';

const Register = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register, loginWithGoogle } = useAuth();
  const { resetUserData } = useUserData();
  const { toast, showToast, hideToast } = useToast();

  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.prenom) newErrors.prenom = t('errors.required');
    if (!formData.nom) newErrors.nom = t('errors.required');
    if (!formData.email) {
      newErrors.email = t('auth.errors.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('auth.errors.emailInvalid');
    }
    if (!formData.password) {
      newErrors.password = t('auth.errors.passwordRequired');
    } else if (formData.password.length < 8) {
      newErrors.password = t('auth.errors.passwordMin');
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.errors.passwordMismatch');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const result = await register({
      prenom: formData.prenom,
      nom: formData.nom,
      email: formData.email,
      password: formData.password,
    });
    setLoading(false);

    if (result.success) {
      // 📊 Analytics
      trackSignUp('email');
      // 🔧 FIX: Reset complet des données financières (mémoire + localStorage)
      resetUserData();
      
      // 📧 Vérification email requise?
      if (result.requiresVerification) {
        showToast('📧 Vérifie ton email pour activer ton compte!', 'success');
        setTimeout(() => {
          navigate('/verify-email', { state: { email: result.email } });
        }, 1500);
        return;
      }
      
      // Note: authService.register() appelle déjà clearUserData() qui nettoie:
      // - pl4to-onboarding, pl4to-onboarding-step
      // - pl4to_subscription_*, pl4to_trial_*
      // - pl4to-guide-* (8 pages)
      
      showToast(t('auth.register.success'), 'success');
      setTimeout(() => {
        navigate('/onboarding');
      }, 1500);
    } else {
      showToast('🚫 ' + result.error, 'error');
    }
  };

  // 🔐 Google Sign-In Handler (reçoit credentialResponse avec id_token)
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      // Reset les données pour nouvel utilisateur
      resetUserData();
      
      // GoogleLogin retourne { credential: "eyJ..." } qui est l'ID token
      const result = await loginWithGoogle(credentialResponse.credential);
      
      if (result.success) {
        showToast(t('auth.register.success'), 'success');
        setTimeout(() => {
          // Toujours rediriger vers onboarding pour les inscriptions Google
          navigate('/onboarding');
        }, 1000);
      } else {
        showToast(result.error || 'Erreur de connexion Google', 'error');
      }
    } catch (error) {
      console.error('Erreur Google sign-in:', error);
      showToast('Erreur de connexion Google', 'error');
    }
    setLoading(false);
  };

  const handleGoogleError = () => {
    showToast('Erreur de connexion Google', 'error');
  };

  // Note: GoogleLogin component est utilisé directement dans le JSX

  // Style input réutilisable
  const inputStyle = (hasError) => ({
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: hasError ? '2px solid #f56565' : '2px solid #e2e8f0',
    fontSize: '0.95em',
    transition: 'all 0.3s',
    outline: 'none',
    boxSizing: 'border-box'
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #040449 0%, #100261 50%, #040449 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      transition: 'background 1s ease'
    }}>
      <div style={{ width: '100%', maxWidth: '450px' }}>
        {/* Logo PL4TO agrandi */}
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '6px',
            marginBottom: '12px'
          }}>
            <span style={{ 
              color: 'white', 
              fontSize: '2.8em', 
              fontWeight: 'bold',
              letterSpacing: '2px'
            }}>
              PL4T
            </span>
            <div style={{
              position: 'relative',
              width: '55px',
              height: '55px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                position: 'absolute',
                width: '55px',
                height: '55px',
                borderRadius: '50%',
                border: '4px solid transparent',
                background: 'linear-gradient(#040449, #040449) padding-box, linear-gradient(180deg, #ffd700, #ffb800, #ffa500, #ffd700) border-box',
                animation: 'gps-ring-spin 3s linear infinite',
                boxShadow: '0 0 25px rgba(255, 165, 0, 0.5)'
              }} />
            </div>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1em' }}>
            {t('auth.register.subtitle')}
          </p>
        </div>

        {/* Card Register */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '30px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          {/* Bouton Google SSO - Composant officiel */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              size="large"
              text="signup_with"
              shape="rectangular"
              width="100%"
            />
          </div>

          {/* Divider "ou" */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '20px 0',
            gap: '15px'
          }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span style={{ color: '#a0aec0', fontSize: '0.9em' }}>{t('auth.register.orDivider')}</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          <form onSubmit={handleSubmit}>
            {/* Row: Prénom + Nom */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#2d3748', fontSize: '0.9em' }}>
                  👤 {t('auth.register.firstName')}
                </label>
                <input
                  type="text"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleChange}
                  placeholder={t('auth.register.firstName')}
                  style={inputStyle(errors.prenom)}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = errors.prenom ? '#f56565' : '#e2e8f0'}
                />
                {errors.prenom && <p style={{ color: '#f56565', fontSize: '0.8em', marginTop: '4px' }}>{errors.prenom}</p>}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#2d3748', fontSize: '0.9em' }}>
                  👤 {t('auth.register.lastName')}
                </label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  placeholder={t('auth.register.lastName')}
                  style={inputStyle(errors.nom)}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = errors.nom ? '#f56565' : '#e2e8f0'}
                />
                {errors.nom && <p style={{ color: '#f56565', fontSize: '0.8em', marginTop: '4px' }}>{errors.nom}</p>}
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#2d3748', fontSize: '0.9em' }}>
                📧 {t('auth.register.email')}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t('auth.login.emailPlaceholder')}
                style={inputStyle(errors.email)}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = errors.email ? '#f56565' : '#e2e8f0'}
              />
              {errors.email && <p style={{ color: '#f56565', fontSize: '0.8em', marginTop: '4px' }}>{errors.email}</p>}
            </div>

            {/* Password */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#2d3748', fontSize: '0.9em' }}>
                🔐 {t('auth.register.password')}
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                style={inputStyle(errors.password)}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = errors.password ? '#f56565' : '#e2e8f0'}
              />
              {errors.password && <p style={{ color: '#f56565', fontSize: '0.8em', marginTop: '4px' }}>{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#2d3748', fontSize: '0.9em' }}>
                🔄 {t('auth.register.confirmPassword')}
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                style={inputStyle(errors.confirmPassword)}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = errors.confirmPassword ? '#f56565' : '#e2e8f0'}
              />
              {errors.confirmPassword && <p style={{ color: '#f56565', fontSize: '0.8em', marginTop: '4px' }}>{errors.confirmPassword}</p>}
            </div>

            {/* 🔒 Mot de passe chiffré */}
            <p style={{
              color: '#718096',
              fontSize: '0.8em',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              {t('auth.register.encryptedPassword')}
            </p>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: loading 
                  ? '#a0aec0' 
                  : 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1.05em',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 15px rgba(255, 152, 0, 0.4)'
              }}
            >
              {loading ? `🔄 ${t('auth.register.submitting')}` : `👤 ${t('auth.register.submit')}`}
            </button>

            {/* Ligne "Gratuit • Sans carte de crédit..." */}
            <p style={{
              color: '#48bb78',
              fontSize: '0.85em',
              marginTop: '12px',
              textAlign: 'center',
              fontWeight: '500'
            }}>
              ✨ {t('auth.register.freeNotice')}
            </p>
          </form>

          {/* Login Link */}
          <div style={{
            marginTop: '20px',
            textAlign: 'center',
            paddingTop: '15px',
            borderTop: '1px solid #e2e8f0'
          }}>
            <span style={{ color: '#718096', fontSize: '0.95em' }}>{t('auth.register.hasAccount')} </span>
            <Link 
              to="/login"
              style={{
                color: '#667eea',
                fontWeight: '600',
                textDecoration: 'none'
              }}
            >
              {t('auth.register.login')} <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '18px',
              height: '18px',
              verticalAlign: 'middle',
              marginLeft: '6px'
            }}><span style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              border: '3px solid transparent',
              background: 'linear-gradient(white, white) padding-box, linear-gradient(180deg, #ffd700, #ffb800, #ffa500, #ffd700) border-box',
              animation: 'gps-ring-spin 3s linear infinite',
              boxShadow: '0 0 12px rgba(255, 165, 0, 0.6)',
              display: 'inline-block'
            }} /></span>
            </Link>
          </div>
        </div>

        {/* Back Link */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
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
      `}</style>
    </div>
  );
};

export default Register;
