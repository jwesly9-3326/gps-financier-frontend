// 📊 BUDGET PLANNING - Étape 4 de l'onboarding Pl4to
// Planification des revenus et dépenses récurrents
// VERSION FINALE: Couleurs basées sur le TYPE (entrée=vert, sortie=rouge), PAS sur le signe du montant

import { useState } from 'react';
import { useOnboarding } from '../../context/OnboardingContext';
import NavigationButtons from '../../components/onboarding/NavigationButtons';

// Composant formulaire inline DÉFINI EN DEHORS pour éviter les re-renders
const InlineForm = ({ 
  data, 
  setData, 
  onSave, 
  onCancel, 
  type, 
  isEdit,
  accounts,
  getActivitesForAccount,
  frequences,
  joursSemaine
}) => {
  
  const handleChange = (field, value) => {
    if (field === 'compte') {
      setData({ ...data, [field]: value, typeActivite: '' });
    } else {
      setData({ ...data, [field]: value });
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      padding: '15px',
      background: '#f8f9fa',
      borderRadius: '8px'
    }}>
      <input
        type="text"
        placeholder={type === 'entree' ? "Description (ex: Salaire)" : "Description (ex: Loyer)"}
        value={data.description}
        onChange={(e) => handleChange('description', e.target.value)}
        style={{
          padding: '10px',
          border: '2px solid #e0e0e0',
          borderRadius: '6px',
          fontSize: '0.9em'
        }}
      />

      <select
        value={data.frequence}
        onChange={(e) => handleChange('frequence', e.target.value)}
        style={{
          padding: '10px',
          border: '2px solid #e0e0e0',
          borderRadius: '6px',
          fontSize: '0.9em'
        }}
      >
        <option value="">Fréquence...</option>
        {frequences.map(f => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      <input
        type="text"
        inputMode="decimal"
        placeholder="Montant ($)"
        value={data.montant}
        onChange={(e) => {
          // Permettre les chiffres, points et virgules
          const value = e.target.value.replace(',', '.');
          if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
            handleChange('montant', e.target.value);
          }
        }}
        style={{
          padding: '10px',
          border: '2px solid #e0e0e0',
          borderRadius: '6px',
          fontSize: '0.9em'
        }}
      />

      <select
        value={data.compte}
        onChange={(e) => handleChange('compte', e.target.value)}
        style={{
          padding: '10px',
          border: '2px solid #e0e0e0',
          borderRadius: '6px',
          fontSize: '0.9em'
        }}
      >
        <option value="">Compte...</option>
        {accounts.map(acc => (
          <option key={acc.nom} value={acc.nom}>{acc.nom}</option>
        ))}
      </select>

      {data.compte && (
        <select
          value={data.typeActivite}
          onChange={(e) => handleChange('typeActivite', e.target.value)}
          style={{
            padding: '10px',
            border: '2px solid #e0e0e0',
            borderRadius: '6px',
            fontSize: '0.9em'
          }}
        >
          <option value="">Type d'activité...</option>
          {getActivitesForAccount(data.compte, type).map(act => (
            <option key={act} value={act}>{act}</option>
          ))}
        </select>
      )}

      {data.frequence === 'hebdomadaire' ? (
        <select
          value={data.jourRecurrence}
          onChange={(e) => handleChange('jourRecurrence', e.target.value)}
          style={{
            padding: '10px',
            border: '2px solid #e0e0e0',
            borderRadius: '6px',
            fontSize: '0.9em'
          }}
        >
          <option value="">Jour de la semaine...</option>
          {joursSemaine.map(j => (
            <option key={j} value={j}>{j}</option>
          ))}
        </select>
      ) : (
        data.frequence && (
          <input
            type="text"
            inputMode="numeric"
            placeholder="Jour du mois (1-31)"
            value={data.jourRecurrence}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '' || (/^\d+$/.test(value) && parseInt(value) <= 31)) {
                handleChange('jourRecurrence', value);
              }
            }}
            style={{
              padding: '10px',
              border: '2px solid #e0e0e0',
              borderRadius: '6px',
              fontSize: '0.9em'
            }}
          />
        )
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '10px',
            fontSize: '0.9em',
            fontWeight: '600',
            color: '#7f8c8d',
            background: 'white',
            border: '2px solid #bdc3c7',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onSave}
          style={{
            flex: 1,
            padding: '10px',
            fontSize: '0.9em',
            fontWeight: '600',
            color: 'white',
            background: type === 'entree' ? '#4CAF50' : '#e74c3c',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          {isEdit ? '✓ Enregistrer' : '✓ Ajouter'}
        </button>
      </div>
    </div>
  );
};

