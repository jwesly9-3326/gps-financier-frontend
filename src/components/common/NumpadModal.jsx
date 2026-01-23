// 🔢 NUMPAD MODAL - Clavier numérique style app bancaire
// Utilisable partout dans PL4TO pour saisir des montants
// Touch-friendly pour mobile et desktop
// Supporte accentColor pour personnaliser les couleurs

import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const NumpadModal = ({
  isOpen,
  onClose,
  onConfirm,
  initialValue = 0,
  title = '',
  currency = '$',
  maxValue = 9999999.99,
  allowDecimals = true,
  maxDecimals = 2,
  allowNegative = false,
  accentColor = '#f59e0b', // Orange par défaut
}) => {
  const { t } = useTranslation();
  const [displayValue, setDisplayValue] = useState('0');
  const [hasDecimal, setHasDecimal] = useState(false);
  const [isNegative, setIsNegative] = useState(false);

  // Initialiser avec la valeur fournie
  useEffect(() => {
    if (isOpen) {
      const numVal = parseFloat(initialValue) || 0;
      const isNeg = numVal < 0;
      const absVal = Math.abs(numVal);
      const formatted = absVal > 0 ? absVal.toString() : '0';
      setDisplayValue(formatted);
      setHasDecimal(formatted.includes('.'));
      setIsNegative(isNeg);
    }
  }, [isOpen, initialValue]);

  // Gérer les touches du clavier physique
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        handleConfirm();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if ((e.key === '.' || e.key === ',') && allowDecimals) {
        handleDecimal();
      } else if (e.key === '-' && allowNegative) {
        toggleNegative();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, displayValue, hasDecimal, isNegative]);

  // Bloquer le scroll du body quand ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleDigit = useCallback((digit) => {
    setDisplayValue(prev => {
      // Si on a un décimal, vérifier le nombre de décimales
      if (prev.includes('.')) {
        const parts = prev.split('.');
        if (parts[1].length >= maxDecimals) return prev;
      }
      
      // Remplacer le 0 initial
      if (prev === '0' && digit !== '0') {
        return digit;
      }
      
      // Éviter les zéros multiples au début
      if (prev === '0' && digit === '0') {
        return prev;
      }
      
      // Vérifier la valeur max
      const newValue = prev + digit;
      if (parseFloat(newValue) > maxValue) return prev;
      
      return newValue;
    });
  }, [maxDecimals, maxValue]);

  const handleDecimal = useCallback(() => {
    if (!allowDecimals || hasDecimal) return;
    
    setDisplayValue(prev => prev + '.');
    setHasDecimal(true);
  }, [allowDecimals, hasDecimal]);

  const handleBackspace = useCallback(() => {
    setDisplayValue(prev => {
      if (prev.length === 1) {
        setHasDecimal(false);
        return '0';
      }
      
      const newValue = prev.slice(0, -1);
      setHasDecimal(newValue.includes('.'));
      return newValue;
    });
  }, []);

  const handleClear = useCallback(() => {
    setDisplayValue('0');
    setHasDecimal(false);
    setIsNegative(false);
  }, []);

  const toggleNegative = useCallback(() => {
    if (allowNegative) {
      setIsNegative(prev => !prev);
    }
  }, [allowNegative]);

  const handleConfirm = useCallback(() => {
    let numericValue = parseFloat(displayValue) || 0;
    if (isNegative) numericValue = -numericValue;
    onConfirm(numericValue);
    onClose();
  }, [displayValue, isNegative, onConfirm, onClose]);

  // Formater l'affichage avec séparateurs de milliers
  const formatDisplay = (value) => {
    const parts = value.split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;
  };

  // Générer les couleurs dérivées de accentColor
  const getAccentGradient = () => {
    return `linear-gradient(135deg, ${accentColor} 0%, ${adjustColor(accentColor, -20)} 100%)`;
  };

  const getAccentShadow = () => {
    return `0 4px 15px ${accentColor}66`;
  };

  // Fonction pour assombrir une couleur
  const adjustColor = (color, amount) => {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
  };

  if (!isOpen) return null;

  const buttonStyle = {
    base: {
      width: '72px',
      height: '72px',
      borderRadius: '50%',
      border: 'none',
      fontSize: '1.5rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      userSelect: 'none',
      WebkitTapHighlightColor: 'transparent',
    },
    digit: {
      background: 'rgba(255, 255, 255, 0.1)',
      color: 'white',
    },
    action: {
      background: 'rgba(255, 255, 255, 0.05)',
      color: '#9ca3af',
    },
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      {/* Backdrop */}
      <div 
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)',
        }}
      />
      
      {/* Modal */}
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '340px',
          background: 'linear-gradient(180deg, #040449 0%, #100261 100%)',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
          border: `2px solid ${accentColor}40`,
          animation: 'slideUp 0.3s ease',
        }}
      >
        {/* Titre */}
        {title && (
          <div style={{
            textAlign: 'center',
            marginBottom: '16px',
            color: '#9ca3af',
            fontSize: '0.9rem',
            fontWeight: '500',
          }}>
            {title}
          </div>
        )}

        {/* Affichage du montant */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          textAlign: 'center',
          border: `1px solid ${accentColor}30`,
        }}>
          <div style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: isNegative ? '#ef4444' : 'white',
            fontFamily: 'monospace',
            letterSpacing: '-1px',
          }}>
            {isNegative && '-'}{currency}{formatDisplay(displayValue)}
          </div>
        </div>

        {/* Numpad */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          justifyItems: 'center',
          marginBottom: '20px',
        }}>
          {/* Ligne 1: 1, 2, 3 */}
          {['1', '2', '3'].map(digit => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              style={{ ...buttonStyle.base, ...buttonStyle.digit }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
              onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {digit}
            </button>
          ))}
          
          {/* Ligne 2: 4, 5, 6 */}
          {['4', '5', '6'].map(digit => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              style={{ ...buttonStyle.base, ...buttonStyle.digit }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
              onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {digit}
            </button>
          ))}
          
          {/* Ligne 3: 7, 8, 9 */}
          {['7', '8', '9'].map(digit => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              style={{ ...buttonStyle.base, ...buttonStyle.digit }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
              onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {digit}
            </button>
          ))}
          
          {/* Ligne 4: ./±, 0, ⌫ */}
          <button
            onClick={allowNegative ? toggleNegative : (allowDecimals ? handleDecimal : handleClear)}
            disabled={allowDecimals && !allowNegative && hasDecimal}
            style={{ 
              ...buttonStyle.base, 
              ...buttonStyle.action,
              opacity: (allowDecimals && !allowNegative && hasDecimal) ? 0.3 : 1,
              color: allowNegative && isNegative ? '#ef4444' : '#9ca3af',
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {allowNegative ? '±' : (allowDecimals ? '.' : 'C')}
          </button>
          
          <button
            onClick={() => handleDigit('0')}
            style={{ ...buttonStyle.base, ...buttonStyle.digit }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            0
          </button>
          
          <button
            onClick={handleBackspace}
            style={{ ...buttonStyle.base, ...buttonStyle.action }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            ⌫
          </button>
        </div>

        {/* Bouton décimal si allowNegative est activé */}
        {allowNegative && allowDecimals && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            marginBottom: '16px' 
          }}>
            <button
              onClick={handleDecimal}
              disabled={hasDecimal}
              style={{ 
                padding: '8px 24px',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.05)',
                color: hasDecimal ? 'rgba(255,255,255,0.3)' : 'white',
                fontSize: '0.9rem',
                cursor: hasDecimal ? 'not-allowed' : 'pointer',
              }}
            >
              . {t('numpad.decimal', 'Décimal')}
            </button>
          </div>
        )}

        {/* Boutons d'action */}
        <div style={{
          display: 'flex',
          gap: '12px',
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              background: 'transparent',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t('common.cancel', 'Annuler')}
          </button>
          
          <button
            onClick={handleConfirm}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: getAccentGradient(),
              color: 'white',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: getAccentShadow(),
            }}
          >
            {t('common.confirm', 'Confirmer')}
          </button>
        </div>
      </div>

      {/* Animation CSS */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

NumpadModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  initialValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  title: PropTypes.string,
  currency: PropTypes.string,
  maxValue: PropTypes.number,
  allowDecimals: PropTypes.bool,
  maxDecimals: PropTypes.number,
  allowNegative: PropTypes.bool,
  accentColor: PropTypes.string,
};

export default NumpadModal;
