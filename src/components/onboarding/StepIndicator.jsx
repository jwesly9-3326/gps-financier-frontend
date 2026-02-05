// 📊 STEP INDICATOR SIMPLIFIÉ - 3 étapes visuelles
// Profile (fait dans Register) → Account → Goal (🧭)
// Affiche la progression dans l'onboarding simplifié

import { useTranslation } from 'react-i18next';
import { useOnboarding } from '../../context/OnboardingContext';

const StepIndicator = () => {
  const { currentStep, goToStep, formData } = useOnboarding();
  const { t } = useTranslation();

  // Configuration des 3 étapes visuelles
  // Note: currentStep 0 = Account (step visuel 2), currentStep 1 = Goal (step visuel 3)
  // Profile (step visuel 1) est toujours complété car fait dans Register
  const steps = [
    { 
      id: 1, 
      label: t('onboarding.stepIndicator.profile'), 
      icon: '👤',
      color: '#ff9800',
      // Profile est toujours complété (fait dans Register)
      isComplete: () => true,
      isActive: false
    },
    { 
      id: 2, 
      label: t('onboarding.stepIndicator.account'), 
      icon: '💼',
      color: '#ff9800',
      isComplete: () => formData.accounts.length > 0 && formData.initialBalances.soldes.length > 0,
      isActive: currentStep === 0
    },
    { 
      id: 3, 
      label: t('onboarding.stepIndicator.goal'), 
      icon: '🧭',
      color: '#ff9800',
      isComplete: () => formData.financialGoals.length > 0,
      isActive: currentStep === 1
    }
  ];

  // L'étape actuelle dans le contexte des 3 étapes visuelles
  // currentStep 0 = Account (index 1), currentStep 1 = Goal (index 2)
  // Profile (index 0) est toujours complété
  const activeStepIndex = currentStep + 1; // 1 ou 2 (jamais 0 car Profile est fait)

  return (
    <div style={{
      background: 'transparent',
      padding: '15px 30px 5px',
      // 📱 PWA: safe-area, Navigateur mobile: 40px pour dégager la barre d'état
      paddingTop: window.matchMedia('(display-mode: standalone)').matches 
        ? 'max(50px, env(safe-area-inset-top, 50px))' 
        : (window.innerWidth < 768 ? '40px' : '15px'),
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        {/* Étapes avec ligne de connexion */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative'
        }}>
          {/* Ligne de fond */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '40px',
            right: '40px',
            height: '3px',
            background: 'rgba(255,255,255,0.2)',
            zIndex: 0
          }}></div>

          {/* Ligne de progression */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '40px',
            width: `calc(${(activeStepIndex / 2) * 100}% - ${activeStepIndex === 0 ? 0 : 40}px)`,
            height: '3px',
            background: 'linear-gradient(90deg, #ffd700 0%, #ff8c00 100%)',
            zIndex: 1,
            transition: 'width 0.5s ease'
          }}></div>

          {/* Étapes */}
          {steps.map((step, index) => {
            const isActive = step.isActive;
            const isCompleted = index < activeStepIndex; // Étapes AVANT l'active sont complétées
            const isClickable = isCompleted && index > 0; // Ne peut pas revenir à Profile

            return (
              <div
                key={step.id}
                onClick={() => {
                  // Ne peut revenir qu'à Account (index 1 = context step 0)
                  if (isClickable && index === 1) {
                    goToStep(0);
                  }
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: isClickable ? 'pointer' : 'default',
                  zIndex: 2,
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (isClickable) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {/* Cercle de l'étape */}
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive 
                    ? `linear-gradient(135deg, ${step.color} 0%, ${step.color}dd 100%)`
                    : isCompleted 
                      ? '#4CAF50' 
                      : 'white',
                  border: isActive || isCompleted 
                    ? 'none' 
                    : '3px solid rgba(255,255,255,0.3)',
                  boxShadow: isActive 
                    ? `0 4px 15px ${step.color}40` 
                    : isCompleted 
                      ? '0 2px 8px rgba(76, 175, 80, 0.3)' 
                      : 'none',
                  transition: 'all 0.3s ease'
                }}>
                  {isCompleted && !isActive ? (
                    <span style={{ color: 'white', fontSize: '1.2em' }}>✓</span>
                  ) : (
                    <span style={{ 
                      fontSize: '1.3em',
                      filter: isActive || isCompleted ? 'none' : 'grayscale(1) opacity(0.5)'
                    }}>
                      {step.icon}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span style={{
                  marginTop: '8px',
                  fontSize: '0.85em',
                  fontWeight: isActive ? '700' : '500',
                  color: isActive ? step.color : isCompleted ? '#4CAF50' : 'rgba(255,255,255,0.7)',
                  transition: 'all 0.3s'
                }}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Indicateur de temps */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '10px'
        }}>
          <span style={{
            fontSize: '0.8em',
            color: 'rgba(255,255,255,0.8)',
            background: 'rgba(255,255,255,0.1)',
            padding: '4px 12px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <span>⏱️</span>
            <span>~{2 - currentStep} {t('onboarding.stepIndicator.minRemaining')}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default StepIndicator;
