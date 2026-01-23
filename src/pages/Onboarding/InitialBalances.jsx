// 💰 INITIAL BALANCES - Étape 5 de l'onboarding Pl4to
// Date de départ et soldes initiaux de chaque compte
// VERSION MODIFIÉE: Titre "Vos soldes", date automatique, valeur nette sans montant

import { useState, useEffect } from 'react';
import { useOnboarding } from '../../context/OnboardingContext';
import NavigationButtons from '../../components/onboarding/NavigationButtons';

const InitialBalances = () => {
  const { formData, updateInitialBalances } = useOnboarding();
  const accounts = formData.accounts;
  
  // Date de départ = AUJOURD'HUI (automatique, non modifiable)
  const dateDepart = new Date().toISOString().split('T')[0];
  
  // État local pour les soldes (initialisé depuis formData ou avec des valeurs vides)
  const [soldes, setSoldes] = useState(() => {
    const savedSoldes = formData.initialBalances.soldes || [];
    // Créer un mapping pour chaque compte
    return accounts.map(account => {
      const existing = savedSoldes.find(s => s.accountId === account.id || s.accountNom === account.nom);
      return {
        accountId: account.id,
        accountNom: account.nom,
        accountType: account.type,
        solde: existing?.solde || '',
        limite: account.limite || ''
      };
    });
  });

  // Mettre à jour le contexte à chaque modification
  useEffect(() => {
    updateInitialBalances(dateDepart, soldes);
  }, [dateDepart, soldes]);

  // Mettre à jour un solde
  const handleSoldeChange = (index, value) => {
    const newSoldes = [...soldes];
    newSoldes[index].solde = value;
    setSoldes(newSoldes);
  };

  // Obtenir l'icône selon le type de compte
  const getTypeIcon = (type) => {
    const icons = {
      'cheque': '💳',
      'epargne': '🏦',
      'credit': '💰',
      'investissement': '📈'
    };
    return icons[type] || '💼';
  };

  // Obtenir le label selon le type
  const getTypeLabel = (type) => {
    const labels = {
      'cheque': 'Compte chèque',
      'epargne': 'Compte épargne',
      'credit': 'Carte de crédit',
      'investissement': 'Investissement'
    };
    return labels[type] || 'Compte';
  };

  // Obtenir la couleur selon le type
  const getTypeColor = (type) => {
    const colors = {
      'cheque': '#3498db',
      'epargne': '#27ae60',
      'credit': '#e74c3c',
      'investissement': '#9b59b6'
    };
    return colors[type] || '#7f8c8d';
  };

  // Calculer le solde net total
  const calculateNetTotal = () => {
    let total = 0;
    soldes.forEach(s => {
      const montant = parseFloat(s.solde) || 0;
      if (s.accountType === 'credit') {
        total -= montant; // Les dettes sont négatives
      } else {
        total += montant;
      }
    });
    return total;
  };

  // Formater le montant
  const formatMontant = (montant) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(montant);
  };

  // Formater la date pour affichage
  const formatDateAffichage = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('fr-CA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Déterminer si la valeur nette est positive ou négative
  const isNetPositif = calculateNetTotal() >= 0;

  return (
    <div style={{
      minHeight: '100vh',
      paddingBottom: '60px'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '40px 20px'
      }}>
        {/* En-tête */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <div style={{
            display: 'inline-block',
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '10px',
            marginBottom: '15px'
          }}>
            <span style={{
              color: 'white',
              fontWeight: 'bold',
              fontSize: '0.9em'
            }}>
              Étape 5/6
            </span>
          </div>
          
          <h1 style={{
            fontSize: '2em',
            fontWeight: 'bold',
            color: '#2c3e50',
            marginBottom: '10px',
            fontFamily: "'Poppins', sans-serif"
          }}>
            💰 Vos soldes
          </h1>
          
          <p style={{
            fontSize: '1em',
            color: '#7f8c8d',
            lineHeight: '1.6'
          }}>
            Indiquez vos soldes actuels pour commencer votre trajet financier
          </p>
        </div>

        {/* Message d'aide */}
        <div style={{
          background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
          padding: '20px',
          borderRadius: '12px',
          border: '2px solid #4CAF50',
          marginBottom: '30px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'start',
            gap: '15px'
          }}>
            <span style={{ fontSize: '2em' }}>🚀</span>
            <div>
              <p style={{
                fontSize: '1em',
                fontWeight: '600',
                color: '#2e7d32',
                margin: '0 0 8px 0'
              }}>
                C'est ici que commence votre trajet!
              </p>
              <p style={{
                fontSize: '0.9em',
                color: '#388e3c',
                margin: 0,
                lineHeight: '1.5'
              }}>
                À partir de ces soldes, Pl4to tracera votre parcours financier. 
                Pour les cartes de crédit, indiquez le solde dû (dette actuelle).
              </p>
            </div>
          </div>
        </div>

        {/* Date de départ - AUTOMATIQUE, NON MODIFIABLE */}
        <div style={{
          background: 'white',
          borderRadius: '15px',
          padding: '25px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid #e0e0e0',
          marginBottom: '30px'
        }}>
          <h3 style={{
            fontSize: '1.1em',
            fontWeight: 'bold',
            color: '#2c3e50',
            marginBottom: '15px',
            fontFamily: "'Poppins', sans-serif",
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            📅 Date de départ
          </h3>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            padding: '15px 20px',
            background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
            borderRadius: '10px',
            border: '2px solid #2196f3'
          }}>
            <span style={{ fontSize: '1.5em' }}>📆</span>
            <div>
              <p style={{
                fontSize: '1.15em',
                fontWeight: 'bold',
                color: '#1565c0',
                margin: 0,
                textTransform: 'capitalize'
              }}>
                {formatDateAffichage(dateDepart)}
              </p>
              <p style={{
                fontSize: '0.85em',
                color: '#1976d2',
                margin: '5px 0 0 0'
              }}>
                Aujourd'hui
              </p>
            </div>
          </div>
        </div>

        {/* Liste des comptes avec soldes */}
        <div style={{
          background: 'white',
          borderRadius: '15px',
          padding: '25px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid #e0e0e0',
          marginBottom: '30px'
        }}>
          <h3 style={{
            fontSize: '1.1em',
            fontWeight: 'bold',
            color: '#2c3e50',
            marginBottom: '20px',
            fontFamily: "'Poppins', sans-serif",
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            💰 Soldes de vos comptes
          </h3>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
          }}>
            {soldes.map((compte, index) => (
              <div
                key={compte.accountId || index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '20px',
                  border: `2px solid ${getTypeColor(compte.accountType)}`,
                  borderRadius: '12px',
                  background: `${getTypeColor(compte.accountType)}10`,
                  gap: '20px',
                  flexWrap: 'wrap'
                }}
              >
                {/* Icône et nom */}
                <div style={{
                  flex: '1 1 200px',
                  minWidth: '200px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <span style={{ fontSize: '1.8em' }}>
                      {getTypeIcon(compte.accountType)}
                    </span>
                    <div>
                      <p style={{
                        fontSize: '1.1em',
                        fontWeight: 'bold',
                        color: '#2c3e50',
                        margin: 0
                      }}>
                        {compte.accountNom}
                      </p>
                      <p style={{
                        fontSize: '0.8em',
                        color: getTypeColor(compte.accountType),
                        margin: '3px 0 0 0',
                        fontWeight: '600'
                      }}>
                        {getTypeLabel(compte.accountType)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Input solde */}
                <div style={{
                  flex: '1 1 200px',
                  minWidth: '200px'
                }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.85em',
                    color: '#7f8c8d',
                    marginBottom: '8px',
                    fontWeight: '600'
                  }}>
                    {compte.accountType === 'credit' ? 'Solde dû (dette):' : 'Solde actuel:'}
                  </label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={compte.solde}
                      onChange={(e) => handleSoldeChange(index, e.target.value)}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        padding: '12px 15px',
                        fontSize: '1.1em',
                        fontWeight: '600',
                        border: '2px solid #e0e0e0',
                        borderRadius: '8px',
                        outline: 'none',
                        transition: 'border-color 0.3s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = getTypeColor(compte.accountType)}
                      onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                    />
                    <span style={{
                      fontSize: '1.1em',
                      fontWeight: '600',
                      color: '#7f8c8d'
                    }}>
                      $
                    </span>
                  </div>
                  
                  {/* Afficher limite si carte de crédit */}
                  {compte.accountType === 'credit' && compte.limite && (
                    <p style={{
                      fontSize: '0.8em',
                      color: '#e74c3c',
                      marginTop: '5px',
                      marginBottom: 0
                    }}>
                      Limite: {formatMontant(compte.limite)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Résumé - SEULEMENT POSITIF/NÉGATIF, PAS DE MONTANT */}
        <div style={{
          background: isNetPositif 
            ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
            : 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
          padding: '25px',
          borderRadius: '15px',
          border: `2px solid ${isNetPositif ? '#4CAF50' : '#e74c3c'}`,
          marginBottom: '30px',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '15px'
          }}>
            <span style={{ fontSize: '3em' }}>
              {isNetPositif ? '✅' : '💪'}
            </span>
            <div>
              <p style={{
                fontSize: '1.3em',
                fontWeight: 'bold',
                color: isNetPositif ? '#1b5e20' : '#b71c1c',
                margin: 0,
                fontFamily: "'Poppins', sans-serif"
              }}>
                {isNetPositif 
                  ? 'Vous partez sur de bonnes bases!' 
                  : 'Vous avez des dettes à rembourser'}
              </p>
              <p style={{
                fontSize: '0.95em',
                color: isNetPositif ? '#388e3c' : '#e53935',
                margin: '8px 0 0 0'
              }}>
                {isNetPositif 
                  ? 'Continuez sur cette lancée avec Pl4to!' 
                  : 'Pl4to va vous aider à améliorer cette situation!'}
              </p>
            </div>
          </div>
        </div>

        {/* Boutons de navigation */}
        <NavigationButtons />
      </div>
    </div>
  );
};

export default InitialBalances;