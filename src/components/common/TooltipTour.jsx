// 🎯 COMPOSANT - Tour de Tooltips Interactifs
// Affiche un tooltip stylisé avec highlight de l'élément ciblé
// Navigation: Suivant | Précédent | Ignorer
// Overlay sombre autour de l'élément highlighté

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const TooltipTour = ({
  isActive,
  currentTooltip,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip
}) => {
  const { t } = useTranslation();
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef(null);

  // Trouver l'élément cible et calculer sa position
  const updatePosition = useCallback(() => {
    if (!currentTooltip?.target) return;

    const element = document.querySelector(currentTooltip.target);
    if (!element) {
      console.warn(`[TooltipTour] Élément non trouvé: ${currentTooltip.target}`);
      return;
    }

    const rect = element.getBoundingClientRect();
    console.log('[TooltipTour] Element trouvé, rect:', rect.width, rect.height, rect.top, rect.left);
    setTargetRect(rect);

    // Calculer la position du tooltip selon la direction
    const padding = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 200; // Un peu plus haut pour le contenu

    let top, left;
    const position = currentTooltip.position || 'bottom';
    const screenPadding = 20;

    // Calculer les positions possibles
    const positions = {
      top: {
        top: rect.top - tooltipHeight - padding,
        left: rect.left + (rect.width / 2) - (tooltipWidth / 2)
      },
      bottom: {
        top: rect.bottom + padding,
        left: rect.left + (rect.width / 2) - (tooltipWidth / 2)
      },
      left: {
        top: rect.top + (rect.height / 2) - (tooltipHeight / 2),
        left: rect.left - tooltipWidth - padding
      },
      right: {
        top: rect.top + (rect.height / 2) - (tooltipHeight / 2),
        left: rect.right + padding
      }
    };

    // Vérifier si une position est valide (dans l'écran)
    const isValidPosition = (pos) => {
      return (
        pos.top >= screenPadding &&
        pos.top + tooltipHeight <= window.innerHeight - screenPadding &&
        pos.left >= screenPadding &&
        pos.left + tooltipWidth <= window.innerWidth - screenPadding
      );
    };

    // Utiliser la position demandée si elle est valide
    let chosenPos = positions[position];
    
    // Si la position demandée n'est pas valide, essayer les alternatives
    if (!isValidPosition(chosenPos)) {
      // Ordre de préférence selon la position demandée
      const fallbackOrder = {
        right: ['right', 'left', 'bottom', 'top'],
        left: ['left', 'right', 'bottom', 'top'],
        top: ['top', 'bottom', 'right', 'left'],
        bottom: ['bottom', 'top', 'right', 'left']
      };
      
      const order = fallbackOrder[position] || ['bottom', 'top', 'right', 'left'];
      
      for (const pos of order) {
        if (isValidPosition(positions[pos])) {
          chosenPos = positions[pos];
          break;
        }
      }
    }

    // Ajustements finaux pour garder dans l'écran (au cas où aucune position n'est parfaite)
    top = chosenPos.top;
    left = chosenPos.left;
    
    // Ajuster horizontalement si nécessaire
    if (left < screenPadding) left = screenPadding;
    if (left + tooltipWidth > window.innerWidth - screenPadding) {
      left = window.innerWidth - tooltipWidth - screenPadding;
    }
    
    // Ajuster verticalement si nécessaire
    if (top < screenPadding) top = screenPadding;
    if (top + tooltipHeight > window.innerHeight - screenPadding) {
      top = window.innerHeight - tooltipHeight - screenPadding;
    }

    setTooltipPosition({ top, left });
  }, [currentTooltip]);

  // Mettre à jour la position quand le tooltip change
  useEffect(() => {
    if (isActive && currentTooltip) {
      console.log('[TooltipTour] isActive:', isActive, 'currentTooltip:', currentTooltip?.id, 'target:', currentTooltip?.target);
      // Petit délai pour laisser le DOM se stabiliser
      const timer = setTimeout(updatePosition, 100);
      return () => clearTimeout(timer);
    }
  }, [isActive, currentTooltip, updatePosition]);

  // Mettre à jour sur resize
  useEffect(() => {
    if (!isActive) return;

    const handleResize = () => updatePosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isActive, updatePosition]);

  // Gérer les touches clavier
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        onNext();
      } else if (e.key === 'ArrowLeft') {
        onPrev();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onNext, onPrev, onSkip]);

  // Log pour débuguer les conditions de rendu
  useEffect(() => {
    console.log('[TooltipTour] Conditions rendu - isActive:', isActive, 'currentTooltip:', !!currentTooltip, 'targetRect:', !!targetRect);
  }, [isActive, currentTooltip, targetRect]);

  if (!isActive || !currentTooltip || !targetRect) return null;

  // Calculer la flèche du tooltip
  const getArrowStyle = () => {
    const position = currentTooltip.position || 'bottom';
    const arrowSize = 12;
    const baseStyle = {
      position: 'absolute',
      width: 0,
      height: 0,
      borderStyle: 'solid'
    };

    switch (position) {
      case 'top':
        return {
          ...baseStyle,
          bottom: -arrowSize,
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: `${arrowSize}px ${arrowSize}px 0 ${arrowSize}px`,
          borderColor: '#1a1a2e transparent transparent transparent'
        };
      case 'bottom':
        return {
          ...baseStyle,
          top: -arrowSize,
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: `0 ${arrowSize}px ${arrowSize}px ${arrowSize}px`,
          borderColor: 'transparent transparent #1a1a2e transparent'
        };
      case 'left':
        return {
          ...baseStyle,
          right: -arrowSize,
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: `${arrowSize}px 0 ${arrowSize}px ${arrowSize}px`,
          borderColor: 'transparent transparent transparent #1a1a2e'
        };
      case 'right':
        return {
          ...baseStyle,
          left: -arrowSize,
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: `${arrowSize}px ${arrowSize}px ${arrowSize}px 0`,
          borderColor: 'transparent #1a1a2e transparent transparent'
        };
      default:
        return baseStyle;
    }
  };

  return (
    <>
      {/* Overlay sombre avec trou pour l'élément highlighté */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99998,
          pointerEvents: 'none'
        }}
      >
        {/* Overlay semi-transparent */}
        <svg
          width="100%"
          height="100%"
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          <defs>
            <mask id="tooltip-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="12"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#tooltip-mask)"
          />
        </svg>

        {/* Bordure brillante autour de l'élément */}
        <div
          style={{
            position: 'absolute',
            left: targetRect.left - 8,
            top: targetRect.top - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            border: '3px solid #667eea',
            borderRadius: '12px',
            boxShadow: '0 0 20px rgba(102, 126, 234, 0.6), 0 0 40px rgba(102, 126, 234, 0.3)',
            animation: 'tooltip-pulse 2s infinite',
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          width: '320px',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(102, 126, 234, 0.3)',
          border: '1px solid rgba(102, 126, 234, 0.3)',
          zIndex: 99999,
          animation: 'tooltip-appear 0.3s ease-out',
          pointerEvents: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Flèche */}
        <div style={getArrowStyle()} />

        {/* Header avec icône et progression */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{
              fontSize: '1.5em',
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
              padding: '8px',
              borderRadius: '10px'
            }}>
              {currentTooltip.icon || '💡'}
            </span>
            <h3 style={{
              margin: 0,
              fontSize: '1.1em',
              fontWeight: 'bold',
              color: 'white'
            }}>
              {t(currentTooltip.titleKey)}
            </h3>
          </div>
          
          {/* Indicateur de progression */}
          <span style={{
            fontSize: '0.8em',
            color: 'rgba(255,255,255,0.6)',
            background: 'rgba(255,255,255,0.1)',
            padding: '4px 10px',
            borderRadius: '12px'
          }}>
            {currentStep + 1}/{totalSteps}
          </span>
        </div>

        {/* Contenu */}
        <p style={{
          margin: '0 0 16px',
          fontSize: '0.95em',
          color: 'rgba(255,255,255,0.85)',
          lineHeight: '1.5',
          whiteSpace: 'pre-line'
        }}>
          {t(currentTooltip.contentKey)}
        </p>

        {/* Barre de progression */}
        <div style={{
          width: '100%',
          height: '4px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
          marginBottom: '16px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${((currentStep + 1) / totalSteps) * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #667eea, #764ba2)',
            borderRadius: '2px',
            transition: 'width 0.3s ease'
          }} />
        </div>

        {/* Boutons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px'
        }}>
          {/* Bouton Ignorer */}
          <button
            onClick={onSkip}
            style={{
              padding: '8px 14px',
              border: 'none',
              background: 'transparent',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.85em',
              cursor: 'pointer',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.color = 'rgba(255,255,255,0.8)'}
            onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.5)'}
          >
            {t('tooltips.skip')}
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Bouton Précédent */}
            {currentStep > 0 && (
              <button
                onClick={onPrev}
                style={{
                  padding: '10px 16px',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  background: 'transparent',
                  color: 'white',
                  fontSize: '0.9em',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.4)';
                  e.target.style.background = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                  e.target.style.background = 'transparent';
                }}
              >
                ← {t('tooltips.prev')}
              </button>
            )}

            {/* Bouton Suivant / Terminer */}
            <button
              onClick={onNext}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontSize: '0.9em',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
              }}
            >
              {currentStep === totalSteps - 1 ? t('tooltips.finish') : t('tooltips.next')} →
            </button>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes tooltip-appear {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        @keyframes tooltip-pulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(102, 126, 234, 0.6), 0 0 40px rgba(102, 126, 234, 0.3);
          }
          50% {
            box-shadow: 0 0 30px rgba(102, 126, 234, 0.8), 0 0 60px rgba(102, 126, 234, 0.4);
          }
        }
      `}</style>
    </>
  );
};

export default TooltipTour;
