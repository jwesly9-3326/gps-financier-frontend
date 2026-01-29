// 🧭 HOOK: useGuideProgress
// Centralise la logique de progression du guide utilisateur
// ✅ SYNC BACKEND: Sauvegarde dans UserData pour persistance entre sessions
// Utilisé par: Sidebar, Dashboard, CalendrierO, Comptes, etc.

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useUserData } from '../context/UserDataContext';

// Configuration du parcours guide (ordre séquentiel)
const GUIDE_ORDER = [
  { path: '/dashboard', guideKey: 'dashboard', requiredGuide: null },
  { path: '/comptes', guideKey: 'comptes', requiredGuide: 'dashboard' },
  { path: '/budget', guideKey: 'budget', requiredGuide: 'comptes' },
  { path: '/objectifs', guideKey: 'objectifs', requiredGuide: 'budget' },
  { path: '/gps', guideKey: 'gps', requiredGuide: 'objectifs' },
  { path: '/simulations', guideKey: 'calculatrice', requiredGuide: 'gps' },
  { path: '/gestion-comptes', guideKey: 'gestion', requiredGuide: 'calculatrice' },
  { path: '/parametres', guideKey: 'parametres', requiredGuide: 'gestion' }
];

// Clés localStorage pour chaque guide (cache local)
const GUIDE_KEYS = {
  dashboard: 'pl4to-guide-dashboard',
  comptes: 'pl4to-guide-comptes',
  budget: 'pl4to-guide-budget',
  objectifs: 'pl4to-guide-objectifs',
  gps: 'pl4to-guide-gps',
  calculatrice: 'pl4to-guide-calculatrice',
  gestion: 'pl4to-guide-gestion',
  parametres: 'pl4to-guide-parametres'
};

// État par défaut
const DEFAULT_GUIDE_STATE = {
  dashboard: false,
  comptes: false,
  budget: false,
  objectifs: false,
  gps: false,
  calculatrice: false,
  gestion: false,
  parametres: false
};

/**
 * Hook pour gérer la progression du guide utilisateur
 * Synchronise avec le backend via UserDataContext
 * @returns {Object} Fonctions et états liés au guide
 */
