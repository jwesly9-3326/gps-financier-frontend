// 🎯 HOOK - Gestion du tour de tooltips interactifs
// Après la fin du guide (onboarding), affiche des tooltips sur chaque page
// L'utilisateur peut voir ou ignorer les tooltips
// Option dans Paramètres pour revoir les tooltips

import { useState, useEffect, useCallback } from 'react';
import { useUserData } from '../context/UserDataContext';

// Configuration des tooltips par page
export const TOOLTIP_CONFIGS = {
  dashboard: [
    // 1. Calendrier - première chose que l'utilisateur voit
    {
      id: 'calendar',
      target: '[data-tooltip="calendar"]',
      titleKey: 'tooltips.dashboard.calendar.title',
      contentKey: 'tooltips.dashboard.calendar.content',
      position: 'bottom',
      icon: '📅'
    },
    // 2. Alertes - notifications importantes
    {
      id: 'alerts',
      target: '[data-tooltip="alerts"]',
      titleKey: 'tooltips.dashboard.alerts.title',
      contentKey: 'tooltips.dashboard.alerts.content',
      position: 'right',
      icon: '🔔'
    },
    // 3. Transactions - prochaines dépenses
    {
      id: 'transactions',
      target: '[data-tooltip="transactions"]',
      titleKey: 'tooltips.dashboard.transactions.title',
      contentKey: 'tooltips.dashboard.transactions.content',
      position: 'right',
      icon: '💳'
    },
    // 4. Destinations - objectifs financiers
    {
      id: 'destinations',
      target: '[data-tooltip="destinations"]',
      titleKey: 'tooltips.dashboard.destinations.title',
      contentKey: 'tooltips.dashboard.destinations.content',
      position: 'left',
      icon: '🧭'
    }
  ],
  comptes: [
    // 1. Le premier compte affiché
    {
      id: 'account-card',
      target: '[data-tooltip="account-card"]',
      titleKey: 'tooltips.comptes.accountCard.title',
      contentKey: 'tooltips.comptes.accountCard.content',
      position: 'right',
      icon: '💳'
    },
    // 2. Bouton ajouter un compte
    {
      id: 'add-account',
      target: '[data-tooltip="add-account"]',
      titleKey: 'tooltips.comptes.addAccount.title',
      contentKey: 'tooltips.comptes.addAccount.content',
      position: 'bottom',
      icon: '➕'
    }
  ],
  budget: [
    {
      id: 'entries',
      target: '[data-tooltip="entries"]',
      titleKey: 'tooltips.budget.entries.title',
      contentKey: 'tooltips.budget.entries.content',
      position: 'right',
      icon: '💰'
    },
    {
      id: 'expenses',
      target: '[data-tooltip="expenses"]',
      titleKey: 'tooltips.budget.expenses.title',
      contentKey: 'tooltips.budget.expenses.content',
      position: 'left',
      icon: '💸'
    },
    {
      id: 'balance',
      target: '[data-tooltip="balance"]',
      titleKey: 'tooltips.budget.balance.title',
      contentKey: 'tooltips.budget.balance.content',
      position: 'bottom',
      icon: '⚖️'
    }
  ],
  objectifs: [
    {
      id: 'add-goal',
      target: '[data-tooltip="add-goal"]',
      titleKey: 'tooltips.objectifs.addGoal.title',
      contentKey: 'tooltips.objectifs.addGoal.content',
      position: 'top',
      icon: '🧭'
    },
    {
      id: 'goal-card',
      target: '[data-tooltip="goal-card"]',
      titleKey: 'tooltips.objectifs.goalCard.title',
      contentKey: 'tooltips.objectifs.goalCard.content',
      position: 'right',
      icon: '🧭'
    }
  ],
  gps: [
    // 1. Introduction - Bienvenue sur le GPS
    {
      id: 'welcome',
      target: '[data-tooltip="gps-welcome"]',
      titleKey: 'tooltips.gps.welcome.title',
      contentKey: 'tooltips.gps.welcome.content',
      position: 'left',
      icon: '🚀'
    },
    // 2. Pilote Auto et modes de navigation
    {
      id: 'pilot-modes',
      target: '[data-tooltip="pilot-modes"]',
      titleKey: 'tooltips.gps.pilotModes.title',
      contentKey: 'tooltips.gps.pilotModes.content',
      position: 'bottom',
      icon: '🧭'
    },
    // 3. Trajectoire - le bouton pour voir l'itinéraire
    {
      id: 'trajectory',
      target: '[data-tooltip="trajectory"]',
      titleKey: 'tooltips.gps.trajectory.title',
      contentKey: 'tooltips.gps.trajectory.content',
      position: 'left',
      icon: '📈'
    },
    {
      id: 'views',
      target: '[data-tooltip="views"]',
      titleKey: 'tooltips.gps.views.title',
      contentKey: 'tooltips.gps.views.content',
      position: 'left',
      icon: '👁️'
    },
    {
      id: 'plato-button',
      target: '[data-tooltip="plato-button"]',
      titleKey: 'tooltips.gps.platoButton.title',
      contentKey: 'tooltips.gps.platoButton.content',
      position: 'right',
      icon: '📊'
    }
  ],
  simulations: [
    {
      id: 'calculator-period',
      target: '[data-tooltip="calculator-period"]',
      titleKey: 'tooltips.simulations.period.title',
      contentKey: 'tooltips.simulations.period.content',
      position: 'bottom',
      icon: '📅'
    },
    {
      id: 'calculator-quicktest',
      target: '[data-tooltip="calculator-quicktest"]',
      titleKey: 'tooltips.simulations.quicktest.title',
      contentKey: 'tooltips.simulations.quicktest.content',
      position: 'bottom',
      icon: '⚡'
    },
    {
      id: 'calculator-accounts',
      target: '[data-tooltip="calculator-accounts"]',
      titleKey: 'tooltips.simulations.accounts.title',
      contentKey: 'tooltips.simulations.accounts.content',
      position: 'top',
      icon: '💳'
    },
    {
      id: 'calculator-go',
      target: '[data-tooltip="calculator-go"]',
      titleKey: 'tooltips.simulations.go.title',
      contentKey: 'tooltips.simulations.go.content',
      position: 'bottom',
      icon: '🚀'
    }
  ],
  gestionComptes: [
    {
      id: 'gestion-trajectory',
      target: '[data-tooltip="gestion-trajectory"]',
      titleKey: 'tooltips.gestionComptes.trajectory.title',
      contentKey: 'tooltips.gestionComptes.trajectory.content',
      position: 'bottom',
      icon: '🛤️'
    },
    {
      id: 'gestion-improve',
      target: '[data-tooltip="gestion-improve"]',
      titleKey: 'tooltips.gestionComptes.improve.title',
      contentKey: 'tooltips.gestionComptes.improve.content',
      position: 'left',
      icon: '🚀'
    },
    {
      id: 'gestion-report',
      target: '[data-tooltip="gestion-report"]',
      titleKey: 'tooltips.gestionComptes.report.title',
      contentKey: 'tooltips.gestionComptes.report.content',
      position: 'bottom',
      icon: '📝'
    }
  ],
  parametres: [
    {
      id: 'subscription',
      target: '[data-tooltip="subscription"]',
      titleKey: 'tooltips.parametres.subscription.title',
      contentKey: 'tooltips.parametres.subscription.content',
      position: 'right',
      icon: '💎'
    },
    {
      id: 'security',
      target: '[data-tooltip="security"]',
      titleKey: 'tooltips.parametres.security.title',
      contentKey: 'tooltips.parametres.security.content',
      position: 'right',
      icon: '🔒'
    }
  ]
};

