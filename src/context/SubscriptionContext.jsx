// 💎 SUBSCRIPTION CONTEXT - Gestion des abonnements et restrictions par forfait
// Source de vérité: Supabase (backend) - localStorage utilisé uniquement comme cache
// Plans: Discovery (gratuit), Essential (14.99$), Pro+IA (24.99$ - bientôt)

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import subscriptionService from '../services/subscription.service';
import { storage } from '../utils';

const SubscriptionContext = createContext(null);

// ============================================
// DÉFINITION DES PLANS ET LIMITES
// ============================================
export const PLANS = {
  DISCOVERY: 'discovery',
  ESSENTIAL: 'essential',
  PRO: 'pro'
};

export const PLAN_LIMITS = {
  [PLANS.DISCOVERY]: {
    name: 'Discovery',
    price: 0,
    // Navigation GPS
    gpsViews: ['day'], // Seulement vue jour
    projectionYears: 1,
    // Gestion
    maxAccounts: 3,
    maxDestinations: 2,
    maxBudgetItems: 10,
    simulationsPerMonth: 5,
    // Données
    backupDays: 30,
    canExport: false,
    multiDeviceSync: false,
    // Support
    supportLevel: 'community',
    // Features
    features: {
      gpsDay: true,
      gpsMonth: false,
      gpsYear: false,
      timeline: false,
      advancedTrajectory: false,
      smartAlerts: false,
      aiCoach: false,
      familyProfiles: false
    }
  },
  [PLANS.ESSENTIAL]: {
    name: 'Essentiel',
    price: 14.99,
    yearlyPrice: 149,
    // Navigation GPS
    gpsViews: ['day', 'month', 'year'], // Toutes les vues
    projectionYears: 54, // Projection complète
    // Gestion
    maxAccounts: Infinity,
    maxDestinations: Infinity,
    maxBudgetItems: Infinity,
    simulationsPerMonth: Infinity,
    // Données
    backupDays: Infinity, // Permanent
    canExport: true,
    multiDeviceSync: true,
    // Support
    supportLevel: 'email',
    // Features
    features: {
      gpsDay: true,
      gpsMonth: true,
      gpsYear: true,
      timeline: true,
      advancedTrajectory: true,
      smartAlerts: true,
      aiCoach: false,
      familyProfiles: false
    }
  },
  [PLANS.PRO]: {
    name: 'Pro + IA',
    price: 24.99,
    yearlyPrice: 249,
    available: false, // Pas encore disponible
    // Navigation GPS
    gpsViews: ['day', 'month', 'year'],
    projectionYears: 54,
    // Gestion
    maxAccounts: Infinity,
    maxDestinations: Infinity,
    maxBudgetItems: Infinity,
    simulationsPerMonth: Infinity,
    // Données
    backupDays: Infinity,
    canExport: true,
    multiDeviceSync: true,
    // Support
    supportLevel: 'vip',
    // Features
    features: {
      gpsDay: true,
      gpsMonth: true,
      gpsYear: true,
      timeline: true,
      advancedTrajectory: true,
      smartAlerts: true,
      aiCoach: true,
      familyProfiles: true,
      smartRoutes: true,
      predictiveAlerts: true
    },
    // Pro exclusif
    familyProfiles: 5
  }
};

// Clés localStorage (cache uniquement)
const STORAGE_KEYS = {
  SUBSCRIPTION_CACHE: 'pl4to_subscription_cache',
  USAGE: 'pl4to_subscription_usage'
};