const useGuideProgress = () => {
  const location = useLocation();
  const { userData, saveUserData, isLoading: isUserDataLoading } = useUserData();
  const [guidesCompleted, setGuidesCompleted] = useState(DEFAULT_GUIDE_STATE);
  const [isLoading, setIsLoading] = useState(true);  // ✅ État de chargement
  const isInitialized = useRef(false);

  // ============================================
  // INITIALISATION: Charger depuis userData (backend) ou localStorage (fallback)
  // ============================================
  useEffect(() => {
    // ✅ Attendre que UserData soit chargé
    if (isUserDataLoading) {
      console.log('[GuideProgress] ⏳ Attente chargement UserData...');
      return;
    }
    
    const loadGuideProgress = async () => {
      setIsLoading(true);
      // 1. Priorité: Données du backend (userData.guideProgress)
      if (userData?.guideProgress) {
        console.log('[GuideProgress] ✅ Chargé depuis backend:', userData.guideProgress);
        setGuidesCompleted(userData.guideProgress);
        
        // Sync vers localStorage (cache)
        Object.entries(userData.guideProgress).forEach(([key, completed]) => {
          if (completed) {
            localStorage.setItem(GUIDE_KEYS[key], 'completed');
          }
        });
        isInitialized.current = true;
        setIsLoading(false);  // ✅
        return;
      }
      
      // 2. 🔧 FIX: Vérifier si guideProgress existe explicitement dans userData
      //    Si userData.guideProgress est vide/false, c'est un NOUVEAU utilisateur qui doit passer par le guide
      //    On ne fait plus de migration automatique
      if (userData && !userData.guideProgress) {
        console.log('[GuideProgress] 🆕 Nouvel utilisateur détecté - guide NON complété');
        
        // Nettoyer localStorage au cas où
        Object.entries(GUIDE_KEYS).forEach(([key, storageKey]) => {
          localStorage.removeItem(storageKey);
        });
        
        setGuidesCompleted(DEFAULT_GUIDE_STATE);
        isInitialized.current = true;
        setIsLoading(false);
        return;
      }
      
      // 3. Fallback: localStorage
      try {
        const localState = {};
        let hasLocalData = false;
        
        Object.entries(GUIDE_KEYS).forEach(([key, storageKey]) => {
          const isCompleted = localStorage.getItem(storageKey) === 'completed';
          localState[key] = isCompleted;
          if (isCompleted) hasLocalData = true;
        });
        
        if (hasLocalData) {
          console.log('[GuideProgress] 📦 Chargé depuis localStorage:', localState);
          setGuidesCompleted(localState);
          
          // Migrer vers backend si userData existe mais pas guideProgress
          if (userData && !userData.guideProgress) {
            console.log('[GuideProgress] 🔄 Migration localStorage → backend');
            saveUserData({
              ...userData,
              guideProgress: localState
            });
          }
        } else {
          console.log('[GuideProgress] 🆕 Nouveau guide (aucune donnée)');
          setGuidesCompleted(DEFAULT_GUIDE_STATE);
        }
        
        isInitialized.current = true;
        setIsLoading(false);  // ✅
      } catch (error) {
        console.error('[GuideProgress] Erreur lecture:', error);
        setGuidesCompleted(DEFAULT_GUIDE_STATE);
        setIsLoading(false);  // ✅
      }
    };
    
    loadGuideProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.guideProgress, userData?.accounts, isUserDataLoading]);

  // ============================================
  // SAUVEGARDE: Marquer un guide comme complété
  // ============================================
  const markGuideCompleted = useCallback(async (guideKey) => {
    if (!GUIDE_KEYS[guideKey]) {
      console.error('[GuideProgress] Clé invalide:', guideKey);
      return;
    }
    
    // 1. Mise à jour locale immédiate (optimistic update)
    const newState = {
      ...guidesCompleted,
      [guideKey]: true
    };
    setGuidesCompleted(newState);
    
    // 2. Sauvegarder en localStorage (cache)
    localStorage.setItem(GUIDE_KEYS[guideKey], 'completed');
    console.log(`[GuideProgress] ✅ Guide "${guideKey}" complété`);
    
    // 3. Sauvegarder dans le backend via UserDataContext
    if (userData) {
      try {
        await saveUserData({
          ...userData,
          guideProgress: newState
        });
        console.log('[GuideProgress] 💾 Synchronisé avec backend');
      } catch (error) {
        console.error('[GuideProgress] ❌ Erreur sync backend:', error);
        // Les données sont déjà en localStorage, donc pas de perte
      }
    }
  }, [guidesCompleted, userData, saveUserData]);

  // ============================================
  // HELPERS: Vérifications
  // ============================================
  
  /**
   * Vérifie si une page est accessible selon la progression du guide
   * ✅ FIX: Ne plus bypasser avec userData.accounts - utiliser guideProgress
   */
  const isPageAccessible = useCallback((path) => {
    // Si le guide complet est terminé, tout est accessible
    if (guidesCompleted.parametres) return true;
    
    // Dashboard toujours accessible
    if (path === '/dashboard') return true;
    
    // Trouver la page dans l'ordre du guide
    const pageInfo = GUIDE_ORDER.find(p => p.path === path);
    
    // Page non dans le guide = accessible
    if (!pageInfo) return true;
    
    // Vérifier si le guide requis est complété
    if (pageInfo.requiredGuide) {
      return guidesCompleted[pageInfo.requiredGuide] === true;
    }
    
    return true;
  }, [guidesCompleted]);

  /**
   * Vérifie si le guide complet est terminé
   */
  const isGuideComplete = guidesCompleted.parametres;

  /**
   * Obtenir l'index de progression actuel (0-8)
   */
  const getCurrentProgressIndex = useCallback(() => {
    for (let i = GUIDE_ORDER.length - 1; i >= 0; i--) {
      if (guidesCompleted[GUIDE_ORDER[i].guideKey]) {
        return i + 1;
      }
    }
    return 0;
  }, [guidesCompleted]);

  /**
   * Vérifie si un guide spécifique doit être affiché
   * (le guide précédent est complété mais pas celui-ci)
   * ✅ FIX: Ne plus bypasser avec userData.accounts
   */
  const shouldShowGuide = useCallback((guideKey) => {
    // Si déjà complété, ne pas afficher
    if (guidesCompleted[guideKey]) return false;
    
    // Trouver la page dans l'ordre
    const pageInfo = GUIDE_ORDER.find(p => p.guideKey === guideKey);
    if (!pageInfo) return false;
    
    // Si pas de prérequis (dashboard), afficher
    if (!pageInfo.requiredGuide) return true;
    
    // Afficher si le prérequis est complété
    return guidesCompleted[pageInfo.requiredGuide] === true;
  }, [guidesCompleted]);

  /**
   * Obtenir la prochaine page du guide
   */
  const getNextGuidePage = useCallback(() => {
    const currentIndex = getCurrentProgressIndex();
    if (currentIndex < GUIDE_ORDER.length) {
      return GUIDE_ORDER[currentIndex].path;
    }
    return null;
  }, [getCurrentProgressIndex]);

  /**
   * Rafraîchir depuis localStorage (pour sync entre onglets)
   */
  const refreshGuides = useCallback(() => {
    try {
      const newState = {};
      Object.entries(GUIDE_KEYS).forEach(([key, storageKey]) => {
        newState[key] = localStorage.getItem(storageKey) === 'completed';
      });
      setGuidesCompleted(newState);
    } catch (error) {
      console.error('[GuideProgress] Erreur refresh:', error);
    }
  }, []);

  // Écouter les changements localStorage (pour sync entre onglets)
  useEffect(() => {
    window.addEventListener('storage', refreshGuides);
    return () => window.removeEventListener('storage', refreshGuides);
  }, [refreshGuides]);

  return {
    // États
    guidesCompleted,
    isGuideComplete,
    isLoading,  // ✅ Ajouté
    
    // Fonctions de vérification
    isPageAccessible,
    shouldShowGuide,
    getCurrentProgressIndex,
    getNextGuidePage,
    
    // Actions
    markGuideCompleted,
    refreshGuides,
    
    // Constantes exportées
    GUIDE_ORDER,
    GUIDE_KEYS
  };
};

export default useGuideProgress;
