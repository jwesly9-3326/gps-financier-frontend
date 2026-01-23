// 🎯 USER DATA CONTEXT - Gestion des données utilisateur après onboarding
// Synchronisation: Backend (Prisma/PostgreSQL) + localStorage (fallback)

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import userDataService from '../services/userData.service';

const UserDataContext = createContext(null);

// Clé localStorage pour backup local
const LOCAL_STORAGE_KEY = 'pl4to-user-data';

export const UserDataProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // ============================================
  // CHARGEMENT INITIAL
  // ============================================
  useEffect(() => {
    loadUserData();
  }, []);

  // Charger les données (backend prioritaire, localStorage fallback)
  const loadUserData = async () => {
    setIsLoading(true);
    setSyncError(null);
    
    try {
      // 1. Charger depuis localStorage d'abord (cache local)
      const localData = getLocalData();
      
      // 2. Si authentifié, synchroniser avec le backend
      if (userDataService.isAuthenticated()) {
        console.log('[UserDataContext] Utilisateur authentifié, sync avec backend...');
        
        try {
          const syncedData = await userDataService.syncWithBackend(localData);
          
          if (syncedData) {
            setUserData(syncedData);
            saveLocalData(syncedData); // Mettre à jour le cache local
            setLastSyncTime(new Date());
            console.log('[UserDataContext] Données synchronisées avec succès');
          } else if (localData) {
            // Backend vide mais données locales disponibles
            setUserData(localData);
          }
        } catch (error) {
          console.error('[UserDataContext] Erreur sync backend:', error);
          setSyncError('Impossible de synchroniser avec le serveur');
          
          // Utiliser les données locales comme fallback
          if (localData) {
            setUserData(localData);
            console.log('[UserDataContext] Fallback vers données locales');
          }
        }
      } else {
        // Non authentifié, utiliser uniquement localStorage
        console.log('[UserDataContext] Non authentifié, utilisation localStorage');
        if (localData) {
          setUserData(localData);
        }
      }
      
    } catch (error) {
      console.error('[UserDataContext] Erreur chargement:', error);
      setSyncError('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // HELPERS LOCALSTORAGE
  // ============================================
  const getLocalData = () => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('[UserDataContext] Erreur lecture localStorage:', error);
      return null;
    }
  };

  const saveLocalData = (data) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[UserDataContext] Erreur écriture localStorage:', error);
    }
  };

  // ============================================
  // SAUVEGARDE AVEC SYNC BACKEND
  // ============================================
  const saveUserData = useCallback(async (data) => {
    setIsSyncing(true);
    setSyncError(null);
    
    console.log('[UserDataContext] 💾 saveUserData appelé');
    console.log('[UserDataContext] 🔑 isAuthenticated:', userDataService.isAuthenticated());
    
    try {
      // 1. Sauvegarder localement immédiatement (optimistic update)
      saveLocalData(data);
      setUserData(data);
      console.log('[UserDataContext] ✅ Données sauvegardées en localStorage');
      
      // 2. Synchroniser avec le backend si authentifié
      if (userDataService.isAuthenticated()) {
        try {
          console.log('[UserDataContext] 🚀 Envoi vers le backend...');
          await userDataService.saveUserData(data);
          setLastSyncTime(new Date());
          console.log('[UserDataContext] ✅ Données sauvegardées dans le backend!');
        } catch (error) {
          console.error('[UserDataContext] ❌ Erreur sauvegarde backend:', error);
          setSyncError('Données sauvegardées localement. Sync backend échouée.');
          // Les données sont déjà sauvegardées localement, on continue
        }
      } else {
        console.warn('[UserDataContext] ⚠️ Non authentifié - données sauvegardées en local seulement');
      }
      
      return true;
    } catch (error) {
      console.error('[UserDataContext] ❌ Erreur sauvegarde:', error);
      setSyncError('Erreur lors de la sauvegarde');
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // ============================================
  // MISE À JOUR PARTIELLE (SECTION SPÉCIFIQUE)
  // ============================================
  const updateSection = useCallback(async (section, data) => {
    if (!userData) return false;
    
    const newData = {
      ...userData,
      [section]: data
    };
    
    return saveUserData(newData);
  }, [userData, saveUserData]);

  // ============================================
  // GESTION DES COMPTES
  // ============================================
  const updateAccount = useCallback((accountId, updates) => {
    if (!userData) return false;

    const updatedAccounts = userData.accounts.map(account => 
      account.id === accountId ? { ...account, ...updates } : account
    );

    const newData = {
      ...userData,
      accounts: updatedAccounts
    };

    return saveUserData(newData);
  }, [userData, saveUserData]);

  const updateAccountBalance = useCallback((accountName, newBalance) => {
    if (!userData) return false;

    const updatedSoldes = userData.initialBalances.soldes.map(solde =>
      solde.accountName === accountName 
        ? { ...solde, solde: newBalance }
        : solde
    );

    const newData = {
      ...userData,
      initialBalances: {
        ...userData.initialBalances,
        soldes: updatedSoldes
      }
    };

    return saveUserData(newData);
  }, [userData, saveUserData]);

  const addAccount = useCallback((account) => {
    if (!userData) return false;

    const newData = {
      ...userData,
      accounts: [...userData.accounts, account]
    };

    return saveUserData(newData);
  }, [userData, saveUserData]);

  const deleteAccount = useCallback((accountId) => {
    if (!userData) return false;

    const newData = {
      ...userData,
      accounts: userData.accounts.filter(acc => acc.id !== accountId)
    };

    return saveUserData(newData);
  }, [userData, saveUserData]);

  // ============================================
  // GESTION DU BUDGET
  // ============================================
  const updateBudgetPlanning = useCallback((budgetPlanning) => {
    if (!userData) return false;

    const newData = {
      ...userData,
      budgetPlanning
    };

    return saveUserData(newData);
  }, [userData, saveUserData]);

  // ============================================
  // GESTION DES OBJECTIFS
  // ============================================
  const updateFinancialGoals = useCallback((financialGoals) => {
    if (!userData) return false;

    const newData = {
      ...userData,
      financialGoals
    };

    return saveUserData(newData);
  }, [userData, saveUserData]);

  // ============================================
  // CALCULS
  // ============================================
  const calculateTotalBalance = useCallback(() => {
    if (!userData?.initialBalances?.soldes) return 0;

    return userData.initialBalances.soldes.reduce((total, solde) => {
      const montant = parseFloat(solde.solde) || 0;
      if (solde.accountType === 'credit') {
        return total - montant; // Les dettes sont négatives
      }
      return total + montant;
    }, 0);
  }, [userData]);

  // ============================================
  // RÉINITIALISATION
  // ============================================
  const clearUserData = useCallback(async () => {
    // Supprimer localement
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setUserData(null);
    
    // Supprimer du backend si authentifié
    if (userDataService.isAuthenticated()) {
      try {
        await userDataService.deleteUserData();
        console.log('[UserDataContext] Données supprimées du backend');
      } catch (error) {
        console.error('[UserDataContext] Erreur suppression backend:', error);
      }
    }
  }, []);

  // 🔧 RESET COMPLET (pour nouveau compte)
  const resetUserData = useCallback(() => {
    console.log('[UserDataContext] 🔄 Reset complet des données utilisateur');
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setUserData(null);
    setLastSyncTime(null);
    setSyncError(null);
    setIsLoading(false);
    setIsSyncing(false);
  }, []);

  // ============================================
  // FORCE SYNC (Manuel)
  // ============================================
  const forceSync = useCallback(async () => {
    if (!userDataService.isAuthenticated()) {
      console.log('[UserDataContext] Non authentifié, sync impossible');
      return false;
    }
    
    setIsSyncing(true);
    setSyncError(null);
    
    try {
      // Récupérer les données du backend
      const backendData = await userDataService.fetchUserData();
      
      if (backendData) {
        setUserData(backendData);
        saveLocalData(backendData);
        setLastSyncTime(new Date());
        console.log('[UserDataContext] Sync forcée réussie');
        return true;
      } else {
        // Pas de données backend, pousser les données locales
        const localData = getLocalData();
        if (localData) {
          await userDataService.saveUserData(localData);
          setLastSyncTime(new Date());
          console.log('[UserDataContext] Données locales poussées vers le backend');
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('[UserDataContext] Erreur sync forcée:', error);
      setSyncError('Erreur de synchronisation');
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // ============================================
  // VALEUR DU CONTEXT
  // ============================================
  const value = {
    // Données
    userData,
    isLoading,
    isSyncing,
    syncError,
    lastSyncTime,
    
    // Actions principales
    saveUserData,
    updateSection,
    loadUserData,
    clearUserData,
    resetUserData,
    forceSync,
    
    // Actions comptes
    updateAccount,
    updateAccountBalance,
    addAccount,
    deleteAccount,
    
    // Actions budget
    updateBudgetPlanning,
    
    // Actions objectifs
    updateFinancialGoals,
    
    // Calculs
    calculateTotalBalance,
    
    // Helpers
    isAuthenticated: userDataService.isAuthenticated
  };

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
};

// Hook personnalisé
export const useUserData = () => {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserData doit être utilisé dans UserDataProvider');
  }
  return context;
};

export default UserDataContext;
