// 💡 HELP BUTTON - Bouton ampoule flottant pour relancer le tour des tooltips
// Permet à l'utilisateur de revoir les conseils de la page à tout moment
// 🎨 Theme support

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

const HelpButton = ({ 
  onStartTour, 
  hasTooltips = true,
  position = 'bottom-right', // 'bottom-right', 'bottom-left', 'top-right', 'top-left'
  offset = { bottom: 20, right: 20 }
}) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Ne pas afficher si pas de tooltips pour cette page
  if (!hasTooltips || !onStartTour) return null;

  // Calculer la position selon le paramètre
  const getPositionStyle = () => {
    const base = { position: 'fixed', zIndex: 1000 };
    
    switch (position) {
      case 'bottom-left':
        return { ...base, bottom: offset.bottom || 20, left: offset.left || 20 };
      case 'top-right':
        return { ...base, top: offset.top || 20, right: offset.right || 20 };
      case 'top-left':
        return { ...base, top: offset.top || 20, left: offset.left || 20 };
      case 'bottom-right':
      default:
        return { ...base, bottom: offset.bottom || 20, right: offset.right || 20 };
    }
  };

  const handleClick = () => {
    setShowTooltip(false);
    onStartTour();
  };

  return (
    <div style={getPositionStyle()}>
      {/* Tooltip au survol */}
      {(isHovered || showTooltip) && (
        <div 
          style={{
            position: 'absolute',
            bottom: '60px',
            right: '0',
            background: isDark 
              ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            color: isDark ? 'white' : '#1e293b',
            padding: '10px 16px',
            borderRadius: '12px',
            fontSize: '0.85em',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            boxShadow: isDark 
              ? '0 4px 20px rgba(0,0,0,0.4)'
              : '0 4px 20px rgba(0,0,0,0.15)',
            border: isDark 
              ? '1px solid rgba(255,255,255,0.1)'
              : '1px solid rgba(0,0,0,0.1)',
            animation: 'helpTooltipAppear 0.2s ease-out',
            pointerEvents: 'none'
          }}
        >
          {t('help.showTips', 'Revoir les conseils')}
          {/* Flèche */}
          <div style={{
            position: 'absolute',
            bottom: '-8px',
            right: '20px',
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: isDark 
              ? '8px solid #16213e'
              : '8px solid #f8fafc'
          }} />
        </div>
      )}

      {/* Bouton ampoule */}
      <button
        onClick={handleClick}
        onMouseEnter={() => {
          setIsHovered(true);
          setShowTooltip(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          setTimeout(() => setShowTooltip(false), 200);
        }}
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          border: 'none',
          background: isHovered
            ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
            : (isDark 
                ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%)'
                : 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(245, 158, 11, 0.3) 100%)'),
          color: isHovered ? 'white' : (isDark ? '#fbbf24' : '#d97706'),
          fontSize: '1.5em',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isHovered
            ? '0 8px 25px rgba(251, 191, 36, 0.5)'
            : (isDark 
                ? '0 4px 15px rgba(0,0,0,0.3)'
                : '0 4px 15px rgba(0,0,0,0.1)'),
          transition: 'all 0.3s ease',
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
          backdropFilter: 'blur(10px)'
        }}
        title={t('help.showTips', 'Revoir les conseils')}
      >
        💡
      </button>

      {/* Petit badge "?" pour indiquer l'aide */}
      {!isHovered && (
        <div style={{
          position: 'absolute',
          top: '-2px',
          right: '-2px',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontSize: '0.7em',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)',
          animation: 'helpBadgePulse 2s infinite'
        }}>
          ?
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes helpTooltipAppear {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes helpBadgePulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
          }
          50% {
            transform: scale(1.1);
            box-shadow: 0 2px 12px rgba(102, 126, 234, 0.6);
          }
        }
      `}</style>
    </div>
  );
};

export default HelpButton;
