// 🎯 OPE ANALYZER - Optimisation Portefeuille Équilibré
// OPE-1: Équilibre des comptes - Détection anomalies et recommandations
// Utilisé par: AdminAnalysis.jsx pour générer les recommandations d'optimisation

/**
 * Retourne le nombre d'occurrences par mois selon la fréquence
 * @param {string} frequence - Type de fréquence
 * @returns {number} Nombre d'occurrences par mois
 */
const getOccurrencesPerMonth = (frequence) => {
  switch (frequence) {
    case 'mensuel': return 1;
    case 'quinzaine':
    case 'bimensuel': return 2;
    case 'hebdomadaire': return 4.33;
    case 'annuel': return 1/12;
    default: return 1;
  }
};

/**
 * Retourne le libellé de la fréquence en français
 * @param {string} frequence - Type de fréquence
 * @returns {string} Libellé français
 */
const getFrequenceLabel = (frequence) => {
  switch (frequence) {
    case 'mensuel': return 'par mois';
    case 'quinzaine': return 'aux 2 semaines';
    case 'bimensuel': return 'aux 2 semaines';
    case 'hebdomadaire': return 'par semaine';
    case 'annuel': return 'par année';
    default: return 'par mois';
  }
};

/**
 * Convertit un montant mensuel vers un montant par occurrence
 * @param {number} monthlyAmount - Montant mensuel
 * @param {string} frequence - Fréquence cible
 * @returns {number} Montant par occurrence
 */
const monthlyToPerOccurrence = (monthlyAmount, frequence) => {
  const occurrences = getOccurrencesPerMonth(frequence);
  return occurrences > 0 ? monthlyAmount / occurrences : monthlyAmount;
};

/**
 * Calcule le total des sorties mensuelles pour un compte donné
 * @param {string} accountName - Nom du compte
 * @param {Array} budgetSorties - Liste des sorties budgétaires
 * @returns {number} Total mensuel des sorties
 */
const calculateMonthlySorties = (accountName, budgetSorties) => {
  let totalMensuel = 0;
  
  budgetSorties
    .filter(s => s.compte === accountName)
    .forEach(sortie => {
      const montant = parseFloat(sortie.montant) || 0;
      const occurrences = getOccurrencesPerMonth(sortie.frequence);
      totalMensuel += montant * occurrences;
    });
  
  return Math.round(totalMensuel * 100) / 100;
};

/**
 * Calcule le total des entrées mensuelles pour un compte donné
 * @param {string} accountName - Nom du compte
 * @param {Array} budgetEntrees - Liste des entrées budgétaires
 * @returns {Object} { total: number, items: Array } Total et détail des entrées
 */
const calculateMonthlyEntrees = (accountName, budgetEntrees) => {
  let totalMensuel = 0;
  const items = [];
  
  budgetEntrees
    .filter(e => e.compte === accountName)
    .forEach(entree => {
      const montant = parseFloat(entree.montant) || 0;
      const occurrences = getOccurrencesPerMonth(entree.frequence);
      const montantMensuel = montant * occurrences;
      
      totalMensuel += montantMensuel;
      items.push({
        description: entree.description,
        montant: montant, // Montant PAR OCCURRENCE (original)
        montantMensuel: Math.round(montantMensuel * 100) / 100,
        frequence: entree.frequence,
        frequenceLabel: getFrequenceLabel(entree.frequence),
        occurrencesPerMonth: occurrences,
        jourRecurrence: entree.jourRecurrence
      });
    });
  
  return {
    total: Math.round(totalMensuel * 100) / 100,
    items: items.sort((a, b) => b.montantMensuel - a.montantMensuel)
  };
};

/**
 * Trouve le point de bascule (première date d'anomalie) pour un compte crédit
 * @param {string} accountName - Nom du compte
 * @param {Array} allDayData - Données jour par jour
 * @returns {Object|null} { dateStr, dayIndex, balanceBefore, balanceAfter }
 */
