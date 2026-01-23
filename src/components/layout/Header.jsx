// 🧭 PL4TO - HEADER (Barre supérieure fixe)
// Logo PL4TO avec "O" animé identique à GPS Financier (style Anneau de Sauron)
// 🌍 i18n enabled
// 🎨 Theme support

import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useTheme } from '../../context/ThemeContext';
import useGuideProgress from '../../hooks/useGuideProgress';

const Header = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { getTrialDaysRemaining, trialInfo } = useSubscription();
  const { isGuideComplete } = useGuideProgress();
  const { theme, isDark } = useTheme();

  // Obtenir le nom d'affichage (prénom > nom > email)
  const getDisplayName = () => {
    if (user?.prenom) return user.prenom;
    if (user?.nom) return user.nom;
    if (user?.email) return user.email;
    return 'Nouveau';
  };

  // Obtenir l'initiale pour l'avatar
  const getInitial = () => {
    if (user?.prenom) return user.prenom[0].toUpperCase();
    if (user?.nom) return user.nom[0].toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return 'N';
  };

  // Greeting selon l'heure (traduit)
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greeting.morning');
    if (hour < 18) return t('greeting.afternoon');
    return t('greeting.evening');
  };

  // Composant O animé (identique à GPS Financier dans Sidebar)
  const AnimatedO = ({ size = 38 }) => (
    <div style={{
      position: 'relative',
      width: `${size}px`,
      height: `${size}px`,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: '2px'
    }}>
      {/* Cercle O animé style Anneau de Sauron */}
      <div style={{
        position: 'absolute',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        border: '4px solid transparent',
        background: `linear-gradient(${isDark ? '#040449' : '#ffffff'}, ${isDark ? '#040449' : '#ffffff'}) padding-box, linear-gradient(180deg, #ffd700, #ff8c00, #ff4500, #ffd700) border-box`,
        animation: 'gps-ring-spin 3s linear infinite',
        boxShadow: '0 0 15px rgba(255, 165, 0, 0.6)'
      }} />
    </div>
  );

  return (
    <div className="gps-app-header">
      {/* Logo PL4TO avec O animé */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div>
          {/* Texte PL4TO avec O animé */}
          <div style={{ 
            color: isDark ? 'white' : '#1e3a8a', 
            fontSize: '1.8em', 
            fontWeight: 'bold',
            letterSpacing: '1px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <span>PL4T</span>
            <AnimatedO size={36} />
          </div>
          <div style={{ 
            color: isDark ? 'rgba(255,255,255,0.75)' : '#1e3a8a', 
            fontSize: '0.85em',
            letterSpacing: '0.3px',
            marginTop: '2px'
          }}>
            {t('common.tagline')}
          </div>
        </div>
      </div>

      {/* Compteur Trial 14 jours - Au centre (seulement après onboarding) */}
      {isGuideComplete && trialInfo.isActive && !trialInfo.hasChosen && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '8px 20px',
          borderRadius: '25px',
          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
        }}>
          <span style={{ fontSize: '1.2em' }}>✨</span>
          <div style={{ color: 'white', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75em', opacity: 0.9 }}>
              {t('trial.freeTrialActive', 'Essai gratuit')}
            </div>
            <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
              {getTrialDaysRemaining()} {getTrialDaysRemaining() === 1 ? t('trial.dayRemaining') : t('trial.daysRemaining')}
            </div>
          </div>
          <span style={{ fontSize: '1.2em' }}>🎁</span>
        </div>
      )}

      {/* User Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Greeting */}
        <div style={{ color: isDark ? 'white' : '#1e3a8a', textAlign: 'right' }}>
          <div style={{ fontSize: '0.9em', opacity: 0.8 }}>{getGreeting()} 👋😊</div>
          <div style={{ 
            fontWeight: 'bold',
            maxWidth: '150px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {getDisplayName()}
          </div>
        </div>

        {/* Avatar avec gradient plateforme */}
        <div style={{
          width: '45px',
          height: '45px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '1.2em',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
          border: '2px solid rgba(255,255,255,0.2)'
        }}>
          {getInitial()}
        </div>
      </div>

      {/* CSS Animation pour le O GPS */}
      <style>{`
        @keyframes gps-ring-spin {
          0% {
            transform: rotate(0deg);
            box-shadow: 0 0 15px rgba(255, 165, 0, 0.6);
          }
          50% {
            box-shadow: 0 0 25px rgba(255, 165, 0, 0.9), 0 0 35px rgba(255, 69, 0, 0.5);
          }
          100% {
            transform: rotate(360deg);
            box-shadow: 0 0 15px rgba(255, 165, 0, 0.6);
          }
        }
      `}</style>
    </div>
  );
};

export default Header;
