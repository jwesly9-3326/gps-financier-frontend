// 💼 FIRST ACCOUNT - Étape 1 de l'onboarding (après Register)
// Compte principal + Solde actuel - Style GPS Sombre

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useOnboarding } from '../../context/OnboardingContext';
import NumpadModal from '../../components/common/NumpadModal';

const FirstAccount = () => {
  const { formData, addFirstAccount, updateFirstAccount, goNext, getProgressPercentage } = useOnboarding();
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // État local pour le formulaire
  const [account, setAccount] = useState({
    nom: '',
    type: '',
    limite: ''
  });
  const [solde, setSolde] = useState('');
  
  // État pour le NumPad Modal
  const [showNumpad, setShowNumpad] = useState(false);
  const [numpadTarget, setNumpadTarget] = useState(null); // 'solde' ou 'limite'

  // Charger les données existantes si disponibles
  useEffect(() => {
    if (formData.accounts.length > 0) {
      setAccount({
        nom: formData.accounts[0].nom || '',
        type: formData.accounts[0].type || '',
        limite: formData.accounts[0].limite || ''
      });
    }
    if (formData.initialBalances.soldes.length > 0) {
      setSolde(formData.initialBalances.soldes[0].solde || '');
    }
  }, []);

  // Couleurs dynamiques par type de compte
  const getTypeColor = (type) => {
    const colors = {
      'cheque': '#3498db',    // Bleu
      'epargne': '#2ecc71',   // Vert
      'credit': '#ffa500',    // Orange
      'hypotheque': '#9b59b6' // Violet
    };
    return colors[type] || '#3498db';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!account.nom || !account.type) {
      alert(t('onboarding.firstAccount.validation.nameType'));
      return;
    }
    
    if (!solde || isNaN(parseFloat(solde))) {
      alert(t('onboarding.firstAccount.validation.balance'));
      return;
    }

    if ((account.type === 'credit' || account.type === 'hypotheque') && !account.limite) {
      alert(t('onboarding.firstAccount.validation.creditLimit'));
      return;
    }

    // Sauvegarder
    if (formData.accounts.length > 0) {
      updateFirstAccount(account, solde);
    } else {
      addFirstAccount(account, solde);
    }
    
    goNext();
  };

  // Ouvrir NumPad pour solde
  const openNumpadForSolde = () => {
    if (!account.type) {
      alert(t('onboarding.firstAccount.selectTypeFirst'));
      return;
    }
    setNumpadTarget('solde');
    setShowNumpad(true);
  };

  // Ouvrir NumPad pour limite crédit
  const openNumpadForLimite = () => {
    setNumpadTarget('limite');
    setShowNumpad(true);
  };

  // Callback NumPad
  const handleNumpadConfirm = (value) => {
    if (numpadTarget === 'solde') {
      setSolde(value);
    } else if (numpadTarget === 'limite') {
      setAccount({...account, limite: value});
    }
    setShowNumpad(false);
    setNumpadTarget(null);
  };

  const typeColor = getTypeColor(account.type);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch'
    }}>
      <div style={{
        maxWidth: '700px',
        margin: '0 auto',
        padding: '20px 20px 100px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start'
      }}>
        {/* Progress Bar */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
            fontSize: '0.9em',
            color: 'rgba(255,255,255,0.8)'
          }}>
            <span>{t('onboarding.step', { current: 2, total: 3 })}</span>
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
          marginBottom: '20px'
        }}>
          {/* Logo O avec icône compte */}
          <div style={{
            position: 'relative',
            width: '70px',
            height: '70px',
            margin: '0 auto 15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              position: 'absolute',
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              border: '4px solid transparent',
              background: 'linear-gradient(#040449, #040449) padding-box, linear-gradient(180deg, #ffd700, #ffb800, #ffa500, #ffd700) border-box',
              animation: 'gps-ring-spin 3s linear infinite',
              boxShadow: '0 0 25px rgba(255, 165, 0, 0.5)'
            }} />
            <span style={{ fontSize: '1.8em', position: 'relative', zIndex: 1 }}>💼</span>
          </div>
          
          <h1 style={{
            fontSize: '1.5em',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '5px',
            fontFamily: "'Poppins', sans-serif"
          }}>
            {t('onboarding.firstAccount.title')}
          </h1>
          
          <p style={{
            fontSize: '1em',
            color: 'rgba(255,255,255,0.8)',
            lineHeight: '1.6'
          }}>
            {t('onboarding.firstAccount.subtitle')}
          </p>
        </div>

        {/* Formulaire - Style GPS Sombre */}
        <form onSubmit={handleSubmit}>
          <div style={{
            background: 'linear-gradient(180deg, rgba(4, 4, 73, 0.9) 0%, rgba(16, 2, 97, 0.9) 100%)',
            borderRadius: '15px',
            padding: '25px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255, 165, 0, 0.3)'
          }}>
            {/* Nom du compte */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.9)',
                marginBottom: '8px',
                fontSize: '0.95em'
              }}>
                {t('onboarding.firstAccount.accountName')} <span style={{ color: '#ff6b6b' }}>*</span>
              </label>
              <input
                type="text"
                value={account.nom}
                onChange={(e) => setAccount({...account, nom: e.target.value})}
                placeholder={t('onboarding.firstAccount.accountNamePlaceholder')}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
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
                  e.target.style.borderColor = '#ffa500';
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 165, 0, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Type de compte - Boutons avec couleurs dynamiques */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.9)',
                marginBottom: '8px',
                fontSize: '0.95em'
              }}>
                {t('onboarding.firstAccount.accountType')} <span style={{ color: '#ff6b6b' }}>*</span>
              </label>
              
              {/* Boutons de sélection - Grille 2x2 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px'
              }}>
                {[
                  { value: 'cheque', label: t('onboarding.firstAccount.types.cheque'), icon: '💳', color: '#3498db' },
                  { value: 'epargne', label: t('onboarding.firstAccount.types.savings'), icon: '🌱', color: '#2ecc71' },
                  { value: 'credit', label: t('onboarding.firstAccount.types.credit'), icon: '💳', hint: t('onboarding.firstAccount.types.creditHint'), color: '#ffa500' },
                  { value: 'hypotheque', label: t('onboarding.firstAccount.types.mortgage'), icon: '🏠', hint: t('onboarding.firstAccount.types.mortgageHint'), color: '#9b59b6' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAccount({...account, type: option.value, limite: ''})}
                    style={{
                      padding: '12px 10px',
                      fontSize: '0.85em',
                      fontWeight: '600',
                      color: account.type === option.value ? 'white' : 'rgba(255,255,255,0.8)',
                      background: account.type === option.value 
                        ? `linear-gradient(135deg, ${option.color} 0%, ${option.color}dd 100%)` 
                        : 'rgba(255,255,255,0.05)',
                      border: `2px solid ${account.type === option.value ? option.color : 'rgba(255,255,255,0.2)'}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      minHeight: '70px',
                      boxShadow: account.type === option.value ? `0 0 15px ${option.color}50` : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (account.type !== option.value) {
                        e.currentTarget.style.borderColor = option.color;
                        e.currentTarget.style.background = `rgba(255,255,255,0.1)`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (account.type !== option.value) {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </div>
                    {option.hint && (
                      <span style={{ 
                        fontSize: '0.7em', 
                        fontWeight: '400',
                        opacity: 0.7,
                        marginTop: '2px',
                        textAlign: 'center'
                      }}>
                        {option.hint}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Limite de crédit / Montant hypothèque (conditionnel) */}
            {(account.type === 'credit' || account.type === 'hypotheque') && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontWeight: '600',
                  color: 'rgba(255,255,255,0.9)',
                  marginBottom: '8px',
                  fontSize: '0.95em'
                }}>
                  {account.type === 'hypotheque' 
                    ? '🏠 Montant original du prêt' 
                    : t('onboarding.firstAccount.creditLimit')
                  } <span style={{ color: '#ff6b6b' }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={openNumpadForLimite}
                  style={{
                    width: '100%',
                    padding: '15px 18px',
                    fontSize: '1.2em',
                    fontWeight: 'bold',
                    border: `3px solid ${typeColor}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: `${typeColor}15`,
                    color: account.limite ? typeColor : 'rgba(255,255,255,0.5)',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.3s'
                  }}
                >
                  <span>{account.limite ? `${parseFloat(account.limite).toLocaleString('fr-CA')} $` : t('onboarding.firstAccount.tapToEnter')}</span>
                  <span style={{ fontSize: '0.8em' }}>🔢</span>
                </button>
              </div>
            )}

            {/* Séparateur - Couleur dynamique */}
            <div style={{
              height: '2px',
              background: `linear-gradient(90deg, transparent, ${account.type ? typeColor : 'rgba(255,255,255,0.3)'}, transparent)`,
              margin: '20px 0'
            }}></div>

            {/* SOLDE ACTUEL - Bouton NumPad avec couleur dynamique */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.9)',
                marginBottom: '8px',
                fontSize: '1.1em'
              }}>
                💵 {t('onboarding.firstAccount.currentBalance')} <span style={{ color: '#ff6b6b' }}>*</span>
              </label>
              
              {/* Message si aucun type sélectionné */}
              {!account.type ? (
                <div style={{
                  width: '100%',
                  padding: '15px 18px',
                  fontSize: '1em',
                  border: '3px dashed rgba(255,255,255,0.3)',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.5)',
                  textAlign: 'center'
                }}>
                  {t('onboarding.firstAccount.selectTypeFirst')}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openNumpadForSolde}
                  style={{
                    width: '100%',
                    padding: '15px 18px',
                    fontSize: '1.3em',
                    fontWeight: 'bold',
                    border: `3px solid ${typeColor}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: `${typeColor}15`,
                    color: solde ? typeColor : 'rgba(255,255,255,0.5)',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.3s',
                    boxShadow: `0 0 15px ${typeColor}30`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 0 25px ${typeColor}50`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = `0 0 15px ${typeColor}30`;
                  }}
                >
                  <span>{solde ? `${parseFloat(solde).toLocaleString('fr-CA')} $` : t('onboarding.firstAccount.tapToEnterBalance')}</span>
                  <span style={{ fontSize: '0.8em' }}>🔢</span>
                </button>
              )}
              
              <small style={{ 
                color: 'rgba(255,255,255,0.6)', 
                fontSize: '0.85em', 
                marginTop: '10px', 
                display: 'block'
              }} dangerouslySetInnerHTML={{ __html: t('onboarding.firstAccount.addMoreLater') }} />
            </div>
          </div>

          {/* Bouton de navigation */}
          <div style={{
            marginTop: '20px'
          }}>
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '14px 25px',
                fontSize: '1.05em',
                fontWeight: 'bold',
                color: 'white',
                background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 15px rgba(255, 152, 0, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 152, 0, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 152, 0, 0.4)';
              }}
            >
              {t('common.next')} →
            </button>
          </div>
        </form>
      </div>

      {/* NumPad Modal */}
      <NumpadModal
        isOpen={showNumpad}
        onClose={() => {
          setShowNumpad(false);
          setNumpadTarget(null);
        }}
        onConfirm={handleNumpadConfirm}
        initialValue={numpadTarget === 'solde' ? solde : account.limite}
        title={numpadTarget === 'solde' 
          ? t('onboarding.firstAccount.currentBalance')
          : account.type === 'hypotheque' ? 'Montant original du prêt' : t('onboarding.firstAccount.creditLimit')
        }
        allowNegative={numpadTarget === 'solde' && account.type !== 'credit' && account.type !== 'hypotheque'}
        accentColor={typeColor}
      />

      {/* CSS Animation */}
      <style>{`
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

export default FirstAccount;