const findCreditOverpaymentPoint = (accountName, allDayData) => {
  let previousBalance = null;
  
  for (let i = 0; i < allDayData.length; i++) {
    const day = allDayData[i];
    const accountData = day.accounts[accountName];
    
    if (!accountData) continue;
    
    const currentBalance = accountData.solde;
    
    // Détecter le passage en négatif (trop-perçu)
    if (previousBalance !== null && previousBalance >= 0 && currentBalance < 0) {
      return {
        dateStr: day.dateStr,
        date: day.date,
        dayIndex: i,
        balanceBefore: previousBalance,
        balanceAfter: currentBalance,
        label: day.label
      };
    }
    
    // Si déjà négatif dès le début, c'est le premier jour
    if (i === 0 && currentBalance < 0) {
      return {
        dateStr: day.dateStr,
        date: day.date,
        dayIndex: i,
        balanceBefore: 0,
        balanceAfter: currentBalance,
        label: day.label
      };
    }
    
    previousBalance = currentBalance;
  }
  
  return null;
};

/**
 * Trouve le point de bascule (première date de découvert) pour un compte normal
 * @param {string} accountName - Nom du compte
 * @param {Array} allDayData - Données jour par jour
 * @returns {Object|null} { dateStr, dayIndex, balanceBefore, balanceAfter }
 */
const findNegativeBalancePoint = (accountName, allDayData) => {
  let previousBalance = null;
  
  for (let i = 0; i < allDayData.length; i++) {
    const day = allDayData[i];
    const accountData = day.accounts[accountName];
    
    if (!accountData) continue;
    
    const currentBalance = accountData.solde;
    
    if (currentBalance < 0) {
      return {
        dateStr: day.dateStr,
        date: day.date,
        dayIndex: i,
        balanceBefore: previousBalance ?? 0,
        balanceAfter: currentBalance,
        label: day.label
      };
    }
    
    previousBalance = currentBalance;
  }
  
  return null;
};

/**
 * Calcule l'impact financier d'une recommandation sur la trajectoire
 * @param {number} currentPaymentMonthly - Paiement actuel mensuel
 * @param {number} recommendedPaymentMonthly - Paiement recommandé mensuel
 * @param {string} interventionDateStr - Date d'intervention
 * @param {Array} allDayData - Données jour par jour
 * @returns {Object} Impact calculé
 */
const calculateRecommendationImpact = (currentPaymentMonthly, recommendedPaymentMonthly, interventionDateStr, allDayData) => {
  const monthlyRecovery = currentPaymentMonthly - recommendedPaymentMonthly;
  const yearlyRecovery = monthlyRecovery * 12;
  
  const interventionDate = new Date(interventionDateStr);
  const lastDay = allDayData[allDayData.length - 1];
  const endDate = lastDay ? new Date(lastDay.dateStr) : new Date();
  
  const yearsRemaining = Math.max(0, (endDate.getFullYear() - interventionDate.getFullYear()));
  const totalRecovery = yearlyRecovery * yearsRemaining;
  
  return {
    monthlyRecovery: Math.round(monthlyRecovery * 100) / 100,
    yearlyRecovery: Math.round(yearlyRecovery * 100) / 100,
    yearsRemaining,
    totalRecovery: Math.round(totalRecovery * 100) / 100
  };
};

/**
 * Trouve le solde final d'un compte à la dernière année de la trajectoire
 * @param {string} accountName - Nom du compte
 * @param {Array} yearlyData - Données annuelles
 * @returns {Object} { year, balance }
 */
const getFinalBalance = (accountName, yearlyData) => {
  if (!yearlyData || yearlyData.length === 0) return { year: null, balance: 0 };
  
  const lastYear = yearlyData[yearlyData.length - 1];
  const accountData = lastYear.accounts[accountName];
  
  return {
    year: lastYear.year,
    balance: accountData?.soldeFin ?? 0
  };
};