export const SubscriptionProvider = ({ children }) => {
  // État principal - chargé depuis Supabase
  const [currentPlan, setCurrentPlan] = useState(PLANS.DISCOVERY);
  const [isBetaFounder, setIsBetaFounder] = useState(false);
  const [trialInfo, setTrialInfo] = useState({
    isActive: false,
    startDate: null,
    endDate: null,
    daysRemaining: null,
    hasChosen: false
  });
  
  // État de chargement
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Référence pour éviter les appels multiples
  const hasFetched = useRef(false);

  // Usage tracking local (pour les limites mensuelles)
  const [usage, setUsage] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USAGE);
    const defaultUsage = {
      simulationsThisMonth: 0,
      lastResetMonth: new Date().getMonth(),
      lastResetYear: new Date().getFullYear()
    };
    
    if (saved) {
      const parsed = JSON.parse(saved);
      const now = new Date();
      if (parsed.lastResetMonth !== now.getMonth() || parsed.lastResetYear !== now.getFullYear()) {
        return defaultUsage;
      }
      return parsed;
    }
    return defaultUsage;
  });

  // Sauvegarder usage dans localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USAGE, JSON.stringify(usage));
  }, [usage]);

  // ============================================
  // CHARGEMENT INITIAL DEPUIS SUPABASE
  // ============================================
  const loadSubscriptionFromBackend = useCallback(async () => {
    // Vérifier si l'utilisateur est connecté
    const token = storage.getAuthToken();
    if (!token) {
      console.log('[Subscription] Pas de token, utilisation du plan par défaut');
      setIsLoading(false);
      return;
    }

    try {
      const subscription = await subscriptionService.getStatus();
      
      if (subscription) {
        setCurrentPlan(subscription.currentPlan || PLANS.DISCOVERY);
        setIsBetaFounder(subscription.isBetaFounder || false);
        setTrialInfo({
          isActive: subscription.trialActive || false,
          startDate: subscription.trialStartDate,
          endDate: subscription.trialEndDate,
          daysRemaining: subscription.trialDaysRemaining,
          hasChosen: subscription.planChosen || false
        });
        
        // Mettre en cache
        localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_CACHE, JSON.stringify({
          ...subscription,
          cachedAt: new Date().toISOString()
        }));
        
        console.log('[Subscription] Chargé depuis Supabase:', subscription);
      }
    } catch (error) {
      console.error('[Subscription] Erreur chargement:', error);
      setError(error.message);
      
      // Fallback sur le cache local
      const cached = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_CACHE);
      if (cached) {
        const cachedData = JSON.parse(cached);
        setCurrentPlan(cachedData.currentPlan || PLANS.DISCOVERY);
        setIsBetaFounder(cachedData.isBetaFounder || false);
        setTrialInfo({
          isActive: cachedData.trialActive || false,
          startDate: cachedData.trialStartDate,
          endDate: cachedData.trialEndDate,
          daysRemaining: cachedData.trialDaysRemaining,
          hasChosen: cachedData.planChosen || false
        });
        console.log('[Subscription] Utilisé cache local');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Charger au montage du composant
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      loadSubscriptionFromBackend();
    }
  }, [loadSubscriptionFromBackend]);

  // Recharger quand le token change (connexion/déconnexion)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'gps_financier_token') {
        hasFetched.current = false;
        loadSubscriptionFromBackend();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadSubscriptionFromBackend]);

  // ============================================
  // GETTERS
  // ============================================
  
  const getPlanLimits = useCallback(() => {
    return PLAN_LIMITS[currentPlan] || PLAN_LIMITS[PLANS.DISCOVERY];
  }, [currentPlan]);

  const getPrice = useCallback(() => {
    const limits = getPlanLimits();
    if (currentPlan === PLANS.DISCOVERY) return 0;
    if (isBetaFounder && currentPlan === PLANS.ESSENTIAL) return 9.99;
    return limits.price;
  }, [currentPlan, isBetaFounder, getPlanLimits]);

  // ============================================
  // VÉRIFICATIONS DE LIMITES
  // ============================================
  
  const hasFeature = useCallback((featureName) => {
    const limits = getPlanLimits();
    return limits.features?.[featureName] ?? false;
  }, [getPlanLimits]);

  const canAccessGpsView = useCallback((view) => {
    const limits = getPlanLimits();
    return limits.gpsViews.includes(view);
  }, [getPlanLimits]);

  const canAddAccount = useCallback((currentCount) => {
    const limits = getPlanLimits();
    return currentCount < limits.maxAccounts;
  }, [getPlanLimits]);

  const canAddDestination = useCallback((currentCount) => {
    const limits = getPlanLimits();
    return currentCount < limits.maxDestinations;
  }, [getPlanLimits]);

  const canAddBudgetItem = useCallback((currentCount) => {
    const limits = getPlanLimits();
    return currentCount < limits.maxBudgetItems;
  }, [getPlanLimits]);

  const canRunSimulation = useCallback(() => {
    const limits = getPlanLimits();
    if (limits.simulationsPerMonth === Infinity) return true;
    return usage.simulationsThisMonth < limits.simulationsPerMonth;
  }, [getPlanLimits, usage.simulationsThisMonth]);

  const getRemainingSimulations = useCallback(() => {
    const limits = getPlanLimits();
    if (limits.simulationsPerMonth === Infinity) return Infinity;
    return Math.max(0, limits.simulationsPerMonth - usage.simulationsThisMonth);
  }, [getPlanLimits, usage.simulationsThisMonth]);

  const canAddMore = useCallback((type, currentCount) => {
    const limits = getPlanLimits();
    switch (type) {
      case 'accounts': return currentCount < limits.maxAccounts;
      case 'destinations': return currentCount < limits.maxDestinations;
      case 'budgetItems': return currentCount < limits.maxBudgetItems;
      default: return true;
    }
  }, [getPlanLimits]);

  const getRemainingCount = useCallback((type, currentCount) => {
    const limits = getPlanLimits();
    switch (type) {
      case 'accounts':
        return limits.maxAccounts === Infinity ? Infinity : Math.max(0, limits.maxAccounts - currentCount);
      case 'destinations':
        return limits.maxDestinations === Infinity ? Infinity : Math.max(0, limits.maxDestinations - currentCount);
      case 'budgetItems':
        return limits.maxBudgetItems === Infinity ? Infinity : Math.max(0, limits.maxBudgetItems - currentCount);
      case 'simulations':
        return getRemainingSimulations();
      default:
        return Infinity;
    }
  }, [getPlanLimits, getRemainingSimulations]);

  // ============================================
  // ACTIONS - APPELLENT LE BACKEND
  // ============================================
  
  const incrementSimulation = useCallback(() => {
    setUsage(prev => ({
      ...prev,
      simulationsThisMonth: prev.simulationsThisMonth + 1
    }));
  }, []);

  // Changer de plan via le backend
  const changePlan = useCallback(async (newPlan) => {
    if (!PLAN_LIMITS[newPlan]) return;
    
    try {
      const result = await subscriptionService.choosePlan(newPlan);
      if (result) {
        setCurrentPlan(result.currentPlan);
        setTrialInfo(prev => ({ ...prev, hasChosen: true, isActive: false }));
      }
      console.log(`[Subscription] Plan changé vers: ${newPlan}`);
    } catch (error) {
      console.error('[Subscription] Erreur changePlan:', error);
      throw error;
    }
  }, []);

  // Activer Beta Founder via le backend
  const activateBetaFounder = useCallback(async () => {
    try {
      await subscriptionService.activateBetaFounder();
      setIsBetaFounder(true);
      console.log('[Subscription] Beta Founder activé!');
    } catch (error) {
      console.error('[Subscription] Erreur activateBetaFounder:', error);
      throw error;
    }
  }, []);

  // ============================================
  // TRIAL 14 JOURS - UTILISE LE BACKEND
  // ============================================
  
  // Démarrer le trial de 14 jours
  const startTrial = useCallback(async () => {
    // Ne pas redémarrer si déjà actif ou si un choix a été fait
    if (trialInfo.isActive || trialInfo.hasChosen) {
      console.log('[Subscription] Trial déjà actif ou plan déjà choisi');
      return;
    }
    
    try {
      const result = await subscriptionService.startTrial();
      
      if (result) {
        setCurrentPlan(PLANS.ESSENTIAL);
        setTrialInfo({
          isActive: true,
          startDate: result.trialStartDate,
          endDate: result.trialEndDate,
          daysRemaining: result.trialDaysRemaining,
          hasChosen: false
        });
        console.log('[Subscription] Trial de 14 jours démarré!');
      }
    } catch (error) {
      // Si trial déjà utilisé, recharger le statut
      if (error.message?.includes('Trial déjà utilisé')) {
        await loadSubscriptionFromBackend();
      } else {
        console.error('[Subscription] Erreur startTrial:', error);
        throw error;
      }
    }
  }, [trialInfo, loadSubscriptionFromBackend]);

  // Calculer les jours restants du trial (depuis les données backend)
  const getTrialDaysRemaining = useCallback(() => {
    if (!trialInfo.isActive || trialInfo.hasChosen) return null;
    return trialInfo.daysRemaining;
  }, [trialInfo]);

  // Marquer qu'un plan a été choisi
  const confirmPlanChoice = useCallback(async (plan) => {
    await changePlan(plan);
  }, [changePlan]);

  // Reset usage (pour tests)
  const resetUsage = useCallback(() => {
    const now = new Date();
    setUsage({
      simulationsThisMonth: 0,
      lastResetMonth: now.getMonth(),
      lastResetYear: now.getFullYear()
    });
  }, []);

  // Rafraîchir depuis le backend
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await loadSubscriptionFromBackend();
  }, [loadSubscriptionFromBackend]);

  // ============================================
  // HELPERS POUR L'UI
  // ============================================
  
  const getLimitMessage = useCallback((limitType) => {
    const limits = getPlanLimits();
    const messages = {
      accounts: {
        fr: `Limite de ${limits.maxAccounts} comptes atteinte`,
        en: `Limit of ${limits.maxAccounts} accounts reached`
      },
      destinations: {
        fr: `Limite de ${limits.maxDestinations} destinations atteinte`,
        en: `Limit of ${limits.maxDestinations} destinations reached`
      },
      budgetItems: {
        fr: `Limite de ${limits.maxBudgetItems} items budget atteinte`,
        en: `Limit of ${limits.maxBudgetItems} budget items reached`
      },
      simulations: {
        fr: `Limite de ${limits.simulationsPerMonth} simulations/mois atteinte`,
        en: `Limit of ${limits.simulationsPerMonth} simulations/month reached`
      },
      gpsView: {
        fr: 'Cette vue nécessite le plan Essentiel',
        en: 'This view requires the Essential plan'
      }
    };
    return messages[limitType];
  }, [getPlanLimits]);

  const isFreePlan = useCallback(() => currentPlan === PLANS.DISCOVERY, [currentPlan]);
  const isPremiumPlan = useCallback(() => currentPlan !== PLANS.DISCOVERY, [currentPlan]);

  // ============================================
  // VALEUR DU CONTEXT
  // ============================================
  const value = {
    // État
    currentPlan,
    isBetaFounder,
    usage,
    isLoading,
    error,
    
    // Getters
    getPlanLimits,
    getPrice,
    limits: getPlanLimits(),
    
    // Vérifications
    hasFeature,
    canAccessGpsView,
    canAddAccount,
    canAddDestination,
    canAddBudgetItem,
    canRunSimulation,
    canAddMore,
    getRemainingSimulations,
    getRemainingCount,
    isFreePlan,
    isPremiumPlan,
    
    // Messages
    getLimitMessage,
    
    // Actions
    incrementSimulation,
    changePlan,
    activateBetaFounder,
    resetUsage,
    refresh,
    
    // Trial
    trialInfo,
    startTrial,
    getTrialDaysRemaining,
    confirmPlanChoice,
    
    // Constantes
    PLANS,
    PLAN_LIMITS
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

// Hook personnalisé
export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription doit être utilisé dans SubscriptionProvider');
  }
  return context;
};

export default SubscriptionContext;
