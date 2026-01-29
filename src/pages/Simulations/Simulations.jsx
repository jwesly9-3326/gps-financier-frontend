// 🧮 CALCULATRICE - Testez l'impact de vos transactions
// Design avec bulles entrée/sortie, évolution dynamique, alertes et quick-tests
// ✅ Utilise useGuideProgress pour la logique centralisée

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserData } from '../../context/UserDataContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { UpgradeModal } from '../../components/common/UpgradePrompt';
import useGuideProgress from '../../hooks/useGuideProgress';
import useTooltipTour from '../../hooks/useTooltipTour';
import PageGuideModal from '../../components/common/PageGuideModal';
import TooltipTour from '../../components/common/TooltipTour';
import NumpadModal from '../../components/common/NumpadModal';
import { useTheme } from '../../context/ThemeContext';

const Simulations = () => {
  const { userData, isLoading } = useUserData();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { canRunSimulation, incrementSimulation, canAccessGpsView } = useSubscription();
  
  // ✅ Hook centralisé pour la progression du guide
  const { shouldShowGuide, markGuideCompleted, isLoading: isGuideLoading } = useGuideProgress();
  
  // 🎨 Theme support
  const { isDark } = useTheme();
  
  // 🎯 Hook pour les tooltips interactifs
  const {
    isActive: isTooltipActive,
    currentStep: tooltipStep,
    totalSteps: tooltipTotal,
    currentTooltip,
    nextStep: nextTooltip,
    prevStep: prevTooltip,
    skipAll: skipTooltips,
    startTour: startTooltipTour,
    resetTooltips
  } = useTooltipTour('simulations', {
    onComplete: () => setShowContinueBar(true)
  });
  
  // 🔧 Debug: Fonction globale pour tester les tooltips
  useEffect(() => {
    window.startSimulationsTour = () => {
      resetTooltips();
      setTimeout(() => startTooltipTour(), 100);
    };
    return () => delete window.startSimulationsTour;
  }, [startTooltipTour, resetTooltips]);
  
  // État pour le guide utilisateur
  const [showGuide, setShowGuide] = useState(false);
  const [showContinueBar, setShowContinueBar] = useState(false);
  
  // Vérifier si le guide doit être affiché
  useEffect(() => {
    if (!isGuideLoading && shouldShowGuide('calculatrice')) {
      setShowGuide(true);
    }
  }, [shouldShowGuide, isGuideLoading]);
  
  // Fermer le modal et démarrer les tooltips
  const closeModal = () => {
    setShowGuide(false);
    startTooltipTour(); // Démarre le tour de tooltips
  };
  
  // Marquer comme complété et passer à la page suivante
  const continueToNextPage = () => {
    setShowContinueBar(false);
    markGuideCompleted('calculatrice');
    setTimeout(() => {
      navigate('/gestion-comptes');
    }, 100);
  };
  
  // 🆕 États pour le NumpadModal
  const [showNumpadModal, setShowNumpadModal] = useState(false);
  const [numpadTarget, setNumpadTarget] = useState({ accountName: '', type: '' }); // type: 'entree' ou 'sortie'
  
  // États
  const [simulations, setSimulations] = useState({});
  const [periodeImpact, setPeriodeImpact] = useState('1mois');
  
  // 📱 Détection mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // 📱 Détecter si on est en mode PWA (standalone)
  const [isPWA, setIsPWA] = useState(false);
  
  useEffect(() => {
    setIsPWA(window.matchMedia('(display-mode: standalone)').matches);
  }, []);
  
  // 📱 Mobile: démarrer directement en plein écran | Desktop: mode aperçu
  const [isFullScreen, setIsFullScreen] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsFullScreen(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // 📱 État pour le compte actif dans le snap scroll mobile
  const [activeAccountIndex, setActiveAccountIndex] = useState(0);
  const mobileScrollRef = useRef(null);
  
  // 📱 Swipe gauche-droite pour ouvrir le sidebar (comme MainLayout mais pour le mode fullscreen)
  // Le position:fixed bloque les events du Layout parent, donc on gère nous-mêmes
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const swipeHandled = useRef(false);
  
  useEffect(() => {
    // Seulement sur mobile en mode plein écran
    if (!isMobile || !isFullScreen) return;
    
    const handleTouchStart = (e) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      swipeHandled.current = false;
    };
    
    const handleTouchMove = (e) => {
      if (touchStartX.current === null || swipeHandled.current) return;
      
      const touchCurrentX = e.touches[0].clientX;
      const touchCurrentY = e.touches[0].clientY;
      const deltaX = touchCurrentX - touchStartX.current;
      const deltaY = touchCurrentY - touchStartY.current;
      
      // Vérifier si c'est un swipe horizontal significatif (comme MainLayout)
      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 2) {
        // Swipe gauche → droite: Ouvrir sidebar
        if (deltaX > 0) {
          swipeHandled.current = true;
          window.dispatchEvent(new CustomEvent('openSidebar'));
        }
      }
    };
    
    const handleTouchEnd = () => {
      touchStartX.current = null;
      touchStartY.current = null;
      swipeHandled.current = false;
    };
    
    // Ajouter les listeners sur le document (capture tous les touch events)
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, isFullScreen]);
  
  // Détecter le compte visible lors du scroll (mobile)
  useEffect(() => {
    const container = mobileScrollRef.current;
    if (!container || !isMobile) return;
    
    const handleScroll = () => {
      const cards = container.querySelectorAll('[data-card-scroll]');
      const containerTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      
      // Trouver la carte la plus visible
      let bestIndex = 0;
      let bestVisibility = 0;
      
      cards.forEach((card, index) => {
        const cardTop = card.offsetTop - container.offsetTop;
        const cardHeight = card.offsetHeight;
        
        // Calculer combien de la carte est visible
        const visibleTop = Math.max(containerTop, cardTop);
        const visibleBottom = Math.min(containerTop + containerHeight, cardTop + cardHeight);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        
        if (visibleHeight > bestVisibility) {
          bestVisibility = visibleHeight;
          bestIndex = index;
        }
      });
      
      if (bestIndex !== activeAccountIndex) {
        setActiveAccountIndex(bestIndex);
      }
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isMobile, activeAccountIndex]);
  
  // Fonction pour scroller vers un compte spécifique
  const scrollToAccount = (index) => {
    const container = mobileScrollRef.current;
    if (!container) return;
    
    // Trouver le wrapper parent (pas la carte, mais le conteneur snap)
    const snapItems = container.children;
    if (snapItems[index]) {
      const targetTop = snapItems[index].offsetTop;
      container.scrollTo({ top: targetTop, behavior: 'smooth' });
      setActiveAccountIndex(index);
    }
  };
  
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculatingStep, setCalculatingStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningAccounts, setWarningAccounts] = useState([]);
  const [animatingValues, setAnimatingValues] = useState({}); // Pour l'animation de comptage des montants
  const [upgradeModal, setUpgradeModal] = useState({ isOpen: false, type: null }); // Pour les restrictions abonnement
  
  // États pour la sélection de compte (quick test)
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [pendingQuickTest, setPendingQuickTest] = useState(null);
  
  // État pour masquer/afficher les soldes
  const [balancesHidden, setBalancesHidden] = useState(() => {
    const saved = localStorage.getItem('pl4to_security_settings');
    return saved ? JSON.parse(saved).hideBalances : false;
  });
  
  // Écouter les changements de paramètres de sécurité
  useEffect(() => {
    const handleSecurityChange = (e) => {
      setBalancesHidden(e.detail.hideBalances);
    };
    window.addEventListener('securitySettingsChanged', handleSecurityChange);
    
    return () => window.removeEventListener('securitySettingsChanged', handleSecurityChange);
  }, []);
  
  // Toggle local pour afficher/masquer les soldes
  const toggleBalances = (e) => {
    e.stopPropagation();
    const newValue = !balancesHidden;
    setBalancesHidden(newValue);
    
    // Sauvegarder dans localStorage
    const saved = localStorage.getItem('pl4to_security_settings');
    const settings = saved ? JSON.parse(saved) : {};
    settings.hideBalances = newValue;
    localStorage.setItem('pl4to_security_settings', JSON.stringify(settings));
    
    // Émettre un événement pour synchroniser les autres pages
    window.dispatchEvent(new CustomEvent('securitySettingsChanged', { detail: { hideBalances: newValue } }));
  };

  // Données budget
  const budgetEntrees = userData?.budgetPlanning?.entrees || [];
  const budgetSorties = userData?.budgetPlanning?.sorties || [];

  // Quick tests configurations
  const quickTests = [
    { id: 'impulsif', label: t('calculator.quickTests.impulse'), icon: '💸', montant: 200, type: 'sortie', color: '#ffa500' },
    { id: 'urgence', label: t('calculator.quickTests.emergency'), icon: '🚨', montant: 1000, type: 'sortie', color: '#e67e22' },
    { id: 'bonus', label: t('calculator.quickTests.bonus'), icon: '🎉', montant: 500, type: 'entree', color: '#3498db' },
    { id: 'dette', label: t('calculator.quickTests.debt'), icon: '💳', montant: 300, type: 'paiement', color: '#3498db' },
    { id: 'grosse', label: t('calculator.quickTests.large'), icon: '🏠', montant: 2000, type: 'sortie', color: '#9b59b6' },
  ];

  // Seuils d'alerte
  const SEUIL_CRITIQUE = 500;
  const SEUIL_DANGER = 0;

  // Nombre de jours selon la période
  const getDaysForPeriod = () => {
    switch(periodeImpact) {
      case '1sem': return 7;
      case '1mois': return 30;
      case '3mois': return 90;
      default: return 30;
    }
  };

  // Formater montant selon la langue
  const formatMontantCourt = (montant) => {
    if (balancesHidden) return '••••••';
    const num = new Intl.NumberFormat(i18n.language === 'en' ? 'en-CA' : 'fr-CA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(montant);
    return i18n.language === 'en' ? '$' + num : num + ' $';
  };

  // 📐 Adaptation dynamique des cercles selon le nombre de chiffres
  const getCircleSizing = (montant) => {
    const absValue = Math.abs(montant);
    const digitCount = Math.floor(absValue).toString().length;
    
    if (digitCount <= 4) {
      return { circleSize: 120, fontScale: 1 };
    } else if (digitCount === 5) {
      return { circleSize: 126, fontScale: 0.85 }; 
    } else if (digitCount === 6) {
      return { circleSize: 132, fontScale: 0.80 };
    } else {
      return { circleSize: 138, fontScale: 0.70 };
    }
  };

  // Obtenir l'icône selon le type de compte
  const getCompteIcon = (type) => {
    const icons = {
      'cheque': '💳',
      'epargne': '🌱',
      'credit': '🏦',
      'investissement': '📈'
    };
    return icons[type] || '💼';
  };

  // Obtenir la couleur selon le type de compte
  const getCompteColor = (type) => {
    const colors = {
      'cheque': { bg: '#3498db', light: 'rgba(52, 152, 219, 0.15)' },
      'epargne': { bg: '#3498db', light: 'rgba(52, 152, 219, 0.15)' },
      'credit': { bg: '#ffa500', light: 'rgba(255, 165, 0, 0.15)' },
      'investissement': { bg: '#9b59b6', light: 'rgba(155, 89, 182, 0.15)' }
    };
    return colors[type] || { bg: '#95a5a6', light: 'rgba(149, 165, 166, 0.15)' };
  };

  // Obtenir le solde actuel d'un compte
  const getSoldeActuel = (accountName) => {
    const soldeInfo = userData?.initialBalances?.soldes?.find(s => s.accountName === accountName);
    return soldeInfo ? parseFloat(soldeInfo.solde) || 0 : 0;
  };

  // Obtenir la limite de crédit d'un compte
  const getLimiteCredit = (accountName) => {
    const account = userData?.accounts?.find(a => a.nom === accountName);
    return account?.limite ? parseFloat(account.limite) : 10000;
  };

  // Vérifier s'il y a au moins une transaction entrée
  const hasAnyTransaction = () => {
    return Object.values(simulations).some(sim => 
      (parseFloat(sim.entree) || 0) > 0 || (parseFloat(sim.sortie) || 0) > 0
    );
  };

  // Obtenir le niveau d'alerte pour un solde
  const getAlertLevel = (solde, isCredit, accountName = null) => {
    if (isCredit && accountName) {
      const limite = getLimiteCredit(accountName);
      if (solde > limite) {
        return { level: 'danger', color: '#ffa500', icon: '🚨', message: t('calculator.results.limitExceeded') };
      }
      return { level: 'normal', color: '#3498db', icon: '✅', message: t('calculator.results.safe') };
    }
    
    if (solde < SEUIL_DANGER) {
      return { level: 'danger', color: '#ffa500', icon: '🚨', message: t('calculator.results.danger') };
    } else if (solde < SEUIL_CRITIQUE) {
      return { level: 'warning', color: '#f39c12', icon: '⚠️', message: t('calculator.results.warning') };
    }
    return { level: 'normal', color: '#3498db', icon: '✅', message: t('calculator.results.safe') };
  };

  // Animation de recalcul style GPS
  const launchCalculation = useCallback(() => {
    if (!hasAnyTransaction()) return;
    
    // 🔒 Vérifier la limite de simulations selon l'abonnement
    if (!canRunSimulation()) {
      setUpgradeModal({ isOpen: true, type: 'simulations' });
      return;
    }
    
    // Incrémenter le compteur de simulations
    incrementSimulation();
    
    setIsCalculating(true);
    setCalculatingStep(0);
    setShowResults(false);
    setShowWarningModal(false);
    
    setTimeout(() => setCalculatingStep(1), 400);
    setTimeout(() => setCalculatingStep(2), 800);
    setTimeout(() => {
      setIsCalculating(false);
      setCalculatingStep(0);
      setShowResults(true);
      // Animation déclenchée via useEffect quand showResults change
      checkForWarnings();
    }, 1200);
  }, [simulations, canRunSimulation, incrementSimulation]);

  // Vérifier les alertes après calcul
  const checkForWarnings = () => {
    const accounts = userData?.accounts || [];
    const warnings = [];
    
    accounts.forEach(acc => {
      const hasChange = hasModification(acc.nom);
      if (!hasChange) return;
      
      const isCredit = acc.type === 'credit';
      const newSolde = getNewSolde(acc.nom);
      const evolution = calculateEvolution(acc.nom, newSolde, isCredit);
      
      if (isCredit) {
        const limite = getLimiteCredit(acc.nom);
        const maxSolde = evolution.length > 0 
          ? Math.max(...evolution.map(e => e.solde), newSolde)
          : newSolde;
        
        if (maxSolde > limite) {
          warnings.push({ nom: acc.nom, solde: maxSolde, type: 'credit', limite });
        }
      } else {
        if (evolution.length > 0) {
          const minSolde = Math.min(...evolution.map(e => e.solde));
          if (minSolde < SEUIL_DANGER) {
            warnings.push({ nom: acc.nom, solde: minSolde, type: 'debit' });
          }
        } else if (newSolde < SEUIL_DANGER) {
          warnings.push({ nom: acc.nom, solde: newSolde, type: 'debit' });
        }
      }
    });
    
    if (warnings.length > 0) {
      setWarningAccounts(warnings);
      setShowWarningModal(true);
    }
  };

  // Obtenir les transactions du budget pour une date donnée
  // ✅ LOGIQUE: Retourne les transactions PLANIFIÉES du budget pour ce compte et cette date
  const getTransactionsForDate = useCallback((date, accountName) => {
    const transactions = { entrees: 0, sorties: 0 };
    const dateDay = date.getDate(); // Jour du mois (1-31)
    const dateWeekDay = date.getDay(); // Jour de la semaine (0=dimanche, 1=lundi, etc.)
    const dateMonth = date.getMonth() + 1; // Mois (1-12)
    const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    
    // Vérifier si une transaction du budget correspond à cette date
    const checkDayMatch = (item) => {
      // Si pas de fréquence définie, ignorer
      if (!item.frequence) return false;
      
      const jourRecurrence = parseInt(item.jourRecurrence);
      const jourSemaine = parseInt(item.jourSemaine);
      const moisRecurrence = parseInt(item.moisRecurrence);
      
      switch (item.frequence) {
        case 'mensuel':
          // Mensuel: vérifier le jour du mois
          if (isNaN(jourRecurrence)) return false;
          const effectiveJourMensuel = Math.min(jourRecurrence, lastDayOfMonth);
          return dateDay === effectiveJourMensuel;
          
        case 'quinzaine':
          // Semi-mensuel (2x par mois): jour X et jour X+15
          if (isNaN(jourRecurrence)) return false;
          const firstDayQuinzaine = Math.min(jourRecurrence, lastDayOfMonth);
          const secondDayQuinzaine = Math.min(jourRecurrence + 15, lastDayOfMonth);
          return dateDay === firstDayQuinzaine || dateDay === secondDayQuinzaine;
          
        case 'bimensuel':
          // Aux 2 semaines: même jour de la semaine, une semaine sur deux
          if (isNaN(jourSemaine)) return false;
          if (dateWeekDay !== jourSemaine) return false;
          
          // Vérifier si c'est la bonne semaine (paire/impaire depuis la date de référence)
          if (item.dateReference) {
            const refDate = new Date(item.dateReference);
            refDate.setHours(0, 0, 0, 0);
            const currentDate = new Date(date);
            currentDate.setHours(0, 0, 0, 0);
            const diffTime = currentDate.getTime() - refDate.getTime();
            const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
            // Seulement les semaines paires depuis la référence (0, 2, 4, ...)
            return diffWeeks >= 0 && diffWeeks % 2 === 0;
          }
          // Sans date de référence, ne pas matcher (données incomplètes)
          return false;
          
        case 'hebdomadaire':
          // Chaque semaine: vérifier le jour de la semaine
          if (isNaN(jourSemaine)) return false;
          return dateWeekDay === jourSemaine;
          
        case 'annuel':
          // Annuel: vérifier le mois ET le jour
          if (isNaN(jourRecurrence) || isNaN(moisRecurrence)) return false;
          const effectiveJourAnnuel = Math.min(jourRecurrence, lastDayOfMonth);
          return dateMonth === moisRecurrence && dateDay === effectiveJourAnnuel;
          
        default:
          return false;
      }
    };

    // Filtrer les entrées du budget pour CE compte
    budgetEntrees
      .filter(e => e.compte === accountName && e.compte) // S'assurer que le compte est défini
      .forEach(entree => {
        if (checkDayMatch(entree)) {
          transactions.entrees += parseFloat(entree.montant) || 0;
        }
      });

    // Filtrer les sorties du budget pour CE compte
    budgetSorties
      .filter(s => s.compte === accountName && s.compte) // S'assurer que le compte est défini
      .forEach(sortie => {
        if (checkDayMatch(sortie)) {
          transactions.sorties += parseFloat(sortie.montant) || 0;
        }
      });

    return transactions;
  }, [budgetEntrees, budgetSorties]);

  // Calculer l'évolution d'un compte sur la période
  const calculateEvolution = useCallback((accountName, startingBalance, isCredit) => {
    const days = getDaysForPeriod();
    const evolution = [];
    let currentBalance = startingBalance;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i <= days; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);
      
      const transactions = getTransactionsForDate(currentDate, accountName);
      const hasActivity = transactions.entrees > 0 || transactions.sorties > 0;

      if (hasActivity) {
        if (isCredit) {
          currentBalance = currentBalance - transactions.entrees + transactions.sorties;
        } else {
          currentBalance = currentBalance + transactions.entrees - transactions.sorties;
        }

        evolution.push({
          date: currentDate,
          dateStr: currentDate.toLocaleDateString(i18n.language === 'en' ? 'en-CA' : 'fr-CA', { day: 'numeric', month: 'short' }),
          solde: currentBalance,
          entrees: transactions.entrees,
          sorties: transactions.sorties,
          dayIndex: i
        });
      }
    }

    return evolution;
  }, [getTransactionsForDate, periodeImpact, i18n.language]);

  // Initialiser les simulations avec les comptes
  useEffect(() => {
    if (userData?.accounts) {
      const initialSimulations = {};
      userData.accounts.forEach(acc => {
        initialSimulations[acc.nom] = {
          entree: '',
          sortie: '',
          type: acc.type
        };
      });
      setSimulations(initialSimulations);
    }
  }, [userData]);

  // Mettre à jour une simulation
  const updateSimulation = (accountName, field, value) => {
    const numValue = value === '' ? '' : Math.max(0, parseFloat(value) || 0);
    
    // Calculer l'ancien solde avant mise à jour
    const soldeActuel = getSoldeActuel(accountName);
    
    setSimulations(prev => {
      const newSims = {
        ...prev,
        [accountName]: {
          ...prev[accountName],
          [field]: numValue === 0 ? '' : numValue
        }
      };
      
      // Calculer le nouveau solde avec les nouvelles valeurs
      const sim = newSims[accountName];
      const entree = parseFloat(sim?.entree) || 0;
      const sortie = parseFloat(sim?.sortie) || 0;
      const isCredit = sim?.type === 'credit';
      const newSolde = isCredit 
        ? soldeActuel - entree + sortie 
        : soldeActuel + entree - sortie;
      
      // Déclencher l'animation si le montant change
      if (entree > 0 || sortie > 0) {
        animateValue(accountName, soldeActuel, newSolde);
      }
      
      return newSims;
    });

    setShowResults(false);
    setShowWarningModal(false);
  };

  // 🆕 Ouvrir le NumpadModal pour une bulle
  const openNumpadForBubble = (accountName, type) => {
    setNumpadTarget({ accountName, type });
    setShowNumpadModal(true);
  };

  // 🆕 Confirmer la valeur du NumpadModal
  const handleNumpadConfirm = (value) => {
    if (numpadTarget.accountName && numpadTarget.type) {
      updateSimulation(numpadTarget.accountName, numpadTarget.type, value.toString());
    }
    setShowNumpadModal(false);
    setNumpadTarget({ accountName: '', type: '' });
  };

  // Ouvrir le sélecteur de compte pour quick test
  const openAccountSelector = (test) => {
    setPendingQuickTest(test);
    setShowAccountSelector(true);
  };

  // Fonction d'animation de comptage (comme dans Navigation)
  const animateValue = useCallback((accountName, fromValue, toValue) => {
    const duration = 800; // 800ms pour l'animation
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Fonction ease-out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = fromValue + (toValue - fromValue) * easeOut;
      
      setAnimatingValues(prev => ({
        ...prev,
        [accountName]: currentValue
      }));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
      // NE PAS supprimer animatingValues - garder la valeur finale pour l'affichage
    };
    
    requestAnimationFrame(animate);
  }, []);

  // Appliquer un quick test sur un compte sélectionné
  const applyQuickTestToAccount = (accountName) => {
    if (!pendingQuickTest) return;
    
    const accounts = userData?.accounts || [];
    const account = accounts.find(a => a.nom === accountName);
    if (!account) return;
    
    const field = (pendingQuickTest.type === 'entree' || pendingQuickTest.type === 'paiement') ? 'entree' : 'sortie';
    const isCredit = account.type === 'credit';
    const soldeActuel = getSoldeActuel(accountName);
    
    // Calculer le nouveau solde pour l'animation
    const currentSim = simulations[accountName] || { entree: 0, sortie: 0 };
    const entree = field === 'entree' ? pendingQuickTest.montant : (parseFloat(currentSim.entree) || 0);
    const sortie = field === 'sortie' ? pendingQuickTest.montant : (parseFloat(currentSim.sortie) || 0);
    const newSolde = isCredit 
      ? soldeActuel - entree + sortie 
      : soldeActuel + entree - sortie;
    
    // Déclencher l'animation
    animateValue(accountName, soldeActuel, newSolde);
    
    setSimulations(prev => ({
      ...prev,
      [accountName]: {
        ...prev[accountName],
        [field]: pendingQuickTest.montant
      }
    }));

    setShowResults(false);
    setShowWarningModal(false);
    setShowAccountSelector(false);
    setPendingQuickTest(null);
    
    // 📱 Sur mobile, scroller vers le compte sélectionné
    if (isMobile) {
      const accountIndex = accounts.findIndex(a => a.nom === accountName);
      if (accountIndex >= 0) {
        setTimeout(() => scrollToAccount(accountIndex), 100);
      }
    }
  };

  // Calculer le nouveau solde après simulation
  const getNewSolde = (accountName) => {
    const soldeActuel = getSoldeActuel(accountName);
    const sim = simulations[accountName] || { entree: '', sortie: '' };
    const entree = parseFloat(sim.entree) || 0;
    const sortie = parseFloat(sim.sortie) || 0;
    
    const isCredit = sim.type === 'credit';
    if (isCredit) {
      return soldeActuel - entree + sortie;
    } else {
      return soldeActuel + entree - sortie;
    }
  };

  // Déclencher les animations quand les résultats s'affichent (après le popup)
  useEffect(() => {
    if (showResults) {
      // Petit délai pour attendre que le popup disparaisse complètement
      const timer = setTimeout(() => {
        const accounts = userData?.accounts || [];
        accounts.forEach(acc => {
          const sim = simulations[acc.nom];
          const hasChange = sim && ((parseFloat(sim.entree) || 0) > 0 || (parseFloat(sim.sortie) || 0) > 0);
          if (hasChange) {
            const soldeActuel = getSoldeActuel(acc.nom);
            const newSolde = getNewSolde(acc.nom);
            animateValue(acc.nom, soldeActuel, newSolde);
          }
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showResults]);

  // Vérifier si un compte a des modifications
  const hasModification = (accountName) => {
    const sim = simulations[accountName];
    if (!sim) return false;
    return (parseFloat(sim.entree) || 0) > 0 || (parseFloat(sim.sortie) || 0) > 0;
  };

  // Réinitialiser les simulations
  const resetSimulations = () => {
    if (userData?.accounts) {
      const resetSims = {};
      userData.accounts.forEach(acc => {
        resetSims[acc.nom] = {
          entree: '',
          sortie: '',
          type: acc.type
        };
      });
      setSimulations(resetSims);
      setShowResults(false);
      setShowWarningModal(false);
      setAnimatingValues({}); // Nettoyer les valeurs d'animation
    }
  };

  // Obtenir tous les comptes pour le sélecteur
  const getAccountsForSelector = () => {
    return userData?.accounts || [];
  };

  // Composant bouton œil pour masquer/afficher les soldes
  const EyeToggleButton = ({ style = {} }) => (
    <button
      onClick={toggleBalances}
      title={balancesHidden ? t('gps.actions.showBalances') : t('gps.actions.hideBalances')}
      style={{
        background: balancesHidden ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        border: balancesHidden ? 'none' : isDark ? '2px solid rgba(255,255,255,0.3)' : '2px solid #e0e0e0',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: '1.2em',
        transition: 'all 0.3s',
        boxShadow: balancesHidden ? '0 4px 15px rgba(102, 126, 234, 0.4)' : 'none',
        ...style
      }}
    >
      {balancesHidden ? '👁️‍🗨️' : '👁️'}
    </button>
  );

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ fontSize: '1.2em', color: '#7f8c8d' }}>{t('common.loading')}</p>
      </div>
    );
  }

  const accounts = userData?.accounts || [];

  // Rendu du contenu principal
  const renderContent = () => (
    <>
      {/* Barre supérieure: Période + Boutons */}
      <div style={{
        display: 'flex',
        alignItems: isMobile ? 'stretch' : 'center',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '10px' : '20px',
        marginBottom: '15px',
        flexWrap: 'wrap'
      }}>
        {/* Période d'impact */}
        <div 
          data-tooltip="calculator-period"
          style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '8px' : '12px',
          padding: isMobile ? '8px 12px' : '10px 15px',
          background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          borderRadius: '10px',
          border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)',
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          justifyContent: isMobile ? 'center' : 'flex-start'
        }}>
          <span style={{ fontWeight: '600', color: isDark ? 'white' : '#1e293b', fontSize: isMobile ? '0.8em' : '0.9em' }}>📅 {t('calculator.period')} :</span>
          <div style={{ display: 'flex', gap: isMobile ? '6px' : '8px' }}>
            {[
              { key: '1sem', label: t('calculator.periods.week'), requiresPremium: false },
              { key: '1mois', label: t('calculator.periods.month'), requiresPremium: true },
              { key: '3mois', label: t('calculator.periods.3months'), requiresPremium: true }
            ].map(p => (
              <button
                key={p.key}
                onClick={(e) => {
                  e.stopPropagation();
                  // 🔒 Vérifier si la période nécessite un abonnement premium
                  if (p.requiresPremium && !canAccessGpsView('month')) {
                    setUpgradeModal({ isOpen: true, type: 'calculatorPeriod' });
                    return;
                  }
                  setPeriodeImpact(p.key);
                  setShowResults(false);
                }}
                style={{
                  padding: isMobile ? '6px 12px' : '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: periodeImpact === p.key 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
                  color: periodeImpact === p.key ? 'white' : isDark ? 'rgba(255,255,255,0.9)' : '#1e293b',
                  fontWeight: '600',
                  fontSize: isMobile ? '0.75em' : '0.85em',
                  cursor: 'pointer',
                  boxShadow: periodeImpact === p.key 
                    ? '0 3px 10px rgba(102, 126, 234, 0.4)'
                    : 'none',
                  transition: 'all 0.3s',
                  position: 'relative'
                }}
              >
                {p.label}
                {p.requiresPremium && !canAccessGpsView('month') && (
                  <span style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    fontSize: '0.7em'
                  }}>🔒</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {!isMobile && <div style={{ flex: 1 }}></div>}

        {/* Boutons Réinitialiser et GO */}
        <div 
          data-tooltip="calculator-go"
          style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isMobile ? 'center' : 'flex-end',
          gap: isMobile ? '8px' : '12px'
        }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              resetSimulations();
            }}
            style={{
              padding: isMobile ? '8px 14px' : '10px 18px',
              borderRadius: '10px',
              border: '2px solid #ffa500',
              background: 'rgba(255, 165, 0, 0.1)',
              color: '#ffa500',
              fontWeight: '600',
              fontSize: isMobile ? '0.8em' : '0.9em',
              cursor: 'pointer',
              transition: 'all 0.3s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🔄 {t('calculator.reset')}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              launchCalculation();
            }}
            disabled={!hasAnyTransaction()}
            style={{
              padding: isMobile ? '10px 20px' : '12px 30px',
              borderRadius: '12px',
              border: 'none',
              background: hasAnyTransaction()
                ? 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)'
                : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              color: hasAnyTransaction() ? 'white' : isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8',
              fontWeight: 'bold',
              fontSize: isMobile ? '0.95em' : '1.1em',
              cursor: hasAnyTransaction() ? 'pointer' : 'not-allowed',
              boxShadow: hasAnyTransaction()
                ? '0 4px 15px rgba(52, 152, 219, 0.4)'
                : 'none',
              transition: 'all 0.3s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transform: hasAnyTransaction() ? 'scale(1)' : 'scale(0.95)'
            }}
          >
            🚀 {t('calculator.go')}
          </button>
        </div>
      </div>

      {/* Quick Tests */}
      <div 
        data-tooltip="calculator-quicktest"
        style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? '6px' : '10px',
        marginBottom: isMobile ? '15px' : '20px',
        flexWrap: 'wrap',
        padding: isMobile ? '10px 12px' : '12px 15px',
        justifyContent: isMobile ? 'center' : 'flex-start',
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        borderRadius: '12px',
        border: isDark ? '1px dashed rgba(255,255,255,0.2)' : '1px dashed rgba(0,0,0,0.15)'
      }}>
        <span style={{ 
          fontSize: isMobile ? '0.75em' : '0.85em', 
          fontWeight: '600', 
          color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b',
          marginRight: '5px',
          width: isMobile ? '100%' : 'auto',
          textAlign: isMobile ? 'center' : 'left',
          marginBottom: isMobile ? '5px' : '0'
        }}>
          ⚡ {t('calculator.quickTests.title')} :
        </span>
        {quickTests.map(test => (
          <button
            key={test.id}
            onClick={(e) => {
              e.stopPropagation();
              openAccountSelector(test);
            }}
            style={{
              padding: isMobile ? '5px 8px' : '6px 12px',
              borderRadius: '20px',
              border: `2px solid ${test.color}50`,
              background: `${test.color}15`,
              color: test.color,
              fontWeight: '600',
              fontSize: isMobile ? '0.65em' : '0.75em',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = test.color;
              e.target.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = `${test.color}15`;
              e.target.style.color = test.color;
            }}
          >
            {test.icon} {test.label} {i18n.language === 'en' ? `$${test.montant.toLocaleString()}` : `${test.montant}$`}
          </button>
        ))}
      </div>

      {/* Zone des comptes */}
      <div 
        data-tooltip="calculator-accounts"
        ref={isMobile ? mobileScrollRef : null}
        style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        flexWrap: isMobile ? 'nowrap' : 'wrap',
        justifyContent: isMobile ? 'flex-start' : 'center',
        alignItems: isMobile ? 'stretch' : 'flex-start',
        gap: isMobile ? '0' : '20px',
        position: 'relative',
        ...(isMobile && {
          flex: 1,
          overflowY: 'auto',
          scrollSnapType: 'y mandatory',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch'
        })
      }}>
        {/* Overlay d'animation de calcul */}
        {isCalculating && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(4, 4, 73, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '20px',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{
              position: 'relative',
              width: '100px',
              height: '100px',
              marginBottom: '25px'
            }}>
              <div style={{
                position: 'absolute',
                width: '100px',
                height: '100px',
                border: '5px solid rgba(102, 126, 234, 0.3)',
                borderTop: '5px solid #667eea',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                width: '76px',
                height: '76px',
                border: '4px solid rgba(118, 75, 162, 0.3)',
                borderBottom: '4px solid #764ba2',
                borderRadius: '50%',
                animation: 'spin 1.2s linear infinite reverse'
              }} />
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '2em'
              }}>
                {calculatingStep === 2 ? '✅' : '🧮'}
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '1.3em',
                fontWeight: 'bold',
                color: '#ffd700',
                marginBottom: '8px',
                textShadow: '0 2px 10px rgba(255, 215, 0, 0.5)'
              }}>
                {calculatingStep === 0 && `📊 ${t('calculator.animation.calculating')}`}
                {calculatingStep === 1 && `💹 ${t('calculator.animation.updating')}`}
                {calculatingStep === 2 && `✨ ${t('calculator.animation.done')}`}
              </div>
              <div style={{
                fontSize: '0.95em',
                color: 'rgba(255,255,255,0.7)'
              }}>
                {calculatingStep === 0 && t('calculator.animation.analyzingTransactions')}
                {calculatingStep === 1 && t('calculator.animation.applyingBudget')}
                {calculatingStep === 2 && t('calculator.animation.resultsReady')}
              </div>
            </div>

            <div style={{
              width: '250px',
              height: '6px',
              background: 'rgba(102, 126, 234, 0.3)',
              borderRadius: '3px',
              marginTop: '20px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, #667eea, #764ba2, #ffd700)',
                borderRadius: '3px',
                transition: 'width 0.4s ease-out',
                width: calculatingStep === 0 ? '33%' : calculatingStep === 1 ? '66%' : '100%'
              }} />
            </div>
          </div>
        )}

        {accounts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#7f8c8d'
          }}>
            <span style={{ fontSize: '3em' }}>💼</span>
            <p style={{ marginTop: '15px' }}>{t('calculator.labels.noAccounts')}</p>
          </div>
        ) : (
          accounts.map((acc, index) => {
            const soldeActuel = getSoldeActuel(acc.nom);
            const newSolde = getNewSolde(acc.nom);
            const hasChange = hasModification(acc.nom);
            const color = getCompteColor(acc.type);
            const isCredit = acc.type === 'credit';
            const sim = simulations[acc.nom] || { entree: '', sortie: '' };

            // 📐 Calcul du sizing dynamique basé sur le montant affiché
            const displayedAmount = hasChange ? newSolde : soldeActuel;
            const sizing = getCircleSizing(displayedAmount);

            // 📱 Afficher les résultats pour TOUS les comptes modifiés (pas seulement le compte actif)
            // Cela permet de voir les résultats même après avoir scrollé vers un autre compte
            const shouldShowResults = showResults && hasChange;
            const evolution = shouldShowResults
              ? calculateEvolution(acc.nom, newSolde, isCredit)
              : [];

            let alertInfo = null;
            if (shouldShowResults) {
              if (isCredit) {
                const maxSolde = evolution.length > 0 
                  ? Math.max(...evolution.map(e => e.solde), newSolde)
                  : newSolde;
                alertInfo = getAlertLevel(maxSolde, true, acc.nom);
              } else {
                const minSolde = evolution.length > 0 
                  ? Math.min(...evolution.map(e => e.solde))
                  : newSolde;
                alertInfo = getAlertLevel(minSolde, false);
              }
            }

            return (
              <div
                key={index}
                style={{
                  ...(isMobile && {
                    minHeight: 'calc(100vh - 180px)',
                    scrollSnapAlign: 'start',
                    scrollSnapStop: 'always',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    padding: '10px',
                    paddingBottom: '300px',
                    boxSizing: 'border-box'
                  }),
                  ...(!isMobile && {
                    display: 'contents'
                  })
                }}
              >
              <div
                data-card-scroll
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: isMobile ? '15px 20px 20px' : '20px 25px 25px',
                  background: isDark 
                    ? 'linear-gradient(180deg, rgba(16, 2, 97, 0.98) 0%, rgba(4, 4, 73, 0.98) 100%)' 
                    : 'rgba(255,255,255,0.98)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '20px',
                  boxShadow: alertInfo?.level === 'danger'
                    ? '0 8px 30px rgba(255, 165, 0, 0.35)'
                    : alertInfo?.level === 'warning'
                    ? '0 8px 30px rgba(243, 156, 18, 0.3)'
                    : hasChange 
                    ? '0 8px 30px rgba(102, 126, 234, 0.25)'
                    : '0 4px 20px rgba(0,0,0,0.15)',
                  border: alertInfo?.level === 'danger'
                    ? '2px solid #ffa500'
                    : alertInfo?.level === 'warning'
                    ? '2px solid #f39c12'
                    : hasChange ? '2px solid #667eea' : isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.08)',
                  transition: 'all 0.3s',
                  minWidth: isMobile ? '90%' : '280px',
                  maxWidth: isMobile ? '95%' : '320px',
                  width: isMobile ? '90%' : 'auto',
                  animation: alertInfo?.level === 'danger' ? 'shake 0.5s ease-in-out' : 'none'
                }}
              >
                {/* NOM DU COMPTE EN HAUT */}
                <div style={{ 
                  marginBottom: '15px', 
                  textAlign: 'center',
                  width: '100%'
                }}>
                  <p style={{ 
                    margin: '0 0 3px', 
                    fontWeight: 'bold',
                    fontSize: '1.05em',
                    color: isDark ? 'white' : '#1e293b'
                  }}>
                    {acc.nom}
                  </p>
                  <span style={{ 
                    fontSize: '0.75em', 
                    color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b',
                    fontWeight: '500'
                  }}>
                    {t(`accounts.types.${acc.type}`)}
                  </span>
                </div>

                {/* Les 3 bulles alignées horizontalement */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px'
                }}>
                  {/* Bulle Entrée - BOUTON */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <span style={{ 
                      fontSize: '0.75em', 
                      fontWeight: '600',
                      color: '#3498db'
                    }}>
                      {isCredit ? `💳 ${t('calculator.bubbles.payment')}` : `💵 ${t('calculator.bubbles.entry')}`}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openNumpadForBubble(acc.nom, 'entree');
                      }}
                      style={{
                        width: '70px',
                        height: '70px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(52, 152, 219, 0.2) 0%, rgba(41, 128, 185, 0.15) 100%)',
                        border: '2px solid #3498db',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: sim.entree ? '0 0 15px rgba(52, 152, 219, 0.4)' : '0 3px 10px rgba(0,0,0,0.1)',
                        transition: 'all 0.3s',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px'
                      }}>
                        <span style={{ color: '#3498db', fontWeight: 'bold', fontSize: '1.1em' }}>{isCredit ? '−' : '+'}</span>
                        <span style={{ 
                          color: '#3498db', 
                          fontWeight: 'bold', 
                          fontSize: '0.95em',
                          maxWidth: '35px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {sim.entree || '0'}
                        </span>
                        <span style={{ color: '#3498db', fontWeight: 'bold', fontSize: '0.9em' }}>$</span>
                      </div>
                    </button>
                  </div>

                  {/* Grande bulle centrale - Style Logo O */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      position: 'relative',
                      width: `${Math.max(sizing.circleSize, 100)}px`,
                      height: `${Math.max(sizing.circleSize, 100)}px`,
                      minWidth: '100px',
                      minHeight: '100px',
                      transition: 'all 0.3s ease'
                    }}>
                      {/* Bordure animée gradient */}
                      <div style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        border: '4px solid transparent',
                        background: isDark 
                          ? 'linear-gradient(#040449, #100261) padding-box, linear-gradient(180deg, #ffd700, #ffb800, #ffa500, #ffd700) border-box'
                          : 'linear-gradient(#ffffff, #f8fafc) padding-box, linear-gradient(180deg, #ffd700, #ffb800, #ffa500, #ffd700) border-box',
                        animation: 'gps-ring-spin 3s linear infinite',
                        boxShadow: hasChange 
                          ? '0 0 25px rgba(255, 165, 0, 0.6)'
                          : '0 0 15px rgba(255, 165, 0, 0.4)'
                      }} />
                      
                      {/* Contenu intérieur */}
                      <div style={{
                        position: 'absolute',
                        top: '4px',
                        left: '4px',
                        right: '4px',
                        bottom: '4px',
                        borderRadius: '50%',
                        background: isDark 
                          ? 'linear-gradient(180deg, #040449 0%, #100261 100%)' 
                          : 'linear-gradient(180deg, #ffffff 0%, #f0f4f8 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                        overflow: 'visible',
                        boxSizing: 'border-box'
                      }}>
                        <span style={{ fontSize: '1.3em', lineHeight: 1, flexShrink: 0, marginBottom: '2px' }}>
                          {getCompteIcon(acc.type)}
                        </span>
                        {/* Solde actuel - toujours visible */}
                        <p style={{ 
                          margin: '0', 
                          color: isDark ? (isCredit ? '#ffa500' : '#60a5fa') : (isCredit ? '#c0392b' : '#1a5276'), 
                          fontWeight: 'bold',
                          fontSize: `${(hasChange ? 0.55 : 0.65) * sizing.fontScale}em`,
                          textDecoration: hasChange ? 'line-through' : 'none',
                          opacity: hasChange ? 0.6 : 1,
                          maxWidth: '90%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          lineHeight: 1.2,
                          flexShrink: 0
                        }}>
                          {formatMontantCourt(soldeActuel)}
                        </p>
                        {/* Nouveau solde - affiché quand il y a un changement */}
                        {hasChange && (
                          <p 
                            className={animatingValues[acc.nom] !== undefined ? 'solde-animating' : ''}
                            style={{ 
                              margin: '0', 
                              color: isDark ? (isCredit ? '#ffd700' : '#22d3ee') : (isCredit ? '#c0392b' : '#1a5276'), 
                              fontWeight: 'bold',
                              fontSize: `${0.7 * sizing.fontScale}em`,
                              maxWidth: '90%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              lineHeight: 1.2,
                              flexShrink: 0
                            }}
                          >
                            {formatMontantCourt(animatingValues[acc.nom] !== undefined ? animatingValues[acc.nom] : newSolde)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bulle Sortie - BOUTON */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <span style={{ 
                      fontSize: '0.75em', 
                      fontWeight: '600',
                      color: '#ffa500'
                    }}>
                      {isCredit ? `🛒 ${t('calculator.bubbles.purchase')}` : `💸 ${t('calculator.bubbles.expense')}`}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openNumpadForBubble(acc.nom, 'sortie');
                      }}
                      style={{
                        width: '70px',
                        height: '70px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(255, 165, 0, 0.2) 0%, rgba(255, 140, 0, 0.15) 100%)',
                        border: '2px solid #ffa500',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: sim.sortie ? '0 0 15px rgba(255, 165, 0, 0.4)' : '0 3px 10px rgba(0,0,0,0.1)',
                        transition: 'all 0.3s',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px'
                      }}>
                        <span style={{ color: '#ffa500', fontWeight: 'bold', fontSize: '1.1em' }}>{isCredit ? '+' : '−'}</span>
                        <span style={{ 
                          color: '#ffa500', 
                          fontWeight: 'bold', 
                          fontSize: '0.95em',
                          maxWidth: '35px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {sim.sortie || '0'}
                        </span>
                        <span style={{ color: '#ffa500', fontWeight: 'bold', fontSize: '0.9em' }}>$</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Zone d'évolution */}
                <div style={{
                  marginTop: '20px',
                  width: '100%',
                  background: alertInfo?.level === 'danger' 
                    ? 'linear-gradient(135deg, rgba(231, 76, 60, 0.15) 0%, rgba(231, 76, 60, 0.05) 100%)'
                    : alertInfo?.level === 'warning'
                    ? 'linear-gradient(135deg, rgba(243, 156, 18, 0.15) 0%, rgba(243, 156, 18, 0.05) 100%)'
                    : 'transparent',
                  borderRadius: '12px',
                  padding: '15px',
                  minHeight: '100px',
                  maxHeight: isMobile ? '350px' : 'none',
                  overflowY: isMobile ? 'auto' : 'visible',
                  border: alertInfo?.level === 'danger' 
                    ? '1px solid rgba(255, 165, 0, 0.3)'
                    : alertInfo?.level === 'warning'
                    ? '1px solid rgba(243, 156, 18, 0.3)'
                    : 'none'
                }}>
                  {hasChange && showResults ? (
                    <div style={{ width: '100%' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginBottom: '12px'
                      }}>
                        <span style={{ fontSize: '1em' }}>📊</span>
                        <span style={{ 
                          fontSize: '0.85em', 
                          fontWeight: '600', 
                          color: '#667eea' 
                        }}>
                          {t('calculator.labels.evolutionOver')} {periodeImpact === '1sem' ? t('calculator.periods.week') : periodeImpact === '1mois' ? t('calculator.periods.month') : t('calculator.periods.3months')}
                        </span>
                      </div>

                      {alertInfo && (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          marginBottom: '12px'
                        }}>
                          <span style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            background: alertInfo.color,
                            color: 'white',
                            fontSize: '0.8em',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            animation: alertInfo.level === 'danger' ? 'pulse-alert 1s ease-in-out infinite' : 'none'
                          }}>
                            {alertInfo.icon} {alertInfo.message}
                          </span>
                        </div>
                      )}

                      {evolution.length > 0 ? (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}>
                          {evolution.map((evo, idx) => {
                            // Pour DÉBIT: netFlux positif = argent gagné (bon), négatif = argent perdu (mauvais)
                            // Pour CRÉDIT: netFlux positif = dette augmente (mauvais), négatif = dette diminue (bon)
                            const netFlux = isCredit 
                              ? (evo.sorties - evo.entrees)  // Achat augmente dette, paiement diminue
                              : (evo.entrees - evo.sorties); // Entrée augmente solde, sortie diminue
                            
                            // Couleur inversée pour crédit: positif = mauvais (orange), négatif = bon (bleu)
                            const isPositiveGood = isCredit ? (netFlux < 0) : (netFlux >= 0);
                            const fluxColor = isPositiveGood ? '#3498db' : '#ffa500';
                            const fluxBgColor = isPositiveGood ? 'rgba(52, 152, 219, 0.15)' : 'rgba(255, 165, 0, 0.15)';
                            
                            const evoAlert = isCredit 
                              ? getAlertLevel(evo.solde, true, acc.nom)
                              : getAlertLevel(evo.solde, false);
                            
                            return (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  width: '100%',
                                  padding: '8px 10px',
                                  background: evoAlert?.level === 'danger' 
                                    ? 'rgba(255, 165, 0, 0.1)'
                                    : evoAlert?.level === 'warning'
                                    ? 'rgba(243, 156, 18, 0.1)'
                                    : 'transparent',
                                  borderRadius: '10px',
                                  boxShadow: 'none',
                                  border: evoAlert?.level === 'danger'
                                    ? '1px solid rgba(255, 165, 0, 0.3)'
                                    : evoAlert?.level === 'warning'
                                    ? '1px solid rgba(243, 156, 18, 0.3)'
                                    : 'none',
                                  animation: `fadeSlideIn 0.3s ease-out ${idx * 0.1}s both`,
                                  gap: '8px'
                                }}
                              >
                                <div style={{
                                  padding: '4px 6px',
                                  background: 'transparent',
                                  borderRadius: '6px',
                                  flexShrink: 0
                                }}>
                                  <span style={{ 
                                    fontSize: '0.65em', 
                                    fontWeight: '600',
                                    color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {evo.dateStr}
                                  </span>
                                </div>

                                <span style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#94a3b8', fontSize: '0.8em', flexShrink: 0 }}>→</span>

                                <div style={{ 
                                  flex: 1,
                                  textAlign: 'right',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-end',
                                  gap: '8px'
                                }}>
                                  <span style={{ 
                                    fontSize: '0.65em', 
                                    fontWeight: '600',
                                    color: fluxColor,
                                    background: 'transparent',
                                    padding: '2px 6px',
                                    borderRadius: '10px',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {netFlux >= 0 ? '+' : ''}{formatMontantCourt(netFlux)}
                                  </span>
                                  
                                  <span style={{
                                    fontSize: '0.95em',
                                    fontWeight: 'bold',
                                    color: evoAlert?.color || color.bg,
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {formatMontantCourt(evo.solde)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ 
                            margin: 0, 
                            fontSize: '0.8em', 
                            color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b',
                            fontStyle: 'italic'
                          }}>
                            {t('calculator.labels.noBudgetConfigured')}
                          </p>
                          <p style={{ 
                            margin: '8px 0 0', 
                            fontSize: '0.75em', 
                            color: isDark ? 'rgba(255,255,255,0.5)' : '#94a3b8'
                          }}>
                            {t('calculator.labels.simpleProjection')}: <strong 
                              className={animatingValues[acc.nom] !== undefined ? 'solde-animating' : ''}
                              style={{ color: alertInfo?.color || color.bg, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
                            >
                              {formatMontantCourt(animatingValues[acc.nom] !== undefined ? animatingValues[acc.nom] : newSolde)}
                            </strong>
                          </p>
                        </div>
                      )}

                      {evolution.length > 0 && (
                        <div style={{
                          marginTop: '12px',
                          padding: '10px 12px',
                          background: 'transparent',
                          borderRadius: '10px',
                          borderLeft: `3px solid ${alertInfo?.color || color.bg}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{ fontSize: '0.8em', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b' }}>
                            {t('calculator.labels.finalProjectedBalance')}:
                          </span>
                          <strong style={{ 
                            fontSize: '1.05em',
                            color: alertInfo?.color || color.bg
                          }}>
                            {formatMontantCourt(evolution[evolution.length - 1].solde)}
                          </strong>
                        </div>
                      )}
                    </div>
                  ) : hasChange ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <p style={{ 
                        margin: 0, 
                        fontSize: '0.85em', 
                        color: '#667eea',
                        fontWeight: '500'
                      }}
                        dangerouslySetInnerHTML={{ __html: `🚀 ${t('calculator.labels.clickGoToCalculate')}` }}
                      />
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <p style={{ 
                        margin: 0, 
                        fontSize: '0.8em', 
                        color: isDark ? 'rgba(255,255,255,0.5)' : '#94a3b8',
                        fontStyle: 'italic'
                      }}>
                        {t('calculator.labels.enterTransaction')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              </div>
            );
          })
        )}
      </div>

      {/* 📱 Indicateurs de pagination mobile */}
      {isMobile && accounts.length > 1 && (
        <>
          {/* Dots de pagination - sur le côté droit */}
          <div style={{
            position: 'fixed',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 50
          }}>
            {accounts.map((_, idx) => (
              <div
                key={idx}
                onClick={() => scrollToAccount(idx)}
                style={{
                  width: activeAccountIndex === idx ? '12px' : '8px',
                  height: activeAccountIndex === idx ? '12px' : '8px',
                  borderRadius: '50%',
                  background: activeAccountIndex === idx 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: activeAccountIndex === idx ? '0 0 8px rgba(102, 126, 234, 0.5)' : 'none'
                }}
              />
            ))}
          </div>
          
        </>
      )}

      {/* Modal Sélecteur de compte pour Quick Test */}
      {showAccountSelector && pendingQuickTest && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.3s ease-out'
        }}
        onClick={() => {
          setShowAccountSelector(false);
          setPendingQuickTest(null);
        }}
        >
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '25px 30px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '2.5em' }}>🎯</span>
              <h3 style={{ 
                margin: '10px 0 5px', 
                color: '#2c3e50',
                fontSize: '1.2em'
              }}>
                {t('calculator.accountSelector.title')}
              </h3>
              <p style={{ 
                margin: 0, 
                color: '#7f8c8d',
                fontSize: '0.9em'
              }}>
                {pendingQuickTest.icon} {pendingQuickTest.label} - <strong style={{ color: pendingQuickTest.color }}>{i18n.language === 'en' ? `$${pendingQuickTest.montant}` : `${pendingQuickTest.montant}$`}</strong>
              </p>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {getAccountsForSelector().map((acc, idx) => {
                const color = getCompteColor(acc.type);
                const solde = getSoldeActuel(acc.nom);
                
                return (
                  <button
                    key={idx}
                    onClick={() => applyQuickTestToAccount(acc.nom)}
                    style={{
                      padding: '15px',
                      borderRadius: '12px',
                      border: `2px solid ${color.bg}30`,
                      background: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `${color.bg}10`;
                      e.currentTarget.style.borderColor = color.bg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.borderColor = `${color.bg}30`;
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.5em' }}>{getCompteIcon(acc.type)}</span>
                      <div style={{ textAlign: 'left' }}>
                        <p style={{ margin: 0, fontWeight: '600', color: '#2c3e50' }}>{acc.nom}</p>
                        <p style={{ margin: 0, fontSize: '0.8em', color: '#7f8c8d' }}>
                          {t(`accounts.types.${acc.type}`)}
                        </p>
                      </div>
                    </div>
                    <span style={{ 
                      fontWeight: 'bold', 
                      color: color.bg,
                      fontSize: '1.1em'
                    }}>
                      {formatMontantCourt(solde)}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                setShowAccountSelector(false);
                setPendingQuickTest(null);
              }}
              style={{
                marginTop: '20px',
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '2px solid #e0e0e0',
                background: 'white',
                color: '#7f8c8d',
                fontWeight: '600',
                fontSize: '0.95em',
                cursor: 'pointer'
              }}
            >
              {t('calculator.accountSelector.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Modal Warning */}
      {showWarningModal && warningAccounts.length > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.3s ease-out'
        }}
        onClick={() => setShowWarningModal(false)}
        >
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            maxWidth: '400px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(255, 165, 0, 0.4)',
            border: '3px solid #ffa500',
            animation: 'shake 0.5s ease-in-out'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '4em', marginBottom: '15px' }}>🚨</div>
            <h2 style={{ 
              margin: '0 0 15px', 
              color: '#ffa500',
              fontSize: '1.5em'
            }}>
              {t('calculator.alerts.title')}
            </h2>
            <p style={{ 
              margin: '0 0 20px', 
              color: '#7f8c8d',
              fontSize: '0.95em',
              lineHeight: '1.5'
            }}>
              ⚠️ {t('calculator.alerts.message')}
            </p>
            
            <div style={{ marginBottom: '20px' }}>
              {warningAccounts.map((w, i) => (
                <div key={i} style={{
                  padding: '10px 15px',
                  background: 'linear-gradient(135deg, rgba(255, 165, 0, 0.15) 0%, rgba(255, 140, 0, 0.1) 100%)',
                  borderRadius: '10px',
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontWeight: '600', color: '#e67e22' }}>{w.nom}</span>
                    <span style={{ fontSize: '0.75em', color: '#7f8c8d', marginLeft: '8px' }}>
                      ({w.type === 'credit' ? t('calculator.alerts.limitExceeded') : t('calculator.alerts.overdraft')})
                    </span>
                  </div>
                  <span style={{ 
                    fontWeight: 'bold', 
                    color: '#ffa500',
                    fontSize: '1.1em'
                  }}>
                    {formatMontantCourt(w.solde)}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowWarningModal(false)}
              style={{
                padding: '12px 30px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #ffa500 0%, #e67e22 100%)',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1em',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(255, 165, 0, 0.4)'
              }}
            >
              {t('calculator.alerts.understood')}
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <style>
        {`
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 15px rgba(102, 126, 234, 0.3); }
            50% { box-shadow: 0 0 30px rgba(102, 126, 234, 0.6); }
          }
          @keyframes gps-ring-spin {
            0% {
              transform: rotate(0deg);
              box-shadow: 0 0 15px rgba(255, 165, 0, 0.4);
            }
            50% {
              box-shadow: 0 0 25px rgba(255, 165, 0, 0.6), 0 0 40px rgba(255, 69, 0, 0.3);
            }
            100% {
              transform: rotate(360deg);
              box-shadow: 0 0 15px rgba(255, 165, 0, 0.4);
            }
          }
          @keyframes number-pop {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
          @keyframes fadeSlideIn {
            0% { opacity: 0; transform: translateY(-8px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeIn {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
          }
          @keyframes pulse-alert {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          @keyframes value-change {
            0% { transform: scale(1); filter: brightness(1); }
            25% { transform: scale(1.15); filter: brightness(1.3); }
            50% { transform: scale(1.1); filter: brightness(1.2); }
            100% { transform: scale(1); filter: brightness(1); }
          }
          .solde-animating {
            animation: value-change 0.4s ease-out;
          }
          .input-bubble:focus {
            outline: none;
            transform: scale(1.05);
          }
          .input-bubble::placeholder {
            color: #bdc3c7;
          }
          .input-bubble::-webkit-outer-spin-button,
          .input-bubble::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          .input-bubble[type=number] {
            -moz-appearance: textfield;
          }
        `}
      </style>

      {/* WRAPPER AVEC FOND BLEU FONCÉ pour le coin arrondi */}
      <div style={{
        height: '100%',
        background: isDark ? 'linear-gradient(180deg, #040449 0%, #100261 100%)' : '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* ZONE DE NOTIFICATIONS - Barre "On continue" ou espace réservé */}
        <div style={{
          background: showContinueBar 
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : 'transparent',
          padding: showContinueBar ? '15px 25px' : '12px 25px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          borderTopLeftRadius: '50px',
          minHeight: '60px',
          transition: 'all 0.3s ease'
        }}>
          {showContinueBar ? (
            <button
              onClick={continueToNextPage}
              style={{
                background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                border: 'none',
                borderRadius: '25px',
                padding: '12px 30px',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1em',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(255, 152, 0, 0.4)',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 152, 0, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 152, 0, 0.4)';
              }}
            >
              {t('common.onContinue')} →
            </button>
          ) : (
            <div style={{ width: '100%' }} />
          )}
        </div>

      {/* Mode Normal - CONTENEUR BLANC */}
      <div 
        style={{ 
          minHeight: 'calc(100vh - 70px)', 
          display: 'flex', 
          flexDirection: 'column', 
          padding: '20px',
          background: 'transparent',
          position: 'relative'
        }}
      >
        {/* Overlay transparent pour capturer tous les clics en mode normal */}
        {!isFullScreen && (
          <div 
            onClick={() => setIsFullScreen(true)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 500,
              cursor: 'pointer'
            }}
          />
        )}
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{
            fontSize: '1.8em',
            fontWeight: 'bold',
            color: isDark ? 'white' : '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px'
          }}>
            🧮 {t('calculator.title')}
          </h1>
          <p style={{ fontSize: '1em', color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b' }}>
            {t('calculator.subtitle')}
          </p>
        </div>

        {renderContent()}
      </div> {/* Fin conteneur blanc */}
      </div> {/* Fin wrapper bleu */}

      {/* Mode Plein Écran */}
      {isFullScreen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: isDark ? 'linear-gradient(180deg, #040449 0%, #100261 100%)' : '#ffffff',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* 📱 PWA Safe Area - Zone pour l'encoche/heure système */}
          {isMobile && isPWA && (
            <div style={{
              height: 'env(safe-area-inset-top, 0px)',
              background: isDark ? '#040449' : '#ffffff',
              width: '100%',
              flexShrink: 0
            }} />
          )}
          {/* Header plein écran */}
          <div style={{
            background: 'transparent',
            padding: isMobile ? '10px 15px' : '15px 30px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}>
            {/* Titre et subtitle à gauche */}
            <div>
              <h1 style={{
                margin: 0,
                fontSize: isMobile ? '1.1em' : '1.8em',
                fontWeight: 'bold',
                color: isDark ? 'white' : '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '8px' : '12px'
              }}>
                🧮 {t('calculator.title')}
              </h1>
              <p style={{ 
                fontSize: isMobile ? '0.8em' : '1em', 
                color: isDark ? 'rgba(255,255,255,0.7)' : '#64748b',
                margin: isMobile ? '4px 0 0 0' : '8px 0 0 0',
                maxWidth: isMobile ? '250px' : 'none'
              }}>
                {t('calculator.subtitle')}
              </p>
            </div>
            
            {/* Boutons à droite: X en haut, Œil en dessous */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? '8px' : '10px' }}>
              {/* Bouton Fermer (X) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isMobile) {
                    window.dispatchEvent(new CustomEvent('openSidebar'));
                  } else {
                    setIsFullScreen(false);
                  }
                }}
                style={{
                  background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  border: isDark ? '2px solid rgba(255,255,255,0.3)' : '2px solid rgba(0,0,0,0.2)',
                  borderRadius: '50%',
                  width: isMobile ? '32px' : '40px',
                  height: isMobile ? '32px' : '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: isMobile ? '1em' : '1.2em',
                  color: isDark ? 'white' : '#1e293b',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e74c3c';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.borderColor = '#e74c3c';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
                  e.currentTarget.style.color = isDark ? 'white' : '#1e293b';
                  e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
                }}
              >
                ✕
              </button>
              
              {/* Bouton Œil pour masquer/afficher les soldes */}
              <button
                onClick={toggleBalances}
                title={balancesHidden ? t('goals.showBalances') : t('goals.hideBalances')}
                style={{
                  borderRadius: '50%',
                  width: isMobile ? '32px' : '40px',
                  height: isMobile ? '32px' : '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.9em' : '1.2em',
                  transition: 'all 0.3s',
                  border: balancesHidden 
                    ? 'none' 
                    : (isDark ? '2px solid rgba(255,255,255,0.3)' : '2px solid rgba(0,0,0,0.2)'),
                  background: balancesHidden 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                    : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                  color: balancesHidden ? 'white' : (isDark ? 'white' : '#64748b'),
                  boxShadow: balancesHidden ? '0 4px 15px rgba(102, 126, 234, 0.4)' : 'none'
                }}
              >
                {balancesHidden ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
          </div>

          {/* Contenu plein écran */}
          <div style={{
            flex: 1,
            overflow: isMobile ? 'hidden' : 'auto',
            padding: isMobile ? '10px 15px' : '20px 30px',
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {renderContent()}
          </div>
        </div>
      )}
      
      {/* ========== MODAL GUIDE ONBOARDING ========== */}
      <PageGuideModal
        isOpen={showGuide}
        onClose={closeModal}
        icon="🧮"
        titleKey="calculator.guideModal.title"
        messageKey="calculator.guideModal.message"
        hintIcon="👆"
        hintKey="calculator.guideModal.hint"
      />
      
      {/* ========== TOOLTIP TOUR ========== */}
      <TooltipTour
        isActive={isTooltipActive}
        currentTooltip={currentTooltip}
        currentStep={tooltipStep}
        totalSteps={tooltipTotal}
        onNext={nextTooltip}
        onPrev={prevTooltip}
        onSkip={skipTooltips}
      />
      
      {/* ========== MODAL UPGRADE (restrictions abonnement) ========== */}
      <UpgradeModal
        isOpen={upgradeModal.isOpen}
        onClose={() => setUpgradeModal({ isOpen: false, type: null })}
        limitType={upgradeModal.type}
      />

      {/* ========== NUMPAD MODAL ========== */}
      <NumpadModal
        isOpen={showNumpadModal}
        onClose={() => {
          setShowNumpadModal(false);
          setNumpadTarget({ accountName: '', type: '' });
        }}
        onConfirm={handleNumpadConfirm}
        initialValue={numpadTarget.accountName && numpadTarget.type ? (simulations[numpadTarget.accountName]?.[numpadTarget.type] || '') : ''}
        title={
          numpadTarget.type === 'entree' 
            ? (simulations[numpadTarget.accountName]?.type === 'credit' 
                ? t('calculator.bubbles.payment') 
                : t('calculator.bubbles.entry'))
            : (simulations[numpadTarget.accountName]?.type === 'credit' 
                ? t('calculator.bubbles.purchase') 
                : t('calculator.bubbles.expense'))
        }
        allowNegative={false}
      />
    </>
  );
};

export default Simulations;
