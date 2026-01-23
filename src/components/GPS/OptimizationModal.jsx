// 🔄 Modal Optimisation - Présente les optimisations une par une
// ✅ Logique corrigée: modifications stockées, pas de changement au budget source
// ✅ Synchronisation des budgets jumeaux (transferts entre comptes)
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import optimizationService from '../../services/optimization.service';

const OptimizationModal = ({ 
  isOpen, 
  onClose, 
  optimizedBudgets = [], 
  optimizedCount = 0,
  formatMontant,
  userData,
  saveUserData,
  baseBudgetEntrees = [],
  baseBudgetSorties = [],
  profileEndDate = null,
  allDayData = [] // 🆕 Ajouter allDayData comme prop
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [decisions, setDecisions] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); // Message de succès
  const [showPl4toRequest, setShowPl4toRequest] = useState(false); // Modal demande PL4TO

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setIsProcessing(false);
      setDecisions({});
      setShowPreview(false);
      setShowSuccess(false);
      setShowPl4toRequest(false);
    }
  }, [isOpen]);

  // Trier les budgets optimisés par priorité des objectifs
  const sortedOptimizedBudgets = useMemo(() => {
    const financialGoals = userData?.financialGoals || [];
    const priorityValues = { 'haute': 1, 'high': 1, 'moyenne': 2, 'medium': 2, 'basse': 3, 'low': 3 };
    const priorityMap = {};
    
    financialGoals.forEach((goal) => {
      if (goal.compteAssocie) {
        const priorityText = (goal.priorite || '').toLowerCase();
        priorityMap[goal.compteAssocie] = priorityValues[priorityText] || 999;
      }
    });
    
    return [...optimizedBudgets].sort((a, b) => {
      const priorityA = priorityMap[a.compte] || 999;
      const priorityB = priorityMap[b.compte] || 999;
      return priorityA - priorityB;
    });
  }, [optimizedBudgets, userData?.financialGoals]);

  const getBudgetKey = useCallback((budget) => {
    return `${budget.type}-${budget.description}-${budget.compte || 'nocompte'}`;
  }, []);

  // Extraire le nom de base d'une description (avant le "-")
  const getBaseName = useCallback((description) => {
    if (!description) return '';
    return description.split('-')[0].trim().toLowerCase();
  }, []);

  // 🔄 Trouver le budget "jumeau" (l'autre côté du transfert)
  const findLinkedBudget = useCallback((budget, entrees, sorties) => {
    const baseName = getBaseName(budget.description);
    const targetArray = budget.type === 'entree' ? sorties : entrees;
    const targetType = budget.type === 'entree' ? 'sortie' : 'entree';
    
    const linked = targetArray.find(b => {
      const bBaseName = getBaseName(b.description);
      const sameMontant = Math.abs(parseFloat(b.montant) - parseFloat(budget.montant)) < 0.01;
      const sameFrequence = b.frequence === budget.frequence;
      const sameJour = b.jourRecurrence === budget.jourRecurrence;
      const differentComptes = b.compte && budget.compte && b.compte !== budget.compte;
      const sameBaseName = baseName && bBaseName && baseName === bBaseName;
      
      return sameMontant && sameFrequence && sameJour && differentComptes && sameBaseName;
    });
    
    return linked ? { ...linked, type: targetType } : null;
  }, [getBaseName]);

  // 🔄 Version pour la propagation (ne vérifie PAS le montant car il peut avoir changé)
  const findLinkedBudgetByDescription = useCallback((budget, entrees, sorties) => {
    const baseName = getBaseName(budget.description);
    const targetArray = budget.type === 'entree' ? sorties : entrees;
    const targetType = budget.type === 'entree' ? 'sortie' : 'entree';
    
    const linked = targetArray.find(b => {
      const bBaseName = getBaseName(b.description);
      const sameFrequence = b.frequence === budget.frequence;
      const sameJour = b.jourRecurrence === budget.jourRecurrence;
      const differentComptes = b.compte && budget.compte && b.compte !== budget.compte;
      const sameBaseName = baseName && bBaseName && baseName === bBaseName;
      
      // PAS de vérification du montant ici!
      return sameFrequence && sameJour && differentComptes && sameBaseName;
    });
    
    return linked ? { ...linked, type: targetType } : null;
  }, [getBaseName]);

  // Calculer la Nième occurrence d'un budget
  const findNthOccurrence = useCallback((budget, fromDate, n = 1) => {
    const frequence = budget.frequence;
    const jourRecurrence = parseInt(budget.jourRecurrence) || 1;
    const jourSemaine = parseInt(budget.jourSemaine);
    const moisRecurrence = parseInt(budget.moisRecurrence) || 1;
    const dateReference = budget.dateReference;
    
    let checkDate = new Date(fromDate);
    checkDate.setHours(0, 0, 0, 0);
    checkDate.setDate(checkDate.getDate() + 1);
    
    const maxDate = new Date(fromDate);
    maxDate.setFullYear(maxDate.getFullYear() + 10);
    
    let occurrenceCount = 0;
    
    while (checkDate <= maxDate) {
      let isOccurrence = false;
      
      switch (frequence) {
        case 'mensuel':
          if (checkDate.getDate() === jourRecurrence) isOccurrence = true;
          break;
        case 'hebdomadaire':
          if (checkDate.getDay() === jourSemaine) isOccurrence = true;
          break;
        case 'bimensuel':
          if (dateReference) {
            const refDate = new Date(dateReference);
            const diffDays = Math.floor((checkDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays % 14 === 0) isOccurrence = true;
          }
          break;
        case 'quinzaine':
          if (checkDate.getDate() === 1 || checkDate.getDate() === 15) isOccurrence = true;
          break;
        case 'annuel':
          if (checkDate.getMonth() + 1 === moisRecurrence && checkDate.getDate() === jourRecurrence) isOccurrence = true;
          break;
      }
      
      if (isOccurrence) {
        occurrenceCount++;
        if (occurrenceCount === n) return new Date(checkDate);
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }
    return null;
  }, []);

  // Trouver la Nième occurrence AVANT une date (pour descending)
  const findNthOccurrenceBefore = useCallback((budget, beforeDate, n = 1) => {
    const frequence = budget.frequence;
    const jourRecurrence = parseInt(budget.jourRecurrence) || 1;
    const jourSemaine = parseInt(budget.jourSemaine);
    const moisRecurrence = parseInt(budget.moisRecurrence) || 1;
    const dateReference = budget.dateReference;
    
    let checkDate = new Date(beforeDate);
    checkDate.setHours(0, 0, 0, 0);
    checkDate.setDate(checkDate.getDate() - 1);
    
    const minDate = new Date();
    minDate.setHours(0, 0, 0, 0);
    
    let occurrenceCount = 0;
    
    while (checkDate >= minDate) {
      let isOccurrence = false;
      
      switch (frequence) {
        case 'mensuel':
          if (checkDate.getDate() === jourRecurrence) isOccurrence = true;
          break;
        case 'hebdomadaire':
          if (checkDate.getDay() === jourSemaine) isOccurrence = true;
          break;
        case 'bimensuel':
          if (dateReference) {
            const refDate = new Date(dateReference);
            const diffDays = Math.floor((checkDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays % 14 === 0) isOccurrence = true;
          }
          break;
        case 'quinzaine':
          if (checkDate.getDate() === 1 || checkDate.getDate() === 15) isOccurrence = true;
          break;
        case 'annuel':
          if (checkDate.getMonth() + 1 === moisRecurrence && checkDate.getDate() === jourRecurrence) isOccurrence = true;
          break;
      }
      
      if (isOccurrence) {
        occurrenceCount++;
        if (occurrenceCount === n) return new Date(checkDate);
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return null;
  }, []);

  const getLastDateForBudget = useCallback((budget) => {
    const financialGoals = userData?.financialGoals || [];
    
    if (budget.compte) {
      const linkedGoal = financialGoals.find(g => g.compteAssocie === budget.compte);
      if (linkedGoal?.dateEcheance) return new Date(linkedGoal.dateEcheance);
    }
    
    if (profileEndDate) return new Date(profileEndDate);
    
    const fallback = new Date();
    fallback.setFullYear(fallback.getFullYear() + 54);
    return fallback;
  }, [userData?.financialGoals, profileEndDate]);

  const calculateOptimizationDate = useCallback((budget, skipCount = 0) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const optimization = budget.optimization;
    const period = optimization?.period || 'ascending';
    
    if (period === 'ascending') {
      const occurrenceNumber = 2 + skipCount;
      return findNthOccurrence(budget, today, occurrenceNumber);
    } else {
      const lastDate = getLastDateForBudget(budget);
      return findNthOccurrenceBefore(budget, lastDate, 1 + skipCount);
    }
  }, [findNthOccurrence, findNthOccurrenceBefore, getLastDateForBudget]);

  const calculateNewAmount = useCallback((budget) => {
    const currentAmount = parseFloat(budget.montant) || 0;
    const optimization = budget.optimization;
    if (!optimization?.enabled) return currentAmount;
    
    const value = parseFloat(optimization.value) || 0;
    return optimization.type === 'percentage' 
      ? currentAmount * (1 + value / 100) 
      : currentAmount + value;
  }, []);

  const currentBudget = sortedOptimizedBudgets[currentIndex];
  const currentBudgetKey = currentBudget ? getBudgetKey(currentBudget) : null;
  const currentSkipCount = currentBudgetKey && decisions[currentBudgetKey]?.skipCount 
    ? decisions[currentBudgetKey].skipCount : 0;

  const currentOptimizationInfo = useMemo(() => {
    if (!currentBudget) return null;
    
    const proposedDate = calculateOptimizationDate(currentBudget, currentSkipCount);
    const newAmount = calculateNewAmount(currentBudget);
    const currentAmount = parseFloat(currentBudget.montant) || 0;
    const optimization = currentBudget.optimization;
    const linkedBudget = findLinkedBudget(currentBudget, baseBudgetEntrees, baseBudgetSorties);
    
    return {
      budget: currentBudget,
      budgetKey: currentBudgetKey,
      proposedDate,
      currentAmount,
      newAmount,
      difference: newAmount - currentAmount,
      differenceText: optimization?.type === 'percentage' ? `${optimization.value}%` : `${optimization.value}$`,
      isIncrease: newAmount > currentAmount,
      period: optimization?.period || 'ascending',
      skipCount: currentSkipCount,
      linkedBudget
    };
  }, [currentBudget, currentBudgetKey, currentSkipCount, calculateOptimizationDate, calculateNewAmount, findLinkedBudget, baseBudgetEntrees, baseBudgetSorties]);

  const formatDate = (date) => {
    if (!date) return '—';
    return date.toLocaleDateString(i18n.language === 'fr' ? 'fr-CA' : 'en-CA', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const getFrequencyLabel = (frequence) => {
    const labels = {
      'mensuel': t('budget.frequencies.monthly', 'Mensuel'),
      'hebdomadaire': t('budget.frequencies.weekly', 'Hebdomadaire'),
      'bimensuel': t('budget.frequencies.biweekly', 'Aux 2 semaines'),
      'quinzaine': t('budget.frequencies.semimonthly', 'Bimensuel (1er et 15)'),
      'annuel': t('budget.frequencies.annual', 'Annuel')
    };
    return labels[frequence] || frequence;
  };

  const goToNextOrPreview = () => {
    if (currentIndex < sortedOptimizedBudgets.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setShowPreview(true);
    }
  };

  const handleAccept = () => {
    if (!currentOptimizationInfo) return;
    const { budgetKey, proposedDate, newAmount, budget } = currentOptimizationInfo;
    setDecisions(prev => ({
      ...prev,
      [budgetKey]: { action: 'accept', proposedDate, newAmount, budget, skipCount: currentSkipCount }
    }));
    goToNextOrPreview();
  };

  const handleBalance = () => {
    if (!currentOptimizationInfo) return;
    const { budgetKey } = currentOptimizationInfo;
    setDecisions(prev => ({
      ...prev,
      [budgetKey]: { ...prev[budgetKey], skipCount: (prev[budgetKey]?.skipCount || 0) + 1 }
    }));
  };

  const handleCancel = () => {
    if (!currentOptimizationInfo) return;
    const { budgetKey, budget } = currentOptimizationInfo;
    setDecisions(prev => ({
      ...prev,
      [budgetKey]: { action: 'cancel', budget }
    }));
    goToNextOrPreview();
  };

  const handleSkip = () => goToNextOrPreview();

  const acceptedOptimizations = useMemo(() => {
    return Object.entries(decisions)
      .filter(([_, decision]) => decision.action === 'accept')
      .map(([key, decision]) => decision);
  }, [decisions]);

  const totalImpact = useMemo(() => {
    let total = 0;
    acceptedOptimizations.forEach(opt => {
      const currentAmount = parseFloat(opt.budget.montant) || 0;
      const diff = opt.newAmount - currentAmount;
      total += opt.budget.type === 'entree' ? diff : -diff;
    });
    return total;
  }, [acceptedOptimizations]);

  // 🔄 Appliquer avec synchronisation des jumeaux
  // ✅ Corrigé: Part des modifications existantes + propage aux modifications futures
  const handleConfirmAll = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      let existingMods = JSON.parse(JSON.stringify(userData?.budgetPlanning?.modifications || []));
      const newModifications = [];
      
      // Grouper par date
      const optimizationsByDate = {};
      for (const opt of acceptedOptimizations) {
        const { budget, proposedDate, newAmount } = opt;
        if (!proposedDate) continue;
        
        const dateEffet = `${proposedDate.getFullYear()}-${String(proposedDate.getMonth() + 1).padStart(2, '0')}-${String(proposedDate.getDate()).padStart(2, '0')}`;
        if (!optimizationsByDate[dateEffet]) optimizationsByDate[dateEffet] = [];
        optimizationsByDate[dateEffet].push({ budget, newAmount });
      }
      
      // Trier les dates pour traiter dans l'ordre chronologique
      const sortedDates = Object.keys(optimizationsByDate).sort();
      
      // Créer les modifications snapshot
      for (const dateEffet of sortedDates) {
        const opts = optimizationsByDate[dateEffet];
        
        // 🔄 IMPORTANT: Partir de la dernière modification applicable
        const allMods = [...existingMods, ...newModifications];
        const sortedMods = [...allMods].sort((a, b) => b.dateEffet.localeCompare(a.dateEffet));
        const applicableMod = sortedMods.find(mod => mod.dateEffet <= dateEffet);
        
        let modifiedEntrees = applicableMod?.entrees 
          ? JSON.parse(JSON.stringify(applicableMod.entrees))
          : JSON.parse(JSON.stringify(baseBudgetEntrees));
        let modifiedSorties = applicableMod?.sorties
          ? JSON.parse(JSON.stringify(applicableMod.sorties))
          : JSON.parse(JSON.stringify(baseBudgetSorties));
        
        // Collecter les changements pour propager aux modifications futures
        const changes = [];
        
        for (const { budget, newAmount } of opts) {
          const sourceArray = budget.type === 'entree' ? modifiedEntrees : modifiedSorties;
          const budgetIndex = sourceArray.findIndex(b => 
            b.description === budget.description && 
            b.compte === budget.compte
          );
          
          if (budgetIndex !== -1) {
            sourceArray[budgetIndex] = { ...sourceArray[budgetIndex], montant: parseFloat(newAmount.toFixed(2)) };
            changes.push({ type: budget.type, description: budget.description, compte: budget.compte, newAmount: parseFloat(newAmount.toFixed(2)) });
            
            // 🔄 SYNCHRONISER LE BUDGET JUMEAU (utilise findLinkedBudgetByDescription pour ignorer le montant)
            const linkedBudget = findLinkedBudgetByDescription(budget, modifiedEntrees, modifiedSorties);
            if (linkedBudget) {
              const linkedArray = linkedBudget.type === 'entree' ? modifiedEntrees : modifiedSorties;
              const linkedIndex = linkedArray.findIndex(b => 
                b.description === linkedBudget.description && 
                b.compte === linkedBudget.compte
              );
              
              if (linkedIndex !== -1) {
                linkedArray[linkedIndex] = { ...linkedArray[linkedIndex], montant: parseFloat(newAmount.toFixed(2)) };
                changes.push({ type: linkedBudget.type, description: linkedBudget.description, compte: linkedBudget.compte, newAmount: parseFloat(newAmount.toFixed(2)) });
              }
            }
          }
        }
        
        // 🆕 PROPAGER LES CHANGEMENTS AUX MODIFICATIONS FUTURES (principal + jumeau déjà dans changes)
        // Cela évite que les optimisations précédentes soient "perdues"
        existingMods = existingMods.map(mod => {
          if (mod.dateEffet > dateEffet) {
            let updatedEntrees = JSON.parse(JSON.stringify(mod.entrees || baseBudgetEntrees));
            let updatedSorties = JSON.parse(JSON.stringify(mod.sorties || baseBudgetSorties));
            
            // Appliquer tous les changements (principal + jumeau sont tous dans changes)
            for (const change of changes) {
              const targetArray = change.type === 'entree' ? updatedEntrees : updatedSorties;
              const idx = targetArray.findIndex(b => 
                b.description === change.description && 
                b.compte === change.compte
              );
              if (idx !== -1) {
                targetArray[idx] = { ...targetArray[idx], montant: change.newAmount };
              }
            }
            
            return { ...mod, entrees: updatedEntrees, sorties: updatedSorties };
          }
          return mod;
        });
        
        const modification = {
          dateEffet,
          entrees: modifiedEntrees,
          sorties: modifiedSorties,
          source: 'optimization',
          optimizations: opts.map(o => {
            const linked = findLinkedBudget(o.budget, baseBudgetEntrees, baseBudgetSorties);
            return {
              description: o.budget.description,
              compte: o.budget.compte,
              originalAmount: parseFloat(o.budget.montant),
              newAmount: parseFloat(o.newAmount.toFixed(2)),
              linkedBudget: linked ? { description: linked.description, compte: linked.compte, type: linked.type } : null
            };
          }),
          createdAt: new Date().toISOString()
        };
        
        newModifications.push(modification);
      }
      
      // Désactiver les optimisations annulées
      const newEntrees = [...(userData?.budgetPlanning?.entrees || [])];
      const newSorties = [...(userData?.budgetPlanning?.sorties || [])];
      
      Object.entries(decisions).forEach(([_, decision]) => {
        if (decision.action === 'cancel' && decision.budget) {
          const budget = decision.budget;
          const sourceArray = budget.type === 'entree' ? newEntrees : newSorties;
          const budgetIndex = sourceArray.findIndex(b => 
            b.description === budget.description && 
            b.compte === budget.compte
          );
          
          if (budgetIndex !== -1) {
            sourceArray[budgetIndex] = {
              ...sourceArray[budgetIndex],
              optimization: { ...sourceArray[budgetIndex].optimization, enabled: false }
            };
          }
        }
      });
      
      const confirmationTimestamp = new Date().toISOString();
      
      await saveUserData({
        ...userData,
        budgetPlanning: {
          ...userData.budgetPlanning,
          entrees: newEntrees,
          sorties: newSorties,
          modifications: [...existingMods, ...newModifications], // existingMods contient les modifs mises à jour
          lastModifiedAt: confirmationTimestamp, // Même timestamp pour éviter le badge
          lastOptimizationReviewedAt: confirmationTimestamp // Marquer que l'utilisateur a complété ses optimisations
        }
      });
      
      // Afficher le message de succès
      setShowPreview(false);
      setShowSuccess(true);
      
    } catch (error) {
      console.error('Erreur:', error);
    }
    setIsProcessing(false);
  };

  const handleCancelAll = () => {
    onClose();
    setShowPreview(false);
    setShowSuccess(false);
    setDecisions({});
    setCurrentIndex(0);
  };

  const handleSuccessClose = () => {
    onClose();
    setShowSuccess(false);
    setDecisions({});
    setCurrentIndex(0);
  };

  // 🚀 Demander à PL4TO d'optimiser le reste de la trajectoire
  const handleRequestPl4toOptimization = async () => {
    try {
      // 🆕 Appeler l'API pour créer la demande avec allDayData
      const result = await optimizationService.createRequest(allDayData);
      console.log('[OptimizationModal] Demande créée:', result);
      
      // Mettre à jour userData avec le statut de la demande
      await saveUserData({
        ...userData,
        optimizationRequest: {
          requested: true,
          requestedAt: new Date().toISOString(),
          requestId: result.requestId,
          status: result.status || 'pending'
        }
      });
      
      setShowPl4toRequest(false);
      onClose();
      setDecisions({});
      setCurrentIndex(0);
      
      // Afficher un message de succès
      alert('Demande d\'optimisation envoyée avec succès!');
    } catch (error) {
      console.error('Erreur lors de la demande:', error);
      alert(error.error || 'Erreur lors de la demande d\'optimisation');
    }
  };

  const handleBackToWizard = () => {
    setShowPreview(false);
    setCurrentIndex(0);
  };

  if (!isOpen) return null;

  // ✅ MESSAGE DE SUCCÈS
  if (showSuccess) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(5px)' }}>
        <div style={{ background: 'white', borderRadius: '20px', width: '90%', maxWidth: '400px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center' }}>
          <div style={{ background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', padding: '30px', color: 'white' }}>
            <div style={{ fontSize: '4em', marginBottom: '10px' }}>✅</div>
            <h3 style={{ margin: 0, fontSize: '1.4em' }}>{t('gps.optimization.success', 'Optimisations appliquées')}</h3>
          </div>
          <div style={{ padding: '30px' }}>
            <p style={{ color: '#2c3e50', fontSize: '1.1em', margin: '0 0 10px' }}>
              {t('gps.optimization.trajectoryUpdated', 'Votre trajectoire financière a été mise à jour.')}
            </p>
            <p style={{ color: '#7f8c8d', fontSize: '0.9em', margin: '0 0 25px' }}>
              {acceptedOptimizations.length} {t('gps.optimization.optimizationsApplied', 'optimisation(s) ont été appliquées à votre parcours.')}
            </p>
            
            {/* Deux boutons côte à côte */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSuccessClose}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  borderRadius: '10px',
                  border: '2px solid #27ae60',
                  background: 'white',
                  color: '#27ae60',
                  fontWeight: '600',
                  fontSize: '0.95em',
                  cursor: 'pointer'
                }}
              >
                {t('gps.optimization.finish', 'Terminer')}
              </button>
              <button
                onClick={() => {
                  setShowSuccess(false);
                  setShowPl4toRequest(true);
                }}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '0.95em',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                }}
              >
                {t('gps.optimization.requestPl4to', 'Demander à PL4TO')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ♾️ MODAL DEMANDE PL4TO
  if (showPl4toRequest) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(5px)' }}>
        <div style={{ background: 'white', borderRadius: '20px', width: '90%', maxWidth: '420px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '30px', color: 'white' }}>
            <div style={{ fontSize: '3em', marginBottom: '10px' }}>♾️</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ 
                background: 'rgba(255,255,255,0.25)',
                color: 'white',
                padding: '3px 10px',
                borderRadius: '10px',
                fontSize: '0.7em',
                fontWeight: 'bold'
              }}>
                PREMIUM
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: '1.3em' }}>{t('gps.optimization.continuousOptimization', 'Optimisation en continue')}</h3>
          </div>
          
          {/* Contenu */}
          <div style={{ padding: '30px' }}>
            <p style={{ color: '#2c3e50', fontSize: '1em', margin: '0 0 20px', lineHeight: '1.5' }}>
              {t('gps.optimization.autopilotDescription', 'Passez en mode pilote automatique et laissez le système optimiser le reste de votre trajectoire financière.')}
            </p>
            <p style={{ color: '#7f8c8d', fontSize: '0.85em', margin: '0 0 25px' }}>
              {t('gps.optimization.confirmationNote', 'Vous recevrez une confirmation une fois terminée.')}
            </p>
            
            {/* Boutons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowPl4toRequest(false);
                  onClose();
                }}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  borderRadius: '10px',
                  border: '2px solid #bdc3c7',
                  background: 'white',
                  color: '#7f8c8d',
                  fontWeight: '600',
                  fontSize: '0.95em',
                  cursor: 'pointer'
                }}
              >
                {t('common.cancel', 'Annuler')}
              </button>
              <button
                onClick={handleRequestPl4toOptimization}
                style={{
                  flex: 1.2,
                  padding: '14px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '0.95em',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                }}
              >
                ♾️ {t('gps.optimization.activate', 'Activer')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Aucun budget optimisé
  if (sortedOptimizedBudgets.length === 0) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(5px)' }}>
        <div style={{ background: 'white', borderRadius: '20px', width: '90%', maxWidth: '450px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)', padding: '20px', color: 'white', textAlign: 'center' }}>
            <h3 style={{ margin: 0 }}>🔄 {t('budget.optimization.title', 'Optimisation')}</h3>
          </div>
          <div style={{ padding: '30px', textAlign: 'center' }}>
            <p style={{ color: '#7f8c8d', fontSize: '1.1em' }}>{t('gps.optimization.noBudgets', 'Aucune optimisation configurée')}</p>
            <button onClick={() => { onClose(); navigate('/budget'); }} style={{ marginTop: '20px', padding: '12px 24px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)', color: 'white', fontWeight: '600', cursor: 'pointer' }}>
              ⚙️ {t('gps.optimization.configure', 'Configurer')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // PREVIEW
  if (showPreview) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(5px)' }}>
        <div style={{ background: 'white', borderRadius: '20px', width: '90%', maxWidth: '550px', maxHeight: '85vh', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', padding: '20px', color: 'white', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2em' }}>✅ {t('gps.optimization.preview', 'Aperçu des optimisations')}</h3>
                <p style={{ margin: '5px 0 0', opacity: 0.9, fontSize: '0.85em' }}>{acceptedOptimizations.length} {t('gps.optimization.optimizationsAccepted', 'optimisation(s) acceptée(s)')}</p>
              </div>
              <button onClick={handleCancelAll} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: 'white', fontSize: '1.2em', cursor: 'pointer' }}>✕</button>
            </div>
          </div>
          
          <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
            {acceptedOptimizations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#7f8c8d' }}>
                <span style={{ fontSize: '3em' }}>🤷</span>
                <p>{t('gps.optimization.noOptimizationsAccepted', 'Aucune optimisation acceptée')}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {acceptedOptimizations.map((opt, index) => (
                  <div key={index} style={{ background: '#f8f9fa', borderRadius: '12px', padding: '15px', border: `2px solid ${opt.budget.type === 'entree' ? '#27ae60' : '#e74c3c'}20` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '1.2em' }}>{opt.budget.type === 'entree' ? '🟢' : '🔴'}</span>
                      <strong style={{ color: '#2c3e50' }}>{opt.budget.description}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9em' }}>
                      <div><span style={{ color: '#7f8c8d' }}>📅 </span><span style={{ color: '#2c3e50' }}>{formatDate(opt.proposedDate)}</span></div>
                      <div style={{ background: opt.budget.type === 'entree' ? '#27ae60' : '#e74c3c', color: 'white', padding: '4px 10px', borderRadius: '15px', fontWeight: '600', fontSize: '0.85em' }}>
                        {formatMontant(opt.budget.montant)} → {formatMontant(opt.newAmount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {acceptedOptimizations.length > 0 && (
              <div style={{ marginTop: '20px', background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)', borderRadius: '12px', padding: '20px', border: '2px solid #667eea40', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.9em', color: '#667eea' }}>{t('gps.optimization.totalImpact', 'Impact mensuel estimé')}</p>
                <p style={{ margin: '10px 0 0', fontSize: '1.8em', fontWeight: 'bold', color: totalImpact >= 0 ? '#27ae60' : '#e74c3c' }}>
                  {totalImpact >= 0 ? '+' : ''}{formatMontant(totalImpact)}
                </p>
                <p style={{ margin: '5px 0 0', fontSize: '0.8em', color: '#7f8c8d' }}>{t('gps.optimization.impactNote', 'sur votre trajectoire financière')}</p>
              </div>
            )}
          </div>
          
          <div style={{ padding: '15px 25px 25px', borderTop: '1px solid #e0e0e0', background: '#f8f9fa', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleBackToWizard} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: '2px solid #bdc3c7', background: 'white', color: '#7f8c8d', fontWeight: '600', cursor: 'pointer' }}>
                ← {t('gps.optimization.modify', 'Modifier')}
              </button>
              <button onClick={handleCancelAll} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: '2px solid #e74c3c', background: 'white', color: '#e74c3c', fontWeight: '600', cursor: 'pointer' }}>
                {t('common.cancel', 'Annuler')}
              </button>
              <button onClick={handleConfirmAll} disabled={isProcessing || acceptedOptimizations.length === 0} style={{ flex: 1.5, padding: '14px', borderRadius: '10px', border: 'none', background: isProcessing || acceptedOptimizations.length === 0 ? '#95a5a6' : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', color: 'white', fontWeight: '600', cursor: isProcessing || acceptedOptimizations.length === 0 ? 'not-allowed' : 'pointer', boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)' }}>
                {isProcessing ? '⏳' : '✅'} {t('gps.optimization.confirmAll', 'Confirmer')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // WIZARD
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(5px)' }}>
      <div style={{ background: 'white', borderRadius: '20px', width: '90%', maxWidth: '500px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)', padding: '20px', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2em' }}>🔄 {t('budget.optimization.title', 'Optimisation')}</h3>
              <p style={{ margin: '5px 0 0', opacity: 0.9, fontSize: '0.85em' }}>{currentIndex + 1} / {sortedOptimizedBudgets.length}</p>
            </div>
            <button onClick={handleCancelAll} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: 'white', fontSize: '1.2em', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ marginTop: '15px', height: '4px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${((currentIndex + 1) / sortedOptimizedBudgets.length) * 100}%`, height: '100%', background: 'white', transition: 'width 0.3s ease' }} />
          </div>
        </div>
        
        {currentOptimizationInfo && (
          <div style={{ padding: '25px' }}>
            <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '15px', marginBottom: '20px', border: '2px solid #e0e0e0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.5em' }}>{currentOptimizationInfo.budget.type === 'entree' ? '🟢' : '🔴'}</span>
                <div>
                  <strong style={{ color: '#2c3e50', fontSize: '1.1em' }}>{currentOptimizationInfo.budget.description}</strong>
                  <p style={{ margin: '3px 0 0', fontSize: '0.85em', color: '#7f8c8d' }}>
                    {getFrequencyLabel(currentOptimizationInfo.budget.frequence)}
                    {currentOptimizationInfo.budget.compte && ` • ${currentOptimizationInfo.budget.compte}`}
                  </p>
                </div>
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.85em', color: '#7f8c8d', display: 'block', marginBottom: '5px' }}>
                📅 {currentOptimizationInfo.period === 'ascending' ? t('gps.optimization.nextDate', 'Prochaine date') : t('gps.optimization.lastDate', 'Dernière date')}
              </label>
              <div style={{ background: currentOptimizationInfo.period === 'ascending' ? '#e8f5e9' : '#fff3e0', padding: '12px 15px', borderRadius: '10px', fontWeight: '600', color: currentOptimizationInfo.period === 'ascending' ? '#2e7d32' : '#e65100' }}>
                {currentOptimizationInfo.proposedDate ? formatDate(currentOptimizationInfo.proposedDate) : t('gps.optimization.noDateFound', 'Aucune date trouvée')}
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.85em', color: '#7f8c8d', display: 'block', marginBottom: '5px' }}>🔁 {t('gps.optimization.amountChange', 'Changement de montant')}</label>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', padding: '15px', background: '#f8f9fa', borderRadius: '12px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8em', color: '#7f8c8d' }}>{t('gps.optimization.before', 'Avant')}</div>
                  <div style={{ fontSize: '1.3em', fontWeight: 'bold', color: '#2c3e50' }}>{formatMontant(currentOptimizationInfo.currentAmount)}</div>
                </div>
                <div style={{ background: currentOptimizationInfo.isIncrease ? '#27ae60' : '#e74c3c', color: 'white', padding: '8px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9em' }}>
                  {currentOptimizationInfo.isIncrease ? '📈' : '📉'} {currentOptimizationInfo.isIncrease ? '+' : ''}{currentOptimizationInfo.differenceText}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8em', color: '#7f8c8d' }}>{t('gps.optimization.after', 'Après')}</div>
                  <div style={{ fontSize: '1.3em', fontWeight: 'bold', color: currentOptimizationInfo.isIncrease ? '#27ae60' : '#e74c3c' }}>{formatMontant(currentOptimizationInfo.newAmount)}</div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div style={{ padding: '15px 25px 25px', borderTop: '1px solid #e0e0e0', background: '#f8f9fa' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleCancel} disabled={isProcessing} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: '2px solid #e74c3c', background: 'white', color: '#e74c3c', fontWeight: '600', cursor: 'pointer', fontSize: '0.9em' }}>
              ❌ {t('gps.optimization.cancel', 'Annuler')}
            </button>
            <button onClick={handleBalance} disabled={isProcessing || !currentOptimizationInfo?.proposedDate} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: '2px solid #f39c12', background: 'white', color: '#f39c12', fontWeight: '600', cursor: 'pointer', fontSize: '0.9em', opacity: !currentOptimizationInfo?.proposedDate ? 0.5 : 1 }}>
              ⏭️ {t('gps.optimization.balance', 'Balancer')}
            </button>
            <button onClick={handleAccept} disabled={isProcessing || !currentOptimizationInfo?.proposedDate} style={{ flex: 1.5, padding: '14px', borderRadius: '10px', border: 'none', background: !currentOptimizationInfo?.proposedDate ? '#95a5a6' : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', color: 'white', fontWeight: '600', cursor: !currentOptimizationInfo?.proposedDate ? 'not-allowed' : 'pointer', fontSize: '0.9em', boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)' }}>
              ✅ {t('gps.optimization.accept', 'Accepter')}
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: '15px' }}>
            <button onClick={handleSkip} style={{ background: 'none', border: 'none', color: '#7f8c8d', cursor: 'pointer', fontSize: '0.85em', textDecoration: 'underline' }}>
              {t('gps.optimization.skipForNow', 'Passer pour le moment')} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizationModal;
