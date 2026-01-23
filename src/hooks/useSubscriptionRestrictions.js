// 🔐 USE SUBSCRIPTION RESTRICTIONS HOOK
// Hook utilitaire pour gérer facilement les restrictions par forfait dans les composants

import { useState, useCallback } from 'react';
import { useSubscription, PLANS } from '../context/SubscriptionContext';

/**
 * Hook pour gérer les restrictions d'abonnement dans les composants
 * @returns {Object} Fonctions et états pour gérer les restrictions
 */
export const useSubscriptionRestrictions = () => {
  const subscription = useSubscription();
  const [upgradeModal, setUpgradeModal] = useState({ isOpen: false, type: null, data: {} });

  // Vérifier si on peut ajouter un compte
  const checkAddAccount = useCallback((currentCount) => {
    const limits = subscription.getPlanLimits();
    if (currentCount >= limits.maxAccounts) {
      setUpgradeModal({
        isOpen: true,
        type: 'accounts',
        data: { current: currentCount, max: limits.maxAccounts }
      });
      return false;
    }
    return true;
  }, [subscription]);

  // Vérifier si on peut ajouter une destination
  const checkAddDestination = useCallback((currentCount) => {
    const limits = subscription.getPlanLimits();
    if (currentCount >= limits.maxDestinations) {
      setUpgradeModal({
        isOpen: true,
        type: 'destinations',
        data: { current: currentCount, max: limits.maxDestinations }
      });
      return false;
    }
    return true;
  }, [subscription]);

  // Vérifier si on peut ajouter un item budget
  const checkAddBudgetItem = useCallback((currentCount) => {
    const limits = subscription.getPlanLimits();
    if (currentCount >= limits.maxBudgetItems) {
      setUpgradeModal({
        isOpen: true,
        type: 'budgetItems',
        data: { current: currentCount, max: limits.maxBudgetItems }
      });
      return false;
    }
    return true;
  }, [subscription]);

  // Vérifier si on peut faire une simulation
  const checkRunSimulation = useCallback(() => {
    const limits = subscription.getPlanLimits();
    if (!subscription.canRunSimulation()) {
      setUpgradeModal({
        isOpen: true,
        type: 'simulations',
        data: { current: subscription.usage.simulationsThisMonth, max: limits.simulationsPerMonth }
      });
      return false;
    }
    return true;
  }, [subscription]);

  // Vérifier si on peut accéder à une vue GPS
  const checkGpsView = useCallback((view) => {
    if (!subscription.canAccessGpsView(view)) {
      setUpgradeModal({
        isOpen: true,
        type: view === 'month' ? 'gpsMonth' : 'gpsYear',
        data: {}
      });
      return false;
    }
    return true;
  }, [subscription]);

  // Fermer le modal
  const closeUpgradeModal = useCallback(() => {
    setUpgradeModal({ isOpen: false, type: null, data: {} });
  }, []);

  // Obtenir le badge de limite pour affichage
  const getLimitBadge = useCallback((type, currentCount) => {
    const limits = subscription.getPlanLimits();
    let max;
    
    switch (type) {
      case 'accounts':
        max = limits.maxAccounts;
        break;
      case 'destinations':
        max = limits.maxDestinations;
        break;
      case 'budgetItems':
        max = limits.maxBudgetItems;
        break;
      case 'simulations':
        max = limits.simulationsPerMonth;
        break;
      default:
        return null;
    }

    if (max === Infinity) return null;

    const isNearLimit = currentCount >= max * 0.8;
    const isAtLimit = currentCount >= max;

    return {
      current: currentCount,
      max,
      isNearLimit,
      isAtLimit,
      display: `${currentCount}/${max}`
    };
  }, [subscription]);

  return {
    // État du modal
    upgradeModal,
    closeUpgradeModal,
    
    // Checks avec modal automatique
    checkAddAccount,
    checkAddDestination,
    checkAddBudgetItem,
    checkRunSimulation,
    checkGpsView,
    
    // Helpers
    getLimitBadge,
    
    // Accès direct au contexte
    ...subscription
  };
};

export default useSubscriptionRestrictions;
