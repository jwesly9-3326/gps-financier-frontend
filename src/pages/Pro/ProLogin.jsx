// 🔐 PL4TO PRO - Connexion Cabinet
// Route: /pro/login
// Auth séparée: Identifiant unique (généré par admin PL4TO) + mot de passe
// 🌍 i18n enabled | 🎨 Theme support

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

const ProLogin = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const [identifiant, setIdentifiant] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const colors = {
    pageBg: isDark 
      ? 'linear-gradient(180deg, #040449 0%, #0a0a2e 50%, #040449 100%)'
      : 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)',
    ringBg: isDark ? '#040449' : '#f8fafc',
    textPrimary: isDark ? 'white' : '#1e293b',
    textSecondary: isDark ? 'rgba(255,255,255,0.9)' : '#334155',
    textMuted: isDark ? 'rgba(255,255,255,0.7)' : '#64748b',
    textSubtle: isDark ? 'rgba(255,255,255,0.5)' : '#94a3b8',
    cardBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)',
    cardBorder: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
    inputBg: isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc',
    inputBorder: isDark ? 'rgba(255,255,255,0.2)' : '#d1d5db',
    inputFocus: '#667eea',
    gridColor: isDark ? 'rgba(99, 102, 241, 0.04)' : 'rgba(99, 102, 241, 0.08)',
    starsOpacity: isDark ? 0.6 : 0
  };

  // Composant O animé
  const AnimatedO = ({ size = 45 }) => (
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
        background: `linear-gradient(${colors.ringBg}, ${colors.ringBg}) padding-box, linear-gradient(180deg, #ffd700, #ffb800, #ffa500, #ffd700) border-box`,
        animation: 'gps-ring-spin 3s linear infinite',
        boxShadow: '0 0 20px rgba(255, 165, 0, 0.6)'
      }} />
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!identifiant.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // TODO: Appel API /api/enterprise/login
      // Pour l'instant, afficher un message
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/enterprise/public/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiant: identifiant.trim(), password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Identifiants invalides');
      }
      
      // Stocker le token Enterprise et rediriger
      localStorage.setItem('pl4to-enterprise-token', data.token);
      localStorage.setItem('pl4to-enterprise-org', JSON.stringify(data.organization));
      
      // TODO: Rediriger vers le dashboard Enterprise
      // navigate('/pro/dashboard');
      alert('Connexion réussie! Le dashboard Enterprise sera disponible bientôt.');
      
    } catch (err) {
      console.error('[ProLogin] Erreur:', err);
      setError(err.message || 'Erreur de connexion. Vérifiez vos identifiants.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.pageBg,
      transition: 'background 0.5s ease',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Étoiles */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: `radial-gradient(2px 2px at 20px 30px, rgba(255,255,255,0.15), transparent),
                          radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.1), transparent)`,
        backgroundSize: '200px 200px',
        opacity: colors.starsOpacity,
        pointerEvents: 'none'
      }} />
      
      {/* Grille */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: `
          linear-gradient(${colors.gridColor} 1px, transparent 1px),
          linear-gradient(90deg, ${colors.gridColor} 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        opacity: 0.6,
        pointerEvents: 'none'
      }} />

      {/* Carte de connexion */}
      <div style={{
        background: colors.cardBg,
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: isMobile ? '35px 25px' : '50px 45px',
        width: '100%',
        maxWidth: '440px',
        margin: '0 20px',
        border: `1px solid ${colors.cardBorder}`,
        boxShadow: isDark 
          ? '0 20px 60px rgba(0,0,0,0.4)' 
          : '0 20px 60px rgba(0,0,0,0.08)',
        position: 'relative',
        zIndex: 5
      }}>
        {/* Logo */}
        <div style={{
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <div 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              cursor: 'pointer',
              marginBottom: '8px'
            }}
            onClick={() => navigate('/pro')}
          >
            <span style={{ 
              color: colors.textPrimary, 
              fontSize: '2em', 
              fontWeight: 'bold',
              letterSpacing: '2px'
            }}>
              PL4T
            </span>
            <AnimatedO size={40} />
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '3px 10px',
              borderRadius: '6px',
              fontSize: '0.6em',
              fontWeight: 'bold',
              letterSpacing: '1px',
              marginLeft: '6px'
            }}>
              PRO
            </div>
          </div>
          
          <h1 style={{
            color: colors.textPrimary,
            fontSize: '1.5em',
            fontWeight: 'bold',
            marginBottom: '6px'
          }}>
            Connexion Cabinet
          </h1>
          <p style={{
            color: colors.textMuted,
            fontSize: '0.95em'
          }}>
            Accédez à votre portail professionnel
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit}>
          {/* Identifiant unique */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: colors.textSecondary,
              fontSize: '0.9em',
              fontWeight: '600',
              marginBottom: '8px'
            }}>
              🔑 Identifiant du cabinet
            </label>
            <input
              type="text"
              value={identifiant}
              onChange={(e) => { setIdentifiant(e.target.value); setError(''); }}
              placeholder="PLT-XXXX-XXXX"
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '12px',
                border: `2px solid ${error ? '#ef4444' : colors.inputBorder}`,
                background: colors.inputBg,
                color: colors.textPrimary,
                fontSize: '1.05em',
                fontFamily: 'monospace',
                letterSpacing: '1px',
                outline: 'none',
                transition: 'border-color 0.3s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = colors.inputFocus}
              onBlur={(e) => e.target.style.borderColor = error ? '#ef4444' : colors.inputBorder}
              autoComplete="off"
            />
            <p style={{
              color: colors.textSubtle,
              fontSize: '0.8em',
              marginTop: '5px'
            }}>
              Fourni par l'administration PL4TO
            </p>
          </div>

          {/* Mot de passe */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              color: colors.textSecondary,
              fontSize: '0.9em',
              fontWeight: '600',
              marginBottom: '8px'
            }}>
              🔒 Mot de passe
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '14px 50px 14px 16px',
                  borderRadius: '12px',
                  border: `2px solid ${error ? '#ef4444' : colors.inputBorder}`,
                  background: colors.inputBg,
                  color: colors.textPrimary,
                  fontSize: '1.05em',
                  outline: 'none',
                  transition: 'border-color 0.3s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = colors.inputFocus}
                onBlur={(e) => e.target.style.borderColor = error ? '#ef4444' : colors.inputBorder}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.2em',
                  padding: '5px'
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div style={{
              background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '20px',
              color: '#ef4444',
              fontSize: '0.9em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Bouton Connexion */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              background: isLoading 
                ? (isDark ? 'rgba(255,255,255,0.2)' : '#d1d5db')
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontSize: '1.1em',
              fontWeight: 'bold',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              boxShadow: isLoading ? 'none' : '0 6px 20px rgba(102, 126, 234, 0.3)'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = isLoading ? 'none' : '0 6px 20px rgba(102, 126, 234, 0.3)';
            }}
          >
            {isLoading ? '⏳ Connexion en cours...' : '🔐 Se connecter'}
          </button>
        </form>

        {/* Liens */}
        <div style={{
          textAlign: 'center',
          marginTop: '25px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <button
            onClick={() => navigate('/pro/demande')}
            style={{
              background: 'none',
              border: 'none',
              color: '#667eea',
              cursor: 'pointer',
              fontSize: '0.9em',
              fontWeight: '600'
            }}
          >
            Pas encore de portail? Faire une demande →
          </button>
          <button
            onClick={() => navigate('/pro')}
            style={{
              background: 'none',
              border: 'none',
              color: colors.textSubtle,
              cursor: 'pointer',
              fontSize: '0.85em'
            }}
          >
            ← Retour à PL4TO Pro
          </button>
        </div>
      </div>

      {/* CSS */}
      <style>{`
        @keyframes gps-ring-spin {
          0% { transform: rotate(0deg); box-shadow: 0 0 20px rgba(255, 165, 0, 0.6); }
          50% { box-shadow: 0 0 35px rgba(255, 165, 0, 0.9), 0 0 50px rgba(255, 69, 0, 0.5); }
          100% { transform: rotate(360deg); box-shadow: 0 0 20px rgba(255, 165, 0, 0.6); }
        }
      `}</style>
    </div>
  );
};

export default ProLogin;
