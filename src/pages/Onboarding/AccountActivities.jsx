// 💱 ACCOUNT ACTIVITIES - Étape 3 de l'onboarding Pl4to

import { useState } from 'react';
import { useOnboarding } from '../../context/OnboardingContext';
import NavigationButtons from '../../components/onboarding/NavigationButtons';

const AccountActivities = () => {
  const { formData, currentAccountIndex, setCurrentAccountIndex, updateAccountActivities } = useOnboarding();
  const accounts = formData.accounts;
  const currentAccount = accounts[currentAccountIndex];
  
  // État local pour les activités du compte actuel
  const [entrees, setEntrees] = useState(
    formData.accountActivities[currentAccount?.nom]?.entrees || []
  );
  const [sorties, setSorties] = useState(
    formData.accountActivities[currentAccount?.nom]?.sorties || []
  );
  const [customEntree, setCustomEntree] = useState('');
  const [customSortie, setCustomSortie] = useState('');

  // Activités prédéfinies selon le type de compte
  const getPredefineesEntrees = (type) => {
    const common = ['Dépôt', 'Transfert', 'Remboursement'];
    if (type === 'credit') return ['Paiement', 'Remboursement'];
    if (type === 'epargne') return ['Dépôt', 'Transfert', 'Intérêts'];
    return common;
  };

  const getPredefineesSorties = (type) => {
    const common = ['Paiement', 'Achat', 'Retrait'];
    if (type === 'credit') return ['Achat', 'Frais', 'Retrait'];
    if (type === 'epargne') return ['Transfert', 'Retrait'];
    if (type === 'cheque') return ['Paiement', 'Achat', 'Retrait', 'Transfert'];
    return common;
  };

  // Ajouter les transferts vers d'autres comptes comme options de sortie
  const getTransfersOptions = () => {
    return accounts
      .filter(acc => acc.nom !== currentAccount.nom)
      .map(acc => `Transfert → ${acc.nom}`);
  };

  const handleToggleEntree = (activite) => {
    if (entrees.includes(activite)) {
      setEntrees(entrees.filter(a => a !== activite));
    } else {
      setEntrees([...entrees, activite]);
    }
  };

  const handleToggleSortie = (activite) => {
    if (sorties.includes(activite)) {
      setSorties(sorties.filter(a => a !== activite));
    } else {
      setSorties([...sorties, activite]);
    }
  };

  const handleAddCustomEntree = () => {
    if (customEntree.trim() && !entrees.includes(customEntree.trim())) {
      setEntrees([...entrees, customEntree.trim()]);
      setCustomEntree('');
    }
  };

  const handleAddCustomSortie = () => {
    if (customSortie.trim() && !sorties.includes(customSortie.trim())) {
      setSorties([...sorties, customSortie.trim()]);
      setCustomSortie('');
    }
  };

  const handleRemoveEntree = (activite) => {
    setEntrees(entrees.filter(a => a !== activite));
  };

  const handleRemoveSortie = (activite) => {
    setSorties(sorties.filter(a => a !== activite));
  };

  // Sauvegarder avant de passer au compte suivant ou à l'étape suivante
  const handleBeforeNext = () => {
    // Sauvegarder les activités du compte actuel
    updateAccountActivities(currentAccount.nom, {
      entrees,
      sorties
    });
    return true; // Permet de continuer
  };

  const getTypeIcon = (type) => {
    const icons = {
      'cheque': '💳',
      'epargne': '🏦',
      'credit': '💰',
      'investissement': '📈'
    };
    return icons[type] || '💼';
  };

  return (
    <div style={{
      minHeight: '100vh',
      paddingBottom: '60px'
    }}>
      <div style={{
        maxWidth: '1000px',
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
              Étape 3/6 - Compte {currentAccountIndex + 1}/{accounts.length}
            </span>
          </div>
          
          <h1 style={{
            fontSize: '2em',
            fontWeight: 'bold',
            color: '#2c3e50',
            marginBottom: '10px',
            fontFamily: "'Poppins', sans-serif",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '15px'
          }}>
            {getTypeIcon(currentAccount.type)} {currentAccount.nom}
          </h1>
          
          <p style={{
            fontSize: '1em',
            color: '#7f8c8d',
            lineHeight: '1.6'
          }}>
            Sélectionnez les types de transactions pour ce compte
          </p>
        </div>

        {/* Carte principale */}
        <div style={{
          background: 'white',
          borderRadius: '15px',
          padding: '40px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid #e0e0e0',
          marginBottom: '30px'
        }}>
          {/* Grille 2 colonnes */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '30px'
          }}>
            {/* COLONNE ENTRÉES */}
            <div>
              <h3 style={{
                fontSize: '1.2em',
                fontWeight: 'bold',
                color: '#2c3e50',
                marginBottom: '20px',
                fontFamily: "'Poppins', sans-serif",
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                ➕ Ce qui entre dans ce compte
              </h3>

              {/* Activités prédéfinies */}
              <div style={{ marginBottom: '20px' }}>
                <p style={{
                  fontSize: '0.9em',
                  color: '#7f8c8d',
                  marginBottom: '12px',
                  fontWeight: '600'
                }}>
                  Activités suggérées:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {getPredefineesEntrees(currentAccount.type).map((activite) => (
                    <label
                      key={activite}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 15px',
                        border: `2px solid ${entrees.includes(activite) ? '#4CAF50' : '#e0e0e0'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        background: entrees.includes(activite) ? '#e8f5e9' : 'white'
                      }}
                      onMouseEnter={(e) => {
                        if (!entrees.includes(activite)) {
                          e.currentTarget.style.borderColor = '#4CAF50';
                          e.currentTarget.style.background = '#f1f8f4';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!entrees.includes(activite)) {
                          e.currentTarget.style.borderColor = '#e0e0e0';
                          e.currentTarget.style.background = 'white';
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={entrees.includes(activite)}
                        onChange={() => handleToggleEntree(activite)}
                        style={{
                          marginRight: '12px',
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer'
                        }}
                      />
                      <span style={{
                        fontSize: '0.95em',
                        color: '#2c3e50',
                        fontWeight: entrees.includes(activite) ? '600' : 'normal'
                      }}>
                        {activite}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Activités personnalisées ajoutées */}
              {entrees.filter(e => !getPredefineesEntrees(currentAccount.type).includes(e)).length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <p style={{
                    fontSize: '0.9em',
                    color: '#7f8c8d',
                    marginBottom: '12px',
                    fontWeight: '600'
                  }}>
                    Activités personnalisées:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {entrees.filter(e => !getPredefineesEntrees(currentAccount.type).includes(e)).map((activite) => (
                      <div
                        key={activite}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 15px',
                          border: '2px solid #9C27B0',
                          borderRadius: '8px',
                          background: '#f3e5f5'
                        }}
                      >
                        <span style={{
                          fontSize: '0.9em',
                          color: '#2c3e50',
                          fontWeight: '600'
                        }}>
                          {activite}
                        </span>
                        <button
                          onClick={() => handleRemoveEntree(activite)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1.2em',
                            color: '#e74c3c',
                            padding: '0 5px'
                          }}
                          title="Supprimer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ajouter activité personnalisée */}
              <div>
                <p style={{
                  fontSize: '0.9em',
                  color: '#7f8c8d',
                  marginBottom: '8px',
                  fontWeight: '600'
                }}>
                  Autre activité:
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={customEntree}
                    onChange={(e) => setCustomEntree(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustomEntree()}
                    placeholder="Ex: Allocation familiale"
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      fontSize: '0.9em',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={handleAddCustomEntree}
                    disabled={!customEntree.trim()}
                    style={{
                      padding: '10px 20px',
                      fontSize: '0.9em',
                      fontWeight: '600',
                      color: 'white',
                      background: customEntree.trim() ? '#4CAF50' : '#bdc3c7',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: customEntree.trim() ? 'pointer' : 'not-allowed',
                      transition: 'all 0.3s'
                    }}
                  >
                    ➕
                  </button>
                </div>
              </div>
            </div>

            {/* COLONNE SORTIES */}
            <div>
              <h3 style={{
                fontSize: '1.2em',
                fontWeight: 'bold',
                color: '#2c3e50',
                marginBottom: '20px',
                fontFamily: "'Poppins', sans-serif",
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                ➖ Ce qui sort de ce compte
              </h3>

              {/* Activités prédéfinies */}
              <div style={{ marginBottom: '20px' }}>
                <p style={{
                  fontSize: '0.9em',
                  color: '#7f8c8d',
                  marginBottom: '12px',
                  fontWeight: '600'
                }}>
                  Activités suggérées:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {getPredefineesSorties(currentAccount.type).map((activite) => (
                    <label
                      key={activite}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 15px',
                        border: `2px solid ${sorties.includes(activite) ? '#e74c3c' : '#e0e0e0'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        background: sorties.includes(activite) ? '#ffebee' : 'white'
                      }}
                      onMouseEnter={(e) => {
                        if (!sorties.includes(activite)) {
                          e.currentTarget.style.borderColor = '#e74c3c';
                          e.currentTarget.style.background = '#fff5f5';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!sorties.includes(activite)) {
                          e.currentTarget.style.borderColor = '#e0e0e0';
                          e.currentTarget.style.background = 'white';
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={sorties.includes(activite)}
                        onChange={() => handleToggleSortie(activite)}
                        style={{
                          marginRight: '12px',
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer'
                        }}
                      />
                      <span style={{
                        fontSize: '0.95em',
                        color: '#2c3e50',
                        fontWeight: sorties.includes(activite) ? '600' : 'normal'
                      }}>
                        {activite}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Transferts vers d'autres comptes */}
              {getTransfersOptions().length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <p style={{
                    fontSize: '0.9em',
                    color: '#7f8c8d',
                    marginBottom: '12px',
                    fontWeight: '600'
                  }}>
                    Transferts vers vos autres comptes:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {getTransfersOptions().map((activite) => (
                      <label
                        key={activite}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '12px 15px',
                          border: `2px solid ${sorties.includes(activite) ? '#2196f3' : '#e0e0e0'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.3s',
                          background: sorties.includes(activite) ? '#e3f2fd' : 'white'
                        }}
                        onMouseEnter={(e) => {
                          if (!sorties.includes(activite)) {
                            e.currentTarget.style.borderColor = '#2196f3';
                            e.currentTarget.style.background = '#f0f8ff';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!sorties.includes(activite)) {
                            e.currentTarget.style.borderColor = '#e0e0e0';
                            e.currentTarget.style.background = 'white';
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={sorties.includes(activite)}
                          onChange={() => handleToggleSortie(activite)}
                          style={{
                            marginRight: '12px',
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer'
                          }}
                        />
                        <span style={{
                          fontSize: '0.95em',
                          color: '#2c3e50',
                          fontWeight: sorties.includes(activite) ? '600' : 'normal'
                        }}>
                          {activite}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Activités personnalisées ajoutées */}
              {sorties.filter(s => 
                !getPredefineesSorties(currentAccount.type).includes(s) && 
                !getTransfersOptions().includes(s)
              ).length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <p style={{
                    fontSize: '0.9em',
                    color: '#7f8c8d',
                    marginBottom: '12px',
                    fontWeight: '600'
                  }}>
                    Activités personnalisées:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sorties.filter(s => 
                      !getPredefineesSorties(currentAccount.type).includes(s) && 
                      !getTransfersOptions().includes(s)
                    ).map((activite) => (
                      <div
                        key={activite}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 15px',
                          border: '2px solid #9C27B0',
                          borderRadius: '8px',
                          background: '#f3e5f5'
                        }}
                      >
                        <span style={{
                          fontSize: '0.9em',
                          color: '#2c3e50',
                          fontWeight: '600'
                        }}>
                          {activite}
                        </span>
                        <button
                          onClick={() => handleRemoveSortie(activite)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1.2em',
                            color: '#e74c3c',
                            padding: '0 5px'
                          }}
                          title="Supprimer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ajouter activité personnalisée */}
              <div>
                <p style={{
                  fontSize: '0.9em',
                  color: '#7f8c8d',
                  marginBottom: '8px',
                  fontWeight: '600'
                }}>
                  Autre activité:
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={customSortie}
                    onChange={(e) => setCustomSortie(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustomSortie()}
                    placeholder="Ex: Frais bancaires"
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      fontSize: '0.9em',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={handleAddCustomSortie}
                    disabled={!customSortie.trim()}
                    style={{
                      padding: '10px 20px',
                      fontSize: '0.9em',
                      fontWeight: '600',
                      color: 'white',
                      background: customSortie.trim() ? '#e74c3c' : '#bdc3c7',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: customSortie.trim() ? 'pointer' : 'not-allowed',
                      transition: 'all 0.3s'
                    }}
                  >
                    ➕
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Message d'aide */}
        <div style={{
          background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
          padding: '15px 20px',
          borderRadius: '10px',
          border: '2px solid #2196f3',
          marginBottom: '30px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'start',
            gap: '12px'
          }}>
            <span style={{ fontSize: '1.5em' }}>💡</span>
            <div>
              <p style={{
                fontSize: '0.9em',
                fontWeight: '600',
                color: '#1565c0',
                margin: '0 0 5px 0'
              }}>
                Astuce
              </p>
              <p style={{
                fontSize: '0.85em',
                color: '#1976d2',
                margin: 0,
                lineHeight: '1.5'
              }}>
                Sélectionnez toutes les activités que vous prévoyez utiliser pour ce compte. Vous pourrez toujours en ajouter ou en retirer plus tard.
              </p>
            </div>
          </div>
        </div>

        {/* Boutons de navigation */}
        <NavigationButtons 
          onNextClick={handleBeforeNext}
        />
      </div>
    </div>
  );
};

export default AccountActivities;