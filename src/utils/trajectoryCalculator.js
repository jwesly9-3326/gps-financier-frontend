// 🧮 TRAJECTORY CALCULATOR - Logique de calcul partagée
// Utilisé par: GPSFinancier.jsx (utilisateur) et AdminAnalysis.jsx (admin)
// Source unique de vérité pour le calcul des trajectoires financières

/**
 * Parse une date string en objet Date local
 */
const parseLocalDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Formate une date en string YYYY-MM-DD
 */
const formatDateStr = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/**
 * Obtient le budget effectif pour une date donnée
 * Avant date modification = Budget de base
 * À partir de date modification = Budget modifié
 */
const getEffectiveBudget = (dateStr, baseBudgetEntrees, baseBudgetSorties, budgetModifications) => {
  if (!budgetModifications || budgetModifications.length === 0) {
    return {
      entrees: baseBudgetEntrees,
      sorties: baseBudgetSorties,
      isModified: false
    };
  }
  
  // Trier par date décroissante pour trouver la modification la plus récente applicable
  const sortedMods = [...budgetModifications].sort((a, b) => 
    b.dateEffet.localeCompare(a.dateEffet)
  );
  
  // Trouver la première modification dont dateEffet <= dateStr
  const applicableMod = sortedMods.find(mod => mod.dateEffet <= dateStr);
  
  if (applicableMod) {
    return {
      entrees: applicableMod.entrees || baseBudgetEntrees,
      sorties: applicableMod.sorties || baseBudgetSorties,
      isModified: true,
      modificationDate: applicableMod.dateEffet
    };
  }
  
  return {
    entrees: baseBudgetEntrees,
    sorties: baseBudgetSorties,
    isModified: false
  };
};

/**
 * Détermine les transactions qui s'appliquent pour une date donnée
 */
const getTransactionsForDate = (date, items, isEntree) => {
  const transactions = [];
  const dateDay = date.getDate();
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  
  items.forEach(item => {
    const jour = parseInt(item.jourRecurrence) || 1;
    let isMatch = false;
    
    const checkDayMatch = (jourRecurrence) => {
      if (jourRecurrence > lastDayOfMonth) {
        return dateDay === lastDayOfMonth;
      }
      return dateDay === jourRecurrence;
    };
    
    switch (item.frequence) {
      case 'mensuel':
        isMatch = checkDayMatch(jour);
        break;
      case 'quinzaine':
        const firstDay = Math.min(jour, lastDayOfMonth);
        const secondDay = Math.min(jour + 15, lastDayOfMonth);
        isMatch = dateDay === firstDay || dateDay === secondDay;
        break;
      case 'bimensuel':
        if (item.jourSemaine && item.dateReference) {
          const refDate = parseLocalDate(item.dateReference);
          const diffTime = date.getTime() - refDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          isMatch = diffDays >= 0 && diffDays % 14 === 0;
        } else {
          isMatch = checkDayMatch(jour);
        }
        break;
      case 'hebdomadaire':
        if (item.jourSemaine !== undefined && item.jourSemaine !== '') {
          isMatch = date.getDay() === parseInt(item.jourSemaine);
        } else {
          isMatch = date.getDay() === (jour % 7);
        }
        break;
      case 'trimestriel':
        isMatch = checkDayMatch(jour) && date.getMonth() % 3 === 0;
        break;
      case 'annuel':
        const targetMonth = item.moisRecurrence ? (parseInt(item.moisRecurrence) - 1) : 0;
        isMatch = checkDayMatch(jour) && date.getMonth() === targetMonth;
        break;
      default:
        isMatch = checkDayMatch(jour);
    }

    if (isMatch && item.compte) {
      transactions.push({
        compte: item.compte,
        description: item.description,
        montant: parseFloat(item.montant) || 0,
        isEntree
      });
    }
  });
  
  return transactions;
};

