import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Modal d'édition de budget pour une date spécifique
 * Permet de planifier des modifications de budget à appliquer à une date future
 */
const BudgetEditModal = ({ 
  isOpen, 
  onClose, 
  dateStr, 
  dateLabel,
  currentBudget,  // { entrees: [...], sorties: [...] }
  onSave 
}) => {
  const { getToken } = useAuth();
  const [entrees, setEntrees] = useState([]);
  const [sorties, setSorties] = useState([]);
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [existingModification, setExistingModification] = useState(null);
  const [activeTab, setActiveTab] = useState('entrees');
  const [editingItem, setEditingItem] = useState(null);

  // Charger les données existantes
  useEffect(() => {
    if (isOpen && dateStr) {
      loadExistingModification();
    }
  }, [isOpen, dateStr]);

  const loadExistingModification = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`http://localhost:3000/api/budget-modifications/${dateStr}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.modification) {
          setExistingModification(data.modification);
          setEntrees(data.modification.modifications?.entrees || currentBudget?.entrees || []);
          setSorties(data.modification.modifications?.sorties || currentBudget?.sorties || []);
          setDescription(data.modification.description || '');
        } else {
          // Pas de modification existante, utiliser le budget actuel
          setEntrees(currentBudget?.entrees || []);
          setSorties(currentBudget?.sorties || []);
          setDescription('');
        }
      }
    } catch (error) {
      console.error('Erreur chargement modification:', error);
      setEntrees(currentBudget?.entrees || []);
      setSorties(currentBudget?.sorties || []);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch('http://localhost:3000/api/budget-modifications', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          effectiveDate: dateStr,
          description,
          modifications: { entrees, sorties }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (onSave) onSave(data.modification);
        onClose();
      } else {
        alert('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingModification) return;
    if (!confirm('Supprimer cette modification planifiée ?')) return;

    setIsLoading(true);
    try {
      const token = await getToken();
      await fetch(`http://localhost:3000/api/budget-modifications/${existingModification.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      onClose();
    } catch (error) {
      console.error('Erreur suppression:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addNewItem = (type) => {
    const newItem = {
      id: `new-${Date.now()}`,
      description: '',
      montant: 0,
      compte: '',
      categorie: type === 'entrees' ? 'Revenu' : 'Dépense',
      frequence: 'mensuel',
      jourRecurrence: 1
    };
    
    if (type === 'entrees') {
      setEntrees([...entrees, newItem]);
    } else {
      setSorties([...sorties, newItem]);
    }
    setEditingItem(newItem.id);
  };

  const updateItem = (type, id, field, value) => {
    const setter = type === 'entrees' ? setEntrees : setSorties;
    const items = type === 'entrees' ? entrees : sorties;
    
    setter(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const deleteItem = (type, id) => {
    const setter = type === 'entrees' ? setEntrees : setSorties;
    const items = type === 'entrees' ? entrees : sorties;
    setter(items.filter(item => item.id !== id));
  };

  const formatMontant = (val) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(val || 0);
  };

  if (!isOpen) return null;

  const items = activeTab === 'entrees' ? entrees : sorties;

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(5px)'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%)',
          borderRadius: '20px',
          width: '90%',
          maxWidth: '800px',
          maxHeight: '85vh',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          padding: '20px 25px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '1.3em' }}>
              📅 Modification planifiée
            </h2>
            <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '0.9em' }}>
              {dateLabel || dateStr}
              {existingModification && (
                <span style={{
                  marginLeft: '10px',
                  background: 'rgba(255,255,255,0.2)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '0.8em'
                }}>
                  ✓ Modification existante
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '35px',
              height: '35px',
              cursor: 'pointer',
              color: 'white',
              fontSize: '1.2em'
            }}
          >
            ✕
          </button>
        </div>

        {/* Description */}
        <div style={{ padding: '15px 25px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85em' }}>
            Description de la modification :
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Augmentation de salaire, Nouveau loyer..."
            style={{
              width: '100%',
              padding: '10px 15px',
              marginTop: '8px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '10px',
              color: 'white',
              fontSize: '0.95em'
            }}
          />
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <button
            onClick={() => setActiveTab('entrees')}
            style={{
              flex: 1,
              padding: '15px',
              background: activeTab === 'entrees' 
                ? 'rgba(39, 174, 96, 0.3)' 
                : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'entrees' 
                ? '3px solid #27ae60' 
                : '3px solid transparent',
              color: activeTab === 'entrees' ? '#27ae60' : 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.95em'
            }}
          >
            💰 Entrées ({entrees.length})
          </button>
          <button
            onClick={() => setActiveTab('sorties')}
            style={{
              flex: 1,
              padding: '15px',
              background: activeTab === 'sorties' 
                ? 'rgba(231, 76, 60, 0.3)' 
                : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'sorties' 
                ? '3px solid #e74c3c' 
                : '3px solid transparent',
              color: activeTab === 'sorties' ? '#e74c3c' : 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.95em'
            }}
          >
            💸 Sorties ({sorties.length})
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '20px 25px',
          maxHeight: '350px',
          overflowY: 'auto'
        }}>
          {items.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '30px',
              color: 'rgba(255,255,255,0.5)'
            }}>
              Aucun élément. Cliquez sur + pour ajouter.
            </div>
          ) : (
            items.map((item, idx) => (
              <div 
                key={item.id || idx}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  padding: '15px',
                  marginBottom: '10px',
                  border: editingItem === item.id 
                    ? '2px solid #667eea' 
                    : '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: editingItem === item.id ? '15px' : '0'
                }}>
                  <div style={{ flex: 1 }}>
                    {editingItem === item.id ? (
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(activeTab, item.id, 'description', e.target.value)}
                        placeholder="Description"
                        style={{
                          background: 'rgba(255,255,255,0.1)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          color: 'white',
                          width: '100%'
                        }}
                      />
                    ) : (
                      <span style={{ color: 'white', fontWeight: '500' }}>
                        {item.description || 'Sans description'}
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontWeight: 'bold',
                    color: activeTab === 'entrees' ? '#27ae60' : '#e74c3c',
                    marginLeft: '15px'
                  }}>
                    {editingItem === item.id ? (
                      <input
                        type="number"
                        value={item.montant}
                        onChange={(e) => updateItem(activeTab, item.id, 'montant', parseFloat(e.target.value) || 0)}
                        style={{
                          background: 'rgba(255,255,255,0.1)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          color: activeTab === 'entrees' ? '#27ae60' : '#e74c3c',
                          width: '100px',
                          textAlign: 'right'
                        }}
                      />
                    ) : (
                      formatMontant(item.montant)
                    )}
                  </div>
                  <div style={{ marginLeft: '10px', display: 'flex', gap: '5px' }}>
                    <button
                      onClick={() => setEditingItem(editingItem === item.id ? null : item.id)}
                      style={{
                        background: 'rgba(102, 126, 234, 0.3)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '5px 10px',
                        cursor: 'pointer',
                        color: '#667eea'
                      }}
                    >
                      {editingItem === item.id ? '✓' : '✏️'}
                    </button>
                    <button
                      onClick={() => deleteItem(activeTab, item.id)}
                      style={{
                        background: 'rgba(231, 76, 60, 0.3)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '5px 10px',
                        cursor: 'pointer',
                        color: '#e74c3c'
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {editingItem === item.id && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '10px',
                    marginTop: '10px'
                  }}>
                    <div>
                      <label style={{ fontSize: '0.75em', color: 'rgba(255,255,255,0.5)' }}>Compte</label>
                      <input
                        type="text"
                        value={item.compte || ''}
                        onChange={(e) => updateItem(activeTab, item.id, 'compte', e.target.value)}
                        style={{
                          background: 'rgba(255,255,255,0.1)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          color: 'white',
                          width: '100%'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75em', color: 'rgba(255,255,255,0.5)' }}>Fréquence</label>
                      <select
                        value={item.frequence || 'mensuel'}
                        onChange={(e) => updateItem(activeTab, item.id, 'frequence', e.target.value)}
                        style={{
                          background: 'rgba(255,255,255,0.1)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          color: 'white',
                          width: '100%'
                        }}
                      >
                        <option value="mensuel">Mensuel</option>
                        <option value="hebdomadaire">Hebdomadaire</option>
                        <option value="bi-hebdomadaire">Bi-hebdomadaire</option>
                        <option value="annuel">Annuel</option>
                        <option value="ponctuel">Ponctuel</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75em', color: 'rgba(255,255,255,0.5)' }}>Jour</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={item.jourRecurrence || 1}
                        onChange={(e) => updateItem(activeTab, item.id, 'jourRecurrence', parseInt(e.target.value) || 1)}
                        style={{
                          background: 'rgba(255,255,255,0.1)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          color: 'white',
                          width: '100%'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Bouton Ajouter */}
          <button
            onClick={() => addNewItem(activeTab)}
            style={{
              width: '100%',
              padding: '15px',
              background: 'rgba(255,255,255,0.05)',
              border: '2px dashed rgba(255,255,255,0.2)',
              borderRadius: '12px',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: '0.95em',
              marginTop: '10px'
            }}
          >
            + Ajouter une {activeTab === 'entrees' ? 'entrée' : 'sortie'}
          </button>
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 25px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            {existingModification && (
              <button
                onClick={handleDelete}
                disabled={isLoading}
                style={{
                  background: 'rgba(231, 76, 60, 0.3)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 20px',
                  color: '#e74c3c',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🗑️ Supprimer
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 25px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 25px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {isLoading ? '⏳ Sauvegarde...' : '💾 Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetEditModal;