/**
 * 🎯 FONCTION PRINCIPALE: Génère les recommandations OPE-1
 * 
 * Logique de calcul du nouveau montant:
 * 1. Calcule les sorties MENSUELLES du compte crédit (dépenses récurrentes)
 * 2. Le nouveau paiement MENSUEL = sorties mensuelles (pour équilibrer)
 * 3. Convertit ce montant selon la FRÉQUENCE ORIGINALE du paiement de l'utilisateur
 *    - Si paiement bimensuel (2x/mois): nouveau montant = sorties_mensuelles / 2
 *    - Si paiement mensuel: nouveau montant = sorties_mensuelles
 * 4. L'utilisateur garde sa fréquence habituelle, seul le montant change
 * 
 * @param {Object} params - Paramètres d'analyse
 * @param {Array} params.accounts - Liste des comptes utilisateur
 * @param {Array} params.allDayData - Trajectoire jour par jour
 * @param {Array} params.yearlyData - Trajectoire annuelle (pour résumé)
 * @param {Array} params.budgetEntrees - Entrées budgétaires
 * @param {Array} params.budgetSorties - Sorties budgétaires
 * @returns {Object} Rapport OPE-1 avec recommandations
 */
export const generateOPERecommendations = ({
  accounts = [],
  allDayData = [],
  yearlyData = [],
  budgetEntrees = [],
  budgetSorties = []
}) => {
  console.log('[OPE] Début analyse OPE-1...');
  
  const recommendations = [];
  const anomalies = [];
  const healthyAccounts = [];
  
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  // ============================================
  // ANALYSE PAR TYPE DE COMPTE
  // ============================================
  
  accounts.forEach(account => {
    const accountName = account.nom;
    const accountType = account.type;
    const limite = parseFloat(account.limite) || 0;
    
    const finalBalance = getFinalBalance(accountName, yearlyData);
    
    // ----------------------------------------
    // COMPTES CRÉDIT: Détecter trop-perçu
    // ----------------------------------------
    if (accountType === 'credit') {
      const overpaymentPoint = findCreditOverpaymentPoint(accountName, allDayData);
      
      if (overpaymentPoint) {
        console.log(`[OPE] Anomalie détectée: ${accountName} - Trop-perçu à partir de ${overpaymentPoint.dateStr}`);
        
        // Calculer les flux mensuels
        const monthlyEntrees = calculateMonthlyEntrees(accountName, budgetEntrees);
        const monthlySorties = calculateMonthlySorties(accountName, budgetSorties);
        
        // Le paiement principal est généralement la plus grosse entrée
        const mainPayment = monthlyEntrees.items[0];
        
        if (mainPayment && monthlyEntrees.total > monthlySorties) {
          // ============================================
          // CALCUL DU NOUVEAU MONTANT
          // ============================================
          
          // Montant MENSUEL recommandé = sorties mensuelles du compte
          const recommendedPaymentMonthly = monthlySorties > 0 ? monthlySorties : 0;
          
          // Montant actuel MENSUEL
          const currentPaymentMonthly = mainPayment.montantMensuel;
          
          // Montant actuel PAR OCCURRENCE (ce que l'utilisateur voit dans son budget)
          const currentPaymentPerOccurrence = mainPayment.montant;
          
          // Montant recommandé PAR OCCURRENCE (en gardant la même fréquence)
          // Si paiement bimensuel (2x/mois): nouveau = sorties_mensuelles / 2
          const recommendedPaymentPerOccurrence = Math.round(
            monthlyToPerOccurrence(recommendedPaymentMonthly, mainPayment.frequence) * 100
          ) / 100;
          
          // Calculer l'impact (basé sur les montants MENSUELS)
          const impact = calculateRecommendationImpact(
            currentPaymentMonthly,
            recommendedPaymentMonthly,
            overpaymentPoint.dateStr,
            allDayData
          );
          
          // Créer la recommandation
          const recommendation = {
            id: `OPE-1-${accountName.replace(/\s+/g, '-').toUpperCase()}-001`,
            type: 'reduce_credit_payment',
            priority: 'high',
            
            // Compte concerné
            account: {
              name: accountName,
              type: accountType,
              limite: limite
            },
            
            // Détails de l'anomalie
            anomaly: {
              type: 'overpayment',
              description: 'Trop-perçu sur compte crédit',
              detectedAt: overpaymentPoint.dateStr,
              detectedAtLabel: overpaymentPoint.label,
              balanceBefore: overpaymentPoint.balanceBefore,
              balanceAfter: overpaymentPoint.balanceAfter,
              finalBalance: finalBalance.balance,
              finalYear: finalBalance.year
            },
            
            // Budget à modifier (avec montants PAR OCCURRENCE)
            budgetToModify: {
              type: 'entree',
              description: mainPayment.description,
              compte: accountName,
              // Montant par occurrence (original de l'utilisateur)
              currentAmount: currentPaymentPerOccurrence,
              // Montant mensuel total
              currentAmountMonthly: currentPaymentMonthly,
              // Fréquence originale
              currentFrequence: mainPayment.frequence,
              frequenceLabel: mainPayment.frequenceLabel,
              occurrencesPerMonth: mainPayment.occurrencesPerMonth,
              jourRecurrence: mainPayment.jourRecurrence
            },
            
            // Recommandation (avec montant PAR OCCURRENCE)
            recommendation: {
              // Nouveau montant PAR OCCURRENCE (ce que l'utilisateur doit mettre)
              newAmount: recommendedPaymentPerOccurrence,
              // Nouveau montant mensuel total (pour info)
              newAmountMonthly: recommendedPaymentMonthly,
              // Garde la même fréquence
              frequence: mainPayment.frequence,
              frequenceLabel: mainPayment.frequenceLabel,
              interventionDate: overpaymentPoint.dateStr,
              interventionDateLabel: overpaymentPoint.label,
              reason: `Équilibrer avec les sorties mensuelles (${monthlySorties.toFixed(2)} $/mois)`
            },
            
            // Flux mensuels pour contexte
            monthlyFlows: {
              totalEntrees: monthlyEntrees.total,
              totalSorties: monthlySorties,
              entreesDetail: monthlyEntrees.items
            },
            
            // Impact financier
            impact: {
              ...impact,
              description: `Récupération de ${impact.monthlyRecovery.toFixed(2)} $/mois vers compte principal`
            }
          };
          
          recommendations.push(recommendation);
          
          anomalies.push({
            accountName,
            type: 'overpayment',
            severity: 'high',
            startDate: overpaymentPoint.dateStr,
            hasRecommendation: true
          });
          
        } else {
          anomalies.push({
            accountName,
            type: 'overpayment',
            severity: 'medium',
            startDate: overpaymentPoint.dateStr,
            hasRecommendation: false,
            note: 'Analyse manuelle requise'
          });
        }
        
      } else {
        // Pas d'anomalie - vérifier si proche de la limite
        const lastDayData = allDayData[allDayData.length - 1];
        const currentBalance = lastDayData?.accounts[accountName]?.solde ?? 0;
        
        if (limite > 0 && currentBalance >= limite * 0.8) {
          anomalies.push({
            accountName,
            type: 'approaching_limit',
            severity: 'warning',
            currentBalance,
            limite,
            percentUsed: Math.round((currentBalance / limite) * 100)
          });
        } else {
          healthyAccounts.push({
            accountName,
            type: accountType,
            status: 'ok',
            finalBalance: finalBalance.balance
          });
        }
      }
    }
    
    // ----------------------------------------
    // COMPTES NORMAUX: Détecter découvert
    // ----------------------------------------
    if (accountType === 'cheque' || accountType === 'epargne') {
      const negativePoint = findNegativeBalancePoint(accountName, allDayData);
      
      if (negativePoint) {
        console.log(`[OPE] Anomalie détectée: ${accountName} - Découvert à partir de ${negativePoint.dateStr}`);
        
        anomalies.push({
          accountName,
          type: 'overdraft',
          severity: 'critical',
          startDate: negativePoint.dateStr,
          startDateLabel: negativePoint.label,
          balanceAfter: negativePoint.balanceAfter,
          hasRecommendation: false,
          note: 'Découvert prévu - Analyse des dépenses requise'
        });
        
      } else {
        healthyAccounts.push({
          accountName,
          type: accountType,
          status: 'ok',
          finalBalance: finalBalance.balance
        });
      }
    }
  });
  
  // ============================================
  // RÉSUMÉ ET RAPPORT
  // ============================================
  
  const report = {
    generatedAt: new Date().toISOString(),
    analysisDate: todayStr,
    
    summary: {
      totalAccounts: accounts.length,
      healthyAccounts: healthyAccounts.length,
      accountsWithAnomalies: anomalies.length,
      recommendationsCount: recommendations.length,
      totalMonthlyRecovery: recommendations.reduce((sum, r) => sum + (r.impact?.monthlyRecovery || 0), 0),
      totalYearlyRecovery: recommendations.reduce((sum, r) => sum + (r.impact?.yearlyRecovery || 0), 0)
    },
    
    recommendations,
    anomalies,
    healthyAccounts,
    
    hasRecommendations: recommendations.length > 0,
    hasAnomalies: anomalies.length > 0,
    overallHealth: anomalies.length === 0 ? 'excellent' : 
                   recommendations.length > 0 ? 'needs_optimization' : 
                   'needs_attention'
  };
  
  console.log(`[OPE] Analyse terminée: ${recommendations.length} recommandations, ${anomalies.length} anomalies`);
  
  return report;
};