/**
 * Hook pour gérer le tour de tooltips d'une page
 * @param {string} pageName - Nom de la page (dashboard, comptes, budget, etc.)
 * @param {object} options - Options optionnelles
 * @param {function} options.onComplete - Callback appelé quand le tour est terminé
 * @returns {object} - États et fonctions pour le tour
 */
const useTooltipTour = (pageName, options = {}) => {
  const { onComplete } = options;
  const { userData, updateUserData } = useUserData();
  
  // État local du tour
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);
  
  // Récupérer la config pour cette page
  const tooltips = TOOLTIP_CONFIGS[pageName] || [];
  
  // Vérifier si le tour a déjà été vu (depuis userData ou localStorage)
  const getTooltipsCompleted = useCallback(() => {
    // D'abord vérifier userData
    if (userData?.tooltipsCompleted?.[pageName]) {
      return true;
    }
    // Sinon vérifier localStorage
    const stored = localStorage.getItem('pl4to_tooltips_completed');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed[pageName] === true;
    }
    return false;
  }, [userData, pageName]);
  
  // Vérifier si le guide principal est terminé
  const isGuideComplete = useCallback(() => {
    // Vérifier userData
    if (userData?.guideCompleted?.parametres === true) {
      return true;
    }
    // Sinon vérifier localStorage
    const stored = localStorage.getItem('pl4to_guide_progress');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.parametres === true;
    }
    return false;
  }, [userData]);
  
  // Démarrer le tour automatiquement si:
  // 1. Le guide principal est terminé
  // 2. Les tooltips de cette page n'ont pas été vus
  useEffect(() => {
    if (hasCheckedStorage) return;
    
    const guideFinished = isGuideComplete();
    const tooltipsSeen = getTooltipsCompleted();
    
    console.log(`[useTooltipTour:${pageName}] Guide terminé: ${guideFinished}, Tooltips vus: ${tooltipsSeen}`);
    
    if (guideFinished && !tooltipsSeen && tooltips.length > 0) {
      // Petit délai pour laisser la page se charger
      const timer = setTimeout(() => {
        console.log(`[useTooltipTour:${pageName}] Démarrage automatique du tour`);
        setIsActive(true);
        setCurrentStep(0);
      }, 800);
      
      setHasCheckedStorage(true);
      return () => clearTimeout(timer);
    }
    
    setHasCheckedStorage(true);
  }, [pageName, tooltips.length, hasCheckedStorage, isGuideComplete, getTooltipsCompleted]);
  
  // Marquer les tooltips comme vus
  const markTooltipsCompleted = useCallback(() => {
    // Sauvegarder dans localStorage
    const stored = localStorage.getItem('pl4to_tooltips_completed');
    const current = stored ? JSON.parse(stored) : {};
    current[pageName] = true;
    localStorage.setItem('pl4to_tooltips_completed', JSON.stringify(current));
    
    // Mettre à jour userData si disponible
    if (updateUserData) {
      updateUserData({
        tooltipsCompleted: {
          ...(userData?.tooltipsCompleted || {}),
          [pageName]: true
        }
      });
    }
    
    console.log(`[useTooltipTour:${pageName}] Tooltips marqués comme complétés`);
  }, [pageName, updateUserData, userData]);
  
  // Passer au tooltip suivant
  const nextStep = useCallback(() => {
    if (currentStep < tooltips.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Tour terminé
      setIsActive(false);
      markTooltipsCompleted();
      // Appeler le callback onComplete si fourni
      if (onComplete) {
        setTimeout(() => onComplete(), 100);
      }
    }
  }, [currentStep, tooltips.length, markTooltipsCompleted, onComplete]);
  
  // Revenir au tooltip précédent
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);
  
  // Ignorer tous les tooltips
  const skipAll = useCallback(() => {
    setIsActive(false);
    markTooltipsCompleted();
    // Appeler le callback onComplete si fourni
    if (onComplete) {
      setTimeout(() => onComplete(), 100);
    }
  }, [markTooltipsCompleted, onComplete]);
  
  // Démarrer le tour manuellement (depuis Paramètres par exemple)
  const startTour = useCallback(() => {
    console.log(`[useTooltipTour:${pageName}] startTour appelé, tooltips.length: ${tooltips.length}`);
    if (tooltips.length > 0) {
      setCurrentStep(0);
      setIsActive(true);
      console.log(`[useTooltipTour:${pageName}] Tour démarré!`);
    } else {
      // Pas de tooltips, appeler directement onComplete
      console.log(`[useTooltipTour:${pageName}] Pas de tooltips, appel direct de onComplete`);
      if (onComplete) {
        setTimeout(() => onComplete(), 100);
      }
    }
  }, [tooltips.length, pageName, onComplete]);
  
  // Réinitialiser les tooltips (permet de les revoir)
  const resetTooltips = useCallback(() => {
    const stored = localStorage.getItem('pl4to_tooltips_completed');
    if (stored) {
      const current = JSON.parse(stored);
      delete current[pageName];
      localStorage.setItem('pl4to_tooltips_completed', JSON.stringify(current));
    }
    setHasCheckedStorage(false);
  }, [pageName]);
  
  // Réinitialiser TOUS les tooltips (pour Paramètres)
  const resetAllTooltips = useCallback(() => {
    localStorage.removeItem('pl4to_tooltips_completed');
    setHasCheckedStorage(false);
  }, []);
  
  return {
    // État
    isActive,
    currentStep,
    totalSteps: tooltips.length,
    currentTooltip: tooltips[currentStep] || null,
    tooltips,
    
    // Actions
    nextStep,
    prevStep,
    skipAll,
    startTour,
    resetTooltips,
    resetAllTooltips,
    
    // Helpers
    isGuideComplete: isGuideComplete(),
    tooltipsCompleted: getTooltipsCompleted()
  };
};

export default useTooltipTour;
