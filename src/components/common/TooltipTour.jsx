// 🎯 COMPOSANT - Tour de Tooltips Interactifs
// Affiche un tooltip stylisé avec highlight de l'élément ciblé
// Navigation: Suivant | Précédent | Ignorer
// Overlay sombre autour de l'élément highlighté
// 📱 Sur mobile/PWA: tooltip centré sans highlight (plus fiable)
// 📱 Mobile/PWA: "Ignorer" et "Terminer" affichent le bouton "On continue!" dans le header

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const TooltipTour = ({
  isActive,
  currentTooltip,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onComplete // 📱 Callback pour "On continue!" (utilisé par les pages)
}) => {
  const { t } = useTranslation();
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isReady, setIsReady] = useState(false);
  const tooltipRef = useRef(null);

  // 📱 Détection mobile/PWA
  const isMobile = window.innerWidth < 768;
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;
  
  // 📱 Sur mobile/PWA: pas de highlight, juste tooltip centré
  const useSimpleMode = isMobile || isPWA;

  // Calculer la position du tooltip (centré sur mobile, près de l'élément sur desktop)
  const updatePosition = useCallback(() => {
    if (!currentTooltip) return;

    const tooltipWidth = isMobile ? Math.min(300, window.innerWidth - 40) : 320;
    const tooltipHeight = isMobile ? 200 : 220;
    const screenPadding = 20;

    if (useSimpleMode) {
      // 📱 Mode simple: tooltip centré verticalement et horizontalement
      const top = (window.innerHeight - tooltipHeight) / 2;
      const left = (window.innerWidth - tooltipWidth) / 2;
      
      setTooltipPosition({ top, left });
      setTargetRect(null); // Pas de highlight
      setIsReady(true);
      return;
    }

    // 🖥️ Desktop: highlight + positionnement près de l'élément
    const element = document.querySelector(currentTooltip.target);
    if (!element) {
      console.warn(`[TooltipTour] Élément non trouvé: ${currentTooltip.target}`);
      // Fallback: centrer le tooltip
      setTooltipPosition({ 
        top: (window.innerHeight - tooltipHeight) / 2, 
        left: (window.innerWidth - tooltipWidth) / 2 
      });
      setTargetRect(null);
      setIsReady(true);
      return;
    }

    // 🆕 FIX: Scroll l'élément dans la vue AVANT de calculer sa position
    // Ceci corrige le problème de highlight mal positionné dans les conteneurs scrollables
    element.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'nearest' });

    const rect = element.getBoundingClientRect();
    
    // Appliquer l'offset du highlight si défini
    const offset = currentTooltip.highlightOffset || { left: 0, top: 0, width: 0, height: 0 };
    const adjustedRect = {
      left: rect.left + (offset.left || 0),
      top: rect.top + (offset.top || 0),
      width: rect.width + (offset.width || 0),
      height: rect.height + (offset.height || 0),
      right: rect.right + (offset.left || 0) + (offset.width || 0),
      bottom: rect.bottom + (offset.top || 0) + (offset.height || 0)
    };
    setTargetRect(adjustedRect);

    // Calculer les positions possibles
    const padding = 16;
    const position = currentTooltip.position || 'bottom';
    
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

    // Vérifier si une position est valide
    const isValidPosition = (pos) => {
      return (
        pos.top >= screenPadding &&
        pos.top + tooltipHeight <= window.innerHeight - screenPadding &&
        pos.left >= screenPadding &&
        pos.left + tooltipWidth <= window.innerWidth - screenPadding
      );
    };

    let chosenPos = positions[position];
    
    if (!isValidPosition(chosenPos)) {
      const fallbackOrder = ['bottom', 'top', 'right', 'left'];
      for (const pos of fallbackOrder) {
        if (isValidPosition(positions[pos])) {
          chosenPos = positions[pos];
          break;
        }
      }
    }

    // Ajustements finaux
    let { top, left } = chosenPos;
    if (left < screenPadding) left = screenPadding;
    if (left + tooltipWidth > window.innerWidth - screenPadding) {
      left = window.innerWidth - tooltipWidth - screenPadding;
    }
    if (top < screenPadding) top = screenPadding;
    if (top + tooltipHeight > window.innerHeight - screenPadding) {
      top = window.innerHeight - tooltipHeight - screenPadding;
    }

    setTooltipPosition({ top, left });
    setIsReady(true);
  }, [currentTooltip, isMobile, useSimpleMode]);

  // 📱 Gérer le clic sur "Terminer" - comportement IDENTIQUE desktop et mobile
  // Terminer = fermer les tooltips et afficher la barre "On continue!" en haut
  const handleFinish = () => {
    // Comportement identique sur desktop et mobile:
    // Fermer les tooltips, l'utilisateur peut explorer la page
    // La barre "On continue!" s'affichera via onNext() qui déclenche onComplete dans useTooltipTour
    onNext();
  };

  // 📱 Gérer le clic sur "Ignorer" - comportement IDENTIQUE desktop et mobile
  // Ignorer = fermer les tooltips et afficher le bouton "On continue!" dans le header
  const handleSkip = () => {
    // Comportement identique sur desktop et mobile:
    // Fermer les tooltips, le bouton "On continue!" apparaît dans le header
    onSkip();
  };

  // Mettre à jour quand le tooltip change
  useEffect(() => {
    if (isActive && currentTooltip) {
      setIsReady(false);
      const timer = setTimeout(updatePosition, 100);
      return () => clearTimeout(timer);
    }
  }, [isActive, currentStep, updatePosition]);

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
      if (e.key === 'Escape') handleSkip();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStep === totalSteps - 1) {
          handleFinish();
        } else {
          onNext();
        }
      }
      else if (e.key === 'ArrowLeft') onPrev();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onNext, onPrev, currentStep, totalSteps]);

  if (!isActive || !currentTooltip || !isReady) return null;

  // Calculer la flèche (desktop uniquement)
  const getArrowStyle = () => {
    if (useSimpleMode || !targetRect) return { display: 'none' };
    
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
        return { ...baseStyle, bottom: -arrowSize, left: '50%', transform: 'translateX(-50%)',
          borderWidth: `${arrowSize}px ${arrowSize}px 0 ${arrowSize}px`,
          borderColor: '#1a1a2e transparent transparent transparent' };
      case 'bottom':
        return { ...baseStyle, top: -arrowSize, left: '50%', transform: 'translateX(-50%)',
          borderWidth: `0 ${arrowSize}px ${arrowSize}px ${arrowSize}px`,
          borderColor: 'transparent transparent #1a1a2e transparent' };
      case 'left':
        return { ...baseStyle, right: -arrowSize, top: '50%', transform: 'translateY(-50%)',
          borderWidth: `${arrowSize}px 0 ${arrowSize}px ${arrowSize}px`,
          borderColor: 'transparent transparent transparent #1a1a2e' };
      case 'right':
        return { ...baseStyle, left: -arrowSize, top: '50%', transform: 'translateY(-50%)',
          borderWidth: `${arrowSize}px ${arrowSize}px ${arrowSize}px 0`,
          borderColor: 'transparent #1a1a2e transparent transparent' };
      default:
        return { display: 'none' };
    }
  };

  const isLastStep = currentStep === totalSteps - 1;

  return (
    <>
      {/* Overlay sombre */}
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
        {useSimpleMode ? (
          // 📱 Mobile/PWA: overlay complet sans trou
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)'
          }} />
        ) : targetRect ? (
          // 🖥️ Desktop: overlay avec trou pour highlight
          <>
            <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
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
              <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.75)" mask="url(#tooltip-mask)" />
            </svg>
            
            {/* Bordure brillante autour de l'élément */}
            <div style={{
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
            }} />
          </>
        ) : (
          // Fallback: overlay complet
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)'
          }} />
        )}
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          width: isMobile ? `${Math.min(300, window.innerWidth - 40)}px` : '320px',
          maxWidth: 'calc(100vw - 40px)',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: isMobile ? '14px' : '16px',
          padding: isMobile ? '16px' : '20px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(102, 126, 234, 0.3)',
          border: '1px solid rgba(102, 126, 234, 0.3)',
          zIndex: 99999,
          animation: 'tooltip-appear 0.3s ease-out',
          pointerEvents: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Flèche (desktop uniquement) */}
        <div style={getArrowStyle()} />

        {/* Header avec icône et progression */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isMobile ? '10px' : '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '10px' }}>
            <span style={{
              fontSize: isMobile ? '1.3em' : '1.5em',
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
              padding: isMobile ? '6px' : '8px',
              borderRadius: '10px'
            }}>
              {currentTooltip.icon || '💡'}
            </span>
            <h3 style={{ margin: 0, fontSize: isMobile ? '1em' : '1.1em', fontWeight: 'bold', color: 'white' }}>
              {t(currentTooltip.titleKey)}
            </h3>
          </div>
          
          <span style={{
            fontSize: isMobile ? '0.75em' : '0.8em',
            color: 'rgba(255,255,255,0.6)',
            background: 'rgba(255,255,255,0.1)',
            padding: isMobile ? '3px 8px' : '4px 10px',
            borderRadius: '12px'
          }}>
            {currentStep + 1}/{totalSteps}
          </span>
        </div>

        {/* Contenu */}
        <p style={{
          margin: isMobile ? '0 0 12px' : '0 0 16px',
          fontSize: isMobile ? '0.9em' : '0.95em',
          color: 'rgba(255,255,255,0.85)',
          lineHeight: '1.5',
          whiteSpace: 'pre-line'
        }}>
          {t(currentTooltip.contentKey)}
        </p>

        {/* Barre de progression */}
        <div style={{
          width: '100%',
          height: isMobile ? '3px' : '4px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
          marginBottom: isMobile ? '12px' : '16px',
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
          gap: isMobile ? '6px' : '10px'
        }}>
          <button
            onClick={handleSkip}
            style={{
              padding: isMobile ? '8px 10px' : '8px 14px',
              border: 'none',
              background: 'transparent',
              color: 'rgba(255,255,255,0.5)',
              fontSize: isMobile ? '0.8em' : '0.85em',
              cursor: 'pointer',
              transition: 'color 0.2s',
              minWidth: isMobile ? '60px' : 'auto'
            }}
          >
            {t('tooltips.skip')}
          </button>

          <div style={{ display: 'flex', gap: isMobile ? '6px' : '8px' }}>
            {/* Bouton Précédent - visible sur desktop uniquement */}
            {currentStep > 0 && !isMobile && (
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
              >
                ← {t('tooltips.prev')}
              </button>
            )}

            <button
              onClick={isLastStep ? handleFinish : onNext}
              style={{
                padding: isMobile ? '10px 16px' : '10px 20px',
                border: 'none',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontSize: isMobile ? '0.85em' : '0.9em',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                transition: 'all 0.2s',
                minWidth: isMobile ? '100px' : 'auto'
              }}
            >
              {isLastStep ? t('tooltips.finish') : t('tooltips.next')} →
            </button>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes tooltip-appear {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes tooltip-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.6), 0 0 40px rgba(102, 126, 234, 0.3); }
          50% { box-shadow: 0 0 30px rgba(102, 126, 234, 0.8), 0 0 60px rgba(102, 126, 234, 0.4); }
        }
      `}</style>
    </>
  );
};

export default TooltipTour;
