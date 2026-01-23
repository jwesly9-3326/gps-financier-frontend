// RÉSULTATS OPE - Page de présentation des résultats d'optimisation
// Affiche les données APRÈS optimisation avec surplus mensuel CONSTANT par période
// Le surplus = somme des recommandations ACTIVES pour cette période (pas cumulatif)

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import optimizationService from '../../services/optimization.service';
import { calculateAllDayData, calculateMonthData, calculateYearData } from '../../utils/trajectoryCalculator';
import { generateOPERecommendations, convertRecommendationsToModifications } from '../../utils/opeAnalyzer';

const AdminOPEResults = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // États
  const [isLoading, setIsLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  
  // Vue par défaut: Année
  const [viewMode, setViewMode] = useState('year');

  // Extraire les données
  const accounts = userData?.accounts || [];
  const initialBalances = userData?.initialBalances?.soldes || [];
  const budgetEntrees = userData?.budgetPlanning?.entrees || [];
  const budgetSorties = userData?.budgetPlanning?.sorties || [];
  const budgetModifications = userData?.budgetPlanning?.modifications || [];

  // ============================================
  // CALCUL TRAJECTOIRE ORIGINALE (AVANT)
  // ============================================
  const allDayData = useMemo(() => {
    if (!accounts || accounts.length === 0) return [];
    return calculateAllDayData({
      accounts,
      initialBalances,
      budgetEntrees,
      budgetSorties,
      budgetModifications,
      daysToCalculate: 19710
    });
  }, [accounts, initialBalances, budgetEntrees, budgetSorties, budgetModifications]);

  const monthlyData = useMemo(() => {
    if (allDayData.length === 0) return [];
    return calculateMonthData(allDayData, accounts, budgetModifications);
  }, [allDayData, accounts, budgetModifications]);

  const yearlyData = useMemo(() => {
    if (monthlyData.length === 0) return [];
    return calculateYearData(monthlyData, accounts, budgetModifications);
  }, [monthlyData, accounts, budgetModifications]);

  // ============================================
  // RAPPORT OPE - Génération des recommandations
  // ============================================
  const opeReport = useMemo(() => {
    if (!accounts || accounts.length === 0 || allDayData.length === 0) return null;
    return generateOPERecommendations({
      accounts,
      allDayData,
      yearlyData,
      budgetEntrees,
      budgetSorties
    });
  }, [accounts, allDayData, yearlyData, budgetEntrees, budgetSorties]);

  // ============================================
  // CALCUL TRAJECTOIRE OPTIMISÉE (APRÈS)
  // ============================================
  const simulatedModifications = useMemo(() => {
    if (!opeReport || !opeReport.hasRecommendations) return [];
    return convertRecommendationsToModifications(
      opeReport.recommendations,
      budgetEntrees,
      budgetSorties
    );
  }, [opeReport, budgetEntrees, budgetSorties]);

  const effectiveBudgetModifications = useMemo(() => {
    return [...budgetModifications, ...simulatedModifications];
  }, [budgetModifications, simulatedModifications]);

  const allDayDataOptimized = useMemo(() => {
    if (!accounts || accounts.length === 0) return [];
    return calculateAllDayData({
      accounts,
      initialBalances,
      budgetEntrees,
      budgetSorties,
      budgetModifications: effectiveBudgetModifications,
      daysToCalculate: 19710
    });
  }, [accounts, initialBalances, budgetEntrees, budgetSorties, effectiveBudgetModifications]);

  const monthlyDataOptimized = useMemo(() => {
    if (allDayDataOptimized.length === 0) return [];
    return calculateMonthData(allDayDataOptimized, accounts, effectiveBudgetModifications);
  }, [allDayDataOptimized, accounts, effectiveBudgetModifications]);

  const yearlyDataOptimized = useMemo(() => {
    if (monthlyDataOptimized.length === 0) return [];
    return calculateYearData(monthlyDataOptimized, accounts, effectiveBudgetModifications);
  }, [monthlyDataOptimized, accounts, effectiveBudgetModifications]);

  // ============================================
  // INFOS SUR LES OPTIMISATIONS
  // ============================================
  const surplusDetails = useMemo(() => {
    if (!opeReport || !opeReport.recommendations) return { monthly: 0, yearly: 0, byAccount: {}, firstInterventionDate: null };
    
    let monthly = 0;
    const byAccount = {};
    let firstInterventionDate = null;
    
    opeReport.recommendations.forEach(rec => {
      const accountName = rec.account.name;
      const monthlyRecovery = rec.impact.monthlyRecovery || 0;
      const interventionDate = rec.recommendation.interventionDate;
      
      monthly += monthlyRecovery;
      byAccount[accountName] = (byAccount[accountName] || 0) + monthlyRecovery;
      
      if (!firstInterventionDate || interventionDate < firstInterventionDate) {
        firstInterventionDate = interventionDate;
      }
    });
    
    return { 
      monthly,
      yearly: monthly * 12,
      byAccount,
      firstInterventionDate
    };
  }, [opeReport]);

  // ============================================
  // FONCTION: Calculer le surplus pour une période
  // MOIS: surplus mensuel constant
  // ANNÉE: total annuel (somme des mois actifs)
  // ============================================
  const calculateSurplusForPeriod = (periodKey, type = 'month') => {
    if (!opeReport || !opeReport.recommendations) return 0;
    
    if (type === 'month') {
      // Vue MOIS: surplus mensuel = somme des recommandations actives ce mois
      let surplus = 0;
      const [periodYear, periodMonth] = periodKey.split('-').map(Number);
      
      opeReport.recommendations.forEach(rec => {
        const interventionDate = rec.recommendation.interventionDate;
        const interventionYear = parseInt(interventionDate.substring(0, 4));
        const interventionMonth = parseInt(interventionDate.substring(5, 7));
        
        let isActive = false;
        if (periodYear > interventionYear) {
          isActive = true;
        } else if (periodYear === interventionYear) {
          isActive = periodMonth >= interventionMonth;
        }
        
        if (isActive) {
          surplus += rec.impact.monthlyRecovery || 0;
        }
      });
      
      return Math.round(surplus * 100) / 100;
    } else {
      // Vue ANNÉE: total annuel = somme des surplus mensuels de chaque mois
      const periodYear = parseInt(periodKey);
      let totalAnnuel = 0;
      
      // Pour chaque mois de l'année (1-12)
      for (let month = 1; month <= 12; month++) {
        let surplusMois = 0;
        
        opeReport.recommendations.forEach(rec => {
          const interventionDate = rec.recommendation.interventionDate;
          const interventionYear = parseInt(interventionDate.substring(0, 4));
          const interventionMonth = parseInt(interventionDate.substring(5, 7));
          
          let isActive = false;
          if (periodYear > interventionYear) {
            isActive = true;
          } else if (periodYear === interventionYear) {
            isActive = month >= interventionMonth;
          }
          
          if (isActive) {
            surplusMois += rec.impact.monthlyRecovery || 0;
          }
        });
        
        totalAnnuel += surplusMois;
      }
      
      return Math.round(totalAnnuel * 100) / 100;
    }
  };
  
  // Calculer le surplus mensuel moyen pour une année (pour l'affichage)
  const calculateMonthlySurplusForYear = (yearKey) => {
    if (!opeReport || !opeReport.recommendations) return 0;
    
    const periodYear = parseInt(yearKey);
    let surplus = 0;
    
    // Prendre le surplus mensuel du dernier mois de l'année (décembre)
    // car à ce moment toutes les optimisations de l'année sont actives
    opeReport.recommendations.forEach(rec => {
      const interventionDate = rec.recommendation.interventionDate;
      const interventionYear = parseInt(interventionDate.substring(0, 4));
      
      // Si intervention est dans cette année ou avant, c'est actif en décembre
      if (periodYear >= interventionYear) {
        surplus += rec.impact.monthlyRecovery || 0;
      }
    });
    
    return Math.round(surplus * 100) / 100;
  };

  // Identifier le compte de provenance
  const sourceAccount = useMemo(() => {
    const chequeAccount = accounts.find(a => a.type === 'cheque');
    return chequeAccount || accounts[0];
  }, [accounts]);

  // ============================================
  // CHARGEMENT DES DONNÉES
  // ============================================
  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const requestData = await optimizationService.adminGetRequestDetails(requestId);
      setRequest(requestData);
      
      const freshData = await optimizationService.adminGetFreshData(requestId);
      if (freshData.currentData) {
        setUserData(freshData.currentData);
      } else {
        setError('Données utilisateur non trouvées');
      }
    } catch (err) {
      console.error('Erreur chargement données:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (requestId) loadUserData();
  }, [requestId]);

  // ============================================
  // FONCTIONS UTILITAIRES
  // ============================================
  const formatMontant = (montant) => {
    const num = new Intl.NumberFormat('fr-CA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(montant || 0));
    return montant < 0 ? `-${num} $` : `${num} $`;
  };

  const getMonthKey = (month) => {
    if (month.monthKey) return month.monthKey;
    return `${month.year}-${String(month.month).padStart(2, '0')}`;
  };

  // ============================================
  // RENDU - LOADING / ERROR
  // ============================================
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #040449 0%, #100261 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3em', marginBottom: '20px' }}>⏳</div>
          <p>Chargement des résultats OPE...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #040449 0%, #100261 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3em', marginBottom: '20px' }}>❌</div>
          <p>{error}</p>
          <button
            onClick={() => navigate('/admin')}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  // Formater la date d'intervention
  const interventionDateLabel = surplusDetails.firstInterventionDate 
    ? new Date(surplusDetails.firstInterventionDate + 'T12:00:00').toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' })
    : 'N/A';

  // ============================================
  // RENDU PRINCIPAL
  // ============================================
  return (
    <div style={{
      height: '100vh',
      background: 'linear-gradient(180deg, #040449 0%, #100261 100%)',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '15px 30px',
        borderBottom: '2px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(180deg, #040449 0%, #0a0354 100%)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '4px solid #27ae60',
              background: 'transparent'
            }} />
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '4px solid #3498db',
              background: 'transparent',
              marginLeft: '-12px'
            }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4em', color: 'white' }}>
              Résultats OPE - Optimisation Appliquée
            </h1>
            <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.85em' }}>
              Projection financière avec {opeReport?.recommendations?.length || 0} optimisation(s)
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            {['year', 'month'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '8px 15px',
                  border: 'none',
                  background: viewMode === mode ? '#27ae60' : 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.85em'
                }}
              >
                {mode === 'year' ? '📊 Année' : '📆 Mois'}
              </button>
            ))}
          </div>

          <button
            onClick={() => navigate(`/admin/analysis/${requestId}`)}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: '2px solid rgba(255,255,255,0.3)',
              background: 'transparent',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            ← Retour à l'analyse
          </button>
        </div>
      </div>

      {/* Bannière résumé du surplus */}
      <div style={{
        background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
        padding: '20px 30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '2em' }}>💰</span>
          <div>
            <div style={{ fontSize: '1.3em', fontWeight: 'bold' }}>
              Surplus mensuel disponible: {formatMontant(surplusDetails.monthly)}
            </div>
            <div style={{ fontSize: '0.9em', opacity: 0.9 }}>
              À partir de <strong>{interventionDateLabel}</strong> - Ce montant est économisé chaque mois
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '15px' }}>
          {Object.entries(surplusDetails.byAccount).map(([accountName, amount]) => (
            <div 
              key={accountName}
              style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '10px 15px',
                borderRadius: '10px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '0.75em', opacity: 0.9 }}>{accountName}</div>
              <div style={{ fontWeight: 'bold' }}>+{formatMontant(amount)}/mois</div>
            </div>
          ))}
        </div>
      </div>

      {/* Compte de provenance */}
      {sourceAccount && (
        <div style={{
          background: 'rgba(52, 152, 219, 0.2)',
          padding: '12px 30px',
          borderBottom: '2px solid rgba(52, 152, 219, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          flexShrink: 0
        }}>
          <div>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>Compte de provenance du surplus: </span>
            <strong style={{ color: '#3498db' }}>{sourceAccount.nom}</strong>
            <span style={{ color: 'rgba(255,255,255,0.6)', marginLeft: '10px', fontSize: '0.9em' }}>
              | Date d'intervention: <strong style={{ color: '#f39c12' }}>{interventionDateLabel}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Zone scrollable */}
      <div style={{
        flex: 1,
        overflowY: 'scroll',
        padding: '20px'
      }}>
        {/* En-tête des colonnes */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `120px repeat(${accounts.length}, 1fr) 200px`,
          gap: '10px',
          marginBottom: '10px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'linear-gradient(180deg, #040449 0%, #100261 100%)',
          padding: '15px',
          borderRadius: '15px'
        }}>
          <div style={{ textAlign: 'center', fontSize: '0.85em', color: 'rgba(255,255,255,0.6)' }}>
            📅 Date
          </div>
          {accounts.map(account => (
            <div key={account.id} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2em' }}>
                {account.type === 'cheque' ? '💳' : account.type === 'epargne' ? '🌱' : '🏦'}
              </div>
              <div style={{ fontSize: '0.85em', fontWeight: '600' }}>{account.nom}</div>
              <div style={{ fontSize: '0.75em', color: 'rgba(255,255,255,0.5)' }}>
                {account.type === 'cheque' ? 'Chèque' : account.type === 'epargne' ? 'Épargne' : 'Crédit'}
              </div>
            </div>
          ))}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(39, 174, 96, 0.3)',
            borderRadius: '10px',
            padding: '10px'
          }}>
            <div style={{ fontSize: '1.2em' }}>💰</div>
            <div style={{ fontSize: '0.85em', fontWeight: 'bold' }}>Surplus OPE</div>
            <div style={{ fontSize: '0.65em', color: 'rgba(255,255,255,0.6)' }}>
              {viewMode === 'year' ? '(total annuel)' : '(mensuel)'}
            </div>
          </div>
        </div>

        {/* Lignes de données */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Vue ANNÉE */}
          {viewMode === 'year' && yearlyDataOptimized.map((yearAfter, idx) => {
            // Calculer le surplus TOTAL ANNUEL (somme des mois)
            const totalAnnuel = calculateSurplusForPeriod(String(yearAfter.year), 'year');
            // Calculer le surplus mensuel pour affichage secondaire
            const monthlySurplus = calculateMonthlySurplusForYear(String(yearAfter.year));
            
            return (
              <div
                key={yearAfter.yearKey || idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `120px repeat(${accounts.length}, 1fr) 200px`,
                  gap: '10px',
                  padding: '15px 10px',
                  background: yearAfter.isCurrentYear ? 'rgba(39, 174, 96, 0.2)' : 'rgba(255,255,255,0.03)',
                  borderRadius: '10px',
                  border: yearAfter.isCurrentYear ? '2px solid #27ae60' : '2px solid transparent'
                }}
              >
                {/* Date */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: yearAfter.isCurrentYear ? '#27ae60' : 'rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '10px'
                }}>
                  <span style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{yearAfter.year}</span>
                  {yearAfter.isCurrentYear && <span style={{ fontSize: '0.7em', marginTop: '3px' }}>Actuelle</span>}
                </div>

                {/* Comptes */}
                {accounts.map(account => {
                  const accData = yearAfter.accounts[account.nom];
                  const balance = accData?.soldeFin ?? 0;
                  const totalEntrees = accData?.totalEntrees ?? 0;
                  const totalSorties = accData?.totalSorties ?? 0;
                  const isNegative = balance < 0 && account.type !== 'credit';
                  const isOverpayment = balance < 0 && account.type === 'credit';
                  const isSourceAccount = account.nom === sourceAccount?.nom;

                  return (
                    <div
                      key={account.id}
                      style={{
                        background: isSourceAccount && totalAnnuel > 0 ? 'rgba(39, 174, 96, 0.15)' : 'rgba(255,255,255,0.05)',
                        borderRadius: '8px',
                        padding: '12px',
                        textAlign: 'center',
                        border: isSourceAccount && totalAnnuel > 0
                          ? '2px solid rgba(39, 174, 96, 0.5)' 
                          : (isNegative || isOverpayment) ? '2px solid #e74c3c' : '2px solid transparent'
                      }}
                    >
                      <div style={{
                        fontSize: '1.1em',
                        fontWeight: 'bold',
                        color: account.type === 'credit' 
                          ? (isOverpayment ? '#e74c3c' : '#f39c12') 
                          : (isNegative ? '#e74c3c' : '#27ae60')
                      }}>
                        {formatMontant(balance)}
                      </div>
                      <div style={{ fontSize: '0.7em', marginTop: '4px', color: 'rgba(255,255,255,0.6)' }}>
                        {totalEntrees > 0 && <span style={{ color: '#27ae60' }}>+{formatMontant(totalEntrees)}</span>}
                        {totalEntrees > 0 && totalSorties > 0 && ' / '}
                        {totalSorties > 0 && <span style={{ color: '#e74c3c' }}>-{formatMontant(totalSorties)}</span>}
                      </div>
                    </div>
                  );
                })}

                {/* Colonne Surplus OPE - TOTAL ANNUEL */}
                <div style={{
                  background: totalAnnuel > 0 ? 'rgba(39, 174, 96, 0.2)' : 'rgba(255,255,255,0.05)',
                  borderRadius: '10px',
                  border: totalAnnuel > 0 ? '2px solid rgba(39, 174, 96, 0.4)' : '2px solid rgba(255,255,255,0.1)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px'
                }}>
                  {totalAnnuel > 0 ? (
                    <>
                      <span style={{ 
                        color: '#27ae60', 
                        fontSize: '1.5em',
                        fontWeight: 'bold'
                      }}>
                        ✓
                      </span>
                      <div style={{
                        color: '#27ae60',
                        fontSize: '0.95em',
                        fontWeight: 'bold',
                        background: 'rgba(39, 174, 96, 0.2)',
                        padding: '5px 10px',
                        borderRadius: '8px',
                        textAlign: 'center'
                      }}>
                        +{formatMontant(totalAnnuel)}
                      </div>
                      <div style={{
                        fontSize: '0.65em',
                        color: 'rgba(255,255,255,0.5)'
                      }}>
                        ({formatMontant(monthlySurplus)}/mois)
                      </div>
                    </>
                  ) : (
                    <>
                      <span style={{ 
                        color: 'rgba(255,255,255,0.3)', 
                        fontSize: '1.2em'
                      }}>
                        —
                      </span>
                      <div style={{
                        fontSize: '0.7em',
                        color: 'rgba(255,255,255,0.4)',
                        textAlign: 'center'
                      }}>
                        Avant intervention
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Vue MOIS */}
          {viewMode === 'month' && monthlyDataOptimized.map((monthAfter, idx) => {
            const monthKey = getMonthKey(monthAfter);
            // Calculer le surplus MENSUEL pour ce mois (somme des optimisations actives)
            const monthlySurplus = calculateSurplusForPeriod(monthKey, 'month');
            
            return (
              <div
                key={monthAfter.monthKey || idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `120px repeat(${accounts.length}, 1fr) 200px`,
                  gap: '10px',
                  padding: '12px 10px',
                  background: monthAfter.isCurrentMonth ? 'rgba(39, 174, 96, 0.2)' : 'rgba(255,255,255,0.03)',
                  borderRadius: '10px',
                  border: monthAfter.isCurrentMonth ? '2px solid #27ae60' : '2px solid transparent'
                }}
              >
                {/* Date */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: monthAfter.isCurrentMonth ? '#27ae60' : 'rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '8px'
                }}>
                  <span style={{ fontSize: '0.9em', fontWeight: 'bold' }}>{monthAfter.label}</span>
                  {monthAfter.isCurrentMonth && <span style={{ fontSize: '0.7em', marginTop: '3px' }}>Actuel</span>}
                </div>

                {/* Comptes */}
                {accounts.map(account => {
                  const accData = monthAfter.accounts[account.nom];
                  const balance = accData?.soldeFin ?? 0;
                  const totalEntrees = accData?.totalEntrees ?? 0;
                  const totalSorties = accData?.totalSorties ?? 0;
                  const isNegative = balance < 0 && account.type !== 'credit';
                  const isOverpayment = balance < 0 && account.type === 'credit';

                  return (
                    <div
                      key={account.id}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '8px',
                        padding: '10px',
                        textAlign: 'center',
                        border: (isNegative || isOverpayment) ? '2px solid #e74c3c' : '2px solid transparent'
                      }}
                    >
                      <div style={{
                        fontSize: '1em',
                        fontWeight: 'bold',
                        color: account.type === 'credit' 
                          ? (isOverpayment ? '#e74c3c' : '#f39c12') 
                          : (isNegative ? '#e74c3c' : '#27ae60')
                      }}>
                        {formatMontant(balance)}
                      </div>
                      <div style={{ fontSize: '0.7em', marginTop: '4px', color: 'rgba(255,255,255,0.5)' }}>
                        {totalEntrees > 0 && <span style={{ color: '#27ae60' }}>+{formatMontant(totalEntrees)}</span>}
                        {totalEntrees > 0 && totalSorties > 0 && ' / '}
                        {totalSorties > 0 && <span style={{ color: '#e74c3c' }}>-{formatMontant(totalSorties)}</span>}
                      </div>
                    </div>
                  );
                })}

                {/* Colonne Surplus OPE - SURPLUS MENSUEL CONSTANT */}
                <div style={{
                  background: monthlySurplus > 0 ? 'rgba(39, 174, 96, 0.2)' : 'rgba(255,255,255,0.05)',
                  borderRadius: '10px',
                  border: monthlySurplus > 0 ? '2px solid rgba(39, 174, 96, 0.4)' : '2px solid rgba(255,255,255,0.1)',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}>
                  {monthlySurplus > 0 ? (
                    <>
                      <span style={{ 
                        color: '#27ae60', 
                        fontSize: '1.3em',
                        fontWeight: 'bold'
                      }}>
                        ✓
                      </span>
                      <div style={{
                        color: '#3498db',
                        fontSize: '0.8em',
                        fontWeight: 'bold',
                        background: 'rgba(52, 152, 219, 0.2)',
                        padding: '4px 8px',
                        borderRadius: '8px'
                      }}>
                        +{formatMontant(monthlySurplus)}
                      </div>
                    </>
                  ) : (
                    <span style={{ 
                      color: 'rgba(255,255,255,0.3)', 
                      fontSize: '1em'
                    }}>
                      —
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Récapitulatif en bas */}
        <div style={{
          marginTop: '30px',
          padding: '25px',
          background: 'rgba(39, 174, 96, 0.15)',
          borderRadius: '15px',
          border: '2px solid rgba(39, 174, 96, 0.3)'
        }}>
          <h3 style={{ margin: '0 0 20px', color: '#27ae60', display: 'flex', alignItems: 'center', gap: '10px' }}>
            📊 Récapitulatif des optimisations
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '20px',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.7)', marginBottom: '5px' }}>
                Surplus mensuel
              </div>
              <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#27ae60' }}>
                {formatMontant(surplusDetails.monthly)}
              </div>
            </div>
            
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '20px',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.7)', marginBottom: '5px' }}>
                Surplus annuel
              </div>
              <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#3498db' }}>
                {formatMontant(surplusDetails.yearly)}
              </div>
            </div>
            
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '20px',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.7)', marginBottom: '5px' }}>
                Sur 5 ans
              </div>
              <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#9b59b6' }}>
                {formatMontant(surplusDetails.monthly * 12 * 5)}
              </div>
            </div>
            
            <div style={{
              background: 'rgba(243, 156, 18, 0.2)',
              padding: '20px',
              borderRadius: '12px',
              textAlign: 'center',
              border: '2px solid rgba(243, 156, 18, 0.3)'
            }}>
              <div style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.7)', marginBottom: '5px' }}>
                Date d'intervention
              </div>
              <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#f39c12' }}>
                {interventionDateLabel}
              </div>
            </div>
          </div>

          {/* Détail des optimisations */}
          {opeReport?.recommendations && opeReport.recommendations.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ margin: '0 0 15px', color: 'rgba(255,255,255,0.8)' }}>
                Détail des optimisations:
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {opeReport.recommendations.map((rec, idx) => (
                  <div 
                    key={rec.id}
                    style={{
                      background: 'rgba(155, 89, 182, 0.2)',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '2px solid rgba(155, 89, 182, 0.3)'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                      💳 {rec.account.name}
                    </div>
                    <div style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.7)' }}>
                      {rec.budgetToModify.description}: {formatMontant(rec.budgetToModify.currentAmount)} → {formatMontant(rec.recommendation.newAmount)}
                    </div>
                    <div style={{ fontSize: '0.75em', color: 'rgba(255,255,255,0.5)', marginTop: '3px' }}>
                      Intervention: {rec.recommendation.interventionDateLabel}
                    </div>
                    <div style={{ 
                      marginTop: '5px', 
                      color: '#27ae60',
                      fontWeight: 'bold'
                    }}>
                      +{formatMontant(rec.impact.monthlyRecovery)}/mois
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminOPEResults;
