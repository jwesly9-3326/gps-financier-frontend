// 🚀 SUMMARY - Étape 7 (finale) de l'onboarding Pl4to
// Résumé complet et génération du dashboard personnalisé
// VERSION CORRIGÉE: Valeur nette cachée, flèches fonctionnelles, bouton "Lancer mon outil"

import { useState } from 'react';
import { useOnboarding } from '../../context/OnboardingContext';

const Summary = () => {
  const { formData, goBack, finalizeOnboarding, isLoading } = useOnboarding();
  
  // État pour les sections dépliées
  const [expandedSections, setExpandedSections] = useState({
    profil: true,
    comptes: true,
    activites: false,
    budget: false,
    soldes: true,
    objectifs: false
  });

  // Toggle section - CORRIGÉ avec preventDefault
  const toggleSection = (e, section) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Formater le montant
  const formatMontant = (montant) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(montant);
  };

  // Calculer la valeur nette
  const calculateNetWorth = () => {
    const soldes = formData.initialBalances.soldes || [];
    let total = 0;
    
    soldes.forEach(s => {
      const montant = parseFloat(s.solde) || 0;
      if (s.accountType === 'credit') {
        total -= montant;
      } else {
        total += montant;
      }
    });
    
    return total;
  };

  // Déterminer si la valeur nette est positive
  const isNetPositif = calculateNetWorth() >= 0;

  // Obtenir l'icône du type de compte
  const getAccountIcon = (type) => {
    const icons = {
      'cheque': '💳',
      'epargne': '🏦',
      'credit': '💰',
      'investissement': '📈'
    };
    return icons[type] || '💼';
  };

  // Obtenir l'icône du type d'objectif
  const getGoalIcon = (type) => {
    const icons = {
      'epargne': '💰',
      'dette': '💳',
      'investissement': '📈',
      'urgence': '🆘',
      'achat': '🛒',
      'voyage': '✈️',
      'autre': '✨'
    };
    return icons[type] || '🎯';
  };

  // Composant Section - CORRIGÉ avec type="button"
  const Section = ({ id, title, icon, children, count }) => (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      marginBottom: '15px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
      border: '1px solid #e0e0e0',
      overflow: 'hidden'
    }}>
      <button
        type="button"
        onClick={(e) => toggleSection(e, id)}
        style={{
          width: '100%',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: expandedSections[id] ? 'linear-gradient(135deg, #667eea10 0%, #764ba210 100%)' : 'white',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.3s'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '1.5em' }}>{icon}</span>
          <span style={{
            fontSize: '1.1em',
            fontWeight: '600',
            color: '#2c3e50'
          }}>
            {title}
          </span>
          {count !== undefined && (
            <span style={{
              background: '#667eea',
              color: 'white',
              padding: '3px 10px',
              borderRadius: '15px',
              fontSize: '0.8em',
              fontWeight: '600'
            }}>
              {count}
            </span>
          )}
        </div>
        <span style={{
          fontSize: '1.2em',
          color: '#667eea',
          transform: expandedSections[id] ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s'
        }}>
          ▼
        </span>
      </button>
      
      {expandedSections[id] && (
        <div style={{
          padding: '20px',
          borderTop: '1px solid #e0e0e0'
        }}>
          {children}
        </div>
      )}
    </div>
  );

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
              Étape finale
            </span>
          </div>
          
          <h1 style={{
            fontSize: '2em',
            fontWeight: 'bold',
            color: '#2c3e50',
            marginBottom: '10px',
            fontFamily: "'Poppins', sans-serif"
          }}>
            ✨ Résumé de votre configuration
          </h1>
          
          <p style={{
            fontSize: '1em',
            color: '#7f8c8d',
            lineHeight: '1.6'
          }}>
            Vérifiez vos informations avant de lancer votre outil personnalisé
          </p>
        </div>

        {/* Carte résumé rapide */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '20px',
          padding: '30px',
          marginBottom: '30px',
          color: 'white'
        }}>
          <h2 style={{
            fontSize: '1.3em',
            fontWeight: 'bold',
            marginBottom: '25px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            📊 Aperçu rapide
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '20px'
          }}>
            {/* Comptes */}
            <div style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '2em', margin: 0 }}>💳</p>
              <p style={{ fontSize: '2em', fontWeight: 'bold', margin: '5px 0' }}>
                {formData.accounts.length}
              </p>
              <p style={{ fontSize: '0.9em', opacity: 0.9, margin: 0 }}>Comptes</p>
            </div>

            {/* Entrées budget */}
            <div style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '2em', margin: 0 }}>💰</p>
              <p style={{ fontSize: '2em', fontWeight: 'bold', margin: '5px 0' }}>
                {formData.budgetPlanning.entrees.length}
              </p>
              <p style={{ fontSize: '0.9em', opacity: 0.9, margin: 0 }}>Revenus</p>
            </div>

            {/* Sorties budget */}
            <div style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '2em', margin: 0 }}>💸</p>
              <p style={{ fontSize: '2em', fontWeight: 'bold', margin: '5px 0' }}>
                {formData.budgetPlanning.sorties.length}
              </p>
              <p style={{ fontSize: '0.9em', opacity: 0.9, margin: 0 }}>Dépenses</p>
            </div>

            {/* Objectifs */}
            <div style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '2em', margin: 0 }}>🎯</p>
              <p style={{ fontSize: '2em', fontWeight: 'bold', margin: '5px 0' }}>
                {formData.financialGoals.length}
              </p>
              <p style={{ fontSize: '0.9em', opacity: 0.9, margin: 0 }}>Objectifs</p>
            </div>
          </div>

        </div>

        {/* Sections détaillées */}
        
        {/* Section Profil */}
        <Section id="profil" title="Profil" icon="👤">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '15px'
          }}>
            <div>
              <p style={{ fontSize: '0.85em', color: '#7f8c8d', margin: '0 0 5px 0' }}>Nom</p>
              <p style={{ fontSize: '1.1em', fontWeight: '600', color: '#2c3e50', margin: 0 }}>
                {formData.userInfo.nom || 'Non renseigné'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '0.85em', color: '#7f8c8d', margin: '0 0 5px 0' }}>Âge</p>
              <p style={{ fontSize: '1.1em', fontWeight: '600', color: '#2c3e50', margin: 0 }}>
                {formData.userInfo.age ? `${formData.userInfo.age} ans` : 'Non renseigné'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '0.85em', color: '#7f8c8d', margin: '0 0 5px 0' }}>Situation</p>
              <p style={{ fontSize: '1.1em', fontWeight: '600', color: '#2c3e50', margin: 0 }}>
                {formData.userInfo.situationFamiliale || 'Non renseigné'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '0.85em', color: '#7f8c8d', margin: '0 0 5px 0' }}>Objectif principal</p>
              <p style={{ fontSize: '1.1em', fontWeight: '600', color: '#2c3e50', margin: 0 }}>
                {formData.userInfo.objectifPrincipal || 'Non renseigné'}
              </p>
            </div>
          </div>
        </Section>

        {/* Section Comptes */}
        <Section id="comptes" title="Comptes bancaires" icon="🏦" count={formData.accounts.length}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {formData.accounts.map((compte, index) => (
              <div
                key={compte.id || index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 15px',
                  background: '#f8f9fa',
                  borderRadius: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.3em' }}>{getAccountIcon(compte.type)}</span>
                  <span style={{ fontWeight: '600', color: '#2c3e50' }}>{compte.nom}</span>
                </div>
                <span style={{ color: '#7f8c8d', fontSize: '0.9em' }}>
                  {compte.type}
                  {compte.limite && ` (Limite: ${formatMontant(compte.limite)})`}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Section Activités */}
        <Section id="activites" title="Activités configurées" icon="💱">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {Object.entries(formData.accountActivities).map(([accountName, activities]) => (
              <div key={accountName}>
                <p style={{
                  fontWeight: '600',
                  color: '#2c3e50',
                  marginBottom: '8px'
                }}>
                  {accountName}
                </p>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontSize: '0.8em', color: '#27ae60' }}>Entrées: </span>
                    <span style={{ fontSize: '0.9em', color: '#7f8c8d' }}>
                      {activities.entrees?.join(', ') || 'Aucune'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8em', color: '#e74c3c' }}>Sorties: </span>
                    <span style={{ fontSize: '0.9em', color: '#7f8c8d' }}>
                      {activities.sorties?.join(', ') || 'Aucune'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Section Budget */}
        <Section 
          id="budget" 
          title="Planification budgétaire" 
          icon="📊" 
          count={formData.budgetPlanning.entrees.length + formData.budgetPlanning.sorties.length}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '20px'
          }}>
            {/* Entrées */}
            <div>
              <h4 style={{
                fontSize: '1em',
                color: '#27ae60',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                💰 Entrées ({formData.budgetPlanning.entrees.length})
              </h4>
              {formData.budgetPlanning.entrees.map((e, i) => (
                <div key={i} style={{
                  padding: '8px 12px',
                  background: '#e8f5e9',
                  borderRadius: '6px',
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '600', color: '#2c3e50' }}>{e.description}</span>
                    <span style={{ color: '#27ae60', fontWeight: '600' }}>{formatMontant(e.montant)}</span>
                  </div>
                  <span style={{ fontSize: '0.8em', color: '#7f8c8d' }}>{e.frequence}</span>
                </div>
              ))}
              {formData.budgetPlanning.entrees.length === 0 && (
                <p style={{ color: '#95a5a6', fontSize: '0.9em' }}>Aucune entrée</p>
              )}
            </div>

            {/* Sorties */}
            <div>
              <h4 style={{
                fontSize: '1em',
                color: '#e74c3c',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                💸 Sorties ({formData.budgetPlanning.sorties.length})
              </h4>
              {formData.budgetPlanning.sorties.map((s, i) => (
                <div key={i} style={{
                  padding: '8px 12px',
                  background: '#ffebee',
                  borderRadius: '6px',
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '600', color: '#2c3e50' }}>{s.description}</span>
                    <span style={{ color: '#e74c3c', fontWeight: '600' }}>{formatMontant(s.montant)}</span>
                  </div>
                  <span style={{ fontSize: '0.8em', color: '#7f8c8d' }}>{s.frequence}</span>
                </div>
              ))}
              {formData.budgetPlanning.sorties.length === 0 && (
                <p style={{ color: '#95a5a6', fontSize: '0.9em' }}>Aucune sortie</p>
              )}
            </div>
          </div>
        </Section>

        {/* Section Soldes */}
        <Section id="soldes" title="Soldes initiaux" icon="💵">
          <div>
            <p style={{
              fontSize: '0.9em',
              color: '#7f8c8d',
              marginBottom: '15px'
            }}>
              Date de départ: <strong>{formData.initialBalances.dateDepart || 'Non définie'}</strong>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(formData.initialBalances.soldes || []).map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 15px',
                    background: s.accountType === 'credit' ? '#ffebee' : '#e8f5e9',
                    borderRadius: '8px'
                  }}
                >
                  <span style={{ fontWeight: '600', color: '#2c3e50' }}>{s.accountNom}</span>
                  <span style={{
                    fontWeight: 'bold',
                    color: s.accountType === 'credit' ? '#e74c3c' : '#27ae60'
                  }}>
                    {s.accountType === 'credit' ? '-' : ''}{formatMontant(s.solde || 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Section Objectifs */}
        <Section id="objectifs" title="Objectifs financiers" icon="🎯" count={formData.financialGoals.length}>
          {formData.financialGoals.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {formData.financialGoals.map((goal, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 15px',
                    background: '#f8f9fa',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.3em' }}>{getGoalIcon(goal.type)}</span>
                    <span style={{ fontWeight: '600', color: '#2c3e50' }}>{goal.nom}</span>
                  </div>
                  <span style={{ fontWeight: 'bold', color: '#667eea' }}>
                    {formatMontant(goal.montantCible)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#95a5a6', fontSize: '0.9em', textAlign: 'center' }}>
              Aucun objectif défini (optionnel)
            </p>
          )}
        </Section>

        {/* Boutons de navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '40px',
          paddingTop: '30px',
          borderTop: '2px solid #e0e0e0'
        }}>
          <button
            type="button"
            onClick={goBack}
            disabled={isLoading}
            style={{
              padding: '15px 30px',
              fontSize: '1em',
              fontWeight: '600',
              color: '#7f8c8d',
              background: 'white',
              border: '2px solid #bdc3c7',
              borderRadius: '10px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              opacity: isLoading ? 0.5 : 1
            }}
          >
            ← Précédent
          </button>

          <button
            type="button"
            onClick={finalizeOnboarding}
            disabled={isLoading}
            style={{
              padding: '18px 40px',
              fontSize: '1.1em',
              fontWeight: 'bold',
              color: 'white',
              background: isLoading 
                ? '#95a5a6'
                : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
              border: 'none',
              borderRadius: '12px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              boxShadow: isLoading ? 'none' : '0 4px 15px rgba(39, 174, 96, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            {isLoading ? (
              <>
                <span style={{
                  display: 'inline-block',
                  width: '20px',
                  height: '20px',
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Lancement en cours...
              </>
            ) : (
              <>
                🚀 Lancer mon outil
              </>
            )}
          </button>
        </div>

        {/* CSS pour l'animation de chargement */}
        <style>
          {`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default Summary;