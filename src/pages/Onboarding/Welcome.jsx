// 🗺️ WELCOME - Écran d'accueil PL4TO avec O animé
// Durée estimée: 10 secondes

import { useTranslation } from 'react-i18next';
import { useOnboarding } from '../../context/OnboardingContext';

const Welcome = () => {
  const { goNext } = useOnboarding();
  const { t } = useTranslation();

  // Composant O animé (style Anneau de Sauron)
  const AnimatedO = ({ size = 120 }) => (
    <div style={{
      position: 'relative',
      width: `${size}px`,
      height: `${size}px`,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '30px'
    }}>
      <div style={{
        position: 'absolute',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        border: `${Math.max(4, size / 20)}px solid transparent`,
        background: 'linear-gradient(#040449, #040449) padding-box, linear-gradient(180deg, #ffd700, #ff8c00, #ff4500, #ffd700) border-box',
        animation: 'gps-ring-spin 3s linear infinite',
        boxShadow: '0 0 40px rgba(255, 165, 0, 0.5), 0 0 80px rgba(255, 152, 0, 0.3)'
      }} />
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'linear-gradient(180deg, #040449 0%, #100261 50%, #040449 100%)'
    }}>
      {/* Grand O animé */}
      <AnimatedO size={120} />

      {/* Titre PL4TO avec petit O */}
      <h1 style={{
        fontSize: '3em',
        fontWeight: 'bold',
        color: 'white',
        marginBottom: '10px',
        textAlign: 'center',
        fontFamily: "'Poppins', sans-serif",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px'
      }}>
        <span>PL4T</span>
        <span style={{ 
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          border: '4px solid transparent',
          background: 'linear-gradient(#040449, #040449) padding-box, linear-gradient(180deg, #ffd700, #ff8c00, #ff4500, #ffd700) border-box',
          display: 'inline-block',
          animation: 'gps-ring-spin 3s linear infinite',
          boxShadow: '0 0 15px rgba(255, 165, 0, 0.5)'
        }} />
      </h1>

      {/* Tagline */}
      <p style={{
        fontSize: '1.3em',
        color: 'rgba(255,255,255,0.9)',
        marginBottom: '40px',
        textAlign: 'center'
      }}>
        {t('common.tagline')}
      </p>

      {/* Bénéfices clés - 3 points */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        marginBottom: '50px',
        maxWidth: '400px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          background: 'rgba(255,255,255,0.15)',
          padding: '15px 20px',
          borderRadius: '12px'
        }}>
          <span style={{ fontSize: '1.5em' }}>📍</span>
          <span style={{ color: 'white', fontSize: '1em' }} dangerouslySetInnerHTML={{ __html: t('onboarding.welcome.benefit1') }} />
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          background: 'rgba(255,255,255,0.15)',
          padding: '15px 20px',
          borderRadius: '12px'
        }}>
          <span style={{ fontSize: '1.5em' }}>🔄</span>
          <span style={{ color: 'white', fontSize: '1em' }} dangerouslySetInnerHTML={{ __html: t('onboarding.welcome.benefit2') }} />
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          background: 'rgba(255,255,255,0.15)',
          padding: '15px 20px',
          borderRadius: '12px'
        }}>
          <span style={{ fontSize: '1.5em' }}>🎯</span>
          <span style={{ color: 'white', fontSize: '1em' }} dangerouslySetInnerHTML={{ __html: t('onboarding.welcome.benefit3') }} />
        </div>
      </div>

      {/* Temps estimé */}
      <p style={{
        color: 'rgba(255,255,255,0.7)',
        fontSize: '0.9em',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>⏱️</span>
        <span dangerouslySetInnerHTML={{ __html: t('onboarding.welcome.timeEstimate') }} />
      </p>

      {/* Bouton CTA principal */}
      <button
        onClick={goNext}
        style={{
          padding: '18px 60px',
          fontSize: '1.2em',
          fontWeight: 'bold',
          color: 'white',
          background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
          border: 'none',
          borderRadius: '50px',
          cursor: 'pointer',
          boxShadow: '0 10px 30px rgba(255, 152, 0, 0.4)',
          transition: 'all 0.3s ease',
          marginBottom: '20px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
          e.currentTarget.style.boxShadow = '0 15px 40px rgba(255, 152, 0, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = '0 10px 30px rgba(255, 152, 0, 0.4)';
        }}
      >
        🚀 {t('onboarding.welcome.cta')}
      </button>

      {/* Lien secondaire */}
      <button
        onClick={() => {
          window.location.href = '/login';
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '0.95em',
          cursor: 'pointer',
          textDecoration: 'underline',
          padding: '10px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'white';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
        }}
      >
        {t('onboarding.welcome.hasAccount')}
      </button>

      {/* Footer sécurité */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        display: 'flex',
        gap: '20px',
        color: 'rgba(255,255,255,0.6)',
        fontSize: '0.8em'
      }}>
        <span>🔒 {t('onboarding.welcome.encrypted')}</span>
        <span>🇨🇦 {t('onboarding.welcome.hostedCanada')}</span>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes gps-ring-spin {
          0% {
            transform: rotate(0deg);
            box-shadow: 0 0 20px rgba(255, 165, 0, 0.5);
          }
          50% {
            box-shadow: 0 0 40px rgba(255, 165, 0, 0.8), 0 0 60px rgba(255, 69, 0, 0.4);
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

export default Welcome;
