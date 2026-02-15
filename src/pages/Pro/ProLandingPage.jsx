// 🏢 PL4TO PRO - Landing Page Conseillers / Cabinets
// Route: /pro
// Deux CTAs: Demander un portail + Connexion Cabinet
// 🌍 i18n enabled | 🎨 Theme support

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

const ProLandingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setIsPWA(window.matchMedia('(display-mode: standalone)').matches);
  }, []);

  // 🎨 Couleurs selon le thème
  const colors = {
    pageBg: isDark 
      ? 'linear-gradient(180deg, #040449 0%, #0a0a2e 50%, #040449 100%)'
      : 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)',
    ringBg: isDark ? '#040449' : '#f8fafc',
    textPrimary: isDark ? 'white' : '#1e293b',
    textSecondary: isDark ? 'rgba(255,255,255,0.9)' : '#334155',
    textMuted: isDark ? 'rgba(255,255,255,0.7)' : '#64748b',
    textSubtle: isDark ? 'rgba(255,255,255,0.5)' : '#94a3b8',
    cardBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
    cardBorder: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
    btnSecondaryBg: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)',
    btnSecondaryBorder: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
    btnSecondaryText: isDark ? 'white' : '#1e293b',
    gridColor: isDark ? 'rgba(99, 102, 241, 0.04)' : 'rgba(99, 102, 241, 0.08)',
    starsOpacity: isDark ? 0.6 : 0,
    footerOverlay: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)'
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

  // Features pour conseillers
  const features = [
    {
      icon: '🧭',
      title: t('proLanding.feature1Title'),
      description: t('proLanding.feature1Desc')
    },
    {
      icon: '👥',
      title: t('proLanding.feature2Title'),
      description: t('proLanding.feature2Desc')
    },
    {
      icon: '🔒',
      title: t('proLanding.feature3Title'),
      description: t('proLanding.feature3Desc')
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.pageBg,
      transition: 'background 0.5s ease',
      overflowX: 'hidden',
      position: 'relative'
    }}>
      {/* Étoiles de fond */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: `radial-gradient(2px 2px at 20px 30px, rgba(255,255,255,0.15), transparent),
                          radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.1), transparent),
                          radial-gradient(1px 1px at 90px 40px, rgba(255,255,255,0.15), transparent)`,
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

      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile 
          ? (isPWA ? '100px 20px 15px 20px' : '45px 20px 15px 20px') 
          : '20px 60px 20px 120px',
        maxWidth: '1400px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Logo + Badge PRO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            <span style={{ 
              color: colors.textPrimary, 
              fontSize: isMobile ? '1.5em' : '2.4em', 
              fontWeight: 'bold',
              letterSpacing: '2px'
            }}>
              PL4T
            </span>
            <AnimatedO size={isMobile ? 32 : 50} />
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: isMobile ? '3px 10px' : '4px 14px',
            borderRadius: '8px',
            fontSize: isMobile ? '0.7em' : '0.85em',
            fontWeight: 'bold',
            letterSpacing: '1px'
          }}>
            PRO
          </div>
        </div>
        
        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '15px' }}>
          {/* Bouton Retour site B2C */}
          {!isMobile && (
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'transparent',
                border: `2px solid ${colors.btnSecondaryBorder}`,
                color: colors.btnSecondaryText,
                padding: '10px 20px',
                borderRadius: '25px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s',
                backdropFilter: 'blur(10px)',
                fontSize: '0.95em'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = colors.btnSecondaryBg;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
              }}
            >
              {t('proLanding.backToSite')}
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: isMobile ? '40px 25px' : '60px 40px',
        position: 'relative',
        zIndex: 5
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: isMobile ? '50px' : '80px'
        }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
            border: '1px solid rgba(102, 126, 234, 0.3)',
            padding: '8px 20px',
            borderRadius: '30px',
            marginBottom: '25px',
            color: isDark ? '#a5b4fc' : '#667eea',
            fontSize: '0.95em',
            fontWeight: '600'
          }}>
            {t('proLanding.badge')}
          </div>

          {/* Titre */}
          <h1 style={{
            fontSize: 'clamp(2em, 4.5vw, 3.5em)',
            fontWeight: 'bold',
            color: colors.textPrimary,
            marginBottom: '20px',
            lineHeight: '1.2'
          }}>
            {t('proLanding.heroTitle1')}{' '}
            <span style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {t('proLanding.heroTitle2')}
            </span>
          </h1>

          {/* Sous-titre */}
          <p style={{
            fontSize: 'clamp(1.1em, 2vw, 1.4em)',
            color: colors.textSecondary,
            marginBottom: '15px',
            maxWidth: '700px',
            margin: '0 auto 15px',
            lineHeight: '1.5'
          }}>
            {t('proLanding.heroSubtitle')}<br/>
            {t('proLanding.heroSubtitle2')}
          </p>

          <p style={{
            fontSize: 'clamp(0.95em, 1.5vw, 1.15em)',
            color: colors.textMuted,
            marginBottom: '40px',
            maxWidth: '600px',
            margin: '0 auto 40px'
          }}>
            {t('proLanding.heroDescription')}
          </p>

          {/* CTA Buttons */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '16px',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            {/* Demander un portail */}
            <button
              onClick={() => navigate('/pro/demande')}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: isMobile ? '16px 30px' : '18px 40px',
                borderRadius: '50px',
                fontSize: isMobile ? '1em' : '1.1em',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 8px 30px rgba(102, 126, 234, 0.4)',
                width: isMobile ? '100%' : 'auto',
                maxWidth: isMobile ? '300px' : 'none'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px) scale(1.02)';
                e.target.style.boxShadow = '0 12px 40px rgba(102, 126, 234, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0) scale(1)';
                e.target.style.boxShadow = '0 8px 30px rgba(102, 126, 234, 0.4)';
              }}
            >
              {t('proLanding.ctaDemande')}
            </button>

            {/* Connexion Cabinet */}
            <button
              onClick={() => navigate('/pro/login')}
              style={{
                background: 'transparent',
                color: colors.btnSecondaryText,
                border: `2px solid ${colors.btnSecondaryBorder}`,
                padding: isMobile ? '16px 30px' : '18px 40px',
                borderRadius: '50px',
                fontSize: isMobile ? '1em' : '1.1em',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s',
                backdropFilter: 'blur(10px)',
                width: isMobile ? '100%' : 'auto',
                maxWidth: isMobile ? '300px' : 'none'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = colors.btnSecondaryBg;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
              }}
            >
              {t('proLanding.ctaConnexion')}
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: '24px',
          marginBottom: '60px'
        }}>
          {features.map((feature, index) => (
            <div
              key={index}
              style={{
                background: colors.cardBg,
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: '30px 24px',
                border: `1px solid ${colors.cardBorder}`,
                transition: 'all 0.3s',
                textAlign: 'center',
                boxShadow: isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.06)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = isDark 
                  ? '0 8px 30px rgba(102, 126, 234, 0.15)' 
                  : '0 8px 30px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.06)';
              }}
            >
              <div style={{ fontSize: '2.5em', marginBottom: '12px' }}>{feature.icon}</div>
              <h3 style={{ 
                color: colors.textPrimary, 
                fontSize: '1.1em', 
                fontWeight: 'bold',
                marginBottom: '8px'
              }}>
                {feature.title}
              </h3>
              <p style={{ 
                color: colors.textMuted, 
                lineHeight: '1.5',
                fontSize: '0.9em'
              }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Section confiance */}

      </main>

      {/* Footer */}
      <footer style={{
        padding: '30px 40px',
        textAlign: 'center',
        borderTop: `1px solid ${colors.cardBorder}`,
        position: 'relative',
        zIndex: 5
      }}>
        <p style={{ color: colors.textSubtle, fontSize: '0.85em' }}>
          {t('proLanding.footerText')}
        </p>
      </footer>

      {/* CSS Animations */}
      <style>{`
        .pro-features-scroll::-webkit-scrollbar { display: none; }
        .pro-features-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes gps-ring-spin {
          0% { transform: rotate(0deg); box-shadow: 0 0 20px rgba(255, 165, 0, 0.6); }
          50% { box-shadow: 0 0 35px rgba(255, 165, 0, 0.9), 0 0 50px rgba(255, 69, 0, 0.5); }
          100% { transform: rotate(360deg); box-shadow: 0 0 20px rgba(255, 165, 0, 0.6); }
        }
      `}</style>
    </div>
  );
};

export default ProLandingPage;