/**
 * Calcule la trajectoire financière complète (allDayData)
 * 
 * @param {Object} params - Paramètres de calcul
 * @param {Array} params.accounts - Liste des comptes
 * @param {Array} params.initialBalances - Soldes initiaux [{accountName, solde}]
 * @param {Array} params.budgetEntrees - Budget entrées de base
 * @param {Array} params.budgetSorties - Budget sorties de base
 * @param {Array} params.budgetModifications - Modifications de budget
 * @param {Date} params.startDate - Date de début (défaut: aujourd'hui)
 * @param {number} params.daysToCalculate - Nombre de jours à calculer (défaut: 19710 = 54 ans)
 * @param {Array} params.monthsShort - Noms courts des mois (optionnel)
 * @returns {Array} allDayData - Données jour par jour
 */
export const calculateAllDayData = ({
  accounts = [],
  initialBalances = [],
  budgetEntrees = [],
  budgetSorties = [],
  budgetModifications = [],
  startDate = null,
  daysToCalculate = 19710,
  monthsShort = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
}) => {
  const data = [];
  
  if (!accounts || accounts.length === 0) {
    console.log('[TrajectoryCalculator] Pas de comptes fournis');
    return data;
  }
  
  // Initialiser les soldes depuis les comptes
  const runningBalances = {};
  accounts.forEach(acc => {
    const solde = initialBalances.find(s => s.accountName === acc.nom);
    runningBalances[acc.nom] = parseFloat(solde?.solde) || 0;
  });

  // Date de début
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = startDate ? new Date(startDate) : new Date(today);
  start.setHours(0, 0, 0, 0);
  
  const todayStr = formatDateStr(today);
  
  console.log(`[TrajectoryCalculator] Calcul de ${daysToCalculate} jours à partir de ${formatDateStr(start)}`);
  console.log(`[TrajectoryCalculator] ${accounts.length} comptes, ${budgetEntrees.length} entrées, ${budgetSorties.length} sorties`);
  
  for (let i = 0; i < daysToCalculate; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);
    const currentDateStr = formatDateStr(currentDate);
    
    // Obtenir le budget effectif pour cette date
    const effectiveBudget = getEffectiveBudget(currentDateStr, budgetEntrees, budgetSorties, budgetModifications);
    const budgetEntreesEffectif = effectiveBudget.entrees;
    const budgetSortiesEffectif = effectiveBudget.sorties;
    
    // Obtenir les transactions du jour
    const entreesJour = getTransactionsForDate(currentDate, budgetEntreesEffectif, true);
    const sortiesJour = getTransactionsForDate(currentDate, budgetSortiesEffectif, false);
    
    // Détecter les transferts entre comptes
    const transferInfo = {};
    sortiesJour.forEach(sortie => {
      if (sortie.description.toLowerCase().includes('transfert') || 
          sortie.description.toLowerCase().includes('paiement')) {
        const matchingEntree = entreesJour.find(e => 
          (e.description.toLowerCase().includes('paiement') ||
           e.description.toLowerCase().includes('transfert')) &&
          Math.abs(e.montant - sortie.montant) < 0.01 &&
          e.compte !== sortie.compte
        );
        
        if (matchingEntree) {
          transferInfo[sortie.compte] = {
            isSource: true,
            isDestination: false,
            montant: sortie.montant,
            partnerAccount: matchingEntree.compte
          };
          transferInfo[matchingEntree.compte] = {
            isSource: false,
            isDestination: true,
            montant: matchingEntree.montant,
            partnerAccount: sortie.compte
          };
        }
      }
    });

    // Calculer les données par compte
    const accountsData = {};
    accounts.forEach(acc => {
      const isCredit = acc.type === 'credit';
      
      const entreesCompte = entreesJour.filter(t => t.compte === acc.nom);
      const sortiesCompte = sortiesJour.filter(t => t.compte === acc.nom);
      
      const totalEntrees = entreesCompte.reduce((sum, t) => sum + t.montant, 0);
      const totalSorties = sortiesCompte.reduce((sum, t) => sum + t.montant, 0);
      
      const soldePrecedent = runningBalances[acc.nom];
      
      // Mettre à jour le solde courant
      if (isCredit) {
        runningBalances[acc.nom] = runningBalances[acc.nom] - totalEntrees + totalSorties;
      } else {
        runningBalances[acc.nom] = runningBalances[acc.nom] + totalEntrees - totalSorties;
      }
      
      const hasActivity = totalEntrees > 0 || totalSorties > 0;
      const transfer = transferInfo[acc.nom] || null;
      
      accountsData[acc.nom] = {
        solde: runningBalances[acc.nom],
        soldePrecedent: soldePrecedent,
        entrees: entreesCompte,
        sorties: sortiesCompte,
        totalEntrees,
        totalSorties,
        isCredit,
        type: acc.type,
        hasActivity,
        transfer
      };
    });

    const isToday = currentDateStr === todayStr;
    const yearShort = String(currentDate.getFullYear()).slice(-2);
    const hasActivity = Object.values(accountsData).some(acc => acc.hasActivity);
    const hasTransfers = Object.keys(transferInfo).length > 0;

    data.push({
      date: currentDate,
      dateStr: currentDateStr,
      monthKey: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`,
      yearKey: `${currentDate.getFullYear()}`,
      label: `${currentDate.getDate()} ${monthsShort[currentDate.getMonth()]} ${currentDate.getFullYear()}`,
      shortLabel: `${currentDate.getDate()} ${monthsShort[currentDate.getMonth()]} ${yearShort}`,
      isToday,
      hasActivity,
      hasTransfers,
      accounts: accountsData,
      isModified: effectiveBudget.isModified && effectiveBudget.modificationDate === currentDateStr,
      hasModifiedBudget: effectiveBudget.isModified,
      modificationDate: effectiveBudget.modificationDate || null
    });
  }

  console.log(`[TrajectoryCalculator] Calcul terminé: ${data.length} jours générés`);
  return data;
};

/**
 * Agrège les données journalières en données mensuelles
 */
export const calculateMonthData = (allDayData, accounts, budgetModifications = []) => {
  const monthsMap = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const monthsShort = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  
  allDayData.forEach((day, dayIndex) => {
    const monthKey = day.monthKey;
    
    if (!monthsMap.has(monthKey)) {
      const monthDate = day.date;
      const monthNum = monthDate.getMonth();
      const year = monthDate.getFullYear();
      const isCurrentMonth = monthNum === today.getMonth() && year === today.getFullYear();
      
      // Initialiser les données du mois
      const monthAccountsData = {};
      accounts.forEach(acc => {
        monthAccountsData[acc.nom] = {
          entrees: [],
          sorties: [],
          totalEntrees: 0,
          totalSorties: 0,
          soldeDebut: day.accounts[acc.nom]?.soldePrecedent || 0,
          soldeFin: 0,
          isCredit: acc.type === 'credit',
          type: acc.type,
          hasActivity: false
        };
      });
      
      // Vérifier si une modification existe pour ce mois
      const hasModificationInMonth = budgetModifications.some(mod => {
        if (!mod.dateEffet) return false;
        const modDate = new Date(mod.dateEffet);
        return modDate.getMonth() === monthNum && modDate.getFullYear() === year;
      });

      monthsMap.set(monthKey, {
        month: monthNum,
        year: year,
        monthKey: monthKey,
        yearKey: `${year}`,
        label: `${monthsShort[monthNum]} ${year}`,
        shortLabel: `${monthsShort[monthNum]} ${String(year).slice(-2)}`,
        isCurrentMonth,
        hasActivity: false,
        hasModification: hasModificationInMonth,
        daysInMonth: new Date(year, monthNum + 1, 0).getDate(),
        accounts: monthAccountsData,
        lastDayIndex: dayIndex
      });
    }
    
    // Agréger les transactions du jour dans le mois
    const monthData = monthsMap.get(monthKey);
    
    accounts.forEach(acc => {
      const dayAcc = day.accounts[acc.nom];
      if (!dayAcc) return;
      
      const monthAcc = monthData.accounts[acc.nom];
      
      // Ajouter les entrées avec le jour
      dayAcc.entrees.forEach(t => {
        monthAcc.entrees.push({ ...t, jour: day.date.getDate() });
      });
      
      // Ajouter les sorties avec le jour
      dayAcc.sorties.forEach(t => {
        monthAcc.sorties.push({ ...t, jour: day.date.getDate() });
      });
      
      monthAcc.totalEntrees += dayAcc.totalEntrees;
      monthAcc.totalSorties += dayAcc.totalSorties;
      
      if (dayAcc.hasActivity) {
        monthAcc.hasActivity = true;
      }
      
      // Mettre à jour le solde de fin avec le solde du jour actuel
      monthAcc.soldeFin = dayAcc.solde;
    });
    
    // Mettre à jour hasActivity du mois
    if (day.hasActivity) {
      monthData.hasActivity = true;
    }
    monthData.lastDayIndex = dayIndex;
  });
  
  // Finaliser les variations
  const result = Array.from(monthsMap.values());
  result.forEach(month => {
    accounts.forEach(acc => {
      const accData = month.accounts[acc.nom];
      if (accData) {
        accData.variation = accData.soldeFin - accData.soldeDebut;
      }
    });
  });
  
  return result;
};

/**
 * Agrège les données mensuelles en données annuelles
 */
export const calculateYearData = (monthData, accounts, budgetModifications = []) => {
  const yearsMap = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  monthData.forEach((month) => {
    const yearKey = month.yearKey || `${month.year}`;
    
    if (!yearsMap.has(yearKey)) {
      const isCurrentYear = month.year === today.getFullYear();
      
      // Initialiser les données de l'année
      const yearAccountsData = {};
      accounts.forEach(acc => {
        yearAccountsData[acc.nom] = {
          entrees: [],
          sorties: [],
          totalEntrees: 0,
          totalSorties: 0,
          soldeDebut: month.accounts[acc.nom]?.soldeDebut || 0,
          soldeFin: 0,
          isCredit: acc.type === 'credit',
          type: acc.type,
          hasActivity: false,
          monthlyBreakdown: []
        };
      });
      
      // Vérifier si une modification existe pour cette année
      const hasModificationInYear = budgetModifications.some(mod => {
        if (!mod.dateEffet) return false;
        const modDate = new Date(mod.dateEffet);
        return modDate.getFullYear() === month.year;
      });

      yearsMap.set(yearKey, {
        year: month.year,
        yearKey: yearKey,
        label: `${month.year}`,
        isCurrentYear,
        hasActivity: false,
        hasModification: hasModificationInYear,
        accounts: yearAccountsData
      });
    }
    
    // Agréger les données du mois dans l'année
    const yearData = yearsMap.get(yearKey);
    
    accounts.forEach(acc => {
      const monthAcc = month.accounts[acc.nom];
      if (!monthAcc) return;
      
      const yearAcc = yearData.accounts[acc.nom];
      
      // Ajouter toutes les entrées du mois
      monthAcc.entrees.forEach(t => {
        yearAcc.entrees.push({ ...t, month: month.month });
      });
      
      // Ajouter toutes les sorties du mois
      monthAcc.sorties.forEach(t => {
        yearAcc.sorties.push({ ...t, month: month.month });
      });
      
      yearAcc.totalEntrees += monthAcc.totalEntrees;
      yearAcc.totalSorties += monthAcc.totalSorties;
      
      if (monthAcc.hasActivity) {
        yearAcc.hasActivity = true;
      }
      
      // Mettre à jour le solde de fin
      yearAcc.soldeFin = monthAcc.soldeFin;
      
      // Ajouter au breakdown mensuel
      yearAcc.monthlyBreakdown.push({
        month: month.month,
        monthKey: month.monthKey,
        totalEntrees: monthAcc.totalEntrees,
        totalSorties: monthAcc.totalSorties,
        soldeFin: monthAcc.soldeFin
      });
    });
    
    if (month.hasActivity) {
      yearData.hasActivity = true;
    }
  });
  
  // Finaliser les variations
  const result = Array.from(yearsMap.values());
  result.forEach(year => {
    accounts.forEach(acc => {
      const accData = year.accounts[acc.nom];
      if (accData) {
        accData.variation = accData.soldeFin - accData.soldeDebut;
      }
    });
  });
  
  return result;
};

export default {
  calculateAllDayData,
  calculateMonthData,
  calculateYearData
};
