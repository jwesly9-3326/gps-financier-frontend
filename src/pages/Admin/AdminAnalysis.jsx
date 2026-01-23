// 🔧 OPTIMISATION PL4TO - Page d'analyse trajectoire financière
// ✅ Charge les données ACTUELLES de l'utilisateur (pas de snapshot)
// ✅ Utilise trajectoryCalculator.js - même logique que GPSFinancier.jsx
// ✅ OPE: Analyse de l'équilibre du portefeuille

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import optimizationService from '../../services/optimization.service';
import { calculateAllDayData, calculateMonthData, calculateYearData } from '../../utils/trajectoryCalculator';
import { generateOPERecommendations, convertRecommendationsToModifications, formatCurrency, formatDateFr } from '../../utils/opeAnalyzer';

const AdminAnalysis = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // États
  const [isLoading, setIsLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  
  // États pour la vue - Défaut: Année
  const [viewMode, setViewMode] = useState('year'); // 'year', 'month', 'day'
  
  // État pour détecter si les données ont changé
  const [dataHasChanged, setDataHasChanged] = useState(false);
  
  // État pour rafraîchir les données
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // État pour afficher le rapport OPE
  const [showOPEReport, setShowOPEReport] = useState(false);
  
  // État pour le mode simulation
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [simulatedModifications, setSimulatedModifications] = useState([]);
  
  // État pour le modal de proposition
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [isSendingProposal, setIsSendingProposal] = useState(false);

  // Extraire les données du userData (données actuelles de l'utilisateur)
  const accounts = userData?.accounts || [];
  const initialBalances = userData?.initialBalances?.soldes || [];
  const budgetEntrees = userData?.budgetPlanning?.entrees || [];
  const budgetSorties = userData?.budgetPlanning?.sorties || [];
  const budgetModifications = userData?.budgetPlanning?.modifications || [];

  // Date d'aujourd'hui (locale) pour comparaison
  const todayStr = useMemo(() => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    console.log('[AdminAnalysis] Date locale:', dateStr);
    return dateStr;
  }, []);

  // ============================================
  // ANALYSE OPE - Optimisation Portefeuille Équilibré
  // ============================================
  
  /**
   * Analyse l'équilibre du portefeuille pour une période donnée
   * @param {Object} periodData - Données de la période (année, mois ou jour)
   * @param {Array} accounts - Liste des comptes
   * @param {string} type - 'year', 'month' ou 'day'
   * @returns {Object} { hasImbalance, issues: [{accountName, type, message}] }
   */
  const analyzeOPE = (periodData, accounts, type = 'day') => {
    const issues = [];
    
    accounts.forEach(account => {
      const accData = periodData.accounts?.[account.nom];
      if (!accData) return;
      
      // Récupérer le solde selon le type de vue
      const balance = type === 'day' ? (accData.solde ?? 0) : (accData.soldeFin ?? 0);
      const limite = parseFloat(account.limite) || 0;
      
      // Compte normal (chèque/épargne): Solde < 0 = Déséquilibre
      if (account.type === 'cheque' || account.type === 'epargne') {
        if (balance < 0) {
          issues.push({
            accountName: account.nom,
            accountType: account.type,
            issueType: 'negative_balance',
            balance: balance,
            message: `${account.nom}: Solde négatif`
          });
        }
      }
      
      // Compte crédit: 
      // - Solde < 0 (trop-perçu/remboursement excédentaire) = Déséquilibre
      // - Solde >= limite = Dépassement de limite = Déséquilibre
      if (account.type === 'credit') {
        // Solde négatif = trop-perçu (argent payé en trop sur la carte)
        if (balance < 0) {
          issues.push({
            accountName: account.nom,
            accountType: account.type,
            issueType: 'overpayment',
            balance: balance,
            message: `${account.nom}: Trop-perçu`
          });
        }
        // Solde >= limite = dépassement de limite de crédit
        else if (limite > 0 && balance >= limite) {
          issues.push({
            accountName: account.nom,
            accountType: account.type,
            issueType: 'over_limit',
            balance: balance,
            limite: limite,
            percentUsed: Math.round((balance / limite) * 100),
            message: `${account.nom}: Limite atteinte`
          });
        }
      }
    });
    
    return {
      hasImbalance: issues.length > 0,
      issues
    };
  };

  // ============================================
  // CALCUL DE LA TRAJECTOIRE - MÊME LOGIQUE QUE GPS FINANCIER
  // ============================================
  const allDayData = useMemo(() => {
    if (!accounts || accounts.length === 0) {
      return [];
    }

    const trajectory = calculateAllDayData({
      accounts,
      initialBalances,
      budgetEntrees,
      budgetSorties,
      budgetModifications,
      daysToCalculate: 19710
    });

    return trajectory;
  }, [accounts, initialBalances, budgetEntrees, budgetSorties, budgetModifications]);

  // Données mensuelles agrégées
  const monthlyData = useMemo(() => {
    if (allDayData.length === 0) return [];
    return calculateMonthData(allDayData, accounts, budgetModifications);
  }, [allDayData, accounts, budgetModifications]);

  // Données annuelles agrégées
  const yearlyData = useMemo(() => {
    if (monthlyData.length === 0) return [];
    return calculateYearData(monthlyData, accounts, budgetModifications);
  }, [monthlyData, accounts, budgetModifications]);

  // Vue JOUR: Seulement les jours avec activité
  const displayDayData = useMemo(() => {
    return allDayData.filter(day => day.hasActivity || day.dateStr === todayStr);
  }, [allDayData, todayStr]);

  // ============================================
  // TRAJECTOIRE SIMULÉE (avec modifications OPE)
  // ============================================
  
  // Modifications combinées (originales + simulées)
  const effectiveBudgetModifications = useMemo(() => {
    if (!isSimulationMode || simulatedModifications.length === 0) {
      return budgetModifications;
    }
    return [...budgetModifications, ...simulatedModifications];
  }, [budgetModifications, simulatedModifications, isSimulationMode]);

  // Trajectoire simulée
  const allDayDataSimulated = useMemo(() => {
    if (!isSimulationMode || !accounts || accounts.length === 0) {
      return [];
    }

    console.log('[AdminAnalysis] Calcul trajectoire SIMULÉE avec', simulatedModifications.length, 'modifications OPE');

    const trajectory = calculateAllDayData({
      accounts,
      initialBalances,
      budgetEntrees,
      budgetSorties,
      budgetModifications: effectiveBudgetModifications,
      daysToCalculate: 19710
    });

    return trajectory;
  }, [isSimulationMode, accounts, initialBalances, budgetEntrees, budgetSorties, effectiveBudgetModifications, simulatedModifications]);

  // Données mensuelles simulées
  const monthlyDataSimulated = useMemo(() => {
    if (!isSimulationMode || allDayDataSimulated.length === 0) return [];
    return calculateMonthData(allDayDataSimulated, accounts, effectiveBudgetModifications);
  }, [isSimulationMode, allDayDataSimulated, accounts, effectiveBudgetModifications]);

  // Données annuelles simulées
  const yearlyDataSimulated = useMemo(() => {
    if (!isSimulationMode || monthlyDataSimulated.length === 0) return [];
    return calculateYearData(monthlyDataSimulated, accounts, effectiveBudgetModifications);
  }, [isSimulationMode, monthlyDataSimulated, accounts, effectiveBudgetModifications]);

  // Vue JOUR simulée
  const displayDayDataSimulated = useMemo(() => {
    if (!isSimulationMode) return [];
    return allDayDataSimulated.filter(day => day.hasActivity || day.dateStr === todayStr);
  }, [isSimulationMode, allDayDataSimulated, todayStr]);

  // ============================================
  // RAPPORT OPE-1: Génération des recommandations
  // ============================================
  const opeReport = useMemo(() => {
    if (!accounts || accounts.length === 0 || allDayData.length === 0) {
      return null;
    }
    
    console.log('[AdminAnalysis] Génération rapport OPE-1...');
    
    return generateOPERecommendations({
      accounts,
      allDayData,
      yearlyData,
      budgetEntrees,
      budgetSorties
    });
  }, [accounts, allDayData, yearlyData, budgetEntrees, budgetSorties]);

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
        setDataHasChanged(freshData.hasChanges);
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
    if (requestId) {
      loadUserData();
    }
  }, [requestId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadUserData();
    setIsRefreshing(false);
  };

  // ============================================
  // GESTION DE LA SIMULATION
  // ============================================
  
  // Démarrer la simulation avec les recommandations OPE
  const handleStartSimulation = () => {
    if (!opeReport || !opeReport.hasRecommendations) return;
    
    console.log('[AdminAnalysis] Démarrage simulation OPE...');
    
    // Convertir les recommandations en modifications budgétaires
    const modifications = convertRecommendationsToModifications(
      opeReport.recommendations,
      budgetEntrees,
      budgetSorties
    );
    
    console.log('[AdminAnalysis] Modifications générées:', modifications);
    
    setSimulatedModifications(modifications);
    setIsSimulationMode(true);
    setShowOPEReport(false); // Fermer le modal
  };
  
  // Arrêter la simulation
  const handleStopSimulation = () => {
    console.log('[AdminAnalysis] Arrêt simulation OPE');
    setIsSimulationMode(false);
    setSimulatedModifications([]);
  };

  // ============================================
  // ENVOI DE PROPOSITION
  // ============================================
  const handleSendProposal = async () => {
    if (!opeReport || !opeReport.hasRecommendations) return;
    
    setIsSendingProposal(true);
    
    try {
      // Calculer les impacts cumulés
      const monthlyRecovery = opeReport.summary.totalMonthlyRecovery;
      const yearlyRecovery = monthlyRecovery * 12;
      
      // Trouver la première date d'intervention
      const firstInterventionDate = opeReport.recommendations
        .map(rec => rec.recommendation.interventionDate)
        .sort()[0];
      
      // Calculer les totaux mensuels
      const totalCurrentPaymentsMonthly = opeReport.recommendations.reduce(
        (sum, rec) => sum + (rec.budgetToModify.currentAmountMonthly || 0), 0
      );
      const totalNewPaymentsMonthly = opeReport.recommendations.reduce(
        (sum, rec) => sum + (rec.recommendation.newAmountMonthly || 0), 0
      );
      
      // Préparer les données de la proposition
      const proposalData = {
        proposalMessage: `Proposition d'optimisation PL4TO - Économie potentielle: ${formatMontant(monthlyRecovery)}/mois`,
        proposedChanges: {
          recommendations: opeReport.recommendations.map(rec => ({
            id: rec.id,
            budgetId: rec.budgetToModify.id,
            budgetDescription: rec.budgetToModify.description,
            accountName: rec.account.name,
            currentAmount: rec.budgetToModify.currentAmount,
            currentAmountMonthly: rec.budgetToModify.currentAmountMonthly,  // ✅ Ajout montant mensuel
            newAmount: rec.recommendation.newAmount,
            newAmountMonthly: rec.recommendation.newAmountMonthly,  // ✅ Ajout montant mensuel
            frequence: rec.budgetToModify.currentFrequence,
            interventionDate: rec.recommendation.interventionDate,
            monthlyRecovery: rec.impact.monthlyRecovery
          })),
          modifications: simulatedModifications,
          totalCurrentPaymentsMonthly,  // ✅ Total actuel mensuel
          totalNewPaymentsMonthly  // ✅ Total nouveau mensuel
        },
        projectedImpact: {
          monthlyRecovery,
          yearlyRecovery,
          fiveYearRecovery: yearlyRecovery * 5,
          tenYearRecovery: yearlyRecovery * 10,
          fifteenYearRecovery: yearlyRecovery * 15,
          firstInterventionDate,
          recommendationsCount: opeReport.recommendations.length
        }
      };
      
      console.log('[AdminAnalysis] Envoi proposition:', proposalData);
      
      // Appeler l'API
      await optimizationService.adminSendProposal(requestId, proposalData);
      
      alert('✅ Proposition envoyée avec succès!');
      setShowProposalModal(false);
      
      // Rafraîchir les données
      await loadUserData();
      
    } catch (error) {
      console.error('[AdminAnalysis] Erreur envoi proposition:', error);
      alert('❌ Erreur lors de l\'envoi de la proposition');
    } finally {
      setIsSendingProposal(false);
    }
  };

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

  // Vérifier si une date est aujourd'hui (comparaison locale)
  const isToday = (dateStr) => {
    return dateStr === todayStr;
  };

  // ============================================
  // COMPOSANT OPE - Cellule d'analyse
  // ============================================
  const OPECell = ({ periodData, periodDataBefore, type = 'day', isHighlighted = false, periodKey = '' }) => {
    const analysis = analyzeOPE(periodData, accounts, type);
    
    // Calculer le surplus pour cette période
    // MOIS/JOUR: surplus mensuel constant
    // ANNÉE: total annuel (somme des mois)
    const calculateSurplusForPeriod = () => {
      if (!isSimulationMode || !opeReport?.recommendations) return 0;
      
      if (type === 'year') {
        // Vue ANNÉE: total annuel = somme des surplus mensuels de chaque mois
        const periodYear = parseInt(periodKey);
        let totalAnnuel = 0;
        
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
      } else {
        // Vue MOIS/JOUR: surplus mensuel
        let surplus = 0;
        
        opeReport.recommendations.forEach(rec => {
          const interventionDate = rec.recommendation.interventionDate;
          const interventionYear = parseInt(interventionDate.substring(0, 4));
          const interventionMonth = parseInt(interventionDate.substring(5, 7));
          
          let isActive = false;
          
          if (type === 'month') {
            const [periodYear, periodMonth] = periodKey.split('-').map(Number);
            if (periodYear > interventionYear) {
              isActive = true;
            } else if (periodYear === interventionYear) {
              isActive = periodMonth >= interventionMonth;
            }
          } else {
            // type === 'day'
            isActive = periodKey >= interventionDate;
          }
          
          if (isActive) {
            surplus += rec.impact.monthlyRecovery || 0;
          }
        });
        
        return Math.round(surplus * 100) / 100;
      }
    };
    
    const surplus = calculateSurplusForPeriod();
    
    if (!analysis.hasImbalance) {
      // Pas de déséquilibre - Case verte
      return (
        <div style={{
          background: isHighlighted ? 'rgba(39, 174, 96, 0.2)' : 'rgba(39, 174, 96, 0.1)',
          borderRadius: type === 'day' ? '8px' : '10px',
          border: `2px solid ${isHighlighted ? 'rgba(39, 174, 96, 0.5)' : 'rgba(39, 174, 96, 0.3)'}`,
          padding: type === 'day' ? '10px' : '15px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%'
        }}>
          <span style={{ 
            color: '#27ae60', 
            fontSize: type === 'day' ? '1.2em' : '1.5em',
            fontWeight: 'bold'
          }}>
            ✓
          </span>
          {/* Afficher le surplus si optimisation active */}
          {isSimulationMode && surplus > 0 && (
            <span style={{
              color: type === 'year' ? '#27ae60' : '#3498db',
              fontSize: type === 'day' ? '0.65em' : '0.75em',
              fontWeight: 'bold',
              marginTop: '5px',
              background: type === 'year' ? 'rgba(39, 174, 96, 0.2)' : 'rgba(52, 152, 219, 0.2)',
              padding: '3px 8px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              +{formatMontant(surplus)}{type !== 'year' ? '' : ''}
            </span>
          )}
        </div>
      );
    }
    
    // Déterminer le type principal de problème pour l'affichage
    const hasLimitIssue = analysis.issues.some(i => i.issueType === 'over_limit');
    const hasOverpayment = analysis.issues.some(i => i.issueType === 'overpayment');
    const hasNegativeBalance = analysis.issues.some(i => i.issueType === 'negative_balance');
    
    // Déséquilibre détecté - Afficher "Optimisation requise"
    return (
      <div style={{
        background: isHighlighted ? 'rgba(231, 76, 60, 0.25)' : 'rgba(231, 76, 60, 0.15)',
        borderRadius: type === 'day' ? '8px' : '10px',
        border: `2px solid ${isHighlighted ? '#e74c3c' : 'rgba(231, 76, 60, 0.5)'}`,
        padding: type === 'day' ? '8px' : '12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '4px'
      }}>
        <span style={{ 
          color: '#e74c3c', 
          fontSize: type === 'day' ? '0.75em' : '0.85em',
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          ⚠️ Optimisation requise
        </span>
        
        {/* Afficher le type de problème */}
        {hasLimitIssue && (
          <span style={{ 
            fontSize: '0.65em', 
            color: '#f39c12',
            fontWeight: '600',
            background: 'rgba(243, 156, 18, 0.2)',
            padding: '2px 8px',
            borderRadius: '10px'
          }}>
            LIMITE
          </span>
        )}
        
        {/* Détails des comptes problématiques */}
        <div style={{ 
          fontSize: '0.65em', 
          color: 'rgba(255,255,255,0.7)',
          textAlign: 'center',
          maxHeight: '35px',
          overflow: 'hidden'
        }}>
          {analysis.issues.slice(0, 2).map((issue, idx) => (
            <div key={idx} style={{ lineHeight: 1.2 }}>
              {issue.accountName}: {
                issue.issueType === 'negative_balance' ? 'Solde < 0' :
                issue.issueType === 'overpayment' ? 'Trop-perçu' :
                issue.issueType === 'over_limit' ? `${issue.percentUsed}% limite` :
                'Problème'
              }
            </div>
          ))}
          {analysis.issues.length > 2 && (
            <div style={{ opacity: 0.7 }}>+{analysis.issues.length - 2} autres</div>
          )}
        </div>
      </div>
    );
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
          <div style={{ fontSize: '3em', marginBottom: '20px' }}>🔧</div>
          <p>Chargement des données utilisateur...</p>
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
            Retour à l'administration
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDU PRINCIPAL - Structure avec scroll global
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
      {/* Header fixe */}
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
              border: '4px solid #f39c12',
              background: 'transparent'
            }} />
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '4px solid #667eea',
              background: 'transparent',
              marginLeft: '-12px'
            }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4em', color: 'white' }}>
              🔧 Optimisation PL4TO
            </h1>
            <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.85em' }}>
              Demande: <strong>{requestId}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{
            padding: '6px 16px',
            borderRadius: '20px',
            background: request?.status === 'analyzing' ? '#3498db' : '#f39c12',
            color: 'white',
            fontSize: '0.85em',
            fontWeight: '600'
          }}>
            {request?.status === 'analyzing' ? '🔍 En analyse' : '⏳ En attente'}
          </span>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              padding: '8px 15px',
              borderRadius: '10px',
              border: '2px solid #27ae60',
              background: isRefreshing ? 'rgba(39, 174, 96, 0.3)' : 'transparent',
              color: 'white',
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              fontSize: '0.85em'
            }}
          >
            {isRefreshing ? '⏳' : '🔄'} Rafraîchir
          </button>

          {/* Bouton Rapport OPE */}
          <button
            onClick={() => setShowOPEReport(true)}
            disabled={!opeReport}
            style={{
              padding: '8px 15px',
              borderRadius: '10px',
              border: '2px solid #9b59b6',
              background: opeReport?.hasRecommendations ? 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)' : 'transparent',
              color: 'white',
              cursor: opeReport ? 'pointer' : 'not-allowed',
              fontSize: '0.85em',
              position: 'relative'
            }}
          >
            📝 Rapport OPE
            {opeReport?.hasRecommendations && (
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                background: '#f39c12',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                fontSize: '0.75em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}>
                {opeReport.recommendations.length}
              </span>
            )}
          </button>

          {/* Bouton Envoi Proposition - Seulement si recommandations */}
          {opeReport?.hasRecommendations && (
            <button
              onClick={() => setShowProposalModal(true)}
              style={{
                padding: '8px 15px',
                borderRadius: '10px',
                border: '2px solid #27ae60',
                background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.85em',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              📨 Envoi proposition
            </button>
          )}

          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            {['year', 'month', 'day'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '8px 15px',
                  border: 'none',
                  background: viewMode === mode ? '#667eea' : 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.85em'
                }}
              >
                {mode === 'year' ? '📊 Année' : mode === 'month' ? '📆 Mois' : '📅 Jour'}
              </button>
            ))}
          </div>

          <button
            onClick={() => navigate('/admin')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: '2px solid rgba(255,255,255,0.3)',
              background: 'transparent',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            ← Retour
          </button>
        </div>
      </div>

      {/* Bannière alerte si données modifiées */}
      {dataHasChanged && (
        <div style={{
          background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexShrink: 0
        }}>
          <span style={{ fontSize: '1.2em' }}>⚠️</span>
          <strong>Données modifiées!</strong>
          <span style={{ fontSize: '0.9em', opacity: 0.9 }}>
            L'utilisateur a modifié ses données depuis la création de cette demande.
          </span>
        </div>
      )}

      {/* Bannière mode SIMULATION */}
      {isSimulationMode && (
        <div style={{
          background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
          padding: '15px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '1.5em' }}>🔮</span>
            <div>
              <strong style={{ fontSize: '1.1em' }}>OPTIMISATION VISUELLE</strong>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ 
              background: 'rgba(255,255,255,0.2)', 
              padding: '8px 15px', 
              borderRadius: '10px',
              fontSize: '0.85em'
            }}>
              {simulatedModifications.length} optimisation(s) appliquée(s)
            </div>
            <button
              onClick={handleStopSimulation}
              style={{
                padding: '8px 20px',
                borderRadius: '10px',
                border: '2px solid white',
                background: 'transparent',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.9em',
                fontWeight: 'bold'
              }}
            >
              ✕ Quitter la simulation
            </button>
          </div>
        </div>
      )}

      {/* Zone scrollable - tout le contenu */}
      <div style={{
        flex: 1,
        overflowY: 'scroll',
        padding: '20px'
      }}>
        {/* En-tête des colonnes */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isSimulationMode ? '1fr 1fr 200px' : '1fr 350px',
          gap: '15px',
          marginBottom: '10px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'linear-gradient(180deg, #040449 0%, #100261 100%)',
          padding: '10px 0'
        }}>
          {/* En-tête AVANT (ou normal si pas simulation) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `120px repeat(${accounts.length}, 1fr)`,
            gap: '10px',
            padding: '15px',
            background: isSimulationMode ? 'rgba(231, 76, 60, 0.15)' : 'rgba(0,0,0,0.4)',
            borderRadius: '15px',
            border: isSimulationMode ? '2px solid rgba(231, 76, 60, 0.3)' : 'none'
          }}>
            {isSimulationMode && (
              <div style={{ 
                gridColumn: '1 / -1', 
                textAlign: 'center', 
                marginBottom: '10px',
                padding: '8px',
                background: 'rgba(231, 76, 60, 0.3)',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '1.1em'
              }}>
                🟠 AVANT (Actuel)
              </div>
            )}
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
          </div>

          {/* En-tête APRÈS (seulement si simulation) */}
          {isSimulationMode && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: `120px repeat(${accounts.length}, 1fr)`,
              gap: '10px',
              padding: '15px',
              background: 'rgba(39, 174, 96, 0.15)',
              borderRadius: '15px',
              border: '2px solid rgba(39, 174, 96, 0.3)'
            }}>
              <div style={{ 
                gridColumn: '1 / -1', 
                textAlign: 'center', 
                marginBottom: '10px',
                padding: '8px',
                background: 'rgba(39, 174, 96, 0.3)',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '1.1em'
              }}>
                🟢 APRÈS (Optimisé)
              </div>
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
            </div>
          )}

          {/* En-tête OPE - BOUTON CLIQUABLE */}
          {/* En mode simulation: bouton vert "Voir Résultats" */}
          {/* Sinon: bouton OPE normal */}
          {isSimulationMode ? (
            <button
              onClick={() => navigate(`/admin/results/${requestId}`)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '15px',
                background: 'linear-gradient(135deg, rgba(39, 174, 96, 0.6) 0%, rgba(46, 204, 113, 0.6) 100%)',
                borderRadius: '15px',
                border: '2px solid rgba(39, 174, 96, 0.8)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(39, 174, 96, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span style={{ fontSize: '1.5em', marginBottom: '5px' }}>📊</span>
              <span style={{ fontSize: '0.9em', fontWeight: 'bold', color: 'white' }}>Voir Résultats</span>
            </button>
          ) : (
            <button
              onClick={() => setShowOPEReport(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '15px',
                background: opeReport?.hasRecommendations 
                  ? 'linear-gradient(135deg, rgba(155, 89, 182, 0.4) 0%, rgba(142, 68, 173, 0.4) 100%)'
                  : 'rgba(0,0,0,0.4)',
                borderRadius: '15px',
                border: opeReport?.hasRecommendations 
                  ? '2px solid rgba(155, 89, 182, 0.6)'
                  : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(155, 89, 182, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1.8em', fontWeight: 'bold', letterSpacing: '0.1em', color: 'white' }}>
                OPE
              </h2>
              {opeReport?.hasRecommendations && (
                <span style={{
                  marginLeft: '10px',
                  background: '#f39c12',
                  color: 'white',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  fontSize: '0.7em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {opeReport.recommendations.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Lignes de données */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Vue ANNÉE */}
          {viewMode === 'year' && yearlyData.map((year, idx) => {
            const yearSimulated = isSimulationMode ? yearlyDataSimulated[idx] : null;
            
            return (
              <div
                key={year.yearKey}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isSimulationMode ? '1fr 1fr 200px' : '1fr 350px',
                  gap: '15px'
                }}
              >
                {/* Données AVANT (ou normal si pas simulation) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `120px repeat(${accounts.length}, 1fr)`,
                  gap: '10px',
                  padding: '15px 10px',
                  background: isSimulationMode 
                    ? 'rgba(231, 76, 60, 0.1)' 
                    : (year.isCurrentYear ? 'rgba(102, 126, 234, 0.3)' : 'rgba(255,255,255,0.03)'),
                  borderRadius: '10px',
                  border: isSimulationMode 
                    ? '2px solid rgba(231, 76, 60, 0.3)'
                    : (year.isCurrentYear ? '2px solid #667eea' : '2px solid transparent')
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: year.isCurrentYear ? '#667eea' : 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '10px'
                  }}>
                    <span style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{year.year}</span>
                    {year.isCurrentYear && <span style={{ fontSize: '0.7em', marginTop: '3px' }}>Actuelle</span>}
                  </div>

                  {accounts.map(account => {
                    const accData = year.accounts[account.nom];
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
                          padding: '12px',
                          textAlign: 'center',
                          border: (isNegative || isOverpayment) ? '2px solid #e74c3c' : '2px solid transparent'
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
                </div>

                {/* Données APRÈS (seulement si simulation) */}
                {isSimulationMode && yearSimulated && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: `120px repeat(${accounts.length}, 1fr)`,
                    gap: '10px',
                    padding: '15px 10px',
                    background: 'rgba(39, 174, 96, 0.1)',
                    borderRadius: '10px',
                    border: '2px solid rgba(39, 174, 96, 0.3)'
                  }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      background: year.isCurrentYear ? '#27ae60' : 'rgba(39, 174, 96, 0.3)',
                      borderRadius: '8px',
                      padding: '10px'
                    }}>
                      <span style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{yearSimulated.year}</span>
                      {year.isCurrentYear && <span style={{ fontSize: '0.7em', marginTop: '3px' }}>Optimisé</span>}
                    </div>

                    {accounts.map(account => {
                      const accData = yearSimulated.accounts[account.nom];
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
                            padding: '12px',
                            textAlign: 'center',
                            border: (isNegative || isOverpayment) ? '2px solid #e74c3c' : '2px solid rgba(39, 174, 96, 0.3)'
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
                  </div>
                )}

                {/* OPE - colonne unique */}
                <OPECell 
                  periodData={isSimulationMode && yearSimulated ? yearSimulated : year} 
                  periodDataBefore={isSimulationMode ? year : null}
                  type="year" 
                  isHighlighted={year.isCurrentYear}
                  periodKey={String(year.year)}
                />
              </div>
            );
          })}

          {/* Vue MOIS */}
          {viewMode === 'month' && monthlyData.map((month, idx) => {
            const monthSimulated = isSimulationMode ? monthlyDataSimulated[idx] : null;
            
            return (
              <div
                key={month.monthKey}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isSimulationMode ? '1fr 1fr 200px' : '1fr 350px',
                  gap: '15px'
                }}
              >
                {/* Données AVANT */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `120px repeat(${accounts.length}, 1fr)`,
                  gap: '10px',
                  padding: '12px 10px',
                  background: isSimulationMode 
                    ? 'rgba(231, 76, 60, 0.1)' 
                    : (month.isCurrentMonth ? 'rgba(102, 126, 234, 0.3)' : 'rgba(255,255,255,0.03)'),
                  borderRadius: '10px',
                  border: isSimulationMode 
                    ? '2px solid rgba(231, 76, 60, 0.3)'
                    : (month.isCurrentMonth ? '2px solid #667eea' : '2px solid transparent')
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: month.isCurrentMonth ? '#667eea' : 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '8px'
                  }}>
                    <span style={{ fontSize: '0.9em', fontWeight: 'bold' }}>{month.label}</span>
                    {month.isCurrentMonth && <span style={{ fontSize: '0.7em', marginTop: '3px' }}>Actuel</span>}
                  </div>

                  {accounts.map(account => {
                    const accData = month.accounts[account.nom];
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
                </div>

                {/* Données APRÈS (seulement si simulation) */}
                {isSimulationMode && monthSimulated && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: `120px repeat(${accounts.length}, 1fr)`,
                    gap: '10px',
                    padding: '12px 10px',
                    background: 'rgba(39, 174, 96, 0.1)',
                    borderRadius: '10px',
                    border: '2px solid rgba(39, 174, 96, 0.3)'
                  }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      background: month.isCurrentMonth ? '#27ae60' : 'rgba(39, 174, 96, 0.3)',
                      borderRadius: '8px',
                      padding: '8px'
                    }}>
                      <span style={{ fontSize: '0.9em', fontWeight: 'bold' }}>{monthSimulated.label}</span>
                      {month.isCurrentMonth && <span style={{ fontSize: '0.7em', marginTop: '3px' }}>Optimisé</span>}
                    </div>

                    {accounts.map(account => {
                      const accData = monthSimulated.accounts[account.nom];
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
                            border: (isNegative || isOverpayment) ? '2px solid #e74c3c' : '2px solid rgba(39, 174, 96, 0.3)'
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
                  </div>
                )}

                {/* OPE - colonne unique */}
                <OPECell 
                  periodData={isSimulationMode && monthSimulated ? monthSimulated : month} 
                  periodDataBefore={isSimulationMode ? month : null}
                  type="month" 
                  isHighlighted={month.isCurrentMonth}
                  periodKey={month.monthKey}
                />
              </div>
            );
          })}

          {/* Vue JOUR */}
          {viewMode === 'day' && displayDayData.map((day, idx) => {
            const dayIsToday = isToday(day.dateStr);
            const daySimulated = isSimulationMode ? displayDayDataSimulated[idx] : null;
            
            return (
              <div
                key={day.dateStr}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isSimulationMode ? '1fr 1fr 200px' : '1fr 350px',
                  gap: '15px'
                }}
              >
                {/* Données AVANT */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `120px repeat(${accounts.length}, 1fr)`,
                  gap: '10px',
                  padding: '10px',
                  background: isSimulationMode 
                    ? 'rgba(231, 76, 60, 0.1)' 
                    : (dayIsToday ? 'rgba(102, 126, 234, 0.3)' : 'rgba(255,255,255,0.03)'),
                  borderRadius: '8px',
                  border: isSimulationMode 
                    ? '2px solid rgba(231, 76, 60, 0.3)'
                    : (dayIsToday ? '2px solid #667eea' : '2px solid transparent')
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: dayIsToday ? '#667eea' : 'rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '6px',
                    fontSize: '0.8em'
                  }}>
                    <span>{new Date(day.dateStr + 'T12:00:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}</span>
                    <span style={{ fontSize: '0.75em', opacity: 0.7 }}>{day.dateStr.split('-')[0]}</span>
                    {dayIsToday && <span style={{ fontSize: '0.65em', marginTop: '2px' }}>Aujourd'hui</span>}
                  </div>

                  {accounts.map(account => {
                    const accData = day.accounts[account.nom];
                    const balance = accData?.solde ?? 0;
                    const totalEntrees = accData?.totalEntrees ?? 0;
                    const totalSorties = accData?.totalSorties ?? 0;
                    const isNegative = balance < 0 && account.type !== 'credit';
                    const isOverpayment = balance < 0 && account.type === 'credit';
                    
                    return (
                      <div
                        key={account.id}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          borderRadius: '6px',
                          padding: '8px',
                          textAlign: 'center',
                          border: (isNegative || isOverpayment) ? '2px solid #e74c3c' : '2px solid transparent'
                        }}
                      >
                        <div style={{
                          fontSize: '0.95em',
                          fontWeight: 'bold',
                          color: account.type === 'credit' 
                            ? (isOverpayment ? '#e74c3c' : '#f39c12') 
                            : (isNegative ? '#e74c3c' : '#27ae60')
                        }}>
                          {formatMontant(balance)}
                        </div>
                        {(totalEntrees > 0 || totalSorties > 0) && (
                          <div style={{ fontSize: '0.7em', marginTop: '3px', color: 'rgba(255,255,255,0.6)' }}>
                            {totalEntrees > 0 && <span style={{ color: '#27ae60' }}>+{formatMontant(totalEntrees)}</span>}
                            {totalEntrees > 0 && totalSorties > 0 && ' / '}
                            {totalSorties > 0 && <span style={{ color: '#e74c3c' }}>-{formatMontant(totalSorties)}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Données APRÈS (seulement si simulation) */}
                {isSimulationMode && daySimulated && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: `120px repeat(${accounts.length}, 1fr)`,
                    gap: '10px',
                    padding: '10px',
                    background: 'rgba(39, 174, 96, 0.1)',
                    borderRadius: '8px',
                    border: '2px solid rgba(39, 174, 96, 0.3)'
                  }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      background: dayIsToday ? '#27ae60' : 'rgba(39, 174, 96, 0.3)',
                      borderRadius: '6px',
                      padding: '6px',
                      fontSize: '0.8em'
                    }}>
                      <span>{new Date(daySimulated.dateStr + 'T12:00:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}</span>
                      <span style={{ fontSize: '0.75em', opacity: 0.7 }}>{daySimulated.dateStr.split('-')[0]}</span>
                      {dayIsToday && <span style={{ fontSize: '0.65em', marginTop: '2px' }}>Optimisé</span>}
                    </div>

                    {accounts.map(account => {
                      const accData = daySimulated.accounts[account.nom];
                      const balance = accData?.solde ?? 0;
                      const totalEntrees = accData?.totalEntrees ?? 0;
                      const totalSorties = accData?.totalSorties ?? 0;
                      const isNegative = balance < 0 && account.type !== 'credit';
                      const isOverpayment = balance < 0 && account.type === 'credit';
                      
                      return (
                        <div
                          key={account.id}
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '6px',
                            padding: '8px',
                            textAlign: 'center',
                            border: (isNegative || isOverpayment) ? '2px solid #e74c3c' : '2px solid rgba(39, 174, 96, 0.3)'
                          }}
                        >
                          <div style={{
                            fontSize: '0.95em',
                            fontWeight: 'bold',
                            color: account.type === 'credit' 
                              ? (isOverpayment ? '#e74c3c' : '#f39c12') 
                              : (isNegative ? '#e74c3c' : '#27ae60')
                          }}>
                            {formatMontant(balance)}
                          </div>
                          {(totalEntrees > 0 || totalSorties > 0) && (
                            <div style={{ fontSize: '0.7em', marginTop: '3px', color: 'rgba(255,255,255,0.6)' }}>
                              {totalEntrees > 0 && <span style={{ color: '#27ae60' }}>+{formatMontant(totalEntrees)}</span>}
                              {totalEntrees > 0 && totalSorties > 0 && ' / '}
                              {totalSorties > 0 && <span style={{ color: '#e74c3c' }}>-{formatMontant(totalSorties)}</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* OPE - colonne unique */}
                <OPECell 
                  periodData={isSimulationMode && daySimulated ? daySimulated : day} 
                  periodDataBefore={isSimulationMode ? day : null}
                  type="day" 
                  isHighlighted={dayIsToday}
                  periodKey={day.dateStr}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================ */}
      {/* MODAL RAPPORT OPE-1 */}
      {/* ============================================ */}
      {showOPEReport && opeReport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(180deg, #0a0354 0%, #100261 100%)',
            borderRadius: '20px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            border: '2px solid rgba(155, 89, 182, 0.5)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}>
            {/* Header du modal */}
            <div style={{
              padding: '20px 25px',
              borderBottom: '2px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(155, 89, 182, 0.2)'
            }}>
              <div>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: 'white' }}>
                  🧠 Rapport OPE-1
                  <span style={{
                    fontSize: '0.5em',
                    padding: '4px 12px',
                    background: opeReport.overallHealth === 'excellent' ? '#27ae60' :
                               opeReport.overallHealth === 'needs_optimization' ? '#f39c12' : '#e74c3c',
                    borderRadius: '20px'
                  }}>
                    {opeReport.overallHealth === 'excellent' ? '✅ Excellent' :
                     opeReport.overallHealth === 'needs_optimization' ? '⚠️ Optimisation requise' : '❌ Attention requise'}
                  </span>
                </h2>
                <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.85em' }}>
                  Équilibre des comptes - Généré le {new Date(opeReport.generatedAt).toLocaleString('fr-CA')}
                </p>
              </div>
              <button
                onClick={() => setShowOPEReport(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  background: 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1em'
                }}
              >
                ✕
              </button>
            </div>

            {/* Corps du modal - scrollable */}
            <div style={{
              padding: '25px',
              maxHeight: 'calc(90vh - 100px)',
              overflowY: 'auto'
            }}>
              {/* Résumé */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '15px',
                marginBottom: '30px'
              }}>
                <div style={{
                  background: 'rgba(39, 174, 96, 0.2)',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '2px solid rgba(39, 174, 96, 0.3)'
                }}>
                  <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#27ae60' }}>
                    {opeReport.summary.healthyAccounts}
                  </div>
                  <div style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.7)' }}>
                    Comptes sains
                  </div>
                </div>
                <div style={{
                  background: 'rgba(243, 156, 18, 0.2)',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '2px solid rgba(243, 156, 18, 0.3)'
                }}>
                  <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#f39c12' }}>
                    {opeReport.summary.accountsWithAnomalies}
                  </div>
                  <div style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.7)' }}>
                    Optimisations
                  </div>
                </div>
                <div style={{
                  background: 'rgba(155, 89, 182, 0.2)',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '2px solid rgba(155, 89, 182, 0.3)'
                }}>
                  <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#9b59b6' }}>
                    {opeReport.summary.recommendationsCount}
                  </div>
                  <div style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.7)' }}>
                    Recommandations
                  </div>
                </div>
                <div style={{
                  background: 'rgba(52, 152, 219, 0.2)',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '2px solid rgba(52, 152, 219, 0.3)'
                }}>
                  <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#3498db' }}>
                    {formatMontant(opeReport.summary.totalMonthlyRecovery)}
                  </div>
                  <div style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.7)' }}>
                    Récupération/mois
                  </div>
                </div>
              </div>

              {/* Recommandations */}
              {opeReport.recommendations.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <h3 style={{ margin: '0 0 15px', display: 'flex', alignItems: 'center', gap: '10px', color: 'white' }}>
                    💡 Recommandations d'optimisation
                  </h3>
                  
                  {opeReport.recommendations.map((rec, idx) => (
                    <div
                      key={rec.id}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '15px',
                        padding: '20px',
                        marginBottom: '15px',
                        border: '2px solid rgba(155, 89, 182, 0.3)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                            <span style={{
                              background: '#9b59b6',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontSize: '0.75em',
                              fontWeight: 'bold',
                              color: 'white'
                            }}>
                              {rec.id}
                            </span>
                            <span style={{
                              background: rec.priority === 'high' ? '#f39c12' : '#3498db',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontSize: '0.75em',
                              color: 'white'
                            }}>
                              {rec.priority === 'high' ? '🟠 Priorité' : '🔵 Priorité moyenne'}
                            </span>
                          </div>
                          <h4 style={{ margin: 0, fontSize: '1.1em', color: 'white' }}>
                            💳 {rec.account.name}
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8em', marginLeft: '10px' }}>
                              ({rec.account.type})
                            </span>
                          </h4>
                        </div>
                        <div style={{
                          background: 'rgba(231, 76, 60, 0.2)',
                          padding: '10px 15px',
                          borderRadius: '10px',
                          textAlign: 'right'
                        }}>
                          <div style={{ fontSize: '0.75em', color: 'rgba(255,255,255,0.7)' }}>Solde final projeté</div>
                          <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#e74c3c' }}>
                            {formatMontant(rec.anomaly.finalBalance)}
                          </div>
                          <div style={{ fontSize: '0.7em', color: 'rgba(255,255,255,0.6)' }}>en {rec.anomaly.finalYear}</div>
                        </div>
                      </div>

                      {/* Optimisation */}
                      <div style={{
                        background: 'rgba(243, 156, 18, 0.15)',
                        borderRadius: '10px',
                        padding: '12px 15px',
                        marginBottom: '15px',
                        borderLeft: '4px solid #f39c12'
                      }}>
                        <div style={{ fontSize: '0.85em', fontWeight: 'bold', color: '#f39c12', marginBottom: '5px' }}>
                          💡 Optimisation: {rec.anomaly.description}
                        </div>
                        <div style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.9)' }}>
                          Point de bascule: <strong style={{ color: 'white' }}>{rec.anomaly.detectedAtLabel}</strong>
                          <span style={{ marginLeft: '15px', color: 'rgba(255,255,255,0.8)' }}>
                            ({formatMontant(rec.anomaly.balanceBefore)} → {formatMontant(rec.anomaly.balanceAfter)})
                          </span>
                        </div>
                      </div>

                      {/* Recommandation */}
                      <div style={{
                        background: 'rgba(39, 174, 96, 0.15)',
                        borderRadius: '10px',
                        padding: '15px',
                        borderLeft: '4px solid #27ae60'
                      }}>
                        <div style={{ fontSize: '0.85em', fontWeight: 'bold', color: '#27ae60', marginBottom: '10px' }}>
                          ✅ Recommandation
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                          <div>
                            <div style={{ fontSize: '0.75em', color: 'rgba(255,255,255,0.7)', marginBottom: '3px' }}>Budget à modifier</div>
                            <div style={{ fontWeight: 'bold', color: 'white' }}>"{rec.budgetToModify.description}"</div>
                            <div style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.8)' }}>
                              {rec.budgetToModify.frequenceLabel || rec.budgetToModify.currentFrequence} • Compte: {rec.budgetToModify.compte}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.75em', color: 'rgba(255,255,255,0.7)', marginBottom: '3px' }}>Date d'intervention</div>
                            <div style={{ fontWeight: 'bold', color: 'white' }}>{rec.recommendation.interventionDateLabel}</div>
                          </div>
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '20px',
                          marginTop: '15px',
                          padding: '15px',
                          background: 'rgba(0,0,0,0.3)',
                          borderRadius: '10px'
                        }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75em', color: 'rgba(255,255,255,0.7)' }}>Montant actuel</div>
                            <div style={{ fontSize: '1.4em', fontWeight: 'bold', color: '#e74c3c' }}>
                              {formatMontant(rec.budgetToModify.currentAmount)}
                            </div>
                            <div style={{ fontSize: '0.75em', color: 'rgba(255,255,255,0.8)' }}>
                              {rec.budgetToModify.frequenceLabel || rec.budgetToModify.currentFrequence}
                            </div>
                            <div style={{ fontSize: '0.65em', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                              ({formatMontant(rec.budgetToModify.currentAmountMonthly)}/mois)
                            </div>
                          </div>
                          <div style={{ fontSize: '2em', color: 'rgba(255,255,255,0.8)' }}>→</div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75em', color: 'rgba(255,255,255,0.7)' }}>Nouveau montant</div>
                            <div style={{ fontSize: '1.4em', fontWeight: 'bold', color: '#27ae60' }}>
                              {formatMontant(rec.recommendation.newAmount)}
                            </div>
                            <div style={{ fontSize: '0.75em', color: 'rgba(255,255,255,0.8)' }}>
                              {rec.recommendation.frequenceLabel || rec.budgetToModify.currentFrequence}
                            </div>
                            <div style={{ fontSize: '0.65em', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                              ({formatMontant(rec.recommendation.newAmountMonthly)}/mois)
                            </div>
                          </div>
                          <div style={{ flex: 1 }} />
                          <div style={{
                            textAlign: 'center',
                            background: 'rgba(52, 152, 219, 0.3)',
                            padding: '10px 20px',
                            borderRadius: '10px'
                          }}>
                            <div style={{ fontSize: '0.75em', color: 'rgba(255,255,255,0.7)' }}>Économie/mois</div>
                            <div style={{ fontSize: '1.3em', fontWeight: 'bold', color: '#3498db' }}>
                              +{formatMontant(rec.impact.monthlyRecovery)}
                            </div>
                            <div style={{ fontSize: '0.7em', color: 'rgba(255,255,255,0.6)' }}>
                              ({formatMontant(rec.impact.yearlyRecovery)}/an)
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pas de recommandations */}
              {opeReport.recommendations.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  background: 'rgba(39, 174, 96, 0.1)',
                  borderRadius: '15px',
                  border: '2px solid rgba(39, 174, 96, 0.3)'
                }}>
                  <div style={{ fontSize: '3em', marginBottom: '15px' }}>🎉</div>
                  <h3 style={{ margin: '0 0 10px', color: '#27ae60' }}>Aucune optimisation requise!</h3>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)' }}>
                    Le portefeuille de l'utilisateur est équilibré. Tous les comptes sont en santé.
                  </p>
                </div>
              )}

              {/* Bouton Simuler */}
              {opeReport.recommendations.length > 0 && (
                <div style={{
                  marginTop: '30px',
                  padding: '20px',
                  background: 'rgba(155, 89, 182, 0.2)',
                  borderRadius: '15px',
                  border: '2px solid rgba(155, 89, 182, 0.4)',
                  textAlign: 'center'
                }}>
                  <h3 style={{ margin: '0 0 10px', color: '#9b59b6' }}>
                    🔮 Prêt à simuler?
                  </h3>
                  <p style={{ margin: '0 0 20px', color: 'rgba(255,255,255,0.85)', fontSize: '0.9em' }}>
                    Visualisez l'impact des recommandations sur la trajectoire financière.
                    Comparez côte à côte <strong style={{ color: 'white' }}>AVANT</strong> et <strong style={{ color: 'white' }}>APRÈS</strong> l'optimisation.
                  </p>
                  <button
                    onClick={handleStartSimulation}
                    style={{
                      padding: '15px 40px',
                      borderRadius: '15px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '1.1em',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 15px rgba(155, 89, 182, 0.4)'
                    }}
                  >
                    🔮 Lancer la simulation
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL PRÉVISUALISATION PROPOSITION */}
      {/* ============================================ */}
      {showProposalModal && opeReport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(180deg, #0a0354 0%, #100261 100%)',
            borderRadius: '20px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            border: '2px solid rgba(39, 174, 96, 0.5)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}>
            {/* Header du modal */}
            <div style={{
              padding: '20px 25px',
              borderBottom: '2px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, rgba(39, 174, 96, 0.3) 0%, rgba(46, 204, 113, 0.2) 100%)'
            }}>
              <div>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: 'white' }}>
                  📨 Envoi de proposition
                </h2>
                <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.85em' }}>
                  Aperçu du rapport qui sera envoyé à l'utilisateur
                </p>
              </div>
              <button
                onClick={() => setShowProposalModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  background: 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1em'
                }}
              >
                ✕
              </button>
            </div>

            {/* Corps du modal - Rapport simplifié */}
            <div style={{
              padding: '25px',
              maxHeight: 'calc(90vh - 180px)',
              overflowY: 'auto'
            }}>
              {/* Calcul du pourcentage de réduction */}
              {(() => {
                // Total des paiements actuels
                const totalCurrentPayments = opeReport.recommendations.reduce(
                  (sum, rec) => sum + (rec.budgetToModify.currentAmountMonthly || 0), 0
                );
                // Total des nouveaux paiements
                const totalNewPayments = opeReport.recommendations.reduce(
                  (sum, rec) => sum + (rec.recommendation.newAmountMonthly || 0), 0
                );
                // Pourcentage de réduction
                const reductionPercent = totalCurrentPayments > 0 
                  ? Math.round(((totalCurrentPayments - totalNewPayments) / totalCurrentPayments) * 100)
                  : 0;
                // Première date d'intervention
                const firstInterventionLabel = opeReport.recommendations
                  .map(rec => rec.recommendation.interventionDateLabel)
                  .sort()[0] || 'bientôt';

                return (
                  <>
                    {/* Message explicatif */}
                    <div style={{
                      background: 'rgba(52, 152, 219, 0.15)',
                      borderRadius: '15px',
                      padding: '20px',
                      marginBottom: '25px',
                      border: '2px solid rgba(52, 152, 219, 0.3)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '1.1em', color: 'rgba(255,255,255,0.9)', lineHeight: 1.6 }}>
                        Vos paiements génèrent un <strong style={{ color: '#f39c12' }}>surplus</strong> sur vos comptes crédit.
                      </div>
                      <div style={{ fontSize: '1em', color: 'rgba(255,255,255,0.8)', marginTop: '10px' }}>
                        En ajustant vos paiements à votre budget réel à partir de <strong style={{ color: '#3498db' }}>{firstInterventionLabel}</strong>:
                      </div>
                    </div>

                    {/* Gros pourcentage de réduction */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(39, 174, 96, 0.25) 0%, rgba(46, 204, 113, 0.15) 100%)',
                      borderRadius: '20px',
                      padding: '35px 25px',
                      marginBottom: '25px',
                      border: '3px solid rgba(39, 174, 96, 0.5)',
                      textAlign: 'center'
                    }}>
                      <div style={{ 
                        fontSize: '4em', 
                        fontWeight: 'bold', 
                        color: '#27ae60',
                        marginBottom: '10px',
                        textShadow: '0 2px 10px rgba(39, 174, 96, 0.3)'
                      }}>
                        -{reductionPercent}%
                      </div>
                      <div style={{ 
                        fontSize: '1.3em', 
                        color: 'white',
                        fontWeight: '600'
                      }}>
                        📉 Réduisez vos paiements de {reductionPercent}%
                      </div>
                      <div style={{ 
                        fontSize: '0.95em', 
                        color: 'rgba(255,255,255,0.7)',
                        marginTop: '15px'
                      }}>
                        {formatMontant(totalCurrentPayments)}/mois → {formatMontant(totalNewPayments)}/mois
                      </div>
                      <div style={{ 
                        fontSize: '1.1em', 
                        color: '#27ae60',
                        marginTop: '10px',
                        fontWeight: 'bold'
                      }}>
                        Économie: +{formatMontant(opeReport.summary.totalMonthlyRecovery)}/mois
                      </div>
                    </div>

                    {/* Impact cumulé - version compacte */}
                    <div style={{
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '12px',
                      padding: '15px',
                      marginBottom: '20px'
                    }}>
                      <div style={{ 
                        fontSize: '0.85em', 
                        color: 'rgba(255,255,255,0.6)', 
                        marginBottom: '10px',
                        textAlign: 'center'
                      }}>
                        📈 Impact cumulé de l'économie
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}>
                        {[
                          { label: '1 an', value: opeReport.summary.totalMonthlyRecovery * 12 },
                          { label: '5 ans', value: opeReport.summary.totalMonthlyRecovery * 12 * 5 },
                          { label: '10 ans', value: opeReport.summary.totalMonthlyRecovery * 12 * 10 },
                          { label: '15 ans', value: opeReport.summary.totalMonthlyRecovery * 12 * 15 }
                        ].map((period, idx) => (
                          <div
                            key={idx}
                            style={{
                              flex: 1,
                              background: idx === 3 ? 'rgba(39, 174, 96, 0.2)' : 'rgba(52, 152, 219, 0.1)',
                              borderRadius: '8px',
                              padding: '10px 5px',
                              textAlign: 'center'
                            }}
                          >
                            <div style={{ fontSize: '0.7em', color: 'rgba(255,255,255,0.5)' }}>
                              {period.label}
                            </div>
                            <div style={{
                              fontSize: idx === 3 ? '0.95em' : '0.85em',
                              fontWeight: 'bold',
                              color: idx === 3 ? '#27ae60' : '#3498db',
                              marginTop: '3px'
                            }}>
                              +{formatMontant(period.value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Détail des optimisations - compact */}
                    <div style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '10px',
                      padding: '12px',
                      marginBottom: '15px'
                    }}>
                      <div style={{ 
                        fontSize: '0.8em', 
                        color: 'rgba(255,255,255,0.5)', 
                        marginBottom: '8px' 
                      }}>
                        Détail des ajustements ({opeReport.recommendations.length})
                      </div>
                      {opeReport.recommendations.map((rec, idx) => (
                        <div
                          key={rec.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 0',
                            borderBottom: idx < opeReport.recommendations.length - 1 
                              ? '1px solid rgba(255,255,255,0.1)' 
                              : 'none'
                          }}
                        >
                          <div style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.8)' }}>
                            {rec.account.name}
                            <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: '8px' }}>
                              {formatMontant(rec.budgetToModify.currentAmountMonthly)} → {formatMontant(rec.recommendation.newAmountMonthly)}
                            </span>
                          </div>
                          <div style={{ 
                            fontSize: '0.85em', 
                            fontWeight: 'bold', 
                            color: '#27ae60' 
                          }}>
                            +{formatMontant(rec.impact.monthlyRecovery)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Footer avec boutons */}
            <div style={{
              padding: '20px 25px',
              borderTop: '2px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.2)'
            }}>
              <button
                onClick={() => setShowProposalModal(false)}
                style={{
                  padding: '12px 25px',
                  borderRadius: '10px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  background: 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.9em'
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleSendProposal}
                disabled={isSendingProposal}
                style={{
                  padding: '12px 30px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isSendingProposal 
                    ? 'rgba(39, 174, 96, 0.5)' 
                    : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                  color: 'white',
                  cursor: isSendingProposal ? 'not-allowed' : 'pointer',
                  fontSize: '1em',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)'
                }}
              >
                {isSendingProposal ? (
                  <>⏳ Envoi en cours...</>
                ) : (
                  <>📨 Confirmer l'envoi</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnalysis;