/**
 * Formate un montant en devise canadienne
 */
export const formatCurrency = (amount) => {
  const num = new Intl.NumberFormat('fr-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(amount || 0));
  return amount < 0 ? `-${num} $` : `${num} $`;
};

/**
 * Formate une date en français
 */
export const formatDateFr = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('fr-CA', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
};

/**
 * 🔄 Convertit les recommandations OPE en budgetModifications CUMULATIVES
 * 
 * Cette fonction transforme les recommandations en modifications budgétaires
 * compatibles avec le système existant de trajectoryCalculator.
 * 
 * IMPORTANT: Les modifications sont CUMULATIVES - chaque nouvelle modification
 * prend en compte les changements des modifications précédentes.
 * 
 * @param {Array} recommendations - Liste des recommandations OPE
 * @param {Array} existingEntrees - Entrées budgétaires actuelles
 * @param {Array} existingSorties - Sorties budgétaires actuelles
 * @returns {Array} Liste de budgetModifications prêtes à être injectées
 */
export const convertRecommendationsToModifications = (recommendations, existingEntrees, existingSorties) => {
  const modifications = [];
  
  // Trier les recommandations par date d'intervention (plus ancienne en premier)
  const sortedRecs = [...recommendations].sort((a, b) => 
    new Date(a.recommendation.interventionDate) - new Date(b.recommendation.interventionDate)
  );
  
  // Démarrer avec les budgets originaux
  let currentEntrees = existingEntrees.map(e => ({ ...e }));
  let currentSorties = existingSorties.map(s => ({ ...s }));
  
  sortedRecs.forEach(rec => {
    if (rec.type === 'reduce_credit_payment') {
      // Trouver la date d'intervention
      const dateEffet = rec.recommendation.interventionDate;
      
      // Appliquer la modification sur les budgets ACTUELS (déjà modifiés par les précédentes)
      currentEntrees = currentEntrees.map(entree => {
        // Vérifier si c'est l'entrée à modifier
        if (entree.description === rec.budgetToModify.description && 
            entree.compte === rec.budgetToModify.compte) {
          return {
            ...entree,
            montant: rec.recommendation.newAmount // Nouveau montant par occurrence
          };
        }
        return { ...entree };
      });
      
      // Les sorties restent identiques (mais on garde une copie cumulative)
      currentSorties = currentSorties.map(sortie => ({ ...sortie }));
      
      // Créer la modification budgétaire avec les budgets CUMULATIFS
      modifications.push({
        id: `OPE-MOD-${rec.id}`,
        dateEffet,
        dateEffetLabel: rec.recommendation.interventionDateLabel,
        description: `OPE-1: Réduction paiement ${rec.account.name}`,
        source: 'OPE-1',
        recommendationId: rec.id,
        // IMPORTANT: Copier l'état ACTUEL (cumulé) des budgets
        entrees: currentEntrees.map(e => ({ ...e })),
        sorties: currentSorties.map(s => ({ ...s })),
        // Métadonnées pour l'affichage
        meta: {
          accountName: rec.account.name,
          previousAmount: rec.budgetToModify.currentAmount,
          newAmount: rec.recommendation.newAmount,
          frequence: rec.budgetToModify.currentFrequence,
          monthlyRecovery: rec.impact.monthlyRecovery
        }
      });
    }
  });
  
  console.log(`[OPE] ${modifications.length} modifications générées (cumulatives)`);
  
  return modifications;
};

export default {
  generateOPERecommendations,
  convertRecommendationsToModifications,
  formatCurrency,
  formatDateFr
};
