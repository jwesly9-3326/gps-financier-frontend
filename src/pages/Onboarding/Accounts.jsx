// 🏦 ACCOUNTS - Étape 2 de l'onboarding Pl4to

import { useState } from 'react';
import { useOnboarding } from '../../context/OnboardingContext';
import NavigationButtons from '../../components/onboarding/NavigationButtons';

const Accounts = () => {
  const { formData, addAccount, updateAccount, deleteAccount } = useOnboarding();
  const accounts = formData.accounts;

  // État local pour le formulaire d'ajout
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAccount, setNewAccount] = useState({
    nom: '',
    type: '',
    institution: '',
    limite: ''
  });

  const handleAddAccount = () => {
    // Validation
    if (!newAccount.nom || !newAccount.type) {
      alert('Veuillez remplir au minimum le nom et le type du compte.');
      return;
    }

    if (newAccount.type === 'credit' && !newAccount.limite) {
      alert('Veuillez indiquer la limite de crédit pour ce compte.');
      return;
    }

    // Ajouter le compte
    addAccount({
      ...newAccount,
      id: Date.now() // ID temporaire
    });

    // Réinitialiser le formulaire
    setNewAccount({
      nom: '',
      type: '',
      institution: '',
      limite: ''
    });
    setShowAddForm(false);
  };

  const handleDeleteAccount = (index) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce compte?')) {
      deleteAccount(index);
    }
  };

  const getTypeLabel = (type) => {
    const types = {
      'cheque': 'Compte chèque',
      'epargne': 'Compte épargne',
      'credit': 'Carte de crédit',
      'investissement': 'Compte d\'investissement'
    };
    return types[type] || type;
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
            Étape 2/6
          </span>
        </div>
        
        <h1 style={{
          fontSize: '2em',
          fontWeight: 'bold',
          color: '#2c3e50',
          marginBottom: '10px',
          fontFamily: "'Poppins', sans-serif"
        }}>
          🏦 Vos comptes bancaires
        </h1>
        
        <p style={{
          fontSize: '1em',
          color: '#7f8c8d',
          lineHeight: '1.6'
        }}>
          Ajoutez tous les comptes que vous souhaitez suivre dans Pl4to
        </p>
      </div>

      {/* Liste des comptes existants */}
      {accounts.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{
            fontSize: '1.2em',
            fontWeight: 'bold',
            color: '#2c3e50',
            marginBottom: '20px',
            fontFamily: "'Poppins', sans-serif"
          }}>
            📋 Vos comptes ({accounts.length})
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '20px'
          }}>
            {accounts.map((account, index) => (
              <div
                key={index}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                  border: '2px solid #e0e0e0',
                  transition: 'all 0.3s',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08)';
                }}
              >
                {/* Icône type */}
                <div style={{
                  fontSize: '2.5em',
                  marginBottom: '10px'
                }}>
                  {getTypeIcon(account.type)}
                </div>

                {/* Nom du compte */}
                <h4 style={{
                  fontSize: '1.1em',
                  fontWeight: 'bold',
                  color: '#2c3e50',
                  marginBottom: '8px'
                }}>
                  {account.nom}
                </h4>

                {/* Type */}
                <p style={{
                  fontSize: '0.9em',
                  color: '#7f8c8d',
                  marginBottom: '5px'
                }}>
                  <strong>Type:</strong> {getTypeLabel(account.type)}
                </p>

                {/* Institution */}
                {account.institution && (
                  <p style={{
                    fontSize: '0.9em',
                    color: '#7f8c8d',
                    marginBottom: '5px'
                  }}>
                    <strong>Institution:</strong> {account.institution}
                  </p>
                )}

                {/* Limite de crédit */}
                {account.type === 'credit' && account.limite && (
                  <p style={{
                    fontSize: '0.9em',
                    color: '#7f8c8d',
                    marginBottom: '5px'
                  }}>
                    <strong>Limite:</strong> {account.limite} $
                  </p>
                )}

                {/* Bouton supprimer */}
                <button
                  onClick={() => handleDeleteAccount(index)}
                  style={{
                    position: 'absolute',
                    top: '15px',
                    right: '15px',
                    background: '#ffebee',
                    border: '2px solid #ef5350',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '0.9em',
                    fontWeight: '600',
                    color: '#c62828',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#ef5350';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffebee';
                    e.currentTarget.style.color = '#c62828';
                  }}
                >
                  🗑️ Supprimer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message si aucun compte */}
      {accounts.length === 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
          padding: '30px',
          borderRadius: '15px',
          border: '2px solid #ff9800',
          marginBottom: '30px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3em', marginBottom: '15px' }}>🏦</div>
          <p style={{
            fontSize: '1.1em',
            fontWeight: '600',
            color: '#e65100',
            margin: 0
          }}>
            Aucun compte ajouté pour l'instant
          </p>
          <p style={{
            fontSize: '0.95em',
            color: '#f57c00',
            marginTop: '10px'
          }}>
            Ajoutez au moins un compte pour continuer
          </p>
        </div>
      )}

      {/* Bouton d'ajout / Formulaire d'ajout */}
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            width: '100%',
            padding: '20px',
            fontSize: '1.1em',
            fontWeight: 'bold',
            color: 'white',
            background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s',
            boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
            marginBottom: '30px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.3)';
          }}
        >
          ➕ Ajouter un compte
        </button>
      ) : (
        <div style={{
          background: 'white',
          borderRadius: '15px',
          padding: '30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '2px solid #4CAF50',
          marginBottom: '30px'
        }}>
          <h3 style={{
            fontSize: '1.2em',
            fontWeight: 'bold',
            color: '#2c3e50',
            marginBottom: '20px',
            fontFamily: "'Poppins', sans-serif"
          }}>
            ➕ Nouveau compte
          </h3>

          {/* Nom du compte */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontWeight: '600',
              color: '#2c3e50',
              marginBottom: '8px',
              fontSize: '0.95em'
            }}>
              Nom du compte <span style={{ color: '#e74c3c' }}>*</span>
            </label>
            <input
              type="text"
              value={newAccount.nom}
              onChange={(e) => setNewAccount({...newAccount, nom: e.target.value})}
              placeholder="Ex: Scotia-Débit, TD-Épargne"
              style={{
                width: '100%',
                padding: '12px 15px',
                fontSize: '1em',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                outline: 'none'
              }}
            />
          </div>

          {/* Type de compte */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontWeight: '600',
              color: '#2c3e50',
              marginBottom: '8px',
              fontSize: '0.95em'
            }}>
              Type de compte <span style={{ color: '#e74c3c' }}>*</span>
            </label>
            <select
              value={newAccount.type}
              onChange={(e) => setNewAccount({...newAccount, type: e.target.value})}
              style={{
                width: '100%',
                padding: '12px 15px',
                fontSize: '1em',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                outline: 'none',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">Sélectionnez...</option>
              <option value="cheque">💳 Compte chèque (compte courant)</option>
              <option value="epargne">🏦 Compte épargne</option>
              <option value="credit">💰 Carte de crédit</option>
            </select>
          </div>

          {/* Institution financière */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontWeight: '600',
              color: '#2c3e50',
              marginBottom: '8px',
              fontSize: '0.95em'
            }}>
              Institution financière (optionnel)
            </label>
            <input
              type="text"
              value={newAccount.institution}
              onChange={(e) => setNewAccount({...newAccount, institution: e.target.value})}
              placeholder="Ex: Banque Scotia, Desjardins"
              style={{
                width: '100%',
                padding: '12px 15px',
                fontSize: '1em',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                outline: 'none'
              }}
            />
          </div>

          {/* Limite de crédit (conditionnel) */}
          {newAccount.type === 'credit' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: '#2c3e50',
                marginBottom: '8px',
                fontSize: '0.95em'
              }}>
                Limite de crédit ($) <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="number"
                min="0"
                value={newAccount.limite}
                onChange={(e) => setNewAccount({...newAccount, limite: e.target.value})}
                placeholder="Ex: 5000"
                style={{
                  width: '100%',
                  padding: '12px 15px',
                  fontSize: '1em',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  outline: 'none'
                }}
              />
            </div>
          )}

          {/* Boutons du formulaire */}
          <div style={{
            display: 'flex',
            gap: '15px',
            marginTop: '25px'
          }}>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewAccount({ nom: '', type: '', institution: '', limite: '' });
              }}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '1em',
                fontWeight: '600',
                color: '#7f8c8d',
                background: 'white',
                border: '2px solid #bdc3c7',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ecf0f1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleAddAccount}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '1em',
                fontWeight: '600',
                color: 'white',
                background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              ✓ Ajouter ce compte
            </button>
          </div>
        </div>
      )}

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
              Conseil
            </p>
            <p style={{
              fontSize: '0.85em',
              color: '#1976d2',
              margin: 0,
              lineHeight: '1.5'
            }}>
              Ajoutez tous vos comptes pour avoir une vue d'ensemble complète de votre situation financière. Vous pourrez toujours ajouter ou supprimer des comptes plus tard.
            </p>
          </div>
        </div>
      </div>

      {/* Boutons de navigation */}
      <NavigationButtons 
        nextLabel="Suivant"
        backLabel="Retour"
      />
      </div>
    </div>
  );
};

export default Accounts;