const BudgetPlanning = () => {
  const { formData, addBudgetItem, updateBudgetItem, deleteBudgetItem } = useOnboarding();
  const { entrees, sorties } = formData.budgetPlanning;
  const accounts = formData.accounts;
  const accountActivities = formData.accountActivities;

  // État pour les formulaires d'ajout
  const [showAddEntree, setShowAddEntree] = useState(false);
  const [showAddSortie, setShowAddSortie] = useState(false);

  // État pour le mode édition (index de l'item en édition)
  const [editingEntreeIndex, setEditingEntreeIndex] = useState(null);
  const [editingSortieIndex, setEditingSortieIndex] = useState(null);

  // État pour le formulaire d'entrée (ajout)
  const [newEntree, setNewEntree] = useState({
    description: '',
    frequence: '',
    montant: '',
    compte: '',
    typeActivite: '',
    jourRecurrence: ''
  });

  // État pour le formulaire de sortie (ajout)
  const [newSortie, setNewSortie] = useState({
    description: '',
    frequence: '',
    montant: '',
    compte: '',
    typeActivite: '',
    jourRecurrence: ''
  });

  // État pour le formulaire d'édition d'entrée
  const [editEntreeData, setEditEntreeData] = useState({
    description: '',
    frequence: '',
    montant: '',
    compte: '',
    typeActivite: '',
    jourRecurrence: ''
  });

  // État pour le formulaire d'édition de sortie
  const [editSortieData, setEditSortieData] = useState({
    description: '',
    frequence: '',
    montant: '',
    compte: '',
    typeActivite: '',
    jourRecurrence: ''
  });

  // Options de fréquence
  const frequences = [
    { value: 'mensuel', label: 'Mensuel' },
    { value: 'quinzaine', label: 'Quinzaine (aux 2 semaines)' },
    { value: 'bimensuel', label: 'Bimensuel (2x par mois)' },
    { value: 'hebdomadaire', label: 'Hebdomadaire' }
  ];

  // Jours de la semaine
  const joursSemaine = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  // Obtenir les activités disponibles pour un compte sélectionné
  const getActivitesForAccount = (accountName, type) => {
    const activities = accountActivities[accountName];
    if (!activities) return [];
    return type === 'entree' ? activities.entrees : activities.sorties;
  };

  // Vérifier si un compte est de type crédit
  const isCompteCredit = (compteName) => {
    const compte = accounts.find(acc => acc.nom === compteName);
    return compte && compte.type === 'credit';
  };

  // Parser le montant (accepte virgule ou point)
  const parseMontant = (value) => {
    if (!value) return 0;
    return parseFloat(value.toString().replace(',', '.')) || 0;
  };

  // ============================================================
  // LOGIQUE DE SIGNE DES MONTANTS
  // ============================================================
  // Compte NORMAL (chèque, épargne, investissement):
  //   - Entrée = POSITIF (argent qui rentre)
  //   - Sortie = NÉGATIF (argent qui sort)
  //
  // Compte CRÉDIT:
  //   - Entrée (paiement carte) = NÉGATIF (diminue la dette = bon)
  //   - Sortie (achat avec carte) = POSITIF (augmente la dette = mauvais)
  // ============================================================
  const calculerMontantAvecSigne = (montant, compteName, typeTransaction) => {
    const montantAbs = Math.abs(parseMontant(montant));
    const estCredit = isCompteCredit(compteName);
    
    if (estCredit) {
      // Compte crédit: logique inversée
      if (typeTransaction === 'entree') {
        // Paiement de la carte = diminue la dette = NÉGATIF
        return -montantAbs;
      } else {
        // Achat avec la carte = augmente la dette = POSITIF
        return montantAbs;
      }
    } else {
      // Compte normal (chèque, épargne, investissement)
      if (typeTransaction === 'entree') {
        // Argent qui rentre = POSITIF
        return montantAbs;
      } else {
        // Argent qui sort = NÉGATIF
        return -montantAbs;
      }
    }
  };

  // ============================================================
  // COULEURS - BASÉES SUR LE TYPE, PAS SUR LE SIGNE
  // ============================================================
  // ENTRÉE = toujours VERT (bon pour les finances, peu importe le signe)
  // SORTIE = toujours ROUGE (mauvais pour les finances, peu importe le signe)
  // ============================================================

  // Couleur de bordure pour les ENTRÉES = VERT
  const getBorderColorEntree = () => {
    return '#4CAF50';
  };

  // Couleur de bordure pour les SORTIES = ROUGE
  const getBorderColorSortie = () => {
    return '#e74c3c';
  };

  // Couleur du montant pour les ENTRÉES = VERT (peu importe si -232$ ou +2064$)
  const getMontantColorEntree = () => {
    return '#27ae60';
  };

  // Couleur du montant pour les SORTIES = ROUGE (peu importe si +104$ ou -16$)
  const getMontantColorSortie = () => {
    return '#e74c3c';
  };

  // Réinitialiser le formulaire d'ajout d'entrée
  const resetAddEntreeForm = () => {
    setNewEntree({
      description: '',
      frequence: '',
      montant: '',
      compte: '',
      typeActivite: '',
      jourRecurrence: ''
    });
    setShowAddEntree(false);
  };

  // Réinitialiser le formulaire d'ajout de sortie
  const resetAddSortieForm = () => {
    setNewSortie({
      description: '',
      frequence: '',
      montant: '',
      compte: '',
      typeActivite: '',
      jourRecurrence: ''
    });
    setShowAddSortie(false);
  };

  // Ajouter une entrée
  const handleAddEntree = () => {
    if (!newEntree.description || !newEntree.frequence || !newEntree.montant || !newEntree.compte || !newEntree.typeActivite || !newEntree.jourRecurrence) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const montantFinal = calculerMontantAvecSigne(newEntree.montant, newEntree.compte, 'entree');

    addBudgetItem('entrees', {
      ...newEntree,
      montant: montantFinal.toString(),
      id: Date.now()
    });

    resetAddEntreeForm();
  };

  // Ajouter une sortie
  const handleAddSortie = () => {
    if (!newSortie.description || !newSortie.frequence || !newSortie.montant || !newSortie.compte || !newSortie.typeActivite || !newSortie.jourRecurrence) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const montantFinal = calculerMontantAvecSigne(newSortie.montant, newSortie.compte, 'sortie');

    addBudgetItem('sorties', {
      ...newSortie,
      montant: montantFinal.toString(),
      id: Date.now()
    });

    resetAddSortieForm();
  };

  // Commencer l'édition d'une entrée
  const startEditEntree = (index) => {
    const entree = entrees[index];
    setEditEntreeData({
      description: entree.description,
      frequence: entree.frequence,
      montant: Math.abs(parseMontant(entree.montant)).toString(),
      compte: entree.compte,
      typeActivite: entree.typeActivite,
      jourRecurrence: entree.jourRecurrence
    });
    setEditingEntreeIndex(index);
    setEditingSortieIndex(null);
    setShowAddEntree(false);
    setShowAddSortie(false);
  };

  // Sauvegarder l'édition d'une entrée
  const handleSaveEntree = () => {
    if (!editEntreeData.description || !editEntreeData.frequence || !editEntreeData.montant || !editEntreeData.compte || !editEntreeData.typeActivite || !editEntreeData.jourRecurrence) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const montantFinal = calculerMontantAvecSigne(editEntreeData.montant, editEntreeData.compte, 'entree');

    updateBudgetItem('entrees', editingEntreeIndex, {
      ...entrees[editingEntreeIndex],
      ...editEntreeData,
      montant: montantFinal.toString()
    });

    setEditingEntreeIndex(null);
  };

  // Annuler l'édition d'une entrée
  const cancelEditEntree = () => {
    setEditingEntreeIndex(null);
  };

  // Commencer l'édition d'une sortie
  const startEditSortie = (index) => {
    const sortie = sorties[index];
    setEditSortieData({
      description: sortie.description,
      frequence: sortie.frequence,
      montant: Math.abs(parseMontant(sortie.montant)).toString(),
      compte: sortie.compte,
      typeActivite: sortie.typeActivite,
      jourRecurrence: sortie.jourRecurrence
    });
    setEditingSortieIndex(index);
    setEditingEntreeIndex(null);
    setShowAddEntree(false);
    setShowAddSortie(false);
  };

  // Sauvegarder l'édition d'une sortie
  const handleSaveSortie = () => {
    if (!editSortieData.description || !editSortieData.frequence || !editSortieData.montant || !editSortieData.compte || !editSortieData.typeActivite || !editSortieData.jourRecurrence) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const montantFinal = calculerMontantAvecSigne(editSortieData.montant, editSortieData.compte, 'sortie');

    updateBudgetItem('sorties', editingSortieIndex, {
      ...sorties[editingSortieIndex],
      ...editSortieData,
      montant: montantFinal.toString()
    });

    setEditingSortieIndex(null);
  };

  // Annuler l'édition d'une sortie
  const cancelEditSortie = () => {
    setEditingSortieIndex(null);
  };

  // Supprimer une entrée
  const handleDeleteEntree = (index) => {
    if (window.confirm('Supprimer cette entrée?')) {
      deleteBudgetItem('entrees', index);
      if (editingEntreeIndex === index) {
        setEditingEntreeIndex(null);
      }
    }
  };

  // Supprimer une sortie
  const handleDeleteSortie = (index) => {
    if (window.confirm('Supprimer cette sortie?')) {
      deleteBudgetItem('sorties', index);
      if (editingSortieIndex === index) {
        setEditingSortieIndex(null);
      }
    }
  };

  // Formater la fréquence pour affichage
  const formatFrequence = (freq) => {
    const map = {
      'mensuel': 'Mensuel',
      'quinzaine': 'Quinzaine',
      'bimensuel': 'Bimensuel',
      'hebdomadaire': 'Hebdomadaire'
    };
    return map[freq] || freq;
  };

  // Formater la date de récurrence
  const formatJourRecurrence = (jour, frequence) => {
    if (frequence === 'hebdomadaire') {
      return `Chaque ${jour}`;
    }
    return `Jour ${jour}`;
  };

  // Formater le montant pour affichage
  const formatMontant = (montant) => {
    const num = parseMontant(montant);
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(num);
  };

  return (
    <div style={{
      minHeight: '100vh',
      paddingBottom: '60px'
    }}>
      <div style={{
        maxWidth: '1200px',
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
              Étape 4/6
            </span>
          </div>
          
          <h1 style={{
            fontSize: '2em',
            fontWeight: 'bold',
            color: '#2c3e50',
            marginBottom: '10px',
            fontFamily: "'Poppins', sans-serif"
          }}>
            📊 Planification budgétaire
          </h1>
          
          <p style={{
            fontSize: '1em',
            color: '#7f8c8d',
            lineHeight: '1.6'
          }}>
            Définissez vos revenus et dépenses récurrents
          </p>
        </div>

        {/* Message d'aide général */}
        <div style={{
          background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
          padding: '20px',
          borderRadius: '12px',
          border: '2px solid #ff9800',
          marginBottom: '40px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'start',
            gap: '15px'
          }}>
            <span style={{ fontSize: '2em' }}>💡</span>
            <div>
              <p style={{
                fontSize: '1em',
                fontWeight: '600',
                color: '#e65100',
                margin: '0 0 8px 0'
              }}>
                Plus vous ajoutez de planifications, plus votre parcours financier sera précis!
              </p>
              <p style={{
                fontSize: '0.9em',
                color: '#f57c00',
                margin: 0,
                lineHeight: '1.5'
              }}>
                Ajoutez tous vos revenus et dépenses réguliers. Vous pourrez toujours les modifier plus tard.
              </p>
            </div>
          </div>
        </div>

        {/* Grille 2 colonnes: Entrées | Sorties */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '30px',
          marginBottom: '30px'
        }}>
          {/* COLONNE ENTRÉES (REVENUS) */}
          <div>
            <h2 style={{
              fontSize: '1.4em',
              fontWeight: 'bold',
              color: '#2c3e50',
              marginBottom: '20px',
              fontFamily: "'Poppins', sans-serif",
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              💰 Entrées (Revenus)
            </h2>

            {/* Liste des entrées */}
            {entrees.length > 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                marginBottom: '20px'
              }}>
                {entrees.map((entree, index) => (
                  <div
                    key={entree.id || index}
                    style={{
                      background: 'white',
                      borderRadius: '10px',
                      padding: '15px',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                      border: editingEntreeIndex === index ? '2px solid #2196f3' : `2px solid ${getBorderColorEntree()}`,
                      position: 'relative'
                    }}
                  >
                    {editingEntreeIndex === index ? (
                      // MODE ÉDITION INLINE
                      <InlineForm
                        data={editEntreeData}
                        setData={setEditEntreeData}
                        onSave={handleSaveEntree}
                        onCancel={cancelEditEntree}
                        type="entree"
                        isEdit={true}
                        accounts={accounts}
                        getActivitesForAccount={getActivitesForAccount}
                        frequences={frequences}
                        joursSemaine={joursSemaine}
                      />
                    ) : (
                      // MODE AFFICHAGE
                      <>
                        {/* Boutons d'action */}
                        <div style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          display: 'flex',
                          gap: '8px'
                        }}>
                          <button
                            onClick={() => startEditEntree(index)}
                            style={{
                              background: '#e3f2fd',
                              border: '1px solid #2196f3',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              cursor: 'pointer',
                              fontSize: '0.8em',
                              color: '#1565c0'
                            }}
                            title="Modifier"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteEntree(index)}
                            style={{
                              background: '#ffebee',
                              border: '1px solid #ef5350',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              cursor: 'pointer',
                              fontSize: '0.8em',
                              color: '#c62828'
                            }}
                            title="Supprimer"
                          >
                            🗑️
                          </button>
                        </div>

                        <h4 style={{
                          fontSize: '1em',
                          fontWeight: 'bold',
                          color: '#2c3e50',
                          marginBottom: '8px',
                          paddingRight: '80px'
                        }}>
                          {entree.description}
                        </h4>
                        <p style={{
                          fontSize: '0.85em',
                          color: '#7f8c8d',
                          margin: '4px 0'
                        }}>
                          <strong>Montant:</strong> <span style={{ color: getMontantColorEntree(), fontWeight: '600' }}>{formatMontant(entree.montant)}</span>
                        </p>
                        <p style={{
                          fontSize: '0.85em',
                          color: '#7f8c8d',
                          margin: '4px 0'
                        }}>
                          <strong>Fréquence:</strong> {formatFrequence(entree.frequence)} - {formatJourRecurrence(entree.jourRecurrence, entree.frequence)}
                        </p>
                        <p style={{
                          fontSize: '0.85em',
                          color: '#7f8c8d',
                          margin: '4px 0'
                        }}>
                          <strong>Compte:</strong> {entree.compte}
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                background: '#f5f5f5',
                padding: '30px',
                borderRadius: '10px',
                textAlign: 'center',
                marginBottom: '20px',
                border: '2px dashed #bdc3c7'
              }}>
                <p style={{
                  color: '#7f8c8d',
                  fontSize: '0.95em',
                  margin: 0
                }}>
                  Aucune entrée ajoutée
                </p>
              </div>
            )}

            {/* Bouton ajouter entrée ou formulaire */}
            {!showAddEntree ? (
              <button
                onClick={() => {
                  resetAddEntreeForm();
                  setShowAddEntree(true);
                  setShowAddSortie(false);
                  setEditingEntreeIndex(null);
                  setEditingSortieIndex(null);
                }}
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '1em',
                  fontWeight: '600',
                  color: 'white',
                  background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                ➕ Ajouter une entrée
              </button>
            ) : (
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '10px',
                border: '2px solid #4CAF50',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }}>
                <h4 style={{
                  fontSize: '1.1em',
                  fontWeight: 'bold',
                  color: '#2c3e50',
                  marginBottom: '15px'
                }}>
                  ➕ Nouvelle entrée
                </h4>
                <InlineForm
                  data={newEntree}
                  setData={setNewEntree}
                  onSave={handleAddEntree}
                  onCancel={resetAddEntreeForm}
                  type="entree"
                  isEdit={false}
                  accounts={accounts}
                  getActivitesForAccount={getActivitesForAccount}
                  frequences={frequences}
                  joursSemaine={joursSemaine}
                />
              </div>
            )}
          </div>

          {/* COLONNE SORTIES (DÉPENSES) */}
          <div>
            <h2 style={{
              fontSize: '1.4em',
              fontWeight: 'bold',
              color: '#2c3e50',
              marginBottom: '20px',
              fontFamily: "'Poppins', sans-serif",
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              💸 Sorties (Dépenses)
            </h2>

            {/* Liste des sorties */}
            {sorties.length > 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                marginBottom: '20px'
              }}>
                {sorties.map((sortie, index) => (
                  <div
                    key={sortie.id || index}
                    style={{
                      background: 'white',
                      borderRadius: '10px',
                      padding: '15px',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                      border: editingSortieIndex === index ? '2px solid #2196f3' : `2px solid ${getBorderColorSortie()}`,
                      position: 'relative'
                    }}
                  >
                    {editingSortieIndex === index ? (
                      // MODE ÉDITION INLINE
                      <InlineForm
                        data={editSortieData}
                        setData={setEditSortieData}
                        onSave={handleSaveSortie}
                        onCancel={cancelEditSortie}
                        type="sortie"
                        isEdit={true}
                        accounts={accounts}
                        getActivitesForAccount={getActivitesForAccount}
                        frequences={frequences}
                        joursSemaine={joursSemaine}
                      />
                    ) : (
                      // MODE AFFICHAGE
                      <>
                        {/* Boutons d'action */}
                        <div style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          display: 'flex',
                          gap: '8px'
                        }}>
                          <button
                            onClick={() => startEditSortie(index)}
                            style={{
                              background: '#e3f2fd',
                              border: '1px solid #2196f3',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              cursor: 'pointer',
                              fontSize: '0.8em',
                              color: '#1565c0'
                            }}
                            title="Modifier"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteSortie(index)}
                            style={{
                              background: '#ffebee',
                              border: '1px solid #ef5350',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              cursor: 'pointer',
                              fontSize: '0.8em',
                              color: '#c62828'
                            }}
                            title="Supprimer"
                          >
                            🗑️
                          </button>
                        </div>

                        <h4 style={{
                          fontSize: '1em',
                          fontWeight: 'bold',
                          color: '#2c3e50',
                          marginBottom: '8px',
                          paddingRight: '80px'
                        }}>
                          {sortie.description}
                        </h4>
                        <p style={{
                          fontSize: '0.85em',
                          color: '#7f8c8d',
                          margin: '4px 0'
                        }}>
                          <strong>Montant:</strong> <span style={{ color: getMontantColorSortie(), fontWeight: '600' }}>{formatMontant(sortie.montant)}</span>
                        </p>
                        <p style={{
                          fontSize: '0.85em',
                          color: '#7f8c8d',
                          margin: '4px 0'
                        }}>
                          <strong>Fréquence:</strong> {formatFrequence(sortie.frequence)} - {formatJourRecurrence(sortie.jourRecurrence, sortie.frequence)}
                        </p>
                        <p style={{
                          fontSize: '0.85em',
                          color: '#7f8c8d',
                          margin: '4px 0'
                        }}>
                          <strong>Compte:</strong> {sortie.compte}
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                background: '#f5f5f5',
                padding: '30px',
                borderRadius: '10px',
                textAlign: 'center',
                marginBottom: '20px',
                border: '2px dashed #bdc3c7'
              }}>
                <p style={{
                  color: '#7f8c8d',
                  fontSize: '0.95em',
                  margin: 0
                }}>
                  Aucune sortie ajoutée
                </p>
              </div>
            )}

            {/* Bouton ajouter sortie ou formulaire */}
            {!showAddSortie ? (
              <button
                onClick={() => {
                  resetAddSortieForm();
                  setShowAddSortie(true);
                  setShowAddEntree(false);
                  setEditingEntreeIndex(null);
                  setEditingSortieIndex(null);
                }}
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '1em',
                  fontWeight: '600',
                  color: 'white',
                  background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                ➕ Ajouter une sortie
              </button>
            ) : (
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '10px',
                border: '2px solid #e74c3c',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }}>
                <h4 style={{
                  fontSize: '1.1em',
                  fontWeight: 'bold',
                  color: '#2c3e50',
                  marginBottom: '15px'
                }}>
                  ➕ Nouvelle sortie
                </h4>
                <InlineForm
                  data={newSortie}
                  setData={setNewSortie}
                  onSave={handleAddSortie}
                  onCancel={resetAddSortieForm}
                  type="sortie"
                  isEdit={false}
                  accounts={accounts}
                  getActivitesForAccount={getActivitesForAccount}
                  frequences={frequences}
                  joursSemaine={joursSemaine}
                />
              </div>
            )}
          </div>
        </div>

        {/* Boutons de navigation */}
        <NavigationButtons />
      </div>
    </div>
  );
};

export default BudgetPlanning;