// 🎉 TRIAL WELCOME MODAL
// Modal pour les rappels trial: welcome, reminder_7days, reminder_2days
// Utilise trialService pour persister en BDD

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import trialService from '../../services/trial.service';

// Logo O animé (identique au Header - style Anneau de Sauron)
const AnimatedO = ({ size = 80, bgColor = '#1e1b4b' }) => (
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
      border: '6px solid transparent',
      background: `linear-gradient(${bgColor}, ${bgColor}) padding-box, linear-gradient(180deg, #ffd700, #ff8c00, #ff4500, #ffd700) border-box`,
      animation: 'gps-ring-spin 3s linear infinite',
      boxShadow: '0 0 20px rgba(255, 165, 0, 0.6)'
    }} />
  </div>
);

/**
 * TrialWelcomeModal - Modal pour les rappels trial
 * @param {boolean} isOpen - Si le modal est ouvert
 * @param {function} onClose - Callback de fermeture
 * @param {string} popupType - Type de popup: 'welcome' | 'reminder_7days' | 'reminder_2days'
 * @param {number} daysRemaining - Jours restants dans le trial
 */
const TrialWelcomeModal = ({ isOpen, onClose, popupType = 'welcome', daysRemaining = 14 }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isClosing, setIsClosing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Empêcher le scroll du body quand le modal est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handler pour fermer avec une action
  const handleClose = async (action) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setIsClosing(true);
    
    try {
      // Enregistrer l'action en BDD via trialService
      switch (action) {
        case 'ignored':
          await trialService.markWelcomeIgnored();
          break;
        case 'remind7days':
          await trialService.scheduleReminder7Days();
          break;
        case 'reminder7days_shown':
          await trialService.markReminder7DaysShown();
          break;
        case 'reminder2days_shown':
          await trialService.markReminder2DaysShown();
          break;
        default:
          console.log(`[Trial Modal] Action non gérée: ${action}`);
      }
    } catch (error) {
      console.error('[Trial Modal] Erreur enregistrement action:', error);
    }
    
    setTimeout(() => {
      setIsClosing(false);
      setIsLoading(false);
      onClose(action);
    }, 300);
  };

  // Handler pour choisir un plan
  const handleChoosePlan = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Marquer selon le type de popup affiché
      if (popupType === 'reminder_7days') {
        await trialService.markReminder7DaysShown();
      } else if (popupType === 'reminder_2days') {
        await trialService.markReminder2DaysShown();
      }
    } catch (error) {
      console.error('[Trial Modal] Erreur:', error);
    }
    
    setIsLoading(false);
    onClose('choosePlan');
    navigate('/parametres', { state: { section: 'abonnement' } });
  };

  if (!isOpen) return null;

  // Configuration selon le type de popup
  const isUrgent = popupType === 'reminder_2days';
  const isReminder = popupType === 'reminder_7days';
  
  // Couleurs selon l'urgence
  const gradientColors = isUrgent 
    ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)' // Rouge urgent
    : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)'; // Violet normal
  
  const borderColor = isUrgent ? '#ef4444' : '#FFD700';
  const shadowColor = isUrgent ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 215, 0, 0.3)';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px',
        opacity: isClosing ? 0 : 1,
        transition: 'opacity 0.3s ease'
      }}
      onClick={() => handleClose(popupType === 'reminder_2days' ? 'reminder2days_shown' : 'ignored')}
    >
      <div
        style={{
          background: gradientColors,
          borderRadius: '20px',
          padding: '35px',
          maxWidth: '500px',
          width: '100%',
          border: `2px solid ${borderColor}`,
          boxShadow: `0 0 40px ${shadowColor}, 0 0 80px rgba(30, 27, 75, 0.5)`,
          transform: isClosing ? 'scale(0.95)' : 'scale(1)',
          transition: 'transform 0.3s ease',
          animation: !isClosing ? 'modal-appear 0.4s ease' : 'none'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Logo O */}
        <div style={{ textAlign: 'center', marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
          <AnimatedO size={80} bgColor={isUrgent ? '#7f1d1d' : '#1e1b4b'} />
        </div>

        {/* ===== POPUP WELCOME ===== */}
        {popupType === 'welcome' && (
          <>
            <h2 style={{
              color: '#fff',
              textAlign: 'center',
              fontSize: '1.8em',
              marginBottom: '15px',
              fontWeight: '700'
            }}>
              {t('trial.welcome.title')}
            </h2>

            <p style={{
              color: 'rgba(255, 255, 255, 0.9)',
              textAlign: 'center',
              fontSize: '1.1em',
              lineHeight: '1.6',
              marginBottom: '25px'
            }}>
              {t('trial.welcome.message')}
            </p>

            {/* Encadré Beta Founders */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 165, 0, 0.15) 100%)',
              border: '1px solid rgba(255, 215, 0, 0.5)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '25px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                marginBottom: '10px',
                flexWrap: 'wrap'
              }}>
                <span style={{ fontSize: '1.5em' }}>🏷️</span>
                <span style={{ color: '#FFD700', fontWeight: '700', fontSize: '1.1em' }}>
                  {t('trial.welcome.betaTitle')}
                </span>
                <span style={{
                  background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                  color: '#1e1b4b',
                  padding: '3px 10px',
                  borderRadius: '10px',
                  fontSize: '0.75em',
                  fontWeight: '700'
                }}>
                  {t('trial.welcome.limited')}
                </span>
              </div>
              <div style={{ color: '#fff', fontSize: '1.3em', fontWeight: '600', textAlign: 'center' }}>
                {t('trial.welcome.price')}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9em', textAlign: 'center', marginTop: '5px' }}>
                {t('trial.welcome.priceNote')}
              </div>
            </div>

            <p style={{
              color: 'rgba(255, 255, 255, 0.7)',
              textAlign: 'center',
              fontSize: '0.9em',
              marginBottom: '25px',
              fontStyle: 'italic'
            }}>
              {t('trial.welcome.expirationNote')}
            </p>
          </>
        )}

        {/* ===== POPUP REMINDER 7 DAYS ===== */}
        {popupType === 'reminder_7days' && (
          <>
            <h2 style={{
              color: '#fff',
              textAlign: 'center',
              fontSize: '1.8em',
              marginBottom: '15px',
              fontWeight: '700'
            }}>
              {t('trial.reminder7days.title')}
            </h2>

            <p style={{
              color: 'rgba(255, 255, 255, 0.9)',
              textAlign: 'center',
              fontSize: '1.1em',
              lineHeight: '1.6',
              marginBottom: '15px'
            }}>
              {t('trial.reminder7days.message')}
            </p>

            {/* Badge jours restants */}
            <div style={{
              background: 'rgba(255, 215, 0, 0.2)',
              border: '1px solid rgba(255, 215, 0, 0.5)',
              borderRadius: '20px',
              padding: '10px 20px',
              textAlign: 'center',
              marginBottom: '20px'
            }}>
              <span style={{ color: '#FFD700', fontWeight: '700', fontSize: '1.2em' }}>
                ⏱️ {t('trial.reminder7days.daysLeft', { days: daysRemaining })}
              </span>
            </div>

            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              textAlign: 'center',
              fontSize: '1em',
              marginBottom: '25px'
            }}>
              {t('trial.reminder7days.subtitle')}
            </p>
          </>
        )}

        {/* ===== POPUP REMINDER 2 DAYS (URGENT) ===== */}
        {popupType === 'reminder_2days' && (
          <>
            <h2 style={{
              color: '#fff',
              textAlign: 'center',
              fontSize: '1.8em',
              marginBottom: '15px',
              fontWeight: '700'
            }}>
              {t('trial.reminder2days.title')}
            </h2>

            <p style={{
              color: 'rgba(255, 255, 255, 0.9)',
              textAlign: 'center',
              fontSize: '1.1em',
              lineHeight: '1.6',
              marginBottom: '15px'
            }}>
              {t('trial.reminder2days.message', { days: daysRemaining })}
            </p>

            {/* Badge URGENT */}
            <div style={{
              background: 'rgba(239, 68, 68, 0.3)',
              border: '2px solid #ef4444',
              borderRadius: '12px',
              padding: '15px',
              textAlign: 'center',
              marginBottom: '20px',
              animation: 'pulse-urgent 2s infinite'
            }}>
              <span style={{ color: '#fca5a5', fontWeight: '700', fontSize: '1.1em' }}>
                ⚠️ {t('trial.reminder2days.urgent')}
              </span>
            </div>

            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              textAlign: 'center',
              fontSize: '1em',
              marginBottom: '25px'
            }}>
              {t('trial.reminder2days.subtitle')}
            </p>
          </>
        )}

        {/* ===== BOUTONS ===== */}
        <div style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {/* Bouton Ignorer/Plus tard */}
          <button
            onClick={() => handleClose(
              popupType === 'reminder_2days' ? 'reminder2days_shown' : 
              popupType === 'reminder_7days' ? 'reminder7days_shown' : 'ignored'
            )}
            disabled={isLoading}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'rgba(255, 255, 255, 0.7)',
              padding: '12px 20px',
              borderRadius: '25px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.95em',
              transition: 'all 0.3s ease',
              opacity: isLoading ? 0.5 : 1
            }}
            onMouseOver={(e) => {
              if (!isLoading) {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                e.target.style.color = '#fff';
              }
            }}
            onMouseOut={(e) => {
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              e.target.style.color = 'rgba(255, 255, 255, 0.7)';
            }}
          >
            {popupType === 'welcome' && t('trial.welcome.ignore')}
            {popupType === 'reminder_7days' && t('trial.reminder7days.ignore')}
            {popupType === 'reminder_2days' && t('trial.reminder2days.ignore')}
          </button>

          {/* Bouton Rappel 7 jours (seulement pour welcome et reminder_7days) */}
          {(popupType === 'welcome' || popupType === 'reminder_7days') && (
            <button
              onClick={() => handleClose('remind7days')}
              disabled={isLoading}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#fff',
                padding: '12px 20px',
                borderRadius: '25px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '0.95em',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: isLoading ? 0.5 : 1
              }}
              onMouseOver={(e) => {
                if (!isLoading) e.target.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <span>🔔</span>
              {popupType === 'welcome' ? t('trial.welcome.remind') : t('trial.reminder7days.remind')}
            </button>
          )}

          {/* Bouton Choisir un plan */}
          <button
            onClick={handleChoosePlan}
            disabled={isLoading}
            style={{
              background: isUrgent 
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              border: 'none',
              color: isUrgent ? '#fff' : '#1e1b4b',
              padding: '12px 25px',
              borderRadius: '25px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.95em',
              fontWeight: '700',
              boxShadow: isUrgent 
                ? '0 4px 15px rgba(239, 68, 68, 0.4)'
                : '0 4px 15px rgba(255, 215, 0, 0.4)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: isLoading ? 0.5 : 1
            }}
            onMouseOver={(e) => {
              if (!isLoading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = isUrgent 
                  ? '0 6px 20px rgba(239, 68, 68, 0.5)'
                  : '0 6px 20px rgba(255, 215, 0, 0.5)';
              }
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = isUrgent 
                ? '0 4px 15px rgba(239, 68, 68, 0.4)'
                : '0 4px 15px rgba(255, 215, 0, 0.4)';
            }}
          >
            {popupType === 'welcome' && t('trial.welcome.choosePlan')}
            {popupType === 'reminder_7days' && t('trial.reminder7days.choosePlan')}
            {popupType === 'reminder_2days' && t('trial.reminder2days.choosePlan')}
            <span>→</span>
          </button>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes modal-appear {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        @keyframes gps-ring-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        @keyframes pulse-urgent {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default TrialWelcomeModal;
