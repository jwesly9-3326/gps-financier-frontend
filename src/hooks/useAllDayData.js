// 🗓️ HOOK useAllDayData - Calcul des données journalières pour GPS Financier
// Partagé entre GPSFinancier.jsx et Comptes.jsx pour garantir la cohérence des données
// COPIE EXACTE de la logique de GPSFinancier.jsx

import { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Hook pour calculer allDayData - source unique de vérité pour les soldes journaliers
 * EXACTEMENT la même logique que GPSFinancier.jsx
 */
const useAllDayData = ({
  accounts = [],
  initialBalances = [],
  budgetEntrees = [],
  budgetSorties = [],
  budgetModifications = [],
  daysToLoad = 365
}) => {
  const { i18n } = useTranslation();
  
  // Mois courts pour les labels (même que GPSFinancier)
  const monthsShort = useMemo(() => {
    if (i18n.language === 'fr') {
      return ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    }
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }, [i18n.language]);

  // Fonction pour obtenir le budget effectif à une date donnée
  // (COPIE EXACTE de GPSFinancier.jsx ligne 331-362)
  const getEffectiveBudget = useCallback((dateStr) => {
    if (!budgetModifications || budgetModifications.length === 0) {
      return {
        entrees: budgetEntrees,
        sorties: budgetSorties,
        isModified: false
      };
    }
    
    // Trier par date décroissante pour trouver la modification la plus récente applicable
    // Support pour dateEffet (ancien format) et dateDebut (nouveau format OPE)
    const sortedMods = [...budgetModifications]
      .filter(mod => mod && (mod.dateEffet || mod.dateDebut)) // Filtrer les entrées invalides
      .sort((a, b) => {
        const dateA = a.dateEffet || a.dateDebut || '';
        const dateB = b.dateEffet || b.dateDebut || '';
        return dateB.localeCompare(dateA);
      });
    
    // Trouver la première modification dont dateEffet/dateDebut <= dateStr
    const applicableMod = sortedMods.find(mod => {
      const modDate = mod.dateEffet || mod.dateDebut;
      return modDate && modDate <= dateStr;
    });
    
    if (applicableMod) {
      return {
        entrees: applicableMod.entrees || budgetEntrees,
        sorties: applicableMod.sorties || budgetSorties,
        isModified: true,
        modificationDate: applicableMod.dateEffet
      };
    }
    
    return {
      entrees: budgetEntrees,
      sorties: budgetSorties,
      isModified: false
    };
  }, [budgetEntrees, budgetSorties, budgetModifications]);

  const allDayData = useMemo(() => {
    if (!accounts.length) return [];
    
    const data = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Initialiser les soldes depuis les comptes
    const runningBalances = {};
    accounts.forEach(acc => {
      const solde = initialBalances.find(s => s.accountName === acc.nom);
      runningBalances[acc.nom] = parseFloat(solde?.solde) || 0;
    });
    
    // Helper pour parser une date locale (COPIE de GPSFinancier)
    const parseLocalDate = (dateStr) => {
      if (!dateStr) return null;
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };
    
    // Helper pour formater une date en string (COPIE de GPSFinancier)
    const formatDateStr = (date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };
    
    // Fonction pour obtenir les transactions d'une date
    // COPIE EXACTE de GPSFinancier.jsx ligne 504-571
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
            // EXACTEMENT comme GPSFinancier: item.jourSemaine && (pas !== undefined)
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

        // PAS de vérification item.actif (comme GPSFinancier)
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
    
    // Calculer les jours (COPIE de GPSFinancier ligne 579-718)
    const start = new Date(today);
    
    for (let i = 0; i < daysToLoad; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const currentDateStr = formatDateStr(currentDate);
      
      // Obtenir le budget effectif pour cette date
      const effectiveBudget = getEffectiveBudget(currentDateStr);
      const currentBudgetEntrees = effectiveBudget.entrees;
      const currentBudgetSorties = effectiveBudget.sorties;
      
      // Obtenir les transactions du jour
      const entreesJour = getTransactionsForDate(currentDate, currentBudgetEntrees, true);
      const sortiesJour = getTransactionsForDate(currentDate, currentBudgetSorties, false);
      
      // Détecter les transferts entre comptes (COPIE de GPSFinancier)
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
      
      // Calculer les données par compte (COPIE de GPSFinancier)
      const accountsData = {};
      accounts.forEach(acc => {
        const isCredit = acc.type === 'credit';
        
        const entreesCompte = entreesJour.filter(t => t.compte === acc.nom);
        const sortiesCompte = sortiesJour.filter(t => t.compte === acc.nom);
        
        const totalEntrees = entreesCompte.reduce((sum, t) => sum + t.montant, 0);
        const totalSorties = sortiesCompte.reduce((sum, t) => sum + t.montant, 0);
        
        const soldePrecedent = runningBalances[acc.nom];
        
        // Mettre à jour le solde courant (EXACTEMENT comme GPSFinancier)
        if (isCredit) {
          runningBalances[acc.nom] = runningBalances[acc.nom] - totalEntrees + totalSorties;
        } else {
          runningBalances[acc.nom] = runningBalances[acc.nom] + totalEntrees - totalSorties;
        }
        
        const hasActivity = totalEntrees > 0 || totalSorties > 0;
        const transfer = transferInfo[acc.nom] || null;
        
        accountsData[acc.nom] = {
          solde: runningBalances[acc.nom],
          soldePrecedent,
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
        isModified: effectiveBudget.isModified,
        modificationDate: effectiveBudget.modificationDate || null
      });
    }
    
    return data;
  }, [accounts, initialBalances, budgetEntrees, budgetSorties, budgetModifications, daysToLoad, monthsShort, getEffectiveBudget]);
  
  return allDayData;
};

export default useAllDayData;
