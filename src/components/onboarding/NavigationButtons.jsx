// 🧭 NAVIGATION BUTTONS - Boutons Précédent / Suivant

import { useOnboarding } from '../../context/OnboardingContext';

const NavigationButtons = ({ 
  hideBack = false, 
  nextLabel = 'Suivant',
  backLabel = 'Précédent',
  onNextClick = null // Fonction custom pour validation avant next
}) => {
  const { currentStep, goNext, goBack, isSaving, currentAccountIndex, formData } = useOnboarding();

  const handleNext = async () => {
    if (onNextClick) {
      const canProceed = await onNextClick();
      if (!canProceed) return;
    }
    goNext();
  };

  // Label spécial pour l'étape 3 (navigation par compte)
  const getNextLabel = () => {
    if (currentStep === 3 && currentAccountIndex < formData.accounts.length - 1) {
      return 'Compte suivant →';
    }
    if (currentStep === 7) {
      return '🚀 Générer mon Pl4to';
    }
    return nextLabel;
  };

  const getBackLabel = () => {
    if (currentStep === 3 && currentAccountIndex > 0) {
      return '← Compte précédent';
    }
    return backLabel;
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '30px 0',
      marginTop: '40px',
      borderTop: '2px solid #e0e0e0'
    }}>
      {/* Bouton Précédent */}
      {!hideBack && currentStep > 0 && (
        <button
          onClick={goBack}
          disabled={isSaving}
          style={{
            padding: '15px 35px',
            fontSize: '1em',
            fontWeight: '600',
            color: '#2c3e50',
            background: 'white',
            border: '2px solid #bdc3c7',
            borderRadius: '10px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: isSaving ? 0.5 : 1
          }}
          onMouseEnter={(e) => {
            if (!isSaving) {
              e.currentTarget.style.background = '#ecf0f1';
              e.currentTarget.style.borderColor = '#7f8c8d';
              e.currentTarget.style.transform = 'translateX(-5px)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.borderColor = '#bdc3c7';
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          ← {getBackLabel()}
        </button>
      )}

      {/* Spacer si pas de bouton précédent */}
      {(hideBack || currentStep === 0) && <div></div>}

      {/* Indicateur de sauvegarde */}
      {isSaving && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#7f8c8d',
          fontSize: '0.9em',
          fontStyle: 'italic'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '3px solid #3498db',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          Sauvegarde en cours...
        </div>
      )}

      {/* Bouton Suivant */}
      <button
        onClick={handleNext}
        disabled={isSaving}
        style={{
          padding: '15px 35px',
          fontSize: '1em',
          fontWeight: '600',
          color: 'white',
          background: currentStep === 7 
            ? 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)'
            : 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
          border: 'none',
          borderRadius: '10px',
          cursor: isSaving ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 15px rgba(52, 152, 219, 0.3)',
          opacity: isSaving ? 0.5 : 1
        }}
        onMouseEnter={(e) => {
          if (!isSaving) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(52, 152, 219, 0.4)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(52, 152, 219, 0.3)';
        }}
      >
        {getNextLabel()} →
      </button>

      {/* Animation spin pour le loader */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default NavigationButtons;