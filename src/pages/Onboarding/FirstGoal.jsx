// 🧭 FIRST GOAL - Étape 2 de l'onboarding
// Premier objectif financier - Style GPS Sombre

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useOnboarding } from '../../context/OnboardingContext';
import NumpadModal from '../../components/common/NumpadModal';

const FirstGoal = () => {
  const { formData, addFirstGoal, updateFirstGoal, goNextAfterSave, goBack, getProgressPercentage, isLoading } = useOnboarding();
  const { t } = useTranslation();
  
  // État local pour le formulaire
  const [goal, setGoal] = useState({
    nom: '',
    type: 'epargne',
    montantCible: '',
    dateEcheance: '',
    priorite: 'moyenne',
    compteAssocie: '',
    notes: ''
  });

  // État pour le NumPad Modal
  const [showNumpad, setShowNumpad] = useState(false);

  // Charger les données existantes si disponibles
  useEffect(() => {
    if (formData.financialGoals.length > 0) {
      const existingGoal = formData.financialGoals[0];
      setGoal({
        nom: existingGoal.nom || '',
        type: existingGoal.type || 'epargne',
        montantCible: existingGoal.montantCible || '',
        dateEcheance: existingGoal.dateEcheance || '',
        priorite: existingGoal.priorite || 'moyenne',
        compteAssocie: existingGoal.compteAssocie || '',
        notes: existingGoal.notes || ''
      });
    }
    
    // Pré-remplir le compte associé si disponible
    if (formData.accounts.length > 0 && !goal.compteAssocie) {
      setGoal(prev => ({
        ...prev,
        compteAssocie: formData.accounts[0].nom
      }));
    }
  }, [formData.accounts]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!goal.nom) {
      alert(t('onboarding.firstGoal.validation.name'));
      return;
    }
    
    if (!goal.montantCible || parseFloat(goal.montantCible) <= 0) {
      alert(t('onboarding.firstGoal.validation.amount'));
      return;
    }

    // Sauvegarder
    if (formData.financialGoals.length > 0) {
      updateFirstGoal(goal);
    } else {
      addFirstGoal(goal);
    }
    
    // ✅ FIX: Utiliser goNextAfterSave pour s'assurer que le state est mis à jour avant finalizeOnboarding
    goNextAfterSave();
  };

  // Callback NumPad
  const handleNumpadConfirm = (value) => {
    setGoal({...goal, montantCible: value});
    setShowNumpad(false);
  };

  // Suggestions d'objectifs populaires
  const goalSuggestions = [
    { nom: t('onboarding.firstGoal.goalTypes.emergency'), type: 'epargne', icon: '🛡️' },
    { nom: t('onboarding.firstGoal.goalTypes.vacation'), type: 'epargne', icon: '✈️' },
    { nom: t('onboarding.firstGoal.goalTypes.house'), type: 'achat', icon: '🏠' },
    { nom: t('onboarding.firstGoal.goalTypes.car'), type: 'achat', icon: '🚗' },
    { nom: t('onboarding.firstGoal.goalTypes.retirement'), type: 'retraite', icon: '🏖️' },
    { nom: t('onboarding.firstGoal.goalTypes.education'), type: 'epargne', icon: '🎓' }
  ];

  const applyGoalSuggestion = (suggestion) => {
    setGoal(prev => ({
      ...prev,
      nom: suggestion.nom,
      type: suggestion.type
    }));
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        maxWidth: '700px',
        margin: '0 auto',
        padding: '0 20px 20px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        {/* Progress Bar */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
            fontSize: '0.9em',
            color: 'rgba(255,255,255,0.8)'
          }}>
            <span>{t('onboarding.step', { current: 3, total: 3 })}</span>
            <span>{getProgressPercentage()}% {t('onboarding.completed')}</span>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${getProgressPercentage()}%`,
              background: 'linear-gradient(90deg, #ffd700 0%, #ff8c00 100%)',
              transition: 'width 0.3s ease',
              borderRadius: '10px'
            }}></div>
          </div>
        </div>

        {/* En-tête */}
        <div style={{
          textAlign: 'center',
          marginBottom: '15px'
        }}>
          {/* Logo O avec icône boussole 🧭 */}
          <div style={{
            position: 'relative',
            width: '60px',
            height: '60px',
            margin: '0 auto 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              position: 'absolute',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              border: '4px solid transparent',
              background: 'linear-gradient(#040449, #040449) padding-box, linear-gradient(180deg, #ffd700, #ffb800, #ffa500, #ffd700) border-box',
              animation: 'gps-ring-spin 3s linear infinite',
              boxShadow: '0 0 25px rgba(255, 165, 0, 0.5)'
            }} />
            <span style={{ fontSize: '1.5em', position: 'relative', zIndex: 1 }}>🧭</span>
          </div>
          
          <h1 style={{
            fontSize: '1.3em',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '5px',
            fontFamily: "'Poppins', sans-serif"
          }}>
            {t('onboarding.firstGoal.title')}
          </h1>
          
          <p style={{
            fontSize: '0.9em',
            color: 'rgba(255,255,255,0.8)',
            lineHeight: '1.4'
          }}>
            💡 {t('onboarding.firstGoal.subtitle')}
          </p>
        </div>

        {/* Suggestions rapides - Style sombre */}
        <div style={{ marginBottom: '10px' }}>
          <p style={{
            fontSize: '0.9em',
            color: 'rgba(255,255,255,0.8)',
            marginBottom: '12px'
          }}>
            {t('onboarding.firstGoal.suggestions')}:
          </p>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            {goalSuggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => applyGoalSuggestion(suggestion)}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.8em',
                  fontWeight: '500',
                  color: goal.nom === suggestion.nom ? 'white' : 'rgba(255,255,255,0.8)',
                  background: goal.nom === suggestion.nom 
                    ? 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)' 
                    : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${goal.nom === suggestion.nom ? '#9b59b6' : 'rgba(255,255,255,0.3)'}`,
                  borderRadius: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  if (goal.nom !== suggestion.nom) {
                    e.currentTarget.style.borderColor = '#9b59b6';
                    e.currentTarget.style.background = 'rgba(155, 89, 182, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (goal.nom !== suggestion.nom) {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  }
                }}
              >
                <span>{suggestion.icon}</span>
                <span>{suggestion.nom}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Formulaire - Style GPS Sombre */}
        <form onSubmit={handleSubmit}>
          <div style={{
            background: 'linear-gradient(180deg, rgba(4, 4, 73, 0.9) 0%, rgba(16, 2, 97, 0.9) 100%)',
            borderRadius: '15px',
            padding: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            border: '1px solid rgba(155, 89, 182, 0.3)'
          }}>
            {/* Nom de l'objectif */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.9)',
                marginBottom: '6px',
                fontSize: '0.9em'
              }}>
                {t('onboarding.firstGoal.goalName')} <span style={{ color: '#ff6b6b' }}>*</span>
              </label>
              <input
                type="text"
                value={goal.nom}
                onChange={(e) => setGoal({...goal, nom: e.target.value})}
                placeholder={t('onboarding.firstGoal.goalNamePlaceholder')}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '1em',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  transition: 'all 0.3s',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'white'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#9b59b6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(155, 89, 182, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Type d'objectif */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.9)',
                marginBottom: '6px',
                fontSize: '0.9em'
              }}>
                {t('onboarding.firstGoal.goalType')}
              </label>
              <select
                value={goal.type}
                onChange={(e) => setGoal({...goal, type: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '1em',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  transition: 'all 0.3s',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="epargne" style={{ background: '#1a1a2e' }}>💰 {t('onboarding.firstGoal.typeOptions.savings')}</option>
                <option value="dette" style={{ background: '#1a1a2e' }}>💳 {t('onboarding.firstGoal.typeOptions.debt')}</option>
                <option value="investissement" style={{ background: '#1a1a2e' }}>📈 {t('onboarding.firstGoal.typeOptions.investment')}</option>
                <option value="achat" style={{ background: '#1a1a2e' }}>🛒 {t('onboarding.firstGoal.typeOptions.purchase')}</option>
                <option value="retraite" style={{ background: '#1a1a2e' }}>🏖️ {t('onboarding.firstGoal.typeOptions.retirement')}</option>
              </select>
            </div>

            {/* Montant cible - BOUTON NUMPAD VIOLET */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.9)',
                marginBottom: '6px',
                fontSize: '0.9em'
              }}>
                🧭 {t('onboarding.firstGoal.targetAmount')} <span style={{ color: '#ff6b6b' }}>*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowNumpad(true)}
                style={{
                  width: '100%',
                  padding: '15px 18px',
                  fontSize: '1.2em',
                  fontWeight: 'bold',
                  border: '3px solid #9b59b6',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  background: 'rgba(155, 89, 182, 0.15)',
                  color: goal.montantCible ? '#9b59b6' : 'rgba(255,255,255,0.5)',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.3s',
                  boxShadow: '0 0 15px rgba(155, 89, 182, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 25px rgba(155, 89, 182, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(155, 89, 182, 0.3)';
                }}
              >
                <span>{goal.montantCible ? `${parseFloat(goal.montantCible).toLocaleString('fr-CA')} $` : t('onboarding.firstGoal.tapToEnter')}</span>
                <span style={{ fontSize: '0.8em' }}>🔢</span>
              </button>
              
              {/* Preview dynamique du temps estimé - Optimisé mobile */}
              {goal.montantCible && parseFloat(goal.montantCible) > 0 && (
                <div style={{
                  background: 'rgba(76, 175, 80, 0.15)',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  marginTop: '8px',
                  border: '1px solid rgba(76, 175, 80, 0.5)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    gap: '6px',
                    fontSize: '0.85em',
                    color: '#81c784',
                    textAlign: 'center'
                  }}>
                    <span>💡</span>
                    <span style={{ fontWeight: '600' }}>500$/mois</span>
                    <span style={{ opacity: 0.8 }}>→</span>
                    <span style={{ fontWeight: '700', color: '#4caf50' }}>
                      {parseFloat(goal.montantCible).toLocaleString('fr-CA')} $
                    </span>
                    <span style={{ opacity: 0.8 }}>en</span>
                    <span style={{ 
                      background: 'rgba(76, 175, 80, 0.3)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: '600'
                    }}>
                      {Math.ceil(parseFloat(goal.montantCible) / 500)} mois
                    </span>
                    <span style={{ 
                      opacity: 0.7,
                      fontSize: '0.9em'
                    }}>
                      (~{(parseFloat(goal.montantCible) / 500 / 12).toFixed(1)} ans)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Compte associé - Simple ou Dropdown */}
            {formData.accounts.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <label style={{
                  display: 'block',
                  fontWeight: '600',
                  color: 'rgba(255,255,255,0.9)',
                  marginBottom: '6px',
                  fontSize: '0.9em'
                }}>
                  {t('onboarding.firstGoal.associatedAccount')}
                </label>
                
                {formData.accounts.length === 1 ? (
                  // Affichage simple si un seul compte
                  <div style={{
                    padding: '10px 12px',
                    fontSize: '1em',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>💼</span>
                    <span>{formData.accounts[0].nom}</span>
                    <span style={{ opacity: 0.6 }}>({formData.accounts[0].type})</span>
                  </div>
                ) : (
                  // Dropdown si plusieurs comptes
                  <select
                    value={goal.compteAssocie}
                    onChange={(e) => setGoal({...goal, compteAssocie: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '1em',
                      border: '2px solid rgba(255,255,255,0.2)',
                      borderRadius: '10px',
                      transition: 'all 0.3s',
                      outline: 'none',
                      boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    {formData.accounts.map((acc, index) => (
                      <option key={index} value={acc.nom} style={{ background: '#1a1a2e' }}>
                        {acc.nom} ({acc.type})
                      </option>
                    ))}
                  </select>
                )}
                
                <small style={{ 
                  color: 'rgba(255,255,255,0.6)', 
                  fontSize: '0.85em', 
                  marginTop: '6px', 
                  display: 'block' 
                }} dangerouslySetInnerHTML={{ __html: t('onboarding.firstGoal.addMoreLater') }} />
              </div>
            )}
          </div>

          {/* Boutons de navigation - Style sombre */}
          <div style={{
            display: 'flex',
            gap: '15px',
            marginTop: '15px'
          }}>
            <button
              type="button"
              onClick={goBack}
              disabled={isLoading}
              style={{
                flex: '0 0 auto',
                padding: '10px 18px',
                fontSize: '0.95em',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.8)',
                background: 'rgba(255,255,255,0.05)',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '10px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: isLoading ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                }
              }}
            >
              ← {t('common.back')}
            </button>
            
            <button
              type="submit"
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '10px 20px',
                fontSize: '0.95em',
                fontWeight: 'bold',
                color: 'white',
                background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                border: 'none',
                borderRadius: '10px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 15px rgba(255, 152, 0, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                opacity: isLoading ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 152, 0, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 152, 0, 0.4)';
                }
              }}
            >
              {isLoading ? (
                <>
                  <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                  <span>{t('onboarding.firstGoal.creating')}</span>
                </>
              ) : (
                <>
                  <span>{t('onboarding.firstGoal.accessTool')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* NumPad Modal */}
      <NumpadModal
        isOpen={showNumpad}
        onClose={() => setShowNumpad(false)}
        onConfirm={handleNumpadConfirm}
        initialValue={goal.montantCible}
        title={t('onboarding.firstGoal.targetAmount')}
        allowNegative={false}
        accentColor="#9b59b6"
      />

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes gps-ring-spin {
          0% {
            transform: rotate(0deg);
            box-shadow: 0 0 20px rgba(255, 165, 0, 0.5);
          }
          50% {
            box-shadow: 0 0 35px rgba(255, 165, 0, 0.8), 0 0 50px rgba(255, 69, 0, 0.4);
          }
          100% {
            transform: rotate(360deg);
            box-shadow: 0 0 20px rgba(255, 165, 0, 0.5);
          }
        }
        
        input::placeholder {
          color: rgba(255,255,255,0.4);
        }
      `}</style>
    </div>
  );
};

export default FirstGoal;
