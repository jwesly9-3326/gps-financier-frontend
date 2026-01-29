// 🎯 ONBOARDING FLOW SIMPLIFIÉ - 2 étapes (2-3 minutes)
// Flow: Register (Profile) → FirstAccount → FirstGoal → Dashboard
// Note: L'étape "Profile" est maintenant gérée par Register.jsx

import { useState, useEffect } from 'react';
import { OnboardingProvider, useOnboarding } from '../../context/OnboardingContext';
import { useTranslation } from 'react-i18next';
import StepIndicator from '../../components/onboarding/StepIndicator';

// Pages de l'onboarding simplifié (Welcome et UserInfo supprimés)
import FirstAccount from './FirstAccount';
import FirstGoal from './FirstGoal';

// 🎬 Composant LoadingScreen animé - 16 secondes (4s par étape)
const AnimatedLoadingScreen = ({ t }) => {
  const [activeStep, setActiveStep] = useState(0);
  
  // Icônes pour chaque étape
  const stepIcons = ['👤', '📊', '🛤️', '🧭'];
  
  // Animation: changer d'étape toutes les 4 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => {
        if (prev < 3) return prev + 1;
        return prev; // Reste sur la dernière étape
      });
    }, 4000); // 4 secondes par étape
    
    return () => clearInterval(interval);
  }, []);
  
  const steps = [
    { key: 'accounts', label: t('onboarding.loading.steps.accounts') },
    { key: 'budget', label: t('onboarding.loading.steps.budget') },
    { key: 'trajectory', label: t('onboarding.loading.steps.trajectory') },
    { key: 'complete', label: t('onboarding.loading.steps.complete') }
  ];
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(180deg, #040449 0%, #100261 50%, #040449 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      {/* Icône centrale animée */}
      <div style={{
        position: 'relative',
        width: '120px',
        height: '120px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '30px'
      }}>
        {/* Ring animé */}
        <div style={{
          position: 'absolute',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          border: '6px solid transparent',
          background: 'linear-gradient(#040449, #040449) padding-box, linear-gradient(180deg, #ffd700, #ffb800, #ffa500, #ffd700) border-box',
          animation: 'gps-ring-spin 2s linear infinite',
          boxShadow: '0 0 40px rgba(255, 165, 0, 0.6)'
        }} />
        {/* Icône qui change */}
        <span style={{
          fontSize: '3em',
          zIndex: 1,
          animation: 'pulse 1s ease-in-out infinite'
        }}>
          {stepIcons[activeStep]}
        </span>
      </div>

      <h2 style={{
        color: 'white',
        fontSize: '1.8em',
        fontWeight: 'bold',
        marginBottom: '15px',
        textAlign: 'center'
      }}>
        {t('onboarding.loading.title')}
      </h2>

      {/* Progress steps animés */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginTop: '20px'
      }}>
        {steps.map((step, index) => {
          const isCompleted = index < activeStep;
          const isActive = index === activeStep;
          const isPending = index > activeStep;
          
          return (
            <div 
              key={step.key}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                color: isCompleted ? '#4ade80' : isActive ? '#fbbf24' : 'rgba(255,255,255,0.4)',
                transition: 'all 0.5s ease',
                transform: isActive ? 'scale(1.05)' : 'scale(1)'
              }}
            >
              <span style={{ 
                fontSize: '1.2em',
                animation: isActive ? 'spin 1s linear infinite' : 'none'
              }}>
                {isCompleted ? '✅' : isActive ? '🔄' : '⏳'}
              </span>
              <span style={{ 
                fontSize: '1em',
                fontWeight: isActive ? 'bold' : 'normal'
              }}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <p style={{
        color: 'rgba(255,255,255,0.7)',
        fontSize: '0.95em',
        marginTop: '40px',
        textAlign: 'center',
        maxWidth: '300px',
        lineHeight: '1.5'
      }}>
        {t('onboarding.loading.subtitle')}
      </p>

      {/* CSS Animation */}
      <style>{`
        @keyframes gps-ring-spin {
          0% {
            transform: rotate(0deg);
            box-shadow: 0 0 30px rgba(255, 165, 0, 0.5);
          }
          50% {
            box-shadow: 0 0 50px rgba(255, 165, 0, 0.8), 0 0 70px rgba(255, 69, 0, 0.4);
          }
          100% {
            transform: rotate(360deg);
            box-shadow: 0 0 30px rgba(255, 165, 0, 0.5);
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};

const OnboardingContent = () => {
  const { currentStep, isLoading } = useOnboarding();
  const { t } = useTranslation();

  // Render de l'étape courante (2 étapes: FirstAccount et FirstGoal)
  const renderStep = () => {
    switch(currentStep) {
      case 0:
        return <FirstAccount />;
      case 1:
        return <FirstGoal />;
      default:
        return <FirstAccount />;
    }
  };

  // Loading overlay pendant la finalisation - 16 secondes animées
  if (isLoading) {
    return <AnimatedLoadingScreen t={t} />;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #040449 0%, #100261 50%, #040449 100%)',
      zIndex: 1000
    }}>
      {/* Step Indicator - Toujours affiché */}
      <StepIndicator />

      {/* Contenu de l'étape courante */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 'env(safe-area-inset-bottom, 20px)'
      }}>
        {renderStep()}
      </div>
    </div>
  );
};

// Composant wrapper avec Provider
const OnboardingFlow = () => {
  return (
    <OnboardingProvider>
      <OnboardingContent />
    </OnboardingProvider>
  );
};

export default OnboardingFlow;