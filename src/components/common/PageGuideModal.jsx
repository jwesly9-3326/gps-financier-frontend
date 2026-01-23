// 🎓 PAGE GUIDE MODAL - Modal immersif pour l'onboarding des nouvelles pages
// Style inspiré du tutoriel Mode GO de la page Comptes
// Réutilisable sur toutes les pages

import { useTranslation } from 'react-i18next';

const PageGuideModal = ({ 
  isOpen, 
  onClose, 
  icon = '🧭',
  titleKey,
  messageKey,
  hintIcon,
  hintKey,
  buttonKey = 'common.understood'
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      animation: 'modal-appear 0.3s ease-out',
      padding: '20px'
    }}>
      <style>
        {`
          @keyframes modal-appear {
            from {
              opacity: 0;
              transform: scale(0.9) translateY(-20px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          @keyframes float-icon {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
        `}
      </style>
      
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        borderRadius: '25px',
        padding: '40px 50px',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        border: '2px solid rgba(255, 165, 0, 0.3)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        {/* Icône principale animée */}
        <div style={{ 
          fontSize: '3.5em', 
          marginBottom: '20px',
          animation: 'float-icon 3s ease-in-out infinite'
        }}>
          {icon}
        </div>
        
        {/* Titre */}
        <h2 style={{ 
          color: 'white', 
          fontSize: '1.5em', 
          marginBottom: '15px',
          fontWeight: 'bold'
        }}>
          {t(titleKey)}
        </h2>
        
        {/* Message */}
        <p style={{ 
          color: 'rgba(255,255,255,0.8)', 
          fontSize: '1em', 
          lineHeight: '1.6',
          marginBottom: '25px',
          whiteSpace: 'pre-line'
        }}>
          {t(messageKey)}
        </p>
        
        {/* Hint optionnel */}
        {hintKey && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '25px'
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '12px 20px',
              borderRadius: '12px',
              color: 'white',
              fontSize: '0.9em',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              {hintIcon && <span style={{ fontSize: '1.3em' }}>{hintIcon}</span>}
              <span>{t(hintKey)}</span>
            </div>
          </div>
        )}
        
        {/* Bouton Compris */}
        <button
          onClick={onClose}
          style={{
            background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
            border: 'none',
            borderRadius: '25px',
            padding: '15px 40px',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1.1em',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(255, 152, 0, 0.4)',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 25px rgba(255, 152, 0, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 152, 0, 0.4)';
          }}
        >
          {t(buttonKey)} ✓
        </button>
      </div>
    </div>
  );
};

export default PageGuideModal;
