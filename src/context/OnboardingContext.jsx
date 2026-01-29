// 🎯 ONBOARDING CONTEXT SIMPLIFIÉ - VERSION 2 ÉTAPES
// Flow: Register (Profile) → FirstAccount → FirstGoal → Dashboard
// FIX: Problème de timing avec setState async et validation
// SYNC: Sauvegarde dans le backend après onboarding

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserData } from './UserDataContext';
import { useSubscription } from './SubscriptionContext';
import userDataService from '../services/userData.service';

const OnboardingContext = createContext(null);

export const OnboardingProvider = ({ children }) => {
  const navigate = useNavigate();
  const { saveUserData: saveToUserDataContext } = useUserData();
  const { startTrial } = useSubscription();

  // État principal: étape courante (0-3)
  const [currentStep, setCurrentStep] = useState(0);

  // État des données du formulaire
  const [formData, setFormData] = useState({
    userInfo: {
      prenom: '',
      age: '',
      situationFamiliale: ''
    },
    accounts: [],
    initialBalances: {
      dateDepart: new Date().toISOString().split('T')[0],
      soldes: []
    },
    financialGoals: [],
    accountActivities: {},
    budgetPlanning: {
      entrees: [],
      sorties: []
    }
  });

  // États de chargement
  const [isLoading, setIsLoading] = useState(false);
  
  // Flag pour navigation après mise à jour du state
  const [pendingNavigation, setPendingNavigation] = useState(false);

  /* ==============================
   * SAUVEGARDE LOCALSTORAGE
   * ============================== */
  
  useEffect(() => {
    const savedData = localStorage.getItem('pl4to-onboarding');
    const savedStep = localStorage.getItem('pl4to-onboarding-step');
    
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.userInfo) {
          setFormData(prev => ({
            ...prev,
            ...parsed
          }));
        }
      } catch (e) {
        console.error('Erreur parsing localStorage:', e);
      }
    }
    
    if (savedStep) {
      const step = parseInt(savedStep);
      setCurrentStep(Math.min(step, 1)); // Max step is now 1
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pl4to-onboarding', JSON.stringify(formData));
    localStorage.setItem('pl4to-onboarding-step', currentStep.toString());
  }, [formData, currentStep]);

  // ✅ FIX: Navigation différée après mise à jour du state
  // On utilise une ref pour capturer les données les plus récentes
  useEffect(() => {
    if (pendingNavigation) {
      setPendingNavigation(false);
      
      if (currentStep < 1) {
        setCurrentStep(prev => prev + 1);
        window.scrollTo(0, 0);
      } else {
        // ✅ FIX: Passer formData directement pour éviter les closures stales
        finalizeOnboarding(formData);
      }
    }
  }, [pendingNavigation, formData]);

  /* ==============================
   * ACTIONS ÉTAPE 1: USER INFO
   * ============================== */
  
  const updateUserInfo = (field, value) => {
    setFormData(prev => ({
      ...prev,
      userInfo: {
        ...prev.userInfo,
        [field]: value
      }
    }));
  };

  /* ==============================
   * ACTIONS ÉTAPE 2: FIRST ACCOUNT + SOLDE
   * ============================== */
  
  const addFirstAccount = (account, solde) => {
    const newAccount = {
      ...account,
      id: Date.now()
    };
    
    setFormData(prev => ({
      ...prev,
      accounts: [newAccount],
      initialBalances: {
        dateDepart: new Date().toISOString().split('T')[0],
        soldes: [{
          accountName: account.nom,
          accountType: account.type,
          solde: solde.toString()
        }]
      }
    }));
  };

  const updateFirstAccount = (account, solde) => {
    setFormData(prev => ({
      ...prev,
      accounts: prev.accounts.length > 0 
        ? [{ ...prev.accounts[0], ...account }]
        : [{ ...account, id: Date.now() }],
      initialBalances: {
        ...prev.initialBalances,
        soldes: [{
          accountName: account.nom,
          accountType: account.type,
          solde: solde.toString()
        }]
      }
    }));
  };

  /* ==============================
   * ACTIONS ÉTAPE 3: FIRST GOAL
   * ============================== */
  
  const addFirstGoal = (goal) => {
    const newGoal = {
      ...goal,
      id: Date.now()
    };
    
    setFormData(prev => ({
      ...prev,
      financialGoals: [newGoal]
    }));
  };

  const updateFirstGoal = (goal) => {
    setFormData(prev => ({
      ...prev,
      financialGoals: prev.financialGoals.length > 0
        ? [{ ...prev.financialGoals[0], ...goal }]
        : [{ ...goal, id: Date.now() }]
    }));
  };

  /* ==============================
   * NAVIGATION - VERSION CORRIGÉE
   * ============================== */
  
  // ✅ goNext SANS validation (la validation est faite dans les composants)
  const goNext = useCallback(() => {
    if (currentStep < 1) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    } else {
      finalizeOnboarding();
    }
  }, [currentStep]);

  // ✅ goNextAfterSave: Déclenche navigation APRÈS que le state soit mis à jour
  const goNextAfterSave = useCallback(() => {
    setPendingNavigation(true);
  }, []);

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const goToStep = (step) => {
    // Peut seulement aller à step 0 (FirstAccount) depuis step 1 (FirstGoal)
    if (step >= 0 && step < currentStep) {
      setCurrentStep(step);
      window.scrollTo(0, 0);
    }
  };

  /* ==============================
   * FINALISATION
   * ============================== */
  
  const finalizeOnboarding = async (latestFormData = null) => {
    // ✅ FIX: Utiliser les données passées en paramètre si disponibles
    const dataToSave = latestFormData || formData;
    
    setIsLoading(true);
    try {
      console.log('🚀 Finalisation onboarding:', dataToSave);
      console.log('🎯 Objectifs financiers:', dataToSave.financialGoals);
      
      // 🔧 FIX: NE PAS marquer les guides comme complétés
      // Les nouveaux utilisateurs doivent passer par le guide de chaque page
      const guideProgressEmpty = {
        dashboard: false,
        comptes: false,
        budget: false,
        objectifs: false,
        gps: false,
        calculatrice: false,
        gestion: false,
        parametres: false
      };
      
      const completeData = {
        userInfo: {
          ...dataToSave.userInfo,
          nom: dataToSave.userInfo.prenom,
          personnesCharge: 0,
          litteratieFinanciere: 'intermediaire',
          objectifPrincipal: 'budget'
        },
        accounts: dataToSave.accounts,
        accountActivities: {},
        budgetPlanning: {
          entrees: [],
          sorties: []
        },
        initialBalances: dataToSave.initialBalances,
        financialGoals: dataToSave.financialGoals,
        guideProgress: guideProgressEmpty,  // 🔧 FIX: Guide NON terminé - nouveaux utilisateurs passent par le guide
        onboardingCompleted: true  // ✅ Flag onboarding terminé
      };
      
      // 1. Sauvegarder via UserDataContext (met à jour le state ET localStorage ET backend)
      const success = await saveToUserDataContext(completeData);
      
      if (success) {
        console.log('✅ Données onboarding sauvegardées via UserDataContext');
        
        // 🔧 FIX: NE PAS marquer les guides comme complétés en localStorage
        // Les nouveaux utilisateurs doivent passer par le guide de chaque page
        // On nettoie même les anciennes valeurs au cas où
        localStorage.removeItem('pl4to-guide-dashboard');
        localStorage.removeItem('pl4to-guide-comptes');
        localStorage.removeItem('pl4to-guide-budget');
        localStorage.removeItem('pl4to-guide-objectifs');
        localStorage.removeItem('pl4to-guide-gps');
        localStorage.removeItem('pl4to-guide-calculatrice');
        localStorage.removeItem('pl4to-guide-gestion');
        localStorage.removeItem('pl4to-guide-parametres');
        console.log('🔧 Guide progress reset en localStorage (nouveaux utilisateurs)');
      } else {
        console.warn('⚠️ Problème lors de la sauvegarde, mais on continue...');
      }
      
      // 2. Nettoyer les données d'onboarding temporaires
      localStorage.removeItem('pl4to-onboarding');
      localStorage.removeItem('pl4to-onboarding-step');
      
      // 3. 🎁 Démarrer le trial de 14 jours (plan Essentiel gratuit)
      try {
        await startTrial();
        console.log('🎁 Trial de 14 jours démarré - Plan Essentiel activé!');
      } catch (trialError) {
        // Si le trial échoue (déjà utilisé), on continue quand même
        console.warn('⚠️ Trial non démarré (peut-être déjà utilisé):', trialError.message);
      }
      
      // 🎬 Animation de loading - 16 secondes (4s par étape)
      await new Promise(resolve => setTimeout(resolve, 16000));
      
      // Rediriger vers Dashboard pour commencer le Guide
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Erreur finalisation:', error);
      alert('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ==============================
   * PROGRESS HELPERS
   * ============================== */
  
  // Progress: step 0 = 50%, step 1 = 100% (Profile déjà fait dans Register)
  const getProgressPercentage = () => {
    return Math.round(((currentStep + 1) / 2) * 100);
  };

  const getStepName = (step) => {
    const names = ['Compte', 'Objectif'];
    return names[step] || '';
  };

  /* ==============================
   * VALEUR DU CONTEXT
   * ============================== */
  
  const value = {
    currentStep,
    formData,
    isLoading,
    
    updateUserInfo,
    addFirstAccount,
    updateFirstAccount,
    addFirstGoal,
    updateFirstGoal,
    
    goNext,
    goNextAfterSave,  // ✅ Nouvelle fonction pour navigation après save
    goBack,
    goToStep,
    
    getProgressPercentage,
    getStepName,
    
    finalizeOnboarding
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding doit être utilisé dans OnboardingProvider');
  }
  return context;
};

export default OnboardingContext;