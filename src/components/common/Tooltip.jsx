// 💡 TOOLTIP - Composant de tooltip interactif et stylisé
// Remplace les title= natifs par des tooltips animés et personnalisables
// Usage: <Tooltip content="Texte" position="top"><Button /></Tooltip>

import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

const Tooltip = ({ 
  children, 
  content, 
  position = 'top', 
  delay = 300,
  disabled = false,
  maxWidth = 250,
  theme = 'dark', // 'dark' | 'light' | 'gradient'
  showArrow = true,
  interactive = false // Si true, le tooltip reste visible au hover
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [actualPosition, setActualPosition] = useState(position);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);

  // Calculer la position du tooltip
  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    
    const spacing = 10; // Espace entre l'élément et le tooltip
    
    let top, left;
    let finalPosition = position;

    // Vérifier si le tooltip dépasse l'écran et ajuster
    const checkBounds = (pos) => {
      const newCoords = getCoords(pos);
      const wouldOverflowTop = newCoords.top < 0;
      const wouldOverflowBottom = newCoords.top + tooltipRect.height > window.innerHeight;
      const wouldOverflowLeft = newCoords.left < 0;
      const wouldOverflowRight = newCoords.left + tooltipRect.width > window.innerWidth;

      if (pos === 'top' && wouldOverflowTop) return 'bottom';
      if (pos === 'bottom' && wouldOverflowBottom) return 'top';
      if (pos === 'left' && wouldOverflowLeft) return 'right';
      if (pos === 'right' && wouldOverflowRight) return 'left';
      return pos;
    };

    const getCoords = (pos) => {
      switch (pos) {
        case 'top':
          return {
            top: triggerRect.top + scrollY - tooltipRect.height - spacing,
            left: triggerRect.left + scrollX + (triggerRect.width / 2) - (tooltipRect.width / 2)
          };
        case 'bottom':
          return {
            top: triggerRect.bottom + scrollY + spacing,
            left: triggerRect.left + scrollX + (triggerRect.width / 2) - (tooltipRect.width / 2)
          };
        case 'left':
          return {
            top: triggerRect.top + scrollY + (triggerRect.height / 2) - (tooltipRect.height / 2),
            left: triggerRect.left + scrollX - tooltipRect.width - spacing
          };
        case 'right':
          return {
            top: triggerRect.top + scrollY + (triggerRect.height / 2) - (tooltipRect.height / 2),
            left: triggerRect.right + scrollX + spacing
          };
        default:
          return { top: 0, left: 0 };
      }
    };

    finalPosition = checkBounds(position);
    const finalCoords = getCoords(finalPosition);

    // Ajuster si dépasse horizontalement
    if (finalCoords.left < 10) finalCoords.left = 10;
    if (finalCoords.left + tooltipRect.width > window.innerWidth - 10) {
      finalCoords.left = window.innerWidth - tooltipRect.width - 10;
    }

    setActualPosition(finalPosition);
    setCoords(finalCoords);
  };

  // Afficher le tooltip avec délai
  const handleMouseEnter = () => {
    if (disabled || !content) return;
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  // Masquer le tooltip
  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (!interactive) {
      setIsVisible(false);
    }
  };

  // Masquer quand on quitte le tooltip (mode interactive)
  const handleTooltipMouseLeave = () => {
    if (interactive) {
      setIsVisible(false);
    }
  };

  // Recalculer la position quand visible
  useEffect(() => {
    if (isVisible) {
      // Petit délai pour que le tooltip soit rendu avant de calculer
      requestAnimationFrame(() => {
        calculatePosition();
      });
    }
  }, [isVisible, content]);

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Styles du thème
  const getThemeStyles = () => {
    switch (theme) {
      case 'light':
        return {
          background: 'white',
          color: '#2c3e50',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          border: '1px solid rgba(0,0,0,0.08)'
        };
      case 'gradient':
        return {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)'
        };
      case 'dark':
      default:
        return {
          background: 'rgba(20, 20, 40, 0.95)',
          color: 'white',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        };
    }
  };

  // Style de la flèche selon position
  const getArrowStyles = () => {
    const arrowSize = 6;
    const themeStyles = getThemeStyles();
    const baseArrow = {
      position: 'absolute',
      width: 0,
      height: 0,
      border: `${arrowSize}px solid transparent`
    };

    switch (actualPosition) {
      case 'top':
        return {
          ...baseArrow,
          bottom: -arrowSize * 2,
          left: '50%',
          transform: 'translateX(-50%)',
          borderTopColor: theme === 'light' ? 'white' : (theme === 'gradient' ? '#764ba2' : 'rgba(20, 20, 40, 0.95)')
        };
      case 'bottom':
        return {
          ...baseArrow,
          top: -arrowSize * 2,
          left: '50%',
          transform: 'translateX(-50%)',
          borderBottomColor: theme === 'light' ? 'white' : (theme === 'gradient' ? '#667eea' : 'rgba(20, 20, 40, 0.95)')
        };
      case 'left':
        return {
          ...baseArrow,
          right: -arrowSize * 2,
          top: '50%',
          transform: 'translateY(-50%)',
          borderLeftColor: theme === 'light' ? 'white' : (theme === 'gradient' ? '#764ba2' : 'rgba(20, 20, 40, 0.95)')
        };
      case 'right':
        return {
          ...baseArrow,
          left: -arrowSize * 2,
          top: '50%',
          transform: 'translateY(-50%)',
          borderRightColor: theme === 'light' ? 'white' : (theme === 'gradient' ? '#667eea' : 'rgba(20, 20, 40, 0.95)')
        };
      default:
        return baseArrow;
    }
  };

  // Animation selon position
  const getAnimationTransform = () => {
    switch (actualPosition) {
      case 'top': return 'translateY(5px)';
      case 'bottom': return 'translateY(-5px)';
      case 'left': return 'translateX(5px)';
      case 'right': return 'translateX(-5px)';
      default: return 'translateY(5px)';
    }
  };

  const themeStyles = getThemeStyles();

  return (
    <>
      {/* Élément déclencheur */}
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        style={{ display: 'inline-flex' }}
      >
        {children}
      </span>

      {/* Tooltip */}
      {isVisible && content && (
        <div
          ref={tooltipRef}
          onMouseEnter={interactive ? () => {} : undefined}
          onMouseLeave={handleTooltipMouseLeave}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            zIndex: 99999,
            maxWidth: maxWidth,
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '0.85em',
            fontWeight: '500',
            lineHeight: '1.4',
            textAlign: 'center',
            pointerEvents: interactive ? 'auto' : 'none',
            opacity: coords.top === 0 ? 0 : 1,
            transform: coords.top === 0 ? getAnimationTransform() : 'none',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
            ...themeStyles
          }}
        >
          {content}
          
          {/* Flèche */}
          {showArrow && (
            <div style={getArrowStyles()} />
          )}
        </div>
      )}

      {/* Styles globaux pour animations */}
      <style>{`
        @keyframes tooltip-fade-in {
          from {
            opacity: 0;
            transform: ${getAnimationTransform()};
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </>
  );
};

Tooltip.propTypes = {
  children: PropTypes.node.isRequired,
  content: PropTypes.node,
  position: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
  delay: PropTypes.number,
  disabled: PropTypes.bool,
  maxWidth: PropTypes.number,
  theme: PropTypes.oneOf(['dark', 'light', 'gradient']),
  showArrow: PropTypes.bool,
  interactive: PropTypes.bool
};

export default Tooltip;
