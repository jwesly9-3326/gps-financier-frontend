// 🎯 FIRST GOAL - Étape 3 (1 minute)
// Premier objectif financier

import { useState, useEffect } from 'react';
import { useOnboarding } from '../../context/OnboardingContext';

const FirstGoal = () => {
  const { formData, addFirstGoal, updateFirstGoal, goNext, goBack, getProgressPercentage, isLoading } = useOnboarding();
  
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
      alert('Veuillez donner un nom à votre objectif');
      return;
    }
    
    if (!goal.montantCible || parseFloat(goal.montantCible) <= 0) {
      alert('Veuillez entrer un montant cible valide');
      return;
    }

    // Sauvegarder
    if (formData.financialGoals.length > 0) {
      updateFirstGoal(goal);
    } else {
      addFirstGoal(goal);
    }
    
    // goNext va appeler finalizeOnboarding() car c'est la dernière étape
    goNext();
  };

  // Suggestions d'objectifs populaires
  const goalSuggestions = [
    { nom: 'Fonds d\'urgence', type: 'epargne', icon: '🛡️' },
    { nom: 'Vacances', type: 'epargne', icon: '✈️' },
    { nom: 'Maison', type: 'achat', icon: '🏠' },
    { nom: 'Voiture', type: 'achat', icon: '🚗' },
    { nom: 'Retraite', type: 'retraite', icon: '🏖️' },
    { nom: 'Études', type: 'epargne', icon: '🎓' }
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
      minHeight: '100vh',
      paddingBottom: '40px',
      background: '#f8f9fa'
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '40px 20px'
      }}>
        {/* Progress Bar */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
            fontSize: '0.9em',
            color: '#666'
          }}>
            <span>Étape 3 sur 3</span>
            <span>{getProgressPercentage()}% complété</span>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            background: '#e0e0e0',
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${getProgressPercentage()}%`,
              background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
              transition: 'width 0.3s ease',
              borderRadius: '10px'
            }}></div>
          </div>
        </div>

        {/* En-tête */}
        <div style={{
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 8px 25px rgba(155, 89, 182, 0.3)'
          }}>
            <span style={{ fontSize: '2.5em' }}>🎯</span>
          </div>
          
          <h1 style={{
            fontSize: '1.8em',
            fontWeight: 'bold',
            color: '#2c3e50',
            marginBottom: '10px',
            fontFamily: "'Poppins', sans-serif"
          }}>
            Où voulez-vous aller?
          </h1>
          
          <p style={{
            fontSize: '1em',
            color: '#7f8c8d',
            lineHeight: '1.6'
          }}>
            Définissez votre premier objectif — votre GPS calculera le chemin optimal
          </p>
        </div>

        {/* Suggestions rapides */}
        <div style={{ marginBottom: '25px' }}>
          <p style={{
            fontSize: '0.9em',
            color: '#7f8c8d',
            marginBottom: '12px'
          }}>
            💡 Suggestions populaires:
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
                  padding: '8px 16px',
                  fontSize: '0.85em',
                  fontWeight: '500',
                  color: goal.nom === suggestion.nom ? 'white' : '#2c3e50',
                  background: goal.nom === suggestion.nom 
                    ? 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)' 
                    : 'white',
                  border: `2px solid ${goal.nom === suggestion.nom ? '#9b59b6' : '#e0e0e0'}`,
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
                    e.currentTarget.style.background = 'rgba(155, 89, 182, 0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (goal.nom !== suggestion.nom) {
                    e.currentTarget.style.borderColor = '#e0e0e0';
                    e.currentTarget.style.background = 'white';
                  }
                }}
              >
                <span>{suggestion.icon}</span>
                <span>{suggestion.nom}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit}>
          <div style={{
            background: 'white',
            borderRadius: '15px',
            padding: '35px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid #e0e0e0'
          }}>
            {/* Nom de l'objectif */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: '#2c3e50',
                marginBottom: '8px',
                fontSize: '0.95em'
              }}>
                Nom de l'objectif <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="text"
                value={goal.nom}
                onChange={(e) => setGoal({...goal, nom: e.target.value})}
                placeholder="Ex: Fonds d'urgence, Vacances en Europe"
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '1em',
                  border: '2px solid #e0e0e0',
                  borderRadius: '10px',
                  transition: 'all 0.3s',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#9b59b6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(155, 89, 182, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e0e0e0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Type d'objectif */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: '#2c3e50',
                marginBottom: '8px',
                fontSize: '0.95em'
              }}>
                Type d'objectif
              </label>
              <select
                value={goal.type}
                onChange={(e) => setGoal({...goal, type: e.target.value})}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '1em',
                  border: '2px solid #e0e0e0',
                  borderRadius: '10px',
                  transition: 'all 0.3s',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="epargne">💰 Épargne</option>
                <option value="dette">💳 Remboursement de dette</option>
                <option value="investissement">📈 Investissement</option>
                <option value="achat">🛒 Achat majeur</option>
                <option value="retraite">🏖️ Retraite</option>
              </select>
            </div>

            {/* Montant cible - LE PLUS IMPORTANT */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: '#2c3e50',
                marginBottom: '8px',
                fontSize: '1.1em'
              }}>
                🎯 Montant cible <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={goal.montantCible}
                  onChange={(e) => setGoal({...goal, montantCible: e.target.value})}
                  placeholder="10 000"
                  required
                  style={{
                    width: '100%',
                    padding: '18px 20px',
                    paddingRight: '50px',
                    fontSize: '1.3em',
                    fontWeight: 'bold',
                    border: '3px solid #9b59b6',
                    borderRadius: '12px',
                    transition: 'all 0.3s',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#faf5ff',
                    fontStyle: goal.montantCible ? 'normal' : 'italic'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#8e44ad';
                    e.target.style.boxShadow = '0 0 0 4px rgba(155, 89, 182, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#9b59b6';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <span style={{
                  position: 'absolute',
                  right: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9b59b6',
                  fontWeight: 'bold',
                  fontSize: '1.3em'
                }}>$</span>
              </div>
            </div>

            {/* Échéance (optionnel) */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: '#2c3e50',
                marginBottom: '8px',
                fontSize: '0.95em'
              }}>
                Échéance <span style={{ color: '#7f8c8d', fontWeight: 'normal' }}>(optionnel)</span>
              </label>
              <input
                type="date"
                value={goal.dateEcheance}
                onChange={(e) => setGoal({...goal, dateEcheance: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '1em',
                  border: '2px solid #e0e0e0',
                  borderRadius: '10px',
                  transition: 'all 0.3s',
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: 'pointer'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#9b59b6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(155, 89, 182, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e0e0e0';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <small style={{ 
                color: '#7f8c8d', 
                fontSize: '0.85em', 
                marginTop: '6px', 
                display: 'block' 
              }}>
                📅 Laissez vide si vous n'avez pas de date précise en tête
              </small>
            </div>

            {/* Compte associé */}
            {formData.accounts.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <label style={{
                  display: 'block',
                  fontWeight: '600',
                  color: '#2c3e50',
                  marginBottom: '8px',
                  fontSize: '0.95em'
                }}>
                  Compte associé
                </label>
                <select
                  value={goal.compteAssocie}
                  onChange={(e) => setGoal({...goal, compteAssocie: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: '1em',
                    border: '2px solid #e0e0e0',
                    borderRadius: '10px',
                    transition: 'all 0.3s',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  {formData.accounts.map((acc, index) => (
                    <option key={index} value={acc.nom}>
                      {acc.nom} ({acc.type})
                    </option>
                  ))}
                </select>
                <small style={{ 
                  color: '#7f8c8d', 
                  fontSize: '0.85em', 
                  marginTop: '6px', 
                  display: 'block' 
                }}>
                  🎯 Ce compte sera utilisé pour calculer votre progression
                </small>
              </div>
            )}
          </div>

          {/* Message de finalisation */}
          <div style={{
            background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
            padding: '20px',
            borderRadius: '12px',
            border: '2px solid #ff9800',
            marginTop: '25px',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '2em', display: 'block', marginBottom: '10px' }}>🚀</span>
            <p style={{
              fontSize: '1em',
              fontWeight: '600',
              color: '#e65100',
              margin: 0,
              lineHeight: '1.5'
            }}>
              C'est la dernière étape! Après, vous verrez votre <strong>trajectoire sur 54 ans</strong>
            </p>
          </div>

          {/* Boutons de navigation */}
          <div style={{
            display: 'flex',
            gap: '15px',
            marginTop: '30px'
          }}>
            <button
              type="button"
              onClick={goBack}
              disabled={isLoading}
              style={{
                flex: '0 0 auto',
                padding: '14px 25px',
                fontSize: '1em',
                fontWeight: '600',
                color: '#7f8c8d',
                background: 'white',
                border: '2px solid #bdc3c7',
                borderRadius: '10px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: isLoading ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.background = '#ecf0f1';
              }}
              onMouseLeave={(e) => {
                if (!isLoading) e.currentTarget.style.background = 'white';
              }}
            >
              ← Retour
            </button>
            
            <button
              type="submit"
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '16px 30px',
                fontSize: '1.1em',
                fontWeight: 'bold',
                color: 'white',
                background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                border: 'none',
                borderRadius: '10px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 15px rgba(155, 89, 182, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                opacity: isLoading ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(155, 89, 182, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(155, 89, 182, 0.3)';
                }
              }}
            >
              {isLoading ? (
                <>
                  <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                  <span>Création du GPS...</span>
                </>
              ) : (
                <>
                  <span>🗺️</span>
                  <span>Voir mon GPS Financier</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* CSS Animation */}
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default FirstGoal;